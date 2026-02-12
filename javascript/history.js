// ========== 6. HISTORICAL STANDINGS ==========
async function renderHistoryChart() {
  const container = d3.select("#history-chart");
  container.selectAll("*").remove();

  const filter = document.getElementById("history-filter").value;

  // Load all seasons
  const allSeasons = Object.keys(SEASON_FILES);
  const seasonData = {};
  for (const s of allSeasons) {
    seasonData[s] = await loadSeason(s);
  }

  // Build per-team history: { teamName: [{ season, pos, pts, w, d, l, gf, ga, gd, color, abbr }] }
  const teamHistory = {};
  allSeasons.forEach(s => {
    seasonData[s].teams.forEach(t => {
      if (!teamHistory[t.team]) teamHistory[t.team] = [];
      teamHistory[t.team].push({
        season: s, pos: t.pos, pts: t.pts,
        w: t.w, d: t.d, l: t.l,
        gf: t.gf, ga: t.ga, gd: t.gd,
        color: t.color, abbr: t.abbr
      });
    });
  });

  // Determine which teams to show based on filter
  const currentTeams = teams; // current season's teams
  let filteredTeamNames;
  switch (filter) {
    case "top6":
      filteredTeamNames = currentTeams.filter(t => t.pos <= 6).map(t => t.team);
      break;
    case "top10":
      filteredTeamNames = currentTeams.filter(t => t.pos <= 10).map(t => t.team);
      break;
    case "ever-present":
      filteredTeamNames = Object.keys(teamHistory).filter(name => teamHistory[name].length === allSeasons.length);
      break;
    default:
      filteredTeamNames = Object.keys(teamHistory);
  }

  // Sort by current season position (teams in current season first, then alphabetical)
  filteredTeamNames.sort((a, b) => {
    const aPos = currentTeams.find(t => t.team === a)?.pos || 99;
    const bPos = currentTeams.find(t => t.team === b)?.pos || 99;
    return aPos - bPos;
  });

  const histMobile = window.innerWidth <= 640;
  const histTablet = window.innerWidth <= 1024;
  const histLandscape = isLandscape();
  const containerWidth = container.node().getBoundingClientRect().width;
  const margin = { top: histLandscape ? 10 : 15, right: histMobile ? 15 : 20, bottom: histLandscape ? 25 : 50, left: histMobile ? 30 : 40 };
  const teamNameWidth = histMobile || histLandscape ? 50 : histTablet ? 100 : 120;
  const w = containerWidth - margin.left - margin.right;
  const h = histLandscape ? window.innerHeight - 120 : Math.max(histMobile ? 320 : 480, 24 * 20);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${h + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scalePoint().domain(allSeasons).range([0, w - teamNameWidth]).padding(0.3);
  const y = d3.scaleLinear().domain([0.5, 20.5]).range([0, h]);

  // Grid lines
  svg.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickValues(d3.range(1, 21)).tickSize(-w + teamNameWidth).tickFormat(""));

  // Zone shading
  // Champions League zone (pos 1-4)
  svg.append("rect")
    .attr("x", 0).attr("y", y(0.5)).attr("width", w - teamNameWidth).attr("height", y(4.5) - y(0.5))
    .attr("fill", "rgba(59, 130, 246, 0.04)");
  // Relegation zone (pos 18-20)
  svg.append("rect")
    .attr("x", 0).attr("y", y(17.5)).attr("width", w - teamNameWidth).attr("height", y(20.5) - y(17.5))
    .attr("fill", "rgba(239, 68, 68, 0.04)");

  // X axis
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("font-size", histMobile || histLandscape ? "9px" : "11px")
    .attr("transform", histMobile || histLandscape ? "rotate(-35)" : "")
    .style("text-anchor", histMobile || histLandscape ? "end" : "middle");

  // Y axis
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickValues(d3.range(1, 21)).tickFormat(d => d));

  // Color assignment — top 5 colored, rest LightGray
  const topN = 5;
  const colorMap = {};
  const highlightColorMap = {};
  filteredTeamNames.forEach(name => {
    const curPos = currentTeams.find(t => t.team === name)?.pos || 99;
    const hist = teamHistory[name];
    const teamColor = hist[0].color === "#000000" ? "#555" : hist[0].color;
    colorMap[name] = curPos <= topN ? teamColor : "LightGray";
    highlightColorMap[name] = teamColor;
  });

  // Line generator
  const line = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.season))
    .y(d => y(d.pos));

  // Prepare data arrays — sort so gray lines render first, colored (top N) on top
  const teamDataArr = filteredTeamNames.map(name => ({
    team: name,
    abbr: teamHistory[name][0].abbr,
    color: highlightColorMap[name],
    history: teamHistory[name]
  }));
  teamDataArr.sort((a, b) => {
    const aTop = colorMap[a.team] !== "LightGray" ? 1 : 0;
    const bTop = colorMap[b.team] !== "LightGray" ? 1 : 0;
    return aTop - bTop;
  });

  // Animation: all start at middle (position 10.5), then spread to actual positions
  const midPos = 10.5;
  const flatLine = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.season))
    .y(() => y(midPos));

  // Layer 1: Lines — start flat at middle, morph to actual positions
  const linesG = svg.append("g").attr("class", "history-lines");
  linesG.selectAll("path")
    .data(teamDataArr)
    .join("path")
    .attr("class", "history-line")
    .attr("d", d => flatLine(d.history))
    .attr("fill", "none")
    .attr("stroke", d => colorMap[d.team])
    .attr("stroke-width", 2.5)
    .attr("stroke-opacity", d => colorMap[d.team] === "LightGray" ? 0.6 : 0.85)
    .transition().delay(200).duration(1200).ease(d3.easeCubicOut)
    .attr("d", d => line(d.history));

  // Layer 2: Fat invisible hover targets (set final path immediately)
  linesG.selectAll(".history-line-fat")
    .data(teamDataArr)
    .join("path")
    .attr("class", "history-line-fat")
    .attr("d", d => line(d.history))
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 14)
    .style("cursor", "pointer");

  // Layer 3: Dots — start at middle, spread to actual positions
  const dotsG = svg.append("g").attr("class", "history-dots");
  const dotRadius = histMobile || histLandscape ? 3.5 : 5;
  teamDataArr.forEach(td => {
    dotsG.selectAll(null)
      .data(td.history)
      .join("circle")
      .attr("class", "history-dot")
      .attr("data-team", td.team)
      .attr("cx", d => x(d.season))
      .attr("cy", y(midPos))
      .attr("r", dotRadius)
      .attr("fill", colorMap[td.team] === "LightGray" ? "LightGray" : td.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
      .transition().duration(400).ease(d3.easeCubicOut)
      .attr("opacity", colorMap[td.team] === "LightGray" ? 0.6 : 0.85)
      .transition().duration(1000).ease(d3.easeCubicOut)
      .attr("cy", d => y(d.pos));
  });

  // Layer 4: Team name labels — fade in after spread completes
  const labelsG = svg.append("g").attr("class", "history-labels");
  teamDataArr.forEach(td => {
    const last = td.history[td.history.length - 1];
    labelsG.append("text")
      .attr("class", "history-team-label")
      .attr("data-team", td.team)
      .attr("x", x(last.season) + (histMobile || histLandscape ? 8 : 12))
      .attr("y", y(midPos))
      .attr("dy", "0.35em")
      .attr("font-size", histMobile || histLandscape ? "9px" : "11px")
      .attr("font-weight", "500")
      .attr("fill", colorMap[td.team] === "LightGray" ? "DimGray" : td.color)
      .text(histMobile || histLandscape ? td.abbr : td.team)
      .style("opacity", 0)
      .transition().delay(200).duration(1200).ease(d3.easeCubicOut)
      .attr("y", y(last.pos))
      .transition().duration(400)
      .style("opacity", 1);
  });

  // Hover interactions
  function highlightTeam(teamName) {
    const hColor = highlightColorMap[teamName];

    linesG.selectAll(".history-line")
      .attr("stroke-opacity", d => d.team === teamName ? 1 : 0.1)
      .attr("stroke-width", d => d.team === teamName ? 4 : 2)
      .attr("stroke", d => d.team === teamName ? hColor : colorMap[d.team]);

    dotsG.selectAll(".history-dot")
      .attr("opacity", function() { return d3.select(this).attr("data-team") === teamName ? 1 : 0.1; })
      .attr("r", function() {
        const isTarget = d3.select(this).attr("data-team") === teamName;
        return isTarget ? (histMobile || histLandscape ? 5 : 7) : (histMobile || histLandscape ? 3.5 : 5);
      })
      .attr("fill", function() {
        const isTarget = d3.select(this).attr("data-team") === teamName;
        return isTarget ? hColor : (colorMap[d3.select(this).attr("data-team")] === "LightGray" ? "LightGray" : highlightColorMap[d3.select(this).attr("data-team")]);
      });

    labelsG.selectAll(".history-team-label")
      .attr("opacity", function() { return d3.select(this).attr("data-team") === teamName ? 1 : 0.1; })
      .attr("fill", function() {
        const isTarget = d3.select(this).attr("data-team") === teamName;
        return isTarget ? hColor : (colorMap[d3.select(this).attr("data-team")] === "LightGray" ? "DimGray" : highlightColorMap[d3.select(this).attr("data-team")]);
      })
      .attr("font-weight", function() { return d3.select(this).attr("data-team") === teamName ? "700" : "500"; });
  }

  function resetHighlight() {
    linesG.selectAll(".history-line")
      .attr("stroke-opacity", d => colorMap[d.team] === "LightGray" ? 0.6 : 0.85)
      .attr("stroke-width", 2.5)
      .attr("stroke", d => colorMap[d.team]);

    dotsG.selectAll(".history-dot")
      .attr("opacity", function() { return colorMap[d3.select(this).attr("data-team")] === "LightGray" ? 0.6 : 0.85; })
      .attr("r", histMobile || histLandscape ? 3.5 : 5)
      .attr("fill", function() {
        const name = d3.select(this).attr("data-team");
        return colorMap[name] === "LightGray" ? "LightGray" : highlightColorMap[name];
      });

    labelsG.selectAll(".history-team-label")
      .attr("opacity", 1)
      .attr("fill", function() {
        const name = d3.select(this).attr("data-team");
        return colorMap[name] === "LightGray" ? "DimGray" : highlightColorMap[name];
      })
      .attr("font-weight", "500");

    hideTooltip();
  }

  // Attach hover events to fat lines and dots
  linesG.selectAll(".history-line-fat")
    .on("mousemove", function(event, d) {
      highlightTeam(d.team);
      const hist = d.history;
      const rows = hist.map(h =>
        `<div class="stat-row"><span class="stat-label">${h.season}</span><span class="stat-value">#${h.pos} (${h.pts}pts)</span></div>`
      ).join("");
      showTooltip(event, `<div class="team-name">${d.team}</div>${rows}`);
    })
    .on("mouseleave", resetHighlight);

  dotsG.selectAll(".history-dot")
    .style("cursor", "pointer")
    .on("mousemove", function(event, d) {
      const teamName = d3.select(this).attr("data-team");
      highlightTeam(teamName);
      showTooltip(event, `
        <div class="team-name">${teamName}</div>
        <div class="stat-row"><span class="stat-label">Season</span><span class="stat-value">${d.season}</span></div>
        <div class="stat-row"><span class="stat-label">Position</span><span class="stat-value">#${d.pos}</span></div>
        <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${d.pts}</span></div>
        <div class="stat-row"><span class="stat-label">Record</span><span class="stat-value">${d.w}W ${d.d}D ${d.l}L</span></div>
        <div class="stat-row"><span class="stat-label">Goals</span><span class="stat-value">${d.gf}F ${d.ga}A (${d.gd >= 0 ? "+" : ""}${d.gd})</span></div>
      `);
    })
    .on("mouseleave", resetHighlight);

  labelsG.selectAll(".history-team-label")
    .style("cursor", "pointer")
    .on("mousemove", function(event) {
      const teamName = d3.select(this).attr("data-team");
      highlightTeam(teamName);
      const hist = teamHistory[teamName];
      const rows = hist.map(h =>
        `<div class="stat-row"><span class="stat-label">${h.season}</span><span class="stat-value">#${h.pos} (${h.pts}pts)</span></div>`
      ).join("");
      showTooltip(event, `<div class="team-name">${teamName}</div>${rows}`);
    })
    .on("mouseleave", resetHighlight);

  // Axis labels
  if (!histMobile && !histLandscape) {
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -30)
      .attr("text-anchor", "middle").attr("fill", "#64748b").attr("font-size", "13px")
      .text("League Position");
  }
}

document.getElementById("history-filter").addEventListener("change", renderHistoryChart);
