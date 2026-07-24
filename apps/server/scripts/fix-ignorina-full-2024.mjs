/**
 * Приводит ignorina.json к SRD 2024 (Паладин 3 / Клятва преданности / Человек / Послушник).
 */
import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../src/data/sample-characters/ignorina.json");

const envelope = JSON.parse(await readFile(filePath, "utf8"));
const d = JSON.parse(envelope.data);

function para(text) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function boldPara(bold, rest = "") {
  const content = [{ type: "text", marks: [{ type: "bold" }], text: bold }];
  if (rest) content.push({ type: "text", text: rest });
  return { type: "paragraph", content };
}
function tipDoc(blocks) {
  return { type: "doc", content: blocks };
}
function bullets(items) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [para(text)]
    }))
  };
}

// --- Identity / class ---
d.info.charClass.value = "Паладин";
d.info.charSubclass = {
  name: "charSubclass",
  value: "Клятва преданности",
  label: d.info.charSubclass?.label || "подкласс"
};
d.info.level.value = 3;
d.info.background.value = "Послушник";
d.info.race.value = "Человек";
d.info.experience.value = 900;
d.info.alignment.value = "Нейтральный добрый";

// --- Ability scores (оставляем билд; эквивалент point-buy + Acolyte +2 Cha / +1 Wis) ---
d.stats.str.score = 15;
d.stats.dex.score = 10;
d.stats.con.score = 13;
d.stats.int.score = 10;
d.stats.wis.score = 13;
d.stats.cha.score = 14;

// --- Saves: Paladin Wis + Cha ---
for (const k of Object.keys(d.saves)) {
  d.saves[k].isProf = k === "wis" || k === "cha";
  d.saves[k].bonus = 0;
}

// --- Skills ---
// Human Skillful: Perception
// Acolyte: Insight, Religion
// Paladin (2): Athletics, Persuasion
// Human origin feat Skilled (3): Medicine, Intimidation, History
const skillProf = {
  perception: 1,
  insight: 1,
  religion: 1,
  athletics: 1,
  persuasion: 1,
  medicine: 1,
  intimidation: 1,
  history: 1
};
for (const [key, skill] of Object.entries(d.skills)) {
  skill.isProf = skillProf[key] || 0;
}

// --- Vitals ---
d.vitality["hp-max"].value = 25;
d.vitality["hp-current"].value = 25;
d.vitality.ac.value = 18;
d.vitality.speed.value = 30;
d.vitality["hit-die"].value = "d10";
d.vitality["hp-dice-current"] = { ...(d.vitality["hp-dice-current"] || {}), value: 3 };
d.proficiency = 2;
d.proficiencyCustom = 2;
d.inspiration = true;

// --- Spell slots L3 paladin: 3×1st ---
d.spells = d.spells || {};
d.spells["slots-1"] = { ...(typeof d.spells["slots-1"] === "object" ? d.spells["slots-1"] : {}), value: 3 };
d.spells["slots-2"] = { ...(typeof d.spells["slots-2"] === "object" ? d.spells["slots-2"] : {}), value: 0 };
d.spells["slots-3"] = { ...(typeof d.spells["slots-3"] === "object" ? d.spells["slots-3"] : {}), value: 0 };
d.spells["slots-4"] = { ...(typeof d.spells["slots-4"] === "object" ? d.spells["slots-4"] : {}), value: 0 };

d.spellsInfo = {
  base: { name: "base", value: "Харизма", label: "Базовая характеристика заклинаний", code: "cha" },
  save: { name: "save", value: "", label: "Сложность спасброска", customModifier: "12" },
  mod: { name: "mod", value: "", label: "Бонус атаки заклинанием", customModifier: "4" }
};

// Prepared that COUNT toward the 4 (table L3)
const preparedCountable = ["command", "divine favor", "compelled duel", "cure wounds"];
// Always prepared (do not count): Paladin's Smite + Oath of Devotion L3
const alwaysPrepared = ["divine smite", "shield of faith", "protection from evil and good"];
// Magic Initiate (Cleric) from Acolyte — cantrips + 1st-level (Cha for cast from feat; once/LR free for the 1st)
const initiateCantrips = ["guidance", "sacred flame"];
const initiateSpell = "bless";

