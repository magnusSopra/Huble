const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const PLAYER_RADIUS = 0.24;
const MAX_PROJECTILES = 16;
export const DODGE_WINDOW = 0.3;
export const UPPERCUT_CONTACT = 0.14;
const segmentDistance = (ax, az, bx, bz, x, z) => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
};

export class Combat {
  constructor(definition, emit = () => {}) {
    this.definition = definition;
    this.emit = emit;
    this.player = { x: 0, z: 4, yaw: 0, hp: 100 };
    this.boss = { x: 0, z: -1.8, hp: definition.hp, phase: 'approach', time: 0, stage: 1 };
    this.attackIndex = 0;
    this.attack = definition.attacks[0];
    this.projectiles = [];
    this.hazards = [];
    this.pendingShots = [];
    this.attackCooldowns = {};
    this.punchCooldown = 0;
    this.dodgeCooldown = 0;
    this.invulnerable = 0;
    this.dodgedThreats = new WeakSet();
    this.threatProtection = new WeakMap();
    this.damageImmunity = 0;
    this.slow = 0;
    this.punchAnimation = 0;
    this.hitFlash = 0;
    this.shake = 0;
    this.finished = false;
    this.outcome = null;
    this.elapsed = 0;
    this.counterHits = 0;
    this.phaseIndex = 0;
    this.serial = 0;
    this.holeSequence = 0;
    this.signature = null;
    this.phaseDefinitions = definition.phases || [{
      minHp: 0, name: 'Performance review', attacks: definition.attacks.map((a, i) => a.id || i),
      approachTime: 1.25, speedMultiplier: 1,
    }];
    this.currentPhase = this.phaseDefinitions[0];
  }

  distance() { return Math.hypot(this.boss.x - this.player.x, this.boss.z - this.player.z); }

  get windup() { return this.attack.windup ?? this.definition.windup; }

  get uppercutContact() { return this.attack.contactTime ?? UPPERCUT_CONTACT; }

  get incomingDodgeThreats() {
    const threats = [];
    const { boss, player, attack } = this;
    const ranged = ['candy', 'number', 'newsletter', 'aura', 'projectile'].includes(attack.kind);
    const distance = this.distance();
    const contact = attack.kind === 'uppercut'
      ? Math.max(this.uppercutContact, Math.max(0, distance - 1.55) / (attack.lungeSpeed || 13)) : 0;
    const travel = ranged ? Math.max(0, distance - (attack.radius ?? 0.4) - PLAYER_RADIUS) / (attack.projectileSpeed || 8) : contact;
    const eta = this.windup - boss.time + travel;
    const inReach = ranged || distance < (attack.range || 3.6) + 0.3;
    if (attack.kind !== 'holes' && boss.phase === 'telegraph' && inReach && eta <= DODGE_WINDOW) threats.push(attack);
    if (boss.phase === 'attack' && this.rush && !this.rush.hit && ['uppercut', 'rush'].includes(attack.kind)) {
      const ahead = segmentDistance(boss.x, boss.z, boss.x + this.rush.vx * DODGE_WINDOW, boss.z + this.rush.vz * DODGE_WINDOW, player.x, player.z);
      if (ahead < 1.55 && (attack.kind !== 'uppercut' || boss.time <= this.uppercutContact + 0.1)) threats.push(attack);
    }
    for (const projectile of this.projectiles) {
      if (projectile.ttl <= 0) continue;
      if (segmentDistance(projectile.x, projectile.z, projectile.x + projectile.vx * DODGE_WINDOW,
        projectile.z + projectile.vz * DODGE_WINDOW, player.x, player.z) < (projectile.radius ?? 0.4) + PLAYER_RADIUS) {
        threats.push(projectile.reactionThreat || projectile);
      }
    }
    return threats.filter(threat => !this.dodgedThreats.has(threat));
  }

  get canDodge() {
    return !this.finished && (this.dodgeCooldown <= 0 || this.incomingDodgeThreats.length > 0);
  }

  get dodgeReadyIn() { return this.canDodge ? 0 : this.dodgeCooldown; }

  attackDamage(attack = this.attack) {
    return this.definition.attackDamageMode === 'absolute'
      ? attack.damage : this.definition.damage * (attack.damage ?? 1);
  }

  syncPhase() {
    if (this.finished) return;
    const ratio = this.boss.hp / this.definition.hp;
    const next = this.phaseDefinitions.findIndex(phase => ratio > phase.minHp || phase.minHp === 0);
    if (next < 0 || next === this.phaseIndex) return;
    this.phaseIndex = next;
    this.currentPhase = this.phaseDefinitions[next];
    this.boss.stage = next + 1;
    this.attackIndex = 0;
    this.emit('phase', this.currentPhase.name);
  }

