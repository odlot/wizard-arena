# RESEARCH.md — Bug Analysis & Feature Design

## Bug 1: Game starts immediately, no time for players to connect

### Root cause

`game.js` `Game` constructor sets `this.status = 'playing'` immediately. There is no lobby or waiting state.

The previous hotfix added `if (wss.clients.size > 0) game.update(dt)` to `server.js`, which was intended to pause the game when nobody is watching. But the **beamer itself is a WebSocket client**: the moment `localhost:3000` is opened in the browser, a WebSocket connection is established, `wss.clients.size` becomes `1`, and `game.update()` starts firing at 60 fps. By the time a player navigates to `/controller` on their phone, the AI wizards have already been fighting for seconds.

### Fix design

Add a `"waiting"` status to `game.js`. The game only transitions `"waiting"` → `"playing"` after a configurable countdown (`GAME_START_DELAY` in `settings.js`, default 10 seconds).

- `game.status` starts as `"waiting"`, `game.countdown` starts at `GAME_START_DELAY`
- `game.update(dt)` when `status === 'waiting'`: decrement `countdown`. When it hits 0, set `status = 'playing'`
- `getState()` includes `countdown` so the beamer can display it
- `game-client.js` draws a "Starting in N…" overlay during `"waiting"`
- The `wss.clients.size > 0` guard in `server.js` can be removed — the countdown inside the game is the correct gate

New setting: `GAME_START_DELAY: 10`

---

## Bug 2: No way to restart after game over

### Root cause

`game.js` `update()` has `if (this.status !== 'playing') return` at the top. Once `status` reaches `"win"` or `"over"`, the method is a permanent no-op. There is no `reset()` method and nothing in `server.js` to trigger one. `controller.js` also has no handling for a new round — the `dead` CSS class is never removed.

### Fix design

Add `Game.reset()` which:
- Recreates all 4 `Wizard` instances at start positions
- Clears `this.bolts` and `this.inputs`
- Sets `status = 'waiting'` and `countdown = GAME_START_DELAY`
- Preserves `_socketToWizard` so connected players automatically reclaim their slots in the new round (calls `addPlayer` again for each mapped socket)

`server.js`: in the `setInterval`, after broadcasting, check if `game.status` just transitioned to `"win"` or `"over"`. Use a `setTimeout(GAME_RESTART_DELAY * 1000, game.reset)` to schedule the reset. Track a `resetScheduled` flag to avoid scheduling it multiple times.

`controller.js`: on receiving a `state` message with a new `"waiting"` status after being in `"over"/"win"`, remove the `dead` class and re-enable controls.

New setting: `GAME_RESTART_DELAY: 5`

---

## Feature: Controller orientation detection

### Can vanilla JS detect orientation? Yes.

Two reliable APIs, no libraries needed:

**`window.matchMedia('(orientation: landscape)')`** — the most robust cross-browser approach. Works in all modern mobile browsers (Chrome Android, Safari iOS, Firefox). Returns a `MediaQueryList` whose `.matches` is `true` when in landscape. Fires a `change` event on rotation.

**`screen.orientation.type`** — returns `"landscape-primary"`, `"landscape-secondary"`, `"portrait-primary"`, `"portrait-secondary"`. The `screen.orientation` object fires a `change` event. Widely supported but has slight gaps on older iOS Safari (where `matchMedia` is more reliable).

**`window.orientationchange`** — deprecated event, still works but `matchMedia` is preferred.

### Recommended approach

Use `matchMedia` for detection + CSS class toggle. No flip button needed.

```js
const mql = window.matchMedia('(orientation: landscape)');
function applyOrientation() {
  document.body.classList.toggle('landscape', mql.matches);
}
mql.addEventListener('change', applyOrientation);
applyOrientation(); // apply on load
```

### Layout design

**Portrait** (current layout — unchanged):
- Info bar (label + HP) at top
- D-pad + shoot button centered below, stacked column

**Landscape** (new `body.landscape` CSS):
- Info bar shrinks to a slim strip at top
- D-pad on the far left, shoot button on the far right
- Both vertically centered, filling available height
- Use `flex-direction: row` with `justify-content: space-between`

This means only CSS changes are needed for landscape; the JS event handler just toggles a class.

---

## Files affected

| File | Changes |
|---|---|
| `settings.js` | Add `GAME_START_DELAY: 10`, `GAME_RESTART_DELAY: 5` |
| `game.js` | Add `"waiting"` status + `countdown` field; `update()` handles countdown tick; add `reset()` method; `getState()` includes `countdown` |
| `server.js` | Remove `wss.clients.size > 0` guard (countdown replaces it); add auto-reset scheduling after game-over |
| `public/game-client.js` | Draw "Starting in N…" overlay when `status === 'waiting'`; update `drawOverlay` to handle all non-playing states |
| `public/controller.html` | Add landscape CSS (`body.landscape` layout rules) |
| `public/controller.js` | Add `matchMedia` orientation detection + class toggle; handle `"waiting"` state reset (remove `dead` class, re-enable controls) |
