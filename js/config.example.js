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
      flex: { wins: 0, losses: 0 },
      team: { wins: 0, losses: 0 }
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
      const queueId = Number(match.queueId);
      if (![42, 420, 440].includes(queueId)) return;
      const parts = gmt7Parts(match.gameStart);
      if (!parts || parts.year !== year) return;

      const key = dateKey(parts.year, parts.month, parts.day);
      const record = byDay.get(key) || emptyRecord();
      const bucket = queueId === 42 ? record.team : queueId === 420 ? record.solo : record.flex;
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
    const today = gmt7Parts(new Date());
    const todayKey = today ? dateKey(today.year, today.month, today.day) : "";
    let todayCell = null;

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
        const cellKey = dateKey(year, date.getUTCMonth(), date.getUTCDate());
        const isToday = cellKey === todayKey;
        cell.classList.toggle("is-today", isToday);
        if (isToday) todayCell = cell;

        const title = [
          `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}${isToday ? " (today)" : ""}: ${games} games`,
          `Solo/Duo: ${record.solo.wins}W - ${record.solo.losses}L`,
          `Flex: ${record.flex.wins}W - ${record.flex.losses}L`,
          `Ranked Team 5v5: ${record.team.wins}W - ${record.team.losses}L`
        ].join("\n");
        if (cell.title !== title) cell.title = title;
        if (cell.getAttribute("aria-label") !== title) cell.setAttribute("aria-label", title);
      });
    });

    const scroll = schedule.querySelector(".player-schedule-scroll");
    if (todayCell && scroll && scroll.dataset.centeredDay !== todayKey) {
      scroll.dataset.centeredDay = todayKey;
      requestAnimationFrame(() => {
        const scrollRect = scroll.getBoundingClientRect();
        const cellRect = todayCell.getBoundingClientRect();
        const offset = cellRect.left + cellRect.width / 2 - (scrollRect.left + scroll.clientWidth / 2);
        const target = Math.max(0, Math.min(scroll.scrollLeft + offset, scroll.scrollWidth - scroll.clientWidth));
        scroll.scrollLeft = target;
      });
    }
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

if (document.body?.dataset.page === "players") {
  const script = document.createElement("script");
  script.src = "js/lp-history.js?v=20260820-3";
  script.async = false;
  document.head.appendChild(script);
}
