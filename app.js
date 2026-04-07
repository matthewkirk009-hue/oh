const STORAGE_KEY = "companion-chat-state-v1";

const DEFAULT_STATE = {
  session: { mode: null, user: null },
  profile: { userName: "You", aiName: "Companion", avatarUrl: "" },
  apiKey: "",
  systemPrompt: "You are a caring, supportive AI companion.",
  models: ["openai/gpt-4.1-mini", "anthropic/claude-3.7-sonnet", "google/gemini-2.5-flash"],
  selectedModel: "openai/gpt-4.1-mini",
  sampling: {
    temperature: 0.7,
    top_p: 1,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1,
    min_p: 0,
    max_tokens: 500,
  },
  memories: {
    pinned: "",
    keyword: "",
  },
  summary: "",
  messages: [],
  accounts: {},
};

let state = loadState();

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return parsed ? { ...DEFAULT_STATE, ...parsed } : structuredClone(DEFAULT_STATE);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const $ = (id) => document.getElementById(id);

const els = {
  authView: $("authView"),
  welcomeView: $("welcomeView"),
  appView: $("appView"),
  tabLogin: $("tabLogin"),
  tabRegister: $("tabRegister"),
  loginPanel: $("loginPanel"),
  registerPanel: $("registerPanel"),
  authMessage: $("authMessage"),
};

function setTab(tab) {
  const isLogin = tab === "login";
  els.tabLogin.classList.toggle("active", isLogin);
  els.tabRegister.classList.toggle("active", !isLogin);
  els.loginPanel.classList.toggle("active", isLogin);
  els.registerPanel.classList.toggle("active", !isLogin);
}

els.tabLogin.onclick = () => setTab("login");
els.tabRegister.onclick = () => setTab("register");

$("registerBtn").onclick = () => {
  const username = $("registerUsername").value.trim();
  const password = $("registerPassword").value;
  if (!username || !password) return setAuthMessage("Username and password required.");
  if (state.accounts[username]) return setAuthMessage("Username already exists.");
  state.accounts[username] = password;
  state.session = { mode: "account", user: username };
  saveState();
  setAuthMessage("Account created.");
  showWelcome();
};

$("loginBtn").onclick = () => {
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;
  if (state.accounts[username] !== password) return setAuthMessage("Invalid credentials.");
  state.session = { mode: "account", user: username };
  saveState();
  showWelcome();
};

$("offlineBtn").onclick = () => {
  state.session = { mode: "offline", user: null };
  saveState();
  showWelcome();
};

function setAuthMessage(msg) {
  els.authMessage.textContent = msg;
}

function showOnly(view) {
  [els.authView, els.welcomeView, els.appView].forEach((el) => el.classList.add("hidden"));
  view.classList.remove("hidden");
}

function showWelcome() {
  showOnly(els.welcomeView);
  $("userName").value = state.profile.userName;
  $("aiName").value = state.profile.aiName;
  $("avatarUrl").value = state.profile.avatarUrl;
  refreshAvatarPreview();
}

function refreshAvatarPreview() {
  const url = $("avatarUrl").value.trim();
  $("avatarPreview").src = url || "";
}
$("avatarUrl").addEventListener("input", refreshAvatarPreview);

$("startChatBtn").onclick = () => {
  state.profile.userName = $("userName").value.trim() || "You";
  state.profile.aiName = $("aiName").value.trim() || "Companion";
  state.profile.avatarUrl = $("avatarUrl").value.trim();
  saveState();
  showApp();
};

function fillSettings() {
  $("apiKey").value = state.apiKey;
  $("systemPrompt").value = state.systemPrompt;
  $("pinnedMemory").value = state.memories.pinned;
  $("keywordMemory").value = state.memories.keyword;

  const modelSelect = $("modelSelect");
  modelSelect.innerHTML = "";
  state.models.forEach((m) => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    if (m === state.selectedModel) o.selected = true;
    modelSelect.appendChild(o);
  });

  Object.entries(state.sampling).forEach(([k, v]) => {
    const input = $(k);
    if (input) input.value = v;
  });

  $("chatTitle").textContent = `${state.profile.aiName} chat`;
  $("chatAvatar").src = state.profile.avatarUrl || "";
}

function showApp() {
  showOnly(els.appView);
  fillSettings();
  renderMessages();
}

function renderMessages() {
  const container = $("messages");
  container.innerHTML = "";

  if (state.summary) {
    const sum = document.createElement("div");
    sum.className = "msg system";
    sum.textContent = `[Auto-summary of older context]\n${state.summary}`;
    container.appendChild(sum);
  }

  for (const msg of state.messages) {
    const node = document.createElement("div");
    node.className = `msg ${msg.role}`;
    const name = msg.role === "user" ? state.profile.userName : state.profile.aiName;
    node.textContent = `${name}: ${msg.content}`;
    container.appendChild(node);
  }
  container.scrollTop = container.scrollHeight;
}

