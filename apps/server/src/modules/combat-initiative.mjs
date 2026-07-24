/**
 * Инициатива / порядок боя для лобби (in-memory game state).
 */

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

export function createEmptyCombat() {
  return {
    active: false,
    phase: "idle", // idle | rolling | ordered
    round: 1,
    currentIndex: 0,
    startedAt: null,
    updatedAt: null,
    combatants: []
  };
}

export function ensureCombat(game) {
  if (!game.combat || typeof game.combat !== "object") {
    game.combat = createEmptyCombat();
  }
  if (!Array.isArray(game.combat.combatants)) game.combat.combatants = [];
  return game.combat;
}

export function combatPublicView(combat, { viewerRole, characterId, game = null } = {}) {
  const c = combat || createEmptyCombat();
  // Актуальные ХП с токенов
  if (game?.map?.tokens) {
    for (const cbt of c.combatants) {
      const token = game.map.tokens.find((t) => t.id === cbt.tokenId);
      if (token) {
        cbt.hpCurrent = token.hpCurrent ?? cbt.hpCurrent;
        cbt.hpMax = token.hpMax ?? cbt.hpMax;
        if (token.npcId && !cbt.npcId) cbt.npcId = token.npcId;
      }
    }
  }
  const ordered = sortedCombatants(c.combatants.filter((x) => x.status === "rolled"));
  const pending = c.combatants.filter((x) => x.status === "pending");
  const my =
    viewerRole === "player" && characterId
      ? c.combatants.find((x) => x.characterId === characterId) || null
      : null;
  return {
    active: Boolean(c.active),
    phase: c.phase || "idle",
    round: c.round || 1,
    currentIndex: c.currentIndex || 0,
    startedAt: c.startedAt,
    updatedAt: c.updatedAt,
    combatants: c.combatants.map(publicCombatant),
    order: ordered.map(publicCombatant),
    pending: pending.map(publicCombatant),
    current: ordered[c.currentIndex] ? publicCombatant(ordered[c.currentIndex]) : null,
    myCombatant: my ? publicCombatant(my) : null,
    npcSheets: game ? combatNpcSheets(game, c, { viewerRole }) : {},
    canRoll:
      Boolean(c.active) &&
      my &&
      my.status === "pending" &&
      my.type === "player"
  };
}

function publicCombatant(x) {
  return {
    id: x.id,
    tokenId: x.tokenId,
    characterId: x.characterId || null,
    npcId: x.npcId || null,
    name: x.name,
    type: x.type,
    portraitUrl: x.portraitUrl || null,
    dexMod: x.dexMod,
    roll: x.roll,
    total: x.total,
    status: x.status,
    rolledBy: x.rolledBy || null,
    joinedAt: x.joinedAt,
    hpCurrent: x.hpCurrent ?? null,
    hpMax: x.hpMax ?? null
  };
}

function makeCombatant(token, dexMod) {
  return {
    id: `cbt-${token.id}`,
    tokenId: token.id,
    characterId: token.characterId || null,
    npcId: token.npcId || null,
    name: token.name || "Безымянный",
    type: token.type || "npc",
    portraitUrl: token.portraitUrl || null,
    dexMod: Number(dexMod) || 0,
    roll: null,
    total: null,
    status: "pending",
    rolledBy: null,
    joinedAt: new Date().toISOString(),
    hpCurrent: token.hpCurrent ?? null,
    hpMax: token.hpMax ?? null
  };
}

