/* Intel Summit Check-In — script.js */

/* --- Config & element refs --- */
const ATTENDANCE_GOAL = 50;
const els = {
  form: document.querySelector('#checkin-form'),
  nameInput: document.querySelector('#attendee-name'),
  teamSelect: document.querySelector('#team-select'),
  greet: document.querySelector('#greeting'),
  totalCount: document.querySelector('#total-count'),
  teamCounts: {
    'water-wise': document.querySelector('#water-count') || document.querySelector('[data-team="water-wise"] .team-count'),
    'net-zero': document.querySelector('#netzero-count') || document.querySelector('[data-team="net-zero"] .team-count'),
    'renewables': document.querySelector('#renewables-count') || document.querySelector('[data-team="renewables"] .team-count'),
  },
  progressBar: document.querySelector('#progress-bar'),
  progressLabel: document.querySelector('#progress-label'),
  celebration: document.querySelector('#celebration'),
  attendeeList: document.querySelector('#attendee-list'),
};

/* --- Persistent app state --- */
const STORAGE_KEY = 'intelSummitCheckIn.v1';
const state = {
  total: 0,
  teams: { 'water-wise': 0, 'net-zero': 0, 'renewables': 0 },
  attendees: [], // { name, team, ts }
};

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

/* --- Rendering --- */

/* Update total and team counters */
function renderTotals() {
  if (els.totalCount) els.totalCount.textContent = String(state.total);
  for (const [teamKey, count] of Object.entries(state.teams)) {
    const el = els.teamCounts[teamKey];
    if (el) el.textContent = String(count);
  }
}

/* Update progress bar and label */
function renderProgress() {
  const pct = Math.min(100, Math.round((state.total / ATTENDANCE_GOAL) * 100));
  if (els.progressBar) {
    els.progressBar.style.width = pct + '%';
    els.progressBar.setAttribute('aria-valuenow', String(pct));
    els.progressBar.setAttribute('aria-valuemax', '100');
  }
  if (els.progressLabel) els.progressLabel.textContent = `${pct}% of ${ATTENDANCE_GOAL}`;
}

/* Render attendee list (most recent first) */
function renderAttendeeList() {
  if (!els.attendeeList) return;
  els.attendeeList.innerHTML = '';
  for (const a of [...state.attendees].reverse()) {
    const li = document.createElement('li');
    li.className = 'attendee-row';
    li.innerHTML = `
      <span class="attendee-name">${escapeHTML(a.name)}</span>
      <span class="attendee-dot ${a.team}"></span>
      <span class="attendee-team">${prettyTeam(a.team)}</span>
    `;
    els.attendeeList.appendChild(li);
  }
}

/* Render all UI parts */
function renderAll() {
  renderTotals();
  renderProgress();
  renderAttendeeList();
}

/* --- Utilities --- */

/* Basic HTML escape for user input */
function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* Map team key to display label */
function prettyTeam(teamKey) {
  switch (teamKey) {
    case 'water-wise': return 'Team Water Wise';
    case 'net-zero': return 'Team Net Zero';
    case 'renewables': return 'Team Renewables';
    default: return teamKey;
  }
}

/* True if attendance goal is reached */
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

/* --- Feedback UI --- */

/* Show transient greeting for check-in */
function showGreeting(name, teamKey) {
  if (!els.greet) return;
  els.greet.textContent = `Welcome, ${name}! You’re checked in with ${prettyTeam(teamKey)}.`;
  els.greet.classList.add('show');
  setTimeout(() => els.greet && els.greet.classList.remove('show'), 3500);
}

/* Show celebration banner and confetti */
function showCelebration() {
  if (!els.celebration) return;
  const leader = currentLeader();
  els.celebration.textContent = leader
    ? `🎉 Goal reached! Current leader: ${prettyTeam(leader)}.`
    : '🎉 Goal reached! It’s a tie at the top right now.';
  els.celebration.classList.add('on');
  confettiBurst();
  setTimeout(() => els.celebration && els.celebration.classList.remove('on'), 6000);
}

/* Lightweight emoji confetti burst */
function confettiBurst() {
  const EMOJIS = ['✨','🎉','🎊','💧','⚡','🌿'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    s.style.left = Math.random() * 100 + 'vw';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1800 + Math.random() * 800);
  }
}

/* --- Form handling --- */

/* Handle submit: update state, render, persist */
function onSubmit(e) {
  e.preventDefault();
  if (!els.nameInput || !els.teamSelect) return;

  const name = els.nameInput.value.trim() || 'Guest';
  const teamKey = els.teamSelect.value;

  state.total += 1;
  if (teamKey in state.teams) state.teams[teamKey] += 1;
  state.attendees.push({ name, team: teamKey, ts: Date.now() });

  renderAll();
  saveState();
  showGreeting(name, teamKey);
  if (isGoalReached()) showCelebration();

  els.nameInput.value = '';
  els.nameInput.focus();
}

/* --- Init --- */
function init() {
  loadState();
  renderAll();
  if (els.form) els.form.addEventListener('submit', onSubmit);
}
document.addEventListener('DOMContentLoaded', init);
