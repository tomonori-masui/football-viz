// ========== 1. STANDINGS BAR CHART ==========
function renderStandings(sortKey = "points") {
  const container = d3.select("#standings-chart");
  container.selectAll("*").remove();

  const isMobile = window.innerWidth <= 640;
  const isTablet = window.innerWidth <= 1024;
  const margin = { top: 10, right: isMobile ? 30 : 60, bottom: 50, left: isMobile ? 70 : isTablet ? 100 : 120 };
  const width = Math.min(container.node().getBoundingClientRect().width, 1300) - margin.left - margin.right;
  const landscape = isLandscape();
  const height = teams.length * (landscape ? 14 : isMobile ? 26 : 22);

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const keyMap = { points: "pts", gd: "gd", gf: "gf", ga: "ga" };
  const field = keyMap[sortKey] || "pts";

  const sorted = [...teams].sort((a, b) => {
    if (field === "ga") return a[field] - b[field];
    return b[field] - a[field];
  });

  const maxVal = d3.max(sorted, d => Math.abs(d[field]));
  const hasNeg = d3.min(sorted, d => d[field]) < 0;

  const x = d3.scaleLinear()
    .domain(hasNeg ? [-maxVal, maxVal] : [0, maxVal])
    .range(hasNeg ? [0, width] : [0, width]);

  const y = d3.scaleBand()
    .domain(sorted.map(d => d.team))
    .range([0, height])
    .padding(0.25);

  // Grid
  svg.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).tickSize(height).tickFormat("").ticks(8))
    .attr("transform", `translate(0,0)`)
    .call(g => g.select(".domain").remove());

  // Zero line for negative values
  if (hasNeg) {
    svg.append("line")
      .attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", var_accent).attr("stroke-width", 1).attr("stroke-opacity", 0.5);
  }

  // Bars
  const bars = svg.selectAll(".bar").data(sorted).enter().append("g");

  bars.append("rect")
    .attr("x", d => hasNeg ? (d[field] >= 0 ? x(0) : x(d[field])) : 0)
    .attr("y", d => y(d.team))
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", (d) => {
      if (d.pos <= 4) return "url(#grad-ucl)";
      if (d.pos <= 6) return "url(#grad-uel)";
      if (d.pos >= 18) return "url(#grad-rel)";
      return "url(#grad-mid)";
    })
    .attr("opacity", 0.85)
    .attr("width", 0)
    .on("mousemove", (event, d) => {
      showTooltip(event, `
        <div class="team-name">${d.team}</div>
        <div class="stat-row"><span class="stat-label">Position</span><span class="stat-value">#${d.pos}</span></div>
        <div class="stat-row"><span class="stat-label">Played</span><span class="stat-value">${d.matches_played}</span></div>
        <div class="stat-row"><span class="stat-label">W / D / L</span><span class="stat-value">${d.w} / ${d.d} / ${d.l}</span></div>
        <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${d.pts}</span></div>
        <div class="stat-row"><span class="stat-label">Goals</span><span class="stat-value">${d.gf} - ${d.ga} (${d.gd >= 0 ? '+' : ''}${d.gd})</span></div>
        <div class="stat-row"><span class="stat-label">Clean Sheets</span><span class="stat-value">${d.clean_sheets}</span></div>
        <div class="stat-row"><span class="stat-label">Shots / Game</span><span class="stat-value">${d.shots}</span></div>
      `);
    })
    .on("mouseleave", hideTooltip)
    .transition().duration(800).ease(d3.easeCubicOut)
    .attr("width", d => hasNeg ? Math.abs(x(d[field]) - x(0)) : x(d[field]));

  // Value labels
  bars.append("text")
    .attr("x", d => {
      if (hasNeg) return d[field] >= 0 ? x(d[field]) + 5 : x(d[field]) - 5;
      return x(d[field]) + 5;
    })
    .attr("y", d => y(d.team) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => hasNeg && d[field] < 0 ? "end" : "start")
    .attr("fill", "#1e293b")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .attr("opacity", 0)
    .text(d => field === "gd" ? (d[field] >= 0 ? `+${d[field]}` : d[field]) : d[field])
    .transition().delay(400).duration(400)
    .attr("opacity", 1);

  // Team labels
  svg.selectAll(".team-label").data(sorted).enter()
    .append("text")
    .attr("x", d => hasNeg ? (d[field] >= 0 ? x(0) - 10 : x(0) + 10) : -10)
    .attr("y", d => y(d.team) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => hasNeg && d[field] < 0 ? "start" : "end")
    .attr("fill", d => {
      if (d.pos <= 4) return "#2563eb";
      if (d.pos <= 6) return "#f59e0b";
      if (d.pos >= 18) return "#ef4444";
      return "#94a3b8";
    })
    .attr("font-size", isMobile ? "10px" : "12px")
    .attr("font-weight", "500")
    .text(d => isMobile ? d.abbr : d.team);

  // Gradients
  const defs = svg.append("defs");
  [
    { id: "grad-ucl", colors: ["#3b82f6", "#60a5fa"] },
    { id: "grad-uel", colors: ["#f59e0b", "#fbbf24"] },
    { id: "grad-rel", colors: ["#ef4444", "#f87171"] },
    { id: "grad-mid", colors: ["#64748b", "#94a3b8"] }
  ].forEach(g => {
    const grad = defs.append("linearGradient").attr("id", g.id);
    grad.append("stop").attr("offset", "0%").attr("stop-color", g.colors[0]);
    grad.append("stop").attr("offset", "100%").attr("stop-color", g.colors[1]);
  });

  // Axis
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8))
    .call(g => g.select(".domain").remove());

  // Color legend
  const legendLabels = isMobile
    ? [{ label: "UCL (1–4)", color: "#3b82f6" }, { label: "UEL (5–6)", color: "#f59e0b" }, { label: "Mid", color: "#64748b" }, { label: "Rel (18–20)", color: "#ef4444" }]
    : [{ label: "Champions League (1st–4th)", color: "#3b82f6" }, { label: "Europa League (5th–6th)", color: "#f59e0b" }, { label: "Mid-table", color: "#64748b" }, { label: "Relegation (18th–20th)", color: "#ef4444" }];
  const legendFontSize = isMobile ? "9px" : "11px";
  const legend = svg.append("g").attr("transform", `translate(0, ${height + 35})`);
  let lx = 0;
  legendLabels.forEach(d => {
    const g = legend.append("g").attr("transform", `translate(${lx}, 0)`);
    g.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", d.color).attr("opacity", 0.85);
    const text = g.append("text").attr("x", 14).attr("y", 9).attr("fill", "#94a3b8").attr("font-size", legendFontSize).text(d.label);
    lx += text.node().getComputedTextLength() + (isMobile ? 16 : 30);
  });

  // Sort button styling
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const isActive = btn.dataset.sort === sortKey;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? '#475569' : '';
    btn.style.borderColor = isActive ? '#475569' : '';
    btn.style.color = isActive ? '#ffffff' : '';
  });
}

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => renderStandings(btn.dataset.sort));
});
