import { test, expect } from '@playwright/test';

test.setTimeout(60000);

async function boot(page) {
  await page.goto('/');
  await page.locator('#begin').click();
}

async function interact(page, id) {
  await page.evaluate(async id => {
    const { walkTo } = await import('/test-support/walk-bot.js');
    walkTo(window.__workdayle, id);
  }, id);
  await page.keyboard.press('KeyE');
}

test('stats toggle reclaims viewport and does not trap dialog keyboard focus', async ({ page }) => {
  await boot(page);
  const before = await page.locator('#game').boundingBox();
  await page.locator('#stats-toggle').click();
  await expect(page.locator('#sidebar')).toBeHidden();
  await expect(page.locator('#stats-toggle')).toHaveAttribute('aria-expanded', 'false');
  const after = await page.locator('#game').boundingBox();
  expect(after.width).toBe(before.width + before.x);
  expect(after.x).toBe(0);
  await page.keyboard.press('KeyM');
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.locator('#pause').click();
  await page.keyboard.press('Tab');
  await expect(page.locator('#restart')).toBeFocused();
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.locator('#resume').click();
  await interact(page, 'elevator');
  await page.keyboard.press('F2');
  await page.locator('#cancel-test').click();
  await expect(page.locator('[data-floor="1"]')).toBeDisabled();
  await page.locator('#leave').click();
  await page.setViewportSize({ width: 650, height: 850 });
  await page.locator('#stats-toggle').click();
  expect((await page.locator('#game').boundingBox()).width).toBe(650);
});

test('test mode exposes all bosses without touching normal save or personal best', async ({ page }) => {
  await boot(page);
  let original = await page.evaluate(() => {
    const game = window.__workdayle;
    game.state.rep[0] = 37;
    game.state.collectibles.add('collectible:0:fixture');
    game.save();
    localStorage.setItem('workdayle-best-v2', JSON.stringify({ version: 2, time: 432 }));
    return { save: localStorage.getItem('workdayle-save-v1'), best: localStorage.getItem('workdayle-best-v2') };
  });
  await page.locator('#test-menu').click();
  original = await page.evaluate(() => ({
    save: localStorage.getItem('workdayle-save-v1'), best: localStorage.getItem('workdayle-best-v2'),
  }));
  await page.locator('#enable-test').click();
  await expect(page.locator('#test-mode-badge')).toBeVisible();
  for (let floor = 0; floor < 4; floor++) {
    await page.keyboard.press('F2');
    await page.locator(`[data-test-boss="${floor}"]`).click();
    await page.waitForFunction(() => window.__workdayle.mode === 'combat');
    expect(await page.evaluate(() => window.__workdayle.state.bossReady)).toBe(true);
    expect(await page.evaluate(() => window.__workdayle.arena.bossMesh.userData.headSurface.group.userData.photoState)).toBe('ready');
    await page.evaluate(() => window.__workdayle.save());
  }
  await page.evaluate(() => window.__workdayle.combat.finish('win'));
  await page.locator('#skip-cinematic').click();
  await expect(page.locator('.corporate-crawl')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('workdayle-best-v2'))).toBe(original.best);
  expect(await page.evaluate(() => localStorage.getItem('workdayle-save-v1'))).toBe(original.save);
  await page.keyboard.press('F2');
  await page.locator('#test-reset').click();
  await page.keyboard.press('F2');
  await page.locator('#disable-test').click();
  await expect(page.locator('#test-mode-badge')).toBeHidden();
  expect(await page.evaluate(() => window.__workdayle.state.rep[0])).toBe(37);
  expect(await page.evaluate(() => ({
    save: localStorage.getItem('workdayle-save-v1'), best: localStorage.getItem('workdayle-best-v2'),
  }))).toEqual(original);
});

test('emergency gives twenty real seconds, pauses, succeeds at the bathroom door and persists HR failure', async ({ page }, info) => {
  await boot(page);
  await page.evaluate(() => { window.__workdayle.state.bathroom = 100; window.__workdayle.life.update(0); });
  await expect(page.locator('#bathroom-emergency')).toBeVisible();
  expect(await page.evaluate(() => window.__workdayle.state.officeLife.emergency)).toBeGreaterThan(18);
  await page.locator('#pause').click();
  const remaining = await page.evaluate(() => window.__workdayle.state.officeLife.emergency);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__workdayle.state.officeLife.emergency)).toBe(remaining);
  await page.locator('#resume').click();
  await interact(page, 'bathroom');
  await expect(page.locator('#bathroom-vignette')).toBeHidden();
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBe(0);
  await interact(page, 'bathroom-exit');
  await page.evaluate(() => {
    const game = window.__workdayle;
    game.state.bathroom = 100;
    game.life.update(0);
    game.life.update(20);
  });
  await expect(page.locator('#modal-title')).toHaveText('GAME OVER');
  await expect(page.locator('#modal')).toContainText('HR HAS BEEN NOTIFIED');
  await page.screenshot({ path: info.outputPath('hr-game-over.png') });
  await page.reload();
  await page.locator('#begin').click();
  await expect(page.locator('#modal-title')).toHaveText('GAME OVER');
  await page.locator('#restart-career').click();
  expect(await page.evaluate(() => window.__workdayle.state.bathroom)).toBe(0);
  await expect(page.locator('#bathroom-emergency')).toBeHidden();
});