  finish(outcome) {
    if (this.finished) return;
    this.finished = true;
    this.outcome = outcome;
    this.pendingShots.length = 0;
    this.emit(outcome);
  }

  punch() {
    if (this.finished || this.punchCooldown > 0) return;
    this.punchCooldown = 0.38;
    this.punchAnimation = 0.25;
    const dx = this.boss.x - this.player.x;
    const dz = this.boss.z - this.player.z;
    const distance = this.distance();
    const facing = (-Math.sin(this.player.yaw) * dx - Math.cos(this.player.yaw) * dz) / Math.max(distance, 0.01);
    if (distance > 3.5 || facing < 0.5) {
      this.emit('miss', distance > 3.5 ? 'Step closer to land a punch' : 'Face your manager. Literally.');
      return;
    }
    const counter = this.boss.phase === 'recover';
    this.boss.hp = Math.max(0, this.boss.hp - (counter ? 20 : 8));
    if (counter) this.counterHits++;
    this.shake = Math.max(this.shake, counter ? 0.16 : 0.08);
    if (this.boss.hp === 0) {
      this.finish('win');
      return;
    }
    this.syncPhase();
    if (!this.finished) this.emit('punch', counter ? 'COUNTER! +20 DAMAGE' : this.definition.hurt);
  }

  dodge(side = 1) {
    if (this.finished) return false;
    const threats = this.incomingDodgeThreats;
    if (this.dodgeCooldown > 0 && !threats.length) return false;
    const { x, z } = this.player;
    // A late reaction bypasses movement cooldown only for a new imminent hit.
    // It cannot refresh global immunity or protect against unrelated damage.
    if (this.dodgeCooldown <= 0) this.invulnerable = DODGE_WINDOW;
    for (const threat of threats) {
      this.dodgedThreats.add(threat);
      this.threatProtection.set(threat, this.elapsed + DODGE_WINDOW);
    }
    this.dodgeCooldown = 0.7;
    this.player.x = clamp(x + Math.cos(this.player.yaw) * Math.sign(side || 1) * 1.65, -7, 7);
    this.player.z = clamp(z - Math.sin(this.player.yaw) * Math.sign(side || 1) * 1.65, -7, 7);
    if (this.checkHoles(x, z, this.player.x, this.player.z)) return true;
    this.emit('dodge', 'OUT OF OFFICE');
    return true;
  }

  damage(amount, threat = this.attack) {
    if (this.finished || !Number.isFinite(amount) || amount <= 0) return false;
    if (this.invulnerable > 0 || (this.threatProtection.get(threat) || 0) > this.elapsed) {
      this.emit('avoided', 'DODGED! Counter while they recover.');
      return false;
    }
    if (this.damageImmunity > 0) return false;
    this.player.hp = Math.max(0, this.player.hp - Math.round(amount));
    this.hitFlash = 0.35;
    this.damageImmunity = 0.42;
    this.shake = Math.max(this.shake, amount >= 30 ? 0.65 : 0.3);
    if (this.player.hp === 0) {
      this.finish('lose');
      return true;
    }
    this.emit('hurt');
    return true;
  }

  checkHoles(ax, az, bx, bz) {
    for (const hazard of this.hazards) {
      if (hazard.state !== 'open') continue;
      if (segmentDistance(ax, az, bx, bz, hazard.x, hazard.z) <= hazard.radius + PLAYER_RADIUS) {
        this.player.hp = 0;
        this.hitFlash = 0.6;
        this.shake = 0.8;
        this.finish('lose');
        return true;
      }
    }
    return false;
  }

  selectAttack() {
    if (this.finished) return false;
    const ids = this.currentPhase.attacks;
    for (let offset = 0; offset < ids.length; offset++) {
      const index = (this.attackIndex + offset) % ids.length;
      const id = ids[index];
      const source = this.definition.attacks.find((a, i) => (a.id || i) === id);
      if (!source || (this.attackCooldowns[id] || 0) > this.elapsed) continue;
      this.attackIndex = index + 1;
      this.attack = { ...source };
      if (source.kind === 'newsletter') {
        this.attack.count = this.currentPhase.newsletterCount ?? source.count;
        this.attack.interval = this.currentPhase.newsletterInterval ?? source.interval;
      }
      this.attackCooldowns[id] = this.elapsed + (source.cooldown || 0);
      this.boss.phase = 'telegraph';
      this.boss.time = 0;
      this.signature = ['uppercut', 'aura'].includes(source.kind) ? source.kind : null;
      this.emit('telegraph', this.attack.name);
      return true;
    }
    return false;
  }

