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

function tipDoc(paragraphs) {
  return { type: "doc", content: paragraphs };
}

function bulletList(items) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [para(text)]
    }))
  };
}

// Perception: Wis+1 + PB+2 = +3 (isProf=1, не expertise)
d.text["notes-3"].value.data = tipDoc([
  boldPara("Раса: Человек"),
  boldPara(
    "Находчивость (Resourceful): ",
    "После каждого продолжительного отдыха — героическое вдохновение (можно перебросить один бросок d20)."
  ),
  boldPara(
    "Умелый (Skillful): ",
    "Владение навыком Внимательность (Perception) — +3 (Мдр +1 + БМ +2)."
  ),
  boldPara(
    "Черта происхождения — Одарённый (Skilled): ",
    "Владение тремя навыками или инструментами. На этом листе в навыках не размечены отдельно (чтобы не дублировать фон/класс); инструменты каллиграфа уже от предыстории Послушник. При желании мастер может выдать ещё 2 инструмента или навыка."
  ),
  boldPara("Владения навыками на листе:"),
  bulletList([
    "Внимательность (Perception) +3 — человек (Skillful)",
    "Проницательность (Insight) +3 — предыстория Послушник",
    "Религия (Religion) +2 — предыстория Послушник",
    "Убеждение (Persuasion) +4 — паладин (1 из 2 классовых; второй навык паладина на листе не выбран — можно взять, например, Атлетику или Запугивание)"
  ])
]);

d.text["notes-4"].value.data =
  "<strong>Навыки (бонусы):</strong>" +
  "<p><strong>Внимательность (Perception):</strong> +3 (Мудрость +1 + БМ +2) — человек</p>" +
  "<p><strong>Проницательность (Insight):</strong> +3 (Мудрость +1 + БМ +2) — Послушник</p>" +
  "<p><strong>Религия (Religion):</strong> +2 (Интеллект +0 + БМ +2) — Послушник</p>" +
  "<p><strong>Убеждение (Persuasion):</strong> +4 (Харизма +2 + БМ +2) — паладин</p>" +
  "<p><strong>Одарённый (Skilled):</strong> 3 владения навыками/инструментами; на листе не добавлены поверх уже взятых (инструменты каллиграфа — от фона).</p>" +
  "<p><strong>Паладин:</strong> положено 2 навыка класса — сейчас выбран 1 (Убеждение).</p>" +
  "<p><strong>Спасброски:</strong> Мудрость +3, Харизма +4</p>";

d.text.feats.value.data = tipDoc([
  para(
    "Одарённый (Skilled) — владение тремя навыками или инструментами на выбор. На текущем листе дополнительные навыки сверх четырёх основных не проставлены."
  ),
  para(
    "Находчивость (Resourceful, человек) — героическое вдохновение после каждого продолжительного отдыха."
  )
]);

envelope.data = JSON.stringify(d);
await writeFile(filePath, JSON.stringify(envelope), "utf8");
console.log("notes fixed");
