import { describe, expect, it } from "vitest";
import { VisionService } from "../src/modules/map-vision";

describe("VisionService", () => {
  it("reveals all cells in full mode", () => {
    const service = new VisionService();
    service.setMode("full");
    expect(service.visibleCells(2, 2, [])).toHaveLength(4);
  });

  it("applies radius for player token", () => {
    const service = new VisionService();
    service.setMode("radius", 1);
    const cells = service.visibleCells(4, 4, [
      {
        id: "p1",
        name: "player",
        type: "player",
        hpCurrent: 10,
        hpMax: 10,
        position: { x: 1, y: 1 }
      }
    ]);
    expect(cells.length).toBeGreaterThan(0);
  });
});
