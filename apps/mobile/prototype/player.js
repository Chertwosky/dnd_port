import { buildCharacterSheetHtml, buildPlayerSheetTabHtml, parseFeatureBlocksFromCharacter, renderFeatureBlocksHtml, countParsedFeatures, skillLabelRu, bindSheetRolls } from "/character-sheet.js?v=18";
import { renderInitiativeBar } from "/initiative-bar.js?v=3";
import { openNpcSheetModal } from "/npc-sheet.js?v=3";

const SESSION_KEY = "dnd_player_session";

/** Пороги опыта 5e SRD (индекс = уровень − 1) */
const XP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000
];

function xpProgressLocal(experience, level) {
  const lv = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  const xp = Math.max(0, Number(experience) || 0);
  const currentFloor = XP_TABLE[lv - 1] ?? 0;
  const nextLevel = Math.min(20, lv + 1);
  const nextFloor = lv >= 20 ? XP_TABLE[19] : XP_TABLE[nextLevel - 1] ?? 0;
  const span = Math.max(1, nextFloor - currentFloor);
  const into = Math.max(0, Math.min(span, xp - currentFloor));
  const needed = lv >= 20 ? 0 : Math.max(0, nextFloor - xp);
  const percent = lv >= 20 ? 100 : Math.round((into / span) * 100);
  return {
    experience: xp,
    level: lv,
    nextLevel: lv >= 20 ? 20 : nextLevel,
    currentFloor,
    nextFloor,
    into,
    span,
    needed,
    percent,
    canLevelUp: lv < 20 && xp >= nextFloor,
    proficiencyBonus: Math.ceil(lv / 4) + 1
  };
}

const ui = {
  screenLogin: document.getElementById("screenLogin"),
  screenLobbyPick: document.getElementById("screenLobbyPick"),
  screenApp: document.getElementById("screenApp"),
  playerName: document.getElementById("playerName"),
  lobbyTitle: document.getElementById("lobbyTitle"),
  playerLoginBtn: document.getElementById("playerLoginBtn"),
  showLobbyListBtn: document.getElementById("showLobbyListBtn"),
  loginError: document.getElementById("loginError"),
  lobbyList: document.getElementById("lobbyList"),
  refreshLobbiesBtn: document.getElementById("refreshLobbiesBtn"),
  lobbyPickError: document.getElementById("lobbyPickError"),
  sessionInfo: document.getElementById("sessionInfo"),
  screenLobbyBtn: document.getElementById("screenLobbyBtn"),
  screenBindBtn: document.getElementById("screenBindBtn"),
  screenCombatBtn: document.getElementById("screenCombatBtn"),
  screenLobby: document.getElementById("screenLobby"),
  screenBind: document.getElementById("screenBind"),
  screenCombat: document.getElementById("screenCombat"),
  goBindBtn: document.getElementById("goBindBtn"),
  lobbyState: document.getElementById("lobbyState"),
  membersList: document.getElementById("membersList"),
  characterSelect: document.getElementById("characterSelect"),
  bindSelectedBtn: document.getElementById("bindSelectedBtn"),
  refreshCharactersBtn: document.getElementById("refreshCharactersBtn"),
  characterRawJson: document.getElementById("characterRawJson"),
  characterFileInput: document.getElementById("characterFileInput"),
  characterFileName: document.getElementById("characterFileName"),
  importCharacterBtn: document.getElementById("importCharacterBtn"),
  bindStatus: document.getElementById("bindStatus"),
  bindSetup: document.getElementById("bindSetup"),
  playerSheetWrap: document.getElementById("playerSheetWrap"),
  playerSheet: document.getElementById("playerSheet"),
  changeCharacterBtn: document.getElementById("changeCharacterBtn"),
  downloadCharacterBtn: document.getElementById("downloadCharacterBtn"),
  combatHp: document.getElementById("combatHp"),
  combatAc: document.getElementById("combatAc"),
  combatAbilities: document.getElementById("combatAbilities"),
  combatRole: document.getElementById("combatRole"),
  playerMapGrid: document.getElementById("playerMapGrid"),
  playerMapWrap: document.getElementById("playerMapWrap"),
  playerMapTabs: document.getElementById("playerMapTabs"),
  mapInspectOpenBtn: document.getElementById("mapInspectOpenBtn"),
  mapInspectOverlay: document.getElementById("mapInspectOverlay"),
  mapInspectCloseBtn: document.getElementById("mapInspectCloseBtn"),
  mapInspectTitle: document.getElementById("mapInspectTitle"),
  mapInspectViewport: document.getElementById("mapInspectViewport"),
  mapInspectStage: document.getElementById("mapInspectStage"),
  mapInspectGrid: document.getElementById("mapInspectGrid"),
  mapInspectZoomOut: document.getElementById("mapInspectZoomOut"),
  mapInspectZoomFit: document.getElementById("mapInspectZoomFit"),
  mapInspectZoomIn: document.getElementById("mapInspectZoomIn"),
  mapInspectZoomLabel: document.getElementById("mapInspectZoomLabel"),
  playerInitActions: document.getElementById("playerInitActions"),
  rollInitiativeBtn: document.getElementById("rollInitiativeBtn"),
  initiativeRollResult: document.getElementById("initiativeRollResult"),
  playerInitiativeBar: document.getElementById("playerInitiativeBar"),
  npcSheetModal: document.getElementById("npcSheetModal"),
  npcSheetModalBody: document.getElementById("npcSheetModalBody"),
  tabBody: document.getElementById("tabBody"),
  playerCombatLog: document.getElementById("playerCombatLog"),
  rollToast: document.getElementById("rollToast"),
  levelUpModal: document.getElementById("levelUpModal"),
  levelUpModalBody: document.getElementById("levelUpModalBody"),
  levelUpModalClose: document.getElementById("levelUpModalClose")
};

const state = {
  sessionToken: localStorage.getItem(SESSION_KEY),
  playerName: "",
  lobby: null,
  role: "spectator",
  character: null,
  characters: [],
  mapVision: null,
  activeTab: "combat",
  inventory: [],
  privateChat: { thread: null, dice: [4, 6, 8, 10, 12, 20] },
  chatSeenId: "",
  mapFitCols: 0,
  mapFitRows: 0
};

const mapInspect = {
  open: false,
  scale: 1,
  panX: 0,
  panY: 0,
  baseCell: 16,
  minScale: 0.4,
  maxScale: 5,
  lastMapId: null,
  pointers: new Map(),
  pinchStartDist: 0,
  pinchStartScale: 1,
  panStartX: 0,
  panStartY: 0,
  panOriginX: 0,
  panOriginY: 0
};

function getToken() {
  return state.sessionToken;
}

async function call(path, init = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Session-Token": getToken() ?? "",
    ...(init.headers || {})
  };
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).error ?? msg;
    } catch {
      /* keep */
    }
    throw new Error(msg || `${res.status}`);
  }
  return res.json();
}

function showLogin() {
  ui.screenLogin.classList.remove("hidden");
  ui.screenLobbyPick.classList.add("hidden");
  ui.screenApp.classList.add("hidden");
}

function showLobbyPick() {
  ui.screenLogin.classList.add("hidden");
  ui.screenLobbyPick.classList.remove("hidden");
  ui.screenApp.classList.add("hidden");
}

function showApp() {
  ui.screenLogin.classList.add("hidden");
  ui.screenLobbyPick.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
}

function showScreen(name) {
  ui.screenLobby.classList.toggle("active", name === "lobby");
  ui.screenBind.classList.toggle("active", name === "bind");
  ui.screenCombat.classList.toggle("active", name === "combat");
  ui.screenLobbyBtn?.classList.toggle("primary", name === "lobby");
  ui.screenBindBtn?.classList.toggle("primary", name === "bind");
  ui.screenCombatBtn?.classList.toggle("primary", name === "combat");
  if (name !== "combat") closeMapInspect();
  if (name === "bind") {
    renderCharacterTab();
  }
  if (name === "combat") {
    requestAnimationFrame(() => {
      const wrap = ui.playerMapWrap || ui.playerMapGrid?.closest(".player-map");
      if (wrap && state.mapFitCols && state.mapFitRows) {
        applyMapFit(wrap, ui.playerMapGrid, state.mapFitCols, state.mapFitRows);
      } else {
        renderMap();
      }
    });
  }
}

function showBindSetup(force = false) {
  const hasChar = Boolean(state.character) && !force;
  ui.bindSetup?.classList.toggle("hidden", hasChar);
  ui.playerSheetWrap?.classList.toggle("hidden", !hasChar);
}

