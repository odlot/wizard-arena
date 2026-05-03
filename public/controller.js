const WIZARD_MAX_HP = 5;

const ws = new WebSocket(`ws://${location.host}`);

let wizardId = null;
const keys = { up: false, down: false, left: false, right: false, shoot: false };

const label     = document.getElementById('label');
const hpFill    = document.getElementById('hp-fill');
const btnReady  = document.getElementById('btn-ready');
const readyHint = document.getElementById('ready-hint');

ws.onopen  = () => { label.textContent = 'Waiting for slot…'; };
ws.onclose = () => { label.textContent = 'Disconnected'; };
ws.onerror = (err) => console.error('WS error', err);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'joined') {
    wizardId = msg.wizardId;
    label.textContent = `P${wizardId + 1}`;
  }

  if (msg.type === 'state') {
    if (wizardId === null) {
      label.textContent = 'Spectating';
      return;
    }

    document.body.classList.toggle('waiting', msg.status === 'waiting');

    if (msg.status === 'waiting') {
      const hasVoted = msg.votedIds.includes(wizardId);
      btnReady.classList.toggle('voted', hasVoted);
      btnReady.textContent = hasVoted ? 'READY ✓' : 'READY';
      const allVoted = msg.connectedCount > 0 && msg.votedCount >= msg.connectedCount;
      readyHint.textContent = allVoted
        ? `Starting in ${Math.ceil(msg.countdown)}…`
        : `${msg.votedCount} / ${msg.connectedCount} ready`;
      document.body.classList.remove('dead');
      return;
    }

    const w = msg.wizards[wizardId];
    if (!w) return;
    label.style.color = w.color;
    hpFill.style.background = w.color;
    hpFill.style.width = `${(w.hp / WIZARD_MAX_HP) * 100}%`;
    if (!w.alive) document.body.classList.add('dead');
  }
};

btnReady.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'vote' }));
}, { passive: false });
btnReady.addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'vote' }));
});

const mql = window.matchMedia('(orientation: landscape)');
function applyOrientation() {
  document.body.classList.toggle('landscape', mql.matches);
}
mql.addEventListener('change', applyOrientation);
applyOrientation();

function sendInput() {
  if (ws.readyState !== WebSocket.OPEN) return;
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const dy = (keys.down  ? 1 : 0) - (keys.up   ? 1 : 0);
  ws.send(JSON.stringify({ type: 'input', dx, dy, shoot: keys.shoot }));
}

function bindButton(id, key) {
  const el = document.getElementById(id);

  function press(e) {
    e.preventDefault();
    if (keys[key]) return;
    keys[key] = true;
    el.classList.add('active');
    sendInput();
  }

  function release(e) {
    e.preventDefault();
    if (!keys[key]) return;
    keys[key] = false;
    el.classList.remove('active');
    sendInput();
  }

  el.addEventListener('touchstart',  press,   { passive: false });
  el.addEventListener('touchend',    release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup',   release);
}

bindButton('btn-up',    'up');
bindButton('btn-down',  'down');
bindButton('btn-left',  'left');
bindButton('btn-right', 'right');
bindButton('btn-shoot', 'shoot');
