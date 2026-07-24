import type { Character, Role } from "./index";

export interface RoomMember {
  id: string;
  name: string;
  role: Role;
  characterId?: string;
  connectedAt: string;
}

export interface RoomState {
  roomId: string;
  masterId: string;
  members: RoomMember[];
  characters: Character[];
}