function downloadCharacterJson(character) {
  if (!character) return;
  const name = String(character.name || "character")
    .replace(/[^\wа-яёА-ЯЁ\- ]+/gi, "")
    .trim()
    .replace(/\s+/g, "-") || "character";
  const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderCharacterTab() {
  if (!state.character?.id) {
    showBindSetup(true);
    await loadCharacters();
    return;
  }
  showBindSetup(false);
  try {
    const fresh = await call(`/characters/${state.character.id}`);
    state.character = fresh;
    if (ui.playerSheet) {
      ui.playerSheet.innerHTML = buildCharacterSheetHtml(fresh, {
        readonly: true,
        footerHtml: ""
      });
      const xp = ui.playerSheet.querySelector("#heroXpSection");
      if (xp) {
        const p = fresh.progress || xpProgressLocal(fresh.experience, fresh.level);
        xp.innerHTML = `
          <div class="hs-title"><span class="hs-ico">⭐</span><span>Опыт</span></div>
          <div class="muted">Ур. ${p.level} · ${p.experience} XP${p.needed ? ` · до след. ${p.needed}` : ""}</div>
          <div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:${p.percent || 0}%"></div></div>
        `;
      }
      ui.playerSheet.querySelector("[data-download-character]")?.addEventListener("click", () => {
        downloadCharacterJson(state.character);
      });
      wirePlayerSheetRolls(ui.playerSheet);
    }
  } catch (error) {
    if (ui.playerSheet) {
      ui.playerSheet.innerHTML = `<div class="error-text">${String(error.message || error)}</div>`;
    }
  }
}

async function enterCombatWithCharacter(character) {
  state.character = character;
  state.role = "player";
  renderRole();
  renderCombatHeader();
  await loadInventory();
  renderTab();
  showScreen("combat");
}

async function playerLogin() {
  ui.loginError.textContent = "";
  const name = ui.playerName.value.trim();
  const lobbyTitle = String(ui.lobbyTitle?.value || "").trim();
  if (!name) {
    ui.loginError.textContent = "Введите имя";
    return;
  }
  try {
    const data = await call("/auth/player/login", {
      method: "POST",
      body: JSON.stringify({ playerName: name })
    });
    state.sessionToken = data.token;
    state.playerName = data.playerName;
    localStorage.setItem(SESSION_KEY, data.token);

    if (lobbyTitle) {
      const joined = await call("/lobbies/join-by-title", {
        method: "POST",
        body: JSON.stringify({ lobbyTitle })
      });
      state.lobby = joined.lobby;
      state.role = "spectator";
      ui.sessionInfo.textContent = `Лобби: «${joined.lobby.title}» · ${state.playerName}`;
      showApp();
      showScreen("lobby");
      renderRole();
      await loadCharacters();
      await refreshMap();
      renderCombatHeader();
      renderTab();
      setInterval(refreshMap, 2500);
      return;
    }

    showLobbyPick();
    await loadOpenLobbies();
  } catch (error) {
    ui.loginError.textContent = String(error.message || error);
  }
}

async function loadOpenLobbies() {
  ui.lobbyPickError.textContent = "";
  try {
    const lobbies = await call("/lobbies/open");
    ui.lobbyList.innerHTML = "";
    if (lobbies.length === 0) {
      ui.lobbyList.innerHTML = '<div class="card muted">Нет открытых лобби. Попросите мастера создать сессию.</div>';
      return;
    }
    for (const lobby of lobbies) {
      const card = document.createElement("div");
      card.className = "lobby-card";
      card.innerHTML = `
        <strong>${lobby.title}</strong>
        <span class="pill">Мастер: ${lobby.masterName}</span>
        <span class="pill">Игроков: ${lobby.playerCount}</span>
      `;
      card.addEventListener("click", () => joinLobby(lobby.id));
      ui.lobbyList.appendChild(card);
    }
  } catch (error) {
    ui.lobbyPickError.textContent = String(error.message || error);
  }
}

async function joinLobby(lobbyId) {
  ui.lobbyPickError.textContent = "";
  try {
    const data = await call(`/lobbies/${lobbyId}/join`, { method: "POST", body: "{}" });
    state.lobby = data.lobby;
    state.role = "spectator";
    ui.sessionInfo.textContent = `Лобби: «${data.lobby.title}» · ${state.playerName}`;
    showApp();
    showScreen("lobby");
    renderRole();
    await loadCharacters();
    await refreshMap();
    renderCombatHeader();
    renderTab();
    setInterval(refreshMap, 2500);
  } catch (error) {
    ui.lobbyPickError.textContent = String(error.message || error);
  }
}

async function restoreSession() {
  if (!state.sessionToken) return false;
  try {
    const data = await call("/auth/session");
    if (data.role !== "player") return false;
    state.playerName = data.userName || data.userId || "";
    if (data.lobby) {
      state.lobby = data.lobby;
      ui.sessionInfo.textContent = `Лобби: «${data.lobby.title}» · ${state.playerName}`;
      if (data.characterId) {
        try {
          state.character = await call(`/characters/${data.characterId}`);
          state.role = data.memberRole === "player" ? "player" : "spectator";
        } catch {
          state.character = null;
        }
      }
      showApp();
      showScreen(state.character ? "combat" : "lobby");
      renderRole();
      try {
        await loadCharacters();
      } catch (error) {
        console.warn("loadCharacters", error);
      }
      try {
        await refreshMap();
      } catch (error) {
        console.warn("refreshMap", error);
      }
      try {
        renderCombatHeader();
        await renderTab();
      } catch (error) {
        console.warn("render", error);
      }
      setInterval(refreshMap, 2500);
      return true;
    }
    showLobbyPick();
    await loadOpenLobbies();
    return true;
  } catch (error) {
    const msg = String(error?.message || error);
    if (/сессия не найдена|401|unauthorized/i.test(msg)) {
      localStorage.removeItem(SESSION_KEY);
      state.sessionToken = null;
    }
    return false;
  }
}

function renderRole() {
  const roleRu = state.role === "player" ? "игрок" : "зритель";
  ui.lobbyState.textContent = `роль: ${roleRu}`;
  ui.combatRole.textContent = roleRu;
}

function renderMembers() {
  ui.membersList.innerHTML = "";
  const members = state.mapVision?.members ?? [];
  for (const m of members) {
    const row = document.createElement("div");
    row.className = "card";
    const roleRu = m.role === "master" ? "мастер" : m.role === "player" ? "игрок" : "зритель";
    row.textContent = `${m.name} — ${roleRu}`;
    ui.membersList.appendChild(row);
  }
}

function renderCharacters() {
  ui.characterSelect.innerHTML = "";
  for (const c of state.characters) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.className} ${c.level})`;
    ui.characterSelect.appendChild(opt);
  }
  if (state.characters.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Персонажей пока нет";
    ui.characterSelect.appendChild(opt);
  }
}

function fmtModLocal(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

function renderCombatHeader() {
  if (!state.character) {
    ui.combatHp.textContent = "—";
    ui.combatAc.textContent = "—";
    ui.combatAbilities?.querySelectorAll(".combat-abil").forEach((el) => {
      el.querySelector(".combat-abil-score").textContent = "—";
      el.querySelector(".combat-abil-mod").textContent = "—";
      el.title = "";
    });
    return;
  }
  ui.combatHp.textContent = `${state.character.vitals.hpCurrent}/${state.character.vitals.hpMax}`;
  ui.combatAc.textContent = `${state.character.vitals.ac}`;
  const abs = state.character.abilities || {};
  const labels = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" };
  ui.combatAbilities?.querySelectorAll(".combat-abil").forEach((el) => {
    const key = el.getAttribute("data-abil");
    const a = abs[key] || {};
    el.querySelector(".combat-abil-score").textContent = a.score ?? "—";
    el.querySelector(".combat-abil-mod").textContent = fmtModLocal(a.modifier);
    el.title = `${labels[key] || key}: ${a.score ?? "—"} (${fmtModLocal(a.modifier)}) · клик — бросок`;
    el.classList.add("hs-rollable");
  });
}

function showRollToast(text) {
  if (!ui.rollToast) return;
  ui.rollToast.textContent = text;
  ui.rollToast.classList.remove("hidden");
  clearTimeout(showRollToast._t);
  showRollToast._t = setTimeout(() => ui.rollToast?.classList.add("hidden"), 4500);
}

function renderPlayerCombatLog() {
  if (!ui.playerCombatLog) return;
  const entries = state.mapVision?.combatLog || [];
  ui.playerCombatLog.innerHTML = "";
  if (!entries.length) {
    ui.playerCombatLog.innerHTML = `<div class="muted">Пока пусто — клик по характеристике или навыку появится здесь</div>`;
    return;
  }
  for (const log of entries.slice(0, 16)) {
    const row = document.createElement("div");
    if (log.type === "roll") {
      row.className = "card combat-log-roll";
      const who = log.actorName || log.rollerName || "—";
      row.innerHTML = `<strong>${escapeHtml(who)}</strong> · ${escapeHtml(log.label || "бросок")}
        <div class="mono">${escapeHtml(log.detail || "")}</div>
        <div class="muted" style="font-size:12px">${escapeHtml(log.rollerName && log.rollerName !== who ? `бросил: ${log.rollerName}` : "")}</div>`;
    } else {
      row.className = "card combat-log-hp";
      const delta = Number(log.delta) || 0;
      const sign = delta > 0 ? "+" : "";
      const name = log.tokenName || "Токен";
      const hp =
        log.hpCurrent != null && log.hpMax != null ? ` · ${log.hpCurrent}/${log.hpMax}` : "";
      row.innerHTML = `<strong>${escapeHtml(name)}</strong> <span class="mono">${sign}${delta}</span> ХП${escapeHtml(hp)}
        <div class="muted" style="font-size:12px">${escapeHtml(log.reason || (delta < 0 ? "урон" : "лечение"))}</div>`;
    }
    ui.playerCombatLog.appendChild(row);
  }
}

async function requestCombatRoll(payload) {
  const data = await call("/combat/roll", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (Array.isArray(data.combatLog)) {
    state.mapVision = state.mapVision || {};
    state.mapVision.combatLog = data.combatLog;
    renderPlayerCombatLog();
  }
  if (data.combat) {
    state.mapVision = state.mapVision || {};
    state.mapVision.combat = data.combat;
    renderPlayerInitiative();
  }
  const log = data.log;
  if (log?.detail) {
    showRollToast(`${log.actorName || ""} · ${log.label || ""}: ${log.detail}`.trim());
  }
  return data;
}

function wirePlayerSheetRolls(root) {
  bindSheetRolls(root, {
    onRoll: ({ kind, ability, skillKey, label }) => {
      if (!state.character?.id) {
        showRollToast("Сначала привяжите персонажа");
        return;
      }
      requestCombatRoll({
        kind,
        ability,
        skillKey,
        label,
        characterId: state.character.id
      }).catch((error) => showRollToast(String(error.message || error)));
    }
  });
}

function setupCombatAbilityRolls() {
  if (!ui.combatAbilities || ui.combatAbilities.dataset.rollBound === "1") return;
  ui.combatAbilities.dataset.rollBound = "1";
  ui.combatAbilities.addEventListener("click", (e) => {
    const el = e.target.closest?.("[data-abil]");
    if (!el || !ui.combatAbilities.contains(el)) return;
    if (!state.character?.id) {
      showRollToast("Сначала привяжите персонажа");
      return;
    }
    const ability = el.getAttribute("data-abil");
    const labels = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" };
    requestCombatRoll({
      kind: "ability",
      ability,
      label: labels[ability] || ability,
      characterId: state.character.id
    }).catch((error) => showRollToast(String(error.message || error)));
  });
}

function fitMapCellSize(wrapEl, cols, rows, { gap = 1, min = 4, max = 36 } = {}) {
  if (!wrapEl || cols < 1 || rows < 1) return min;
  const style = getComputedStyle(wrapEl);
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const availW = Math.max(0, wrapEl.clientWidth - padX);
  const availH = Math.max(0, wrapEl.clientHeight - padY);
  if (availW < 8 || availH < 8) return min;
  const cellW = (availW - gap * Math.max(0, cols - 1)) / cols;
  const cellH = (availH - gap * Math.max(0, rows - 1)) / rows;
  const size = Math.floor(Math.min(cellW, cellH) * 10) / 10;
  return Math.max(min, Math.min(max, size));
}

function applyMapFit(wrapEl, gridEl, cols, rows) {
  if (!wrapEl || !gridEl) return;
  const size = fitMapCellSize(wrapEl, cols, rows);
  wrapEl.style.setProperty("--map-cell-size", `${size}px`);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  wrapEl.classList.toggle("map-compact", size < 11);
  return size;
}

let playerMapFitObserver = null;
function ensurePlayerMapFitObserver() {
  const wrap = ui.playerMapWrap || ui.playerMapGrid?.closest(".player-map");
  if (!wrap || playerMapFitObserver) return;
  playerMapFitObserver = new ResizeObserver(() => {
    if (!state.mapFitCols || !state.mapFitRows) return;
    applyMapFit(wrap, ui.playerMapGrid, state.mapFitCols, state.mapFitRows);
  });
  playerMapFitObserver.observe(wrap);
}

const TILE_ICONS = {
  wall: "🧱",
  brick: "🟫",
  metal: "⬛",
  column: "▮",
  window: "🪟",
  glass: "🔷",
  door: "🚪",
  door_open: "🔓",
  stairs: "📶",
  rail: "═",
  platform: "▭",
  coupler: "⛓",
  cargo: "🧳",
  floor: "·",
  stone: "⬜",
  grass: "🌿",
  water: "💧",
  rubble: "🪨",
  mist: "☁",
  table: "▤",
  chair: "🪑",
  bench: "🪑",
  bed: "🛏",
  crate: "🗃",
  barrel: "🛢",
  conductor: "⚡",
  rune: "✦",
  crystal: "💎"
};
const OVERLAY_ICONS = { chest: "📦", stash: "✦" };

function fillMapGrid(gridEl, width, height) {
  if (!gridEl) return;
  const visible = new Set((state.mapVision?.visibleCells || []).map((c) => `${c.x}:${c.y}`));
  const tiles = state.mapVision?.tiles || {};
  const overlays = state.mapVision?.overlays || {};
  const tokenMap = new Map();
  for (const t of state.mapVision?.tokens || []) {
    tokenMap.set(`${t.position.x}:${t.position.y}`, t);
  }

  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${width}, var(--map-cell-size))`;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cellKey = `${x}:${y}`;
      const isVisible = visible.has(cellKey);
      const tileId = tiles[cellKey];
      const overlay = overlays[cellKey];
      const cell = document.createElement("div");
      const classes = ["cell"];
      if (isVisible) classes.push("visible");
      if (isVisible && tileId) classes.push(`tex-${tileId}`);
      cell.className = classes.join(" ");

      if (isVisible && tileId && TILE_ICONS[tileId]) {
        const label = document.createElement("span");
        label.className = "tile-label";
        label.textContent = TILE_ICONS[tileId];
        cell.appendChild(label);
      }

      if (isVisible && overlay) {
        const mark = document.createElement("span");
        mark.className = `overlay-mark ${overlay.type}`;
        mark.textContent = OVERLAY_ICONS[overlay.type] ?? "✦";
        cell.appendChild(mark);
      }

      if (isVisible && tokenMap.has(cellKey)) {
        const t = tokenMap.get(cellKey);
        const token = document.createElement("div");
        token.className = `token ${t.type}`;
        if (t.portraitUrl) {
          token.classList.add("has-portrait");
          token.style.backgroundImage = `url("${t.portraitUrl}")`;
          token.innerHTML = `<span class="token-name-tag">${t.name.slice(0, 8)}</span>`;
        } else {
          token.textContent = t.name.slice(0, 2).toUpperCase();
        }
        cell.appendChild(token);
      }
      gridEl.appendChild(cell);
    }
  }
}