function summarizeIfNeeded() {
  const limit = 14;
  if (state.messages.length <= limit) return;
  const old = state.messages.splice(0, state.messages.length - limit);
  const plain = old.map((m) => `${m.role}: ${m.content}`).join(" ");
  const compressed = plain.replace(/\s+/g, " ").slice(0, 1200);
  state.summary = (state.summary ? `${state.summary} ` : "") + compressed;
  state.summary = state.summary.slice(-2400);
}

function parseKeywordMemory() {
  const lines = state.memories.keyword.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx < 1) return null;
      return { key: line.slice(0, idx).trim().toLowerCase(), text: line.slice(idx + 1).trim() };
    })
    .filter(Boolean);
}

function buildContextInjectors(userInput) {
  const hits = [];
  const lowered = userInput.toLowerCase();
  for (const item of parseKeywordMemory()) {
    if (lowered.includes(item.key)) hits.push(`Memory(${item.key}): ${item.text}`);
  }

  const blocks = [];
  if (state.memories.pinned.trim()) blocks.push(`Pinned memory:\n${state.memories.pinned.trim()}`);
  if (hits.length) blocks.push(`Keyword memory:\n${hits.join("\n")}`);
  if (state.summary.trim()) blocks.push(`Conversation summary:\n${state.summary.trim()}`);
  return blocks.join("\n\n");
}

function collectSettings() {
  state.apiKey = $("apiKey").value.trim();
  state.systemPrompt = $("systemPrompt").value;
  state.selectedModel = $("modelSelect").value;
  state.memories.pinned = $("pinnedMemory").value;
  state.memories.keyword = $("keywordMemory").value;

  Object.keys(state.sampling).forEach((k) => {
    const input = $(k);
    const n = Number(input.value);
    state.sampling[k] = Number.isFinite(n) ? n : state.sampling[k];
  });
  saveState();
}

$("addModelBtn").onclick = () => {
  const model = $("newModelInput").value.trim();
  if (!model) return;
  if (!state.models.includes(model)) {
    state.models.push(model);
    state.selectedModel = model;
    saveState();
    fillSettings();
  }
  $("newModelInput").value = "";
};

$("chatForm").onsubmit = async (e) => {
  e.preventDefault();
  collectSettings();
  const text = $("messageInput").value.trim();
  if (!text) return;

  state.messages.push({ role: "user", content: text });
  $("messageInput").value = "";
  summarizeIfNeeded();
  renderMessages();
  saveState();

  if (!state.apiKey) {
    state.messages.push({ role: "assistant", content: "Offline mode active. Add an OpenRouter API key to get model responses." });
    renderMessages();
    saveState();
    return;
  }

  const memoryContext = buildContextInjectors(text);
  const messages = [
    { role: "system", content: state.systemPrompt },
    memoryContext ? { role: "system", content: memoryContext } : null,
    state.summary ? { role: "system", content: `Summary: ${state.summary}` } : null,
    ...state.messages,
  ].filter(Boolean);

  try {
    const payload = {
      model: state.selectedModel,
      messages,
      ...state.sampling,
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "No response.";
    state.messages.push({ role: "assistant", content });
    summarizeIfNeeded();
  } catch (err) {
    state.messages.push({ role: "assistant", content: `Request failed: ${err.message}` });
  }

  renderMessages();
  saveState();
};

$("logoutBtn").onclick = () => {
  state.session = { mode: null, user: null };
  saveState();
  showOnly(els.authView);
};

$("exportJsonBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "companion-chat-export.json");
};

$("importJsonBtn").onclick = () => $("importJsonInput").click();
$("importJsonInput").onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    state = { ...DEFAULT_STATE, ...imported };
    saveState();
    showApp();
  } catch {
    alert("Invalid JSON file.");
  }
};

$("exportMdBtn").onclick = () => {
  const lines = [];
  lines.push(`# ${state.profile.aiName} conversation`);
  lines.push("");
  if (state.summary) {
    lines.push("## Summary");
    lines.push(state.summary);
    lines.push("");
  }
  for (const m of state.messages) {
    const title = m.role === "user" ? state.profile.userName : state.profile.aiName;
    lines.push(`### ${title}`);
    lines.push(m.content);
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  downloadBlob(blob, "companion-chat-export.md");
};

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function bootstrap() {
  if (!state.session.mode) return showOnly(els.authView);
  if (!state.profile.aiName || !state.profile.userName) return showWelcome();
  showApp();
}

bootstrap();
