import { renderInitiativeBar } from "/initiative-bar.js?v=3";
import { openNpcSheetModal, closeNpcSheetModal, buildNpcSheetHtml } from "/npc-sheet.js?v=3";
import { skillLabelRu, bindSheetRolls } from "/character-sheet.js?v=18";

const SESSION_KEY = "dnd_master_session";

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
  screenApp: document.getElementById("screenApp"),
  masterName: document.getElementById("masterName"),
  lobbyTitle: document.getElementById("lobbyTitle"),
  masterLoginBtn: document.getElementById("masterLoginBtn"),
  loginError: document.getElementById("loginError"),
  lobbyInfo: document.getElementById("lobbyInfo"),
  visionMode: document.getElementById("visionMode"),
  visionRadius: document.getElementById("visionRadius"),
  applyVisionBtn: document.getElementById("applyVisionBtn"),
  revealSampleBtn: document.getElementById("revealSampleBtn"),
  visionStatus: document.getElementById("visionStatus"),
  mapGrid: document.getElementById("mapGrid"),
  tokenPanel: document.getElementById("tokenPanel"),
  combatLog: document.getElementById("combatLog"),
  quickRollPanel: document.getElementById("quickRollPanel"),
  rollToast: document.getElementById("rollToast"),
  tokenName: document.getElementById("tokenName"),
  tokenType: document.getElementById("tokenType"),
  tokenX: document.getElementById("tokenX"),
  tokenY: document.getElementById("tokenY"),
  tokenHpCurrent: document.getElementById("tokenHpCurrent"),
  tokenHpMax: document.getElementById("tokenHpMax"),
  addTokenBtn: document.getElementById("addTokenBtn"),
  preloadMonstersBtn: document.getElementById("preloadMonstersBtn"),
  refreshMonstersBtn: document.getElementById("refreshMonstersBtn"),
  monsterStatus: document.getElementById("monsterStatus"),
  monsterProgressWrap: document.getElementById("monsterProgressWrap"),
  monsterProgressFill: document.getElementById("monsterProgressFill"),
  monsterProgressPct: document.getElementById("monsterProgressPct"),
  monsterProgressMsg: document.getElementById("monsterProgressMsg"),
  monsterList: document.getElementById("monsterList"),
  monsterSearch: document.getElementById("monsterSearch"),
  monsterModal: document.getElementById("monsterModal"),
  monsterModalBody: document.getElementById("monsterModalBody"),
  monsterModalClose: document.getElementById("monsterModalClose"),
  npcName: document.getElementById("npcName"),
  npcHp: document.getElementById("npcHp"),
  npcAc: document.getElementById("npcAc"),
  createNpcBtn: document.getElementById("createNpcBtn"),
  npcList: document.getElementById("npcList"),
  closeLobbyBtn: document.getElementById("closeLobbyBtn"),
  texturePalette: document.getElementById("texturePalette"),
  paintToolStatus: document.getElementById("paintToolStatus"),
  secretVisibilityRow: document.getElementById("secretVisibilityRow"),
  showToPlayersToggle: document.getElementById("showToPlayersToggle"),
  secretsList: document.getElementById("secretsList"),
  heroesList: document.getElementById("heroesList"),
  masterHeroFileInput: document.getElementById("masterHeroFileInput"),
  masterHeroImportStatus: document.getElementById("masterHeroImportStatus"),
  masterHeroRawJson: document.getElementById("masterHeroRawJson"),
  masterHeroImportPasteBtn: document.getElementById("masterHeroImportPasteBtn"),
  heroModal: document.getElementById("heroModal"),
  heroModalBody: document.getElementById("heroModalBody"),
  heroModalClose: document.getElementById("heroModalClose"),
  levelUpModal: document.getElementById("levelUpModal"),
  levelUpModalBody: document.getElementById("levelUpModalBody"),
  levelUpModalClose: document.getElementById("levelUpModalClose"),
  rightTabCombat: document.getElementById("rightTabCombat"),
  rightTabLoot: document.getElementById("rightTabLoot"),
  rightTabChat: document.getElementById("rightTabChat"),
  rightPaneCombat: document.getElementById("rightPaneCombat"),
  rightPaneLoot: document.getElementById("rightPaneLoot"),
  rightPaneChat: document.getElementById("rightPaneChat"),
  chatTabBadge: document.getElementById("chatTabBadge"),
  chatPlayerTabs: document.getElementById("chatPlayerTabs"),
  chatThreadMeta: document.getElementById("chatThreadMeta"),
  chatMessages: document.getElementById("chatMessages"),
  chatDiceRow: document.getElementById("chatDiceRow"),
  chatInput: document.getElementById("chatInput"),
  chatSendBtn: document.getElementById("chatSendBtn"),
  rarityButtons: document.getElementById("rarityButtons"),
  lootRandomBtn: document.getElementById("lootRandomBtn"),
  lootPreloadBtn: document.getElementById("lootPreloadBtn"),
  lootCatalogStatus: document.getElementById("lootCatalogStatus"),
  lootName: document.getElementById("lootName"),
  lootRarityCustom: document.getElementById("lootRarityCustom"),
  lootType: document.getElementById("lootType"),
  lootDesc: document.getElementById("lootDesc"),
  lootStatAttack: document.getElementById("lootStatAttack"),
  lootStatDamage: document.getElementById("lootStatDamage"),
  lootStatAc: document.getElementById("lootStatAc"),
  lootStatCharges: document.getElementById("lootStatCharges"),
  lootStatNotes: document.getElementById("lootStatNotes"),
  lootAttune: document.getElementById("lootAttune"),
  lootAddDropBtn: document.getElementById("lootAddDropBtn"),
  lootAddCampaignBtn: document.getElementById("lootAddCampaignBtn"),
  lootRecipient: document.getElementById("lootRecipient"),
  lootDropsList: document.getElementById("lootDropsList"),
  lootCampaignList: document.getElementById("lootCampaignList"),
  lootGrantsList: document.getElementById("lootGrantsList"),
  lootLastDrop: document.getElementById("lootLastDrop"),
  lootModal: document.getElementById("lootModal"),
  lootModalBody: document.getElementById("lootModalBody"),
  lootModalClose: document.getElementById("lootModalClose"),
  openCombatBtn: document.getElementById("openCombatBtn"),
  openCombatBtnSide: document.getElementById("openCombatBtnSide"),
  autoInitBtn: document.getElementById("autoInitBtn"),
  nextTurnBtn: document.getElementById("nextTurnBtn"),
  endCombatBtn: document.getElementById("endCombatBtn"),
  forceEndCombatBtn: document.getElementById("forceEndCombatBtn"),
  combatStatus: document.getElementById("combatStatus"),
  initiativeBar: document.getElementById("initiativeBar"),
  combatModal: document.getElementById("combatModal"),
  combatModalClose: document.getElementById("combatModalClose"),
  combatPickList: document.getElementById("combatPickList"),
  combatSelectAllBtn: document.getElementById("combatSelectAllBtn"),
  combatSelectNewBtn: document.getElementById("combatSelectNewBtn"),
  combatCancelBtn: document.getElementById("combatCancelBtn"),
  combatConfirmBtn: document.getElementById("combatConfirmBtn"),
  combatModalError: document.getElementById("combatModalError"),
  adventureList: document.getElementById("adventureList"),
  adventureStatus: document.getElementById("adventureStatus"),
  mapTabs: document.getElementById("mapTabs"),
  mapTabsStatus: document.getElementById("mapTabsStatus"),
  addMapBtn: document.getElementById("addMapBtn"),
  publishMapBtn: document.getElementById("publishMapBtn"),
  unpublishMapBtn: document.getElementById("unpublishMapBtn"),
  exportMapsBtn: document.getElementById("exportMapsBtn"),
  exportOneMapBtn: document.getElementById("exportOneMapBtn"),
  importMapsInput: document.getElementById("importMapsInput"),
  masterSplitter: document.getElementById("masterSplitter"),
  mapZoomOutBtn: document.getElementById("mapZoomOutBtn"),
  mapZoomFitBtn: document.getElementById("mapZoomFitBtn"),
  mapZoomInBtn: document.getElementById("mapZoomInBtn"),
  mapZoomLabel: document.getElementById("mapZoomLabel")
};

const TOKEN_TYPE_RU = { player: "игрок", monster: "монстр", npc: "NPC" };
const VISION_MODE_RU = { full: "вся карта", radius: "радиус", manual: "вручную" };

const PAINT_GROUPS = [
  { id: "building", label: "Архитектура" },
  { id: "train", label: "Поезд · вокзал" },
  { id: "terrain", label: "Местность" },
  { id: "furniture", label: "Мебель · объекты" },
  { id: "magic", label: "Магия · Каннит" },
  { id: "loot", label: "Лут на карте" },
  { id: "tool", label: "Инструменты" }
];

const PAINT_TEXTURES = [
  { id: "wall", label: "Стена", group: "building", blocksVision: true, icon: "🧱", kind: "tile" },
  { id: "brick", label: "Кирпич", group: "building", blocksVision: true, icon: "🟫", kind: "tile" },
  { id: "metal", label: "Металл", group: "building", blocksVision: true, icon: "⬛", kind: "tile" },
  { id: "column", label: "Колонна", group: "building", blocksVision: true, icon: "▮", kind: "tile" },
  { id: "window", label: "Окно", group: "building", blocksVision: false, icon: "🪟", kind: "tile" },
  { id: "glass", label: "Витраж", group: "building", blocksVision: false, icon: "🔷", kind: "tile" },
  { id: "door", label: "Дверь", group: "building", blocksVision: true, icon: "🚪", kind: "tile" },
  { id: "door_open", label: "Дверь откр.", group: "building", blocksVision: false, icon: "🔓", kind: "tile" },
  { id: "stairs", label: "Лестница", group: "building", blocksVision: false, icon: "📶", kind: "tile" },
  { id: "rail", label: "Рельсы", group: "train", blocksVision: false, icon: "═", kind: "tile" },
  { id: "platform", label: "Платформа", group: "train", blocksVision: false, icon: "▭", kind: "tile" },
  { id: "coupler", label: "Сцепка", group: "train", blocksVision: false, icon: "⛓", kind: "tile" },
  { id: "cargo", label: "Груз", group: "train", blocksVision: false, icon: "🧳", kind: "tile" },
  { id: "floor", label: "Пол", group: "terrain", blocksVision: false, icon: "·", kind: "tile" },
  { id: "stone", label: "Камень", group: "terrain", blocksVision: false, icon: "⬜", kind: "tile" },
  { id: "grass", label: "Трава", group: "terrain", blocksVision: false, icon: "🌿", kind: "tile" },
  { id: "water", label: "Вода", group: "terrain", blocksVision: false, icon: "💧", kind: "tile" },
  { id: "rubble", label: "Обломки", group: "terrain", blocksVision: false, icon: "🪨", kind: "tile" },
  { id: "mist", label: "Туман", group: "terrain", blocksVision: false, icon: "☁", kind: "tile" },
  { id: "table", label: "Стол", group: "furniture", blocksVision: false, icon: "▤", kind: "tile" },
  { id: "chair", label: "Стул", group: "furniture", blocksVision: false, icon: "🪑", kind: "tile" },
  { id: "bench", label: "Скамья", group: "furniture", blocksVision: false, icon: "🪑", kind: "tile" },
  { id: "bed", label: "Койка", group: "furniture", blocksVision: false, icon: "🛏", kind: "tile" },
  { id: "crate", label: "Ящик", group: "furniture", blocksVision: false, icon: "🗃", kind: "tile" },
  { id: "barrel", label: "Бочка", group: "furniture", blocksVision: false, icon: "🛢", kind: "tile" },
  { id: "conductor", label: "Проводник", group: "magic", blocksVision: false, icon: "⚡", kind: "tile" },
  { id: "rune", label: "Руна", group: "magic", blocksVision: false, icon: "✦", kind: "tile" },
  { id: "crystal", label: "Кристалл", group: "magic", blocksVision: false, icon: "💎", kind: "tile" },
  { id: "chest", label: "Сундук", group: "loot", blocksVision: false, icon: "📦", kind: "overlay", canHide: true },
  { id: "stash", label: "Тайник", group: "loot", blocksVision: false, icon: "✦", kind: "overlay", canHide: true },
  { id: "erase_overlay", label: "Стереть тайник", group: "tool", blocksVision: false, icon: "✧", kind: "tool" },
  { id: "erase", label: "Ластик", group: "tool", blocksVision: false, icon: "✕", kind: "tool" }
];

const TILE_ICONS = Object.fromEntries(PAINT_TEXTURES.map((t) => [t.id, t.icon]));
const OVERLAY_ICONS = { chest: "📦", stash: "✦" };

const state = {
  sessionToken: localStorage.getItem(SESSION_KEY),
  lobby: null,
  vision: { mode: "full", radius: 3 },
  visibleCells: [],
  tokens: [],
  tiles: {},
  overlays: {},
  mapWidth: 20,
  mapHeight: 12,
  paintTextureId: "wall",
  paintGroupId: "building",
  showToPlayers: true,
  isPainting: false,
  eraseStroke: false,
  monsters: [],
  npcs: [],
  log: [],
  loot: {
    campaignPool: [],
    sessionDrops: [],
    grants: [],
    rarities: [
      { id: "common", label: "Обычный" },
      { id: "uncommon", label: "Необычный" },
      { id: "rare", label: "Редкий" },
      { id: "very_rare", label: "Очень редкий" },
      { id: "legendary", label: "Легендарный" }
    ]
  },
  selectedRarity: "uncommon",
  pendingGrant: null,
  characters: [],
  members: [],
  combat: null,
  rollTarget: null,
  rightTab: "combat",
  privateChat: { threads: [], dice: [4, 6, 8, 10, 12, 20] },
  chatPlayerId: null,
  chatSeen: {},
  dragTokenId: null,
  openHeroId: null,
  maps: [],
  activeMapId: null,
  playerMapId: null,
  adventuresLoaded: false,
  mapFitCols: 0,
  mapFitRows: 0,
  mapZoom: 1,
  mapFitBase: 0
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
      /* keep text */
    }
    throw new Error(msg || `${res.status}`);
  }
  return res.json();
}

function showApp() {
  ui.screenLogin.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
}

function showLogin() {
  ui.screenLogin.classList.remove("hidden");
  ui.screenApp.classList.add("hidden");
}

async function masterLogin() {
  ui.loginError.textContent = "";
  try {
    const data = await call("/auth/master/login", {
      method: "POST",
      body: JSON.stringify({
        masterName: ui.masterName.value,
        lobbyTitle: ui.lobbyTitle.value
      })
    });
    state.sessionToken = data.token;
    state.lobby = data.lobby;
    localStorage.setItem(SESSION_KEY, data.token);
    ui.lobbyInfo.textContent = `Лобби: «${data.lobby.title}» · открыто для игроков`;
    showApp();
    await bootstrapApp();
  } catch (error) {
    ui.loginError.textContent = String(error.message || error);
  }
}

async function restoreSession() {
  if (!state.sessionToken) return false;
  try {
    const data = await call("/auth/session");
    if (data.role !== "master" || !data.lobby) return false;
    state.lobby = data.lobby;
    ui.lobbyInfo.textContent = `Лобби: «${data.lobby.title}» · мастер: ${data.userName}`;
    showApp();
    await bootstrapApp();
    return true;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    state.sessionToken = null;
    return false;
  }
}

function key(x, y) {
  return `${x}:${y}`;
}

function setupPalette() {
  const current = PAINT_TEXTURES.find((t) => t.id === state.paintTextureId);
  if (current?.group) state.paintGroupId = current.group;
  if (!state.paintGroupId) state.paintGroupId = PAINT_GROUPS[0]?.id || "building";

  ui.texturePalette.innerHTML = "";
  for (const group of PAINT_GROUPS) {
    const items = PAINT_TEXTURES.filter((t) => t.group === group.id);
    if (!items.length) continue;
    const section = document.createElement("details");
    section.className = "texture-group";
    section.dataset.groupId = group.id;
    if (group.id === state.paintGroupId) section.open = true;

    const title = document.createElement("summary");
    title.className = "texture-group-title";
    title.textContent = group.label;
    section.appendChild(title);

    const row = document.createElement("div");
    row.className = "texture-group-row";
    for (const tex of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `texture-btn ${state.paintTextureId === tex.id ? "active" : ""}`;
      btn.dataset.textureId = tex.id;
      const hint =
        tex.id === "erase"
          ? "стереть всё"
          : tex.id === "erase_overlay"
            ? "только тайник"
            : tex.kind === "overlay"
              ? "поверх тайла"
              : tex.blocksVision
                ? "блок. обзор"
                : "видно сквозь";
      btn.innerHTML = `
        <span>${tex.icon} ${tex.label}</span>
        <span class="${tex.blocksVision ? "blocks-hint" : "pass-hint"}">${hint}</span>
      `;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.paintTextureId = tex.id;
        state.paintGroupId = group.id;
        ui.paintToolStatus.textContent = `инструмент: ${tex.label}`;
        ui.secretVisibilityRow.classList.toggle("hidden", !tex.canHide);
        setupPalette();
      });
      row.appendChild(btn);
    }
    section.appendChild(row);
    section.addEventListener("toggle", () => {
      if (!section.open) return;
      state.paintGroupId = group.id;
      ui.texturePalette.querySelectorAll("details.texture-group").forEach((el) => {
        if (el !== section) el.open = false;
      });
    });
    ui.texturePalette.appendChild(section);
  }
  ui.secretVisibilityRow.classList.toggle("hidden", !current?.canHide);
}

async function setOverlayVisibilityCells(cells, visibleToPlayers) {
  if (!cells.length) return;
  const data = await call("/map/overlays/visibility", {
    method: "PATCH",
    body: JSON.stringify({
      visibleToPlayers,
      cells
    })
  });
  state.overlays = data.overlays || state.overlays;
  renderMap();
  renderSecretsList();
}

async function renameOverlayGroup(cells, name) {
  if (!cells.length) return;
  const data = await call("/map/overlays/visibility", {
    method: "PATCH",
    body: JSON.stringify({
      name: String(name ?? "").trim(),
      cells
    })
  });
  state.overlays = data.overlays || state.overlays;
  renderMap();
  renderSecretsList();
}

/** Соседние по кресту клетки одного типа = один сундук/тайник (линия или квадрат) */
function groupOverlays(overlays) {
  const map = overlays || {};
  const visited = new Set();
  const groups = [];

  for (const cellKey of Object.keys(map)) {
    if (visited.has(cellKey)) continue;
    const start = map[cellKey];
    if (!start) continue;
    const [sx, sy] = cellKey.split(":").map(Number);
    const type = start.type;
    const cells = [];
    const queue = [{ x: sx, y: sy }];
    visited.add(cellKey);

    while (queue.length > 0) {
      const cur = queue.shift();
      cells.push(cur);
      for (const [nx, ny] of [
        [cur.x + 1, cur.y],
        [cur.x - 1, cur.y],
        [cur.x, cur.y + 1],
        [cur.x, cur.y - 1]
      ]) {
        const nk = key(nx, ny);
        if (visited.has(nk)) continue;
        const next = map[nk];
        if (!next || next.type !== type) continue;
        visited.add(nk);
        queue.push({ x: nx, y: ny });
      }
    }

    const visibleToPlayers = cells.every((c) => Boolean(map[key(c.x, c.y)]?.visibleToPlayers));
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const named = cells.map((c) => map[key(c.x, c.y)]?.name).find((n) => typeof n === "string" && n.trim());
    groups.push({
      type,
      cells,
      visibleToPlayers,
      name: named || (type === "stash" ? "Тайник" : "Сундук"),
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      size: cells.length
    });
  }

  groups.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  return groups;
}

function findOverlayGroupAt(x, y) {
  return groupOverlays(state.overlays).find((g) => g.cells.some((c) => c.x === x && c.y === y)) ?? null;
}

async function setOverlayVisibility(x, y, visibleToPlayers) {
  const group = findOverlayGroupAt(x, y);
  if (!group) return;
  await setOverlayVisibilityCells(group.cells, visibleToPlayers);
}

async function toggleOverlayVisibility(x, y) {
  const group = findOverlayGroupAt(x, y);
  if (!group) return;
  await setOverlayVisibilityCells(group.cells, !group.visibleToPlayers);
}

async function paintCell(x, y, textureId = state.paintTextureId) {
  const visibleFlag = ui.showToPlayersToggle?.checked !== false;
  const data = await call("/map/tiles", {
    method: "PUT",
    body: JSON.stringify({
      textureId,
      visibleToPlayers: visibleFlag,
      cells: [{ x, y }]
    })
  });
  state.tiles = data.tiles || {};
  state.overlays = data.overlays || {};
  if (data.visibleCells) {
    state.visibleCells = data.visibleCells;
  }

  const tex = PAINT_TEXTURES.find((t) => t.id === textureId);
  if (tex?.kind === "overlay") {
    const group = findOverlayGroupAt(x, y);
    if (group && group.size > 1) {
      await setOverlayVisibilityCells(group.cells, visibleFlag);
      return;
    }
  }

  renderMap();
  renderSecretsList();
}

function describeGroupShape(group) {
  const w = group.maxX - group.minX + 1;
  const h = group.maxY - group.minY + 1;
  if (group.size === 1) return "1 клетка";
  if (h === 1) return `гориз. линия ×${group.size}`;
  if (w === 1) return `верт. линия ×${group.size}`;
  if (w * h === group.size) return `прямоугольник ${w}×${h}`;
  return `${group.size} клеток`;
}

