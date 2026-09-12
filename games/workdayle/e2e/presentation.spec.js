import { test, expect } from '@playwright/test';

test('all four JPGs become cropped facial materials on lit volumetric head meshes', async ({ page }) => {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.goto('/');
  const portraits = await page.evaluate(async () => {
    const { createBossFace, resolveBossPhoto } = await import('/src/boss-faces.js');
    const { BOSSES } = await import('/src/bosses.js');
    const results = [];
    for (const boss of BOSSES) {
      const face = createBossFace(boss);
      const status = await face.ready;
      const { width, height } = face.mesh.geometry.userData;
      results.push({
        status, crop: face.group.userData.crop, width, height,
        source: face.group.userData.photoUrl,
        expected: `/assets/bosses/${boss.id}.jpg`,
        resolved: resolveBossPhoto(boss) === face.group.userData.photoUrl,
        mesh: face.mesh.isMesh, children: face.group.children.length,
        lit: face.mesh.material.isMeshStandardMaterial && face.mesh.receiveShadow,
        depth: face.mesh.geometry.boundingBox.max.z - face.mesh.geometry.boundingBox.min.z,
        atlas: face.mesh.material.map?.name,
      });
      face.dispose();
      face.dispose();
    }
    return results;
  });
  for (const face of portraits) {
    expect(face.status).toBe('ready');
    expect(face.resolved).toBe(true);
    expect(face.source).toContain(face.expected);
    expect(face.width / face.height).toBeCloseTo(face.crop.width / face.crop.height, 6);
    expect(face.mesh && face.lit).toBe(true);
    expect(face.children).toBe(1);
    expect(face.depth).toBeGreaterThan(0.45);
    expect(face.atlas).toBe('cropped-face-and-scalp-atlas');
  }
});

test('missing JPGs, decode errors and interrupted loads keep safe disposable heads', async ({ page }) => {
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const { createBossFace } = await import('/src/boss-faces.js');
    const { Texture } = await import('/node_modules/three/build/three.module.js');
    const boss = { id: 'jill_guldhav' }, assets = { '../assets/bosses/jill_guldhav.jpg': 'fixture.jpg' };
    const missing = createBossFace(boss, { assets: {}, loader: { load() { throw new Error('Missing assets must not issue requests.'); } } });
    const result = { missing: await missing.ready, placeholder: missing.mesh.material.color.getHexString() };
    missing.dispose();
    const failed = createBossFace(boss, { assets, loader: { load(url, onLoad, progress, onError) {
      queueMicrotask(() => onError(new Error('fixture decode error')));
      return new Texture();
    } } });
    result.failed = await failed.ready;
    result.failedMesh = failed.mesh.isMesh && failed.mesh.geometry.boundingBox.max.z > 0;
    failed.dispose();
    let completeLoad;
    const pending = createBossFace(boss, { assets, loader: { load(url, onLoad) {
      completeLoad = onLoad;
      return new Texture();
    } } });
    pending.dispose();
    const late = new Texture();
    let released = false;
    late.addEventListener('dispose', () => { released = true; });
    completeLoad(late);
    result.cancelled = await pending.ready;
    result.lateTextureReleased = released;
    result.remainingChildren = pending.group.children.length;
    return result;
  });
  expect(results).toEqual({ missing: 'missing', placeholder: 'da62ac', failed: 'error', failedMesh: true, cancelled: 'disposed', lateTextureReleased: true, remainingChildren: 0 });
  expect(warnings.some(text => text.includes('missing /assets/bosses/jill_guldhav.jpg'))).toBe(true);
  expect(warnings.some(text => text.includes('could not load /assets/bosses/jill_guldhav.jpg'))).toBe(true);
});

