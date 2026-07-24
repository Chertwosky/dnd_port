import { applyHpDelta } from "@dnd/rules-engine";
import type { CombatLogEntry, MapToken } from "@dnd/shared-types";

export class CombatHpService {
  private tokens = new Map<string, MapToken>();
  private logs: CombatLogEntry[] = [];

  setTokens(tokens: MapToken[]): void {
    this.tokens.clear();
    for (const token of tokens) {
      this.tokens.set(token.id, token);
    }
  }

  applyDelta(tokenId: string, delta: number, reason = "manual"): MapToken {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    const result = applyHpDelta(token, delta, reason);
    this.tokens.set(tokenId, result.token);
    this.logs.push(result.log);
    return result.token;
  }

  quickAction(tokenId: string, action: "-1" | "-5" | "+1" | "+5"): MapToken {
    const deltas: Record<string, number> = { "-1": -1, "-5": -5, "+1": 1, "+5": 5 };
    return this.applyDelta(tokenId, deltas[action], `quick:${action}`);
  }

  getState(): { tokens: MapToken[]; logs: CombatLogEntry[] } {
    return {
      tokens: [...this.tokens.values()],
      logs: this.logs
    };
  }
}
