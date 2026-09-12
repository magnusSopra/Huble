import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { BOSSES } from '../src/bosses.js';
import { CombatEffects } from '../src/combat-effects.js';
import * as THREE from 'three';
import { chooseCombatInput } from '../test-support/combat-bot.js';

const idle = { x: 0, z: 0, turn: 0 };
const attackById = (combat, id) => combat.definition.attacks.find(a => a.id === id);
const useAttack = (combat, id) => {
  combat.attack = { ...attackById(combat, id) };
  combat.boss.phase = 'attack';
  combat.boss.time = 0;
  combat.releaseAttack();
};
const openHole = (x, z, radius = 0.45) => ({
  id: 1, type: 'hole', x, z, radius, state: 'open', age: 2,
  warning: 1.65, lifetime: 7, ttl: 6.65, progress: 1, lethal: true,
});

test('four standalone bosses have identities, declarative phases, readable windups and attack cooldowns', () => {
  assert.deepEqual(BOSSES.map(b => b.name), ['Jill Guldhav', 'Sander Thomassen', 'Alf Gilroy', 'Kjell Rusti']);
  assert.deepEqual(BOSSES.map(b => b.title), ['Office Manager', 'Department Manager', 'Executive Director', 'CEO']);
  assert.deepEqual(BOSSES.map(b => b.slug), ['jill_guldhav', 'sander_thomassen', 'alf_gilroy', 'kjell_rusti']);
  for (const [i, boss] of BOSSES.entries()) {
    assert.equal(boss.id, boss.slug);
    for (const phase of boss.phases) {
      for (const id of phase.attacks) assert.ok(boss.attacks.some(a => a.id === id));
    }
    for (const attack of boss.attacks) {
      assert.ok(attack.windup >= 1);
      assert.ok(attack.cooldown > 0);
      assert.ok(attack.recovery >= 1.3);
    }
    if (i > 0) {
      assert.ok(boss.hp > BOSSES[i - 1].hp);
      assert.ok(boss.speed > BOSSES[i - 1].speed);
    }
  }
  const kinds = new Set(BOSSES[3].attacks.map(a => a.kind));
  for (const kind of ['candy', 'number', 'holes', 'newsletter', 'punch', 'uppercut', 'aura']) assert.ok(kinds.has(kind));
});

test('Jill fires one candy cluster aimed at release, with attack-specific damage and no homing', () => {
  const combat = new Combat(BOSSES[0]);
  useAttack(combat, 'candy');
  assert.equal(combat.projectiles.length, 1);
  const shot = combat.projectiles[0];
  assert.equal(shot.type, 'candy');
  assert.equal(shot.damage, 13);
  const initial = [shot.vx, shot.vz];
  combat.update(0.15, { x: 1, z: 0 });
  assert.deepEqual([shot.vx, shot.vz], initial);
  combat.player.x = shot.x;
  combat.player.z = shot.z + 1;
  combat.update(0.2, idle);
  assert.equal(combat.player.hp, 87);
});

test('numeric volleys have readable labels, and later releases aim at the new position', () => {
  const combat = new Combat(BOSSES[1]);
  useAttack(combat, 'numbers');
  assert.equal(combat.projectiles[0].label, '404');
  assert.equal(combat.projectiles[0].type, 'number');
  const original = combat.projectiles[0].vx;
  combat.update(0.54, { x: 1, z: 0 });
  assert.equal(combat.projectiles.length, 2);
  assert.equal(combat.projectiles[1].label, '-25%');
  assert.ok(combat.projectiles[1].vx > original);
});

test('resource cuts are deterministic, bounded, warned for at least 1.2s, and expire', () => {
  const first = new Combat(BOSSES[1]);
  const second = new Combat(BOSSES[1]);
  for (const combat of [first, second]) {
    useAttack(combat, 'holes');
    assert.ok(combat.hazards.length > 0);
    assert.ok(combat.hazards.length <= 2);
    assert.ok(combat.hazards.every(h => h.state === 'warning' && h.warning >= 1.2 && !h.lethal));
    combat.boss.phase = 'recover';
    combat.attack.recovery = 20;
  }
  assert.deepEqual(first.hazards, second.hazards);
  for (const hole of first.hazards) assert.ok(Math.hypot(hole.x, hole.z - 4) >= 2);
  first.update(1.19, idle);
  assert.ok(first.hazards.every(h => h.state === 'warning'));
  assert.equal(first.player.hp, 100);
  first.update(0.48, idle);
  assert.ok(first.hazards.every(h => h.state === 'open' && h.lethal));
  useAttack(first, 'holes');
  assert.ok(first.hazards.length <= 2);
  first.boss.phase = 'recover';
  first.attack.recovery = 20;
  first.update(7.1, idle);
  assert.equal(first.hazards.length, 0);
  assert.equal(first.player.hp, 100);
});

