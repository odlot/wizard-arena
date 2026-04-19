# TODO — Wizard Arena

Agents pick work from the **Backlog** below. Before starting, check `gh pr list` to confirm no one else is already on it. When you finish a task, mark it done and move it to **Done**.

For the MVP feature branches and their dependencies, see `PLAN.md`.

---

## In Progress

| Branch / Task | PR | Status |
|---|---|---|
| `feat/game-logic` — `game.js` | [#2](https://github.com/odlot/wizard-arena/pull/2) | Review comments addressed, awaiting approval |
| `feat/server-http` — `server.js` HTTP serving | [#3](https://github.com/odlot/wizard-arena/pull/3) | Changes requested (path traversal fix needed) |
| `feat/beamer-view` — `index.html` + `game-client.js` | [#4](https://github.com/odlot/wizard-arena/pull/4) | Open, not yet reviewed |

---

## Backlog

### MVP — must merge before launch

- [ ] **`feat/phone-controller`** — implement `public/controller.html` + `public/controller.js` (D-pad + shoot button, WebSocket input, HP display). No open PR yet.
- [ ] **`feat/server-ws`** — add WebSocket server + game loop to `server.js`. Blocked until `feat/game-logic` and `feat/server-http` are both merged.
- [ ] **Review `feat/beamer-view` (PR #4)** — no review posted yet.

### Improvements — not required for MVP

- [ ] **`MAX_PLAYERS` fragility in `game.js`** — start positions are hardcoded for exactly 4 entries. If `MAX_PLAYERS` is ever changed, `startPositions[i]` silently becomes `undefined`. Either derive positions programmatically or guard with `Math.min(MAX_PLAYERS, startPositions.length)`.
- [ ] **Dead slot policy in `addPlayer`** — currently a dead wizard's slot is permanently unavailable to late-joining players. Intentional for now but worth a explicit decision before `feat/server-ws` is wired up.
- [ ] **Port not in `settings.js`** — `server.js` hardcodes `PORT = 3000`. Low priority, but centralising it in `settings.js` would be consistent.
- [ ] **Respawn / new round** — after `status` reaches `"win"` or `"over"`, the game freezes. No reset mechanism exists. A restart button or auto-reset timer would improve playability.
- [ ] **Beamer: show player labels** — controller phones could display their wizard colour/number so players know which wizard they control.
- [ ] **Sound effects** — browser `AudioContext` blip on shoot/hit; no extra dependencies needed.
- [ ] **Mobile layout polish** — controller D-pad sizing and touch target sizes for varied phone screen sizes.

---

## Done

- [x] **`feat/foundation`** — `settings.js`, `package.json`, `.gitignore`, `package-lock.json` (merged)
