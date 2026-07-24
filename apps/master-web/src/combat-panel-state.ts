import type { MapToken } from "@dnd/shared-types";

export interface CombatPanelRow {
  tokenId: string;
  title: string;
  hpLabel: string;
  controls: Array<"-1" | "-5" | "+1" | "+5">;
}

export function buildCombatPanelRows(tokens: MapToken[]): CombatPanelRow[] {
  return tokens.map((token) => ({
    tokenId: token.id,
    title: `${token.name} (${token.type})`,
    hpLabel: `${token.hpCurrent}/${token.hpMax}`,
    controls: ["-1", "-5", "+1", "+5"]
  }));
}
