/**
 * Шаблон приключения «Тринадцать минут до конца» (Эберрон).
 * Баланс боёв под партию из 5 героев:
 * Каркас (пал.6 шутник), Игнорина (пал.3), Катрисса (жрец.6 homebrew),
 * Дуулан (жрец.3 порядок, хрупкий), Геррит (плут.3 дуэлянт).
 * Учтены: аура защиты +4, Сл 14–16 контроль, кара/скрытая атака, сильное лечение.
 */

import {
  makeNpc,
  makeToken,
  paintBorder,
  paintHCorridor,
  paintRect,
  paintRoom,
  paintVCorridor
} from "./map-paint.mjs";

function emptyMap(name, w = 36, h = 24) {
  return {
    name,
    width: w,
    height: h,
    tiles: {},
    overlays: {},
    tokens: [],
    vision: { mode: "full", radius: 3, revealedCells: [] },
    published: false
  };
}

function stationMap(npcs) {
  const m = emptyMap("1. Вокзал Корранберга", 40, 28);
  const { tiles, overlays, tokens } = m;
  // Площадь перед вокзалом
  paintRect(tiles, 1, 1, 38, 26, "stone");
  // Главный зал
  paintRoom(tiles, 4, 4, 32, 18, { floor: "floor", wall: "brick" });
  // Стеклянный фасад (север)
  paintHCorridor(tiles, 5, 4, 30, "glass");
  // Колонны зала
  for (const x of [10, 16, 22, 28]) {
    tiles[`${x}:8`] = "column";
    tiles[`${x}:14`] = "column";
  }
  // Киоски / скамейки
  for (const x of [8, 14, 20, 26, 32]) {
    tiles[`${x}:10`] = "bench";
    tiles[`${x}:16`] = "crate";
  }
  // Касса / диспетчерская
  paintRect(tiles, 28, 6, 6, 4, "floor");
  tiles["30:7"] = "table";
  tiles["31:7"] = "chair";
  // Южная стена зала → выход на перрон (двери)
  tiles["18:21"] = "door_open";
  tiles["19:21"] = "door_open";
  // Перрон только у состава (узкая полоса), дальше — рельсы и вагоны
  paintHCorridor(tiles, 2, 22, 36, "platform");
  paintHCorridor(tiles, 2, 23, 36, "rail");
  paintHCorridor(tiles, 2, 24, 36, "rail");
  paintHCorridor(tiles, 2, 25, 36, "rail");
  // Состав молниевого поезда на рельсах
  paintHCorridor(tiles, 4, 24, 8, "metal");
  paintHCorridor(tiles, 13, 24, 8, "metal");
  paintHCorridor(tiles, 22, 24, 8, "metal");
  tiles["12:24"] = "coupler";
  tiles["21:24"] = "coupler";
  tiles["30:24"] = "coupler";
  tiles["8:24"] = "window";
  tiles["17:24"] = "window";
  tiles["26:24"] = "window";
  tiles["6:24"] = "conductor";
  tiles["15:24"] = "conductor";
  tiles["24:24"] = "conductor";
  // Туман с пролива у края
  for (const x of [1, 2, 37, 38]) {
    tiles[`${x}:2`] = "mist";
    tiles[`${x}:26`] = "mist";
  }
  // Тайник с конвертом + багаж Наэлы
  overlays["30:8"] = { type: "stash", visibleToPlayers: false, name: "Камера хранения 13" };
  overlays["6:20"] = { type: "chest", visibleToPlayers: true, name: "Багаж Наэлы" };

  const byName = Object.fromEntries(npcs.map((n) => [n.name, n]));
  const place = (name, x, y, type = "npc", label = null) => {
    const n = byName[name];
    if (!n) return;
    tokens.push(
      makeToken({
        name: label ?? n.name,
        type,
        x,
        y,
        hpCurrent: n.hp,
        hpMax: n.hp,
        dexMod: Math.floor(((n.abilities?.dex ?? 10) - 10) / 2),
        npcId: n.id
      })
    );
  };
  place("Мирра Кел", 18, 20);
  place("Доктор Арден д’Каннит", 20, 12);
  place("Наэла Таир", 7, 19);
  place("Тобин Вей", 24, 14);
  place("Элиан Велль", 12, 13);
  place("Лисса Торр", 28, 20);
  place("Сарик (охрана Каннит)", 29, 22, "monster");
  place("Охранник Каннит", 27, 22, "monster");
  place("Охранник Каннит", 32, 21, "monster", "Охранник Каннит (2)");
  return m;
}

