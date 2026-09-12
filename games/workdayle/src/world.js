import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OFFICE_BOUNDS, OFFICE_SPAWN, NPC_SLOTS, OFFICE_STATIONS } from './layout.js';
import { bossSlug, createBossFace } from './boss-faces.js';
import { getHeadProfile } from './boss-head.js';
import { createOfficeNavigation, shuffled } from './office-navigation.js';
import { addOfficeCollectibles, collectInRoom } from './exploration.js';

const PALETTE = {
  cream: '#eee9dc', wall: '#e2e4d5', paper: '#faf7eb', sage: '#536e5f',
  dark: '#2e423b', mint: '#a9ba98', wood: '#bd9165', woodLight: '#d4ae7c',
  metal: '#586461', ink: '#293b36', screen: '#b7d4c0', clay: '#c78364',
  gold: '#c7ac65', green: '#b8e571', navy: '#46566a',
};
const FLOOR_THEMES = [
  {
    architecture: 'cramped-delivery-cubicles',
    floorBase: '#b8b3a7',
    floorTop: '#ede8db',
    grid: '#d1cec2',
    wall: '#dde0d6',
    trim: '#90a08d',
    cap: '#c4b08f',
    corridor: '#e6decf',
    stripe: '#b1bea8',
    chair: '#7d8c85',
    roomColors: ['#d8d0bc', '#cbd3d5', '#c4cec1', '#dde1d7', '#d3c8b6', '#c5cfbf'],
    lightFrame: PALETTE.metal,
    lightGlow: '#e2efe9',
    lightColor: '#e6f3ff',
    lightIntensity: 2.2,
    plantCount: 4,
    cubicle: true,
  },
  {
    architecture: 'team-meeting-suites',
    floorBase: '#bfae9a',
    floorTop: '#f1e3d7',
    grid: '#ddcfc1',
    wall: '#eee1d6',
    trim: '#9c6e5b',
    cap: '#d8b99f',
    corridor: '#f5e1d7',
    stripe: '#f0b58f',
    chair: '#869779',
    roomColors: ['#f0dcc9', '#c9dce0', '#d7e1c2', '#ebeadf', '#e5d3c2', '#d5dbc9'],
    lightFrame: '#7a6a5f',
    lightGlow: '#ffe4ac',
    lightColor: '#ffe1ab',
    lightIntensity: 8.5,
    plantCount: 10,
    coffeeAccent: '#d49d57',
  },
  {
    architecture: 'open-department-conference',
    floorBase: '#56474a',
    floorTop: '#d7d2dc',
    grid: '#b3aebb',
    wall: '#cfcbe0',
    trim: '#56657a',
    cap: '#8f7a6a',
    corridor: '#cbc3d4',
    stripe: '#6b7f99',
    chair: '#4d5862',
    roomColors: ['#cdc2c7', '#aeb9ca', '#bccbbf', '#d2d6df', '#c4b5af', '#b8c0c6'],
    lightFrame: '#6f7787',
    lightGlow: '#f2d8bb',
    lightColor: '#ffd7af',
    lightIntensity: 10,
    plantCount: 14,
    premium: true,
  },
  {
    architecture: 'executive-salon',
    floorBase: '#3a2f28',
    floorTop: '#efe2c8',
    grid: '#d2c3a6',
    wall: '#eadfc6',
    trim: '#b89d5f',
    cap: '#d1b670',
    corridor: '#f4ead7',
    stripe: '#d8b55b',
    chair: '#4a4038',
    roomColors: ['#e5d6bb', '#d6dcd7', '#d8d1b0', '#efe7d1', '#dec8a7', '#d8d5c4'],
    lightFrame: PALETTE.gold,
    lightGlow: '#fff0c7',
    lightColor: '#ffe1ab',
    lightIntensity: 13,
    plantCount: 18,
    premium: true,
    marble: true,
  },
];
const MIN_NPC_SPAWN_DISTANCE = 2.25;
const NPC_PERSONAL_SPACE = 1.05;
const NPC_CROWD_SLOWDOWN_RADIUS = 1.8;

export function builder() {
  const geometries = new Map();
  const materials = new Map();
  const geometry = (key, make) => {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key);
  };
  const material = (color, options = {}) => {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshStandardMaterial({
        color, roughness: 0.83, metalness: 0, flatShading: true, ...options,
      }));
    }
    return materials.get(key);
  };
  const mesh = (parent, shape, color, x, y, z, sx, sy, sz, options) => {
    const item = new THREE.Mesh(shape, material(color, options));
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const box = (parent, color, x, y, z, w, h, d, rounded = false, options) => mesh(
    parent,
    geometry(rounded ? 'round' : 'box', () => rounded
      ? new RoundedBoxGeometry(1, 1, 1, 2, 0.12)
      : new THREE.BoxGeometry(1, 1, 1)),
    color, x, y, z, w, h, d, options,
  );
  const cylinder = (parent, color, x, y, z, radius, height, options) => mesh(
    parent, geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 12)),
    color, x, y, z, radius, height, radius, options,
  );
  const sphere = (parent, color, x, y, z, rx, ry = rx, rz = rx, options) => mesh(
    parent, geometry('sphere', () => new THREE.IcosahedronGeometry(1, 1)),
    color, x, y, z, rx, ry, rz, options,
  );
  const ring = (parent, color, x, y, z, radius, thickness = 0.035) => {
    const item = mesh(
      parent, geometry(`ring:${thickness}`, () => new THREE.TorusGeometry(1, thickness, 4, 40)),
      color, x, y, z, radius, radius, radius,
    );
    item.rotation.x = -Math.PI / 2;
    item.castShadow = false;
    return item;
  };
  const beam = (parent, color, from, to, radius = 0.035) => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const item = cylinder(parent, color, midpoint.x, midpoint.y, midpoint.z, radius, direction.length());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return item;
  };
  return { box, cylinder, sphere, ring, beam, material, geometry };
}

export function subgroup(parent, x = 0, y = 0, z = 0, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  parent.add(group);
  return group;
}

