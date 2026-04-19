# TODO — Wizard Arena

Agents pick work from the **Backlog** below. Before starting, check `gh pr list` to confirm no one else is already on it. When you finish a task, mark it done and move it to **Done**.

For the MVP feature branches and their dependencies, see `PLAN.md`.

---

## In Progress

| Branch / Task | PR | Status |
|---|---|---|

---

## Backlog

### Bug fixes & features (required before next playtest)

See `RESEARCH.md` for full root-cause analysis and fix design.

- [ ] **`feat/lobby-and-restart`** — waiting state, auto-reset, orientation layout. PR [#7](https://github.com/odlot/wizard-arena/pull/7) open, awaiting review.
- [ ] **`feat/vote-to-start`** *(stacked on #7)* — vote-gated 5s countdown; READY button on controller; beamer shows "X/Y players ready". PR [#8](https://github.com/odlot/wizard-arena/pull/8) open, awaiting review. **Merge after #7.**

### Improvements — not required for next playtest

- [ ] **`MAX_PLAYERS` fragility in `game.js`** — start positions are hardcoded for exactly 4 entries. If `MAX_PLAYERS` is ever changed, `startPositions[i]` silently becomes `undefined`. Either derive positions programmatically or guard with `Math.min(MAX_PLAYERS, startPositions.length)`.
- [ ] **Dead slot policy in `addPlayer`** — currently a dead wizard's slot is permanently unavailable to late-joining players. Intentional for now but worth an explicit decision.
- [ ] **Port not in `settings.js`** — `server.js` hardcodes `PORT = 3000`. Low priority, but centralising it in `settings.js` would be consistent.
- [ ] **Beamer: show player labels** — controller phones could display their wizard colour/number so players know which wizard they control.
- [ ] **Sound effects** — browser `AudioContext` blip on shoot/hit; no extra dependencies needed.
- [ ] **Mobile layout polish** — controller D-pad sizing and touch target sizes for varied phone screen sizes.

---

## Done

- [x] **`feat/foundation`** — `settings.js`, `package.json`, `.gitignore`, `package-lock.json` (merged)
- [x] **`feat/game-logic`** — `game.js`: Game, Wizard, FireBolt, AI logic (merged via PR #2)
- [x] **`feat/server-http`** — `server.js` HTTP static file serving with path traversal guard (merged via PR #3)
- [x] **`feat/beamer-view`** — `public/index.html` + `public/game-client.js`: canvas renderer, WebSocket state consumer (merged via PR #4)
- [x] **`feat/server-ws`** — WebSocket server + game loop wired into `server.js` (merged via PR #6)
- [x] **`feat/phone-controller`** — `public/controller.html` + `public/controller.js`: D-pad, shoot button, HP bar, spectator fallback (merged via PR #5)
