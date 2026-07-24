import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MONSTER_CATALOG } from "./monster-catalog.mjs";
import { buildLoot, equipmentFromMonster } from "./monster-loot.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "monsters-network-cache.json");

const LOCAL_BY_ID = new Map(MONSTER_CATALOG.map((m) => [String(m.sourceId).toLowerCase(), m]));
const LOCAL_BY_NAME = new Map(MONSTER_CATALOG.map((m) => [String(m.name).toLowerCase(), m]));

/** Политика контента: каталоги монстров — Open5e SRD 2024; dnd5eapi только fallback. */
const CONTENT_SOURCE = "open5e-srd-2024";
const CACHE_VERSION = 3;
const DND5E_BASE = "https://www.dnd5eapi.co/api/2014";
const OPEN5E_BASE = "https://api.open5e.com/v1";

const RU = {
  small: "маленький",
  Small: "Маленький",
  medium: "средний",
  Medium: "Средний",
  large: "большой",
  Large: "Большой",
  huge: "огромный",
  Huge: "Огромный",
  tiny: "крошечный",
  Tiny: "Крошечный",
  gargantuan: "громадный",
  Gargantuan: "Громадный",
  humanoid: "гуманоид",
  Humanoid: "гуманоид",
  beast: "зверь",
  Beast: "зверь",
  undead: "нежить",
  Undead: "нежить",
  dragon: "дракон",
  Dragon: "дракон",
  monstrosity: "монстр",
  Monstrosity: "монстр",
  giant: "великан",
  Giant: "великан",
  fiend: "исчадие",
  Fiend: "исчадие",
  celestial: "небожитель",
  Celestial: "небожитель",
  fey: "фея",
  Fey: "фея",
  elemental: "элементаль",
  Elemental: "элементаль",
  construct: "конструкт",
  Construct: "конструкт",
  plant: "растение",
  Plant: "растение",
  ooze: "слизь",
  Ooze: "слизь",
  aberration: "аберрация",
  Aberration: "аберрация",
  "neutral evil": "нейтрально-злой",
  "chaotic evil": "хаотично-злой",
  "lawful evil": "законно-злой",
  "neutral good": "нейтрально-добрый",
  "chaotic good": "хаотично-добрый",
  "lawful good": "законно-добрый",
  "lawful neutral": "законно-нейтральный",
  "chaotic neutral": "хаотично-нейтральный",
  unaligned: "без мировоззрения",
  neutral: "нейтральный",
  Stealth: "Скрытность",
  Perception: "Внимательность",
  Athletics: "Атлетика",
  Deception: "Обман",
  Intimidation: "Запугивание",
  Survival: "Выживание",
  Religion: "Религия",
  Persuasion: "Убеждение",
  Insight: "Проницательность",
  Arcana: "Аркана",
  History: "История",
  Nature: "Природа",
  Medicine: "Медицина",
  Investigation: "Анализ",
  Acrobatics: "Акробатика",
  "Animal Handling": "Уход за животными",
  Performance: "Выступление",
  "Sleight of Hand": "Ловкость рук",
  fire: "огонь",
  Fire: "огонь",
  cold: "холод",
  Cold: "холод",
  poison: "яд",
  Poison: "яд",
  acid: "кислота",
  Acid: "кислота",
  lightning: "электричество",
  Lightning: "электричество",
  thunder: "звук",
  Thunder: "звук",
  necrotic: "некротическая энергия",
  Necrotic: "некротическая энергия",
  radiant: "излучение",
  Radiant: "излучение",
  psychic: "психическая энергия",
  Psychic: "психическая энергия",
  force: "силовое поле",
  Force: "силовое поле",
  bludgeoning: "дробящий",
  piercing: "колющий",
  slashing: "рубящий",
  Common: "Общий",
  Draconic: "Драконий",
  Goblin: "Гоблинский",
  Orc: "Орочий",
  Elvish: "Эльфийский",
  Dwarvish: "Дварфийский",
  Giant: "Великаний",
  Infernal: "Инфернальный",
  Abyssal: "Бездны",
  Celestial: "Небесный",
  Sylvan: "Сильван",
  Undercommon: "Подземный",
  Primordial: "Первичный",
  walk: "ходьба",
  climb: "лазание",
  fly: "полёт",
  swim: "плавание",
  burrow: "рытьё",
  darkvision: "тёмное зрение",
  blindsight: "слепое зрение",
  tremorsense: "чувство вибрации",
  truesight: "истинное зрение",
  "passive Perception": "пассивная Внимательность",
  "passive_perception": "пассивная Внимательность",
  "natural armor": "природный доспех",
  "leather armor": "кожаный доспех",
  "studded leather": "проклёпанный кожаный",
  shield: "щит",
  Shield: "щит",
  "chain mail": "кольчуга",
  "chain shirt": "кольчужная рубаха",
  "hide armor": "шкурный доспех",
  "scale mail": "чешуйчатый доспех",
  "plate armor": "латы",
  "breastplate": "кираса"
};