test('entering an open hole kills even during immunity and stops callbacks atomically', () => {
  const events = [];
  const combat = new Combat(BOSSES[1], event => events.push(event));
  combat.player.x = 0;
  combat.player.z = 0;
  combat.invulnerable = 2;
  combat.damageImmunity = 2;
  combat.hazards = [openHole(0.9, 0)];
  combat.projectiles = [{ x: -9, z: 0, vx: 100, vz: 0, radius: 0.4, damage: 20, ttl: 3 }];
  combat.update(0.4, { x: 1, z: 0 });
  assert.equal(combat.player.hp, 0);
  assert.equal(combat.outcome, 'lose');
  assert.deepEqual(events, ['lose']);
  const elapsed = combat.elapsed;
  combat.update(1, idle);
  combat.punch();
  combat.dodge();
  assert.equal(combat.elapsed, elapsed);
  assert.deepEqual(events, ['lose']);
});

test('dodge sweeps the whole path and endpoint against lethal holes, but warned holes remain escapable', () => {
  for (const x of [0.8, 1.65]) {
    const combat = new Combat(BOSSES[1]);
    combat.player.x = 0;
    combat.player.z = 0;
    combat.hazards = [openHole(x, 0, 0.3)];
    combat.dodge(1);
    assert.equal(combat.player.hp, 0, `hole at ${x} must catch dodge`);
    assert.equal(combat.finished, true);
  }
  const safe = new Combat(BOSSES[1]);
  safe.player.x = 0;
  safe.player.z = 0;
  safe.hazards = [{ ...openHole(0, 0), age: 0, state: 'warning', lethal: false }];
  safe.dodge(1);
  safe.boss.phase = 'recover';
  safe.attack = { ...safe.attack, recovery: 10 };
  safe.update(1.7, idle);
  assert.equal(safe.player.hp, 100);
  assert.equal(safe.hazards[0].state, 'open');
});

test('standing on a warning kills only when the floor actually opens', () => {
  const combat = new Combat(BOSSES[1]);
  combat.boss.phase = 'recover';
  combat.attack = { ...combat.attack, recovery: 10 };
  combat.hazards = [{ ...openHole(0, 4), state: 'warning', lethal: false, age: 0, warning: 1.4 }];
  combat.update(1.3, idle);
  assert.equal(combat.player.hp, 100);
  combat.update(0.11, idle);
  assert.equal(combat.player.hp, 0);
});

test('Alf escalates newsletter count and rate exactly at 70% and 40% HP', () => {
  const counts = [];
  const intervals = [];
  for (const ratio of [1, 0.7, 0.4]) {
    const combat = new Combat(BOSSES[2]);
    combat.boss.hp = combat.definition.hp * ratio;
    combat.syncPhase();
    combat.selectAttack();
    assert.equal(combat.attack.kind, 'newsletter');
    counts.push(combat.attack.count);
    intervals.push(combat.attack.interval);
    combat.releaseAttack();
    assert.equal(combat.pendingShots.length, combat.attack.count - 1);
    assert.equal(combat.projectiles[0].label, 'DAILY DIGEST');
    assert.equal(combat.projectiles[0].damage, 18);
    combat.update(combat.attack.interval + 0.01, { x: 1, z: 0 });
    assert.ok(combat.projectiles.some(p => p.label === 'APPS NYTT'));
  }
  assert.deepEqual(counts, [2, 3, 4]);
  assert.ok(intervals[0] > intervals[1] && intervals[1] > intervals[2]);
});

