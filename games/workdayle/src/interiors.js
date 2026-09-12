import * as THREE from 'three';
import { builder, sign, floorLabel, framedDoor, plant, subgroup, chair, createCharacter, disposeGroup, instanceStaticGeometry } from './world.js';
import { addBathroomCamera, collectInRoom } from './exploration.js';

export function createBathroom(luxury = false, options = {}) {
  const b = builder();
  const group = new THREE.Group();
  group.name = luxury ? 'ceo-private-bathroom' : 'employee-bathroom';
  const trim = luxury ? '#d6ad4b' : '#627e78';
  const stone = luxury ? '#f0eade' : '#dbe5df';
  const colliders = [];
  const solid = (x, z, w, d, height, color) => {
    colliders.push({ x, z, w, d });
    return b.box(group, color, x, height / 2, z, w, height, d);
  };
  b.box(group, stone, 0, -0.12, 0, 13, 0.24, 11);
  for (let x = -6; x <= 6; x++) b.box(group, trim, x, 0.008, 0, 0.018, 0.01, 10.8);
  for (let z = -5; z <= 5; z++) b.box(group, trim, 0, 0.01, z, 12.8, 0.01, 0.018);
  solid(0, -5.3, 13, 0.2, 3.5, stone);
  solid(-6.4, 0, 0.2, 10.6, 2.2, stone);
  solid(6.4, 0, 0.2, 10.6, 0.85, stone);
  solid(0, 5.3, 13, 0.2, 0.7, trim);
  // Cutaway walls keep the same overhead controller and all fixtures visible.
  for (const x of luxury ? [-3] : [-4, -1]) {
    solid(x, -3.7, 0.85, 1.3, 0.65, stone);
    b.box(group, stone, x, 0.97, -4.18, 0.83, 0.98, 0.32, true);
    b.ring(group, trim, x, 0.7, -3.5, 0.32, 0.2);
    b.cylinder(group, '#435b55', x, 0.67, -3.5, 0.21, 0.06);
    b.box(group, trim, x + 0.22, 1.32, -3.99, 0.13, 0.07, 0.07, true);
    solid(x + 1.25, -3.55, 0.14, 3, 1.05, trim);
    b.box(group, trim, x - 0.75, 0.7, -2.2, 0.11, 1.4, 0.11);
    const door = b.box(group, trim, x - 0.85, 0.65, -1.8, 0.12, 1.3, 0.9, true);
    door.rotation.y = -0.45;
    b.cylinder(group, '#fff7e3', x + 0.86, 0.75, -3.2, 0.13, 0.3).rotation.z = Math.PI / 2;
  }
  solid(3.3, -4.4, 3.3, 1.1, 1, luxury ? '#332925' : trim);
  b.box(group, stone, 3.3, 1.05, -4.4, 3.45, 0.14, 1.2, true);
  for (const x of [2.45, 4.1]) {
    b.sphere(group, '#8aa9ad', x, 1.12, -4.3, 0.48, 0.06, 0.34);
    b.beam(group, trim, [x, 1.1, -4.65], [x, 1.6, -4.65], 0.035);
    b.beam(group, trim, [x, 1.6, -4.65], [x, 1.6, -4.35], 0.035);
  }
  b.box(group, trim, 3.3, 2.25, -5.1, 3.6, 1.5, 0.08, true);
  b.box(group, '#c0dbdd', 3.3, 2.25, -5.04, 3.35, 1.25, 0.04, false,
    { metalness: 0.25, roughness: 0.08 });
  for (const x of [2.25, 2.65, 4.25]) {
    const reflection = b.box(group, '#e4f4ed', x, 2.25, -5.01, 0.09, 1.05, 0.015);
    reflection.rotation.z = -0.3;
  }
  b.box(group, '#fff2c2', 3.3, 3.12, -5, 3.7, 0.1, 0.15, false,
    { emissive: '#fff2c2', emissiveIntensity: 1 });
  if (luxury) {
    for (const x of [-5.9, 5.9]) {
      b.cylinder(group, trim, x, 1.55, -4.5, 0.16, 3.1, { metalness: 0.4, roughness: 0.2 });
      b.sphere(group, '#fff0bc', x, 3.2, -4.5, 0.25, 0.35, 0.25,
        { emissive: '#ffe6a0', emissiveIntensity: 0.7 });
    }
    b.box(group, '#573344', -2.7, 0.03, 0.2, 3.5, 0.035, 2, true);
    b.box(group, trim, -3, 0.2, -3.65, 0.65, 0.25, 0.9, true,
      { metalness: 0.4, roughness: 0.2 });
    for (let i = 0; i < 9; i++) {
      const vein = b.box(group, '#c9c4b5', (i % 3) * 3.8 - 4, 0.015, Math.floor(i / 3) * 3 - 3.5, 0.027, 0.007, 1.6);
      vein.rotation.y = 0.65;
    }
    const chandelier = b.ring(group, trim, 0, 3.8, 0, 1.1, 0.08);
    chandelier.name = 'executive-bathroom-chandelier';
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const x = Math.cos(angle), z = Math.sin(angle);
      b.beam(group, trim, [0, 4.5, 0], [x, 3.8, z], 0.025);
      b.sphere(group, '#fff5ce', x, 3.65, z, 0.09, 0.22, 0.09,
        { emissive: '#fff2bc', emissiveIntensity: 0.8 });
    }
  }
  framedDoor(b, group, 0, 5.1, luxury ? 'BACK TO YOUR EMPIRE' : 'BACK TO WORK', trim, Math.PI);
  colliders.push({ x: 0, z: 5, w: 2.5, d: 0.3 });
  plant(b, group, 5, 2.5, luxury ? 1.5 : 0.9);
  colliders.push({ x: 5, z: 2.5, w: 1, d: 1 });
  sign(group, luxury ? 'EXECUTIVE RELIEF' : 'NO MEETINGS IN HERE', -2.8, 2.8, -5.12, 4.4, 0.7);
  floorLabel(group, luxury ? 'GOLD STANDARD / ZERO STAKEHOLDERS' : 'EMPLOYEE WC / FINALLY, A CLOSED DOOR', 0, 0.7, 9, 0.6);
  const interactables = [
    { id: 'bathroom-exit', kind: 'exit-bathroom', x: 0, z: 3.35, label: luxury ? 'Return to CEO office' : 'Leave bathroom' },
    { id: 'toilet', kind: 'toilet', x: luxury ? -3 : -4, z: -2.05, label: luxury ? 'Use the gold-standard toilet' : 'Use toilet' },
    { id: 'sink', kind: 'sink', x: 3.3, z: -2.75, label: 'Wash hands / inspect leadership in mirror' },
  ];
  instanceStaticGeometry(group);
  if (!luxury) interactables.push(addBathroomCamera(b, group, options.floor ?? 0, options.collected));
  return {
    group, colliders, interactables, bounds: { x: 6, z: 4.8 }, spawn: { x: 0, z: 2.9 },
    collect(id) { return collectInRoom(interactables, id); },
    update() {},
    dispose() { disposeGroup(group); },
  };
}

