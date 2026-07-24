/**
 * Собирает рабочий LSS-JSON Дуулана под импорт @dnd/server.
 * Источник: экспорт LSS + скрины листа (раса, домен, черты, снаряжение).
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "C:/Users/user/Downloads/Telegram Desktop/Дуулан — Long Story Short (1).json";
const OUT_DOWNLOADS = "C:/Users/user/Downloads/Дуулан-dnd-port.json";
const OUT_SAMPLE = path.resolve("apps/server/src/data/sample-characters/duulan.json");

function para(...parts) {
  const content = [];
  for (const p of parts) {
    if (typeof p === "string") content.push({ type: "text", text: p });
    else content.push(p);
  }
  return { type: "paragraph", content };
}
function bold(text) {
  return { type: "text", marks: [{ type: "bold" }], text };
}
function italic(text) {
  return { type: "text", marks: [{ type: "italic" }], text };
}
function doc(paragraphs) {
  return { type: "doc", content: paragraphs.filter(Boolean) };
}
function textBlock(paragraphs) {
  return { value: { data: doc(paragraphs) } };
}

const env = JSON.parse(fs.readFileSync(SRC, "utf8"));
const d = JSON.parse(env.data);

// --- identity / class ---
d.info.charClass.value = "Жрец";
d.info.charSubclass.value = "Домен порядка";
d.info.race.value = "Хобгоблин";
d.info.background.value = "Прислужник";
d.info.alignment = { name: "alignment", value: "Законно-нейтральный", label: "мировоззрение" };
d.info.experience.value = 1040;
d.info.level.value = 3;
d.proficiency = 2;
d.proficiencyCustom = 2;

// --- abilities (уже с расовым CON+2 INT+1 в итоговых числах листа) ---
// оставляем scores как на листе LSS
d.stats.str.modifier = 2;
d.stats.dex.modifier = -1;
d.stats.con.modifier = 1;
d.stats.int.modifier = 1;
d.stats.wis.modifier = 2;
d.stats.cha.modifier = 1;

// --- saves: жрец ---
d.saves.wis.isProf = true;
d.saves.cha.isProf = true;

// --- skills: как на листе + домен дал Убеждение ---
for (const key of Object.keys(d.skills)) {
  if (d.skills[key].isProf === undefined) d.skills[key].isProf = 0;
}
d.skills.investigation.isProf = 1;
d.skills.history.isProf = 1;
d.skills.insight.isProf = 1;
d.skills.religion.isProf = 1;
d.skills.persuasion.isProf = 1;
d.skills.perception.label = "Внимательность";

// --- vitals ---
d.vitality["hp-max"].value = 21;
d.vitality["hp-current"].value = 21;
d.vitality["hp-temp"] = { value: 0 };
d.vitality.ac.value = 15;
d.vitality.speed = { value: 30 };
d.vitality["hit-die"] = { value: "d8" };
d.vitality.darkvision = { value: 60 };
d.vitality["hp-dice-current"] = { value: 3 };

// --- spellcasting ---
d.spellsInfo.base.code = "wis";
d.spellsInfo.base.value = "Мудрость";
d.spellsInfo.save.customModifier = "12";
d.spellsInfo.mod.customModifier = "4";
d.spells = {
  "slots-1": { value: 4, filled: 4 },
  "slots-2": { value: 2, filled: 2 },
  "slots-3": { value: 0 }
};

// --- weapons ---
d.weaponsList = [
  {
    id: "w-mace",
    name: { value: "Булава" },
    dmg: { value: "1к6+2 дробящий" },
    isProf: true,
    ability: "str"
  },
  {
    id: "w-longsword",
    name: { value: "Длинный меч" },
    dmg: { value: "1к8+2 рубящий" },
    isProf: true,
    ability: "str"
  },
  {
    id: "w-moon-sickle",
    name: { value: "Лунный серп +1" },
    dmg: { value: "1к4+3 рубящий (необычный)" },
    isProf: true,
    ability: "str"
  }
];

// --- coins ---
d.coins.gp.value = 978;
d.coins.sp.value = 0;
d.coins.cp = { value: 0 };
d.coins.pp = { value: 0 };
d.coins.ep = { value: 0 };

// --- structured text blocks ---
d.text.attacks = textBlock([
  para(bold("Увеличение характеристик"), ". Значение вашего Телосложения увеличивается на 2, а значение Интеллекта увеличивается на 1."),
  para(
    bold("Тёмное зрение"),
    ". На расстоянии в 60 футов вы при тусклом освещении можете видеть так, как будто это яркое освещение, и в темноте так, как будто это тусклое освещение. В темноте вы не можете различать цвета, только оттенки серого."
  ),
  para(bold("Боевая подготовка"), ". Вы владеете двумя воинскими оружиями на ваш выбор и лёгкими доспехами."),
  para(
    bold("Сохранить лицо"),
    ". Хобгоблины стараются не показывать слабость перед своими союзниками, из страха потерять свой статус. Если вы провалили бросок атаки, проверку характеристики или спасбросок, вы можете получить бонус к броску, равный числу союзников, которых вы можете видеть в пределах 30 футов от вас (максимальный бонус — +5). Воспользовавшись этой особенностью, вы не можете использовать её снова, пока не окончите короткий или продолжительный отдых."
  )
]);

d.text.traits = textBlock([
  para(bold("ВЛАДЕНИЕ")),
  para("Доспехи: лёгкие, средние, щиты, тяжёлые (домен порядка)."),
  para("Оружие: простое; воинское (расовая боевая подготовка — длинный меч и др.)."),
  para("Инструменты: нет."),
  para("Спасброски: Мудрость, Харизма."),
  para("Навыки: Анализ, История, Проницательность, Религия, Убеждение (домен порядка)."),
  para(bold("1-й уровень, умение домена порядка")),
  para(
    "Вы получаете владение тяжёлыми доспехами. Вы также получаете владение навыком Запугивание или Убеждение (по вашему выбору). Выбрано: Убеждение."
  ),
  para(bold("1-й уровень, умение домена порядка — Голос власти")),
  para(
    "Вы можете призвать силу закона, чтобы повести союзников в атаку. Когда вы накладываете заклинание на союзника, используя ячейку 1-го уровня и выше, этот союзник может реакцией совершить одну атаку оружием по существу, которое вы можете видеть, по вашему выбору. Если заклинание затрагивает больше чем одного союзника, вы выбираете, кто из союзников может совершать атаку в данный момент."
  )
]);

d.text.features = textBlock([
  para(italic("2-й уровень, умение жреца")),
  para(
    "Вы получаете возможность направлять божественную энергию непосредственно от своего божества, используя её для подпитки магических эффектов. Вы начинаете с двумя такими эффектами: «Изгнание Нежити» и эффектом, определяемым вашим доменом. Некоторые домены дают вам дополнительные эффекты, как только вы получите новые уровни."
  ),
  para(italic("2-й уровень, умение домена порядка")),
  para(
    "Вы можете использовать свой «Божественный канал», чтобы надавить на кого-то. Действием вы демонстрируете священный символ. Каждое существо по вашему выбору в пределах 30 футов от вас, которое может слышать или видеть вас, должно преуспеть в спасброске Мудрости, иначе будет очаровано вами до окончания вашего следующего хода или до того, как очарованное существо получит урон. При провале спасброска вы также можете заставить любое очарованное существо выронить то, что у него в руках."
  ),
  para(bold("БОЖЕСТВЕННЫЙ КАНАЛ: ИЗГНАНИЕ НЕЖИТИ")),
  para(
    "Вы действием демонстрируете свой священный символ и читаете молитву, изгоняющую Нежить. Вся Нежить, которая может видеть или слышать вас в пределах 30 футов, должна совершить спасбросок Мудрости. Если существо провалило спасбросок, оно изгоняется на 1 минуту, или пока не получит урон. Изгнанное существо должно тратить свои ходы, пытаясь уйти от вас как можно дальше, и не может добровольно переместиться в пространство, находящееся в пределах 30 футов от вас. Оно также не может совершать реакции. Действием существо может использовать только Рывок или пытаться освободиться от эффекта, препятствующего его передвижению. Если двигаться некуда, существо может использовать действие Уклонение."
  )
]);

d.text.feats = textBlock([
  para(
    "Жрецы Тира несут закон в беззаконные земли, часто служа судьями, присяжными и палачами. В случае неимения в данной стране цивилизованного юридического кодекса для ведения своих судов они часто по умолчанию следуют доктрине, примерно эквивалентной «око за око, зуб за зуб»."
  ),
  para(
    "Странные представления о законе и морали (нетрадиционные для культа Тира), что обусловлено его происхождением из хобгоблинов. Уважает силу, насилие."
  )
]);

d.text.equipment = textBlock([
  para("Щит; Булава; Длинный меч."),
  para("Кожаный доспех."),
  para("Символ бога Тира; Значок культа Бейна (Чёрные Кулаки)."),
  para("Набор инквизитора Чёрных Кулаков (орудия пытки, инструменты для расследования). Рюкзак и плащ."),
  para("Зелье яда (2 из 3)."),
  para("Доспехи Мрака (средние; заклинание умиротворения) (редкие)."),
  para("Камешки гематита из пещеры (10 зм).")
]);

d.text.personality = textBlock([
  para(bold("Инквизитор")),
  para("Я скрупулезно и тщательно провожу расследования, не оставляя камня на камне."),
  para(
    bold("Идеал — Правосудие. "),
    "Те, кто вредит или лжёт Церкви, должны быть привлечены к ответственности. (Законный) + законность (закон — то, что он считает правильным)."
  ),
  para(
    bold("Привязанность. "),
    "Я предан наставнику или начальнику в Церкви, который направлял меня на моём пути (человеку из культа Тира)."
  ),
  para(bold("Слабость. "), "Моя суровая манера поведения часто отталкивает людей.")
]);

d.text.background = textBlock([
  para("Предыстория: в юном возрасте вы приняли религию людей и теперь искренне ей служите."),
  para("Мировоззрение: законно-нейтральный.")
]);

d.text.prof = textBlock([para("Языки: общий, гоблинский, эльфийский.")]);

d.text["notes-2"] = textBlock([
  para(bold("Инквизитор")),
  para("Я скрупулезно и тщательно провожу расследования, не оставляя камня на камне."),
  para(
    "Правосудие. Те, кто вредит или лжёт Церкви, должны быть привлечены к ответственности. (Законный) + законность (закон — то, что он считает правильным)."
  ),
  para("Я предан наставнику или начальнику в Церкви, который направлял меня на моём пути (человеку из культа Тира)."),
  para("Моя суровая манера поведения часто отталкивает людей.")
]);

d.text["notes-3"] = textBlock([
  para(bold("Раса: Хобгоблин")),
  para("CON +2, INT +1 · тёмное зрение 60 фт · боевая подготовка · сохранить лицо (1/отдых).")
]);

d.text["notes-4"] = textBlock([
  para(bold("Колдовство жреца 3 ур.")),
  para("Спасбросок заклинаний 12 · атака заклинанием +4 · Мдр."),
  para("Ячейки: 4×1 круг, 2×2 круг."),
  para("Домен порядка — всегда: Приказ, Героизм; на 3 ур. также Удержание личности, Зона истины.")
]);

// envelope spells: TEXT mode with resolvable EN names
env.spells = {
  mode: "text",
  edition: "2014",
  prepared: ["guidance", "sacred flame", "thaumaturgy", "cure wounds", "bless", "guiding bolt"],
  book: [
    "guidance",
    "sacred flame",
    "thaumaturgy",
    "command",
    "heroism",
    "cure wounds",
    "bless",
    "guiding bolt",
    "shield of faith",
    "detect magic",
    "hold person",
    "zone of truth",
    "aid",
    "calm emotions"
  ],
  alwaysPrepared: ["command", "heroism", "hold person", "zone of truth"],
  initiateCantrips: [],
  initiateSpell: null
};

env.spellcastingItems = [
  {
    id: "moon-sickle-1",
    icon: "🌙",
    name: "Лунный серп +1",
    nameEn: "Moon Sickle",
    type: "Оружие (серп)",
    rarity: "uncommon",
    rarityLabel: "Необычный (+1)",
    requiresAttunement: true,
    summary: "Серп со серебряным клинком; +1 к атаке и урону. Фокус заклинаний друида/следопыта.",
    description:
      "Этот серебряный серп мерцает в лунном свете. Пока вы держите это магическое оружие, вы получаете бонус +1 к броскам атаки и урона, совершённым с его помощью. Кроме того, вы получаете бонус +1 к броскам атаки заклинаниями и к Сл спасбросков ваших заклинаний друида и следопыта. Серп можно использовать как фокусировку для заклинаний друида и следопыта. Когда вы накладываете заклинание, восстанавливающее хиты, и держите серп, можете бросить к4 и добавить результат к числу восстановленных хитов. Требуется настройка друидом или следопытом (TCE)."
  }
];

env.edition = env.edition || "2014";
env.sheetEdition = env.sheetEdition || "2014";
env.data = JSON.stringify(d);
env.jsonType = "character";
env.version = env.version || "2";

const out = JSON.stringify(env, null, 0);
fs.mkdirSync(path.dirname(OUT_SAMPLE), { recursive: true });
fs.writeFileSync(OUT_SAMPLE, out, "utf8");
fs.writeFileSync(OUT_DOWNLOADS, out, "utf8");
console.log("Wrote", OUT_SAMPLE);
console.log("Wrote", OUT_DOWNLOADS);
console.log("bytes", out.length);