function renderSecretsList() {
  if (!ui.secretsList) return;
  ui.secretsList.innerHTML = "";
  const groups = groupOverlays(state.overlays);
  if (groups.length === 0) {
    ui.secretsList.innerHTML = '<div class="muted">Пока нет сундуков и тайников</div>';
    return;
  }
  for (const group of groups) {
    const typeRu = group.type === "stash" ? "Тайник" : "Сундук";
    const icon = OVERLAY_ICONS[group.type] ?? "✦";
    const row = document.createElement("div");
    row.className = "card stack";
    row.innerHTML = `
      <div class="row">
        <strong>${icon} ${group.name}</strong>
        <span class="pill">${typeRu}</span>
        <span class="pill">${describeGroupShape(group)}</span>
        <span class="pill">${group.visibleToPlayers ? "видят игроки" : "скрыт"}</span>
      </div>
      <div class="row">
        <input data-role="name" value="${escapeAttr(group.name)}" placeholder="Название" />
        <button type="button" data-action="rename">Переименовать</button>
      </div>
      <div class="row">
        <button type="button" class="primary" data-action="show">Показать игрокам</button>
        <button type="button" data-action="hide">Скрыть</button>
      </div>
    `;
    const nameInput = row.querySelector('[data-role="name"]');
    row.querySelector('[data-action="rename"]').addEventListener("click", () => {
      renameOverlayGroup(group.cells, nameInput.value);
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        renameOverlayGroup(group.cells, nameInput.value);
      }
    });
    row.querySelector('[data-action="show"]').addEventListener("click", () => {
      setOverlayVisibilityCells(group.cells, true);
    });
    row.querySelector('[data-action="hide"]').addEventListener("click", () => {
      setOverlayVisibilityCells(group.cells, false);
    });
    ui.secretsList.appendChild(row);
  }
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Лимит чекбоксов: нельзя выбрать больше max; лишние блокируются */
function bindLimitedChecks(root, selector, max, counterEl) {
  const limit = Math.max(0, Number(max) || 0);
  const sync = () => {
    const boxes = [...(root?.querySelectorAll(selector) || [])];
    const checked = boxes.filter((b) => b.checked).length;
    const atMax = limit > 0 && checked >= limit;
    boxes.forEach((b) => {
      const lock = atMax && !b.checked;
      b.disabled = lock;
      const label = b.closest("label");
      const card = b.closest(".lu-spell-card");
      label?.classList.toggle("is-locked", lock);
      label?.classList.toggle("selected", b.checked);
      card?.classList.toggle("is-locked", lock);
      card?.classList.toggle("selected", b.checked);
    });
    if (counterEl) {
      const prep = /подготов/i.test(counterEl.textContent || "") || counterEl.dataset.mode === "prep";
      counterEl.textContent =
        limit > 0 ? (prep ? `Подготовка ${checked} / ${limit}` : `Выбрано ${checked} из ${limit}`) : "";
    }
  };
  root?.querySelectorAll(selector).forEach((box) => {
    box.addEventListener("change", () => {
      const boxes = [...root.querySelectorAll(selector)];
      const checked = boxes.filter((b) => b.checked);
      if (limit > 0 && checked.length > limit) {
        box.checked = false;
      }
      sync();
    });
  });
  sync();
  return sync;
}

function featurePicksSectionHtml(o, ch) {
  const feats = o.classFeaturesForLevel || [];
  const budget = o.featureChoiceBudget || [];
  const skillsUntrained = o.skillsForPick?.untrained || (o.skills || []).filter((s) => !Number(s.proficiencyLevel));
  const skillsProficient = o.skillsForPick?.proficient || (o.skills || []).filter((s) => Number(s.proficiencyLevel) > 0);
  const picks = ch.featurePicks || {};

  const autoHtml = feats
    .filter((f) => !f.pick || f.pickKind === "ack")
    .map(
      (f) => `<div class="lu-feature-card">
        <div class="lu-feat-name">${escapeHtml(f.name)} <span class="pill">автоматически</span></div>
        <div class="muted">${escapeHtml(f.description || "")}</div>
      </div>`
    )
    .join("");

  const choiceHtml = budget
    .map((b) => {
      const selected = picks[b.featureId] || [];
      if (b.pickKind === "skills") {
        const pool = b.pickFrom === "proficientSkills" ? skillsProficient : skillsUntrained;
        const inputType = b.pickLimit === 1 ? "radio" : "checkbox";
        const name = `luFeatPick_${b.featureId}`;
        return `<div class="lu-pick-block" data-pick-feature="${escapeAttr(b.featureId)}" data-pick-limit="${b.pickLimit}">
          <div class="lu-feat-name">${escapeHtml(b.name)} — выберите ${b.pickLimit}</div>
          <div class="muted lu-pick-counter" data-pick-counter></div>
          <div class="lu-skill-list">
            ${
              pool.length
                ? pool
                    .map(
                      (s) => `<label class="lu-check">
                        <input type="${inputType}" name="${escapeAttr(name)}" data-pick-value="${escapeAttr(s.key)}"
                          ${selected.includes(s.key) ? "checked" : ""}/>
                        ${escapeHtml(skillLabelRu(s))}
                      </label>`
                    )
                    .join("")
                : `<div class="muted">Нет подходящих навыков</div>`
            }
          </div>
        </div>`;
      }
      if (b.pickKind === "options") {
        const inputType = b.pickLimit === 1 ? "radio" : "checkbox";
        const name = `luFeatPick_${b.featureId}`;
        return `<div class="lu-pick-block" data-pick-feature="${escapeAttr(b.featureId)}" data-pick-limit="${b.pickLimit}">
          <div class="lu-feat-name">${escapeHtml(b.name)} — выберите ${b.pickLimit}</div>
          <div class="muted lu-pick-counter" data-pick-counter></div>
          <div class="lu-feature-list">
            ${(b.options || [])
              .map(
                (opt) => `<label class="lu-feature-card pick">
                  <input type="${inputType}" name="${escapeAttr(name)}" data-pick-value="${escapeAttr(opt.id)}"
                    ${selected.includes(opt.id) || selected.includes(opt.name) ? "checked" : ""}/>
                  <div>
                    <div class="lu-feat-name">${escapeHtml(opt.name)}</div>
                    <div class="muted">${escapeHtml(opt.description || "")}</div>
                  </div>
                </label>`
              )
              .join("")}
          </div>
        </div>`;
      }
      return "";
    })
    .join("");

  const emptyHint =
    o.asiAvailable || o.epicBoonAvailable
      ? `<div class="lu-skip"><strong>Новых умений класса нет</strong>На ур. ${o.advance?.toClassLevel} у «${escapeHtml(
          o.advance?.className || ""
        )}» только ASI/черта — это уже шаг «Улучшение».</div>`
      : `<div class="muted">На этом уровне класса новых умений нет.</div>`;

  return `
    <div class="lu-section-title">${luIcon("improve")} Умения уровня</div>
    <p class="muted" style="margin-top:0">Что даёт <strong>${escapeHtml(o.advance?.className || "класс")}</strong> на ур. <strong>${o.advance?.toClassLevel ?? "—"}</strong>${
      ch.advanceClass?.subclass ? ` · ${escapeHtml(ch.advanceClass.subclass)}` : ""
    }. ASI и выбор подкласса сюда не дублируются.</p>
    <div class="lu-feature-list">${autoHtml || emptyHint}</div>
    ${choiceHtml ? `<div class="field-label" style="margin-top:12px">Ваш выбор</div>${choiceHtml}` : ""}
    <label class="field-label" style="margin-top:12px">Заметка в лист (необязательно)</label>
    <textarea id="luClassFeatureNote" rows="2" placeholder="Например: выбрали стиль Дуэлянт — кратко для себя">${escapeHtml(ch.classFeatureNote || "")}</textarea>`;
}

const STAGE_HEIGHT_KEY = "dnd_master_stage_height_px";
const MAP_ZOOM_KEY = "dnd_master_map_zoom";

function fitMapCellSize(wrapEl, cols, rows, { gap = 1, min = 5, max = 56 } = {}) {
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

function updateMapZoomLabel() {
  if (!ui.mapZoomLabel) return;
  ui.mapZoomLabel.textContent = `${Math.round(state.mapZoom * 100)}%`;
}

function applyMapFit(wrapEl, gridEl, cols, rows) {
  if (!wrapEl || !gridEl) return;
  const fit = fitMapCellSize(wrapEl, cols, rows, { max: 56 });
  state.mapFitBase = fit;
  const zoom = Math.max(1, Math.min(4, Number(state.mapZoom) || 1));
  state.mapZoom = zoom;
  const size = Math.min(64, Math.max(5, Math.round(fit * zoom * 10) / 10));
  wrapEl.style.setProperty("--map-cell-size", `${size}px`);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  wrapEl.classList.toggle("map-compact", size < 11);
  wrapEl.classList.toggle("map-scroll", zoom > 1.01);
  updateMapZoomLabel();
  return size;
}

function setMapZoom(next) {
  state.mapZoom = Math.max(1, Math.min(4, Math.round(Number(next) * 100) / 100));
  localStorage.setItem(MAP_ZOOM_KEY, String(state.mapZoom));
  const wrap = ui.mapGrid?.closest(".map-wrap");
  if (wrap && state.mapFitCols && state.mapFitRows) {
    applyMapFit(wrap, ui.mapGrid, state.mapFitCols, state.mapFitRows);
  }
}

function bumpMapZoom(delta) {
  const step = delta > 0 ? 0.25 : -0.25;
  setMapZoom((state.mapZoom || 1) + step);
}

function applySavedStageHeight() {
  const layout = document.getElementById("screenApp");
  const stage = layout?.querySelector(".master-stage");
  const dock = layout?.querySelector(".master-dock");
  if (!layout || !stage || !dock) return;
  const saved = Number(localStorage.getItem(STAGE_HEIGHT_KEY));
  if (!Number.isFinite(saved) || saved < 180) return;
  const maxH = Math.max(240, layout.clientHeight - 64);
  const h = Math.max(180, Math.min(maxH, saved));
  stage.style.flex = `0 0 ${h}px`;
  dock.style.flex = "1 1 auto";
  dock.style.minHeight = "48px";
}

function setupMasterSplitter() {
  const layout = document.getElementById("screenApp");
  const stage = layout?.querySelector(".master-stage");
  const dock = layout?.querySelector(".master-dock");
  const handle = ui.masterSplitter;
  if (!layout || !stage || !dock || !handle) return;

  applySavedStageHeight();

  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const rect = layout.getBoundingClientRect();
    const y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
    // Оставляем снизу только тонкую полоску дока — карту можно почти на весь экран
    const maxH = Math.max(240, layout.clientHeight - 56);
    const h = Math.max(160, Math.min(maxH, y - 4));
    stage.style.flex = `0 0 ${h}px`;
    dock.style.flex = "1 1 auto";
    dock.style.minHeight = "48px";
    const wrap = ui.mapGrid?.closest(".map-wrap");
    if (wrap && state.mapFitCols && state.mapFitRows) {
      applyMapFit(wrap, ui.mapGrid, state.mapFitCols, state.mapFitRows);
    }
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    layout.classList.remove("is-resizing-stage");
    const h = stage.getBoundingClientRect().height;
    localStorage.setItem(STAGE_HEIGHT_KEY, String(Math.round(h)));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  handle.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    layout.classList.add("is-resizing-stage");
    handle.setPointerCapture?.(e.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

let mapFitObserver = null;
function ensureMapFitObserver() {
  const wrap = ui.mapGrid?.closest(".map-wrap");
  if (!wrap || mapFitObserver) return;
  mapFitObserver = new ResizeObserver(() => {
    if (!state.mapFitCols || !state.mapFitRows) return;
    applyMapFit(wrap, ui.mapGrid, state.mapFitCols, state.mapFitRows);
  });
  mapFitObserver.observe(wrap);
}

function renderMap() {
  const width = Math.max(1, Math.min(80, state.mapWidth || 40));
  const height = Math.max(1, Math.min(60, state.mapHeight || 30));
  state.mapFitCols = width;
  state.mapFitRows = height;
  const wrap = ui.mapGrid?.closest(".map-wrap");
  if (wrap) applyMapFit(wrap, ui.mapGrid, width, height);
  ensureMapFitObserver();

  const visibleSet = new Set(state.visibleCells.map((c) => key(c.x, c.y)));
  const tokenMap = new Map();
  for (const t of state.tokens) {
    tokenMap.set(key(t.position.x, t.position.y), t);
  }

  ui.mapGrid.innerHTML = "";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = document.createElement("div");
      const cellKey = key(x, y);
      const tileId = state.tiles[cellKey];
      const overlay = state.overlays[cellKey];
      const classes = ["cell"];
      if (visibleSet.has(cellKey)) classes.push("visible");
      if (tileId) classes.push(`tex-${tileId}`);
      if (state.dragTokenId) classes.push("drop-target");
      cell.className = classes.join(" ");
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);

      if (tileId && TILE_ICONS[tileId] && !OVERLAY_ICONS[tileId]) {
        const label = document.createElement("span");
        label.className = "tile-label";
        label.textContent = TILE_ICONS[tileId];
        cell.appendChild(label);
      }

      if (overlay) {
        const group = findOverlayGroupAt(x, y);
        const mark = document.createElement("span");
        mark.className = `overlay-mark ${overlay.type}${overlay.visibleToPlayers ? "" : " hidden-from-players"}`;
        const labelName = group?.name || overlay.name || (overlay.type === "stash" ? "Тайник" : "Сундук");
        mark.title = overlay.visibleToPlayers
          ? `${labelName} (видят игроки)`
          : `${labelName} (только мастер)`;
        mark.textContent = OVERLAY_ICONS[overlay.type] ?? "✦";
        cell.appendChild(mark);
      }

      const token = tokenMap.get(cellKey);
      if (token) {
        const node = document.createElement("div");
        node.className = `token ${token.type}${state.dragTokenId === token.id ? " dragging" : ""}`;
        node.title = `${token.name} · перетащите`;
        node.dataset.tokenId = token.id;
        if (token.portraitUrl) {
          node.classList.add("has-portrait");
          node.style.backgroundImage = `url("${token.portraitUrl}")`;
          node.innerHTML = `<span class="token-name-tag">${escapeHtml(token.name.slice(0, 8))}</span>`;
        } else {
          node.textContent = token.name.slice(0, 2).toUpperCase();
        }
        node.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          state.dragTokenId = token.id;
          state.isPainting = false;
          node.classList.add("dragging");
        });
        cell.appendChild(node);
      }

      cell.addEventListener("mousedown", (e) => {
        if (state.dragTokenId) return;
        if (e.button === 0) {
          e.preventDefault();
          state.isPainting = true;
          state.eraseStroke = false;
          paintCell(x, y);
          return;
        }
        if (e.button === 2) {
          e.preventDefault();
          state.isPainting = true;
          state.eraseStroke = true;
          paintCell(x, y, "erase");
        }
      });
      cell.addEventListener("mouseenter", () => {
        if (state.isPainting && !state.dragTokenId) {
          paintCell(x, y, state.eraseStroke ? "erase" : state.paintTextureId);
        }
      });
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      ui.mapGrid.appendChild(cell);
    }
  }
  renderSecretsList();
  requestAnimationFrame(() => {
    if (wrap) applyMapFit(wrap, ui.mapGrid, width, height);
  });
}

window.addEventListener("mouseup", async (e) => {
  state.isPainting = false;
  state.eraseStroke = false;
  if (!state.dragTokenId) return;
  const tokenId = state.dragTokenId;
  state.dragTokenId = null;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el?.closest?.(".cell");
  if (cell?.dataset?.x != null && cell?.dataset?.y != null) {
    try {
      await call(`/map/tokens/${tokenId}/move`, {
        method: "PATCH",
        body: JSON.stringify({
          position: { x: Number(cell.dataset.x), y: Number(cell.dataset.y) }
        })
      });
    } catch (error) {
      console.error(error);
    }
  }
  await syncVision();
});

function renderTokenPanel() {
  ui.tokenPanel.innerHTML = "";
  const inCombat = new Set((state.combat?.combatants || []).map((c) => c.tokenId));
  const combatTokens = state.tokens.filter((t) => t.type !== "player");
  const heroes = state.tokens.filter((t) => t.type === "player");
  for (const token of [...heroes, ...combatTokens]) {
    const row = document.createElement("div");
    row.className = "card stack";
    const portrait = token.portraitUrl
      ? `<img class="hero-thumb" src="${escapeAttr(token.portraitUrl)}" alt="" />`
      : "";
    const cbt = (state.combat?.combatants || []).find((c) => c.tokenId === token.id);
    const initPill = cbt
      ? cbt.status === "rolled"
        ? `<span class="pill">иниц. ${cbt.total}</span>`
        : `<span class="pill">ждёт иниц.</span>`
      : "";
    const npc = findNpcForToken(token);
    const sheetBtn = npc
      ? `<button type="button" data-npc-sheet="${escapeAttr(token.id)}" class="primary" title="Статы, атаки, заметки">Карточка</button>`
      : token.type !== "player"
        ? `<button type="button" data-npc-sheet="${escapeAttr(token.id)}" title="Нет привязанного NPC — показать по имени">Карточка</button>`
        : "";
    row.innerHTML = `
      <div class="row">
        ${portrait}
        <strong>${escapeHtml(token.name)}</strong>
        <span class="pill">${TOKEN_TYPE_RU[token.type] ?? token.type}</span>
        ${initPill}
      </div>
      <div class="row">
        <span>ХП: <span class="mono">${token.hpCurrent}/${token.hpMax}</span></span>
        ${npc ? `<span class="pill">КД ${npc.ac ?? "—"}</span>` : ""}
      </div>
      <div class="row">
        <button data-action="-1">−1</button>
        <button data-action="-5">−5</button>
        <button data-action="+1">+1</button>
        <button data-action="+5">+5</button>
        ${sheetBtn}
        ${
          state.combat?.active && !inCombat.has(token.id)
            ? `<button type="button" data-enlist="${escapeAttr(token.id)}">В бой</button>`
            : ""
        }
        ${
          cbt?.status === "pending"
            ? `<button type="button" data-roll-init="${escapeAttr(token.id)}" class="primary">Иниц.</button>`
            : ""
        }
      </div>
    `;
    row.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (token.characterId) {
          await call("/characters/hp", {
            method: "POST",
            body: JSON.stringify({ characterId: token.characterId, action: btn.dataset.action })
          });
          await syncVision();
          renderHeroesList();
        } else {
          await quickHp(token.id, btn.dataset.action);
        }
      });
    });
    row.querySelector("[data-enlist]")?.addEventListener("click", async () => {
      await enlistTokens([token.id]);
    });
    row.querySelector("[data-roll-init]")?.addEventListener("click", async () => {
      await rollInitForToken(token.id);
    });
    row.querySelector("[data-npc-sheet]")?.addEventListener("click", async () => {
      setRollTargetFromCombatant({
        name: token.name,
        type: token.type,
        characterId: token.characterId || null,
        npcId: token.npcId || npc?.id || null,
        tokenId: token.id
      });
      await openNpcSheetForToken(token);
    });
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      setRollTargetFromCombatant({
        name: token.name,
        type: token.type,
        characterId: token.characterId || null,
        npcId: token.npcId || npc?.id || null,
        tokenId: token.id
      });
    });
    ui.tokenPanel.appendChild(row);
  }
}

function updateCombatStatus() {
  const c = state.combat;
  if (!ui.combatStatus) return;
  if (!c?.active) {
    ui.combatStatus.textContent = "Бой не начат — кнопка «Бой» над картой";
    return;
  }
  const pending = c.pending?.length || 0;
  const rolled = c.order?.length || 0;
  const cur = c.current?.name ? ` · ход: ${c.current.name}` : "";
  ui.combatStatus.textContent = `Активен · раунд ${c.round || 1} · бросили ${rolled}${pending ? ` · ждут ${pending}` : ""}${cur}`;
}

function openCombatPicker() {
  if (!ui.combatModal || !ui.combatPickList) return;
  ui.combatModalError.textContent = "";
  const enrolled = new Set((state.combat?.combatants || []).map((c) => c.tokenId));
  ui.combatPickList.innerHTML = "";
  if (!state.tokens.length) {
    ui.combatPickList.innerHTML = `<div class="muted">На карте нет токенов</div>`;
  }
  for (const token of state.tokens) {
    const row = document.createElement("label");
    row.className = "combat-pick-row";
    const already = enrolled.has(token.id);
    row.innerHTML = `
      <input type="checkbox" data-token-id="${escapeAttr(token.id)}" ${already ? "" : "checked"} ${already ? "disabled" : ""} />
      <span class="combat-pick-name">${escapeHtml(token.name)}</span>
      <span class="pill">${TOKEN_TYPE_RU[token.type] ?? token.type}</span>
      ${already ? `<span class="pill">уже в бою</span>` : ""}
    `;
    ui.combatPickList.appendChild(row);
  }
  ui.combatModal.classList.remove("hidden");
}

function closeCombatPicker() {
  ui.combatModal?.classList.add("hidden");
}

function selectedCombatTokenIds({ onlyNew = false } = {}) {
  const enrolled = new Set((state.combat?.combatants || []).map((c) => c.tokenId));
  return [...(ui.combatPickList?.querySelectorAll("input[data-token-id]") || [])]
    .filter((el) => el.checked && !el.disabled)
    .map((el) => el.dataset.tokenId)
    .filter((id) => (onlyNew ? !enrolled.has(id) : true));
}

async function enlistTokens(tokenIds) {
  const ids = [...new Set(tokenIds.filter(Boolean))];
  if (!ids.length) throw new Error("Выберите участников");
  const data = await call("/combat/encounter", {
    method: "POST",
    body: JSON.stringify({ tokenIds: ids })
  });
  state.combat = data.combat;
  updateCombatStatus();
  renderCombatInitiativeBar();
  renderTokenPanel();
  return data;
}

async function confirmCombatPicker() {
  try {
    ui.combatModalError.textContent = "";
    const ids = selectedCombatTokenIds();
    await enlistTokens(ids);
    closeCombatPicker();
    // Автоматически кидаем за монстров/NPC, игроки кидают сами
    await call("/combat/initiative/auto", { method: "POST", body: JSON.stringify({}) });
    await syncVision();
  } catch (error) {
    ui.combatModalError.textContent = String(error.message || error);
  }
}

async function rollInitForToken(tokenId) {
  await call("/combat/initiative/roll", {
    method: "POST",
    body: JSON.stringify({ tokenId, forceRoll: true })
  });
  await syncVision();
}

async function autoRollNpcs() {
  await call("/combat/initiative/auto", { method: "POST", body: JSON.stringify({}) });
  await syncVision();
}

async function nextTurn() {
  await call("/combat/turn/next", { method: "POST", body: "{}" });
  await syncVision();
}

