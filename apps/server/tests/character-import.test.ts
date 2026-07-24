import { describe, expect, it } from "vitest";
import { importCharacterFromLongStoryShort } from "../src/modules/character-import";

describe("importCharacterFromLongStoryShort", () => {
  it("maps vitals and metadata from envelope payload", () => {
    const file = JSON.stringify({
      data: JSON.stringify({
        name: { value: "Игнорина" },
        info: {
          charClass: { value: "Паладин" },
          level: { value: 3 },
          race: { value: "Человек" },
          playerName: { value: "Игнорина Рамондо" },
          alignment: { value: "Нейтральный добрый" }
        },
        proficiency: 2,
        stats: {
          str: { score: 15 },
          dex: { score: 10 },
          con: { score: 13 },
          int: { score: 10 },
          wis: { score: 13 },
          cha: { score: 14 }
        },
        skills: {
          perception: { baseStat: "wis", label: "Внимательность", isProf: 1 }
        },
        vitality: {
          "hp-current": { value: 25 },
          "hp-max": { value: 25 },
          "hp-temp": { value: 0 },
          ac: { value: 18 },
          speed: { value: 30 }
        },
        spells: { book: ["command"], prepared: ["command"] },
        text: { "notes-1": { value: { data: "note A" } } }
      })
    });

    const character = importCharacterFromLongStoryShort(file);
    expect(character.name).toBe("Игнорина");
    expect(character.className).toBe("Паладин");
    expect(character.vitals.hpCurrent).toBe(25);
    expect(character.abilities.str.modifier).toBe(2);
    expect(character.skills).toHaveLength(1);
  });
});