  spawnProjectile(attack, index = 0) {
    if (this.finished || this.projectiles.length >= MAX_PROJECTILES) return;
    const dx = this.player.x - this.boss.x;
    const dz = this.player.z - this.boss.z;
    const distance = Math.hypot(dx, dz) || 1;
    const speed = attack.projectileSpeed || 8;
    const type = attack.kind === 'projectile' ? 'newsletter' : attack.kind;
    this.projectiles.push({
      id: ++this.serial, type, kind: type, x: this.boss.x, z: this.boss.z, y: 1.4,
      reactionThreat: index === 0 ? attack : null,
      vx: dx / distance * speed, vz: dz / distance * speed,
      radius: attack.radius ?? 0.4, damage: this.attackDamage(attack), ttl: 4, age: 0,
      label: attack.labels?.[index % attack.labels.length] || (type === 'aura' ? 'AURA' : ''),
    });
    this.emit(type, attack.name);
  }

  placeHoles(attack) {
    if (this.finished) return;
    const max = Math.min(3, attack.maxHoles || 2);
    const radius = Math.min(1, attack.radius || 0.9);
    for (let i = 0; i < (attack.count || 2) && this.hazards.length < max; i++) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (this.holeSequence + attempt) * 2.399963;
        const offset = attempt === 0 ? 0 : 2.8 + (attempt % 3) * 0.45;
        const x = clamp(this.player.x + Math.cos(angle) * offset, -5.5, 5.5);
        const z = clamp(this.player.z + Math.sin(angle) * offset, -5.5, 5.5);
        // Keep the spawn and melee pocket clear, with walkable gaps between every cut.
        if (Math.hypot(x, z - 4) < 2 || Math.hypot(x - this.boss.x, z - this.boss.z) < 2) continue;
        if (this.hazards.some(h => Math.hypot(x - h.x, z - h.z) < 3.1)) continue;
        const warning = Math.max(1.2, attack.warning || 1.65);
        const lifetime = attack.lifetime || 7;
        this.hazards.push({
          id: ++this.serial, type: 'hole', x, z, radius, state: 'warning', age: 0,
          warning, lifetime, opensAt: this.elapsed + warning,
          expiresAt: this.elapsed + warning + lifetime, ttl: warning + lifetime,
          progress: 0, lethal: false, label: 'RESOURCE CUT',
        });
        this.holeSequence++;
        break;
      }
    }
    this.emit('hole', 'RESOURCE CUT — leave the striped circles!');
  }

  releaseAttack() {
    if (this.finished) return;
    const { player, boss, attack } = this;
    const dx = player.x - boss.x;
    const dz = player.z - boss.z;
    const distance = Math.max(0.01, this.distance());
    if (['candy', 'number', 'newsletter', 'aura', 'projectile'].includes(attack.kind)) {
      this.spawnProjectile(attack);
      if (this.finished) return;
      for (let i = 1; i < (attack.count || 1); i++) {
        this.pendingShots.push({ at: this.elapsed + i * (attack.interval || 0.6), attack: { ...attack }, index: i });
      }
    } else if (attack.kind === 'holes') {
      this.placeHoles(attack);
    } else if (attack.kind === 'rush' || attack.kind === 'uppercut') {
      const speed = attack.lungeSpeed || 13;
      this.rush = { vx: dx / distance * speed, vz: dz / distance * speed, hit: false };
      if (attack.kind === 'uppercut') {
        this.shake = Math.max(this.shake, 0.3);
        this.emit('uppercut', 'CMON!!');
        if (this.finished) return;
      }
    } else if (attack.kind === 'slow') {
      if (this.invulnerable <= 0 && (this.threatProtection.get(attack) || 0) <= this.elapsed && distance < 4.5) this.slow = 2.5;
      this.damage(distance < 4.5 ? this.attackDamage() : 0);
    } else if (distance < (attack.range || 3.6)) {
      this.damage(this.attackDamage());
    } else {
      this.emit('avoided', 'MISSED! Move in and counter.');
    }
    if (!this.finished) this.emit('attack', attack.name);
  }

  update(dt, input = {}) {
    if (this.finished || !Number.isFinite(dt) || dt <= 0) return;
    // Small simulation steps plus swept tests cover frame stalls and moving targets.
    const steps = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < steps && !this.finished; i++) this.step(dt / steps, input);
  }

  step(dt, input) {
    this.elapsed += dt;
    for (const key of ['punchCooldown', 'dodgeCooldown', 'invulnerable', 'damageImmunity', 'slow', 'punchAnimation', 'hitFlash', 'shake']) {
      this[key] = Math.max(0, this[key] - dt);
    }
    this.syncPhase();
    if (this.finished) return;
    for (const hazard of this.hazards) {
      hazard.age += dt;
      hazard.ttl = Math.max(0, hazard.warning + hazard.lifetime - hazard.age);
      hazard.progress = Math.min(1, hazard.age / hazard.warning);
      if (hazard.state === 'warning' && hazard.age >= hazard.warning) {
        hazard.state = 'open';
        hazard.lethal = true;
        this.emit('hole', 'FLOOR REMOVED — do not cross the void!');
        if (this.finished) return;
      }
    }
    this.hazards = this.hazards.filter(h => h.ttl > 0);
    const { player, boss, definition } = this;
    const oldX = player.x;
    const oldZ = player.z;
    player.yaw += (input.turn || 0) * dt * 2;
    const speed = this.slow > 0 ? 2 : 4;
    const ix = input.x || 0;
    const iz = input.z || 0;
    const length = Math.max(1, Math.hypot(ix, iz));
    player.x = clamp(player.x + (Math.cos(player.yaw) * ix + Math.sin(player.yaw) * iz) / length * speed * dt, -7, 7);
    player.z = clamp(player.z + (-Math.sin(player.yaw) * ix + Math.cos(player.yaw) * iz) / length * speed * dt, -7, 7);
    if (this.checkHoles(oldX, oldZ, player.x, player.z)) return;
    boss.time += dt;
    const distance = this.distance();
    if (boss.phase === 'approach') {
      if (distance > 2.3) {
        const move = Math.min(distance - 2.3, definition.speed * (this.currentPhase.speedMultiplier || 1) * dt);
        boss.x = clamp(boss.x + (player.x - boss.x) / distance * move, -7, 7);
        boss.z = clamp(boss.z + (player.z - boss.z) / distance * move, -7, 7);
      }
      if (boss.time >= (this.currentPhase.approachTime ?? 1.25) && distance < 8) this.selectAttack();
    } else if (boss.phase === 'telegraph' && boss.time >= this.windup) {
      boss.phase = 'attack';
      boss.time = 0;
      this.releaseAttack();
    } else if (boss.phase === 'attack') {
      if (['rush', 'uppercut'].includes(this.attack.kind) && this.rush) {
        const bx = boss.x;
        const bz = boss.z;
        boss.x = clamp(bx + this.rush.vx * dt, -7, 7);
        boss.z = clamp(bz + this.rush.vz * dt, -7, 7);
        const contact = this.attack.kind !== 'uppercut'
          || (boss.time >= this.uppercutContact && boss.time <= this.uppercutContact + 0.1);
        if (!this.rush.hit && contact && segmentDistance(bx - oldX, bz - oldZ, boss.x - player.x, boss.z - player.z, 0, 0) < 1.55) {
          this.rush.hit = true;
          this.damage(this.attackDamage());
        }
      }
      if (this.finished) return;
      const duration = Math.max(this.attack.duration || 0.4, ((this.attack.count || 1) - 1) * (this.attack.interval || 0.6) + 0.18);
      if (boss.time >= duration) {
        boss.phase = 'recover';
        boss.time = 0;
        this.emit('counter', 'COUNTER WINDOW');
      }
    } else if (boss.phase === 'recover' && boss.time >= (this.attack.recovery || 1.4)) {
      boss.phase = 'approach';
      boss.time = 0;
      this.signature = null;
    }
    if (this.finished) return;
    const due = this.pendingShots.filter(shot => shot.at <= this.elapsed);
    this.pendingShots = this.pendingShots.filter(shot => shot.at > this.elapsed);
    for (const shot of due) {
      this.spawnProjectile(shot.attack, shot.index);
      if (this.finished) return;
    }
    for (const projectile of this.projectiles) {
      const px = projectile.x;
      const pz = projectile.z;
      projectile.x += projectile.vx * dt;
      projectile.z += projectile.vz * dt;
      projectile.ttl -= dt;
      projectile.age = (projectile.age || 0) + dt;
      if (segmentDistance(px - oldX, pz - oldZ, projectile.x - player.x, projectile.z - player.z, 0, 0) < (projectile.radius ?? 0.4) + PLAYER_RADIUS) {
        projectile.ttl = 0;
        this.damage(projectile.damage ?? definition.damage, projectile.reactionThreat || projectile);
        if (this.finished) return;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.ttl > 0 && Math.abs(p.x) < 12 && Math.abs(p.z) < 12);
  }
}