function currentMapTitle() {
  const maps = state.mapVision?.maps || [];
  const id = state.mapVision?.mapId;
  const found = maps.find((m) => m.id === id);
  return found?.name || maps[0]?.name || "Карта";
}

function applyInspectTransform() {
  if (!ui.mapInspectStage) return;
  // scale → rotate 90° CW → translate (сдвиг пальцем остаётся в экранных координатах)
  ui.mapInspectStage.style.transform = `translate(${mapInspect.panX}px, ${mapInspect.panY}px) rotate(90deg) scale(${mapInspect.scale})`;
  if (ui.mapInspectZoomLabel) {
    ui.mapInspectZoomLabel.textContent = `${Math.round(mapInspect.scale * 100)}%`;
  }
}

function fitInspectToViewport() {
  const vp = ui.mapInspectViewport;
  if (!vp || !state.mapFitCols || !state.mapFitRows) return;
  const gap = 1;
  const pad = 24;
  const mapW = state.mapFitCols * mapInspect.baseCell + gap * Math.max(0, state.mapFitCols - 1);
  const mapH = state.mapFitRows * mapInspect.baseCell + gap * Math.max(0, state.mapFitRows - 1);
  const availW = Math.max(40, vp.clientWidth - pad);
  const availH = Math.max(40, vp.clientHeight - pad);
  // После rotate(90deg) визуальная ширина = mapH, высота = mapW
  const scale = Math.max(
    mapInspect.minScale,
    Math.min(mapInspect.maxScale, Math.min(availW / mapH, availH / mapW))
  );
  mapInspect.scale = Math.round(scale * 100) / 100;
  const s = mapInspect.scale;
  // BB после scale+rotate(90cw) от origin 0,0: [−s·H .. 0] × [0 .. s·W]
  mapInspect.panX = vp.clientWidth / 2 + (mapH * s) / 2;
  mapInspect.panY = vp.clientHeight / 2 - (mapW * s) / 2;
  applyInspectTransform();
}

function renderInspectMap() {
  if (!ui.mapInspectGrid || !state.mapFitCols || !state.mapFitRows) return;
  ui.mapInspectGrid.style.setProperty("--map-cell-size", `${mapInspect.baseCell}px`);
  fillMapGrid(ui.mapInspectGrid, state.mapFitCols, state.mapFitRows);
  if (ui.mapInspectTitle) ui.mapInspectTitle.textContent = currentMapTitle();
}

function openMapInspect() {
  if (!ui.mapInspectOverlay || !state.mapVision) return;
  mapInspect.open = true;
  ui.mapInspectOverlay.classList.remove("hidden");
  ui.mapInspectOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("map-inspect-open");
  renderInspectMap();
  requestAnimationFrame(() => fitInspectToViewport());
}

function closeMapInspect() {
  if (!mapInspect.open && ui.mapInspectOverlay?.classList.contains("hidden")) return;
  mapInspect.open = false;
  mapInspect.pointers.clear();
  ui.mapInspectOverlay?.classList.add("hidden");
  ui.mapInspectOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("map-inspect-open");
  ui.mapInspectViewport?.classList.remove("is-dragging");
}

function bumpInspectZoom(delta) {
  const vp = ui.mapInspectViewport;
  if (!vp) return;
  const cx = vp.clientWidth / 2;
  const cy = vp.clientHeight / 2;
  const prev = mapInspect.scale;
  const next = Math.max(
    mapInspect.minScale,
    Math.min(mapInspect.maxScale, Math.round((prev + delta) * 100) / 100)
  );
  if (next === prev) return;
  // Zoom toward viewport center
  mapInspect.panX = cx - ((cx - mapInspect.panX) * next) / prev;
  mapInspect.panY = cy - ((cy - mapInspect.panY) * next) / prev;
  mapInspect.scale = next;
  applyInspectTransform();
}

function pointerDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function onInspectPointerDown(e) {
  if (!mapInspect.open || !ui.mapInspectViewport) return;
  ui.mapInspectViewport.setPointerCapture?.(e.pointerId);
  mapInspect.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (mapInspect.pointers.size === 1) {
    mapInspect.panStartX = e.clientX;
    mapInspect.panStartY = e.clientY;
    mapInspect.panOriginX = mapInspect.panX;
    mapInspect.panOriginY = mapInspect.panY;
    ui.mapInspectViewport.classList.add("is-dragging");
  } else if (mapInspect.pointers.size === 2) {
    const [p1, p2] = [...mapInspect.pointers.values()];
    mapInspect.pinchStartDist = pointerDistance(p1, p2);
    mapInspect.pinchStartScale = mapInspect.scale;
  }
}

function onInspectPointerMove(e) {
  if (!mapInspect.open || !mapInspect.pointers.has(e.pointerId)) return;
  mapInspect.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const pts = [...mapInspect.pointers.values()];
  if (pts.length >= 2) {
    const dist = pointerDistance(pts[0], pts[1]);
    if (mapInspect.pinchStartDist > 0) {
      const vp = ui.mapInspectViewport;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const rect = vp.getBoundingClientRect();
      const cx = midX - rect.left;
      const cy = midY - rect.top;
      const prev = mapInspect.scale;
      const next = Math.max(
        mapInspect.minScale,
        Math.min(
          mapInspect.maxScale,
          Math.round(mapInspect.pinchStartScale * (dist / mapInspect.pinchStartDist) * 100) / 100
        )
      );
      mapInspect.panX = cx - ((cx - mapInspect.panX) * next) / prev;
      mapInspect.panY = cy - ((cy - mapInspect.panY) * next) / prev;
      mapInspect.scale = next;
      applyInspectTransform();
    }
  } else if (pts.length === 1) {
    mapInspect.panX = mapInspect.panOriginX + (e.clientX - mapInspect.panStartX);
    mapInspect.panY = mapInspect.panOriginY + (e.clientY - mapInspect.panStartY);
    applyInspectTransform();
  }
}

function onInspectPointerUp(e) {
  if (!mapInspect.pointers.has(e.pointerId)) return;
  mapInspect.pointers.delete(e.pointerId);
  if (mapInspect.pointers.size === 1) {
    const [p] = mapInspect.pointers.values();
    mapInspect.panStartX = p.x;
    mapInspect.panStartY = p.y;
    mapInspect.panOriginX = mapInspect.panX;
    mapInspect.panOriginY = mapInspect.panY;
    mapInspect.pinchStartDist = 0;
  } else if (mapInspect.pointers.size === 0) {
    mapInspect.pinchStartDist = 0;
    ui.mapInspectViewport?.classList.remove("is-dragging");
  } else if (mapInspect.pointers.size === 2) {
    const [p1, p2] = [...mapInspect.pointers.values()];
    mapInspect.pinchStartDist = pointerDistance(p1, p2);
    mapInspect.pinchStartScale = mapInspect.scale;
  }
}

function onInspectWheel(e) {
  if (!mapInspect.open) return;
  e.preventDefault();
  bumpInspectZoom(e.deltaY < 0 ? 0.15 : -0.15);
}

function renderMap() {
  const width = Math.max(1, Math.min(80, Number(state.mapVision?.width) || 40));
  const height = Math.max(1, Math.min(60, Number(state.mapVision?.height) || 30));
  const mapChanged =
    state.mapFitCols !== width || state.mapFitRows !== height || state.mapVision?.mapId !== mapInspect.lastMapId;
  state.mapFitCols = width;
  state.mapFitRows = height;
  mapInspect.lastMapId = state.mapVision?.mapId ?? null;
  const wrap = ui.playerMapWrap || ui.playerMapGrid?.closest(".player-map");
  if (wrap) applyMapFit(wrap, ui.playerMapGrid, width, height);
  ensurePlayerMapFitObserver();

  fillMapGrid(ui.playerMapGrid, width, height);
  if (mapInspect.open) {
    renderInspectMap();
    if (mapChanged) requestAnimationFrame(() => fitInspectToViewport());
  }
  renderMembers();
  requestAnimationFrame(() => {
    if (wrap) applyMapFit(wrap, ui.playerMapGrid, width, height);
  });
}