async function endCombatEncounter() {
  if (!state.combat?.active) {
    if (ui.combatStatus) ui.combatStatus.textContent = "Бой сейчас не идёт";
    return;
  }
  if (!confirm("Прервать бой и убрать полосу инициативы? Состояние карт/ХП сохранится.")) return;
  await call("/combat/end", { method: "POST", body: JSON.stringify({ reason: "force" }) });
  await syncVision();
  if (ui.combatStatus) ui.combatStatus.textContent = "Бой прерван — инициатива сброшена";
}

function syncForceEndCombatButton() {
  const active = Boolean(state.combat?.active);
  ui.forceEndCombatBtn?.classList.toggle("hidden", !active);
  if (ui.endCombatBtn) ui.endCombatBtn.disabled = !active;
}

function skillBonus(character, skill) {
  const abs = character.abilities?.[skill.baseAbility];
  const mod = abs?.modifier ?? 0;
  const prof = Number(skill.proficiencyLevel || 0) * (character.proficiencyBonus || 2);
  return mod + prof;
}

function fmtMod(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

function equipIcon(text) {
  const t = String(text || "").toLowerCase();
  if (/кольчуг|доспех|латы|кирас|шкурн|кожан/.test(t)) return "🛡️";
  if (/щит/.test(t)) return "🔰";
  if (/меч|скимитар|клинок/.test(t)) return "⚔️";
  if (/копь|копье|пика|трезуб/.test(t)) return "🗡️";
  if (/лук|арбалет|стрел|болт/.test(t)) return "🏹";
  if (/кинжал/.test(t)) return "🔪";
  if (/символ|фокус|амулет|ожерел/.test(t)) return "✝️";
  if (/набор|рюкзак|сумк/.test(t)) return "🎒";
  if (/инструмент|каллиграф/.test(t)) return "✒️";
  if (/книг|молитв|пергамент/.test(t)) return "📖";
  if (/роба|одежд|плащ/.test(t)) return "🧥";
  if (/зм|см|мм|монет|бабк|золот|серебр/.test(t)) return "🪙";
  if (/зелье|флакон/.test(t)) return "🧪";
  if (/кольц/.test(t)) return "💍";
  return "📦";
}

function weaponIcon(name) {
  const t = String(name || "").toLowerCase();
  if (/лук|арбалет/.test(t)) return "🏹";
  if (/копь|копье/.test(t)) return "🗡️";
  if (/кинжал/.test(t)) return "🔪";
  if (/булав|молот|топор/.test(t)) return "🪓";
  return "⚔️";
}

function sectionTitle(icon, title) {
  return `<div class="hs-title"><span class="hs-ico" aria-hidden="true">${icon}</span><span>${title}</span></div>`;
}

async function openHeroCard(characterId) {
  const c = await call(`/characters/${characterId}`);
  const abs = c.abilities || {};
  const ABIL_RU = {
    str: { label: "Сила", short: "Сил", icon: "💪" },
    dex: { label: "Ловкость", short: "Лов", icon: "🤸" },
    con: { label: "Телосложение", short: "Тел", icon: "🫀" },
    int: { label: "Интеллект", short: "Инт", icon: "🧠" },
    wis: { label: "Мудрость", short: "Мдр", icon: "👁️" },
    cha: { label: "Харизма", short: "Хар", icon: "✨" }
  };

  const allSkills = c.skills || [];
  const profSkills = allSkills.filter((s) => Number(s.proficiencyLevel) > 0);
  const otherSkills = allSkills.filter((s) => !Number(s.proficiencyLevel));

  const skillChip = (s, strong) => {
    const bonus = skillBonus(c, s);
    const label = skillLabelRu(s);
    const skillKey = String(s.key || s.label || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
    const ability = String(s.baseAbility || "").toLowerCase();
    return `<button type="button" class="hs-chip hs-rollable ${strong ? "hs-chip-hot" : ""}" title="${escapeAttr(`${label} (${(s.baseAbility || "").toUpperCase()}) · клик — бросок`)}" data-roll="skill" data-skill-key="${escapeAttr(skillKey)}" data-ability="${escapeAttr(ability)}" data-roll-label="${escapeAttr(label)}">
      <span class="hs-chip-label">${escapeHtml(label)}</span>
      <span class="hs-chip-val">${fmtMod(bonus)}</span>
    </button>`;
  };

  const weaponsHtml = (c.weapons || [])
    .map(
      (w) => `
      <div class="hs-item">
        <div class="hs-item-ico">${weaponIcon(w.name)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(w.name)}</div>
          <div class="hs-item-meta">${escapeHtml(w.damage || "—")}${w.proficient ? " · владение" : ""}</div>
        </div>
      </div>`
    )
    .join("");

  const equipmentHtml = (c.equipment || [])
    .map(
      (e) => `
      <div class="hs-item hs-item-soft">
        <div class="hs-item-ico">${equipIcon(e)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(e)}</div>
        </div>
      </div>`
    )
    .join("");

  const inventoryHtml = (c.inventory || [])
    .map(
      (i) => `
      <div class="hs-item hs-item-soft">
        <div class="hs-item-ico">${equipIcon(i.name)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(i.name)}</div>
          <div class="hs-item-meta">${escapeHtml(i.rarityLabel || i.type || "предмет")}</div>
        </div>
      </div>`
    )
    .join("");

  const spellChips = (c.preparedSpellsDetailed?.length
    ? c.preparedSpellsDetailed
    : (c.preparedSpells || []).map((s) => ({ name: s, summary: "", description: "" }))
  )
    .map((sp) => {
      const name = sp.name || sp.nameEn || "Заклинание";
      const meta = [sp.levelLabel, sp.schoolLabel, sp.castingTime, sp.range]
        .filter(Boolean)
        .join(" · ");
      const body = sp.description || sp.summary || "";
      const higher = sp.higherLevel
        ? `<div class="hs-spell-higher"><strong>На высоких кругах:</strong> ${escapeHtml(sp.higherLevel)}</div>`
        : "";
      return `<article class="hs-spell" title="${escapeAttr(sp.nameEn || name)}">
        <div class="hs-spell-head">
          <span class="hs-spell-ico">✨</span>
          <div class="hs-spell-titles">
            <div class="hs-spell-name">${escapeHtml(name)}</div>
            ${meta ? `<div class="hs-spell-meta">${escapeHtml(meta)}</div>` : ""}
          </div>
        </div>
        ${sp.summary && sp.summary !== body ? `<div class="hs-spell-summary">${escapeHtml(sp.summary)}</div>` : ""}
        ${body ? `<div class="hs-spell-desc">${escapeHtml(body)}</div>` : `<div class="hs-spell-desc muted">Описание не найдено</div>`}
        ${higher}
      </article>`;
    })
    .join("");

  const coins = c.coins || {};
  const coinParts = [
    coins.pp ? `${coins.pp} пм` : null,
    coins.gp ? `${coins.gp} зм` : null,
    coins.ep ? `${coins.ep} эм` : null,
    coins.sp ? `${coins.sp} см` : null,
    coins.cp ? `${coins.cp} мм` : null
  ].filter(Boolean);

  const portrait = c.portraitUrl
    ? `<img class="hero-portrait" src="${escapeAttr(c.portraitUrl)}" alt="${escapeAttr(c.name)}" />`
    : `<div class="hero-portrait placeholder">${escapeHtml((c.name || "?").slice(0, 1))}</div>`;

  const textBlock = (icon, title, lines) => {
    if (!lines?.length) return "";
    return `<section class="hs-section">
      ${sectionTitle(icon, title)}
      <div class="hs-prose">${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>
    </section>`;
  };

  const subclassFeatBlock = () => {
    const items = c.subclassFeaturesTaken || [];
    if (!items.length) return "";
    return `<section class="hs-section">
      ${sectionTitle("⚔️", "Особенности подкласса")}
      <div class="hs-subfeat-list">
        ${items
          .map(
            (f) => `<article class="hs-subfeat">
              <div class="hs-subfeat-name">${escapeHtml(f.name)}
                <span class="hs-tag">${escapeHtml(f.subclass || "")}</span>
                <span class="hs-tag">кл. ${escapeHtml(String(f.classLevel ?? ""))}</span>
              </div>
              ${f.description ? `<div class="hs-subfeat-desc">${escapeHtml(f.description)}</div>` : ""}
            </article>`
          )
          .join("")}
      </div>
    </section>`;
  };

  ui.heroModalBody.innerHTML = `
    <div class="hs-top">
      <div class="hs-top-main">
        ${portrait}
        <div class="hs-identity">
          <div class="hs-name-row">
            <h2 class="hs-name">${escapeHtml(c.name)}</h2>
            ${c.isTest ? '<span class="hs-badge">тест</span>' : ""}
            ${c.inspiration ? '<span class="hs-badge hs-badge-ok">вдохновение</span>' : ""}
          </div>
          <div class="hs-tags">
            <span class="hs-tag">🧬 ${escapeHtml(c.race || "—")}</span>
            <span class="hs-tag">⚔️ ${escapeHtml(c.classes ? c.classes.map((x) => `${x.name} ${x.level}`).join(" / ") : `${c.className || "—"} ${c.level ?? ""}`)}</span>
            <span class="hs-tag">⚖️ ${escapeHtml(c.alignment || "—")}</span>
            <span class="hs-tag">📜 ${escapeHtml(c.background || "—")}</span>
          </div>
          <div class="hs-player">👤 Игрок: <strong>${escapeHtml(c.playerName || "—")}</strong></div>
        </div>
      </div>
      <button type="button" id="closeHeroCardBtn" class="hs-close">Закрыть</button>
    </div>

    <section class="hs-section hs-xp-section" id="heroXpSection"></section>

    <div class="hs-vitals">
      <div class="hs-vital" title="Класс брони"><span class="hs-vital-ico">🛡️</span><div class="hs-vital-text"><div class="hs-vital-label">Класс брони</div><div class="hs-vital-val">${c.vitals?.ac ?? "—"}</div></div></div>
      <div class="hs-vital hs-vital-hp" title="Хиты"><span class="hs-vital-ico">❤️</span><div class="hs-vital-text"><div class="hs-vital-label">ХП</div><div class="hs-vital-val">${c.vitals?.hpCurrent ?? "—"}<span class="hs-vital-sub">/${c.vitals?.hpMax ?? "—"}</span></div></div></div>
      <div class="hs-vital" title="Скорость"><span class="hs-vital-ico">💨</span><div class="hs-vital-text"><div class="hs-vital-label">Скор.</div><div class="hs-vital-val">${c.vitals?.speed ?? "—"}<span class="hs-vital-sub">фт</span></div></div></div>
      <div class="hs-vital" title="Бонус мастерства"><span class="hs-vital-ico">⭐</span><div class="hs-vital-text"><div class="hs-vital-label">БМ</div><div class="hs-vital-val">+${c.proficiencyBonus ?? 2}</div></div></div>
      <div class="hs-vital" title="Кость хитов"><span class="hs-vital-ico">🎲</span><div class="hs-vital-text"><div class="hs-vital-label">Кость</div><div class="hs-vital-val">${escapeHtml(c.vitals?.hitDie || "—")}</div></div></div>
      <div class="hs-vital" title="Монеты"><span class="hs-vital-ico">🪙</span><div class="hs-vital-text"><div class="hs-vital-label">Золото</div><div class="hs-vital-val hs-vital-coins">${escapeHtml(coinParts.join(" · ") || "0")}</div></div></div>
    </div>

    <section class="hs-section">
      ${sectionTitle("📊", "Характеристики")}
      <div class="hs-abil-grid">
        ${["str", "dex", "con", "int", "wis", "cha"]
          .map((k) => {
            const a = abs[k] || {};
            const meta = ABIL_RU[k];
            return `<button type="button" class="hs-abil hs-rollable" title="${escapeAttr(`${meta.label} · клик — бросок`)}" data-roll="ability" data-ability="${k}" data-roll-label="${escapeAttr(meta.label)}">
              <div class="hs-abil-ico">${meta.icon}</div>
              <div class="hs-abil-label">${meta.short}</div>
              <div class="hs-abil-score">${a.score ?? "—"}</div>
              <div class="hs-abil-mod">${fmtMod(a.modifier)}</div>
            </button>`;
          })
          .join("")}
      </div>
    </section>

    <section class="hs-section">
      ${sectionTitle("🎯", "Навыки")}
      <div class="hs-subtitle">Владения</div>
      <div class="hs-chip-grid">${profSkills.map((s) => skillChip(s, true)).join("") || '<span class="muted">нет</span>'}</div>
      ${
        otherSkills.length
          ? `<div class="hs-subtitle">Прочие</div><div class="hs-chip-grid hs-chip-grid-dim">${otherSkills
              .map((s) => skillChip(s, false))
              .join("")}</div>`
          : ""
      }
    </section>

    ${
      weaponsHtml
        ? `<section class="hs-section">${sectionTitle("⚔️", "Оружие")}<div class="hs-item-grid">${weaponsHtml}</div></section>`
        : ""
    }
    ${
      equipmentHtml
        ? `<section class="hs-section">${sectionTitle("🎒", "Снаряжение")}<div class="hs-item-grid">${equipmentHtml}</div></section>`
        : ""
    }
    ${
      c.preparedSpells?.length
        ? `<section class="hs-section">
            ${sectionTitle("🔮", "Заклинания")}
            <div class="hs-vitals hs-vitals-compact">
              <div class="hs-vital" title="Сложность спасброска от ваших заклинаний"><span class="hs-vital-ico">📜</span><div class="hs-vital-text"><div class="hs-vital-label">Спасбросок</div><div class="hs-vital-val">${c.spellcasting?.saveDC ?? "—"}</div></div></div>
              <div class="hs-vital" title="Бонус атаки заклинанием"><span class="hs-vital-ico">🎯</span><div class="hs-vital-text"><div class="hs-vital-label">Атака</div><div class="hs-vital-val">+${c.spellcasting?.attackBonus ?? "—"}</div></div></div>
              <div class="hs-vital" title="Ячейки заклинаний 1 круга"><span class="hs-vital-ico">🔷</span><div class="hs-vital-text"><div class="hs-vital-label">Ячейки 1</div><div class="hs-vital-val">${c.spellcasting?.slots1 ?? 0}</div></div></div>
            </div>
            <div class="hs-subtitle">Подготовленные</div>
            <div class="hs-spell-list">${spellChips}</div>
          </section>`
        : ""
    }
    ${
      inventoryHtml
        ? `<section class="hs-section">${sectionTitle("💎", "Инвентарь и лут")}<div class="hs-item-grid">${inventoryHtml}</div></section>`
        : ""
    }
    ${subclassFeatBlock()}
    ${textBlock("⚜️", "Умения и черты", c.traits)}
    ${textBlock("🧩", "Особенности", c.feats)}
    ${textBlock("🎭", "Характер", c.personality)}
    ${textBlock("🔗", "Привязанности", c.bonds)}
    ${textBlock("📖", "Предыстория", c.backgroundStory)}
    ${textBlock("📝", "Заметки", (c.notes || []).slice(0, 6))}

    <section class="hs-section hs-actions">
      ${sectionTitle("🛠️", "Действия мастера")}
      <div class="hs-action-row">
        <button type="button" data-hp="-1">❤️ −1</button>
        <button type="button" data-hp="-5">❤️ −5</button>
        <button type="button" data-hp="+1">💚 +1</button>
        <button type="button" data-hp="+5">💚 +5</button>
      </div>
      <button type="button" id="heroPlaceTokenBtn" class="hs-full-btn">🗺️ Поставить / обновить токен на карте</button>
    </section>
  `;
  ui.heroModal.classList.remove("hidden");
  state.openHeroId = c.id;
  if (ui.heroModalBody) ui.heroModalBody.dataset.characterId = c.id;
  document.getElementById("closeHeroCardBtn")?.addEventListener("click", closeHeroCard);
  await renderHeroXpBar(c, { allowGrantXp: true });
  bindSheetRolls(ui.heroModalBody, {
    onRoll: ({ kind, ability, skillKey, label }) => {
      requestMasterRoll({
        kind,
        ability,
        skillKey,
        label,
        characterId: c.id
      }).catch((error) => showMasterRollToast(String(error.message || error)));
    }
  });
  ui.heroModalBody.querySelectorAll("[data-hp]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await call("/characters/hp", {
          method: "POST",
          body: JSON.stringify({ characterId: c.id, action: btn.dataset.hp })
        });
        await syncVision();
        openHeroCard(c.id);
      } catch (error) {
        alert(String(error.message || error));
      }
    });
  });
  document.getElementById("heroPlaceTokenBtn")?.addEventListener("click", async () => {
    try {
      await call("/characters/place-token", {
        method: "POST",
        body: JSON.stringify({ characterId: c.id, position: { x: 2, y: 2 } })
      });
      await syncVision();
    } catch (error) {
      alert(String(error.message || error));
    }
  });
}

function closeHeroCard() {
  ui.heroModal?.classList.add("hidden");
  state.openHeroId = null;
  if (ui.heroModalBody) {
    delete ui.heroModalBody.dataset.characterId;
    ui.heroModalBody.innerHTML = "";
  }
}

const levelUpState = {
  characterId: null,
  options: null,
  step: 0,
  choices: {},
  allowGrantXp: true
};

async function renderHeroXpBar(character, { allowGrantXp = true, mountEl = null } = {}) {
  const mount = mountEl || document.getElementById("heroXpSection");
  if (!mount || !character) return;
  const characterId = character.id;
  state.openHeroId = characterId;

  // Базовый расчёт всегда по таблице 5e — не зависим от options API
  let progress = xpProgressLocal(character.experience, character.level);
  if (character.progress && Number(character.progress.nextFloor) > 0) {
    progress = character.progress;
  } else {
    try {
      const opts = await call(`/characters/${characterId}/level-up/options`);
      levelUpState.options = opts;
      if (opts?.progress && Number(opts.progress.nextFloor) > 0) {
        progress = opts.progress;
      }
    } catch (err) {
      console.warn("level-up options:", err?.message || err);
    }
  }

  // Модалку могли закрыть пока ждали options
  if (state.openHeroId !== characterId || !mount.isConnected) return;

  const can = Boolean(progress.canLevelUp);
  const into = progress.into ?? 0;
  const span = progress.span ?? 1;
  const needed = progress.needed ?? 0;
  const xpLabel =
    progress.level >= 20
      ? `Опыт ${progress.experience} · максимум`
      : `До ${progress.nextLevel} ур.: ${into} / ${span}`;

  mount.dataset.characterId = characterId;
  mount.innerHTML = `
    ${sectionTitle("✨", "Опыт и уровень")}
    <div class="xp-bar-head">
      <div class="xp-bar-label">${escapeHtml(xpLabel)}</div>
      <div class="xp-bar-remain">${
        progress.level >= 20
          ? "20 уровень"
          : can
            ? "порог достигнут — можно повысить"
            : `ещё нужно ${needed}`
      }</div>
    </div>
    <div class="xp-track" title="${into} из ${span} (${progress.percent}%)">
      <div class="xp-fill" style="width:${progress.percent}%"></div>
    </div>
    <div class="xp-meta muted">
      Всего опыта: <strong>${progress.experience}</strong>
      · порог ${progress.nextLevel} ур.: <strong>${progress.nextFloor}</strong>
      · сейчас ур. ${progress.level}
    </div>
    ${
      allowGrantXp
        ? `<div class="xp-grant-row">
            <button type="button" class="xp-grant-btn" data-delta="50">+50</button>
            <button type="button" class="xp-grant-btn" data-delta="100">+100</button>
            <button type="button" class="xp-grant-btn" data-delta="500">+500</button>
            ${
              needed > 0
                ? `<button type="button" class="xp-grant-btn primary" data-delta="${needed}">+${needed} (до ур.)</button>`
                : ""
            }
            <input class="xp-custom-input" type="number" min="1" step="1" placeholder="своё" style="width:88px" />
            <button type="button" class="xp-custom-btn">Добавить</button>
          </div>`
        : ""
    }
    <button type="button" class="xp-levelup-btn primary hs-full-btn" ${can ? "" : "disabled"}>
      ${can ? `⬆️ Повысить уровень → ${progress.nextLevel}` : `⬆️ Нужно ещё ${needed} опыта`}
    </button>
    <div class="xp-status muted" aria-live="polite"></div>
  `;

  bindHeroXpControls(mount, characterId, { allowGrantXp, can });
}

/** Глобальный API — надёжные onclick, даже если addEventListener сбрасывается */
window.__dndXp = {
  async grant(characterId, delta) {
    const status = document.querySelector("#heroXpSection .xp-status");
    if (status) {
      status.textContent = `Начисляю ${delta} опыта…`;
      status.style.color = "var(--ok)";
    }
    return grantHeroXp(characterId, delta);
  },
  async custom(characterId) {
    const input = document.querySelector("#heroXpSection .xp-custom-input");
    const n = Number(String(input?.value || "").trim());
    if (!Number.isFinite(n) || n === 0) {
      const status = document.querySelector("#heroXpSection .xp-status");
      if (status) {
        status.textContent = "Укажите число опыта";
        status.style.color = "var(--danger)";
      } else {
        alert("Укажите число опыта");
      }
      return false;
    }
    return window.__dndXp.grant(characterId, n);
  },
  async levelUp(characterId) {
    const status = document.querySelector("#heroXpSection .xp-status");
    const btn = document.querySelector("#heroXpSection .xp-levelup-btn");
    if (btn) btn.disabled = true;
    if (status) {
      status.textContent = "Открываю мастер повышения…";
      status.style.color = "var(--ok)";
    }
    try {
      await openLevelUpWizard(characterId, { allowGrantXp: true });
      if (status) status.textContent = "";
      const modalOpen = ui.levelUpModal && !ui.levelUpModal.classList.contains("hidden");
      if (btn && !modalOpen) btn.disabled = false;
    } catch (error) {
      console.error("levelUp", error);
      const msg = String(error?.message || error);
      if (status) {
        status.textContent = msg;
        status.style.color = "var(--danger)";
      }
      alert(msg);
      if (btn) btn.disabled = false;
    }
  }
};

