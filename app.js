const STORAGE_KEY = "rotcTrackerStateV2";
const LEGACY_STORAGE_KEY = "rotcTrackerStateV1";
const START_DATE = new Date("2026-03-30T00:00:00Z");
const GRAD_MONTH_END = new Date("2028-05-31T23:59:59Z");

const state = loadState();
let timerInterval = null;
let toastTimeout = null;

const ui = {
  rankName: document.getElementById("rankName"),
  rankMeta: document.getElementById("rankMeta"),
  rankProgress: document.getElementById("rankProgress"),
  xpMeta: document.getElementById("xpMeta"),
  totalXp: document.getElementById("totalXp"),
  assignmentsDone: document.getElementById("assignmentsDone"),
  testsAced: document.getElementById("testsAced"),
  studyClock: document.getElementById("studyClock"),
  studySessions: document.getElementById("studySessions"),
  studyMinutes: document.getElementById("studyMinutes"),
  daysRemaining: document.getElementById("daysRemaining"),
  nextReward: document.getElementById("nextReward"),
  assignmentList: document.getElementById("assignmentList"),
  toast: document.getElementById("toast")
};

const RANKS = buildRankTable();

wireEvents();
render();

function wireEvents() {
  document.getElementById("assignmentForm").addEventListener("submit", onAddAssignment);
  document.getElementById("logATest").addEventListener("click", onLogATest);
  document.getElementById("startStudy").addEventListener("click", startStudySession);
  document.getElementById("stopStudy").addEventListener("click", stopStudySession);
  document.getElementById("resetStudy").addEventListener("click", resetStudyTimer);

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
}

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

  const parsed = safeParse(localStorage.getItem(STORAGE_KEY))
    || safeParse(localStorage.getItem(LEGACY_STORAGE_KEY))
    || {};

  return {
    ...base,
    ...parsed,
    assignments: normalizeAssignments(parsed.assignments)
  };
}

function safeParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeAssignments(assignments) {
  if (!Array.isArray(assignments)) return [];

  return assignments
    .map((assignment) => {
      const title = typeof assignment?.title === "string" ? assignment.title.trim() : "";
      if (!title) return null;

      const xp = Number(assignment?.xp);
      return {
        id: assignment?.id || createId(),
        title,
        subject: typeof assignment?.subject === "string" ? assignment.subject.trim() : "",
        xp: [10, 20, 50].includes(xp) ? xp : 10
      };
    })
    .filter(Boolean);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function onAddAssignment(event) {
  event.preventDefault();

  const title = document.getElementById("assignmentTitle").value.trim();
  const subject = document.getElementById("assignmentSubject").value.trim();
  const xp = Number(document.getElementById("assignmentXp").value);

  if (!title) {
    showToast("Add a title before saving the assignment.");
    return;
  }

  state.assignments.unshift({
    id: createId(),
    title,
    subject,
    xp: [10, 20, 50].includes(xp) ? xp : 10
  });

  event.target.reset();
  saveState();
  renderAssignments();
  renderOverview();
  showToast("Assignment saved.");
}

function onLogATest() {
  state.xp += 100;
  state.testsAced += 1;
  saveState();
  render();
  showToast("A-test logged: +100 XP.");
}

function startStudySession() {
  if (state.activeStudyStartMs) {
    showToast("Study timer already running.");
    return;
  }

  state.activeStudyStartMs = Date.now();
  saveState();
  beginStudyTicker();
  renderOverview();
}

function stopStudySession() {
  if (!state.activeStudyStartMs) {
    showToast("Start a session first.");
    return;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.activeStudyStartMs) / 1000));
  const earnedXp = Math.floor(elapsedSeconds / 60);

  state.studyTotalSeconds += elapsedSeconds;
  state.studySessionCount += 1;
  state.xp += earnedXp;
  state.activeStudyStartMs = null;

  stopStudyTicker();
  saveState();
  render();
  showToast(`Study session complete: +${earnedXp} XP.`);
}