function diningCarMap(npcs) {
  const m = emptyMap("2. Вагон-ресторан №6", 28, 14);
  const { tiles, overlays, tokens } = m;
  paintRoom(tiles, 1, 1, 26, 12, {
    floor: "floor",
    wall: "metal",
    door: { x: 1, y: 6, textureId: "door_open" }
  });
  tiles["26:6"] = "door";
  // Окна вагона
  paintHCorridor(tiles, 3, 1, 22, "window");
  paintHCorridor(tiles, 3, 12, 22, "window");
  // Центральный проход
  paintHCorridor(tiles, 2, 6, 24, "floor");
  // Столы 6-А / 6-Б
  for (const [x, y] of [
    [6, 4],
    [6, 8],
    [12, 4],
    [12, 8],
    [18, 4],
    [18, 8]
  ]) {
    tiles[`${x}:${y}`] = "table";
    tiles[`${x + 1}:${y}`] = "chair";
    tiles[`${x - 1}:${y}`] = "chair";
  }
  // Буфет / сервис
  tiles["24:4"] = "barrel";
  tiles["24:5"] = "crate";
  tiles["24:8"] = "barrel";
  overlays["23:9"] = { type: "stash", visibleToPlayers: false, name: "Служебный ящик официанта" };
  const byName = Object.fromEntries(npcs.map((n) => [n.name, n]));
  for (const [name, x, y] of [
    ["Мирра Кел", 3, 6],
    ["Тобин Вей", 10, 5],
    ["Доктор Арден д’Каннит", 22, 7]
  ]) {
    const n = byName[name];
    if (!n) continue;
    tokens.push(
      makeToken({
        name: n.name,
        type: "npc",
        x,
        y,
        hpCurrent: n.hp,
        hpMax: n.hp,
        dexMod: Math.floor(((n.abilities?.dex ?? 10) - 10) / 2),
        npcId: n.id
      })
    );
  }
  return m;
}

function forkMap() {
  const m = emptyMap("3. Развилка · 13 вагонов", 42, 20);
  const { tiles, overlays } = m;
  paintRect(tiles, 0, 0, 42, 20, "mist");
  // Центральный узел сцепки
  paintRoom(tiles, 16, 6, 10, 8, { floor: "metal", wall: "metal" });
  paintRect(tiles, 18, 8, 6, 4, "platform");
  tiles["20:9"] = "coupler";
  tiles["21:9"] = "conductor";
  tiles["20:10"] = "rune";
  // 13 «дверей»-вагонов по дуге
  const spots = [
    [2, 2],
    [8, 2],
    [14, 2],
    [20, 2],
    [26, 2],
    [32, 2],
    [38, 2],
    [2, 16],
    [8, 16],
    [14, 16],
    [26, 16],
    [32, 16],
    [38, 16]
  ];
  spots.forEach(([x, y], i) => {
    paintRoom(tiles, x, y, 3, 3, {
      floor: "floor",
      wall: "metal",
      door: { x: x + 1, y: y + (y < 10 ? 2 : 0), textureId: "door" }
    });
    overlays[`${x + 1}:${y + 1}`] = {
      type: "stash",
      visibleToPlayers: true,
      name: `Вагон-реальность ${i + 1}`
    };
  });
  // Коридоры-рельсы к центру
  paintVCorridor(tiles, 20, 4, 3, "rail");
  paintVCorridor(tiles, 20, 13, 3, "rail");
  paintHCorridor(tiles, 12, 9, 5, "rail");
  paintHCorridor(tiles, 25, 9, 5, "rail");
  return m;
}

function placeByName(npcs, tokens, placements) {
  const byName = Object.fromEntries(npcs.map((n) => [n.name, n]));
  for (const [name, x, y, type = "npc", label = null] of placements) {
    const n = byName[name];
    if (!n) continue;
    tokens.push(
      makeToken({
        name: label ?? n.name,
        type,
        x,
        y,
        hpCurrent: n.hp,
        hpMax: n.hp,
        dexMod: Math.floor(((n.abilities?.dex ?? 10) - 10) / 2),
        npcId: n.id
      })
    );
  }
}

/** Вокзал Метроля под стеклянным куполом: платформа героев + соседний состав из Аргонне. */
function lastCyreMap(npcs) {
  const m = emptyMap("4. Последний Сайр · Метроль", 44, 28);
  const { tiles, overlays, tokens } = m;
  // Серый туман Дня Отделения вокруг живой столицы
  paintRect(tiles, 0, 0, 44, 28, "mist");
  // Зал вокзала под стеклянным куполом
  paintRoom(tiles, 4, 2, 36, 14, { floor: "floor", wall: "brick" });
  paintHCorridor(tiles, 5, 2, 34, "glass");
  paintHCorridor(tiles, 5, 3, 34, "glass");
  // Арки / колонны с фиолетовыми лентами (руны)
  for (const x of [8, 14, 20, 26, 32]) {
    tiles[`${x}:5`] = "column";
    tiles[`${x}:6`] = "rune";
    tiles[`${x}:11`] = "column";
  }
  // Мозаика герба Сайра
  paintRect(tiles, 18, 7, 6, 4, "stone");
  tiles["20:8"] = "crystal";
  tiles["21:8"] = "rune";
  tiles["20:9"] = "rune";
  tiles["21:9"] = "crystal";
  // Табло / карта Хорвайра (Сайр золотом, остальное — серое)
  tiles["34:7"] = "table";
  overlays["34:7"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Карта Хорвайра · 13 схем станции"
  };
  // Скамьи встречающих / беженцы
  for (const x of [7, 11, 15, 25, 29, 33]) tiles[`${x}:13`] = "bench";
  // Перрон героев (вагон №8 / дверь из ресторана)
  paintHCorridor(tiles, 4, 16, 20, "platform");
  paintHCorridor(tiles, 4, 17, 20, "rail");
  paintHCorridor(tiles, 4, 18, 20, "rail");
  paintRect(tiles, 8, 17, 10, 2, "metal");
  tiles["10:17"] = "window";
  tiles["14:17"] = "conductor";
  tiles["12:16"] = "door_open";
  overlays["12:16"] = { type: "stash", visibleToPlayers: true, name: "Дверь в вагон №6 / №8" };
  // Соседняя платформа: состав беженцев из Аргонне
  paintHCorridor(tiles, 24, 16, 18, "platform");
  paintHCorridor(tiles, 24, 17, 18, "rail");
  paintHCorridor(tiles, 24, 18, 18, "rail");
  paintRect(tiles, 26, 17, 6, 2, "metal");
  paintRect(tiles, 33, 17, 6, 2, "metal");
  tiles["32:17"] = "coupler";
  // Серая пыль на крышах / людях с узлами
  for (const x of [27, 29, 34, 36]) {
    tiles[`${x}:16`] = "mist";
    tiles[`${x}:17`] = "rubble";
  }
  tiles["30:16"] = "crate";
  tiles["35:16"] = "cargo";
  overlays["30:16"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Табличка «АРГОННЕ ПАДЁТ · 218 / 41 ребёнок»"
  };
  // Полоса тумана между платформами и за станцией
  paintVCorridor(tiles, 22, 16, 4, "mist");
  for (let x = 1; x < 43; x += 2) tiles[`${x}:26`] = "mist";

  placeByName(npcs, tokens, [
    ["Наэла Таир", 11, 15],
    ["Сестра Наэлы", 13, 14],
    ["Эстель Варрен", 16, 14],
    ["Лира д’Каннит", 28, 12],
    ["Мирра Кел", 9, 15],
    ["Доктор Арден д’Каннит", 10, 14]
  ]);
  return m;
}