function rarityClass(rarity) {
  return `rarity-badge rarity-${rarity || "common"}`;
}

function formatItemStats(item) {
  const s = item.stats || {};
  const parts = [];
  if (s.attackBonus) parts.push(`атака ${s.attackBonus}`);
  if (s.damage) parts.push(`урон ${s.damage}`);
  if (s.ac) parts.push(`КД ${s.ac}`);
  if (s.charges) parts.push(`заряды ${s.charges}`);
  if (s.notes) parts.push(s.notes);
  if (item.requiresAttunement) parts.push("настройка");
  return parts.join(" · ");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function bindLimitedChecks(root, selector, max, counterEl) {
  const limit = Math.max(0, Number(max) || 0);
  const sync = () => {
    const boxes = [...(root?.querySelectorAll(selector) || [])];
    const checked = boxes.filter((b) => b.checked).length;
    const atMax = limit > 0 && checked >= limit;
    boxes.forEach((b) => {
      const lock = atMax && !b.checked;
      b.disabled = lock;
      b.closest("label")?.classList.toggle("is-locked", lock);
      b.closest("label")?.classList.toggle("selected", b.checked);
    });
    if (counterEl) counterEl.textContent = limit > 0 ? `Выбрано ${checked} из ${limit}` : "";
  };
  root?.querySelectorAll(selector).forEach((box) => {
    box.addEventListener("change", () => {
      const boxes = [...root.querySelectorAll(selector)];
      if (limit > 0 && boxes.filter((b) => b.checked).length > limit) box.checked = false;
      sync();
    });
  });
  sync();
}

const levelUpState = {
  characterId: null,
  options: null,
  step: 0,
  choices: {}
};

async function refreshBoundCharacter() {
  if (!state.character?.id) return;
  try {
    state.character = await call(`/characters/${state.character.id}`);
    renderCombatHeader();
  } catch {
    /* keep */
  }
}

async function renderLevelTab() {
  if (!state.character) {
    ui.tabBody.innerHTML = `<div class="muted">Сначала привяжите персонажа</div>`;
    return;
  }
  await refreshBoundCharacter();
  let options = null;
  let p = xpProgressLocal(state.character.experience, state.character.level);
  try {
    options = await call(`/characters/${state.character.id}/level-up/options`);
    if (options?.progress && Number(options.progress.nextFloor) > 0) {
      p = options.progress;
    }
  } catch (error) {
    console.warn("level-up options:", error?.message || error);
  }
  const can = Boolean(p.canLevelUp);
  const into = p.into ?? 0;
  const span = p.span ?? 1;
  const needed = p.needed ?? 0;
  ui.tabBody.innerHTML = `
    <div class="hero-sheet-tab">
      <section class="hs-section">
        <div class="hs-title"><span class="hs-ico">⭐</span><span>Опыт и уровень</span></div>
        <div class="muted" style="margin:6px 0">${escapeHtml(state.character.name)} · ур. ${p.level} · БМ +${p.proficiencyBonus}</div>
        <div class="xp-bar-head">
          <div class="xp-bar-label">${
            p.level >= 20 ? `Опыт ${p.experience}` : `До ${p.nextLevel} ур.: ${into} / ${span}`
          }</div>
          <div class="xp-bar-remain">${can ? "можно повысить" : p.level >= 20 ? "макс." : `ещё нужно ${needed}`}</div>
        </div>
        <div class="xp-track" title="${into} из ${span}"><div class="xp-fill" style="width:${p.percent}%"></div></div>
        <div class="xp-meta muted" style="margin-top:6px">
          Всего: <strong>${p.experience}</strong> · порог ${p.nextLevel} ур.: <strong>${p.nextFloor}</strong>
        </div>
        <p class="muted" style="margin-top:8px">Опыт выдаёт мастер. Когда полоска заполнена — выберите развитие.</p>
        <button type="button" id="playerLevelUpBtn" class="primary" style="width:100%;margin-top:10px" ${can ? "" : "disabled"}>
          ${can ? `⬆️ Повысить уровень → ${p.nextLevel}` : `⬆️ Нужно ещё ${needed} опыта`}
        </button>
      </section>
    </div>
  `;
  document.getElementById("playerLevelUpBtn")?.addEventListener("click", async () => {
    if (!can) return;
    try {
      const fresh = options?.progress?.canLevelUp
        ? options
        : await call(`/characters/${state.character.id}/level-up/options`);
      openPlayerLevelUp(state.character.id, fresh);
    } catch (error) {
      alert(error.message || error);
    }
  });
}

async function renderTab() {
  if (state.activeTab === "chat") {
    renderPlayerChat();
    return;
  }

  if (state.activeTab === "level") {
    renderLevelTab();
    return;
  }

  if (!state.character) {
    ui.tabBody.innerHTML = `<div class="muted">Сначала привяжите персонажа</div>`;
    return;
  }

  // Подтянуть описания заклинаний и актуальные данные листа
  if (!state.character.preparedSpellsDetailed && state.character.id) {
    try {
      const fresh = await call(`/characters/${state.character.id}`);
      state.character = fresh;
      renderCombatHeader();
    } catch {
      /* keep */
    }
  }

  if (state.activeTab === "inventory") {
    ui.tabBody.innerHTML = buildPlayerSheetTabHtml(state.character, "inventory", {
      lootItems: state.inventory || []
    });
    wirePlayerSheetRolls(ui.tabBody);
    return;
  }

  ui.tabBody.innerHTML = buildPlayerSheetTabHtml(state.character, state.activeTab, {
    lootItems: state.inventory || []
  });
  wireParseNotesButton();
  wirePlayerSheetRolls(ui.tabBody);
}

function formatChatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function playerChatUnread() {
  const msgs = state.privateChat?.thread?.messages || [];
  if (!msgs.length) return 0;
  if (!state.chatSeenId) return msgs.filter((m) => m.fromRole === "master").length;
  const idx = msgs.findIndex((m) => m.id === state.chatSeenId);
  if (idx < 0) return msgs.filter((m) => m.fromRole === "master").length;
  return msgs.slice(idx + 1).filter((m) => m.fromRole === "master").length;
}

function markPlayerChatSeen() {
  const msgs = state.privateChat?.thread?.messages || [];
  if (!msgs.length) return;
  state.chatSeenId = msgs[msgs.length - 1].id;
  updatePlayerChatBadge();
}

function updatePlayerChatBadge() {
  const badge = document.getElementById("playerChatBadge");
  if (!badge) return;
  const n = playerChatUnread();
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n === 0 || state.activeTab === "chat");
}

function renderPlayerChatBubble(msg) {
  const role = msg.fromRole === "master" ? "master" : "player";
  const who = escapeHtml(msg.fromName || (role === "master" ? "Мастер" : "Вы"));
  const time = escapeHtml(formatChatTime(msg.createdAt));
  if (msg.type === "roll") {
    return `<div class="chat-bubble from-${role}">
      <div class="chat-bubble-who">${who} · скрытый бросок</div>
      <div class="chat-roll">
        <div class="chat-die-face">${escapeHtml(String(msg.roll))}</div>
        <div class="chat-roll-label">d${escapeHtml(String(msg.die))}<br/><strong>${escapeHtml(String(msg.roll))}</strong></div>
      </div>
      <div class="chat-bubble-time">${time}</div>
    </div>`;
  }
  return `<div class="chat-bubble from-${role}">
    <div class="chat-bubble-who">${who}</div>
    <div class="chat-bubble-text">${escapeHtml(msg.text || "")}</div>
    <div class="chat-bubble-time">${time}</div>
  </div>`;
}

function renderPlayerChat() {
  if (!ui.tabBody) return;
  const dice = state.privateChat?.dice || [4, 6, 8, 10, 12, 20];
  const msgs = state.privateChat?.thread?.messages || [];
  const body =
    msgs.length > 0
      ? msgs.map(renderPlayerChatBubble).join("")
      : `<div class="chat-empty">Личный канал с мастером.<br/>Напишите шёпотом или киньте кубик — остальные за столом не увидят.</div>`;

  ui.tabBody.innerHTML = `
    <div class="whisper-panel">
      <div class="whisper-panel-glow" aria-hidden="true"></div>
      <div class="whisper-meta muted">Чат с мастером · только вы двое</div>
      <div id="playerChatMessages" class="chat-messages">${body}</div>
      <div class="chat-dice" id="playerChatDice">
        ${dice.map((d) => `<button type="button" class="chat-die-btn" data-chat-die="${d}">d${d}</button>`).join("")}
      </div>
      <div class="chat-compose">
        <textarea id="playerChatInput" rows="2" maxlength="800" placeholder="Написать мастеру…"></textarea>
        <button type="button" id="playerChatSendBtn" class="primary">Отправить</button>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById("playerChatMessages");
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

  document.getElementById("playerChatSendBtn")?.addEventListener("click", () => {
    sendPlayerChatMessage().catch(console.error);
  });
  document.getElementById("playerChatInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPlayerChatMessage().catch(console.error);
    }
  });
  document.getElementById("playerChatDice")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chat-die]");
    if (!btn) return;
    sendPlayerChatRoll(Number(btn.dataset.chatDie)).catch(console.error);
  });

  markPlayerChatSeen();
}

function applyPlayerPrivateChat(data) {
  if (!data?.privateChat) return;
  const prevMsgs = state.privateChat?.thread?.messages || [];
  const prevLast = prevMsgs.length ? prevMsgs[prevMsgs.length - 1].id : "";
  if (!state._chatBootstrapped) {
    state._chatBootstrapped = true;
    const bootMsgs = data.privateChat?.thread?.messages || [];
    if (bootMsgs.length) state.chatSeenId = bootMsgs[bootMsgs.length - 1].id;
  }
  state.privateChat = data.privateChat;
  updatePlayerChatBadge();
  if (state.activeTab !== "chat") return;

  const nextMsgs = state.privateChat?.thread?.messages || [];
  const nextLast = nextMsgs.length ? nextMsgs[nextMsgs.length - 1].id : "";
  const messagesEl = document.getElementById("playerChatMessages");

  if (messagesEl && prevLast === nextLast) {
    markPlayerChatSeen();
    return;
  }

  if (messagesEl) {
    messagesEl.innerHTML =
      nextMsgs.length > 0
        ? nextMsgs.map(renderPlayerChatBubble).join("")
        : `<div class="chat-empty">Личный канал с мастером.<br/>Напишите шёпотом или киньте кубик — остальные за столом не увидят.</div>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    markPlayerChatSeen();
    return;
  }

  renderPlayerChat();
}

