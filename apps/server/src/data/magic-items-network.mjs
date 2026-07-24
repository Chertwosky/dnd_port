import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "magic-items-network-cache.json");
/** Политика контента: магические предметы из Open5e. */
export const CONTENT_SOURCE = "open5e-srd-2024";
const OPEN5E_V2 = "https://api.open5e.com/v2";
const DOCUMENT = "srd-2024";
const CACHE_VERSION = 2;

/** 5 уровней редкости как на dnd.su */
export const RARITIES = [
  { id: "common", label: "Обычный", en: ["common"] },
  { id: "uncommon", label: "Необычный", en: ["uncommon"] },
  { id: "rare", label: "Редкий", en: ["rare"] },
  { id: "very_rare", label: "Очень редкий", en: ["very rare", "very_rare", "veryrare"] },
  { id: "legendary", label: "Легендарный", en: ["legendary", "artifact"] }
];

const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

const TYPE_RU = {
  Weapon: "Оружие",
  Armor: "Доспех",
  Shield: "Щит",
  Potion: "Зелье",
  Ring: "Кольцо",
  Rod: "Жезл",
  Staff: "Посох",
  Wand: "Палочка",
  Scroll: "Свиток",
  Wondrous: "Чудесный предмет",
  "Wondrous item": "Чудесный предмет",
  wondrous: "Чудесный предмет"
};

