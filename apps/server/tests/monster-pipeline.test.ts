import { describe, expect, it } from "vitest";
import { MonsterPipeline } from "../src/modules/monster-pipeline";

describe("MonsterPipeline", () => {
  it("preloads and translates external monsters", async () => {
    const pipeline = new MonsterPipeline(
      [
        {
          sourceSite: "dnd.su",
          async fetchAll() {
            return [
              {
                sourceId: "goblin-1",
                sourceSite: "dnd.su",
                locale: "en",
                name: "Goblin",
                type: "humanoid",
                challengeRating: "1/4",
                abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
                hp: 7,
                ac: 15,
                speed: "30 ft",
                actions: [{ name: "Scimitar", description: "Melee attack" }]
              }
            ];
          }
        }
      ],
      {
        async translateText(input: string, targetLocale: string) {
          return `${input}_${targetLocale}`;
        }
      }
    );

    const monsters = await pipeline.preloadMonsters("ru");
    expect(monsters[0].locale).toBe("ru");
    expect(monsters[0].name).toContain("ru");
  });
});
