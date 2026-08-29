import { readFile, writeFile } from "node:fs/promises";

const OUTPUT_PATH = new URL("../data/rift-lab.json", import.meta.url);
const MATCH_REGION = "sea";
const HISTORY_START_YEAR = Number(process.env.HISTORY_START_YEAR || 2022);
const RIOT_REQUEST_DELAY_MS = Number(process.env.RIOT_REQUEST_DELAY_MS || 1250);
const RIOT_API_KEY = process.env.RIOT_API_KEY || "";
const RANKED_QUEUES = [42, 420, 440];
const MATCH_STAT_VERSION = 2;
const PAGE_SIZE = 100;
let nextRiotRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enc(value) {
  return encodeURIComponent(String(value).trim());
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function queueLabel(queueId) {
  if (Number(queueId) === 42) return "Ranked Team 5v5";
  if (Number(queueId) === 420) return "Ranked Solo/Duo";
  if (Number(queueId) === 440) return "Ranked Flex";
  return "Other";
}

function seasonWindowsForYear(year) {
  if (year === 2026) {
    return [
      { label: "2026 Season 1", start: new Date(Date.UTC(2026, 0, 8, 5)), end: new Date(Date.UTC(2026, 3, 29, 5)) },
      { label: "2026 Season 2", start: new Date(Date.UTC(2026, 3, 29, 5)), end: new Date(Date.UTC(2026, 6, 29, 5)) },
      { label: "2026 Season 3", start: new Date(Date.UTC(2026, 6, 29, 5)), end: new Date(Date.UTC(2027, 0, 1)) }
    ];
  }
  return [
    { label: `${year} Season 1`, start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 4, 1)) },
    { label: `${year} Season 2`, start: new Date(Date.UTC(year, 4, 1)), end: new Date(Date.UTC(year, 8, 1)) },
    { label: `${year} Season 3`, start: new Date(Date.UTC(year, 8, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) }
  ];
}

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function matchKey(matchId, player) {
  return `${matchId}|${player}`;
}

function makeMatchNote(part, durationMin, cs) {
  const deaths = Number(part.deaths) || 0;
  const kills = Number(part.kills) || 0;
  const assists = Number(part.assists) || 0;
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  const cspm = durationMin ? cs / durationMin : 0;
  const visionpm = durationMin ? (Number(part.visionScore) || 0) / durationMin : 0;
  if (part.win && kda >= 4) return "Clean win. Keep this pattern: controlled deaths, useful fights, no circus required.";
  if (deaths >= 8) return "Too many deaths. Review the first 3 avoidable deaths.";
  if (cspm < 5 && durationMin > 15) return "CS is low. Fix wave collection before hunting highlight plays.";
  if (visionpm < 0.6 && durationMin > 15) return "Vision contribution is weak. Buy control wards and prepare objectives earlier.";
  if (!part.win && kda >= 3) return "Good individual game but not converted. Check objective setup and side-lane timing.";
  return "Average game. Look for one repeated mistake, not ten excuses.";
}

