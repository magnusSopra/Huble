import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HEAD_PROFILES, createHeadGeometry, getFaceCrop, headRing } from '../src/boss-head.js';
import { animateBoss } from '../src/boss-animation.js';
import { Combat } from '../src/combat.js';
import { BOSSES } from '../src/bosses.js';

test('each authored crop excludes the torso and preserves source-pixel proportions', () => {
  for (const profile of Object.values(HEAD_PROFILES)) {
    const crop = getFaceCrop(profile, ...profile.source);
    assert.deepEqual(Object.values(crop).map(Math.round), profile.crop);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.x + crop.width <= profile.source[0]);
    assert.ok(crop.y + crop.height <= profile.source[1]);
    const doubled = getFaceCrop(profile, profile.source[0] * 2, profile.source[1] * 2);
    assert.equal(doubled.width / doubled.height, crop.width / crop.height);
    assert.ok(crop.width / crop.height > 0.6 && crop.width / crop.height < 0.8);
  }
  assert.throws(() => getFaceCrop(HEAD_PROFILES.jill_guldhav, 0, 325), RangeError);
});

test('heads are closed, outward-facing volumes with continuous normals at their UV seam', () => {
  for (const profile of Object.values(HEAD_PROFILES)) {
    const geometry = createHeadGeometry(profile);
    const { position, normal } = geometry.attributes;
    const indices = geometry.index.array, edges = new Map();
    const pointKey = index => [position.getX(index), position.getY(index), position.getZ(index)].map(n => n.toFixed(5).replace('-0.00000', '0.00000')).join(',');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let volume = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = [...indices.slice(i, i + 3)];
      a.fromBufferAttribute(position, triangle[0]);
      b.fromBufferAttribute(position, triangle[1]);
      c.fromBufferAttribute(position, triangle[2]);
      volume += a.dot(b.cross(c)) / 6;
      for (let edge = 0; edge < 3; edge++) {
        const key = [pointKey(triangle[edge]), pointKey(triangle[(edge + 1) % 3])].sort().join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.ok(volume > 0.04, 'A head must enclose an outward-facing volume, not a photograph surface.');
    assert.ok([...edges.values()].every(count => count === 2), 'Every edge belongs to exactly two faces.');
    assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 0.45);
    const { rows, columns } = geometry.userData;
    for (let row = 0; row <= rows; row++) {
      a.fromBufferAttribute(normal, row * (columns + 1));
      b.fromBufferAttribute(normal, row * (columns + 1) + columns);
      assert.ok(a.distanceTo(b) < 1e-6);
    }
    geometry.dispose();
  }
});

test('projected face UVs give original photo pixels identical X and Y world scale', () => {
  for (const profile of Object.values(HEAD_PROFILES)) {
    const geometry = createHeadGeometry(profile);
    const { position, uv } = geometry.attributes;
    const { width, height } = geometry.userData;
    assert.ok(Math.abs(width / profile.crop[2] - height / profile.crop[3]) < 1e-10);
    for (let i = 0; i < position.count; i++) {
      const u = uv.getX(i), v = 1 - uv.getY(i);
      const projectedX = Math.sin((u - 0.5) * Math.PI * 2) * headRing(v) * width / 2;
      assert.ok(Math.abs(projectedX - position.getX(i)) < 1e-6);
      assert.ok(Math.abs((0.5 - v) * height - position.getY(i)) < 1e-6);
    }
    geometry.dispose();
  }
});

test('uppercut crouches, sweeps the fist up at contact, recovers and preserves head aim', () => {
  const mesh = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  const arms = [new THREE.Group(), new THREE.Group()], legs = [new THREE.Group(), new THREE.Group()];
  mesh.add(body, ...legs);
  body.add(head, ...arms);
  head.position.y = 1.62;
  arms[1].position.set(0.36, 1.19, 0);
  mesh.userData = { body, head, arms, legs };
  mesh.position.set(3, 0, -2);
  mesh.rotation.y = 0.8;
  const combat = new Combat(BOSSES[3]);
  combat.attack = { ...BOSSES[3].attacks.find(attack => attack.id === 'uppercut') };
  const sample = (phase, time) => {
    combat.boss.phase = phase;
    combat.boss.time = time;
    animateBoss(mesh, combat, 0);
    mesh.updateMatrixWorld(true);
    const direction = new THREE.Vector3(0, 0, 1).transformDirection(head.matrixWorld);
    assert.ok(direction.dot(new THREE.Vector3(Math.sin(0.8), 0, Math.cos(0.8))) > 0.99999);
    assert.equal(head.parent, body);
    assert.deepEqual(mesh.position.toArray(), [3, 0, -2]);
    return { y: body.position.y, arm: arms[1].rotation.x, fist: arms[1].localToWorld(new THREE.Vector3(0, -0.43, 0.09)) };
  };
  const charge = sample('telegraph', combat.windup);
  assert.ok(charge.y < -0.25 && charge.arm > 0.7);
  const release = sample('attack', 0);
  assert.equal(release.y, charge.y);
  assert.equal(release.arm, charge.arm);
  const contact = sample('attack', combat.uppercutContact);
  assert.ok(contact.fist.y - release.fist.y > 0.7, 'the fist rises rather than snapping to a fixed pose');
  assert.ok(contact.arm < -1.7);
  const apex = sample('attack', 0.3);
  assert.ok(apex.y > 0.2 && apex.arm < -2.8);
  assert.deepEqual(sample('recover', 0), apex);
  const recovered = sample('recover', combat.attack.recovery);
  assert.equal(recovered.y, 0);
  assert.equal(recovered.arm, -0.2);
  sample('approach', 0);
  assert.ok(legs.every(leg => leg.scale.y === 1 && leg.rotation.x === 0));
});