/** Длинные фразы — сначала более длинные */
const PHRASES = [
  ["Melee Weapon Attack:", "Рукопашная атака оружием:"],
  ["Ranged Weapon Attack:", "Дальнобойная атака оружием:"],
  ["Melee or Ranged Weapon Attack:", "Рукопашная или дальнобойная атака оружием:"],
  ["Melee Spell Attack:", "Рукопашная атака заклинанием:"],
  ["Ranged Spell Attack:", "Дальнобойная атака заклинанием:"],
  ["to hit", "к попаданию"],
  ["one target", "одна цель"],
  ["one creature", "одно существо"],
  ["Hit:", "Попадание:"],
  ["Miss:", "Промах:"],
  ["reach", "досягаемость"],
  ["range", "дистанция"],
  ["ft.", "фт."],
  ["feet", "футов"],
  ["foot", "футовый"],
  ["slashing damage", "рубящего урона"],
  ["piercing damage", "колющего урона"],
  ["bludgeoning damage", "дробящего урона"],
  ["fire damage", "урона огнём"],
  ["cold damage", "урона холодом"],
  ["poison damage", "урона ядом"],
  ["acid damage", "урона кислотой"],
  ["lightning damage", "урона электричеством"],
  ["thunder damage", "звукового урона"],
  ["necrotic damage", "некротического урона"],
  ["radiant damage", "урона излучением"],
  ["psychic damage", "психического урона"],
  ["force damage", "урона силовым полем"],
  ["plus", "плюс"],
  ["or half as much damage on a successful one", "или половину урона при успехе"],
  ["A target takes", "Цель получает"],
  ["Each creature in that area must make a", "Каждое существо в этой области должно совершить"],
  ["Dexterity saving throw", "спасбросок Ловкости"],
  ["Strength saving throw", "спасбросок Силы"],
  ["Constitution saving throw", "спасбросок Телосложения"],
  ["Wisdom saving throw", "спасбросок Мудрости"],
  ["Intelligence saving throw", "спасбросок Интеллекта"],
  ["Charisma saving throw", "спасбросок Харизмы"],
  ["taking", "получая"],
  ["on a failed save", "при провале"],
  ["on a successful one", "при успехе"],
  ["DC", "Сл"],
  ["30-foot cone", "конусом 30 фт."],
  ["15-foot cone", "конусом 15 фт."],
  ["60-foot cone", "конусом 60 фт."],
  ["-foot cone", "-футовый конус"],
  ["The dragon exhales fire in a", "Дракон выдыхает огонь"],
  ["Volcanic Tyrant", "Вулканический тиран"],
  ["The dragon is immune to the effects of poisonous gases caused by volcanic environments", "Дракон иммунен к эффектам ядовитых газов вулканической среды"],
  ["It also ignores difficult terrain caused by lava", "Также игнорирует труднопроходимую местность от лавы"],
  ["cone", "конус"],
  ["Recharge", "Перезарядка"],
  ["bonus action", "бонусное действие"],
  ["Bonus Action", "Бонусное действие"],
  ["as a bonus action", "бонусным действием"],
  ["on each of its turns", "в каждом своём ходу"],
  ["Multiattack", "Мультиатака"],
  ["Bite", "Укус"],
  ["Claw", "Коготь"],
  ["Claws", "Когти"],
  ["Fire Breath", "Огненное дыхание"],
  ["Cold Breath", "Ледяное дыхание"],
  ["Lightning Breath", "Электрическое дыхание"],
  ["Poison Breath", "Ядовитое дыхание"],
  ["Acid Breath", "Кислотное дыхание"],
  ["Tail", "Хвост"],
  ["Wing Attack", "Удар крылом"],
  ["Frightful Presence", "Ужасающее присутствие"],
  ["Legendary Resistance", "Легендарное сопротивление"],
  ["Magic Resistance", "Сопротивление магии"],
  ["Nimble Escape", "Проворное бегство"],
  ["Pack Tactics", "Тактика стаи"],
  ["Keen Hearing and Smell", "Острый слух и обоняние"],
  ["Keen Sight", "Острое зрение"],
  ["Amphibious", "Земноводный"],
  ["Spider Climb", "Паучье лазание"],
  ["Web Sense", "Чувствительность к паутине"],
  ["Web Walker", "Хождение по паутине"],
  ["Shapechanger", "Перевёртыш"],
  ["False Appearance", "Ложная внешность"],
  ["Grappler", "Борец"],
  ["Illumination", "Освещение"],
  ["Innate Spellcasting", "Врождённое колдовство"],
  ["Spellcasting", "Колдовство"],
  ["damage", "урона"],
  ["saving throw", "спасбросок"],
  ["difficult terrain", "труднопроходимая местность"],
  ["poisonous gases", "ядовитые газы"],
  ["volcanic environments", "вулканическая среда"],
  ["ignores difficult terrain caused by lava", "игнорирует труднопроходимую местность от лавы"],
  ["The dragon is immune to the effects of", "Дракон иммунен к эффектам"],
  ["It also ignores", "Также игнорирует"],
  ["caused by", "вызванным"],
  ["natural armor", "природный доспех"],
  ["leather armor", "кожаный доспех"],
  ["any one language (usually Common)", "любой один язык (обычно Общий)"],
  ["any one language", "любой один язык"],
  ["Any Lineage", "любая родословная"],
  ["Opportunist", "Оппортунист"],
  ["The bandit has advantage on opportunity attacks", "Бандит совершает броски атаки с преимуществом при провоцированных атаках"],
  ["advantage on opportunity attacks", "преимущество на провоцированные атаки"],
  ["Scimitar", "Скимитар"],
  ["Light Crossbow", "Лёгкий арбалет"],
  ["Heavy Crossbow", "Тяжёлый арбалет"],
  ["Shortbow", "Короткий лук"],
  ["Longbow", "Длинный лук"],
  ["Shortsword", "Короткий меч"],
  ["Longsword", "Длинный меч"],
  ["See DMG loot tables by CR", "См. таблицы добычи по КС"],
  ["See loot tables by CR", "См. таблицы добычи по КС"]
].sort((a, b) => b[0].length - a[0].length);