/** Салон 1-го класса №5: белая ладонь, двойники, живой Сарик, Касс. */
function noLossMap(npcs) {
  const m = emptyMap("5. Мир без утрат · салон №5", 30, 14);
  const { tiles, overlays, tokens } = m;
  // Зелёные холмы за окнами
  paintRect(tiles, 0, 0, 30, 14, "grass");
  paintRoom(tiles, 1, 1, 28, 12, {
    floor: "floor",
    wall: "metal",
    door: { x: 1, y: 6, textureId: "door_open" }
  });
  tiles["28:6"] = "door";
  paintHCorridor(tiles, 3, 1, 24, "window");
  paintHCorridor(tiles, 3, 12, 24, "window");
  // Центральный проход
  paintHCorridor(tiles, 2, 6, 26, "floor");
  // Столы салона
  for (const [x, y] of [
    [6, 3],
    [6, 9],
    [12, 3],
    [12, 9],
    [18, 3],
    [18, 9]
  ]) {
    tiles[`${x}:${y}`] = "table";
    tiles[`${x + 1}:${y}`] = "chair";
    tiles[`${x - 1}:${y}`] = "chair";
  }
  // Белая ладонь из лиц (символ ветви)
  tiles["15:5"] = "rune";
  tiles["14:6"] = "crystal";
  tiles["15:6"] = "crystal";
  tiles["16:6"] = "crystal";
  tiles["15:7"] = "rune";
  overlays["15:6"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Белая ладонь · символ ветви"
  };
  // Медицинское купе / «вечерний цикл»
  paintRect(tiles, 23, 3, 4, 3, "platform");
  tiles["24:4"] = "bed";
  tiles["25:4"] = "chair";
  overlays["24:4"] = {
    type: "stash",
    visibleToPlayers: false,
    name: "Медицинское купе восстановительного цикла"
  };
  overlays["12:9"] = {
    type: "stash",
    visibleToPlayers: false,
    name: "Билет двойника (имя меняется)"
  };
  placeByName(npcs, tokens, [
    ["Сарик (живой)", 8, 3],
    ["Касс Элан", 18, 8],
    ["Идеальный двойник", 12, 4, "monster"],
    ["Идеальный двойник", 14, 8, "monster", "Идеальный двойник (2)"],
    ["Идеальный двойник", 16, 5, "monster", "Идеальный двойник (3)"],
    ["Наэла Таир", 4, 6],
    ["Мирра Кел", 3, 7],
    ["Доктор Арден д’Каннит", 5, 5]
  ]);
  return m;
}

