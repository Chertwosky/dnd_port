/**
 * Возможная добыча по таблицам индивидуальной добычи DMG (диапазоны, не бросок).
 * Плюс типичный лут по типу существа и снаряжение с тела.
 */

function parseCr(cr) {
  if (cr == null || cr === "") return 0;
  const s = String(cr).trim();
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Индивидуальная добыча DMG по КС — что может выпасть */
export function coinLootByCr(cr) {
  const v = parseCr(cr);
  if (v <= 4) {
    return [
      "Монеты (КС 0–4): 5к6 мм, или 4к6 см, или 3к6 эм, или 3к6 зм, или 1к6 пм",
      "Безделушка / карманная кража (по желанию мастера)"
    ];
  }
  if (v <= 10) {
    return [
      "Монеты (КС 5–10): 4к6 ×100 мм + 1к6 ×10 эм, или 6к6 ×10 см + 2к6 ×10 зм, или 1к6 ×100 эм + 1к6 ×10 зм, или 4к6 ×10 зм, или 2к6 ×10 зм + 3к6 пм"
    ];
  }
  if (v <= 16) {
    return [
      "Монеты (КС 11–16): 4к6 ×100 см + 1к6 ×100 зм, или 1к6 ×100 эм + 1к6 ×100 зм, или 2к6 ×100 зм + 1к6 ×10 пм, или 2к6 ×100 зм + 2к6 ×10 пм"
    ];
  }
  return [
    "Монеты (КС 17+): 2к6 ×1000 см + 8к6 ×100 зм, или 1к6 ×1000 эм + 1к6 ×100 зм, или 1к6 ×1000 зм + 2к6 ×100 пм, или 1к6 ×1000 зм + 2к6 ×100 пм"
  ];
}

const TYPE_LOOT = [
  [/дракон|dragon/i, ["чешуя дракона", "самоцвет 1к4×50 зм (редко)", "часть клада по КС"]],
  [/нежить|undead|скелет|зомби|vampire|ghost/i, ["пыльные кости", "потёртый амулет", "1к4 серебряных"]],
  [/зверь|beast|волк|паук|медвед/i, ["шкура / трофей", "клыки или когти"]],
  [/слизь|ooze|mimic|желе/i, ["остатки жертв", "2к10 золотых внутри (редко)", "клейкая слизь"]],
  [/конструкт|construct|golem|armor/i, ["обломки механизма", "редкий металл / руна"]],
  [/элементал|elemental/i, ["осколок стихии", "пыль сущности"]],
  [/исчадие|fiend|демон|дьявол|devil|demon/i, ["серный пепел", "тёмный амулет", "1к6 золотых"]],
  [/фея|fey/i, ["блестящая безделушка", "лепестки / споры"]],
  [/аберрация|aberration/i, ["странная железа", "слизь / глазной трофей"]],
  [/великан|giant/i, ["крупные монеты 2к10 зм", "грубое украшение"]],
  [/гуманоид|humanoid|goblin|orc|bandit|cult|guard|hobgoblin|gnoll|bugbear/i, []]
];

const HUMANOID_EXTRAS = [
  "личный жетон / письмо / карта",
  "рацион на 1 день",
  "фляга"
];

/** Оружие/предметы из названий действий */
const ACTION_GEAR = [
  [/scimitar|скимитар/i, "скимитар"],
  [/shortsword|короткий меч/i, "короткий меч"],
  [/longsword|длинный меч/i, "длинный меч"],
  [/greatsword|двуручный меч/i, "двуручный меч"],
  [/dagger|кинжал/i, "кинжал"],
  [/spear|копь[её]/i, "копьё"],
  [/javelin|метательн/i, "метательное копьё"],
  [/battleaxe|боевой топор|секира/i, "боевой топор"],
  [/greataxe|двуручный топор/i, "двуручный топор"],
  [/warhammer|боевой молот/i, "боевой молот"],
  [/mace|булав/i, "булава"],
  [/club|дубин/i, "дубина"],
  [/morningstar|моргенштерн/i, "моргенштерн"],
  [/pike|пика/i, "пика"],
  [/glaive|глеф/i, "глефа"],
  [/halberd|алебард/i, "алебарда"],
  [/whip|кнут/i, "кнут"],
  [/light crossbow|лёгкий арбалет|легкий арбалет/i, ["лёгкий арбалет", "20 болтов"]],
  [/heavy crossbow|тяжёлый арбалет|тяжелый арбалет/i, ["тяжёлый арбалет", "20 болтов"]],
  [/shortbow|короткий лук/i, ["короткий лук", "20 стрел"]],
  [/longbow|длинный лук/i, ["длинный лук", "20 стрел"]],
  [/handaxe|ручной топор/i, "ручной топор"],
  [/sling|пращ/i, ["праща", "20 пуль"]],
  [/net|сеть/i, "сеть"],
  [/shield|щит/i, "щит"]
];

function uniqCi(items) {
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    if (raw == null) continue;
    const s = String(raw).trim();
    if (!s || s === "—" || s === "-") continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function equipmentFromMonster(monster) {
  const items = [];

  if (monster.acNotes) {
    String(monster.acNotes)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => items.push(s));
  }

  for (const e of monster.equipment || []) {
    if (typeof e === "string") items.push(e);
    else if (e?.name) items.push(e.name);
  }

  for (const action of [...(monster.actions || []), ...(monster.traits || [])]) {
    const name = action?.name || "";
    for (const [re, gear] of ACTION_GEAR) {
      if (re.test(name)) {
        const list = Array.isArray(gear) ? gear : [gear];
        items.push(...list);
      }
    }
  }

  return uniqCi(items);
}

function typeLoot(monster) {
  const blob = `${monster.type || ""} ${monster.name || ""} ${monster.nameEn || ""}`;
  for (const [re, loot] of TYPE_LOOT) {
    if (re.test(blob)) {
      if (loot.length) return loot;
      return HUMANOID_EXTRAS;
    }
  }
  return ["мелочь по усмотрению мастера"];
}

/**
 * Реальная возможная добыча: монеты по КС + трофеи типа + снаряжение с тела.
 */
export function buildLoot(monster) {
  const gear = equipmentFromMonster(monster);
  const loot = [
    ...coinLootByCr(monster.challengeRating),
    ...typeLoot(monster)
  ];

  if (gear.length) {
    loot.push(`Снаряжение с тела: ${gear.join(", ")}`);
  }

  // Не дублировать плейсхолдеры «см. таблицы…»
  return uniqCi(
    loot.filter(
      (line) =>
        !/см\.\s*таблиц/i.test(line) &&
        !/see .*loot/i.test(line) &&
        !/^источник:/i.test(line)
    )
  );
}
