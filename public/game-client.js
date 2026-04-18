// Keep in sync with settings.js — CommonJS modules can't be imported in the browser directly.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const ARENA_MARGIN = 40;
const WIZARD_RADIUS = 18;
const FIREBOLT_RADIUS = 6;
const WIZARD_MAX_HP = 5;

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;

let state = null;

const ws = new WebSocket(`ws://${location.host}`);
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'state') state = msg;
};
ws.onclose = () => { state = null; };
ws.onerror = (err) => console.error('WS error', err);

function drawArena() {
  // floor
  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(ARENA_MARGIN, ARENA_MARGIN, ARENA_WIDTH - ARENA_MARGIN * 2, ARENA_HEIGHT - ARENA_MARGIN * 2);
  // walls
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_MARGIN);
  ctx.fillRect(0, ARENA_HEIGHT - ARENA_MARGIN, ARENA_WIDTH, ARENA_MARGIN);
  ctx.fillRect(0, 0, ARENA_MARGIN, ARENA_HEIGHT);
  ctx.fillRect(ARENA_WIDTH - ARENA_MARGIN, 0, ARENA_MARGIN, ARENA_HEIGHT);
}

function drawWizard(w) {
  if (!w.alive) return;

  ctx.beginPath();
  ctx.arc(w.x, w.y, WIZARD_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = w.color;
  ctx.fill();

  // HP bar
  const barW = WIZARD_RADIUS * 2;
  const barH = 4;
  const barX = w.x - WIZARD_RADIUS;
  const barY = w.y - WIZARD_RADIUS - 10;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(barX, barY, barW * (w.hp / WIZARD_MAX_HP), barH);

  // player number label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(w.isAI ? 'AI' : `P${w.id + 1}`, w.x, w.y);
}

function drawBolt(b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, FIREBOLT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ff8800';
  ctx.fill();
}

function drawOverlay(status) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(status === 'win' ? 'WINNER!' : 'DRAW', ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
}

function render() {
  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  if (!state) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    ctx.fillStyle = '#aaa';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Connecting...', ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    requestAnimationFrame(render);
    return;
  }

  drawArena();
  state.wizards.forEach(drawWizard);
  state.bolts.forEach(drawBolt);

  if (state.status !== 'playing') drawOverlay(state.status);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