test('swept projectile collisions cannot tunnel; damage is projectile-specific and not stacked', () => {
  const combat = new Combat(BOSSES[0]);
  combat.player.z = 0;
  combat.projectiles = [
    { x: -5, z: 0, vx: 1000, vz: 0, ttl: 1, type: 'number', damage: 17, radius: 0.25 },
    { x: -5, z: 0, vx: 1000, vz: 0, ttl: 1, type: 'aura', damage: 34, radius: 0.9 },
  ];
  combat.update(1 / 60, idle);
  assert.equal(combat.player.hp, 83);
  assert.equal(combat.projectiles.length, 0);
  combat.damage(40);
  assert.equal(combat.player.hp, 83);
  combat.update(0.43, idle);
  combat.damage(10);
  assert.equal(combat.player.hp, 73);
});

test('projectiles can be sidestepped and dodge immunity covers a swept hit', () => {
  const combat = new Combat(BOSSES[0]);
  useAttack(combat, 'candy');
  combat.update(1, { x: 1, z: 0 });
  assert.equal(combat.player.hp, 100);
  const dodge = new Combat(BOSSES[0]);
  dodge.player.z = 0;
  dodge.dodge(1);
  dodge.projectiles = [{ x: -5, z: 0, vx: 1000, vz: 0, damage: 50, ttl: 1, radius: 0.3 }];
  dodge.update(0.02, idle);
  assert.equal(dodge.player.hp, 100);
  assert.equal(dodge.projectiles.length, 0);
});

test('Kjell has four HP stages and the final phase unlocks both signatures', () => {
  const combat = new Combat(BOSSES[3]);
  for (const [index, ratio] of [1, 0.75, 0.5, 0.25].entries()) {
    combat.boss.hp = combat.definition.hp * ratio;
    combat.syncPhase();
    assert.equal(combat.phaseIndex, index);
    assert.equal(combat.boss.stage, index + 1);
    const expected = ['candy', 'numbers', 'newsletters', 'uppercut'][index];
    assert.ok(combat.currentPhase.attacks.includes(expected));
  }
  assert.ok(combat.currentPhase.attacks.includes('aura'));
});

test('CMON uppercut deals 45 damage once, has a long windup, and is dodgeable', () => {
  const hit = new Combat(BOSSES[3]);
  hit.player.z = 0;
  const signature = attackById(hit, 'uppercut');
  assert.equal(signature.damage, 45);
  assert.ok(signature.windup >= 1.4);
  useAttack(hit, 'uppercut');
  assert.equal(hit.player.hp, 100, 'releasing the windup is not yet fist contact');
  hit.update(hit.uppercutContact - 0.01, idle);
  assert.equal(hit.player.hp, 100);
  hit.update(0.02, idle);
  assert.equal(hit.player.hp, 55);
  hit.update(0.3, idle);
  assert.equal(hit.player.hp, 55, 'one uppercut cannot hit twice');
  const avoided = new Combat(BOSSES[3]);
  avoided.player.z = 0;
  avoided.dodge(1);
  useAttack(avoided, 'uppercut');
  avoided.update(0.38, { x: 1, z: 0 });
  assert.equal(avoided.player.hp, 100);
});

test('aura is a single powerful non-homing volume that leaves an escape route', () => {
  const combat = new Combat(BOSSES[3]);
  useAttack(combat, 'aura');
  const aura = combat.projectiles[0];
  assert.equal(aura.type, 'aura');
  assert.equal(aura.damage, 34);
  assert.ok(aura.radius >= 0.8);
  assert.equal(combat.projectiles.length, 1);
  const velocity = [aura.vx, aura.vz];
  combat.update(1.5, { x: 1, z: 0 });
  assert.equal(combat.player.hp, 100);
  assert.deepEqual([aura.vx, aura.vz], velocity);
});

test('attack-specific cooldowns are honored and terminal attacks cannot release further events', () => {
  const combat = new Combat(BOSSES[0]);
  combat.selectAttack();
  assert.equal(combat.attack.id, 'candy');
  combat.selectAttack();
  assert.equal(combat.attack.id, 'basic');
  assert.equal(combat.selectAttack(), false);
  const events = [];
  const lethal = new Combat(BOSSES[3], event => events.push(event));
  lethal.player.z = 0;
  lethal.player.hp = 20;
  useAttack(lethal, 'uppercut');
  assert.equal(lethal.finished, false);
  assert.deepEqual(events, ['uppercut', 'attack']);
  lethal.update(0.2, idle);
  assert.deepEqual(events, ['uppercut', 'attack', 'lose']);
  assert.equal(lethal.finished, true);
  const winEvents = [];
  const winner = new Combat(BOSSES[0], event => winEvents.push(event));
  winner.player.z = 0;
  winner.boss.hp = 8;
  winner.punch();
  winner.releaseAttack();
  assert.deepEqual(winEvents, ['win']);
  assert.equal(winner.projectiles.length, 0);
});

