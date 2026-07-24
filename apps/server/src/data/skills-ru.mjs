/** Русские названия навыков 5e (по ключу импорта Long Story Short / SRD). */

export const SKILL_LABELS_RU = {
  acrobatics: "Акробатика",
  "animal handling": "Уход за животными",
  animalhandling: "Уход за животными",
  arcana: "Магия",
  athletics: "Атлетика",
  deception: "Обман",
  history: "История",
  insight: "Проницательность",
  intimidation: "Запугивание",
  investigation: "Анализ",
  medicine: "Медицина",
  nature: "Природа",
  perception: "Внимательность",
  performance: "Выступление",
  persuasion: "Убеждение",
  religion: "Религия",
  "sleight of hand": "Ловкость рук",
  sleightofhand: "Ловкость рук",
  stealth: "Скрытность",
  survival: "Выживание"
};

function normalizeSkillKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** @param {{ key?: string, label?: string } | string} skill */
export function skillLabelRu(skill) {
  if (typeof skill === "string") {
    const k = normalizeSkillKey(skill);
    return SKILL_LABELS_RU[k] || SKILL_LABELS_RU[k.replace(/\s/g, "")] || skill;
  }
  const key = normalizeSkillKey(skill?.key);
  const label = normalizeSkillKey(skill?.label);
  return (
    SKILL_LABELS_RU[key] ||
    SKILL_LABELS_RU[key.replace(/\s/g, "")] ||
    SKILL_LABELS_RU[label] ||
    SKILL_LABELS_RU[label.replace(/\s/g, "")] ||
    skill?.label ||
    skill?.key ||
    "—"
  );
}