/** Карточки NPC/монстров для полосы инициативы (мастер видит notes). */
export function combatNpcSheets(game, combat, { viewerRole } = {}) {
  const sheets = {};
  const list = game?.customNpcs || [];
  const tokens = game?.map?.tokens || [];
  for (const cbt of combat?.combatants || []) {
    if (cbt.type === "player") continue;
    const token = tokens.find((t) => t.id === cbt.tokenId);
    let npc =
      (cbt.npcId && list.find((n) => n.id === cbt.npcId)) ||
      (token?.npcId && list.find((n) => n.id === token.npcId)) ||
      null;
    if (!npc && cbt.name) {
      const base = String(cbt.name)
        .replace(/\s*\(\d+\)\s*$/, "")
        .replace(/\s*\([^)]*\)\s*$/, "")
        .trim()
        .toLowerCase();
      npc =
        list.find((n) => String(n.name || "").trim().toLowerCase() === base) ||
        list.find((n) => String(n.name || "").toLowerCase().startsWith(base.split(/\s+/)[0] || "")) ||
        null;
    }
    if (!npc) {
      sheets[cbt.id] = {
        id: cbt.npcId || cbt.id,
        name: cbt.name,
        type: cbt.type || "npc",
        hp: token?.hpMax ?? cbt.hpMax ?? null,
        ac: null,
        speed: null,
        abilities: {},
        actions: [],
        notes: viewerRole === "master" ? "Нет карточки NPC в шаблоне — только токен." : "",
        traits: [],
        fromToken: true
      };
      continue;
    }
    sheets[cbt.id] = {
      id: npc.id,
      name: npc.name,
      type: npc.type,
      challengeRating: npc.challengeRating,
      hp: token?.hpMax ?? npc.hp,
      ac: npc.ac,
      speed: npc.speed,
      abilities: npc.abilities || {},
      actions: Array.isArray(npc.actions) ? npc.actions : [],
      traits: Array.isArray(npc.traits) ? npc.traits : [],
      skills: npc.skills || null,
      senses: npc.senses || null,
      languages: npc.languages || null,
      immunities: npc.immunities || null,
      resistances: npc.resistances || null,
      vulnerabilities: npc.vulnerabilities || null,
      notes: viewerRole === "master" ? npc.notes || "" : "",
      fromToken: false
    };
  }
  return sheets;
}

export function resolveDexMod(game, token, abilityModifierFn) {
  if (token?.dexMod != null && Number.isFinite(Number(token.dexMod))) {
    return Number(token.dexMod);
  }
  if (token?.characterId) {
    const ch = (game.characters || []).find((c) => c.id === token.characterId);
    if (ch?.abilities?.dex?.modifier != null) return Number(ch.abilities.dex.modifier);
    if (ch?.abilities?.dex?.score != null) return abilityModifierFn(ch.abilities.dex.score);
  }
  if (token?.npcId) {
    const npc = (game.customNpcs || []).find((n) => n.id === token.npcId);
    if (npc?.abilities?.dex != null) return abilityModifierFn(npc.abilities.dex);
  }
  if (token?.monsterDexScore != null) return abilityModifierFn(token.monsterDexScore);
  return 0;
}

/**
 * Старт боя или добавление участников в уже идущий бой.
 * @returns {{ combat, added: object[], skipped: string[] }}
 */
