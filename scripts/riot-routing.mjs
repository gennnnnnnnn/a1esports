export function riotRouting(player = {}) {
  const platformRegion = String(player.platformRegion || "vn2").toLowerCase();
  if (!["vn2", "jp1"].includes(platformRegion)) throw new Error(`Unsupported Riot platform: ${platformRegion}`);
  return { platformRegion, matchRegion: platformRegion === "jp1" ? "asia" : "sea" };
}

export function matchRegionForId(matchId) {
  const platformRegion = String(matchId).split("_")[0].toLowerCase();
  if (platformRegion === "kr") return "asia";
  return riotRouting({ platformRegion }).matchRegion;
}