/** Броневагон №3 ~18×4,5 м: мешки, бойницы, сердцевина, люк. */
function eternalWarMap(npcs) {
  // 1 клетка ≈ 1,5 м → ~12×3 проходимых, с укрытиями шире
  const m = emptyMap("6. Вечная война · броневагон №3", 22, 10);
  const { tiles, overlays, tokens } = m;
  // Горящий фронт за окнами
  paintRect(tiles, 0, 0, 22, 10, "rubble");
  for (let x = 0; x < 22; x += 1) {
    if (x % 2 === 0) tiles[`${x}:0`] = "mist";
    if (x % 3 === 0) tiles[`${x}:9`] = "mist";
  }
  // Корпус вагона
  paintRoom(tiles, 1, 2, 20, 6, {
    floor: "metal",
    wall: "metal",
    door: { x: 1, y: 4, textureId: "door_open" }
  });
  tiles["20:4"] = "door"; // задняя дверь — вход штурма
  // Бойницы вместо окон
  for (const x of [4, 7, 10, 13, 16]) {
    tiles[`${x}:2`] = "window";
    tiles[`${x}:7`] = "window";
  }
  // Пол / проход
  paintRect(tiles, 2, 3, 18, 4, "stone");
  // Мешки с песком и перевёрнутые сиденья (укрытия)
  for (const [x, y] of [
    [4, 3],
    [5, 3],
    [4, 6],
    [5, 6],
    [15, 3],
    [16, 3],
    [15, 6],
    [16, 6]
  ]) {
    tiles[`${x}:${y}`] = "barrel";
  }
  tiles["6:3"] = "crate";
  tiles["14:6"] = "crate";
  tiles["8:6"] = "bench";
  tiles["12:3"] = "bench";
  // Сердцевина снаряда — центр ~3 м (2 клетки)
  paintRect(tiles, 9, 3, 3, 4, "platform");
  tiles["10:4"] = "conductor";
  tiles["10:5"] = "crystal";
  tiles["9:4"] = "rune";
  tiles["11:4"] = "rune";
  overlays["10:4"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Сердцевина туманного снаряда"
  };
  // Аварийный люк на крыше (центр)
  tiles["10:2"] = "stairs";
  overlays["10:2"] = { type: "stash", visibleToPlayers: true, name: "Аварийный люк (крыша)" };
  // Мел: «ДО ФРОНТА — 6 МИНУТ»
  overlays["3:5"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Мел на полу: «ДО ФРОНТА — 6 МИНУТ»"
  };

  placeByName(npcs, tokens, [
    ["Капитан Ириан Восс", 3, 4],
    ["Мейра Коль", 8, 5],
    // Штурм с задней двери (раунд 1)
    ["Фронтовик Последней войны", 18, 3, "monster"],
    ["Фронтовик Последней войны", 18, 5, "monster", "Фронтовик (2)"],
    ["Фронтовик Последней войны", 19, 4, "monster", "Фронтовик (3)"],
    ["Маг-сапёр", 17, 4, "monster"],
    ["Маг-сапёр", 16, 6, "monster", "Маг-сапёр (2)"],
    // Подкрепление с люка (раунд 2)
    ["Фронтовик Последней войны", 10, 3, "monster", "Фронтовик с люка"],
    ["Фронтовик Последней войны", 11, 6, "monster", "Фронтовик с люка (2)"]
  ]);
  return m;
}

/** Долинная станция Саар-Эл: заросшие рельсы, рынок из состава, 3 заряда. */
function liberatedElementalsMap(npcs) {
  const m = emptyMap("7. Освобождённые элементали · Саар-Эл", 36, 22);
  const { tiles, overlays, tokens } = m;
  paintRect(tiles, 0, 0, 36, 22, "grass");
  // Заросшие рельсы
  paintHCorridor(tiles, 2, 10, 32, "rail");
  paintHCorridor(tiles, 2, 11, 32, "rail");
  for (let x = 3; x < 34; x += 3) {
    tiles[`${x}:10`] = "grass";
    tiles[`${x + 1}:11`] = "grass";
  }
  // Состав, превращённый в рынок
  paintRect(tiles, 6, 8, 8, 3, "metal");
  paintRect(tiles, 15, 8, 8, 3, "metal");
  paintRect(tiles, 24, 8, 6, 3, "metal");
  tiles["14:9"] = "coupler";
  tiles["23:9"] = "coupler";
  for (const x of [7, 10, 16, 19, 25]) {
    tiles[`${x}:8`] = "crate";
    tiles[`${x + 1}:10`] = "barrel";
    tiles[`${x}:7`] = "bench";
  }
  tiles["27:9"] = "cargo";
  // Платформа ~15 м (10 клеток) с тремя зарядами
  paintHCorridor(tiles, 10, 13, 14, "platform");
  paintHCorridor(tiles, 10, 14, 14, "stone");
  // Заряд 1 — у входа
  tiles["11:13"] = "rune";
  overlays["11:13"] = { type: "stash", visibleToPlayers: true, name: "Рунический заряд · вход" };
  // Заряд 2 — под знаком станции
  tiles["17:13"] = "rune";
  tiles["17:12"] = "column";
  overlays["17:12"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Обломок знака «ДОГОВОРНАЯ СТАНЦИЯ СААР-ЭЛ»"
  };
  overlays["17:13"] = { type: "stash", visibleToPlayers: true, name: "Рунический заряд · знак" };
  // Заряд 3 — у локомотива
  paintRect(tiles, 28, 7, 5, 5, "metal");
  tiles["30:8"] = "conductor";
  tiles["30:9"] = "crystal";
  tiles["29:13"] = "rune";
  overlays["29:13"] = { type: "stash", visibleToPlayers: true, name: "Рунический заряд · локомотив" };
  overlays["30:8"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Локомотив · связанный / свободный Саар-Эл"
  };
  // Ящики Хальвика: лекарства + детали связывания
  tiles["20:14"] = "crate";
  tiles["21:14"] = "barrel";
  overlays["20:14"] = {
    type: "stash",
    visibleToPlayers: false,
    name: "Ящики: лекарства и детали повторного связывания"
  };

  placeByName(npcs, tokens, [
    ["Саар-Эл", 30, 7, "monster"],
    ["Мирра (другая ветвь)", 16, 14],
    ["Мирра Кел", 12, 14],
    ["Хальвик", 17, 15, "monster"],
    ["Саботажник Хальвика", 11, 15, "monster"],
    ["Саботажник Хальвика", 28, 14, "monster", "Саботажник (2)"],
    ["Саботажник Хальвика", 22, 16, "monster", "Саботажник (3)"]
  ]);
  return m;
}