test('late close-range reactions bypass an earlier dodge cooldown and an active punch', () => {
  for (const definition of BOSSES) {
    const events = [];
    const combat = new Combat(definition, event => events.push(event));
    combat.player.x = combat.boss.x = 7;
    combat.player.z = 0;
    combat.boss.z = -1.8;
    combat.attack = { ...attackById(combat, 'basic') };
    combat.boss.phase = 'telegraph';
    combat.boss.time = combat.windup - 0.48;
    assert.equal(combat.dodge(1), true);
    combat.update(0.35, idle);
    combat.punch();
    assert.ok(combat.punchAnimation > 0 && combat.punchCooldown > 0);
    assert.ok(combat.dodgeCooldown > 0);
    assert.equal(combat.invulnerable, 0);
    assert.equal(combat.canDodge, true);
    assert.equal(combat.dodgeReadyIn, 0);
    assert.equal(combat.dodge(1), true);
    assert.equal(combat.invulnerable, 0, 'reaction does not renew global immunity');
    assert.equal(combat.dodge(1), false, 'same threat cannot refresh protection');
    combat.update(0.15, idle);
    assert.equal(combat.player.hp, 100, definition.name);
    assert.ok(events.includes('avoided'), 'stay at the arena wall to prove protection, not distance');
  }
});

test('a late uppercut reaction remains available during the actual upward sweep', () => {
  const combat = new Combat(BOSSES[3]);
  combat.player.x = combat.boss.x = 7;
  combat.player.z = 0;
  combat.boss.z = -1.8;
  combat.dodge(1);
  combat.update(0.35, idle);
  useAttack(combat, 'uppercut');
  combat.update(combat.uppercutContact - 0.025, idle);
  assert.equal(combat.player.hp, 100);
  assert.ok(combat.dodgeCooldown > 0);
  assert.equal(combat.canDodge, true);
  combat.dodge(1);
  combat.update(0.22, idle);
  assert.equal(combat.player.hp, 100);
});

test('uppercut protection tracks lunge contact at the edge of melee reach, not only windup release', () => {
  const events = [];
  const combat = new Combat(BOSSES[3], event => events.push(event));
  combat.player.x = combat.boss.x = 7;
  combat.player.z = 0;
  combat.boss.z = -3.1;
  combat.attack = { ...attackById(combat, 'uppercut') };
  combat.boss.phase = 'telegraph';
  combat.boss.time = combat.windup - 0.45;
  combat.dodge(1);
  combat.update(0.37, idle);
  assert.equal(combat.canDodge, true);
  combat.dodge(1);
  combat.update(0.4, idle);
  assert.equal(combat.player.hp, 100);
  assert.ok(events.includes('avoided'), 'the lunge reaches the stationary player while protection is still active');
});

test('each delayed volley hit permits its own reaction even after the telegraph has ended', () => {
  const events = [];
  const combat = new Combat(BOSSES[1], event => events.push(event));
  combat.player.x = combat.boss.x = 7;
  combat.player.z = 0;
  combat.boss.z = -1.8;
  combat.dodge(1);
  combat.update(0.35, idle);
  useAttack(combat, 'numbers');
  assert.equal(combat.canDodge, true);
  assert.ok(combat.dodgeCooldown > 0);
  combat.dodge(1);
  combat.update(0.2, idle);
  assert.equal(combat.player.hp, 100);
  combat.update(0.4, idle);
  assert.notEqual(combat.boss.phase, 'telegraph');
  assert.equal(combat.projectiles.length, 1);
  assert.ok(combat.dodgeCooldown > 0);
  assert.equal(combat.canDodge, true);
  combat.dodge(1);
  combat.update(0.2, idle);
  assert.equal(combat.player.hp, 100);
  assert.equal(events.filter(event => event === 'avoided').length, 2);
});

