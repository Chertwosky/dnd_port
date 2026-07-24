import { createServer } from "node:http";
import { URL, fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MONSTER_CATALOG } from "./data/monster-catalog.mjs";
import { loadMonstersFromNetwork } from "./data/monster-network.mjs";
import {
  loadMagicItemsFromNetwork,
  pickRandomItems,
  rarityCatalog
} from "./data/magic-items-network.mjs";
import {
  applyLevelUp,
  buildLevelUpOptions,
  classMeta,
  ensureCharacterClasses,
  totalClassLevels,
  formatClassesLabel,
  proficiencyForLevel,
  xpForLevel,
  xpProgress
} from "./data/level-progress.mjs";
import {
  featCardBrief,
  filterFeatsForLevelUp,
  isEpicBoonFeat,
  loadFeatsFromNetwork,
  peekFeatsCache
} from "./data/feats-network.mjs";
import {
  enrichPreparedSpells,
  filterSpells,
  loadSpellsFromNetwork,
  spellCardBrief
} from "./data/spells-network.mjs";
import { skillLabelRu } from "./data/skills-ru.mjs";
import {
  advanceTurn,
  applyInitiativeRoll,
  autoRollPending,
  combatPublicView,
  createEmptyCombat,
  endCombat,
  enlistCombatants,
  ensureCombat
} from "./modules/combat-initiative.mjs";
import {
  getPersistBackend,
  hydrateSession,
  loadLobby,
  loadOpenLobbies,
  persistLobbyNow,
  persistSession,
  schedulePersistLobby
} from "./modules/lobby-persist.mjs";
import {
  appendChatRoll,
  appendChatText,
  privateChatViewForMaster,
  privateChatViewForPlayer
} from "./modules/private-chat.mjs";
import { parseDiceFormula, rollDiceFormula, rollNdM, STANDARD_DICE } from "./modules/dice-formula.mjs";
import {
  addMapDoc,
  createEmptyMapDoc,
  ensureMapSystem,
  exportMapSet,
  getActiveMap,
  getPlayerViewMap,
  importMapSet,
  mapsPublicMeta,
  publishMap,
  replaceMapsFromTemplate,
  setActiveMap,
  syncActiveMapAlias
} from "./modules/map-docs.mjs";
import { getAdventureTemplate, listAdventureTemplates } from "./data/adventures/index.mjs";
import { loadPartyRawFiles, PARTY_CHARACTER_IDS } from "./data/sample-characters/party-roster.mjs";
import {
  featuresForSubclassLevel,
  filterSubclasses,
  loadSubclassesFromNetwork,
  peekSubclassesCache,
  subclassCardBrief
} from "./data/subclasses-network.mjs";
import {
  featuresForClassLevelNetwork,
  isImprovementFeature,
  loadClassesFromNetwork,
  mergeClassFeatures,
  peekClassesCache
} from "./data/classes-network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

/** @type {Map<string, object>} */
const lobbies = new Map();
/** @type {Map<string, { role: string, lobbyId?: string, userId: string, userName: string }>} */
const sessions = new Map();

/** Request-scoped: lobby to persist after successful mutating responses */
let activePersistLobby = null;
let shouldPersistLobbyOnSuccess = false;

/** Текстуры карты: блокируют ли обзор; overlay — поверх базового тайла (тайник в стене/полу) */
const MAP_TEXTURES = [
  // Архитектура
  { id: "wall", label: "Стена", group: "building", blocksVision: true, icon: "🧱", kind: "tile" },
  { id: "brick", label: "Кирпич", group: "building", blocksVision: true, icon: "🟫", kind: "tile" },
  { id: "metal", label: "Металл", group: "building", blocksVision: true, icon: "⬛", kind: "tile" },
  { id: "column", label: "Колонна", group: "building", blocksVision: true, icon: "▮", kind: "tile" },
  { id: "window", label: "Окно", group: "building", blocksVision: false, icon: "🪟", kind: "tile" },
  { id: "glass", label: "Витраж", group: "building", blocksVision: false, icon: "🔷", kind: "tile" },
  { id: "door", label: "Дверь", group: "building", blocksVision: true, icon: "🚪", kind: "tile" },
  { id: "door_open", label: "Дверь откр.", group: "building", blocksVision: false, icon: "🔓", kind: "tile" },
  { id: "stairs", label: "Лестница", group: "building", blocksVision: false, icon: "📶", kind: "tile" },
  // Поезд / вокзал (Эберрон)
  { id: "rail", label: "Рельсы", group: "train", blocksVision: false, icon: "═", kind: "tile" },
  { id: "platform", label: "Платформа", group: "train", blocksVision: false, icon: "▭", kind: "tile" },
  { id: "coupler", label: "Сцепка", group: "train", blocksVision: false, icon: "⛓", kind: "tile" },
  { id: "cargo", label: "Груз", group: "train", blocksVision: false, icon: "🧳", kind: "tile" },
  // Местность
  { id: "floor", label: "Пол", group: "terrain", blocksVision: false, icon: "·", kind: "tile" },
  { id: "stone", label: "Камень", group: "terrain", blocksVision: false, icon: "⬜", kind: "tile" },
  { id: "grass", label: "Трава", group: "terrain", blocksVision: false, icon: "🌿", kind: "tile" },
  { id: "water", label: "Вода", group: "terrain", blocksVision: false, icon: "💧", kind: "tile" },
  { id: "rubble", label: "Обломки", group: "terrain", blocksVision: false, icon: "🪨", kind: "tile" },
  { id: "mist", label: "Туман", group: "terrain", blocksVision: false, icon: "☁", kind: "tile" },
  // Мебель
  { id: "table", label: "Стол", group: "furniture", blocksVision: false, icon: "▤", kind: "tile" },
  { id: "chair", label: "Стул", group: "furniture", blocksVision: false, icon: "🪑", kind: "tile" },
  { id: "bench", label: "Скамья", group: "furniture", blocksVision: false, icon: "🪑", kind: "tile" },
  { id: "bed", label: "Койка", group: "furniture", blocksVision: false, icon: "🛏", kind: "tile" },
  { id: "crate", label: "Ящик", group: "furniture", blocksVision: false, icon: "🗃", kind: "tile" },
  { id: "barrel", label: "Бочка", group: "furniture", blocksVision: false, icon: "🛢", kind: "tile" },
  // Магия / Каннит
  { id: "conductor", label: "Проводник", group: "magic", blocksVision: false, icon: "⚡", kind: "tile" },
  { id: "rune", label: "Руна", group: "magic", blocksVision: false, icon: "✦", kind: "tile" },
  { id: "crystal", label: "Кристалл", group: "magic", blocksVision: false, icon: "💎", kind: "tile" },
  // Лут на карте
  { id: "chest", label: "Сундук", group: "loot", blocksVision: false, icon: "📦", kind: "overlay", canHide: true },
  { id: "stash", label: "Тайник", group: "loot", blocksVision: false, icon: "✦", kind: "overlay", canHide: true },
  // Инструменты
  { id: "erase_overlay", label: "Стереть тайник", group: "tool", blocksVision: false, icon: "✧", kind: "tool" },
  { id: "erase", label: "Ластик", group: "tool", blocksVision: false, icon: "✕", kind: "tool" }
];

const textureById = Object.fromEntries(MAP_TEXTURES.map((t) => [t.id, t]));

function createLobbyGameState() {
  const first = createEmptyMapDoc("Карта 1");
  first.published = true;
  return {
    characters: [],
    maps: [first],
    activeMapId: first.id,
    playerMapId: first.id,
    map: first,
    monsters: [],
    customNpcs: [],
    combatLog: [],
    combat: createEmptyCombat(),
    privateChats: {},
    loot: {
      campaignPool: [],
      sessionDrops: [],
      grants: []
    }
  };
}

function ensureLootState(game) {
  if (!game.loot) {
    game.loot = { campaignPool: [], sessionDrops: [], grants: [] };
  }
  if (!Array.isArray(game.loot.campaignPool)) game.loot.campaignPool = [];
  if (!Array.isArray(game.loot.sessionDrops)) game.loot.sessionDrops = [];
  if (!Array.isArray(game.loot.grants)) game.loot.grants = [];
  return game.loot;
}

function buildCustomLootItem(body, source = "custom") {
  const rarity = String(body.rarity ?? "common");
  const rarities = rarityCatalog();
  const meta = rarities.find((r) => r.id === rarity) || rarities[0];
  return {
    id: randomId("item"),
    name: String(body.name ?? "").trim() || "Безымянный предмет",
    rarity: meta.id,
    rarityLabel: meta.label,
    type: String(body.type ?? "").trim() || "Предмет",
    description: String(body.description ?? "").trim(),
    requiresAttunement: Boolean(body.requiresAttunement),
    stats: {
      attackBonus: body.stats?.attackBonus != null ? String(body.stats.attackBonus) : "",
      damage: body.stats?.damage != null ? String(body.stats.damage) : "",
      ac: body.stats?.ac != null ? String(body.stats.ac) : "",
      charges: body.stats?.charges != null ? String(body.stats.charges) : "",
      notes: body.stats?.notes != null ? String(body.stats.notes) : ""
    },
    source
  };
}

function lootPublicView(loot) {
  return {
    campaignPool: loot.campaignPool,
    sessionDrops: loot.sessionDrops,
    grants: loot.grants.slice(-30).reverse(),
    rarities: rarityCatalog()
  };
}

function ensureCharacterCoins(character) {
  if (!character.coins || typeof character.coins !== "object") {
    character.coins = { gp: 0, sp: 0, cp: 0, pp: 0, ep: 0 };
  }
  for (const key of ["gp", "sp", "cp", "pp", "ep"]) {
    character.coins[key] = Number(character.coins[key]) || 0;
  }
  return character.coins;
}

function filterOverlaysForViewer(overlays, isMaster) {
  const source = overlays ?? {};
  if (isMaster) {
    return { ...source };
  }
  const filtered = {};
  for (const [k, v] of Object.entries(source)) {
    if (v?.visibleToPlayers) {
      filtered[k] = v;
    }
  }
  return filtered;
}

function getSessionToken(req) {
  return req.headers["x-session-token"] ?? req.headers["X-Session-Token"];
}

function getSession(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  return sessions.get(String(token)) ?? null;
}

function requireMaster(req, res) {
  const session = getSession(req);
  if (session?.role !== "master") {
    sendJson(res, 403, { error: "Только мастер" });
    return false;
  }
  return true;
}

function getLobbyFromSession(req) {
  const session = getSession(req);
  if (!session?.lobbyId) return null;
  return lobbies.get(session.lobbyId) ?? null;
}

function lobbyPublicView(lobby) {
  return {
    id: lobby.id,
    title: lobby.title,
    masterName: lobby.masterName,
    isOpen: lobby.isOpen,
    playerCount: lobby.members.filter((m) => m.role !== "master").length,
    createdAt: lobby.createdAt
  };
}