test('photo heads stay attached and face the close-range gameplay camera through every attack', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#begin').click();
  for (let floor = 0; floor < 4; floor++) {
    const rendered = await page.evaluate(async floor => {
      const game = window.__workdayle;
      game.state.floor = floor;
      game.startCombat();
      const boss = game.arena.bossMesh, surface = boss.userData.headSurface;
      await surface.ready;
      game.setMode('combat');
      const c = game.combat, head = boss.userData.head;
      const center = surface.mesh.position.clone(), joint = center.clone(), forward = center.clone();
      const originalGeometry = surface.mesh.geometry.uuid, originalTexture = surface.mesh.material.map.uuid;
      let attached = true, visible = true;
      game.pitch = 0.45;
      c.player.z = c.boss.z + 0.85;
      game.updateCombat(0);
      game.scene.updateMatrixWorld(true);
      const closeFace = center.set(0, 0, 0.24);
      surface.mesh.localToWorld(closeFace);
      closeFace.project(game.camera);
      const closeVisible = Math.abs(closeFace.x) < 1 && Math.abs(closeFace.y) < 1 && closeFace.z > -1 && closeFace.z < 1;
      for (const attack of c.definition.attacks) {
        c.attack = { ...attack };
        for (const phase of ['telegraph', 'attack', 'recover']) {
          c.boss.phase = phase;
          for (const [x, z] of [[0, 0], [1.8, -1.8], [-1.8, -1.8]]) {
            c.player.x = x;
            c.player.z = z;
            c.player.yaw = Math.atan2(-(c.boss.x - x), -(c.boss.z - z));
            game.updateCombat(0);
            boss.updateMatrixWorld(true);
            surface.mesh.getWorldPosition(center);
            head.getWorldPosition(joint);
            attached &&= center.distanceTo(joint) < 1e-6 && surface.group.parent === head;
            forward.set(0, 0, 1).transformDirection(surface.mesh.matrixWorld);
            const towardPlayer = joint.set(x, center.y, z).sub(center).normalize();
            visible &&= forward.dot(towardPlayer) > 0.9;
          }
        }
      }
      c.attack = c.definition.attacks[0];
      c.boss.phase = 'approach';
      c.player.x = 0;
      c.player.z = 0;
      c.player.yaw = 0;
      game.pitch = 0.3;
      game.updateCombat(0);
      game.pauseFrom = 'combat';
      game.setMode('paused');
      game.ui.update(game.state, 'combat', 0);
      const photoPlanes = [];
      head.traverse(object => { if (object.isSprite || object.geometry?.type === 'PlaneGeometry' || object.geometry?.type === 'BoxGeometry') photoPlanes.push(object.name); });
      return {
        id: c.definition.id, attached, visible, closeVisible, photoPlanes,
        unchanged: surface.mesh.geometry.uuid === originalGeometry && surface.mesh.material.map.uuid === originalTexture,
        status: surface.group.userData.photoState,
      };
    }, floor);
    expect(rendered.status).toBe('ready');
    expect(rendered.attached && rendered.visible && rendered.closeVisible && rendered.unchanged).toBe(true);
    expect(rendered.photoPlanes).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${rendered.id}-close.png`) });
    if (floor === 0) {
      await page.evaluate(() => { window.__workdayle.arena.bossMesh.userData.head.rotation.y = 0.65; });
      await page.screenshot({ path: info.outputPath('jill-three-quarter.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('a JPG network failure leaves the real boss fight playable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/bosses/jill_guldhav.jpg*', route =>
    route.request().resourceType() === 'image' ? route.abort() : route.continue());
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(() => window.__workdayle.startCombat());
  await page.waitForFunction(() => window.__workdayle.mode === 'combat');
  const result = await page.evaluate(() => {
    const game = window.__workdayle;
    const surface = game.arena.bossMesh.userData.headSurface;
    game.updateCombat(0.7, { x: 0, z: -1, turn: 0 });
    const before = game.combat.boss.hp;
    game.combat.punch();
    game.combat.dodge(1);
    return { status: surface.group.userData.photoState, placeholder: surface.group.userData.placeholder, hit: game.combat.boss.hp < before, dodged: game.combat.dodgeCooldown > 0, mode: game.mode };
  });
  expect(result).toEqual({ status: 'error', placeholder: true, hit: true, dodged: true, mode: 'combat' });
  expect(errors).toEqual([]);
});

test('boss signature render fixtures show distinct effects and readable safety HUD', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#begin').click();
  const fixtures = [
    { floor: 0, attack: 'candy', stage: 'attack', hp: 120 },
    { floor: 1, attack: 'holes', stage: 'attack', hp: 180 },
    { floor: 2, attack: 'newsletters', stage: 'attack', hp: 240 },
    { floor: 3, attack: 'aura', stage: 'telegraph', hp: 70 },
    { floor: 3, attack: 'uppercut', stage: 'attack', hp: 70 },
  ];
  for (const fixture of fixtures) {
    // Explicit presentation fixtures; the career test wins through normal combat inputs.
    const rendered = await page.evaluate(async ({ floor, attack, stage, hp }) => {
      const game = window.__workdayle;
      game.state.floor = floor;
      game.startCombat();
      await game.arena.bossMesh.userData.headSurface.ready;
      game.setMode('combat');
      const combat = game.combat;
      combat.boss.hp = hp;
      combat.syncPhase();
      combat.attack = { ...combat.definition.attacks.find(item => item.id === attack) };
      combat.boss.phase = stage;
      combat.boss.time = stage === 'telegraph' ? 1 : 0;
      if (stage === 'attack') combat.releaseAttack();
      if (['candy', 'newsletters'].includes(attack)) combat.update(0.3, {});
      game.updateCombat(0);
      game.ui.update(game.state, 'combat', 0);
      game.renderer.render(game.scene, game.camera);
      const result = {
        effects: game.effects.projectilePool.filter(slot => slot.group.visible).length,
        holes: game.effects.hazardPool.filter(slot => slot.group.visible).length,
        aura: game.effects.bossAura.visible,
        sparks: game.effects.bossAuraSparks.count,
        uppercut: game.effects.cmon.visible,
      };
      game.pauseFrom = 'combat';
      game.setMode('paused');
      game.ui.update(game.state, 'combat', 0);
      game.ui.radar(combat);
      return result;
    }, fixture);
    if (fixture.attack === 'holes') {
      expect(rendered.holes).toBeGreaterThan(0);
      await expect(page.locator('#hazard-warning')).toContainText('instantly lethal');
    } else if (fixture.attack === 'aura') {
      expect(rendered.aura).toBe(true);
      expect(rendered.sparks).toBeGreaterThan(40);
    } else if (fixture.attack === 'uppercut') {
      expect(rendered.uppercut).toBe(true);
      await expect(page.locator('#attack-callout')).toHaveText('CMON!!');
    } else expect(rendered.effects).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath(`${fixture.attack}.png`) });
    if (fixture.attack === 'holes') {
      await page.evaluate(() => {
        const game = window.__workdayle;
        game.setMode('combat');
        game.pitch = -0.25;
        game.combat.update(1.8, {});
        game.updateCombat(0);
        game.setMode('paused');
        game.ui.update(game.state, 'combat', 0);
        game.ui.radar(game.combat);
      });
      await expect(page.locator('#hazard-warning')).toContainText('OPEN HOLES');
      await page.screenshot({ path: info.outputPath('open-holes.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('cinematic reaches results automatically and keeps controls in narrow viewports', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(async () => {
    const { makeResult } = await import('/src/run.js');
    const game = window.__workdayle;
    Object.assign(game.state, { rank: 4, bossesDefeated: 4, complete: true });
    game.state.result = makeResult({ time: 864, rep: 960, tasks: 48, bosses: 4 });
    game.showEnding();
    game.ending.update(12);
  });
  await page.screenshot({ path: info.outputPath('cinematic.png') });
  await page.evaluate(() => window.__workdayle.ending.update(40));
  await expect(page.locator('#parade-layer')).toBeVisible();
  await page.evaluate(() => window.__workdayle.parade.update(25));
  await expect(page.locator('.final-results')).toBeVisible();
  await expect(page.locator('.final-time strong')).toHaveText('14:24');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('results-narrow.png') });
  expect(await page.locator('.final-results').evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await page.locator('#ending-restart').click();
  await expect(page.locator('#reset')).toBeVisible();
  await page.locator('#keep').click();
  await expect(page.locator('.final-results')).toBeVisible();
});