test('dodge spam leaves damageable gaps, and threat reactions never grant unrelated immunity', () => {
  const spam = new Combat(BOSSES[0]);
  spam.boss.phase = 'recover';
  spam.attack = { ...spam.attack, recovery: 100 };
  let vulnerableFrames = 0, dodges = 0;
  for (let frame = 0; frame < 240; frame++) {
    if (spam.dodge(frame % 2 ? 1 : -1)) dodges++;
    spam.update(1 / 120, idle);
    if (spam.invulnerable === 0) vulnerableFrames++;
    spam.damage(5, {});
  }
  assert.ok(vulnerableFrames > 100);
  assert.ok(dodges <= 3);
  assert.ok(spam.player.hp < 100);
  const reaction = new Combat(BOSSES[0]);
  reaction.player.x = reaction.boss.x = 7;
  reaction.player.z = 0;
  reaction.boss.z = -1.8;
  reaction.dodge(1);
  reaction.update(0.35, idle);
  reaction.attack = { ...attackById(reaction, 'basic') };
  reaction.boss.phase = 'telegraph';
  reaction.boss.time = reaction.windup - 0.1;
  reaction.dodge(1);
  reaction.damage(9, {});
  assert.equal(reaction.player.hp, 91);
});

function skilledBot(definition) {
  const combat = new Combat(definition);
  const phases = new Set();
  const attacks = new Set();
  const dt = 1 / 60;
  for (let frame = 0; frame < 18000 && !combat.finished; frame++) {
    phases.add(combat.phaseIndex);
    if (combat.boss.phase === 'telegraph') attacks.add(combat.attack.id);
    const decision = chooseCombatInput(combat);
    // Mouse aiming is supported; position, HP and cooldowns are changed only by Combat.
    combat.player.yaw = decision.yaw;
    if (decision.dodgeSide !== null) combat.dodge(decision.dodgeSide);
    if (decision.punch) combat.punch();
    combat.update(dt, decision.input);
  }
  return { combat, phases, attacks };
}

test('a deterministic skilled player beats all four with real movement, dodges and counterpunches; no health hacks', () => {
  for (const definition of BOSSES) {
    const { combat, phases } = skilledBot(definition);
    assert.equal(combat.boss.hp, 0, `${definition.name}: boss ${combat.boss.hp} / player ${combat.player.hp} / ${combat.elapsed.toFixed(1)}s`);
    assert.equal(combat.outcome, 'win', definition.name);
    assert.ok(combat.player.hp > 0, definition.name);
    assert.ok(combat.counterHits > 0);
    assert.equal(phases.size, definition.phases.length, `${definition.name}: all phases should be playable`);
  }
});

test('shared browser bot chooses inputs without mutating combat and stops after a finished fight', () => {
  const combat = new Combat(BOSSES[1]);
  combat.hazards = [openHole(2, 2)];
  combat.boss.phase = 'telegraph';
  combat.boss.time = combat.windup - 0.1;
  const before = JSON.stringify(combat);
  const decision = chooseCombatInput(combat);
  assert.equal(JSON.stringify(combat), before);
  assert.equal(decision.input.turn, 0);
  assert.ok(Number.isFinite(decision.yaw));
  assert.ok(Math.hypot(decision.input.x, decision.input.z) <= 1.000001);
  assert.ok([null, -1, 1].includes(decision.dodgeSide));
  assert.deepEqual(chooseCombatInput(combat), decision);
  combat.finished = true;
  const stopped = chooseCombatInput(combat);
  assert.equal(stopped.punch, false);
  assert.equal(stopped.dodgeSide, null);
  assert.deepEqual(stopped.input, idle);
});

test('the fair bot reacts to a delayed projectile during cooldown, not only to telegraphs', () => {
  const combat = new Combat(BOSSES[2]);
  combat.player.z = 0;
  combat.dodge(-1);
  combat.update(0.35, idle);
  combat.boss.phase = 'recover';
  combat.attack = { ...combat.attack, recovery: 10 };
  combat.projectiles = [{
    x: combat.player.x, z: combat.player.z - 1, vx: 0, vz: 6.4,
    ttl: 1, radius: 0.42, damage: 18, type: 'newsletter',
  }];
  assert.equal(combat.invulnerable, 0);
  assert.ok(combat.dodgeCooldown > 0);
  const before = JSON.stringify(combat);
  const decision = chooseCombatInput(combat);
  assert.equal(JSON.stringify(combat), before);
  assert.notEqual(decision.dodgeSide, null);
  combat.player.yaw = decision.yaw;
  assert.equal(combat.dodge(decision.dodgeSide), true);
  combat.update(0.3, decision.input);
  assert.equal(combat.player.hp, 100);
  assert.equal(chooseCombatInput(combat).dodgeSide, null, 'do not spam an already handled threat');
});