function resetStudyTimer() {
  state.activeStudyStartMs = null;
  stopStudyTicker();
  saveState();
  renderClockOnly();
  showToast("Timer reset.");
}

function completeAssignment(id) {
  const idx = state.assignments.findIndex((item) => item.id === id);
  if (idx < 0) return;

  const [assignment] = state.assignments.splice(idx, 1);
  state.xp += assignment.xp;
  state.assignmentsCompleted += 1;

  saveState();
  render();
  showToast(`Completed ${assignment.title}: +${assignment.xp} XP.`);
}

function dropAssignment(id) {
  const idx = state.assignments.findIndex((item) => item.id === id);
  if (idx < 0) return;

  const [assignment] = state.assignments.splice(idx, 1);
  saveState();
  renderAssignments();
  showToast(`Removed ${assignment.title}.`);
}

function setActiveTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });
}

function getRankStatus(total) {
  let current = RANKS[0];

  for (let i = 0; i < RANKS.length; i += 1) {
    if (total >= RANKS[i].cumulativeXp) current = RANKS[i];
    else break;
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
  ui.assignmentList.innerHTML = "";

  if (!state.assignments.length) {
    const li = document.createElement("li");
    li.className = "todo-item empty";
    li.textContent = "No assignments queued. Add your next mission.";
    ui.assignmentList.appendChild(li);
    return;
  }

  state.assignments.forEach((assignment) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    const info = document.createElement("div");
    info.innerHTML = `
      <strong>${escapeHtml(assignment.title)}</strong>
      <p class="todo-meta">${escapeHtml(assignment.subject || "General")} · ${assignment.xp} XP</p>
    `;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const completeBtn = document.createElement("button");
    completeBtn.className = "primary";
    completeBtn.textContent = "Complete";
    completeBtn.addEventListener("click", () => completeAssignment(assignment.id));

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => dropAssignment(assignment.id));

    actions.append(completeBtn, removeBtn);
    li.append(info, actions);
    ui.assignmentList.appendChild(li);
  });
}

function renderOverview() {
  const rank = getRankStatus(state.xp);

  ui.rankName.textContent = rank.current.name;
  ui.rankMeta.textContent = `Rank ${rank.current.number} of ${RANKS.length}`;
  ui.rankProgress.style.width = `${rank.progressPct}%`;

  if (rank.next) {
    ui.xpMeta.textContent = `${Math.floor(rank.xpIntoRank)} / ${Math.floor(rank.xpNeededForNext)} XP to next rank`;
    ui.nextReward.textContent = `Next rank reward: ${rank.next.reward}`;
  } else {
    ui.xpMeta.textContent = "MAX RANK achieved. Outstanding discipline.";
    ui.nextReward.textContent = "All rewards unlocked. Maintain excellence.";
  }

  ui.totalXp.textContent = state.xp;
  ui.assignmentsDone.textContent = state.assignmentsCompleted;
  ui.testsAced.textContent = state.testsAced;
  ui.studySessions.textContent = state.studySessionCount;
  ui.studyMinutes.textContent = Math.floor(state.studyTotalSeconds / 60);

  const now = new Date();
  const missionStart = Math.max(now.getTime(), START_DATE.getTime());
  const msLeft = GRAD_MONTH_END.getTime() - missionStart;
  const days = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  ui.daysRemaining.textContent = `${days} days`;

  renderClockOnly();
}

function renderClockOnly() {
  ui.studyClock.textContent = formatClock(getCurrentStudyElapsedSeconds());
}

function render() {
  renderOverview();
  renderAssignments();
  syncTickerWithState();
}

function escapeHtml(value) {
  return String(value)
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
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function beginStudyTicker() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    renderClockOnly();
  }, 1000);
}

function stopStudyTicker() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function syncTickerWithState() {
  if (state.activeStudyStartMs) beginStudyTicker();
  else stopStudyTicker();
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    ui.toast.classList.remove("show");
  }, 1700);
}