function bindHeroXpControls(mount, characterId, { allowGrantXp, can }) {
  if (!mount || !characterId) return;

  mount.querySelectorAll(".xp-grant-btn").forEach((btn) => {
    btn.setAttribute("onclick", `window.__dndXp.grant(${JSON.stringify(characterId)}, ${JSON.stringify(btn.dataset.delta)})`);
  });
  const customBtn = mount.querySelector(".xp-custom-btn");
  if (customBtn) {
    customBtn.setAttribute("onclick", `window.__dndXp.custom(${JSON.stringify(characterId)})`);
  }
  const levelBtn = mount.querySelector(".xp-levelup-btn");
  if (levelBtn) {
    // Всегда вешаем обработчик; disabled снимется когда can=true
    levelBtn.setAttribute(
      "onclick",
      can
        ? `window.__dndXp.levelUp(${JSON.stringify(characterId)}); return false;`
        : `const s=document.querySelector('#heroXpSection .xp-status'); if(s){s.textContent='Нужно больше опыта'; s.style.color='var(--danger)';} return false;`
    );
  }

  mount.querySelectorAll(".xp-grant-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      window.__dndXp.grant(characterId, btn.dataset.delta);
    });
  });
  mount.querySelector(".xp-custom-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    window.__dndXp.custom(characterId);
  });
  mount.querySelector(".xp-levelup-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!can || event.currentTarget.disabled) {
      const status = mount.querySelector(".xp-status");
      if (status) {
        status.textContent = "Нужно больше опыта для повышения";
        status.style.color = "var(--danger)";
      }
      return;
    }
    window.__dndXp.levelUp(characterId);
  });
}

async function grantHeroXp(characterId, delta) {
  const amount = Number(delta);
  if (!characterId) {
    alert("Персонаж не выбран");
    return false;
  }
  if (!Number.isFinite(amount) || amount === 0) {
    alert("Укажите число опыта");
    return false;
  }
  try {
    const result = await call("/characters/xp", {
      method: "POST",
      body: JSON.stringify({ characterId, delta: amount })
    });
    const fresh = result.character
      ? { ...result.character, progress: result.progress }
      : await call(`/characters/${characterId}`);
    if (result.progress) fresh.progress = result.progress;
    await renderHeroXpBar(fresh, { allowGrantXp: true });
    const status = document.querySelector("#heroXpSection .xp-status");
    if (status) {
      status.textContent = `Начислено +${amount}. Всего: ${fresh.experience ?? result.progress?.experience}`;
      status.style.color = "var(--ok)";
    }
    syncVision().catch(() => {});
    return true;
  } catch (error) {
    console.error("grantHeroXp", error);
    const status = document.querySelector("#heroXpSection .xp-status");
    if (status) {
      status.textContent = String(error.message || error);
      status.style.color = "var(--danger)";
    }
    alert(String(error.message || error));
    return false;
  }
}

async function onHeroModalClick(event) {
  const section = event.target.closest?.("#heroXpSection");
  const heroId =
    section?.dataset?.characterId || state.openHeroId || ui.heroModalBody?.dataset?.characterId;
  if (!heroId || ui.heroModal?.classList.contains("hidden")) return;

  const grantBtn = event.target.closest?.(".xp-grant-btn");
  if (grantBtn && section?.contains(grantBtn)) {
    event.preventDefault();
    await grantHeroXp(heroId, grantBtn.dataset.delta);
    return;
  }

  const customBtn = event.target.closest?.(".xp-custom-btn");
  if (customBtn && section?.contains(customBtn)) {
    event.preventDefault();
    const n = Number(String(section.querySelector(".xp-custom-input")?.value || "").trim());
    if (!Number.isFinite(n) || n === 0) {
      alert("Укажите число опыта");
      return;
    }
    await grantHeroXp(heroId, n);
    return;
  }

  const levelUpBtn = event.target.closest?.(".xp-levelup-btn");
  if (levelUpBtn && section?.contains(levelUpBtn)) {
    if (levelUpBtn.disabled) return;
    event.preventDefault();
    try {
      await openLevelUpWizard(heroId, { allowGrantXp: true });
    } catch (error) {
      alert(String(error.message || error));
    }
  }
}

const LEVEL_UP_STEPS = [
  { id: "overview", label: "Обзор", icon: "overview" },
  { id: "class", label: "Класс", icon: "class" },
  { id: "hp", label: "Хиты", icon: "hp" },
  { id: "improve", label: "Улучшение", icon: "improve" },
  { id: "features", label: "Умения", icon: "features" },
  { id: "spells", label: "Заклинания", icon: "spells" },
  { id: "summary", label: "Итог", icon: "summary" }
];

function luIcon(name) {
  const icons = {
    overview:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    class:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z"/></svg>',
    hp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>',
    improve:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v16M6 10l6-6 6 6"/></svg>',
    features:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2.2 5.4L20 10l-4.5 3.8L16.8 20 12 16.8 7.2 20l1.3-6.2L4 10l5.8-1.6L12 3Z"/></svg>',
    spells:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2Z"/><path d="M17 8h2a2 2 0 0 1 2 2v10l-4-1.5"/></svg>',
    summary:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 13 4 4L19 7"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z"/><path d="M9 12h6M12 9v6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    pb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>'
  };
  return icons[name] || icons.info;
}

function renderLevelUpShell({ step, steps, subtitle, body }) {
  return `
    <div class="lu-shell">
      <div class="lu-header">
        <div class="lu-header-main">
          <div class="lu-mark" aria-hidden="true">${luIcon("mark")}</div>
          <div class="lu-header-text">
            <div class="lu-kicker">D&amp;D SRD 2024 · прокачка</div>
            <div class="lu-title">Повышение уровня</div>
            ${subtitle ? `<div class="lu-subtitle">${subtitle}</div>` : ""}
          </div>
        </div>
        <button type="button" class="lu-close" id="luCloseBtn" title="Закрыть" aria-label="Закрыть">${luIcon("close")}</button>
      </div>
      <div class="lu-steps" role="tablist" aria-label="Шаги прокачки">
        ${steps
          .map((s, i) => {
            const meta = LEVEL_UP_STEPS[i] || { label: s, icon: "info" };
            const state = i === step ? "active" : i < step ? "done" : "";
            return `<div class="lu-step ${state}" title="${escapeAttr(meta.label)}">
              <span class="lu-step-icon">${luIcon(meta.icon)}</span>
              <span class="lu-step-label">${escapeHtml(meta.label)}</span>
            </div>`;
          })
          .join("")}
      </div>
      <div class="lu-body">${body}</div>
      <div class="lu-footer">
        <button type="button" id="luPrev" ${step === 0 ? "disabled" : ""}>Назад</button>
        ${
          step < steps.length - 1
            ? `<button type="button" id="luNext" class="primary">Далее</button>`
            : `<button type="button" id="luCommit" class="primary">Подтвердить</button>`
        }
      </div>
    </div>`;
}

async function openLevelUpWizard(characterId, { allowGrantXp = true } = {}) {
  const options = await call(`/characters/${characterId}/level-up/options`);
  if (!options.progress?.canLevelUp) {
    alert("Недостаточно опыта для повышения уровня");
    return;
  }
  levelUpState.characterId = characterId;
  levelUpState.options = options;
  levelUpState.step = 0;
  levelUpState.allowGrantXp = allowGrantXp;
  const advance = options.advance || {
    mode: "existing",
    className: options.classes?.[0]?.name || "Воин",
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
    spellSlots: { ...(options.spellOptions?.suggestedSlots || {}), slots1: options.spellcasting?.slots1 ?? options.spellOptions?.suggestedSlots?.slots1 ?? 0 },
    spellSearch: ""
  };
  renderLevelUpStep();
  ui.levelUpModal?.classList.remove("hidden");
}

function closeLevelUpWizard() {
  ui.levelUpModal?.classList.add("hidden");
  if (ui.levelUpModalBody) ui.levelUpModalBody.innerHTML = "";
}

function abilLabel(k) {
  return { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" }[k] || k;
}

function categoryRu(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("epic")) return "эпический дар";
  if (c.includes("origin")) return "происхождение";
  if (c.includes("fighting")) return "боевой стиль";
  if (c.includes("general")) return "общая";
  if (c.includes("custom")) return "своя";
  return cat;
}

function asiPreviewHtml(o, ch) {
  const hints = o.abilityHints || {};
  const abs = o.abilities || {};
  const mode = ch.asi?.mode || "plus2";
  const keys = mode === "plus2" ? [ch.asi?.a || "str"] : [ch.asi?.a || "str", ch.asi?.b || "dex"];
  const deltas = mode === "plus2" ? [2] : [1, 1];
  return keys
    .map((key, i) => {
      const score = Number(abs[key]?.score || 10);
      const next = Math.min(20, score + deltas[i]);
      const oldMod = Math.floor((score - 10) / 2);
      const newMod = Math.floor((next - 10) / 2);
      const hint = hints[key]?.summary || "";
      return `<div class="lu-preview-card">
        <div class="lu-preview-title">${abilLabel(key)}: ${score} → <strong>${next}</strong> (мод. ${fmtMod(oldMod)} → ${fmtMod(newMod)})</div>
        <div class="muted">${escapeHtml(hint)}</div>
        ${key === "con" && newMod > oldMod ? `<div class="ok-text">Телосложение: +${(newMod - oldMod) * (o.toLevel || 1)} хитов за уровни</div>` : ""}
      </div>`;
    })
    .join("");
}

async function loadSubclassesIntoLevelUpOptions() {
  const o = levelUpState.options || {};
  const classEn = o.spellOptions?.classEn || o.advance?.classEn || "";
  const className = levelUpState.choices?.advanceClass?.className || o.advance?.className || "";
  const classLevel = o.advance?.toClassLevel;
  const en =
    classEn ||
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
    }[String(className).toLowerCase()] ||
      String(className).toLowerCase());
  try {
    await call("/subclasses/preload", { method: "POST", body: JSON.stringify({}) });
    const data = await call(
      `/subclasses/catalog?class=${encodeURIComponent(en)}&classLevel=${classLevel ?? ""}`
    );
    o.availableSubclasses = data.items || [];
    if (levelUpState.choices?.advanceClass?.subclass) {
      const sel = levelUpState.choices.advanceClass.subclass;
      const hit = (o.availableSubclasses || []).find(
        (sc) => sc.name === sel || sc.nameEn === sel || sc.id === sel
      );
      o.subclassFeaturesForLevel = hit?.featuresAtLevel || [];
    }
  } catch (error) {
    o.availableSubclasses = o.availableSubclasses || [];
    console.warn("subclasses catalog", error);
  }
}

async function loadSpellsIntoLevelUpOptions() {
  const so = levelUpState.options?.spellOptions;
  if (!so?.isCaster) return;
  try {
    await call("/spells/preload", { method: "POST", body: JSON.stringify({}) });
    const data = await call(
      `/spells/catalog?classes=${encodeURIComponent((so.filterClasses || []).join(","))}&maxLevel=${so.maxSpellLevel ?? 9}&exclude=${encodeURIComponent((so.known || []).join("|"))}`
    );
    so.available = data.items || [];
    so.fromCache = data.fromCache;
    so.spellError = null;
  } catch (error) {
    so.available = so.available || [];
    so.spellError = String(error.message || error);
  }
}

async function refreshLevelUpOptionsForAdvance() {
  const ch = levelUpState.choices.advanceClass || {};
  const q = new URLSearchParams({
    mode: ch.mode || "existing",
    className: ch.className || ""
  });
  if (ch.subclass) q.set("subclass", ch.subclass);
  const options = await call(`/characters/${levelUpState.characterId}/level-up/options?${q}`);
  levelUpState.options = options;
  levelUpState.choices.hpGain = options.averageHpGain;
  levelUpState.choices.selectedFeatureIds = (options.classFeaturesForLevel || [])
    .filter((f) => f.pick)
    .slice(0, 1)
    .map((f) => f.id);
  if (options.spellOptions?.suggestedSlots) {
    levelUpState.choices.spellSlots = { ...levelUpState.choices.spellSlots, ...options.spellOptions.suggestedSlots };
  }
}

