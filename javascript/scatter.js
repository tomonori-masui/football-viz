// ========== 2. SCATTER PLOT ==========
let scatterSvg = null, scatterScales = null, scatterDims = null;
let scatterTeamMode = false;

const scatterLabels = {
  gf_per_game: "Goals Scored / Game", ga_per_game: "Goals Conceded / Game",
  shots: "Shots Per Game", shots_target: "Shots on Target / Game",
  clean_sheets: "Clean Sheets", fouls: "Fouls Per Game"
};

function buildScatterTeamDropdown() {
  const sel = document.getElementById("scatter-team");
  const prev = sel.value;
  sel.innerHTML = '<option value="">All Teams (Season View)</option>';
  const allTeams = new Set();
  Object.keys(SEASON_FILES).forEach(s => {
    if (seasonCache[s]) seasonCache[s].teams.forEach(t => allTeams.add(t.team));
  });
  teams.forEach(t => allTeams.add(t.team));
  [...allTeams].sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
}

async function renderScatter() {
  const container = d3.select("#scatter-chart");
  container.selectAll("*").remove();
  scatterTeamMode = false;

  buildScatterTeamDropdown();

  const selectedTeam = document.getElementById("scatter-team").value;

  const xField = document.getElementById("scatter-x").value;
  const yField = document.getElementById("scatter-y").value;

  const scatterMobile = window.innerWidth <= 640;
  const margin = { top: 15, right: scatterMobile ? 15 : 30, bottom: scatterMobile ? 40 : 40, left: scatterMobile ? 45 : 60 };
  const containerW = container.node().getBoundingClientRect().width;
  const w = Math.min(containerW, 1200) - margin.left - margin.right;
  const scatterLandscape = isLandscape();
  const h = (scatterLandscape ? window.innerHeight - 120 : scatterMobile ? window.innerHeight - 200 : Math.min(520, 520)) - margin.top - margin.bottom;

  scatterDims = { w, h, margin, xField, yField };

  const svgEl = container.append("svg")
    .attr("width", w + margin.left + margin.right)
    .attr("height", h + margin.top + margin.bottom);

  // Add clipPath to prevent dots from rendering outside chart area
  svgEl.append("defs").append("clipPath").attr("id", "scatter-clip")
    .append("rect").attr("width", w).attr("height", h);

  const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  scatterSvg = svg;

  // Compute global extents across ALL seasons so axes never change
  const allSeasons = Object.keys(SEASON_FILES);
  const allTeamData = [];
  for (const s of allSeasons) {
    const data = await loadSeason(s);
    allTeamData.push(...data.teams);
  }
  const xExtent = d3.extent(allTeamData, d => d[xField]);
  const yExtent = d3.extent(allTeamData, d => d[yField]);
  const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1;

  const x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, w]);
  const invertY = yField === "ga_per_game" || yField === "ga" || yField === "fouls";
  const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range(invertY ? [0, h] : [h, 0]);
  const sizeScale = d3.scaleSqrt().domain([0, 100]).range(scatterMobile ? [2, 12] : [3, 24]);
  scatterScales = { x, yScale, sizeScale };

  // Grid
  svg.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).tickSize(h).tickFormat("").ticks(8));
  svg.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-w).tickFormat("").ticks(8));

  // Quadrant lines
  const xMean = d3.mean(teams, d => d[xField]);
  const yMean = d3.mean(teams, d => d[yField]);
  svg.append("line").attr("class", "scatter-qline").attr("x1", x(xMean)).attr("x2", x(xMean))
    .attr("y1", 0).attr("y2", h)
    .attr("stroke", var_accent).attr("stroke-width", 1).attr("stroke-dasharray", "5,5").attr("opacity", 0.4);
  svg.append("line").attr("class", "scatter-qline").attr("x1", 0).attr("x2", w)
    .attr("y1", yScale(yMean)).attr("y2", yScale(yMean))
    .attr("stroke", var_accent).attr("stroke-width", 1).attr("stroke-dasharray", "5,5").attr("opacity", 0.4);

  // Quadrant labels
  const isDefensive = yField === "ga_per_game" || yField === "ga" || yField === "fouls";
  const quadLabels = isDefensive ? [
    { text: "Strong Defence, Weak Attack", x: 15, y: 20 },
    { text: "Elite Teams", x: w - 15, y: 20, anchor: "end" },
    { text: "Struggling", x: 15, y: h - 10 },
    { text: "Attack-focused, Leaky Defence", x: w - 15, y: h - 10, anchor: "end" }
  ] : [
    { text: "Complete", x: w - 15, y: 20, anchor: "end" },
    { text: "Defensive", x: 15, y: 20 },
    { text: "Offensive", x: w - 15, y: h - 10, anchor: "end" },
    { text: "Weak", x: 15, y: h - 10 }
  ];
  quadLabels.forEach(ql => {
    svg.append("text").attr("x", ql.x).attr("y", ql.y)
      .attr("text-anchor", ql.anchor || "start")
      .attr("fill", "rgba(100,116,139,0.3)").attr("font-size", "11px").attr("font-weight", "600")
      .text(ql.text);
  });

  // Background season text
  svg.append("text").attr("class", "scatter-bg-text")
    .attr("x", w / 2).attr("y", h / 2)
    .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
    .attr("fill", "rgba(100,116,139,0.08)").attr("font-size", "80px").attr("font-weight", "800")
    .text(currentSeason);

  // Dots group (clipped to chart area)
  svg.append("g").attr("class", "scatter-dots").attr("clip-path", "url(#scatter-clip)");
  svg.append("g").attr("class", "scatter-labels").attr("clip-path", "url(#scatter-clip)");

  drawScatterDots(teams, xField, yField, true);

  // Axes
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(8));

  // Axis labels
  svg.append("text")
    .attr("x", w / 2).attr("y", h + 40)
    .attr("text-anchor", "middle").attr("fill", "#64748b").attr("font-size", "13px")
    .text(scatterLabels[xField]);
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2).attr("y", -50)
    .attr("text-anchor", "middle").attr("fill", "#64748b").attr("font-size", "13px")
    .text(scatterLabels[yField]);

  // Size legend
  const legend = svg.append("g").attr("transform", `translate(${w - 120}, ${h - 60})`);
  legend.append("text").attr("fill", "#64748b").attr("font-size", "10px").text("Circle size = Points");

  // If a team was selected, switch to team view now that SVG is ready
  if (selectedTeam) {
    renderScatterTeamView(selectedTeam);
  }
}

