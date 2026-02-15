// ========== NAV ==========
const tabRenderers = {
  standings: () => renderStandings(document.querySelector('.sort-btn.active')?.dataset.sort || 'points'),
  scatter: () => renderScatter(),
  radar: () => renderRadar(),
  bump: () => renderBumpChart(),
  form: () => renderFormChart(),
  history: () => renderHistoryChart()
};

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.viz-section').forEach(s => s.classList.remove('active'));
  const navTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (navTab) navTab.classList.add('active');
  document.getElementById('section-' + tabId).classList.add('active');
  document.getElementById('chart-dropdown').value = tabId;
  if (tabId === 'bump') resetBumpAnim();
  const renderer = tabRenderers[tabId];
  if (renderer) renderer();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.getElementById('chart-dropdown').addEventListener('change', function() {
  switchTab(this.value);
});

// ========== SEASON SWITCHING ==========
async function switchSeason(season) {
  currentSeason = season;

  // Update header title
  document.title = "Premier League Data Viz - Interactive Dashboard";

  // Update season dropdown button and selection
  document.getElementById("season-dropdown-btn").innerHTML = season + ' &#9662;';
  document.querySelectorAll('.season-dropdown-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.season === season);
  });

  // Load and process data
  const data = await loadSeason(season);
  teams = data.teams;
  weeklyPositions = data.weeklyPositions;
  weeklyPts = data.weeklyPts;
  formData = data.formData;
  maxMatchweek = data.maxMatchweek;

  // Reset scatter team dropdown to season view if in team mode
  const wasTeamMode = scatterTeamMode;
  if (scatterTeamMode) {
    document.getElementById("scatter-team").value = "";
    scatterTeamMode = false;
  }

  // Rebuild radar team selector
  rebuildRadarTeamSelector();

  // Reset bump animation so it replays for the new season
  resetBumpAnim();

  // Re-render the currently active chart tab
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) {
    if (activeTab.dataset.tab === 'scatter' && scatterSvg && !scatterTeamMode && !wasTeamMode) {
      // Animate scatter transition instead of full redraw
      buildScatterTeamDropdown();
      updateScatterSeason();
    } else {
      const renderer = tabRenderers[activeTab.dataset.tab];
      if (renderer) renderer();
    }
  }
}

// Season dropdown toggle
document.getElementById("season-dropdown-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("season-dropdown-menu").classList.toggle("open");
});

// Season dropdown item click
document.querySelectorAll('.season-dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    document.getElementById("season-dropdown-menu").classList.remove("open");
    switchSeason(item.dataset.season);
  });
});

// Close dropdown when clicking outside
document.addEventListener("click", () => {
  document.getElementById("season-dropdown-menu").classList.remove("open");
});

// ========== RESPONSIVE ==========
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
      const renderer = tabRenderers[activeTab.dataset.tab];
      if (renderer) renderer();
    }
  }, 250);
});

// ========== INIT ==========
(async function init() {
  await loadPointDeductions();
  await switchSeason(currentSeason);
})();
