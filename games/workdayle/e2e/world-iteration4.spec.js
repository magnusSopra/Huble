import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><body style="margin:0"></body></html>',
  }));
  await page.goto('/');
});

test('four architectures preserve every route, shuffled task, and collision-safe living NPC', async ({ page }) => {
  const floors = await page.evaluate(async () => {
    const { createOffice } = await import('/src/world.js');
    const { FLOORS } = await import('/src/content.js');
    const { hasClearPath } = await import('/src/state.js');
    const { walkTo } = await import('/test-support/walk-bot.js');
    const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const reports = [];
    for (let index = 0; index < 4; index++) {
      const floor = FLOORS[index], original = JSON.stringify(floor.npcs);
      const completed = new Set(floor.tasks.slice(0, 3).map(t => `${index}:${t.id}`));
      const office = createOffice(floor, index, { rng: rng(1234 + index), completed });
      const npcs = office.interactables.filter(i => i.kind === 'npc');
      const starts = npcs.map(npc => ({ x: npc.x, z: npc.z }));
      const replay = createOffice(floor, index, { rng: rng(1234 + index), completed });
      const seededReplay = JSON.stringify(replay.interactables.filter(i => i.kind === 'npc').map(i => [i.x, i.z, i.npc.task.id]))
        === JSON.stringify(npcs.map(i => [i.x, i.z, i.npc.task.id]));
      replay.dispose();
      const different = createOffice(floor, index, { rng: rng(7654 + index) });
      const differentTasks = different.interactables.filter(i => i.kind === 'npc').some((npc, i) => npc.npc.task.id !== npcs[i].npc.task.id);
      different.dispose();
      const game = { office, state: { position: { ...office.spawn } }, updateOffice() {
        this.nearest = office.interactables.filter(i => !i.collected && hasClearPath(this.state.position, i, office.colliders))
          .sort((a, b) => Math.hypot(a.x - this.state.position.x, a.z - this.state.position.z)
            - Math.hypot(b.x - this.state.position.x, b.z - this.state.position.z))[0];
      } };
      const unreachable = [];
      for (const item of office.interactables) {
        try { walkTo(game, item.id); } catch (error) { unreachable.push(error.message); }
      }
      let unsafe = 0, unsynced = 0, plans = 0, maxPlansPerFrame = 0;
      const route = office.navigation.route;
      office.navigation.route = (...args) => { plans++; return route(...args); };
      for (let frame = 0; frame < 600; frame++) {
        const before = plans;
        office.update(0.1, frame / 10, { allowMovement: true, playerPosition: { x: 0, z: 18 } });
        maxPlansPerFrame = Math.max(maxPlansPerFrame, plans - before);
        for (const npc of npcs) {
          if (!office.navigation.isWalkable(npc)) unsafe++;
          if (npc.x !== npc.mesh.position.x || npc.z !== npc.mesh.position.z
            || npc.x !== npc.marker.position.x || npc.z !== npc.marker.position.z
            || npc.x !== npc.nameLabel.position.x || npc.z !== npc.nameLabel.position.z
            || npc.npc.x !== npc.x || npc.npc.z !== npc.z) unsynced++;
        }
      }
      const moved = npcs.filter((npc, i) => Math.hypot(npc.x - starts[i].x, npc.z - starts[i].z) > 0.1).length;
      const held = { x: npcs[0].x, z: npcs[0].z };
      for (let frame = 0; frame < 50; frame++) office.update(0.1, 61 + frame / 10, { allowMovement: true, playerPosition: held });
      const nearbyStopped = npcs[0].x === held.x && npcs[0].z === held.z;
      const positions = npcs.map(i => [i.x, i.z]);
      for (let frame = 0; frame < 20; frame++) office.update(0.1, 70 + frame / 10);
      const defaultPaused = JSON.stringify(positions) === JSON.stringify(npcs.map(i => [i.x, i.z]));
      office.update(20, 95, { allowMovement: false });
      const explicitPaused = JSON.stringify(positions) === JSON.stringify(npcs.map(i => [i.x, i.z]));
      office.update(1000, 96, { allowMovement: true });
      const boundedDelta = npcs.every((npc, i) => Math.hypot(npc.x - positions[i][0], npc.z - positions[i][1]) <= 0.10501);
      const available = npcs.filter(i => i.marker.visible).map(i => i.npc.task.id).sort();
      const expected = floor.tasks.filter(t => !completed.has(`${index}:${t.id}`)).map(t => t.id).sort();
      reports.push({
        index, unreachable, unsafe, unsynced, moved, plans, maxPlansPerFrame, nearbyStopped, defaultPaused, explicitPaused, boundedDelta,
        architecture: office.group.userData.architecture, walls: office.colliders.filter(c => c.kind === 'wall').length,
        tasks: npcs.map(i => i.npc.task.id).sort(), expectedTasks: floor.tasks.map(t => t.id).sort(),
        available, expected, seededReplay, differentTasks, inputUnchanged: JSON.stringify(floor.npcs) === original,
        startsSafe: starts.every(p => office.navigation.isWalkable(p)),
        randomized: starts.some((p, i) => p.x !== floor.npcs[i].x || p.z !== floor.npcs[i].z),
        computer: office.interactables.find(i => i.id === 'cv-workstation')?.kind,
        bossLabel: office.interactables.find(i => i.id === 'boss')?.label,
        tables: ['round-huddle-table', 'executive-conference-table', 'executive-leather-sofa'].filter(name => office.group.getObjectByName(name)),
      });
      office.dispose();
      office.update(0.1, 100, { allowMovement: true });
    }
    return reports;
  });
  expect(new Set(floors.map(f => f.architecture)).size).toBe(4);
  expect(new Set(floors.map(f => f.walls)).size).toBe(4);
  for (const floor of floors) {
    expect(floor.unreachable, `floor ${floor.index}`).toEqual([]);
    expect(floor.unsafe).toBe(0);
    expect(floor.unsynced).toBe(0);
    expect(floor.moved).toBeGreaterThan(7);
    expect(floor.plans).toBeGreaterThan(10);
    expect(floor.maxPlansPerFrame).toBeLessThanOrEqual(2);
    expect(floor.nearbyStopped && floor.defaultPaused && floor.explicitPaused && floor.boundedDelta).toBe(true);
    expect(floor.tasks).toEqual(floor.expectedTasks);
    expect(floor.available).toEqual(floor.expected);
    expect(floor.inputUnchanged && floor.startsSafe && floor.randomized && floor.seededReplay && floor.differentTasks).toBe(true);
    expect(floor.computer).toBe('computer');
  }
  expect(floors[0].bossLabel).toContain('SNACK ROOM');
  expect(floors[1].tables).toContain('round-huddle-table');
  expect(floors[2].tables).toContain('executive-conference-table');
  expect(floors[3].tables).toContain('executive-leather-sofa');
});

