import type { VisionMode } from "@dnd/shared-types";

export interface MasterDashboardState {
  selectedVisionMode: VisionMode;
  selectedRadius: number;
}

export function defaultMasterDashboardState(): MasterDashboardState {
  return {
    selectedVisionMode: "full",
    selectedRadius: 3
  };
}