envelope.edition = "2024";
envelope.sheetEdition = "2024";
envelope.spells = {
  mode: "text",
  edition: "2024",
  prepared: preparedCountable,
  book: [...new Set([...preparedCountable, ...alwaysPrepared, initiateSpell])],
  alwaysPrepared,
  initiateCantrips,
  initiateSpell
};

// --- Text blocks ---
d.text["spells-level-0"].value.data = tipDoc([
  boldPara("Заговоры — Magic Initiate (Жрец):"),
  para("Указание [Guidance]"),
  para("Священное пламя [Sacred Flame]")
]);

d.text["spells-level-1"].value.data = tipDoc([
  boldPara("Подготовлено паладином (4 из таблицы):"),
  para("Приказ [Command]"),
  para("Божественное благоволение [Divine Favor]"),
  para("Вызов на дуэль [Compelled Duel]"),
  para("Лечение ран [Cure Wounds]"),
  boldPara("Всегда подготовлены (не в лимит 4):"),
  para("Божественная кара [Divine Smite] — Кара паладина"),
  para("Щит веры [Shield of Faith] — Клятва преданности"),
  para("Защита от зла и добра [Protection from Evil and Good] — Клятва преданности"),
  boldPara("Magic Initiate (Жрец) — 1 круг:"),
  para("Благословение [Bless] — 1 раз без ячейки / продолжительный отдых; далее через ячейки паладина")
]);

d.text.feats.value.data = tipDoc([
  boldPara("Послушник → Magic Initiate (Жрец): "),
  para(
    "Заговоры: Указание, Священное пламя. Заклинание 1 круга: Благословение (1 раз без ячейки за продолжительный отдых). Характеристика — Мудрость для этой черты (или как на листе колдовства)."
  ),
  boldPara("Человек (Versatile) → Одарённый (Skilled): "),
  para("Владение: Медицина, Запугивание, История.")
]);

d.text["notes-1"].value.data = tipDoc([
  boldPara("Умения паладина (SRD 2024), уровень 3"),
  boldPara(
    "Возложение рук: ",
    "Запас 15 ХП (5×уровень). Бонусным действием касанием лечите или за 5 ХП из запаса снимаете отравление."
  ),
  boldPara(
    "Колдовство: ",
    "Ячейки 3×1 круг. Готовите 4 заклинания паладина (таблица). Сл спасброска 12, атака заклинанием +4. Always-prepared и заклинания клятвы не считаются в 4."
  ),
  boldPara(
    "Мастерство оружия: ",
    "Длинный меч и метательное копьё. Можно сменить после продолжительного отдыха."
  ),
  boldPara("Подготовлено (4): ", "Приказ, Божественное благоволение, Вызов на дуэль, Лечение ран."),
  boldPara(
    "Всегда подготовлены: ",
    "Divine Smite; от клятвы — Щит веры, Защита от зла и добра."
  )
]);

d.text["notes-2"].value.data = tipDoc([
  boldPara("Умения паладина (SRD 2024)"),
  boldPara(
    "Боевой стиль — Дуэлянт: ",
    "+2 к урону одноручным оружием ближнего боя (щит разрешён)."
  ),
  boldPara(
    "Кара паладина: ",
    "Always prepared: Divine Smite. 1 раз без ячейки / продолжительный отдых. После попадания — бонусным действием; 2к8 излучением (+1к8 vs нежить/исчадия; +1к8 за круг ячейки выше 1)."
  ),
  boldPara(
    "Божественный канал: ",
    "2 использования; 1 возвращается после короткого отдыха, все — после продолжительного."
  ),
  boldPara(
    "Божественное чувство: ",
    "Бонусное действие, тратит Channel Divinity; 10 минут, 60 фт. — небожители, исчадия, нежить, освящённые/осквернённые места."
  ),
  boldPara(
    "Клятва преданности — Священное оружие: ",
    "При действии Атака тратите Channel Divinity: 10 минут +Хар (+2) к атакам этим оружием ближнего боя; урон может быть излучением; светится."
  )
]);

