import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../src/data/sample-characters/ignorina.json");

const envelope = JSON.parse(await readFile(filePath, "utf8"));
const d = JSON.parse(envelope.data);

d.info.charSubclass = {
  name: "charSubclass",
  value: "Клятва преданности",
  label: d.info.charSubclass?.label || "подкласс"
};

d.spells = d.spells || {};
d.spells["slots-1"] = { ...(d.spells["slots-1"] || {}), value: 3 };
d.spells["slots-2"] = { ...(d.spells["slots-2"] || {}), value: 0 };

const prepared = [
  "command",
  "divine favor",
  "compelled duel",
  "cure wounds",
  "shield of faith",
  "protection from evil and good",
  "divine smite"
];
envelope.spells = {
  ...envelope.spells,
  mode: "text",
  edition: "2024",
  prepared,
  book: [...prepared]
};

function para(text) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function tipDoc(paragraphs) {
  return { type: "doc", content: paragraphs };
}

function boldPara(bold, rest) {
  return {
    type: "paragraph",
    content: [
      { type: "text", marks: [{ type: "bold" }], text: bold },
      { type: "text", text: rest }
    ]
  };
}

d.text["spells-level-1"].value.data = tipDoc([
  para("Лечение ран [Cure Wounds]"),
  para("Приказ [Command]"),
  para("Божественное благоволение [Divine Favor]"),
  para("Вызов на дуэль [Compelled Duel]"),
  para("Щит веры [Shield of Faith] — всегда (клятва)"),
  para("Защита от зла и добра [Protection from Evil and Good] — всегда (клятва)"),
  para("Божественная кара [Divine Smite] — всегда (Кара паладина)")
]);

d.text["notes-1"].value.data = tipDoc([
  {
    type: "paragraph",
    content: [{ type: "text", marks: [{ type: "bold" }], text: "Умения паладина (SRD 2024):" }]
  },
  boldPara(
    "Возложение рук (Lay on Hands): ",
    "Запас 15 ХП (5 × уровень). Бонусным действием касаешься существа и лечишь его. Или тратишь 5 ХП из запаса, чтобы снять отравление."
  ),
  boldPara(
    "Колдовство: ",
    "Ячейки: 3 × 1 круг (таблица паладина L3). Готовите 4 заклинания паладина. Сл 12, атака +4 (Харизма). Divine Smite и заклинания клятвы не считаются в лимит 4."
  ),
  boldPara(
    "Мастерство оружия: ",
    "Длинный меч и метательное копьё (свойства мастерства). Можно сменить после продолжительного отдыха."
  ),
  boldPara(
    "Подготовлено (4): ",
    "Приказ, Божественное благоволение, Вызов на дуэль, Лечение ран."
  ),
  boldPara(
    "Всегда подготовлены: ",
    "Божественная кара (Divine Smite); от клятвы — Щит веры, Защита от зла и добра."
  )
]);

d.text["notes-2"].value.data = tipDoc([
  {
    type: "paragraph",
    content: [{ type: "text", marks: [{ type: "bold" }], text: "Умения паладина (SRD 2024):" }]
  },
  boldPara(
    "Боевой стиль: Дуэлянт — ",
    "+2 к урону при атаке оружием в одной руке (щит разрешён)."
  ),
  boldPara(
    "Кара паладина (Paladin's Smite): ",
    "Всегда имеете подготовленным заклинание Divine Smite. Можете сотворить его 1 раз без ячейки за продолжительный отдых. После попадания атакой — бонусным действием; базовый урон 2к8 излучением (+1к8 против нежити/исчадий; +1к8 за круг ячейки выше 1)."
  ),
  boldPara(
    "Божественный канал: ",
    "2 использования. 1 восстанавливается после короткого отдыха, все — после продолжительного."
  ),
  boldPara(
    "Божественное чувство (Divine Sense): ",
    "Бонусное действие (тратит Channel Divinity) — 10 минут чувствуете небожителей, исчадий, нежить и освящённые/осквернённые места в 60 фт."
  ),
  boldPara(
    "Клятва преданности — Священное оружие: ",
    "При действии Атака тратите Channel Divinity: на 10 минут добавляете +Хар (+2) к броскам атаки этим оружием; урон может быть излучением; оружие светится."
  )
]);

d.text["notes-4"].value.data =
  "<strong>Навыки (все бонусы):</strong> " +
  "<p><strong>Внимательность (Perception):</strong> +5 (Мудрость 1 + БМ 2 + владение) — навык человека</p>" +
  "<p><strong>Проницательность (Insight):</strong> +3 (Мудрость 1 + БМ 2) — предыстория Послушник</p>" +
  "<p><strong>Религия (Religion):</strong> +2 (Интеллект 0 + БМ 2) — предыстория Послушник</p>" +
  "<p><strong>Убеждение (Persuasion):</strong> +4 (Харизма 2 + БМ 2) — паладин</p>" +
  "<p><strong>Одарённый (Skilled):</strong> владение инструментами каллиграфа уже от фона; доп. навыки на листе без двойного счёта.</p>" +
  "<p><strong>Спасброски:</strong> Мудрость +3, Харизма +4</p>";

envelope.data = JSON.stringify(d);
await writeFile(filePath, JSON.stringify(envelope), "utf8");

const check = JSON.parse(await readFile(filePath, "utf8"));
const c = JSON.parse(check.data);
console.log("subclass", c.info.charSubclass.value);
console.log("slots1", c.spells["slots-1"].value);
console.log("prepared", check.spells.prepared);
console.log("DONE");
