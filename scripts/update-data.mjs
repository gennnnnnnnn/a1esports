import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ACCOUNT_REGION = "asia";
const MATCH_REGION = "sea";
const PLATFORM_REGION = "vn2";
const MATCH_COUNT_PER_QUEUE = Number(process.env.MATCH_COUNT_PER_QUEUE || 50);
const RECENT_MATCH_LIMIT = Number(process.env.RECENT_MATCH_LIMIT || 20);
const RANKED_QUEUES = [420, 440];
const OUTPUT_PATH = path.resolve("data/rift-lab.json");
const USE_SAMPLE = process.argv.includes("--sample");

const TRACKED_PLAYERS = [
  { name: "Road to the Top#A1E", riotName: "Road to the Top", tag: "A1E" },
  { name: "Vua B\u1ecbp Gia Lai#7777", riotName: "Vua B\u1ecbp Gia Lai", tag: "7777" },
  { name: "Tian laoshi#2252", riotName: "Tian laoshi", tag: "2252" },
  { name: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207", riotName: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng", tag: "1207" },
  { name: "HoangLiuMu#2252", riotName: "HoangLiuMu", tag: "2252" },
  { name: "25 Tu\u1ed5i L\u1ea5y V\u1ee3#1207", riotName: "25 Tu\u1ed5i L\u1ea5y V\u1ee3", tag: "1207" },
  { name: "\u0110\u1ea5uT\u00f4nC\u01b0\u1eddngGi\u1ea3#skepy", riotName: "\u0110\u1ea5uT\u00f4nC\u01b0\u1eddngGi\u1ea3", tag: "skepy" }
];

const SAMPLE_DATA_PATH = path.resolve("data/sample-rift-lab.json");
const RIOT_API_KEY = process.env.RIOT_API_KEY || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (USE_SAMPLE) {
    await writeJson(OUTPUT_PATH, await loadSampleData());
    console.log(`Wrote sample data to ${OUTPUT_PATH}`);
    return;
  }

  if (!RIOT_API_KEY.startsWith("RGAPI-")) {
    throw new Error("Missing or invalid RIOT_API_KEY. Add it as a GitHub Actions repository secret.");
  }

  const data = await buildRiftLabData();
  await writeJson(OUTPUT_PATH, data);
  console.log(`Wrote live Riot data to ${OUTPUT_PATH}`);
}

async function buildRiftLabData() {
  const matchDetailCache = new Map();
  const players = [];
  const matches = [];

  for (const tracked of TRACKED_PLAYERS) {
    console.log(`Refreshing ${tracked.name} (${tracked.riotName}#${tracked.tag})`);
    const account = await riotFetch(
      `https://${ACCOUNT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${enc(tracked.riotName)}/${enc(tracked.tag)}`
    );

    const player = await buildPlayer(tracked, account.puuid);
    players.push(player);

    const playerMatches = await fetchPlayerMatches(player, matchDetailCache);
    matches.push(...playerMatches);
  }

  matches.sort((a, b) => new Date(b.gameStart).getTime() - new Date(a.gameStart).getTime());

  const summaryRows = buildSummaryRows(players, matches);
  const latestNotes = buildLatestNotes(players, matches);

  return {
    updatedAt: new Date().toISOString(),
    source: {
      provider: "GitHub Actions",
      accountRegion: ACCOUNT_REGION,
      matchRegion: MATCH_REGION,
      platformRegion: PLATFORM_REGION,
      rankedQueues: RANKED_QUEUES,
      recentMatchLimit: RECENT_MATCH_LIMIT
    },
    players,
    summaryRows,
    latestNotes,
    matches,
    metrics: {
      trackedPlayers: players.length,
      importedMatches: matches.length,
      bestRecent: bestRecentText(summaryRows),
      highestSolo: highestRankText(players, "solo"),
      highestFlex: highestRankText(players, "flex"),
      worstSolo: worstSoloText(players)
    }
  };
}

