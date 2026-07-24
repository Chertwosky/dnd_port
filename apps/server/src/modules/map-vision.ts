import type { GridPoint, MapToken, VisibilityRule, VisionMode } from "@dnd/shared-types";

export class VisionService {
  private rule: VisibilityRule = { mode: "full" };

  setMode(mode: VisionMode, radius?: number): VisibilityRule {
    this.rule =
      mode === "radius"
        ? { mode, radius: Math.max(0, radius ?? 0) }
        : mode === "manual"
          ? { mode, revealedCells: this.rule.revealedCells ?? [] }
          : { mode };
    return this.rule;
  }

  revealCells(cells: GridPoint[]): VisibilityRule {
    if (this.rule.mode !== "manual") {
      this.rule = { mode: "manual", revealedCells: [] };
    }
    const merged = [...(this.rule.revealedCells ?? [])];
    for (const cell of cells) {
      if (!merged.some((c) => c.x === cell.x && c.y === cell.y)) {
        merged.push(cell);
      }
    }
    this.rule = { mode: "manual", revealedCells: merged };
    return this.rule;
  }

  visibleCells(gridWidth: number, gridHeight: number, playerTokens: MapToken[]): GridPoint[] {
    if (this.rule.mode === "full") {
      return enumerateGrid(gridWidth, gridHeight);
    }
    if (this.rule.mode === "manual") {
      return this.rule.revealedCells ?? [];
    }

    const radius = this.rule.radius ?? 0;
    const visible = new Map<string, GridPoint>();
    for (const token of playerTokens) {
      for (let y = 0; y < gridHeight; y += 1) {
        for (let x = 0; x < gridWidth; x += 1) {
          const cell = { x, y };
          const dist = Math.abs(token.position.x - x) + Math.abs(token.position.y - y);
          if (dist <= radius) {
            visible.set(`${x}:${y}`, cell);
          }
        }
      }
    }
    return [...visible.values()];
  }
}

function enumerateGrid(gridWidth: number, gridHeight: number): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