const NAME_RU = {
  Goblin: "Гоблин",
  Hobgoblin: "Хобгоблин",
  Orc: "Орк",
  Skeleton: "Скелет",
  Zombie: "Зомби",
  Wolf: "Волк",
  "Dire Wolf": "Лютый волк",
  Bandit: "Бандит",
  "Bandit Captain": "Капитан бандитов",
  Guard: "Стражник",
  Ogre: "Огр",
  Bugbear: "Багбир",
  Gnoll: "Гнолл",
  Owlbear: "Совомедведь",
  "Giant Spider": "Гигантский паук",
  Cultist: "Культист",
  "Cult Fanatic": "Фанатик культа",
  Mimic: "Мимик",
  "Adult Red Dragon": "Взрослый красный дракон",
  "Young Red Dragon": "Молодой красный дракон",
  "Red Dragon Wyrmling": "Красный дракончик",
  Aboleth: "Аболет",
  "Ancient Black Dragon": "Древний чёрный дракон",
  Beholder: "Созерцатель",
  "Hill Giant": "Холмовой великан",
  Troll: "Тролль",
  Vampire: "Вампир",
  Werewolf: "Оборотень",
  "Gelatinous Cube": "Желатиновый куб",
  "Animated Armor": "Оживлённый доспех",
  "Flying Sword": "Летающий меч",
  "Rug of Smothering": "Ковёр удушения"
};