function renderLevelUpStep() {
  const o = levelUpState.options;
  const ch = levelUpState.choices;
  const step = levelUpState.step;
  const steps = LEVEL_UP_STEPS.map((s) => s.label);
  const abilOpts = ["str", "dex", "con", "int", "wis", "cha"]
    .map((k) => `<option value="${k}" ${ch.asi?.a === k ? "selected" : ""}>${abilLabel(k)}</option>`)
    .join("");
  const abilOptsB = ["str", "dex", "con", "int", "wis", "cha"]
    .map((k) => `<option value="${k}" ${ch.asi?.b === k ? "selected" : ""}>${abilLabel(k)}</option>`)
    .join("");

  let body = "";
  if (step === 0) {
    body = `
      <div class="lu-hero">
        <div class="lu-level-card">
          <div class="lu-level-label">Персонаж поднимается</div>
          <div class="lu-level-row">
            <span class="lu-level-from">${o.fromLevel}</span>
            <span class="lu-level-arrow">${luIcon("arrow")}</span>
            <span class="lu-level-to">${o.toLevel}</span>
          </div>
        </div>
        <div class="lu-meta-stack">
          <div class="lu-meta">
            <div class="lu-meta-icon">${luIcon("class")}</div>
            <div><span>Класс</span><strong>${escapeHtml(o.classesLabel || "—")}</strong></div>
          </div>
          <div class="lu-meta">
            <div class="lu-meta-icon">${luIcon("pb")}</div>
            <div><span>Бонус мастерства</span><strong>+${o.progress.proficiencyBonus} → +${o.progress.nextProficiencyBonus}</strong></div>
          </div>
          <div class="lu-meta">
            <div class="lu-meta-icon ${o.asiAvailable || o.epicBoonAvailable ? "ok" : "muted"}">${luIcon(o.asiAvailable || o.epicBoonAvailable ? "spark" : "improve")}</div>
            <div><span>ASI / черта</span><strong>${o.epicBoonAvailable ? "Epic Boon" : o.asiAvailable ? "доступно" : "пропуск на этом уровне"}</strong></div>
          </div>
        </div>
      </div>
      <div class="lu-hint">${luIcon("info")} Дальше: класс → хиты → умения${o.spellOptions?.isCaster ? " → заклинания" : ""}.</div>`;
  } else if (step === 1) {
    const existing = o.classes || [];
    body = `
      <div class="lu-section-title">${luIcon("class")} Куда взять уровень</div>
      ${
        o.multiclass && !o.multiclass.ok
          ? `<div class="error-text">Мультикласс: ${(o.multiclass.missing || []).map(escapeHtml).join("; ")}</div>`
          : `<div class="lu-hint">${luIcon("info")} Новый класс — только при характеристиках ≥13 (SRD 2024).</div>`
      }
      <div class="lu-choice-row">
        <label class="lu-radio"><input type="radio" name="luAdvMode" value="existing" ${ch.advanceClass.mode !== "new" ? "checked" : ""}/> Существующий класс</label>
        <label class="lu-radio"><input type="radio" name="luAdvMode" value="new" ${ch.advanceClass.mode === "new" ? "checked" : ""}/> Новый класс</label>
      </div>
      <div id="luExistingBox" class="${ch.advanceClass.mode === "new" ? "hidden" : ""}">
        <label class="field-label">Класс для +1</label>
        <select id="luAdvClassExisting">
          ${existing
            .map(
              (c) =>
                `<option value="${escapeAttr(c.name)}" ${ch.advanceClass.className === c.name ? "selected" : ""}>${escapeHtml(c.name)} ${c.level} → ${c.level + 1}</option>`
            )
            .join("")}
        </select>
      </div>
      <div id="luNewBox" class="${ch.advanceClass.mode === "new" ? "" : "hidden"}">
        <label class="field-label">Новый класс (уровень 1)</label>
        <select id="luAdvClassNew">
          ${(o.availableClasses || [])
            .map(
              (c) =>
                `<option value="${escapeAttr(c.name)}" ${ch.advanceClass.className === c.name ? "selected" : ""}>${escapeHtml(c.name)} (${c.hitDie})</option>`
            )
            .join("")}
        </select>
      </div>
      ${
        o.advance?.subclassAllowed
          ? `<label class="field-label">Подкласс ${
              o.advance?.subclassRequired
                ? `(обязательно на ур. ${o.advance?.subclassLevel})`
                : "(если уже выбран — можно сменить)"
            }</label>
      <div id="luSubclassBox" class="lu-subclass-list">
        ${
          (o.availableSubclasses || []).length
            ? (o.availableSubclasses || [])
                .map((sc) => {
                  const selected =
                    ch.advanceClass.subclass === sc.name ||
                    ch.advanceClass.subclass === sc.nameEn ||
                    ch.advanceClass.subclass === sc.id;
                  const nowFeats = sc.featuresAtLevel || [];
                  const laterFeats = sc.featuresLater || [];
                  const nowHtml = nowFeats.length
                    ? `<div class="lu-sub-block">
                        <div class="lu-sub-block-title">Получите сейчас (ур. ${o.advance?.toClassLevel})</div>
                        ${nowFeats
                          .map(
                            (f) => `<div class="lu-sub-feat">
                              <div class="lu-sub-feat-name">${escapeHtml(f.name)}</div>
                              ${f.description ? `<div class="lu-sub-feat-desc">${escapeHtml(f.description)}</div>` : ""}
                            </div>`
                          )
                          .join("")}
                      </div>`
                    : `<div class="muted" style="margin-top:6px">На ур. ${o.advance?.toClassLevel} новых особенностей нет — подкласс уже выбран ранее или особенности на других уровнях.</div>`;
                  const laterHtml = laterFeats.length
                    ? `<details class="lu-sub-later">
                        <summary>Дальше по подклассу (${laterFeats.length})</summary>
                        ${laterFeats
                          .map((f) => {
                            const lv = (f.levels || []).join("/");
                            return `<div class="lu-sub-feat compact">
                              <div class="lu-sub-feat-name">Ур. ${escapeHtml(lv)} — ${escapeHtml(f.name)}</div>
                              ${f.description ? `<div class="lu-sub-feat-desc">${escapeHtml(f.description)}</div>` : ""}
                            </div>`;
                          })
                          .join("")}
                      </details>`
                    : "";
                  return `<div class="lu-subclass-card ${selected ? "selected" : ""}" data-subclass-card="${escapeAttr(sc.id)}">
                    <label class="lu-subclass-card-head">
                      <input type="radio" name="luSubclass" value="${escapeAttr(sc.name)}" data-subclass-id="${escapeAttr(sc.id)}" ${selected ? "checked" : ""}/>
                      <div class="lu-subclass-card-titles">
                        <div class="lu-feat-name">${escapeHtml(sc.name)} <span class="pill">SRD ${escapeHtml(sc.edition)}</span></div>
                        ${sc.description ? `<div class="lu-sub-blurb">${escapeHtml(sc.description)}</div>` : ""}
                      </div>
                    </label>
                    ${nowHtml}
                    ${laterHtml}
                  </div>`;
                })
                .join("")
            : `<div class="muted" id="luSubclassEmpty">Нет подклассов SRD 2024 для этого класса (или каталог ещё грузится).</div>`
        }
      </div>
      <div class="row" style="margin-top:8px">
        ${
          o.advance?.subclassRequired
            ? ""
            : `<button type="button" id="luSubclassNone">Не менять</button>`
        }
        <button type="button" id="luSubclassReload">Обновить</button>
      </div>`
          : `<div class="lu-hint">${luIcon("info")} Подкласс с ур. ${o.advance?.subclassLevel || 3} этого класса (сейчас ур. ${o.advance?.toClassLevel}).</div>`
      }`;
  } else if (step === 2) {
    body = `
      <div class="lu-section-title">${luIcon("hp")} Прирост хитов</div>
      <div class="lu-hp-panel">
        <div>
          <div class="muted" style="margin-bottom:8px">${escapeHtml(o.advance?.className || "")} · ТЕЛ ${fmtMod(o.conModifier)}</div>
          <label class="field-label">Сколько добавить</label>
          <input id="luHpGain" type="number" min="${o.hpMin ?? 1}" max="${o.hpMax ?? 99}" value="${ch.hpGain}" />
          <div class="lu-hp-actions">
            <button type="button" id="luHpAvg">Среднее · ${o.averageHpGain}</button>
            <button type="button" id="luHpRoll">Бросок</button>
          </div>
          <div class="muted" id="luHpRollResult" style="margin-top:8px"></div>
        </div>
        <div class="lu-hp-die" aria-hidden="true">
          <strong>${escapeHtml(o.hitDie || "d8")}</strong>
          <span>${o.hpMin}–${o.hpMax}</span>
        </div>
      </div>`;
  } else if (step === 3) {
    if (!o.asiAvailable && !o.epicBoonAvailable) {
      body = `
        <div class="lu-skip">
          <strong>Улучшений нет</strong>
          На уровне класса ${o.advance?.toClassLevel} у «${escapeHtml(o.advance?.className || "")}» нет ASI или черты.
        </div>`;
      ch.improveType = "none";
    } else if (o.epicBoonAvailable) {
      ch.improveType = "feat";
      body = `
        <div class="lu-section-title">${luIcon("improve")} Эпический дар (ур. 19)</div>
        <p class="muted">SRD 2024: выберите черту Epic Boon.</p>
        <div id="luFeatBox">
          <div class="lu-feat-grid" id="luFeatGrid">
            ${(o.feats || [])
              .map(
                (f) => `<label class="lu-feat-card ${ch.feat?.id === f.id ? "selected" : ""}">
                  <input type="radio" name="luFeatPick" value="${escapeAttr(f.id)}" ${ch.feat?.id === f.id ? "checked" : ""}/>
                  <div class="lu-feat-name">${escapeHtml(f.name)}${f.category ? ` <span class="pill">${escapeHtml(categoryRu(f.category))}</span>` : ""}</div>
                  <div class="lu-feat-sum">${escapeHtml(f.summary || "")}</div>
                  ${
                    f.description && f.description !== f.summary
                      ? `<div class="muted lu-feat-desc">${escapeHtml(f.description)}</div>`
                      : ""
                  }
                  ${f.prerequisite ? `<div class="muted" style="margin-top:4px;font-size:12px">Требование: ${escapeHtml(f.prerequisite)}</div>` : ""}
                </label>`
              )
              .join("")}
          </div>
          <div id="luFeatSkills" class="stack" style="margin-top:8px"></div>
          <div id="luFeatWhat" class="lu-preview-card" style="margin-top:8px"></div>
        </div>`;
    } else {
      body = `
        <div class="lu-section-title">${luIcon("improve")} Улучшение</div>
        <div class="lu-choice-row">
          <label class="lu-radio"><input type="radio" name="luImprove" value="asi" ${ch.improveType !== "feat" ? "checked" : ""}/> Характеристики (ASI)</label>
          <label class="lu-radio"><input type="radio" name="luImprove" value="feat" ${ch.improveType === "feat" ? "checked" : ""}/> Черта</label>
        </div>
        <div id="luAsiBox" class="${ch.improveType === "feat" ? "hidden" : ""}">
          <p class="muted">Выберите, что усилить — ниже превью «было → станет».</p>
          <label class="field-label">Режим</label>
          <select id="luAsiMode">
            <option value="plus2" ${ch.asi.mode !== "plus1" ? "selected" : ""}>+2 к одной</option>
            <option value="plus1" ${ch.asi.mode === "plus1" ? "selected" : ""}>+1 и +1 к двум</option>
          </select>
          <label class="field-label">Характеристика A</label>
          <select id="luAsiA">${abilOpts}</select>
          <div id="luAsiBWrap" class="${ch.asi.mode === "plus1" ? "" : "hidden"}">
            <label class="field-label">Характеристика B</label>
            <select id="luAsiB">${abilOptsB}</select>
          </div>
          <div id="luAsiPreview" class="lu-preview-list">${asiPreviewHtml(o, ch)}</div>
        </div>
        <div id="luFeatBox" class="${ch.improveType === "feat" ? "" : "hidden"}">
          <p class="muted">Карточки черт: краткое «что даёт» и полное описание.</p>
          <div class="lu-feat-grid" id="luFeatGrid">
            ${(o.feats || [])
              .map(
                (f) => `<label class="lu-feat-card ${ch.feat?.id === f.id ? "selected" : ""}">
                  <input type="radio" name="luFeatPick" value="${escapeAttr(f.id)}" ${ch.feat?.id === f.id ? "checked" : ""}/>
                  <div class="lu-feat-name">${escapeHtml(f.name)}${f.category ? ` <span class="pill">${escapeHtml(categoryRu(f.category))}</span>` : ""}</div>
                  <div class="lu-feat-sum">${escapeHtml(f.summary || "")}</div>
                  ${
                    f.description && f.description !== f.summary
                      ? `<div class="muted lu-feat-desc">${escapeHtml(f.description)}</div>`
                      : ""
                  }
                  ${f.prerequisite ? `<div class="muted" style="margin-top:4px;font-size:12px">Требование: ${escapeHtml(f.prerequisite)}</div>` : ""}
                </label>`
              )
              .join("")}
          </div>
          <div id="luCustomFeat" class="${ch.feat?.id === "custom" ? "" : "hidden"} stack" style="margin-top:8px">
            <input id="luFeatName" placeholder="Название черты" value="${escapeAttr(ch.feat?.name || "")}" />
            <textarea id="luFeatDescInput" placeholder="Описание">${escapeHtml(ch.feat?.description || "")}</textarea>
          </div>
          <div id="luFeatSkills" class="stack" style="margin-top:8px"></div>
          <div id="luFeatWhat" class="lu-preview-card" style="margin-top:8px"></div>
        </div>`;
    }
  } else if (step === 4) {
    const subFeats = o.subclassFeaturesForLevel || [];
    body =
      featurePicksSectionHtml(o, ch) +
      (subFeats.length
        ? `<div class="field-label" style="margin-top:12px">Особенности подкласса</div>
          <div class="lu-feature-list">${subFeats
            .map(
              (f) => `<div class="lu-feature-card">
                <div class="lu-feat-name">${escapeHtml(f.name)} <span class="pill">${escapeHtml(f.fromSubclass || "подкласс")}</span></div>
                <div class="muted">${escapeHtml(f.description || "").slice(0, 500)}</div>
              </div>`
            )
            .join("")}</div>`
        : "");
  } else if (step === 5) {
    const so = o.spellOptions || {};
    if (!so.isCaster) {
      body = `<div class="lu-skip"><strong>Заклинаний нет</strong>Этот шаг можно пропустить.</div>`;
    } else {
      const modeLabel =
        so.spellMode === "book"
          ? "Книга"
          : so.spellMode === "known"
            ? "Известные"
            : so.spellMode === "prepared"
              ? "Подготовка"
              : so.casterType || "Магия";
      const available = so.available || [];
      const pact = so.pactMagic;
      const slotsText = Object.entries(so.suggestedSlots || {})
        .map(([k, v]) => `${k.replace("slots", "")}×${v}`)
        .join(" · ");
      const knownList = [...new Set([...(o.spellBook || []), ...(o.preparedSpells || []), ...(ch.newSpells || [])])];
      const pickMode = so.picksAllowed > 0;
      const prepOnly = so.spellMode === "prepared" && !pickMode;

      const spellLabel = (name) => {
        const hit = available.find((s) => s.name === name || s.nameEn === name);
        return hit?.name || name;
      };
      const spellRow = (sp, { checked, attr }) => {
        const title = sp.name || sp.nameEn || "Заклинание";
        const metaBits = [
          sp.castingTime || null,
          sp.range || null,
          sp.duration || null,
          sp.concentration ? "конц." : null,
          sp.ritual ? "ритуал" : null
        ].filter(Boolean);
        const schoolBits = [sp.schoolLabel || null, sp.nameEn && sp.nameEn !== title ? sp.nameEn : null].filter(Boolean);
        const summary = sp.summary || "";
        const desc = sp.description || summary;
        return `<div class="lu-spell-card ${checked ? "selected" : ""}">
          <label class="lu-spell-pick">
            <input type="checkbox" ${attr} ${checked ? "checked" : ""}/>
            <div class="lu-spell-main">
              <div class="lu-spell-title">${escapeHtml(title)}</div>
              ${schoolBits.length ? `<div class="lu-spell-sub">${schoolBits.map(escapeHtml).join(" · ")}</div>` : ""}
              ${summary ? `<div class="lu-spell-sum">${escapeHtml(summary)}</div>` : ""}
              ${metaBits.length ? `<div class="lu-spell-meta">${metaBits.map(escapeHtml).join(" · ")}</div>` : ""}
            </div>
            <span class="lu-spell-level">${escapeHtml(sp.levelLabel || "")}</span>
          </label>
          ${
            desc
              ? `<details class="lu-spell-more">
                  <summary>Как работает</summary>
                  <div class="lu-spell-desc">${escapeHtml(desc)}</div>
                  ${sp.higherLevel ? `<div class="lu-spell-higher">${escapeHtml(sp.higherLevel)}</div>` : ""}
                  ${sp.components ? `<div class="lu-spell-meta">Компоненты: ${escapeHtml(sp.components)}</div>` : ""}
                </details>`
              : ""
          }
        </div>`;
      };

      body = `
        <div class="lu-spell-panel">
          <div class="lu-spell-toolbar">
            <div class="lu-spell-chips">
              <span class="lu-chip"><strong>${escapeHtml(modeLabel)}</strong></span>
              <span class="lu-chip">круг подготовки ≤ <strong>${so.maxSpellLevel ?? so.prepareMaxSpellLevel ?? 0}</strong></span>
              ${
                so.slotMaxSpellLevel != null && so.slotMaxSpellLevel !== so.maxSpellLevel
                  ? `<span class="lu-chip">слоты до <strong>${so.slotMaxSpellLevel}</strong></span>`
                  : ""
              }
              ${
                so.preparedTotal != null
                  ? `<span class="lu-chip">таблица: <strong>${so.preparedTotal}</strong> подг.</span>`
                  : ""
              }
              ${
                so.cantripPicksAllowed > 0
                  ? `<span class="lu-chip">+${so.cantripPicksAllowed} заговор(ов)</span>`
                  : ""
              }
              ${
                pickMode
                  ? `<span class="lu-chip accent" id="luSpellPickCounter">Выбрано 0 из ${so.picksAllowed}</span>`
                  : prepOnly && so.preparationLimit != null
                    ? `<span class="lu-chip accent" id="luSpellPickCounter" data-mode="prep">Подготовка 0 / ${so.preparationLimit}</span>`
                    : ""
              }
              ${slotsText ? `<span class="lu-chip">ячейки <strong>${escapeHtml(slotsText)}</strong></span>` : ""}
              ${pact ? `<span class="lu-chip ok">pact ${pact.pactSlots}×${pact.pactSlotLevel}</span>` : ""}
            </div>
          </div>
          ${
            pickMode || prepOnly
              ? `<div class="lu-spell-search">
                  <input id="luSpellSearch" placeholder="Найти заклинание…" value="${escapeAttr(ch.spellSearch || "")}" />
                  <button type="button" id="luSpellReload">Каталог</button>
                </div>
                <div class="lu-spell-grid" id="luSpellGrid">
                  ${
                    available.length
                      ? available
                          .map((sp) => {
                            if (prepOnly) {
                              const checked = (ch.preparedSpells || []).includes(sp.name);
                              return spellRow(sp, {
                                checked,
                                attr: `data-prep-spell="${escapeAttr(sp.name)}"`
                              });
                            }
                            const checked =
                              (ch.newSpells || []).includes(sp.name) || (ch.newSpells || []).includes(sp.nameEn);
                            return spellRow(sp, {
                              checked,
                              attr: `data-spell-name="${escapeAttr(sp.name)}"`
                            });
                          })
                          .join("")
                      : `<div class="lu-skip" style="padding:18px"><strong>Каталог пуст</strong>Нажмите «Каталог», чтобы загрузить SRD.</div>`
                  }
                </div>`
              : `<div class="lu-skip" style="padding:18px"><strong>Новых заклинаний нет</strong>На этом уровне изучать ничего не нужно.</div>`
          }
          ${
            knownList.length
              ? `<div>
                  <div class="field-label">${prepOnly ? "Подготовить сейчас" : "Уже известные"}</div>
                  <div class="lu-spell-known">
                    ${knownList
                      .map(
                        (sp) => `<label class="lu-check"><input type="checkbox" data-prep="${escapeAttr(sp)}" ${
                          (ch.preparedSpells || []).includes(sp) ? "checked" : ""
                        }/> ${escapeHtml(spellLabel(sp))}</label>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
          ${
            pickMode
              ? `<details class="lu-spell-extra">
                  <summary>Добавить своё название</summary>
                  <div class="lu-spell-search">
                    <input id="luNewSpell" placeholder="название заклинания" />
                    <button type="button" id="luAddSpell">Добавить</button>
                  </div>
                  <div class="muted" style="margin-top:6px">Выбрано: <span id="luNewSpellList">${(ch.newSpells || []).map(escapeHtml).join(", ") || "—"}</span></div>
                </details>`
              : `<span id="luNewSpellList" class="hidden"></span><input id="luNewSpell" class="hidden" /><button type="button" id="luAddSpell" class="hidden"></button>`
          }
          ${so.spellError ? `<div class="error-text">${escapeHtml(so.spellError)}</div>` : ""}
        </div>`;
    }
  } else {
    const featName =
      ch.improveType === "feat"
        ? ch.feat?.id === "custom"
          ? ch.feat?.name || "Своя черта"
          : (o.feats || []).find((f) => f.id === ch.feat?.id)?.name || "Черта"
        : null;
    const autoFeats = (o.classFeaturesForLevel || []).filter((f) => !f.pick || f.pickKind === "ack" || f.pickKind === "subclass");
    const pickedFeats = Object.entries(ch.featurePicks || {}).flatMap(([id, vals]) => {
      const feat = (o.classFeaturesForLevel || []).find((f) => f.id === id);
      return vals?.length ? [`${feat?.name || id}: ${vals.join(", ")}`] : [];
    });
    body = `
      <div class="lu-section-title">${luIcon("summary")} Итог</div>
      <div class="lu-hero">
        <div class="lu-level-card">
          <div class="lu-level-label">Новый уровень</div>
          <div class="lu-level-row"><span class="lu-level-to">${o.toLevel}</span></div>
        </div>
        <div class="lu-meta-stack">
          <div class="lu-meta"><div class="lu-meta-icon">${luIcon("class")}</div><div><span>Класс</span><strong>${escapeHtml(ch.advanceClass?.className || "")} → ${o.advance?.toClassLevel ?? "—"}</strong></div></div>
          <div class="lu-meta"><div class="lu-meta-icon">${luIcon("hp")}</div><div><span>Хиты</span><strong>+${ch.hpGain}</strong></div></div>
          <div class="lu-meta"><div class="lu-meta-icon">${luIcon("improve")}</div><div><span>Улучшение</span><strong>${
            ch.improveType === "asi"
              ? ch.asi.mode === "plus2"
                ? `+2 ${abilLabel(ch.asi.a)}`
                : `+1 ${abilLabel(ch.asi.a)} / +1 ${abilLabel(ch.asi.b)}`
              : ch.improveType === "feat"
                ? escapeHtml(featName || "черта")
                : "—"
          }</strong></div></div>
        </div>
      </div>
      <div class="lu-preview-list">
        <div class="lu-preview-card"><strong>Умения:</strong> ${[...autoFeats.map((f) => f.name), ...pickedFeats].map(escapeHtml).join(", ") || "—"}</div>
        ${(ch.newSpells || []).length ? `<div class="lu-preview-card"><strong>Заклинания:</strong> ${ch.newSpells.map(escapeHtml).join(", ")}</div>` : ""}
      </div>`;
  }

  const subtitle = `${escapeHtml(o.classesLabel || "")} · ${o.fromLevel}→${o.toLevel}`;
  ui.levelUpModalBody.innerHTML = renderLevelUpShell({ step, steps, subtitle, body });

  document.getElementById("luCloseBtn")?.addEventListener("click", closeLevelUpWizard);
  document.getElementById("luPrev")?.addEventListener("click", () => {
    collectLevelUpStep();
    levelUpState.step = Math.max(0, levelUpState.step - 1);
    renderLevelUpStep();
  });
  document.getElementById("luNext")?.addEventListener("click", async () => {
    collectLevelUpStep();
    if (levelUpState.step === 1) {
      if (o.advance?.subclassRequired && !String(ch.advanceClass.subclass || "").trim()) {
        alert(`На уровне класса ${o.advance?.subclassLevel} нужно выбрать подкласс (SRD 2024)`);
        return;
      }
      if (o.multiclass && !o.multiclass.ok && ch.advanceClass.mode === "new") {
        alert(`Мультикласс: ${(o.multiclass.missing || []).join("; ")}`);
        return;
      }
      try {
        await refreshLevelUpOptionsForAdvance();
        if (levelUpState.options?.multiclass && !levelUpState.options.multiclass.ok) {
          if (ch.advanceClass.mode === "new" || (levelUpState.options.classes || []).length > 1) {
            alert(`Мультикласс: ${(levelUpState.options.multiclass.missing || []).join("; ")}`);
            return;
          }
        }
      } catch (error) {
        alert(String(error.message || error));
        return;
      }
    }
    if (levelUpState.step === 2) {
      const min = o.hpMin ?? 1;
      const max = o.hpMax ?? 99;
      const v = Number(ch.hpGain);
      if (!Number.isFinite(v) || v < min || v > max) {
        alert(`Прирост хитов должен быть от ${min} до ${max} (кость + ТЕЛ)`);
        return;
      }
    }
    if (levelUpState.step === 3) {
      if (o.epicBoonAvailable) {
        if (!String(ch.feat?.id || ch.feat?.name || "").trim()) {
          alert("На 19 уровне выберите Epic Boon");
          return;
        }
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
        alert(`Можно выбрать не больше ${picks} новых заклинаний`);
        return;
      }
      const prepLimit = levelUpState.options?.spellOptions?.preparationLimit;
      if (prepLimit != null && (levelUpState.choices.preparedSpells || []).length > prepLimit) {
        alert(`Лимит подготовки: ${prepLimit}`);
        return;
      }
    }
    const nextStep = Math.min(steps.length - 1, levelUpState.step + 1);
    levelUpState.step = nextStep;
    renderLevelUpStep();
    if (nextStep === 5 && levelUpState.options?.spellOptions?.isCaster) {
      const so = levelUpState.options.spellOptions;
      if (!so.available?.length) {
        const grid = document.getElementById("luSpellGrid");
        if (grid) grid.innerHTML = `<div class="muted">Загрузка каталога заклинаний…</div>`;
        await loadSpellsIntoLevelUpOptions();
        renderLevelUpStep();
      }
    }
  });
  document.getElementById("luCommit")?.addEventListener("click", commitLevelUp);

  if (step === 1) {
    const syncMode = () => {
      const mode = ui.levelUpModalBody.querySelector('input[name="luAdvMode"]:checked')?.value || "existing";
      ch.advanceClass.mode = mode;
      document.getElementById("luExistingBox")?.classList.toggle("hidden", mode !== "existing");
      document.getElementById("luNewBox")?.classList.toggle("hidden", mode !== "new");
    };
    ui.levelUpModalBody.querySelectorAll('input[name="luAdvMode"]').forEach((el) => el.addEventListener("change", syncMode));
    const markSubclass = () => {
      ui.levelUpModalBody.querySelectorAll('input[name="luSubclass"]').forEach((el) => {
        el.closest(".lu-subclass-card")?.classList.toggle("selected", el.checked);
      });
    };
    ui.levelUpModalBody.querySelectorAll('input[name="luSubclass"]').forEach((el) => {
      el.addEventListener("change", () => {
        ch.advanceClass.subclass = el.value;
        markSubclass();
        const hit = (o.availableSubclasses || []).find(
          (sc) => sc.name === el.value || sc.nameEn === el.value || sc.id === el.dataset.subclassId
        );
        o.subclassFeaturesForLevel = hit?.featuresAtLevel || [];
      });
    });
    document.getElementById("luSubclassNone")?.addEventListener("click", () => {
      ch.advanceClass.subclass = "";
      ui.levelUpModalBody.querySelectorAll('input[name="luSubclass"]').forEach((el) => {
        el.checked = false;
      });
      markSubclass();
    });
    document.getElementById("luSubclassReload")?.addEventListener("click", async () => {
      const box = document.getElementById("luSubclassBox");
      if (box) box.innerHTML = `<div class="muted">Обновляю каталог…</div>`;
      collectLevelUpStep();
      await loadSubclassesIntoLevelUpOptions();
      renderLevelUpStep();
    });
    if (!(o.availableSubclasses || []).length) {
      loadSubclassesIntoLevelUpOptions().then(() => {
        if (levelUpState.step === 1) renderLevelUpStep();
      });
    }
  }
  if (step === 2) {
    document.getElementById("luHpAvg")?.addEventListener("click", () => {
      document.getElementById("luHpGain").value = String(o.averageHpGain);
    });
    document.getElementById("luHpRoll")?.addEventListener("click", () => {
      const die = Number(o.hitDieSides) || 8;
      const roll = Math.floor(Math.random() * die) + 1;
      const gain = Math.max(1, roll + Number(o.conModifier || 0));
      document.getElementById("luHpGain").value = String(gain);
      const out = document.getElementById("luHpRollResult");
      if (out) out.textContent = `Бросок: ${roll} + ТЕЛ ${fmtMod(o.conModifier)} = ${gain}`;
    });
  }
  if (step === 3 && (o.asiAvailable || o.epicBoonAvailable)) {
    const syncImprove = () => {
      if (o.epicBoonAvailable) {
        levelUpState.choices.improveType = "feat";
        return;
      }
      const v = ui.levelUpModalBody.querySelector('input[name="luImprove"]:checked')?.value || "asi";
      levelUpState.choices.improveType = v;
      document.getElementById("luAsiBox")?.classList.toggle("hidden", v !== "asi");
      document.getElementById("luFeatBox")?.classList.toggle("hidden", v !== "feat");
    };
    ui.levelUpModalBody.querySelectorAll('input[name="luImprove"]').forEach((el) => el.addEventListener("change", syncImprove));
    const refreshAsi = () => {
      ch.asi.mode = document.getElementById("luAsiMode")?.value || "plus2";
      ch.asi.a = document.getElementById("luAsiA")?.value || "str";
      ch.asi.b = document.getElementById("luAsiB")?.value || "dex";
      document.getElementById("luAsiBWrap")?.classList.toggle("hidden", ch.asi.mode !== "plus1");
      const box = document.getElementById("luAsiPreview");
      if (box) box.innerHTML = asiPreviewHtml(o, ch);
    };
    document.getElementById("luAsiMode")?.addEventListener("change", refreshAsi);
    document.getElementById("luAsiA")?.addEventListener("change", refreshAsi);
    document.getElementById("luAsiB")?.addEventListener("change", refreshAsi);
    const updateFeat = () => {
      const id = ui.levelUpModalBody.querySelector('input[name="luFeatPick"]:checked')?.value || ch.feat?.id;
      ch.feat.id = id;
      ui.levelUpModalBody.querySelectorAll(".lu-feat-card").forEach((card) => {
        card.classList.toggle("selected", card.querySelector("input")?.value === id);
      });
      const feat = (o.feats || []).find((f) => f.id === id);
      document.getElementById("luCustomFeat")?.classList.toggle("hidden", id !== "custom");
      const what = document.getElementById("luFeatWhat");
      if (what) {
        what.innerHTML = feat
          ? `<strong>Что получите:</strong> ${escapeHtml(feat.summary || "")}${
              feat.description && feat.description !== feat.summary
                ? `<div class="muted" style="margin-top:6px">${escapeHtml(feat.description)}</div>`
                : ""
            }${feat.prerequisite ? `<div class="muted" style="margin-top:4px">Требование: ${escapeHtml(feat.prerequisite)}</div>` : ""}`
          : "";
      }
      const skillBox = document.getElementById("luFeatSkills");
      const picks = feat?.skillPicks || 0;
      if (!skillBox) return;
      if (!picks) {
        skillBox.innerHTML = "";
        return;
      }
      const unskilled = (o.skillsForPick?.untrained || o.skills || []).filter((s) => !Number(s.proficiencyLevel));
      skillBox.innerHTML =
        `<div class="hs-subtitle">Выберите навыки — ровно до ${picks}</div>
         <div class="muted" id="luFeatSkillCounter"></div>` +
        unskilled
          .map(
            (s) =>
              `<label class="lu-check"><input type="checkbox" data-feat-skill="${escapeAttr(s.key)}" ${
                (ch.feat?.skillKeys || []).includes(s.key) ? "checked" : ""
              }/> ${escapeHtml(skillLabelRu(s))}</label>`
          )
          .join("") || `<div class="muted">Нет навыков без владения</div>`;
      bindLimitedChecks(skillBox, "[data-feat-skill]", picks, document.getElementById("luFeatSkillCounter"));
    };
    ui.levelUpModalBody.querySelectorAll('input[name="luFeatPick"]').forEach((el) => el.addEventListener("change", updateFeat));
    updateFeat();
  }
  if (step === 4) {
    ui.levelUpModalBody.querySelectorAll("[data-pick-feature]").forEach((block) => {
      const limit = Number(block.dataset.pickLimit) || 1;
      const counter = block.querySelector("[data-pick-counter]");
      bindLimitedChecks(block, "[data-pick-value]", limit, counter);
    });
  }
  if (step === 5 && o.spellOptions?.isCaster) {
    const so = o.spellOptions;
    const spellCounter = document.getElementById("luSpellPickCounter");
    if (so.picksAllowed > 0) {
      bindLimitedChecks(ui.levelUpModalBody, "[data-spell-name]", so.picksAllowed, spellCounter);
    }
    if (so.preparationLimit != null) {
      bindLimitedChecks(
        ui.levelUpModalBody,
        "[data-prep-spell], [data-prep]",
        so.preparationLimit,
        so.picksAllowed > 0 ? null : spellCounter
      );
    }
    document.getElementById("luAddSpell")?.addEventListener("click", () => {
      const name = String(document.getElementById("luNewSpell")?.value || "").trim();
      if (!name) return;
      const limit = so.picksAllowed || 0;
      if (limit > 0 && (levelUpState.choices.newSpells || []).length >= limit) {
        alert(`Можно выбрать только ${limit}`);
        return;
      }
      if (!levelUpState.choices.newSpells.includes(name)) levelUpState.choices.newSpells.push(name);
      document.getElementById("luNewSpellList").textContent = levelUpState.choices.newSpells.join(", ");
      document.getElementById("luNewSpell").value = "";
      bindLimitedChecks(ui.levelUpModalBody, "[data-spell-name]", limit, spellCounter);
    });
    document.getElementById("luSpellReload")?.addEventListener("click", async () => {
      try {
        const grid = document.getElementById("luSpellGrid");
        if (grid) grid.innerHTML = `<div class="muted">Обновляю каталог…</div>`;
        await call("/spells/preload", { method: "POST", body: JSON.stringify({ forceRefresh: false }) });
        await loadSpellsIntoLevelUpOptions();
        renderLevelUpStep();
      } catch (error) {
        alert(String(error.message || error));
      }
    });
    document.getElementById("luSpellSearch")?.addEventListener("change", async (e) => {
      ch.spellSearch = e.target.value;
      try {
        const data = await call(
          `/spells/catalog?classes=${encodeURIComponent((so.filterClasses || []).join(","))}&maxLevel=${so.maxSpellLevel ?? 9}&q=${encodeURIComponent(ch.spellSearch || "")}&exclude=${encodeURIComponent((so.known || []).join("|"))}`
        );
        so.available = data.items || [];
        renderLevelUpStep();
      } catch (error) {
        console.warn(error);
      }
    });
  }
}

function collectLevelUpStep() {
  const step = levelUpState.step;
  const ch = levelUpState.choices;
  if (step === 1) {
    ch.advanceClass.mode = ui.levelUpModalBody.querySelector('input[name="luAdvMode"]:checked')?.value || "existing";
    if (ch.advanceClass.mode === "new") {
      ch.advanceClass.className = document.getElementById("luAdvClassNew")?.value || ch.advanceClass.className;
    } else {
      ch.advanceClass.className = document.getElementById("luAdvClassExisting")?.value || ch.advanceClass.className;
    }
    const picked = ui.levelUpModalBody.querySelector('input[name="luSubclass"]:checked');
    const hasCatalog = Boolean(ui.levelUpModalBody.querySelector('input[name="luSubclass"]'));
    if (hasCatalog) ch.advanceClass.subclass = picked?.value || "";
  }
  if (step === 2) {
    ch.hpGain = Math.max(1, Number(document.getElementById("luHpGain")?.value || ch.hpGain));
  }
  if (step === 3 && (levelUpState.options?.asiAvailable || levelUpState.options?.epicBoonAvailable)) {
    if (levelUpState.options?.epicBoonAvailable) {
      ch.improveType = "feat";
    } else {
      ch.improveType = ui.levelUpModalBody.querySelector('input[name="luImprove"]:checked')?.value || "asi";
    }
    ch.asi = {
      mode: document.getElementById("luAsiMode")?.value || "plus2",
      a: document.getElementById("luAsiA")?.value || "str",
      b: document.getElementById("luAsiB")?.value || "dex"
    };
    const featId = ui.levelUpModalBody.querySelector('input[name="luFeatPick"]:checked')?.value || ch.feat?.id || "skilled";
    const skillKeys = [...ui.levelUpModalBody.querySelectorAll("[data-feat-skill]:checked")].map((el) => el.dataset.featSkill);
    ch.feat = {
      id: featId,
      name: document.getElementById("luFeatName")?.value || "",
      description: document.getElementById("luFeatDescInput")?.value || "",
      skillKeys
    };
  }
  if (step === 4) {
    ch.featurePicks = ch.featurePicks || {};
    ui.levelUpModalBody.querySelectorAll("[data-pick-feature]").forEach((block) => {
      const id = block.dataset.pickFeature;
      ch.featurePicks[id] = [...block.querySelectorAll("[data-pick-value]:checked")].map((el) => el.dataset.pickValue);
    });
    ch.selectedFeatureIds = (levelUpState.options?.featureChoiceBudget || []).map((b) => b.featureId);
    ch.classFeatureNote = document.getElementById("luClassFeatureNote")?.value || "";
    ch.skillKeys = Object.values(ch.featurePicks)
      .flat()
      .filter(Boolean);
  }
  if (step === 5) {
    const picked = [...ui.levelUpModalBody.querySelectorAll("[data-spell-name]:checked")].map((el) => el.dataset.spellName);
    const manual = ch.newSpells.filter((n) => !levelUpState.options?.spellOptions?.available?.some((s) => s.name === n));
    ch.newSpells = [...new Set([...picked, ...manual])];
    const prepFromList = [...ui.levelUpModalBody.querySelectorAll("[data-prep]:checked")].map((el) => el.dataset.prep);
    const prepFromGrid = [...ui.levelUpModalBody.querySelectorAll("[data-prep-spell]:checked")].map(
      (el) => el.dataset.prepSpell
    );
    ch.preparedSpells = [...new Set([...prepFromList, ...prepFromGrid, ...(ch.newSpells || [])])];
    ch.spellSearch = document.getElementById("luSpellSearch")?.value || ch.spellSearch || "";
  }
}

async function commitLevelUp() {
  collectLevelUpStep();
  try {
    await call("/characters/level-up", {
      method: "POST",
      body: JSON.stringify({
        characterId: levelUpState.characterId,
        choices: levelUpState.choices
      })
    });
    closeLevelUpWizard();
    await syncVision();
    if (!ui.heroModal?.classList.contains("hidden")) {
      await openHeroCard(levelUpState.characterId);
    }
  } catch (error) {
    alert(String(error.message || error));
  }
}

function renderHeroesList() {
  if (!ui.heroesList) return;
  ui.heroesList.innerHTML = "";
  const heroes = state.characters || [];
  if (!heroes.length) {
    ui.heroesList.innerHTML = `<div class="muted">Пул пуст — залейте JSON выше или дождитесь импорта игрока</div>`;
    return;
  }
  for (const h of heroes) {
    const bound = (state.members || []).find((m) => m.characterId === h.id && m.role === "player");
    const card = document.createElement("div");
    card.className = "card hero-list-card";
    const thumb = h.portraitUrl
      ? `<img class="hero-thumb" src="${escapeAttr(h.portraitUrl)}" alt="" />`
      : `<div class="hero-thumb placeholder">${escapeHtml((h.name || "?").slice(0, 1))}</div>`;
    card.innerHTML = `
      ${thumb}
      <div class="stack" style="flex:1;min-width:0">
        <div class="row" style="justify-content:space-between;gap:6px;align-items:flex-start">
          <div class="row" style="gap:6px;flex-wrap:wrap">
            <strong>${escapeHtml(h.name)}</strong>
            ${bound ? `<span class="pill" style="border-color:#41c488;color:#9af0c3">у ${escapeHtml(bound.name)}</span>` : `<span class="pill">свободен</span>`}
            ${h.isTest ? '<span class="pill">тест</span>' : ""}
            ${h.canLevelUp ? '<span class="pill" style="border-color:#41c488;color:#9af0c3">можно ур.↑</span>' : ""}
          </div>
          ${
            !bound
              ? `<button type="button" class="warn hero-remove-btn" data-remove-hero="${escapeAttr(h.id)}" title="Убрать из пула">✕</button>`
              : ""
          }
        </div>
        <div class="muted">${escapeHtml(h.race || "")} · ${escapeHtml(h.classesLabel || `${h.className || ""} ${h.level ?? ""}`)} · XP ${h.experience ?? 0}</div>
        <div class="muted">ХП ${h.vitals?.hpCurrent ?? "—"}/${h.vitals?.hpMax ?? "—"} · КД ${h.vitals?.ac ?? "—"}</div>
      </div>
    `;
    card.style.cursor = "pointer";
    card.title = "Открыть карточку героя";
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-remove-hero]")) return;
      setRollTargetFromCombatant({
        name: h.name,
        type: "player",
        characterId: h.id,
        npcId: null,
        tokenId: (state.tokens || []).find((t) => t.characterId === h.id)?.id || null
      });
      openHeroCard(h.id);
    });
    card.querySelector("[data-remove-hero]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      removeHeroFromPool(h.id).catch(console.error);
    });
    ui.heroesList.appendChild(card);
  }
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsText(file, "UTF-8");
  });
}

