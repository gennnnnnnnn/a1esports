window.RIFT_LAB_CONFIG = {
  apiUrl: "data/rift-lab.json",
  useSampleDataWhenMissingApi: true
};

// The schedule grid is date-only, while match timestamps are UTC instants.
// Re-bucket schedule matches by their GMT+7 calendar day so late-UTC games
// appear on the same date shown by the player card timestamp.
(() => {
  const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function riotId(player) {
    return player?.riotName && player?.tag ? `${player.riotName}#${player.tag}` : (player?.name || "");
  }

  function gmt7Parts(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return {
      year: local.getUTCFullYear(),
      month: local.getUTCMonth(),
      day: local.getUTCDate()
    };
  }

  function dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function emptyRecord() {
    return {
      wins: 0,
      losses: 0,
      solo: { wins: 0, losses: 0 },
      flex: { wins: 0, losses: 0 }
    };
  }

  function patchSchedule(card) {
    const data = window.RIFT_LAB_DATA;
    const schedule = card.querySelector(".player-schedule");
    if (!data || !schedule) return;

    const displayedId = card.querySelector(".league-id-row h3")?.textContent.trim() || "";
    const player = (data.players || []).find((entry) => riotId(entry) === displayedId || entry.name === displayedId);
    if (!player) return;

    const year = Number.parseInt(schedule.querySelector(".player-schedule-head span")?.textContent || "", 10);
    if (!Number.isFinite(year)) return;

    const byDay = new Map();
    (data.matches || []).forEach((match) => {
      if (normalizeKey(match.player) !== normalizeKey(player.name)) return;
      const parts = gmt7Parts(match.gameStart);
      if (!parts || parts.year !== year) return;

      const key = dateKey(parts.year, parts.month, parts.day);
      const record = byDay.get(key) || emptyRecord();
      const bucket = Number(match.queueId) === 420 ? record.solo : record.flex;
      if (match.result === "Win") {
        record.wins += 1;
        bucket.wins += 1;
      } else {
        record.losses += 1;
        bucket.losses += 1;
      }
      byDay.set(key, record);
    });

    const jan1 = new Date(Date.UTC(year, 0, 1));
    const mondayOffset = (jan1.getUTCDay() + 6) % 7;
    const gridStart = new Date(jan1);
    gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset);

    schedule.querySelectorAll(".schedule-row").forEach((row, dayIndex) => {
      row.querySelectorAll(".schedule-cell").forEach((cell, weekIndex) => {
        const date = new Date(gridStart);
        date.setUTCDate(gridStart.getUTCDate() + weekIndex * 7 + dayIndex);
        if (date.getUTCFullYear() !== year) return;

        const record = byDay.get(dateKey(year, date.getUTCMonth(), date.getUTCDate())) || emptyRecord();
        const games = record.wins + record.losses;
        const text = games ? String(games) : "";
        if (cell.textContent !== text) cell.textContent = text;
        cell.classList.toggle("has-games", games > 0);

        const title = [
          `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}: ${games} games`,
          `Solo/Duo: ${record.solo.wins}W - ${record.solo.losses}L`,
          `Flex: ${record.flex.wins}W - ${record.flex.losses}L`
        ].join("\n");
        if (cell.title !== title) cell.title = title;
        if (cell.getAttribute("aria-label") !== title) cell.setAttribute("aria-label", title);
      });
    });
  }

  function patchSchedules() {
    document.querySelectorAll(".league-player-card").forEach(patchSchedule);
  }

  let queued = false;
  function queuePatch() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchSchedules();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true });
    [0, 250, 1000].forEach((delay) => setTimeout(patchSchedules, delay));
    window.addEventListener("rift-lab-season-change", queuePatch);
  });
})();