/** Частые названия предметов / шаблоны имени */
const NAME_MAP = {
  "Cloak of the Eel": "Плащ угря",
  "Cloak of Elvenkind": "Плащ эльфов",
  "Cloak of Protection": "Плащ защиты",
  "Cloak of the Manta Ray": "Плащ манты",
  "Cloak of Displacement": "Плащ смещения",
  "Cloak of Invisibility": "Плащ невидимости",
  "Ring of Protection": "Кольцо защиты",
  "Ring of Invisibility": "Кольцо невидимости",
  "Ring of Swimming": "Кольцо плавания",
  "Ring of Jumping": "Кольцо прыжков",
  "Ring of Free Action": "Кольцо свободы действий",
  "Ring of Feather Falling": "Кольцо замедленного падения",
  "Bag of Holding": "Сумка хранения",
  "Potion of Healing": "Зелье лечения",
  "Potion of Greater Healing": "Зелье усиленного лечения",
  "Potion of Superior Healing": "Зелье превосходного лечения",
  "Potion of Supreme Healing": "Зелье высшего лечения",
  "Potion of Invisibility": "Зелье невидимости",
  "Potion of Flying": "Зелье полёта",
  "Potion of Climbing": "Зелье лазания",
  "Potion of Speed": "Зелье скорости",
  "Potion of Longevity": "Зелье долголетия",
  "Boots of Elvenkind": "Сапоги эльфов",
  "Boots of Speed": "Сапоги скорости",
  "Boots of Striding and Springing": "Сапоги шага и прыжка",
  "Boots of the Winterlands": "Сапоги зимних земель",
  "Gloves of Missile Snaring": "Перчатки ловли снарядов",
  "Gauntlets of Ogre Power": "Рукавицы силы огра",
  "Belt of Giant Strength": "Пояс силы великана",
  "Bracers of Defense": "Наручи защиты",
  "Amulet of Health": "Амулет здоровья",
  "Amulet of Proof against Detection and Location": "Амулет против обнаружения и локации",
  "Necklace of Adaptation": "Ожерелье адаптации",
  "Necklace of Fireballs": "Ожерелье огненных шаров",
  "Periapt of Wound Closure": "Амулет закрытия ран",
  "Periapt of Health": "Амулет здоровья",
  "Winged Boots": "Крылатые сапоги",
  "Winged Shield": "Крылатый щит",
  "Shield of Missile Attraction": "Щит притяжения снарядов",
  "Sentinel Shield": "Щит часового",
  "Arrow-Catching Shield": "Щит ловли стрел",
  "Spellguard Shield": "Щит охраны заклинаний",
  "Adamantine Armor": "Адамантиновый доспех",
  "Mithral Armor": "Мифриловый доспех",
  "Armor of Resistance": "Доспех сопротивления",
  "Armor of Invulnerability": "Доспех неуязвимости",
  "Flame Tongue": "Язык пламени",
  "Frost Brand": "Морозный клинок",
  "Vorpal Sword": "Ворпальный меч",
  "Holy Avenger": "Святой мститель",
  "Luck Blade": "Клинок удачи",
  "Sun Blade": "Солнечный клинок",
  "Dagger of Venom": "Кинжал яда",
  "Sword of Wounding": "Меч ранения",
  "Sword of Life Stealing": "Меч похищения жизни",
  "Mace of Disruption": "Булава разрушения",
  "Mace of Smiting": "Булава сокрушения",
  "Mace of Terror": "Булава ужаса",
  "Wand of Magic Missiles": "Палочка волшебных стрел",
  "Wand of Fireballs": "Палочка огненных шаров",
  "Wand of Lightning Bolts": "Палочка молний",
  "Wand of the War Mage": "Палочка боевого мага",
  "Staff of the Magi": "Посох мага",
  "Staff of Power": "Посох силы",
  "Staff of Healing": "Посох лечения",
  "Staff of Striking": "Посох ударов",
  "Staff of Fire": "Посох огня",
  "Staff of Frost": "Посох мороза",
  "Immovable Rod": "Неподвижный жезл",
  "Rod of Lordly Might": "Жезл властителя",
  "Rod of Absorption": "Жезл поглощения",
  "Decanter of Endless Water": "Графин бесконечной воды",
  "Instant Fortress": "Мгновенная крепость",
  "Portable Hole": "Переносная дыра",
  "Handy Haversack": "Удобный рюкзак",
  "Heward's Handy Haversack": "Удобный рюкзак Хьюарда",
  "Rope of Climbing": "Верёвка лазания",
  "Rope of Entanglement": "Верёвка опутывания",
  "Carpet of Flying": "Ковёр-самолёт",
  "Broom of Flying": "Метла полёта",
  "Crystal Ball": "Хрустальный шар",
  "Cube of Force": "Куб силы",
  "Deck of Many Things": "Колода многих вещей",
  "Sphere of Annihilation": "Сфера уничтожения",
  "Talisman of Pure Good": "Талисман чистого добра",
  "Talisman of Ultimate Evil": "Талисман абсолютного зла",
  "Ioun Stone": "Камень Иоун",
  "Pearl of Power": "Жемчужина силы",
  "Stone of Good Luck": "Камень удачи",
  "Luckstone": "Камень удачи",
  "Goggles of Night": "Очки ночи",
  "Eyes of the Eagle": "Глаза орла",
  "Hat of Disguise": "Шляпа маскировки",
  "Helm of Comprehending Languages": "Шлем понимания языков",
  "Helm of Telepathy": "Шлем телепатии",
  "Horn of Blasting": "Рог взрыва",
  "Horn of Valhalla": "Рог Вальхаллы",
  "Instrument of the Bards": "Инструмент бардов",
  "Javelin of Lightning": "Метательное копьё молнии",
  "Dwarven Thrower": "Дварфийский метатель",
  "Giant Slayer": "Убийца великанов",
  "Dragon Slayer": "Убийца драконов",
  "Nine Lives Stealer": "Похититель девяти жизней",
  "Defender": "Защитник",
  "Oathbow": "Клятвенный лук",
  "Scimitar of Speed": "Скимитар скорости",
  "Trident of Fish Command": "Трезубец повеления рыбами",
  "Chain Cilice": "Цепная власяница",
  "Cloak of the Bat": "Плащ летучей мыши"
};

