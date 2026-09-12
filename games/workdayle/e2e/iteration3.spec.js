import { test, expect } from '@playwright/test';

async function interact(page, id) {
  await page.evaluate(async id => {
    const { walkTo } = await import('/test-support/walk-bot.js');
    walkTo(window.__workdayle, id);
  }, id);
  await page.keyboard.press('KeyE');
}

test('closer office camera preserves navigation framing and first-person combat', async ({ page }) => {
  await page.goto('/');
  await page.locator('#begin').click();
  const result = await page.evaluate(() => {
    const game = window.__workdayle;
    const length = game.cameraOffset.length();
    const points = [{ x: 0, z: 16 }, { x: 0, z: -10 }, { x: 20, z: -12 }, { x: 8, z: 4 }];
    const visible = points.every(point => {
      Object.assign(game.state.position, point);
      game.follow.set(point.x, 0, point.z);
      game.updateOffice(0);
      game.camera.updateMatrixWorld();
      const foot = game.playerMesh.position.clone().project(game.camera);
      const head = game.playerMesh.position.clone();
      head.y += 1.8;
      head.project(game.camera);
      return Math.abs(foot.x) < 0.8 && Math.abs(foot.y) < 0.8 && Math.abs(head.y) < 0.8;
    });
    game.startCombat();
    game.setMode('combat');
    game.updateCombat(0);
    return { length, visible, fov: game.camera.fov, eyeHeight: game.camera.position.y };
  });
  expect(result.length).toBeLessThan(17);
  expect(result.visible).toBe(true);
  expect(result.fov).toBe(70);
  expect(result.eyeHeight).toBe(1.6);
});

test('bathrooms are separate reachable rooms with explicit toilet use and safe saves', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(() => { window.__workdayle.state.bathroom = 75; });
  await interact(page, 'bathroom');
  expect(await page.evaluate(() => ({
    name: window.__workdayle.office.group.name,
    need: window.__workdayle.state.bathroom,
    exteriorVisible: window.__workdayle.bathroomReturn.office.group.visible,
  }))).toEqual({ name: 'employee-bathroom', need: 75, exteriorVisible: false });
  await interact(page, 'toilet');
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBe(0);
  await interact(page, 'sink');
  await page.waitForTimeout(600);
  await page.screenshot({ path: info.outputPath('bathroom.png') });
  await page.evaluate(() => window.__workdayle.save());
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('workdayle-save-v1')));
  expect(saved.position.x).toBeGreaterThan(19);
  await interact(page, 'bathroom-exit');
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('office-floor-0');
  await interact(page, 'bathroom');
  await page.reload();
  await page.locator('#begin').click();
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('office-floor-0');
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBe(0);
  expect(errors).toEqual([]);
});

test('crawl leads to an animated pausable CEO parade and keeps the final time frozen', async ({ page }, info) => {
  const errors = [], warnings = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(async () => {
    const { makeResult } = await import('/src/run.js');
    const game = window.__workdayle;
    Object.assign(game.state, { rank: 4, bossesDefeated: 4, complete: true });
    game.state.result = makeResult({ time: 864, rep: 960, tasks: 48, bosses: 4 });
    game.showEnding();
    game.ending.update(40);
  });
  await expect(page.locator('#parade-layer')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const track = window.__workdayle.audio.ceoTrack;
    return track && !track.paused && track.readyState >= 2 && track.currentTime > 0;
  })).toBe(true);
  expect(await page.evaluate(() => decodeURIComponent(window.__workdayle.audio.ceoTrack.currentSrc))).toContain('Vitas - The 7th Element.mp3');
  const before = await page.evaluate(() => {
    const game = window.__workdayle;
    game.parade.update(5);
    return { z: game.playerMesh.position.z, count: game.parade.confetti.geometry.drawRange.count, hasTrack: Boolean(game.audio.ceoTrack) };
  });
  await page.locator('#parade-pause').click();
  expect(await page.evaluate(() => window.__workdayle.audio.ceoTrack.paused)).toBe(true);
  const paused = await page.evaluate(() => window.__workdayle.parade.elapsed);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__workdayle.parade.elapsed)).toBe(paused);
  await page.locator('#resume').click();
  const after = await page.evaluate(() => {
    const game = window.__workdayle;
    game.parade.update(12);
    return {
      z: game.playerMesh.position.z, count: game.parade.confetti.geometry.drawRange.count,
      employees: game.parade.employees.length,
      poses: [...new Set(game.parade.employees.map(n => n.pose))],
      knees: game.parade.employees.some(n => n.legs[0].rotation.x < -1),
    };
  });
  expect(after.z).toBeLessThan(before.z - 20);
  expect(after.count).toBeGreaterThan(before.count * 3);
  expect(after.employees).toBeGreaterThanOrEqual(20);
  expect(after.poses).toHaveLength(5);
  expect(after.knees).toBe(true);
  await page.screenshot({ path: info.outputPath('ceo-parade.png') });
  await page.locator('#skip-parade').click();
  await expect(page.locator('.final-results')).toBeVisible();
  await expect(page.locator('#ending-title')).toContainText('YOU ARE NOW THE CEO');
  expect(await page.evaluate(() => window.__workdayle.state.result.time)).toBe(864);
  expect(await page.evaluate(() => window.__workdayle.audio.ceoTrack ?? null)).toBe(null);
  if (!before.hasTrack) expect(warnings.some(message => message.includes('no supplied song'))).toBe(true);
  await page.locator('#ending-office').click();
  expect(await page.evaluate(() => window.__workdayle.mode)).toBe('office');
  expect(await page.evaluate(() => window.__workdayle.state.floor)).toBe(4);
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('ceo-palatial-open-office');
  expect(errors).toEqual([]);
});