function smallRoom(name, width, depth, label) {
  const b = builder(), group = new THREE.Group(), colliders = [], interactables = [];
  group.name = name;
  const architecture = subgroup(group);
  architecture.name = `${name}-static`;
  const solid = (x, z, w, d, height, color) => {
    colliders.push({ x, z, w, d });
    return b.box(architecture, color, x, height / 2, z, w, height, d, true);
  };
  b.box(architecture, '#d9d0b7', 0, -0.12, 0, width * 2 + 1, 0.24, depth * 2 + 1);
  solid(0, -depth, width * 2, 0.22, 3.4, '#d5dbcc');
  solid(-width, 0, 0.22, depth * 2, 1.3, '#b7c4b1');
  solid(width, 0, 0.22, depth * 2, 0.8, '#b7c4b1');
  solid(0, depth, width * 2, 0.22, 0.65, '#899779');
  framedDoor(b, architecture, 0, depth - 0.2, 'BACK TO THE OFFICE', '#647e70', Math.PI);
  colliders.push({ x: 0, z: depth - 0.2, w: 2.6, d: 0.5 });
  sign(architecture, label, 0, 2.6, -depth + 0.13, width * 1.45, 0.8);
  const room = {
    group, colliders, interactables, bounds: { x: width - 0.4, z: depth - 0.4 }, spawn: { x: 0, z: depth - 2 },
    update() {}, dispose() { disposeGroup(group); },
  };
  return { b, architecture, solid, room };
}

