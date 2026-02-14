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

  // Diagonal stripe pattern for selected cell
  const defs = svg.append("defs");
  const pattern = defs.append("pattern")
    .attr("id", "form-selected-pattern")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 5)
    .attr("height", 5)
    .attr("patternTransform", "rotate(45)");
  pattern.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", 5)
    .attr("stroke", "rgba(255,255,255,0.45)")
    .attr("stroke-width", 2.5);

  // Reusable highlight group (border + pattern overlay)
  const highlight = svg.append("g").style("display", "none").style("pointer-events", "none");
  const highlightBorder = highlight.append("rect")
    .attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3)
    .attr("rx", 4);
  const highlightPattern = highlight.append("rect")
    .attr("fill", "url(#form-selected-pattern)")
    .attr("rx", 3);

  // Column headers
  for (let gw = 0; gw < numWeeks; gw += 5) {
    svg.append("text")
      .attr("x", gw * (cellW + cellPad) + cellW / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b").attr("font-size", "9px")
      .text(gw + 1);
  }

  let activeCell = null;

  function deselectCell() {
    if (activeCell) {
      d3.select(activeCell).attr("opacity", 0.85);
      highlight.style("display", "none");
      activeCell = null;
      hideTooltip();
    }
  }

  // Tap outside any cell to deselect
  svg.on("click", (event) => {
    if (event.target.tagName !== "rect") deselectCell();
  });

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
      const tooltipHtml = `
            <div class="team-name">${t.team}</div>
            <div class="stat-row"><span class="stat-label">Matchweek</span><span class="stat-value">${col + 1}</span></div>
            <div class="stat-row"><span class="stat-label">Date</span><span class="stat-value">${dateStr}</span></div>
            <div class="stat-row"><span class="stat-label">Match</span><span class="stat-value">${venueLabel} ${entry.opponent}</span></div>
            <div class="stat-row"><span class="stat-label">Venue</span><span class="stat-value">${entry.venue === 'H' ? 'Home' : 'Away'}</span></div>
            <div class="stat-row"><span class="stat-label">Score</span><span class="stat-value">${entry.score}</span></div>
            <div class="stat-row"><span class="stat-label">Result</span><span class="stat-value" style="color:${colorMap[r]}">${r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}</span></div>
            <div class="stat-row"><span class="stat-label">Season Record</span><span class="stat-value">${t.w}W ${t.d}D ${t.l}L</span></div>
          `;
      const cx = col * (cellW + cellPad);
      svg.append("rect")
        .attr("x", cx)
        .attr("y", yPos)
        .attr("width", cellW)
        .attr("height", cellH)
        .attr("rx", 3)
        .attr("fill", colorMap[r])
        .attr("opacity", 0)
        .attr("cursor", "pointer")
        .on("mousemove", (event) => {
          if (!activeCell) showTooltip(event, tooltipHtml);
        })
        .on("mouseleave", () => {
          if (!activeCell) hideTooltip();
        })
        .on("click", function (event) {
          event.stopPropagation();
          const wasActive = activeCell === this;
          deselectCell();
          if (!wasActive) {
            activeCell = this;
            d3.select(this).attr("opacity", 1);
            // Position pattern overlay on the cell
            highlightPattern.attr("x", cx).attr("y", yPos).attr("width", cellW).attr("height", cellH);
            // Position border outside the cell
            const pad = 1.5;
            highlightBorder.attr("x", cx - pad).attr("y", yPos - pad)
              .attr("width", cellW + pad * 2).attr("height", cellH + pad * 2);
            highlight.style("display", null).raise();
            showTooltip(event, tooltipHtml);
          }
        })
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
