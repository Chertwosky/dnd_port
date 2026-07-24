import { describe, expect, it } from "vitest";
import { RoomSessionService } from "../src/modules/room-session";

describe("RoomSessionService", () => {
  it("joins spectator and binds character as player", () => {
    const room = new RoomSessionService("GM");
    const member = room.join("Alice");
    expect(member.role).toBe("spectator");

    const character = room.addCharacter({
      id: "char_1",
      name: "Paladin",
      className: "Paladin",
      level: 3,
      race: "Human",
      playerName: "Alice",
      alignment: "NG",
      proficiencyBonus: 2,
      abilities: {
        str: { score: 15, modifier: 2 },
        dex: { score: 10, modifier: 0 },
        con: { score: 13, modifier: 1 },
        int: { score: 10, modifier: 0 },
        wis: { score: 13, modifier: 1 },
        cha: { score: 14, modifier: 2 }
      },
      vitals: { hpCurrent: 20, hpMax: 20, hpTemp: 0, ac: 18, speed: 30 },
      skills: [],
      spellBook: [],
      preparedSpells: [],
      notes: []
    });

    const bound = room.bindCharacter(member.id, character.id);
    expect(bound.role).toBe("player");
    expect(bound.characterId).toBe(character.id);
  });
});
