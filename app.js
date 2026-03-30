const STORAGE_KEY = "rotcTrackerStateV1";
const START_DATE = new Date("2026-03-30T00:00:00Z");
const GRAD_MONTH_END = new Date("2028-05-31T23:59:59Z");

const state = loadState();

const rankName = document.getElementById("rankName");
const rankMeta = document.getElementById("rankMeta");
const rankProgress = document.getElementById("rankProgress");
const xpMeta = document.getElementById("xpMeta");
const totalXp = document.getElementById("totalXp");
const assignmentsDone = document.getElementById("assignmentsDone");
const testsAced = document.getElementById("testsAced");
const studyClock = document.getElementById("studyClock");
const studySessions = document.getElementById("studySessions");
const studyMinutes = document.getElementById("studyMinutes");
const daysRemaining = document.getElementById("daysRemaining");
const nextReward = document.getElementById("nextReward");
const assignmentList = document.getElementById("assignmentList");

document.getElementById("assignmentForm").addEventListener("submit", onAddAssignment);
document.getElementById("logATest").addEventListener("click", onLogATest);
document.getElementById("startStudy").addEventListener("click", startStudySession);
document.getElementById("stopStudy").addEventListener("click", stopStudySession);
document.getElementById("resetStudy").addEventListener("click", resetStudyTimer);

let timerInterval = null;

render();

function buildRankTable() {
  const prefixes = [
    "Cadet",
    "Squad",
    "Platoon",
    "Company",
    "Battalion",
    "Brigade",
    "Command",
    "Elite",
    "Legend",
    "Marshal"
  ];

  const rewards = [
    "Snack break",
    "30 mins game time",
    "Pick tonight's dinner",
    "Movie night",
    "New school supplies",
    "$10 gift card",
    "$20 gift card",
    "Day trip activity",
    "New tech accessory",
    "Big reward of your choice"
  ];

  const ranks = [];
  let cumulativeXp = 0;

  for (let i = 1; i <= 120; i += 1) {
    const tier = Math.min(Math.floor((i - 1) / 12), 9);
    const xpToNext = 90 + i * 15;
    const rewardTier = Math.min(Math.floor((i - 1) / 12), rewards.length - 1);
    ranks.push({
      number: i,
      name: `${prefixes[tier]} Rank ${i}`,
      cumulativeXp,
      xpToNext,
      reward: rewards[rewardTier]
    });
    cumulativeXp += xpToNext;
  }

  return ranks;
}

const RANKS = buildRankTable();

function loadState() {
  const base = {
    xp: 0,
    assignmentsCompleted: 0,
    testsAced: 0,
    studyTotalSeconds: 0,
    studySessionCount: 0,
    activeStudyStartMs: null,
    assignments: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function onAddAssignment(event) {
  event.preventDefault();
  const title = document.getElementById("assignmentTitle").value.trim();
  const subject = document.getElementById("assignmentSubject").value.trim();
  const xp = Number(document.getElementById("assignmentXp").value);

  if (!title) return;

  state.assignments.push({
    id: crypto.randomUUID(),
    title,
    subject,
    xp
  });

  event.target.reset();
  saveState();
  render();
}

function onLogATest() {
  state.xp += 100;
  state.testsAced += 1;
  saveState();
  render();
}

function startStudySession() {
  if (state.activeStudyStartMs) return;
  state.activeStudyStartMs = Date.now();
  saveState();
  beginStudyTicker();
  render();
}

function stopStudySession() {
  if (!state.activeStudyStartMs) return;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.activeStudyStartMs) / 1000));
  const earnedXp = Math.floor(elapsedSeconds / 60);

  state.studyTotalSeconds += elapsedSeconds;
  state.studySessionCount += 1;
  state.xp += earnedXp;
  state.activeStudyStartMs = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  saveState();
  render();
}

function resetStudyTimer() {
  state.activeStudyStartMs = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  saveState();
  render();
}

function completeAssignment(id) {
  const idx = state.assignments.findIndex((item) => item.id === id);
  if (idx < 0) return;

  const [assignment] = state.assignments.splice(idx, 1);
  state.xp += assignment.xp;
  state.assignmentsCompleted += 1;
  saveState();
  render();
}

function dropAssignment(id) {
  state.assignments = state.assignments.filter((item) => item.id !== id);
  saveState();
  render();
}

function getRankStatus(total) {
  let current = RANKS[0];

  for (let i = 0; i < RANKS.length; i += 1) {
    if (total >= RANKS[i].cumulativeXp) {
      current = RANKS[i];
    } else {
      break;
    }
  }

  const next = RANKS[current.number] || null;

  if (!next) {
    return {
      current,
      next,
      xpIntoRank: current.xpToNext,
      xpNeededForNext: current.xpToNext,
      progressPct: 100
    };
  }

  const xpIntoRank = total - current.cumulativeXp;
  const xpNeededForNext = next.cumulativeXp - current.cumulativeXp;

  return {
    current,
    next,
    xpIntoRank,
    xpNeededForNext,
    progressPct: Math.max(0, Math.min(100, (xpIntoRank / xpNeededForNext) * 100))
  };
}

function renderAssignments() {
  assignmentList.innerHTML = "";

  if (!state.assignments.length) {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.textContent = "No tasks queued. Add your next mission.";
    assignmentList.appendChild(li);
    return;
  }

  state.assignments.forEach((assignment) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    const info = document.createElement("div");
    info.innerHTML = `
      <strong>${escapeHtml(assignment.title)}</strong>
      <div class="todo-meta">${escapeHtml(assignment.subject || "General")} • ${assignment.xp} XP</div>
    `;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Complete";
    completeBtn.addEventListener("click", () => completeAssignment(assignment.id));

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => dropAssignment(assignment.id));

    actions.append(completeBtn, removeBtn);
    li.append(info, actions);
    assignmentList.appendChild(li);
  });
}

function render() {
  const rank = getRankStatus(state.xp);

  rankName.textContent = rank.current.name;
  rankMeta.textContent = `Rank ${rank.current.number} of ${RANKS.length}`;
  rankProgress.style.width = `${rank.progressPct}%`;

  if (rank.next) {
    xpMeta.textContent = `${Math.floor(rank.xpIntoRank)} / ${Math.floor(rank.xpNeededForNext)} XP to next rank`;
    nextReward.textContent = `Next rank reward: ${rank.next.reward}`;
  } else {
    xpMeta.textContent = "MAX RANK achieved. Outstanding discipline.";
    nextReward.textContent = "All rewards unlocked. Maintain excellence.";
  }

  totalXp.textContent = state.xp;
  assignmentsDone.textContent = state.assignmentsCompleted;
  testsAced.textContent = state.testsAced;
  studySessions.textContent = state.studySessionCount;
  studyMinutes.textContent = Math.floor(state.studyTotalSeconds / 60);
  studyClock.textContent = formatClock(getCurrentStudyElapsedSeconds());

  const now = new Date();
  const missionStart = Math.max(now.getTime(), START_DATE.getTime());
  const msLeft = GRAD_MONTH_END.getTime() - missionStart;
  const days = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  daysRemaining.textContent = `${days} days`;

  renderAssignments();
  syncTickerWithState();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentStudyElapsedSeconds() {
  if (!state.activeStudyStartMs) return 0;
  return Math.max(0, Math.floor((Date.now() - state.activeStudyStartMs) / 1000));
}

function formatClock(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function beginStudyTicker() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    studyClock.textContent = formatClock(getCurrentStudyElapsedSeconds());
  }, 1000);
}

function syncTickerWithState() {
  if (state.activeStudyStartMs) {
    beginStudyTicker();
  } else if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
