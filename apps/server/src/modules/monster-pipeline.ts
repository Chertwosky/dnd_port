import type { AbilityKey, CustomNpc, MonsterStatBlock } from "@dnd/shared-types";
import { randomId } from "@dnd/rules-engine";

export interface MonsterProvider {
  sourceSite: string;
  fetchAll(): Promise<MonsterStatBlock[]>;
}

export interface Translator {
  translateText(input: string, targetLocale: string): Promise<string>;
}

export class MonsterPipeline {
  constructor(
    private providers: MonsterProvider[],
    private translator: Translator
  ) {}

  async preloadMonsters(targetLocale = "ru"): Promise<MonsterStatBlock[]> {
    const datasets = await Promise.all(this.providers.map((p) => p.fetchAll()));
    const merged = datasets.flat();
    const deduped = deduplicate(merged);

    const translated: MonsterStatBlock[] = [];
    for (const monster of deduped) {
      if (monster.locale === targetLocale) {
        translated.push(monster);
        continue;
      }
      translated.push(await this.translateMonster(monster, targetLocale));
    }
    return translated;
  }

  createCustomNpc(input: {
    name: string;
    type: string;
    challengeRating: string;
    hp: number;
    ac: number;
    speed: string;
    abilities: Record<AbilityKey, number>;
    actions: Array<{ name: string; description: string }>;
    notes?: string;
  }): CustomNpc {
    return {
      id: randomId("npc"),
      locale: "ru",
      name: input.name,
      type: input.type,
      challengeRating: input.challengeRating,
      hp: input.hp,
      ac: input.ac,
      speed: input.speed,
      abilities: input.abilities,
      actions: input.actions,
      notes: input.notes
    };
  }

  private async translateMonster(monster: MonsterStatBlock, targetLocale: string): Promise<MonsterStatBlock> {
    const translatedName = await this.translator.translateText(monster.name, targetLocale);
    const translatedType = await this.translator.translateText(monster.type, targetLocale);
    const actions = await Promise.all(
      monster.actions.map(async (action) => ({
        name: await this.translator.translateText(action.name, targetLocale),
        description: await this.translator.translateText(action.description, targetLocale)
      }))
    );
    return {
      ...monster,
      locale: targetLocale,
      name: translatedName,
      type: translatedType,
      actions,
      translatedFrom: monster.locale
    };
  }
}

function deduplicate(monsters: MonsterStatBlock[]): MonsterStatBlock[] {
  const map = new Map<string, MonsterStatBlock>();
  for (const monster of monsters) {
    map.set(`${monster.sourceSite}:${monster.sourceId}`, monster);
  }
  return [...map.values()];
}