const NAME_PARTS = [
  [/^Potion of (.+)$/i, (_, x) => `Зелье ${trNamePart(x)}`],
  [/^Oil of (.+)$/i, (_, x) => `Масло ${trNamePart(x)}`],
  [/^Scroll of (.+)$/i, (_, x) => `Свиток: ${trNamePart(x)}`],
  [/^Cloak of (.+)$/i, (_, x) => `Плащ ${trNamePart(x)}`],
  [/^Ring of (.+)$/i, (_, x) => `Кольцо ${trNamePart(x)}`],
  [/^Boots of (.+)$/i, (_, x) => `Сапоги ${trNamePart(x)}`],
  [/^Gloves of (.+)$/i, (_, x) => `Перчатки ${trNamePart(x)}`],
  [/^Gauntlets of (.+)$/i, (_, x) => `Рукавицы ${trNamePart(x)}`],
  [/^Amulet of (.+)$/i, (_, x) => `Амулет ${trNamePart(x)}`],
  [/^Necklace of (.+)$/i, (_, x) => `Ожерелье ${trNamePart(x)}`],
  [/^Belt of (.+)$/i, (_, x) => `Пояс ${trNamePart(x)}`],
  [/^Bracers of (.+)$/i, (_, x) => `Наручи ${trNamePart(x)}`],
  [/^Wand of (.+)$/i, (_, x) => `Палочка ${trNamePart(x)}`],
  [/^Staff of (.+)$/i, (_, x) => `Посох ${trNamePart(x)}`],
  [/^Rod of (.+)$/i, (_, x) => `Жезл ${trNamePart(x)}`],
  [/^Helm of (.+)$/i, (_, x) => `Шлем ${trNamePart(x)}`],
  [/^Hat of (.+)$/i, (_, x) => `Шляпа ${trNamePart(x)}`],
  [/^Bag of (.+)$/i, (_, x) => `Сумка ${trNamePart(x)}`],
  [/^Armor of (.+)$/i, (_, x) => `Доспех ${trNamePart(x)}`],
  [/^Shield of (.+)$/i, (_, x) => `Щит ${trNamePart(x)}`],
  [/^Sword of (.+)$/i, (_, x) => `Меч ${trNamePart(x)}`],
  [/^Dagger of (.+)$/i, (_, x) => `Кинжал ${trNamePart(x)}`],
  [/^Mace of (.+)$/i, (_, x) => `Булава ${trNamePart(x)}`],
  [/^Axe of (.+)$/i, (_, x) => `Топор ${trNamePart(x)}`],
  [/^Bow of (.+)$/i, (_, x) => `Лук ${trNamePart(x)}`],
  [/^Arrow of (.+)$/i, (_, x) => `Стрела ${trNamePart(x)}`],
  [/^Bolt of (.+)$/i, (_, x) => `Болт ${trNamePart(x)}`],
  [/^Horn of (.+)$/i, (_, x) => `Рог ${trNamePart(x)}`],
  [/^Stone of (.+)$/i, (_, x) => `Камень ${trNamePart(x)}`],
  [/^Pearl of (.+)$/i, (_, x) => `Жемчужина ${trNamePart(x)}`],
  [/^Periapt of (.+)$/i, (_, x) => `Амулет ${trNamePart(x)}`],
  [/^Talisman of (.+)$/i, (_, x) => `Талисман ${trNamePart(x)}`],
  [/^Figurine of Wondrous Power.+$/i, () => "Статуэтка чудесной силы"],
  [/^Ioun Stone.+$/i, (full) => NAME_MAP[full] || `Камень Иоун (${full.replace(/^Ioun Stone[,:\s]*/i, "")})`]
];

const WORD_RU = {
  Healing: "лечения",
  "Greater Healing": "усиленного лечения",
  "Superior Healing": "превосходного лечения",
  "Supreme Healing": "высшего лечения",
  Invisibility: "невидимости",
  Flying: "полёта",
  Climbing: "лазания",
  Speed: "скорости",
  Protection: "защиты",
  Resistance: "сопротивления",
  Fire: "огня",
  Frost: "мороза",
  Cold: "холода",
  Lightning: "молнии",
  Thunder: "грома",
  Acid: "кислоты",
  Poison: "яда",
  Force: "силы",
  Psychic: "псионики",
  Necrotic: "некротики",
  Radiant: "излучения",
  Elvenkind: "эльфов",
  Holding: "хранения",
  Power: "силы",
  Strength: "силы",
  Health: "здоровья",
  Defense: "защиты",
  Defence: "защиты",
  Wounding: "ранения",
  Venom: "яда",
  Terror: "ужаса",
  Disruption: "разрушения",
  Smiting: "сокрушения",
  Sharpness: "остроты",
  Life: "жизни",
  "Life Stealing": "похищения жизни",
  "Missile Snaring": "ловли снарядов",
  "Ogre Power": "силы огра",
  "Giant Strength": "силы великана",
  "Feather Falling": "замедленного падения",
  "Free Action": "свободы действий",
  Jumping: "прыжков",
  Swimming: "плавания",
  Adaptation: "адаптации",
  Fireballs: "огненных шаров",
  "Magic Missiles": "волшебных стрел",
  "Lightning Bolts": "молний",
  "the War Mage": "боевого мага",
  "the Magi": "мага",
  "Wound Closure": "закрытия ран",
  Displacement: "смещения",
  "the Manta Ray": "манты",
  "the Eel": "угря",
  "the Bat": "летучей мыши",
  "Striding and Springing": "шага и прыжка",
  "the Winterlands": "зимних земель",
  Invulnerability: "неуязвимости",
  Absorption: "поглощения",
  "Lordly Might": "властителя",
  "Endless Water": "бесконечной воды",
  Climbing: "лазания",
  Entanglement: "опутывания",
  Blasting: "взрыва",
  Valhalla: "Вальхаллы",
  "Comprehending Languages": "понимания языков",
  Telepathy: "телепатии",
  Disguise: "маскировки",
  "Good Luck": "удачи",
  "Pure Good": "чистого добра",
  "Ultimate Evil": "абсолютного зла",
  "Fish Command": "повеления рыбами",
  "Many Things": "многих вещей",
  Annihilation: "уничтожения"
};

