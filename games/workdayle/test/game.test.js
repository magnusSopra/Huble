import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, parseSave, moveWithCollisions, hasClearPath } from '../src/state.js';
import { Combat } from '../src/combat.js';
import { FLOORS, BOSSES } from '../src/content.js';
import { OFFICE_SPAWN } from '../src/layout.js';

test('all career stages have enough unique tasks and cannot skip promotion gates', () => {
  const game = new GameState();
  assert.equal(game.changeFloor(1), false);
  assert.equal(game.promote(), false);
  for (let floor = 0; floor < BOSSES.length; floor++) {
    assert.equal(game.changeFloor(floor), true);
    for (const task of FLOORS[floor].tasks) {
      assert.equal(game.completeTask(task), true);
      assert.equal(game.completeTask(task), false);
    }
    assert.equal(game.bossReady, true);
    assert.equal(game.promote(), true);
    assert.equal(game.promote(), false);
  }
  assert.equal(game.title, 'CEO');
  assert.equal(game.complete, true);
  assert.equal(game.changeFloor(4), true);
  assert.equal(game.bossesDefeated, 4);
  assert.equal(game.result.bosses, 4);
  assert.equal(game.result.tasks, FLOORS.reduce((sum, floor) => sum + floor.tasks.length, 0));
});

test('coffee and bathroom stay in bounds; save roundtrip preserves career', () => {
  const game = new GameState();
  game.energy = 20;
  game.drinkCoffee();
  assert.equal(game.energy, 55);
  assert.equal(game.bathroom, 25);
  for (let i = 0; i < 10; i++) game.drinkCoffee();
  assert.equal(game.energy, 100);
  assert.equal(game.bathroom, 100);
  game.completeTask(FLOORS[0].tasks[0]);
  const restored = new GameState(parseSave(JSON.stringify(game.serialize())));
  assert.equal(restored.isDone(FLOORS[0].tasks[0]), true);
  assert.equal(restored.rep[0], 25);
  assert.throws(() => parseSave('{"version":1}'));
});

test('collisions prevent tunneling and slide along furniture', () => {
  const position = { x: 0, z: 0 };
  moveWithCollisions(position, 8, 1, [{ x: 2, z: 0, w: 1, d: 8 }]);
  assert.ok(position.x < 1.2);
  assert.ok(position.z > 0.9);
});

test('punches require facing and range, counters do more damage', () => {
  const combat = new Combat(BOSSES[0]);
  combat.punch();
  assert.equal(combat.boss.hp, 120);
  combat.player.z = 0;
  combat.punchCooldown = 0;
  combat.punch();
  assert.equal(combat.boss.hp, 112);
  combat.punchCooldown = 0;
  combat.boss.phase = 'recover';
  combat.punch();
  assert.equal(combat.boss.hp, 92);
  combat.punchCooldown = 0;
  combat.player.yaw = Math.PI;
  combat.punch();
  assert.equal(combat.boss.hp, 92);
});

test('dodge avoids damage and retries start healthy', () => {
  const combat = new Combat(BOSSES[0]);
  combat.dodge();
  combat.damage(40);
  assert.equal(combat.player.hp, 100);
  combat.update(0.6, { x: 0, z: 0 });
  combat.damage(40);
  assert.equal(combat.player.hp, 60);
  combat.update(0.43, { x: 0, z: 0 });
  combat.damage(100);
  assert.equal(combat.finished, true);
  assert.equal(new Combat(BOSSES[0]).player.hp, 100);
});

test('the original simple counterattack loop remains playable against Jill', () => {
  for (const definition of BOSSES.slice(0, 1)) {
    const combat = new Combat(definition);
    for (let i = 0; i < 12000 && !combat.finished; i++) {
      const dx = combat.boss.x - combat.player.x;
      const dz = combat.boss.z - combat.player.z;
      combat.player.yaw = Math.atan2(-dx, -dz);
      if (combat.boss.phase === 'telegraph' && combat.boss.time > combat.windup - 0.2) combat.dodge();
      const distance = combat.distance();
      combat.update(1 / 60, { x: 0, z: distance > 2.2 ? -1 : 0 });
      if (combat.boss.phase === 'recover') combat.punch();
    }
    assert.equal(combat.boss.hp, 0, `${definition.title} must be beatable`);
    assert.ok(combat.player.hp > 0);
  }
});

test('unfinished original careers retain REP/tasks and move safely into the expanded map', () => {
  const original = {
    version: 1, rank: 2, floor: 1, rep: [175, 200, 30, 0],
    completed: ['0:restart', '1:deploy'], energy: 57, bathroom: 25,
    position: { x: 12, z: -6 }, elapsed: 320.5,
  };
  const state = new GameState(parseSave(JSON.stringify(original)));
  assert.equal(state.rank, 2);
  assert.equal(state.title, 'Department Manager');
  assert.deepEqual(state.position, OFFICE_SPAWN);
  assert.deepEqual(state.rep, [175, 200, 30, 0, 0]);
  assert.equal(state.completed.size, 2);
  assert.equal(state.bossesDefeated, 2);
  assert.equal(state.legacy, true);
  assert.equal(state.energy, 57);
  assert.equal(state.elapsed, 320.5);
  assert.equal(parseSave(JSON.stringify(state.serialize())).version, 2);
});

test('completed original careers keep the CEO title without claiming a four-boss record', () => {
  const state = new GameState(parseSave(JSON.stringify({
    version: 1, rank: 3, floor: 3, rep: [175, 200, 210, 0],
    completed: ['0:restart'], energy: 100, bathroom: 50,
    position: { x: 0, z: 0 }, elapsed: 720,
  })));
  assert.equal(state.title, 'CEO');
  assert.equal(state.floor, 4);
  assert.equal(state.complete, true);
  assert.equal(state.result.bosses, 3);
  assert.equal(state.result.time, 720);
  assert.equal(state.result.legacy, true);
});

test('walls block interactions while door gaps permit them', () => {
  const walls = [{ x: 1, z: 0, w: 0.2, d: 3 }];
  assert.equal(hasClearPath({ x: 0, z: 0 }, { x: 2, z: 0 }, walls), false);
  assert.equal(hasClearPath({ x: 0, z: 2 }, { x: 2, z: 2 }, walls), true);
  assert.equal(hasClearPath({ x: 0, z: 0 }, { x: 0.5, z: 0.5 }, walls), true);
  assert.equal(hasClearPath({ x: 0, z: 0 }, { x: 0, z: 2 }, walls), true);
});
