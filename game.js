const {
  ARENA_WIDTH, ARENA_HEIGHT, ARENA_MARGIN,
  MAX_PLAYERS, WIZARD_MAX_HP, WIZARD_SPEED, WIZARD_RADIUS,
  FIREBOLT_SPEED, FIREBOLT_DAMAGE, FIREBOLT_COOLDOWN, FIREBOLT_RADIUS,
  COLORS, WIZARD_START_OFFSET,
} = require('./settings');

class FireBolt {
  constructor(x, y, vx, vy, ownerId) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const minX = ARENA_MARGIN;
    const minY = ARENA_MARGIN;
    const maxX = ARENA_WIDTH - ARENA_MARGIN;
    const maxY = ARENA_HEIGHT - ARENA_MARGIN;
    if (this.x < minX || this.x > maxX || this.y < minY || this.y > maxY) {
      this.active = false;
    }
  }
}

class Wizard {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = WIZARD_MAX_HP;
    this.alive = true;
    this.isAI = true;
    this.facing = { dx: 1, dy: 0 };
    this.cooldown = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  move(dx, dy, dt) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const ndx = dx / len;
      const ndy = dy / len;
      this.facing = { dx: ndx, dy: ndy };
      this.x = Math.max(ARENA_MARGIN, Math.min(ARENA_WIDTH - ARENA_MARGIN, this.x + ndx * WIZARD_SPEED * dt));
      this.y = Math.max(ARENA_MARGIN, Math.min(ARENA_HEIGHT - ARENA_MARGIN, this.y + ndy * WIZARD_SPEED * dt));
    }
  }

  shoot() {
    if (this.cooldown > 0) return null;
    this.cooldown = FIREBOLT_COOLDOWN;
    return new FireBolt(
      this.x, this.y,
      this.facing.dx * FIREBOLT_SPEED,
      this.facing.dy * FIREBOLT_SPEED,
      this.id
    );
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }
}

class Game {
  constructor() {
    this.wizards = [];
    this.bolts = [];
    this.status = 'playing';
    this.inputs = new Map();
    this._socketToWizard = new Map();

    const startPositions = [
      { x: ARENA_MARGIN + WIZARD_START_OFFSET, y: ARENA_MARGIN + WIZARD_START_OFFSET },
      { x: ARENA_WIDTH - ARENA_MARGIN - WIZARD_START_OFFSET, y: ARENA_HEIGHT - ARENA_MARGIN - WIZARD_START_OFFSET },
      { x: ARENA_WIDTH - ARENA_MARGIN - WIZARD_START_OFFSET, y: ARENA_MARGIN + WIZARD_START_OFFSET },
      { x: ARENA_MARGIN + WIZARD_START_OFFSET, y: ARENA_HEIGHT - ARENA_MARGIN - WIZARD_START_OFFSET },
    ];

    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.wizards.push(new Wizard(i, startPositions[i].x, startPositions[i].y));
    }
  }

  addPlayer(socketId) {
    const wizard = this.wizards.find(w => w.isAI && w.alive);
    if (!wizard) return null;
    wizard.isAI = false;
    this._socketToWizard.set(socketId, wizard.id);
    return wizard.id;
  }

  removePlayer(socketId) {
    const wizardId = this._socketToWizard.get(socketId);
    if (wizardId === undefined) return;
    const wizard = this.wizards[wizardId];
    if (wizard) wizard.isAI = true;
    this.inputs.delete(wizardId);
    this._socketToWizard.delete(socketId);
  }

  setInput(wizardId, input) {
    this.inputs.set(wizardId, input);
  }

  update(dt) {
    if (this.status !== 'playing') return;

    for (const wizard of this.wizards) {
      if (!wizard.alive) continue;
      wizard.update(dt);

      if (!wizard.isAI) {
        const input = this.inputs.get(wizard.id);
        if (input) {
          wizard.move(input.dx, input.dy, dt);
          if (input.shoot) {
            const bolt = wizard.shoot();
            if (bolt) this.bolts.push(bolt);
          }
        }
      } else {
        const target = this._nearestLiving(wizard);
        if (target) {
          const dx = target.x - wizard.x;
          const dy = target.y - wizard.y;
          wizard.move(dx, dy, dt);
          const bolt = wizard.shoot();
          if (bolt) this.bolts.push(bolt);
        }
      }
    }

    for (const bolt of this.bolts) {
      if (bolt.active) bolt.update(dt);
    }

    for (const bolt of this.bolts) {
      if (!bolt.active) continue;
      for (const wizard of this.wizards) {
        if (!wizard.alive || wizard.id === bolt.ownerId) continue;
        const dx = bolt.x - wizard.x;
        const dy = bolt.y - wizard.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < WIZARD_RADIUS + FIREBOLT_RADIUS) {
          wizard.takeDamage(FIREBOLT_DAMAGE);
          bolt.active = false;
          break;
        }
      }
    }

    this.bolts = this.bolts.filter(b => b.active);

    const living = this.wizards.filter(w => w.alive);
    if (living.length === 1) this.status = 'win';
    else if (living.length === 0) this.status = 'over';
  }

  _nearestLiving(wizard) {
    let nearest = null;
    let bestDist = Infinity;
    for (const other of this.wizards) {
      if (!other.alive || other.id === wizard.id) continue;
      const dx = other.x - wizard.x;
      const dy = other.y - wizard.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  getState() {
    return {
      wizards: this.wizards.map(w => ({
        id: w.id,
        x: w.x,
        y: w.y,
        hp: w.hp,
        alive: w.alive,
        isAI: w.isAI,
        color: COLORS[w.id],
      })),
      bolts: this.bolts.map(b => ({ x: b.x, y: b.y })),
      status: this.status,
    };
  }
}

module.exports = { Game, Wizard, FireBolt };
