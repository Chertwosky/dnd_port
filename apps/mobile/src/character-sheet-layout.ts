import type { Character } from "@dnd/shared-types";

export interface CharacterSheetSection {
  id: string;
  title: string;
  lines: string[];
}

export function buildCharacterSheetSections(character: Character): CharacterSheetSection[] {
  return [
    {
      id: "overview",
      title: "Overview",
      lines: [
        `${character.name} (${character.className} ${character.level})`,
        `Race: ${character.race}`,
        `Alignment: ${character.alignment}`
      ]
    },
    {
      id: "combat",
      title: "Combat",
      lines: [
        `HP: ${character.vitals.hpCurrent}/${character.vitals.hpMax}`,
        `Temp HP: ${character.vitals.hpTemp}`,
        `AC: ${character.vitals.ac}`
      ]
    },
    {
      id: "spells",
      title: "Spells",
      lines: character.preparedSpells.length > 0 ? character.preparedSpells : ["No prepared spells"]
    },
    {
      id: "notes",
      title: "Notes",
      lines: character.notes.length > 0 ? character.notes : ["No notes"]
    }
  ];
}
