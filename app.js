const STORAGE_KEY = "companion-chat-state-v2";

const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const clone = (obj) => (globalThis.structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));
const STORAGE_KEY = "companion-chat-state-v1";

const DEFAULT_STATE = {
  session: { mode: null, user: null },
  profile: { userName: "You", aiName: "Companion", avatarUrl: "" },
  apiKey: "",
  systemPrompt: "You are a warm, emotionally intelligent AI companion.",
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
  memories: { pinned: "", keyword: "" },
  accounts: {},
  chats: [],
  activeChatId: null,
};

const $ = (id) => document.getElementById(id);
const state = loadState();
ensureChatExists();

function loadState() {
  const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY));
  const legacy = safeJsonParse(localStorage.getItem("companion-chat-state-v1"));
  const merged = deepMerge(clone(DEFAULT_STATE), stored || legacy || {});
  const merged = deepMerge(structuredClone(DEFAULT_STATE), stored || legacy || {});
  normalizeState(merged);
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function deepMerge(base, incoming) {
  if (!incoming || typeof incoming !== "object") return base;
  for (const [k, v] of Object.entries(incoming)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
      base[k] = deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

function normalizeState(target) {
  if (!Array.isArray(target.models) || !target.models.length) {
    target.models = [...DEFAULT_STATE.models];
  }
  if (!target.selectedModel || !target.models.includes(target.selectedModel)) {
    target.selectedModel = target.models[0];
  }

  if (!Array.isArray(target.chats)) {
    target.chats = [];
  }

  // Legacy conversion: single messages + summary to one chat.
  if (!target.chats.length && Array.isArray(target.messages)) {
    target.chats = [
      {
        id: uid(),
        id: crypto.randomUUID(),
        title: "Imported Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        summary: typeof target.summary === "string" ? target.summary : "",
        messages: target.messages,
      },
    ];
  }

  target.chats = target.chats.map((chat) => ({
    id: chat.id || uid(),
    id: chat.id || crypto.randomUUID(),
    title: chat.title || "New chat",
    createdAt: Number(chat.createdAt || Date.now()),
    updatedAt: Number(chat.updatedAt || Date.now()),
    summary: typeof chat.summary === "string" ? chat.summary : "",
    messages: Array.isArray(chat.messages) ? chat.messages.filter((m) => m?.role && typeof m.content === "string") : [],
  }));
}

function ensureChatExists() {
  if (!state.chats.length) {
    state.chats.push(createEmptyChat("New chat"));
  }
  if (!state.activeChatId || !state.chats.some((c) => c.id === state.activeChatId)) {
    state.activeChatId = state.chats[0].id;
  }
  saveState();
}

function createEmptyChat(title = "New chat") {
  return {
    id: uid(),
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    summary: "",
    messages: [],
  };
}

function activeChat() {
  return state.chats.find((c) => c.id === state.activeChatId);
}

function showOnly(id) {
  ["authView", "welcomeView", "appView"].forEach((viewId) => {
    const el = $(viewId);
    if (el) el.hidden = true;
  });
  const target = $(id);
  if (target) target.hidden = false;
  ["authView", "welcomeView", "appView"].forEach((viewId) => $(viewId).classList.add("hidden"));
  $(id).classList.remove("hidden");
}

function setAuthMessage(msg) {
  $("authMessage").textContent = msg;
}

function setSettingsMessage(msg) {
  $("settingsMessage").textContent = msg;
}

function setAuthTab(isLogin) {
  $("tabLogin").classList.toggle("primary", isLogin);
  $("tabRegister").classList.toggle("primary", !isLogin);
  $("loginPanel").classList.toggle("active", isLogin);
  $("registerPanel").classList.toggle("active", !isLogin);
}

function showWelcome() {
  showOnly("welcomeView");
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

function showApp() {
  showOnly("appView");
  renderConversations();
  fillSettings();
  renderMessages();
  updateHeader();
}

function updateHeader() {
  $("chatAvatar").src = state.profile.avatarUrl || "";
  $("chatTitle").textContent = `${state.profile.aiName}`;
  const sessionText = state.session.mode === "offline" ? "Offline session" : `Logged in as ${state.session.user}`;
  $("sessionLabel").textContent = sessionText;
}

function renderConversations() {
  const root = $("conversationList");
  root.innerHTML = "";

  [...state.chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((chat) => {
      const row = document.createElement("button");
      row.className = `conversation-item ${chat.id === state.activeChatId ? "active" : ""}`;
      row.type = "button";

      const title = document.createElement("span");
      title.className = "conversation-title";
      title.textContent = chat.title || "New chat";

      const del = document.createElement("span");
      del.textContent = "✕";
      del.title = "Delete chat";
      del.onclick = (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      };

      row.append(title, del);
      row.onclick = () => {
        state.activeChatId = chat.id;
        saveState();
        renderConversations();
        renderMessages();
      };
      root.appendChild(row);
    });
}

function deleteChat(chatId) {
  if (state.chats.length === 1) return;
  state.chats = state.chats.filter((c) => c.id !== chatId);
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats[0].id;
  }
  saveState();
  renderConversations();
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
  const chat = activeChat();
  const list = $("messages");
  list.innerHTML = "";

  if (chat.summary) {
    list.appendChild(createBubble("system", "Context summary", chat.summary));
  }

  if (!chat.messages.length) {
    list.appendChild(createBubble("system", "Tip", "Start chatting. If API key is empty, offline local mode still works."));
  }

  chat.messages.forEach((msg) => {
    const name = msg.role === "user" ? state.profile.userName : state.profile.aiName;
    list.appendChild(createBubble(msg.role, name, msg.content));
  });

  list.scrollTop = list.scrollHeight;
}

function createBubble(role, name, text) {
  const wrap = document.createElement("article");
  wrap.className = `bubble ${role}`;
  const n = document.createElement("div");
  n.className = "msg-name";
  n.textContent = name;
  const t = document.createElement("div");
  t.textContent = text;
  wrap.append(n, t);
  return wrap;
}

function summarizeIfNeeded(chat) {
  const maxKept = 18;
  if (chat.messages.length <= maxKept) return;
  const old = chat.messages.splice(0, chat.messages.length - maxKept);
  const packed = old.map((m) => `${m.role}: ${m.content}`).join(" ").replace(/\s+/g, " ").slice(0, 1800);
  chat.summary = `${chat.summary} ${packed}`.trim().slice(-3500);
}

function parseKeywordMemory() {
  return state.memories.keyword
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      return idx > 0 ? { key: line.slice(0, idx).trim().toLowerCase(), text: line.slice(idx + 1).trim() } : null;
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

function buildMemoryContext(userInput, chat) {
  const blocks = [];
  if (state.memories.pinned.trim()) {
    blocks.push(`Pinned memory:\n${state.memories.pinned.trim()}`);
  }

  const hits = parseKeywordMemory().filter((x) => userInput.toLowerCase().includes(x.key));
  if (hits.length) {
    blocks.push(`Keyword memory:\n${hits.map((x) => `${x.key}: ${x.text}`).join("\n")}`);
  }

  if (chat.summary) blocks.push(`Conversation summary:\n${chat.summary}`);
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

  Object.keys(state.sampling).forEach((key) => {
    const val = Number($(key).value);
    if (Number.isFinite(val)) state.sampling[key] = val;
  });

  saveState();
}

function fillSettings() {
  $("apiKey").value = state.apiKey;
  $("systemPrompt").value = state.systemPrompt;
  $("pinnedMemory").value = state.memories.pinned;
  $("keywordMemory").value = state.memories.keyword;

  const sel = $("modelSelect");
  sel.innerHTML = "";
  state.models.forEach((model) => {
    const o = document.createElement("option");
    o.value = model;
    o.textContent = model;
    if (model === state.selectedModel) o.selected = true;
    sel.appendChild(o);
  });

  Object.entries(state.sampling).forEach(([k, v]) => {
    if ($(k)) $(k).value = v;
  });
}

async function sendToModel(chat, userInput) {
  if (!state.apiKey) {
    return "Offline mode: saved locally. Add an OpenRouter API key for live model replies.";
  }

  const memory = buildMemoryContext(userInput, chat);
  const messages = [
    { role: "system", content: state.systemPrompt },
    ...(memory ? [{ role: "system", content: memory }] : []),
    ...chat.messages,
  ];

  const payload = { model: state.selectedModel, messages, ...state.sampling };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.apiKey}`,
      "HTTP-Referer": location.origin,
      "X-Title": "Companion Chat",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content : "No response text received.";
}

function makeChatTitle(chat) {
  const firstUser = chat.messages.find((m) => m.role === "user")?.content?.trim();
  if (!firstUser) return "New chat";
  return firstUser.slice(0, 42);
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportStateJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "companion-chat-export.json");
}

function exportActiveMarkdown() {
  const chat = activeChat();
  const lines = [`# ${chat.title}`, ""];
  if (chat.summary) {
    lines.push("## Summary", chat.summary, "");
  }
  chat.messages.forEach((m) => {
    lines.push(`## ${m.role === "user" ? state.profile.userName : state.profile.aiName}`);
    lines.push(m.content, "");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  downloadBlob(blob, `${chat.title.replace(/[^a-z0-9-_ ]/gi, "_") || "chat"}.md`);
}

function importJsonText(text) {
  const data = safeJsonParse(text);
  if (!data) throw new Error("Invalid JSON");

  // Accept full export, legacy export, or raw conversation arrays.
  if (Array.isArray(data)) {
    state.chats = [
      {
        ...createEmptyChat("Imported Chat"),
        messages: data.filter((x) => x?.role && typeof x.content === "string"),
      },
    ];
  } else if (Array.isArray(data.messages)) {
    state.chats = [
      {
        ...createEmptyChat("Imported Chat"),
        summary: typeof data.summary === "string" ? data.summary : "",
        messages: data.messages.filter((x) => x?.role && typeof x.content === "string"),
      },
    ];
    if (data.profile) state.profile = deepMerge(state.profile, data.profile);
  } else {
    const merged = deepMerge(clone(DEFAULT_STATE), data);
    const merged = deepMerge(structuredClone(DEFAULT_STATE), data);
    normalizeState(merged);

    Object.assign(state, merged);
  }

  ensureChatExists();
  state.activeChatId = state.chats[0].id;
  saveState();
  showApp();
}

function wireEvents() {
  $("tabLogin").onclick = () => setAuthTab(true);
  $("tabRegister").onclick = () => setAuthTab(false);
  $("avatarUrl").oninput = refreshAvatarPreview;

  $("registerBtn").onclick = () => {
    const username = $("registerUsername").value.trim();
    const password = $("registerPassword").value;
    if (!username || !password) return setAuthMessage("Username and password are required.");
    if (state.accounts[username]) return setAuthMessage("That username already exists.");
    state.accounts[username] = password;
    state.session = { mode: "account", user: username };
    saveState();
    showWelcome();
  };

  $("loginBtn").onclick = () => {
    const username = $("loginUsername").value.trim();
    const password = $("loginPassword").value;
    if (state.accounts[username] !== password) return setAuthMessage("Invalid login.");
    state.session = { mode: "account", user: username };
    saveState();
    showWelcome();
  };

  $("offlineBtn").onclick = () => {
    state.session = { mode: "offline", user: null };
    saveState();
    showWelcome();
  };

  $("startChatBtn").onclick = () => {
    state.profile.userName = $("userName").value.trim() || "You";
    state.profile.aiName = $("aiName").value.trim() || "Companion";
    state.profile.avatarUrl = $("avatarUrl").value.trim();
    saveState();
    showApp();
  };

  const toggleSettings = () => {
    const drawer = $("settingsDrawer");
    drawer.hidden = !drawer.hidden;
  };
  const toggleSettings = () => $("settingsDrawer").classList.toggle("hidden");
  $("openSettingsBtn").onclick = toggleSettings;
  $("openSettingsBtnTop").onclick = toggleSettings;

  $("saveSettingsBtn").onclick = () => {
    collectSettings();
    updateHeader();
    setSettingsMessage("Saved.");
    setTimeout(() => setSettingsMessage(""), 1200);
  };

  $("addModelBtn").onclick = () => {
    const model = $("newModelInput").value.trim();
    if (!model) return;
    if (!state.models.includes(model)) state.models.push(model);
    state.selectedModel = model;
    $("newModelInput").value = "";
    saveState();
    fillSettings();
  };

  $("newChatBtn").onclick = () => {
    const chat = createEmptyChat("New chat");
    state.chats.unshift(chat);
    state.activeChatId = chat.id;
    saveState();
    renderConversations();
    renderMessages();
  };

  $("chatForm").onsubmit = async (e) => {
    e.preventDefault();
    collectSettings();
    const input = $("messageInput").value.trim();
    if (!input) return;

    const chat = activeChat();
    chat.messages.push({ role: "user", content: input });
    chat.updatedAt = Date.now();
    chat.title = makeChatTitle(chat);
    summarizeIfNeeded(chat);
    $("messageInput").value = "";
    renderConversations();
    renderMessages();
    saveState();

    try {
      const output = await sendToModel(chat, input);
      chat.messages.push({ role: "assistant", content: output });
    } catch (err) {
      chat.messages.push({ role: "assistant", content: `Request failed: ${err.message}` });
    }

    chat.updatedAt = Date.now();
    summarizeIfNeeded(chat);
    saveState();
    renderConversations();
    renderMessages();
  };

  $("logoutBtn").onclick = () => {
    state.session = { mode: null, user: null };
    saveState();
    showOnly("authView");
  };

  $("exportJsonBtn").onclick = exportStateJson;
  $("exportMdBtn").onclick = exportActiveMarkdown;

  $("importJsonBtn").onclick = () => $("importJsonInput").click();
  $("importJsonInput").onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importJsonText(text);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      event.target.value = "";
    }
  };
}

function bootstrap() {
  wireEvents();
  if (!state.session.mode) {
    showOnly("authView");
    return;
  }

  if (!state.profile.userName || !state.profile.aiName) {
    showWelcome();
    return;
  }

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
