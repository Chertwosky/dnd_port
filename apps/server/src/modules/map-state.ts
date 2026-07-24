import type { GridPoint, MapToken } from "@dnd/shared-types";
import { randomId } from "@dnd/rules-engine";

export interface BattleMapState {
  id: string;
  width: number;
  height: number;
  tokens: MapToken[];
}

export class MapStateService {
  private state: BattleMapState;

  constructor(width: number, height: number) {
    this.state = {
      id: randomId("battlemap"),
      width,
      height,
      tokens: []
    };
  }

  addToken(token: Omit<MapToken, "id">): MapToken {
    const result = { ...token, id: randomId("token") };
    this.state.tokens.push(result);
    return result;
  }

  moveToken(tokenId: string, position: GridPoint): MapToken {
    const token = this.mustFindToken(tokenId);
    token.position = this.clampToMap(position);
    return token;
  }

  removeToken(tokenId: string): void {
    this.state.tokens = this.state.tokens.filter((t) => t.id !== tokenId);
  }

  getState(): BattleMapState {
    return {
      ...this.state,
      tokens: [...this.state.tokens]
    };
  }

  private mustFindToken(tokenId: string): MapToken {
    const token = this.state.tokens.find((t) => t.id === tokenId);
    if (!token) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    return token;
  }

  private clampToMap(position: GridPoint): GridPoint {
    return {
      x: Math.max(0, Math.min(position.x, this.state.width - 1)),
      y: Math.max(0, Math.min(position.y, this.state.height - 1))
    };
  }
}
