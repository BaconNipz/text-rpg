// game.js

const STORAGE_KEY = "textRpgSave_v1";

const state = {
  time: 0,
  locationId: WORLD.startLocationId,
  hp: 10,
  stamina: 6,
  hunger: 0,
  inventory: {},      // { itemId: count }
  flags: {},          // { someFlag: true }
  log: []
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

function logLine(text, tag = "") {
  const entry = { text, tag, t: Date.now() };
  state.log.unshift(entry);
  if (state.log.length > 60) state.log.pop();
  renderLog();
}

function tick() {
  state.time += 1;
  state.hunger += 1;

  // Tiny pressure system
  if (state.hunger >= 6) {
    state.hp = Math.max(0, state.hp - 1);
    logLine("Hunger gnaws. You lose 1 HP.", "Status");
    state.hunger = 5; // cap it so it does not spiral instantly
  }

  // Stamina recovers slowly if you are not sprinting around
  state.stamina = Math.min(6, state.stamina + 1);

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

function renderHud() {
  const hud = document.getElementById("hud");
  hud.innerHTML = `
    <span class="tag">HP: ${state.hp}</span>
    <span class="tag">Stamina: ${state.stamina}</span>
    <span class="tag">Hunger: ${state.hunger}</span>
    <span class="tag">Time: ${state.time}</span>
    <span class="tag">Inventory: ${describeInventory()}</span>
  `;
}

function renderLog() {
  const logEl = document.getElementById("log");
  logEl.innerHTML = "";
  for (const e of state.log) {
    const div = document.createElement("div");
    div.className = "logLine";
    div.innerHTML = `${e.tag ? `<span class="tag">${e.tag}</span>` : ""}${escapeHtml(e.text)}`;
    logEl.appendChild(div);
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[s]));
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

  // Movement buttons
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

  // Action buttons
  (loc.actions || []).forEach(actionId => {
    const label = actionLabel(actionId);
    choices.appendChild(
      makeChoiceButton(label, () => doAction(actionId))
    );
  });

  // Always available
  choices.appendChild(
    makeChoiceButton("Check inventory", () => {
      logLine(`Inventory: ${describeInventory()}`, "Inventory");
    }, "choiceBtn")
  );
}

function actionLabel(id) {
  const map = {
    search: "Search the area",
    rest: "Rest",
    craft: "Craft",
    scout: "Scout ahead",
    move: "Look for a way through",
    talk: "Talk",
    trade: "Trade"
  };
  return map[id] || id;
}

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
    state.hp = Math.min(10, state.hp + 2);
    state.stamina = Math.min(6, state.stamina + 3);
    state.hunger = Math.min(5, state.hunger + 1);
    logLine("You rest. Your breath steadies.", "Rest");
    tick();
    renderHud();
    return;
  }

  if (actionId === "craft") {
    // Show craft options as new buttons in the choices area (simple modal-less approach)
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

  if (actionId === "trade") {
    logLine("Trading is not implemented yet. Your wallet laughs quietly.", "Trade");
    tick();
    return;
  }

  logLine(`That action (${actionId}) is not implemented yet.`, "Debug");
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  logLine("Game saved.", "System");
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    logLine("No save found.", "System");
    return;
  }
  const loaded = JSON.parse(raw);
  Object.assign(state, loaded);
  logLine("Game loaded.", "System");
  renderAll();
}

function newGame() {
  // Reset to defaults
  state.time = 0;
  state.locationId = WORLD.startLocationId;
  state.hp = 10;
  state.stamina = 6;
  state.hunger = 0;
  state.inventory = {};
  state.flags = {};
  state.log = [];
  logLine("New game started.", "System");
  renderAll();
}

function renderAll() {
  renderHud();
  renderLog();
  renderLocation();
}

function wireUi() {
  document.getElementById("btnSave").addEventListener("click", saveGame);
  document.getElementById("btnLoad").addEventListener("click", loadGame);
  document.getElementById("btnNew").addEventListener("click", newGame);
}

(function boot() {
  wireUi();
  logLine("You wake with a mouth full of ash and a plan you do not remember making.", "Start");
  renderAll();
})();
