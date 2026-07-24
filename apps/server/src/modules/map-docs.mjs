/**
 * Мульти-карта лобби: вкладки, публикация для игроков, alias game.map.
 */

export function createEmptyMapDoc(name = "Карта", { width = 40, height = 30 } = {}) {
  return {
    id: `map_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "Карта"),
    width,
    height,
    tokens: [],
    tiles: {},
    overlays: {},
    vision: { mode: "full", radius: 3, revealedCells: [] },
    published: false,
    playerSwitchLocked: false,
    createdAt: new Date().toISOString()
  };
}

export function cloneMapDoc(map, { name, published = false } = {}) {
  const src = map || createEmptyMapDoc();
  return {
    id: `map_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name || `${src.name || "Карта"} (копия)`,
    width: src.width || 40,
    height: src.height || 30,
    tokens: JSON.parse(JSON.stringify(src.tokens || [])),
    tiles: { ...(src.tiles || {}) },
    overlays: JSON.parse(JSON.stringify(src.overlays || {})),
    vision: JSON.parse(JSON.stringify(src.vision || { mode: "full", radius: 3, revealedCells: [] })),
    published: Boolean(published),
    playerSwitchLocked: Boolean(src.playerSwitchLocked),
    createdAt: new Date().toISOString()
  };
}

/** Поднять legacy game.map в maps[] и держать game.map = активная вкладка */
export function ensureMapSystem(game) {
  if (!game || typeof game !== "object") return game;
  if (!Array.isArray(game.maps) || game.maps.length === 0) {
    const legacy = game.map && typeof game.map === "object" ? game.map : null;
    const doc = legacy
      ? {
          id: legacy.id || `map_${Date.now().toString(36)}`,
          name: legacy.name || "Карта 1",
          width: legacy.width || 40,
          height: legacy.height || 30,
          tokens: Array.isArray(legacy.tokens) ? legacy.tokens : [],
          tiles: legacy.tiles && typeof legacy.tiles === "object" ? legacy.tiles : {},
          overlays: legacy.overlays && typeof legacy.overlays === "object" ? legacy.overlays : {},
          vision: legacy.vision || { mode: "full", radius: 3, revealedCells: [] },
          published: true,
          createdAt: new Date().toISOString()
        }
      : createEmptyMapDoc("Карта 1", { published: true });
    doc.published = true;
    game.maps = [doc];
    game.activeMapId = doc.id;
    game.playerMapId = doc.id;
  }
  if (!game.activeMapId || !game.maps.some((m) => m.id === game.activeMapId)) {
    game.activeMapId = game.maps[0].id;
  }
  if (!game.playerMapId || !game.maps.some((m) => m.id === game.playerMapId && m.published)) {
    const pub = game.maps.find((m) => m.published) || game.maps[0];
    pub.published = true;
    game.playerMapId = pub.id;
  }
  syncActiveMapAlias(game);
  return game;
}

export function syncActiveMapAlias(game) {
  const active = (game.maps || []).find((m) => m.id === game.activeMapId) || (game.maps || [])[0];
  if (active) game.map = active;
  return active;
}

export function getActiveMap(game) {
  ensureMapSystem(game);
  return game.maps.find((m) => m.id === game.activeMapId) || game.maps[0];
}

export function getMapById(game, mapId) {
  ensureMapSystem(game);
  return game.maps.find((m) => m.id === mapId) || null;
}

export function getPlayerViewMap(game, preferredMapId = null) {
  ensureMapSystem(game);
  if (preferredMapId) {
    const hit = game.maps.find((m) => m.id === preferredMapId && m.published);
    if (hit) return hit;
  }
  const pub = game.maps.find((m) => m.id === game.playerMapId && m.published);
  if (pub) return pub;
  return game.maps.find((m) => m.published) || game.maps[0];
}

/** ТВ-зритель: активная карта мастера, если открыта игрокам; иначе дефолт игроков. */
export function getSpectatorViewMap(game) {
  ensureMapSystem(game);
  const active = game.maps.find((m) => m.id === game.activeMapId && m.published);
  if (active) return active;
  const playerDefault = game.maps.find((m) => m.id === game.playerMapId && m.published);
  if (playerDefault) return playerDefault;
  return getPlayerViewMap(game, null);
}

export function mapsPublicMeta(game, { forMaster = false } = {}) {
  ensureMapSystem(game);
  return game.maps.map((m) => ({
    id: m.id,
    name: m.name,
    published: Boolean(m.published),
    playerSwitchLocked: Boolean(m.playerSwitchLocked),
    width: m.width,
    height: m.height,
    tokenCount: (m.tokens || []).length,
    isActive: m.id === game.activeMapId,
    isPlayerDefault: m.id === game.playerMapId
  })).filter((m) => forMaster || m.published);
}