d.text["notes-3"].value.data = tipDoc([
  boldPara("Раса: Человек (SRD 2024)"),
  boldPara(
    "Resourceful: ",
    "Героическое вдохновение после каждого продолжительного отдыха."
  ),
  boldPara("Skillful: ", "Владение навыком Внимательность (Perception) — +3."),
  boldPara("Versatile: ", "Черта происхождения Одарённый (Skilled) — Медицина, Запугивание, История."),
  boldPara("Предыстория Послушник:"),
  bullets([
    "Навыки: Проницательность, Религия",
    "Инструмент: каллиграф",
    "Черта: Magic Initiate (Жрец) — Указание, Священное пламя, Благословение"
  ])
]);

d.text["notes-4"].value.data =
  "<strong>Навыки:</strong>" +
  "<p><strong>Внимательность:</strong> +3 — человек (Skillful)</p>" +
  "<p><strong>Проницательность:</strong> +3 — Послушник</p>" +
  "<p><strong>Религия:</strong> +2 — Послушник</p>" +
  "<p><strong>Атлетика:</strong> +4 — паладин</p>" +
  "<p><strong>Убеждение:</strong> +4 — паладин</p>" +
  "<p><strong>Медицина:</strong> +3 — Одарённый</p>" +
  "<p><strong>Запугивание:</strong> +4 — Одарённый</p>" +
  "<p><strong>История:</strong> +2 — Одарённый</p>" +
  "<p><strong>Спасброски:</strong> Мудрость +3, Харизма +4 · <strong>БМ</strong> +2</p>" +
  "<p><strong>Ячейки:</strong> 3×1 круг · <strong>Подготовка:</strong> 4 + always (Smite + клятва)</p>";

d.text.prof.value.data =
  "<p><strong>Бонус мастерства:</strong> +2</p>" +
  "<p><strong>Языки:</strong> Общий, Эльфийский, Драконий</p>" +
  "<p><strong>Доспехи:</strong> Все доспехи, щиты</p>" +
  "<p><strong>Оружие:</strong> Простое и воинское</p>" +
  "<p><strong>Инструменты:</strong> Инструменты каллиграфа</p>" +
  "<p><strong>Мастерство оружия:</strong> Длинный меч, метательное копьё</p>" +
  "<p><strong>Channel Divinity:</strong> 2</p>";

// Equipment: keep gear, ensure key lines; rewrite equipment doc cleanly
d.text.equipment.value.data = tipDoc([
  para("Кольчуга (КД 16)"),
  para("Щит (+2 КД)"),
  para("Длинный меч (1к8 рубящий) — с Дуэлянтом: 1к8+4"),
  para("Метательное копьё ×6 (1к6 колющий) — урон: 1к6+2"),
  para("Священный символ (фокус)"),
  para("Набор священника"),
  para("Инструменты каллиграфа"),
  para("Книга (молитвенник)"),
  para("Пергамент (10 листов)"),
  para("Роба"),
  para("17 зм")
]);

d.coins.gp = { ...(typeof d.coins.gp === "object" ? d.coins.gp : {}), value: 17 };
d.coins.total = { ...(typeof d.coins.total === "object" ? d.coins.total : {}), value: 17 };

envelope.data = JSON.stringify(d);
await writeFile(filePath, JSON.stringify(envelope), "utf8");

console.log(
  JSON.stringify(
    {
      subclass: d.info.charSubclass.value,
      slots1: d.spells["slots-1"].value,
      prepared: envelope.spells.prepared,
      alwaysPrepared: envelope.spells.alwaysPrepared,
      initiate: {
        cantrips: envelope.spells.initiateCantrips,
        spell: envelope.spells.initiateSpell
      },
      skills: Object.keys(skillProf)
    },
    null,
    2
  )
);