async function importHeroRaw(raw, label = "лист") {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Пустой JSON");
  try {
    JSON.parse(text);
  } catch {
    throw new Error(`${label}: неверный JSON`);
  }
  return call("/characters/import", {
    method: "POST",
    body: JSON.stringify({ rawFileContent: text, placeOnMap: false })
  });
}

async function importMasterHeroFiles(files) {
  const list = [...(files || [])];
  if (!list.length) return;
  if (ui.masterHeroImportStatus) {
    ui.masterHeroImportStatus.textContent = `Импорт ${list.length}…`;
  }
  const ok = [];
  const fail = [];
  for (const file of list) {
    try {
      const raw = await readFileAsText(file);
      const character = await importHeroRaw(raw, file.name);
      ok.push(character.name || file.name);
    } catch (error) {
      fail.push(`${file.name}: ${error.message || error}`);
    }
  }
  await syncVision().catch(() => {});
  if (ui.masterHeroImportStatus) {
    const parts = [];
    if (ok.length) parts.push(`Добавлено: ${ok.join(", ")}`);
    if (fail.length) parts.push(`Ошибки: ${fail.join("; ")}`);
    ui.masterHeroImportStatus.textContent = parts.join(" · ") || "Готово";
  }
  if (ui.masterHeroFileInput) ui.masterHeroFileInput.value = "";
}

async function importMasterHeroPaste() {
  const raw = ui.masterHeroRawJson?.value || "";
  if (ui.masterHeroImportStatus) ui.masterHeroImportStatus.textContent = "Импорт…";
  try {
    const character = await importHeroRaw(raw, "вставка");
    if (ui.masterHeroRawJson) ui.masterHeroRawJson.value = "";
    await syncVision().catch(() => {});
    if (ui.masterHeroImportStatus) {
      ui.masterHeroImportStatus.textContent = `Добавлен: ${character.name} · игроки увидят в списке`;
    }
  } catch (error) {
    if (ui.masterHeroImportStatus) {
      ui.masterHeroImportStatus.textContent = String(error.message || error);
    }
  }
}

async function removeHeroFromPool(characterId) {
  if (!characterId) return;
  const hero = (state.characters || []).find((c) => c.id === characterId);
  if (!window.confirm(`Убрать «${hero?.name || "героя"}» из пула выбора?`)) return;
  try {
    await call(`/characters/${characterId}`, { method: "DELETE" });
    await syncVision();
    if (ui.masterHeroImportStatus) {
      ui.masterHeroImportStatus.textContent = `Убран: ${hero?.name || characterId}`;
    }
  } catch (error) {
    window.alert(String(error.message || error));
  }
}

function renderMonsters() {
  ui.monsterList.innerHTML = "";
  const query = String(ui.monsterSearch?.value ?? "")
    .trim()
    .toLowerCase();
  const filtered = state.monsters.filter((m) => {
    if (!query) return true;
    return (
      String(m.name).toLowerCase().includes(query) ||
      String(m.type).toLowerCase().includes(query) ||
      String(m.challengeRating).toLowerCase().includes(query)
    );
  });
  if (filtered.length === 0) {
    ui.monsterList.innerHTML = '<div class="muted">Нет мобов. Нажмите «Загрузить мобов».</div>';
    return;
  }
  for (const m of filtered) {
    const card = document.createElement("div");
    card.className = "card monster-row";
    card.innerHTML = `
      <div class="row">
        <strong>${m.name}</strong>
        <span class="pill">КС ${m.challengeRating}</span>
      </div>
      <div class="muted">${m.type} · ХП ${m.hp} · КД ${m.ac}</div>
    `;
    card.addEventListener("click", () => openMonsterCard(m));
    ui.monsterList.appendChild(card);
  }
}

function abilityMod(score) {
  const n = Number(score ?? 10);
  const mod = Math.floor((n - 10) / 2);
  return mod >= 0 ? `+${mod}` : String(mod);
}

function listBlock(title, items) {
  if (!items || items.length === 0) return "";
  const lines = items
    .map((item) => {
      if (typeof item === "string") return `<li>${escapeHtml(item)}</li>`;
      if (item.name && item.bonus) {
        return `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.bonus)}</li>`;
      }
      if (item.name && item.description) {
        return `<li><strong>${escapeHtml(item.name)}.</strong> ${escapeHtml(item.description)}</li>`;
      }
      return `<li>${escapeHtml(JSON.stringify(item))}</li>`;
    })
    .join("");
  return `<div class="npc-sheet-block"><div class="subtitle">${escapeHtml(title)}</div><ul class="npc-sheet-list">${lines}</ul></div>`;
}

function findNpcForToken(token) {
  if (!token) return null;
  const list = state.npcs || [];
  if (token.npcId) {
    const byId = list.find((n) => n.id === token.npcId);
    if (byId) return byId;
  }
  const name = String(token.name || "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
  if (!name) return null;
  return (
    list.find((n) => String(n.name || "").trim().toLowerCase() === name) ||
    list.find((n) => name.startsWith(String(n.name || "").trim().toLowerCase())) ||
    list.find((n) => String(n.name || "").trim().toLowerCase().startsWith(name.split(/\s+/)[0])) ||
    null
  );
}

function openNpcSheet(npc, { token = null } = {}) {
  if (!npc || !ui.monsterModal) return;
  const liveToken =
    token?.id && (state.tokens || []).find((t) => t.id === token.id)
      ? { ...(state.tokens.find((t) => t.id === token.id) || {}), ...token }
      : token;
  openNpcSheetModal(
    { modal: ui.monsterModal, body: ui.monsterModalBody },
    npc,
    {
      token: liveToken,
      viewerRole: "master",
      onRoll: ({ kind, ability, skillKey, label }) => {
        requestMasterRoll({
          kind,
          ability,
          skillKey,
          label,
          npcId: npc.id || null,
          tokenId: liveToken?.id || null,
          actorName: npc.name
        }).catch((error) => showMasterRollToast(String(error.message || error)));
      },
      onHpChange: async ({ tokenId, action, delta, reason }) => {
        const data = await call("/combat/hp", {
          method: "POST",
          body: JSON.stringify({ tokenId, action, delta, reason })
        });
        if (data.log) state.log.unshift(data.log);
        if (Array.isArray(data.combatLog)) state.log = data.combatLog;
        if (data.combat) state.combat = data.combat;
        if (data.token) {
          const t = (state.tokens || []).find((x) => x.id === data.token.id);
          if (t) {
            t.hpCurrent = data.token.hpCurrent;
            t.hpMax = data.token.hpMax;
          }
        }
        renderLog();
        renderTokenPanel();
        renderCombatInitiativeBar();
        return data;
      }
    }
  );
}

async function ensureNpcsLoaded() {
  try {
    state.npcs = await call("/npc");
  } catch {
    /* ignore */
  }
  return state.npcs || [];
}

async function openNpcSheetForToken(token) {
  await ensureNpcsLoaded();
  let npc = findNpcForToken(token);
  if (!npc) {
    npc = {
      name: token.name,
      type: token.type || "npc",
      hp: token.hpMax ?? 10,
      ac: "—",
      speed: "—",
      abilities: {},
      actions: [],
      notes: "Нет карточки NPC в шаблоне (нет npcId / совпадения по имени). Есть только токен на карте."
    };
  }
  openNpcSheet(npc, { token });
}

function openNpcFromInitiative(combatant, sheet) {
  const live = (state.tokens || []).find((t) => t.id === combatant.tokenId);
  const token = {
    id: combatant.tokenId,
    name: live?.name || combatant.name,
    hpCurrent: live?.hpCurrent ?? combatant.hpCurrent,
    hpMax: live?.hpMax ?? combatant.hpMax
  };
  const npc = sheet || findNpcForToken(token) || {
    name: combatant.name,
    type: combatant.type,
    hp: combatant.hpMax,
    abilities: {},
    actions: [],
    notes: "Нет данных карточки."
  };
  openNpcSheet(
    {
      ...npc,
      hpCurrent: token.hpCurrent ?? npc.hp,
      hpMax: token.hpMax ?? npc.hp
    },
    { token }
  );
}

function openFromInitiative(combatant, sheet) {
  if (combatant?.characterId || combatant?.type === "player") {
    if (!combatant.characterId) {
      if (ui.combatStatus) {
        ui.combatStatus.textContent = "У этого героя нет characterId — карточку открыть нельзя";
      }
      return;
    }
    setRollTargetFromCombatant(combatant);
    openHeroCard(combatant.characterId).catch((error) => {
      console.error(error);
      if (ui.combatStatus) ui.combatStatus.textContent = String(error.message || error);
    });
    return;
  }
  setRollTargetFromCombatant(combatant);
  openNpcFromInitiative(combatant, sheet);
}

function renderCombatInitiativeBar() {
  renderInitiativeBar(ui.initiativeBar, state.combat, {
    onOpenSheet: openFromInitiative
  });
  syncForceEndCombatButton();
  const current = state.combat?.current || state.combat?.order?.[state.combat?.currentIndex || 0] || null;
  if (current && (!state.rollTarget || state.rollTarget.tokenId === current.tokenId || !state.rollTarget.tokenId)) {
    setRollTargetFromCombatant(current);
  } else {
    renderQuickRollPanel();
  }
}

function openMonsterCard(m) {
  const abs = m.abilities || {};
  const acText = m.armorClassLabel || (m.acNotes ? `Класс брони ${m.ac} (${m.acNotes})` : `Класс брони ${m.ac}`);
  const sources = [...new Set(String(m.sourceSite || "").split("+").filter(Boolean))];
  ui.monsterModalBody?.classList.remove("npc-sheet-card");
  ui.monsterModalBody.innerHTML = `
    <div class="row">
      <div class="title">${m.name}</div>
      <button type="button" id="closeMonsterCardBtn">Закрыть</button>
    </div>
    <div class="muted">${m.size ?? ""} ${m.type} · ${m.alignment ?? ""} · КС ${m.challengeRating}${m.xp ? ` (${m.xp} XP)` : ""}</div>
    <div class="row">
      <span class="pill" title="Armor Class">${acText}</span>
      <span class="pill">ХП ${m.hp}${m.hpFormula ? ` (${m.hpFormula})` : ""}</span>
      <span class="pill">Скорость ${m.speed}</span>
    </div>
    <div class="card">
      <div class="subtitle">Класс брони</div>
      <div><strong>${m.ac ?? "—"}</strong>${m.acNotes ? ` — ${m.acNotes}` : " — без доспеха / природный"}</div>
    </div>
    <div class="stat-grid">
      ${["str", "dex", "con", "int", "wis", "cha"]
        .map(
          (k) => `
        <div class="stat-box">
          <div class="label">${k.toUpperCase()}</div>
          <div class="value">${abs[k] ?? "—"} (${abilityMod(abs[k])})</div>
        </div>`
        )
        .join("")}
    </div>
    ${m.description ? `<div class="card">${m.description}</div>` : ""}
    ${listBlock("Навыки", m.skills)}
    ${listBlock("Чувства", m.senses)}
    ${listBlock("Языки", m.languages)}
    ${listBlock("Иммунитеты", m.immunities)}
    ${listBlock("Уязвимости", m.vulnerabilities)}
    ${listBlock("Особенности", m.traits)}
    ${listBlock("Действия", m.actions)}
    ${
      m.spellcasting
        ? `<div class="card"><div class="subtitle">Заклинания</div>
          Характеристика: ${m.spellcasting.ability}, Сл ${m.spellcasting.saveDC}, атака ${m.spellcasting.attackBonus}<br/>
          Подготовлено: ${(m.spellcasting.prepared || []).join(", ")}</div>`
        : ""
    }
    ${listBlock("Снаряжение", m.equipment)}
    ${listBlock("Возможная добыча", m.loot)}
    <div class="muted">Источник: ${sources.join(", ")}${m.documentTitle ? ` · ${m.documentTitle}` : ""}</div>
    <div class="row">
      <button type="button" class="primary" id="addMonsterTokenBtn">Добавить токен на карту</button>
    </div>
  `;
  ui.monsterModal.classList.remove("hidden");
  document.getElementById("closeMonsterCardBtn")?.addEventListener("click", closeMonsterCard);
  document.getElementById("addMonsterTokenBtn")?.addEventListener("click", async () => {
    const dex = Number(m.abilities?.dex ?? 10);
    await call("/map/tokens", {
      method: "POST",
      body: JSON.stringify({
        name: m.name,
        type: "monster",
        hpCurrent: m.hp,
        hpMax: m.hp,
        portraitUrl: m.image || m.portraitUrl || null,
        monsterDexScore: dex,
        position: { x: 3, y: 3 }
      })
    });
    await syncVision();
    closeMonsterCard();
  });
}

function closeMonsterCard() {
  ui.monsterModal.classList.add("hidden");
  ui.monsterModalBody?.classList.remove("npc-sheet-card");
  ui.monsterModalBody.innerHTML = "";
}

function renderNpcs() {
  ui.npcList.innerHTML = "";
  const list = state.npcs || [];
  if (!list.length) {
    ui.npcList.innerHTML = `<div class="muted">Нет NPC. Примените шаблон приключения.</div>`;
    return;
  }
  for (const npc of list) {
    const card = document.createElement("div");
    card.className = "card monster-row stack";
    const actionPreview = (npc.actions || [])
      .slice(0, 2)
      .map((a) => a.name)
      .join(" · ");
    card.innerHTML = `
      <div class="row">
        <strong>${escapeHtml(npc.name)}</strong>
        <span class="pill">ХП ${escapeHtml(String(npc.hp))} / КД ${escapeHtml(String(npc.ac))}</span>
      </div>
      ${actionPreview ? `<div class="muted">${escapeHtml(actionPreview)}</div>` : ""}
      <div class="row"><button type="button" class="primary" data-open-npc>Карточка</button></div>
    `;
    card.querySelector("[data-open-npc]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openNpcSheet(npc);
    });
    card.addEventListener("click", () => openNpcSheet(npc));
    ui.npcList.appendChild(card);
  }
}