async function sendPlayerChatMessage() {
  const input = document.getElementById("playerChatInput");
  const text = input?.value?.trim() || "";
  if (!text) return;
  const btn = document.getElementById("playerChatSendBtn");
  if (btn) btn.disabled = true;
  try {
    const data = await call("/chat/message", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    if (input) input.value = "";
    applyPlayerPrivateChat(data);
  } catch (error) {
    alert(String(error.message || error));
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function sendPlayerChatRoll(die) {
  if (!die) return;
  try {
    const data = await call("/chat/roll", {
      method: "POST",
      body: JSON.stringify({ die })
    });
    applyPlayerPrivateChat(data);
  } catch (error) {
    alert(String(error.message || error));
  }
}

function wireParseNotesButton() {
  const btn = ui.tabBody?.querySelector("[data-parse-notes]");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    if (!state.character) return;
    const count = countParsedFeatures(state.character);
    const host = ui.tabBody.querySelector("[data-feature-blocks]");
    const status = ui.tabBody.querySelector("[data-parse-notes-status]");
    if (host) host.innerHTML = renderFeatureBlocksHtml(state.character);
    if (status) {
      status.textContent = count
        ? `Найдено умений: ${count}`
        : "Ничего не разобрано — проверьте блок traits/feats в листе";
    }
    // сохранить разобранные карточки на персонаже, чтобы не терять при перерисовке
    state.character.parsedFeatureBlocks = parseFeatureBlocksFromCharacter(state.character);
  });
}

function openPlayerLevelUp(characterId, options) {
  levelUpState.characterId = characterId;
  levelUpState.options = options;
  levelUpState.step = 0;
  const advance = options.advance || {
    mode: "existing",
    className: options.classes?.[0]?.name || "Класс",
    toClassLevel: (options.classes?.[0]?.level || 1) + 1
  };
  levelUpState.choices = {
    advanceClass: {
      mode: advance.mode || "existing",
      className: advance.className,
      subclass: advance.subclass || ""
    },
    hpGain: options.averageHpGain,
    improveType: options.epicBoonAvailable ? "feat" : options.asiAvailable ? "asi" : "none",
    asi: { mode: "plus2", a: "str", b: "dex" },
    feat: { id: "skilled", skillKeys: [] },
    skillKeys: [],
    preparedSpells: [...(options.preparedSpells || [])],
    newSpells: [],
    selectedFeatureIds: (options.classFeaturesForLevel || [])
      .filter((f) => f.pick && f.pickKind !== "subclass")
      .map((f) => f.id),
    featurePicks: {},
    classFeatureNote: "",
    classFeature: "",
    spellSlots: { ...(options.spellOptions?.suggestedSlots || {}) }
  };
  renderPlayerLevelUpStep();
  ui.levelUpModal?.classList.remove("hidden");
}

function closePlayerLevelUp() {
  ui.levelUpModal?.classList.add("hidden");
  if (ui.levelUpModalBody) ui.levelUpModalBody.innerHTML = "";
}

function pluAbil(k) {
  return { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" }[k] || k;
}

async function refreshPlayerOptions() {
  const ch = levelUpState.choices.advanceClass || {};
  const q = new URLSearchParams({ mode: ch.mode || "existing", className: ch.className || "" });
  if (ch.subclass) q.set("subclass", ch.subclass);
  const options = await call(`/characters/${levelUpState.characterId}/level-up/options?${q}`);
  levelUpState.options = options;
  levelUpState.choices.hpGain = options.averageHpGain;
  levelUpState.choices.selectedFeatureIds = (options.classFeaturesForLevel || [])
    .filter((f) => f.pick)
    .slice(0, 1)
    .map((f) => f.id);
}

function renderPlayerLevelUpStep() {
  const o = levelUpState.options;
  const ch = levelUpState.choices;
  const step = levelUpState.step;
  const steps = ["Обзор", "Класс", "Хиты", "Улучшение", "Умения", "Заклинания", "Итог"];
  let body = "";
  const stepIcons = ["overview", "class", "hp", "improve", "features", "spells", "summary"];
  const iconSvg = (name) => {
    const map = {
      overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
      class: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z"/></svg>',
      hp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>',
      improve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v16M6 10l6-6 6 6"/></svg>',
      features: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2.2 5.4L20 10l-4.5 3.8L16.8 20 12 16.8 7.2 20l1.3-6.2L4 10l5.8-1.6L12 3Z"/></svg>',
      spells: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2Z"/></svg>',
      summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 13 4 4L19 7"/></svg>',
      mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z"/><path d="M9 12h6M12 9v6"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>'
    };
    return map[name] || map.summary;
  };
  if (step === 0) {
    body = `
      <div class="lu-hero">
        <div class="lu-level-card">
          <div class="lu-level-label">Персонаж поднимается</div>
          <div class="lu-level-row">
            <span class="lu-level-from">${o.fromLevel}</span>
            <span class="lu-level-to">${o.toLevel}</span>
          </div>
        </div>
        <div class="lu-meta-stack">
          <div class="lu-meta"><div class="lu-meta-icon">${iconSvg("class")}</div><div><span>Класс</span><strong>${escapeHtml(o.classesLabel || "—")}</strong></div></div>
          <div class="lu-meta"><div class="lu-meta-icon">${iconSvg("improve")}</div><div><span>ASI</span><strong>${o.epicBoonAvailable ? "Epic Boon" : o.asiAvailable ? "доступно" : "пропуск"}</strong></div></div>
        </div>
      </div>`;
  } else if (step === 1) {
    body = `
      <div class="lu-choice-row">
        <label class="lu-radio"><input type="radio" name="pluAdv" value="existing" ${ch.advanceClass.mode !== "new" ? "checked" : ""}/> Существующий</label>
        <label class="lu-radio"><input type="radio" name="pluAdv" value="new" ${ch.advanceClass.mode === "new" ? "checked" : ""}/> Новый класс</label>
      </div>
      <select id="pluClass">
        ${
          ch.advanceClass.mode === "new"
            ? (o.availableClasses || [])
                .map((c) => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`)
                .join("")
            : (o.classes || [])
                .map(
                  (c) =>
                    `<option value="${escapeAttr(c.name)}" ${ch.advanceClass.className === c.name ? "selected" : ""}>${escapeHtml(c.name)} ${c.level}→${c.level + 1}</option>`
                )
                .join("")
        }
      </select>
      <label class="field-label">${
        o.advance?.subclassAllowed
          ? `Подкласс (SRD 2024${o.advance?.subclassRequired ? ", обязательно" : ""})`
          : `Подкласс с ур. ${o.advance?.subclassLevel || 3}`
      }</label>
      ${
        o.advance?.subclassAllowed
          ? `<div id="pluSubclassBox" class="lu-subclass-list">
        ${(o.availableSubclasses || [])
          .map((sc) => {
            const selected =
              ch.advanceClass.subclass === sc.name || ch.advanceClass.subclass === sc.nameEn;
            const nowFeats = sc.featuresAtLevel || [];
            const laterFeats = sc.featuresLater || [];
            return `<div class="lu-subclass-card ${selected ? "selected" : ""}">
              <label class="lu-subclass-card-head">
                <input type="radio" name="pluSubclass" value="${escapeAttr(sc.name)}" ${selected ? "checked" : ""}/>
                <div class="lu-subclass-card-titles">
                  <div class="lu-feat-name">${escapeHtml(sc.name)} <span class="pill">SRD ${escapeHtml(sc.edition)}</span></div>
                  ${sc.description ? `<div class="lu-sub-blurb">${escapeHtml(sc.description)}</div>` : ""}
                </div>
              </label>
              ${
                nowFeats.length
                  ? `<div class="lu-sub-block"><div class="lu-sub-block-title">Получите сейчас</div>${nowFeats
                      .map(
                        (f) =>
                          `<div class="lu-sub-feat"><div class="lu-sub-feat-name">${escapeHtml(f.name)}</div>${
                            f.description ? `<div class="lu-sub-feat-desc">${escapeHtml(f.description)}</div>` : ""
                          }</div>`
                      )
                      .join("")}</div>`
                  : ""
              }
              ${
                laterFeats.length
                  ? `<details class="lu-sub-later"><summary>Дальше (${laterFeats.length})</summary>${laterFeats
                      .map(
                        (f) =>
                          `<div class="lu-sub-feat compact"><div class="lu-sub-feat-name">Ур. ${(f.levels || []).join("/")} — ${escapeHtml(f.name)}</div></div>`
                      )
                      .join("")}</details>`
                  : ""
              }
            </div>`;
          })
          .join("")}
      </div>
      ${
        (o.availableSubclasses || []).length
          ? ""
          : `<div class="muted" id="pluSubclassHint">Каталог подтянется с сервера…</div>`
      }`
          : `<div class="muted">Подкласс ещё недоступен (нужен ур. ${o.advance?.subclassLevel || 3} класса).</div>`
      }`;
  } else if (step === 2) {
    body = `<label class="field-label">Прирост хитов (среднее ${o.averageHpGain}, ${escapeHtml(o.hitDie)})</label>
      <input id="pluHp" type="number" min="1" value="${ch.hpGain}" />`;
  } else if (step === 3) {
    if (!o.asiAvailable && !o.epicBoonAvailable) {
      body = `<div class="muted">У этого класса на уровне ${o.advance?.toClassLevel} нет ASI/черты (SRD 2024).</div>`;
      ch.improveType = "none";
    } else if (o.epicBoonAvailable) {
      ch.improveType = "feat";
      body = `
        <div class="muted" style="margin-bottom:8px">Ур. 19: выберите Epic Boon.</div>
        <div id="pluFeat">
          <div class="lu-feat-grid">
            ${(o.feats || [])
              .filter((f) => !f.custom)
              .map(
                (f) => `<label class="lu-feat-card ${ch.feat?.id === f.id ? "selected" : ""}">
                  <input type="radio" name="pluFeat" value="${escapeAttr(f.id)}" ${ch.feat?.id === f.id ? "checked" : ""}/>
                  <div><div class="lu-feat-name">${escapeHtml(f.name)}</div><div class="lu-feat-sum">${escapeHtml(f.summary || "")}</div>${
                    f.description && f.description !== f.summary
                      ? `<div class="muted">${escapeHtml(f.description)}</div>`
                      : ""
                  }</div>
                </label>`
              )
              .join("")}
          </div>
          <div id="pluFeatSkills" class="stack" style="margin-top:8px"></div>
        </div>`;
    } else {
      body = `
        <label class="lu-radio"><input type="radio" name="pluImp" value="asi" ${ch.improveType !== "feat" ? "checked" : ""}/> ASI</label>
        <label class="lu-radio"><input type="radio" name="pluImp" value="feat" ${ch.improveType === "feat" ? "checked" : ""}/> Черта</label>
        <div id="pluAsi">
          <select id="pluAsiMode"><option value="plus2">+2 к одной</option><option value="plus1">+1/+1</option></select>
          <select id="pluAsiA"><option value="str">Сила</option><option value="dex">Ловкость</option><option value="con">Телосложение</option><option value="int">Интеллект</option><option value="wis">Мудрость</option><option value="cha">Харизма</option></select>
          <select id="pluAsiB"><option value="dex">Ловкость</option><option value="str">Сила</option><option value="con">Телосложение</option><option value="int">Интеллект</option><option value="wis">Мудрость</option><option value="cha">Харизма</option></select>
          <div class="muted" id="pluAsiHint" style="margin-top:6px"></div>
        </div>
        <div id="pluFeat" class="hidden">
          <div class="lu-feat-grid">
            ${(o.feats || [])
              .filter((f) => !f.custom)
              .map(
                (f) => `<label class="lu-feat-card ${ch.feat?.id === f.id ? "selected" : ""}">
                  <input type="radio" name="pluFeat" value="${escapeAttr(f.id)}" ${ch.feat?.id === f.id ? "checked" : ""}/>
                  <div><div class="lu-feat-name">${escapeHtml(f.name)}</div><div class="lu-feat-sum">${escapeHtml(f.summary || "")}</div>${
                    f.description && f.description !== f.summary
                      ? `<div class="muted">${escapeHtml(f.description)}</div>`
                      : ""
                  }</div>
                </label>`
              )
              .join("")}
          </div>
          <div id="pluFeatSkills" class="stack" style="margin-top:8px"></div>
        </div>`;
    }
  } else if (step === 4) {
    const feats = o.classFeaturesForLevel || [];
    const budget = o.featureChoiceBudget || [];
    const untrained = o.skillsForPick?.untrained || [];
    const proficient = o.skillsForPick?.proficient || [];
    const picks = ch.featurePicks || {};
    const emptyHint =
      o.asiAvailable || o.epicBoonAvailable
        ? `<div class="lu-skip"><strong>Новых умений нет</strong>ASI/черта уже на шаге «Улучшение».</div>`
        : `<div class="muted">На этом уровне новых умений нет.</div>`;
    body = `
      <p class="muted">Что даёт ${escapeHtml(o.advance?.className || "класс")} на ур. ${o.advance?.toClassLevel ?? "—"}${
        ch.advanceClass?.subclass ? ` · ${escapeHtml(ch.advanceClass.subclass)}` : ""
      } (без ASI и выбора подкласса).</p>
      <div class="lu-feature-list">
        ${feats
          .filter((f) => !f.pick || f.pickKind === "ack")
          .map(
            (f) => `<div class="lu-feature-card"><div class="lu-feat-name">${escapeHtml(f.name)}</div><div class="muted">${escapeHtml(f.description || "")}</div></div>`
          )
          .join("") || emptyHint}
      </div>
      ${
        (o.subclassFeaturesForLevel || []).length
          ? `<div class="field-label" style="margin-top:12px">Особенности подкласса</div>
            <div class="lu-feature-list">${(o.subclassFeaturesForLevel || [])
              .map(
                (f) => `<div class="lu-feature-card">
                  <div class="lu-feat-name">${escapeHtml(f.name)} <span class="pill">${escapeHtml(f.fromSubclass || "подкласс")}</span></div>
                  <div class="muted">${escapeHtml(f.description || "")}</div>
                </div>`
              )
              .join("")}</div>`
          : ""
      }
      ${budget
        .map((b) => {
          const selected = picks[b.featureId] || [];
          if (b.pickKind === "skills") {
            const pool = b.pickFrom === "proficientSkills" ? proficient : untrained;
            const type = b.pickLimit === 1 ? "radio" : "checkbox";
            return `<div class="lu-pick-block" data-pick-feature="${escapeAttr(b.featureId)}" data-pick-limit="${b.pickLimit}">
              <div class="lu-feat-name">${escapeHtml(b.name)} — выберите ${b.pickLimit}</div>
              <div class="muted" data-pick-counter></div>
              ${pool
                .map(
                  (s) => `<label class="lu-check"><input type="${type}" name="pluPick_${escapeAttr(b.featureId)}" data-pick-value="${escapeAttr(s.key)}" ${selected.includes(s.key) ? "checked" : ""}/> ${escapeHtml(skillLabelRu(s))}</label>`
                )
                .join("") || `<div class="muted">Нет подходящих навыков</div>`}
            </div>`;
          }
          if (b.pickKind === "options") {
            const type = b.pickLimit === 1 ? "radio" : "checkbox";
            return `<div class="lu-pick-block" data-pick-feature="${escapeAttr(b.featureId)}" data-pick-limit="${b.pickLimit}">
              <div class="lu-feat-name">${escapeHtml(b.name)} — выберите ${b.pickLimit}</div>
              <div class="muted" data-pick-counter></div>
              ${(b.options || [])
                .map(
                  (opt) => `<label class="lu-feature-card pick"><input type="${type}" name="pluPick_${escapeAttr(b.featureId)}" data-pick-value="${escapeAttr(opt.id)}" ${selected.includes(opt.id) ? "checked" : ""}/><div><div class="lu-feat-name">${escapeHtml(opt.name)}</div><div class="muted">${escapeHtml(opt.description || "")}</div></div></label>`
                )
                .join("")}
            </div>`;
          }
          return "";
        })
        .join("")}`;
  } else if (step === 5) {
    const so = o.spellOptions || {};
    if (!so.isCaster) {
      body = `<div class="lu-skip"><strong>Заклинаний нет</strong>Шаг можно пропустить.</div>`;
    } else if (!(so.picksAllowed > 0) && so.spellMode !== "prepared") {
      body = `<div class="lu-skip"><strong>Новых заклинаний нет</strong>Круг ≤ ${so.maxSpellLevel}.</div>`;
    } else {
      const available = so.available || [];
      body = `
        <div class="lu-spell-panel">
          <div class="lu-spell-chips">
            <span class="lu-chip">круг ≤ <strong>${so.maxSpellLevel}</strong></span>
            <span class="lu-chip accent" id="pluSpellCounter">${
              so.picksAllowed > 0 ? `Выбрано 0 из ${so.picksAllowed}` : `Подготовка 0 / ${so.preparationLimit ?? "—"}`
            }</span>
          </div>
          <div class="lu-spell-grid">${
            available.length
              ? available
                  .slice(0, 60)
                  .map((sp) => {
                    const title = sp.name || sp.nameEn;
                    const summary = sp.summary || "";
                    const meta = [sp.castingTime, sp.range, sp.duration].filter(Boolean).join(" · ");
                    const checked =
                      so.picksAllowed > 0
                        ? (ch.newSpells || []).includes(sp.name)
                        : (ch.preparedSpells || []).includes(sp.name);
                    const attr =
                      so.picksAllowed > 0
                        ? `data-spell-name="${escapeAttr(sp.name)}"`
                        : `data-prep-spell="${escapeAttr(sp.name)}"`;
                    return `<div class="lu-spell-card ${checked ? "selected" : ""}">
                      <label class="lu-spell-pick">
                        <input type="checkbox" ${attr} ${checked ? "checked" : ""}/>
                        <div class="lu-spell-main">
                          <div class="lu-spell-title">${escapeHtml(title)}</div>
                          ${sp.schoolLabel ? `<div class="lu-spell-sub">${escapeHtml(sp.schoolLabel)}</div>` : ""}
                          ${summary ? `<div class="lu-spell-sum">${escapeHtml(summary)}</div>` : ""}
                          ${meta ? `<div class="lu-spell-meta">${escapeHtml(meta)}</div>` : ""}
                        </div>
                        <span class="lu-spell-level">${escapeHtml(sp.levelLabel || "")}</span>
                      </label>
                      ${
                        sp.description || summary
                          ? `<details class="lu-spell-more"><summary>Как работает</summary><div class="lu-spell-desc">${escapeHtml(sp.description || summary)}</div></details>`
                          : ""
                      }
                    </div>`;
                  })
                  .join("")
              : `<div class="muted">Каталог пуст — попросите мастера загрузить заклинания</div>`
          }</div>
        </div>`;
    }
  } else {
    body = `<div class="muted">Хиты +${ch.hpGain}, класс ${escapeHtml(ch.advanceClass?.className || "")}, улучшение: ${ch.improveType}, заклинания: ${(ch.newSpells || []).join(", ") || "—"}</div>`;
  }

  ui.levelUpModalBody.innerHTML = `
    <div class="lu-shell">
      <div class="lu-header">
        <div class="lu-header-main">
          <div class="lu-mark">${iconSvg("mark")}</div>
          <div class="lu-header-text">
            <div class="lu-kicker">D&amp;D SRD 2024 · прокачка</div>
            <div class="lu-title">Повышение уровня</div>
            <div class="lu-subtitle">${escapeHtml(o.classesLabel || "")} · ${o.fromLevel}→${o.toLevel}</div>
          </div>
        </div>
        <button type="button" class="lu-close" id="pluClose" aria-label="Закрыть">${iconSvg("close")}</button>
      </div>
      <div class="lu-steps">${steps
        .map(
          (s, i) =>
            `<div class="lu-step ${i === step ? "active" : i < step ? "done" : ""}" title="${escapeAttr(s)}"><span class="lu-step-icon">${iconSvg(stepIcons[i])}</span><span class="lu-step-label">${escapeHtml(s)}</span></div>`
        )
        .join("")}</div>
      <div class="lu-body">${body}</div>
      <div class="lu-footer">
        <button type="button" id="pluPrev" ${step === 0 ? "disabled" : ""}>Назад</button>
        ${step < steps.length - 1 ? `<button type="button" id="pluNext" class="primary">Далее</button>` : `<button type="button" id="pluCommit" class="primary">Подтвердить</button>`}
      </div>
    </div>
  `;
  document.getElementById("pluClose")?.addEventListener("click", closePlayerLevelUp);
  document.getElementById("pluPrev")?.addEventListener("click", () => {
    collectPlayerStep();
    levelUpState.step -= 1;
    renderPlayerLevelUpStep();
  });
  document.getElementById("pluNext")?.addEventListener("click", async () => {
    collectPlayerStep();
    if (levelUpState.step === 1) {
      try {
        await refreshPlayerOptions();
      } catch (error) {
        alert(String(error.message || error));
        return;
      }
    }
    if (levelUpState.step === 4) {
      for (const b of levelUpState.options?.featureChoiceBudget || []) {
        const got = (levelUpState.choices.featurePicks || {})[b.featureId] || [];
        if ((b.pickKind === "options" || b.pickKind === "skills") && got.length < (b.pickLimit || 1)) {
          alert(`«${b.name}»: выберите ${b.pickLimit}`);
          return;
        }
        if (got.length > (b.pickLimit || 1)) {
          alert(`«${b.name}»: не больше ${b.pickLimit}`);
          return;
        }
      }
    }
    if (levelUpState.step === 5) {
      const picks = levelUpState.options?.spellOptions?.picksAllowed ?? 0;
      if (picks > 0 && (levelUpState.choices.newSpells || []).length > picks) {
        alert(`Можно выбрать не больше ${picks} заклинаний`);
        return;
      }
    }
    const next = levelUpState.step + 1;
    levelUpState.step = next;
    renderPlayerLevelUpStep();
    if (next === 5 && levelUpState.options?.spellOptions?.isCaster) {
      const so = levelUpState.options.spellOptions;
      if (!so.available?.length && (so.picksAllowed > 0 || so.spellMode === "prepared")) {
        try {
          const data = await call(
            `/spells/catalog?classes=${encodeURIComponent((so.filterClasses || []).join(","))}&maxLevel=${so.maxSpellLevel ?? 9}&exclude=${encodeURIComponent((so.known || []).join("|"))}`
          );
          so.available = data.items || [];
          renderPlayerLevelUpStep();
        } catch (error) {
          console.warn(error);
        }
      }
    }
  });
  document.getElementById("pluCommit")?.addEventListener("click", commitPlayerLevelUp);

  if (step === 1) {
    ui.levelUpModalBody.querySelectorAll('input[name="pluAdv"]').forEach((el) => {
      el.addEventListener("change", () => {
        collectPlayerStep();
        renderPlayerLevelUpStep();
      });
    });
    if (!(o.availableSubclasses || []).length) {
      const className = ch.advanceClass?.className || o.advance?.className || "";
      const en =
        o.spellOptions?.classEn ||
        ({
          варвар: "barbarian",
          бард: "bard",
          жрец: "cleric",
          друид: "druid",
          воин: "fighter",
          монах: "monk",
          паладин: "paladin",
          следопыт: "ranger",
          плут: "rogue",
          чародей: "sorcerer",
          колдун: "warlock",
          волшебник: "wizard",
          изобретатель: "artificer"
        }[String(className).toLowerCase()] || "");
      if (en) {
        call(`/subclasses/catalog?class=${encodeURIComponent(en)}&classLevel=${o.advance?.toClassLevel ?? ""}&edition=2024`)
          .then((data) => {
            levelUpState.options.availableSubclasses = data.items || [];
            if (levelUpState.step === 1) renderPlayerLevelUpStep();
          })
          .catch((error) => console.warn(error));
      }
    }
    ui.levelUpModalBody.querySelectorAll('input[name="pluSubclass"]').forEach((el) => {
      el.addEventListener("change", () => {
        ch.advanceClass.subclass = el.value;
        ui.levelUpModalBody.querySelectorAll(".lu-subclass-card").forEach((card) => {
          card.classList.toggle("selected", card.querySelector("input")?.checked);
        });
        const hit = (o.availableSubclasses || []).find(
          (sc) => sc.name === el.value || sc.nameEn === el.value
        );
        o.subclassFeaturesForLevel = hit?.featuresAtLevel || [];
      });
    });
  }
  if (step === 3 && (o.asiAvailable || o.epicBoonAvailable)) {
    const sync = () => {
      if (o.epicBoonAvailable) {
        levelUpState.choices.improveType = "feat";
        updateFeatSkills();
        return;
      }
      const v = ui.levelUpModalBody.querySelector('input[name="pluImp"]:checked')?.value || "asi";
      levelUpState.choices.improveType = v;
      document.getElementById("pluAsi")?.classList.toggle("hidden", v !== "asi");
      document.getElementById("pluFeat")?.classList.toggle("hidden", v !== "feat");
      updateFeatSkills();
    };
    const updateFeatSkills = () => {
      const box = document.getElementById("pluFeatSkills");
      if (!box) return;
      const id = ui.levelUpModalBody.querySelector('input[name="pluFeat"]:checked')?.value || ch.feat?.id;
      const feat = (o.feats || []).find((f) => f.id === id);
      const picks = feat?.skillPicks || 0;
      if (!picks) {
        box.innerHTML = "";
        return;
      }
      const unskilled = o.skillsForPick?.untrained || (o.skills || []).filter((s) => !Number(s.proficiencyLevel));
      box.innerHTML =
        `<div class="muted">Навыки: не больше ${picks}</div><div class="muted" id="pluFeatSkillCounter"></div>` +
        unskilled
          .map(
            (s) =>
              `<label class="lu-check"><input type="checkbox" data-feat-skill="${escapeAttr(s.key)}" ${(ch.feat?.skillKeys || []).includes(s.key) ? "checked" : ""}/> ${escapeHtml(skillLabelRu(s))}</label>`
          )
          .join("") || `<div class="muted">Нет навыков без владения</div>`;
      bindLimitedChecks(box, "[data-feat-skill]", picks, document.getElementById("pluFeatSkillCounter"));
    };
    ui.levelUpModalBody.querySelectorAll('input[name="pluImp"]').forEach((el) => el.addEventListener("change", sync));
    ui.levelUpModalBody.querySelectorAll('input[name="pluFeat"]').forEach((el) => el.addEventListener("change", updateFeatSkills));
    const hint = document.getElementById("pluAsiHint");
    const updateHint = () => {
      const a = document.getElementById("pluAsiA")?.value || "str";
      const h = o.abilityHints?.[a]?.summary || "";
      if (hint) hint.textContent = h;
    };
    document.getElementById("pluAsiA")?.addEventListener("change", updateHint);
    updateHint();
    sync();
  }
  if (step === 4) {
    ui.levelUpModalBody.querySelectorAll("[data-pick-feature]").forEach((block) => {
      bindLimitedChecks(block, "[data-pick-value]", Number(block.dataset.pickLimit) || 1, block.querySelector("[data-pick-counter]"));
    });
  }
  if (step === 5 && o.spellOptions?.isCaster) {
    const so = o.spellOptions;
    const counter = document.getElementById("pluSpellCounter");
    if (so.picksAllowed > 0) bindLimitedChecks(ui.levelUpModalBody, "[data-spell-name]", so.picksAllowed, counter);
    if (so.preparationLimit != null) {
      bindLimitedChecks(ui.levelUpModalBody, "[data-prep-spell]", so.preparationLimit, so.picksAllowed > 0 ? null : counter);
    }
  }
}

function collectPlayerStep() {
  const step = levelUpState.step;
  const ch = levelUpState.choices;
  if (step === 1) {
    ch.advanceClass.mode = ui.levelUpModalBody.querySelector('input[name="pluAdv"]:checked')?.value || "existing";
    ch.advanceClass.className = document.getElementById("pluClass")?.value || ch.advanceClass.className;
    const subRadio = ui.levelUpModalBody.querySelector('input[name="pluSubclass"]:checked');
    if (subRadio) ch.advanceClass.subclass = subRadio.value || "";
    else if (document.getElementById("pluSubclass")) {
      ch.advanceClass.subclass = document.getElementById("pluSubclass").value || "";
    }
  }
  if (step === 2) ch.hpGain = Math.max(1, Number(document.getElementById("pluHp")?.value || ch.hpGain));
  if (step === 3 && (levelUpState.options.asiAvailable || levelUpState.options.epicBoonAvailable)) {
    if (levelUpState.options.epicBoonAvailable) {
      ch.improveType = "feat";
    } else {
      ch.improveType = ui.levelUpModalBody.querySelector('input[name="pluImp"]:checked')?.value || "asi";
    }
    ch.asi = {
      mode: document.getElementById("pluAsiMode")?.value || "plus2",
      a: document.getElementById("pluAsiA")?.value || "str",
      b: document.getElementById("pluAsiB")?.value || "dex"
    };
    ch.feat = {
      id: ui.levelUpModalBody.querySelector('input[name="pluFeat"]:checked')?.value || "skilled",
      skillKeys: [...ui.levelUpModalBody.querySelectorAll("[data-feat-skill]:checked")].map((el) => el.dataset.featSkill)
    };
  }
  if (step === 4) {
    ch.featurePicks = ch.featurePicks || {};
    ui.levelUpModalBody.querySelectorAll("[data-pick-feature]").forEach((block) => {
      ch.featurePicks[block.dataset.pickFeature] = [...block.querySelectorAll("[data-pick-value]:checked")].map(
        (el) => el.dataset.pickValue
      );
    });
    ch.selectedFeatureIds = (levelUpState.options?.featureChoiceBudget || []).map((b) => b.featureId);
    ch.skillKeys = Object.values(ch.featurePicks).flat().filter(Boolean);
  }
  if (step === 5) {
    ch.newSpells = [...ui.levelUpModalBody.querySelectorAll("[data-spell-name]:checked")].map((el) => el.dataset.spellName);
    const prep = [...ui.levelUpModalBody.querySelectorAll("[data-prep-spell]:checked")].map((el) => el.dataset.prepSpell);
    if (prep.length) ch.preparedSpells = prep;
  }
}

async function commitPlayerLevelUp() {
  collectPlayerStep();
  try {
    await call("/characters/level-up", {
      method: "POST",
      body: JSON.stringify({ characterId: levelUpState.characterId, choices: levelUpState.choices })
    });
    closePlayerLevelUp();
    await refreshBoundCharacter();
    await loadCharacters();
    renderLevelTab();
  } catch (error) {
    alert(String(error.message || error));
  }
}

async function loadInventory() {
  try {
    const data = await call("/loot/mine");
    state.inventory = data.inventory || [];
    if (state.activeTab === "inventory") renderTab();
  } catch {
    /* ignore when not in lobby */
  }
}

async function loadCharacters() {
  state.characters = await call("/characters");
  renderCharacters();
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsText(file, "UTF-8");
  });
}

async function importCharacter() {
  ui.bindStatus.textContent = "Импорт…";
  let raw = "";
  const file = ui.characterFileInput?.files?.[0] || null;
  if (file) {
    try {
      raw = (await readFileAsText(file)).trim();
    } catch (error) {
      ui.bindStatus.textContent = String(error.message || error);
      return;
    }
  } else {
    raw = String(ui.characterRawJson?.value || "").trim();
  }
  if (!raw) {
    ui.bindStatus.textContent = "Выберите JSON-файл или вставьте текст";
    return;
  }
  try {
    JSON.parse(raw);
  } catch {
    ui.bindStatus.textContent = "Неверный JSON — проверьте файл";
    return;
  }
  try {
    const imported = await call("/characters/import", {
      method: "POST",
      body: JSON.stringify({ rawFileContent: raw })
    });
    ui.bindStatus.textContent = `Импортировано: ${imported.name}`;
    await loadCharacters();
    const bound = await call("/characters/bind", {
      method: "POST",
      body: JSON.stringify({ characterId: imported.id })
    });
    ui.bindStatus.textContent = `Привязан: ${bound.character?.name || imported.name}`;
    await enterCombatWithCharacter(bound.character || imported);
  } catch (error) {
    ui.bindStatus.textContent = `Ошибка: ${String(error.message || error)}`;
  }
}

function onCharacterFilePicked() {
  const file = ui.characterFileInput?.files?.[0] || null;
  if (ui.characterFileName) {
    ui.characterFileName.textContent = file ? `Выбран: ${file.name}` : "Файл не выбран";
  }
  if (file) {
    importCharacter().catch((error) => {
      ui.bindStatus.textContent = `Ошибка: ${String(error.message || error)}`;
    });
  }
}

async function bindSelected() {
  const selectedId = ui.characterSelect.value;
  const picked = state.characters.find((c) => c.id === selectedId) || null;
  if (!picked) {
    ui.bindStatus.textContent = "Выберите персонажа";
    return;
  }
  try {
    const bound = await call("/characters/bind", {
      method: "POST",
      body: JSON.stringify({ characterId: picked.id })
    });
    ui.bindStatus.textContent = `Привязан: ${bound.character?.name || picked.name}`;
    await enterCombatWithCharacter(bound.character || picked);
  } catch (error) {
    ui.bindStatus.textContent = `Ошибка: ${String(error.message || error)}`;
  }
}

async function refreshMap() {
  if (!state.lobby) return;
  state.mapVision = await call("/map/vision");
  if (state.mapVision?.privateChat) {
    applyPlayerPrivateChat({ privateChat: state.mapVision.privateChat });
  }
  renderPlayerMapTabs();
  renderMap();
  renderPlayerInitiative();
  renderPlayerCombatLog();
  await loadInventory();
}

function renderPlayerMapTabs() {
  if (!ui.playerMapTabs) return;
  const maps = state.mapVision?.maps || [];
  const currentId = state.mapVision?.mapId || null;
  ui.playerMapTabs.innerHTML = "";
  if (maps.length <= 1) {
    ui.playerMapTabs.classList.toggle("hidden", maps.length === 0);
    if (maps.length === 1) {
      const only = maps[0];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-tab active";
      btn.textContent = only.name;
      btn.disabled = true;
      ui.playerMapTabs.appendChild(btn);
    }
    return;
  }
  ui.playerMapTabs.classList.remove("hidden");
  for (const m of maps) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `map-tab${m.id === currentId ? " active" : ""}`;
    btn.textContent = m.name;
    btn.addEventListener("click", () => switchPlayerMap(m.id).catch(console.error));
    ui.playerMapTabs.appendChild(btn);
  }
}

async function switchPlayerMap(mapId) {
  if (!mapId || mapId === state.mapVision?.mapId) return;
  await call("/maps/view", {
    method: "POST",
    body: JSON.stringify({ mapId })
  });
  await refreshMap();
}

async function openHeroSheetReadonly(combatant) {
  const characterId = combatant?.characterId;
  if (!characterId || !ui.npcSheetModal || !ui.npcSheetModalBody) return;
  try {
    const character = await call(`/characters/${characterId}`);
    const close = () => {
      ui.npcSheetModal.classList.add("hidden");
      ui.npcSheetModalBody.classList.remove("npc-sheet-card", "hero-sheet-card");
      ui.npcSheetModalBody.innerHTML = "";
    };
    ui.npcSheetModalBody.classList.add("modal-card", "stack", "hero-sheet-card");
    ui.npcSheetModalBody.classList.remove("npc-sheet-card");
    ui.npcSheetModalBody.innerHTML = buildCharacterSheetHtml(character, {
      readonly: true,
      showClose: true
    });
    ui.npcSheetModal.classList.remove("hidden");
    ui.npcSheetModalBody.querySelector("#closeHeroCardBtn")?.addEventListener("click", close);
    ui.npcSheetModal.querySelector("[data-npc-sheet-backdrop], .modal-backdrop")?.addEventListener("click", close, {
      once: true
    });
    ui.npcSheetModalBody.querySelector("[data-download-character]")?.addEventListener("click", () => {
      downloadCharacterJson(character);
    });
    // Чужой лист — только просмотр, без бросков (сервер всё равно запретит)
    if (state.character?.id && character.id === state.character.id) {
      wirePlayerSheetRolls(ui.npcSheetModalBody);
    }
  } catch (error) {
    console.error(error);
    if (ui.initiativeRollResult) {
      ui.initiativeRollResult.textContent = String(error.message || error);
    }
  }
}

function renderPlayerInitiative() {
  const combat = state.mapVision?.combat || null;
  const myTokenId = combat?.myCombatant?.tokenId || null;
  renderInitiativeBar(ui.playerInitiativeBar, combat, {
    highlightTokenId: myTokenId,
    onOpenSheet: (combatant, sheet) => {
      if (combatant?.characterId || combatant?.type === "player") {
        openHeroSheetReadonly(combatant).catch(console.error);
        return;
      }
      const token = (state.mapVision?.tokens || []).find((t) => t.id === combatant.tokenId) || {
        name: combatant.name,
        hpCurrent: combatant.hpCurrent,
        hpMax: combatant.hpMax
      };
      const npc = sheet || {
        name: combatant.name,
        type: combatant.type,
        hp: combatant.hpMax,
        abilities: {},
        actions: [],
        notes: ""
      };
        openNpcSheetModal(
        { modal: ui.npcSheetModal, body: ui.npcSheetModalBody },
        {
          ...npc,
          hpCurrent: combatant.hpCurrent ?? token.hpCurrent ?? npc.hp,
          hpMax: combatant.hpMax ?? token.hpMax ?? npc.hp
        },
        { token, viewerRole: "player" }
      );
    }
  });

  if (!ui.playerInitActions) return;
  const canRoll = Boolean(combat?.canRoll);
  const mine = combat?.myCombatant;
  if (!combat?.active) {
    ui.playerInitActions.classList.add("hidden");
    if (ui.initiativeRollResult) ui.initiativeRollResult.textContent = "";
    return;
  }
  ui.playerInitActions.classList.remove("hidden");
  if (ui.rollInitiativeBtn) {
    ui.rollInitiativeBtn.classList.toggle("hidden", !canRoll);
    ui.rollInitiativeBtn.disabled = !canRoll;
    ui.rollInitiativeBtn.textContent = "🎲 Бросить инициативу";
  }
  if (ui.initiativeRollResult) {
    if (mine?.status === "rolled") {
      const mod = Number(mine.dexMod) || 0;
      const modLabel = mod >= 0 ? `+${mod}` : `${mod}`;
      ui.initiativeRollResult.textContent = `Ваш бросок: ${mine.roll} ${modLabel} = ${mine.total}`;
    } else if (canRoll) {
      ui.initiativeRollResult.textContent = "Мастер вызвал вас в бой — бросьте инициативу";
    } else if (combat.active && !mine) {
      ui.initiativeRollResult.textContent = "Вы пока не в этом бою";
    } else {
      ui.initiativeRollResult.textContent = "";
    }
  }
}

async function rollMyInitiative() {
  if (!ui.rollInitiativeBtn) return;
  ui.rollInitiativeBtn.disabled = true;
  try {
    const data = await call("/combat/initiative/roll", {
      method: "POST",
      body: JSON.stringify({})
    });
    state.mapVision = state.mapVision || {};
    state.mapVision.combat = data.combat;
    renderPlayerInitiative();
    await refreshMap();
  } catch (error) {
    if (ui.initiativeRollResult) {
      ui.initiativeRollResult.textContent = String(error.message || error);
    }
    ui.rollInitiativeBtn.disabled = false;
  }
}

function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("primary", b.dataset.tab === state.activeTab));
      renderTab();
      if (state.activeTab === "inventory") loadInventory();
      if (state.activeTab === "level") renderLevelTab();
      if (state.activeTab === "chat") markPlayerChatSeen();
    });
  });
}

ui.playerLoginBtn.addEventListener("click", playerLogin);
ui.showLobbyListBtn?.addEventListener("click", async () => {
  ui.loginError.textContent = "";
  const name = ui.playerName.value.trim();
  if (!name) {
    ui.loginError.textContent = "Сначала введите имя";
    return;
  }
  try {
    if (!state.sessionToken) {
      const data = await call("/auth/player/login", {
        method: "POST",
        body: JSON.stringify({ playerName: name })
      });
      state.sessionToken = data.token;
      state.playerName = data.playerName;
      localStorage.setItem(SESSION_KEY, data.token);
    }
    showLobbyPick();
    await loadOpenLobbies();
  } catch (error) {
    ui.loginError.textContent = String(error.message || error);
  }
});
ui.lobbyTitle?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") playerLogin();
});
ui.playerName?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") playerLogin();
});
ui.refreshLobbiesBtn.addEventListener("click", loadOpenLobbies);
ui.screenLobbyBtn.addEventListener("click", () => showScreen("lobby"));
ui.screenBindBtn.addEventListener("click", () => showScreen("bind"));
ui.screenCombatBtn.addEventListener("click", () => showScreen("combat"));
ui.goBindBtn.addEventListener("click", () => showScreen("bind"));
ui.changeCharacterBtn?.addEventListener("click", () => {
  showBindSetup(true);
  loadCharacters();
});
ui.downloadCharacterBtn?.addEventListener("click", () => {
  downloadCharacterJson(state.character);
});
ui.refreshCharactersBtn.addEventListener("click", loadCharacters);
ui.importCharacterBtn.addEventListener("click", importCharacter);
ui.characterFileInput?.addEventListener("change", onCharacterFilePicked);
ui.bindSelectedBtn.addEventListener("click", bindSelected);
ui.levelUpModalClose?.addEventListener("click", closePlayerLevelUp);
ui.rollInitiativeBtn?.addEventListener("click", () => rollMyInitiative().catch(console.error));

ui.mapInspectOpenBtn?.addEventListener("click", () => openMapInspect());
ui.playerMapWrap?.addEventListener("click", () => openMapInspect());
ui.mapInspectCloseBtn?.addEventListener("click", () => closeMapInspect());
ui.mapInspectZoomIn?.addEventListener("click", () => bumpInspectZoom(0.25));
ui.mapInspectZoomOut?.addEventListener("click", () => bumpInspectZoom(-0.25));
ui.mapInspectZoomFit?.addEventListener("click", () => fitInspectToViewport());
ui.mapInspectViewport?.addEventListener("pointerdown", onInspectPointerDown);
ui.mapInspectViewport?.addEventListener("pointermove", onInspectPointerMove);
ui.mapInspectViewport?.addEventListener("pointerup", onInspectPointerUp);
ui.mapInspectViewport?.addEventListener("pointercancel", onInspectPointerUp);
ui.mapInspectViewport?.addEventListener("wheel", onInspectWheel, { passive: false });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mapInspect.open) closeMapInspect();
});

setupTabs();
setupCombatAbilityRolls();

if (!(await restoreSession())) {
  showLogin();
}
