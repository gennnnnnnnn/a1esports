# Rift Lab / A1 eSports

Static GitHub Pages frontend for the A1 eSports League of Legends dashboard.

## Architecture

```text
GitHub Pages frontend
  -> Apps Script JSON endpoint
  -> Google Sheets processed data
```

The frontend must never call Riot API directly. Riot API access, Google Sheets writes, refresh triggers, and AI coach-note generation stay in Apps Script.

## Files

```text
index.html       Home dashboard
players.html     Solo/Duo and Flex player cards
coach.html       AI coach notes
matches.html     Recent match cards and filters
css/style.css    Responsive dashboard styling
js/app.js        Fetch, normalize, and render logic
js/config.example.js
```

## Configure the data endpoint

Set `apiUrl` in `js/config.example.js` to the deployed Apps Script web app URL with `?format=json`.

```javascript
window.RIFT_LAB_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?format=json",
  useSampleDataWhenMissingApi: true
};
```

The site also accepts an `api` query parameter for quick local testing:

```text
index.html?api=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FYOUR_DEPLOYMENT_ID%2Fexec%3Fformat%3Djson
```

## Apps Script JSON shape

```javascript
{
  updatedAt,
  players: [
    {
      name, riotName, tag, level,
      soloTier, soloRank, soloLp, soloWins, soloLosses, soloWr,
      flexTier, flexRank, flexLp, flexWins, flexLosses, flexWr,
      notes
    }
  ],
  summaryRows: [
    { player, games, wins, losses, winRate }
  ],
  latestNotes: [
    { date, player, scope, summary, strengths, weaknesses, actions }
  ],
  metrics: {
    trackedPlayers,
    importedMatches,
    bestRecent,
    highestSolo,
    highestFlex,
    worstSolo
  },
  matches: []
}
```

`matches` is optional. When present, the matches page renders queue-aware match cards for queue `420` and `440`.

## Security

Do not commit:

- Riot API keys
- Apps Script Script Properties
- `.clasprc.json`
- `.clasp.json`
- Google OAuth tokens
- private Google Sheet edit links

Only public processed dashboard JSON should be exposed to this frontend.
