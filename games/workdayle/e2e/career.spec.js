import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.locator('#begin').click();
  await page.evaluate(async () => {
    const game = window.__workdayle;
    // Event outcomes have separate coverage; keep the all-task route repeatable.
    game.life.random = () => 0.99;
    const { walkTo } = await import('/test-support/walk-bot.js');
    const { chooseCombatInput } = await import('/test-support/combat-bot.js');
    window.chooseCombatInput = chooseCombatInput;
    window.play = game;
    window.press = code => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    };
    window.walkTo = id => walkTo(game, id);
  });
}

async function interact(page, id) {
  await page.evaluate(id => window.walkTo(id), id);
  await page.keyboard.press('KeyE');
}

async function solveTask(page, type) {
  await page.evaluate(async type => {
    const { solveMiniGame } = await import('/test-support/minigame-bot.js');
    if (window.play.mini.task.type !== type) throw new Error(`Expected ${type} task`);
    solveMiniGame(window.play.mini);
  }, type);
  await expect(page.locator('#modal-backdrop')).toBeHidden();
}

test('office input, floor locks, task retry, pause and coffee work', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  const before = await page.evaluate(() => ({ ...window.play.state.position }));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => window.play.state.position);
  expect(Math.hypot(before.x - after.x, before.z - after.z)).toBeGreaterThan(0.2);
  await page.screenshot({ path: info.outputPath('office.png') });
  await interact(page, 'elevator');
  await expect(page.locator('[data-floor="1"]')).toBeDisabled();
  await page.locator('#leave').click();
  const repairNpc = await page.evaluate(() => window.play.office.interactables.find(item => item.kind === 'npc' && item.npc.task.type === 'repair').id);
  await interact(page, repairNpc);
  const beforeDialogue = await page.evaluate(() => window.play.state.elapsed);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.play.state.elapsed)).toBeGreaterThan(beforeDialogue + 0.2);
  await page.locator('#accept').click();
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => window.play.mini.update(20));
  await expect(page.locator('[data-action="retry"]')).toBeVisible();
  await page.locator('[data-action="retry"]').click();
  await page.locator('#pause').click();
  const time = await page.evaluate(() => window.play.mini.remaining);
  const careerTime = await page.evaluate(() => window.play.state.elapsed);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.play.mini.remaining)).toBe(time);
  expect(await page.evaluate(() => window.play.state.elapsed)).toBe(careerTime);
  await page.locator('#resume').click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.play.state.rep[0])).toBe(0);
  await interact(page, 'coffee');
  await solveTask(page, 'coffee');
  expect(await page.evaluate(() => window.play.state.bathroom)).toBe(25);
  await interact(page, 'bathroom');
  await interact(page, 'toilet');
  expect(await page.evaluate(() => window.play.state.bathroom)).toBe(0);
  expect(errors).toEqual([]);
});

