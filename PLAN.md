# Wizard Arena — Plan

## Goal

Top-down 2D wizard arena game. 4 wizards fight until one remains. Win condition: last wizard standing.

Players join via smartphone browser. The game view is shown on a beamer. Unoccupied wizard slots are AI-controlled. When a player connects they take over a wizard; when they disconnect that wizard reverts to AI.

## Core Rules

- 4 wizards total (configurable via `MAX_PLAYERS` in `settings.js`)
- Wizards have **5 hit points**
- One spell: **Fire Bolt** — projectile, deals **1 damage** per hit, fires in last movement direction
- If the wizard has not moved yet, it faces right by default

## Technology

- **Node.js** (no framework) + **`ws`** package (WebSocket server only)
- Plain HTML + Canvas 2D API — no build step, no bundler
- Run with: `node server.js`
- Players open `http://<server-ip>:3000/controller` on their phones
- Beamer opens `http://<server-ip>:3000/` 

## File Structure

```
wizard-arena/
  server.js            # HTTP (serves public/) + WebSocket server + game loop
  game.js              # Game, Wizard, FireBolt — pure logic, no I/O
  settings.js          # All constants
  public/
    index.html         # Beamer view (full-screen canvas)
    game-client.js     # Connects via WS, renders state on canvas
    controller.html    # Phone controller UI (D-pad + shoot button)
    controller.js      # Connects via WS, sends input events
  package.json
  PLAN.md
```

## Settings (`settings.js`)

```js
module.exports = {
  FPS: 60,
  ARENA_WIDTH: 800, ARENA_HEIGHT: 600, ARENA_MARGIN: 40,
  MAX_PLAYERS: 4,
  WIZARD_MAX_HP: 5, WIZARD_SPEED: 150, WIZARD_RADIUS: 18,
  FIREBOLT_SPEED: 300, FIREBOLT_DAMAGE: 1, FIREBOLT_COOLDOWN: 0.5, FIREBOLT_RADIUS: 6,
  COLORS: ['#4488ff', '#ff4444', '#44cc44', '#ffaa00'],
};
```

## Game Logic (`game.js`)

### `Wizard`
- `id`, `x`, `y`, `hp`, `alive`, `isAI`, `facing` (`{dx,dy}`, default `{dx:1,dy:0}`)
- `cooldown` — seconds remaining until next shot
- `update(dt)` — ticks cooldown
- `move(dx, dy, dt)` — normalizes direction, applies speed, clamps to arena; updates `facing` if direction non-zero
- `shoot()` → `FireBolt | null` — fires in `facing` direction if `cooldown <= 0`
- `takeDamage(amount)` — decrements hp; sets `alive = false` at 0

### `FireBolt`
- `x`, `y`, `vx`, `vy`, `ownerId`, `active`
- `update(dt)` — moves by velocity×dt; sets `active = false` if outside arena floor

### `Game`
- `wizards` — array of 4 Wizards, all start as AI
- `bolts` — array of active FireBolts
- `status` — `"playing"` | `"win"` | `"over"`
- `inputs` — `Map<wizardId, {dx, dy, shoot}>` — latest input per player-controlled wizard
- `addPlayer(socketId)` → `wizardId | null` — assigns first free slot, marks `isAI = false`
- `removePlayer(socketId)` — reverts wizard to AI
- `setInput(wizardId, input)` — stores input for next tick
- `update(dt)` — full tick (see game loop below)
- `getState()` → serialisable snapshot for broadcast

## Server (`server.js`)

- Creates `http.createServer` that serves files from `public/` by extension-based MIME type
- Attaches `ws.Server` to the same HTTP server
- On WebSocket `connection`: calls `game.addPlayer(socket.id)`, sends `{type:"joined", wizardId}`
- On WebSocket `message`: calls `game.setInput(wizardId, input)`
- On WebSocket `close`: calls `game.removePlayer(socket.id)`
- Game loop: `setInterval` at `1000/FPS` ms; calls `game.update(dt)`; broadcasts `{type:"state", ...game.getState()}` to all clients

## WebSocket Protocol

### Server → all clients (every tick)
```json
{ "type": "state", "wizards": [...], "bolts": [...], "status": "playing" }
```
Wizard fields: `{ id, x, y, hp, alive, isAI, color }`  
Bolt fields: `{ x, y }`

### Server → joining phone (once on connect)
```json
{ "type": "joined", "wizardId": 2 }
```