export function enlistCombatants(game, tokenIds, abilityModifierFn) {
  const combat = ensureCombat(game);
  const ids = [...new Set((tokenIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    throw new Error("Выберите хотя бы одного участника");
  }

  const added = [];
  const skipped = [];
  const now = new Date().toISOString();

  if (!combat.active) {
    combat.active = true;
    combat.phase = "rolling";
    combat.round = 1;
    combat.currentIndex = 0;
    combat.startedAt = now;
    combat.combatants = [];
  }

  for (const tokenId of ids) {
    const token = (game.map?.tokens || []).find((t) => t.id === tokenId);
    if (!token) {
      skipped.push(tokenId);
      continue;
    }
    if (combat.combatants.some((c) => c.tokenId === tokenId)) {
      skipped.push(tokenId);
      continue;
    }
    const dexMod = resolveDexMod(game, token, abilityModifierFn);
    const cbt = makeCombatant(token, dexMod);
    combat.combatants.push(cbt);
    added.push(cbt);
  }

  if (!added.length && !combat.combatants.length) {
    combat.active = false;
    combat.phase = "idle";
    throw new Error("Не удалось добавить участников");
  }

  refreshCombatPhase(combat);
  combat.updatedAt = now;
  return { combat, added, skipped };
}

export function applyInitiativeRoll(game, { tokenId, characterId, role, forceRoll }, abilityModifierFn) {
  const combat = ensureCombat(game);
  if (!combat.active) throw new Error("Бой не активен");

  let cbt = null;
  if (tokenId) {
    cbt = combat.combatants.find((c) => c.tokenId === tokenId);
  } else if (characterId) {
    cbt = combat.combatants.find((c) => c.characterId === characterId);
  }
  if (!cbt) throw new Error("Участник не найден в бою");
  if (cbt.status === "rolled" && !forceRoll) {
    throw new Error("Инициатива уже брошена");
  }

  if (role === "player") {
    if (cbt.type !== "player" || cbt.characterId !== characterId) {
      throw new Error("Можно бросать только за своего героя");
    }
  }

  // Обновить dex на случай смены листа
  const token = (game.map?.tokens || []).find((t) => t.id === cbt.tokenId);
  if (token) {
    cbt.dexMod = resolveDexMod(game, token, abilityModifierFn);
    cbt.portraitUrl = token.portraitUrl || cbt.portraitUrl;
    cbt.name = token.name || cbt.name;
  }

  const roll = rollD20();
  cbt.roll = roll;
  cbt.total = roll + (Number(cbt.dexMod) || 0);
  cbt.status = "rolled";
  cbt.rolledBy = role === "master" ? "master" : "player";
  combat.updatedAt = new Date().toISOString();
  refreshCombatPhase(combat);
  return { combat, combatant: cbt };
}

/** Автобросок всех pending монстров/NPC (и опционально игроков — только мастер). */
export function autoRollPending(game, { includePlayers = false } = {}, abilityModifierFn) {
  const combat = ensureCombat(game);
  if (!combat.active) throw new Error("Бой не активен");
  const rolled = [];
  for (const cbt of combat.combatants) {
    if (cbt.status !== "pending") continue;
    if (cbt.type === "player" && !includePlayers) continue;
    const token = (game.map?.tokens || []).find((t) => t.id === cbt.tokenId);
    if (token) {
      cbt.dexMod = resolveDexMod(game, token, abilityModifierFn);
      cbt.portraitUrl = token.portraitUrl || cbt.portraitUrl;
      cbt.name = token.name || cbt.name;
    }
    const roll = rollD20();
    cbt.roll = roll;
    cbt.total = roll + (Number(cbt.dexMod) || 0);
    cbt.status = "rolled";
    cbt.rolledBy = "master";
    rolled.push(cbt);
  }
  combat.updatedAt = new Date().toISOString();
  refreshCombatPhase(combat);
  return { combat, rolled };
}

export function sortedCombatants(list) {
  return [...list].sort((a, b) => {
    const ta = Number(b.total ?? -999) - Number(a.total ?? -999);
    if (ta !== 0) return ta;
    const dx = Number(b.dexMod || 0) - Number(a.dexMod || 0);
    if (dx !== 0) return dx;
    return String(a.name).localeCompare(String(b.name), "ru");
  });
}

function refreshCombatPhase(combat) {
  if (!combat.active) {
    combat.phase = "idle";
    return;
  }
  const anyPending = combat.combatants.some((c) => c.status === "pending");
  const anyRolled = combat.combatants.some((c) => c.status === "rolled");
  if (anyPending) combat.phase = "rolling";
  else if (anyRolled) combat.phase = "ordered";
  else combat.phase = "rolling";

  const ordered = sortedCombatants(combat.combatants.filter((c) => c.status === "rolled"));
  if (combat.currentIndex >= ordered.length) {
    combat.currentIndex = Math.max(0, ordered.length - 1);
  }
}

export function advanceTurn(game) {
  const combat = ensureCombat(game);
  if (!combat.active) throw new Error("Бой не активен");
  const ordered = sortedCombatants(combat.combatants.filter((c) => c.status === "rolled"));
  if (!ordered.length) throw new Error("Нет бросков инициативы");
  combat.currentIndex += 1;
  if (combat.currentIndex >= ordered.length) {
    combat.currentIndex = 0;
    combat.round = (combat.round || 1) + 1;
  }
  combat.updatedAt = new Date().toISOString();
  return { combat, current: ordered[combat.currentIndex] };
}

export function endCombat(game) {
  game.combat = createEmptyCombat();
  return game.combat;
}