test('collectibles, private bathroom props, hidden shrine and snack room remain interactive after batching', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createOffice } = await import('/src/world.js');
    const { createBathroom, createSecretRoom, createSnackRoom } = await import('/src/interiors.js');
    const { createOfficeNavigation } = await import('/src/office-navigation.js');
    const { FLOORS, BOSSES } = await import('/src/content.js');
    const { hasClearPath } = await import('/src/state.js');
    const collected = new Set(), failures = [], bathroomIds = [];
    let collectibles = 0, cameras = 0;
    const checkRoutes = room => {
      const nav = createOfficeNavigation(room.colliders, room.bounds, { spawn: room.spawn });
      for (const item of room.interactables) {
        const point = nav.nearest(item);
        if (!point || Math.hypot(point.x - item.x, point.z - item.z) > 0.8 || !hasClearPath(point, item, room.colliders)) failures.push(item.id);
      }
    };
    for (let index = 0; index < 4; index++) {
      const office = createOffice(FLOORS[index], index, { collected });
      for (const item of office.interactables.filter(i => i.kind === 'collectible')) {
        collectibles++;
        if (!office.collect(item.collectionId) || office.collect(item.collectionId) || item.mesh.visible) failures.push(item.id);
        collected.add(item.collectionId);
      }
      office.dispose();
      const restored = createOffice(FLOORS[index], index, { collected });
      if (restored.interactables.some(i => i.kind === 'collectible' && (i.mesh.visible || !i.collected))) failures.push('collectible-restore');
      restored.dispose();
      const bathroom = createBathroom(false, { floor: index, collected });
      checkRoutes(bathroom);
      const camera = bathroom.interactables.find(i => i.kind === 'camera');
      bathroomIds.push(camera.collectionId);
      if (!camera.message.includes('No lens, no wires, no recordings')) failures.push('camera-fiction');
      if (!bathroom.collect(camera.collectionId) || !camera.mesh.userData.broken || bathroom.collect(camera.collectionId)) failures.push(camera.id);
      collected.add(camera.collectionId);
      cameras++;
      bathroom.dispose();
      const revisited = createBathroom(false, { floor: index, collected });
      const broken = revisited.interactables.find(i => i.kind === 'camera');
      if (!broken.collected || !broken.mesh.userData.broken || revisited.collect(broken.id)) failures.push('camera-restore');
      revisited.dispose();
    }
    const luxury = createBathroom(true, { floor: 4, collected });
    const privateCameraCount = luxury.interactables.filter(i => i.kind === 'camera').length;
    luxury.dispose();
    const secret = createSecretRoom();
    checkRoutes(secret);
    const secretKinds = secret.interactables.map(i => i.kind);
    const messages = secret.interactables.filter(i => i.kind === 'easter-egg').every(i => i.message.length > 30);
    secret.dispose();
    const snack = createSnackRoom(BOSSES[0]);
    checkRoutes(snack);
    const cinematicNav = createOfficeNavigation(snack.colliders, snack.bounds, { spawn: snack.spawn, radius: 0.7 });
    for (const x of [-0.6, 0, 1]) for (let z = -0.5; z <= 6; z += 0.1) {
      if (!cinematicNav.isWalkable({ x, z })) failures.push(`snack-cinematic-strip:${x}:${z}`);
    }
    const ready = await snack.ready;
    const bossUnbatched = !!snack.bossMesh.userData.headSurface && !snack.bossMesh.isInstancedMesh;
    const snackStatic = snack.group.getObjectByName('jill-snack-room-static');
    const hasSnacks = !!snackStatic.getObjectByName('snack-table-bowls-and-candy');
    snack.dispose();
    return { collectibles, cameras, failures, bathroomIds, saved: collected.size, privateCameraCount, secretKinds, messages, ready, bossUnbatched, hasSnacks };
  });
  expect(result.failures).toEqual([]);
  expect(result.collectibles).toBe(20);
  expect(result.cameras).toBe(4);
  expect(result.saved).toBe(24);
  expect(result.bathroomIds).toEqual(['camera:0', 'camera:1', 'camera:2', 'camera:3']);
  expect(result.privateCameraCount).toBe(0);
  expect(result.secretKinds).toEqual(['exit-secret', 'easter-egg', 'easter-egg']);
  expect(result.messages && result.bossUnbatched && result.hasSnacks).toBe(true);
  expect(result.ready).toBe('ready');
});

