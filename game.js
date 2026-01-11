// game.js

// Multi-save storage keys
const STORAGE_INDEX_KEY = "textRpgSavesIndex_v1";
const STORAGE_SAVE_PREFIX = "textRpgSave_v1__";

// Starter classes
const CLASSES = {
  wanderer: {
    id: "wanderer",
    name: "Wanderer",
    blurb: "Balanced and stubborn. Good at surviving bad plans.",
    maxHp: 10,
    maxStamina: 6,
    startingItems: { stick: 1, fiber: 1 }
  },
  scrapper: {
    id: "scrapper",
    name: "Scrapper",
    blurb: "A pocket full of junk and a head full of angles.",
    maxHp: 9,
    maxStamina: 7,
    startingItems: { scrap: 2, fiber: 1 }
  },
  scout: {
    id: "scout",
    name: "Scout",
    blurb: "Fast feet, sharp eyes. The road is a puzzle you solve by moving.",
    maxHp: 8,
    maxStamina: 8,
    startingItems: { fiber: 2, stone: 1, stick: 1 }
  }
};

// Game state
const state = {
  time: 0,
  locationId: WORLD.startLocationId,
  playerClassId: null,
  maxHp: 10,
  maxStamina: 6,
  hp: 10,
  stamina: 6,
  hunger: 0,
  inventory: {},
  flags: {},
  log: []
};

// ---------- Helpers ----------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function addItem(id, qty = 1) {
  state.inventory[id] = (state.inventory[id] || 0) + qty;
}

function hasItems(req) {
  for (const [id, qty] of Object.entries(req)) {
    if ((state.inventory[id] || 0) < qty) return false;
  }
  return true;
}

function spendItems(req) {
  for (const [id, qty] of Object.entries(req)) {
    state.inventory[id] -= qty;
    if (state.inventory[id] <= 0) delete state.inventory[id];
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[s]));
}

function logLine(text, tag = "") {
  const entry = { text, tag, t: Date.now() };
  state.log.unshift(entry);
  if (state.log.length > 80) state.log.pop();
  renderLog();
}