export function createSecretRoom() {
  const { b, architecture, solid, room } = smallRoom('coffee-jira-shrine', 6, 5.5, 'THE BACKLOG BEHIND THE BACKLOG');
  solid(-3, -3, 2.4, 1.8, 0.7, '#788267');
  b.cylinder(architecture, '#eee5c9', -3, 1.35, -3, 0.54, 1.2);
  b.cylinder(architecture, '#684932', -3, 1.96, -3, 0.48, 0.03);
  const handle = b.ring(architecture, '#eee5c9', -2.4, 1.4, -3, 0.36, 0.18);
  handle.rotation.x = 0;
  for (const x of [-4.6, -1.4]) {
    b.cylinder(architecture, '#e4be76', x, 0.7, -3, 0.1, 1.4);
    b.sphere(architecture, '#ffe6a6', x, 1.5, -3, 0.07, 0.18, 0.07,
      { emissive: '#ffe6a6', emissiveIntensity: 0.8 });
  }
  solid(3, -3.9, 3.4, 0.45, 2.8, '#4b665c');
  for (let i = 0; i < 9; i++) {
    const x = 2 + (i % 3), y = 2.3 - Math.floor(i / 3) * 0.6;
    b.box(architecture, ['#ded48f', '#b5cee4', '#b3d0a8'][i % 3], x, y, -3.64, 0.65, 0.42, 0.025);
    sign(architecture, i === 8 ? 'DONE?' : 'BLOCKED', x, y, -3.62, 0.6, 0.16);
  }
  floorLabel(architecture, 'NO QUESTS. NO SYNERGY. JUST BEANS.', 0, 1, 9, 0.6);
  room.interactables.push(
    { id: 'secret-exit', kind: 'exit-secret', x: 0, z: 3.4, label: 'Return through the archive panel' },
    { id: 'coffee-shrine', kind: 'easter-egg', x: -3, z: -1.1, label: 'Pay respects to the coffee bean',
      message: 'The sacred mug whispers: “Your best ideas are 87% water and 13% avoiding a meeting.” Nothing is required of you here.' },
    { id: 'jira-shrine', kind: 'easter-egg', x: 3, z: -1.8, label: 'Consult the eternal Jira board',
      message: 'A ticket titled “Remove unnecessary tickets” has been blocked since 2014. You wisely leave it alone.' },
  );
  instanceStaticGeometry(architecture);
  return room;
}

export function createSnackRoom(boss) {
  const { b, architecture, solid, room } = smallRoom('jill-snack-room', 8.5, 7.5, 'JILL’S SNACK ROOM / SWEET FEEDBACK');
  for (const x of [-6, 5.8]) {
    solid(x, -4.9, 3.1, 1, 2.3, '#80704f');
    for (let row = 0; row < 3; row++) {
      b.box(architecture, '#d5b982', x, 0.35 + row * 0.7, -4.25, 3.2, 0.09, 1.35, true);
      for (let i = 0; i < 5; i++) {
        const px = x - 1.15 + i * 0.57, y = 0.67 + row * 0.7;
        if (x < 0) {
          const packet = b.box(architecture, ['#eab56b', '#cc8090', '#93b8ae'][row], px, y, -4.3, 0.39, 0.49, 0.3, true);
          packet.name = 'snack-candy-packet';
          sign(architecture, ['CHIPS', 'SWEETS', 'COOKIES'][row], px, y, -4.135, 0.35, 0.13);
        } else {
          const drink = b.cylinder(architecture, ['#db9864', '#a9c4a7', '#91afbf'][row], px, y, -4.3, 0.17, 0.5);
          drink.name = 'snack-room-drink';
          b.cylinder(architecture, '#dadbd0', px, y + 0.26, -4.3, 0.14, 0.025);
        }
      }
    }
  }
  solid(4.7, 0.7, 3.4, 2, 0.92, '#bb986a');
  const sweets = subgroup(architecture, 4.7, 1, 0.7);
  sweets.name = 'snack-table-bowls-and-candy';
  for (const x of [-0.9, 0.65]) {
    b.cylinder(sweets, '#eee1bc', x, 0.08, 0, 0.48, 0.16);
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4;
      b.sphere(sweets, ['#d89482', '#e6c169', '#a5bf8f'][i % 3], x + Math.cos(angle) * 0.28, 0.21, Math.sin(angle) * 0.28, 0.1);
    }
  }
  for (const z of [-1, 2.4]) {
    chair(b, architecture, 4.7, z, z > 0 ? Math.PI : 0, '#b88691');
    room.colliders.push({ x: 4.7, z, w: 0.7, d: 0.7 });
  }
  solid(-5.8, 1, 2.2, 2.7, 0.95, '#b49a70');
  b.box(architecture, '#62756a', -5.8, 1.1, 1, 2.3, 0.15, 2.8, true);
  for (const z of [0.2, 1, 1.8]) b.cylinder(architecture, '#e6cda8', -5.8, 1.26, z, 0.25, 0.2);
  plant(b, architecture, -7, 4.8, 1.3);
  room.colliders.push({ x: -7, z: 4.8, w: 0.9, d: 0.9 });
  floorLabel(architecture, 'TAKE A SWEET. TAKE A SEAT. TAKE SOME FEEDBACK.', 0, 3.6, 11, 0.55);
  room.interactables.push({ id: 'snack-exit', kind: 'exit-snack', x: 0, z: 4.4, label: 'Leave the snack room' });
  instanceStaticGeometry(architecture);
  room.bossMesh = createCharacter(boss.color, true, boss);
  room.bossMesh.position.set(0, 0, -1.5);
  room.group.add(room.bossMesh);
  room.ready = room.bossMesh.userData.headSurface?.ready || Promise.resolve('ready');
  return room;
}
