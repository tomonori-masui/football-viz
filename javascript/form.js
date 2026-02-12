// ========== 5. FORM HEATMAP ==========
function renderFormChart() {
  const container = d3.select("#form-chart");
  container.selectAll("*").remove();

  let sorted = [...teams];

  const formMobile = window.innerWidth <= 640;
  const formLandscape = isLandscape();
  const margin = { top: 25, right: 10, bottom: formLandscape ? 10 : 20, left: formMobile ? 35 : formLandscape ? 60 : 100 };
  const cellPad = formMobile || formLandscape ? 1 : 2;
  const numWeeks = Math.max(maxMatchweek, ...sorted.map(t => (formData[t.team] || []).length));
  const containerW = container.node().getBoundingClientRect().width;
  const cellW = formMobile || formLandscape ? Math.floor((containerW - margin.left - margin.right) / numWeeks - cellPad) : 20;
  const cellH = formLandscape
    ? Math.max(3, Math.floor((window.innerHeight * 0.55 - margin.top - margin.bottom) / sorted.length - cellPad - 1))
    : formMobile ? Math.max(cellW, Math.floor((window.innerHeight * 0.65 - margin.top - margin.bottom) / sorted.length - cellPad - 2)) : 20;
  const w = numWeeks * (cellW + cellPad) + margin.left + margin.right;
  const h = sorted.length * (cellH + cellPad + 2) + margin.top + margin.bottom;

  const svg = container.append("svg")
    .attr("width", w)
    .attr("height", h)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const colorMap = { W: "#10b981", D: "#f59e0b", L: "#ef4444" };

  // Column headers
  for (let gw = 0; gw < numWeeks; gw += 5) {
    svg.append("text")
      .attr("x", gw * (cellW + cellPad) + cellW / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b").attr("font-size", "9px")
      .text(gw + 1);
  }

  sorted.forEach((t, row) => {
    const yPos = row * (cellH + cellPad + 2);
    const results = formData[t.team] || [];

    // Team label
    svg.append("text")
      .attr("x", -10).attr("y", yPos + cellH / 2)
      .attr("dy", "0.35em").attr("text-anchor", "end")
      .attr("fill", t.pos <= 4 ? "#2563eb" : t.pos >= 18 ? "#ef4444" : "#94a3b8")
      .attr("font-size", formMobile || formLandscape ? "9px" : "11px").attr("font-weight", "500")
      .text(formMobile || formLandscape ? t.abbr : t.team);

    // Cells
    results.forEach((entry, col) => {
      const r = entry.result;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr = entry.date instanceof Date
        ? `${months[entry.date.getMonth()]} ${entry.date.getDate()}, ${entry.date.getFullYear()}`
        : '';
      const venueLabel = entry.venue === 'H' ? 'vs' : '@';
      svg.append("rect")
        .attr("x", col * (cellW + cellPad))
        .attr("y", yPos)
        .attr("width", cellW)
        .attr("height", cellH)
        .attr("rx", 3)
        .attr("fill", colorMap[r])
        .attr("opacity", 0)
        .attr("cursor", "pointer")
        .on("mousemove", (event) => {
          showTooltip(event, `
            <div class="team-name">${t.team}</div>
            <div class="stat-row"><span class="stat-label">Matchweek</span><span class="stat-value">${col + 1}</span></div>
            <div class="stat-row"><span class="stat-label">Date</span><span class="stat-value">${dateStr}</span></div>
            <div class="stat-row"><span class="stat-label">Match</span><span class="stat-value">${venueLabel} ${entry.opponent}</span></div>
            <div class="stat-row"><span class="stat-label">Venue</span><span class="stat-value">${entry.venue === 'H' ? 'Home' : 'Away'}</span></div>
            <div class="stat-row"><span class="stat-label">Score</span><span class="stat-value">${entry.score}</span></div>
            <div class="stat-row"><span class="stat-label">Result</span><span class="stat-value" style="color:${colorMap[r]}">${r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}</span></div>
            <div class="stat-row"><span class="stat-label">Season Record</span><span class="stat-value">${t.w}W ${t.d}D ${t.l}L</span></div>
          `);
        })
        .on("mouseleave", hideTooltip)
        .transition().duration(300).delay(col * 15 + row * 5)
        .attr("opacity", 0.85);
    });
  });

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(0, ${sorted.length * (cellH + cellPad + 2) + 10})`);
  [{ label: "Win", color: "#10b981" }, { label: "Draw", color: "#f59e0b" }, { label: "Loss", color: "#ef4444" }]
    .forEach((item, i) => {
      legend.append("rect").attr("x", i * 70).attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", item.color);
      legend.append("text").attr("x", i * 70 + 18).attr("y", 10).attr("fill", "#64748b").attr("font-size", "11px").text(item.label);
    });

}