test('supplied CEO track selection respects mute, pause, fades and cleanup', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { GameAudio } = await import('/src/audio.js');
    const NativeAudio = window.Audio;
    const notices = [];
    class MediaStub extends EventTarget {
      constructor(url) { super(); this.url = url; this.plays = 0; this.pauses = 0; }
      play() { this.plays++; return Promise.resolve(); }
      pause() { this.pauses++; }
      removeAttribute(name) { if (name === 'src') this.url = null; }
      load() { this.loaded = true; }
    }
    window.Audio = MediaStub;
    try {
      const audio = new GameAudio();
      audio.muted = true;
      audio.startCEO(line => notices.push(line), {
        '../assets/sounds/other.wav': 'other.wav',
        '../assets/music/supplied-song.ogg': 'provided-song.ogg',
      });

      const track = audio.ceoTrack;
      const chosen = track.url;
      const startMuted = track.muted;
      audio.updateCEO(3, 24);
      const full = track.volume;
      audio.updateCEO(23, 24);
      const fading = track.volume;
      audio.pauseCEO();
      audio.muted = false;
      audio.resumeCEO();
      audio.stopCEO();
      return { chosen, startMuted, muted: track.muted, full, fading, plays: track.plays, pauses: track.pauses, released: track.url === null && track.loaded && audio.ceoTrack === null, notices };
    } finally { window.Audio = NativeAudio; }
  });
  expect(result).toEqual({
    chosen: 'provided-song.ogg', startMuted: true, muted: false,
    full: 0.55, fading: 0.55 / 2.5, plays: 2, pauses: 2, released: true, notices: [],
  });
});

test('CEO can explore every luxury reward, operate the panel, use the private WC and resume', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(async () => {
    const { makeResult } = await import('/src/run.js');
    const game = window.__workdayle;
    Object.assign(game.state, { rank: 4, bossesDefeated: 4, complete: true });
    game.state.result = makeResult({ time: 864, rep: 960, tasks: 48, bosses: 4 });
    game.state.changeFloor(4);
    game.loadFloor();
    game.roomChanged();
  });
  const stations = await page.evaluate(() => window.__workdayle.office.interactables
    .filter(item => item.kind === 'ceo' && item.id !== 'buttons').map(item => item.id));
  for (const id of stations) {
    if (id === 'jacuzzi') await page.evaluate(() => { window.__workdayle.state.energy = 30; });
    await interact(page, id);
    await expect(page.locator('#toast')).toBeVisible();
    if (id === 'jacuzzi') {
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workdayle-save-v1')).energy)).toBe(100);
    }
    if (id === 'ferrari') {
      await page.waitForTimeout(650);
      await page.screenshot({ path: info.outputPath('ferrari-gameplay.png') });
    }
  }
  await interact(page, 'buttons');
  const buttons = page.locator('[data-ceo-button]');
  expect(await buttons.count()).toBeGreaterThanOrEqual(16);
  for (let i = 0; i < await buttons.count(); i++) {
    await buttons.nth(i).click();
    expect((await page.locator('.ceo-panel-feedback').innerText()).length).toBeGreaterThan(20);
  }
  await page.locator('[data-ceo-button="print-money"]').click();
  expect(await page.evaluate(() => window.__workdayle.office.group.getObjectByName('visible-executive-budget').visible)).toBe(true);
  await page.locator('#leave').click();
  await interact(page, 'bathroom');
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('ceo-private-bathroom');
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBeGreaterThan(0);
  await interact(page, 'toilet');
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBe(0);
  await interact(page, 'sink');
  await page.waitForTimeout(600);
  await page.screenshot({ path: info.outputPath('private-bathroom.png') });
  await interact(page, 'bathroom-exit');
  await interact(page, 'elevator');
  await page.locator('[data-floor="0"]').click();
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('office-floor-0');
  await interact(page, 'elevator');
  await page.locator('[data-floor="4"]').click();
  await interact(page, 'jacuzzi');
  await page.evaluate(() => window.__workdayle.save());
  await page.reload();
  await page.locator('#begin').click();
  expect(await page.evaluate(() => window.__workdayle.office.group.name)).toBe('ceo-palatial-open-office');
  expect(await page.evaluate(() => window.__workdayle.state.result.time)).toBe(864);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyS');
  expect(errors).toEqual([]);
});
