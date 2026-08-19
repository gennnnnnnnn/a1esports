(() => {
  "use strict";

  const COLORS = {
    solo: "#ff4d4f",
    flex: "#f2c15b",
    combined: "#55df61"
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
      end: end && !Number.isNaN(end.getTime()) ? end : null
    };
  }

  function pointDate(point) {
    const date = new Date(point.gameStart || point.capturedAt || 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function playerHistory(raw, player) {
    const range = selectedSeasonRange();
    return (raw.lpHistory || [])
      .filter((point) => (player.puuid && point.playerPuuid === player.puuid) || key(point.player) === key(player.name))
      .filter((point) => [420, 440].includes(Number(point.queueId)))
      .filter((point) => {
        const date = pointDate(point);
        if (!date) return false;
        if (range.start && date < range.start) return false;
        if (range.end && date >= range.end) return false;
        return true;
      })
      .sort((a, b) => pointDate(a) - pointDate(b));
  }

  function displayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return `${String(local.getUTCMonth() + 1).padStart(2, "0")}/${String(local.getUTCDate()).padStart(2, "0")}`;
  }

  function rankText(point) {
    if (!point) return "—";
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

  function seriesPoints(history) {
    let solo = null;
    let flex = null;
    return history.map((point) => {
      const score = Number(point.score);
      if (!Number.isFinite(score)) return null;
      if (Number(point.queueId) === 420) solo = score;
      if (Number(point.queueId) === 440) flex = score;
      const combined = solo !== null && flex !== null ? (solo + flex) / 2 : (solo ?? flex);
      return {
        point,
        date: point.gameStart || point.capturedAt,
        solo,
        flex,
        combined
      };
    }).filter(Boolean);
  }

  function historySvg(history) {
    const rows = seriesPoints(history);
    const width = 760;
    const height = 230;
    const left = 48;
    const right = 12;
    const top = 16;
    const bottom = 30;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const allScores = rows.flatMap((row) => [row.solo, row.flex, row.combined]).filter(Number.isFinite);
    let minY = Math.min(...allScores);
    let maxY = Math.max(...allScores);
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return "";
    minY = Math.floor((minY - 80) / 100) * 100;
    maxY = Math.ceil((maxY + 80) / 100) * 100;
    if (minY === maxY) maxY = minY + 100;

    const x = (index) => left + (rows.length <= 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
    const y = (value) => top + ((maxY - value) / (maxY - minY)) * plotH;
    const yTicks = Array.from({ length: 5 }, (_, i) => maxY - ((maxY - minY) * i) / 4);
    const xTickCount = Math.min(6, rows.length);
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

    const drawSeries = (field, color, label, queueId = null) => {
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
      const lines = segments.map((points) => `<polyline class="lp-line" points="${points.join(" ")}" stroke="${color}"></polyline>`).join("");
      const dots = rows.map((row, index) => {
        const value = row[field];
        if (!Number.isFinite(value)) return "";
        if (queueId !== null && Number(row.point.queueId) !== queueId) return "";
        const title = field === "combined"
          ? `${displayDate(row.date)} · 5v5 combined index ${Math.round(value)}`
          : `${displayDate(row.date)} · ${label}: ${rankText(row.point)}${row.point.baseline ? " · baseline capture" : ""}`;
        return `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="3" fill="${color}"><title>${escapeHtml(title)}</title></circle>`;
      }).join("");
      return `${lines}${dots}`;
    };

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="LP history by ranked queue">
        ${grid}
        ${drawSeries("solo", COLORS.solo, "Solo/Duo", 420)}
        ${drawSeries("flex", COLORS.flex, "Flex", 440)}
        ${drawSeries("combined", COLORS.combined, "5v5")}
        ${xLabels}
      </svg>
    `;
  }

  function markup(history) {
    if (!history.length) {
      return `
        <section class="ranked-lp-history">
          <div class="lp-history-head"><div><strong>Ranked LP History</strong><span>Recording starts with the next live data refresh.</span></div></div>
          <div class="lp-history-empty">Historical LP cannot be recovered from Riot match history, so no fake backfill is shown.</div>
        </section>
      `;
    }

    return `
      <section class="ranked-lp-history">
        <div class="lp-history-head">
          <div><strong>Ranked LP History</strong><span>Captured after ranked matches · GMT+7</span></div>
          <div class="lp-history-legend">
            <span><i style="--legend:${COLORS.solo}"></i>Solo/Duo</span>
            <span><i style="--legend:${COLORS.flex}"></i>Flex</span>
            <span><i style="--legend:${COLORS.combined}"></i>5v5</span>
          </div>
        </div>
        <div class="lp-history-chart">${historySvg(history)}</div>
        <div class="lp-history-note">5v5 is the combined Solo/Flex ladder index; Riot does not provide a separate combined 5v5 LP ladder.</div>
      </section>
    `;
  }

  function installStyles() {
    if (document.getElementById("rift-lp-history-style")) return;
    const style = document.createElement("style");
    style.id = "rift-lp-history-style";
    style.textContent = `
      .league-player-card .ranked-history { display: none !important; }
      .league-player-card .ranked-lp-history { margin-top:12px; padding:11px 10px 8px; border:1px solid #454a52; border-radius:4px; background:#111419; overflow:hidden; }
      .league-player-card .lp-history-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:4px; }
      .league-player-card .lp-history-head > div:first-child { display:grid; gap:2px; }
      .league-player-card .lp-history-head strong { color:#f5f7fa; font-size:.82rem; font-weight:950; }
      .league-player-card .lp-history-head span, .league-player-card .lp-history-note { color:#8f98a6; font-size:.63rem; font-weight:700; }
      .league-player-card .lp-history-legend { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:7px 10px; padding-top:2px; }
      .league-player-card .lp-history-legend span { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
      .league-player-card .lp-history-legend i { width:18px; height:3px; border-radius:4px; background:var(--legend); box-shadow:0 0 8px color-mix(in srgb, var(--legend) 45%, transparent); }
      .league-player-card .lp-history-chart svg { display:block; width:100%; height:auto; min-height:190px; }
      .league-player-card .lp-grid { stroke:rgba(174,181,191,.18); stroke-width:1; stroke-dasharray:4 5; }
      .league-player-card .lp-line { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
      .league-player-card .lp-y-label, .league-player-card .lp-x-label { fill:#8f98a6; font-size:8px; font-weight:750; }
      .league-player-card .lp-history-empty { padding:24px 8px; color:#8f98a6; font-size:.72rem; text-align:center; }
      .league-player-card .lp-history-note { margin-top:2px; }
    `;
    document.head.appendChild(style);
  }

  async function patchCard(card, raw) {
    const displayedId = card.querySelector(".league-id-row h3")?.textContent.trim() || "";
    const player = (raw.players || []).find((entry) => riotId(entry) === displayedId || entry.name === displayedId);
    if (!player) return;
    const history = playerHistory(raw, player);
    const signature = history.map((point) => `${point.queueId}:${point.matchId}:${point.score}:${point.capturedAt}`).join("|");
    let panel = card.querySelector(".ranked-lp-history");
    if (panel?.dataset.signature === signature) return;
    const holder = document.createElement("div");
    holder.innerHTML = markup(history).trim();
    const next = holder.firstElementChild;
    next.dataset.signature = signature;
    if (panel) panel.replaceWith(next);
    else card.querySelector(".league-card-body")?.appendChild(next);
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

  document.addEventListener("DOMContentLoaded", () => {
    installStyles();
    new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true });
    [0, 300, 1000].forEach((delay) => setTimeout(patchAll, delay));
    window.addEventListener("rift-lab-season-change", () => {
      rawDataPromise = null;
      queuePatch();
    });
  });
})();
