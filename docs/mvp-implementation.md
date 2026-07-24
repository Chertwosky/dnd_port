# MVP Implementation Notes

## Monorepo conventions
- Shared contracts live in `packages/shared-types`.
- Pure deterministic calculations live in `packages/rules-engine`.
- Backend modules live in `apps/server/src/modules`.
- Realtime event names are centralized in `apps/server/src/realtime/events.ts`.

## Character import (Long Story Short)
- Input is parsed as a two-stage JSON envelope (`{ data: string }`).
- Character fields are normalized into a compact `Character` model.
- Skills and notes are converted to first-class arrays.

## Map and visibility
- Supported modes: `full`, `radius`, `manual`.
- `radius` mode uses manhattan distance from each player token.
- `manual` mode stores explicit revealed cells.

## Monsters pipeline
- Providers fetch data (e.g. `dnd.su`, mirrors) in preload stage.
- Pipeline deduplicates by `sourceSite:sourceId`.
- Translation runs only for entities not already in target locale.
- Custom NPC is created with typed statblock and manual abilities/actions.

## Combat HP controls
- GM can apply quick actions `-1/-5/+1/+5`.
- All changes append entries to combat log for audit/replay.

## Master map editor
- Two layers: terrain and object.
- Default texture palette includes furniture, terrain, nature, building, water.

## Validation strategy
- Contract test: character import mapping.
- Integration tests: visibility, hp sync logic, monster preload translation.
- E2E scenario target:
  1) User joins as spectator
  2) User binds imported character
  3) GM changes visibility and HP during encounter
