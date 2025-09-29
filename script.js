/* Intel Summit Check-In — script.js */

/* --- Config & selectors --- */
const ATTENDANCE_GOAL = 50;
const els = {
  form: document.querySelector('#checkInForm'),
  nameInput: document.querySelector('#attendeeName'),
  teamSelect: document.querySelector('#teamSelect'),
  greet: document.querySelector('#greeting'),
  totalCount: document.querySelector('#attendeeCount'),
  teamCounts: {
    water: document.querySelector('#waterCount'),
    zero: document.querySelector('#zeroCount'),
    power: document.querySelector('#powerCount'),
  },
  progressBar: document.querySelector('#progressBar'),
  celebration: document.querySelector('#celebration'),
  attendeeList: document.querySelector('#attendee-list'),
  toggleAllBtn: document.querySelector('#toggleAllBtn'),
  teamCards: document.querySelectorAll('.team-card[data-team]'),
};

/* --- Persistent state --- */
const STORAGE_KEY = 'intelSummitCheckIn.v1';
const state = {
  total: 0,
  teams: { water: 0, zero: 0, power: 0 },
  attendees: [], // { name, team, ts }
};

/* View filter state for collapsible list */
let currentFilter = null;   // 'water' | 'zero' | 'power' | null
let listVisible = false;

/* Load state from localStorage */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    if (typeof saved.total === 'number') state.total = saved.total;
    for (const k of Object.keys(state.teams)) {
      if (typeof saved.teams?.[k] === 'number') state.teams[k] = saved.teams[k];
    }
    if (Array.isArray(saved.attendees)) state.attendees = saved.attendees.slice(-1000);
  } catch (e) {
    console.error('Load failed:', e);
  }
}

/* Save state to localStorage */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

/* Update totals and per-team counters */
function renderTotals() {
  if (els.totalCount) els.totalCount.textContent = String(state.total);
  for (const [k, v] of Object.entries(state.teams)) {
    const el = els.teamCounts[k];
    if (el) el.textContent = String(v);
  }
}

/* Update progress bar fill */
function renderProgress() {
  const pct = Math.min(100, Math.round((state.total / ATTENDANCE_GOAL) * 100));
  if (els.progressBar) els.progressBar.style.width = pct + '%';
}

/* Render attendee list with optional filter */
function renderAttendeeList(filter = null) {
  if (!els.attendeeList) return;
  els.attendeeList.innerHTML = '';
  const data = [...state.attendees]
    .filter(a => (filter ? a.team === filter : true))
    .reverse();
  for (const a of data) {
    const li = document.createElement('li');
    li.className = 'attendee-row';
    li.innerHTML = `
      <span class="attendee-name">${escapeHTML(a.name)}</span>
      <span class="attendee-team">${prettyTeam(a.team)}</span>
    `;
    els.attendeeList.appendChild(li);
  }
}

/* Show or hide list with a filter */
function toggleList(filter = null) {
  const same = listVisible && currentFilter === filter;
  if (same) {
    els.attendeeList.hidden = true;
    listVisible = false;
    currentFilter = null;
    setExpandedIndicators(null, false);
    return;
  }
  currentFilter = filter;
  listVisible = true;
  renderAttendeeList(filter);
  els.attendeeList.hidden = false;
  setExpandedIndicators(filter, true);
}

/* Sync aria-expanded on controls */
function setExpandedIndicators(filter, expanded) {
  if (els.toggleAllBtn) els.toggleAllBtn.setAttribute('aria-expanded', String(expanded && !filter));
  els.teamCards.forEach(card => {
    const match = filter && card.dataset.team === filter;
    card.setAttribute('aria-expanded', String(expanded && !!match));
  });
}

/* Render all UI */
function renderAll() {
  renderTotals();
  renderProgress();
  if (listVisible) renderAttendeeList(currentFilter);
}

/* Basic HTML escape */
function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* Map team keys to labels */
function prettyTeam(key) {
  return key === 'water' ? 'Team Water Wise'
       : key === 'zero'  ? 'Team Net Zero'
       : key === 'power' ? 'Team Renewables'
       : key;
}

/* True if goal reached */
function isGoalReached() {
  return state.total >= ATTENDANCE_GOAL;
}

/* Return single leading team key or null on tie */
function currentLeader() {
  const pairs = Object.entries(state.teams).sort((a, b) => b[1] - a[1]);
  if (!pairs.length) return null;
  const [leadKey, leadCount] = pairs[0];
  if (pairs[1] && pairs[1][1] === leadCount) return null;
  return leadKey;
}

/* Show transient greeting */
function showGreeting(name, teamKey) {
  if (!els.greet) return;
  els.greet.textContent = `Welcome, ${name}! You’re checked in with ${prettyTeam(teamKey)}.`;
  els.greet.classList.add('show');
  setTimeout(() => els.greet && els.greet.classList.remove('show'), 3000);
}

/* Show celebration banner and highlight leader */
function showCelebration() {
  if (!els.celebration) return;
  const leader = currentLeader();
  els.celebration.textContent = leader
    ? `🎉 Goal reached! Current leader: ${prettyTeam(leader)}.`
    : '🎉 Goal reached! It’s a tie at the top.';
  els.celebration.classList.add('on');

  document.querySelectorAll('.team-card').forEach(c => c.classList.remove('leader'));
  if (leader) {
    const map = { water: '.team-card.water', zero: '.team-card.zero', power: '.team-card.power' };
    const card = document.querySelector(map[leader]);
    if (card) card.classList.add('leader');
  }

  setTimeout(() => els.celebration && els.celebration.classList.remove('on'), 6000);
}

/* Handle submit: update state, render, persist */
function onSubmit(e) {
  e.preventDefault();
  if (!els.nameInput || !els.teamSelect) return;

  const name = els.nameInput.value.trim() || 'Guest';
  const teamKey = els.teamSelect.value;
  if (!Object.hasOwn(state.teams, teamKey)) return;

  state.total += 1;
  state.teams[teamKey] += 1;
  state.attendees.push({ name, team: teamKey, ts: Date.now() });

  renderAll();
  saveState();
  showGreeting(name, teamKey);
  if (isGoalReached()) showCelebration();

  els.nameInput.value = '';
  els.nameInput.focus();
}

/* Wire toggle interactions */
function bindToggles() {
  if (els.toggleAllBtn) {
    els.toggleAllBtn.addEventListener('click', () => toggleList(null));
  }
  els.teamCards.forEach(card => {
    card.addEventListener('click', () => {
      const team = card.dataset.team;
      toggleList(team);
    });
  });
}

/* Init */
function init() {
  loadState();
  renderAll();
  bindToggles();
  if (els.form) els.form.addEventListener('submit', onSubmit);
}
document.addEventListener('DOMContentLoaded', init);