/** Белый коридор 21 м: 2 перегородки, 3 печати, камеры, Нима. */
function futurePartyMap(npcs) {
  const m = emptyMap("8. Мир будущей группы · коридор", 28, 12);
  const { tiles, overlays, tokens } = m;
  paintRect(tiles, 0, 0, 28, 12, "mist");
  // Длинный белый коридор ~21 м (14 клеток)
  paintRoom(tiles, 1, 3, 22, 6, {
    floor: "floor",
    wall: "metal",
    door: { x: 1, y: 5, textureId: "door_open" }
  });
  paintRect(tiles, 2, 4, 20, 4, "floor");
  // Портреты «Хранители единственной истории»
  for (const x of [4, 7, 10, 13, 16]) {
    tiles[`${x}:3`] = "rune";
    tiles[`${x}:8`] = "crystal";
  }
  overlays["7:3"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Портреты: «Хранители единственной истории»"
  };
  // Три печати: вход / центр / перед камерами
  tiles["3:5"] = "rune";
  tiles["11:5"] = "rune";
  tiles["18:5"] = "rune";
  overlays["3:5"] = { type: "stash", visibleToPlayers: true, name: "Печать 1 · вход" };
  overlays["11:5"] = { type: "stash", visibleToPlayers: true, name: "Печать 2 · центр" };
  overlays["18:5"] = { type: "stash", visibleToPlayers: true, name: "Печать 3 · камеры" };
  // Две прозрачные перегородки
  paintVCorridor(tiles, 8, 4, 4, "glass");
  paintVCorridor(tiles, 15, 4, 4, "glass");
  tiles["8:5"] = "door";
  tiles["15:5"] = "door";
  // Камеры за последней перегородкой
  paintRect(tiles, 19, 4, 3, 4, "platform");
  tiles["20:4"] = "glass";
  tiles["20:7"] = "glass";
  tiles["21:5"] = "bed";
  overlays["21:5"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Камера Нимы / дверь чужой ветви"
  };
  // Потолочная ниша дрона
  tiles["11:3"] = "stairs";
  overlays["11:3"] = { type: "stash", visibleToPlayers: false, name: "Потолочная ниша дрона" };
  overlays["5:6"] = {
    type: "stash",
    visibleToPlayers: false,
    name: "Навигационный ключ / архив Хранителей"
  };

  placeByName(npcs, tokens, [
    ["Альтернативный герой", 6, 5],
    ["Смотритель протокола", 11, 4, "monster"],
    ["Смотритель протокола", 16, 6, "monster", "Смотритель (2)"],
    ["Смотритель протокола", 14, 5, "monster", "Смотритель (3)"],
    ["Дрон-наблюдатель", 12, 6, "monster"],
    ["Дрон-наблюдатель", 9, 4, "monster", "Дрон-наблюдатель (2)"],
    ["Нима Тарр", 20, 6],
    ["Мирра Кел", 2, 5],
    ["Доктор Арден д’Каннит", 3, 6]
  ]);
  return m;
}

/** Хранилище великанов под/вокруг №10: кольцо Якоря, 4 пилона, 13 связей. */
function vaultMap(npcs) {
  const m = emptyMap("9. Хранилище Якоря · великаны", 36, 28);
  const { tiles, overlays, tokens } = m;
  paintRect(tiles, 0, 0, 36, 28, "mist");
  // Чёрный камень хранилища
  paintRoom(tiles, 3, 3, 30, 22, { floor: "stone", wall: "metal" });
  paintRect(tiles, 4, 4, 28, 20, "stone");
  // Лестница «между отражениями» (вход из белого коридора / №10)
  paintVCorridor(tiles, 17, 1, 5, "stairs");
  tiles["17:3"] = "door_open";
  overlays["17:2"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Лестница между отражениями миров"
  };
  // Ступени великанов
  paintRect(tiles, 12, 6, 12, 2, "platform");
  // Центральное кольцо Якоря
  paintRect(tiles, 15, 12, 6, 6, "platform");
  paintBorder(tiles, 15, 12, 6, 6, "metal");
  tiles["17:14"] = "conductor";
  tiles["18:14"] = "crystal";
  tiles["17:15"] = "crystal";
  tiles["18:15"] = "conductor";
  overlays["17:14"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Якорь Тринадцатого Мгновения"
  };
  // Четыре пилона с рунами свидетельств
  const pylons = [
    [10, 10, "Пилон руны · глаз"],
    [24, 10, "Пилон руны · весы"],
    [10, 18, "Пилон руны · ладонь"],
    [24, 18, "Пилон руны · кольцо"]
  ];
  for (const [x, y, name] of pylons) {
    tiles[`${x}:${y}`] = "column";
    tiles[`${x}:${y + 1}`] = "rune";
    overlays[`${x}:${y + 1}`] = { type: "stash", visibleToPlayers: true, name };
  }
  // Тринадцать связей / дуг по периметру
  const arcs = [
    [5, 5],
    [9, 4],
    [13, 4],
    [17, 4],
    [21, 4],
    [25, 4],
    [29, 5],
    [5, 14],
    [29, 14],
    [5, 22],
    [13, 23],
    [21, 23],
    [29, 22]
  ];
  arcs.forEach(([x, y], i) => {
    tiles[`${x}:${y}`] = "door";
    overlays[`${x}:${y}`] = {
      type: "stash",
      visibleToPlayers: true,
      name: `Связь мира ${i + 1}`
    };
  });
  // Обломки: дверь купе, половина крыши, лампа
  tiles["8:8"] = "door";
  tiles["27:8"] = "rubble";
  tiles["8:20"] = "window";
  // Стабилизатор Ардена
  tiles["17:18"] = "table";
  tiles["18:18"] = "crystal";
  overlays["17:18"] = {
    type: "stash",
    visibleToPlayers: true,
    name: "Стабилизатор (Арден удерживает)"
  };

  placeByName(npcs, tokens, [
    ["Доктор Арден д’Каннит", 17, 17],
    ["Мирра Кел", 15, 10],
    ["Элиан Велль", 12, 14],
    ["Лисса Торр", 22, 14],
    ["Альтернативный герой", 19, 12]
  ]);
  return m;
}

