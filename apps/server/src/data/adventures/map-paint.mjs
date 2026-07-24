/**
 * Хелперы отрисовки боевых карт тайлами прототипа.
 */

export function paintRect(tiles, x0, y0, w, h, textureId) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      tiles[`${x}:${y}`] = textureId;
    }
  }
}

export function paintBorder(tiles, x0, y0, w, h, textureId = "wall") {
  for (let x = x0; x < x0 + w; x += 1) {
    tiles[`${x}:${y0}`] = textureId;
    tiles[`${x}:${y0 + h - 1}`] = textureId;
  }
  for (let y = y0; y < y0 + h; y += 1) {
    tiles[`${x0}:${y}`] = textureId;
    tiles[`${x0 + w - 1}:${y}`] = textureId;
  }
}

export function paintRoom(tiles, x0, y0, w, h, { floor = "floor", wall = "wall", door = null } = {}) {
  paintRect(tiles, x0, y0, w, h, floor);
  paintBorder(tiles, x0, y0, w, h, wall);
  if (door) {
    const { x, y, textureId = "door_open" } = door;
    tiles[`${x}:${y}`] = textureId;
  }
}

export function paintHCorridor(tiles, x0, y, len, textureId = "floor") {
  for (let x = x0; x < x0 + len; x += 1) tiles[`${x}:${y}`] = textureId;
}

export function paintVCorridor(tiles, x, y0, len, textureId = "floor") {
  for (let y = y0; y < y0 + len; y += 1) tiles[`${x}:${y}`] = textureId;
}

export function makeToken({
  name,
  type = "npc",
  x,
  y,
  hpCurrent,
  hpMax,
  dexMod = 0,
  npcId = null,
  portraitUrl = null
}) {
  const id = `token_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name,
    type,
    characterId: null,
    npcId,
    portraitUrl,
    dexMod,
    hpCurrent: hpCurrent ?? hpMax ?? 10,
    hpMax: hpMax ?? hpCurrent ?? 10,
    position: { x, y }
  };
}

export function makeNpc({
  name,
  type = "humanoid",
  hp = 20,
  ac = 12,
  abilities = {},
  notes = "",
  actions = []
}) {
  return {
    id: `npc_${Math.random().toString(36).slice(2, 10)}`,
    locale: "ru",
    name,
    type,
    challengeRating: "1",
    hp,
    ac,
    speed: "30 фт.",
    abilities: {
      str: abilities.str ?? 10,
      dex: abilities.dex ?? 10,
      con: abilities.con ?? 10,
      int: abilities.int ?? 10,
      wis: abilities.wis ?? 10,
      cha: abilities.cha ?? 10
    },
    actions: Array.isArray(actions) ? actions : [],
    notes
  };
}
