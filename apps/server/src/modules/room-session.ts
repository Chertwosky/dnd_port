import { randomId } from "@dnd/rules-engine";
import type { Character, Role, RoomMember, RoomState } from "@dnd/shared-types";

export class RoomSessionService {
  private state: RoomState;

  constructor(masterName: string) {
    const masterId = randomId("member");
    this.state = {
      roomId: randomId("room"),
      masterId,
      members: [
        {
          id: masterId,
          name: masterName,
          role: "master",
          connectedAt: new Date().toISOString()
        }
      ],
      characters: []
    };
  }

  join(name: string): RoomMember {
    const member: RoomMember = {
      id: randomId("member"),
      name,
      role: "spectator",
      connectedAt: new Date().toISOString()
    };
    this.state.members.push(member);
    return member;
  }

  addCharacter(character: Character): Character {
    this.state.characters.push(character);
    return character;
  }

  bindCharacter(memberId: string, characterId: string): RoomMember {
    const member = this.mustFindMember(memberId);
    const character = this.state.characters.find((c) => c.id === characterId);
    if (!character) {
      throw new Error(`Character not found: ${characterId}`);
    }
    member.characterId = character.id;
    member.role = "player";
    return member;
  }

  setRole(memberId: string, role: Exclude<Role, "master">): RoomMember {
    const member = this.mustFindMember(memberId);
    if (member.id === this.state.masterId) {
      throw new Error("Master role is immutable for this room");
    }
    member.role = role;
    if (role !== "player") {
      delete member.characterId;
    }
    return member;
  }

  snapshot(): RoomState {
    return {
      ...this.state,
      members: [...this.state.members],
      characters: [...this.state.characters]
    };
  }

  private mustFindMember(memberId: string): RoomMember {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    return member;
  }
}
