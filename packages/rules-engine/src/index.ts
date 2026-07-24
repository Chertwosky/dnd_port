import type { CombatLogEntry, GridPoint, MapToken, VisibilityRule } from "@dnd/shared-types";
import { randomId } from "./id";

export { randomId } from "./id";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function clampHp(hpCurrent: number, hpMax: number): number {
  return Math.max(0, Math.min(hpCurrent, hpMax));
}

export function applyHpDelta(token: MapToken, delta: number, reason: string): { token: MapToken; log: CombatLogEntry } {
  const nextHp = clampHp(token.hpCurrent + delta, token.hpMax);
  return {
    token: { ...token, hpCurrent: nextHp },
    log: {
      id: randomId("combat"),
      tokenId: token.id,
      delta,
      reason,
      createdAt: new Date().toISOString()
    }
  };
}

export function isCellVisible(cell: GridPoint, token: MapToken, rule: VisibilityRule): boolean {
  if (rule.mode === "full") {
    return true;
  }
  if (rule.mode === "manual") {
    return (rule.revealedCells ?? []).some((c) => c.x === cell.x && c.y === cell.y);
  }

  const radius = rule.radius ?? 0;
  const dx = Math.abs(cell.x - token.position.x);
  const dy = Math.abs(cell.y - token.position.y);
  return dx + dy <= radius;
}