test('office tiers render with progressively open furniture plans and lighting', async ({ page }, info) => {
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createOffice } = await import('/src/world.js');
    const { FLOORS } = await import('/src/content.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1440, 960);
    renderer.setPixelRatio(1);
    renderer.setScissorTest(true);
    renderer.setClearColor('#bdcbbd');
    document.body.append(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-34, 34, 23, -23, 0.1, 200);
    camera.position.set(28, 42, 35);
    camera.lookAt(0, 0, 0);
    for (let index = 0; index < 4; index++) {
      const office = createOffice(FLOORS[index], index, { rng: () => 0.3 });
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#fff2dc', '#57644f', 2.2));
      const sun = new THREE.DirectionalLight('#fff2dd', 2.1);
      sun.position.set(-15, 25, 12);
      scene.add(sun, office.group);
      const x = (index % 2) * 720, y = index < 2 ? 480 : 0;
      renderer.setViewport(x, y, 720, 480);
      renderer.setScissor(x, y, 720, 480);
      renderer.render(scene, camera);
      office.dispose();
    }
  });
  await page.screenshot({ path: info.outputPath('office-tiers.png') });
});

test('static batching never captures async head subtrees or explicit dynamic meshes', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { builder, subgroup, instanceStaticGeometry, disposeGroup, createCharacter } = await import('/src/world.js');
    const b = builder(), root = new THREE.Group();
    const pending = subgroup(root), dynamic = subgroup(root), fixed = subgroup(root);
    pending.userData.cancelPending = () => {};
    dynamic.userData.noStaticBatch = true;
    const meshes = [pending, dynamic, fixed].map(parent => Array.from({ length: 3 }, (_, i) =>
      b.box(parent, '#acbdce', i, 0, 0, 1, 1, 1)));
    const lifecycleMeshes = ['loading', 'ready', 'error', 'missing', 'disposed'].flatMap(photoState => {
      const parent = subgroup(root);
      parent.userData.photoState = photoState;
      return Array.from({ length: 3 }, (_, i) => b.box(parent, '#acbdce', i, 0, 0, 1, 1, 1));
    });
    const character = createCharacter();
    root.add(character);
    const leg = character.userData.legs[0], legMesh = leg.children[0];
    instanceStaticGeometry(root);
    const batch = root.children.find(item => item.isInstancedMesh);
    const safeBeforeLoad = [...meshes[0], ...meshes[1], ...lifecycleMeshes].every(mesh => mesh.parent)
      && legMesh.parent === leg && batch?.count === 3;
    meshes[0][0].geometry = new THREE.SphereGeometry(0.4);
    instanceStaticGeometry(root);
    const safeAfterLoad = meshes[0][0].parent === pending
      && root.children.filter(item => item.isInstancedMesh).length === 1;
    disposeGroup(root);
    return { safeBeforeLoad, safeAfterLoad };
  });
  expect(result.safeBeforeLoad && result.safeAfterLoad).toBe(true);
});