test('complete all tasks, defeat four bosses, watch ending and resume as CEO', async ({ page }, info) => {
  test.setTimeout(600000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  const totalTasks = await page.evaluate(async () => {
    const { FLOORS } = await import('/src/content.js');
    return FLOORS.reduce((sum, floor) => sum + floor.tasks.length, 0);
  });
  for (let floor = 0; floor < 4; floor++) {
    const tasks = await page.evaluate(() => window.play.office.interactables.filter(item => item.kind === 'npc').map(item => ({ id: item.id, type: item.npc.task.type })));
    for (const task of tasks) {
      if (await page.evaluate(() => window.play.state.bathroom >= 75)) {
        await interact(page, 'bathroom');
        await interact(page, 'toilet');
        await interact(page, 'bathroom-exit');
      }
      if (await page.evaluate(() => window.play.state.energy < 8)) {
        await interact(page, 'coffee');
        await solveTask(page, 'coffee');
      }
      await interact(page, task.id);
      await page.locator('#accept').click();
      if (task.type === 'room') await interact(page, 'room');
      else if (task.type === 'printer') {
        await interact(page, 'printer-east');
        expect(await page.evaluate(() => window.play.quest !== null)).toBe(true);
        await interact(page, 'printer-working');
      }
      else await solveTask(page, task.type);
    }
    expect(await page.evaluate(() => window.play.state.bossReady)).toBe(true);
    await interact(page, 'boss');
    await page.locator('#fight').click();
    if (floor === 0) await page.locator('#skip-cinematic').click();
    await page.waitForFunction(() => window.play.mode === 'combat');
    if (floor === 0) {
      await page.screenshot({ path: info.outputPath('boss.png') });
      await page.evaluate(() => window.play.combat.damage(100));
      await expect(page.locator('#retry')).toBeVisible();
      await page.locator('#retry').click();
      await page.waitForFunction(() => window.play.mode === 'combat');
    }
    await page.evaluate(() => {
      const game = window.play, combat = game.combat;
      for (let i = 0; i < 18000 && game.mode === 'combat'; i++) {
        const action = window.chooseCombatInput(combat);
        combat.player.yaw = action.yaw;
        if (action.dodgeSide !== null) {
          game.keys.clear();
          if (action.dodgeSide === -1) game.keys.add('KeyA');
          window.press('Space');
        }
        if (action.punch) window.press('KeyF');
        game.keys.clear();
        if (game.mode !== 'combat') break;
        game.updateCombat(1 / 60, action.input);
      }
      if (game.mode !== 'cutscene') throw new Error(`Boss did not end in victory travel: ${game.mode}`);
    });
    expect(await page.evaluate(() => window.play.state.rank)).toBe(floor + 1);
    await expect(page.locator('#cinematic-title')).toContainText('DEFEATED');
    await page.locator('#skip-cinematic').click();
    if (floor < 3) expect(await page.evaluate(() => window.play.state.floor)).toBe(floor + 1);
  }
  await expect(page.locator('.corporate-crawl')).toBeVisible();
  expect(await page.evaluate(() => window.play.office.group.visible)).toBe(false);
  const finalTime = await page.evaluate(() => window.play.state.result.time);
  await page.waitForFunction(() => window.play.ending.elapsed > 1.6);
  const firstTransform = await page.locator('.corporate-crawl').evaluate(el => el.style.transform);
  await page.waitForTimeout(350);
  expect(await page.locator('.corporate-crawl').evaluate(el => el.style.transform)).not.toBe(firstTransform);
  await page.locator('#skip-ending').click();
  await expect(page.locator('#parade-layer')).toBeVisible();
  await page.locator('#skip-parade').click();
  await expect(page.locator('.final-results')).toBeVisible();
  await expect(page.locator('.final-stat-grid')).toContainText('CEO');
  await page.screenshot({ path: info.outputPath('victory.png') });
  expect(await page.evaluate(() => window.play.state.result.time)).toBe(finalTime);
  expect(await page.evaluate(() => window.play.state.complete)).toBe(true);
  expect(await page.evaluate(() => window.play.state.completed.size)).toBe(totalTasks);
  expect(await page.evaluate(() => window.play.state.result.bosses)).toBe(4);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workdayle-best-v2')).time)).toBe(finalTime);
  await page.locator('#ending-office').click();
  await page.reload();
  await expect(page.locator('#begin')).toHaveText(/Continue/);
  await page.locator('#begin').click();
  await expect(page.locator('#job-title')).toHaveText('CEO');
  await expect(page.locator('#floor-title')).toHaveText('The corner office.');
  await page.locator('#pause').click();
  await page.locator('#restart').click();
  await page.locator('#reset').click();
  await expect(page.locator('#job-title')).toHaveText('Consultant');
  expect(await page.evaluate(() => window.__workdayle.state.completed.size)).toBe(0);
  expect(await page.evaluate(() => window.__workdayle.state.elapsed)).toBeLessThan(5);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workdayle-best-v2')).time)).toBe(finalTime);
  expect(errors).toEqual([]);
});
