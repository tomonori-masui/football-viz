// ========== 3. RADAR CHART ==========
const radarMetrics = [
  { key: "pts", label: "Points" },
  { key: "gf", label: "Goals Scored" },
  { key: "shots_target", label: "On Target/Game" },
  { key: "shots", label: "Shots/Game" },
  { key: "gd", label: "Goal Diff" },
  { key: "clean_sheets", label: "Clean Sheets" }
];

const radarColors = ["#475569", "#3b82f6", "#10b981", "#f59e0b"];
let selectedRadarTeams = [];

function initRadarTeamSelector() {
  const container = d3.select("#radar-teams");
  teams.forEach(t => {
    container.append("div")
      .attr("class", `team-chip ${selectedRadarTeams.includes(t.team) ? 'selected' : ''}`)
      .attr("data-team", t.team)
      .text(t.abbr)
      .on("click", function() {
        const team = this.dataset.team;
        if (selectedRadarTeams.includes(team)) {
          if (selectedRadarTeams.length <= 2) return;
          selectedRadarTeams = selectedRadarTeams.filter(t => t !== team);
        } else {
          if (selectedRadarTeams.length >= 4) selectedRadarTeams.shift();
          selectedRadarTeams.push(team);
        }
        container.selectAll(".team-chip").classed("selected", function() {
          return selectedRadarTeams.includes(this.dataset.team);
        });
        renderRadar();
      });
  });
}

function renderRadar() {
  const container = d3.select("#radar-chart");
  container.selectAll("*").remove();
  d3.select("#radar-legend").selectAll("*").remove();

  const radarLandscape = isLandscape();
  const w = radarLandscape ? window.innerHeight - 50 : Math.min(container.node().getBoundingClientRect().width, 480);
  const h = w;
  const radius = w / 2 - (radarLandscape ? 50 : 60);

  const svg = container.append("svg")
    .attr("width", w).attr("height", h)
    .append("g").attr("transform", `translate(${w/2},${h/2})`);

  const numMetrics = radarMetrics.length;
  const angleSlice = (Math.PI * 2) / numMetrics;

  // Normalize values to 0-1 (league percentile)
  const ranges = {};
  radarMetrics.forEach(m => {
    ranges[m.key] = { min: d3.min(teams, d => d[m.key]), max: d3.max(teams, d => d[m.key]) };
  });

  function normalize(key, value) {
    const r = ranges[key];
    const denom = r.max - r.min;
    return denom === 0 ? 0.5 : (value - r.min) / denom;
  }

  // Grid circles
  const levels = 5;
  for (let i = 1; i <= levels; i++) {
    const r = radius * i / levels;
    svg.append("circle")
      .attr("r", r).attr("fill", "none")
      .attr("stroke", "#cbd5e1").attr("stroke-width", 1);
    svg.append("text")
      .attr("x", 5).attr("y", -r - 2)
      .attr("fill", "#94a3b8").attr("font-size", "9px")
      .text(Math.round(i / levels * 100) + "%");
  }

  // Axis lines & labels
  radarMetrics.forEach((m, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    svg.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", Math.cos(angle) * radius)
      .attr("y2", Math.sin(angle) * radius)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 1);

    const labelR = radius + (radarLandscape ? 20 : 25);
    svg.append("text")
      .attr("x", Math.cos(angle) * labelR)
      .attr("y", Math.sin(angle) * labelR)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#64748b").attr("font-size", radarLandscape ? "9px" : "11px").attr("font-weight", "600")
      .text(m.label);
  });

  // Team polygons
  const radarLine = d3.lineRadial()
    .radius(d => d.r)
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  selectedRadarTeams.forEach((teamName, idx) => {
    const t = teams.find(d => d.team === teamName);
    if (!t) return;

    const dataPoints = radarMetrics.map(m => ({
      r: normalize(m.key, t[m.key]) * radius
    }));

    const color = radarColors[idx % radarColors.length];

    // Area
    svg.append("path")
      .datum(dataPoints)
      .attr("d", radarLine)
      .attr("fill", color).attr("fill-opacity", 0.1)
      .attr("stroke", color).attr("stroke-width", 2.5)
      .attr("stroke-opacity", 0)
      .transition().duration(800).delay(idx * 200)
      .attr("stroke-opacity", 0.8);

    // Dots
    dataPoints.forEach((dp, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      svg.append("circle")
        .attr("cx", Math.cos(angle) * dp.r)
        .attr("cy", Math.sin(angle) * dp.r)
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", "#fff").attr("stroke-width", 1.5)
        .attr("cursor", "pointer")
        .on("mousemove", (event) => {
          showTooltip(event, `
            <div class="team-name">${t.team}</div>
            <div class="stat-row"><span class="stat-label">${radarMetrics[i].label}</span><span class="stat-value">${t[radarMetrics[i].key]}</span></div>
            <div class="stat-row"><span class="stat-label">Percentile</span><span class="stat-value">${Math.round(normalize(radarMetrics[i].key, t[radarMetrics[i].key]) * 100)}%</span></div>
          `);
        })
        .on("mouseleave", hideTooltip);
    });

    // Legend
    d3.select("#radar-legend").append("div").attr("class", "legend-item")
      .html(`<div class="legend-color" style="background:${color}"></div>${t.team}`);
  });
}

function rebuildRadarTeamSelector() {
  d3.select("#radar-teams").selectAll("*").remove();
  selectedRadarTeams = teams.slice(0, 4).map(t => t.team);
  initRadarTeamSelector();
}
