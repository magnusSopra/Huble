import { subgroup, sign } from './world.js';

const TRINKETS = [
  ['paperclip', 'Legendary paperclip', 'A paperclip holding together the entire delivery model.', -12, 9],
  ['duck', 'Debugging duck', 'The rubber duck says: have you tried explaining the problem out loud?', -18, -10],
  ['floppy', 'Ancient save icon', 'An actual floppy disk. Nobody remembers what it saved.', 12, -10],
  ['mug', 'World’s okayest colleague mug', 'A modest award for consistently attending work.', 18, 9],
  ['badge', 'Employee of some month', 'The date is blank. Your potential is unlimited.', -1.5, 6],
];

export function addOfficeCollectibles(b, group, floor, collected = new Set()) {
  return TRINKETS.map(([key, label, message, x, z]) => {
    const collectionId = `collectible:${floor}:${key}`;
    const mesh = subgroup(group, x, 0, z);
    mesh.name = collectionId;
    mesh.userData.noStaticBatch = true;
    b.cylinder(mesh, '#ae9059', 0, 0.2, 0, 0.3, 0.4);
    if (key === 'paperclip') {
      const clip = b.ring(mesh, '#e8ce84', 0, 0.7, 0, 0.22, 0.12);
      clip.rotation.x = 0; clip.scale.x = 0.5;
    } else if (key === 'duck') {
      b.sphere(mesh, '#f6d568', 0, 0.6, 0, 0.24, 0.17, 0.19);
      b.sphere(mesh, '#f6d568', 0.08, 0.79, 0.02, 0.14);
      b.box(mesh, '#d47d47', 0.19, 0.78, 0.11, 0.14, 0.06, 0.11);
    } else if (key === 'mug') {
      b.cylinder(mesh, '#faf0db', 0, 0.61, 0, 0.16, 0.3);
      const handle = b.ring(mesh, '#faf0db', 0.17, 0.62, 0, 0.1, 0.2);
      handle.rotation.x = 0;
    } else {
      b.box(mesh, key === 'floppy' ? '#596da0' : '#e9cb81', 0, 0.69, 0, 0.38, 0.44, 0.08, true);
      b.box(mesh, '#faf0db', 0, 0.73, 0.045, 0.25, 0.15, 0.015);
    }
    b.ring(mesh, '#ddc583', 0, 0.06, 0, 0.42);
    mesh.visible = !collected.has(collectionId);
    return { id: collectionId, kind: 'collectible', collectionId, label, message, x, z, mesh, collected: !mesh.visible };
  });
}

export function addBathroomCamera(b, group, floor, collected = new Set()) {
  const collectionId = `camera:${floor}`;
  const mesh = subgroup(group, 4.7, 3.22, -4.96);
  mesh.name = collectionId;
  mesh.userData.noStaticBatch = true;
  b.box(mesh, '#647a73', 0, 0, 0, 0.67, 0.36, 0.22, true);
  for (const y of [-0.11, 0, 0.11]) b.box(mesh, '#a6b9ae', 0, y, 0.13, 0.71, 0.055, 0.05);
  const lens = b.cylinder(mesh, '#35463f', 0.22, -0.16, 0.22, 0.13, 0.14);
  lens.rotation.x = Math.PI / 2;
  b.sphere(mesh, '#dc876d', 0.22, -0.16, 0.31, 0.06, 0.06, 0.025);
  sign(mesh, 'PROP', -0.12, -0.15, 0.16, 0.31, 0.12);
  const item = {
    id: collectionId, kind: 'camera', collectionId, mesh, x: 4.6, z: -2.9,
    label: 'Investigate the suspicious vent',
    message: 'You broke a ridiculous cardboard camera prop. No lens, no wires, no recordings. Privacy restored; satire remains.',
    collected: collected.has(collectionId),
  };
  if (item.collected) breakCamera(item);
  return item;
}

function breakCamera(item) {
  item.mesh.rotation.z = 0.55;
  item.mesh.position.y = 2.98;
  item.mesh.userData.broken = true;
  item.collected = true;
}

export function collectInRoom(interactables, id) {
  const item = interactables.find(entry => entry.collectionId === id);
  if (!item || item.collected) return false;
  if (item.kind === 'camera') breakCamera(item);
  else { item.mesh.visible = false; item.collected = true; }
  return true;
}