function toMatchRow(player, match, part) {
  const durationMin = (Number(match.info.gameDuration) || 0) / 60;
  const team = (match.info.participants || []).filter((entry) => entry.teamId === part.teamId);
  const deaths = Number(part.deaths) || 0;
  const kills = Number(part.kills) || 0;
  const assists = Number(part.assists) || 0;
  const cs = (Number(part.totalMinionsKilled) || 0) + (Number(part.neutralMinionsKilled) || 0);
  const damage = Number(part.totalDamageDealtToChampions) || 0;
  const gold = Number(part.goldEarned) || 0;
  const visionScore = Number(part.visionScore) || 0;
  const teamKills = sumBy(team, "kills");
  const teamDeaths = sumBy(team, "deaths");
  const teamDamage = sumBy(team, "totalDamageDealtToChampions");
  const wardsPlaced = Number(part.wardsPlaced) || 0;
  const wardsKilled = Number(part.wardsKilled) || 0;
  const objectiveDamage = Number(part.damageDealtToObjectives) || 0;

  return {
    matchStatVersion: MATCH_STAT_VERSION,
    matchId: match.metadata.matchId,
    gameStart: new Date(Number(match.info.gameStartTimestamp) || Date.now()).toISOString(),
    gameVersion: match.info.gameVersion || "",
    queueId: Number(match.info.queueId) || 0,
    queueLabel: queueLabel(match.info.queueId),
    durationMin: round(durationMin),
    player: player.name,
    playerPuuid: player.puuid,
    riotId: player.riotName && player.tag ? `${player.riotName}#${player.tag}` : player.name,
    champion: part.championName || "Unknown",
    role: part.teamPosition || part.lane || "",
    result: part.win ? "Win" : "Loss",
    kills,
    deaths,
    assists,
    kda: round(deaths === 0 ? kills + assists : (kills + assists) / deaths),
    cs,
    csMin: round(durationMin ? cs / durationMin : 0),
    visionScore,
    visionMin: round(durationMin ? visionScore / durationMin : 0),
    damage,
    damageMin: round(durationMin ? damage / durationMin : 0),
    teamKills,
    teamDamage,
    killParticipation: round(teamKills ? ((kills + assists) / teamKills) * 100 : 0),
    damageShare: round(teamDamage ? (damage / teamDamage) * 100 : 0),
    teamDeaths,
    deathShare: round(teamDeaths ? (deaths / teamDeaths) * 100 : 0),
    gold,
    goldMin: round(durationMin ? gold / durationMin : 0),
    wardsPlaced,
    wardsPlacedMin: round(durationMin ? wardsPlaced / durationMin : 0),
    wardsKilled,
    wardsKilledMin: round(durationMin ? wardsKilled / durationMin : 0),
    objectiveDamage,
    objectiveDamageMin: round(durationMin ? objectiveDamage / durationMin : 0),
    items: [part.item0, part.item1, part.item2, part.item3, part.item4, part.item5, part.item6].map((item) => Number(item) || 0),
    summonerSpells: [part.summoner1Id, part.summoner2Id].map((spell) => Number(spell) || 0),
    skinId: part.skinId ?? part.skinID ?? null,
    skinName: part.skinName || "",
    aiNote: makeMatchNote(part, durationMin, cs)
  };
}

async function paceRiotRequest() {
  const waitMs = nextRiotRequestAt - Date.now();
  if (waitMs > 0) await sleep(waitMs);
  nextRiotRequestAt = Date.now() + RIOT_REQUEST_DELAY_MS;
}

async function riotFetch(url, attempt = 1) {
  await paceRiotRequest();
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Riot-Token": RIOT_API_KEY }
  });
  if (response.ok) return response.json();
  const body = await response.text();
  const retryable = response.status === 429 || response.status >= 500;
  if (retryable && attempt < 4) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * attempt;
    await sleep(delay);
    return riotFetch(url, attempt + 1);
  }
  throw new Error(`Riot API error ${response.status}: ${body.slice(0, 500)}`);
}

async function allRankedMatchIds(player, season) {
  const ids = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = await riotFetch(
      `https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${enc(player.puuid)}/ids?start=${start}&count=${PAGE_SIZE}&type=ranked&startTime=${toUnixSeconds(season.start)}&endTime=${toUnixSeconds(season.end)}`
    );
    ids.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return ids;
}

async function main() {
  if (!RIOT_API_KEY.startsWith("RGAPI-")) throw new Error("Missing or invalid RIOT_API_KEY.");
  const data = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  const existing = new Map((data.matches || []).map((match) => [matchKey(match.matchId, match.player), match]));
  const currentYear = new Date().getUTCFullYear();
  let added = 0;

  for (const player of data.players || []) {
    if (!player.puuid) continue;
    for (let year = HISTORY_START_YEAR; year <= currentYear; year += 1) {
      for (const season of seasonWindowsForYear(year)) {
        const ids = await allRankedMatchIds(player, season);
        console.log(`${player.name}: ${ids.length} total ranked matches in ${season.label}`);
        for (const matchId of ids) {
          const key = matchKey(matchId, player.name);
          if (existing.has(key)) continue;
          const match = await riotFetch(`https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/${enc(matchId)}`);
          const part = (match.info?.participants || []).find((entry) => entry.puuid === player.puuid);
          if (!part || !RANKED_QUEUES.includes(Number(match.info?.queueId))) continue;
          const row = toMatchRow(player, match, part);
          existing.set(key, row);
          added += 1;
        }
      }
    }
  }

  const backfillUpdatedAt = new Date().toISOString();
  data.matches = [...existing.values()].sort((a, b) => new Date(b.gameStart) - new Date(a.gameStart));
  data.updatedAt = backfillUpdatedAt;
  data.source = {
    ...(data.source || {}),
    rankedQueues: RANKED_QUEUES,
    allSeasonMatchesBackfilled: true,
    allSeasonBackfillUpdatedAt: backfillUpdatedAt
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`All-season backfill complete: ${added} new player-match rows added; ${data.matches.length} total rows stored.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