const PHRASES = [
  ["While wearing this", "Пока вы носите этот"],
  ["While you wear this", "Пока вы носите этот"],
  ["While holding this", "Пока вы держите этот"],
  ["While attuned to this", "Пока вы настроены на этот"],
  ["Requires attunement", "Требует настройки"],
  ["requires attunement by a", "требует настройки"],
  ["requires attunement", "требует настройки"],
  ["You can use an action to", "Вы можете действием"],
  ["You can use a bonus action to", "Вы можете бонусным действием"],
  ["As an action,", "Действием"],
  ["As a bonus action,", "Бонусным действием"],
  ["As a reaction,", "Реакцией"],
  ["you can use your reaction to", "вы можете реакцией"],
  ["you can use an action to", "вы можете действием"],
  ["you can use a bonus action to", "вы можете бонусным действием"],
  ["The attacker must succeed on a", "Атакующий должен пройти"],
  ["must succeed on a", "должен пройти"],
  ["must make a", "должен совершить"],
  ["Dexterity saving throw", "спасбросок Ловкости"],
  ["Strength saving throw", "спасбросок Силы"],
  ["Constitution saving throw", "спасбросок Телосложения"],
  ["Wisdom saving throw", "спасбросок Мудрости"],
  ["Intelligence saving throw", "спасбросок Интеллекта"],
  ["Charisma saving throw", "спасбросок Харизмы"],
  ["saving throw", "спасбросок"],
  ["or take", "или получить"],
  ["and take", "и получает"],
  ["taking", "получая"],
  ["on a failed save", "при провале"],
  ["on a successful one", "при успехе"],
  ["on a successful save", "при успехе"],
  ["half as much damage", "половину урона"],
  ["The cloak can't be used this way again until the next dawn", "Таким образом плащ нельзя использовать снова до следующего рассвета"],
  ["can't be used this way again until the next dawn", "нельзя использовать так снова до следующего рассвета"],
  ["until the next dawn", "до следующего рассвета"],
  ["until dawn", "до рассвета"],
  ["This property can't be used again until the next dawn", "Это свойство нельзя использовать снова до следующего рассвета"],
  ["You have a swimming speed of", "У вас есть скорость плавания"],
  ["You have a flying speed of", "У вас есть скорость полёта"],
  ["You have a climbing speed of", "У вас есть скорость лазания"],
  ["swimming speed of", "скорость плавания"],
  ["flying speed of", "скорость полёта"],
  ["climbing speed of", "скорость лазания"],
  ["walking speed increases by", "скорость ходьбы увеличивается на"],
  ["your walking speed", "ваша скорость ходьбы"],
  ["melee weapon attack", "рукопашная атака оружием"],
  ["ranged weapon attack", "дальнобойная атака оружием"],
  ["melee attack", "рукопашная атака"],
  ["ranged attack", "дальнобойная атака"],
  ["weapon attack", "атака оружием"],
  ["spell attack", "атака заклинанием"],
  ["When you are hit with a melee weapon attack", "Когда по вам попадает рукопашная атака оружием"],
  ["When you are hit with a", "Когда по вам попадает"],
  ["When you hit with a", "Когда вы попадаете"],
  ["When you hit a creature", "Когда вы попадаете по существу"],
  ["While wearing", "Пока надет"],
  ["you have advantage on", "вы совершаете с преимуществом"],
  ["you have disadvantage on", "вы совершаете с помехой"],
  ["advantage on", "преимущество на"],
  ["disadvantage on", "помеха на"],
  ["attack rolls", "броски атаки"],
  ["saving throws", "спасброски"],
  ["ability checks", "проверки характеристик"],
  ["Stealth checks", "проверки Скрытности"],
  ["Perception checks", "проверки Внимательности"],
  ["you gain a", "вы получаете"],
  ["you gain", "вы получаете"],
  ["bonus to", "бонус к"],
  ["bonus to AC", "бонус к КД"],
  ["Armor Class", "классу брони"],
  ["hit points", "хитам"],
  ["temporary hit points", "временным хитам"],
  ["regains", "восстанавливает"],
  ["expend", "потратить"],
  ["expended", "потрачено"],
  ["charges", "зарядов"],
  ["charge", "заряд"],
  ["Attunement", "Настройка"],
  ["attunement", "настройка"],
  ["magic item", "магический предмет"],
  ["magical", "магический"],
  ["nonmagical", "немагический"],
  ["creature", "существо"],
  ["creatures", "существа"],
  ["target", "цель"],
  ["targets", "цели"],
  ["feet of you", "футов от вас"],
  ["feet", "футов"],
  ["foot", "футовый"],
  ["ft.", "фт."],
  ["slashing damage", "рубящего урона"],
  ["piercing damage", "колющего урона"],
  ["bludgeoning damage", "дробящего урона"],
  ["fire damage", "урона огнём"],
  ["cold damage", "урона холодом"],
  ["lightning damage", "урона электричеством"],
  ["thunder damage", "звукового урона"],
  ["poison damage", "урона ядом"],
  ["acid damage", "урона кислотой"],
  ["necrotic damage", "некротического урона"],
  ["radiant damage", "урона излучением"],
  ["psychic damage", "психического урона"],
  ["force damage", "урона силовым полем"],
  ["damage", "урона"],
  ["The attacker has disadvantage on the saving throw if it hits you with a metal weapon", "Атакующий совершает спасбросок с помехой, если попал по вам металлическим оружием"],
  ["metal weapon", "металлическим оружием"],
  ["powerful electric charge", "мощный электрический заряд"],
  ["generate a", "создать"],
  ["rough, blue-gray leather cloak", "грубый сине-серый кожаный плащ"],
  ["while wearing this cloak", "пока на вас надет этот плащ"],
  ["While wearing this cloak", "Пока на вас надет этот плащ"],
  ["When you are hit with a melee weapon attack", "Когда по вам попадает рукопашная атака оружием"],
  ["When you are hit with a", "Когда по вам попадает"],
  ["This potion", "Это зелье"],
  ["When you drink this potion", "Когда вы выпиваете это зелье"],
  ["you regain", "вы восстанавливаете"],
  ["This item", "Этот предмет"],
  ["This cloak", "Этот плащ"],
  ["This ring", "Это кольцо"],
  ["This wand", "Эта палочка"],
  ["This staff", "Этот посох"],
  ["This armor", "Этот доспех"],
  ["This weapon", "Это оружие"],
  ["cloak", "плащ"],
  ["DC", "Сл"]
].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trNamePart(part) {
  const p = String(part || "").trim();
  if (!p) return p;
  if (WORD_RU[p]) return WORD_RU[p];
  const lowerKey = Object.keys(WORD_RU).find((k) => k.toLowerCase() === p.toLowerCase());
  if (lowerKey) return WORD_RU[lowerKey];
  // the X
  const m = p.match(/^the\s+(.+)$/i);
  if (m && WORD_RU[`the ${m[1]}`]) return WORD_RU[`the ${m[1]}`];
  if (m && WORD_RU[m[1]]) return WORD_RU[m[1]];
  return p;
}

