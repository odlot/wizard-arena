# CLAUDE.md — Wizard Arena

## Project overview

Top-down 2D multiplayer wizard arena. Players join via smartphone browser; the game view is shown on a beamer. Up to 4 players; empty slots are filled by AI. See `README.md` for architecture, `PLAN.md` for the full design spec, and `TODO.md` for the live backlog of pending and future work.

## Tech stack

- **Runtime:** Node.js (no framework)
- **Dependencies:** `ws` (WebSocket server) — the only npm package
- **Clients:** plain HTML + vanilla JS + Canvas 2D API, no build step
- **Entry point:** `node server.js`

## Repository layout

```
server.js          # HTTP static server + WebSocket server + game loop
game.js            # All game logic (Game, Wizard, FireBolt) — pure, no I/O
settings.js        # Constants only — edit here to tune gameplay
public/
  index.html       # Beamer view
  game-client.js   # Renders server state on canvas
  controller.html  # Phone controller UI
  controller.js    # Sends input events to server
```

## Running locally

```bash
npm install        # installs ws
node server.js     # starts on :3000
```

Beamer: `http://localhost:3000`  
Phone controller: `http://<laptop-ip>:3000/controller`

## Multi-agent development workflow

Development is split across multiple agents. Each agent works in its own **git worktree** on a dedicated **feature branch**. This keeps work isolated and avoids conflicts on `main`.

### Starting work as an agent

Consult `PLAN.md` for the full design spec and `TODO.md` for the current backlog. Check `gh pr list` before starting any task to confirm no other agent has claimed it.

1. Create a worktree for your feature branch from `main`:
   ```bash
   git worktree add ../wizard-arena-<feature> -b feat/<feature>
   cd ../wizard-arena-<feature>
   npm install
   ```
2. Do your work in that directory only. Never edit files in another agent's worktree.
3. When done, open a PR from `feat/<feature>` → `main` using the `gh` CLI (see below).
4. **Wait for a review.** Do not merge until a reviewer has approved. Check for review comments with `gh pr view <number> --comments` and address any issues raised before the PR is merged.

### GitHub operations

All interactions with GitHub must use the `git` and `gh` CLI. Do not use any web UI or other tools.

```bash
# Open a PR
gh pr create --title "feat/your-feature: short description" --body "..."

# Check PR status
gh pr list
gh pr view <number>

# Check repo state
gh repo view
gh issue list
```

### Removing a worktree after merge

```bash
git worktree remove ../wizard-arena-<feature>
git branch -d feat/<feature>
```

### Coordination rules

- `main` is always in a runnable state. Do not push broken code to `main`.
- `settings.js` is shared config — if your feature requires a new constant, add it there and note it in your PR description.
- `game.js` owns all game logic. `server.js` owns networking. Keep that boundary clean — do not put game logic in `server.js`.
- Clients (`public/`) are thin renderers and input senders. Do not add game logic there.
- No new npm dependencies without discussion. `ws` is the only allowed dependency.

## Code conventions

- Plain JavaScript (ES2020), no TypeScript, no transpilation.
- No comments unless the WHY is non-obvious.
- Constants live in `settings.js` — no magic numbers elsewhere.
- `game.js` must remain pure (no `require('ws')`, no `require('http')`). It can be tested with plain `node`.

## Verifying your work

Each feature should be manually verified before opening a PR:

```bash
# Game logic
node -e "const {Game}=require('./game'); const g=new Game(); g.update(0.016); console.log(JSON.stringify(g.getState()))"

# Server starts
node server.js &
curl -s http://localhost:3000/ | grep -q '<canvas' && echo ok
kill %1
```
