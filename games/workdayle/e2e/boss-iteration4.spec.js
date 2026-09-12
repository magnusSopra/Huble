import { test, expect } from '@playwright/test';

const shell = async page => {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html', body: '<html><body style="margin:0;background:#17241f"></body></html>',
  }));
  await page.goto('/');
};

test('slow real JPGs never reveal a purple loading head; cancelled replacements share a durable atlas', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const requests = [];
  await page.route('**/assets/bosses/*.jpg*', async route => {
    if (route.request().resourceType() === 'image') {
      requests.push(route.request().url());
      await gate;
    }
    await route.continue();
  });
  await shell(page);
  const loading = await page.evaluate(async () => {
    const { createBossFace } = await import('/src/boss-faces.js');
    const { BOSSES } = await import('/src/bosses.js');
    window.faces = BOSSES.map(boss => ({ old: createBossFace(boss), next: createBossFace(boss), boss }));
    return window.faces.map(({ old, next }) => {
      old.dispose();
      return { state: next.group.userData.photoState, visible: next.mesh.visible, map: next.mesh.material.map };
    });
  });
  expect(loading).toEqual(Array(4).fill({ state: 'loading', visible: false, map: null }));
  await expect.poll(() => requests.length).toBe(4);
  release();
  const result = await page.evaluate(async () => {
    const { createBossFace } = await import('/src/boss-faces.js');
    const results = [];
    for (const { old, next, boss } of window.faces) {
      const status = await next.ready;
      const pixels = next.mesh.material.map.image;
      const originalMap = next.mesh.material.map;
      let released = 0;
      originalMap.addEventListener('dispose', () => released++);
      const expectedPath = `/assets/bosses/${boss.id}.jpg`;
      const variations = new Set();
      const ctx = pixels.getContext('2d');
      for (let y = 100; y < 400; y += 25) {
        variations.add([...ctx.getImageData(512, y, 1, 1).data].join(','));
      }
      next.dispose();
      const identities = new Set([originalMap.uuid]);
      let sameAtlas = true, allReady = true;
      for (let retry = 0; retry < 6; retry++) {
        const replacement = createBossFace(boss);
        allReady &&= await replacement.ready === 'ready';
        identities.add(replacement.mesh.material.map.uuid);
        sameAtlas &&= replacement.mesh.material.map.image === pixels;
        replacement.dispose();
      }
      results.push({
        status, cancelled: await old.ready, expectedPath,
        source: next.group.userData.photoUrl, variations: variations.size,
        allReady, sameAtlas, textures: identities.size, released,
      });
    }
    return results;
  });
  for (const face of result) {
    expect(face.status).toBe('ready');
    expect(face.cancelled).toBe('disposed');
    expect(face.source).toContain(face.expectedPath);
    expect(face.variations).toBeGreaterThan(10);
    expect(face.allReady && face.sameAtlas).toBe(true);
    expect(face.textures).toBe(7);
    expect(face.released).toBe(1);
  }
  expect(requests).toHaveLength(4);
});

test('scene disposal cannot kill shared pending portraits or reattach late heads', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/bosses/kjell_rusti.jpg*', async route => {
    if (route.request().resourceType() === 'image') await gate;
    await route.continue();
  });
  await shell(page);
  const pending = await page.evaluate(async () => {
    const { createCharacter, disposeGroup } = await import('/src/world.js');
    const { BOSSES } = await import('/src/bosses.js');
    const old = createCharacter(BOSSES[3].color, true, BOSSES[3]);
    const next = createCharacter(BOSSES[3].color, true, BOSSES[3]);
    window.lifecycle = { old, next, surface: old.userData.headSurface, disposeGroup };
    disposeGroup(old);
    return { old: await old.userData.headSurface.ready, next: next.userData.headSurface.group.userData.photoState };
  });
  expect(pending).toEqual({ old: 'disposed', next: 'loading' });
  release();
  const result = await page.evaluate(async () => {
    const { old, next, surface, disposeGroup } = window.lifecycle;
    const nextSurface = next.userData.headSurface;
    await nextSurface.ready;
    let disposed = 0;
    nextSurface.mesh.material.map.addEventListener('dispose', () => disposed++);
    const data = {
      oldChildren: old.children.length, oldMap: surface.mesh.material.map,
      oldState: surface.group.userData.photoState, nextState: nextSurface.group.userData.photoState,
      attached: nextSurface.group.parent === next.userData.head,
    };
    disposeGroup(next);
    nextSurface.dispose();
    return { ...data, disposed };
  });
  expect(result).toEqual({ oldChildren: 0, oldMap: null, oldState: 'disposed', nextState: 'ready', attached: true, disposed: 1 });
});