function tr(text) {
  if (text == null) return "";
  const s = String(text).trim();
  if (!s) return "";
  if (RU[s]) return RU[s];
  const lower = s.toLowerCase();
  for (const [k, v] of Object.entries(RU)) {
    if (k.toLowerCase() === lower) return v;
  }
  return s;
}

function trName(name) {
  return NAME_RU[name] || name;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateText(input) {
  if (input == null) return "";
  let text = String(input);
  if (!text) return "";

  for (const [en, ru] of PHRASES) {
    const re = new RegExp(escapeRegExp(en), "gi");
    text = text.replace(re, ru);
  }

  // Known vocabulary (sizes, damage types, languages, speed keys, armor…)
  const vocab = Object.entries(RU).sort((a, b) => b[0].length - a[0].length);
  for (const [en, ru] of vocab) {
    if (!en || en.length < 2) continue;
    const re = new RegExp(`\\b${escapeRegExp(en)}\\b`, "gi");
    text = text.replace(re, ru);
  }

  // units / leftovers
  text = text
    .replace(/\bft\.?\b/gi, "фт.")
    .replace(/\bDC\b/g, "Сл")
    .replace(/\bHP\b/g, "ХП")
    .replace(/\bAC\b/g, "КД")
    .replace(/\bXP\b/g, "опыта")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+,/g, ",")
    .replace(/ +/g, " ")
    .trim();

  return text;
}

function translateList(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return translateText(tr(item));
    if (item && typeof item === "object") {
      return {
        ...item,
        name: translateText(item.name ?? ""),
        description: translateText(item.description ?? item.desc ?? ""),
        bonus: item.bonus
      };
    }
    return item;
  });
}

