(() => {
  "use strict";

  const QUEUES = {
    42:  { field: "team", label: "Ranked Team 5v5", color: "#55df61" },
    420: { field: "solo", label: "Solo/Duo", color: "#ff4d4f" },
    440: { field: "flex", label: "Flex", color: "#f2c15b" }
  };
  const TIER_BASE = {
    IRON: 0,
    BRONZE: 400,
    SILVER: 800,
    GOLD: 1200,
    PLATINUM: 1600,
    EMERALD: 2000,
    DIAMOND: 2400,
    MASTER: 2800,
    GRANDMASTER: 3200,
    CHALLENGER: 3600
  };
  const TIERS = Object.entries(TIER_BASE).sort((a, b) => a[1] - b[1]);
  const DIVISIONS = ["IV", "III", "II", "I"];
  const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
  let rawDataPromise = null;
  let queued = false;

  function key(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function riotId(player) {
    return player?.riotName && player?.tag ? `${player.riotName}#${player.tag}` : (player?.name || "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadRawData() {
    if (!rawDataPromise) {
      rawDataPromise = fetch(`data/rift-lab.json?lp=${Date.now()}`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`LP history HTTP ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          console.warn("Could not load LP history.", error);
          return {};
        });
    }
    return rawDataPromise;
  }

  function selectedSeasonRange() {
    const season = window.RIFT_LAB_SELECTED_SEASON_DETAIL;
    const start = season?.start ? new Date(season.start) : null;
    const end = season?.end ? new Date(season.end) : null;
    return {
      start: start && !Number.isNaN(start.getTime()) ? start : null,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      label: season?.label || "Selected season"
    };
  }

  function inSelectedSeason(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const range = selectedSeasonRange();
    if (range.start && date < range.start) return false;
    if (range.end && date >= range.end) return false;
    return true;
  }

  function samePlayer(entry, player) {
    return (player.puuid && entry.playerPuuid === player.puuid) || key(entry.player) === key(player.name);
  }

  function playerMatches(raw, player) {
    return (raw.matches || [])
      .filter((match) => samePlayer(match, player))
      .filter((match) => QUEUES[Number(match.queueId)])
      .filter((match) => inSelectedSeason(match.gameStart))
      .filter((match) => match.gameStart && !Number.isNaN(new Date(match.gameStart).getTime()))
      .sort((a, b) => new Date(a.gameStart) - new Date(b.gameStart));
  }

  function playerSnapshots(raw, player) {
    return (raw.lpHistory || [])
      .filter((point) => samePlayer(point, player))
      .filter((point) => QUEUES[Number(point.queueId)])
      .filter((point) => inSelectedSeason(point.gameStart || point.capturedAt))
      .filter((point) => Number.isFinite(Number(point.score)))
      .sort((a, b) => new Date(a.gameStart || a.capturedAt) - new Date(b.gameStart || b.capturedAt));
  }

  function displayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return `${String(local.getUTCMonth() + 1).padStart(2, "0")}/${String(local.getUTCDate()).padStart(2, "0")}`;
  }

  function displayTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return `${displayDate(value)} ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  }

  function rankText(point) {
    if (!point) return "LP unavailable";
    const tier = String(point.tier || "").replace(/_/g, " ");
    const rank = point.rank ? ` ${point.rank}` : "";
    return `${tier}${rank} ${Number(point.lp) || 0} LP`;
  }

  function scoreLabel(score) {
    let tierName = "IRON";
    let tierBase = 0;
    for (const [name, base] of TIERS) {
      if (score >= base) {
        tierName = name;
        tierBase = base;
      }
    }
    if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tierName)) {
      return `${tierName[0]} ${Math.max(0, Math.round(score - tierBase))}`;
    }
    const divisionIndex = Math.max(0, Math.min(3, Math.floor((score - tierBase) / 100)));
    return `${tierName[0]}${DIVISIONS[divisionIndex]}`;
  }

  function buildRows(matches, snapshots) {
    const snapshotsByMatch = new Map();
    snapshots.forEach((point) => {
      if (!point.matchId) return;
      snapshotsByMatch.set(`${Number(point.queueId)}|${point.matchId}`, point);
    });

    const state = { solo: null, flex: null, team: null };
    const statePoint = { solo: null, flex: null, team: null };

    return matches.map((match, index) => {
      const queueId = Number(match.queueId);
      const queue = QUEUES[queueId];
      const snapshot = snapshotsByMatch.get(`${queueId}|${match.matchId}`) || null;
      if (snapshot) {
        state[queue.field] = Number(snapshot.score);
        statePoint[queue.field] = snapshot;
      }
      return {
        index,
        match,
        date: match.gameStart,
        queueId,
        solo: state.solo,
        flex: state.flex,
        team: state.team,
        soloPoint: statePoint.solo,
        flexPoint: statePoint.flex,
        teamPoint: statePoint.team,
        snapshot
      };
    });
  }

  function matchTooltip(match) {
    const queue = QUEUES[Number(match.queueId)]?.label || match.queueLabel || "Ranked";
    const champion = match.champion || "Unknown champion";
    const result = match.result || "";
    return `${displayTime(match.gameStart)} · ${queue} · ${champion}${result ? ` · ${result}` : ""}`;
  }

  function dataDragonVersion(gameVersion) {
    const match = String(gameVersion || "").match(/^(\d+)\.(\d+)/);
    return match ? `${match[1]}.${match[2]}.1` : "14.24.1";
  }

  function championIcon(match) {
    const champion = String(match.champion || "Unknown");
    const aliases = {
      "Aurelion Sol": "AurelionSol", "Bel'Veth": "Belveth", "Cho'Gath": "Chogath",
      "Dr. Mundo": "DrMundo", "Jarvan IV": "JarvanIV", "Kai'Sa": "Kaisa",
      "Kha'Zix": "Khazix", "Kog'Maw": "KogMaw", "K'Sante": "KSante",
      "Lee Sin": "LeeSin", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune",
      "Nunu & Willump": "Nunu", "Rek'Sai": "RekSai", "Renata Glasc": "Renata",
      "Tahm Kench": "TahmKench", "Twisted Fate": "TwistedFate", "Vel'Koz": "Velkoz",
      "Xin Zhao": "XinZhao", Wukong: "MonkeyKing"
    };
    const key = aliases[champion] || champion.replace(/[.'&\s]/g, "");
    return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(match.gameVersion)}/img/champion/${encodeURIComponent(key)}.png`;
  }

  function itemIcon(itemId, gameVersion) {
    return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/item/${encodeURIComponent(itemId)}.png`;
  }

  function spellIcon(spellId, gameVersion) {
    const keys = {
      1: "SummonerBoost", 3: "SummonerExhaust", 4: "SummonerFlash", 6: "SummonerHaste",
      7: "SummonerHeal", 11: "SummonerSmite", 12: "SummonerTeleport", 13: "SummonerMana",
      14: "SummonerDot", 21: "SummonerBarrier", 32: "SummonerSnowball"
    };
    const key = keys[Number(spellId)];
    return key ? `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/spell/${key}.png` : "";
  }

  function matchHistoryRow(match) {
    const won = String(match.result || "").toLowerCase() === "win";
    const queue = QUEUES[Number(match.queueId)]?.label || match.queueLabel || "Ranked";
    const duration = Number(match.durationMin) || 0;
    const items = (Array.isArray(match.items) ? match.items : [])
      .filter((item) => Number(item) > 0)
      .map((item) => `<img src="${itemIcon(item, match.gameVersion)}" alt="Item ${escapeHtml(item)}" loading="lazy" onerror="this.remove()">`)
      .join("");
    const spells = (Array.isArray(match.summonerSpells) ? match.summonerSpells : [])
      .map((spell) => spellIcon(spell, match.gameVersion))
      .filter(Boolean)
      .map((src) => `<img src="${src}" alt="Summoner spell" loading="lazy" onerror="this.remove()">`)
      .join("");

    return `
      <article class="ranked-match-row ${won ? "win" : "loss"}">
        <img class="match-history-champion" src="${championIcon(match)}" alt="${escapeHtml(match.champion || "Unknown champion")}" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="match-history-main">
          <strong>${escapeHtml(match.champion || "Unknown champion")}</strong>
          <span>${escapeHtml(`${won ? "Win" : "Loss"} · ${queue}`)}</span>
        </div>
        <div class="match-history-stats">
          <strong>${escapeHtml(`${Number(match.kills) || 0}/${Number(match.deaths) || 0}/${Number(match.assists) || 0}`)}</strong>
          <span>${escapeHtml(`${Number(match.cs) || 0} CS · ${duration.toFixed(0)}m`)}</span>
        </div>
        <div class="match-history-loadout">
          <span class="match-history-spells">${spells}</span>
          <span class="match-history-items">${items || '<i class="match-history-no-items">No build</i>'}</span>
        </div>
        <time datetime="${escapeHtml(match.gameStart || "")}">${escapeHtml(displayTime(match.gameStart))} GMT+7</time>
      </article>
    `;
  }

  function matchHistoryMarkup(matches) {
    const newest = [...matches].sort((a, b) => new Date(b.gameStart) - new Date(a.gameStart));
    const visible = newest.slice(0, 5);
    const older = newest.slice(5);
    return `
      <section class="ranked-match-history">
        <div class="match-history-head">
          <strong>Match History</strong>
          <span>${newest.length} selected-season games</span>
        </div>
        ${newest.length ? `<div class="match-history-list">${visible.map(matchHistoryRow).join("")}</div>` : '<div class="match-history-empty">No ranked matches are stored for this player in the selected season.</div>'}
        ${older.length ? `
          <details class="match-history-older">
            <summary>Show ${older.length} older matches</summary>
            <div class="match-history-list">${older.map(matchHistoryRow).join("")}</div>
          </details>
        ` : ""}
      </section>
    `;
  }

  function timelineOnlySvg(rows) {
    const width = 760;
    const height = 92;
    const left = 18;
    const right = 12;
    const plotW = width - left - right;
    const x = (index) => left + (rows.length <= 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
    const markers = rows.map((row, index) => {
      const queue = QUEUES[row.queueId];
      return `<line x1="${x(index).toFixed(1)}" y1="42" x2="${x(index).toFixed(1)}" y2="59" stroke="${queue.color}" stroke-width="3"><title>${escapeHtml(matchTooltip(row.match))}</title></line>`;
    }).join("");
    const labels = rows.length ? `
      <text class="lp-x-label" x="${left}" y="80">${escapeHtml(displayDate(rows[0].date))}</text>
      <text class="lp-x-label" x="${width - right}" y="80" text-anchor="end">${escapeHtml(displayDate(rows[rows.length - 1].date))}</text>
    ` : "";
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Season ranked match timeline"><line class="lp-axis" x1="${left}" y1="59" x2="${width - right}" y2="59"></line>${markers}${labels}<text class="lp-empty-label" x="${width / 2}" y="22" text-anchor="middle">LP snapshots are not available for these matches yet</text></svg>`;
  }

  function historySvg(matches, snapshots) {
    const rows = buildRows(matches, snapshots);
    const width = 760;
    const height = 250;
    const left = 48;
    const right = 12;
    const top = 16;
    const bottom = 42;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const allScores = rows.flatMap((row) => [row.solo, row.flex, row.team]).filter(Number.isFinite);
    if (!allScores.length) return timelineOnlySvg(rows);

    let minY = Math.min(...allScores);
    let maxY = Math.max(...allScores);
    minY = Math.floor((minY - 80) / 100) * 100;
    maxY = Math.ceil((maxY + 80) / 100) * 100;
    if (minY === maxY) maxY = minY + 100;

    const x = (index) => left + (rows.length <= 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
    const y = (value) => top + ((maxY - value) / (maxY - minY)) * plotH;
    const yTicks = Array.from({ length: 5 }, (_, i) => maxY - ((maxY - minY) * i) / 4);
    const xTickCount = Math.min(7, rows.length);
    const xTickIndices = xTickCount <= 1 ? [0] : Array.from(new Set(
      Array.from({ length: xTickCount }, (_, i) => Math.round(i * (rows.length - 1) / (xTickCount - 1)))
    ));

    const grid = yTicks.map((tick) => `
      <line class="lp-grid" x1="${left}" y1="${y(tick).toFixed(1)}" x2="${width - right}" y2="${y(tick).toFixed(1)}"></line>
      <text class="lp-y-label" x="${left - 7}" y="${(y(tick) + 3).toFixed(1)}" text-anchor="end">${escapeHtml(scoreLabel(tick))}</text>
    `).join("");

    const xLabels = xTickIndices.map((index) => `
      <text class="lp-x-label" x="${x(index).toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(displayDate(rows[index].date))}</text>
    `).join("");

    const matchStrip = rows.map((row, index) => {
      const queue = QUEUES[row.queueId];
      return `<line class="lp-match-tick" x1="${x(index).toFixed(1)}" y1="${height - bottom + 5}" x2="${x(index).toFixed(1)}" y2="${height - bottom + 15}" stroke="${queue.color}"><title>${escapeHtml(matchTooltip(row.match))}</title></line>`;
    }).join("");

    const drawSeries = (field, queueId) => {
      const queue = QUEUES[queueId];
      const segments = [];
      let current = [];
      rows.forEach((row, index) => {
        const value = row[field];
        if (!Number.isFinite(value)) {
          if (current.length) segments.push(current);
          current = [];
          return;
        }
        current.push(`${x(index).toFixed(1)},${y(value).toFixed(1)}`);
      });
      if (current.length) segments.push(current);
      const lines = segments.map((points) => `<polyline class="lp-line" points="${points.join(" ")}" stroke="${queue.color}"></polyline>`).join("");
      const dots = rows.map((row, index) => {
        if (row.queueId !== queueId) return "";
        const value = row[field];
        if (!Number.isFinite(value)) return "";
        const point = row[`${field}Point`];
        const detail = point && point.matchId === row.match.matchId ? rankText(point) : "LP snapshot not captured for this match";
        return `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="3.2" fill="${queue.color}"><title>${escapeHtml(`${matchTooltip(row.match)} · ${detail}`)}</title></circle>`;
      }).join("");
      return `${lines}${dots}`;
    };

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Match-based LP history for every ranked match in the selected season">
        ${grid}
        ${drawSeries("solo", 420)}
        ${drawSeries("flex", 440)}
        ${drawSeries("team", 42)}
        <line class="lp-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
        ${matchStrip}
        ${xLabels}
      </svg>
    `;
  }

  function markup(matches, snapshots) {
    const range = selectedSeasonRange();
    const counts = { 42: 0, 420: 0, 440: 0 };
    matches.forEach((match) => { if (counts[Number(match.queueId)] !== undefined) counts[Number(match.queueId)] += 1; });

    return `
      <section class="ranked-lp-history">
        <div class="lp-history-head">
          <div>
            <strong>Ranked LP History</strong>
            <span>${escapeHtml(`${range.label} · ${matches.length} matches · match-based · GMT+7`)}</span>
          </div>
          <div class="lp-history-legend">
            <span><i style="--legend:${QUEUES[420].color}"></i>Solo/Duo (${counts[420]})</span>
            <span><i style="--legend:${QUEUES[440].color}"></i>Flex (${counts[440]})</span>
            <span><i style="--legend:${QUEUES[42].color}"></i>Ranked Team 5v5 (${counts[42]})</span>
          </div>
        </div>
        <div class="lp-history-chart">${matches.length ? historySvg(matches, snapshots) : '<div class="lp-history-empty">No matches from these three ranked queues are stored for this season.</div>'}</div>
        <div class="lp-history-note">Every coloured tick is one match. LP curves use recorded post-match snapshots only; missing historical LP is left missing rather than estimated.</div>
      </section>
    `;
  }

  function installStyles() {
    if (document.getElementById("rift-lp-history-style")) return;
    const style = document.createElement("style");
    style.id = "rift-lp-history-style";
    style.textContent = `
      .league-player-card .ranked-history { display:none !important; }
      .league-player-card .ranked-lp-history { margin-top:12px; padding:11px 10px 8px; border:1px solid #454a52; border-radius:4px; background:#111419; overflow:hidden; }
      .league-player-card .lp-history-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:4px; }
      .league-player-card .lp-history-head > div:first-child { display:grid; gap:2px; }
      .league-player-card .lp-history-head strong { color:#f5f7fa; font-size:.82rem; font-weight:950; }
      .league-player-card .lp-history-head span, .league-player-card .lp-history-note { color:#8f98a6; font-size:.63rem; font-weight:700; }
      .league-player-card .lp-history-legend { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:7px 10px; padding-top:2px; }
      .league-player-card .lp-history-legend span { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
      .league-player-card .lp-history-legend i { width:18px; height:3px; border-radius:4px; background:var(--legend); }
      .league-player-card .lp-history-chart svg { display:block; width:100%; height:auto; min-height:190px; }
      .league-player-card .lp-grid { stroke:rgba(174,181,191,.18); stroke-width:1; stroke-dasharray:4 5; }
      .league-player-card .lp-axis { stroke:rgba(174,181,191,.32); stroke-width:1; }
      .league-player-card .lp-line { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
      .league-player-card .lp-match-tick { stroke-width:2.2; opacity:.88; }
      .league-player-card .lp-y-label, .league-player-card .lp-x-label { fill:#8f98a6; font-size:8px; font-weight:750; }
      .league-player-card .lp-empty-label { fill:#aeb5bf; font-size:10px; font-weight:800; }
      .league-player-card .lp-history-empty { padding:24px 8px; color:#8f98a6; font-size:.72rem; text-align:center; }
      .league-player-card .lp-history-note { margin-top:2px; }
      .league-player-card .ranked-match-history { margin-top:12px; padding:11px 10px; border:1px solid #454a52; border-radius:4px; background:#111419; }
      .league-player-card .match-history-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:8px; }
      .league-player-card .match-history-head strong { color:#f5f7fa; font-size:.82rem; font-weight:950; }
      .league-player-card .match-history-head span { color:#8f98a6; font-size:.64rem; font-weight:750; }
      .league-player-card .match-history-list { display:grid; gap:5px; }
      .league-player-card .ranked-match-row { display:grid; grid-template-columns:36px minmax(105px,1fr) 82px minmax(130px,1.25fr) auto; align-items:center; gap:8px; min-width:0; padding:6px 7px; border-left:3px solid #ff5f73; border-radius:3px; background:#1c2026; }
      .league-player-card .ranked-match-row.win { border-left-color:#5bf2a8; }
      .league-player-card .match-history-champion { width:36px; height:36px; border-radius:4px; object-fit:cover; }
      .league-player-card .match-history-main, .league-player-card .match-history-stats { display:grid; min-width:0; gap:2px; }
      .league-player-card .match-history-main strong, .league-player-card .match-history-stats strong { overflow:hidden; color:#f5f7fa; font-size:.72rem; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
      .league-player-card .match-history-main span, .league-player-card .match-history-stats span, .league-player-card .ranked-match-row time { color:#9ca5b3; font-size:.58rem; font-weight:700; white-space:nowrap; }
      .league-player-card .match-history-loadout { display:flex; align-items:center; min-width:0; gap:5px; }
      .league-player-card .match-history-spells, .league-player-card .match-history-items { display:flex; align-items:center; gap:2px; min-width:0; }
      .league-player-card .match-history-spells img, .league-player-card .match-history-items img { width:22px; height:22px; border-radius:3px; object-fit:cover; }
      .league-player-card .match-history-no-items { color:#7f8997; font-size:.56rem; font-style:normal; }
      .league-player-card .match-history-older { margin-top:7px; }
      .league-player-card .match-history-older summary { padding:7px; border-radius:3px; background:#20252c; color:#b9c2ce; cursor:pointer; font-size:.64rem; font-weight:850; text-align:center; list-style-position:inside; }
      .league-player-card .match-history-older[open] summary { margin-bottom:5px; }
      .league-player-card .match-history-empty { padding:16px 8px; color:#8f98a6; font-size:.68rem; text-align:center; }
      @media (max-width:700px) {
        .league-player-card .ranked-match-row { grid-template-columns:34px minmax(0,1fr) auto; gap:6px; }
        .league-player-card .match-history-champion { width:34px; height:34px; }
        .league-player-card .match-history-stats { justify-items:end; }
        .league-player-card .match-history-loadout { grid-column:2 / -1; }
        .league-player-card .ranked-match-row time { grid-column:2 / -1; }
        .league-player-card .match-history-spells img, .league-player-card .match-history-items img { width:20px; height:20px; }
      }
    `;
    document.head.appendChild(style);
  }

  async function patchCard(card, raw) {
    const displayedId = card.querySelector(".league-id-row h3")?.textContent.trim() || "";
    const player = (raw.players || []).find((entry) => riotId(entry) === displayedId || entry.name === displayedId);
    if (!player) return;
    const matches = playerMatches(raw, player);
    const snapshots = playerSnapshots(raw, player);
    const signature = [selectedSeasonRange().label, ...matches.map((match) => `${match.queueId}:${match.matchId}`), ...snapshots.map((point) => `${point.queueId}:${point.matchId}:${point.score}`)].join("|");
    let panel = card.querySelector(".ranked-lp-history");
    let matchHistory = card.querySelector(".ranked-match-history");
    if (panel?.dataset.signature === signature && matchHistory?.dataset.signature === signature) return;
    const holder = document.createElement("div");
    holder.innerHTML = `${markup(matches, snapshots)}${matchHistoryMarkup(matches)}`;
    const nextPanel = holder.querySelector(".ranked-lp-history");
    const nextMatchHistory = holder.querySelector(".ranked-match-history");
    nextPanel.dataset.signature = signature;
    nextMatchHistory.dataset.signature = signature;
    if (panel) panel.replaceWith(nextPanel);
    else (card.querySelector(".league-card-body") || card).appendChild(nextPanel);
    if (matchHistory) matchHistory.replaceWith(nextMatchHistory);
    else (card.querySelector(".league-card-body") || card).appendChild(nextMatchHistory);
  }

  async function patchAll() {
    installStyles();
    const raw = await loadRawData();
    document.querySelectorAll(".league-player-card").forEach((card) => patchCard(card, raw));
  }

  function queuePatch() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchAll();
    });
  }

  function start() {
    installStyles();
    new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true });
    [0, 300, 1000, 2500].forEach((delay) => setTimeout(patchAll, delay));
    window.addEventListener("rift-lab-season-change", () => {
      rawDataPromise = null;
      queuePatch();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