// Player-card ranked history chart. Riot match history does not expose historical LP,
// so the three curves show cumulative W-L progression instead of inventing LP values.
(() => {
  const HISTORY_LIMIT = 99;
  const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
  const COLORS = {
    solo: "#31c7ff",
    flex: "#55df61",
    combined: "#f0bd4f"
  };

  function key(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

  function activeMatches() {
    const data = window.RIFT_LAB_DATA || {};
    return window.RIFT_LAB_GET_ACTIVE_MATCHES
      ? window.RIFT_LAB_GET_ACTIVE_MATCHES()
      : (data.matches || []);
  }

  function playerMatches(player) {
    return activeMatches()
      .filter((match) => key(match.player) === key(player.name) && [420, 440].includes(Number(match.queueId)))
      .sort((a, b) => new Date(a.gameStart).getTime() - new Date(b.gameStart).getTime())
      .slice(-HISTORY_LIMIT);
  }

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return `${String(local.getUTCMonth() + 1).padStart(2, "0")}/${String(local.getUTCDate()).padStart(2, "0")}`;
  }

  function dateTitle(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() + GMT7_OFFSET_MS);
    return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")} GMT+7`;
  }

  function progression(matches) {
    let solo = 0;
    let flex = 0;
    let combined = 0;
    return matches.map((match) => {
      const delta = match.result === "Win" ? 1 : -1;
      if (Number(match.queueId) === 420) solo += delta;
      if (Number(match.queueId) === 440) flex += delta;
      combined += delta;
      return {
        date: match.gameStart,
        solo,
        flex,
        combined
      };
    });
  }

  function historySvg(matches) {
    const values = progression(matches);
    const width = 760;
    const height = 220;
    const left = 44;
    const right = 12;
    const top = 15;
    const bottom = 28;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const allY = [0, ...values.flatMap((point) => [point.solo, point.flex, point.combined])];
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    } else {
      minY -= 1;
      maxY += 1;
    }

    const x = (index) => left + (values.length <= 1 ? plotW / 2 : (index / (values.length - 1)) * plotW);
    const y = (value) => top + ((maxY - value) / (maxY - minY)) * plotH;
    const yTicks = Array.from({ length: 5 }, (_, index) => maxY - ((maxY - minY) * index) / 4);
    const xTickCount = Math.min(6, values.length);
    const xTickIndices = xTickCount <= 1
      ? [0]
      : Array.from(new Set(Array.from({ length: xTickCount }, (_, index) => Math.round(index * (values.length - 1) / (xTickCount - 1)))));

    const grid = yTicks.map((tick) => `
      <line class="history-grid" x1="${left}" y1="${y(tick).toFixed(1)}" x2="${width - right}" y2="${y(tick).toFixed(1)}"></line>
      <text class="history-y-label" x="${left - 8}" y="${(y(tick) + 3).toFixed(1)}" text-anchor="end">${tick > 0 ? "+" : ""}${Math.round(tick)}</text>
    `).join("");

    const xLabels = xTickIndices.map((index) => `
      <text class="history-x-label" x="${x(index).toFixed(1)}" y="${height - 7}" text-anchor="middle">${escapeHtml(dateLabel(values[index]?.date))}</text>
    `).join("");

    const line = (field, color) => {
      const points = values.map((point, index) => `${x(index).toFixed(1)},${y(point[field]).toFixed(1)}`).join(" ");
      const dots = values.map((point, index) => `
        <circle class="history-dot" cx="${x(index).toFixed(1)}" cy="${y(point[field]).toFixed(1)}" r="2.6" fill="${color}">
          <title>${escapeHtml(`${dateTitle(point.date)} · ${field === "combined" ? "5v5" : field === "solo" ? "Solo/Duo" : "Flex"}: ${point[field] >= 0 ? "+" : ""}${point[field]}`)}</title>
        </circle>
      `).join("");
      return `<polyline class="history-line" points="${points}" stroke="${color}"></polyline>${dots}`;
    };

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ranked 5v5 cumulative win-loss history">
        ${grid}
        <line class="history-zero" x1="${left}" y1="${y(0).toFixed(1)}" x2="${width - right}" y2="${y(0).toFixed(1)}"></line>
        ${line("solo", COLORS.solo)}
        ${line("flex", COLORS.flex)}
        ${line("combined", COLORS.combined)}
        ${xLabels}
      </svg>
    `;
  }

  function historyMarkup(matches) {
    if (!matches.length) {
      return `
        <section class="ranked-history">
          <div class="ranked-history-head">
            <div><strong>Ranked 5v5 Progress</strong><span>No ranked history available</span></div>
          </div>
          <div class="ranked-history-empty">No Solo/Duo or Flex matches in the selected season.</div>
        </section>
      `;
    }

    return `
      <section class="ranked-history">
        <div class="ranked-history-head">
          <div>
            <strong>Ranked 5v5 Progress</strong>
            <span>Cumulative W-L over the last ${matches.length} ranked games</span>
          </div>
          <div class="ranked-history-legend" aria-label="Chart legend">
            <span><i style="--legend:${COLORS.solo}"></i>Solo/Duo</span>
            <span><i style="--legend:${COLORS.flex}"></i>Flex</span>
            <span><i style="--legend:${COLORS.combined}"></i>5v5</span>
          </div>
        </div>
        <div class="ranked-history-chart">${historySvg(matches)}</div>
      </section>
    `;
  }

  function patchHistory(card) {
    const data = window.RIFT_LAB_DATA;
    if (!data) return;
    const displayedId = card.querySelector(".league-id-row h3")?.textContent.trim() || "";
    const player = (data.players || []).find((entry) => riotId(entry) === displayedId || entry.name === displayedId);
    if (!player) return;

    const matches = playerMatches(player);
    const signature = matches.map((match) => `${match.matchId || match.gameStart}:${match.result}:${match.queueId}`).join("|");
    let history = card.querySelector(".ranked-history");
    if (history?.dataset.signature === signature) return;

    const holder = document.createElement("div");
    holder.innerHTML = historyMarkup(matches).trim();
    const next = holder.firstElementChild;
    next.dataset.signature = signature;
    if (history) history.replaceWith(next);
    else card.querySelector(".league-card-body")?.appendChild(next);
  }

  function patchAllHistory() {
    document.querySelectorAll(".league-player-card").forEach(patchHistory);
  }

  function installStyles() {
    if (document.getElementById("rift-ranked-history-style")) return;
    const style = document.createElement("style");
    style.id = "rift-ranked-history-style";
    style.textContent = `
      .league-player-card .ranked-history {
        margin-top: 12px;
        padding: 11px 10px 8px;
        border: 1px solid #454a52;
        border-radius: 4px;
        background:
          linear-gradient(rgba(17, 20, 25, 0.94), rgba(17, 20, 25, 0.94)),
          radial-gradient(circle at 75% 20%, rgba(49, 199, 255, 0.08), transparent 38%);
        overflow: hidden;
      }
      .league-player-card .ranked-history-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 3px;
      }
      .league-player-card .ranked-history-head > div:first-child {
        display: grid;
        gap: 2px;
      }
      .league-player-card .ranked-history-head strong {
        color: #f5f7fa;
        font-size: 0.82rem;
        font-weight: 950;
      }
      .league-player-card .ranked-history-head span {
        color: #8f98a6;
        font-size: 0.64rem;
        font-weight: 700;
      }
      .league-player-card .ranked-history-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 7px 10px;
        padding-top: 2px;
      }
      .league-player-card .ranked-history-legend span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        color: #bbc2cc;
        font-size: 0.6rem;
        font-weight: 850;
      }
      .league-player-card .ranked-history-legend i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--legend);
        box-shadow: 0 0 8px color-mix(in srgb, var(--legend) 65%, transparent);
      }
      .league-player-card .ranked-history-chart svg {
        display: block;
        width: 100%;
        height: auto;
        min-height: 150px;
      }
      .league-player-card .history-grid {
        stroke: rgba(151, 161, 175, 0.15);
        stroke-width: 1;
        stroke-dasharray: 4 5;
      }
      .league-player-card .history-zero {
        stroke: rgba(225, 230, 236, 0.32);
        stroke-width: 1;
        stroke-dasharray: 4 4;
      }
      .league-player-card .history-line {
        fill: none;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.92;
      }
      .league-player-card .history-dot {
        stroke: #111419;
        stroke-width: 1.2;
      }
      .league-player-card .history-x-label,
      .league-player-card .history-y-label {
        fill: #778190;
        font-size: 9px;
        font-weight: 750;
      }
      .league-player-card .ranked-history-empty {
        display: grid;
        min-height: 120px;
        place-items: center;
        color: #778190;
        font-size: 0.72rem;
      }
      @media (max-width: 620px) {
        .league-player-card .ranked-history-head {
          display: grid;
        }
        .league-player-card .ranked-history-legend {
          justify-content: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let queued = false;
  function queuePatch() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchAllHistory();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "players") return;
    installStyles();
    new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true });
    [0, 250, 1000].forEach((delay) => setTimeout(patchAllHistory, delay));
    window.addEventListener("rift-lab-season-change", queuePatch);
  });
})();
