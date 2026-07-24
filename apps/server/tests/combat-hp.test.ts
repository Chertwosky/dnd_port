import { describe, expect, it } from "vitest";
import { CombatHpService } from "../src/modules/combat-hp";

describe("CombatHpService", () => {
  it("applies quick hp actions and logs changes", () => {
    const service = new CombatHpService();
    service.setTokens([
      {
        id: "t1",
        name: "orc",
        type: "monster",
        hpCurrent: 20,
        hpMax: 20,
        position: { x: 0, y: 0 }
      }
    ]);
    const next = service.quickAction("t1", "-5");
    expect(next.hpCurrent).toBe(15);
    expect(service.getState().logs).toHaveLength(1);
  });
});
