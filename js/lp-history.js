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

  const DIVISIONS = ["IV", "III", "II", "I"];
  const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
  let rawDataPromise = null;
  let queued = false;
  let observer = null;

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
      .replace(/\"/g, "&quot;")
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
          return window.RIFT_LAB_DATA || {};
        });
    }
    return rawDataPromise;
  }

  function pointDate(point) {
    const date = new Date(point.gameStart || point.capturedAt || 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function selectedSeasonRange() {
    const detail = window.RIFT_LAB_SELECTED_SEASON_DETAIL;
    if (!detail) return { start: null, end: null };
    const start = detail.start ? new Date(detail.start) : null;
    const end = detail.end ? new Date(detail.end) : null;
    return {
      start: start && !Number.isNaN(start.getTime()) ? start : null,
      end: end && !Number.isNaN(end.getTime()) ? end : null
    };
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
    const tiers = Object.entries(TIER_BASE).sort((a, b) => a[1] - b[1]);
    let tier = tiers[0];
    for (const entry of tiers) {
      if (score >= entry[1]) tier = entry;
    }
    const [name, base] = tier;
    if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(name)) {
      return `${name[0]} ${Math.max(0, Math.round(score - base))}`;
    }
    const divisionIndex = Math.max(0, Math.min(3, Math.floor((score - base) / 100)));
    return `${name[0]}${DIVISIONS[divisionIndex]}`;
  }

  function seriesRows(history) {
    let solo = null;
    let flex = null;
    return history.map((point) => {
      const score = Number(point.score);
      if (!Number.isFinite(score)) return null;
      if (Number(point.queueId) === 420) solo = score;
      if (Number(point.queueId) === 440) flex = score;
      return {
        point,
        date: point.gameStart || point.capturedAt,
        solo,
        flex,
        combined: solo !== null && flex !== null ? (solo + flex) / 2 : (solo ?? flex)
      };
    }).filter(Boolean);
  }

  function historySvg(history) {
    const rows = seriesRows(history);
    if (!rows.length) return "";

    const width = 760;
    const height = 230;
    const left = 50;
    const right = 14;
    const top = 16;
    const bottom = 30;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const scores = rows.flatMap((row) => [row.solo, row.flex, row.combined]).filter(Number.isFinite);
    let minY = Math.floor((Math.min(...scores) - 80) / 100) * 100;
    let maxY = Math.ceil((Math.max(...scores) + 80) / 100) * 100;
    if (minY === maxY) maxY += 100;

    const x = (index) => left + (rows.length === 1 ? plotW / 2 : index * plotW / (rows.length - 1));
    const y = (value) => top + (maxY - value) * plotH / (maxY - minY);
    const yTicks = Array.from({ length: 5 }, (_, index) => maxY - (maxY - minY) * index / 4);
    const xTickCount = Math.min(6, rows.length);
    const xIndices = xTickCount <= 1
      ? [0]
      : Array.from(new Set(Array.from({ length: xTickCount }, (_, index) => Math.round(index * (rows.length - 1) / (xTickCount - 1)))));

    const grid = yTicks.map((tick) => `
      <line class="lp-grid" x1="${left}" y1="${y(tick).toFixed(1)}" x2="${width - right}" y2="${y(tick).toFixed(1)}"></line>
      <text class="lp-y-label" x="${left - 7}" y="${(y(tick) + 3).toFixed(1)}" text-anchor="end">${escapeHtml(scoreLabel(tick))}</text>
    `).join("");

    const xLabels = xIndices.map((index) => `
      <text class="lp-x-label" x="${x(index).toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(displayDate(rows[index].date))}</text>
    `).join("");

    function draw(field, color, label, queueId = null) {
      const points = rows
        .map((row, index) => Number.isFinite(row[field]) ? `${x(index).toFixed(1)},${y(row[field]).toFixed(1)}` : null)
        .filter(Boolean)
        .join(" ");

      const line = points ? `<polyline class="lp-line" points="${points}" stroke="${color}"></polyline>` : "";
      const dots = rows.map((row, index) => {
        const value = row[field];
        if (!Number.isFinite(value)) return "";
        if (queueId !== null && Number(row.point.queueId) !== queueId) return "";
        const title = field === "combined"
          ? `${displayDate(row.date)} · 5v5 combined index ${Math.round(value)}`
          : `${displayDate(row.date)} · ${label}: ${rankText(row.point)}${row.point.baseline ? " · baseline" : ""}`;
        return `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="3" fill="${color}"><title>${escapeHtml(title)}</title></circle>`;
      }).join("");
      return line + dots;
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ranked LP history">
        ${grid}
        ${draw("solo", COLORS.solo, "Solo/Duo", 420)}
        ${draw("flex", COLORS.flex, "Flex", 440)}
        ${draw("combined", COLORS.combined, "5v5")}
        ${xLabels}
      </svg>
    `;
  }

  function markup(history) {
    const head = `
      <div class="lp-history-head">
        <div>
          <strong>Ranked LP History</strong>
          <span>${history.length ? `Captured after ranked matches · ${history.length} snapshots · GMT+7` : "Waiting for the first LP snapshot"}</span>
        </div>
        <div class="lp-history-legend">
          <span><i style="--legend:${COLORS.solo}"></i>Solo/Duo</span>
          <span><i style="--legend:${COLORS.flex}"></i>Flex</span>
          <span><i style="--legend:${COLORS.combined}"></i>5v5</span>
        </div>
      </div>`;

    if (!history.length) {
      return `<section class="ranked-lp-history">${head}<div class="lp-history-empty">LP recording is enabled. The first real point appears after a successful data refresh.</div></section>`;
    }

    return `
      <section class="ranked-lp-history">
        ${head}
        <div class="lp-history-chart">${historySvg(history)}</div>
        <div class="lp-history-note">Solo/Duo = red · Flex = yellow · 5v5 combined index = green.</div>
      </section>
    `;
  }

  function installStyles() {
    if (document.getElementById("rift-lp-history-style")) return;
    const style = document.createElement("style");
    style.id = "rift-lp-history-style";
    style.textContent = `
      .league-player-card .ranked-history{display:none!important}
      .league-player-card .ranked-lp-history{margin-top:12px;padding:11px 10px 8px;border:1px solid #454a52;border-radius:4px;background:#111419;overflow:hidden}
      .league-player-card .lp-history-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:4px}
      .league-player-card .lp-history-head>div:first-child{display:grid;gap:2px}
      .league-player-card .lp-history-head strong{color:#f5f7fa;font-size:.82rem;font-weight:950}
      .league-player-card .lp-history-head span,.league-player-card .lp-history-note{color:#8f98a6;font-size:.63rem;font-weight:700}
      .league-player-card .lp-history-legend{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px 10px;padding-top:2px}
      .league-player-card .lp-history-legend span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
      .league-player-card .lp-history-legend i{width:18px;height:3px;border-radius:4px;background:var(--legend)}
      .league-player-card .lp-history-chart svg{display:block;width:100%;height:auto;min-height:190px}
      .league-player-card .lp-grid{stroke:rgba(174,181,191,.18);stroke-width:1;stroke-dasharray:4 5}
      .league-player-card .lp-line{fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
      .league-player-card .lp-y-label,.league-player-card .lp-x-label{fill:#8f98a6;font-size:8px;font-weight:750}
      .league-player-card .lp-history-empty{padding:24px 8px;color:#8f98a6;font-size:.72rem;text-align:center}
      .league-player-card .lp-history-note{margin-top:2px}
    `;
    document.head.appendChild(style);
  }

  function patchCard(card, raw) {
    const displayedId = card.querySelector(".league-id-row h3")?.textContent.trim() || "";
    const player = (raw.players || []).find((entry) => riotId(entry) === displayedId || entry.name === displayedId);
    if (!player) return;

    const history = playerHistory(raw, player);
    const signature = history.map((point) => `${point.queueId}:${point.matchId}:${point.score}:${point.capturedAt}`).join("|") || "empty";
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

  function start() {
    installStyles();
    if (!observer) {
      observer = new MutationObserver(queuePatch);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    [0, 300, 1000, 2500].forEach((delay) => setTimeout(patchAll, delay));
    window.addEventListener("rift-lab-season-change", () => {
      rawDataPromise = null;
      queuePatch();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