function randomId(prefix = "id") {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function sendJson(res, status, payload) {
  if (
    shouldPersistLobbyOnSuccess &&
    activePersistLobby &&
    status >= 200 &&
    status < 400
  ) {
    schedulePersistLobby(activePersistLobby);
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Token"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, payload, contentType) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(payload);
}

async function sendStaticFile(res, absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  const typeByExt = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  };
  const contentType = typeByExt[ext] ?? "text/plain; charset=utf-8";
  try {
    const content = await readFile(absolutePath, "utf8");
    sendText(res, 200, content, contentType);
  } catch {
    sendJson(res, 404, { error: "Static file not found" });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function abilityModifier(score) {
  return Math.floor((Number(score ?? 10) - 10) / 2);
}

const ABILITY_LABELS_RU = {
  str: "Сила",
  dex: "Ловкость",
  con: "Телосложение",
  int: "Интеллект",
  wis: "Мудрость",
  cha: "Харизма"
};

const SKILL_ABILITY_DEFAULTS = {
  acrobatics: "dex",
  "animal handling": "wis",
  animalhandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight of hand": "dex",
  sleightofhand: "dex",
  stealth: "dex",
  survival: "wis"
};

const SKILL_LABELS_RU = {
  acrobatics: "Акробатика",
  "animal handling": "Уход за животными",
  animalhandling: "Уход за животными",
  arcana: "Магия",
  athletics: "Атлетика",
  deception: "Обман",
  history: "История",
  insight: "Проницательность",
  intimidation: "Запугивание",
  investigation: "Анализ",
  medicine: "Медицина",
  nature: "Природа",
  perception: "Внимательность",
  performance: "Выступление",
  persuasion: "Убеждение",
  religion: "Религия",
  "sleight of hand": "Ловкость рук",
  sleightofhand: "Ловкость рук",
  stealth: "Скрытность",
  survival: "Выживание"
};

function normalizeSkillKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

/** @param {"normal"|"advantage"|"disadvantage"} mode */
function rollD20WithMode(mode = "normal") {
  const m = mode === "advantage" || mode === "disadvantage" ? mode : "normal";
  if (m === "normal") {
    const roll = rollD20();
    return { mode: "normal", rolls: [roll], roll, detailPrefix: `d20(${roll})` };
  }
  const a = rollD20();
  const b = rollD20();
  const roll = m === "advantage" ? Math.max(a, b) : Math.min(a, b);
  const tag = m === "advantage" ? "преим." : "помеха";
  return {
    mode: m,
    rolls: [a, b],
    roll,
    detailPrefix: `${tag} ${a}/${b} → ${roll}`
  };
}

function fmtSigned(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

function appendCombatLog(game, entry) {
  if (!Array.isArray(game.combatLog)) game.combatLog = [];
  game.combatLog.push(entry);
  if (game.combatLog.length > 80) game.combatLog = game.combatLog.slice(-80);
  return entry;
}

function publicCombatLog(game) {
  return (game.combatLog || []).slice(-30).reverse();
}

function characterAbilityMod(character, ability) {
  const a = character?.abilities?.[ability];
  if (a && a.modifier != null && Number.isFinite(Number(a.modifier))) {
    return Number(a.modifier);
  }
  return abilityModifier(a?.score);
}

function characterSkillBonus(character, skillKey) {
  const key = normalizeSkillKey(skillKey);
  const skills = Array.isArray(character?.skills) ? character.skills : [];
  const skill =
    skills.find((s) => normalizeSkillKey(s.key) === key || normalizeSkillKey(s.label) === key) ||
    skills.find((s) => normalizeSkillKey(s.key).replace(/\s/g, "") === key.replace(/\s/g, "")) ||
    null;
  const ability =
    (skill?.baseAbility && ABILITY_LABELS_RU[skill.baseAbility] ? skill.baseAbility : null) ||
    SKILL_ABILITY_DEFAULTS[key] ||
    SKILL_ABILITY_DEFAULTS[key.replace(/\s/g, "")] ||
    "dex";
  const mod = characterAbilityMod(character, ability);
  const profLevel = Number(skill?.proficiencyLevel || 0);
  const pb = Number(character?.proficiencyBonus || 2);
  const bonus = mod + profLevel * pb;
  const label =
    SKILL_LABELS_RU[key] ||
    SKILL_LABELS_RU[key.replace(/\s/g, "")] ||
    skill?.label ||
    skill?.key ||
    skillKey;
  return { bonus, ability, label: String(label) };
}

function npcAbilityMod(npc, ability) {
  const raw = npc?.abilities?.[ability];
  if (raw && typeof raw === "object") {
    if (raw.modifier != null) return Number(raw.modifier) || 0;
    return abilityModifier(raw.score);
  }
  return abilityModifier(raw);
}

function parseNpcSkillBonus(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object") {
    const n = Number(raw.bonus ?? raw.value ?? raw.mod);
    return Number.isFinite(n) ? n : null;
  }
  const m = String(raw).match(/([+-]?\d+)/);
  return m ? Number(m[1]) : null;
}

function findNpcInGame(game, { npcId, tokenId, name } = {}) {
  const list = Array.isArray(game.customNpcs) ? game.customNpcs : [];
  if (npcId) {
    const byId = list.find((n) => n.id === npcId);
    if (byId) return byId;
  }
  const token = tokenId ? (game.map?.tokens || []).find((t) => t.id === tokenId) : null;
  if (token?.npcId) {
    const byTokenNpc = list.find((n) => n.id === token.npcId);
    if (byTokenNpc) return byTokenNpc;
  }
  const rawName = String(name || token?.name || "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
  if (!rawName) return null;
  return (
    list.find((n) => String(n.name || "").trim().toLowerCase() === rawName) ||
    list.find((n) => rawName.startsWith(String(n.name || "").trim().toLowerCase())) ||
    null
  );
}

function npcSkillBonus(npc, skillKey, abilityHint) {
  const key = normalizeSkillKey(skillKey);
  const labelHint = SKILL_LABELS_RU[key] || SKILL_LABELS_RU[key.replace(/\s/g, "")] || skillKey;
  const skills = npc?.skills;
  let parsed = null;
  if (Array.isArray(skills)) {
    for (const item of skills) {
      if (typeof item === "string") {
        const lower = item.toLowerCase();
        if (lower.includes(String(labelHint).toLowerCase()) || lower.includes(key)) {
          parsed = parseNpcSkillBonus(item);
          break;
        }
      } else if (item && typeof item === "object") {
        const name = normalizeSkillKey(item.name || item.label || item.key);
        if (name === key || name.includes(key) || key.includes(name)) {
          parsed = parseNpcSkillBonus(item.bonus ?? item.value ?? item.description);
          break;
        }
      }
    }
  } else if (skills && typeof skills === "object") {
    for (const [name, bonus] of Object.entries(skills)) {
      if (normalizeSkillKey(name) === key || normalizeSkillKey(name).includes(key)) {
        parsed = parseNpcSkillBonus(bonus);
        break;
      }
    }
  }
  const ability =
    (ABILITY_LABELS_RU[abilityHint] ? abilityHint : null) ||
    SKILL_ABILITY_DEFAULTS[key] ||
    SKILL_ABILITY_DEFAULTS[key.replace(/\s/g, "")] ||
    "dex";
  const bonus = parsed != null && Number.isFinite(parsed) ? parsed : npcAbilityMod(npc, ability);
  return { bonus, ability, label: String(labelHint) };
}

/** Mongo ObjectId из режима cards LSS (без имени заклинания в экспорте). */
function isLssSpellObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function cleanClassName(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  // «Жрец. Инквизитор.» → класс «Жрец»
  const head = t.split(/[./·—–-]/)[0]?.trim() || t;
  return head.replace(/\s+/g, " ");
}

function computeSpellcasting(parsed, abilities, proficiencyBonus) {
  const code = String(parsed.spellsInfo?.base?.code || "").toLowerCase();
  const abilityKey = ["str", "dex", "con", "int", "wis", "cha"].includes(code) ? code : "wis";
  const mod = Number(abilities?.[abilityKey]?.modifier ?? abilityModifier(abilities?.[abilityKey]?.score));
  const pb = Number(proficiencyBonus) || 2;
  const saveFromSheet = Number(parsed.spellsInfo?.save?.customModifier || parsed.spellsInfo?.save?.value || 0);
  const attackFromSheet = Number(parsed.spellsInfo?.mod?.customModifier || parsed.spellsInfo?.mod?.value || 0);
  const slots = {};
  for (let level = 1; level <= 9; level += 1) {
    const max = Number(parsed.spells?.[`slots-${level}`]?.value ?? 0);
    if (max > 0) {
      slots[level] = { max, used: 0 };
    }
  }
  return {
    ability: abilityKey,
    saveDC: saveFromSheet || 8 + pb + mod,
    attackBonus: attackFromSheet || pb + mod,
    slots1: Number(slots[1]?.max ?? 0),
    slots
  };
}

function ensureSpellSlots(character) {
  if (!character.spellcasting || typeof character.spellcasting !== "object") {
    character.spellcasting = { ability: "wis", saveDC: 10, attackBonus: 2, slots1: 0, slots: {} };
  }
  if (!character.spellcasting.slots || typeof character.spellcasting.slots !== "object") {
    character.spellcasting.slots = {};
    const legacy = Number(character.spellcasting.slots1 || 0);
    if (legacy > 0) character.spellcasting.slots[1] = { max: legacy, used: 0 };
  }
  for (const [k, v] of Object.entries(character.spellcasting.slots)) {
    const max = Math.max(0, Number(v?.max) || 0);
    const used = clamp(Number(v?.used) || 0, 0, max);
    character.spellcasting.slots[k] = { max, used };
  }
  character.spellcasting.slots1 = Number(character.spellcasting.slots[1]?.max ?? 0);
  return character.spellcasting;
}

function isWarlockLike(character) {
  const blob = `${character?.className || ""} ${(character?.classes || []).map((c) => c.name || "").join(" ")}`.toLowerCase();
  return /warlock|колдун/.test(blob);
}

function normalizeNote(data) {
  if (typeof data === "string") {
    return data;
  }
  if (!data || typeof data !== "object") {
    return "";
  }
  const content = data.content;
  if (!Array.isArray(content)) {
    return "";
  }
  const paragraphs = [];
  for (const node of content) {
    if (node?.type === "bulletList" && Array.isArray(node.content)) {
      for (const item of node.content) {
        const texts = [];
        const walk = (n) => {
          if (!n) return;
          if (Array.isArray(n)) return n.forEach(walk);
          if (typeof n.text === "string" && n.text.trim()) texts.push(n.text.trim());
          if (n.content) walk(n.content);
        };
        walk(item);
        if (texts.length) paragraphs.push(`• ${texts.join(" ")}`);
      }
      continue;
    }
    const parts = node?.content;
    if (!Array.isArray(parts)) continue;
    const texts = [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim().length > 0) {
        texts.push(part.text.trim());
      }
    }
    if (texts.length) paragraphs.push(texts.join(" "));
  }
  return paragraphs.join("\n");
}

/**
 * TipTap-блок умений LSS: жирный заголовок → следующие абзацы/списки = описание.
 * Возвращает строки вида «Имя: описание» для парсера листа.
 */
function extractFeatureNoteLines(data) {
  if (!data) return [];
  if (typeof data === "string") {
    const t = data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return t ? [t] : [];
  }
  const content = Array.isArray(data.content) ? data.content : [];
  if (!content.length) {
    // fallback: плоский текст
    return extractDocLines(data);
  }

  const nodeText = (node) => {
    const texts = [];
    const walk = (n) => {
      if (!n) return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (typeof n.text === "string" && n.text.trim()) texts.push(n.text.trim());
      if (n.content) walk(n.content);
    };
    walk(node);
    return texts.join(" ").replace(/\s+/g, " ").trim();
  };

  const isBoldTitleParagraph = (node) => {
    if (node?.type !== "paragraph" || !Array.isArray(node.content) || !node.content.length) return false;
    const texts = node.content.filter((p) => typeof p?.text === "string" && p.text.trim());
    if (!texts.length) return false;
    const allBold = texts.every((p) => Array.isArray(p.marks) && p.marks.some((m) => m.type === "bold"));
    const joined = texts.map((p) => p.text.trim()).join(" ");
    return allBold && joined.length > 0 && joined.length <= 80 && !/[.!?…]$/.test(joined);
  };

  const isLevelFeatureHeading = (node) => {
    if (node?.type !== "paragraph" || !Array.isArray(node.content) || !node.content.length) return false;
    const joined = nodeText(node);
    if (!joined || joined.length > 100) return false;
    // «2-й уровень, умение жреца» / «1-й уровень, умение домена порядка»
    return /^\d+-?[йяе]\s+уровень/i.test(joined) || /^владение$/i.test(joined);
  };

  const lines = [];
  let currentName = null;
  let currentParts = [];

  const flush = () => {
    if (!currentName) return;
    const desc = currentParts.join(" ").replace(/\s+/g, " ").trim();
    lines.push(desc ? `${currentName}: ${desc}` : currentName);
    currentName = null;
    currentParts = [];
  };

  for (const node of content) {
    if (isBoldTitleParagraph(node) || isLevelFeatureHeading(node)) {
      flush();
      currentName = nodeText(node);
      continue;
    }
    if (node?.type === "bulletList" && Array.isArray(node.content)) {
      for (const item of node.content) {
        const t = nodeText(item);
        if (t) currentParts.push(`• ${t}`);
      }
      continue;
    }
    const t = nodeText(node);
    if (!t) continue;
    if (currentName) currentParts.push(t);
    else lines.push(t);
  }
  flush();
  return lines.filter(Boolean);
}

function extractDocLines(data) {
  if (!data) return [];
  if (typeof data === "string") {
    return [data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()].filter(Boolean);
  }

  const nodeText = (node) => {
    const texts = [];
    const walk = (n) => {
      if (!n) return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (typeof n.text === "string" && n.text.trim()) texts.push(n.text.trim());
      if (n.content) walk(n.content);
    };
    walk(node);
    return texts.join(" ").replace(/\s+/g, " ").trim();
  };

  const lines = [];
  const walkBlocks = (nodes) => {
    if (!nodes) return;
    const list = Array.isArray(nodes) ? nodes : [nodes];
    for (const node of list) {
      if (!node) continue;
      if (node.type === "paragraph" || node.type === "listItem" || node.type === "heading") {
        const t = nodeText(node);
        if (t) lines.push(t);
        continue;
      }
      if (node.type === "bulletList" || node.type === "orderedList") {
        walkBlocks(node.content);
        continue;
      }
      if (node.content) walkBlocks(node.content);
      else if (typeof node.text === "string" && node.text.trim()) {
        lines.push(node.text.trim());
      }
    }
  };
  walkBlocks(data?.content ?? data);
  return lines;
}

function mapCharacterFromLongStoryShort(rawFileContent, options = {}) {
  const envelope = typeof rawFileContent === "string" ? JSON.parse(rawFileContent) : rawFileContent;
  const parsed = typeof envelope.data === "string" ? JSON.parse(envelope.data) : envelope.data;

  const equipmentLines = [
    ...extractDocLines(parsed.text?.equipment?.value?.data),
    ...extractDocLines(parsed.text?.items?.value?.data)
  ];
  const featLines = extractFeatureNoteLines(parsed.text?.feats?.value?.data);
  const traitLines = extractFeatureNoteLines(parsed.text?.traits?.value?.data);
  const featureLines = extractFeatureNoteLines(parsed.text?.features?.value?.data);
  // LSS часто кладёт расовые черты в блок «Атаки и заклинания» (attacks)
  const racialLines = extractFeatureNoteLines(parsed.text?.attacks?.value?.data);
  // notes-2 у LSS часто = характер / предыстория (Инквизитор и т.п.)
  const notes2Personality = normalizeNote(parsed.text?.["notes-2"]?.value?.data)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const personalityLines = [
    ...extractDocLines(parsed.text?.personality?.value?.data),
    ...extractDocLines(parsed.text?.ideals?.value?.data),
    ...extractDocLines(parsed.text?.flaws?.value?.data),
    ...notes2Personality
  ];
  const backgroundLines = extractDocLines(parsed.text?.background?.value?.data);
  const bondLines = extractDocLines(parsed.text?.bonds?.value?.data);
  const questLines = normalizeNote(parsed.text?.quests?.value?.data)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const appearanceLines = extractDocLines(parsed.text?.appearance?.value?.data);
  const alliesLines = extractDocLines(parsed.text?.allies?.value?.data);
  const profLines = extractDocLines(parsed.text?.prof?.value?.data);

  const weapons = (parsed.weaponsList ?? []).map((w) => ({
    name: w?.name?.value ?? "Оружие",
    damage: String(w?.dmg?.value ?? "").trim(),
    ability: String(w?.ability ?? "str").toLowerCase(),
    proficient: Boolean(w?.isProf),
    // LSS иногда даёт готовый бонус атаки (mod / modBonus)
    attackBonus:
      w?.mod?.value != null && Number.isFinite(Number(w.mod.value))
        ? Number(w.mod.value)
        : w?.modBonus != null && Number.isFinite(Number(w.modBonus))
          ? Number(w.modBonus)
          : null
  }));

  const avatar =
    parsed.avatar?.webp ||
    parsed.avatar?.jpeg ||
    parsed.avatar?.url ||
    null;

  const inventoryFromGear = equipmentLines.map((line, idx) => ({
    id: `gear-${idx}`,
    name: line,
    rarity: "common",
    rarityLabel: "Снаряжение",
    type: "Снаряжение",
    description: line,
    requiresAttunement: false,
    stats: {},
    source: "character-sheet"
  }));

  const rawClass = parsed.info?.charClass?.value ?? "";
  const className = cleanClassName(rawClass);
  const subclass =
    parsed.info?.charSubclass?.value ||
    (rawClass.includes(".") ? rawClass.split(".").slice(1).join(".").replace(/\.+$/, "").trim() : "") ||
    "";

  const proficiencyBonus = Number(parsed.proficiencyCustom || parsed.proficiency || 2);
  const abilities = {
    str: { score: Number(parsed.stats?.str?.score ?? 10), modifier: abilityModifier(parsed.stats?.str?.score) },
    dex: { score: Number(parsed.stats?.dex?.score ?? 10), modifier: abilityModifier(parsed.stats?.dex?.score) },
    con: { score: Number(parsed.stats?.con?.score ?? 10), modifier: abilityModifier(parsed.stats?.con?.score) },
    int: { score: Number(parsed.stats?.int?.score ?? 10), modifier: abilityModifier(parsed.stats?.int?.score) },
    wis: { score: Number(parsed.stats?.wis?.score ?? 10), modifier: abilityModifier(parsed.stats?.wis?.score) },
    cha: { score: Number(parsed.stats?.cha?.score ?? 10), modifier: abilityModifier(parsed.stats?.cha?.score) }
  };

  const preparedRaw = (envelope.spells?.prepared ?? parsed.spells?.prepared ?? []).map(String);
  const bookRaw = (envelope.spells?.book ?? parsed.spells?.book ?? []).map(String);
  const alwaysRaw = (envelope.spells?.alwaysPrepared ?? []).map(String);
  const cardMode = String(envelope.spells?.mode || "").toLowerCase() === "cards";
  const unresolvedSpellIds = [...preparedRaw, ...bookRaw, ...alwaysRaw].filter(isLssSpellObjectId);

  const character = {
    id: options.id || randomId("character"),
    name: parsed.name?.value ?? "Unknown",
    className,
    subclass,
    level: Number(parsed.info?.level?.value ?? 1),
    background: parsed.info?.background?.value ?? "",
    race: parsed.info?.race?.value ?? "",
    playerName: parsed.info?.playerName?.value ?? "",
    alignment: parsed.info?.alignment?.value ?? "",
    experience: Number(parsed.info?.experience?.value ?? 0),
    proficiencyBonus,
    inspiration: Boolean(parsed.inspiration),
    portraitUrl: avatar,
    abilities,
    saves: Object.fromEntries(
      Object.entries(parsed.saves ?? {}).map(([k, v]) => [
        k,
        { proficient: Boolean(v?.isProf), bonus: Number(v?.bonus ?? 0) }
      ])
    ),
    vitals: {
      hpCurrent: Number(parsed.vitality?.["hp-current"]?.value ?? 0),
      hpMax: Number(parsed.vitality?.["hp-max"]?.value ?? 0),
      hpTemp: Number(parsed.vitality?.["hp-temp"]?.value ?? 0),
      ac: Number(parsed.vitality?.ac?.value ?? 10),
      speed: Number(parsed.vitality?.speed?.value ?? 30),
      hitDie: parsed.vitality?.["hit-die"]?.value ?? "d8",
      darkvision: Number(parsed.vitality?.darkvision?.value ?? 0)
    },
    skills: Object.entries(parsed.skills ?? {}).map(([key, skill]) => ({
      key,
      label: skillLabelRu({ key, label: skill?.label || skill?.name }),
      baseAbility: skill?.baseStat ?? skill?.baseAbility ?? "str",
      proficiencyLevel: Number(skill?.isProf ?? 0) || 0
    })),
    weapons,
    equipment: equipmentLines,
    feats: [...racialLines, ...featLines, ...featureLines],
    traits: traitLines,
    personality: personalityLines,
    backgroundStory: backgroundLines,
    bonds: bondLines,
    coins: {
      gp: Number(parsed.coins?.gp?.value ?? 0),
      sp: Number(parsed.coins?.sp?.value ?? 0),
      cp: Number(parsed.coins?.cp?.value ?? 0),
      pp: Number(parsed.coins?.pp?.value ?? 0),
      ep: Number(parsed.coins?.ep?.value ?? 0)
    },
    spellcasting: computeSpellcasting(parsed, abilities, proficiencyBonus),
    spellBook: bookRaw,
    preparedSpells: preparedRaw,
    alwaysPreparedSpells: alwaysRaw,
    initiateCantrips: (envelope.spells?.initiateCantrips ?? []).map(String),
    initiateSpell: envelope.spells?.initiateSpell ? String(envelope.spells.initiateSpell) : null,
    spellcastingItems: Array.isArray(envelope.spellcastingItems)
      ? envelope.spellcastingItems
      : Array.isArray(parsed.spellcastingItems)
        ? parsed.spellcastingItems
        : [],
    importWarnings: [
      cardMode && unresolvedSpellIds.length
        ? `Заклинания в режиме карточек LSS (${unresolvedSpellIds.length} id). В экспорте нет имён — в LSS переключите заклинания в текстовый режим и экспортируйте JSON снова.`
        : null,
      rawClass && rawClass !== className ? `Класс очищен: «${rawClass}» → «${className}»${subclass ? `, подкласс «${subclass}»` : ""}.` : null
    ].filter(Boolean),
    notes: ["notes-1", "notes-3", "notes-4", "notes-5", "notes-6"]
      .map((k) => normalizeNote(parsed.text?.[k]?.value?.data))
      .filter((text) => text.length > 0)
      .concat(appearanceLines.length ? [`Внешность:\n${appearanceLines.join("\n")}`] : [])
      .concat(alliesLines.length ? [`Союзники и враги:\n${alliesLines.join("\n")}`] : [])
      .concat(profLines.length ? [`Владения и языки:\n${profLines.join("\n")}`] : [])
      .concat(questLines.length ? [`Квесты / цели:\n${questLines.join("\n")}`] : []),
    inventory: inventoryFromGear,
    featsTaken: [],
    levelHistory: [],
    pendingLevelUp: null,
    isTest: Boolean(options.isTest),
    sourceFile: options.sourceFile || null
  };
  character.classes = ensureCharacterClasses(character);
  character.level = character.classes.reduce((s, c) => s + c.level, 0) || character.level;
  return character;
}

async function seedAdventureParty(game, { replace = true } = {}) {
  const party = await loadPartyRawFiles();
  const seeded = [];
  if (replace) {
    game.characters = (game.characters || []).filter((c) => !PARTY_CHARACTER_IDS.has(c.id));
  }
  for (const entry of party) {
    const character = mapCharacterFromLongStoryShort(entry.raw, {
      id: entry.id,
      isTest: false,
      sourceFile: entry.file
    });
    const idx = game.characters.findIndex((c) => c.id === character.id || c.name === character.name);
    if (idx >= 0) game.characters[idx] = character;
    else game.characters.push(character);
    seeded.push({ id: character.id, name: character.name, level: character.level, className: character.className });
  }
  return seeded;
}

function syncHeroToken(game, character, position = { x: 2, y: 2 }) {
  let token = game.map.tokens.find((t) => t.characterId === character.id || (t.type === "player" && t.name === character.name));
  if (!token) {
    token = {
      id: randomId("token"),
      name: character.name,
      type: "player",
      characterId: character.id,
      portraitUrl: character.portraitUrl || null,
      dexMod: character.abilities?.dex?.modifier ?? abilityModifier(character.abilities?.dex?.score),
      hpCurrent: character.vitals.hpCurrent,
      hpMax: character.vitals.hpMax,
      position: {
        x: clamp(position.x, 0, game.map.width - 1),
        y: clamp(position.y, 0, game.map.height - 1)
      }
    };
    game.map.tokens.push(token);
  } else {
    token.name = character.name;
    token.portraitUrl = character.portraitUrl || token.portraitUrl || null;
    token.characterId = character.id;
    token.dexMod = character.abilities?.dex?.modifier ?? abilityModifier(character.abilities?.dex?.score);
    token.hpCurrent = character.vitals.hpCurrent;
    token.hpMax = character.vitals.hpMax;
  }
  return token;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function mapCellKey(cell) {
  return `${cell.x}:${cell.y}`;
}

function dedupeCells(cells) {
  const map = new Map();
  for (const cell of cells) {
    const x = Number(cell?.x);
    const y = Number(cell?.y);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      continue;
    }
    map.set(`${x}:${y}`, { x, y });
  }
  return [...map.values()];
}

function cellBlocksVision(map, x, y) {
  const tileId = map.tiles?.[`${x}:${y}`];
  if (!tileId) return false;
  return Boolean(textureById[tileId]?.blocksVision);
}

/** Линия видимости (Bresenham): стены и закрытые двери блокируют; окна — нет */
function hasLineOfSight(map, from, to) {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) {
      break;
    }
    if (cellBlocksVision(map, x0, y0)) {
      return false;
    }
  }
  return true;
}

function visibleCellsForPlayers(lobby, mapDoc = null) {
  const map = mapDoc || lobby.game.map;
  const rule = map.vision;
  const { width, height, tokens } = map;
  if (rule.mode === "full") {
    const result = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        result.push({ x, y });
      }
    }
    return result;
  }
  if (rule.mode === "manual") {
    return dedupeCells(rule.revealedCells ?? []);
  }
  const radius = Number(rule.radius ?? 0);
  const players = tokens.filter((t) => t.type === "player");
  const visible = [];
  for (const token of players) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dist = Math.abs(token.position.x - x) + Math.abs(token.position.y - y);
        if (dist > radius) continue;
        if (dist === 0 || hasLineOfSight(map, token.position, { x, y })) {
          visible.push({ x, y });
        }
      }
    }
  }
  return dedupeCells(visible);
}

