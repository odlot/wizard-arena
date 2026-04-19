const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { Game } = require('./game');
const { FPS, GAME_RESTART_DELAY } = require('./settings');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const PUBLIC_DIR = path.join(__dirname, 'public');

const URL_MAP = { '/': '/index.html', '/controller': '/controller.html' };

const server = http.createServer((req, res) => {
  const url = URL_MAP[req.url] || req.url;
  const filePath = path.join(PUBLIC_DIR, url);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
const game = new Game();
let nextSocketId = 0;

wss.on('error', (err) => console.error('WSS error', err));

wss.on('connection', (socket) => {
  const socketId = nextSocketId++;
  const wizardId = game.addPlayer(socketId);

  if (wizardId !== null) {
    socket.send(JSON.stringify({ type: 'joined', wizardId }));
  }

  socket.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (msg.type === 'input' && wizardId !== null) {
      game.setInput(wizardId, { dx: msg.dx, dy: msg.dy, shoot: msg.shoot });
    }
  });

  socket.on('close', () => {
    game.removePlayer(socketId);
  });
});

let lastTime = Date.now();
let resetScheduled = false;

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  game.update(dt);

  if ((game.status === 'win' || game.status === 'over') && !resetScheduled) {
    resetScheduled = true;
    setTimeout(() => { game.reset(); resetScheduled = false; }, GAME_RESTART_DELAY * 1000);
  }

  const state = JSON.stringify({ type: 'state', ...game.getState() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(state);
  }
}, 1000 / FPS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Wizard Arena listening on http://localhost:${PORT}`);
});

module.exports = server;
