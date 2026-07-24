export type Role = "master" | "player" | "spectator";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface CharacterAbility {
  score: number;
  modifier: number;
}

export interface CharacterVitals {
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  ac: number;
  speed: number;
}

export interface CharacterSkill {
  key: string;
  label: string;
  baseAbility: AbilityKey;
  proficiencyLevel: 0 | 1 | 2;
}

export interface Character {
  id: string;
  name: string;
  className: string;
  level: number;
  race: string;
  playerName: string;
  alignment: string;
  proficiencyBonus: number;
  abilities: Record<AbilityKey, CharacterAbility>;
  vitals: CharacterVitals;
  skills: CharacterSkill[];
  spellBook: string[];
  preparedSpells: string[];
  notes: string[];
}

export type VisionMode = "full" | "radius" | "manual";

export interface GridPoint {
  x: number;
  y: number;
}

export interface VisibilityRule {
  mode: VisionMode;
  radius?: number;
  revealedCells?: GridPoint[];
}

export interface MapToken {
  id: string;
  name: string;
  type: "player" | "monster" | "npc";
  hpCurrent: number;
  hpMax: number;
  position: GridPoint;
}

export interface MonsterAction {
  name: string;
  description: string;
}

export interface MonsterStatBlock {
  sourceId: string;
  sourceSite: string;
  locale: string;
  name: string;
  type: string;
  challengeRating: string;
  abilities: Record<AbilityKey, number>;
  hp: number;
  ac: number;
  speed: string;
  actions: MonsterAction[];
  translatedFrom?: string;
}

export interface CustomNpc extends Omit<MonsterStatBlock, "sourceId" | "sourceSite"> {
  id: string;
  notes?: string;
}

export interface MapTexture {
  id: string;
  label: string;
  group: "furniture" | "terrain" | "nature" | "building" | "water";
}

export interface CombatLogEntry {
  id: string;
  tokenId: string;
  delta: number;
  reason: string;
  createdAt: string;
}

export * from "./session";