function drawScatterDots(data, xField, yField, isSeasonView) {
  const { x, yScale, sizeScale } = scatterScales;
  const dotsG = scatterSvg.select(".scatter-dots");
  const labelsG = scatterSvg.select(".scatter-labels");

  // Data join for circles
  const circles = dotsG.selectAll("circle").data(data, d => isSeasonView ? d.team : d._seasonKey);

  // EXIT
  circles.exit()
    .transition().duration(800)
    .attr("r", 0).style("opacity", 0)
    .remove();

  // UPDATE
  circles
    .transition().duration(1200)
    .attr("cx", d => x(d[xField]))
    .attr("cy", d => yScale(d[yField]))
    .attr("r", d => sizeScale(d.pts))
    .style("fill", d => d.color)
    .style("stroke", d => isSeasonView ? "#fff" : d.color)
    .style("opacity", 0.7);

  // ENTER
  const enter = circles.enter().append("circle")
    .attr("cx", d => x(d[xField]))
    .attr("cy", d => yScale(d[yField]))
    .attr("r", 0)
    .style("fill", d => d.color)
    .style("stroke", d => isSeasonView ? "#fff" : d.color)
    .style("stroke-width", 2)
    .style("opacity", 0)
    .attr("cursor", "pointer")
    .on("mousemove", function(event, d) {
      d3.select(this).transition().duration(150)
        .attr("r", sizeScale(d.pts) + 4).style("opacity", 1)
        .style("fill", "#e74c3c").style("stroke", "#922b21");
      const seasonLabel = d._season || currentSeason;
      showTooltip(event, `
        <div class="team-name">${isSeasonView ? d.team : seasonLabel}</div>
        <div class="stat-row"><span class="stat-label">${scatterLabels[xField]}</span><span class="stat-value">${d[xField]}</span></div>
        <div class="stat-row"><span class="stat-label">${scatterLabels[yField]}</span><span class="stat-value">${d[yField]}</span></div>
        <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${d.pts}</span></div>
        <div class="stat-row"><span class="stat-label">Position</span><span class="stat-value">#${d.pos}</span></div>
      `);
    })
    .on("mouseleave", function(event, d) {
      d3.select(this).transition().duration(150)
        .attr("r", sizeScale(d.pts)).style("opacity", 0.7)
        .style("fill", d.color).style("stroke", isSeasonView ? "#fff" : d.color);
      hideTooltip();
    })
;

  enter.transition()
    .delay((d, i) => isSeasonView ? 0 : i * 300)
    .duration(isSeasonView ? 1200 : 500)
    .attr("r", d => sizeScale(d.pts))
    .style("opacity", 0.7);

  // Labels data join
  const texts = labelsG.selectAll("text").data(data, d => isSeasonView ? d.team : d._seasonKey);

  texts.exit()
    .transition().duration(800)
    .style("opacity", 0).remove();

  texts
    .transition().duration(1200)
    .attr("x", d => x(d[xField]))
    .attr("y", d => yScale(d[yField]) - sizeScale(d.pts) - 5)
    .text(d => isSeasonView ? d.abbr : d._season);

  texts.enter().append("text")
    .attr("x", d => x(d[xField]))
    .attr("y", d => yScale(d[yField]) - sizeScale(d.pts) - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155").attr("font-size", "10px").attr("font-weight", "600")
    .text(d => isSeasonView ? d.abbr : d._season)
    .style("opacity", 0)
    .transition()
    .delay((d, i) => isSeasonView ? 400 : i * 300)
    .duration(isSeasonView ? 800 : 500)
    .style("opacity", 1);
}

// Update scatter dots in-place when season changes (no full redraw)
function updateScatterSeason() {
  if (!scatterSvg || scatterTeamMode) return;
  const { xField, yField } = scatterDims;
  // Update background text
  scatterSvg.select(".scatter-bg-text").text(currentSeason);
  // Scales are global (computed from all seasons) — no recalculation needed
  // Update quadrant lines to reflect current season's means
  const xMean = d3.mean(teams, d => d[xField]);
  const yMean = d3.mean(teams, d => d[yField]);
  const qlines = scatterSvg.selectAll(".scatter-qline");
  if (qlines.size() >= 2) {
    const nodes = qlines.nodes();
    d3.select(nodes[0]).transition().duration(1200)
      .attr("x1", scatterScales.x(xMean)).attr("x2", scatterScales.x(xMean));
    d3.select(nodes[1]).transition().duration(1200)
      .attr("y1", scatterScales.yScale(yMean)).attr("y2", scatterScales.yScale(yMean));
  }
  drawScatterDots(teams, xField, yField, true);
}

async function renderScatterTeamView(teamName) {
  if (!scatterSvg) { renderScatter(); return; }
  scatterTeamMode = true;
  const { xField, yField, w, h } = scatterDims;

  // Load all seasons for this team
  const allSeasons = Object.keys(SEASON_FILES);
  const teamSeasonData = [];
  for (const season of allSeasons) {
    const data = await loadSeason(season);
    const t = data.teams.find(d => d.team === teamName);
    if (t) {
      teamSeasonData.push({ ...t, _season: season, _seasonKey: season });
    }
  }

  if (teamSeasonData.length === 0) return;

  // Scales are global (computed from all seasons) — no adjustment needed

  // Update background text to team name
  scatterSvg.select(".scatter-bg-text").text(teamName);

  // Update quadrant lines (hide them in team view)
  scatterSvg.selectAll(".scatter-qline").transition().duration(600).style("opacity", 0);

  // Remove old connecting lines
  scatterSvg.selectAll(".scatter-connect-line").remove();
  scatterSvg.selectAll(".scatter-lines-group").remove();

  // When switching team-to-team, clear old dots instantly (no animated transition)
  scatterSvg.select(".scatter-dots").selectAll("circle").remove();
  scatterSvg.select(".scatter-labels").selectAll("text").remove();

  // Draw dots
  drawScatterDots(teamSeasonData, xField, yField, false);

  // Draw connecting lines between consecutive seasons
  const { x, yScale } = scatterScales;
  const linesG = scatterSvg.insert("g", ".scatter-dots").attr("class", "scatter-lines-group");

  for (let i = 1; i < teamSeasonData.length; i++) {
    const prev = teamSeasonData[i - 1];
    const curr = teamSeasonData[i];
    linesG.append("line")
      .attr("class", "scatter-connect-line")
      .attr("x1", x(prev[xField])).attr("y1", yScale(prev[yField]))
      .attr("x2", x(prev[xField])).attr("y2", yScale(prev[yField]))
      .attr("stroke", curr.color).attr("stroke-width", 2)
      .attr("stroke-opacity", 0.4).attr("stroke-dasharray", "4,3")
      .style("pointer-events", "none")
      .transition().delay(i * 300).duration(800)
      .attr("x2", x(curr[xField])).attr("y2", yScale(curr[yField]));
  }

}

document.getElementById("scatter-x").addEventListener("change", renderScatter);
document.getElementById("scatter-y").addEventListener("change", renderScatter);
document.getElementById("scatter-team").addEventListener("change", function() {
  if (this.value) {
    renderScatterTeamView(this.value);
  } else {
    renderScatter();
  }
});
