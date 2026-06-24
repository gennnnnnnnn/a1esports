(function () {
  "use strict";

  const STORAGE_KEY = "riftLabDataUrl";
  const SEASON_STORAGE_KEY = "riftLabSeasonKey";
  const MATCH_FILTERS = { queue: "all", champion: "", player: "all" };
  const NOTE_FILTERS = { search: "" };
  const DATA_DRAGON_VERSION = "14.24.1";
  const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
  const SCHEDULE_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const SCHEDULE_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const LANE_ICONS = {
    TOP: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-top.png",
    JUNGLE: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-jungle.png",
    MIDDLE: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-middle.png",
    BOTTOM: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-bottom.png",
    UTILITY: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-utility.png"
  };
  let seasonCountdownTimer = 0;

  const SAMPLE_DATA = {
    updatedAt: "2026-05-23T09:00:00.000Z",
    players: [
      {
        name: "Road to the Top#A1E",
        riotName: "Road to the Top",
        tag: "A1E",
        level: 211,
        soloTier: "PLATINUM",
        soloRank: "III",
        soloLp: 10,
        soloWins: 41,
        soloLosses: 37,
        soloWr: 52.6,
        flexTier: "DIAMOND",
        flexRank: "III",
        flexLp: 17,
        flexWins: 62,
        flexLosses: 51,
        flexWr: 54.9,
        notes: "Stable flex climb with room to tighten solo lane resets."
      },
      {
        name: "Vua B\u1ecbp Gia Lai#7777",
        riotName: "Vua B\u1ecbp Gia Lai",
        tag: "7777",
        level: 184,
        soloTier: "EMERALD",
        soloRank: "II",
        soloLp: 85,
        soloWins: 58,
        soloLosses: 46,
        soloWr: 55.8,
        flexTier: "DIAMOND",
        flexRank: "I",
        flexLp: 67,
        flexWins: 74,
        flexLosses: 54,
        flexWr: 57.8,
        notes: "Best current flex rank in the group."
      },
      {
        name: "Tian laoshi#2252",
        riotName: "Tian laoshi",
        tag: "2252",
        level: 229,
        soloTier: "DIAMOND",
        soloRank: "IV",
        soloLp: 77,
        soloWins: 63,
        soloLosses: 56,
        soloWr: 52.9,
        flexTier: "DIAMOND",
        flexRank: "II",
        flexLp: 14,
        flexWins: 69,
        flexLosses: 60,
        flexWr: 53.5,
        notes: "Highest solo ladder position among tracked players."
      },
      {
        name: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207",
        riotName: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng",
        tag: "1207",
        level: 173,
        soloTier: "PLATINUM",
        soloRank: "I",
        soloLp: 77,
        soloWins: 49,
        soloLosses: 47,
        soloWr: 51,
        flexTier: "DIAMOND",
        flexRank: "IV",
        flexLp: 83,
        flexWins: 58,
        flexLosses: 49,
        flexWr: 54.2,
        notes: "Consistent flex performance with climb pressure in solo."
      }
    ],
    summaryRows: [
      { player: "Vua B\u1ecbp Gia Lai#7777", games: 10, wins: 7, losses: 3, winRate: 70 },
      { player: "Tian laoshi#2252", games: 10, wins: 6, losses: 4, winRate: 60 },
      { player: "Road to the Top#A1E", games: 10, wins: 5, losses: 5, winRate: 50 },
      { player: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207", games: 10, wins: 4, losses: 6, winRate: 40 }
    ],
    latestNotes: [
      {
        date: "2026-05-23",
        player: "Vua B\u1ecbp Gia Lai#7777",
        scope: "Last 10 ranked games",
        summary: "Strong recent record with clean conversion in Flex.",
        strengths: "High win rate and strong skirmish impact.",
        weaknesses: "Vision can dip during snowball games.",
        actions: "Keep control wards flowing before Baron and dragon setups."
      },
      {
        date: "2026-05-23",
        player: "Tian laoshi#2252",
        scope: "Last 10 ranked games",
        summary: "Best solo rank in the squad with steady lane results.",
        strengths: "Reliable CS base and low panic deaths.",
        weaknesses: "Can delay first roam timing.",
        actions: "Review wave three and wave four roam windows."
      },
      {
        date: "2026-05-23",
        player: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207",
        scope: "Last 10 ranked games",
        summary: "Flex climb is healthy, solo games need cleaner early exits.",
        strengths: "Solid objective grouping.",
        weaknesses: "Early deaths make solo games harder than needed.",
        actions: "Call jungle tracking at 2:45 and respect first reset tempo."
      }
    ],
    metrics: {
      trackedPlayers: 4,
      importedMatches: 128,
      bestRecent: "Vua B\u1ecbp Gia Lai#7777 70%",
      highestSolo: "Tian laoshi#2252 Diamond IV 77 LP",
      highestFlex: "Vua B\u1ecbp Gia Lai#7777 Diamond I 67 LP",
      worstSolo: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207 51%"
    },
    matches: [
      {
        matchId: "VN2_SAMPLE_001",
        gameStart: "2026-05-23T07:45:00.000Z",
        queueId: 440,
        queueLabel: "Ranked Flex",
        durationMin: 31,
        player: "Vua B\u1ecbp Gia Lai#7777",
        riotId: "Vua B\u1ecbp Gia Lai#7777",
        champion: "Yone",
        role: "Middle",
        result: "Win",
        kills: 11,
        deaths: 4,
        assists: 8,
        kda: 4.75,
        cs: 246,
        csMin: 7.9,
        visionScore: 23,
        visionMin: 0.7,
        damage: 32450,
        damageMin: 1047,
        gold: 15280,
        goldMin: 493,
        items: [6673, 3031, 3006, 3036, 3094, 3139, 3363],
        summonerSpells: [4, 14],
        skinId: null,
        skinName: "",
        aiNote: "Converted lane pressure into objective control."
      },
      {
        matchId: "VN2_SAMPLE_002",
        gameStart: "2026-05-23T06:55:00.000Z",
        queueId: 420,
        queueLabel: "Ranked Solo/Duo",
        durationMin: 28,
        player: "Tian laoshi#2252",
        riotId: "Tian laoshi#2252",
        champion: "Lee Sin",
        role: "Jungle",
        result: "Win",
        kills: 7,
        deaths: 3,
        assists: 13,
        kda: 6.67,
        cs: 181,
        csMin: 6.5,
        visionScore: 31,
        visionMin: 1.1,
        damage: 21980,
        damageMin: 785,
        gold: 12940,
        goldMin: 462,
        items: [6630, 3071, 3158, 3053, 6333, 3026, 3364],
        summonerSpells: [4, 11],
        skinId: null,
        skinName: "",
        aiNote: "High tempo jungle game with clean objective sequencing."
      },
      {
        matchId: "VN2_SAMPLE_003",
        gameStart: "2026-05-22T15:20:00.000Z",
        queueId: 420,
        queueLabel: "Ranked Solo/Duo",
        durationMin: 34,
        player: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207",
        riotId: "H\u1ed1c V\u0103n Tr\u01b0\u1edfng#1207",
        champion: "Kai'Sa",
        role: "Bottom",
        result: "Loss",
        kills: 8,
        deaths: 9,
        assists: 7,
        kda: 1.67,
        cs: 252,
        csMin: 7.4,
        visionScore: 18,
        visionMin: 0.5,
        damage: 28610,
        damageMin: 842,
        gold: 14110,
        goldMin: 415,
        items: [6672, 3006, 3031, 3085, 3036, 3026, 3363],
        summonerSpells: [4, 7],
        skinId: null,
        skinName: "",
        aiNote: "Damage stayed high, but deaths before objectives broke tempo."
      }
    ]
  };

  const CHAMPION_KEYS = {
    "Aurelion Sol": "AurelionSol",
    "Bel'Veth": "Belveth",
    "Cho'Gath": "Chogath",
    "Dr. Mundo": "DrMundo",
    "Jarvan IV": "JarvanIV",
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Kog'Maw": "KogMaw",
    "K'Sante": "KSante",
    "Lee Sin": "LeeSin",
    "Master Yi": "MasterYi",
    "Miss Fortune": "MissFortune",
    "Nunu & Willump": "Nunu",
    "Rek'Sai": "RekSai",
    "Renata Glasc": "Renata",
    "Tahm Kench": "TahmKench",
    "Twisted Fate": "TwistedFate",
    "Vel'Koz": "Velkoz",
    "Xin Zhao": "XinZhao",
    Wukong: "MonkeyKing"
  };

  const SUMMONER_SPELLS = {
    1: ["SummonerBoost", "Cleanse"],
    3: ["SummonerExhaust", "Exhaust"],
    4: ["SummonerFlash", "Flash"],
    6: ["SummonerHaste", "Ghost"],
    7: ["SummonerHeal", "Heal"],
    11: ["SummonerSmite", "Smite"],
    12: ["SummonerTeleport", "Teleport"],
    13: ["SummonerMana", "Clarity"],
    14: ["SummonerDot", "Ignite"],
    21: ["SummonerBarrier", "Barrier"],
    30: ["SummonerPoroRecall", "To the King!"],
    31: ["SummonerPoroThrow", "Poro Toss"],
    32: ["SummonerSnowball", "Mark"]
  };

  const RANK_TIERS = {
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

  const DIVISIONS = { IV: 1, III: 2, II: 3, I: 4 };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    setActiveNav();
    renderLoading();

    let payload;

    try {
      const response = await loadData();
      payload = normalizeData(response.data);
    } catch (error) {
      payload = normalizeData(SAMPLE_DATA);
      console.warn("Rift Lab data load failed; using sample data.", error);
    }

    window.RIFT_LAB_DATA = payload;
    window.RIFT_LAB_GET_ACTIVE_MATCHES = () => activeSeasonMatches(window.RIFT_LAB_DATA || payload);
    setupSeasonControls(payload);
    renderShared(payload);
    setupSeasonCountdown(payload);
    renderCurrentPage(payload);
    renderMatchPlayerFilter(payload);
    bindPageControls(payload);
    dispatchSeasonChange(payload);
  }

  function setActiveNav() {
    const page = document.body.dataset.page || "home";
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.nav === page);
    });
  }

  function renderLoading() {
    const page = document.body.dataset.page || "home";
    const targets = {
      home: ["[data-home-metrics]", "[data-home-players]", "[data-home-notes]"],
      players: ["[data-players-list]"],
      coach: ["[data-notes-list]"],
      matches: ["[data-matches-list]"]
    };

    (targets[page] || []).forEach((selector) => {
      const node = document.querySelector(selector);
      if (!node) return;
      node.innerHTML = `
        <div class="skeleton-grid">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      `;
    });
  }

  async function loadData() {
    const apiUrl = resolveApiUrl();
    const useSample = getConfig().useSampleDataWhenMissingApi !== false;

    if (!apiUrl) {
      if (useSample) {
        return {
          data: SAMPLE_DATA,
          mode: "sample",
          errorMessage: "Static data file is not configured."
        };
      }

      throw new Error("Static data file is not configured.");
    }

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Data endpoint returned ${response.status}.`);
      }

      return { data: await response.json(), mode: "live" };
    } catch (error) {
      if (useSample) {
        return {
          data: SAMPLE_DATA,
          mode: "error-sample",
          errorMessage: error && error.message ? error.message : "Could not load static dashboard JSON."
        };
      }

      throw error;
    }
  }

  function getConfig() {
    return window.RIFT_LAB_CONFIG || {};
  }

  function resolveApiUrl() {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get("api");
    const configApi = getConfig().apiUrl;
    const metaApi = document.querySelector('meta[name="rift-lab-api"]')?.content;
    const storedApi = storageGet(STORAGE_KEY);

    if (queryApi) {
      storageSet(STORAGE_KEY, queryApi);
    }

    return [queryApi, configApi, metaApi, storedApi].find((candidate) => {
      return candidate && !/PASTE_|YOUR_DEPLOYMENT_ID|YOUR_APPS_SCRIPT/i.test(candidate);
    }) || "";
  }

  function normalizeData(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    const players = asArray(read(data, ["players", "Players"])).map(normalizePlayer);
    const summaryRows = asArray(read(data, ["summaryRows", "summary", "Player Summary"])).map(normalizeSummaryRow);
    const latestNotes = asArray(read(data, ["latestNotes", "aiNotes", "notes", "AI Notes"])).map(normalizeNote);
    const matches = asArray(read(data, ["matches", "recentMatches", "matchRows", "Matches"])).map(normalizeMatch);
    const metrics = normalizeMetrics(read(data, ["metrics", "Metrics"]) || {}, players, summaryRows, matches);

    return {
      updatedAt: read(data, ["updatedAt", "lastUpdated", "Last Updated"]) || new Date().toISOString(),
      source: read(data, ["source", "Source"]) || {},
      players,
      summaryRows,
      latestNotes,
      matches,
      metrics
    };
  }

  function normalizePlayer(player) {
    const winsSolo = toNumber(read(player, ["soloWins", "Solo Wins"]));
    const lossesSolo = toNumber(read(player, ["soloLosses", "Solo Losses"]));
    const winsFlex = toNumber(read(player, ["flexWins", "Flex Wins"]));
    const lossesFlex = toNumber(read(player, ["flexLosses", "Flex Losses"]));

    return {
      name: text(read(player, ["name", "player", "Display Name"])) || "Unknown",
      riotName: text(read(player, ["riotName", "Riot Game Name", "gameName"])) || "",
      tag: text(read(player, ["tag", "tagline", "Tagline"])) || "",
      level: toNumber(read(player, ["level", "Summoner Level"])),
      soloTier: text(read(player, ["soloTier", "Solo Tier"])),
      soloRank: text(read(player, ["soloRank", "Solo Rank"])),
      soloLp: toNumber(read(player, ["soloLp", "Solo LP"])),
      soloWins: winsSolo,
      soloLosses: lossesSolo,
      soloWr: normalizePercent(read(player, ["soloWr", "soloWinRate", "Solo Win Rate"]), winsSolo, lossesSolo),
      flexTier: text(read(player, ["flexTier", "Flex Tier"])),
      flexRank: text(read(player, ["flexRank", "Flex Rank"])),
      flexLp: toNumber(read(player, ["flexLp", "Flex LP"])),
      flexWins: winsFlex,
      flexLosses: lossesFlex,
      flexWr: normalizePercent(read(player, ["flexWr", "flexWinRate", "Flex Win Rate"]), winsFlex, lossesFlex),
      notes: text(read(player, ["notes", "Notes"]))
    };
  }

  function normalizeSummaryRow(row) {
    const wins = toNumber(read(row, ["wins", "Wins"]));
    const losses = toNumber(read(row, ["losses", "Losses"]));
    return {
      player: text(read(row, ["player", "Player"])) || "Unknown",
      games: toNumber(read(row, ["games", "Games"])) || wins + losses,
      wins,
      losses,
      winRate: normalizePercent(read(row, ["winRate", "Win Rate"]), wins, losses)
    };
  }

  function normalizeNote(note) {
    return {
      date: read(note, ["date", "Date"]) || "",
      player: text(read(note, ["player", "Player"])) || "Squad",
      scope: text(read(note, ["scope", "Scope"])) || "Recent games",
      summary: text(read(note, ["summary", "Summary"])),
      strengths: text(read(note, ["strengths", "Strengths"])),
      weaknesses: text(read(note, ["weaknesses", "Weaknesses"])),
      actions: text(read(note, ["actions", "actionItems", "Action Items"]))
    };
  }

  function normalizeMatch(match) {
    const kills = toNumber(read(match, ["kills", "Kills"]));
    const deaths = toNumber(read(match, ["deaths", "Deaths"]));
    const assists = toNumber(read(match, ["assists", "Assists"]));
    const queueId = toNumber(read(match, ["queueId", "Queue ID"]));

    return {
      matchId: text(read(match, ["matchId", "Match ID"])),
      matchStatVersion: toNumber(read(match, ["matchStatVersion", "Match Stat Version"])),
      gameStart: read(match, ["gameStart", "Game Start"]) || "",
      gameVersion: text(read(match, ["gameVersion", "Game Version"])),
      queueId,
      queueLabel: text(read(match, ["queueLabel", "Queue Label"])) || queueLabel(queueId),
      durationMin: toNumber(read(match, ["durationMin", "Duration min"])),
      player: text(read(match, ["player", "Player"])) || "Unknown",
      riotId: text(read(match, ["riotId", "Riot ID"])),
      champion: text(read(match, ["champion", "Champion"])) || "Unknown",
      role: text(read(match, ["role", "Role", "teamPosition", "Team Position"])),
      result: normalizeResult(read(match, ["result", "Result"])),
      kills,
      deaths,
      assists,
      kda: toNumber(read(match, ["kda", "KDA"])) || computeKda(kills, deaths, assists),
      cs: toNumber(read(match, ["cs", "CS"])),
      csMin: toNumber(read(match, ["csMin", "CS/min"])),
      visionScore: toNumber(read(match, ["visionScore", "Vision Score"])),
      visionMin: toNumber(read(match, ["visionMin", "Vision/min"])),
      damage: toNumber(read(match, ["damage", "Damage"])),
      damageMin: toNumber(read(match, ["damageMin", "Damage/min"])),
      teamKills: toNumber(read(match, ["teamKills", "Team Kills"])),
      teamDamage: toNumber(read(match, ["teamDamage", "Team Damage"])),
      killParticipation: toNumber(read(match, ["killParticipation", "kp", "KP", "KP%"])),
      damageShare: toNumber(read(match, ["damageShare", "damagePct", "DMG%", "Damage Share"])),
      teamDeaths: toNumber(read(match, ["teamDeaths", "Team Deaths"])),
      deathShare: toNumber(read(match, ["deathShare", "deathPct", "DTH%", "Death Share"])),
      gold: toNumber(read(match, ["gold", "Gold"])),
      goldMin: toNumber(read(match, ["goldMin", "Gold/min"])),
      wardsPlaced: toNumber(read(match, ["wardsPlaced", "Wards Placed"])),
      wardsPlacedMin: toNumber(read(match, ["wardsPlacedMin", "wpm", "WPM"])),
      wardsKilled: toNumber(read(match, ["wardsKilled", "Wards Killed"])),
      wardsKilledMin: toNumber(read(match, ["wardsKilledMin", "wcpm", "WCPM"])),
      objectiveDamage: toNumber(read(match, ["objectiveDamage", "Damage To Objectives"])),
      objectiveDamageMin: toNumber(read(match, ["objectiveDamageMin", "objDamageMin", "OBJ/M"])),
      items: normalizeItems(match),
      summonerSpells: normalizeSummonerSpells(match),
      skinId: normalizeOptionalNumber(read(match, ["skinId", "skinID", "skin", "Champion Skin ID"])),
      skinName: text(read(match, ["skinName", "Skin Name"])),
      aiNote: text(read(match, ["aiNote", "AI Note"]))
    };
  }

  function normalizeItems(match) {
    const raw = read(match, ["items", "finalBuild", "build", "itemIds", "Item IDs"]);
    const values = Array.isArray(raw)
      ? raw
      : ["item0", "item1", "item2", "item3", "item4", "item5", "item6"].map((key) => read(match, [key, key.toUpperCase()]));

    return values
      .slice(0, 7)
      .map((item) => toNumber(item))
      .concat(Array(7).fill(0))
      .slice(0, 7);
  }

  function normalizeSummonerSpells(match) {
    const raw = read(match, ["summonerSpells", "spells", "summonerSpellIds", "Summoner Spells"]);
    const values = Array.isArray(raw)
      ? raw
      : [
        read(match, ["summoner1Id", "summonerSpell1", "spell1", "Summoner 1"]),
        read(match, ["summoner2Id", "summonerSpell2", "spell2", "Summoner 2"])
      ];

    return values
      .slice(0, 2)
      .map((spell) => toNumber(spell))
      .filter(Boolean);
  }

  function normalizeOptionalNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = toNumber(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeMetrics(rawMetrics, players, summaryRows, matches) {
    const metrics = rawMetrics && typeof rawMetrics === "object" ? rawMetrics : {};
    return {
      trackedPlayers: read(metrics, ["trackedPlayers", "Tracked Players"]) || players.length,
      importedMatches: read(metrics, ["importedMatches", "Imported Matches"]) || totalImported(summaryRows, matches),
      bestRecent: read(metrics, ["bestRecent", "Best Recent"]) || computeBestRecent(summaryRows),
      highestSolo: read(metrics, ["highestSolo", "Highest Solo"]) || computeHighestRank(players, "solo"),
      highestFlex: read(metrics, ["highestFlex", "Highest Flex"]) || computeHighestRank(players, "flex"),
      worstSolo: read(metrics, ["worstSolo", "Most Troubled Solo Queue", "Worst Solo"]) || computeWorstSolo(players)
    };
  }

  function setupSeasonControls(data) {
    const controls = document.querySelectorAll("[data-global-season-select]");
    if (!controls.length) return;

    const seasons = seasonsFromMatches(data.matches, data.source);
    const stored = storageGet(SEASON_STORAGE_KEY);
    const selected = seasons.some((season) => season.key === stored) ? stored : seasons[0]?.key || "";
    setActiveSeason(selected, seasons);

    controls.forEach((select) => {
      select.innerHTML = seasons.map((season) => {
        return `<option value="${escapeHtml(season.key)}">${escapeHtml(`${season.label} (${season.range})`)}</option>`;
      }).join("");
      select.value = selected;
      select.addEventListener("change", () => {
        setActiveSeason(select.value, seasons);
        storageSet(SEASON_STORAGE_KEY, select.value);
        controls.forEach((other) => {
          if (other !== select) other.value = select.value;
        });
        renderCurrentPage(data);
        renderMatchPlayerFilter(data);
        dispatchSeasonChange(data);
      });
    });
  }

  function setActiveSeason(key, seasons) {
    const season = seasons.find((item) => item.key === key) || seasons[0] || null;
    window.RIFT_LAB_SELECTED_SEASON = season ? season.key : "";
    window.RIFT_LAB_SELECTED_SEASON_DETAIL = season;
  }

  function dispatchSeasonChange(data) {
    renderSeasonCountdown(data);
    window.dispatchEvent(new CustomEvent("rift-lab-season-change", {
      detail: {
        season: activeSeason(data),
        matches: activeSeasonMatches(data)
      }
    }));
  }

  function activeSeason(data) {
    const seasons = seasonsFromMatches(data.matches || [], data.source);
    return seasons.find((season) => season.key === window.RIFT_LAB_SELECTED_SEASON) || seasons[0] || null;
  }

  function activeSeasonMatches(data) {
    const season = activeSeason(data);
    if (!season) return data.matches || [];
    return matchesForSeason(data.matches || [], season);
  }

  function setupSeasonCountdown(data) {
    if (seasonCountdownTimer || !document.querySelector("[data-season-countdown]")) return;
    seasonCountdownTimer = window.setInterval(() => renderSeasonCountdown(window.RIFT_LAB_DATA || data), 1000);
  }

  function renderSeasonCountdown(data) {
    const nodes = document.querySelectorAll("[data-season-countdown]");
    if (!nodes.length) return;

    const season = activeSeason(data || {});
    const end = seasonEndGmt7(season);
    const remaining = end ? end.getTime() - Date.now() : 0;
    const text = remaining > 0 ? countdownText(remaining) : "Season ended";
    const title = end ? `Ends ${formatGmt7DateTime(end, { includeYear: true })}` : "Season end unavailable";

    nodes.forEach((node) => {
      node.innerHTML = `<span>Season end GMT+7</span><strong>${escapeHtml(text)}</strong>`;
      node.title = title;
    });
  }

  function seasonEndGmt7(season) {
    if (!season || !season.key) return null;
    const match = String(season.key).match(/^(\d+)-S([123])$/);
    if (!match) return null;
    const year = Number(match[1]);
    const block = Number(match[2]);
    const nextStartMonth = block === 1 ? 4 : block === 2 ? 8 : 12;
    return new Date(Date.UTC(year, nextStartMonth, 1) - GMT7_OFFSET_MS - 1000);
  }

  function countdownText(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  function seasonsFromMatches(matches, source = {}) {
    const byKey = new Map();
    const firstYear = Number(source.historyStartYear) || 0;
    const currentSeason = seasonOf(new Date());

    if (firstYear) {
      for (let year = firstYear; year <= currentSeason.start.getUTCFullYear(); year += 1) {
        const lastBlock = year === currentSeason.start.getUTCFullYear()
          ? Number(currentSeason.key.split("-S")[1]) || 3
          : 3;
        for (let block = 1; block <= lastBlock; block += 1) {
          const season = seasonOf(new Date(Date.UTC(year, block === 1 ? 0 : block === 2 ? 4 : 8, 1)));
          byKey.set(season.key, season);
        }
      }
    }

    (matches || []).forEach((match) => {
      if (!match || !match.gameStart) return;
      const season = seasonOf(match.gameStart);
      if (!byKey.has(season.key)) byKey.set(season.key, season);
    });
    if (!byKey.size) {
      const fallback = seasonOf(new Date());
      byKey.set(fallback.key, fallback);
    }
    return [...byKey.values()].sort((a, b) => b.start - a.start);
  }

  function seasonOf(dateLike) {
    const date = new Date(dateLike);
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = safe.getUTCFullYear();
    const month = safe.getUTCMonth();
    const block = month < 4 ? 1 : month < 8 ? 2 : 3;
    const startMonth = block === 1 ? 0 : block === 2 ? 4 : 8;
    const endMonth = block === 1 ? 4 : block === 2 ? 8 : 12;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, endMonth, 1));
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return {
      key: `${year}-S${block}`,
      label: `${year} Season ${block}`,
      range: `${monthNames[startMonth]}-${monthNames[endMonth - 1]}`,
      start,
      end
    };
  }

  function matchesForSeason(matches, season) {
    return (matches || []).filter((match) => {
      const date = new Date(match.gameStart);
      return !Number.isNaN(date.getTime()) && date >= season.start && date < season.end;
    });
  }

  function renderShared(data) {
    document.querySelectorAll("[data-updated-at]").forEach((node) => {
      node.textContent = `Last updated ${formatGmt7DateTime(data.updatedAt)}`;
    });

    renderSeasonCountdown(data);

    const soloNode = document.querySelector('[data-field="highest-solo"]');
    const flexNode = document.querySelector('[data-field="highest-flex"]');
    if (soloNode) soloNode.textContent = metricText(data.metrics.highestSolo);
    if (flexNode) flexNode.textContent = metricText(data.metrics.highestFlex);
  }

  function renderCurrentPage(data) {
    const page = document.body.dataset.page || "home";
    if (page === "home") renderHome(data);
    if (page === "players") renderPlayers(data);
    if (page === "coach") renderNotes(data);
    if (page === "matches") renderMatches(data);
  }

  function renderHome(data) {
    const metricsNode = document.querySelector("[data-home-metrics]");
    const playersNode = document.querySelector("[data-home-players]");
    const notesNode = document.querySelector("[data-home-notes]");

    if (metricsNode) {
      metricsNode.innerHTML = metricCards(data.metrics);
    }

    if (playersNode) {
      playersNode.innerHTML = data.players.length
        ? data.players.slice(0, 4).map((player) => playerCard(player, "all")).join("")
        : emptyState("No players yet", "The Players tab will fill after the backend publishes roster data.");
    }

    if (notesNode) {
      notesNode.innerHTML = data.latestNotes.length
        ? data.latestNotes.slice(0, 3).map(noteCard).join("")
        : emptyState("No coach notes yet", "Generated notes will appear after the next GitHub Actions refresh.");
    }
  }

  function renderPlayers(data) {
    const node = document.querySelector("[data-players-list]");
    if (!node) return;

    node.innerHTML = data.players.length
      ? data.players.map((player) => playerCard(player, "all")).join("")
      : emptyState("No players yet", "The backend has not returned active tracked players.");
  }

  function renderNotes(data) {
    const node = document.querySelector("[data-notes-list]");
    if (!node) return;

    const term = NOTE_FILTERS.search.trim().toLowerCase();
    const notes = term
      ? data.latestNotes.filter((note) => JSON.stringify(note).toLowerCase().includes(term))
      : data.latestNotes;

    node.innerHTML = notes.length
      ? notes.map(noteCard).join("")
      : emptyState("No matching notes", "Try another player name or coaching term.");
  }

  function renderMatches(data) {
    const node = document.querySelector("[data-matches-list]");
    if (!node) return;

    const championTerm = MATCH_FILTERS.champion.trim().toLowerCase();
    const matches = activeSeasonMatches(data).filter((match) => {
      const queueOk = MATCH_FILTERS.queue === "all" || String(match.queueId) === MATCH_FILTERS.queue;
      const championOk = !championTerm || match.champion.toLowerCase().includes(championTerm);
      const playerOk = MATCH_FILTERS.player === "all" || normalizeKey(match.player) === MATCH_FILTERS.player;
      return queueOk && championOk && playerOk;
    });

    node.innerHTML = matches.length
      ? matches.map(matchCard).join("")
      : emptyState("No matching matches", "Recent ranked rows will appear here when the JSON includes matches.");
  }

  function bindPageControls(data) {
    document.querySelectorAll("[data-match-queue]").forEach((button) => {
      button.addEventListener("click", () => {
        MATCH_FILTERS.queue = button.dataset.matchQueue;
        document.querySelectorAll("[data-match-queue]").forEach((node) => {
          node.classList.toggle("is-active", node === button);
        });
        renderMatches(data);
      });
    });

    const championSearch = document.querySelector("[data-champion-search]");
    if (championSearch) {
      championSearch.addEventListener("input", () => {
        MATCH_FILTERS.champion = championSearch.value;
        renderMatches(data);
      });
    }

    const playerFilter = document.querySelector("[data-player-filter]");
    if (playerFilter) {
      playerFilter.addEventListener("change", () => {
        MATCH_FILTERS.player = playerFilter.value;
        renderMatches(data);
      });
    }

    const noteSearch = document.querySelector("[data-note-search]");
    if (noteSearch) {
      noteSearch.addEventListener("input", () => {
        NOTE_FILTERS.search = noteSearch.value;
        renderNotes(data);
      });
    }
  }

  function renderMatchPlayerFilter(data) {
    const filter = document.querySelector("[data-player-filter]");
    if (!filter) return;

    const selected = filter.value || MATCH_FILTERS.player;
    const players = uniquePlayerNames(data);

    filter.innerHTML = [
      '<option value="all">All players</option>',
      ...players.map((player) => `<option value="${escapeHtml(player.value)}">${escapeHtml(player.label)}</option>`)
    ].join("");

    filter.value = players.some((player) => player.value === selected) ? selected : "all";
    MATCH_FILTERS.player = filter.value;
  }

  function uniquePlayerNames(data) {
    const names = new Map();
    (data.players || []).forEach((player) => {
      if (player.name) {
        names.set(normalizeKey(player.name), {
          value: normalizeKey(player.name),
          label: riotId(player)
        });
      }
    });
    (data.matches || []).forEach((match) => {
      if (match.player && !names.has(normalizeKey(match.player))) {
        names.set(normalizeKey(match.player), {
          value: normalizeKey(match.player),
          label: match.riotId || match.player
        });
      }
    });
    (data.summaryRows || []).forEach((row) => {
      if (row.player && !names.has(normalizeKey(row.player))) {
        names.set(normalizeKey(row.player), {
          value: normalizeKey(row.player),
          label: row.player
        });
      }
    });
    return [...names.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  function metricCards(metrics) {
    const cards = [
      ["Tracked Players", metrics.trackedPlayers, "Active roster"],
      ["Imported Matches", metrics.importedMatches, "Ranked rows"],
      ["Best Recent", metrics.bestRecent, "Last imported set"],
      ["Highest Solo", metrics.highestSolo, "Solo/Duo"],
      ["Highest Flex", metrics.highestFlex, "Ranked Flex"],
      ["Troubled Solo", metrics.worstSolo, "Lowest solo rate"]
    ];

    return cards.map(([label, value, hint]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(metricText(value))}</strong>
        <small>${escapeHtml(hint)}</small>
      </article>
    `).join("");
  }

  function playerCard(player, queueMode) {
    const showSolo = queueMode !== "flex";
    const showFlex = queueMode !== "solo";
    const summary = playerSummary(player.name);
    const insights = playerInsights(player.name);
    const lastSeen = playerLastSeen(player.name);

    return `
      <article class="player-card league-player-card">
        <div class="league-card-header">
          <div class="lol-brand">
            <span class="lol-symbol"></span>
            <span>League<span>of Legends</span></span>
          </div>
        </div>
        <div class="league-card-body">
          <div class="league-id-row">
            <div>
              <h3>${escapeHtml(riotId(player))}</h3>
              <p><span>VN2</span></p>
            </div>
            <div class="sync-stamp">
              <time datetime="${escapeHtml(lastSeen.iso)}" title="${escapeHtml(lastSeen.title)}">${escapeHtml(lastSeen.label)}</time>
            </div>
          </div>

          <div class="league-ranks ${showSolo && showFlex ? "" : "single"}">
            ${showSolo ? leagueRankPanel("Solo/Duo", player, "solo") : ""}
            ${showFlex ? leagueRankPanel("Ranked Flex", player, "flex") : ""}
          </div>

          <div class="league-record">
            <strong>${escapeHtml(summary ? percentText(summary.winRate) : percentText(player.soloWr))}</strong>
            <span>${escapeHtml(summary ? `W/L (${summary.wins}/${summary.losses})` : `Solo (${formatNumber(player.soloWins)}/${formatNumber(player.soloLosses)})`)}</span>
          </div>

          <div class="league-extra">
            <span>Positions & Champions</span>
            <div class="profile-chip-row">
              ${insights.roles.length ? insights.roles.map(roleBadge).join("") : profileTextChip("No role data")}
            </div>
            <div class="profile-chip-row champion-profile-row">
              ${insights.champions.length ? insights.champions.map(championAvatar).join("") : profileTextChip("No champion sample")}
            </div>
          </div>

          ${document.body.dataset.page === "players" ? playerSchedule(player.name) : ""}
        </div>
      </article>
    `;
  }

  function playerSchedule(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const season = activeSeason(data);
    if (!season) return "";

    const yearRange = scheduleYearRange(season);
    const matches = (data.matches || []).filter((match) => {
      const date = new Date(match.gameStart);
      return normalizeKey(match.player) === normalizeKey(playerName)
        && !Number.isNaN(date.getTime())
        && date >= yearRange.start
        && date < yearRange.end;
    });
    const byDay = new Map();
    matches.forEach((match) => {
      const key = scheduleDateKey(match.gameStart);
      const current = byDay.get(key) || scheduleEmptyRecord();
      const bucket = Number(match.queueId) === 420 ? current.solo : current.flex;
      if (match.result === "Win") {
        current.wins += 1;
        bucket.wins += 1;
      } else {
        current.losses += 1;
        bucket.losses += 1;
      }
      byDay.set(key, current);
    });

    const wins = matches.filter((match) => match.result === "Win").length;
    const losses = matches.length - wins;
    const start = scheduleStartOfWeek(yearRange.start);
    const seasonBoundaries = scheduleSeasonBoundaries(yearRange.year);
    const weeks = [];
    for (let date = new Date(start); date < yearRange.end; date = scheduleAddDays(date, 7)) {
      weeks.push(new Date(date));
    }

    const monthCells = weeks.map((week, index) => {
      const label = scheduleMonthLabel(week, index, yearRange);
      return `<span>${escapeHtml(label)}</span>`;
    }).join("");

    const rows = SCHEDULE_DAY_LABELS.map((day, dayIndex) => {
      const cells = weeks
        .map((week) => scheduleCell(scheduleAddDays(week, dayIndex), yearRange, byDay))
        .join("");
      return `<div class="schedule-row"><span class="schedule-day-label">${day}</span>${cells}</div>`;
    }).join("");
    const separators = scheduleSeparatorMarkers(weeks, seasonBoundaries);

    return `
      <section class="player-schedule" style="--weeks: ${weeks.length}">
        <div class="player-schedule-head">
          <span>${escapeHtml(yearRange.year)} schedule</span>
          <strong>${formatNumber(wins)}W-${formatNumber(losses)}L</strong>
        </div>
        <div class="player-schedule-scroll">
          <div class="schedule-grid">
            <div class="schedule-months"><span></span>${monthCells}</div>
            ${rows}
            ${separators}
          </div>
        </div>
        <div class="schedule-legend">
          <span>Daily ranked record</span>
          <span>Numbers show games played; hover for queue split</span>
        </div>
      </section>
    `;
  }

  function scheduleEmptyRecord() {
    return {
      wins: 0,
      losses: 0,
      solo: { wins: 0, losses: 0 },
      flex: { wins: 0, losses: 0 }
    };
  }

  function scheduleCell(date, yearRange, byDay) {
    const outOfYear = date < yearRange.start || date >= yearRange.end;
    const key = scheduleDateKey(date);
    const record = byDay.get(key) || scheduleEmptyRecord();
    const games = record.wins + record.losses;
    const title = scheduleCellTitle(date, record, outOfYear);
    return `<span class="schedule-cell ${outOfYear ? "out" : ""} ${games ? "has-games" : ""}" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}">${games ? escapeHtml(games) : ""}</span>`;
  }

  function scheduleYearRange(season) {
    const year = season.start.getUTCFullYear();
    return {
      year,
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1))
    };
  }

  function scheduleSeasonBoundaries(year) {
    return [
      new Date(Date.UTC(year, 4, 1)),
      new Date(Date.UTC(year, 8, 1))
    ];
  }

  function scheduleSeparatorMarkers(weeks, boundaries) {
    return boundaries.map((boundary, index) => {
      const weekIndex = weeks.findIndex((week) => {
        const weekEnd = scheduleAddDays(week, 7);
        return boundary >= week && boundary < weekEnd;
      });
      if (weekIndex < 0) return "";
      return `<span class="schedule-season-separator" style="--week-index: ${weekIndex}" title="${escapeAttr(`${SCHEDULE_MONTH_LABELS[boundary.getUTCMonth()]} starts Season ${index + 2}`)}"></span>`;
    }).join("");
  }

  function scheduleMonthLabel(week, index, yearRange) {
    for (let day = 0; day < 7; day += 1) {
      const date = scheduleAddDays(week, day);
      if (date < yearRange.start || date >= yearRange.end) continue;
      if (index === 0 || date.getUTCDate() === 1) return SCHEDULE_MONTH_LABELS[date.getUTCMonth()];
    }
    return "";
  }

  function scheduleCellTitle(date, record, outOfYear) {
    if (outOfYear) return `${formatScheduleDate(date)}: outside selected year`;
    return [
      `${formatScheduleDate(date)}: ${record.wins + record.losses} games`,
      `Solo/Duo: ${record.solo.wins}W - ${record.solo.losses}L`,
      `Flex: ${record.flex.wins}W - ${record.flex.losses}L`
    ].join("\n");
  }

  function scheduleStartOfWeek(date) {
    const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const offset = (value.getUTCDay() + 6) % 7;
    value.setUTCDate(value.getUTCDate() - offset);
    return value;
  }

  function scheduleAddDays(date, days) {
    const value = new Date(date);
    value.setUTCDate(value.getUTCDate() + days);
    return value;
  }

  function scheduleDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function formatScheduleDate(date) {
    return `${SCHEDULE_MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/\n/g, "&#10;");
  }

  function playerLastSeen(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const latestMatchTime = activeSeasonMatches(data)
      .filter((match) => normalizeKey(match.player) === normalizeKey(playerName))
      .map((match) => new Date(match.gameStart))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestMatchTime) {
      return {
        iso: latestMatchTime.toISOString(),
        label: formatGmt7DateTime(latestMatchTime),
        title: "Last ranked match time in GMT+7"
      };
    }

    return {
      iso: "",
      label: "No match",
      title: "No ranked match time available"
    };
  }

  function leagueRankPanel(label, player, mode) {
    const tier = player[`${mode}Tier`];
    const rank = player[`${mode}Rank`];
    const lp = player[`${mode}Lp`];
    const wins = player[`${mode}Wins`];
    const losses = player[`${mode}Losses`];
    const winRate = player[`${mode}Wr`];

    return `
      <section class="league-rank-panel ${mode === "flex" ? "flex" : ""}">
        <div class="queue-title">${escapeHtml(label)}</div>
        <div class="rank-main">
          <div class="rank-emblem ${escapeHtml(rankClass(tier))}"></div>
          <div>
            <strong>${escapeHtml(rankText(tier, rank, lp))}</strong>
            <small>${escapeHtml(`${percentText(winRate)} | ${formatNumber(wins)}/${formatNumber(losses)}`)}</small>
          </div>
        </div>
        <div class="peak-badge">Current</div>
      </section>
    `;
  }

  function roleBadge(role) {
    const games = toNumber(role.games);
    const countText = formatNumber(games);
    return `
      <span class="profile-icon-chip role ${role.active ? "active" : ""}" title="${escapeHtml(`${role.label}: ${countText} games`)}" aria-label="${escapeHtml(`${role.label}: ${countText} games`)}">
        <img src="${escapeHtml(roleIcon(role.key))}" alt="${escapeHtml(role.label)}">
        <strong>${escapeHtml(countText)}</strong>
      </span>
    `;
  }

  function championAvatar(champion) {
    return `
      <span class="profile-icon-chip champion" title="${escapeHtml(`${champion.name}: ${formatNumber(champion.games)} games`)}" aria-label="${escapeHtml(`${champion.name}: ${formatNumber(champion.games)} games`)}">
        <img src="${escapeHtml(championIcon(champion.name))}" alt="${escapeHtml(champion.name)}">
        <strong>${escapeHtml(formatNumber(champion.games))}</strong>
      </span>
    `;
  }

  function profileTextChip(label) {
    return `<span class="profile-chip muted">${escapeHtml(label)}</span>`;
  }

  function playerInsights(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const matches = activeSeasonMatches(data)
      .filter((match) => normalizeKey(match.player) === normalizeKey(playerName))
      .sort((a, b) => new Date(b.gameStart).getTime() - new Date(a.gameStart).getTime())
      .slice(0, 20);
    const roleCounts = new Map();
    const championCounts = new Map();
    const championRecency = new Map();

    matches.forEach((match, index) => {
      const role = normalizeRole(match.role);
      if (role) roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
      if (match.champion) {
        championCounts.set(match.champion, (championCounts.get(match.champion) || 0) + 1);
        if (!championRecency.has(match.champion)) championRecency.set(match.champion, index);
      }
    });

    const topRoles = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]);
    const roles = topRoles.map(([role, games]) => ({
      key: role,
      label: roleLabel(role),
      games,
      active: topRoles.slice(0, 2).some(([topRole]) => topRole === role)
    }));

    const champions = [...championCounts.entries()]
      .sort((a, b) => b[1] - a[1] || (championRecency.get(a[0]) || 0) - (championRecency.get(b[0]) || 0))
      .slice(0, 5)
      .map(([name, games]) => ({ name, games }));

    return { roles, champions };
  }

  function normalizeRole(role) {
    const value = normalizeKey(role);
    if (["top"].includes(value)) return "TOP";
    if (["jungle", "jg"].includes(value)) return "JUNGLE";
    if (["middle", "mid"].includes(value)) return "MIDDLE";
    if (["bottom", "bot", "adc"].includes(value)) return "BOTTOM";
    if (["utility", "support", "sup"].includes(value)) return "UTILITY";
    return "";
  }

  function roleLabel(role) {
    return {
      TOP: "Top",
      JUNGLE: "Jungle",
      MIDDLE: "Middle",
      BOTTOM: "Bottom",
      UTILITY: "Support"
    }[role] || role;
  }

  function roleIcon(role) {
    return LANE_ICONS[role] || LANE_ICONS.UTILITY;
  }

  function rankClass(tier) {
    const value = normalizeKey(tier);
    return value || "unranked";
  }

  function dataDragonVersion(gameVersion) {
    const source = gameVersion || window.RIFT_LAB_DATA?.matches?.[0]?.gameVersion || DATA_DRAGON_VERSION;
    const match = String(source).match(/^(\d+)\.(\d+)/);
    return match ? `${match[1]}.${match[2]}.1` : DATA_DRAGON_VERSION;
  }

  function championIcon(champion, gameVersion) {
    const key = CHAMPION_KEYS[champion] || String(champion || "")
      .replace(/['.]/g, "")
      .replace(/&/g, "")
      .replace(/\s+/g, "");

    if (!key || key === "Unknown") {
      return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/champion/Yone.png`;
    }

    return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/champion/${encodeURIComponent(key)}.png`;
  }

  function itemSlot(itemId, index, gameVersion) {
    const id = toNumber(itemId);
    if (!id) {
      return `<span class="item-slot empty" title="${index === 6 ? "No trinket" : "Empty item slot"}"></span>`;
    }

    return `
      <span class="item-slot ${index === 6 ? "trinket" : ""}" title="${escapeHtml(index === 6 ? `Trinket ${id}` : `Item ${id}`)}">
        <img src="${escapeHtml(itemIcon(id, gameVersion))}" alt="" onerror="this.parentElement.classList.add('empty');this.remove()">
      </span>
    `;
  }

  function matchBuild(match) {
    const items = Array.isArray(match.items) ? match.items : [];
    return items.length ? items.slice(0, 7).concat(Array(7).fill(0)).slice(0, 7) : [];
  }

  function itemIcon(itemId, gameVersion) {
    return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/item/${encodeURIComponent(itemId)}.png`;
  }

  function matchSpells(match) {
    return Array.isArray(match.summonerSpells) ? match.summonerSpells.slice(0, 2).filter(Boolean) : [];
  }

  function spellSlot(spellId, gameVersion) {
    const spell = SUMMONER_SPELLS[toNumber(spellId)] || ["SummonerFlash", `Spell ${formatNumber(spellId)}`];
    return `
      <span class="spell-slot" title="${escapeHtml(spell[1])}">
        <img src="${escapeHtml(spellIcon(spell[0], gameVersion))}" alt="${escapeHtml(spell[1])}" onerror="this.parentElement.classList.add('empty');this.remove()">
      </span>
    `;
  }

  function spellIcon(spellKey, gameVersion) {
    return `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion(gameVersion)}/img/spell/${encodeURIComponent(spellKey)}.png`;
  }

  function skinLabel(match) {
    if (match.skinName) return match.skinName;
    if (match.skinId !== null && match.skinId !== undefined) {
      return Number(match.skinId) ? `Skin ${formatNumber(match.skinId)}` : "Default skin";
    }
    return "Default champion art";
  }

  function noteCard(note) {
    return `
      <article class="note-card">
        <div class="note-topline">
          <div>
            <h3>${escapeHtml(publicPlayerLabel(note.player))}</h3>
            <p>${escapeHtml(note.scope)}</p>
          </div>
          <time>${escapeHtml(formatDate(note.date))}</time>
        </div>
        <p>${escapeHtml(privacyText(note.summary || "No summary available."))}</p>
        <div class="note-stack">
          <div class="note-block">
            <span>Strengths</span>
            <p>${escapeHtml(privacyText(note.strengths || "No strength note yet."))}</p>
          </div>
          <div class="note-block weak">
            <span>Weaknesses</span>
            <p>${escapeHtml(privacyText(note.weaknesses || "No weakness note yet."))}</p>
          </div>
          <div class="note-block action">
            <span>Action Items</span>
            <p>${escapeHtml(privacyText(note.actions || "No action item yet."))}</p>
          </div>
        </div>
      </article>
    `;
  }

  function matchCard(match) {
    const resultClass = match.result.toLowerCase() === "win" ? "win" : "loss";
    const build = matchBuild(match);
    const spells = matchSpells(match);
    const skin = skinLabel(match);
    return `
      <article class="match-card">
        <div class="match-art" style="--champion-art: url('${championSplash(match.champion, match.skinId)}')"></div>
        <div class="match-body">
          <div class="match-topline">
            <div class="match-title">
              <h3>${escapeHtml(match.champion)}</h3>
              <span class="result-chip ${resultClass}">${escapeHtml(match.result)}</span>
              <span class="queue-chip">${escapeHtml(match.queueLabel)}</span>
              ${match.role ? `<span class="role-chip">${escapeHtml(titleCase(match.role))}</span>` : ""}
            </div>
            <time datetime="${escapeHtml(match.gameStart)}">${escapeHtml(formatGmt7DateTime(match.gameStart))}</time>
          </div>
          <p>${escapeHtml(match.riotId || publicPlayerLabel(match.player))}</p>
          <div class="match-stats">
            <div><span>KDA</span><strong>${escapeHtml(`${formatNumber(match.kills)}/${formatNumber(match.deaths)}/${formatNumber(match.assists)}`)}</strong></div>
            <div><span>KDA Ratio</span><strong>${escapeHtml(formatDecimal(match.kda))}</strong></div>
            <div><span>CS</span><strong>${escapeHtml(formatNumber(match.cs))}</strong></div>
            <div><span>Vision</span><strong>${escapeHtml(formatNumber(match.visionScore))}</strong></div>
            <div><span>Damage</span><strong>${escapeHtml(formatNumber(match.damage))}</strong></div>
          </div>
          <div class="match-loadout">
            <span class="match-loadout-label">Final Build</span>
            <div class="item-build">${build.length ? build.map((item, index) => itemSlot(item, index, match.gameVersion)).join("") : '<span class="build-pending">Build pending</span>'}</div>
            <span class="match-loadout-label">Spells</span>
            <div class="summoner-spells">${spells.length ? spells.map((spell) => spellSlot(spell, match.gameVersion)).join("") : '<span class="build-pending">Spells pending</span>'}</div>
            <span class="skin-chip">${escapeHtml(skin)}</span>
          </div>
          ${match.aiNote ? `<p>${escapeHtml(match.aiNote)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function emptyState(title, body) {
    return `
      <div class="empty-state">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(body)}</span>
      </div>
    `;
  }

  function playerSummary(playerName) {
    const data = window.RIFT_LAB_DATA;
    if (!data) return null;
    const matches = activeSeasonMatches(data).filter((match) => normalizeKey(match.player) === normalizeKey(playerName));
    if (!matches.length) return null;
    const wins = matches.filter((match) => match.result === "Win").length;
    const losses = matches.length - wins;
    return {
      player: playerName,
      games: matches.length,
      wins,
      losses,
      winRate: normalizePercent("", wins, losses)
    };
  }

  function read(source, labels) {
    if (!source || typeof source !== "object") return undefined;
    const keys = Object.keys(source);

    for (const label of labels) {
      if (Object.prototype.hasOwnProperty.call(source, label)) return source[label];
      const normalized = normalizeKey(label);
      const found = keys.find((key) => normalizeKey(key) === normalized);
      if (found) return source[found];
    }

    return undefined;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/[%,$]/g, "").trim();
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizePercent(value, wins, losses) {
    if (value !== null && value !== undefined && value !== "") {
      const number = toNumber(value);
      return number <= 1 && number > 0 ? number * 100 : number;
    }

    const total = wins + losses;
    return total ? (wins / total) * 100 : 0;
  }

  function normalizeResult(value) {
    const normalized = text(value).toLowerCase();
    if (["true", "win", "won", "victory"].includes(normalized)) return "Win";
    if (["false", "loss", "lost", "defeat"].includes(normalized)) return "Loss";
    return text(value) || "Result";
  }

  function computeKda(kills, deaths, assists) {
    return deaths === 0 ? kills + assists : (kills + assists) / deaths;
  }

  function queueLabel(queueId) {
    if (queueId === 420) return "Ranked Solo/Duo";
    if (queueId === 440) return "Ranked Flex";
    return queueId ? `Queue ${queueId}` : "Ranked";
  }

  function totalImported(summaryRows, matches) {
    if (matches.length) return matches.length;
    return summaryRows.reduce((total, row) => total + (row.games || 0), 0);
  }

  function computeBestRecent(summaryRows) {
    if (!summaryRows.length) return "No games";
    const best = [...summaryRows].sort((a, b) => b.winRate - a.winRate)[0];
    return `${best.player} ${percentText(best.winRate)}`;
  }

  function computeWorstSolo(players) {
    const ranked = players.filter((player) => player.soloWins + player.soloLosses > 0);
    if (!ranked.length) return "No solo games";
    const worst = [...ranked].sort((a, b) => a.soloWr - b.soloWr)[0];
    return `${worst.name} ${percentText(worst.soloWr)}`;
  }

  function computeHighestRank(players, mode) {
    if (!players.length) return "No rank";
    const best = [...players].sort((a, b) => {
      return rankScore(b[`${mode}Tier`], b[`${mode}Rank`], b[`${mode}Lp`]) -
        rankScore(a[`${mode}Tier`], a[`${mode}Rank`], a[`${mode}Lp`]);
    })[0];

    return `${best.name} ${rankText(best[`${mode}Tier`], best[`${mode}Rank`], best[`${mode}Lp`])}`;
  }

  function rankScore(tier, division, lp) {
    const tierScore = RANK_TIERS[String(tier || "").toUpperCase()] || 0;
    const divisionScore = DIVISIONS[String(division || "").toUpperCase()] || 0;
    return tierScore * 400 + divisionScore * 100 + (toNumber(lp) || 0);
  }

  function rankText(tier, rank, lp) {
    if (!tier) return "Unranked";
    const tierText = titleCase(tier);
    const rankTextValue = rank ? ` ${String(rank).toUpperCase()}` : "";
    const lpText = Number.isFinite(lp) && lp > 0 ? ` ${lp} LP` : "";
    return `${tierText}${rankTextValue}${lpText}`;
  }

  function riotId(player) {
    if (player.riotName && player.tag) return `${player.riotName}#${player.tag}`;
    return player.name || player.riotName || player.tag || "Riot ID pending";
  }

  function championSplash(champion, skinId = 0) {
    const key = CHAMPION_KEYS[champion] || String(champion || "")
      .replace(/['.]/g, "")
      .replace(/&/g, "")
      .replace(/\s+/g, "");

    if (!key || key === "Unknown") {
      return "";
    }

    const skin = skinId === null || skinId === undefined || skinId === "" ? 0 : Math.max(0, Math.round(toNumber(skinId)));
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(key)}_${skin}.jpg`;
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function titleCase(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[\s_]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function metricText(value) {
    if (value === null || value === undefined || value === "") return "No data";
    let result = "";
    if (typeof value === "object") {
      if ("player" in value && "value" in value) result = `${value.player} ${value.value}`;
      else result = Object.values(value).filter(Boolean).join(" ") || "No data";
    } else {
      result = String(value);
    }
    return privacyText(result);
  }

  function percentText(value) {
    const number = toNumber(value);
    return number ? `${Math.round(number)}%` : "0%";
  }

  function formatNumber(value) {
    const number = toNumber(value);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number);
  }

  function formatDecimal(value) {
    const number = toNumber(value);
    return number ? number.toFixed(2).replace(/\.00$/, "") : "0";
  }

  function formatDate(value) {
    if (!value) return "Recent";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "recently";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatGmt7DateTime(value, options = {}) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown GMT+7";
    const formatOptions = {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    };
    if (options.includeYear) formatOptions.year = "numeric";
    const parts = new Intl.DateTimeFormat("en-US", formatOptions).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    const year = options.includeYear ? `, ${get("year")}` : "";
    return `${get("month")} ${get("day")}${year} ${get("hour")}:${get("minute")} GMT+7`;
  }

  function publicPlayerLabel(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const player = (data.players || []).find((item) => normalizeKey(item.name) === normalizeKey(playerName));
    if (player) return riotId(player);
    return String(playerName || "");
  }

  function privacyText(value) {
    let output = String(value || "");
    const data = window.RIFT_LAB_DATA || {};
    (data.players || []).forEach((player) => {
      if (!player.name) return;
      output = output.replaceAll(player.name, riotId(player));
    });
    return output;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function storageGet(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : "";
    } catch (error) {
      return "";
    }
  }

  function storageSet(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
    } catch (error) {
      return undefined;
    }
    return undefined;
  }
})();