function findLocalMonster(monster) {
  const id = String(monster.sourceId || "")
    .toLowerCase()
    .split("+")[0]
    .trim();
  const enSlug = String(monster.nameEn || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const byId = LOCAL_BY_ID.get(id) || LOCAL_BY_ID.get(enSlug);
  if (byId) return byId;
  const ruName = trName(monster.nameEn || monster.name);
  return LOCAL_BY_NAME.get(String(ruName).toLowerCase()) || LOCAL_BY_NAME.get(String(monster.name || "").toLowerCase()) || null;
}

function localizeMonster(monster) {
  const local = findLocalMonster(monster);
  const name = trName(monster.nameEn || monster.name);
  const acNotes = translateText(monster.acNotes || local?.acNotes || "");
  const translated = {
    ...monster,
    name,
    size: tr(monster.size) || monster.size,
    type: translateText(monster.type),
    alignment: tr(String(monster.alignment || "").toLowerCase()) || translateText(monster.alignment),
    ac: monster.ac ?? local?.ac,
    acNotes,
    speed: translateText(monster.speed),
    skills: translateList(monster.skills),
    senses: translateList(monster.senses).filter((s) => s && s !== "-" && s !== "—"),
    languages: translateList(monster.languages),
    immunities: translateList(monster.immunities),
    vulnerabilities: translateList(monster.vulnerabilities),
    resistances: translateList(monster.resistances),
    conditionImmunities: translateList(monster.conditionImmunities),
    traits: translateList(monster.traits),
    actions: translateList(monster.actions),
    legendaryActions: translateList(monster.legendaryActions),
    description: translateText(monster.description)
  };

  const equipment = equipmentFromMonster({
    ...translated,
    equipment: [...(monster.equipment || []), ...(local?.equipment || [])].map((e) =>
      typeof e === "string" ? translateText(e) : e
    )
  });

  const curatedLoot = Array.isArray(local?.loot) && local.loot.length > 0 ? local.loot : null;
  const loot = curatedLoot
    ? [
        ...curatedLoot,
        equipment.length ? `Снаряжение с тела: ${equipment.join(", ")}` : null
      ].filter(Boolean)
    : buildLoot({ ...translated, equipment });

  return {
    ...translated,
    equipment,
    loot,
    // Для UI: полная подпись класса брони
    armorClassLabel: acNotes
      ? `Класс брони ${translated.ac} (${acNotes})`
      : `Класс брони ${translated.ac}`
  };
}

function formatCr(cr) {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

function formatSpeed(speed) {
  if (!speed) return "—";
  if (typeof speed === "string") return translateText(speed);
  if (typeof speed !== "object") return "—";
  return Object.entries(speed)
    .filter(([k]) => k !== "hover" && k !== "unit")
    .map(([k, v]) => {
      const label = tr(k) !== k ? tr(k) : translateText(k);
      const dist = typeof v === "number" ? `${v} фт.` : translateText(String(v));
      return `${label} ${dist}`;
    })
    .join(", ");
}

function mapFromDnd5e(raw) {
  const acValue = Array.isArray(raw.armor_class)
    ? raw.armor_class[0]?.value ?? 10
    : Number(raw.armor_class ?? 10);
  const acNotes = Array.isArray(raw.armor_class)
    ? raw.armor_class
        .map((a) => {
          const fromArmor = (a.armor ?? []).map((x) => x.name).filter(Boolean);
          if (fromArmor.length) return fromArmor.join(", ");
          if (a.type === "natural") return "natural armor";
          if (a.type === "armor" && a.desc) return a.desc;
          if (a.desc) return a.desc;
          return "";
        })
        .filter(Boolean)
        .join(", ")
    : "";

  const skills = (raw.proficiencies ?? [])
    .filter((p) => String(p.proficiency?.name ?? "").startsWith("Skill:"))
    .map((p) => {
      const en = String(p.proficiency.name).replace(/^Skill:\s*/, "");
      return { name: tr(en), bonus: `+${p.value}` };
    });

  const senses = Object.entries(raw.senses ?? {}).map(([k, v]) => `${tr(k)} ${v}`);

  const equipment = Array.isArray(raw.armor_class)
    ? raw.armor_class.flatMap((a) => (a.armor ?? []).map((x) => x.name))
    : [];

  return {
    sourceId: raw.index || raw.slug,
    sourceSite: "dnd5eapi.co",
    locale: "ru",
    name: trName(raw.name),
    nameEn: raw.name,
    type: [tr(raw.type), raw.subtype ? `(${raw.subtype})` : ""].filter(Boolean).join(" "),
    size: tr(raw.size),
    alignment: tr(raw.alignment),
    challengeRating: formatCr(raw.challenge_rating ?? raw.cr),
    xp: raw.xp ?? null,
    abilities: {
      str: raw.strength,
      dex: raw.dexterity,
      con: raw.constitution,
      int: raw.intelligence,
      wis: raw.wisdom,
      cha: raw.charisma
    },
    hp: raw.hit_points,
    hpFormula: raw.hit_dice || raw.hit_points_roll || "",
    ac: acValue,
    acNotes: acNotes || raw.armor_desc || "",
    speed: formatSpeed(raw.speed),
    skills,
    senses,
    languages: raw.languages ? String(raw.languages).split(",").map((s) => s.trim()) : [],
    immunities: raw.damage_immunities ?? [],
    vulnerabilities: raw.damage_vulnerabilities ?? [],
    resistances: raw.damage_resistances ?? [],
    conditionImmunities: (raw.condition_immunities ?? []).map((c) => c.name || c),
    traits: (raw.special_abilities ?? []).map((t) => ({
      name: t.name,
      description: t.desc
    })),
    actions: (raw.actions ?? []).map((a) => ({
      name: a.name,
      description: a.desc
    })),
    legendaryActions: (raw.legendary_actions ?? []).map((a) => ({
      name: a.name,
      description: a.desc
    })),
    equipment,
    loot: [],
    description: raw.desc || "",
    image: raw.image ? `https://www.dnd5eapi.co${raw.image}` : null,
    translatedFrom: "en"
  };
}

function mapFromOpen5e(raw) {
  const skills = Object.entries(raw.skills ?? {}).map(([name, value]) => ({
    name: tr(name.charAt(0).toUpperCase() + name.slice(1)),
    bonus: `+${value}`
  }));

  return {
    sourceId: raw.slug,
    sourceSite: "api.open5e.com",
    locale: "ru",
    name: trName(raw.name),
    nameEn: raw.name,
    type: [tr(raw.type), raw.subtype ? `(${raw.subtype})` : ""].filter(Boolean).join(" "),
    size: tr(raw.size),
    alignment: tr(raw.alignment),
    challengeRating: String(raw.challenge_rating ?? raw.cr ?? ""),
    xp: null,
    abilities: {
      str: raw.strength,
      dex: raw.dexterity,
      con: raw.constitution,
      int: raw.intelligence,
      wis: raw.wisdom,
      cha: raw.charisma
    },
    hp: raw.hit_points,
    hpFormula: raw.hit_dice || "",
    ac: raw.armor_class,
    acNotes: raw.armor_desc || "",
    speed: formatSpeed(raw.speed),
    skills,
    senses: raw.senses ? [String(raw.senses)] : [],
    languages: raw.languages ? String(raw.languages).split(",").map((s) => s.trim()) : [],
    immunities: raw.damage_immunities ? String(raw.damage_immunities).split(",").map((s) => s.trim()).filter(Boolean) : [],
    vulnerabilities: raw.damage_vulnerabilities
      ? String(raw.damage_vulnerabilities)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    resistances: raw.damage_resistances
      ? String(raw.damage_resistances)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    conditionImmunities: raw.condition_immunities
      ? String(raw.condition_immunities)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    traits: (raw.special_abilities ?? []).map((t) => ({ name: t.name, description: t.desc })),
    actions: (raw.actions ?? []).map((a) => ({ name: a.name, description: a.desc })),
    legendaryActions: (raw.legendary_actions ?? []).map((a) => ({ name: a.name, description: a.desc })),
    equipment: raw.armor_desc ? String(raw.armor_desc).split(",").map((s) => s.trim()) : [],
    loot: [],
    documentTitle: raw.document__title || null,
    description: raw.desc || "",
    image: raw.img_main || null,
    translatedFrom: "en"
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "dnd-mobile-desktop/0.1" }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function mapPool(items, concurrency, mapper, onItemDone) {
  const results = [];
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await mapper(items[idx], idx);
      done += 1;
      if (onItemDone) onItemDone(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

function mapFromOpen5eV2(raw) {
  const abilities = raw.ability_scores || {};
  const typeName = typeof raw.type === "object" ? raw.type?.name : raw.type;
  const sizeName = typeof raw.size === "object" ? raw.size?.name : raw.size;
  const skills = Object.entries(raw.skill_bonuses || raw.skill_bonuses_all || {}).map(([name, value]) => ({
    name: tr(String(name).charAt(0).toUpperCase() + String(name).slice(1)),
    bonus: typeof value === "number" ? `+${value}` : String(value)
  }));
  const rai = raw.resistances_and_immunities || {};
  return {
    sourceId: String(raw.key || "").replace(/^srd-\d+_/, ""),
    sourceSite: "api.open5e.com",
    locale: "ru",
    name: trName(raw.name),
    nameEn: raw.name,
    type: tr(typeName || ""),
    size: tr(sizeName || ""),
    alignment: tr(raw.alignment || ""),
    challengeRating: String(raw.challenge_rating ?? ""),
    xp: raw.experience_points ?? null,
    abilities: {
      str: abilities.strength,
      dex: abilities.dexterity,
      con: abilities.constitution,
      int: abilities.intelligence,
      wis: abilities.wisdom,
      cha: abilities.charisma
    },
    hp: raw.hit_points,
    hpFormula: raw.hit_dice || "",
    ac: raw.armor_class,
    acNotes: raw.armor_detail || "",
    speed: formatSpeed(raw.speed_all || raw.speed || {}),
    skills,
    senses: [],
    languages: raw.languages?.as_string
      ? String(raw.languages.as_string).split(";").map((s) => s.trim())
      : [],
    immunities: [].concat(rai.damage_immunities || [], rai.condition_immunities || []).map(String),
    vulnerabilities: (rai.damage_vulnerabilities || []).map(String),
    resistances: (rai.damage_resistances || []).map(String),
    conditionImmunities: (rai.condition_immunities || []).map(String),
    traits: (raw.traits || []).map((t) => ({
      name: t.name,
      description: t.desc || t.description || ""
    })),
    actions: (raw.actions || []).map((a) => ({
      name: a.name,
      description: a.desc || a.description || ""
    })),
    legendaryActions: [],
    equipment: raw.armor_detail ? [String(raw.armor_detail)] : [],
    loot: [],
    documentTitle: raw.document?.name || "SRD 2024",
    description: "",
    image: raw.illustration || null,
    translatedFrom: "en"
  };
}

async function fetchAllOpen5eMonsters(onProgress) {
  const monsters = [];
  let url = `https://api.open5e.com/v2/creatures/?document__key__iexact=srd-2024&limit=100`;
  while (url) {
    const page = await fetchJson(url);
    monsters.push(...(page.results ?? []));
    const totalHint = page.count || Math.max(monsters.length, 1);
    if (onProgress) {
      onProgress({
        phase: "open5e",
        current: monsters.length,
        total: totalHint,
        message: `Open5e SRD 2024: ${monsters.length} / ~${totalHint}`
      });
    }
    url = page.next || null;
  }
  return monsters.map(mapFromOpen5eV2);
}

async function fetchAllDnd5eMonsters(onProgress) {
  const index = await fetchJson(`${DND5E_BASE}/monsters`);
  const refs = index.results ?? [];
  if (onProgress) {
    onProgress({
      phase: "dnd5e",
      current: 0,
      total: refs.length,
      message: `dnd5eapi: карточки 0/${refs.length}`
    });
  }
  const detailed = await mapPool(
    refs,
    8,
    async (ref) => {
      const raw = await fetchJson(`https://www.dnd5eapi.co${ref.url}`);
      return mapFromDnd5e(raw);
    },
    (done, total) => {
      if (onProgress) {
        onProgress({
          phase: "dnd5e",
          current: done,
          total,
          message: `dnd5eapi: карточки ${done}/${total}`
        });
      }
    }
  );
  return detailed.filter(Boolean);
}

export async function loadMonstersFromNetwork({ forceRefresh = false, onProgress } = {}) {
  const report = (percent, message, extra = {}) => {
    if (onProgress) onProgress({ percent: Math.max(0, Math.min(100, Math.round(percent))), message, ...extra });
  };

  report(2, "Проверка кэша…");
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"));
      if (Array.isArray(cached.monsters) && cached.monsters.length > 50 && cached.version === CACHE_VERSION) {
        const monsters = cached.monsters.map(localizeMonster);
        report(100, `Из кэша: ${monsters.length} мобов`);
        return {
          monsters,
          fromCache: true,
          sources: cached.sources ?? [],
          fetchedAt: cached.fetchedAt
        };
      }
    } catch {
      /* no cache */
    }
  }

  const errors = [];
  let open5e = [];
  let dnd5e = [];

  report(5, "Загрузка Open5e (основной каталог)…");
  try {
    open5e = await fetchAllOpen5eMonsters((p) => {
      const ratio = p.total ? Math.min(1, p.current / Math.max(p.total, 1)) : 0;
      report(5 + ratio * 70, p.message);
    });
  } catch (error) {
    errors.push(`open5e.com: ${error.message}`);
  }

  if (!open5e.length) {
    report(75, "Open5e пуст/ошибка — запасной dnd5eapi.co…");
    try {
      dnd5e = await fetchAllDnd5eMonsters((p) => {
        const ratio = p.total ? p.current / p.total : 0;
        report(75 + ratio * 12, p.message);
      });
    } catch (error) {
      errors.push(`dnd5eapi.co: ${error.message}`);
    }
  }

  report(88, "Нормализация и перевод…");
  const byEnName = new Map();
  for (const m of open5e.length ? open5e : dnd5e) {
    const n = (m.nameEn || m.name).toLowerCase();
    if (!byEnName.has(n)) byEnName.set(n, m);
  }

  const monsters = [...byEnName.values()]
    .map(localizeMonster)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
  if (monsters.length === 0) {
    throw new Error(`Не удалось загрузить мобов из сети. ${errors.join("; ")}`);
  }

  report(95, "Сохранение кэша…");
  const sources = [...new Set(monsters.map((m) => m.sourceSite).filter(Boolean))];
  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources,
    monsters,
    errors
  };

  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");

  report(100, `Готово: ${monsters.length} мобов`);
  return {
    monsters,
    fromCache: false,
    sources,
    fetchedAt: payload.fetchedAt,
    errors
  };
}
