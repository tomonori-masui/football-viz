// ========== TEAM METADATA ==========
const TEAM_META = {
  "Arsenal":          { abbr: "ARS", color: "#EF0107" },
  "Aston Villa":      { abbr: "AVL", color: "#670E36" },
  "Bournemouth":      { abbr: "BOU", color: "#DA291C" },
  "Brentford":        { abbr: "BRE", color: "#e30613" },
  "Brighton":         { abbr: "BHA", color: "#0057B8" },
  "Burnley":          { abbr: "BUR", color: "#6C1D45" },
  "Cardiff":          { abbr: "CAR", color: "#0070B5" },
  "Chelsea":          { abbr: "CHE", color: "#034694" },
  "Crystal Palace":   { abbr: "CRY", color: "#1B458F" },
  "Everton":          { abbr: "EVE", color: "#003399" },
  "Fulham":           { abbr: "FUL", color: "#000000" },
  "Huddersfield":     { abbr: "HUD", color: "#0E63AD" },
  "Ipswich":          { abbr: "IPS", color: "#0044AA" },
  "Leeds":            { abbr: "LEE", color: "#FFCD00" },
  "Leicester":        { abbr: "LEI", color: "#003090" },
  "Liverpool":        { abbr: "LIV", color: "#C8102E" },
  "Luton":            { abbr: "LUT", color: "#F78F1E" },
  "Man City":         { abbr: "MCI", color: "#6CABDD" },
  "Man United":       { abbr: "MUN", color: "#DA291C" },
  "Newcastle":        { abbr: "NEW", color: "#241F20" },
  "Norwich":          { abbr: "NOR", color: "#00A650" },
  "Nott'm Forest":    { abbr: "NFO", color: "#DD0000" },
  "Sheffield United": { abbr: "SHU", color: "#EE2737" },
  "Southampton":      { abbr: "SOU", color: "#D71920" },
  "Stoke":            { abbr: "STK", color: "#E03A3E" },
  "Sunderland":       { abbr: "SUN", color: "#EB172B" },
  "Swansea":          { abbr: "SWA", color: "#121212" },
  "Tottenham":        { abbr: "TOT", color: "#132257" },
  "Watford":          { abbr: "WAT", color: "#FBEE23" },
  "West Brom":        { abbr: "WBA", color: "#122F67" },
  "West Ham":         { abbr: "WHU", color: "#7A263A" },
  "Wolves":           { abbr: "WOL", color: "#FDB913" }
};

// ========== SEASON CONFIG ==========
const SEASON_FILES = {
  "2017/18": "data/s2017_2018.csv",
  "2018/19": "data/s2018_2019.csv",
  "2019/20": "data/s2019_2020.csv",
  "2020/21": "data/s2020_2021.csv",
  "2021/22": "data/s2021_2022.csv",
  "2022/23": "data/s2022_2023.csv",
  "2023/24": "data/s2023_2024.csv",
  "2024/25": "data/s2024_2025.csv",
  "2025/26": "data/s2025_2026.csv"
};

// ========== GLOBALS ==========
let currentSeason = "2025/26";
let teams = [];
let weeklyPositions = {};
let weeklyPts = {};
let formData = {};
let maxMatchweek = 38;
const seasonCache = {};

// ========== DATA LOADING ==========
function parseDate(dateStr) {
  const parts = dateStr.split('/');
  const day = +parts[0];
  const month = +parts[1] - 1;
  const year = +parts[2] < 100 ? 2000 + +parts[2] : +parts[2];
  return new Date(year, month, day);
}

// Point deductions lookup: { "2023/24": [{ date, team, deduction }] }
const pointDeductions = {};
async function loadPointDeductions() {
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const raw = await d3.csv("data/point_deductions.csv");
  raw.forEach(d => {
    const parts = d.date.split('-');
    const day = +parts[0];
    const month = months[parts[1]];
    const year = +parts[2];
    const date = new Date(year, month, day);
    // Map to season: Aug-Dec = YYYY/(YY+1), Jan-Jul = (YYYY-1)/YY
    const seasonStartYear = month >= 7 ? year : year - 1;
    const season = `${seasonStartYear}/${String(seasonStartYear + 1).slice(-2)}`;
    if (!pointDeductions[season]) pointDeductions[season] = [];
    pointDeductions[season].push({ date, team: d.team, deduction: +d.point_deduction });
  });
}

