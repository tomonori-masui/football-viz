// ========== 4. BUMP CHART ==========
let bumpAnimTimer = null;
let bumpAnimPlayed = false;

function resetBumpAnim() {
  bumpAnimPlayed = false;
}

function renderBumpChart() {
  const container = d3.select("#bump-chart");
  container.selectAll("*").remove();

  if (bumpAnimTimer) { bumpAnimTimer.stop(); bumpAnimTimer = null; }

  const filter = document.getElementById("bump-filter").value;
  let filteredTeams;
  switch(filter) {
    case "top6": filteredTeams = teams.filter(t => t.pos <= 6); break;
    case "top10": filteredTeams = teams.filter(t => t.pos <= 10); break;
    case "relegation": filteredTeams = teams.filter(t => t.pos >= 14); break;
    default: filteredTeams = teams;
  }

  const totalWeeks = maxMatchweek;
  if (totalWeeks < 1) return;

  const bumpMobile = window.innerWidth <= 640;
  const bumpTablet = window.innerWidth <= 1024;
  const margin = { top: 15, right: bumpMobile ? 10 : 20, bottom: 50, left: bumpMobile ? 30 : 50 };
  const teamNameWidth = bumpMobile ? 80 : bumpTablet ? 110 : 130;
  const containerWidth = Math.min(container.node().getBoundingClientRect().width, 1300);
  const w = containerWidth - margin.left - margin.right;
  const bumpLandscape = isLandscape();
  const h = bumpLandscape ? window.innerHeight - 120 : bumpMobile ? window.innerHeight - 200 : Math.max(440, filteredTeams.length * 22);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${h + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const allPos = filteredTeams.flatMap(t => weeklyPositions[t.team] || []);
  const posMin = d3.min(allPos) || 1;
  const posMax = d3.max(allPos) || 20;

  const x = d3.scaleLinear().domain([0, totalWeeks - 1]).range([0, w - teamNameWidth]);
  const y = d3.scaleLinear().domain([posMin - 0.5, posMax + 0.5]).range([0, h]);
  // Color assignment — use each team's own color from TEAM_META
  const topN = 6;
  const teamKeys = {};
  const teamColorMap = {};
  const sortedByPos = [...filteredTeams].sort((a, b) => a.pos - b.pos);

  filteredTeams.forEach(t => {
    const key = t.team.replace(/[^a-zA-Z0-9]/g, '');
    teamKeys[t.team] = key;
    const posIdx = sortedByPos.findIndex(st => st.team === t.team);
    teamColorMap[t.team] = posIdx < topN ? (t.color === "#000000" ? "#555" : t.color) : "LightGray";
  });

  const teamHighlightColor = {};
  filteredTeams.forEach(t => {
    teamHighlightColor[t.team] = t.color === "#000000" ? "#555" : t.color;
  });

  // Prepare structured data
  const teamDataArr = filteredTeams.map(t => {
    const pos = weeklyPositions[t.team] || [];
    return {
      team: t.team, abbr: t.abbr, finalPos: t.pos,
      key: teamKeys[t.team],
      points: pos.map((p, i) => ({ week: i, position: p }))
    };
  }).filter(d => d.points.length > 0);

  // Sort so gray lines render first, colored (top N) lines render on top
  teamDataArr.sort((a, b) => {
    const aTop = a.finalPos <= topN ? 1 : 0;
    const bTop = b.finalPos <= topN ? 1 : 0;
    return aTop - bTop;
  });

  // Line generator
  const valueline = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.week))
    .y(d => y(d.position));

  // Layer 1: Thin visible lines
  svg.append("g").attr("id", "g-line-thin")
    .selectAll("path")
    .data(teamDataArr)
    .join("path")
    .attr("class", "bump-line-thin")
    .attr("id", d => "bline-" + d.key)
    .style("stroke", d => teamColorMap[d.team]);

  // Layer 2: Fat invisible hover target lines
  svg.append("g").attr("id", "g-line-fat")
    .selectAll("path")
    .data(teamDataArr)
    .join("path")
    .attr("class", "bump-line-fat")
    .attr("d", d => valueline(d.points));

  // Layer 3: Team name labels
  svg.append("g").attr("id", "g-team-text")
    .selectAll("text")
    .data(teamDataArr)
    .enter().append("text")
    .attr("class", "bump-team-text")
    .attr("dy", "0.35em")
    .attr("id", d => "btext-" + d.key)
    .style("fill", d => d.finalPos <= topN ? teamColorMap[d.team] : "DimGray")
    .text(d => d.team)
    .style("opacity", 0);

  // Compute rank label positions with collision avoidance
  const rankRadius = bumpLandscape ? 5 : 8;
  const rankSpacing = rankRadius * 2 + 2;
  const rankPositions = teamDataArr.map(d => {
    const lastPt = d.points[d.points.length - 1];
    return { key: d.key, team: d.team, idealY: lastPt ? y(lastPt.position) : 0, finalPos: d.finalPos };
  }).sort((a, b) => a.idealY - b.idealY);
  // Push overlapping labels apart
  for (let i = 1; i < rankPositions.length; i++) {
    if (rankPositions[i].idealY - rankPositions[i - 1].idealY < rankSpacing) {
      rankPositions[i].idealY = rankPositions[i - 1].idealY + rankSpacing;
    }
  }
  const rankYMap = {};
  rankPositions.forEach(r => { rankYMap[r.key] = r.idealY; });

  // Layer 4: Rank dots
  svg.append("g").attr("id", "g-rank-dots")
    .selectAll("circle")
    .data(teamDataArr)
    .enter().append("circle")
    .attr("class", "bump-rank-dot")
    .attr("r", rankRadius)
    .attr("cx", w - teamNameWidth + 14)
    .attr("cy", d => rankYMap[d.key])
    .style("fill", d => teamColorMap[d.team])
    .attr("id", d => "bdot-" + d.key)
    .style("opacity", 0);

  // Layer 5: Rank numbers
  svg.append("g").attr("id", "g-rank-num")
    .selectAll("text")
    .data(teamDataArr)
    .enter().append("text")
    .attr("class", "bump-rank-num")
    .attr("x", w - teamNameWidth + 14)
    .attr("y", d => rankYMap[d.key])
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("fill", "#303030")
    .style("font-size", bumpLandscape ? "8px" : "11px")
    .text(d => d.finalPos)
    .attr("id", d => "brank-" + d.key)
    .style("opacity", 0);

  // Layer 6: Match dots (W/D/L)
  const resultColorMap = { W: '#7dcea0', D: '#b2babb', L: '#ec7063' };
  filteredTeams.forEach(t => {
    const key = teamKeys[t.team];
    const form = formData[t.team] || [];
    const positions = weeklyPositions[t.team] || [];

    const dotData = [];
    for (let i = 0; i < Math.min(form.length, positions.length); i++) {
      const r = form[i].result;
      dotData.push({
        week: i, position: positions[i], result: r, color: resultColorMap[r] || '#ccc'
      });
    }

    svg.append("g").attr("class", "g-match-dots")
      .selectAll("circle").data(dotData).enter()
      .append("circle")
      .attr("class", "bump-match-dot match-dot-" + key)
      .attr("id", d => "mdot-" + key + "-" + d.week)
      .attr("r", 4)
      .attr("cx", d => x(d.week))
      .attr("cy", d => y(d.position))
      .style("fill", d => d.color)
      .style("stroke", teamHighlightColor[t.team])
      .style("stroke-width", 1.5)
      .style("display", "none");
  });

  // Axes
  svg.append("g")
    .attr("class", "axis xaxis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(Math.min(19, w / 50)).tickFormat(d => `GW${d + 1}`))
    .selectAll("text")
    .attr("transform", "translate(-15,17)rotate(-45)");

  svg.append("g")
    .attr("class", "axis yaxis")
    .call(d3.axisLeft(y).ticks(posMax - posMin + 1).tickFormat(d => `#${Math.round(d)}`));

  if (!bumpMobile) {
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-margin.left * 0.7},${h / 2})rotate(-90)`)
      .attr("fill", "var(--text-secondary)")
      .attr("font-size", "13px")
      .text("Standings");
  }

  // Initial Line-Drawing Animation (skip if already played, e.g. on resize)
  if (bumpAnimPlayed) {
    svg.selectAll(".bump-line-thin")
      .style("opacity", 1)
      .attr("d", d => valueline(d.points));

    svg.selectAll(".bump-team-text")
      .style("opacity", 1)
      .attr("transform", d => {
        const last = d.points[d.points.length - 1];
        return last ? `translate(${x(last.week) + 30},${y(last.position)})` : '';
      });

    svg.selectAll(".bump-rank-dot").style("opacity", 1);
    svg.selectAll(".bump-rank-num").style("opacity", 1);

    addEvents();
  } else {
    bumpAnimPlayed = true;

    bumpAnimTimer = d3.timer((elapsed) => {
      const curIdx = Math.floor(elapsed / 25);

      svg.selectAll(".bump-line-thin")
        .style("opacity", d => d.finalPos <= topN ? 1 : 0)
        .attr("d", d => valueline(d.points.slice(0, Math.min(curIdx + 1, totalWeeks))));

      svg.selectAll(".bump-team-text")
        .style("opacity", d => d.finalPos <= topN ? 1 : 0)
        .transition().duration(40).ease(d3.easeLinear)
        .attr("transform", d => {
          const idx = Math.min(curIdx, totalWeeks - 1);
          const pt = d.points[Math.min(idx, d.points.length - 1)];
          return pt ? `translate(${x(pt.week) + 10},${y(pt.position)})` : '';
        });

      if (curIdx >= totalWeeks) {
        bumpAnimTimer.stop();
        bumpAnimTimer = null;

        svg.selectAll(".bump-line-thin")
          .transition().duration(1000)
          .style("opacity", 1);

        svg.selectAll(".bump-team-text")
          .transition().duration(1000)
          .style("opacity", 1)
          .attr("transform", d => {
            const last = d.points[d.points.length - 1];
            return last ? `translate(${x(last.week) + 30},${y(last.position)})` : '';
          });

        svg.selectAll(".bump-rank-dot")
          .transition().delay(500).duration(1000)
          .style("opacity", 1);
        svg.selectAll(".bump-rank-num")
          .transition().delay(500).duration(1000)
          .style("opacity", 1);

        addEvents();
      }
    }, 30);
  }

  // Interaction Functions
  function lineSelect(teamKey) {
    const team = filteredTeams.find(t => teamKeys[t.team] === teamKey);
    if (!team) return;

    svg.selectAll(".bump-line-thin")
      .style("stroke", "LightGray")
      .classed("selected", false);
    svg.selectAll(".bump-team-text").style("fill", "LightGray");
    svg.selectAll(".bump-rank-dot").style("fill", "LightGray");

    d3.select("#bline-" + teamKey)
      .style("stroke", teamHighlightColor[team.team])
      .classed("selected", true)
      .each(function() { this.parentNode.appendChild(this); });

    d3.select("#btext-" + teamKey)
      .style("fill", teamHighlightColor[team.team]);
    d3.select("#bdot-" + teamKey)
      .style("fill", teamHighlightColor[team.team]);

    svg.selectAll(".bump-match-dot").style("display", "none");
    svg.selectAll(".match-dot-" + teamKey).style("display", null);
  }

  function lineUnselect() {
    svg.selectAll(".bump-line-thin")
      .classed("selected", false)
      .style("stroke", d => teamColorMap[d.team]);
    svg.selectAll(".bump-team-text")
      .style("fill", d => d.finalPos <= topN ? teamColorMap[d.team] : "DimGray");
    svg.selectAll(".bump-rank-dot")
      .style("fill", d => teamColorMap[d.team]);
    svg.selectAll(".bump-match-dot")
      .attr("r", 4).style("stroke-width", 1.5)
      .style("display", "none");
    hideTooltip();
  }

  function addEvents() {
    svg.selectAll(".bump-line-fat")
      .on("mousemove", function(event) {
        const d = d3.select(this).datum();
        lineSelect(d.key);

        const [mx] = d3.pointer(event);
        const weekIdx = Math.max(0, Math.min(totalWeeks - 1, Math.round(x.invert(mx))));
        const pt = d.points[weekIdx];
        if (!pt) return;
        const pos = pt.position;
        const team = filteredTeams.find(t => teamKeys[t.team] === d.key);
        if (!team) return;

        const dotCx = x(weekIdx);
        const dotCy = y(pos);
        const [, my] = d3.pointer(event);
        const distToDot = Math.sqrt((mx - dotCx) ** 2 + (my - dotCy) ** 2);
        const form = formData[team.team];
        const formEntry = form ? form[weekIdx] : null;
        const resultStr = formEntry ? formEntry.result : null;
        const resultLabel = resultStr === 'W' ? 'Win' : resultStr === 'D' ? 'Draw' : resultStr === 'L' ? 'Loss' : '';
        const resultColor = resultStr === 'W' ? '#10b981' : resultStr === 'D' ? '#f59e0b' : resultStr === 'L' ? '#ef4444' : '';

        svg.selectAll(".bump-match-dot").attr("r", 4).style("stroke-width", 1.5);
        if (distToDot < 12) {
          d3.select("#mdot-" + d.key + "-" + weekIdx).attr("r", 6).style("stroke-width", 3);
        }

        const gwPts = weeklyPts[team.team] ? weeklyPts[team.team][weekIdx] : null;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dateStr = formEntry && formEntry.date instanceof Date
          ? `${months[formEntry.date.getMonth()]} ${formEntry.date.getDate()}, ${formEntry.date.getFullYear()}`
          : '';
        const venueLabel = formEntry ? (formEntry.venue === 'H' ? 'vs' : '@') : '';
        const venueStr = formEntry ? (formEntry.venue === 'H' ? 'Home' : 'Away') : '';
        let tooltipHtml = `
          <div class="team-name">${team.team}</div>
          <div class="stat-row"><span class="stat-label">Matchweek</span><span class="stat-value">${weekIdx + 1}</span></div>
          <div class="stat-row"><span class="stat-label">Position</span><span class="stat-value">#${pos}</span></div>
          <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${gwPts != null ? gwPts : '-'}</span></div>`;
        if (formEntry) {
          if (dateStr) tooltipHtml += `<div class="stat-row"><span class="stat-label">Date</span><span class="stat-value">${dateStr}</span></div>`;
          tooltipHtml += `<div class="stat-row"><span class="stat-label">Match</span><span class="stat-value">${venueLabel} ${formEntry.opponent}</span></div>`;
          tooltipHtml += `<div class="stat-row"><span class="stat-label">Venue</span><span class="stat-value">${venueStr}</span></div>`;
          tooltipHtml += `<div class="stat-row"><span class="stat-label">Score</span><span class="stat-value">${formEntry.score}</span></div>`;
        }
        if (resultLabel) {
          tooltipHtml += `<div class="stat-row"><span class="stat-label">Result</span><span class="stat-value" style="color:${resultColor}">${resultLabel}</span></div>`;
        }
        tooltipHtml += `<div class="stat-row"><span class="stat-label">Final</span><span class="stat-value">#${team.pos} (${team.pts} pts)</span></div>`;
        showTooltip(event, tooltipHtml);
      })
      .on("mouseout", function() {
        svg.selectAll(".bump-match-dot").attr("r", 4).style("stroke-width", 1.5);
        lineUnselect();
      });

    svg.selectAll(".bump-team-text")
      .on("mouseover", function(event) {
        const d = d3.select(this).datum();
        lineSelect(d.key);
        const team = filteredTeams.find(t => teamKeys[t.team] === d.key);
        if (team) showTooltip(event, `
          <div class="team-name">${team.team}</div>
          <div class="stat-row"><span class="stat-label">Final Position</span><span class="stat-value">#${team.pos}</span></div>
          <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${team.pts}</span></div>
          <div class="stat-row"><span class="stat-label">Season Record</span><span class="stat-value">${team.w}W ${team.d}D ${team.l}L</span></div>
        `);
      })
      .on("click", function() {
        lineSelect(d3.select(this).datum().key);
      })
      .on("mouseout", lineUnselect);

    svg.selectAll(".bump-rank-dot")
      .on("mouseover", function(event) {
        const d = d3.select(this).datum();
        lineSelect(d.key);
        const team = filteredTeams.find(t => teamKeys[t.team] === d.key);
        if (team) showTooltip(event, `
          <div class="team-name">${team.team}</div>
          <div class="stat-row"><span class="stat-label">Final Position</span><span class="stat-value">#${team.pos}</span></div>
          <div class="stat-row"><span class="stat-label">Points</span><span class="stat-value">${team.pts}</span></div>
          <div class="stat-row"><span class="stat-label">Season Record</span><span class="stat-value">${team.w}W ${team.d}D ${team.l}L</span></div>
        `);
      })
      .on("mouseout", lineUnselect);

    svg.selectAll(".bump-rank-num")
      .style("pointer-events", "none");

    function touchUnselect(event) {
      const sel = '.bump-line-fat, .bump-team-text, .bump-rank-dot, .bump-rank-num';
      if (!event.target.matches(sel)) { lineUnselect(); }
    }
    document.body.addEventListener('touchstart', touchUnselect, { passive: true });
  }
}

document.getElementById("bump-filter").addEventListener("change", () => {
  resetBumpAnim();
  renderBumpChart();
});