function translateName(name) {
  const n = String(name || "").trim();
  if (!n) return n;
  if (NAME_MAP[n]) return NAME_MAP[n];
  const byCi = Object.entries(NAME_MAP).find(([k]) => k.toLowerCase() === n.toLowerCase());
  if (byCi) return byCi[1];
  for (const [re, fn] of NAME_PARTS) {
    const m = n.match(re);
    if (m) return fn(n, m[1]);
  }
  return n;
}

function translateText(input) {
  if (input == null) return "";
  let text = String(input);
  if (!text) return "";

  for (const [en, ru] of PHRASES) {
    if (!en) continue;
    const re = new RegExp(escapeRegExp(en), "gi");
    text = text.replace(re, ru);
  }

  text = text
    .replace(/\bft\.?\b/gi, "фт.")
    .replace(/\bDC\b/g, "Сл")
    .replace(/\bAC\b/g, "КД")
    .replace(/\bHP\b/g, "ХП")
    .replace(/Сл\s*(\d+)\s+спасбросок\s+(\S+)/gi, "спасбросок $2 Сл $1")
    .replace(/преуспеть в спасбросок/gi, "пройти спасбросок")
    .replace(/должен преуспеть в спасбросок/gi, "должен пройти спасбросок")
    .replace(/должен преуспеть в /gi, "должен пройти ")
    .replace(/ +/g, " ")
    .replace(/ \./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/,\s*([А-ЯA-Z])/g, (_, c) => `, ${c.toLowerCase()}`)
    .trim();

  return text;
}

