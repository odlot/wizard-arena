const WIZARD_MAX_HP = 5;

const ws = new WebSocket(`ws://${location.host}`);

let wizardId = null;
const keys = { up: false, down: false, left: false, right: false, shoot: false };

const label   = document.getElementById('label');
const hpFill  = document.getElementById('hp-fill');

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
    if (msg.status === 'waiting') document.body.classList.remove('dead');
    const w = msg.wizards[wizardId];
    if (!w) return;
    label.style.color = w.color;
    hpFill.style.background = w.color;
    hpFill.style.width = `${(w.hp / WIZARD_MAX_HP) * 100}%`;
    if (!w.alive) document.body.classList.add('dead');
  }
};

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
