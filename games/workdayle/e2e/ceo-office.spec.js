import { test, expect } from '@playwright/test';

test('CEO office is open, all stations are reachable, and luxury effects survive static batching', async ({ page }) => {
  const warnings = [];
  page.on('console', message => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><body></body></html>',
  }));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createCEOOffice, CEO_BUTTONS } = await import('/src/ceo-office.js');
    const office = createCEOOffice();
    const { colliders, bounds, spawn, group } = office;
    const blocked = (x, z) => colliders.some(rect => {
      const dx = Math.max(Math.abs(x - rect.x) - rect.w / 2, 0);
      const dz = Math.max(Math.abs(z - rect.z) - rect.d / 2, 0);
      return dx * dx + dz * dz < .34 ** 2;
    });
    // Conservative four-neighbour flood fill also proves a player-sized path from the lift-side spawn.
    const step = .25, width = Math.round(bounds.x * 2 / step) + 1;
    const height = Math.round(bounds.z * 2 / step) + 1;
    const cells = new Uint8Array(width * height);
    const toCell = (x, z) => Math.round((z + bounds.z) / step) * width + Math.round((x + bounds.x) / step);
    const queue = [toCell(spawn.x, spawn.z)];
    cells[queue[0]] = 1;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const cell = queue[cursor], gx = cell % width, gz = Math.floor(cell / width);
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = gx + dx, nz = gz + dz, next = nz * width + nx;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height || cells[next]) continue;
        if (blocked(nx * step - bounds.x, nz * step - bounds.z)) continue;
        cells[next] = 1; queue.push(next);
      }
    }
    const unreachable = office.interactables.filter(item =>
      blocked(item.x, item.z) || cells[toCell(item.x, item.z)] !== 1).map(item => item.id);
    const rim = group.getObjectByName('animated-ferrari-rim');
    const water = group.getObjectByName('animated-jacuzzi-water');
    const bubble = group.getObjectByName('animated-jacuzzi-bubble');
    const map = group.getObjectByName('sopra-steria-office-world-map');
    const before = { rim: rim.rotation.x, water: water.position.y, bubble: bubble.position.y };
    office.update(.1, 1);
    const idleSpin = rim.rotation.x - before.rim;
    const baseline = rim.rotation.x;
    const responses = CEO_BUTTONS.map(button => office.interact(button.id));
    office.interact('ferrari');
    office.interact('jacuzzi');
    office.interact('coffee');
    office.interact('print-money');
    office.update(.1, 1.1);
    const geometry = new Set(), materials = new Set(), textures = new Set();
    group.traverse(object => {
      if (object.geometry) geometry.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      }
    });
    let released = 0;
    for (const resource of [...geometry, ...materials, ...textures]) resource.addEventListener('dispose', () => released++);
    const snapshot = {
      bounds, spawn, unreachable, buttonCount: CEO_BUTTONS.length,
      buttonIdsUnique: new Set(CEO_BUTTONS.map(item => item.id)).size === CEO_BUTTONS.length,
      readableResponses: responses.every(message => typeof message === 'string' && message.length > 30),
      unknownResponse: office.interact('not-a-real-ceo-control'),
      doors: office.interactables.filter(item => item.kind !== 'ceo').map(({ id, kind }) => ({ id, kind })),
      onlyExternalWalls: colliders.every(rect => rect.kind !== 'wall'),
      idleSpin, revSpin: rim.rotation.x - baseline,
      waterMoved: water.position.y !== before.water, bubbleMoved: bubble.position.y !== before.bubble,
      steam: !!group.getObjectByName('animated-jacuzzi-steam'),
      coffee: group.getObjectByName('executive-coffee-stream').visible,
      budget: group.getObjectByName('visible-executive-budget').visible,
      map: { count: map.userData.locations.length, illustrative: map.userData.illustrative },
      featuresUnbatched: !rim.isInstancedMesh && !water.isInstancedMesh && !bubble.isInstancedMesh,
      batches: group.getObjectByName('ceo-static-architecture').children.filter(item => item.isInstancedMesh).length,
      resourceCount: geometry.size + materials.size + textures.size,
    };
    office.dispose();
    office.dispose();
    office.update(.1, 9);
    return { ...snapshot, released, childrenAfterDispose: group.children.length };
  });
  expect(result.bounds).toEqual({ x: 24, z: 18 });
  expect(result.spawn).toEqual({ x: 0, z: 15 });
  expect(result.unreachable).toEqual([]);
  expect(result.doors).toEqual([{ id: 'elevator', kind: 'elevator' }, { id: 'bathroom', kind: 'bathroom' }]);
  expect(result.buttonCount).toBeGreaterThanOrEqual(16);
  expect(result.buttonIdsUnique && result.readableResponses && result.onlyExternalWalls).toBe(true);
  expect(result.unknownResponse).toContain('unavailable');
  expect(warnings.some(message => message.includes('Unknown CEO office interaction: not-a-real-ceo-control'))).toBe(true);
  expect(result.idleSpin).toBeGreaterThan(0);
  expect(result.revSpin).toBeGreaterThan(result.idleSpin * 5);
  expect(result.waterMoved && result.bubbleMoved && result.steam && result.coffee && result.budget).toBe(true);
  expect(result.map.illustrative && result.featuresUnbatched).toBe(true);
  expect(result.map.count).toBeGreaterThan(30);
  expect(result.batches).toBeGreaterThan(5);
  expect(result.released).toBe(result.resourceCount);
  expect(result.childrenAfterDispose).toBe(0);
});

test('the executive suite renders as a single expansive room', async ({ page }, info) => {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><body style="margin:0"></body></html>',
  }));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createCEOOffice } = await import('/src/ceo-office.js');
    const office = createCEOOffice();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1440, 960);
    renderer.setPixelRatio(1);
    renderer.setClearColor('#b4ced3');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff3d2', '#556672', 2.2));
    const sun = new THREE.DirectionalLight('#fff3cf', 3);
    sun.position.set(-14, 30, 12);
    scene.add(sun, office.group);
    const camera = new THREE.PerspectiveCamera(50, 1.5, .1, 200);
    camera.position.set(30, 36, 40);
    camera.lookAt(0, 0, -1.5);
    office.interact('jacuzzi');
    office.interact('ferrari');
    office.update(.1, 4);
    renderer.render(scene, camera);
    window.ceoRenderFixture = { office, renderer };
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  });
  expect(result.calls).toBeGreaterThan(30);
  expect(result.calls).toBeLessThan(400);
  expect(result.triangles).toBeGreaterThan(1000);
  await page.screenshot({ path: info.outputPath('ceo-open-office.png') });
  await page.evaluate(() => {
    window.ceoRenderFixture.office.dispose();
    window.ceoRenderFixture.renderer.dispose();
  });
});
