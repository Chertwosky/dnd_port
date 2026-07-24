export const RealtimeEvents = {
  RoomJoined: "room.joined",
  CharacterBound: "character.bound",
  MapStateUpdated: "map.state.updated",
  VisionRuleUpdated: "vision.rule.updated",
  MonsterLibraryReady: "monster.library.ready",
  CombatHpUpdated: "combat.hp.updated"
} as const;

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
