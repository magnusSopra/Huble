import * as THREE from 'three';
import {
  builder, subgroup, sign, floorLabel, disposeGroup, plant, chair, framedDoor,
  instanceStaticGeometry,
} from './world.js';

export const CEO_BUTTONS = [
  { id: 'more-coffee', label: 'More coffee' },
  { id: 'increase-synergy', label: 'Increase synergy' },
  { id: 'print-money', label: 'Print money' },
  { id: 'approve-budget', label: 'Approve budget' },
  { id: 'spin-rims', label: 'Spin the rims' },
  { id: 'bubble-party', label: 'Jacuzzi bubble party' },
  { id: 'mood-lighting', label: 'Mood lighting' },
  { id: 'world-domination', label: 'World domination' },
  { id: 'call-meeting', label: 'Call a meeting' },
  { id: 'cancel-meetings', label: 'Cancel all meetings' },
  { id: 'give-bonus', label: 'Give yourself a bonus' },
  { id: 'golden-parachute', label: 'Deploy golden parachute' },
  { id: 'approve-everything', label: 'Approve everything' },
  { id: 'panic', label: 'Panic professionally' },
  { id: 'do-nothing', label: 'Do absolutely nothing' },
  { id: 'optimize', label: 'Optimize the optimization' },
  { id: 'strategic-nap', label: 'Strategic nap' },
  { id: 'innovation', label: 'Launch innovation' },
  { id: 'more-gold', label: 'More gold' },
  { id: 'reset-office', label: 'Restore plausible deniability' },
];

const C = {
  marble: '#eee7d8', vein: '#c7c0b1', gold: '#d8b55b', dark: '#172b30',
  wood: '#3c241e', leather: '#382626', red: '#f01929', glass: '#6bc8df',
};
const METAL = { metalness: 0.72, roughness: 0.27 };
const LOCATIONS = [
  ['Stavanger', 5.73, 58.97], ['Oslo', 10.75, 59.91], ['Bergen', 5.32, 60.39],
  ['Trondheim', 10.4, 63.43], ['Drammen', 10.2, 59.74], ['Kristiansand', 8, 58.15],
  ['Stockholm', 18.06, 59.33], ['Gothenburg', 11.97, 57.71], ['Copenhagen', 12.57, 55.68],
  ['Hamburg', 9.99, 53.55], ['Berlin', 13.41, 52.52], ['Frankfurt', 8.68, 50.11],
  ['Munich', 11.58, 48.14], ['Cologne', 6.96, 50.94], ['London', -0.13, 51.51],
  ['Edinburgh', -3.19, 55.95], ['Manchester', -2.24, 53.48], ['Bristol', -2.59, 51.45],
  ['Paris', 2.35, 48.86], ['Annecy', 6.13, 45.9], ['Lyon', 4.84, 45.76],
  ['Nantes', -1.55, 47.22], ['Toulouse', 1.44, 43.6], ['Bordeaux', -0.58, 44.84],
  ['Madrid', -3.7, 40.42], ['Barcelona', 2.17, 41.39], ['Brussels', 4.35, 50.85],
  ['Luxembourg', 6.13, 49.61], ['Nieuwegein', 5.08, 52.03], ['Zurich', 8.54, 47.38],
  ['Rome', 12.5, 41.9], ['Milan', 9.19, 45.46], ['Katowice', 19.02, 50.26],
  ['Noida', 77.39, 28.54], ['Chennai', 80.27, 13.08], ['Bengaluru', 77.59, 12.97],
  ['Pune', 73.86, 18.52], ['Singapore', 103.82, 1.35],
];

function worldMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The CEO world map requires a 2D canvas context.');
  const project = (lon, lat) => [90 + (lon + 180) / 360 * 1868, 168 + (82 - lat) / 150 * 694];
  ctx.fillStyle = '#102a32';
  ctx.fillRect(0, 0, 2048, 1024);
  ctx.strokeStyle = '#21454d';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = project(lon, 0);
    ctx.beginPath(); ctx.moveTo(x, 168); ctx.lineTo(x, 862); ctx.stroke();
  }
  for (let lat = -60; lat <= 80; lat += 20) {
    const [, y] = project(0, lat);
    ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(1958, y); ctx.stroke();
  }
  const continents = [
    [[-168,72],[-145,70],[-130,57],[-122,49],[-125,39],[-115,30],[-105,23],[-98,17],[-89,16],[-83,9],[-78,9],[-86,21],[-81,25],[-80,33],[-70,44],[-55,52],[-62,60],[-79,62],[-84,72],[-110,77],[-140,70]],
    [[-81,12],[-70,10],[-60,6],[-50,1],[-35,-6],[-42,-23],[-54,-34],[-66,-55],[-74,-47],[-76,-27],[-80,-8]],
    [[-53,60],[-43,60],[-20,76],[-28,83],[-52,82],[-63,70]],
    [[-10,36],[-9,44],[-1,44],[4,49],[9,54],[8,58],[5,61],[15,71],[29,71],[31,62],[44,66],[61,70],[91,76],[126,72],[158,61],[180,66],[169,53],[142,49],[136,36],[123,30],[121,20],[109,19],[104,10],[102,2],[96,5],[92,22],[86,22],[80,8],[74,17],[68,24],[56,26],[52,15],[44,13],[36,31],[30,36],[27,41],[23,40],[23,35],[18,40],[16,38],[12,44],[7,44],[3,42],[-1,36]],
    [[-17,35],[5,37],[12,33],[31,31],[34,22],[43,12],[51,11],[43,-2],[39,-17],[32,-29],[20,-35],[12,-25],[11,-12],[8,0],[-5,5],[-16,15]],
    [[113,-22],[114,-34],[130,-32],[138,-38],[151,-34],[154,-26],[145,-15],[135,-12],[126,-14]],
    [[-8,50],[-3,50],[1,53],[-3,59],[-6,58],[-5,54]], [[-10,51],[-6,51],[-6,55],[-9,55]],
    [[130,31],[135,35],[140,42],[145,44],[142,35],[136,32]],
    [[95,5],[107,-6],[114,-8],[105,-3]], [[109,7],[118,5],[117,-3],[110,-4]],
    [[166,-35],[173,-40],[178,-38],[173,-46],[167,-47]],
    [[47,-13],[51,-17],[47,-25],[44,-24]],
  ];
  for (const polygon of continents) {
    ctx.beginPath();
    polygon.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#446d69'; ctx.fill();
    ctx.strokeStyle = '#96a97d'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.shadowColor = '#ffd574';
  ctx.shadowBlur = 12;
  for (const [, lon, lat] of LOCATIONS) {
    const [x, y] = project(lon, lat);
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdb75'; ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f2db9b';
  ctx.font = '700 55px Trebuchet MS, sans-serif';
  ctx.fillText('SOPRA STERIA / A WORLD OF POSSIBILITY', 75, 83);
  ctx.font = '25px Trebuchet MS, sans-serif';
  ctx.fillStyle = '#bcd7d6';
  ctx.fillText(`${LOCATIONS.length} representative office locations · illustrative map, not an exhaustive directory`, 78, 125);
  const labels = [
    ['STAVANGER / OSLO', 8, 60, -200, -66], ['LONDON', -0.13, 51.51, -170, -4],
    ['PARIS', 2.35, 48.86, -110, 43], ['MADRID', -3.7, 40.42, -125, 65],
    ['BERLIN', 13.41, 52.52, 86, -10], ['STOCKHOLM', 18.06, 59.33, 88, -55],
    ['ROME', 12.5, 41.9, 82, 63], ['NOIDA / PUNE', 77, 24, 55, -24],
    ['BENGALURU / CHENNAI', 79, 13, -110, 56], ['SINGAPORE', 103.82, 1.35, 46, 40],
  ];
  ctx.font = '700 20px Trebuchet MS, sans-serif';
  for (const [label, lon, lat, dx, dy] of labels) {
    const [x, y] = project(lon, lat);
    ctx.strokeStyle = '#d8b55b';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.fillStyle = '#fff0bf';
    ctx.fillText(label, x + dx + 5, y + dy - 6);
  }
  ctx.fillStyle = '#acc3be';
  ctx.font = '23px Trebuchet MS, sans-serif';
  ctx.fillText('NORWAY · SWEDEN · DENMARK · UK · FRANCE · GERMANY · BENELUX · SPAIN · ITALY · SWITZERLAND · POLAND · INDIA · SINGAPORE', 75, 940);
  ctx.fillStyle = '#e6c979';
  ctx.font = 'italic 27px Trebuchet MS, sans-serif';
  ctx.fillText('Your new responsibility: all the time zones. Your new skill: saying “let’s align”.', 75, 989);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'illustrative-sopra-steria-world-map';
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCEOOffice() {
  const b = builder();
  const group = new THREE.Group();
  group.name = 'ceo-palatial-open-office';
  const architecture = subgroup(group);
  architecture.name = 'ceo-static-architecture';
  const animated = subgroup(group);
  animated.name = 'ceo-animated-features';
  const colliders = [];
  const interactables = [];
  const solid = (x, z, w, d) => colliders.push({ x, z, w, d });
  const station = (id, label, x, z, kind = 'ceo') => {
    interactables.push({ id, label, x, z, kind });
    b.ring(architecture, C.gold, x, 0.05, z, 0.47, 0.025);
    floorLabel(architecture, label.toUpperCase(), x, z + 0.65, 3.7, 0.33, C.dark);
  };
  const glow = { emissive: '#ffcd73', emissiveIntensity: 0.75, roughness: 0.4 };
  const lightingMaterial = b.material('#fff1ba', { emissive: '#ffe4a0', emissiveIntensity: 0.8 });
  const strip = (x, y, z, w, h, d) => {
    const mesh = b.box(architecture, '#fff1ba', x, y, z, w, h, d, false,
      { emissive: '#ffe4a0', emissiveIntensity: 0.8 });
    mesh.material = lightingMaterial;
    mesh.castShadow = false;
  };

  b.box(architecture, C.wood, 0, -0.3, 0, 49, 0.6, 37, true);
  b.box(architecture, C.marble, 0, -0.025, 0, 48.7, 0.06, 36.7, false,
    { metalness: 0.16, roughness: 0.33 });
  for (let x = -24; x <= 24; x += 3) for (let z = -18; z <= 18; z += 3) {
    const vein = b.box(architecture, C.vein, x + 0.28, 0.011, z, 1.4, 0.006, 0.02);
    vein.rotation.y = Math.sin(x * 3 + z) * 0.9;
  }
  for (const x of [-23.4, 23.4]) b.box(architecture, C.gold, x, 0.016, 0, 0.12, 0.025, 35.4);
  for (const z of [-17.4, 17.4]) b.box(architecture, C.gold, 0, 0.016, z, 46.8, 0.025, 0.12);
  b.box(architecture, C.wood, 0, 3.5, -18.4, 49, 7, 0.3);
  b.box(architecture, C.gold, 0, 0.3, -18.21, 48.8, 0.16, 0.08, false, METAL);
  for (let x = -24; x <= 24; x += 3) {
    b.box(architecture, C.gold, x, 3.5, -18.2, 0.075, 6.7, 0.07, false, METAL);
  }
  strip(0, 6.85, -18.15, 48.7, 0.1, 0.08);
  for (const side of [-1, 1]) {
    b.box(architecture, C.dark, side * 24.4, 0.37, 0, 0.26, 0.74, 37);
    for (let z = -15; z <= 15; z += 6) {
      b.box(architecture, C.glass, side * 24.4, 3.1, z, 0.075, 4.8, 5.9, false,
        { transparent: true, opacity: 0.14, roughness: 0.12, metalness: 0.2, depthWrite: false });
      b.box(architecture, C.gold, side * 24.4, 3.1, z - 3, 0.17, 5, 0.17, false, METAL);
      b.box(architecture, C.gold, side * 24.4, 5.62, z, 0.17, 0.15, 6.1, false, METAL);
    }
    for (let i = 0; i < 14; i++) {
      const z = -30 + i * 4.7;
      const height = 5 + (i * 7 % 11);
      const x = side * (34 + (i % 3) * 3);
      b.box(architecture, i % 2 ? '#546f7b' : '#6e8890', x, height / 2 - 4, z, 3, height, 3.3);
      for (let y = -2; y < height - 4; y += 1.3) {
        b.box(architecture, '#c2ddce', x - side * 1.52, y, z, 0.02, 0.25, 2.3, false,
          { emissive: '#99c8c5', emissiveIntensity: 0.25 });
      }
    }
  }
  b.box(architecture, C.dark, 0, 0.24, 18.4, 49, 0.48, 0.25);
  for (const [x, z] of [[-22,-11],[22,-11],[-22,9],[22,9],[-7,-15],[7,-15]]) {
    plant(b, architecture, x, z, 1.45);
    solid(x, z, 1.3, 1.3);
    b.cylinder(architecture, C.gold, x, 0.22, z, 0.59, 0.08, METAL);
  }
  for (const [x, z] of [[-20,-4],[20,-4],[-20,15],[20,15]]) {
    b.cylinder(architecture, C.dark, x, 0.12, z, 0.55, 0.24);
    b.cylinder(architecture, C.gold, x, 1.7, z, 0.075, 3.3, METAL);
    b.cylinder(architecture, '#fff0c3', x, 3.17, z, 0.75, 0.68, glow);
    solid(x, z, 1.2, 1.2);
  }
  for (const [x, z] of [[-8,11],[8,11]]) {
    b.box(architecture, C.wood, x, 0.65, z, 1.6, 1.3, 1.6, true);
    b.box(architecture, C.gold, x, 1.31, z, 1.7, 0.1, 1.7, false, METAL);
    const sculpture = subgroup(architecture, x, 2.05, z);
    const loop = b.ring(sculpture, C.gold, 0, 0, 0, 0.72, 0.14);
    loop.rotation.set(0.5, 0.3, 0.2);
    b.sphere(sculpture, C.gold, 0, 0.16, 0, 0.35, 0.57, 0.35, METAL);
    sign(architecture, x < 0 ? 'THE DELIVERABLE' : 'THE SYNERGY', x, 0.7, z + 0.81, 1.4, 0.23,
      { background: C.wood, foreground: C.gold });
    solid(x, z, 1.7, 1.7);
  }
  floorLabel(architecture, 'YOUR ENTIRE FLOOR. ONE VERY LARGE OFFICE.', 0, 13, 12.5, 0.75, C.dark);
  floorLabel(architecture, 'CEO / THE CORNER OFFICE IS NOW ALL THE CORNERS', 0, 16.6, 14, 0.5, C.dark);

  framedDoor(b, architecture, -20, -17.65, 'EXECUTIVE LIFT', C.gold, 0, 'BACK TO THE REAL WORLD');
  framedDoor(b, architecture, 20, -17.65, 'PRIVATE BATHROOM', C.wood, 0, 'EVEN THE SOAP HAS EQUITY');
  solid(-20, -17.65, 2.6, 0.45);
  solid(20, -17.65, 2.6, 0.45);
  station('elevator', 'Executive elevator', -20, -15.7, 'elevator');
  station('bathroom', 'Private bathroom', 20, -15.7, 'bathroom');

  b.box(architecture, C.gold, 0, 4.28, -18.07, 18.6, 8.05, 0.22, true, METAL);
  const map = new THREE.Mesh(new THREE.PlaneGeometry(18.2, 7.67),
    new THREE.MeshBasicMaterial({ map: worldMap(), toneMapped: false }));
  map.name = 'sopra-steria-office-world-map';
  map.position.set(0, 4.28, -17.93);
  map.userData.locations = LOCATIONS.map(([name, lon, lat]) => ({ name, lon, lat }));
  map.userData.illustrative = true;
  architecture.add(map);
  station('world-map', 'Explore the world map', 0, -15.45);
  b.box(architecture, '#344e47', 0, 0.02, -9.5, 11, 0.025, 8);
  for (const x of [-5.3, 5.3]) b.box(architecture, C.gold, x, 0.039, -9.5, 0.06, 0.02, 7.6);
  b.box(architecture, C.wood, 0, 1.13, -9.8, 7.7, 0.32, 2.9, true);
  b.box(architecture, C.gold, 0, 0.95, -8.33, 7.6, 0.1, 0.06, false, METAL);
  for (const side of [-1, 1]) {
    b.box(architecture, C.wood, side * 2.9, 0.52, -9.8, 1.4, 1.04, 2.4, true);
    for (let row = 0; row < 3; row++) {
      b.box(architecture, C.gold, side * 2.9, 0.25 + row * 0.28, -8.56, 0.65, 0.035, 0.035, false, METAL);
    }
  }
  solid(0, -9.8, 7.8, 3);
  const throne = chair(b, architecture, 0, -12.25, 0, C.leather);
  throne.scale.setScalar(1.5);
  solid(0, -12.25, 1.1, 1.2);
  for (const x of [-2.5, 2.5]) {
    chair(b, architecture, x, -6.85, Math.PI, C.leather);
    solid(x, -6.85, 0.8, 0.8);
  }
  b.box(architecture, '#19201e', -0.7, 1.31, -9.15, 2.5, 0.035, 1.1, true);
  b.box(architecture, C.gold, 0, 1.42, -8.3, 2.45, 0.25, 0.18, true, METAL);
  sign(architecture, 'CEO / CHIEF ESCALATION OFFICER', 0, 1.43, -8.19, 2.32, 0.17,
    { foreground: '#201913', background: C.gold });
  b.box(architecture, '#121c21', 1.35, 1.38, -10, 0.85, 0.12, 0.48, true);
  b.cylinder(architecture, C.gold, 1.35, 1.68, -10, 0.07, 0.65, METAL);
  b.box(architecture, '#172125', 1.35, 2.05, -10, 2.05, 1.13, 0.12, true);
  sign(architecture, 'INBOX: 99,999+', 1.35, 2.08, -9.93, 1.88, 0.91,
    { background: '#102a32', foreground: '#b4efd9', small: 'DELEGATE / DELEGATE / DELEGATE', height: 256 });
  b.box(architecture, '#202a2b', 1.35, 1.33, -9.12, 1.5, 0.06, 0.48, true);
  for (let i = 0; i < 9; i++) b.box(architecture, C.gold, 0.76 + i * 0.14, 1.366, -9.1, 0.08, 0.01, 0.28);
  b.box(architecture, '#f3eee3', -2.9, 1.38, -9.5, 0.8, 0.13, 1.1);
  b.cylinder(architecture, C.gold, -1.9, 1.52, -9.7, 0.18, 0.44, METAL);
  station('desk', 'Sit at the CEO desk', 0, -6.85);
  station('computer', 'Executive computer', 4.8, -9.2);

  const carX = -13, carZ = 2.8;
  b.box(architecture, C.dark, carX, 0.24, carZ, 9.8, 0.48, 6.6, true);
  b.box(architecture, C.gold, carX, 0.49, carZ, 9.65, 0.07, 6.45, true, METAL);
  b.box(architecture, '#24383d', carX, 0.56, carZ, 9.45, 0.08, 6.25, true);
  strip(carX, 0.29, carZ + 3.32, 9.15, 0.07, 0.03);
  solid(carX, carZ, 9.9, 6.7);
  const car = subgroup(animated, carX, 0.62, carZ, Math.PI / 2);
  car.name = 'ferrari-red-exotic-sports-car';
  const paint = b.material(C.red, { metalness: 0.42, roughness: 0.2 });
  const wedge = (name, sections, material) => {
    const vertices = [], indices = [];
    for (const [z, halfWidth, bottom, top] of sections) {
      vertices.push(-halfWidth, bottom, z, halfWidth, bottom, z, halfWidth, top, z, -halfWidth, top, z);
    }
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, c = i * 4 + (j + 1) % 4;
      indices.push(a, c, c + 4, a, c + 4, a + 4);
    }
    indices.push(0, 2, 1, 0, 3, 2);
    const end = (sections.length - 1) * 4;
    indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    car.add(mesh);
    return mesh;
  };
  wedge('low-wedge-red-body', [[-3.25,1.08,.42,.68],[-2.4,1.4,.35,.98],[-.6,1.34,.4,1.17],[1.1,1.4,.39,1.12],[2.8,1.34,.45,.93]], paint);
  wedge('dark-glass-cabin', [[-.9,1.09,1.12,1.13],[.02,.97,1.14,1.9],[1.14,.96,1.12,1.84],[1.95,1.12,1.04,1.09]],
    b.material('#153847', { metalness: 0.64, roughness: 0.12 }));
  b.box(car, C.red, .02, 1.91, .56, 1.99, .1, 1.12, true, { metalness: .42, roughness: .2 });
  for (const side of [-1, 1]) {
    b.beam(car, C.red, [side * 1.1,1.13,-.94], [side * .98,1.9,.02], .045);
    b.beam(car, C.red, [side * .96,1.86,1.12], [side * 1.13,1.1,1.99], .055);
    b.box(car, '#10171c', side * 1.35, .5, .0, .12, .24, 3.9, true);
    b.box(car, '#142429', side * 1.405, .92, 1.17, .04, .26, .71, true);
    b.box(car, C.red, side * 1.52, 1.2, -.7, .42, .18, .25, true, METAL);
    const headlight = b.box(car, '#edffff', side * .81, .76, -2.98, .58, .085, .34, true,
      { emissive: '#c9f5ff', emissiveIntensity: 1.4 });
    headlight.rotation.y = side * -.16;
    for (const x of [.76, 1.08]) {
      const tail = b.cylinder(car, '#ff3536', side * x, .88, 2.83, .12, .055,
        { emissive: '#ff1222', emissiveIntensity: 1 });
      tail.rotation.x = Math.PI / 2;
    }
    b.cylinder(car, '#7d898f', side * .78, .47, 2.9, .13, .3, METAL).rotation.x = Math.PI / 2;
  }
  b.box(car, '#11191d', 0, .52, -3.24, 1.96, .16, .13, true);
  b.box(car, '#10191d', 0, .63, 2.86, 1.4, .3, .1);
  for (let i = 0; i < 5; i++) {
    for (const side of [-1, 1]) b.box(car, '#231d1e', side * .63, 1.007 + i * .027, -2.15 + i * .18, .36, .025, .07);
    b.box(car, '#1e1c1d', 0, 1.14 - i * .04, 1.96 + i * .14, 1.62, .025, .06);
  }
  b.box(car, C.gold, 0, .87, -2.88, .16, .025, .22, false, METAL);
  sign(car, 'Ferrari', 0, 1.01, 2.875, .83, .2, { background: 'transparent', foreground: '#e9e5df' });
  const rims = [];
  for (const side of [-1, 1]) for (const z of [-1.95, 1.9]) {
    b.cylinder(car, '#15181d', side * 1.35, .58, z, .59, .38).rotation.z = Math.PI / 2;
    const rim = subgroup(car, side * 1.565, .58, z);
    rim.name = 'animated-ferrari-rim';
    b.cylinder(rim, '#929da3', 0, 0, 0, .46, .055, METAL).rotation.z = Math.PI / 2;
    b.cylinder(rim, '#20272b', side * .035, 0, 0, .38, .06).rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      b.beam(rim, '#e6e9e8', [side * .07,0,0], [side * .07,Math.cos(angle) * .4,Math.sin(angle) * .4], .045);
    }
    b.cylinder(rim, C.gold, side * .095, 0, 0, .1, .055, METAL).rotation.z = Math.PI / 2;
    rims.push(rim);
  }
  sign(architecture, 'FERRARI / COMPANY CAR', carX, 1.1, carZ + 3.38, 6.6, .65,
    { background: C.dark, foreground: C.gold, small: '0 TO BILLABLE IN 2.9 SECONDS' });
  station('ferrari', 'Rev the Ferrari', carX, 7.3);

  const tubX = 13, tubZ = 1.3;
  b.box(architecture, '#e3d9bd', tubX, .23, tubZ, 8.6, .46, 7.7, true);
  for (let x = -4; x <= 4; x += .8) for (let z = -3.5; z <= 3.5; z += .7) {
    b.box(architecture, (Math.round(x * 5 + z * 10) % 3) ? '#c8b785' : '#97c2bc',
      tubX + x, .47, tubZ + z, .73, .02, .63);
  }
  b.box(architecture, '#356c78', tubX, .67, tubZ, 6.6, .66, 5.6, true);
  for (const side of [-1, 1]) {
    b.box(architecture, C.marble, tubX + side * 3.3, .88, tubZ, .65, 1.08, 6.15, true);
    b.box(architecture, C.gold, tubX + side * 3.3, 1.43, tubZ, .72, .09, 6.22, true, METAL);
    b.box(architecture, C.marble, tubX, .88, tubZ + side * 2.8, 6.7, 1.08, .65, true);
    b.box(architecture, C.gold, tubX, 1.43, tubZ + side * 2.8, 6.7, .09, .72, true, METAL);
  }
  solid(tubX, tubZ, 8.6, 7.7);
  const water = b.box(animated, '#43bed0', tubX, 1.16, tubZ, 5.94, .055, 4.94, true,
    { transparent: true, opacity: .77, roughness: .12, metalness: .32, emissive: '#148caa', emissiveIntensity: .35 });
  water.name = 'animated-jacuzzi-water';
  const bubbles = [], steam = [], ripples = [];
  for (let i = 0; i < 24; i++) {
    const bubble = b.sphere(animated, '#d0ffff', tubX + Math.sin(i * 2.4) * 2.6, 1.2,
      tubZ + Math.cos(i * 3.1) * 2.1, .055 + i % 3 * .025, .06, .06,
      { transparent: true, opacity: .67, emissive: '#91eaff', emissiveIntensity: .4 });
    bubble.name = 'animated-jacuzzi-bubble'; bubble.castShadow = false;
    bubbles.push(bubble);
  }
  for (let i = 0; i < 8; i++) {
    const vapor = b.sphere(animated, '#d6f5ed', tubX + Math.sin(i * 2) * 2.1, 1.7,
      tubZ + Math.cos(i * 3) * 1.8, .22, .4, .22,
      { transparent: true, opacity: .12, depthWrite: false });
    vapor.name = 'animated-jacuzzi-steam'; vapor.castShadow = false;
    steam.push(vapor);
    const ripple = b.ring(animated, '#b1f5ef', tubX + Math.sin(i * 2) * 2, 1.2,
      tubZ + Math.cos(i * 3) * 1.6, .28, .021);
    ripple.name = 'animated-jacuzzi-ripple'; ripples.push(ripple);
  }
  for (let i = 0; i < 5; i++) {
    b.sphere(architecture, '#a0edee', tubX - 2.4 + i * 1.2, .9, tubZ + 3.15, .1, .1, .035,
      { emissive: '#8cedff', emissiveIntensity: 1.3 });
  }
  b.beam(architecture, C.gold, [16.5,1.4,-.8], [16.5,2.1,-.8], .055);
  b.beam(architecture, C.gold, [16.5,2.1,-.8], [15.8,2.1,-.8], .055);
  sign(architecture, 'THE LIQUID ASSET', tubX, 1.98, tubZ - 3.68, 6.6, .6,
    { background: C.dark, foreground: C.gold, small: 'PRIVATE JACUZZI / SYNERGY ON TAP' });
  station('jacuzzi', 'Jacuzzi and bubbles', tubX, 6.35);

  const panelX = -14, panelZ = -11;
  b.box(architecture, C.wood, panelX, 1.8, panelZ, 7.4, 3.6, 1.1, true);
  b.box(architecture, C.gold, panelX, 1.85, panelZ + .58, 7.2, 3.38, .08, true, METAL);
  b.box(architecture, C.dark, panelX, 1.82, panelZ + .64, 6.95, 3.08, .05, true);
  sign(architecture, 'EXECUTIVE CONTROL PANEL', panelX, 3.95, panelZ + .1, 7.5, .68,
    { background: C.wood, foreground: C.gold, small: 'TOO MANY BUTTONS. NOT ENOUGH OVERSIGHT.' });
  const buttonLamps = [];
  for (let i = 0; i < CEO_BUTTONS.length; i++) {
    const x = panelX + (i % 4 - 1.5) * 1.7;
    const y = 3.02 - Math.floor(i / 4) * .58;
    const lamp = b.cylinder(animated, ['#ff6561','#59d6c4','#e8c969','#8eafff'][i % 4],
      x, y, panelZ + .75, .125, .13, { emissive: ['#ff6561','#59d6c4','#e8c969','#8eafff'][i % 4], emissiveIntensity: .5 });
    lamp.rotation.x = Math.PI / 2; lamp.name = `ceo-button-${CEO_BUTTONS[i].id}`;
    buttonLamps.push(lamp);
    sign(architecture, CEO_BUTTONS[i].label, x, y - .23, panelZ + .681, 1.6, .18,
      { foreground: '#ecdec2', background: C.dark, height: 80 });
  }
  solid(panelX, panelZ, 7.4, 1.15);
  station('buttons', 'Too many CEO buttons', panelX, -8.65);

  const lounge = subgroup(architecture, 15, 0, 12);
  b.box(lounge, '#b6a379', 0, .018, 0, 9.2, .025, 6.8);
  for (const side of [-1, 1]) {
    const sofa = subgroup(lounge, side * 3, 0, 0, -side * Math.PI / 2);
    b.box(sofa, C.leather, 0, .52, 0, 4.2, .7, 1.42, true);
    b.box(sofa, C.leather, 0, 1.06, -.6, 4.2, 1.1, .32, true);
    for (const x of [-1.96,1.96]) b.box(sofa, C.leather, x, .95, 0, .3, .57, 1.43, true);
    for (const x of [-1.3,0,1.3]) b.box(sofa, '#644639', x, .91, .04, 1.22, .16, 1.02, true);
    b.box(sofa, C.gold, 0, .2, .62, 3.9, .08, .04, false, METAL);
    solid(15 + side * 3, 12, 1.65, 4.3);
  }
  b.box(lounge, C.wood, 0, .61, 0, 2.7, 1.1, 1.55, true);
  b.box(lounge, C.marble, 0, 1.19, 0, 2.95, .12, 1.73, true);
  b.ring(lounge, C.gold, 0, 1.26, 0, .47, .04);
  for (const x of [-.4,.4]) {
    b.cylinder(lounge, C.gold, x, 1.42, 0, .06, .32, METAL);
    b.sphere(lounge, '#d4e8da', x, 1.63, 0, .14, .22, .14,
      { transparent: true, opacity: .65, roughness: .18 });
  }
  solid(15, 12, 3, 1.75);
  station('lounge', 'Leather executive lounge', 15, 9.55);

  b.box(architecture, C.wood, -15, .64, 13, 6.6, 1.28, 1.6, true);
  b.box(architecture, C.marble, -15, 1.33, 13, 6.9, .15, 1.8, true);
  b.box(architecture, C.gold, -15, 1.01, 13.83, 6.2, .035, .035, false, METAL);
  b.box(architecture, '#263330', -16.7, 1.98, 13, 1.65, 1.2, 1.1, true);
  b.box(architecture, C.gold, -16.7, 2, 13.58, 1.5, .96, .09, true, METAL);
  b.box(architecture, '#172b30', -16.7, 1.86, 13.65, .65, .6, .09, true);
  sign(architecture, 'LIQUID LEADERSHIP', -15, 2.95, 12.9, 6.5, .55,
    { background: C.wood, foreground: C.gold, small: 'ARTISAN COFFEE / ORDINARY RESPONSIBILITY' });
  const coffeeStream = b.cylinder(animated, '#5d341f', -16.7, 1.78, 13.8, .045, .4);
  coffeeStream.name = 'executive-coffee-stream'; coffeeStream.visible = false;
  b.cylinder(architecture, C.marble, -16.7, 1.57, 13.8, .17, .3);
  for (let i = 0; i < 4; i++) {
    b.cylinder(architecture, '#263a31', -14.5 + i * .55, 1.71, 13, .12, .55);
    b.cylinder(architecture, C.gold, -14.5 + i * .55, 2.01, 13, .055, .12, METAL);
  }
  solid(-15, 13, 6.9, 1.8);
  station('coffee', 'Executive espresso bar', -15, 15.25);
  const budget = subgroup(animated, -5.5, .1, 4);
  budget.name = 'visible-executive-budget';
  for (let i = 0; i < 8; i++) {
    b.box(budget, C.gold, (i % 2 - .5) * .45, .1 + Math.floor(i / 2) * .14, 0, .43, .13, .68, true, METAL);
  }
  budget.visible = false;

  instanceStaticGeometry(architecture);
  let elapsed = 0, revTime = 0, bubbleTime = 0, coffeeTime = 0, celebration = 0;
  let mood = 0, lastButton = -1, buttonTime = 0, disposed = false;
  const buttonResponses = {
    'more-coffee': 'An espresso starts pouring. Your blood type is now Arabica.',
    'increase-synergy': 'Synergy increased by 400%. The lights have aligned; nobody knows what that means.',
    'print-money': 'A stack of gold appears. Finance would like to stress that this is decorative.',
    'approve-budget': 'Budget approved. The gold stack is the entire business case.',
    'spin-rims': 'The Ferrari revs on its plinth. Those rims are working harder than the steering committee.',
    'bubble-party': 'The jacuzzi enters turbo synergy mode. Please keep all annual reports dry.',
    'mood-lighting': 'Executive mood lighting updated. Every questionable decision now has flattering lighting.',
    'world-domination': 'The world is already covered in meetings. Try improving one time zone first.',
    'call-meeting': 'A meeting about meetings has been scheduled. The lights are sounding a silent alarm.',
    'cancel-meetings': 'All imaginary meetings cancelled. Somewhere, an agenda has found peace.',
    'give-bonus': 'Bonus awarded: eight extremely non-redeemable gold bars. Congratulations, stakeholder.',
    'golden-parachute': 'Golden parachute deployed in spirit. The gold landed; your accountability did not.',
    'approve-everything': 'Everything approved. Even the jacuzzi is now a strategic investment.',
    'panic': 'Professional panic activated. Breathe in. Circle back. Breathe out. Escalate.',
    'do-nothing': 'Nothing done. At this level, that is called strategic restraint.',
    'optimize': 'The rims spin faster, achieving zero additional distance. Optimization complete.',
    'strategic-nap': 'Strategic nap authorized. The lights dim and your decisions enter sleep mode.',
    'innovation': 'Innovation launched: ordinary water, now with disruptive bubbles.',
    'more-gold': 'More gold! The office has reached peak stakeholder reflectivity.',
    'reset-office': 'Plausible deniability restored. Coffee off, jets calm, all evidence merely decorative.',
  };
  const interact = (id) => {
    if (disposed) return 'This executive office has closed for the day.';
    if (id === 'ferrari' || id === 'spin-rims' || id === 'optimize') revTime = 9;
    if (id === 'jacuzzi' || id === 'bubble-party' || id === 'innovation' || id === 'approve-everything') bubbleTime = 12;
    if (id === 'coffee' || id === 'more-coffee' || id === 'approve-everything') {
      coffeeTime = 9; coffeeStream.visible = true;
    }
    if (['print-money','approve-budget','give-bonus','golden-parachute','more-gold'].includes(id)) budget.visible = true;
    if (['mood-lighting','increase-synergy','cancel-meetings','more-gold','world-domination'].includes(id)) mood = (mood + 1) % 4;
    if (['panic','call-meeting','approve-everything','innovation'].includes(id)) celebration = 9;
    if (id === 'strategic-nap' || id === 'lounge') mood = 3;
    lastButton = CEO_BUTTONS.findIndex(button => button.id === id);
    if (lastButton >= 0) {
      buttonTime = 1.2;
      buttonLamps[lastButton].position.z = panelZ + .7;
    }
    if (id === 'reset-office') {
      revTime = bubbleTime = coffeeTime = celebration = mood = 0;
      budget.visible = coffeeStream.visible = false;
    }
    if (Object.hasOwn(buttonResponses, id)) return buttonResponses[id];
    const response = {
      ferrari: 'Your bright red Ferrari revs. The rims spin, the headlights glow, and Facilities asks how you got it into the lift.',
      jacuzzi: 'The jacuzzi bubbles enthusiastically. Finally, a deep dive with measurable personal benefit.',
      'world-map': `Sopra Steria spans many places and even more meetings. This illustrative map marks ${LOCATIONS.length} representative locations, including Stavanger, Oslo, Paris, London, Berlin, Bengaluru and Singapore; it is not an exhaustive office directory.`,
      desk: 'You sit, metaphorically, at the enormous dark-wood CEO desk. The only item requiring your signature is a request for a bigger desk.',
      computer: '99,999 unread emails. Three buttons: Delegate, Delegate again, and Mark everything strategic. Your quarterly achievement is closing the inbox.',
      lounge: 'Soft leather. Cool marble. Lights dimmed. You are not resting: you are incubating a leadership perspective.',
      coffee: 'The gold espresso machine pours your executive roast. Notes of chocolate, ambition, and unapproved expenses.',
      buttons: `${CEO_BUTTONS.length} executive buttons. None ask for a second opinion. Choose a suspiciously powerful option from the control panel.`,
      elevator: 'The executive lift awaits. Choose a floor and descend into other people’s deliverables.',
      bathroom: 'Your private bathroom is through this door. Even the soap has an executive compensation package.',
    }[id];
    if (typeof response === 'string') return response;
    console.warn('Unknown CEO office interaction:', id);
    return 'That executive control is unavailable. Please select a marked object or labelled button.';
  };
  return {
    group, colliders, interactables, bounds: { x: 24, z: 18 }, spawn: { x: 0, z: 15 }, interact,
    update(dt = 0, time) {
      if (disposed) return;
      const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
      elapsed = Number.isFinite(time) ? time : elapsed + delta;
      revTime = Math.max(0, revTime - delta);
      bubbleTime = Math.max(0, bubbleTime - delta);
      coffeeTime = Math.max(0, coffeeTime - delta);
      celebration = Math.max(0, celebration - delta);
      buttonTime = Math.max(0, buttonTime - delta);
      for (const rim of rims) rim.rotation.x += delta * (revTime > 0 ? 19 : 1.45);
      car.position.y = .62 + (revTime > 0 ? Math.sin(elapsed * 52) * .015 : 0);
      const bubbling = bubbleTime > 0;
      water.position.y = 1.16 + Math.sin(elapsed * 2.5) * .016;
      water.material.emissiveIntensity = bubbling ? .6 + Math.sin(elapsed * 5) * .15 : .35;
      bubbles.forEach((bubble, i) => {
        const phase = (elapsed * (bubbling ? 1.4 : .48) + i * .173) % 1;
        bubble.position.y = 1.18 + phase * (bubbling ? .9 : .32);
        bubble.scale.setScalar((.05 + i % 3 * .022) * (1 - phase * .7) * (bubbling ? 1.7 : 1));
      });
      steam.forEach((vapor, i) => {
        const phase = (elapsed * .2 + i / steam.length) % 1;
        vapor.position.y = 1.4 + phase * (bubbling ? 2.2 : 1.3);
        vapor.scale.set(.2 + phase * .3, .35 + phase * .45, .2 + phase * .3);
      });
      ripples.forEach((ripple, i) => {
        const scale = .15 + ((elapsed * .35 + i / ripples.length) % 1) * .46;
        ripple.scale.setScalar(scale);
        ripple.position.y = water.position.y + .041;
      });
      coffeeStream.visible = coffeeTime > 0;
      if (coffeeStream.visible) coffeeStream.scale.x = coffeeStream.scale.z = .04 + Math.sin(elapsed * 16) * .006;
      if (budget.visible) {
        budget.rotation.y = Math.sin(elapsed * .7) * .18;
        budget.position.y = .25 + Math.sin(elapsed * 1.8) * .1;
      }
      const colors = ['#ffe4a0','#71dce5','#f59abd','#baa5ed'];
      lightingMaterial.emissive.set(colors[mood]);
      lightingMaterial.color.set(colors[mood]);
      lightingMaterial.emissiveIntensity = mood === 3 ? .25 : celebration > 0 ? .85 + Math.sin(elapsed * 8) * .35 : .8;
      buttonLamps.forEach((lamp, i) => {
        lamp.position.z = panelZ + (i === lastButton && buttonTime > 0 ? .7 : .75);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeGroup(group);
    },
  };
}