async function loadSeason(season) {
  if (seasonCache[season]) return seasonCache[season];

  const file = SEASON_FILES[season];
  const raw = await d3.csv(file);

  const matches = raw
    .filter(d => d.HomeTeam && d.AwayTeam && d.FTR)
    .map(d => ({
      date: parseDate(d.Date),
      home: d.HomeTeam,
      away: d.AwayTeam,
      homeGoals: +d.FTHG || 0,
      awayGoals: +d.FTAG || 0,
      result: d.FTR,
      homeShots: +d.HS || 0,
      awayShots: +d.AS || 0,
      homeShotsTarget: +d.HST || 0,
      awayShotsTarget: +d.AST || 0,
      homeCorners: +d.HC || 0,
      awayCorners: +d.AC || 0,
      homeFouls: +d.HF || 0,
      awayFouls: +d.AF || 0,
      homeYellow: +d.HY || 0,
      awayYellow: +d.AY || 0,
      homeRed: +d.HR || 0,
      awayRed: +d.AR || 0
    }));

  matches.sort((a, b) => a.date - b.date);

  const result = processMatches(matches, season);
  seasonCache[season] = result;
  return result;
}

function processMatches(matches, season) {
  const seasonDeds = pointDeductions[season] || [];
  const teamStats = {};
  const teamMatchList = {};

  // Discover all teams
  const allTeamNames = new Set();
  matches.forEach(m => { allTeamNames.add(m.home); allTeamNames.add(m.away); });

  // Initialize
  allTeamNames.forEach(name => {
    const meta = TEAM_META[name] || { abbr: name.substring(0, 3).toUpperCase(), color: "#888" };
    teamStats[name] = {
      team: name, abbr: meta.abbr, color: meta.color,
      w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
      matches_played: 0,
      total_shots: 0, total_shots_target: 0,
      total_corners: 0, total_fouls: 0,
      total_yellow: 0, total_red: 0,
      clean_sheets: 0
    };
    teamMatchList[name] = [];
  });

  // Process each match
  matches.forEach(m => {
    const h = teamStats[m.home];
    const a = teamStats[m.away];

    // Home team stats
    h.matches_played++;
    h.gf += m.homeGoals;
    h.ga += m.awayGoals;
    h.total_shots += m.homeShots;
    h.total_shots_target += m.homeShotsTarget;
    h.total_corners += m.homeCorners;
    h.total_fouls += m.homeFouls;
    h.total_yellow += m.homeYellow;
    h.total_red += m.homeRed;
    if (m.awayGoals === 0) h.clean_sheets++;
    if (m.result === 'H') { h.w++; h.pts += 3; }
    else if (m.result === 'D') { h.d++; h.pts += 1; }
    else { h.l++; }

    // Away team stats
    a.matches_played++;
    a.gf += m.awayGoals;
    a.ga += m.homeGoals;
    a.total_shots += m.awayShots;
    a.total_shots_target += m.awayShotsTarget;
    a.total_corners += m.awayCorners;
    a.total_fouls += m.awayFouls;
    a.total_yellow += m.awayYellow;
    a.total_red += m.awayRed;
    if (m.homeGoals === 0) a.clean_sheets++;
    if (m.result === 'A') { a.w++; a.pts += 3; }
    else if (m.result === 'D') { a.d++; a.pts += 1; }
    else { a.l++; }

    // Record match result for each team
    const homeResult = m.result === 'H' ? 'W' : m.result === 'D' ? 'D' : 'L';
    const awayResult = m.result === 'A' ? 'W' : m.result === 'D' ? 'D' : 'L';
    teamMatchList[m.home].push({ result: homeResult, match: m });
    teamMatchList[m.away].push({ result: awayResult, match: m });
  });

  // Compute derived per-game stats
  const teamsArr = Object.values(teamStats).map(t => {
    t.gd = t.gf - t.ga;
    const mp = t.matches_played || 1;
    t.gf_per_game = +(t.gf / mp).toFixed(2);
    t.ga_per_game = +(t.ga / mp).toFixed(2);
    t.shots = +(t.total_shots / mp).toFixed(1);
    t.shots_target = +(t.total_shots_target / mp).toFixed(1);
    t.corners = +(t.total_corners / mp).toFixed(1);
    t.fouls = +(t.total_fouls / mp).toFixed(1);
    return t;
  });

  // Apply point deductions to final standings
  if (seasonDeds.length) {
    const netDeds = {};
    seasonDeds.forEach(d => { netDeds[d.team] = (netDeds[d.team] || 0) + d.deduction; });
    teamsArr.forEach(t => { if (netDeds[t.team]) t.pts += netDeds[t.team]; });
  }

  // Sort by points, GD, GF (EPL tiebreakers)
  teamsArr.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  teamsArr.forEach((t, i) => t.pos = i + 1);

  // Form data (includes match details for tooltips)
  const formResult = {};
  allTeamNames.forEach(name => {
    formResult[name] = teamMatchList[name].map(entry => {
      const m = entry.match;
      const isHome = name === m.home;
      return {
        result: entry.result,
        opponent: isHome ? m.away : m.home,
        score: `${m.homeGoals}-${m.awayGoals}`,
        venue: isHome ? 'H' : 'A',
        date: m.date
      };
    });
  });

  // Weekly positions
  const mwCounts = Array.from(allTeamNames).map(n => teamMatchList[n].length);
  const mw = Math.min(...mwCounts);
  const { positions: weeklyPos, weeklyPts } = computeWeeklyPositions(teamMatchList, allTeamNames, mw, seasonDeds);

  return { teams: teamsArr, weeklyPositions: weeklyPos, weeklyPts, formData: formResult, maxMatchweek: mw };
}

