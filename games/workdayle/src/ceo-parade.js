import * as THREE from 'three';
import { builder, subgroup, createCharacter, framedDoor, floorLabel, sign, disposeGroup, instanceStaticGeometry } from './world.js';

const PRAISE = [
  'ALL HAIL THE CEO.',
  'They survived the meetings.',
  'They defeated management.',
  'They became management.',
  'What a leader. What a calendar.',
  'Please approve my annual leave.',
];

export class CEOParade {
  constructor(scene, camera, player, { onFinish, onLine }) {
    this.camera = camera;
    this.player = player;
    this.onFinish = onFinish;
    this.onLine = onLine;
    this.elapsed = 0;
    this.duration = 24;
    this.finished = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.startPosition = camera.position.clone();
    this.startRotation = camera.quaternion.clone();
    this.cameraGoal = new THREE.Vector3();
    this.lookGoal = new THREE.Vector3();
    this.lookCamera = new THREE.PerspectiveCamera();
    this.group = new THREE.Group();
    this.group.name = 'ceo-praise-corridor';
    const b = builder();
    const decor = subgroup(this.group);
    b.box(decor, '#ede3ce', 0, -0.16, 0, 14, 0.3, 70);
    b.box(decor, '#702e3c', 0, 0.015, 0, 4.7, 0.025, 68);
    for (const side of [-1, 1]) {
      b.box(decor, '#cca647', side * 2.4, 0.04, 0, 0.1, 0.035, 68);
      b.box(decor, '#263a35', side * 6.7, 2.4, 0, 0.3, 4.8, 70);
      for (let z = -30; z <= 30; z += 6) {
        b.cylinder(decor, '#cca647', side * 6.4, 2.5, z, 0.22, 5);
        b.sphere(decor, '#fff0c2', side * 5.8, 3.5, z, 0.23, 0.4, 0.23,
          { emissive: '#fff0c2', emissiveIntensity: 1.4 });
      }
    }
    framedDoor(b, decor, 0, -34, 'THE CORNER OFFICE', '#c9a24a', 0, 'UNLIMITED EXPENSE ACCOUNT');
    b.box(decor, '#d6b660', 0, 3.5, -34.3, 13, 7, 0.3);
    sign(decor, 'YOU ARE MANAGEMENT', 0, 5.4, -34, 10, 1);
    floorLabel(decor, 'LEADERSHIP / THIS WAY', 0, 20, 4.3, 0.6, '#e8c769');
    instanceStaticGeometry(decor);
    this.employees = [];
    const template = createCharacter('#576f79');
    template.userData = {};
    for (let row = 0; row < 14; row++) {
      for (const side of [-1, 1]) {
        // Clones share geometry/materials but retain independent animated joints.
        const npc = template.clone(true);
        npc.userData = {};
        npc.position.set(side * (3.5 + (row % 2) * 0.65), 0, 27 - row * 4.3);
        this.group.add(npc);
        const body = npc.children[0];
        this.employees.push({
          root: npc, body, arms: body.children.filter(child => child.isGroup).slice(1, 3),
          legs: npc.children.slice(1, 3), pose: (row + (side > 0 ? 1 : 0)) % 5, row,
        });
      }
    }
    this.confettiCount = this.reducedMotion ? 240 : 1800;
    const positions = new Float32Array(this.confettiCount * 3);
    const colors = new Float32Array(this.confettiCount * 3);
    const palette = ['#ffd467', '#e88c99', '#9edfc4', '#f9eddf', '#adadff'].map(c => new THREE.Color(c));
    for (let i = 0; i < this.confettiCount; i++) {
      positions[i * 3] = Math.random() * 12 - 6;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = Math.random() * 68 - 34;
      palette[i % palette.length].toArray(colors, i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 24);
    this.confetti = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    this.confetti.frustumCulled = false;
    this.group.add(this.confetti);
    scene.add(this.group);
    player.visible = true;
    player.rotation.set(0, Math.PI, 0);
    player.position.set(0, 0, 30);
    this.lastLine = -1;
    this.update(0);
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += Math.max(0, dt);
    const progress = Math.min(1, this.elapsed / this.duration);
    const walk = Math.min(1, Math.max(0, (this.elapsed - 2) / (this.duration - 2)));
    const z = 30 - 62 * walk;
    this.player.position.set(0, Math.abs(Math.sin(this.elapsed * 9)) * 0.035, z);
    this.player.userData.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this.elapsed * 9 + i * Math.PI) * 0.4; });
    this.player.userData.arms.forEach((arm, i) => { arm.rotation.x = -Math.sin(this.elapsed * 9 + i * Math.PI) * 0.32; });
    this.cameraGoal.set(1.6, 3.4, z + 7);
    this.lookGoal.set(0, 1.3, z - 5);
    this.lookCamera.position.copy(this.cameraGoal);
    this.lookCamera.lookAt(this.lookGoal);
    const blend = Math.min(1, this.elapsed / 2);
    this.camera.position.lerpVectors(this.startPosition, this.cameraGoal, blend * blend * (3 - 2 * blend));
    this.camera.quaternion.slerpQuaternions(this.startRotation, this.lookCamera.quaternion, blend);
    for (const { root, body, arms, legs, pose, row } of this.employees) {
      root.rotation.y = Math.atan2(-root.position.x, z - root.position.z);
      const beat = Math.sin(this.elapsed * 5 + row);
      if (pose === 0 || pose === 1) {
        root.position.y = -0.42;
        legs.forEach(leg => { leg.rotation.x = -1.2; });
        body.rotation.x = pose === 1 ? 0.25 + beat * 0.08 : 0.08;
      }
      arms.forEach((arm, i) => {
        arm.rotation.x = pose === 2 ? -2.6 + beat * 0.12 : pose === 3 ? -1.1 : -0.2;
        arm.rotation.z = pose === 3 ? (i ? 1 : -1) * (0.55 + beat * 0.18) : 0;
      });
      if (pose === 4) body.rotation.x = 0.2 + Math.max(0, beat) * 0.3;
    }
    const count = Math.min(this.confettiCount, Math.floor(24 + progress * progress * this.confettiCount));
    this.confetti.geometry.setDrawRange(0, count);
    const positions = this.confetti.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      positions.array[i * 3 + 1] -= dt * (0.75 + (i % 7) * 0.13);
      positions.array[i * 3] += Math.sin(this.elapsed * 2 + i) * dt * 0.2;
      if (positions.array[i * 3 + 1] < 0) {
        positions.array[i * 3 + 1] = 6 + (i % 10) * 0.1;
        positions.array[i * 3 + 2] = Math.max(-34, Math.min(34, z + (i % 23) - 15));
      }
    }
    positions.needsUpdate = true;
    const line = Math.min(PRAISE.length - 1, Math.floor(walk * PRAISE.length));
    if (line !== this.lastLine) {
      this.lastLine = line;
      this.onLine(PRAISE[line]);
    }
    if (progress === 1) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.onFinish();
  }

  dispose() {
    this.finished = true;
    disposeGroup(this.group);
    this.employees.length = 0;
  }
}
