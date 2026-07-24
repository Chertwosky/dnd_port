# UX/UI Clickable MVP Spec

## 1) IA and user flows

### Master (desktop)
1. Open `prototype/master`.
2. Preload monsters.
3. Add player and monster tokens to map.
4. Switch vision mode (`full/radius/manual`), set radius, apply.
5. Adjust HP in combat panel (`-1/-5/+1/+5`).
6. Create custom NPC and review right/left panels.

### Player (mobile)
1. Open `prototype/player` as spectator in lobby.
2. Go to bind screen.
3. Import or select a character.
4. Bind character and auto-transition to combat view.
5. Observe map visibility updates and sheet tabs (`Combat/Actions/Spells/Notes`).

## 2) Desktop workspace decisions
- Three-column workspace:
  - left: monster library + custom NPC + token add form,
  - center: map and vision toolbar,
  - right: combat HP panel and compact log.
- Vision controls keep top-level exposure because they are high-frequency GM actions.
- Token actions are attached near combat rows to reduce context switching.

## 3) Mobile UX decisions
- Spectator-first lobby avoids dead-end for users without character.
- Bind/import is isolated to avoid clutter in combat HUD.
- Combat view prioritizes map area; sheet actions stay in a bottom card with tabs.
- Buttons and tap zones are sized for touch usage and fast actions.

## 4) API binding map
- `POST /characters/import`: import raw Long Story Short JSON.
- `GET /characters`: populate select list on player bind screen.
- `POST /map/tokens`: master creates tokens.
- `GET /map/vision`: both master and player map render.
- `PUT /map/vision`: master changes visibility rules and manual reveal.
- `POST /combat/hp`: quick HP adjustments and logging.
- `POST /monsters/preload`, `GET /monsters`: populate monster panel.
- `POST /npc/custom`, `GET /npc`: custom NPC panel.

## 5) Error/loading states in prototype
- JSON parse/import errors shown inline on player bind screen.
- Empty lists show neutral placeholders (`No characters yet`, `not loaded`).
- HTTP non-200 returns mapped to text error for quick debugging.

## 6) Usability quick-check script (30-45 min)

### Tasks
1. Player: join as spectator and become player with character bind in under 60 sec.
2. GM: add 2 tokens and apply `radius=3` visibility in under 30 sec.
3. GM: reduce monster HP by `-5` and verify log appears.
4. GM: switch to manual reveal sample and confirm player map changes.

### Metrics
- Time-to-first-combat-view (player).
- Mis-tap count per flow (mobile).
- Time-to-vision-change (GM).
- Time-to-HP-update (GM).
- Number of confusion events (user asks "where to click?").