test('effects reuse bounded pools, show actual headings and above-floor voids, and dispose all resources', () => {
  const originalDocument = globalThis.document;
  const text = [];
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect() {}, strokeRect() {}, strokeText() {},
        fillText(value) { text.push(value); },
      }),
    }),
  };
  try {
    const scene = new THREE.Scene();
    const effects = new CombatEffects(scene);
    assert.equal(effects.projectilePool.length * 3, 48);
    assert.equal(effects.hazardPool.length, 8);
    assert.ok(text.includes('DAILY DIGEST'));
    assert.ok(text.includes('APPS NYTT'));
    assert.ok(text.includes('CMON!!'));
    assert.ok(text.includes('404'));
    const combat = new Combat(BOSSES[3]);
    combat.hazards = [openHole(2, 2)];
    useAttack(combat, 'aura');
    effects.update(combat, 1 / 60);
    assert.equal(effects.projectilePool[0].group.visible, true);
    assert.equal(effects.projectilePool[0].parts.filter(p => p.visible).length, 3);
    assert.equal(effects.hazardPool[0].voidMesh.visible, true);
    assert.ok(effects.hazardPool[0].voidMesh.position.y > 0.055);
    assert.equal(effects.bossAura.visible, true);
    assert.equal(effects.bossAuraSparks.visible, true);
    assert.equal(effects.bossAuraSparks.isInstancedMesh, true);
    const sparkCount = effects.bossAuraSparks.count;
    assert.ok(sparkCount > 0 && sparkCount <= 64);
    const sparkStart = new THREE.Matrix4();
    const sparkEnd = new THREE.Matrix4();
    effects.bossAuraSparks.getMatrixAt(0, sparkStart);
    effects.update(combat, 0.1);
    effects.bossAuraSparks.getMatrixAt(0, sparkEnd);
    assert.ok(sparkEnd.elements[13] > sparkStart.elements[13], 'sparks rise rather than merely rotate');
    assert.notEqual(sparkEnd.elements[0], sparkStart.elements[0], 'spark transforms pulse');
    combat.phaseIndex = 3;
    combat.boss.phase = 'telegraph';
    combat.boss.time = combat.windup * 0.8;
    effects.update(combat, 0);
    assert.ok(effects.bossAuraSparks.count > sparkCount);
    assert.ok(effects.bossAuraSparks.count <= 64);
    const resourceCount = [effects.materials.size, effects.geometries.size, effects.textures.size];
    for (let i = 0; i < 60; i++) {
      combat.projectiles[0].type = i % 2 ? 'newsletter' : 'candy';
      combat.projectiles[0].label = i % 4 ? 'DAILY DIGEST' : 'APPS NYTT';
      effects.update(combat, 1 / 60);
    }
    assert.deepEqual([effects.materials.size, effects.geometries.size, effects.textures.size], resourceCount);
    combat.attack = attackById(combat, 'uppercut');
    combat.boss.phase = 'telegraph';
    effects.update(combat, 0);
    assert.equal(effects.cmon.visible, true);
    let disposed = 0;
    for (const resource of [...effects.materials, ...effects.geometries, ...effects.textures.values(), effects.bossAuraSparks]) {
      resource.addEventListener('dispose', () => disposed++);
    }
    const expected = effects.materials.size + effects.geometries.size + effects.textures.size + 1;
    effects.update(new Combat(BOSSES[0]), 0);
    assert.equal(effects.bossAuraSparks.visible, false);
    assert.equal(effects.bossAuraSparks.count, 0);
    effects.reset();
    assert.ok(effects.projectilePool.every(slot => !slot.group.visible));
    assert.ok(effects.hazardPool.every(slot => !slot.group.visible));
    assert.equal(effects.bossAuraSparks.visible, false);
    effects.dispose();
    effects.dispose();
    assert.equal(scene.children.length, 0);
    assert.equal(disposed, expected);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
