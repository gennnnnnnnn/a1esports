import { readFile, writeFile } from "node:fs/promises";

const OUTPUT_PATH = new URL("../data/rift-lab.json", import.meta.url);
const EXISTING_DATA_URL = process.env.EXISTING_DATA_URL || "https://gennnnnnnnn.github.io/a1esports/data/rift-lab.json";
const QUEUES = [
  { queueId: 42, mode: "team5v5", label: "Ranked Team 5v5" },
  { queueId: 420, mode: "solo", label: "Solo/Duo" },
  { queueId: 440, mode: "flex", label: "Flex" }
];
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
const DIVISION_BASE = { IV: 0, III: 100, II: 200, I: 300 };

function playerKey(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function rankScore(tier, rank, lp) {
  const normalizedTier = String(tier || "UNRANKED").toUpperCase();
  if (!(normalizedTier in TIER_BASE)) return null;
  const base = TIER_BASE[normalizedTier];
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(normalizedTier)) {
    return base + Math.max(0, Number(lp) || 0);
  }
  return base + (DIVISION_BASE[String(rank || "").toUpperCase()] || 0) + Math.max(0, Number(lp) || 0);
}

async function loadExisting() {
  try {
    const separator = EXISTING_DATA_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${EXISTING_DATA_URL}${separator}lpHistory=${Date.now()}`, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`LP history: could not load deployed history (${error.message}); starting from current output.`);
    return {};
  }
}

function latestQueueMatch(data, player, queueId) {
  const pKey = playerKey(player.name);
  return (data.matches || [])
    .filter((match) => Number(match.queueId) === queueId)
    .filter((match) => (player.puuid && match.playerPuuid === player.puuid) || playerKey(match.player) === pKey)
    .filter((match) => match.gameStart && !Number.isNaN(new Date(match.gameStart).getTime()))
    .sort((a, b) => new Date(b.gameStart).getTime() - new Date(a.gameStart).getTime())[0] || null;
}

function snapshotFor(data, player, queue, previous) {
  const mode = queue.mode;
  const tier = String(player[`${mode}Tier`] || "UNRANKED").toUpperCase();
  const rank = String(player[`${mode}Rank`] || "").toUpperCase();
  const lp = Number(player[`${mode}Lp`]) || 0;
  const wins = Number(player[`${mode}Wins`]) || 0;
  const losses = Number(player[`${mode}Losses`]) || 0;
  const score = rankScore(tier, rank, lp);
  if (score === null) return null;

  const latestMatch = latestQueueMatch(data, player, queue.queueId);
  if (!latestMatch) return null;

  const sameMatch = previous && previous.matchId && previous.matchId === latestMatch.matchId;
  const sameRank = previous
    && previous.tier === tier
    && previous.rank === rank
    && Number(previous.lp) === lp
    && Number(previous.wins) === wins
    && Number(previous.losses) === losses;

  if (sameMatch && sameRank) return null;

  return {
    player: player.name,
    playerPuuid: player.puuid || "",
    queueId: queue.queueId,
    queue: queue.label,
    matchId: latestMatch.matchId || "",
    gameStart: latestMatch.gameStart,
    capturedAt: new Date().toISOString(),
    tier,
    rank,
    lp,
    wins,
    losses,
    score,
    baseline: !previous
  };
}

function dedupeHistory(history) {
  const byKey = new Map();
  for (const point of history) {
    const key = [point.playerPuuid || playerKey(point.player), point.queueId, point.matchId || point.capturedAt].join("|");
    const existing = byKey.get(key);
    if (!existing || new Date(point.capturedAt || 0) >= new Date(existing.capturedAt || 0)) byKey.set(key, point);
  }
  return [...byKey.values()].sort((a, b) => new Date(a.gameStart || a.capturedAt).getTime() - new Date(b.gameStart || b.capturedAt).getTime());
}

const data = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
const existing = await loadExisting();
let history = [
  ...(Array.isArray(data.lpHistory) ? data.lpHistory : []),
  ...(Array.isArray(existing.lpHistory) ? existing.lpHistory : [])
];

for (const player of data.players || []) {
  for (const queue of QUEUES) {
    const previous = history
      .filter((point) => Number(point.queueId) === queue.queueId)
      .filter((point) => (player.puuid && point.playerPuuid === player.puuid) || playerKey(point.player) === playerKey(player.name))
      .sort((a, b) => new Date(b.gameStart || b.capturedAt).getTime() - new Date(a.gameStart || a.capturedAt).getTime())[0];

    const snapshot = snapshotFor(data, player, queue, previous);
    if (snapshot) {
      history.push(snapshot);
      console.log(`LP history: ${player.name} ${queue.label} ${snapshot.tier} ${snapshot.rank} ${snapshot.lp} LP after ${snapshot.matchId || "latest match"}`);
    }
  }
}

data.lpHistory = dedupeHistory(history);
await writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`LP history: ${data.lpHistory.length} snapshots stored.`);