function translateToRu(input) {
  return `${input} (ru)`;
}

async function requestHandler(req, res) {
  const parsedUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  activePersistLobby = null;
  shouldPersistLobbyOnSuccess = req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Token"
    });
    res.end();
    return;
  }

  if (parsedUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "@dnd/server",
      ts: new Date().toISOString(),
      persist: getPersistBackend()
    });
    return;
  }

  if (parsedUrl.pathname === "/") {
    await sendStaticFile(res, path.join(repoRoot, "apps", "master-web", "prototype", "index.html"));
    return;
  }

  if (parsedUrl.pathname === "/api") {
    sendJson(res, 200, {
      name: "DnD Mobile Desktop API",
      status: "running",
      endpoints: [
        "/health",
        "/",
        "/master",
        "/player",
        "/prototype/master",
        "/prototype/player"
      ]
    });
    return;
  }

  const staticMap = {
    "/prototype": path.join(repoRoot, "apps", "master-web", "prototype", "index.html"),
    "/master": path.join(repoRoot, "apps", "master-web", "prototype", "master.html"),
    "/player": path.join(repoRoot, "apps", "mobile", "prototype", "player.html"),
    "/prototype/master": path.join(repoRoot, "apps", "master-web", "prototype", "master.html"),
    "/prototype/player": path.join(repoRoot, "apps", "mobile", "prototype", "player.html"),
    "/prototype/prototype.css": path.join(repoRoot, "apps", "master-web", "prototype", "prototype.css"),
    "/prototype/login.js": path.join(repoRoot, "apps", "master-web", "prototype", "login.js"),
    "/prototype/master.js": path.join(repoRoot, "apps", "master-web", "prototype", "master.js"),
    "/prototype/player.js": path.join(repoRoot, "apps", "mobile", "prototype", "player.js"),
    "/character-sheet.js": path.join(repoRoot, "apps", "master-web", "prototype", "character-sheet.js"),
    "/prototype/character-sheet.js": path.join(repoRoot, "apps", "master-web", "prototype", "character-sheet.js"),
    "/initiative-bar.js": path.join(repoRoot, "apps", "master-web", "prototype", "initiative-bar.js"),
    "/prototype/initiative-bar.js": path.join(repoRoot, "apps", "master-web", "prototype", "initiative-bar.js"),
    "/npc-sheet.js": path.join(repoRoot, "apps", "master-web", "prototype", "npc-sheet.js"),
    "/prototype/npc-sheet.js": path.join(repoRoot, "apps", "master-web", "prototype", "npc-sheet.js"),
    "/app.css": path.join(repoRoot, "apps", "master-web", "prototype", "prototype.css"),
    "/login.js": path.join(repoRoot, "apps", "master-web", "prototype", "login.js"),
    "/master.js": path.join(repoRoot, "apps", "master-web", "prototype", "master.js"),
    "/player.js": path.join(repoRoot, "apps", "mobile", "prototype", "player.js")
  };

  if (staticMap[parsedUrl.pathname]) {
    await sendStaticFile(res, staticMap[parsedUrl.pathname]);
    return;
  }

  // Restore session + lobby from disk/Redis after cold start
  await hydrateSession(getSessionToken(req), sessions, lobbies);

  try {
    if (req.method === "POST" && parsedUrl.pathname === "/auth/master/login") {
      const body = await readJson(req);
      const masterName = String(body.masterName ?? "").trim();
      const lobbyTitle = String(body.lobbyTitle ?? "").trim();
      if (!masterName || !lobbyTitle) {
        sendJson(res, 400, { error: "Укажите имя мастера и название лобби" });
        return;
      }
      await loadOpenLobbies(lobbies);
      const lobbyId = randomId("lobby");
      const token = randomId("session");
      const userId = randomId("user");
      // Закрыть старые открытые лобби с тем же названием — иначе игрок попадёт не туда
      const titleKey = lobbyTitle.toLowerCase();
      for (const old of lobbies.values()) {
        if (old.isOpen && String(old.title || "").trim().toLowerCase() === titleKey) {
          old.isOpen = false;
          await persistLobbyNow(old);
        }
      }
      const lobby = {
        id: lobbyId,
        title: lobbyTitle,
        masterName,
        isOpen: true,
        createdAt: new Date().toISOString(),
        members: [{ id: userId, name: masterName, role: "master", inventory: [] }],
        game: createLobbyGameState()
      };
      lobbies.set(lobbyId, lobby);
      const session = { role: "master", lobbyId, userId, userName: masterName };
      sessions.set(token, session);
      activePersistLobby = lobby;
      await persistSession(token, session);
      await persistLobbyNow(lobby);
      sendJson(res, 201, { token, lobby: lobbyPublicView(lobby) });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/auth/player/login") {
      const body = await readJson(req);
      const playerName = String(body.playerName ?? "").trim();
      if (!playerName) {
        sendJson(res, 400, { error: "Укажите имя игрока" });
        return;
      }
      const token = randomId("session");
      const userId = randomId("user");
      const session = { role: "player", userId, userName: playerName };
      sessions.set(token, session);
      await persistSession(token, session);
      sendJson(res, 201, { token, playerId: userId, playerName });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/auth/session") {
      const session = getSession(req);
      if (!session) {
        sendJson(res, 401, { error: "Сессия не найдена" });
        return;
      }
      const lobby = session.lobbyId ? lobbies.get(session.lobbyId) : null;
      const member = lobby?.members?.find((m) => m.id === session.userId) || null;
      sendJson(res, 200, {
        role: session.role,
        userName: session.userName,
        userId: session.userId,
        characterId: member?.characterId || null,
        memberRole: member?.role || null,
        lobby: lobby ? lobbyPublicView(lobby) : null
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/lobbies/open") {
      await loadOpenLobbies(lobbies);
      const open = [...lobbies.values()]
        .filter((l) => l.isOpen)
        .map(lobbyPublicView)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      sendJson(res, 200, open);
      return;
    }

    if (req.method === "POST" && /^\/lobbies\/[^/]+\/join$/.test(parsedUrl.pathname)) {
      const lobbyId = parsedUrl.pathname.split("/")[2];
      const session = getSession(req);
      if (!session || session.role !== "player") {
        sendJson(res, 401, { error: "Войдите как игрок" });
        return;
      }
      if (!lobbies.has(lobbyId)) {
        const loaded = await loadLobby(lobbyId);
        if (loaded) lobbies.set(loaded.id, loaded);
      }
      const lobby = lobbies.get(lobbyId);
      if (!lobby || !lobby.isOpen) {
        sendJson(res, 404, { error: "Лобби не найдено или закрыто" });
        return;
      }
      session.lobbyId = lobbyId;
      const existing = lobby.members.find((m) => m.id === session.userId);
      if (!existing) {
        lobby.members.push({
          id: session.userId,
          name: session.userName,
          role: "spectator",
          inventory: [],
          characterId: null
        });
      } else if (!Array.isArray(existing.inventory)) {
        existing.inventory = [];
      }
      activePersistLobby = lobby;
      await persistSession(getSessionToken(req), session);
      await persistLobbyNow(lobby);
      sendJson(res, 200, { lobby: lobbyPublicView(lobby), memberRole: "spectator" });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/lobbies/join-by-title") {
      const session = getSession(req);
      if (!session || session.role !== "player") {
        sendJson(res, 401, { error: "Войдите как игрок" });
        return;
      }
      const body = await readJson(req);
      const needle = String(body.lobbyTitle ?? body.title ?? "")
        .trim()
        .toLowerCase();
      if (!needle) {
        sendJson(res, 400, { error: "Укажите название лобби" });
        return;
      }
      await loadOpenLobbies(lobbies);
      const matches = [...lobbies.values()]
        .filter((l) => l.isOpen && String(l.title || "").trim().toLowerCase() === needle)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const lobby = matches[0];
      if (!lobby) {
        const openTitles = [...lobbies.values()]
          .filter((l) => l.isOpen)
          .map((l) => `«${l.title}» (${l.masterName})`)
          .slice(0, 8);
        const hint = openTitles.length
          ? ` Сейчас открыты: ${openTitles.join(", ")}.`
          : " Сейчас нет открытых лобби — мастер должен создать сессию.";
        sendJson(res, 404, {
          error: `Открытое лобби «${String(body.lobbyTitle || body.title).trim()}» не найдено.${hint}`
        });
        return;
      }
      session.lobbyId = lobby.id;
      const existing = lobby.members.find((m) => m.id === session.userId);
      if (!existing) {
        lobby.members.push({
          id: session.userId,
          name: session.userName,
          role: "spectator",
          inventory: [],
          characterId: null
        });
      } else if (!Array.isArray(existing.inventory)) {
        existing.inventory = [];
      }
      activePersistLobby = lobby;
      await persistSession(getSessionToken(req), session);
      await persistLobbyNow(lobby);
      sendJson(res, 200, { lobby: lobbyPublicView(lobby), memberRole: "spectator" });
      return;
    }

    const lobby = getLobbyFromSession(req);
    if (lobby) activePersistLobby = lobby;
    const gamePaths = [
      "/characters/import",
      "/characters",
      "/characters/bind",
      "/characters/hp",
      "/characters/spell-slots",
      "/characters/rest",
      "/characters/level",
      "/characters/xp",
      "/characters/level-up",
      "/characters/place-token",
      "/map/tokens",
      "/map/vision",
      "/map/tiles",
      "/map/overlays/visibility",
      "/map/textures",
      "/maps",
      "/maps/export",
      "/maps/import",
      "/maps/view",
      "/adventures",
      "/combat/hp",
      "/combat/roll",
      "/combat/encounter",
      "/combat/initiative/roll",
      "/combat/initiative/auto",
      "/combat/turn/next",
      "/combat/end",
      "/chat",
      "/chat/message",
      "/chat/roll",
      "/loot",
      "/loot/random",
      "/loot/custom",
      "/loot/campaign",
      "/loot/grant",
      "/loot/gold",
      "/loot/mine",
      "/loot/preload",
      "/spells/preload",
      "/spells/catalog",
      "/subclasses/preload",
      "/subclasses/catalog",
      "/monsters/preload",
      "/monsters/preload/progress",
      "/monsters",
      "/npc/custom",
      "/npc",
      "/lobby/close"
    ];
    const isGamePath =
      gamePaths.includes(parsedUrl.pathname) ||
      /^\/map\/tokens\/[^/]+\/move$/.test(parsedUrl.pathname) ||
      /^\/maps\/[^/]+\/(activate|publish)$/.test(parsedUrl.pathname) ||
      /^\/adventures\/[^/]+\/apply$/.test(parsedUrl.pathname) ||
      /^\/characters\/[^/]+$/.test(parsedUrl.pathname) ||
      /^\/characters\/[^/]+\/level-up\/options$/.test(parsedUrl.pathname) ||
      /^\/monsters\/[^/]+$/.test(parsedUrl.pathname) ||
      /^\/loot\/campaign\/[^/]+$/.test(parsedUrl.pathname) ||
      /^\/loot\/drops\/[^/]+$/.test(parsedUrl.pathname);

    if (isGamePath && !lobby) {
      sendJson(res, 401, { error: "Выберите лобби или войдите как мастер" });
      return;
    }

    if (!lobby) {
      sendJson(res, 404, { error: "Не найдено" });
      return;
    }

    const game = lobby.game;
    ensureMapSystem(game);

    if (req.method === "POST" && parsedUrl.pathname === "/characters/import") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      if (typeof body.rawFileContent !== "string") {
        sendJson(res, 400, { error: "Нужно поле rawFileContent" });
        return;
      }
      let character;
      try {
        character = mapCharacterFromLongStoryShort(body.rawFileContent);
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
        return;
      }
      character.importedBy = session.role;
      character.importedByName = session.userName || null;
      game.characters.push(character);
      // Мастер обычно заливает пул на выбор — токен ставим при привязке игрока
      const placeDefault = session.role === "player";
      const placeOnMap = body.placeOnMap != null ? Boolean(body.placeOnMap) : placeDefault;
      if (placeOnMap) {
        syncHeroToken(game, character, body.position || { x: 3, y: 3 });
      }
      sendJson(res, 201, character);
      return;
    }

    if (req.method === "DELETE" && /^\/characters\/[^/]+$/.test(parsedUrl.pathname)) {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const characterId = parsedUrl.pathname.split("/")[2];
      const idx = game.characters.findIndex((c) => c.id === characterId);
      if (idx < 0) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      const bound = lobby.members.find((m) => m.characterId === characterId);
      if (bound) {
        sendJson(res, 400, {
          error: `Персонаж привязан к «${bound.name}». Сначала смените персонажа у игрока или отвяжите.`
        });
        return;
      }
      const [removed] = game.characters.splice(idx, 1);
      for (const map of game.maps || []) {
        if (!Array.isArray(map.tokens)) continue;
        map.tokens = map.tokens.filter((t) => t.characterId !== characterId);
      }
      if (game.map?.tokens) {
        game.map.tokens = game.map.tokens.filter((t) => t.characterId !== characterId);
      }
      sendJson(res, 200, { removed: { id: removed.id, name: removed.name } });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/characters") {
      sendJson(res, 200, game.characters);
      return;
    }

    if (req.method === "GET" && /^\/characters\/[^/]+$/.test(parsedUrl.pathname)) {
      const characterId = parsedUrl.pathname.split("/")[2];
      const character = game.characters.find((c) => c.id === characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      const preparedForEnrich = [
        ...(character.preparedSpells || []),
        ...(character.alwaysPreparedSpells || []),
        ...(character.initiateSpell ? [character.initiateSpell] : []),
        ...(character.initiateCantrips || [])
      ];
      const preparedSpellsDetailed = await enrichPreparedSpells(preparedForEnrich);
      ensureSpellSlots(character);
      sendJson(res, 200, {
        ...character,
        preparedSpellsDetailed,
        progress: xpProgress(character.experience, character.level)
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/bind") {
      const session = getSession(req);
      if (!session || session.role !== "player") {
        sendJson(res, 403, { error: "Только игрок" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (!Array.isArray(character.inventory)) character.inventory = [];
      const member = lobby.members.find((m) => m.id === session.userId);
      if (!member) {
        sendJson(res, 404, { error: "Участник лобби не найден" });
        return;
      }
      const takenBy = lobby.members.find(
        (m) => m.characterId === character.id && m.id !== session.userId
      );
      if (takenBy) {
        sendJson(res, 409, {
          error: `Персонаж «${character.name}» уже выбран игроком «${takenBy.name}»`
        });
        return;
      }
      member.role = "player";
      member.characterId = character.id;
      if (!Array.isArray(member.inventory)) member.inventory = [];
      syncHeroToken(game, character, body.position || { x: 4, y: 4 });
      sendJson(res, 200, { member, character });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/hp") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (session.role === "player") {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (!member?.characterId || member.characterId !== character.id) {
          sendJson(res, 403, { error: "Можно менять только свои ХП" });
          return;
        }
      }
      const before = Number(character.vitals.hpCurrent ?? 0);
      let delta = Number(body.delta ?? 0);
      if (body.action && ["-1", "-5", "+1", "+5"].includes(body.action)) {
        delta = Number(body.action);
      }
      if (body.hpCurrent != null) {
        character.vitals.hpCurrent = clamp(Number(body.hpCurrent), 0, character.vitals.hpMax);
      } else {
        character.vitals.hpCurrent = clamp(character.vitals.hpCurrent + delta, 0, character.vitals.hpMax);
      }
      if (body.hpMax != null && session.role === "master") {
        character.vitals.hpMax = Math.max(1, Number(body.hpMax));
        character.vitals.hpCurrent = clamp(character.vitals.hpCurrent, 0, character.vitals.hpMax);
      }
      const applied = character.vitals.hpCurrent - before;
      const token = game.map.tokens.find((t) => t.characterId === character.id);
      if (token) {
        token.hpCurrent = character.vitals.hpCurrent;
        token.hpMax = character.vitals.hpMax;
      }
      if (applied !== 0) {
        appendCombatLog(game, {
          id: randomId("combat"),
          type: "hp",
          tokenId: token?.id || null,
          tokenName: character.name,
          delta: applied,
          hpCurrent: character.vitals.hpCurrent,
          hpMax: character.vitals.hpMax,
          reason: body.reason || (applied < 0 ? "урон" : "лечение"),
          createdAt: new Date().toISOString()
        });
      }
      sendJson(res, 200, {
        character,
        token: token || null,
        combatLog: publicCombatLog(game)
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/spell-slots") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (session.role === "player") {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (!member?.characterId || member.characterId !== character.id) {
          sendJson(res, 403, { error: "Только свои ячейки" });
          return;
        }
      }
      const casting = ensureSpellSlots(character);
      const level = Number(body.level);
      if (!Number.isFinite(level) || level < 1 || level > 9 || !casting.slots[level]) {
        sendJson(res, 400, { error: "Нет ячеек этого круга" });
        return;
      }
      const slot = casting.slots[level];
      const action = String(body.action || "spend");
      if (action === "spend") {
        if (slot.used >= slot.max) {
          sendJson(res, 400, { error: "Ячейки этого круга закончились" });
          return;
        }
        slot.used += 1;
      } else if (action === "restore") {
        slot.used = Math.max(0, slot.used - 1);
      } else if (action === "set") {
        slot.used = clamp(Number(body.used ?? slot.used), 0, slot.max);
      } else {
        sendJson(res, 400, { error: "action: spend | restore | set" });
        return;
      }
      sendJson(res, 200, { character, spellcasting: casting });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/rest") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (session.role === "player") {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (!member?.characterId || member.characterId !== character.id) {
          sendJson(res, 403, { error: "Только свой отдых" });
          return;
        }
      }
      const casting = ensureSpellSlots(character);
      const restType = String(body.type || "short") === "long" ? "long" : "short";
      if (restType === "long") {
        for (const slot of Object.values(casting.slots)) {
          slot.used = 0;
        }
        character.vitals.hpCurrent = character.vitals.hpMax;
        const token = game.map.tokens.find((t) => t.characterId === character.id);
        if (token) {
          token.hpCurrent = character.vitals.hpCurrent;
          token.hpMax = character.vitals.hpMax;
        }
      } else if (isWarlockLike(character)) {
        for (const slot of Object.values(casting.slots)) {
          slot.used = 0;
        }
      }
      appendCombatLog(game, {
        id: randomId("combat"),
        type: "roll",
        actorName: character.name,
        actorRole: session.role,
        rollerName: session.userName,
        characterId: character.id,
        kind: "ability",
        label: restType === "long" ? "Долгий отдых" : "Короткий отдых",
        die: 0,
        roll: 0,
        bonus: 0,
        total: 0,
        detail:
          restType === "long"
            ? "ХП полные · ячейки восстановлены"
            : isWarlockLike(character)
              ? "Ячейки колдуна восстановлены"
              : "Отдых · ячейки заклинаний без изменений (5e)",
        createdAt: new Date().toISOString()
      });
      sendJson(res, 200, {
        character,
        spellcasting: casting,
        restType,
        combatLog: publicCombatLog(game)
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/level") {
      sendJson(res, 400, {
        error:
          "Прямое изменение уровня отключено. Используйте мастер повышения (/characters/level-up) по правилам D&D 5e."
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/xp") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (body.set != null) {
        character.experience = Math.max(0, Number(body.set) || 0);
      } else {
        character.experience = Math.max(0, Number(character.experience || 0) + Number(body.delta || 0));
      }
      if (!character.classes?.length) character.classes = ensureCharacterClasses(character);
      const total = totalClassLevels(character.classes) || Number(character.level) || 1;
      character.level = total;
      const progress = xpProgress(character.experience, total);
      if (progress.canLevelUp) {
        character.pendingLevelUp = { fromLevel: total, toLevel: progress.nextLevel };
      }
      sendJson(res, 200, { character, progress });
      return;
    }

    if (req.method === "GET" && /^\/characters\/[^/]+\/level-up\/options$/.test(parsedUrl.pathname)) {
      const characterId = parsedUrl.pathname.split("/")[2];
      const character = game.characters.find((c) => c.id === characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (!character.classes?.length) {
        character.classes = ensureCharacterClasses(character);
      }
      const advanceClass = {
        mode: parsedUrl.searchParams.get("mode") || "existing",
        className: parsedUrl.searchParams.get("className") || undefined,
        subclass: parsedUrl.searchParams.get("subclass") || undefined
      };
      try {
        const options = buildLevelUpOptions(character, advanceClass);
        if (options.spellOptions) {
          options.spellOptions.available = options.spellOptions.available || [];
        }
        const classEn = classMeta(options.advance?.className).en;
        const classLevel = options.advance?.toClassLevel;

        let cachedSubs = peekSubclassesCache() || [];
        if (!cachedSubs.length) {
          try {
            const subData = await loadSubclassesFromNetwork({});
            cachedSubs = subData.items || [];
          } catch {
            cachedSubs = [];
          }
        }
        options.availableSubclasses = options.advance?.subclassAllowed
          ? filterSubclasses(cachedSubs, { classEn, edition: "2024" }).map((sc) =>
              subclassCardBrief(sc, { classLevel })
            )
          : [];
        options.subclassFeaturesForLevel =
          options.advance?.subclassAllowed && advanceClass.subclass
            ? featuresForSubclassLevel(cachedSubs, advanceClass.subclass, classLevel)
            : [];

        let cachedClasses = peekClassesCache() || [];
        if (!cachedClasses.length) {
          try {
            const classData = await loadClassesFromNetwork({});
            cachedClasses = classData.items || [];
          } catch {
            cachedClasses = [];
          }
        }
        const netFeats = featuresForClassLevelNetwork(cachedClasses, classEn, classLevel);
        if (netFeats.length) {
          options.classFeaturesForLevel = mergeClassFeatures(options.classFeaturesForLevel || [], netFeats);
        }
        // ASI/Epic Boon — только на шаге «Улучшение»; подкласс — на шаге «Класс»
        options.classFeaturesForLevel = (options.classFeaturesForLevel || []).filter(
          (f) => !isImprovementFeature(f) && f.pickKind !== "subclass"
        );
        options.classFeatures = options.classFeaturesForLevel.map((f) => f.name);
        options.featureChoiceBudget = (options.featureChoiceBudget || []).filter(
          (b) => !isImprovementFeature({ id: b.featureId, name: b.name }) && b.pickKind !== "subclass"
        );

        let cachedFeats = peekFeatsCache() || [];
        if (!cachedFeats.length) {
          try {
            const featData = await loadFeatsFromNetwork({});
            cachedFeats = featData.items || [];
          } catch {
            cachedFeats = options.feats || [];
          }
        }
        if (cachedFeats.length) {
          const mapped = filterFeatsForLevelUp(cachedFeats, {
            epicBoon: Boolean(options.epicBoonAvailable)
          }).map(featCardBrief);
          options.feats = mapped.length ? mapped : cachedFeats.map(featCardBrief);
        }

        sendJson(res, 200, options);
      } catch (error) {
        console.error("level-up options failed:", error);
        sendJson(res, 200, {
          progress: xpProgress(character.experience, character.level),
          fromLevel: Number(character.level) || 1,
          toLevel: Math.min(20, (Number(character.level) || 1) + 1),
          asiAvailable: false,
          hitDie: character.vitals?.hitDie || "d8",
          averageHpGain: 5,
          conModifier: 0,
          feats: [],
          featsTaken: character.featsTaken || [],
          skills: [],
          classes: ensureCharacterClasses(character),
          classFeaturesForLevel: [],
          classFeatures: [],
          availableSubclasses: [],
          subclassFeaturesForLevel: [],
          spellcasting: character.spellcasting || null,
          preparedSpells: character.preparedSpells || [],
          spellBook: character.spellBook || [],
          abilities: character.abilities || {},
          spellOptions: { isCaster: false, available: [] },
          warning: error.message || "Часть опций недоступна"
        });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/subclasses/preload") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      try {
        let forceRefresh = parsedUrl.searchParams.get("force") === "1";
        try {
          const body = await readJson(req);
          if (body?.forceRefresh) forceRefresh = true;
        } catch {
          /* empty body ok */
        }
        const data = await loadSubclassesFromNetwork({ forceRefresh });
        sendJson(res, 200, {
          count: data.items.length,
          fromCache: data.fromCache,
          fetchedAt: data.fetchedAt
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/subclasses/catalog") {
      try {
        const data = await loadSubclassesFromNetwork({});
        const classEn = parsedUrl.searchParams.get("class") || parsedUrl.searchParams.get("classEn") || "";
        const edition = parsedUrl.searchParams.get("edition") || "2024";
        const q = parsedUrl.searchParams.get("q") || "";
        const classLevel = parsedUrl.searchParams.has("classLevel")
          ? Number(parsedUrl.searchParams.get("classLevel"))
          : undefined;
        const items = filterSubclasses(data.items, { classEn, edition, q }).map((sc) =>
          subclassCardBrief(sc, { classLevel })
        );
        sendJson(res, 200, {
          items,
          total: items.length,
          fromCache: data.fromCache,
          fetchedAt: data.fetchedAt
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/spells/preload") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      try {
        let forceRefresh = parsedUrl.searchParams.get("force") === "1";
        try {
          const body = await readJson(req);
          if (body?.forceRefresh) forceRefresh = true;
        } catch {
          /* empty body ok */
        }
        const data = await loadSpellsFromNetwork({ forceRefresh });
        sendJson(res, 200, { count: data.items.length, fromCache: data.fromCache, fetchedAt: data.fetchedAt });
      } catch (error) {
        sendJson(res, 500, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/spells/catalog") {
      try {
        const data = await loadSpellsFromNetwork({});
        const classes = String(parsedUrl.searchParams.get("classes") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const maxLevel = parsedUrl.searchParams.has("maxLevel")
          ? Number(parsedUrl.searchParams.get("maxLevel"))
          : 9;
        const q = parsedUrl.searchParams.get("q") || "";
        const exclude = String(parsedUrl.searchParams.get("exclude") || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        const items = filterSpells(data.items, { classes, maxLevel, q, excludeNames: exclude })
          .slice(0, 150)
          .map(spellCardBrief);
        sendJson(res, 200, { items, total: items.length, fromCache: data.fromCache });
      } catch (error) {
        sendJson(res, 500, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/level-up") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const idx = game.characters.findIndex((c) => c.id === body.characterId);
      if (idx < 0) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      if (session.role === "player") {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (!member || member.characterId !== body.characterId) {
          sendJson(res, 403, { error: "Можно повышать только своего персонажа" });
          return;
        }
      }
      try {
        const subData = await loadSubclassesFromNetwork({});
        const updated = applyLevelUp(game.characters[idx], body.choices || {}, {
          subclassItems: subData.items || []
        });
        game.characters[idx] = updated;
        const token = syncHeroToken(game, updated);
        sendJson(res, 200, {
          character: updated,
          token,
          progress: xpProgress(updated.experience, updated.level)
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/characters/place-token") {
      const session = getSession(req);
      if (session?.role !== "master" && session?.role !== "player") {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const character = game.characters.find((c) => c.id === body.characterId);
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }
      const token = syncHeroToken(game, character, body.position || { x: 2, y: 2 });
      sendJson(res, 200, { token, character });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/map/tokens") {
      const body = await readJson(req);
      const type = ["monster", "npc"].includes(body.type)
        ? body.type
        : body.type === "player"
          ? "player"
          : "npc";
      // Героев (player) мастер не создаёт вручную — только из персонажей
      if (type === "player" && getSession(req)?.role === "master" && !body.characterId) {
        sendJson(res, 400, { error: "Героев добавляют игроки (импорт листа). Мастер ставит мобов/NPC." });
        return;
      }
      const token = {
        id: randomId("token"),
        name: String(body.name ?? "token"),
        type,
        characterId: body.characterId || null,
        npcId: body.npcId || null,
        portraitUrl: body.portraitUrl || null,
        dexMod: body.dexMod != null ? Number(body.dexMod) : null,
        monsterDexScore: body.monsterDexScore != null ? Number(body.monsterDexScore) : null,
        hpCurrent: Number(body.hpCurrent ?? 1),
        hpMax: Number(body.hpMax ?? 1),
        position: {
          x: clamp(Number(body.position?.x ?? 0), 0, game.map.width - 1),
          y: clamp(Number(body.position?.y ?? 0), 0, game.map.height - 1)
        }
      };
      if (token.dexMod == null && token.monsterDexScore != null) {
        token.dexMod = abilityModifier(token.monsterDexScore);
      }
      game.map.tokens.push(token);
      sendJson(res, 201, token);
      return;
    }

    if (req.method === "PATCH" && /^\/map\/tokens\/[^/]+\/move$/.test(parsedUrl.pathname)) {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const tokenId = parsedUrl.pathname.split("/")[3];
      const body = await readJson(req);
      let token = null;
      let hostMap = null;
      for (const map of game.maps || []) {
        const found = (map.tokens || []).find((item) => item.id === tokenId);
        if (found) {
          token = found;
          hostMap = map;
          break;
        }
      }
      if (!token && game.map?.tokens) {
        token = game.map.tokens.find((item) => item.id === tokenId) || null;
        hostMap = game.map;
      }
      if (!token) {
        sendJson(res, 404, { error: "Токен не найден" });
        return;
      }
      if (session.role === "player") {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (!member?.characterId || token.characterId !== member.characterId) {
          sendJson(res, 403, { error: "Можно двигать только свой токен" });
          return;
        }
      }
      const width = hostMap?.width ?? game.map.width;
      const height = hostMap?.height ?? game.map.height;
      token.position = {
        x: clamp(Number(body.position?.x ?? token.position.x), 0, width - 1),
        y: clamp(Number(body.position?.y ?? token.position.y), 0, height - 1)
      };
      sendJson(res, 200, token);
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/map/vision") {
      const session = getSession(req);
      const isMaster = session?.role === "master";
      const member = lobby.members.find((m) => m.id === session?.userId);
      const viewMap = isMaster
        ? getActiveMap(game)
        : getPlayerViewMap(game, member?.viewingMapId || null);
      if (!viewMap.overlays) viewMap.overlays = {};
      const combat = ensureCombat(game);
      sendJson(res, 200, {
        rule: viewMap.vision,
        visibleCells: visibleCellsForPlayers(lobby, viewMap),
        tokens: viewMap.tokens,
        tiles: viewMap.tiles ?? {},
        overlays: filterOverlaysForViewer(viewMap.overlays, isMaster),
        width: viewMap.width,
        height: viewMap.height,
        mapId: viewMap.id,
        mapName: viewMap.name,
        maps: mapsPublicMeta(game, { forMaster: isMaster }),
        activeMapId: game.activeMapId,
        playerMapId: game.playerMapId,
        members: lobby.members,
        characters: game.characters.map((c) => {
          const classes = ensureCharacterClasses(c);
          return {
            id: c.id,
            name: c.name,
            className: c.className,
            classesLabel: formatClassesLabel(classes),
            level: c.level,
            experience: c.experience ?? 0,
            race: c.race,
            portraitUrl: c.portraitUrl || null,
            isTest: Boolean(c.isTest),
            vitals: c.vitals,
            inventoryCount: (c.inventory || []).length,
            canLevelUp: xpProgress(c.experience, c.level).canLevelUp
          };
        }),
        combat: combatPublicView(combat, {
          viewerRole: session?.role,
          characterId: member?.characterId || null,
          game
        }),
        loot: isMaster ? lootPublicView(ensureLootState(game)) : undefined,
        combatLog: publicCombatLog(game),
        privateChat: isMaster
          ? privateChatViewForMaster(game, lobby)
          : privateChatViewForPlayer(game, lobby, session?.userId),
        viewerRole: session?.role ?? "unknown"
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/map/textures") {
      sendJson(res, 200, MAP_TEXTURES.filter((t) => t.kind !== "tool"));
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/adventures") {
      sendJson(res, 200, { adventures: listAdventureTemplates() });
      return;
    }

    if (req.method === "POST" && /^\/adventures\/[^/]+\/apply$/.test(parsedUrl.pathname)) {
      if (!requireMaster(req, res)) return;
      const adventureId = decodeURIComponent(parsedUrl.pathname.split("/")[2]);
      const adventure = getAdventureTemplate(adventureId);
      if (!adventure) {
        sendJson(res, 404, { error: "Шаблон приключения не найден" });
        return;
      }
      const body = await readJson(req).catch(() => ({}));
      replaceMapsFromTemplate(game, adventure.maps, { publishFirst: true });
      if (Array.isArray(adventure.npcs) && adventure.npcs.length) {
        if (!Array.isArray(game.customNpcs)) game.customNpcs = [];
        const replaceNpcs = body.replaceNpcs !== false;
        if (replaceNpcs) {
          game.customNpcs = adventure.npcs.map((n) => ({ ...n }));
        } else {
          const existingIds = new Set(game.customNpcs.map((n) => n.id));
          for (const n of adventure.npcs) {
            if (!existingIds.has(n.id)) game.customNpcs.push({ ...n });
          }
        }
      }
      let party = [];
      try {
        party = await seedAdventureParty(game, { replace: body.replaceParty !== false });
      } catch (error) {
        console.warn("Не удалось засеять пул героев приключения:", error.message || error);
      }
      sendJson(res, 200, {
        ok: true,
        adventure: {
          id: adventure.id,
          title: adventure.title,
          notes: adventure.notes || []
        },
        maps: mapsPublicMeta(game, { forMaster: true }),
        activeMapId: game.activeMapId,
        playerMapId: game.playerMapId,
        npcCount: (game.customNpcs || []).length,
        party,
        characters: game.characters.map((c) => ({
          id: c.id,
          name: c.name,
          className: c.className,
          level: c.level
        }))
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/maps") {
      const session = getSession(req);
      const isMaster = session?.role === "master";
      sendJson(res, 200, {
        maps: mapsPublicMeta(game, { forMaster: isMaster }),
        activeMapId: game.activeMapId,
        playerMapId: game.playerMapId
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/maps") {
      if (!requireMaster(req, res)) return;
      const body = await readJson(req);
      const map = createEmptyMapDoc(body.name || `Карта ${game.maps.length + 1}`, {
        width: Number(body.width) || 40,
        height: Number(body.height) || 30
      });
      if (body.published) map.published = true;
      addMapDoc(game, map);
      sendJson(res, 200, {
        map: mapsPublicMeta(game, { forMaster: true }).find((m) => m.id === map.id),
        maps: mapsPublicMeta(game, { forMaster: true }),
        activeMapId: game.activeMapId
      });
      return;
    }

    if (req.method === "POST" && /^\/maps\/[^/]+\/activate$/.test(parsedUrl.pathname)) {
      if (!requireMaster(req, res)) return;
      const mapId = decodeURIComponent(parsedUrl.pathname.split("/")[2]);
      try {
        const map = setActiveMap(game, mapId);
        sendJson(res, 200, {
          ok: true,
          activeMapId: map.id,
          maps: mapsPublicMeta(game, { forMaster: true })
        });
      } catch (e) {
        sendJson(res, 404, { error: e.message || "Карта не найдена" });
      }
      return;
    }

    if (req.method === "POST" && /^\/maps\/[^/]+\/publish$/.test(parsedUrl.pathname)) {
      if (!requireMaster(req, res)) return;
      const mapId = decodeURIComponent(parsedUrl.pathname.split("/")[2]);
      const body = await readJson(req).catch(() => ({}));
      const published = body.published !== false;
      const setAsPlayerDefault = body.setAsPlayerDefault !== false;
      try {
        const map = publishMap(game, mapId, published);
        if (published && setAsPlayerDefault) {
          game.playerMapId = map.id;
        }
        sendJson(res, 200, {
          ok: true,
          mapId: map.id,
          published: map.published,
          playerMapId: game.playerMapId,
          maps: mapsPublicMeta(game, { forMaster: true })
        });
      } catch (e) {
        sendJson(res, 404, { error: e.message || "Карта не найдена" });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/maps/view") {
      const session = getSession(req);
      if (!session) {
        sendJson(res, 401, { error: "Нет сессии" });
        return;
      }
      const body = await readJson(req);
      const mapId = String(body.mapId || "");
      const map = game.maps.find((m) => m.id === mapId && m.published);
      if (!map) {
        sendJson(res, 404, { error: "Карта недоступна игрокам" });
        return;
      }
      if (session.role === "master") {
        setActiveMap(game, mapId);
      } else {
        const member = lobby.members.find((m) => m.id === session.userId);
        if (member) member.viewingMapId = mapId;
      }
      sendJson(res, 200, {
        ok: true,
        mapId,
        maps: mapsPublicMeta(game, { forMaster: session.role === "master" })
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/maps/export") {
      if (!requireMaster(req, res)) return;
      const oneId = parsedUrl.searchParams.get("mapId");
      if (oneId) {
        const map = game.maps.find((m) => m.id === oneId);
        if (!map) {
          sendJson(res, 404, { error: "Карта не найдена" });
          return;
        }
        sendJson(res, 200, {
          version: 1,
          exportedAt: new Date().toISOString(),
          maps: [
            {
              id: map.id,
              name: map.name,
              width: map.width,
              height: map.height,
              tiles: map.tiles,
              overlays: map.overlays,
              tokens: map.tokens,
              vision: map.vision,
              published: map.published
            }
          ]
        });
        return;
      }
      sendJson(res, 200, exportMapSet(game));
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/maps/import") {
      if (!requireMaster(req, res)) return;
      const body = await readJson(req);
      try {
        const docs = importMapSet(game, body, { replace: body.replace !== false });
        sendJson(res, 200, {
          ok: true,
          imported: docs.length,
          maps: mapsPublicMeta(game, { forMaster: true }),
          activeMapId: game.activeMapId,
          playerMapId: game.playerMapId
        });
      } catch (e) {
        sendJson(res, 400, { error: e.message || "Ошибка импорта" });
      }
      return;
    }

    if (req.method === "PUT" && parsedUrl.pathname === "/map/tiles") {
      const body = await readJson(req);
      const cells = Array.isArray(body.cells) ? body.cells : [];
      const textureId = String(body.textureId ?? "");
      const visibleToPlayers = body.visibleToPlayers !== false;
      if (!game.map.tiles) {
        game.map.tiles = {};
      }
      if (!game.map.overlays) {
        game.map.overlays = {};
      }

      if (textureId === "erase" || textureId === "") {
        for (const cell of cells) {
          const x = clamp(Number(cell.x), 0, game.map.width - 1);
          const y = clamp(Number(cell.y), 0, game.map.height - 1);
          const k = `${x}:${y}`;
          delete game.map.tiles[k];
          delete game.map.overlays[k];
        }
      } else if (textureId === "erase_overlay") {
        for (const cell of cells) {
          const x = clamp(Number(cell.x), 0, game.map.width - 1);
          const y = clamp(Number(cell.y), 0, game.map.height - 1);
          delete game.map.overlays[`${x}:${y}`];
        }
      } else {
        const tex = textureById[textureId];
        if (!tex) {
          sendJson(res, 400, { error: "Неизвестная текстура" });
          return;
        }
        for (const cell of cells) {
          const x = clamp(Number(cell.x), 0, game.map.width - 1);
          const y = clamp(Number(cell.y), 0, game.map.height - 1);
          const k = `${x}:${y}`;
          if (tex.kind === "overlay") {
            let inheritedName = typeof body.name === "string" ? body.name.trim() : "";
            if (!inheritedName) {
              for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1]
              ]) {
                const neighbor = game.map.overlays[`${x + dx}:${y + dy}`];
                if (neighbor?.type === textureId && neighbor.name) {
                  inheritedName = String(neighbor.name);
                  break;
                }
              }
            }
            if (!inheritedName) {
              inheritedName = textureId === "stash" ? "Тайник" : "Сундук";
            }
            game.map.overlays[k] = {
              type: textureId,
              visibleToPlayers: Boolean(visibleToPlayers),
              name: inheritedName
            };
          } else {
            game.map.tiles[k] = textureId;
          }
        }
      }

      const session = getSession(req);
      sendJson(res, 200, {
        tiles: game.map.tiles,
        overlays: filterOverlaysForViewer(game.map.overlays, session?.role === "master"),
        visibleCells: visibleCellsForPlayers(lobby)
      });
      return;
    }

    if (req.method === "PATCH" && parsedUrl.pathname === "/map/overlays/visibility") {
      const body = await readJson(req);
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер может менять тайники" });
        return;
      }
      if (!game.map.overlays) {
        game.map.overlays = {};
      }
      const cells = Array.isArray(body.cells) ? body.cells : [];
      const hasVisibility = typeof body.visibleToPlayers === "boolean";
      const hasName = typeof body.name === "string";
      const nextName = hasName ? String(body.name).trim() : "";
      if (!hasVisibility && !hasName) {
        sendJson(res, 400, { error: "Укажите visibleToPlayers и/или name" });
        return;
      }
      for (const cell of cells) {
        const k = `${Number(cell.x)}:${Number(cell.y)}`;
        if (game.map.overlays[k]) {
          game.map.overlays[k] = {
            ...game.map.overlays[k],
            ...(hasVisibility ? { visibleToPlayers: Boolean(body.visibleToPlayers) } : {}),
            ...(hasName ? { name: nextName || (game.map.overlays[k].type === "stash" ? "Тайник" : "Сундук") } : {})
          };
        }
      }
      sendJson(res, 200, {
        overlays: game.map.overlays
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/map/tiles") {
      const session = getSession(req);
      sendJson(res, 200, {
        tiles: game.map.tiles ?? {},
        overlays: filterOverlaysForViewer(game.map.overlays ?? {}, session?.role === "master"),
        textures: MAP_TEXTURES
      });
      return;
    }

    if (req.method === "PUT" && parsedUrl.pathname === "/map/vision") {
      const body = await readJson(req);
      const mode = body.mode;
      if (!["full", "radius", "manual"].includes(mode)) {
        sendJson(res, 400, { error: "mode: full | radius | manual" });
        return;
      }
      if (mode === "full") {
        game.map.vision = { mode: "full", radius: game.map.vision.radius, revealedCells: [] };
      } else if (mode === "radius") {
        game.map.vision = {
          mode: "radius",
          radius: Math.max(0, Number(body.radius ?? game.map.vision.radius ?? 3)),
          revealedCells: []
        };
      } else {
        game.map.vision = {
          mode: "manual",
          radius: game.map.vision.radius,
          revealedCells: dedupeCells(body.revealedCells ?? game.map.vision.revealedCells ?? [])
        };
      }
      sendJson(res, 200, {
        rule: game.map.vision,
        visibleCells: visibleCellsForPlayers(lobby)
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/hp") {
      if (!requireMaster(req, res)) return;
      const body = await readJson(req);
      const token = game.map.tokens.find((item) => item.id === body.tokenId);
      if (!token) {
        sendJson(res, 404, { error: "Токен не найден" });
        return;
      }
      let delta = Number(body.delta ?? 0);
      if (body.action && ["-1", "-5", "+1", "+5"].includes(body.action)) {
        delta = Number(body.action);
      }
      if (!Number.isFinite(delta) || delta === 0) {
        sendJson(res, 400, { error: "Укажите изменение ХП" });
        return;
      }
      const before = Number(token.hpCurrent ?? 0);
      token.hpCurrent = clamp(before + delta, 0, Number(token.hpMax ?? before));
      const applied = token.hpCurrent - before;
      const reasonRaw = String(body.reason ?? "").trim();
      const reason =
        reasonRaw ||
        (applied < 0 ? `Урон · ${token.name}` : applied > 0 ? `Лечение · ${token.name}` : `ХП · ${token.name}`);
      const log = {
        id: randomId("combat"),
        type: "hp",
        tokenId: token.id,
        tokenName: token.name,
        delta: applied,
        hpCurrent: token.hpCurrent,
        hpMax: token.hpMax,
        reason,
        createdAt: new Date().toISOString()
      };
      appendCombatLog(game, log);
      const member = lobby.members.find((m) => m.id === getSession(req)?.userId);
      sendJson(res, 200, {
        token,
        log,
        combatLog: publicCombatLog(game),
        combat: combatPublicView(ensureCombat(game), {
          viewerRole: "master",
          characterId: member?.characterId || null,
          game
        })
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/roll") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const kind = String(body.kind || "").trim();
      const allowedKinds = new Set(["ability", "skill", "attack", "damage", "dice"]);
      if (!allowedKinds.has(kind)) {
        sendJson(res, 400, { error: "kind: ability, skill, attack, damage или dice" });
        return;
      }
      const member = lobby.members.find((m) => m.id === session.userId);
      let character = null;
      let npc = null;
      let actorName = session.userName || "Участник";

      const needsActor = kind !== "dice";
      if (needsActor) {
        if (session.role === "player") {
          const characterId = member?.characterId;
          if (!characterId) {
            sendJson(res, 400, { error: "Сначала привяжите персонажа" });
            return;
          }
          if (body.characterId && body.characterId !== characterId) {
            sendJson(res, 403, { error: "Можно бросать только за своего персонажа" });
            return;
          }
          character = game.characters.find((c) => c.id === characterId);
          if (!character) {
            sendJson(res, 404, { error: "Персонаж не найден" });
            return;
          }
          actorName = character.name;
        } else {
          if (body.characterId) {
            character = game.characters.find((c) => c.id === body.characterId);
            if (!character) {
              sendJson(res, 404, { error: "Персонаж не найден" });
              return;
            }
            actorName = character.name;
          } else if (kind === "ability" || kind === "skill" || kind === "attack" || kind === "damage") {
            npc = findNpcInGame(game, {
              npcId: body.npcId,
              tokenId: body.tokenId,
              name: body.actorName
            });
            if (!npc && body.tokenId) {
              const token = (game.map?.tokens || []).find((t) => t.id === body.tokenId);
              if (token && (token.type === "npc" || token.type === "monster")) {
                npc = {
                  id: token.npcId || token.id,
                  name: token.name,
                  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                  skills: [],
                  weapons: []
                };
              }
            }
            if (!character && !npc && (kind === "ability" || kind === "skill")) {
              sendJson(res, 400, { error: "Укажите characterId или npcId/tokenId" });
              return;
            }
            if (npc) actorName = npc.name;
            if (!character && !npc && (kind === "attack" || kind === "damage")) {
              // мастер может кинуть формулу урона без актора
              actorName = session.userName || "Мастер";
            }
          }
        }
      }

      let bonus = 0;
      let label = "";
      let abilityKey = null;
      let die = 20;
      let roll = 0;
      let total = 0;
      let detail = "";
      let rolls = null;
      let weaponName = null;
      let rollMode = "normal";
      const requestedMode = String(body.mode || "normal").toLowerCase();
      const d20Mode =
        requestedMode === "advantage" || requestedMode === "disadvantage" ? requestedMode : "normal";

      try {
        if (kind === "dice") {
          const sides = Number(body.die);
          if (!STANDARD_DICE.includes(sides)) {
            sendJson(res, 400, { error: `Кубик: ${STANDARD_DICE.map((d) => `d${d}`).join(", ")}` });
            return;
          }
          const count = Math.max(1, Math.min(10, Number(body.count) || 1));
          const rolled = rollNdM(count, sides);
          die = sides;
          total = rolled.total;
          detail = rolled.detail;
          rolls = rolled.parts;
          label = count > 1 ? `${count}d${sides}` : `d${sides}`;
          actorName =
            session.role === "player"
              ? game.characters.find((c) => c.id === member?.characterId)?.name || session.userName
              : session.userName || "Мастер";
          if (count === 1) {
            const m = String(detail).match(/d\d+\((\d+)\)/);
            roll = m ? Number(m[1]) : total;
          } else {
            roll = total;
          }
        } else if (kind === "ability") {
          abilityKey = String(body.ability || "").toLowerCase();
          if (!ABILITY_LABELS_RU[abilityKey]) {
            sendJson(res, 400, { error: "Неизвестная характеристика" });
            return;
          }
          label = ABILITY_LABELS_RU[abilityKey];
          bonus = character ? characterAbilityMod(character, abilityKey) : npcAbilityMod(npc, abilityKey);
          const d20 = rollD20WithMode(d20Mode);
          rollMode = d20.mode;
          rolls = d20.rolls;
          roll = d20.roll;
          total = roll + bonus;
          detail = `${d20.detailPrefix} ${fmtSigned(bonus)} = ${total}`;
        } else if (kind === "skill") {
          const skillKey = body.skillKey || body.skill || body.label;
          if (!skillKey) {
            sendJson(res, 400, { error: "Укажите skillKey" });
            return;
          }
          const resolved = character
            ? characterSkillBonus(character, skillKey)
            : npcSkillBonus(npc, skillKey, body.ability);
          bonus = resolved.bonus;
          label = resolved.label;
          abilityKey = resolved.ability;
          const d20 = rollD20WithMode(d20Mode);
          rollMode = d20.mode;
          rolls = d20.rolls;
          roll = d20.roll;
          total = roll + bonus;
          detail = `${d20.detailPrefix} ${fmtSigned(bonus)} = ${total}`;
        } else if (kind === "attack" || kind === "damage") {
          let weapon = null;
          const weapons = character?.weapons || npc?.weapons || [];
          if (body.weaponIndex != null && Number.isFinite(Number(body.weaponIndex))) {
            weapon = weapons[Number(body.weaponIndex)] || null;
          }
          if (!weapon && body.weaponName) {
            const want = String(body.weaponName).trim().toLowerCase();
            weapon = weapons.find((w) => String(w.name || "").trim().toLowerCase() === want) || null;
          }
          weaponName = weapon?.name || body.weaponName || body.label || "Оружие";
          abilityKey = String(weapon?.ability || body.ability || "str").toLowerCase();
          if (!ABILITY_LABELS_RU[abilityKey]) abilityKey = "str";

          if (kind === "attack") {
            const mod = character
              ? characterAbilityMod(character, abilityKey)
              : npc
                ? npcAbilityMod(npc, abilityKey)
                : 0;
            const pb = character
              ? Number(character.proficiencyBonus || 2)
              : Number(npc?.proficiencyBonus || 2);
            const proficient = weapon ? Boolean(weapon.proficient) : body.proficient !== false;
            if (weapon?.attackBonus != null && Number.isFinite(Number(weapon.attackBonus))) {
              bonus = Number(weapon.attackBonus);
            } else {
              bonus = mod + (proficient ? pb : 0);
            }
            label = `Атака · ${weaponName}`;
            const d20 = rollD20WithMode(d20Mode);
            rollMode = d20.mode;
            rolls = d20.rolls;
            roll = d20.roll;
            total = roll + bonus;
            detail = `${d20.detailPrefix} ${fmtSigned(bonus)} = ${total}`;
          } else {
            const formulaRaw = String(weapon?.damage || body.formula || body.damage || "").trim();
            if (!formulaRaw) {
              sendJson(res, 400, { error: "У оружия нет формулы урона" });
              return;
            }
            parseDiceFormula(formulaRaw); // validate
            const rolled = rollDiceFormula(formulaRaw);
            label = `Урон · ${weaponName}`;
            bonus = rolled.bonus;
            total = rolled.total;
            detail = `${formulaRaw} → ${rolled.detail}`;
            rolls = rolled.parts;
            die = rolled.formula?.dice?.[0]?.sides || 0;
            roll = total;
          }
        }
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
        return;
      }

      const log = {
        id: randomId("combat"),
        type: "roll",
        actorName,
        actorRole: session.role,
        rollerName: session.userName,
        characterId: character?.id || null,
        npcId: npc?.id || null,
        tokenId: body.tokenId || null,
        kind,
        ability: abilityKey,
        label,
        weaponName,
        mode: rollMode,
        die,
        roll,
        bonus,
        total,
        detail,
        rolls,
        createdAt: new Date().toISOString()
      };
      appendCombatLog(game, log);
      sendJson(res, 200, {
        log,
        combatLog: publicCombatLog(game),
        combat: combatPublicView(ensureCombat(game), {
          viewerRole: session.role,
          characterId: member?.characterId || null,
          game
        })
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/encounter") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      try {
        const result = enlistCombatants(game, body.tokenIds || [], abilityModifier);
        const member = lobby.members.find((m) => m.id === session.userId);
        sendJson(res, 200, {
          combat: combatPublicView(result.combat, {
            viewerRole: "master",
            characterId: member?.characterId || null,
            game
          }),
          added: result.added.map((c) => c.tokenId),
          skipped: result.skipped
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/initiative/roll") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      const member = lobby.members.find((m) => m.id === session.userId);
      try {
        const result = applyInitiativeRoll(
          game,
          {
            tokenId: body.tokenId || null,
            characterId:
              session.role === "player" ? member?.characterId || null : body.characterId || member?.characterId || null,
            role: session.role,
            forceRoll: session.role === "master" && Boolean(body.forceRoll)
          },
          abilityModifier
        );
        sendJson(res, 200, {
          combat: combatPublicView(result.combat, {
            viewerRole: session.role,
            characterId: member?.characterId || null,
            game
          }),
          combatant: result.combatant
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/initiative/auto") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req).catch(() => ({}));
      try {
        const result = autoRollPending(
          game,
          { includePlayers: Boolean(body?.includePlayers) },
          abilityModifier
        );
        sendJson(res, 200, {
          combat: combatPublicView(result.combat, { viewerRole: "master", game }),
          rolled: result.rolled.map((c) => c.tokenId)
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/turn/next") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      try {
        const result = advanceTurn(game);
        sendJson(res, 200, {
          combat: combatPublicView(result.combat, { viewerRole: "master", game }),
          current: result.current
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/combat/end") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req).catch(() => ({}));
      const wasActive = Boolean(game.combat?.active);
      const combat = endCombat(game);
      if (wasActive) {
        appendCombatLog(game, {
          id: randomId("combat"),
          type: "roll",
          actorName: session.userName || "Мастер",
          actorRole: "master",
          rollerName: session.userName || "Мастер",
          kind: "ability",
          label: "Бой прерван",
          die: 0,
          roll: 0,
          bonus: 0,
          total: 0,
          detail: body?.reason === "force" ? "Принудительная остановка боя · инициатива сброшена" : "Бой завершён · инициатива сброшена",
          createdAt: new Date().toISOString()
        });
      }
      sendJson(res, 200, {
        combat: combatPublicView(combat, { viewerRole: "master", game }),
        combatLog: publicCombatLog(game)
      });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/chat") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      if (session.role === "master") {
        sendJson(res, 200, privateChatViewForMaster(game, lobby));
      } else {
        sendJson(res, 200, privateChatViewForPlayer(game, lobby, session.userId));
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/chat/message") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      try {
        let playerId = session.userId;
        if (session.role === "master") {
          playerId = String(body.playerId || "").trim();
          if (!playerId) {
            sendJson(res, 400, { error: "Укажите playerId" });
            return;
          }
        }
        const entry = appendChatText(game, lobby, {
          playerId,
          fromRole: session.role,
          fromName: session.userName,
          text: body.text
        });
        const chat =
          session.role === "master"
            ? privateChatViewForMaster(game, lobby)
            : privateChatViewForPlayer(game, lobby, session.userId);
        sendJson(res, 200, { message: entry, privateChat: chat });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/chat/roll") {
      const session = getSession(req);
      if (!session || (session.role !== "master" && session.role !== "player")) {
        sendJson(res, 403, { error: "Нужна сессия" });
        return;
      }
      const body = await readJson(req);
      try {
        let playerId = session.userId;
        if (session.role === "master") {
          playerId = String(body.playerId || "").trim();
          if (!playerId) {
            sendJson(res, 400, { error: "Укажите playerId" });
            return;
          }
        }
        const entry = appendChatRoll(game, lobby, {
          playerId,
          fromRole: session.role,
          fromName: session.userName,
          die: body.die
        });
        const chat =
          session.role === "master"
            ? privateChatViewForMaster(game, lobby)
            : privateChatViewForPlayer(game, lobby, session.userId);
        sendJson(res, 200, { message: entry, privateChat: chat });
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/loot") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      sendJson(res, 200, lootPublicView(ensureLootState(game)));
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/loot/mine") {
      const session = getSession(req);
      const member = lobby.members.find((m) => m.id === session?.userId);
      const characterId = member?.characterId || null;
      const character = characterId ? game.characters.find((c) => c.id === characterId) : null;
      const items = [
        ...(member?.inventory || []),
        ...(character?.inventory || [])
      ];
      // unique by id
      const seen = new Set();
      const inventory = [];
      for (const item of items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        inventory.push(item);
      }
      sendJson(res, 200, {
        inventory,
        memberId: member?.id ?? null,
        characterId: character?.id ?? null,
        characterName: character?.name ?? null
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/preload") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      try {
        const data = await loadMagicItemsFromNetwork({ forceRefresh: Boolean(body.forceRefresh) });
        sendJson(res, 200, {
          loaded: data.items.length,
          fromCache: data.fromCache,
          byRarityCounts: data.byRarityCounts,
          rarities: rarityCatalog()
        });
      } catch (error) {
        sendJson(res, 502, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/random") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const rarity = String(body.rarity ?? "common");
      const count = Number(body.count ?? 1);
      try {
        const catalog = await loadMagicItemsFromNetwork({ forceRefresh: false });
        const picked = pickRandomItems(catalog.items, rarity, count);
        if (!picked.length) {
          sendJson(res, 404, { error: `Нет предметов редкости «${rarity}» в каталоге` });
          return;
        }
        const loot = ensureLootState(game);
        loot.sessionDrops.push(...picked);
        sendJson(res, 200, { items: picked, loot: lootPublicView(loot) });
      } catch (error) {
        sendJson(res, 502, { error: String(error.message || error) });
      }
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/custom") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const target = body.target === "campaign" ? "campaign" : "drops";
      const item = buildCustomLootItem(body, target === "campaign" ? "campaign" : "custom");
      const loot = ensureLootState(game);
      if (target === "campaign") {
        loot.campaignPool.push(item);
      } else {
        loot.sessionDrops.push(item);
      }
      sendJson(res, 201, { item, loot: lootPublicView(loot) });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/campaign") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const item = buildCustomLootItem(body, "campaign");
      const loot = ensureLootState(game);
      loot.campaignPool.push(item);
      sendJson(res, 201, { item, loot: lootPublicView(loot) });
      return;
    }

    if (req.method === "DELETE" && /^\/loot\/campaign\/[^/]+$/.test(parsedUrl.pathname)) {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const itemId = parsedUrl.pathname.split("/")[3];
      const loot = ensureLootState(game);
      loot.campaignPool = loot.campaignPool.filter((i) => i.id !== itemId);
      sendJson(res, 200, { loot: lootPublicView(loot) });
      return;
    }

    if (req.method === "DELETE" && /^\/loot\/drops\/[^/]+$/.test(parsedUrl.pathname)) {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const itemId = parsedUrl.pathname.split("/")[3];
      const loot = ensureLootState(game);
      loot.sessionDrops = loot.sessionDrops.filter((i) => i.id !== itemId);
      sendJson(res, 200, { loot: lootPublicView(loot) });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/grant") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const itemId = String(body.itemId ?? "");
      const from = body.from === "campaign" ? "campaign" : "drops";
      const loot = ensureLootState(game);
      const list = from === "campaign" ? loot.campaignPool : loot.sessionDrops;
      const idx = list.findIndex((i) => i.id === itemId);
      if (idx < 0) {
        sendJson(res, 404, { error: "Предмет не найден в источнике" });
        return;
      }
      const [item] = list.splice(idx, 1);

      let recipientLabel = "";
      let character = null;
      let member = null;

      if (body.characterId) {
        character = game.characters.find((c) => c.id === body.characterId);
        if (!character) {
          list.splice(idx, 0, item);
          sendJson(res, 404, { error: "Персонаж не найден" });
          return;
        }
        if (!Array.isArray(character.inventory)) character.inventory = [];
        character.inventory.push({ ...item, grantedAt: new Date().toISOString() });
        recipientLabel = character.name;
      } else if (body.memberId) {
        member = lobby.members.find((m) => m.id === body.memberId && m.role !== "master");
        if (!member) {
          list.splice(idx, 0, item);
          sendJson(res, 404, { error: "Игрок не найден" });
          return;
        }
        if (!Array.isArray(member.inventory)) member.inventory = [];
        member.inventory.push({ ...item, grantedAt: new Date().toISOString() });
        recipientLabel = member.name;
      } else {
        list.splice(idx, 0, item);
        sendJson(res, 400, { error: "Укажите characterId или memberId" });
        return;
      }

      const grant = {
        id: randomId("grant"),
        item: { id: item.id, name: item.name, rarity: item.rarity, rarityLabel: item.rarityLabel },
        characterId: character?.id ?? null,
        memberId: member?.id ?? null,
        recipientLabel,
        from,
        createdAt: new Date().toISOString()
      };
      loot.grants.push(grant);
      sendJson(res, 200, { grant, loot: lootPublicView(loot) });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/loot/gold") {
      const session = getSession(req);
      if (session?.role !== "master") {
        sendJson(res, 403, { error: "Только мастер" });
        return;
      }
      const body = await readJson(req);
      const amount = Math.trunc(Number(body.amount ?? body.gp ?? 0));
      if (!Number.isFinite(amount) || amount === 0) {
        sendJson(res, 400, { error: "Укажите ненулевое количество зм" });
        return;
      }

      let character = null;
      if (body.characterId) {
        character = game.characters.find((c) => c.id === body.characterId) || null;
      } else if (body.memberId) {
        const member = lobby.members.find((m) => m.id === body.memberId && m.role !== "master");
        if (!member?.characterId) {
          sendJson(res, 404, { error: "У игрока нет привязанного персонажа" });
          return;
        }
        character = game.characters.find((c) => c.id === member.characterId) || null;
      } else {
        sendJson(res, 400, { error: "Укажите characterId или memberId" });
        return;
      }
      if (!character) {
        sendJson(res, 404, { error: "Персонаж не найден" });
        return;
      }

      const coins = ensureCharacterCoins(character);
      coins.gp = Math.max(0, coins.gp + amount);
      const loot = ensureLootState(game);
      const grant = {
        id: randomId("grant"),
        kind: "gold",
        item: {
          id: `gold-${Date.now().toString(36)}`,
          name: `${amount > 0 ? "+" : ""}${amount} зм`,
          rarity: "common",
          rarityLabel: "Золото"
        },
        amountGp: amount,
        coinsAfter: { ...coins },
        characterId: character.id,
        memberId: null,
        recipientLabel: character.name,
        from: "gold",
        createdAt: new Date().toISOString()
      };
      loot.grants.push(grant);
      sendJson(res, 200, {
        grant,
        character: { id: character.id, name: character.name, coins: { ...coins } },
        loot: lootPublicView(loot)
      });
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/monsters/preload") {
      const body = await readJson(req);
      const forceRefresh = Boolean(body.forceRefresh);

      if (game.monsterLoad?.status === "running") {
        sendJson(res, 200, { started: false, alreadyRunning: true, progress: game.monsterLoad });
        return;
      }

      game.monsterLoad = {
        status: "running",
        percent: 0,
        message: "Старт…",
        loaded: 0,
        fromCache: false,
        sources: [],
        errors: [],
        fallback: false
      };

      (async () => {
        try {
          const network = await loadMonstersFromNetwork({
            forceRefresh,
            onProgress: ({ percent, message }) => {
              game.monsterLoad = {
                ...game.monsterLoad,
                status: "running",
                percent,
                message
              };
            }
          });
          game.monsters = network.monsters.sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
          game.monsterLoad = {
            status: "done",
            percent: 100,
            message: `Готово: ${game.monsters.length} мобов`,
            loaded: game.monsters.length,
            fromCache: network.fromCache,
            sources: network.sources,
            fetchedAt: network.fetchedAt,
            errors: network.errors ?? [],
            fallback: false
          };
        } catch (error) {
          game.monsters = MONSTER_CATALOG.map((m) => ({ ...m })).sort((a, b) =>
            String(a.name).localeCompare(String(b.name), "ru")
          );
          game.monsterLoad = {
            status: "done",
            percent: 100,
            message: `Сеть недоступна, локальный каталог: ${game.monsters.length}`,
            loaded: game.monsters.length,
            fromCache: false,
            sources: ["local-fallback"],
            errors: [String(error.message || error)],
            fallback: true
          };
        }
      })();

      sendJson(res, 202, { started: true, progress: game.monsterLoad });
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/monsters/preload/progress") {
      sendJson(
        res,
        200,
        game.monsterLoad ?? {
          status: "idle",
          percent: 0,
          message: "не загружено",
          loaded: game.monsters.length
        }
      );
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/monsters") {
      sendJson(res, 200, game.monsters);
      return;
    }

    if (req.method === "GET" && /^\/monsters\/[^/]+$/.test(parsedUrl.pathname)) {
      const sourceId = decodeURIComponent(parsedUrl.pathname.split("/")[2]);
      const monster = game.monsters.find((m) => m.sourceId === sourceId);
      if (!monster) {
        sendJson(res, 404, { error: "Моб не найден. Сначала нажмите «Загрузить мобов»." });
        return;
      }
      sendJson(res, 200, monster);
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/npc/custom") {
      const body = await readJson(req);
      const npc = {
        id: randomId("npc"),
        locale: String(body.locale ?? "ru"),
        name: String(body.name ?? "Custom NPC"),
        type: String(body.type ?? "humanoid"),
        challengeRating: String(body.challengeRating ?? "1"),
        hp: Number(body.hp ?? 10),
        ac: Number(body.ac ?? 10),
        speed: String(body.speed ?? "30 ft"),
        abilities: {
          str: Number(body.abilities?.str ?? 10),
          dex: Number(body.abilities?.dex ?? 10),
          con: Number(body.abilities?.con ?? 10),
          int: Number(body.abilities?.int ?? 10),
          wis: Number(body.abilities?.wis ?? 10),
          cha: Number(body.abilities?.cha ?? 10)
        },
        actions: Array.isArray(body.actions) ? body.actions : [],
        notes: typeof body.notes === "string" ? body.notes : ""
      };
      game.customNpcs.push(npc);
      sendJson(res, 201, npc);
      return;
    }

    if (req.method === "GET" && parsedUrl.pathname === "/npc") {
      sendJson(res, 200, game.customNpcs);
      return;
    }

    if (req.method === "POST" && parsedUrl.pathname === "/lobby/close") {
      const session = getSession(req);
      if (!session || session.role !== "master" || session.lobbyId !== lobby.id) {
        sendJson(res, 403, { error: "Только мастер может закрыть лобби" });
        return;
      }
      lobby.isOpen = false;
      activePersistLobby = lobby;
      await persistLobbyNow(lobby);
      sendJson(res, 200, { lobby: lobbyPublicView(lobby) });
      return;
    }
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Неверный запрос" });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = createServer(requestHandler);
const isVercel = Boolean(process.env.VERCEL);

function preloadCatalogs() {
  loadSubclassesFromNetwork({}).catch((error) => {
    console.warn("subclasses preload skipped:", error.message || error);
  });
}

async function bootPersist() {
  try {
    await loadOpenLobbies(lobbies);
    console.log(`[lobby-persist] hydrated lobbies=${lobbies.size} backend=${getPersistBackend()}`);
  } catch (error) {
    console.warn("[lobby-persist] boot failed:", error.message || error);
  }
}

if (!isVercel) {
  server.listen(port, host, () => {
    console.log(`@dnd/server listening on http://${host}:${port}`);
    preloadCatalogs();
    bootPersist();
  });
} else {
  preloadCatalogs();
  bootPersist();
}

export default requestHandler;