async function buildPlayer(tracked, puuid) {
  const player = {
    name: tracked.name,
    riotName: tracked.riotName,
    tag: tracked.tag,
    puuid,
    level: 0,
    soloTier: "UNRANKED",
    soloRank: "",
    soloLp: 0,
    soloWins: 0,
    soloLosses: 0,
    soloWr: 0,
    flexTier: "UNRANKED",
    flexRank: "",
    flexLp: 0,
    flexWins: 0,
    flexLosses: 0,
    flexWr: 0,
    notes: "Tracked"
  };

  try {
    const summoner = await riotFetch(
      `https://${PLATFORM_REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`
    );
    player.level = Number(summoner.summonerLevel) || 0;
  } catch (error) {
    console.warn(`Summoner lookup failed for ${tracked.name}: ${error.message}`);
  }

  try {
    const entries = await riotFetch(
      `https://${PLATFORM_REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${enc(puuid)}`
    );
    applyRank(player, "solo", entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5"));
    applyRank(player, "flex", entries.find((entry) => entry.queueType === "RANKED_FLEX_SR"));
  } catch (error) {
    console.warn(`Rank lookup failed for ${tracked.name}: ${error.message}`);
  }

  player.notes = player.flexTier !== "UNRANKED" ? "Flex tracked" : "Rank data pending";
  await sleep(120);
  return player;
}

function applyRank(player, mode, entry) {
  if (!entry) return;

  player[`${mode}Tier`] = entry.tier || "UNRANKED";
  player[`${mode}Rank`] = entry.rank || "";
  player[`${mode}Lp`] = Number(entry.leaguePoints) || 0;
  player[`${mode}Wins`] = Number(entry.wins) || 0;
  player[`${mode}Losses`] = Number(entry.losses) || 0;
  player[`${mode}Wr`] = winRate(player[`${mode}Wins`], player[`${mode}Losses`]);
}

async function fetchPlayerMatches(player, matchDetailCache) {
  const rows = [];
  const ids = [];

  for (const queueId of RANKED_QUEUES) {
    const matchIds = await riotFetch(
      `https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${enc(player.puuid)}/ids?start=0&count=${MATCH_COUNT_PER_QUEUE}&queue=${queueId}`
    );

    matchIds.forEach((matchId) => ids.push({ matchId, queueId }));
    console.log(`${player.name}: ${matchIds.length} ${queueLabel(queueId)} matches`);
    await sleep(120);
  }

  const uniqueIds = [...new Map(ids.map((item) => [item.matchId, item])).values()];

  for (const { matchId } of uniqueIds) {
    const match = await getMatchDetail(matchId, matchDetailCache);
    const participant = match.info.participants.find((entry) => entry.puuid === player.puuid);
    if (!participant || !RANKED_QUEUES.includes(match.info.queueId)) continue;

    rows.push(toMatchRow(player, match, participant));
    await sleep(120);
  }

  return rows;
}

async function getMatchDetail(matchId, cache) {
  if (!cache.has(matchId)) {
    cache.set(
      matchId,
      riotFetch(`https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/${enc(matchId)}`)
    );
  }

  return cache.get(matchId);
}

function toMatchRow(player, match, part) {
  const durationMin = (Number(match.info.gameDuration) || 0) / 60;
  const deaths = Number(part.deaths) || 0;
  const kills = Number(part.kills) || 0;
  const assists = Number(part.assists) || 0;
  const cs = (Number(part.totalMinionsKilled) || 0) + (Number(part.neutralMinionsKilled) || 0);
  const damage = Number(part.totalDamageDealtToChampions) || 0;
  const gold = Number(part.goldEarned) || 0;
  const visionScore = Number(part.visionScore) || 0;

  return {
    matchId: match.metadata.matchId,
    gameStart: new Date(Number(match.info.gameStartTimestamp) || Date.now()).toISOString(),
    gameVersion: match.info.gameVersion || "",
    queueId: Number(match.info.queueId) || 0,
    queueLabel: queueLabel(match.info.queueId),
    durationMin: round(durationMin),
    player: player.name,
    riotId: `${player.riotName}#${player.tag}`,
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
    gold,
    goldMin: round(durationMin ? gold / durationMin : 0),
    items: [part.item0, part.item1, part.item2, part.item3, part.item4, part.item5, part.item6]
      .map((item) => Number(item) || 0),
    summonerSpells: [part.summoner1Id, part.summoner2Id].map((spell) => Number(spell) || 0),
    skinId: part.skinId ?? part.skinID ?? null,
    skinName: part.skinName || "",
    aiNote: makeMatchNote(part, durationMin, cs)
  };
}

function buildSummaryRows(players, matches) {
  return players.map((player) => {
    const recent = matches
      .filter((match) => match.player === player.name)
      .slice(0, RECENT_MATCH_LIMIT);
    const wins = recent.filter((match) => match.result === "Win").length;
    const losses = recent.length - wins;

    return {
      player: player.name,
      games: recent.length,
      wins,
      losses,
      winRate: winRate(wins, losses)
    };
  });
}

function buildLatestNotes(players, matches) {
  return players.map((player) => {
    const recent = matches
      .filter((match) => match.player === player.name)
      .slice(0, RECENT_MATCH_LIMIT);

    if (!recent.length) {
      return {
        date: new Date().toISOString(),
        player: player.name,
        scope: `Last ${RECENT_MATCH_LIMIT} ranked games`,
        summary: `${player.name}: no ranked solo/flex matches imported yet.`,
        strengths: "No match sample yet.",
        weaknesses: "No match data to review.",
        actions: "Run the GitHub Actions data refresh again after this player has ranked matches."
      };
    }

    const wins = recent.filter((match) => match.result === "Win").length;
    const avgKda = average(recent, "kda");
    const avgDeaths = average(recent, "deaths");
    const avgCsMin = average(recent, "csMin");
    const avgVisionMin = average(recent, "visionMin");

    return {
      date: new Date().toISOString(),
      player: player.name,
      scope: `Last ${RECENT_MATCH_LIMIT} ranked games`,
      summary: `${player.name}: last ${recent.length} games, ${wins}W-${recent.length - wins}L, avg KDA ${avgKda.toFixed(2)}, CS/min ${avgCsMin.toFixed(2)}, vision/min ${avgVisionMin.toFixed(2)}.`,
      strengths: avgKda >= 3 ? "Good fight conversion and survival." : "Some useful moments, but consistency is not there yet.",
      weaknesses: avgDeaths >= 6 ? "Death count is too high." : "Main issue is likely macro timing, not pure mechanics.",
      actions: "Review deaths before objectives, recall earlier, and track whether CS/min drops after 14 minutes."
    };
  });
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

async function riotFetch(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Riot-Token": RIOT_API_KEY
    }
  });

  if (response.ok) return response.json();

  const body = await response.text();
  const retryable = response.status === 429 || response.status >= 500;
  if (retryable && attempt < 4) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * attempt;
    console.warn(`Riot API ${response.status}; retrying in ${delay}ms`);
    await sleep(delay);
    return riotFetch(url, attempt + 1);
  }

  throw new Error(`Riot API error ${response.status}: ${body.slice(0, 500)}`);
}