function buildNpcs() {
  return [
    makeNpc({
      name: "Доктор Арден д’Каннит",
      hp: 32,
      ac: 12,
      abilities: { str: 8, dex: 10, con: 12, int: 16, wis: 14, cha: 14 },
      notes: "Исследователь Якоря. В бою укрывается, помогает раненым; 1/сцену даёт преимущество на Магию/инструменты.",
      actions: [{ name: "Кинжал", description: "+2 к попаданию, 1к4 колющий." }]
    }),
    makeNpc({
      name: "Мирра Кел",
      hp: 27,
      ac: 13,
      abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 13, cha: 14 },
      notes: "Проводница Дома Ориен. Держит латунную карту состава, открывает служебные двери.",
      actions: [{ name: "Короткий меч", description: "+4 к попаданию, 1к6+2 рубящий." }]
    }),
    makeNpc({
      name: "Наэла Таир",
      hp: 24,
      ac: 12,
      abilities: { str: 10, dex: 12, con: 12, int: 11, wis: 14, cha: 13 },
      notes: "Сайрийская беженка. В бою выводит гражданских, без своей инициативы.",
      actions: [{ name: "Импровизированное оружие", description: "+3 к попаданию, 1к4+1 дробящий." }]
    }),
    makeNpc({
      name: "Тобин Вей",
      hp: 16,
      ac: 11,
      abilities: { str: 8, dex: 12, con: 10, int: 14, wis: 13, cha: 14 },
      notes: "Журналист «Корранбергской хроники». Фиксирует улики у Развилки.",
      actions: [{ name: "Удар блокнотом", description: "+3 к попаданию, 1 дробящий (скорее отвлечение)." }]
    }),
    makeNpc({
      name: "Элиан Велль",
      hp: 52,
      ac: 15,
      abilities: { str: 12, dex: 14, con: 14, int: 12, wis: 12, cha: 14 },
      notes: "Сайрийский радикал, первый саботажник. Хочет вернуть Сайр через Якорь. Опасен для хрупких (Дуулан).",
      actions: [
        { name: "Короткий меч", description: "+6 к попаданию, 1к6+3 рубящий; два удара атакой." },
        { name: "Отчаянный выпад", description: "1/бой: +6, 2к6+3 рубящий, цель сбита с ног при провале КС 13 Силы." }
      ]
    }),
    makeNpc({
      name: "Лисса Торр",
      hp: 44,
      ac: 15,
      abilities: { str: 10, dex: 16, con: 12, int: 14, wis: 12, cha: 13 },
      notes: "Ложная помощница Ардена, второй саботажник Каннит. Целит цели без ауры/щита.",
      actions: [
        {
          name: "Кинжал",
          description: "+7 к попаданию, 1к4+3 колющий; скрытая атака 2к6 1/ход, если есть преимущество или союзник рядом."
        }
      ]
    }),
    makeNpc({
      name: "Сарик (охрана Каннит)",
      type: "humanoid",
      hp: 42,
      ac: 16,
      abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 10 },
      notes: "Охрана багажного вагона №10. Держит перрон вместе с двумя охранниками Каннит.",
      actions: [
        { name: "Длинный меч", description: "+5 к попаданию, 1к8+3 рубящий." },
        { name: "Удар щитом", description: "+5 к попаданию, 1к4+2 дробящий; цель КС 13 Сила или сбита с ног." }
      ]
    }),
    makeNpc({
      name: "Охранник Каннит",
      type: "humanoid",
      hp: 32,
      ac: 15,
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 10 },
      notes: "Рядовой охраны Дома Каннит у багажа №10. Работает в паре с Сариком.",
      actions: [{ name: "Копьё", description: "+5 к попаданию, 1к6+2 колющий; досягаемость 10 фт или метание 20/60." }]
    }),
    makeNpc({
      name: "Идеальный двойник",
      type: "monstrosity",
      hp: 45,
      ac: 15,
      abilities: { str: 12, dex: 15, con: 14, int: 10, wis: 12, cha: 15 },
      notes:
        "Стирает воспоминание при критическом провале спасброска Мудрости КС 14 (учитывайте ауру Каркаса +4). Обычно 3 двойника в салоне.",
      actions: [
        {
          name: "Искажение",
          description: "+6 к попаданию, 2к6+2 психический; при попадании цель КС 14 Мдр или помеха на следующую атаку."
        },
        {
          name: "Лицо знакомого",
          description: "Бонусное действие: копирует внешность союзника цели; проверки Проницательности КС 14 чтобы заметить."
        }
      ]
    }),
    makeNpc({
      name: "Фронтовик Последней войны",
      type: "humanoid",
      hp: 48,
      ac: 16,
      abilities: { str: 15, dex: 12, con: 15, int: 10, wis: 11, cha: 10 },
      notes: "Пехотинец вечной войны. Штурм броневагона: 3 с двери + 2 с люка (р.2). Цель — удержать сердцевину.",
      actions: [
        {
          name: "Алебарда",
          description: "+6 к попаданию, 1к10+3 рубящий, досягаемость 10 фт; две атаки за действие."
        }
      ]
    }),
    makeNpc({
      name: "Маг-сапёр",
      type: "humanoid",
      hp: 34,
      ac: 14,
      abilities: { str: 8, dex: 14, con: 12, int: 15, wis: 12, cha: 10 },
      notes: "Ставит заряд у сердцевины; таймер сцены. Держится за укрытием; приоритет для Катриссы/Геррита.",
      actions: [
        { name: "Огненный снаряд", description: "+6 к попаданию, 3к6 огнём." },
        {
          name: "Заряд сердцевины",
          description: "Действие у кристалла: ускоряет таймер. КС 14 Ловкость у союзников в 3 м при детонации (2к8 огонь)."
        }
      ]
    }),
    makeNpc({
      name: "Смотритель протокола",
      type: "construct",
      hp: 58,
      ac: 16,
      abilities: { str: 16, dex: 12, con: 16, int: 8, wis: 12, cha: 6 },
      notes:
        "Конструкт нулевого протокола. 3 смотрителя в коридоре. Отключение печати снижает число атак с 2 до 1. Иммунитет к яду/болезни; сопротивление психическому.",
      actions: [
        {
          name: "Силовой удар",
          description: "+7 к попаданию, 2к8+3 силовым полем; две атаки. При попадании цель КС 14 Сила или отталкивание на 1,5 м."
        }
      ]
    }),
    makeNpc({
      name: "Дрон-наблюдатель",
      type: "construct",
      hp: 24,
      ac: 15,
      abilities: { str: 6, dex: 16, con: 12, int: 6, wis: 12, cha: 4 },
      notes: "Летающий разведчик протокола. Подсвечивает цели для смотрителей (преимущество 1 атаке).",
      actions: [
        { name: "Разряд", description: "+7 к попаданию, 1к8+3 электричеством." },
        { name: "Маркер цели", description: "Бонусное действие: одна цель получает «метку» до конца следующего хода дрона." }
      ]
    }),
    makeNpc({
      name: "Хальвик",
      type: "humanoid",
      hp: 72,
      ac: 17,
      abilities: { str: 12, dex: 17, con: 14, int: 12, wis: 12, cha: 14 },
      notes:
        "Купец старой дороги. Три заряда + 3 саботажника. Боится соединения двух Саар-Элов. Уклоняется от контроля КС 14 (ловкий).",
      actions: [
        {
          name: "Парные клинки",
          description: "+8 к попаданию, 1к6+4 рубящий, три удара атакой."
        },
        {
          name: "Грязный приём",
          description: "1/ход после попадания: цель КС 14 Ловкость или ослеплена до конца своего следующего хода."
        }
      ]
    }),
    makeNpc({
      name: "Саботажник Хальвика",
      type: "humanoid",
      hp: 30,
      ac: 14,
      abilities: { str: 10, dex: 15, con: 12, int: 11, wis: 10, cha: 10 },
      notes: "Дорожный саботажник у зарядов на станции Саар-Эл. Трое у платформы; при смерти может поджечь заряд (реакция).",
      actions: [
        { name: "Арбалет", description: "+6 к попаданию, 1к8+3 колющий." },
        { name: "Поджиг заряда", description: "Реакция при смерти в 3 м от руны: заряд вспыхивает через 1 раунд (2к6 огонь, КС 13 Ловк.)." }
      ]
    }),
    makeNpc({
      name: "Эстель Варрен",
      hp: 28,
      ac: 12,
      abilities: { str: 10, dex: 10, con: 12, int: 13, wis: 14, cha: 15 },
      notes: "Начальница вокзала Метроля. Просит спасти Аргонне; союзник финала при помощи.",
      actions: [{ name: "Короткий жезл", description: "+2 к попаданию, 1к4 дробящий." }]
    }),
    makeNpc({
      name: "Лира д’Каннит",
      hp: 30,
      ac: 13,
      abilities: { str: 8, dex: 12, con: 12, int: 15, wis: 13, cha: 16 },
      notes: "Министр восстановления Последнего Сайра. Хочет Якорь для управления границами.",
      actions: [{ name: "Жезл Каннит", description: "+4 к попаданию, 1к6+1 силовым." }]
    }),
    makeNpc({
      name: "Сестра Наэлы",
      hp: 20,
      ac: 11,
      abilities: { str: 10, dex: 12, con: 12, int: 11, wis: 13, cha: 12 },
      notes: "Живая сестра Наэлы в Метроле; знает настоящие детские тайны (не двойник).",
      actions: [{ name: "Удар", description: "+2 к попаданию, 1к4 дробящий." }]
    }),
    makeNpc({
      name: "Касс Элан",
      hp: 22,
      ac: 12,
      abilities: { str: 8, dex: 12, con: 12, int: 14, wis: 13, cha: 14 },
      notes: "Дипломатка салона №5. Боится «исправления» памяти о брате.",
      actions: [{ name: "Кинжал", description: "+3 к попаданию, 1к4+1 колющий." }]
    }),
    makeNpc({
      name: "Сарик (живой)",
      type: "humanoid",
      hp: 40,
      ac: 16,
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 11, cha: 12 },
      notes: "Живой Сарик Дорн в Мире без утрат. Версия убийства подстраивается под собеседника. Если бой — дерётся как охрана.",
      actions: [{ name: "Длинный меч", description: "+5 к попаданию, 1к8+3 рубящий." }]
    }),
    makeNpc({
      name: "Капитан Ириан Восс",
      hp: 55,
      ac: 17,
      abilities: { str: 15, dex: 12, con: 14, int: 12, wis: 12, cha: 14 },
      notes: "Капитан броневагона №3. Требует запуск туманного снаряда; удерживает переднюю дверь. Может стать союзником.",
      actions: [
        { name: "Длинный меч", description: "+6 к попаданию, 1к8+3 рубящий; две атаки." },
        { name: "Приказ «К щитам!»", description: "Бонусное действие: союзники в 9 м получают +2 КД до начала его следующего хода." }
      ]
    }),
    makeNpc({
      name: "Мейра Коль",
      hp: 28,
      ac: 12,
      abilities: { str: 8, dex: 13, con: 12, int: 16, wis: 12, cha: 11 },
      notes: "Пленная инженер. Умеет разрядить сердцевину; знает, что цель — гражданская станция.",
      actions: [{ name: "Инструменты", description: "Проверка инструментов/Магии у сердцевины." }]
    }),
    makeNpc({
      name: "Саар-Эл",
      type: "elemental",
      hp: 120,
      ac: 16,
      abilities: { str: 16, dex: 18, con: 16, int: 12, wis: 14, cha: 14 },
      notes:
        "Свободный молниевый элементаль. Два искренних обращения по имени прекращают бой. Баланс под 5 героев (ур.3–6): контроль Катриссы/Каркаса силён — держать дистанцию, бить по хрупким. Сопротивление молнии/грому; уязвимость к дробящему в связанной форме.",
      actions: [
        {
          name: "Молниевая дуга",
          description: "+8 к попаданию, 3к8+4 электричеством; две атаки. Существа в 3 м — КС 15 Ловкость, половина от одной дуги."
        },
        {
          name: "Грозовой импульс",
          description: "1/бой: все в 6 м — КС 15 Ловкость, 4к8 электричеством (половина при успехе); затем Саар-Эл телепортируется на 9 м."
        }
      ]
    }),
    makeNpc({
      name: "Мирра (другая ветвь)",
      hp: 32,
      ac: 13,
      abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 14, cha: 14 },
      notes: "Проводница ветви свободных элементалей. Даёт преимущество на договор с Саар-Элом.",
      actions: [{ name: "Короткий меч", description: "+5 к попаданию, 1к6+2 рубящий." }]
    }),
    makeNpc({
      name: "Альтернативный герой",
      hp: 58,
      ac: 16,
      abilities: { str: 12, dex: 14, con: 14, int: 13, wis: 14, cha: 14 },
      notes: "Версия героя из будущего. Может помочь с печатью/дроном; в финале уносит Якорь. Если враждебен — серьёзный дуэлянт.",
      actions: [
        {
          name: "Оружие Хранителя",
          description: "+7 к попаданию, 1к8+3 рубящий или силовым; две атаки."
        }
      ]
    }),
    makeNpc({
      name: "Нима Тарр",
      hp: 20,
      ac: 11,
      abilities: { str: 8, dex: 12, con: 12, int: 13, wis: 14, cha: 12 },
      notes: "Заключённая из мира Владык Пыли. Знает, что хранилище «под» №10 во всех реальностях.",
      actions: [{ name: "Удар", description: "+2 к попаданию, 1к4 дробящий." }]
    })
  ];
}

