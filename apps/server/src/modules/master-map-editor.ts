import type { GridPoint, MapTexture } from "@dnd/shared-types";
import { randomId } from "@dnd/rules-engine";

export interface MapObject {
  id: string;
  textureId: string;
  position: GridPoint;
}

export interface MapScene {
  id: string;
  name: string;
  width: number;
  height: number;
  terrainLayer: Record<string, string>;
  objectLayer: MapObject[];
}

export const defaultTexturePalette: MapTexture[] = [
  { id: "table", label: "Table", group: "furniture" },
  { id: "chair", label: "Chair", group: "furniture" },
  { id: "stairs", label: "Stairs", group: "building" },
  { id: "chest", label: "Chest", group: "furniture" },
  { id: "grass", label: "Grass", group: "nature" },
  { id: "stone", label: "Stone", group: "terrain" },
  { id: "window", label: "Window", group: "building" },
  { id: "river", label: "River", group: "water" }
];

export class MasterMapEditorService {
  createScene(name: string, width: number, height: number): MapScene {
    return {
      id: randomId("scene"),
      name,
      width,
      height,
      terrainLayer: {},
      objectLayer: []
    };
  }

  paintTerrain(scene: MapScene, cell: GridPoint, textureId: string): MapScene {
    return {
      ...scene,
      terrainLayer: {
        ...scene.terrainLayer,
        [key(cell)]: textureId
      }
    };
  }

  placeObject(scene: MapScene, textureId: string, cell: GridPoint): MapScene {
    return {
      ...scene,
      objectLayer: [
        ...scene.objectLayer,
        {
          id: randomId("obj"),
          textureId,
          position: cell
        }
      ]
    };
  }

  removeObject(scene: MapScene, objectId: string): MapScene {
    return {
      ...scene,
      objectLayer: scene.objectLayer.filter((obj) => obj.id !== objectId)
    };
  }
}

function key(cell: GridPoint): string {
  return `${cell.x}:${cell.y}`;
}