function normalizeRarity(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!s) return "common";
  if (s.includes("artifact") || s.includes("legendary")) return "legendary";
  if (s.includes("very rare") || s === "veryrare") return "very_rare";
  if (s.includes("rare") && !s.includes("very")) return "rare";
  if (s.includes("uncommon")) return "uncommon";
  if (s.includes("common")) return "common";
  return "common";
}

function trType(type) {
  if (!type) return "";
  return TYPE_RU[type] || TYPE_RU[String(type).charAt(0).toUpperCase() + String(type).slice(1)] || type;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function translateDamageLabel(label) {
  return translateText(String(label || "").replace(/\b(\w+)\b/g, (w) => w));
}

/** Краткие характеристики из текста SRD/Open5e */
function extractStatsFromText(text) {
  const t = String(text || "");
  const stats = {
    attackBonus: "",
    damage: "",
    ac: "",
    charges: "",
    notes: ""
  };
  const notes = [];

  const dc = t.match(/\b(?:DC|Сл)\s*(\d+)\b/i);
  if (dc) notes.push(`Сл ${dc[1]}`);

  const dmg = [...t.matchAll(/(\d+d\d+(?:\s*\+\s*\d+)?)\s+(\w+)\s+(?:damage|урона)/gi)].slice(0, 3);
  if (dmg.length) {
    stats.damage = dmg
      .map((m) => {
        const type = translateText(`${m[2]} damage`).replace(/\s*урона\s*$/i, "").trim() || m[2];
        return `${m[1]} ${type}`;
      })
      .join("; ");
  }

  const bonus = t.match(/\+\s*(\d+)\s+(?:bonus|to (?:AC|КД|attack|hit|damage)|бонус)/i);
  if (bonus) stats.attackBonus = `+${bonus[1]}`;

  const ac = t.match(/(?:AC|Armor Class|КД)\s*(?:of\s*)?(\d+)/i);
  if (ac) stats.ac = ac[1];

  const charges = t.match(/(\d+)\s+(?:charges?|зарядов?)/i);
  if (charges) stats.charges = charges[1];

  const swim = t.match(/(?:swimming speed of|скорость плавания)\s*(\d+\s*(?:feet|футов|фт\.?))/i);
  if (swim) notes.push(`плавание ${String(swim[1]).replace(/feet|футов/gi, "фт.")}`);

  const fly = t.match(/(?:flying speed of|скорость полёта)\s*(\d+\s*(?:feet|футов|фт\.?))/i);
  if (fly) notes.push(`полёт ${String(fly[1]).replace(/feet|футов/gi, "фт.")}`);

  if (/reaction|реакци/i.test(t)) notes.push("реакция");
  if (/bonus action|бонусн/i.test(t)) notes.push("бонусное действие");
  if (/attunement|настройк/i.test(t)) notes.push("настройка");
  if (/dawn|рассвет/i.test(t)) notes.push("перезарядка на рассвете");

  stats.notes = notes.join(" · ");
  return stats;
}

function localizeItem(item) {
  if (!item) return item;
  const rawDesc = item.descriptionEn || item.description || "";
  const descriptionEn = stripHtml(
    item.descriptionEn
      ? item.descriptionEn
      : /[а-яё]/i.test(String(item.description || ""))
        ? ""
        : rawDesc
  );
  const description = descriptionEn
    ? translateText(descriptionEn)
    : stripHtml(item.description || "");
  const nameEn = item.nameEn || (/[а-яё]/i.test(String(item.name || "")) ? item.nameEn || "" : item.name) || "";
  const name = translateName(nameEn || item.name || "");
  const statsSource = descriptionEn || description;
  const stats = extractStatsFromText(statsSource);
  if (stats.damage) stats.damage = translateDamageLabel(stats.damage);
  return {
    ...item,
    name,
    nameEn: nameEn || item.nameEn || item.name || "",
    type: trType(item.typeEn || item.type) || item.type,
    description,
    descriptionEn: descriptionEn || item.descriptionEn || "",
    requiresAttunement: Boolean(item.requiresAttunement) || /attunement|настройк/i.test(descriptionEn || description),
    stats,
    locale: "ru"
  };
}

function mapItem(raw) {
  const rarityRaw =
    typeof raw.rarity === "object" ? raw.rarity?.name || raw.rarity?.key : raw.rarity;
  const rarity = normalizeRarity(rarityRaw);
  const rarityMeta = RARITY_BY_ID[rarity];
  const descriptionEn = stripHtml(raw.desc || raw.description || "");
  const typeEn =
    typeof raw.category === "object" ? raw.category?.name || "" : raw.type || raw.category || "";
  const requiresAttunement = Boolean(raw.requires_attunement) || /attunement/i.test(descriptionEn);

  return localizeItem({
    id: `open5e:${raw.key || raw.slug || raw.name}`,
    slug: raw.key || raw.slug || null,
    name: raw.name || "Unknown item",
    nameEn: raw.name || "",
    rarity,
    rarityLabel: rarityMeta?.label ?? rarity,
    type: typeEn,
    typeEn,
    description: descriptionEn,
    requiresAttunement,
    stats: {},
    source: CONTENT_SOURCE,
    documentTitle: raw.document?.name || "SRD 2024"
  });
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

async function fetchAllOpen5eMagicItems(onProgress) {
  const items = [];
  let url = `${OPEN5E_V2}/magicitems/?document__key__iexact=${DOCUMENT}&limit=100`;
  let page = 0;
  while (url) {
    page += 1;
    const data = await fetchJson(url);
    const batch = Array.isArray(data.results) ? data.results : [];
    items.push(...batch.map(mapItem));
    if (onProgress) {
      onProgress({ current: items.length, message: `Open5e SRD 2024 items… стр. ${page}` });
    }
    url = data.next || null;
  }
  return items;
}

let memoryCache = null;

export async function loadMagicItemsFromNetwork({ forceRefresh = false, onProgress } = {}) {
  const report = (percent, message) => {
    if (onProgress) onProgress({ percent, message });
  };

  if (!forceRefresh) {
    if (memoryCache?.items?.length && memoryCache.version === CACHE_VERSION) {
      report(100, `Из памяти: ${memoryCache.items.length}`);
      return {
        ...memoryCache,
        items: memoryCache.items.map(localizeItem),
        fromCache: true
      };
    }
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"));
      if (Array.isArray(cached.items) && cached.items.length > 20 && cached.version === CACHE_VERSION) {
        memoryCache = cached;
        report(100, `Из кэша: ${cached.items.length}`);
        return {
          ...cached,
          items: cached.items.map(localizeItem),
          fromCache: true
        };
      }
    } catch {
      /* no cache */
    }
  }

  report(5, "Загрузка Open5e SRD 2024 magic items…");
  const items = await fetchAllOpen5eMagicItems(({ message }) => report(40, message));
  if (!items.length) {
    throw new Error("Не удалось загрузить магические предметы SRD 2024");
  }

  const byRarity = {};
  for (const r of RARITIES) {
    byRarity[r.id] = items.filter((i) => i.rarity === r.id);
  }

  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources: [`api.open5e.com/v2/magicitems?document__key__iexact=${DOCUMENT}`],
    items,
    byRarityCounts: Object.fromEntries(RARITIES.map((r) => [r.id, byRarity[r.id].length]))
  };

  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  memoryCache = payload;
  report(100, `Готово: ${items.length} предметов`);
  return { ...payload, fromCache: false };
}

export function pickRandomItems(items, rarity, count = 1) {
  const pool = (items || []).filter((i) => i.rarity === rarity);
  if (!pool.length) {
    return [];
  }
  const n = Math.max(1, Math.min(Number(count) || 1, 10));
  const picked = [];
  for (let i = 0; i < n; i += 1) {
    const src = localizeItem(pool[Math.floor(Math.random() * pool.length)]);
    picked.push({
      ...src,
      id: `drop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      catalogId: src.id,
      source: src.source || "open5e"
    });
  }
  return picked;
}

export function rarityCatalog() {
  return RARITIES.map((r) => ({ id: r.id, label: r.label }));
}