test('network failures, decode failures and timeouts are explicit, playable and retryable', async ({ page }) => {
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  let attempts = 0;
  await page.route('**/assets/bosses/jill_guldhav.jpg*', route => {
    if (route.request().resourceType() === 'image' && ++attempts === 1) return route.abort();
    return route.continue();
  });
  await shell(page);
  const result = await page.evaluate(async () => {
    const { createBossFace } = await import('/src/boss-faces.js');
    const { Combat } = await import('/src/combat.js');
    const { BOSSES } = await import('/src/bosses.js');
    const { Texture } = await import('/node_modules/three/build/three.module.js');
    const missing = createBossFace(BOSSES[0], { assets: {} });
    const missingStatus = await missing.ready;
    missing.dispose();
    const failed = createBossFace(BOSSES[0]);
    const failure = await failed.ready;
    const playable = new Combat(BOSSES[0]);
    playable.player.z = 0;
    playable.punch();
    playable.dodge();
    const fallback = failed.mesh.visible && failed.group.userData.placeholder;
    const pink = failed.mesh.material.color.getHexString();
    failed.dispose();
    const retry = createBossFace(BOSSES[0]);
    const retryStatus = await retry.ready;
    retry.dispose();
    const assets = { '../assets/bosses/jill_guldhav.jpg': 'invalid-photo.jpg' };
    let late, source;
    const timedOut = createBossFace(BOSSES[0], { assets, timeout: 30, loader: { load(url, loaded) {
      late = loaded;
      source = new Texture();
      return source;
    } } });
    let disposals = 0;
    source.addEventListener('dispose', () => disposals++);
    const timeoutStatus = await timedOut.ready;
    late(source);
    const timeoutError = timedOut.group.userData.photoError;
    timedOut.dispose();
    const malformed = createBossFace(BOSSES[0], { assets, loader: { load(url, loaded) {
      const texture = new Texture({ width: 0, height: 0 });
      queueMicrotask(() => loaded(texture));
      return texture;
    } } });
    const decodeStatus = await malformed.ready;
    malformed.dispose();
    return {
      missingStatus, failure, fallback, pink, retryStatus, timeoutStatus, timeoutError, disposals, decodeStatus,
      playable: playable.boss.hp < BOSSES[0].hp && playable.dodgeCooldown > 0 && !playable.finished,
    };
  });
  expect(result).toMatchObject({
    missingStatus: 'missing', failure: 'error', fallback: true, pink: 'da62ac', retryStatus: 'ready',
    timeoutStatus: 'error', disposals: 1, decodeStatus: 'error', playable: true,
  });
  expect(result.timeoutError).toContain('timed out');
  expect(warnings.filter(text => text.includes('/assets/bosses/jill_guldhav.jpg')).length).toBe(4);
});

