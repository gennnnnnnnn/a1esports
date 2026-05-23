(function () {
  "use strict";

  const STORAGE_KEY = "riftLabDataUrl";
  const PLAYER_QUEUE = { value: "all" };
  const MATCH_FILTERS = { queue: "all", champion: "", player: "all" };
  const NOTE_FILTERS = { search: "" };

  const SAMPLE_DATA = {
    updatedAt: "2026-05-23T09:00:00.000Z",
    players: [
      {
        name: "Nguyen",
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
        name: "Hung",
        riotName: "Vua Bip Gia Lai",
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
        name: "Thien",
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
        name: "Huy",
        riotName: "Hoc Van Truong",
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
      { player: "Hung", games: 10, wins: 7, losses: 3, winRate: 70 },
      { player: "Thien", games: 10, wins: 6, losses: 4, winRate: 60 },
      { player: "Nguyen", games: 10, wins: 5, losses: 5, winRate: 50 },
      { player: "Huy", games: 10, wins: 4, losses: 6, winRate: 40 }
    ],
    latestNotes: [
      {
        date: "2026-05-23",
        player: "Hung",
        scope: "Last 10 ranked games",
        summary: "Strong recent record with clean conversion in Flex.",
        strengths: "High win rate and strong skirmish impact.",
        weaknesses: "Vision can dip during snowball games.",
        actions: "Keep control wards flowing before Baron and dragon setups."
      },
      {
        date: "2026-05-23",
        player: "Thien",
        scope: "Last 10 ranked games",
        summary: "Best solo rank in the squad with steady lane results.",
        strengths: "Reliable CS base and low panic deaths.",
        weaknesses: "Can delay first roam timing.",
        actions: "Review wave three and wave four roam windows."
      },
      {
        date: "2026-05-23",
        player: "Huy",
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
      bestRecent: "Hung 70%",
      highestSolo: "Thien Diamond IV 77 LP",
      highestFlex: "Hung Diamond I 67 LP",
      worstSolo: "Huy 51%"
    },
    matches: [
      {
        matchId: "VN2_SAMPLE_001",
        gameStart: "2026-05-23T07:45:00.000Z",
        queueId: 440,
        queueLabel: "Ranked Flex",
        durationMin: 31,
        player: "Hung",
        riotId: "Vua Bip Gia Lai#7777",
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
        aiNote: "Converted lane pressure into objective control."
      },
      {
        matchId: "VN2_SAMPLE_002",
        gameStart: "2026-05-23T06:55:00.000Z",
        queueId: 420,
        queueLabel: "Ranked Solo/Duo",
        durationMin: 28,
        player: "Thien",
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
        aiNote: "High tempo jungle game with clean objective sequencing."
      },
      {
        matchId: "VN2_SAMPLE_003",
        gameStart: "2026-05-22T15:20:00.000Z",
        queueId: 420,
        queueLabel: "Ranked Solo/Duo",
        durationMin: 34,
        player: "Huy",
        riotId: "Hoc Van Truong#1207",
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
    let mode = "live";
    let errorMessage = "";

    try {
      const response = await loadData();
      payload = normalizeData(response.data);
      mode = response.mode;
      errorMessage = response.errorMessage || "";
    } catch (error) {
      payload = normalizeData(SAMPLE_DATA);
      mode = "error";
      errorMessage = error && error.message ? error.message : "Could not load dashboard data.";
    }

    window.RIFT_LAB_DATA = payload;
    renderStatus(mode, errorMessage);
    renderShared(payload);
    renderCurrentPage(payload);
    renderMatchPlayerFilter(payload);
    bindPageControls(payload);
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
      gameStart: read(match, ["gameStart", "Game Start"]) || "",
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
      gold: toNumber(read(match, ["gold", "Gold"])),
      goldMin: toNumber(read(match, ["goldMin", "Gold/min"])),
      aiNote: text(read(match, ["aiNote", "AI Note"]))
    };
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

  function renderShared(data) {
    document.querySelectorAll("[data-updated-at]").forEach((node) => {
      node.textContent = `Updated ${formatDateTime(data.updatedAt)}`;
    });

    const soloNode = document.querySelector('[data-field="highest-solo"]');
    const flexNode = document.querySelector('[data-field="highest-flex"]');
    if (soloNode) soloNode.textContent = metricText(data.metrics.highestSolo);
    if (flexNode) flexNode.textContent = metricText(data.metrics.highestFlex);
  }

  function renderStatus(mode, errorMessage) {
    const nodes = document.querySelectorAll("[data-status]");
    if (!nodes.length) return;

    const status = {
      live: ["Live data", "Connected to GitHub-generated JSON."],
      sample: ["Sample data", "Run the GitHub Actions data refresh to go live."],
      "error-sample": ["Sample data", errorMessage || "Live data could not be loaded."],
      error: ["Data load failed", errorMessage || "Could not load dashboard data."]
    }[mode] || ["Dashboard data", ""];

    nodes.forEach((node) => {
      node.innerHTML = `
        <div class="data-status ${mode.includes("error") ? "error" : ""} ${mode.includes("sample") ? "sample" : ""}">
          <strong>${escapeHtml(status[0])}</strong>
          <span>${escapeHtml(status[1])}</span>
        </div>
      `;
    });
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
      ? data.players.map((player) => playerCard(player, PLAYER_QUEUE.value)).join("")
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
    const matches = data.matches.filter((match) => {
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
    document.querySelectorAll("[data-player-queue]").forEach((button) => {
      button.addEventListener("click", () => {
        PLAYER_QUEUE.value = button.dataset.playerQueue;
        document.querySelectorAll("[data-player-queue]").forEach((node) => {
          node.classList.toggle("is-active", node === button);
        });
        renderPlayers(data);
      });
    });

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
      ...players.map((player) => `<option value="${escapeHtml(normalizeKey(player))}">${escapeHtml(player)}</option>`)
    ].join("");

    filter.value = players.some((player) => normalizeKey(player) === selected) ? selected : "all";
    MATCH_FILTERS.player = filter.value;
  }

  function uniquePlayerNames(data) {
    const names = new Map();
    (data.players || []).forEach((player) => {
      if (player.name) names.set(normalizeKey(player.name), player.name);
    });
    (data.matches || []).forEach((match) => {
      if (match.player) names.set(normalizeKey(match.player), match.player);
    });
    (data.summaryRows || []).forEach((row) => {
      if (row.player) names.set(normalizeKey(row.player), row.player);
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b));
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
              <h3>${escapeHtml(player.name)}</h3>
              <p>${escapeHtml(riotId(player))} <span>VN2</span></p>
            </div>
            <div class="sync-stamp">
              <span class="sync-icon"></span>
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
            <div class="lane-champion-row">
              <div class="lane-row">${insights.roles.map(roleBadge).join("")}</div>
              <div class="champion-row">${insights.champions.map(championAvatar).join("")}</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function playerLastSeen(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const latestMatchTime = (data.matches || [])
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
    return `
      <span class="lane-badge ${role.active ? "active" : ""}" title="${escapeHtml(role.label)}">
        ${escapeHtml(role.short)}
      </span>
    `;
  }

  function championAvatar(champion) {
    return `
      <span class="champion-avatar" title="${escapeHtml(champion.name)}">
        <img src="${escapeHtml(championIcon(champion.name))}" alt="${escapeHtml(champion.name)}">
      </span>
    `;
  }

  function playerInsights(playerName) {
    const data = window.RIFT_LAB_DATA || {};
    const matches = (data.matches || []).filter((match) => normalizeKey(match.player) === normalizeKey(playerName));
    const roleCounts = new Map();
    const championCounts = new Map();

    matches.forEach((match) => {
      const role = normalizeRole(match.role);
      if (role) roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
      if (match.champion) championCounts.set(match.champion, (championCounts.get(match.champion) || 0) + 1);
    });

    const topRoles = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]).map(([role]) => role);
    const roles = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"].map((role) => ({
      key: role,
      short: roleShort(role),
      label: roleLabel(role),
      active: topRoles.slice(0, 2).includes(role)
    }));

    const champions = [...championCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, games]) => ({ name, games }));

    while (champions.length < 5) {
      champions.push({ name: ["Yone", "Lee Sin", "Kai'Sa", "Ahri", "Ezreal"][champions.length], games: 0 });
    }

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

  function roleShort(role) {
    return {
      TOP: "TOP",
      JUNGLE: "JG",
      MIDDLE: "MID",
      BOTTOM: "BOT",
      UTILITY: "SUP"
    }[role] || role;
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

  function rankClass(tier) {
    const value = normalizeKey(tier);
    return value || "unranked";
  }

  function championIcon(champion) {
    const key = CHAMPION_KEYS[champion] || String(champion || "")
      .replace(/['.]/g, "")
      .replace(/&/g, "")
      .replace(/\s+/g, "");

    if (!key || key === "Unknown") {
      return "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Yone.png";
    }

    return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${encodeURIComponent(key)}.png`;
  }

  function noteCard(note) {
    return `
      <article class="note-card">
        <div class="note-topline">
          <div>
            <h3>${escapeHtml(note.player)}</h3>
            <p>${escapeHtml(note.scope)}</p>
          </div>
          <time>${escapeHtml(formatDate(note.date))}</time>
        </div>
        <p>${escapeHtml(note.summary || "No summary available.")}</p>
        <div class="note-stack">
          <div class="note-block">
            <span>Strengths</span>
            <p>${escapeHtml(note.strengths || "No strength note yet.")}</p>
          </div>
          <div class="note-block weak">
            <span>Weaknesses</span>
            <p>${escapeHtml(note.weaknesses || "No weakness note yet.")}</p>
          </div>
          <div class="note-block action">
            <span>Action Items</span>
            <p>${escapeHtml(note.actions || "No action item yet.")}</p>
          </div>
        </div>
      </article>
    `;
  }

  function matchCard(match) {
    const resultClass = match.result.toLowerCase() === "win" ? "win" : "loss";
    return `
      <article class="match-card">
        <div class="match-art" style="--champion-art: url('${championSplash(match.champion)}')"></div>
        <div class="match-body">
          <div class="match-topline">
            <div class="match-title">
              <h3>${escapeHtml(match.champion)}</h3>
              <span class="result-chip ${resultClass}">${escapeHtml(match.result)}</span>
              <span class="queue-chip">${escapeHtml(match.queueLabel)}</span>
              ${match.role ? `<span class="role-chip">${escapeHtml(titleCase(match.role))}</span>` : ""}
            </div>
            <time>${escapeHtml(formatDate(match.gameStart))}</time>
          </div>
          <p>${escapeHtml(match.player)}${match.riotId ? ` | ${escapeHtml(match.riotId)}` : ""}</p>
          <div class="match-stats">
            <div><span>KDA</span><strong>${escapeHtml(`${formatNumber(match.kills)}/${formatNumber(match.deaths)}/${formatNumber(match.assists)}`)}</strong></div>
            <div><span>KDA Ratio</span><strong>${escapeHtml(formatDecimal(match.kda))}</strong></div>
            <div><span>CS/min</span><strong>${escapeHtml(formatDecimal(match.csMin))}</strong></div>
            <div><span>Vision/min</span><strong>${escapeHtml(formatDecimal(match.visionMin))}</strong></div>
            <div><span>Damage/min</span><strong>${escapeHtml(formatNumber(match.damageMin))}</strong></div>
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
    if (!data || !data.summaryRows) return null;
    return data.summaryRows.find((row) => normalizeKey(row.player) === normalizeKey(playerName)) || null;
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
    return player.riotName || player.tag || "Riot ID pending";
  }

  function championSplash(champion) {
    const key = CHAMPION_KEYS[champion] || String(champion || "")
      .replace(/['.]/g, "")
      .replace(/&/g, "")
      .replace(/\s+/g, "");

    if (!key || key === "Unknown") {
      return "";
    }

    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(key)}_0.jpg`;
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
    if (typeof value === "object") {
      if ("player" in value && "value" in value) return `${value.player} ${value.value}`;
      return Object.values(value).filter(Boolean).join(" ") || "No data";
    }
    return String(value);
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

  function formatGmt7DateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No match";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${get("month")} ${get("day")} ${get("hour")}:${get("minute")} GMT+7`;
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
