import { abilityModifier } from "@dnd/rules-engine";
import { randomId } from "@dnd/rules-engine";
import type { AbilityKey, Character, CharacterSkill } from "@dnd/shared-types";

type LongStoryShortSkill = {
  baseStat: AbilityKey;
  label: string;
  isProf: 0 | 1 | 2;
};

export function importCharacterFromLongStoryShort(rawFileContent: string): Character {
  const envelope = JSON.parse(rawFileContent) as { data: string };
  const parsed = JSON.parse(envelope.data) as any;

  const abilities: Record<AbilityKey, { score: number; modifier: number }> = {
    str: normalizedAbility(parsed.stats.str.score),
    dex: normalizedAbility(parsed.stats.dex.score),
    con: normalizedAbility(parsed.stats.con.score),
    int: normalizedAbility(parsed.stats.int.score),
    wis: normalizedAbility(parsed.stats.wis.score),
    cha: normalizedAbility(parsed.stats.cha.score)
  };

  const skills = mapSkills(parsed.skills ?? {});
  const notes = extractNotes(parsed);

  return {
    id: randomId("character"),
    name: parsed.name?.value ?? "Unknown",
    className: parsed.info?.charClass?.value ?? "",
    level: Number(parsed.info?.level?.value ?? 1),
    race: parsed.info?.race?.value ?? "",
    playerName: parsed.info?.playerName?.value ?? "",
    alignment: parsed.info?.alignment?.value ?? "",
    proficiencyBonus: Number(parsed.proficiency ?? 2),
    abilities,
    vitals: {
      hpCurrent: Number(parsed.vitality?.["hp-current"]?.value ?? 0),
      hpMax: Number(parsed.vitality?.["hp-max"]?.value ?? 0),
      hpTemp: Number(parsed.vitality?.["hp-temp"]?.value ?? 0),
      ac: Number(parsed.vitality?.ac?.value ?? 10),
      speed: Number(parsed.vitality?.speed?.value ?? 30)
    },
    skills,
    spellBook: (parsed.spells?.book ?? []).map(String),
    preparedSpells: (parsed.spells?.prepared ?? []).map(String),
    notes
  };
}

function normalizedAbility(score: number) {
  const scoreNum = Number(score ?? 10);
  return { score: scoreNum, modifier: abilityModifier(scoreNum) };
}

function mapSkills(rawSkills: Record<string, LongStoryShortSkill>): CharacterSkill[] {
  return Object.entries(rawSkills).map(([key, skill]) => ({
    key,
    label: skill.label,
    baseAbility: skill.baseStat,
    proficiencyLevel: skill.isProf
  }));
}

function extractNotes(parsed: any): string[] {
  const noteKeys = ["notes-1", "notes-2", "notes-3", "notes-4", "notes-5", "notes-6"];
  return noteKeys
    .map((k) => parsed.text?.[k]?.value?.data)
    .map((data) => normalizeNote(data))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizeNote(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  if (!data || typeof data !== "object") {
    return "";
  }

  const content = (data as { content?: unknown[] }).content;
  if (!Array.isArray(content)) {
    return "";
  }

  const chunks: string[] = [];
  for (const node of content) {
    const parts = (node as { content?: unknown[] }).content;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        chunks.push(text.trim());
      }
    }
  }
  return chunks.join("\n");
}