async function loadSampleData() {
  const text = await readFile(SAMPLE_DATA_PATH, "utf8");
  return JSON.parse(text);
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bestRecentText(summaryRows) {
  const best = [...summaryRows].sort((a, b) => b.winRate - a.winRate)[0];
  return best ? `${best.player} ${Math.round(best.winRate)}%` : "No games";
}

function highestRankText(players, mode) {
  const best = [...players].sort((a, b) => rankScore(b, mode) - rankScore(a, mode))[0];
  if (!best) return "No rank";
  return `${best.name} ${rankText(best[`${mode}Tier`], best[`${mode}Rank`], best[`${mode}Lp`])}`;
}

function worstSoloText(players) {
  const ranked = players.filter((player) => player.soloWins + player.soloLosses > 0);
  const worst = ranked.sort((a, b) => a.soloWr - b.soloWr)[0];
  return worst ? `${worst.name} ${Math.round(worst.soloWr)}%` : "No solo games";
}

function rankScore(player, mode) {
  const tierMap = {
    IRON: 1,
    BRONZE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    EMERALD: 6,
    DIAMOND: 7,
    MASTER: 8,
    GRANDMASTER: 9,
    CHALLENGER: 10
  };
  const divisionMap = { IV: 1, III: 2, II: 3, I: 4 };
  return (tierMap[String(player[`${mode}Tier`]).toUpperCase()] || 0) * 400 +
    (divisionMap[String(player[`${mode}Rank`]).toUpperCase()] || 0) * 100 +
    (Number(player[`${mode}Lp`]) || 0);
}

function rankText(tier, rank, lp) {
  if (!tier || tier === "UNRANKED") return "Unranked";
  return `${titleCase(tier)}${rank ? ` ${rank}` : ""}${Number(lp) ? ` ${lp} LP` : ""}`;
}

function queueLabel(queueId) {
  if (Number(queueId) === 420) return "Ranked Solo/Duo";
  if (Number(queueId) === 440) return "Ranked Flex";
  return "Other";
}

function average(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) / rows.length;
}

function winRate(wins, losses) {
  const total = Number(wins) + Number(losses);
  return total ? round((Number(wins) / total) * 100) : 0;
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function enc(value) {
  return encodeURIComponent(String(value).trim());
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
