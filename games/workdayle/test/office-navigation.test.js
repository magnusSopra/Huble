import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOfficeNavigation, shuffled } from '../src/office-navigation.js';
import { NPC_SLOTS } from '../src/layout.js';

test('office routes go around partitions with player-sized clearance', () => {
  const nav = createOfficeNavigation([{ x: 0, z: 0, w: 0.2, d: 5 }], { x: 5, z: 5 }, { spawn: { x: -3, z: 0 } });
  const route = nav.route({ x: -3, z: 0 }, { x: 3, z: 0 });
  assert.ok(route.length > 12);
  assert.deepEqual(route[0], { x: -3, z: 0 });
  assert.deepEqual(route.at(-1), { x: 3, z: 0 });
  assert.ok(route.some(p => Math.abs(p.z) >= 3));
  for (let i = 1; i < route.length; i++) {
    assert.equal(Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].z - route[i - 1].z), 0.5);
    for (let t = 0; t <= 1; t += 0.1) assert.ok(nav.isWalkable({
      x: route[i - 1].x * (1 - t) + route[i].x * t,
      z: route[i - 1].z * (1 - t) + route[i].z * t,
    }));
  }
});

test('restricted rooms and disconnected cells never become NPC destinations', () => {
  const nav = createOfficeNavigation([{ x: 0, z: 0, w: 0.2, d: 12 }], { x: 5, z: 5 }, {
    spawn: { x: -3, z: 0 }, restricted: [{ x: -3, z: -3, w: 2, d: 2 }],
  });
  assert.ok(nav.points.length > 0);
  assert.ok(nav.points.every(p => p.x < 0 && nav.isWalkable(p)));
  assert.equal(nav.isWalkable({ x: -3, z: -3 }), false);
  assert.deepEqual(nav.route({ x: -3, z: 0 }, { x: 3, z: 0 }), []);
  assert.deepEqual(nav.route({ x: -3, z: 0 }, { x: -3, z: -3 }), []);
  assert.ok(nav.nearest({ x: 3, z: 0 }).x < 0);
  assert.equal(nav.isWalkable({ x: NaN, z: 0 }), false);
  assert.equal(nav.isWalkable({ x: 5, z: 0 }), false);
});

test('full task-pool shuffling preserves every original entry without mutation', () => {
  const tasks = Array.from({ length: 16 }, (_, id) => ({ id }));
  const result = shuffled(tasks, () => 0);
  assert.equal(new Set(result).size, 16);
  assert.deepEqual([...result].sort((a, b) => a.id - b.id), tasks);
  assert.deepEqual(tasks.map(t => t.id), Array.from({ length: 16 }, (_, id) => id));
  assert.notDeepEqual(result, tasks);
  assert.ok(NPC_SLOTS.length >= 16);
  assert.equal(new Set(NPC_SLOTS.map(p => `${p.x},${p.z}`)).size, NPC_SLOTS.length);
});
