import { describe, expect, it } from "vitest";
import { MapStateService } from "../src/modules/map-state";

describe("MapStateService", () => {
  it("adds and moves token in map bounds", () => {
    const service = new MapStateService(10, 10);
    const token = service.addToken({
      name: "Hero",
      type: "player",
      hpCurrent: 10,
      hpMax: 10,
      position: { x: 1, y: 1 }
    });

    const moved = service.moveToken(token.id, { x: 50, y: -3 });
    expect(moved.position.x).toBe(9);
    expect(moved.position.y).toBe(0);
  });
});