### Phone → server (on input change)
```json
{ "type": "input", "dx": -1, "dy": 0, "shoot": true }
```
`dx`/`dy` are `-1`, `0`, or `1`. Sent on button press/release, not every frame.

## Game Loop (`game.update(dt)`)

```
1. For each player-controlled wizard: apply stored input (move + maybe shoot)
2. For each AI wizard: compute direction to nearest living wizard, move + shoot
3. Update all bolt positions; deactivate out-of-bounds bolts
4. Collision: for each active bolt × each living wizard (skip owner):
     if distance < WIZARD_RADIUS + FIREBOLT_RADIUS: takeDamage, deactivate bolt
5. Cull inactive bolts
6. Check status:
     living = wizards.filter(w => w.alive)
     if living.length === 1: status = "win" (last one standing shown on beamer)
     if living.length === 0: status = "over" (draw)
```

## AI Behavior

Simple aggression (open arena, no pathfinding needed):
1. Find nearest living wizard that is not self
2. `wizard.move(dx, dy, dt)` toward that target
3. `wizard.shoot()` every frame — cooldown in `shoot()` limits fire rate naturally

## Phone Controller (`controller.html` / `controller.js`)

- 4 direction buttons (up / down / left / right) — `touchstart` sets flag, `touchend` clears it
- 1 shoot button — `touchstart`/`touchend`
- On any button state change: send `{type:"input", dx, dy, shoot}` via WebSocket
- Shows own wizard's HP; greys out if wizard is dead

## Beamer View (`index.html` / `game-client.js`)

Renders on `requestAnimationFrame` using latest state received via WebSocket.

Rendering order (back to front):
1. Arena floor (filled rect), then walls (4 border strips)
2. Wizards — filled circle in player color + HP bar above + player-number label
3. Fire bolts — small filled circle
4. Win/over overlay text if `status !== "playing"`

## Feature Branches

Development is split into branches that can be worked on concurrently where dependencies allow.

```
feat/foundation  (settings.js + package.json — everything else depends on this)
       │
       ├──────────────────────────────────────────┐
       ▼                                          ▼
feat/game-logic                          feat/server-http
(game.js — pure logic)                   (server.js HTTP only, no WS)
       │                                          │
       └──────────────┬───────────────────────────┘
                      ▼
               feat/server-ws
               (add WebSocket + game loop to server.js)
```

`feat/beamer-view` and `feat/phone-controller` can also start after `feat/foundation` — the WebSocket protocol is fully specified below, so the client code can be written without a running server. Full testing requires `feat/server-ws` to be merged first.

| Branch | Files | Depends on | Parallel with |
|---|---|---|---|
| `feat/foundation` | `settings.js`, `package.json` | — | nothing |
| `feat/game-logic` | `game.js` | foundation | server-http, beamer-view, phone-controller |
| `feat/server-http` | `server.js` (HTTP only) | foundation | game-logic, beamer-view, phone-controller |
| `feat/beamer-view` | `public/index.html`, `public/game-client.js` | foundation | game-logic, server-http, phone-controller |
| `feat/phone-controller` | `public/controller.html`, `public/controller.js` | foundation | game-logic, server-http, beamer-view |
| `feat/server-ws` | `server.js` (add WS + game loop) | game-logic + server-http | — |

**Merge order:** foundation → (game-logic, server-http, beamer-view, phone-controller in any order) → server-ws

## Implementation Order

1. `settings.js` → verify: `node -e "require('./settings')"` prints no error
2. `game.js` → verify: `node -e "const {Game}=require('./game'); const g=new Game(); g.update(0.016); console.log(JSON.stringify(g.getState()))"` logs 4 wizards, 0 bolts
3. `server.js` (HTTP static serving only, no WS yet) → verify: `curl localhost:3000/` returns `index.html` content
4. `public/index.html` + `game-client.js` (stub — just opens WS, logs messages) → verify: page loads in browser without console errors
5. Add WebSocket to `server.js` + game loop broadcast → verify: browser console logs state messages at ~60/s
6. `game-client.js` (full canvas rendering) → verify: beamer shows arena + 4 AI wizards fighting
7. `public/controller.html` + `controller.js` → verify: phone connects, `joined` message received, button presses reach server log
8. Wire `setInput` in server + player takeover in `game.js` → verify: phone D-pad moves the assigned wizard on the beamer