test('recruitment choices have distinct consequences and a CV warning leads to an AI workstation task', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__workdayle.life.present('recruitment'));
  await page.locator('#reject-offer').click();
  expect(await page.evaluate(() => window.__workdayle.state.rep[0])).toBe(15);
  await page.evaluate(() => window.__workdayle.life.present('cv-warning'));
  await page.locator('#cv-acknowledge').click();
  await expect(page.locator('#objective-title')).toHaveText('CV STATUS: YELLOW.');
  await interact(page, 'cv-workstation');
  await page.evaluate(async () => {
    const { solveMiniGame } = await import('/test-support/minigame-bot.js');
    solveMiniGame(window.__workdayle.mini);
  });
  expect(await page.evaluate(() => ({ pending: window.__workdayle.state.officeLife.cvPending, rep: window.__workdayle.state.rep[0] }))).toEqual({ pending: null, rep: 35 });
  await page.evaluate(() => window.__workdayle.life.present('recruitment'));
  await page.locator('#accept-offer').click();
  await expect(page.locator('#modal-title')).toHaveText('GAME OVER');
  expect(await page.evaluate(() => window.__workdayle.state.officeLife.outcomes.recruitment)).toBe('failed');
});

test('Jill snack introduction and all four victories show physical travel with safe skips', async ({ page }, info) => {
  test.setTimeout(90000);
  await boot(page);
  await page.evaluate(() => { window.__workdayle.state.rep[0] = 125; });
  await interact(page, 'boss');
  await page.locator('#fight').click();
  await expect(page.locator('#cinematic-title')).toContainText("JILL'S SNACK");
  await page.waitForFunction(() => window.__workdayle.cutscene.elapsed > 2);
  await expect(page.locator('#cinematic-line')).toContainText('MY domain');
  await page.screenshot({ path: info.outputPath('jill-snack.png') });
  await page.locator('#pause-cinematic').click();
  const elapsed = await page.evaluate(() => window.__workdayle.cutscene.elapsed);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__workdayle.cutscene.elapsed)).toBe(elapsed);
  await page.locator('#resume').click();
  await page.locator('#skip-cinematic').click();
  await page.waitForFunction(() => window.__workdayle.mode === 'combat');
  for (let floor = 0; floor < 4; floor++) {
    await page.evaluate(async floor => {
      const game = window.__workdayle;
      if (floor > 0) {
        game.state.rep[floor] = 1000;
        game.startCombat();
        await game.arena.bossMesh.userData.headSurface.ready;
        game.setMode('combat');
      }
      game.combat.finish('win');
    }, floor);
    await expect(page.locator('#cinematic-title')).toContainText('DEFEATED');
    const promoted = await page.evaluate(() => window.__workdayle.state.rank);
    expect(promoted).toBe(floor + 1);
    await page.evaluate(() => window.__workdayle.cutscene.update(4.5));
    expect(await page.evaluate(() => window.__workdayle.cutscene.room.group.name)).toBe('promotion-lift-hall');
    await page.screenshot({ path: info.outputPath(`promotion-${floor}.png`) });
    await page.locator('#skip-cinematic').click();
    expect(await page.evaluate(() => window.__workdayle.mode)).toBe(floor < 3 ? 'office' : 'ending');
    if (floor < 3) expect(await page.evaluate(() => window.__workdayle.state.floor)).toBe(floor + 1);
  }
  await expect(page.locator('.corporate-crawl')).toBeVisible();
});

test('collectibles, hidden room and bathroom camera are optional and persist once', async ({ page }) => {
  await boot(page);
  const collectible = await page.evaluate(() => window.__workdayle.office.interactables.find(item => item.kind === 'collectible').id);
  await interact(page, collectible);
  const size = await page.evaluate(() => window.__workdayle.state.collectibles.size);
  expect(size).toBe(1);
  const secret = await page.evaluate(() => window.__workdayle.office.interactables.find(item => item.kind === 'secret-door').id);
  await interact(page, secret);
  const egg = await page.evaluate(() => window.__workdayle.office.interactables.find(item => item.kind === 'easter-egg').id);
  await interact(page, egg);
  await expect(page.locator('#toast')).toBeVisible();
  const exit = await page.evaluate(() => window.__workdayle.office.interactables.find(item => item.kind === 'exit-secret').id);
  await interact(page, exit);
  await interact(page, 'bathroom');
  const camera = await page.evaluate(() => window.__workdayle.office.interactables.find(item => item.kind === 'camera').id);
  await interact(page, camera);
  await page.locator('#destroy-camera').click();
  await expect(page.locator('#collection-count')).toContainText('2 / 24');
  await interact(page, 'bathroom-exit');
  await page.reload();
  await page.locator('#begin').click();
  await expect(page.locator('#collection-count')).toContainText('2 / 24');
  await interact(page, 'bathroom');
  expect(await page.evaluate(() => window.__workdayle.office.interactables.filter(item => item.kind === 'camera' && !item.collected).length)).toBe(0);
});

test('unskipped victory reveals one persistent floor and leaves the player at the arrival endpoint', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(async () => {
    const game = window.__workdayle;
    game.state.rep[0] = 125;
    game.startCombat();
    await game.arena.bossMesh.userData.headSurface.ready;
    game.combat.finish('win');
    game.cutscene.update(4.5);
    game.cutscene.update(3);
    const newFloor = game.office.group.uuid;
    const spawnZ = game.state.position.z;
    game.cutscene.update(1.5);
    return {
      sameFloor: game.office.group.uuid === newFloor, floor: game.state.floor,
      mode: game.mode, distance: game.state.position.z - spawnZ,
      playerMatches: game.playerMesh.position.z === game.state.position.z,
    };
  });
  expect(result).toEqual({ sameFloor: true, floor: 1, mode: 'office', distance: 2, playerMatches: true });
});