function showMasterRollToast(text) {
  if (!ui.rollToast) return;
  ui.rollToast.textContent = text;
  ui.rollToast.classList.remove("hidden");
  clearTimeout(showMasterRollToast._t);
  showMasterRollToast._t = setTimeout(() => ui.rollToast?.classList.add("hidden"), 4500);
}

async function requestMasterRoll(payload) {
  const data = await call("/combat/roll", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (Array.isArray(data.combatLog)) state.log = data.combatLog;
  if (data.combat) {
    state.combat = data.combat;
    renderCombatInitiativeBar();
  }
  renderLog();
  const log = data.log;
  if (log?.detail) {
    showMasterRollToast(`${log.actorName || ""} · ${log.label || ""}: ${log.detail}`.trim());
  }
  return data;
}

function setRollTargetFromCombatant(combatant) {
  if (!combatant) {
    state.rollTarget = null;
    renderQuickRollPanel();
    return;
  }
  state.rollTarget = {
    name: combatant.name,
    type: combatant.type,
    characterId: combatant.characterId || null,
    npcId: combatant.npcId || null,
    tokenId: combatant.tokenId || null
  };
  renderQuickRollPanel();
}

function renderQuickRollPanel() {
  if (!ui.quickRollPanel) return;
  const target = state.rollTarget;
  if (!target) {
    const current = state.combat?.current || state.combat?.order?.[state.combat?.currentIndex || 0] || null;
    if (current) {
      state.rollTarget = {
        name: current.name,
        type: current.type,
        characterId: current.characterId || null,
        npcId: current.npcId || null,
        tokenId: current.tokenId || null
      };
    }
  }
  const t = state.rollTarget;
  if (!t) {
    ui.quickRollPanel.innerHTML = `<div class="muted">Выберите бойца в инициативе или токен — здесь появятся быстрые броски</div>`;
    return;
  }

  const character = t.characterId ? (state.characters || []).find((c) => c.id === t.characterId) : null;
  const npc =
    !character && (t.npcId || t.tokenId)
      ? findNpcForToken({ id: t.tokenId, npcId: t.npcId, name: t.name }) ||
        (state.npcs || []).find((n) => n.id === t.npcId) ||
        null
      : null;

  const ABIL_RU = {
    str: { label: "Сила", short: "Сил", icon: "💪" },
    dex: { label: "Ловкость", short: "Лов", icon: "🤸" },
    con: { label: "Телосложение", short: "Тел", icon: "🫀" },
    int: { label: "Интеллект", short: "Инт", icon: "🧠" },
    wis: { label: "Мудрость", short: "Мдр", icon: "👁️" },
    cha: { label: "Харизма", short: "Хар", icon: "✨" }
  };

  let abilHtml = "";
  let skillsHtml = "";

  if (character) {
    const abs = character.abilities || {};
    abilHtml = ["str", "dex", "con", "int", "wis", "cha"]
      .map((k) => {
        const a = abs[k] || {};
        const meta = ABIL_RU[k];
        return `<button type="button" class="hs-abil hs-rollable" data-roll="ability" data-ability="${k}" data-roll-label="${escapeAttr(meta.label)}" title="${escapeAttr(meta.label)}">
          <div class="hs-abil-ico">${meta.icon}</div>
          <div class="hs-abil-label">${meta.short}</div>
          <div class="hs-abil-score">${a.score ?? "—"}</div>
          <div class="hs-abil-mod">${fmtMod(a.modifier)}</div>
        </button>`;
      })
      .join("");
    const skills = (character.skills || []).filter((s) => Number(s.proficiencyLevel) > 0).slice(0, 8);
    skillsHtml = skills
      .map((s) => {
        const label = skillLabelRu(s);
        const key = String(s.key || s.label || "")
          .trim()
          .toLowerCase()
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ");
        const bonus = skillBonus(character, s);
        return `<button type="button" class="hs-chip hs-chip-hot hs-rollable" data-roll="skill" data-skill-key="${escapeAttr(key)}" data-ability="${escapeAttr(s.baseAbility || "")}" data-roll-label="${escapeAttr(label)}">
          <span class="hs-chip-label">${escapeHtml(label)}</span>
          <span class="hs-chip-val">${fmtMod(bonus)}</span>
        </button>`;
      })
      .join("");
  } else {
    const source = npc || { abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, name: t.name };
    const abs = source.abilities || {};
    abilHtml = ["str", "dex", "con", "int", "wis", "cha"]
      .map((k) => {
        const score = typeof abs[k] === "object" ? abs[k]?.score : abs[k];
        const mod =
          typeof abs[k] === "object" && abs[k]?.modifier != null
            ? Number(abs[k].modifier)
            : Math.floor((Number(score ?? 10) - 10) / 2);
        const meta = ABIL_RU[k];
        return `<button type="button" class="hs-abil hs-rollable" data-roll="ability" data-ability="${k}" data-roll-label="${escapeAttr(meta.label)}" title="${escapeAttr(meta.label)}">
          <div class="hs-abil-ico">${meta.icon}</div>
          <div class="hs-abil-label">${meta.short}</div>
          <div class="hs-abil-score">${score ?? "—"}</div>
          <div class="hs-abil-mod">${fmtMod(mod)}</div>
        </button>`;
      })
      .join("");
  }

  ui.quickRollPanel.innerHTML = `
    <div class="quick-roll-title muted">Броски · <strong>${escapeHtml(t.name)}</strong></div>
    <div class="quick-roll-abils hs-abil-grid">${abilHtml}</div>
    ${skillsHtml ? `<div class="quick-roll-skills">${skillsHtml}</div>` : `<div class="muted" style="font-size:12px">Клик по характеристике — проверка</div>`}
  `;

  bindSheetRolls(ui.quickRollPanel, {
    onRoll: ({ kind, ability, skillKey, label }) => {
      const payload = {
        kind,
        ability,
        skillKey,
        label,
        characterId: t.characterId || undefined,
        npcId: t.npcId || undefined,
        tokenId: t.tokenId || undefined,
        actorName: t.name
      };
      requestMasterRoll(payload).catch((error) => showMasterRollToast(String(error.message || error)));
    }
  });
}

function renderLog() {
  ui.combatLog.innerHTML = "";
  const entries = (state.log || []).slice(0, 16);
  if (!entries.length) {
    ui.combatLog.innerHTML = `<div class="muted">Пока пусто — броски и правки ХП появятся здесь</div>`;
    return;
  }
  for (const log of entries) {
    const row = document.createElement("div");
    if (log.type === "roll") {
      row.className = "card combat-log-roll";
      const who = log.actorName || log.rollerName || "—";
      row.innerHTML = `<strong>${escapeHtml(who)}</strong> · ${escapeHtml(log.label || "бросок")}
        <div class="mono">${escapeHtml(log.detail || "")}</div>
        <div class="muted" style="font-size:12px">${escapeHtml(
          log.rollerName && log.rollerName !== who ? `бросил: ${log.rollerName}` : ""
        )}</div>`;
    } else {
      row.className = "card combat-log-hp";
      const delta = Number(log.delta) || 0;
      const sign = delta > 0 ? "+" : "";
      const name = log.tokenName || "Токен";
      const hp =
        log.hpCurrent != null && log.hpMax != null ? ` · ${log.hpCurrent}/${log.hpMax}` : "";
      const reason = log.reason && !String(log.reason).includes(name) ? ` · ${log.reason}` : "";
      row.innerHTML = `<strong>${escapeHtml(name)}</strong> <span class="mono">${sign}${delta}</span> ХП${escapeHtml(hp)}<div class="muted" style="font-size:12px">${escapeHtml(
        reason.replace(/^·\s*/, "") || (delta < 0 ? "урон" : "лечение")
      )}</div>`;
    }
    ui.combatLog.appendChild(row);
  }
}

async function syncVision() {
  const data = await call("/map/vision");
  state.vision = data.rule;
  state.visibleCells = data.visibleCells || [];
  state.tokens = data.tokens || [];
  state.tiles = data.tiles || {};
  state.overlays = data.overlays || {};
  state.mapWidth = data.width || 40;
  state.mapHeight = data.height || 30;
  state.members = data.members || [];
  state.characters = data.characters || [];
  state.combat = data.combat || null;
  state.maps = data.maps || [];
  state.activeMapId = data.activeMapId || data.mapId || null;
  state.playerMapId = data.playerMapId || null;
  if (Array.isArray(data.combatLog)) {
    state.log = data.combatLog;
    renderLog();
  }
  if (data.loot) {
    state.loot = { ...state.loot, ...data.loot };
  }
  if (data.privateChat) {
    applyPrivateChat(data);
  }
  ui.visionMode.value = state.vision.mode;
  if (state.vision.radius !== undefined) {
    ui.visionRadius.value = String(state.vision.radius);
  }
  const mapName = data.mapName || state.maps.find((m) => m.id === state.activeMapId)?.name || "Карта";
  ui.visionStatus.textContent = `${mapName} · ${VISION_MODE_RU[state.vision.mode] ?? state.vision.mode}, видно клеток: ${state.visibleCells.length}`;
  renderMapTabs();
  renderMap();
  renderTokenPanel();
  renderSecretsList();
  renderLootPanel();
  renderHeroesList();
  updateCombatStatus();
  renderCombatInitiativeBar();
  window.__dndHeroes = state.characters.map((c) => ({ id: c.id, name: c.name, experience: c.experience, level: c.level }));
  window.__dndOpenHero = (id) => openHeroCard(id);
  // подтягиваем NPC для карточек токенов (не блокируем UI)
  call("/npc")
    .then((npcs) => {
      state.npcs = npcs || [];
      renderNpcs();
      renderTokenPanel();
      renderQuickRollPanel();
    })
    .catch(() => {});
}

function renderMapTabs() {
  if (!ui.mapTabs) return;
  ui.mapTabs.innerHTML = "";
  for (const m of state.maps) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `map-tab${m.isActive ? " active" : ""}${m.published ? " published" : ""}`;
    btn.textContent = m.name;
    btn.title = `${m.name} · ${m.width}×${m.height} · токенов ${m.tokenCount}${m.published ? " · открыта игрокам" : ""}`;
    btn.addEventListener("click", () => activateMap(m.id).catch(console.error));
    ui.mapTabs.appendChild(btn);
  }
  const active = state.maps.find((m) => m.isActive);
  if (ui.mapTabsStatus) {
    ui.mapTabsStatus.textContent = active
      ? `Активна: ${active.name}${active.published ? " (видят игроки)" : " (только мастер)"}${state.playerMapId === active.id ? " · карта игроков по умолчанию" : ""}`
      : "";
  }
}

async function activateMap(mapId) {
  if (!mapId || mapId === state.activeMapId) return;
  await call(`/maps/${encodeURIComponent(mapId)}/activate`, { method: "POST", body: "{}" });
  await syncVision();
}

