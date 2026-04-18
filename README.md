# wizard-arena
Challenge other wizards in this magic arena until the last mage stands!

## How to play

Show the game on a beamer. Players join from their smartphone browser — no app install needed. Up to 4 players; empty slots are filled by AI.

1. Start the server on the laptop connected to the beamer:
   ```
   npm install
   node server.js
   ```
2. Open `http://localhost:3000` in the browser connected to the beamer.
3. Players connect to the same WiFi and open `http://<laptop-ip>:3000/controller` on their phone (or scan the QR code shown on screen).

## Architecture

```
                        LOCAL WIFI NETWORK

  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │   LAPTOP / PC                                       │
  │   ┌─────────────────────────────────────────┐      │
  │   │  server.js (Node.js)                    │      │
  │   │                                         │      │
  │   │  • runs the game loop (60 fps)          │      │
  │   │  • owns all game state                  │      │
  │   │  • serves HTML/JS files over HTTP       │      │
  │   │  • speaks WebSocket to all clients      │      │
  │   └──────┬──────────────────────────────────┘      │
  │          │  HTTP :3000                              │
  │          │  + WebSocket                             │
  │          │                                          │
  └──────────┼──────────────────────────────────────────┘
             │
    ─────────┴──────────────────────────────────────
             │                    │
             ▼                    ▼
    ┌─────────────────┐   ┌──────────────┐  ┌──────────────┐
    │  BEAMER         │   │  PHONE 1     │  │  PHONE 2 … 4 │
    │  browser opens  │   │  browser     │  │  browser     │
    │  :3000/         │   │  :3000/ctrl  │  │  :3000/ctrl  │
    │                 │   │              │  │              │
    │  canvas renders │   │  D-pad +     │  │  D-pad +     │
    │  game state     │   │  shoot btn   │  │  shoot btn   │
    │                 │   │              │  │              │
    │  ← state (WS)   │   │ → input (WS) │  │ → input (WS) │
    └─────────────────┘   └──────────────┘  └──────────────┘
```

**Data flow:**

1. Server starts → game loop begins with 4 AI wizards.
2. Beamer opens `localhost:3000` → receives `index.html` + `game-client.js` → connects via WebSocket → server streams game state ~60×/sec → canvas redraws each frame.
3. Player opens the controller URL → receives `controller.html` + `controller.js` → connects via WebSocket → server assigns a wizard slot, AI turns off for that wizard.
4. Player presses a button → phone sends `{dx, dy, shoot}` over WebSocket → server applies it next tick → updated state goes out to beamer → beamer redraws.

Nothing runs on the phones beyond a webpage. The server is the single source of truth for all game state.