export function setMapPlayerSwitchLock(game, mapId, locked = true) {
  ensureMapSystem(game);
  const map = getMapById(game, mapId);
  if (!map) throw new Error("Карта не найдена");
  map.playerSwitchLocked = Boolean(locked);
  return map;
}

export function setActiveMap(game, mapId) {
  ensureMapSystem(game);
  const map = getMapById(game, mapId);
  if (!map) throw new Error("Карта не найдена");
  game.activeMapId = map.id;
  syncActiveMapAlias(game);
  // Уже открытая игрокам карта при смене вкладки мастера становится картой стола (игроки + ТВ).
  if (map.published) {
    game.playerMapId = map.id;
  }
  return map;
}

export function publishMap(game, mapId, published = true) {
  ensureMapSystem(game);
  const map = getMapById(game, mapId);
  if (!map) throw new Error("Карта не найдена");
  map.published = Boolean(published);
  if (!map.published) map.playerSwitchLocked = false;
  if (map.published && !game.maps.some((m) => m.id === game.playerMapId && m.published)) {
    game.playerMapId = map.id;
  }
  if (!map.published && game.playerMapId === map.id) {
    const other = game.maps.find((m) => m.published);
    if (other) game.playerMapId = other.id;
  }
  return map;
}

export function addMapDoc(game, mapDoc) {
  ensureMapSystem(game);
  game.maps.push(mapDoc);
  game.activeMapId = mapDoc.id;
  syncActiveMapAlias(game);
  return mapDoc;
}

export function replaceMapsFromTemplate(game, mapDocs, { publishFirst = true } = {}) {
  ensureMapSystem(game);
  const docs = (mapDocs || []).map((m, i) => ({
    ...createEmptyMapDoc(m.name || `Карта ${i + 1}`, { width: m.width, height: m.height }),
    ...m,
    id: m.id || `map_${Date.now().toString(36)}_${i}`,
    published: i === 0 ? true : Boolean(m.published),
    tokens: Array.isArray(m.tokens) ? m.tokens : [],
    tiles: m.tiles || {},
    overlays: m.overlays || {},
    vision: m.vision || { mode: "full", radius: 3, revealedCells: [] }
  }));
  if (!docs.length) throw new Error("В шаблоне нет карт");
  if (publishFirst) docs[0].published = true;
  game.maps = docs;
  game.activeMapId = docs[0].id;
  game.playerMapId = docs.find((d) => d.published)?.id || docs[0].id;
  syncActiveMapAlias(game);
  return docs;
}

export function exportMapSet(game) {
  ensureMapSystem(game);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    activeMapId: game.activeMapId,
    playerMapId: game.playerMapId,
    maps: game.maps.map((m) => ({
      id: m.id,
      name: m.name,
      width: m.width,
      height: m.height,
      tiles: m.tiles,
      overlays: m.overlays,
      tokens: m.tokens,
      vision: m.vision,
      published: m.published
    }))
  };
}

export function importMapSet(game, payload, { replace = true } = {}) {
  const maps = Array.isArray(payload?.maps) ? payload.maps : Array.isArray(payload) ? payload : null;
  if (!maps?.length) throw new Error("Нет карт для импорта");
  const docs = maps.map((m, i) => ({
    ...createEmptyMapDoc(m.name || `Карта ${i + 1}`, { width: m.width || 40, height: m.height || 30 }),
    ...m,
    id: m.id || `map_${Date.now().toString(36)}_${i}`,
    tokens: Array.isArray(m.tokens) ? m.tokens : [],
    tiles: m.tiles || {},
    overlays: m.overlays || {},
    vision: m.vision || { mode: "full", radius: 3, revealedCells: [] },
    published: Boolean(m.published)
  }));
  if (!docs.some((d) => d.published)) docs[0].published = true;
  if (replace) {
    game.maps = docs;
  } else {
    ensureMapSystem(game);
    game.maps.push(...docs);
  }
  game.activeMapId = payload.activeMapId && docs.some((d) => d.id === payload.activeMapId)
    ? payload.activeMapId
    : docs[0].id;
  game.playerMapId = payload.playerMapId && docs.some((d) => d.id === payload.playerMapId && d.published)
    ? payload.playerMapId
    : docs.find((d) => d.published).id;
  syncActiveMapAlias(game);
  return docs;
}