// ---------- Intro / Class Pick ----------
function openIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  const hint = document.getElementById("classHint");
  if (hint) hint.textContent = "Pick a class to begin.";
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

  grid.innerHTML = "";
  hint.textContent = "Tip: Pick a class to begin. You can save multiple runs later.";

  for (const cls of Object.values(CLASSES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "classBtn";
    btn.innerHTML = `
      <span class="className">${escapeHtml(cls.name)}</span>
      <span class="classMeta">
        ${escapeHtml(cls.blurb)}<br>
        HP ${cls.maxHp} | Stamina ${cls.maxStamina}<br>
        Start: ${escapeHtml(formatItemsInline(cls.startingItems))}
      </span>
    `;
    btn.addEventListener("click", () => {
      startNewGameWithClass(cls.id);
      closeIntroOverlay();
    });
    grid.appendChild(btn);
  }

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

function closeIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

function formatItemsInline(itemsObj) {
  const parts = [];
  for (const [id, qty] of Object.entries(itemsObj || {})) {
    const name = WORLD.items[id]?.name || id;
    parts.push(`${name} x${qty}`);
  }
  return parts.length ? parts.join(", ") : "Nothing";
}

function applyClass(classId) {
  const cls = CLASSES[classId];
  if (!cls) return;

  state.playerClassId = cls.id;
  state.maxHp = cls.maxHp;
  state.maxStamina = cls.maxStamina;
  state.hp = cls.maxHp;
  state.stamina = cls.maxStamina;

  for (const [id, qty] of Object.entries(cls.startingItems)) {
    addItem(id, qty);
  }
}

// ---------- Core Loop ----------
function tick() {
  state.time += 1;
  state.hunger += 1;

  // Pressure system
  if (state.hunger >= 6) {
    state.hp = Math.max(0, state.hp - 1);
    logLine("Hunger gnaws. You lose 1 HP.", "Status");
    state.hunger = 5;
  }

  // Stamina regen
  state.stamina = Math.min(state.maxStamina, state.stamina + 1);

  renderHud();
}

function currentLoc() {
  return WORLD.locations[state.locationId];
}

function setLocation(id) {
  state.locationId = id;
  tick();
  renderLocation();
}

function describeInventory() {
  const entries = Object.entries(state.inventory);
  if (!entries.length) return "Empty pockets.";
  return entries
    .map(([id, qty]) => `${WORLD.items[id]?.name || id} x${qty}`)
    .join(", ");
}

// ---------- Render ----------
function renderHud() {
  const hud = document.getElementById("hud");
  const clsName = state.playerClassId ? (CLASSES[state.playerClassId]?.name || state.playerClassId) : "None";
  hud.innerHTML = `
    <span class="tag">Class: ${escapeHtml(clsName)}</span>
    <span class="tag">HP: ${state.hp}/${state.maxHp}</span>
    <span class="tag">Stamina: ${state.stamina}/${state.maxStamina}</span>
    <span class="tag">Hunger: ${state.hunger}</span>
    <span class="tag">Time: ${state.time}</span>
    <span class="tag">Inventory: ${escapeHtml(describeInventory())}</span>
  `;
}

function renderLog() {
  const logEl = document.getElementById("log");
  logEl.innerHTML = "";
  for (const e of state.log) {
    const div = document.createElement("div");
    div.className = "logLine";
    div.innerHTML = `${e.tag ? `<span class="tag">${escapeHtml(e.tag)}</span>` : ""}${escapeHtml(e.text)}`;
    logEl.appendChild(div);
  }
}

function makeChoiceButton(label, onClick, className = "choiceBtn") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderLocation() {
  const loc = currentLoc();
  document.getElementById("locTitle").textContent = loc.title;
  document.getElementById("locDesc").textContent = loc.desc;

  const choices = document.getElementById("choices");
  choices.innerHTML = "";

  // Movement
  for (const [label, dest] of Object.entries(loc.exits || {})) {
    choices.appendChild(
      makeChoiceButton(`Go: ${label}`, () => {
        if (state.stamina <= 0) {
          logLine("You are too exhausted to move.", "Block");
          return;
        }
        state.stamina -= 2;
        logLine(`You travel toward: ${label}.`, "Move");
        setLocation(dest);
      })
    );
  }

  // Actions
  (loc.actions || []).forEach(actionId => {
    choices.appendChild(makeChoiceButton(actionLabel(actionId), () => doAction(actionId)));
  });

  // Always available
  choices.appendChild(
    makeChoiceButton("Check inventory", () => {
      logLine(`Inventory: ${describeInventory()}`, "Inventory");
    })
  );
}

function actionLabel(id) {
  const map = {
    search: "Search the area",
    rest: "Rest",
    craft: "Craft",
    scout: "Scout ahead",
    talk: "Talk"
  };
  return map[id] || id;
}

// ---------- Actions ----------
function doAction(actionId) {
  const loc = currentLoc();

  if (actionId === "search") {
    if (!loc.loot || loc.loot.length === 0) {
      logLine("You find nothing but dust and disappointment.", "Search");
      tick();
      return;
    }
    if (state.stamina <= 0) {
      logLine("Your hands feel heavy. You need rest.", "Block");
      return;
    }
    state.stamina -= 1;

    const found = loc.loot[randInt(0, loc.loot.length - 1)];
    addItem(found, 1);
    logLine(`You find: ${WORLD.items[found]?.name || found}.`, "Search");
    tick();
    return;
  }

  if (actionId === "rest") {
    state.hp = Math.min(state.maxHp, state.hp + 2);
    state.stamina = Math.min(state.maxStamina, state.stamina + 3);
    state.hunger = Math.min(5, state.hunger + 1);
    logLine("You rest. Your breath steadies.", "Rest");
    tick();
    renderHud();
    return;
  }

  if (actionId === "craft") {
    const choices = document.getElementById("choices");
    logLine("You consider what you can make...", "Craft");

    WORLD.recipes.forEach(r => {
      const can = hasItems(r.requires);
      const label = can ? `Craft: ${r.name}` : `Craft: ${r.name} (missing items)`;

      const btn = makeChoiceButton(label, () => {
        if (!hasItems(r.requires)) {
          logLine("You lack the materials.", "Craft");
          return;
        }
        spendItems(r.requires);
        for (const [id, qty] of Object.entries(r.gives)) addItem(id, qty);
        logLine(`You craft ${r.name}. ${r.note || ""}`.trim(), "Craft");
        tick();
        renderHud();
      });

      if (!can) btn.style.opacity = "0.6";
      choices.appendChild(btn);
    });

    tick();
    return;
  }

  if (actionId === "scout") {
    if (state.stamina <= 0) {
      logLine("Too tired to scout.", "Block");
      return;
    }
    state.stamina -= 1;
    const roll = randInt(1, 20);
    if (roll >= 12) {
      logLine("You spot safer footing and avoid a nasty fall.", "Scout");
    } else {
      state.hp = Math.max(0, state.hp - 1);
      logLine("Loose gravel bites back. You lose 1 HP.", "Scout");
    }
    tick();
    renderHud();
    return;
  }

  if (actionId === "talk") {
    logLine("A trader tells you: 'Nothing is free here. Not even silence.'", "Talk");
    tick();
    return;
  }

  logLine(`That action (${actionId}) is not implemented yet.`, "Debug");
}

// ---------- Multi-save system ----------
function getSavesIndex() {
  const raw = localStorage.getItem(STORAGE_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function setSavesIndex(index) {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function summarizeStateForIndex(label, id, createdAt, updatedAt) {
  const loc = WORLD.locations[state.locationId];
  const clsName = state.playerClassId ? (CLASSES[state.playerClassId]?.name || state.playerClassId) : "None";
  return {
    id,
    label: label || "Unnamed run",
    createdAt,
    updatedAt,
    locationId: state.locationId,
    locationTitle: loc?.title || state.locationId,
    className: clsName,
    hp: state.hp,
    stamina: state.stamina,
    hunger: state.hunger,
    time: state.time
  };
}

function saveNew(label) {
  const index = getSavesIndex();
  const id = makeId();
  const createdAt = nowIso();
  const updatedAt = createdAt;

  localStorage.setItem(STORAGE_SAVE_PREFIX + id, JSON.stringify(state));
  index.unshift(summarizeStateForIndex(label, id, createdAt, updatedAt));
  setSavesIndex(index);

  logLine(`Saved new run: "${label || "Unnamed run"}".`, "System");
  refreshSaveUI(id);
}

function overwriteSave(id, labelMaybe) {
  if (!id) {
    logLine("No save selected to overwrite.", "System");
    return;
  }
  const index = getSavesIndex();
  const entry = index.find(s => s.id === id);
  if (!entry) {
    logLine("Selected save not found.", "System");
    return;
  }

  localStorage.setItem(STORAGE_SAVE_PREFIX + id, JSON.stringify(state));

  const updatedAt = nowIso();
  const label = (labelMaybe && labelMaybe.trim()) ? labelMaybe.trim() : entry.label;
  const updated = summarizeStateForIndex(label, id, entry.createdAt, updatedAt);

  const newIndex = index.map(s => (s.id === id ? updated : s));
  setSavesIndex(newIndex);

  logLine(`Quick saved: "${updated.label}".`, "System");
  refreshSaveUI(id);
}

function loadSave(id) {
  if (!id) {
    logLine("No save selected to load.", "System");
    return;
  }
  const raw = localStorage.getItem(STORAGE_SAVE_PREFIX + id);
  if (!raw) {
    logLine("That save file is missing.", "System");
    return;
  }

  let loaded;
  try { loaded = JSON.parse(raw); } catch {
    logLine("Save data was corrupted.", "System");
    return;
  }

  Object.assign(state, loaded);
  logLine("Loaded save.", "System");
  renderAll();
  refreshSaveUI(id);
}

function deleteSave(id) {
  if (!id) {
    logLine("No save selected to delete.", "System");
    return;
  }
  localStorage.removeItem(STORAGE_SAVE_PREFIX + id);

  const index = getSavesIndex().filter(s => s.id !== id);
  setSavesIndex(index);

  logLine("Deleted save.", "System");
  refreshSaveUI(index[0]?.id || null);
}

function formatSaveOption(s) {
  const dt = new Date(s.updatedAt);
  const when = isNaN(dt.getTime()) ? "unknown date" : dt.toLocaleString();
  const cls = s.className ? ` | ${s.className}` : "";
  return `${s.label}${cls} | ${when} | ${s.locationTitle} | t:${s.time} HP:${s.hp}`;
}

function refreshSaveUI(selectId = null) {
  const select = document.getElementById("saveSelect");
  const hint = document.getElementById("saveHint");
  if (!select) return;

  const index = getSavesIndex();
  select.innerHTML = "";

  if (index.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No saves yet";
    select.appendChild(opt);
    if (hint) hint.textContent = "Tip: Type a name then tap “Save New”.";
    return;
  }

  for (const s of index) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = formatSaveOption(s);
    select.appendChild(opt);
  }

  const chosen = selectId || select.value || index[0].id;
  select.value = chosen;

  const selected = index.find(s => s.id === chosen);
  if (hint) {
    if (selected) {
      const created = new Date(selected.createdAt);
      const cStr = isNaN(created.getTime()) ? "unknown" : created.toLocaleString();
      hint.textContent = `Selected: "${selected.label}" (${selected.className || "None"}) (created ${cStr}).`;
    } else {
      hint.textContent = "";
    }
  }
}

// ---------- New Game Flow ----------
function startNewGameWithClass(classId) {
  // Reset
  state.time = 0;
  state.locationId = WORLD.startLocationId;
  state.hunger = 0;
  state.inventory = {};
  state.flags = {};
  state.log = [];

  // Apply class
  applyClass(classId);

  // Intro sequence lines
  logLine("A cold wind worries the edges of your thoughts.", "Intro");
  logLine("Somewhere behind you, a past you refuse to carry.", "Intro");
  logLine(`You are a ${CLASSES[classId].name}.`, "Class");
  logLine(`Start gear: ${formatItemsInline(CLASSES[classId].startingItems)}.`, "Class");
  logLine("The road waits. It does not blink.", "Intro");

  renderAll();
  refreshSaveUI(document.getElementById("saveSelect")?.value || null);
}

function renderAll() {
  renderHud();
  renderLog();
  renderLocation();
}

function wireUi() {
  document.getElementById("pick_wanderer").addEventListener("click", () => {
  startNewGameWithClass("wanderer");
  closeIntroOverlay();
});

document.getElementById("pick_scrapper").addEventListener("click", () => {
  startNewGameWithClass("scrapper");
  closeIntroOverlay();
});

document.getElementById("pick_scout").addEventListener("click", () => {
  startNewGameWithClass("scout");
  closeIntroOverlay();
});

  // New game opens the intro/class menu
  document.getElementById("btnNew").addEventListener("click", openIntroOverlay);
  document.getElementById("btnIntroCancel").addEventListener("click", closeIntroOverlay);

  const saveName = document.getElementById("saveName");
  const saveSelect = document.getElementById("saveSelect");

  document.getElementById("btnSaveNew").addEventListener("click", () => {
    const label = (saveName.value || "").trim();
    saveNew(label);
    saveName.value = "";
  });

  document.getElementById("btnQuickSave").addEventListener("click", () => {
    overwriteSave(saveSelect.value, "");
  });

  document.getElementById("btnLoadSelected").addEventListener("click", () => {
    loadSave(saveSelect.value);
  });

  document.getElementById("btnDeleteSelected").addEventListener("click", () => {
    const id = saveSelect.value;
    const index = getSavesIndex();
    const entry = index.find(s => s.id === id);
    const name = entry?.label || "this save";
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteSave(id);
    }
  });

  saveSelect.addEventListener("change", () => refreshSaveUI(saveSelect.value));
}

// ---------- Boot ----------
(function boot() {
  wireUi();
  refreshSaveUI();
  logLine("Press New Game to begin.", "System");
  renderAll();
})();