async function publishActiveMap(published) {
  const id = state.activeMapId;
  if (!id) return;
  await call(`/maps/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    body: JSON.stringify({ published, setAsPlayerDefault: published })
  });
  await syncVision();
}

async function addEmptyMap() {
  const name = window.prompt("Название карты", `Карта ${(state.maps?.length || 0) + 1}`);
  if (name === null) return;
  await call("/maps", {
    method: "POST",
    body: JSON.stringify({ name: name.trim() || "Карта", published: false })
  });
  await syncVision();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportMaps(all) {
  const q = all ? "" : `?mapId=${encodeURIComponent(state.activeMapId || "")}`;
  const data = await call(`/maps/export${q}`);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = all
    ? `dnd-maps-${stamp}.json`
    : `dnd-map-${(state.maps.find((m) => m.id === state.activeMapId)?.name || "map").replace(/[^\wа-яё\-]+/gi, "_")}-${stamp}.json`;
  downloadJson(name, data);
  if (ui.mapTabsStatus) ui.mapTabsStatus.textContent = all ? "Набор карт сохранён" : "Карта сохранена";
}

async function importMapsFromFile(file) {
  if (!file) return;
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    window.alert("Некорректный JSON");
    return;
  }
  const replace = window.confirm("Заменить текущий набор карт?\nОК — заменить, Отмена — добавить к существующим.");
  await call("/maps/import", {
    method: "POST",
    body: JSON.stringify({ ...payload, replace })
  });
  await syncVision();
  if (ui.mapTabsStatus) ui.mapTabsStatus.textContent = "Карты загружены";
}

async function loadAdventures() {
  if (!ui.adventureList) return;
  try {
    const data = await call("/adventures");
    const list = data.adventures || [];
    ui.adventureList.innerHTML = "";
    if (!list.length) {
      ui.adventureList.innerHTML = `<div class="muted">Шаблонов пока нет</div>`;
      return;
    }
    for (const a of list) {
      const card = document.createElement("div");
      card.className = "adventure-card";
      card.innerHTML = `
        <div class="row">
          <strong>${a.title}</strong>
          <span class="pill">L${a.level} · ${a.mapCount} карт · ${a.npcCount} НПС</span>
        </div>
        <div class="muted">${a.description || ""}</div>
        <div class="row">
          <span class="muted">${a.duration || ""} · ${a.players || "?"} игроков</span>
          <button type="button" class="primary" data-apply>Загрузить шаблон</button>
        </div>
      `;
      card.querySelector("[data-apply]")?.addEventListener("click", () => applyAdventure(a.id).catch(console.error));
      ui.adventureList.appendChild(card);
    }
    state.adventuresLoaded = true;
  } catch (e) {
    if (ui.adventureStatus) ui.adventureStatus.textContent = `Ошибка шаблонов: ${e.message || e}`;
  }
}

async function applyAdventure(id) {
  if (!window.confirm("Загрузить шаблон приключения? Текущие карты будут заменены, НПС шаблона — в список.")) {
    return;
  }
  if (ui.adventureStatus) ui.adventureStatus.textContent = "Загрузка…";
  const data = await call(`/adventures/${encodeURIComponent(id)}/apply`, {
    method: "POST",
    body: JSON.stringify({ replaceNpcs: true })
  });
  state.npcs = await call("/npc");
  renderNpcs();
  await syncVision();
  const notes = (data.adventure?.notes || []).join(" ");
  if (ui.adventureStatus) {
    ui.adventureStatus.textContent = `Готово: ${data.adventure?.title || id}. ${notes}`;
  }
}

async function applyVision() {
  const mode = ui.visionMode.value;
  const payload = { mode, radius: Number(ui.visionRadius.value || 3) };
  if (mode === "manual") {
    payload.revealedCells = state.visibleCells;
  }
  const data = await call("/map/vision", { method: "PUT", body: JSON.stringify(payload) });
  state.vision = data.rule;
  state.visibleCells = data.visibleCells || [];
  ui.visionStatus.textContent = `${VISION_MODE_RU[state.vision.mode] ?? state.vision.mode}, видно клеток: ${state.visibleCells.length}`;
  await syncVision();
}

async function revealSample() {
  const cells = [];
  for (let y = 2; y < 7; y += 1) {
    for (let x = 2; x < 8; x += 1) {
      cells.push({ x, y });
    }
  }
  await call("/map/vision", {
    method: "PUT",
    body: JSON.stringify({ mode: "manual", revealedCells: cells })
  });
  await syncVision();
}

async function addToken() {
  await call("/map/tokens", {
    method: "POST",
    body: JSON.stringify({
      name: ui.tokenName.value,
      type: ui.tokenType.value,
      hpCurrent: Number(ui.tokenHpCurrent.value || 1),
      hpMax: Number(ui.tokenHpMax.value || 1),
      position: { x: Number(ui.tokenX.value || 0), y: Number(ui.tokenY.value || 0) }
    })
  });
  await syncVision();
}

async function quickHp(tokenId, action) {
  const token = (state.tokens || []).find((t) => t.id === tokenId);
  const data = await call("/combat/hp", {
    method: "POST",
    body: JSON.stringify({
      tokenId,
      action,
      reason: `${token?.name || "Токен"} · панель ${action}`
    })
  });
  if (data.log) state.log.unshift(data.log);
  if (Array.isArray(data.combatLog)) state.log = data.combatLog;
  if (data.combat) state.combat = data.combat;
  await syncVision();
  renderLog();
  renderCombatInitiativeBar();
}

function setMonsterProgress(percent, message) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  ui.monsterProgressWrap?.classList.remove("hidden");
  if (ui.monsterProgressFill) ui.monsterProgressFill.style.width = `${pct}%`;
  if (ui.monsterProgressPct) ui.monsterProgressPct.textContent = `${pct}%`;
  if (ui.monsterProgressMsg) ui.monsterProgressMsg.textContent = message || "";
}

async function preloadMonsters(forceRefresh = false) {
  ui.preloadMonstersBtn.disabled = true;
  ui.refreshMonstersBtn && (ui.refreshMonstersBtn.disabled = true);
  setMonsterProgress(0, forceRefresh ? "Принудительное обновление…" : "Запуск загрузки…");
  ui.monsterStatus.textContent = "загрузка…";

  try {
    await call("/monsters/preload", {
      method: "POST",
      body: JSON.stringify({ forceRefresh: Boolean(forceRefresh) })
    });

    for (;;) {
      const progress = await call("/monsters/preload/progress");
      setMonsterProgress(progress.percent ?? 0, progress.message || "");
      if (progress.status === "done" || progress.status === "error") {
        const src = (progress.sources || []).join(", ") || "—";
        const cacheNote = progress.fromCache ? "кэш" : progress.fallback ? "локальный запасной" : "сеть";
        ui.monsterStatus.textContent = `${progress.loaded ?? 0} шт. · ${cacheNote} · ${src}`;
        state.monsters = await call("/monsters");
        renderMonsters();
        if (progress.status === "error") {
          ui.monsterStatus.textContent = `ошибка: ${progress.message || "сбой загрузки"}`;
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  } catch (error) {
    setMonsterProgress(0, "Ошибка");
    ui.monsterStatus.textContent = `ошибка: ${String(error.message || error)}`;
  } finally {
    ui.preloadMonstersBtn.disabled = false;
    ui.refreshMonstersBtn && (ui.refreshMonstersBtn.disabled = false);
  }
}

async function createNpc() {
  await call("/npc/custom", {
    method: "POST",
    body: JSON.stringify({
      name: ui.npcName.value || "NPC",
      hp: Number(ui.npcHp.value || 10),
      ac: Number(ui.npcAc.value || 10),
      challengeRating: "1",
      type: "humanoid",
      speed: "30 ft",
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      actions: [{ name: "Атака", description: "Базовый удар" }]
    })
  });
  state.npcs = await call("/npc");
  renderNpcs();
}

async function closeLobby() {
  await call("/lobby/close", { method: "POST", body: "{}" });
  localStorage.removeItem(SESSION_KEY);
  state.sessionToken = null;
  showLogin();
}

function setRightTab(tab) {
  state.rightTab = tab;
  ui.rightPaneCombat?.classList.toggle("hidden", tab !== "combat");
  ui.rightPaneLoot?.classList.toggle("hidden", tab !== "loot");
  ui.rightPaneChat?.classList.toggle("hidden", tab !== "chat");
  ui.rightTabCombat?.classList.toggle("primary", tab === "combat");
  ui.rightTabLoot?.classList.toggle("primary", tab === "loot");
  ui.rightTabChat?.classList.toggle("primary", tab === "chat");
  if (tab === "chat") {
    markActiveChatSeen();
    renderMasterChat();
  }
}

function formatChatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function activeChatThread() {
  const threads = state.privateChat?.threads || [];
  if (!threads.length) return null;
  if (state.chatPlayerId) {
    const found = threads.find((t) => t.playerId === state.chatPlayerId);
    if (found) return found;
  }
  return threads[0];
}

function unreadForThread(thread) {
  if (!thread?.messages?.length) return 0;
  const seenId = state.chatSeen[thread.playerId] || "";
  if (!seenId) return thread.messages.filter((m) => m.fromRole === "player").length;
  const idx = thread.messages.findIndex((m) => m.id === seenId);
  if (idx < 0) return thread.messages.filter((m) => m.fromRole === "player").length;
  return thread.messages.slice(idx + 1).filter((m) => m.fromRole === "player").length;
}

function markActiveChatSeen() {
  const thread = activeChatThread();
  if (!thread?.messages?.length) return;
  const last = thread.messages[thread.messages.length - 1];
  state.chatSeen[thread.playerId] = last.id;
  updateChatBadges();
}

function updateChatBadges() {
  const threads = state.privateChat?.threads || [];
  let total = 0;
  for (const t of threads) total += unreadForThread(t);
  if (ui.chatTabBadge) {
    ui.chatTabBadge.textContent = String(total);
    ui.chatTabBadge.classList.toggle("hidden", total === 0 || state.rightTab === "chat");
  }
}

function renderChatBubbleHtml(msg) {
  const role = msg.fromRole === "master" ? "master" : "player";
  const who = escapeHtml(msg.fromName || (role === "master" ? "Мастер" : "Игрок"));
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

function renderMasterChatDice() {
  if (!ui.chatDiceRow) return;
  const dice = state.privateChat?.dice || [4, 6, 8, 10, 12, 20];
  const disabled = !activeChatThread();
  ui.chatDiceRow.innerHTML = dice
    .map(
      (d) =>
        `<button type="button" class="chat-die-btn" data-chat-die="${d}" ${disabled ? "disabled" : ""}>d${d}</button>`
    )
    .join("");
}

function renderMasterChat() {
  const threads = state.privateChat?.threads || [];
  if (ui.chatPlayerTabs) {
    ui.chatPlayerTabs.innerHTML = "";
    if (!threads.length) {
      ui.chatPlayerTabs.innerHTML = `<div class="muted">Пока нет игроков в лобби</div>`;
    } else {
      if (!state.chatPlayerId || !threads.some((t) => t.playerId === state.chatPlayerId)) {
        state.chatPlayerId = threads[0].playerId;
      }
      for (const t of threads) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `chat-player-tab${t.playerId === state.chatPlayerId ? " active" : ""}`;
        const unread = unreadForThread(t);
        const label = t.characterName || t.playerName || "Игрок";
        btn.innerHTML = `${escapeHtml(label)}${
          unread && state.rightTab !== "chat" ? `<span class="chat-tab-badge">${unread}</span>` : unread && t.playerId !== state.chatPlayerId ? `<span class="chat-tab-badge">${unread}</span>` : ""
        }`;
        btn.addEventListener("click", () => {
          state.chatPlayerId = t.playerId;
          markActiveChatSeen();
          renderMasterChat();
        });
        ui.chatPlayerTabs.appendChild(btn);
      }
    }
  }

  const thread = activeChatThread();
  if (ui.chatThreadMeta) {
    if (!thread) {
      ui.chatThreadMeta.textContent = "Выберите игрока";
    } else {
      const hero = thread.characterName ? ` · ${thread.characterName}` : "";
      ui.chatThreadMeta.textContent = `${thread.playerName}${hero} · только вы двое`;
    }
  }

  if (ui.chatMessages) {
    const msgs = thread?.messages || [];
    if (!msgs.length) {
      ui.chatMessages.innerHTML = `<div class="chat-empty">Напишите скрыто или киньте кубик — другие игроки не увидят</div>`;
    } else {
      ui.chatMessages.innerHTML = msgs.map(renderChatBubbleHtml).join("");
      ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
    }
  }

  renderMasterChatDice();
  if (ui.chatInput) ui.chatInput.disabled = !thread;
  if (ui.chatSendBtn) ui.chatSendBtn.disabled = !thread;
  updateChatBadges();
  if (state.rightTab === "chat") markActiveChatSeen();
}

function applyPrivateChat(data) {
  if (!data?.privateChat) return;
  const prevThread = activeChatThread();
  const prevLast = prevThread?.messages?.length
    ? prevThread.messages[prevThread.messages.length - 1].id
    : "";
  const prevSig = (state.privateChat?.threads || [])
    .map((t) => `${t.playerId}:${t.messageCount || t.messages?.length || 0}`)
    .join("|");
  const draft = ui.chatInput?.value ?? null;
  const firstSync = !state._chatBootstrapped;
  state.privateChat = data.privateChat;
  if (firstSync) {
    state._chatBootstrapped = true;
    for (const t of state.privateChat.threads || []) {
      if (t.messages?.length) {
        state.chatSeen[t.playerId] = t.messages[t.messages.length - 1].id;
      }
    }
  }
  const nextThread = activeChatThread();
  const nextLast = nextThread?.messages?.length
    ? nextThread.messages[nextThread.messages.length - 1].id
    : "";
  const nextSig = (state.privateChat?.threads || [])
    .map((t) => `${t.playerId}:${t.messageCount || t.messages?.length || 0}`)
    .join("|");
  const sameThread = prevThread?.playerId === nextThread?.playerId;
  if (sameThread && prevLast === nextLast && prevSig === nextSig && ui.chatMessages && state.rightTab === "chat") {
    updateChatBadges();
    markActiveChatSeen();
    return;
  }
  renderMasterChat();
  if (draft != null && ui.chatInput && document.activeElement === ui.chatInput) {
    ui.chatInput.value = draft;
  }
}

async function sendMasterChatMessage() {
  const thread = activeChatThread();
  const text = ui.chatInput?.value?.trim() || "";
  if (!thread || !text) return;
  ui.chatSendBtn.disabled = true;
  try {
    const data = await call("/chat/message", {
      method: "POST",
      body: JSON.stringify({ playerId: thread.playerId, text })
    });
    if (ui.chatInput) ui.chatInput.value = "";
    applyPrivateChat(data);
    markActiveChatSeen();
  } catch (error) {
    window.alert(String(error.message || error));
  } finally {
    if (ui.chatSendBtn) ui.chatSendBtn.disabled = !activeChatThread();
  }
}

async function sendMasterChatRoll(die) {
  const thread = activeChatThread();
  if (!thread) return;
  try {
    const data = await call("/chat/roll", {
      method: "POST",
      body: JSON.stringify({ playerId: thread.playerId, die })
    });
    applyPrivateChat(data);
    markActiveChatSeen();
  } catch (error) {
    window.alert(String(error.message || error));
  }
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rarityBadge(item) {
  const id = item.rarity || "common";
  const label = item.rarityLabel || id;
  return `<span class="rarity-badge rarity-${id}">${label}</span>`;
}

function formatLootStats(item) {
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

function lootStatsBlock(item) {
  const s = item.stats || {};
  const rows = [];
  if (s.attackBonus) rows.push(`<div><span class="muted">Бонус атаки</span> · ${escapeHtml(s.attackBonus)}</div>`);
  if (s.damage) rows.push(`<div><span class="muted">Урон</span> · ${escapeHtml(s.damage)}</div>`);
  if (s.ac) rows.push(`<div><span class="muted">КД</span> · ${escapeHtml(s.ac)}</div>`);
  if (s.charges) rows.push(`<div><span class="muted">Заряды</span> · ${escapeHtml(s.charges)}</div>`);
  if (s.notes) rows.push(`<div><span class="muted">Свойства</span> · ${escapeHtml(s.notes)}</div>`);
  if (item.requiresAttunement) rows.push(`<div><span class="muted">Настройка</span> · да</div>`);
  if (!rows.length) return "";
  return `<div class="loot-stats">${rows.join("")}</div>`;
}

function openLootCard(item, from = "drops") {
  if (!ui.lootModalBody || !item) return;
  const src = item.documentTitle || item.source || "";
  ui.lootModalBody.innerHTML = `
    <div class="row">
      <div class="title">${escapeHtml(item.name)}</div>
      <button type="button" id="closeLootCardBtn">Закрыть</button>
    </div>
    <div class="row">
      ${rarityBadge(item)}
      <span class="pill">${escapeHtml(item.type || "предмет")}</span>
    </div>
    ${lootStatsBlock(item)}
    <div class="loot-desc-full">${escapeHtml(item.description || "Описание отсутствует").replace(/\n/g, "<br/>")}</div>
    ${src ? `<div class="muted">Источник: ${escapeHtml(src)}</div>` : ""}
    <div class="row">
      <button type="button" class="primary" id="lootModalGrantBtn">Выдать игроку</button>
      <button type="button" id="lootModalRemoveBtn">Убрать из списка</button>
    </div>
  `;
  ui.lootModal.classList.remove("hidden");
  document.getElementById("closeLootCardBtn")?.addEventListener("click", closeLootCard);
  document.getElementById("lootModalGrantBtn")?.addEventListener("click", async () => {
    await grantLootItem(item.id, from);
    closeLootCard();
  });
  document.getElementById("lootModalRemoveBtn")?.addEventListener("click", async () => {
    await removeLootItem(item.id, from);
    closeLootCard();
  });
}

function closeLootCard() {
  ui.lootModal?.classList.add("hidden");
  if (ui.lootModalBody) ui.lootModalBody.innerHTML = "";
}

function renderLastDrop(item) {
  if (!ui.lootLastDrop) return;
  if (!item) {
    ui.lootLastDrop.classList.add("hidden");
    ui.lootLastDrop.innerHTML = "";
    return;
  }
  ui.lootLastDrop.classList.remove("hidden");
  const stats = formatLootStats(item);
  ui.lootLastDrop.innerHTML = `
    <div class="row">
      <strong>${escapeHtml(item.name)}</strong>
      ${rarityBadge(item)}
    </div>
    <div class="muted">${escapeHtml(item.type || "предмет")}${stats ? ` · ${escapeHtml(stats)}` : ""}</div>
    ${lootStatsBlock(item)}
    <div class="loot-desc-scroll">${escapeHtml(item.description || "Нет описания").replace(/\n/g, "<br/>")}</div>
    <div class="row">
      <button type="button" data-act="details" class="primary">Подробнее</button>
      <button type="button" data-act="grant">Выдать</button>
    </div>
  `;
  ui.lootLastDrop.querySelector('[data-act="details"]')?.addEventListener("click", () => openLootCard(item, "drops"));
  ui.lootLastDrop.querySelector('[data-act="grant"]')?.addEventListener("click", () => grantLootItem(item.id, "drops"));
}

function renderLootList(container, items, from) {
  if (!container) return;
  container.innerHTML = "";
  if (!items?.length) {
    container.innerHTML = `<div class="muted">пусто</div>`;
    return;
  }
  // newest first
  const ordered = [...items].reverse();
  for (const item of ordered) {
    const card = document.createElement("div");
    card.className = "card loot-item";
    const stats = formatLootStats(item);
    card.innerHTML = `
      <div class="row">
        <strong>${escapeHtml(item.name)}</strong>
        ${rarityBadge(item)}
      </div>
      <div class="muted">${escapeHtml(item.type || "предмет")}${stats ? ` · ${escapeHtml(stats)}` : ""}</div>
      ${lootStatsBlock(item)}
      <div class="loot-desc-scroll">${escapeHtml(item.description || "Нет описания").replace(/\n/g, "<br/>")}</div>
      <div class="row">
        <button type="button" data-act="details">Подробнее</button>
        <button type="button" data-act="grant" class="primary">Выдать</button>
        <button type="button" data-act="remove">Убрать</button>
      </div>
    `;
    card.querySelector('[data-act="details"]')?.addEventListener("click", () => openLootCard(item, from));
    card.querySelector('[data-act="grant"]')?.addEventListener("click", () => grantLootItem(item.id, from));
    card.querySelector('[data-act="remove"]')?.addEventListener("click", () => removeLootItem(item.id, from));
    container.appendChild(card);
  }
}

function renderRarityButtons() {
  if (!ui.rarityButtons) return;
  ui.rarityButtons.innerHTML = "";
  for (const r of state.loot.rarities || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = r.label;
    btn.className = state.selectedRarity === r.id ? "primary" : "";
    btn.addEventListener("click", () => {
      state.selectedRarity = r.id;
      renderRarityButtons();
    });
    ui.rarityButtons.appendChild(btn);
  }
  if (ui.lootRarityCustom) {
    ui.lootRarityCustom.innerHTML = (state.loot.rarities || [])
      .map((r) => `<option value="${r.id}">${r.label}</option>`)
      .join("");
  }
}

function renderRecipients() {
  if (!ui.lootRecipient) return;
  const opts = [];
  for (const c of state.characters || []) {
    opts.push(`<option value="c:${c.id}">Персонаж: ${c.name}</option>`);
  }
  for (const m of state.members || []) {
    if (m.role === "master") continue;
    opts.push(`<option value="m:${m.id}">Игрок: ${m.name}</option>`);
  }
  ui.lootRecipient.innerHTML =
    opts.join("") || `<option value="">Нет получателей — пусть игроки зайдут в лобби</option>`;
}

function renderLootGrants() {
  if (!ui.lootGrantsList) return;
  ui.lootGrantsList.innerHTML = "";
  const grants = state.loot.grants || [];
  if (!grants.length) {
    ui.lootGrantsList.innerHTML = `<div class="muted">пока никому не выдавали</div>`;
    return;
  }
  for (const g of grants) {
    const row = document.createElement("div");
    row.className = "card";
    row.textContent = `${g.item?.name ?? "предмет"} → ${g.recipientLabel}`;
    ui.lootGrantsList.appendChild(row);
  }
}

function renderLootPanel() {
  renderRarityButtons();
  renderRecipients();
  renderLootList(ui.lootDropsList, state.loot.sessionDrops, "drops");
  renderLootList(ui.lootCampaignList, state.loot.campaignPool, "campaign");
  renderLootGrants();
}

function customLootPayload() {
  return {
    name: ui.lootName?.value || "",
    rarity: ui.lootRarityCustom?.value || "common",
    type: ui.lootType?.value || "",
    description: ui.lootDesc?.value || "",
    requiresAttunement: Boolean(ui.lootAttune?.checked),
    stats: {
      attackBonus: ui.lootStatAttack?.value || "",
      damage: ui.lootStatDamage?.value || "",
      ac: ui.lootStatAc?.value || "",
      charges: ui.lootStatCharges?.value || "",
      notes: ui.lootStatNotes?.value || ""
    }
  };
}

async function refreshLoot() {
  const data = await call("/loot");
  state.loot = { ...state.loot, ...data };
  renderLootPanel();
}

async function preloadLootCatalog() {
  ui.lootCatalogStatus.textContent = "загрузка…";
  try {
    const data = await call("/loot/preload", { method: "POST", body: "{}" });
    const counts = data.byRarityCounts || {};
    ui.lootCatalogStatus.textContent = `${data.loaded} шт.${data.fromCache ? " (кэш)" : ""} · о:${counts.common ?? 0} н:${counts.uncommon ?? 0} р:${counts.rare ?? 0}`;
    if (data.rarities) state.loot.rarities = data.rarities;
    renderRarityButtons();
  } catch (error) {
    ui.lootCatalogStatus.textContent = `ошибка: ${String(error.message || error)}`;
  }
}

async function rollRandomLoot() {
  try {
    const data = await call("/loot/random", {
      method: "POST",
      body: JSON.stringify({ rarity: state.selectedRarity, count: 1 })
    });
    state.loot = { ...state.loot, ...data.loot };
    const item = data.items?.[0] || null;
    renderLootPanel();
    renderLastDrop(item);
    ui.lootCatalogStatus.textContent = item ? `выпало: ${item.name}` : "пусто";
    if (item) openLootCard(item, "drops");
    ui.lootLastDrop?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    ui.lootCatalogStatus.textContent = `ошибка: ${String(error.message || error)}`;
  }
}

async function addCustomLoot(target) {
  const payload = { ...customLootPayload(), target };
  const data = await call("/loot/custom", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.loot = { ...state.loot, ...data.loot };
  renderLootPanel();
  if (ui.lootName) ui.lootName.value = "";
  if (ui.lootDesc) ui.lootDesc.value = "";
}

async function removeLootItem(itemId, from) {
  const path = from === "campaign" ? `/loot/campaign/${itemId}` : `/loot/drops/${itemId}`;
  const data = await call(path, { method: "DELETE" });
  state.loot = { ...state.loot, ...data.loot };
  renderLootPanel();
}

async function grantLootItem(itemId, from) {
  const raw = ui.lootRecipient?.value || "";
  if (!raw) {
    ui.lootCatalogStatus.textContent = "Нет получателя";
    return;
  }
  const body = { itemId, from };
  if (raw.startsWith("c:")) body.characterId = raw.slice(2);
  else if (raw.startsWith("m:")) body.memberId = raw.slice(2);
  else {
    ui.lootCatalogStatus.textContent = "Выберите получателя";
    return;
  }
  try {
    const data = await call("/loot/grant", {
      method: "POST",
      body: JSON.stringify(body)
    });
    state.loot = { ...state.loot, ...data.loot };
    renderLootPanel();
    if (ui.lootLastDrop && !state.loot.sessionDrops?.some((i) => i.id === itemId)) {
      renderLastDrop(null);
    }
    ui.lootCatalogStatus.textContent = `Выдано: ${data.grant?.item?.name} → ${data.grant?.recipientLabel}`;
  } catch (error) {
    ui.lootCatalogStatus.textContent = `ошибка: ${String(error.message || error)}`;
  }
}

async function bootstrapApp() {
  const savedZoom = Number(localStorage.getItem(MAP_ZOOM_KEY));
  if (Number.isFinite(savedZoom) && savedZoom >= 1) {
    state.mapZoom = Math.min(4, savedZoom);
  }
  setupPalette();
  setupMasterSplitter();
  await loadAdventures();
  await syncVision();
  state.monsters = await call("/monsters");
  state.npcs = await call("/npc");
  renderMonsters();
  renderNpcs();
  renderLog();
  renderLootPanel();
  setRightTab("combat");
  document.querySelectorAll(".master-stage-chrome, .master-dock details").forEach((el) => {
    el.addEventListener("toggle", () => {
      requestAnimationFrame(() => {
        const wrap = ui.mapGrid?.closest(".map-wrap");
        if (wrap && state.mapFitCols && state.mapFitRows) {
          applyMapFit(wrap, ui.mapGrid, state.mapFitCols, state.mapFitRows);
        }
      });
    });
  });
  setInterval(syncVision, 3000);
}

ui.masterLoginBtn.addEventListener("click", masterLogin);
ui.applyVisionBtn.addEventListener("click", applyVision);
ui.revealSampleBtn.addEventListener("click", revealSample);
ui.addTokenBtn.addEventListener("click", addToken);
ui.mapZoomOutBtn?.addEventListener("click", () => bumpMapZoom(-1));
ui.mapZoomInBtn?.addEventListener("click", () => bumpMapZoom(1));
ui.mapZoomFitBtn?.addEventListener("click", () => setMapZoom(1));
ui.addMapBtn?.addEventListener("click", () => addEmptyMap().catch(console.error));
ui.publishMapBtn?.addEventListener("click", () => publishActiveMap(true).catch(console.error));
ui.unpublishMapBtn?.addEventListener("click", () => publishActiveMap(false).catch(console.error));
ui.exportMapsBtn?.addEventListener("click", () => exportMaps(true).catch(console.error));
ui.exportOneMapBtn?.addEventListener("click", () => exportMaps(false).catch(console.error));
ui.importMapsInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  try {
    await importMapsFromFile(file);
  } catch (err) {
    console.error(err);
    window.alert(String(err.message || err));
  } finally {
    e.target.value = "";
  }
});
ui.preloadMonstersBtn.addEventListener("click", () => preloadMonsters(false));
ui.refreshMonstersBtn?.addEventListener("click", () => preloadMonsters(true));
ui.monsterSearch?.addEventListener("input", renderMonsters);
ui.monsterModalClose?.addEventListener("click", closeMonsterCard);
ui.createNpcBtn.addEventListener("click", createNpc);
ui.closeLobbyBtn.addEventListener("click", closeLobby);
ui.masterHeroFileInput?.addEventListener("change", () => {
  const files = ui.masterHeroFileInput?.files;
  if (!files?.length) return;
  importMasterHeroFiles(files).catch((error) => {
    if (ui.masterHeroImportStatus) {
      ui.masterHeroImportStatus.textContent = String(error.message || error);
    }
  });
});
ui.masterHeroImportPasteBtn?.addEventListener("click", () => {
  importMasterHeroPaste().catch(console.error);
});
ui.rightTabCombat?.addEventListener("click", () => setRightTab("combat"));
ui.rightTabLoot?.addEventListener("click", () => {
  setRightTab("loot");
  refreshLoot().catch(() => {});
});
ui.rightTabChat?.addEventListener("click", () => setRightTab("chat"));
ui.chatSendBtn?.addEventListener("click", () => sendMasterChatMessage().catch(console.error));
ui.chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMasterChatMessage().catch(console.error);
  }
});
ui.chatDiceRow?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-chat-die]");
  if (!btn) return;
  const die = Number(btn.dataset.chatDie);
  if (!die) return;
  sendMasterChatRoll(die).catch(console.error);
});
ui.openCombatBtn?.addEventListener("click", openCombatPicker);
ui.openCombatBtnSide?.addEventListener("click", openCombatPicker);
ui.combatModalClose?.addEventListener("click", closeCombatPicker);
ui.combatCancelBtn?.addEventListener("click", closeCombatPicker);
ui.combatConfirmBtn?.addEventListener("click", () => confirmCombatPicker().catch(console.error));
ui.combatSelectAllBtn?.addEventListener("click", () => {
  ui.combatPickList?.querySelectorAll("input[data-token-id]:not(:disabled)").forEach((el) => {
    el.checked = true;
  });
});
ui.combatSelectNewBtn?.addEventListener("click", () => {
  const enrolled = new Set((state.combat?.combatants || []).map((c) => c.tokenId));
  ui.combatPickList?.querySelectorAll("input[data-token-id]").forEach((el) => {
    if (el.disabled) return;
    el.checked = !enrolled.has(el.dataset.tokenId);
  });
});
ui.autoInitBtn?.addEventListener("click", () => autoRollNpcs().catch(console.error));
ui.nextTurnBtn?.addEventListener("click", () => nextTurn().catch(console.error));
ui.endCombatBtn?.addEventListener("click", () => endCombatEncounter().catch(console.error));
ui.forceEndCombatBtn?.addEventListener("click", () => endCombatEncounter().catch(console.error));
ui.lootRandomBtn?.addEventListener("click", rollRandomLoot);
ui.lootPreloadBtn?.addEventListener("click", preloadLootCatalog);
ui.lootAddDropBtn?.addEventListener("click", () => addCustomLoot("drops"));
ui.lootAddCampaignBtn?.addEventListener("click", () => addCustomLoot("campaign"));
ui.lootModalClose?.addEventListener("click", closeLootCard);
ui.heroModalClose?.addEventListener("click", closeHeroCard);
ui.heroModalBody?.addEventListener("click", (event) => {
  onHeroModalClick(event);
});
ui.levelUpModalClose?.addEventListener("click", closeLevelUpWizard);

if (!(await restoreSession())) {
  showLogin();
}
