import type { Role } from "@dnd/shared-types";

export function resolveInitialRole(hasBoundCharacter: boolean): Role {
  if (!hasBoundCharacter) {
    return "spectator";
  }
  return "player";
}