function textTexture(text, {
  background = PALETTE.dark, foreground = PALETTE.paper, width = 768, height = 160,
  small = '', border = false,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Workdayle signage requires a 2D canvas context.');
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  if (border) {
    ctx.strokeStyle = foreground;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = small ? height * 0.36 : height * 0.49;
  ctx.font = `700 ${titleSize}px "Trebuchet MS", Arial, sans-serif`;
  const measured = ctx.measureText(String(text)).width;
  if (measured > width * 0.9) {
    ctx.font = `700 ${titleSize * width * 0.9 / measured}px "Trebuchet MS", Arial, sans-serif`;
  }
  ctx.fillText(String(text), width / 2, height * (small ? 0.37 : 0.52));
  if (small) {
    ctx.font = `500 ${height * 0.17}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillText(small, width / 2, height * 0.74, width * 0.88);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function sign(parent, text, x, y, z, width, height, options = {}) {
  const material = new THREE.MeshBasicMaterial({
    map: textTexture(text, options), transparent: options.background === 'transparent',
    side: THREE.DoubleSide, depthWrite: options.background !== 'transparent',
    toneMapped: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  panel.position.set(x, y, z);
  parent.add(panel);
  return panel;
}

export function floorLabel(parent, text, x, z, width, height, color = PALETTE.sage, small = '') {
  const item = sign(parent, text, x, 0.04, z, width, height, {
    foreground: color, background: 'transparent', small,
  });
  item.rotation.x = -Math.PI / 2;
  return item;
}

export function disposeGroup(group) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  group.traverse((object) => {
    object.userData.cancelPending?.();
    object.userData.disposed = true;
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    const ownMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of ownMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  group.removeFromParent();
  group.clear();
}

export function createCharacter(color = '#638e73', isBoss = false, boss = null) {
  const b = builder();
  const root = new THREE.Group();
  root.userData.noStaticBatch = true;
  const identity = boss ? bossSlug(boss) : '';
  const isJill = identity === 'jill_guldhav';
  const isSander = identity === 'sander_thomassen';
  const isAlf = identity === 'alf_gilroy';
  const isKjell = identity === 'kjell_rusti';
  root.name = isBoss ? 'corporate-heavyweight' : 'office-employee';
  const photoHead = isBoss && boss;
  const profile = getHeadProfile(identity);
  const skin = photoHead ? profile.skin : '#e3b892';
  const hair = photoHead ? profile.hair : isBoss ? '#58453b' : '#654d3c';
  const trousers = isBoss ? '#35413e' : '#45544f';
  const body = subgroup(root);
  b.box(body, color, 0, 0.96, 0, 0.59, 0.62, 0.34, true);
  b.box(body, PALETTE.paper, 0, 1.18, 0.183, 0.21, 0.13, 0.03, true);
  b.box(body, isBoss ? PALETTE.gold : PALETTE.dark, 0, 1.03, 0.191, 0.065, 0.24, 0.035, true);
  b.cylinder(body, skin, 0, 1.28, 0, 0.1, 0.12);
  const head = subgroup(body, 0, photoHead ? 1.62 : 1.49, 0);
  const earSkin = photoHead ? `#${new THREE.Color(skin).multiplyScalar(0.58).getHexString()}` : skin;
  if (photoHead) {
    const surface = createBossFace(boss);
    head.add(surface.group);
    root.userData.headSurface = surface;
  } else {
    b.box(head, skin, 0, 0, 0, 0.48, 0.46, 0.43, true);
    b.box(head, hair, 0, 0.205, -0.017, 0.5, 0.15, 0.45, true);
    b.box(head, hair, -0.17, 0.07, -0.13, 0.14, 0.29, 0.22, true);
    const quiff = b.box(head, hair, 0.07, 0.265, 0.015, 0.34, 0.12, 0.37, true);
    quiff.rotation.z = -0.1;
  }
  for (const side of [-1, 1]) {
    b.sphere(head, earSkin, side * (photoHead ? 0.275 : 0.251), -0.015, 0, photoHead ? 0.047 : 0.065, 0.085, photoHead ? 0.065 : 0.07);
    if (!photoHead) {
      b.box(head, PALETTE.ink, side * 0.106, 0.018, 0.218, 0.048, 0.062, 0.025, true);
      b.box(head, '#f1c7aa', side * 0.13, -0.075, 0.223, 0.075, 0.031, 0.012, true);
    }
  }
  if (!photoHead) {
    b.box(head, skin, 0, -0.031, 0.239, 0.063, 0.076, 0.065, true);
    b.box(head, '#936853', 0, -0.128, 0.218, 0.072, 0.023, 0.016, true);
  }
  if (isBoss && !photoHead) {
    for (const side of [-1, 1]) {
      b.box(head, PALETTE.gold, side * 0.108, 0.018, 0.238, 0.15, 0.105, 0.027, true);
      b.box(head, PALETTE.ink, side * 0.108, 0.018, 0.255, 0.114, 0.071, 0.012, true);
    }
    b.box(head, PALETTE.gold, 0, 0.02, 0.25, 0.08, 0.025, 0.018);
  }
  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = subgroup(body, side * 0.36, 1.19, 0);
    arm.rotation.z = side * 0.075;
    b.box(arm, color, 0, -0.17, 0, 0.2, 0.37, 0.24, true);
    b.box(arm, PALETTE.paper, 0, -0.344, 0, 0.205, 0.07, 0.245, true);
    b.box(arm, skin, 0, -0.43, 0.012, 0.19, 0.16, 0.22, true);
    if (isBoss) b.sphere(arm, PALETTE.clay, 0, -0.43, 0.09, 0.17, 0.19, 0.2);
    arms.push(arm);
    const leg = subgroup(root, side * 0.153, 0.63, 0);
    b.box(leg, trousers, 0, -0.23, 0, 0.225, 0.47, 0.27, true);
    b.box(leg, PALETTE.ink, 0, -0.548, 0.044, 0.245, 0.164, 0.38, true);
    legs.push(leg);
  }
  b.box(body, PALETTE.dark, 0.173, 1.066, 0.187, 0.014, 0.22, 0.022);
  b.box(body, PALETTE.paper, 0.173, 0.931, 0.197, 0.145, 0.175, 0.04, true);
  b.box(body, color, 0.173, 0.964, 0.22, 0.078, 0.047, 0.009);
  b.box(body, PALETTE.sage, 0.173, 0.905, 0.22, 0.082, 0.013, 0.009);
  if (isJill) {
    b.box(body, '#edb7bb', 0, 0.93, 0.186, 0.34, 0.53, 0.07, true);
    for (const side of [-1, 1]) {
      b.box(body, '#f4c9bd', side * 0.23, 0.99, 0.202, 0.12, 0.59, 0.085, true);
    }
    for (let i = 0; i < 3; i++) b.sphere(body, PALETTE.paper, 0, 1.08 - i * 0.13, 0.234, 0.028);
    b.sphere(head, hair, 0, 0.12, -0.245, 0.16, 0.18, 0.14);
    b.sphere(head, hair, 0, 0.355, -0.07, 0.19, 0.075, 0.19);
  } else if (isSander) {
    const quiff = b.sphere(head, hair, 0, 0.355, -0.065, 0.235, 0.105, 0.21);
    quiff.rotation.z = -0.15;
    for (const side of [-1, 1]) {
      const lapel = b.box(body, '#8b9dad', side * 0.135, 1.12, 0.195, 0.1, 0.25, 0.04, true);
      lapel.rotation.z = side * 0.33;
    }
    const calculator = subgroup(arms[1], 0, -0.34, 0.27);
    calculator.rotation.x = -0.22;
    b.box(calculator, '#253543', 0, 0, 0, 0.29, 0.39, 0.1, true);
    b.box(calculator, '#b6c99c', 0, 0.108, 0.055, 0.22, 0.083, 0.01);
    for (let i = 0; i < 9; i++) {
      b.box(calculator, i === 8 ? PALETTE.clay : PALETTE.paper,
        (i % 3 - 1) * 0.075, 0.006 - Math.floor(i / 3) * 0.07, 0.059, 0.041, 0.04, 0.013, true);
    }
  } else if (isAlf) {
    b.box(body, '#944e59', 0, 0.995, 0.218, 0.105, 0.36, 0.04, true);
    const newsletter = subgroup(arms[0], -0.06, -0.3, 0.27);
    newsletter.rotation.z = -0.13;
    b.box(newsletter, PALETTE.paper, 0, 0, 0, 0.44, 0.52, 0.035);
    sign(newsletter, 'THE DAILY SYNERGY', 0, 0.12, 0.02, 0.4, 0.12, {
      foreground: PALETTE.ink, background: PALETTE.paper, height: 96,
    });
    for (let i = 0; i < 4; i++) b.box(newsletter, '#8c9685', 0, 0.02 - i * 0.055, 0.022, 0.32, 0.012, 0.008);
  } else if (isKjell) {
    b.box(body, '#263a32', 0, 0.95, -0.027, 0.73, 0.65, 0.42, true);
    for (const side of [-1, 1]) {
      b.box(body, PALETTE.gold, side * 0.34, 1.21, 0.015, 0.22, 0.09, 0.39, true);
      const lapel = b.box(body, PALETTE.gold, side * 0.125, 1.1, 0.216, 0.075, 0.3, 0.045, true);
      lapel.rotation.z = side * 0.3;
    }
    b.box(body, PALETTE.paper, 0, 1.19, 0.216, 0.17, 0.12, 0.035);
    b.box(body, PALETTE.gold, 0, 0.96, 0.225, 0.078, 0.33, 0.035, true);
  }
  if (isBoss) root.scale.setScalar(isKjell ? 1.52 : 1.39);
  Object.assign(root.userData, { arms, legs, body, head, isBoss, bossId: identity });
  return root;
}

export function plant(b, parent, x, z, size = 1, y = 0) {
  const root = subgroup(parent, x, y, z);
  root.scale.setScalar(size);
  b.cylinder(root, PALETTE.clay, 0, 0.25, 0, 0.28, 0.5);
  b.cylinder(root, '#725642', 0, 0.507, 0, 0.238, 0.022);
  b.cylinder(root, PALETTE.dark, 0, 0.83, 0, 0.034, 0.65);
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4;
    const leaf = b.sphere(root, i % 2 ? '#718a60' : '#526d4d',
      Math.cos(angle) * 0.23, 0.94 + (i % 3) * 0.19, Math.sin(angle) * 0.23,
      0.17, 0.4, 0.16);
    leaf.rotation.z = Math.sin(angle) * 0.65;
    leaf.rotation.x = Math.cos(angle) * 0.65;
  }
  return root;
}

function mug(b, parent, x, y, z, color = PALETTE.paper) {
  b.cylinder(parent, color, x, y + 0.09, z, 0.082, 0.18);
  b.cylinder(parent, '#75513a', x, y + 0.181, z, 0.065, 0.008);
  const handle = b.ring(parent, color, x + 0.09, y + 0.1, z, 0.057, 0.24);
  handle.rotation.x = 0;
}

export function chair(b, parent, x, z, rotation = 0, color = PALETTE.sage) {
  const root = subgroup(parent, x, 0, z, rotation);
  b.box(root, PALETTE.metal, 0, 0.1, 0, 0.67, 0.08, 0.11, true);
  b.box(root, PALETTE.metal, 0, 0.1, 0, 0.11, 0.08, 0.67, true);
  b.cylinder(root, PALETTE.metal, 0, 0.3, 0, 0.063, 0.43);
  b.box(root, color, 0, 0.55, 0, 0.66, 0.17, 0.61, true);
  b.box(root, color, 0, 0.94, -0.265, 0.63, 0.65, 0.13, true);
  return root;
}

function desk(b, parent, x, z, rotation = 0, variant = 0) {
  const root = subgroup(parent, x, 0, z, rotation);
  b.box(root, PALETTE.woodLight, 0, 0.97, 0, 2.65, 0.18, 1.35, true);
  for (const side of [-1, 1]) {
    b.box(root, PALETTE.dark, side * 1.08, 0.46, 0, 0.13, 0.86, 1.12, true);
  }
  b.box(root, PALETTE.wood, 0.91, 0.59, 0.02, 0.55, 0.63, 0.93, true);
  b.box(root, PALETTE.dark, 0.91, 0.7, 0.492, 0.18, 0.025, 0.025);
  b.box(root, PALETTE.dark, 0.91, 0.44, 0.492, 0.18, 0.025, 0.025);
  b.box(root, PALETTE.sage, -0.3, 1.07, 0.16, 1.21, 0.018, 0.74, true);
  b.box(root, PALETTE.metal, -0.3, 1.102, 0.34, 0.72, 0.045, 0.26, true);
  if (variant % 2 === 0) {
    b.box(root, PALETTE.metal, -0.3, 1.18, -0.25, 0.38, 0.04, 0.3, true);
    b.box(root, PALETTE.metal, -0.3, 1.33, -0.25, 0.075, 0.3, 0.07);
    b.box(root, PALETTE.ink, -0.3, 1.66, -0.27, 1.02, 0.65, 0.09, true);
    b.box(root, PALETTE.screen, -0.3, 1.66, -0.219, 0.89, 0.52, 0.014, false,
      { emissive: PALETTE.screen, emissiveIntensity: 0.12 });
    for (let i = 0; i < 3; i++) {
      b.box(root, i === 0 ? PALETTE.sage : '#83a691',
        -0.4 + i * 0.07, 1.8 - i * 0.14, -0.208, 0.56 - i * 0.1, 0.035, 0.008);
    }
  } else {
    b.box(root, PALETTE.metal, -0.3, 1.102, 0, 0.83, 0.055, 0.59, true);
    const lid = subgroup(root, -0.3, 1.12, -0.28);
    lid.rotation.x = -0.16;
    b.box(lid, PALETTE.ink, 0, 0.27, 0, 0.83, 0.54, 0.055, true);
    b.box(lid, PALETTE.screen, 0, 0.27, 0.031, 0.73, 0.44, 0.008);
  }
  mug(b, root, 0.66, 1.06, 0.27, variant % 2 ? PALETTE.clay : PALETTE.paper);
  const notebook = b.box(root, variant % 2 ? PALETTE.navy : PALETTE.clay,
    -1.01, 1.09, 0.1, 0.36, 0.06, 0.49, true);
  notebook.rotation.y = 0.13;
  b.box(root, PALETTE.paper, -1.01, 1.124, 0.08, 0.21, 0.012, 0.022);
  return root;
}

export function framedDoor(b, parent, x, z, label, color, rotation = 0, small = '') {
  const root = subgroup(parent, x, 0, z, rotation);
  b.box(root, PALETTE.dark, 0, 1.54, -0.02, 2.52, 3.08, 0.28, true);
  b.box(root, color, 0, 1.4, 0.143, 2.12, 2.78, 0.08, true);
  b.box(root, PALETTE.gold, 0.74, 1.3, 0.22, 0.08, 0.42, 0.08, true);
  b.box(root, PALETTE.gold, 0, 0.04, 0.39, 2.61, 0.07, 0.75, true);
  sign(root, label, 0, 3.36, 0.03, 2.75, 0.65, {
    background: PALETTE.dark, foreground: PALETTE.paper, small,
  });
  return root;
}

function overlapsPoint(rect, point, radius) {
  const dx = Math.max(Math.abs(point.x - rect.x) - rect.w / 2, 0);
  const dz = Math.max(Math.abs(point.z - rect.z) - rect.d / 2, 0);
  return dx * dx + dz * dz < radius * radius;
}

export function instanceStaticGeometry(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || !object.visible
      || Array.isArray(object.material) || object.material.map || object.material.transparent) return;
    // Async heads replace their geometry after load; batching would strand the replacement.
    for (let ancestor = object; ancestor; ancestor = ancestor.parent) {
      if (ancestor.userData.noStaticBatch || ancestor.userData.cancelPending
        || ancestor.userData.photoState !== undefined || ancestor.userData.headSurface) return;
      if (ancestor === group) break;
    }
    const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  const inverse = group.matrixWorld.clone().invert();
  for (const meshes of batches.values()) {
    if (meshes.length < 3) continue;
    const first = meshes[0];
    const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    instances.castShadow = first.castShadow;
    instances.receiveShadow = first.receiveShadow;
    meshes.forEach((mesh, i) => {
      instances.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      mesh.removeFromParent();
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    group.add(instances);
  }
}

export function createOffice(floor, index = 0, options = {}) {
  const b = builder();
  const group = new THREE.Group();
  group.name = `office-floor-${index}`;
  const accent = floor.accent || PALETTE.mint;
  const rng = options.rng || Math.random;
  const tasks = shuffled(floor.tasks || [], rng);
  const taskDialogue = new Map((floor.npcs || []).map(npc => [npc.task?.id, npc.dialogue]));
  const npcs = (floor.npcs || []).map((npc, i) => ({
    ...npc, task: tasks[i] || npc.task, dialogue: taskDialogue.get(tasks[i]?.id) || npc.dialogue,
  }));
  const executive = index === 4;
  const tier = Math.min(index, 3);
  const theme = FLOOR_THEMES[tier];
  group.userData.architecture = theme.architecture;
  const colliders = [];
  const interactables = OFFICE_STATIONS.filter((station) => !executive || station.kind !== 'boss')
    .map((station) => ({ ...station }));
  const secretDoor = { id: 'secret-door', kind: 'secret-door', x: -24, z: 15.2, label: 'Inspect the slightly crooked archive panel' };
  interactables.push(secretDoor);
  const collectiblePoints = [{ x: -12, z: 9 }, { x: -18, z: -10 }, { x: 12, z: -10 }, { x: 18, z: 9 }, { x: -1.5, z: 6 }];
  const reserved = [...NPC_SLOTS, ...npcs, ...interactables, ...collectiblePoints, OFFICE_SPAWN];
  const solid = (x, z, w, d, create) => {
    const rect = { x, z, w, d };
    if (reserved.some((point) => overlapsPoint(rect, point, 0.72))) return false;
    colliders.push(rect);
    create?.();
    return true;
  };
  const wall = (x, z, w, d, height = 0.88) => {
    colliders.push({ x, z, w, d, kind: 'wall' });
    b.box(group, theme.wall, x, height / 2, z, w, height, d);
    b.box(group, theme.trim, x, 0.18, z, w + 0.015, 0.36, d + 0.015);
    b.box(group, theme.cap, x, height + 0.035, z, w + 0.035, 0.07, d + 0.035, true);
  };
  const doorway = (axis, fixed, center, label) => {
    const door = subgroup(group, axis === 'x' ? center : fixed, 0,
      axis === 'x' ? fixed : center, axis === 'x' ? 0 : Math.PI / 2);
    for (const side of [-1, 1]) b.box(door, PALETTE.sage, side * 1.42, 1.08, 0, 0.12, 2.16, 0.25, true);
    b.box(door, PALETTE.sage, 0, 2.14, 0, 2.98, 0.1, 0.25, true);
    b.box(door, accent, 0, 0.025, 0, 2.7, 0.035, 0.37);
    sign(door, label, 0, 2.43, 0.06, 3.05, 0.42, { background: PALETTE.dark });
  };
  const wallRun = (axis, fixed, start, end, doors = []) => {
    let cursor = start;
    const segment = (a, c) => {
      if (c <= a) return;
      if (axis === 'x') wall((a + c) / 2, fixed, c - a, 0.24);
      else wall(fixed, (a + c) / 2, 0.24, c - a);
    };
    for (const [center, label] of doors) {
      segment(cursor, center - 1.42);
      doorway(axis, fixed, center, label);
      cursor = center + 1.42;
    }
    segment(cursor, end);
  };
  b.box(group, theme.floorBase, 0, -0.27, 0, 52, 0.5, 40, true);
  b.box(group, theme.floorTop, 0, -0.025, 0, 51.95, 0.045, 39.95);
  for (let x = -24; x <= 24; x += 2) b.box(group, theme.grid, x, 0.003, 0, 0.017, 0.006, 39.3);
  for (let z = -18; z <= 18; z += 2) b.box(group, theme.grid, 0, 0.004, z, 51.3, 0.006, 0.017);
  wall(0, -19.7, 51.7, 0.25, 1.18);
  wall(-25.7, 0, 0.25, 39.4, 1.08);
  wall(25.7, 0, 0.25, 39.4, 0.68);
  wall(0, 19.7, 51.7, 0.25, 0.62);
  for (const side of [-1, 1]) {
    for (const [start, end] of [[-19.7, -7], [-3, 7], [11, 19.7]]) {
      if (!(tier >= 2 && start === 11) && !(tier === 3 && start === -3 && side < 0)) wallRun('z', side * 3, start, end,
        start === -3 ? [[2, side < 0 ? 'DELIVERY BAY' : 'LYSEFJORD']] : []);
      if (!(tier >= 1 && start === 11) && !(tier === 3 && start === -19.7 && side < 0)) wallRun('z', side * 14, start, end,
        start === -3 ? [[2, side < 0 ? 'STORAGE / PRINT' : executive ? 'CEO OFFICE' : 'MANAGEMENT']] : []);
    }
  }
  wallRun('x', -7, -25.7, -3, [[-20, 'KITCHEN'], [-8.5, 'SERVER ROOM']]);
  wallRun('x', -7, 3, 25.7, [[8.5, 'FJORD'], [20, 'BATHROOM']]);
  wallRun('x', -3, -25.7, -3);
  wallRun('x', -3, 3, 25.7);
  wallRun('x', 7, -25.7, -3, [[-8.5, 'DELIVERY BAY']]);
  wallRun('x', 7, 3, 25.7, [[8.5, 'LYSEFJORD']]);
  if (tier < 2) {
    wallRun('x', 11, -25.7, -3, [[-20, 'ARCHIVE'], [-8.5, 'CONSULTING']]);
    wallRun('x', 11, 3, 25.7, [[8.5, 'DESIGN STUDIO'], [20, 'CLIENT TEAM']]);
  }

  const roomColors = theme.roomColors;
  const rooms = [
    [-19.5, -13.3, 10.7, 12.3, 'KAFFEKROKEN', 0], [-8.5, -13.3, 10.7, 12.3, 'SERVER / DO NOT UNPLUG', 1],
    [8.5, -13.3, 10.7, 12.3, 'FJORD', 2], [19.5, -13.3, 10.7, 12.3, 'WC LOBBY / ENTER AT DOOR', 3],
    [-19.5, 2, 10.7, 9.7, 'STORAGE / LOST PROPERTY', 4], [-8.5, 2, 10.7, 9.7, 'DELIVERY BAY', 5],
    [8.5, 2, 10.7, 9.7, 'LYSEFJORD', 2], [19.5, 2, 10.7, 9.7, executive ? 'YOUR CORNER OFFICE' : 'MANAGEMENT', 0],
    [-19.5, 15.3, 10.7, 8.3, ['ARCHIVE / SINCE MONDAY', 'HUDDLE ROOM / TEAM NORTH', 'DEPARTMENT CONFERENCE', 'EXECUTIVE LOUNGE'][tier], 4],
    [-8.5, 15.3, 10.7, 8.3, tier < 2 ? 'CONSULTING' : 'SPACE TO THINK', 5],
    [8.5, 15.3, 10.7, 8.3, tier < 2 ? 'DESIGN STUDIO' : 'OPEN COLLABORATION', 2],
    [19.5, 15.3, 10.7, 8.3, ['CLIENT TEAM', 'HUDDLE ROOM / TEAM SOUTH', 'CLIENT SALON', 'BOARDROOM / THE LONG TABLE'][tier], 5],
  ];
  for (const [x, z, w, d, name, color] of rooms) {
    b.box(group, roomColors[color], x, 0.015, z, w, 0.026, d);
    floorLabel(group, name, x, z + d / 2 - 0.85, Math.min(w - 1, 7.8), 0.59, PALETTE.dark);
  }
  b.box(group, theme.corridor, 0, 0.012, 0, 5.7, 0.018, 38.5);
  b.box(group, theme.stripe, 0.85, 0.03, 0, 0.095, 0.018, 37);
  for (const z of [-5, 9]) {
    b.box(group, theme.corridor, 0, 0.016, z, 50.5, 0.022, 3.55);
    b.box(group, theme.stripe, 0, 0.034, z + 0.7, 49.8, 0.018, 0.07);
  }
  for (const z of [13, 5, -1, -10, -14]) {
    const arrow = subgroup(group, 0.85, 0.05, z);
    for (const side of [-1, 1]) {
      const stroke = b.box(arrow, PALETTE.sage, side * 0.12, 0, 0, 0.06, 0.014, 0.4);
      stroke.rotation.y = -side * Math.PI / 4;
    }
  }
  floorLabel(group, 'WORKDAYLE', 0, 18.3, 4.7, 0.68);
  floorLabel(group, 'STAVANGER / CAMPUS ØST', 0, 17.5, 5, 0.34);
  floorLabel(group, 'KITCHEN  ←      FJORD  →', 0, -5, 7, 0.54);
  floorLabel(group, 'PRINT  ←      CLIENT TEAM  →', 0, 9, 8, 0.54);
  floorLabel(group, `FLOOR ${index + 1} / ${floor.name.toUpperCase()}`, -0.45, 12, 4.7, 0.65);

  const workstationPositions = [
    [-22.5, 16.6, Math.PI], [-10.5, 16.6, Math.PI],
    [6, 16.6, Math.PI], [22, 16.6, Math.PI],
    [-10, 4.9, Math.PI], [-6, -0.8, 0], [18, -0.8, 0], [11, 13, 0],
  ];
  workstationPositions.forEach(([x, z, rotation], i) => {
    if (executive && i % 2) return;
    if (tier === 1 && [0, 3].includes(i)) return;
    if (tier >= 2 && z > 11) return;
    if (solid(x, z, 2.65, 1.35, () => desk(b, group, x, z, rotation, i + tier))) {
      const chairZ = z + Math.cos(rotation) * 1.21;
      solid(x, chairZ, 0.7, 0.72, () => chair(b, group, x, chairZ, rotation + Math.PI, theme.chair));
    }
  });
  if (tier === 0) {
    for (const [x, z] of [[-10.5, 12.8], [6, 12.8], [-10, -0.8]]) {
      solid(x, z, 2.65, 1.35, () => desk(b, group, x, z, 0, 1));
      solid(x, z - 0.88, 3, 0.15, () => b.box(group, '#97a593', x, 0.75, z - 0.88, 3, 1.5, 0.15));
      solid(x - 1.48, z, 0.14, 2, () => b.box(group, '#aab7a6', x - 1.48, 0.88, z, 0.13, 1.76, 1.95));
      solid(x + 1.48, z, 0.14, 2, () => b.box(group, '#aab7a6', x + 1.48, 0.88, z, 0.13, 1.76, 1.95));
    }
  }
  sign(group, 'CV / YOUR NEXT CHAPTER', -6, 2.2, -1.45, 2.8, 0.42);
  const meetingTable = (x, z, w, d, round = false) => solid(x, z, w, d, () => {
    const table = subgroup(group, x, 0, z);
    table.name = round ? 'round-huddle-table' : 'executive-conference-table';
    if (round) {
      const top = b.cylinder(table, PALETTE.woodLight, 0, 1, 0, w / 2, 0.17);
      top.scale.z = d / 2;
    } else b.box(table, PALETTE.wood, 0, 1, 0, w, 0.18, d, true);
    for (const side of [-1, 1]) b.cylinder(table, PALETTE.dark, side * w * 0.28, 0.5, 0, 0.16, 0.9);
    b.box(table, PALETTE.ink, 0, 1.15, 0, 0.55, 0.12, 0.38, true);
    for (let dx = -w / 2 + 0.8; dx < w / 2; dx += 1.5) {
      mug(b, table, dx, 1.1, d * 0.28);
      for (const side of [-1, 1]) solid(x + dx, z + side * (d / 2 + 0.65), 0.7, 0.7,
        () => chair(b, group, x + dx, z + side * (d / 2 + 0.65), side > 0 ? Math.PI : 0, tier === 3 ? '#423e36' : theme.chair));
    }
  });
  if (tier === 1) {
    meetingTable(-17.5, 16, 2.8, 2.8, true);
    meetingTable(17.5, 16, 2.8, 2.8, true);
  } else if (tier === 2) {
    meetingTable(-13.5, 15.6, 7.6, 2.2);
    meetingTable(16.8, 16, 3.1, 2.3, true);
  } else if (tier === 3) {
    meetingTable(14, 15.6, 7.7, 2.5, true);
    for (const z of [12.5, 17.5]) solid(-18, z, 5.2, 1.45, () => {
      const sofa = subgroup(group, -18, 0, z);
      sofa.name = 'executive-leather-sofa';
      b.box(sofa, '#444c43', 0, 0.56, 0, 5.2, 0.65, 1.45, true);
      b.box(sofa, '#444c43', 0, 1.08, z > 15 ? 0.55 : -0.55, 5.2, 0.8, 0.32, true);
      for (const x of [-1.65, 0, 1.65]) b.box(sofa, '#687463', x, 0.94, 0, 1.55, 0.2, 1.1, true);
    });
    solid(-17.7, 15, 2.1, 1.2, () => b.box(group, '#dfd6bc', -17.7, 0.54, 15, 2.1, 0.25, 1.2, true));
    b.box(group, '#766444', 14, 0.045, 15.6, 11, 0.03, 5.5, true);
  }
  for (const x of [-9, 9]) {
    const fixture = subgroup(group, x, 4.4, tier >= 2 ? 15.5 : 2);
    fixture.name = ['fluorescent-office-strip', 'warm-huddle-pendant', 'conference-task-light', 'executive-chandelier'][tier];
    if (tier < 2) {
      b.box(fixture, theme.lightFrame, 0, 0, 0, tier ? 1.4 : 3.5, 0.13, tier ? 0.8 : 0.35, true);
      b.box(fixture, theme.lightGlow, 0, -0.08, 0, tier ? 1.2 : 3.3, 0.035, tier ? 0.6 : 0.25,
        false, { emissive: theme.lightGlow, emissiveIntensity: tier ? 0.85 : 0.35 });
    } else {
      b.ring(fixture, tier === 3 ? PALETTE.gold : theme.lightFrame, 0, 0, 0, tier === 3 ? 1.55 : 0.9, 0.065);
      for (let i = 0; i < (tier === 3 ? 8 : 4); i++) {
        const angle = i * Math.PI * 2 / (tier === 3 ? 8 : 4), radius = tier === 3 ? 1.55 : 0.9;
        b.sphere(fixture, theme.lightGlow, Math.cos(angle) * radius, -0.15, Math.sin(angle) * radius,
          0.09, tier === 3 ? 0.3 : 0.12, 0.09, { emissive: theme.lightGlow, emissiveIntensity: 0.85 });
      }
    }
    const light = new THREE.PointLight(theme.lightColor, theme.lightIntensity, tier === 3 ? 16 : 13, 2);
    light.position.y = -0.2;
    fixture.add(light);
  }

  solid(-21.6, -18.3, 5.4, 1.25, () => {
    const kitchen = subgroup(group, -21.6, 0, -18.3);
    b.box(kitchen, tier >= 2 ? '#596153' : PALETTE.sage, 0, 0.54, 0, 5.4, 1.05, 1.2, true);
    b.box(kitchen, tier === 3 ? '#dccda7' : PALETTE.woodLight, 0, 1.12, 0, 5.55, 0.14, 1.3, true);
    for (const x of [-2, -1, 0, 1, 2]) {
      b.box(kitchen, '#87997c', x, 0.53, 0.61, 0.94, 0.87, 0.045, true);
      b.box(kitchen, PALETTE.gold, x, 0.83, 0.65, 0.28, 0.035, 0.032);
    }
    b.box(kitchen, PALETTE.ink, -0.4, 1.58, 0, 0.82, 0.82, 0.68, true);
    b.box(kitchen, PALETTE.metal, -0.4, 1.46, 0.35, 0.66, 0.38, 0.055, true);
    b.box(kitchen, PALETTE.green, -0.4, 1.83, 0.36, 0.32, 0.14, 0.024, true,
      { emissive: PALETTE.green, emissiveIntensity: 0.4 });
    b.box(kitchen, PALETTE.ink, -0.4, 1.53, 0.43, 0.16, 0.12, 0.16, true);
    mug(b, kitchen, -0.4, 1.21, 0.48);
    mug(b, kitchen, 0.7, 1.2, 0.2, PALETTE.clay);
    b.box(kitchen, PALETTE.metal, 1.8, 1.197, 0, 0.7, 0.026, 0.66, true);
    b.box(kitchen, PALETTE.ink, 1.8, 1.215, 0, 0.55, 0.018, 0.5, true);
    b.beam(kitchen, PALETTE.paper, [1.8, 1.22, -0.38], [1.8, 1.6, -0.38], 0.034);
    b.beam(kitchen, PALETTE.paper, [1.8, 1.6, -0.38], [1.8, 1.6, -0.12], 0.034);
    plant(b, kitchen, -2, 0, 0.48, 1.2);
  });
  sign(group, tier === 3 ? 'EXECUTIVE COFFEE BAR' : 'KAFFEKROKEN', -21.2, 2.48, -19.49, 5.1, 0.8,
    { background: tier >= 2 ? '#4d5b4b' : PALETTE.sage, small: tier === 3 ? 'The beans now report directly to leadership.' : 'Stavanger runs on coffee. So do you.' });
  solid(-16.2, -15, 1.15, 1.1, () => {
    b.box(group, PALETTE.paper, -16.2, 1.05, -15, 1.15, 2.1, 1.1, true);
    b.box(group, PALETTE.dark, -15.85, 1.22, -14.43, 0.055, 0.61, 0.06, true);
    sign(group, 'NOT YOUR LUNCH', -16.2, 1.72, -14.435, 0.88, 0.25, {
      background: PALETTE.paper, foreground: PALETTE.sage,
    });
  });

  const elevator = framedDoor(b, group, 0, -19.03, executive ? 'CEO ACCESS' : 'PROMOTION LIFT',
    PALETTE.metal, 0, executive ? 'EVERY FLOOR IS YOUR PROBLEM' : 'UPPER FLOORS: PROMOTION REQUIRED');
  b.box(elevator, '#92a39a', -0.525, 1.4, 0.196, 1.035, 2.73, 0.022, true);
  b.box(elevator, '#a4b0a5', 0.525, 1.4, 0.196, 1.035, 2.73, 0.022, true);
  b.box(elevator, PALETTE.dark, 0, 1.4, 0.215, 0.029, 2.74, 0.012);
  sign(elevator, String(index + 1).padStart(2, '0'), 0, 2.79, 0.223, 0.53, 0.27,
    { background: PALETTE.ink, foreground: accent });
  b.box(elevator, PALETTE.gold, 1.47, 1.19, 0.1, 0.22, 0.38, 0.11, true);
  b.sphere(elevator, accent, 1.47, 1.22, 0.169, 0.054, 0.054, 0.025,
    { emissive: accent, emissiveIntensity: 0.4 });
  colliders.push({ x: 0, z: -19.03, w: 2.52, d: 0.4 });
  framedDoor(b, group, 22, -18.85, 'BATHROOM', '#91a9a2', 0, 'A PRIVATE MOMENT');
  colliders.push({ x: 22, z: -18.85, w: 2.52, d: 0.4 });
  sign(group, 'WC: ENTER THROUGH THE DOOR', 18, 1.6, -19.4, 4.8, 0.6);
  for (const [x, z, w] of [[6.8, -16.2, 4.2], [9.7, -0.7, 4.6]]) {
    solid(x, z, w, 1.6, () => {
      b.box(group, PALETTE.woodLight, x, 1, z, w, 0.19, 1.6, true);
      for (const side of [-1, 1]) {
        b.cylinder(group, PALETTE.dark, x + side, 0.48, z, 0.17, 0.9);
        b.box(group, PALETTE.paper, x + side, 1.11, z + 0.35, 0.4, 0.018, 0.3);
        mug(b, group, x + side, 1.1, z - 0.35);
      }
      b.box(group, PALETTE.ink, x, 1.125, z, 0.4, 0.08, 0.34, true);
    });
    for (const dx of [-1, 1]) for (const side of [-1, 1]) {
      solid(x + dx, z + side * 1.4, 0.7, 0.72, () =>
        chair(b, group, x + dx, z + side * 1.4, side > 0 ? Math.PI : 0, theme.chair));
    }
  }
  b.box(group, PALETTE.wood, 8.5, 1.95, -19.5, 5.2, 1.7, 0.12, true);
  sign(group, 'FJORD', 8.5, 1.95, -19.427, 4.95, 1.47, {
    background: PALETTE.paper, foreground: PALETTE.dark, small: 'A room. Not a bathroom.', border: true,
  });
  sign(group, 'LYSEFJORD', 9, 1.68, -2.84, 4.2, 0.87, {
    background: PALETTE.paper, foreground: PALETTE.dark, small: 'The deep dive is metaphorical.',
  });
  if (!executive) {
    const bossName = ['JILL GULDHAV', 'SANDER THOMASSEN', 'ALF GILROY', 'KJELL RUSTI'][index];
    framedDoor(b, group, 24.5, 2, index === 0 ? 'SNACK ROOM' : bossName, index === 3 ? PALETTE.dark : PALETTE.sage,
      -Math.PI / 2, index === 0 ? 'JILL GULDHAV / SNACKS & FEEDBACK' : index === 3 ? 'FINAL REVIEW / CEO CLEARANCE' : 'REPUTATION CHECKPOINT');
    colliders.push({ x: 24.5, z: 2, w: 0.48, d: 2.52 });
    interactables.find((station) => station.kind === 'boss').label = index === 0 ? 'SNACK ROOM · Jill Guldhav' : `${bossName} · performance review`;
    floorLabel(group, 'PROMOTION STARTS HERE', 20.2, 5.6, 6.2, 0.55, PALETTE.dark);
  } else {
    floorLabel(group, 'YOUR OFFICE. YOUR PROBLEM.', 20.1, 5.6, 6.8, 0.6);
  }
  for (const [x, z] of [[-11, -17.1], [-8, -17.1], [-5, -17.1], [-11, -11.2], [-5, -11.2]].slice(0, 5 - tier)) {
    solid(x, z, 1.4, 1.3, () => {
      b.box(group, '#344b51', x, 1.13, z, 1.4, 2.26, 1.3, true);
      for (let i = 0; i < 5; i++) {
        b.box(group, '#536971', x, 0.38 + i * 0.36, z + 0.66, 1.16, 0.27, 0.035, true);
        b.box(group, i % 2 ? '#9bc0c1' : PALETTE.green, x - 0.39, 0.4 + i * 0.36, z + 0.683,
          0.13, 0.047, 0.015, false, { emissive: '#9acdab', emissiveIntensity: 0.45 });
      }
    });
  }
  sign(group, 'UPTIME IS A FEELING', -8.5, 2.6, -19.48, 6.2, 0.6, {
    background: '#344b51', foreground: '#dbebe4',
  });
  const shelf = (x, z, width = 3.2) => solid(x, z, width, 0.9, () => {
    for (const side of [-1, 1]) b.box(group, PALETTE.dark, x + side * (width / 2 - 0.08), 0.92, z, 0.12, 1.84, 0.9);
    for (let row = 0; row < 3; row++) {
      b.box(group, PALETTE.wood, x, 0.18 + row * 0.7, z, width, 0.1, 0.93, true);
      for (const side of [-1, 1]) {
        b.box(group, row % 2 ? '#c5b490' : '#a2b1a1', x + side * width * 0.25,
          0.43 + row * 0.7, z, width * 0.37, 0.43, 0.71, true);
        b.box(group, PALETTE.paper, x + side * width * 0.25,
          0.45 + row * 0.7, z + 0.36, 0.27, 0.11, 0.012);
      }
    }
  });
  if (tier < 2) wall(-19, -0.5, 0.22, 4.7, 0.85);
  shelf(-22.7, -2.15, 3.9);
  shelf(-23.2, 5.9, 3.4);
  shelf(-17.1, -1.9, 2.7);
  shelf(-23, 12.1, 3.1);
  if (tier < 2) shelf(-16.7, 17.8, 3.5);
  if (tier < 3) shelf(22.4, 12.2, 3.1);
  const hiddenPanel = framedDoor(b, group, -25.35, 15.2, 'ARCHIVE B', '#a6a48f', Math.PI / 2, 'HINGES TEMPORARILY MISFILED');
  hiddenPanel.name = 'crooked-archive-secret-door';
  hiddenPanel.rotation.z = 0.015;
  floorLabel(group, 'YES, THE OTHER PRINTER.', -22, 2.2, 4.4, 0.48);
  for (const [id, x, z, rotation] of [
    ['printer-east', 22, -5, -Math.PI / 2],
    ['printer-west', -22, 9, Math.PI / 2],
    ['printer-working', -24, 0, Math.PI / 2],
  ]) {
    const station = interactables.find((item) => item.id === id);
    solid(x, z, 1.15, 1.15, () => {
      const printer = subgroup(group, x, 0, z, rotation);
      b.box(printer, '#dce3d5', 0, 0.54, 0, 1.12, 1.08, 1.05, true);
      b.box(printer, PALETTE.dark, 0, 1.08, 0, 1.19, 0.16, 1.1, true);
      b.box(printer, '#b1beb1', 0, 1.23, -0.14, 1.02, 0.17, 0.64, true);
      b.box(printer, PALETTE.ink, 0, 0.8, 0.542, 0.74, 0.17, 0.028);
      b.box(printer, station.status === 'ready' ? PALETTE.green : PALETTE.clay,
        0.31, 1.19, 0.35, 0.22, 0.08, 0.24, true);
      if (station.status === 'jammed') {
        const paper = b.box(printer, PALETTE.paper, -0.12, 0.76, 0.67, 0.53, 0.025, 0.38);
        paper.rotation.z = 0.22;
      }
      sign(printer, station.status === 'ready' ? 'READY. A MIRACLE.' : station.status.toUpperCase(),
        0, 1.66, 0, 2.35, 0.48, {
          background: station.status === 'ready' ? PALETTE.sage : '#805143',
        });
    });
  }
  for (const [x, z, size] of [
    [-24.3, -8.5, 1.15], [-15.4, -8.5, 1], [12.5, -18.4, 1.1], [24, -8.4, 1.05],
    [-4.4, 5.6, 0.95], [15.3, 5.5, 1.1], [-4.5, 18.2, 1], [15.4, 18.2, 1.1],
    [1.9, -18, 0.85], [-1.95, 14, 0.9],
    [-12, 18, 1.3], [11.8, 6, 1.25], [-15.5, -17, 1.1], [23.8, 17.7, 1.4],
    [-2, -10, 1.4], [2, 4.5, 1.35], [18.3, -18.5, 1.5], [-22, 17.8, 1.5],
  ].slice(0, theme.plantCount)) solid(x, z, size * 0.62, size * 0.62, () => plant(b, group, x, z, size));
  if (theme.marble) {
    b.box(group, '#d8b866', 0, 0.035, 14.25, 14.2, 0.03, 0.18, true);
    for (const [x, z] of [[-18.8, 14.9], [-18.8, 17.9]]) {
      solid(x, z, 1.8, 1.4, () => {
        const pedestal = subgroup(group, x, 0, z);
        b.box(pedestal, '#f0e8d5', 0, 0.55, 0, 1.6, 1.1, 1.2, true);
        b.box(pedestal, PALETTE.gold, 0, 1.13, 0, 1.75, 0.08, 1.35, true);
        const trophy = b.ring(pedestal, PALETTE.gold, 0, 1.63, 0, 0.42, 0.08);
        trophy.rotation.z = 0.4;
      });
    }
  }
  for (const [x, z, rotation] of [[-25.52, -12, Math.PI / 2], [-25.52, 14, Math.PI / 2], [19.6, -19.52, 0]]) {
    const window = subgroup(group, x, 1.65, z, rotation);
    b.box(window, PALETTE.dark, 0, 0, 0, 4.5, 1.13, 0.09, true);
    b.box(window, '#b7cebf', 0, 0, 0.06, 4.27, 0.94, 0.022);
    b.box(window, PALETTE.paper, 0, 0, 0.09, 0.065, 1.02, 0.025);
    sign(window, 'STAVANGER', 0, -0.31, 0.085, 2.3, 0.25, {
      background: '#b7cebf', foreground: PALETTE.sage,
    });
  }
  interactables.forEach((station) => {
    b.ring(group, station.kind === 'boss' ? PALETTE.gold : PALETTE.sage,
      station.x, 0.047, station.z, 0.56, 0.027);
    b.cylinder(group, station.kind === 'boss' ? PALETTE.gold : accent,
      station.x, 0.034, station.z, 0.09, 0.02);
  });
  instanceStaticGeometry(group);
  if (!executive) interactables.push(...addOfficeCollectibles(b, group, index, options.collected));
  const navigation = createOfficeNavigation(colliders, OFFICE_BOUNDS, {
    spawn: OFFICE_SPAWN,
    restricted: [{ x: 20, z: -13.5, w: 12, d: 13 }, { x: 20, z: 2, w: 12, d: 10 }],
  });
  const destinations = [
    ...NPC_SLOTS, { x: -21, z: -15 }, { x: 8, z: -11 }, { x: 10, z: 3 },
    { x: -21, z: 0 }, { x: 19, z: -5 }, { x: -19, z: 9 }, { x: -7, z: 3 },
  ].map(point => navigation.nearest(point)).filter(Boolean);
  const startingPoints = shuffled(navigation.points.filter(point =>
    interactables.every(item => Math.hypot(item.x - point.x, item.z - point.z) > 1.7)
      && Math.hypot(point.x - OFFICE_SPAWN.x, point.z - OFFICE_SPAWN.z) > 3), rng);
  const starts = [];
  for (const point of startingPoints) {
    if (starts.every(other => Math.hypot(other.x - point.x, other.z - point.z) >= MIN_NPC_SPAWN_DISTANCE)) starts.push(point);
    if (starts.length >= npcs.length) break;
  }
  const animated = [];
  npcs.forEach((npc, i) => {
    Object.assign(npc, starts[i] || navigation.nearest(NPC_SLOTS[i] || OFFICE_SPAWN));
    const character = createCharacter(npc.color);
    character.position.set(npc.x, 0, npc.z);
    character.rotation.y = [0.28, 0.75, -0.24, 0.5, 0.25, -0.4, 0.15][i % 7];
    character.name = `npc-${npc.id}`;
    group.add(character);
    const marker = new THREE.Mesh(
      b.geometry('task-marker', () => new THREE.OctahedronGeometry(0.19, 0)),
      b.material(PALETTE.green, { emissive: PALETTE.green, emissiveIntensity: 0.3 }),
    );
    marker.position.set(npc.x, 2.48, npc.z);
    marker.scale.y = 1.28;
    group.add(marker);
    const name = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textTexture(npc.name, { width: 384, height: 112, background: PALETTE.dark }),
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    name.position.set(npc.x, 2.06, npc.z);
    name.scale.set(1.1, 0.32, 1);
    group.add(name);
    interactables.push({
      id: npc.id, kind: 'npc', x: npc.x, z: npc.z, label: npc.name,
      npc, marker, nameLabel: name, mesh: character, root: character,
    });
    const item = interactables[interactables.length - 1];
    marker.visible = !options.completed?.has(`${index}:${npc.task.id}`);
    animated.push({ item, character, marker, name, phase: i * 1.72, route: [], waypoint: 0, wait: 1 + rng() * 6, blockedFor: 0 });
  });
  let elapsed = 0;
  let disposed = false;
  return {
    group, colliders, interactables, bounds: OFFICE_BOUNDS, spawn: OFFICE_SPAWN, navigation,
    collect(id) { return collectInRoom(interactables, id); },
    update(dt = 0, time, { playerPosition, allowMovement = false } = {}) {
      if (disposed) return;
      elapsed = Number.isFinite(time) ? time : elapsed + Math.max(0, dt);
      const step = Math.min(0.1, Math.max(0, Number.isFinite(dt) ? dt : 0));
      let planningBudget = 2;
      for (const actor of animated) {
        const { item, character, marker, name, phase } = actor;
        const nearPlayer = playerPosition && Math.hypot(item.x - playerPosition.x, item.z - playerPosition.z) < 2.6;
        let moving = false;
        if (allowMovement && !nearPlayer && step > 0) {
          actor.wait -= step;
          if (actor.wait <= 0 && actor.waypoint >= actor.route.length && planningBudget > 0) {
            planningBudget--;
            const destination = destinations[Math.min(destinations.length - 1, Math.floor(rng() * destinations.length))];
            actor.route = destination ? navigation.route(item, destination) : [];
            actor.waypoint = 0;
            if (!actor.route.length) actor.wait = 2;
          }
          if (actor.wait <= 0 && actor.waypoint < actor.route.length) {
            const target = actor.route[actor.waypoint], dx = target.x - item.x, dz = target.z - item.z;
            const nearby = animated.filter(other => other !== actor
              && Math.hypot(other.item.x - item.x, other.item.z - item.z) < NPC_CROWD_SLOWDOWN_RADIUS);
            let avoidX = 0;
            let avoidZ = 0;
            for (const other of nearby) {
              const awayX = item.x - other.item.x;
              const awayZ = item.z - other.item.z;
              const spacing = Math.hypot(awayX, awayZ) || 0.001;
              const weight = Math.max(0, (NPC_PERSONAL_SPACE + 0.35 - spacing) / (NPC_PERSONAL_SPACE + 0.35));
              avoidX += awayX / spacing * weight;
              avoidZ += awayZ / spacing * weight;
            }
            const crowdFactor = nearby.length ? Math.max(0.45, 1 - nearby.length * 0.16) : 1;
            const distance = Math.hypot(dx, dz);
            const travel = Math.min(distance, step * 1.05 * crowdFactor);
            const next = {
              x: item.x + (distance ? dx / distance * travel : 0) + avoidX * step * 0.42,
              z: item.z + (distance ? dz / distance * travel : 0) + avoidZ * step * 0.42,
            };
            const occupied = animated.some(other => other !== actor
              && Math.hypot(other.item.x - next.x, other.item.z - next.z) < NPC_PERSONAL_SPACE);
            if (!occupied && navigation.isWalkable(next)) {
              actor.blockedFor = 0;
              item.x = item.npc.x = next.x;
              item.z = item.npc.z = next.z;
              character.position.set(item.x, 0, item.z);
              marker.position.x = name.position.x = item.x;
              marker.position.z = name.position.z = item.z;
              moving = travel > 0;
              if (moving) character.rotation.y = Math.atan2(dx, dz);
              if (distance <= travel + 0.001) actor.waypoint++;
              if (actor.waypoint >= actor.route.length) actor.wait = 3 + rng() * 7;
            } else {
              actor.blockedFor += step;
              if (actor.blockedFor > 0.9 && planningBudget > 0) {
                planningBudget--;
                const alternate = destinations[Math.min(destinations.length - 1, Math.floor(rng() * destinations.length))];
                actor.route = alternate ? navigation.route(item, alternate) : [];
                actor.waypoint = 0;
              }
              if (actor.blockedFor > 2) {
                actor.route = [];
                actor.waypoint = 0;
                actor.wait = 1 + rng() * 2;
                actor.blockedFor = 0;
              }
            }
          }
        }
        marker.position.y = 2.48 + Math.sin(elapsed * 2.2 + phase) * 0.085;
        marker.rotation.y = elapsed * 0.75 + phase;
        character.userData.body.rotation.z = Math.sin(elapsed * 1.55 + phase) * 0.017;
        character.userData.head.rotation.y = Math.sin(elapsed * 0.55 + phase) * 0.08;
        character.userData.arms[0].rotation.x = Math.sin(elapsed * 1.45 + phase) * 0.055;
        character.userData.arms[1].rotation.x = -Math.sin(elapsed * 1.45 + phase) * 0.055;
        character.userData.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(elapsed * 7 + i * Math.PI) * 0.23 : 0; });
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeGroup(group);
      animated.length = 0;
    },
  };
}

export function createArena(boss, index = 0) {
  const b = builder();
  const group = new THREE.Group();
  group.name = `performance-review-arena-${index}`;
  const finalBoss = bossSlug(boss) === 'kjell_rusti';
  const accent = ['#dca2b1', '#a0b4c9', '#b59875', PALETTE.gold][index % 4];
  const backdrop = finalBoss ? '#1c2b24' : PALETTE.dark;
  b.box(group, finalBoss ? '#202b24' : '#343f38', 0, -0.28, 0, 18, 0.5, 18, true);
  b.box(group, finalBoss ? '#354238' : '#738676', 0, -0.017, 0, 17.7, 0.035, 17.7);
  b.box(group, finalBoss ? '#495447' : '#819281', 0, 0.008, 0, 15.5, 0.016, 15.5, true);
  for (const z of [-7.5, 7.5]) b.box(group, PALETTE.paper, 0, 0.025, z, 15, 0.015, 0.08);
  for (const x of [-7.5, 7.5]) b.box(group, PALETTE.paper, x, 0.025, 0, 0.08, 0.015, 15);
  b.ring(group, '#a9b7a1', 0, 0.032, 0, 3.15, 0.018);
  b.ring(group, '#a9b7a1', 0, 0.032, 0, 3.35, 0.009);
  floorLabel(group, finalBoss ? 'THE FINAL REVIEW' : 'PERFORMANCE REVIEW', 0, 0.5, 5.6, 0.9,
    finalBoss ? '#e5cd8b' : '#e4e7d8');
  floorLabel(group, finalBoss ? 'THE CHAIR IS EARNED.' : 'TAKE IT OFFLINE.', 0, 1.4, 3.9, 0.42, '#e4e7d8');
  floorLabel(group, 'YOUR CORNER', 0, 6.35, 3, 0.45, PALETTE.paper);
  floorLabel(group, 'MANAGEMENT', 0, -6.4, 3, 0.45, PALETTE.paper);
  for (let i = 0; i < 7; i++) {
    const stripe = b.box(group, accent, -7.15 + i * 0.42, 0.03, 6.82, 0.18, 0.02, 1.24);
    stripe.rotation.y = -0.55;
    const opposite = b.box(group, accent, 7.15 - i * 0.42, 0.03, -6.82, 0.18, 0.02, 1.24);
    opposite.rotation.y = -0.55;
  }
  for (const x of [-8.1, 8.1]) {
    for (const z of [-8.1, 8.1]) {
      b.cylinder(group, PALETTE.dark, x, 0.65, z, 0.12, 1.3);
      b.box(group, z < 0 ? accent : PALETTE.paper, x, 0.88, z, 0.35, 0.62, 0.35, true);
      b.sphere(group, PALETTE.gold, x, 1.37, z, 0.15);
    }
  }
  for (const height of [0.46, 0.91]) {
    const ropeColor = height < 0.7 ? '#d8dfcb' : accent;
    for (const x of [-8.1, 8.1]) {
      b.beam(group, ropeColor, [x, height, -8.1], [x, height, 8.1], 0.035);
    }
    for (const z of [-8.1, 8.1]) {
      b.beam(group, ropeColor, [-8.1, height, z], [8.1, height, z], 0.035);
    }
  }
  b.box(group, backdrop, 0, finalBoss ? 2.75 : 2.1, -8.78, 17.8, finalBoss ? 5.5 : 4.2, 0.2, true);
  b.box(group, accent, 0, 0.5, -8.65, 17.4, 0.045, 0.03);
  sign(group, finalBoss ? 'FINAL BOSS' : boss.title.toUpperCase(), 0, finalBoss ? 4.35 : 3.01, -8.649, 9.8, 1.18, {
    foreground: finalBoss ? '#ecd693' : PALETTE.paper, background: backdrop,
    small: finalBoss ? 'Kjell Rusti' : boss.name,
  });
  sign(group, finalBoss ? 'KJELL RUSTI / THE CEO' : 'LET’S SYNERGIZE.', 0, finalBoss ? 2.94 : 1.81, -8.641, 7.4, 0.62, {
    foreground: accent, background: backdrop,
  });
  if (finalBoss) {
    for (const x of [-8.35, -5.05, 5.05, 8.35]) {
      b.box(group, '#394534', x, 2.55, -8.57, 0.4, 5.1, 0.35, true);
      b.box(group, PALETTE.gold, x, 2.55, -8.37, 0.075, 5.03, 0.035);
      b.box(group, PALETTE.gold, x, 5.12, -8.53, 0.7, 0.13, 0.47, true);
    }
    b.box(group, PALETTE.gold, 0, 5.38, -8.59, 16.9, 0.065, 0.1);
    b.ring(group, PALETTE.gold, 0, 0.036, -2.2, 1.48, 0.021);
    floorLabel(group, 'STAVANGER / BOARD OF DIRECTORS', 0, -5.4, 6.2, 0.48, '#e5cd8b');
  }
  for (const side of [-1, 1]) {
    const art = subgroup(group, side * 6.67, 2.52, -8.62);
    b.box(art, PALETTE.gold, 0, 0, 0, 2.22, 2.37, 0.12, true);
    b.box(art, '#d5ddc8', 0, 0, 0.07, 2.03, 2.17, 0.025);
    b.cylinder(art, accent, 0, 0.43, 0.103, 0.5, 0.032).rotation.x = Math.PI / 2;
    const mountain = b.box(art, PALETTE.sage, -0.23, -0.36, 0.109, 0.95, 0.93, 0.025);
    mountain.rotation.z = Math.PI / 4;
    const mountain2 = b.box(art, PALETTE.dark, 0.43, -0.48, 0.126, 0.77, 0.72, 0.025);
    mountain2.rotation.z = Math.PI / 4;
    sign(art, side < 0 ? 'GROWTH' : 'SYNERGY', 0, -0.85, 0.145, 1.82, 0.25, {
      background: '#d5ddc8', foreground: PALETTE.dark, height: 96,
    });
  }
  const warningMaterial = b.material('#dc684d', { emissive: '#e94e36', emissiveIntensity: 0.5 });
  for (const x of [-7.7, 7.7]) {
    b.cylinder(group, PALETTE.metal, x, finalBoss ? 5.6 : 4.28, -8.76, 0.25, 0.15);
    const beacon = new THREE.Mesh(b.geometry('beacon', () => new THREE.SphereGeometry(0.2, 10, 8)), warningMaterial);
    beacon.position.set(x, finalBoss ? 5.82 : 4.5, -8.76);
    group.add(beacon);
  }
  for (const side of [-1, 1]) {
    const outside = subgroup(group, side * 9.35, 0, 2.7, -side * Math.PI / 2);
    b.box(outside, PALETTE.woodLight, 0, 0.83, 0, 3.9, 0.17, 0.85, true);
    for (const x of [-1.5, 1.5]) b.box(outside, PALETTE.dark, x, 0.37, 0, 0.12, 0.75, 0.7);
    for (const x of [-1.2, 0, 1.2]) {
      b.box(outside, PALETTE.paper, x, 0.935, 0.05, 0.55, 0.025, 0.34);
      mug(b, outside, x + 0.34, 0.925, -0.05);
    }
    plant(b, group, side * 9.45, -5.8, 1.2);
  }
  const bossMesh = createCharacter(boss.color, true, boss);
  bossMesh.position.set(0, 0, -2);
  group.add(bossMesh);
  let elapsed = 0;
  let disposed = false;
  return {
    group, bossMesh,
    update(dt = 0, time) {
      if (disposed) return;
      elapsed = Number.isFinite(time) ? time : elapsed + Math.max(0, dt);
      warningMaterial.emissiveIntensity = 0.48 + Math.sin(elapsed * 3.4) * 0.24;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeGroup(group);
    },
  };
}