function computeWeeklyPositions(teamMatchList, allTeamNames, maxMW, seasonDeds) {
  const positions = {};
  const weeklyPts = {};
  allTeamNames.forEach(name => { positions[name] = []; weeklyPts[name] = []; });

  for (let mw = 1; mw <= maxMW; mw++) {
    const standings = [];
    const teamLastDate = {};
    allTeamNames.forEach(name => {
      const played = teamMatchList[name].slice(0, mw);
      let pts = 0, gd = 0, gf = 0;
      let lastDate = null;
      played.forEach(entry => {
        const m = entry.match;
        if (entry.result === 'W') pts += 3;
        else if (entry.result === 'D') pts += 1;
        if (name === m.home) {
          gf += m.homeGoals;
          gd += m.homeGoals - m.awayGoals;
        } else {
          gf += m.awayGoals;
          gd += m.awayGoals - m.homeGoals;
        }
        if (!lastDate || m.date > lastDate) lastDate = m.date;
      });
      teamLastDate[name] = lastDate;
      standings.push({ team: name, pts, gd, gf });
    });

    // Apply point deductions using each team's own last match date
    if (seasonDeds.length) {
      standings.forEach(s => {
        const lastDate = teamLastDate[s.team];
        if (!lastDate) return;
        seasonDeds.forEach(d => {
          if (d.team === s.team && d.date <= lastDate) s.pts += d.deduction;
        });
      });
    }

    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    standings.forEach((s, i) => {
      positions[s.team].push(i + 1);
      weeklyPts[s.team].push(s.pts);
    });
  }

  return { positions, weeklyPts };
}

// ========== TOOLTIP ==========
const tooltip = d3.select("#tooltip");
const var_accent = "#475569";
function isLandscape() { return window.innerHeight <= 500 && window.innerWidth > window.innerHeight; }

function showTooltip(event, html) {
  tooltip.html(html).style("opacity", 1);
  const ttNode = tooltip.node();
  const ttRect = ttNode.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x, y;
  if (vw <= 640) {
    // On mobile, center tooltip horizontally near top of screen
    x = Math.max(5, (vw - ttRect.width) / 2);
    y = Math.max(5, event.clientY - ttRect.height - 20);
    if (y < 5) y = event.clientY + 20;
  } else {
    x = event.clientX + 15;
    y = event.clientY - 10;
    if (x + ttRect.width > vw - 10) x = event.clientX - ttRect.width - 15;
    if (x < 10) x = 10;
    if (y + ttRect.height > vh - 10) y = event.clientY - ttRect.height - 10;
    if (y < 10) y = 10;
  }
  tooltip.style("left", x + "px").style("top", y + "px");
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}