test('the photographed Kjell uppercut has a rendered crouch, upward contact and recovery with pooled effects', async ({ page }, info) => {
  await shell(page);
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createCharacter, disposeGroup } = await import('/src/world.js');
    const { Combat } = await import('/src/combat.js');
    const { CombatEffects } = await import('/src/combat-effects.js');
    const { animateBoss } = await import('/src/boss-animation.js');
    const { BOSSES } = await import('/src/bosses.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1000, 700);
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#24382f');
    scene.add(new THREE.HemisphereLight('#ffffff', '#809480', 3));
    const key = new THREE.DirectionalLight('#fff0d0', 3);
    key.position.set(3, 5, 4);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(45, 1000 / 700, 0.1, 100);
    camera.position.set(3, 2.2, 6);
    camera.lookAt(0, 1.5, 0);
    const mesh = createCharacter(BOSSES[3].color, true, BOSSES[3]);
    scene.add(mesh);
    await mesh.userData.headSurface.ready;
    const combat = new Combat(BOSSES[3]);
    combat.attack = { ...BOSSES[3].attacks.find(attack => attack.kind === 'uppercut') };
    combat.boss.x = combat.boss.z = 0;
    combat.phaseIndex = 3;
    const effects = new CombatEffects(scene);
    window.renderBoss = (phase, time) => {
      combat.boss.phase = phase;
      combat.boss.time = time;
      animateBoss(mesh, combat, 0);
      effects.update(combat, 1 / 60);
      renderer.render(scene, camera);
      const fist = mesh.userData.arms[1].localToWorld(new THREE.Vector3(0, -0.43, 0.09));
      const forward = new THREE.Vector3(0, 0, 1).transformDirection(mesh.userData.head.matrixWorld);
      return {
        y: mesh.userData.body.position.y, fistY: fist.y, arm: mesh.userData.arms[1].rotation.x,
        aim: forward.z, photo: mesh.userData.headSurface.group.userData.photoState,
        texture: mesh.userData.headSurface.mesh.material.map.uuid,
        cmon: effects.cmon.visible, sparks: effects.bossAuraSparks.count,
        resources: [effects.materials.size, effects.geometries.size, effects.textures.size],
      };
    };
    window.closeBoss = () => { effects.dispose(); disposeGroup(mesh); renderer.dispose(); };
  });
  const frames = [];
  for (const [phase, time] of [['telegraph', 1.55], ['attack', 0.14], ['attack', 0.3], ['recover', 1.8]]) {
    frames.push(await page.evaluate(([phase, time]) => window.renderBoss(phase, time), [phase, time]));
    await page.screenshot({ path: info.outputPath(`kjell-${phase}-${time}.png`) });
  }
  expect(frames[0].y).toBeLessThan(-0.25);
  expect(frames[1].fistY - frames[0].fistY).toBeGreaterThan(0.7);
  expect(frames[2].arm).toBeLessThan(-2.8);
  expect(frames[3].y).toBe(0);
  expect(frames[3].cmon).toBe(false);
  for (const frame of frames) {
    expect(frame.photo).toBe('ready');
    expect(frame.aim).toBeCloseTo(1, 5);
    expect(frame.texture).toBe(frames[0].texture);
    expect(frame.resources).toEqual(frames[0].resources);
    expect(frame.sparks).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.closeBoss());
});

test('browser controls can react after an earlier dodge and through delayed volleys without immunity spam', async ({ page }) => {
  await shell(page);
  await page.evaluate(async () => {
    const { Combat } = await import('/src/combat.js');
    const { BOSSES } = await import('/src/bosses.js');
    const combat = new Combat(BOSSES[1]);
    combat.player.x = combat.boss.x = 7;
    combat.player.z = 0;
    combat.boss.z = -1.8;
    window.combat = combat;
    window.addEventListener('keydown', event => {
      if (event.repeat) return;
      if (event.code === 'Space') combat.dodge(1);
      if (event.code === 'KeyF') combat.punch();
    });
    window.addEventListener('mousedown', event => { if (event.button === 2) combat.dodge(1); });
    window.startVolley = () => {
      combat.attack = { ...BOSSES[1].attacks.find(attack => attack.id === 'numbers') };
      combat.boss.phase = 'attack';
      combat.boss.time = 0;
      combat.releaseAttack();
    };
  });
  await page.keyboard.press('Space');
  await page.evaluate(() => { window.combat.update(0.35); window.startVolley(); });
  await page.keyboard.press('KeyF');
  expect(await page.evaluate(() => ({
    ready: window.combat.canDodge, cooldown: window.combat.dodgeCooldown > 0, punching: window.combat.punchAnimation > 0,
  }))).toEqual({ ready: true, cooldown: true, punching: true });
  await page.mouse.click(10, 10, { button: 'right' });
  await page.evaluate(() => window.combat.update(0.6));
  expect(await page.evaluate(() => window.combat.player.hp)).toBe(100);
  await page.keyboard.press('Space');
  await page.evaluate(() => window.combat.update(0.2));
  expect(await page.evaluate(() => window.combat.player.hp)).toBe(100);
});