export function buildThirteenMinutesAdventure() {
  const npcs = buildNpcs();
  const maps = [
    stationMap(npcs),
    diningCarMap(npcs),
    forkMap(),
    lastCyreMap(npcs),
    noLossMap(npcs),
    eternalWarMap(npcs),
    liberatedElementalsMap(npcs),
    futurePartyMap(npcs),
    vaultMap(npcs)
  ];
  maps[0].published = true;

  return {
    id: "thirteen-minutes",
    title: "Тринадцать минут до конца",
    description:
      "Эберрон · L3 · 5 героев · молниевой поезд, Вторая Скорбь и выбор открытого мира. Карты стандартного маршрута + ключевые НПС.",
    level: 3,
    players: 5,
    duration: "4–6 часов",
    npcs,
    maps,
    notes: [
      "Игрокам открывайте вкладки по ходу сессии кнопкой «Показать игрокам».",
      "Маршрут: вокзал → №6 → Развилка → Сайр → без утрат → война ИЛИ элементали → будущая группа → хранилище.",
      "Карты 4–9 соответствуют боевым/сценическим описаниям вагонов из модуля.",
      "Секреты (тайники) по умолчанию скрыты от игроков."
    ]
  };
}

export const ADVENTURE_BUILDERS = {
  "thirteen-minutes": buildThirteenMinutesAdventure
};

export function listAdventureTemplates() {
  return Object.values(ADVENTURE_BUILDERS).map((build) => {
    const a = build();
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      level: a.level,
      players: a.players,
      duration: a.duration,
      mapCount: a.maps.length,
      npcCount: a.npcs.length
    };
  });
}

export function getAdventureTemplate(id) {
  const build = ADVENTURE_BUILDERS[id];
  if (!build) return null;
  return build();
}
