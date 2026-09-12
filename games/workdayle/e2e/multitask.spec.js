import { test, expect } from '@playwright/test';
import { MULTITASK_TYPES, MINI_TYPES } from '../test-support/minigame-bot.js';

async function mount(page, type, disposeOnComplete = false, id = `test-${type}`) {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/minigames.css"></head><body style="margin:0;font-family:system-ui;background:#e9eedf"></body></html>',
  }));
  await page.goto('/');
  await page.evaluate(async ({ type, disposeOnComplete, id }) => {
    const { MiniGame } = await import('/src/minigames.js');
    const host = document.createElement('div');
    host.id = 'multitask-host';
    host.style.cssText = 'width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:18px;box-sizing:border-box;margin:12px auto;background:#fbfaf4';
    document.body.append(host);
    window.results = { success: 0, cancel: 0 };
    window.mini = new MiniGame(host, { id, type, title: 'A small distraction', description: 'A fictional office task.', reward: 25 }, {
      onComplete: () => { window.results.success++; if (disposeOnComplete) window.mini.dispose(); },
      onCancel: () => window.results.cancel++,
    });
  }, { type, disposeOnComplete, id });
}
const state = page => page.evaluate(() => ({
  state: mini.state, progress: mini.progress, elapsed: mini.elapsed, remaining: mini.remaining,
  suspicion: mini.suspicion, readSeconds: mini.readSeconds, ...results,
}));
const click = (page, action, value) => page.locator(`[data-action="${action}"]${value === undefined ? '' : `[data-value="${value}"]`}`).click();
const tick = (page, seconds) => page.evaluate(seconds => window.mini.update(seconds), seconds);
const until = (page, elapsed) => page.evaluate(elapsed => {
  for (let frame = 0; frame < 3000 && mini.elapsed < elapsed - .000001 && mini.state === 'playing'; frame++) {
    mini.update(Math.min(1 / 60, elapsed - mini.elapsed));
  }
}, elapsed);
const meetingUntil = (page, elapsed) => page.evaluate(elapsed => {
  for (let frame = 0; frame < 3000 && mini.meetingTime < elapsed - .000001 && mini.state === 'playing'; frame++) {
    const question = mini.root.querySelector('.mg-direct-question:not([hidden])');
    if (question && mini.cooldown === 0) {
      const index = question.querySelector('.mg-note').textContent.includes('Name an owner') ? 1 : 0;
      question.querySelector(`[data-value="${index}"]`).click();
    }
    mini.update(Math.min(1 / 60, elapsed - mini.meetingTime));
  }
}, elapsed);
const solve = page => page.evaluate(async () => {
  const { solveMiniGame } = await import('/test-support/minigame-bot.js');
  return solveMiniGame(window.mini);
});

for (const type of MULTITASK_TYPES) {
  test(`${type}: ready timer, failure, retry and exactly one success`, async ({ page }) => {
    await mount(page, type);
    const ready = await state(page);
    await tick(page, 100);
    expect((await state(page)).remaining).toBe(ready.remaining);
    await click(page, 'start');
    await tick(page, 100);
    expect((await state(page)).state).toBe('failed');
    expect((await state(page)).success).toBe(0);
    await click(page, 'retry');
    expect((await state(page)).progress).toBe(0);
    await solve(page);
    const won = await state(page);
    expect(won.state).toBe('success');
    expect(won.success).toBe(1);
    await page.evaluate(() => { mini.complete(); mini.cancel(); mini.start(); mini.update(100); });
    expect(await state(page)).toEqual(won);
  });

  test(`${type}: pause/detachment freezes and cancel/dispose never rewards`, async ({ page }) => {
    await mount(page, type);
    await click(page, 'start');
    await tick(page, .5);
    await page.evaluate(() => { mini.suspend(); mini.root.remove(); });
    const paused = await state(page);
    await tick(page, 100);
    await page.evaluate(() => mini.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })));
    expect(await state(page)).toEqual(paused);
    await page.evaluate(() => document.querySelector('#multitask-host').append(mini.root));
    await click(page, 'cancel');
    await page.evaluate(() => { mini.cancel(); mini.update(100); });
    expect((await state(page)).cancel).toBe(1);
    expect((await state(page)).success).toBe(0);
    const disposed = await page.evaluate(() => {
      const root = mini.root, removed = [], original = root.removeEventListener.bind(root);
      root.removeEventListener = (name, listener, options) => { removed.push(name); original(name, listener, options); };
      mini.dispose();
      mini.dispose();
      root.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
      return { removed, children: document.querySelector('#multitask-host').childElementCount };
    });
    expect(disposed.removed).toEqual(expect.arrayContaining(['wheel', 'click', 'keydown']));
    expect(disposed.children).toBe(0);
    expect((await state(page)).success).toBe(0);
  });

  test(`${type}: live host may dispose during completion`, async ({ page }) => {
    await mount(page, type, true);
    await solve(page);
    expect((await state(page)).state).toBe('disposed');
    expect((await state(page)).success).toBe(1);
  });
}

for (const type of ['meeting', 'survive']) {
  test(`${type}: three nods alone cannot pass; missed nods raise suspicion`, async ({ page }) => {
    await mount(page, type);
    await page.keyboard.press('Enter');
    for (const elapsed of [2.5, 7.3, 12.1]) {
      await meetingUntil(page, elapsed);
      await page.keyboard.press('n');
    }
    expect((await state(page)).progress).toBe(3);
    expect((await state(page)).success).toBe(0);
    await meetingUntil(page, 18.3);
    expect((await state(page)).suspicion).toBeGreaterThan(0);
    await expect(page.locator('.mg-feedback')).toContainText('Missed nod');
    await tick(page, 100);
    expect((await state(page)).state).toBe('failed');
  });

  test(`${type}: readable reel timing, wheel and full keyboard play`, async ({ page }) => {
    await mount(page, type);
    await page.keyboard.press('Enter');
    await expect(page.locator('.mg-reel-caption')).toContainText('pigeon');
    await page.keyboard.press('ArrowUp');
    expect((await state(page)).suspicion).toBe(1);
    await meetingUntil(page, 1.3);
    await page.locator('[data-reel]').hover();
    await page.mouse.wheel(0, 160);
    await expect.poll(async () => (await state(page)).progress).toBe(1);
    await expect(page.locator('.mg-reel-caption')).toContainText('growth forecast');
    await meetingUntil(page, 2.5);
    await page.keyboard.press('Space');
    expect((await state(page)).progress).toBe(2);
    await meetingUntil(page, 6.1);
    await page.keyboard.press('ArrowDown');
    await meetingUntil(page, 7.3);
    await page.keyboard.press('n');
    await meetingUntil(page, 10.9);
    await page.locator('[data-action="scroll"]').focus();
    await page.keyboard.press('Enter');
    await meetingUntil(page, 12.1);
    await page.keyboard.press('Space');
    expect((await state(page)).state).toBe('success');
    expect((await state(page)).success).toBe(1);
  });
}

test('meeting cannot pass by batching nods first and scrolling in later rounds', async ({ page }) => {
  await mount(page, 'meeting');
  await click(page, 'start');
  for (const elapsed of [2.5, 7.3, 12.1]) {
    await meetingUntil(page, elapsed);
    await click(page, 'primary');
  }
  for (const elapsed of [12.2, 15.7, 20.5]) {
    await meetingUntil(page, elapsed);
    await click(page, 'scroll');
  }
  expect((await state(page)).success).toBe(0);
  await expect(page.locator('.mg-attention-score')).toContainText('Multitasked rounds 1/3');
});

test('phone: the employee visibly approaches and catching you costs progress and time', async ({ page }) => {
  await mount(page, 'phone');
  await click(page, 'start');
  const start = await page.locator('.mg-walker').boundingBox();
  await until(page, 1.3);
  await click(page, 'scroll');
  expect((await state(page)).progress).toBe(1);
  await until(page, 3.2);
  const approaching = await page.locator('.mg-walker').boundingBox();
  expect(approaching.x).toBeGreaterThan(start.x + 40);
  await expect(page.locator('.mg-approach-status')).toContainText('hide now');
  await until(page, 4.1);
  expect((await state(page)).progress).toBe(0);
  expect((await state(page)).remaining).toBeCloseTo(30 - 4.1 - 1.5, 3);
  await expect(page.locator('.mg-feedback')).toContainText('pigeon our new consultant');
  await expect(page.locator('.minigame')).toHaveClass(/mg-caught/);
  await until(page, 4.6);
  expect((await state(page)).remaining).toBeCloseTo(30 - 4.6 - 1.5, 3);
});

test('phone: permanent hiding cannot win; retry works with keyboard reactions', async ({ page }) => {
  await mount(page, 'phone');
  await page.keyboard.press('Enter');
  await page.keyboard.press('h');
  await until(page, 20);
  expect((await state(page)).progress).toBe(0);
  expect((await state(page)).readSeconds).toBe(0);
  await expect(page.locator('[data-action="scroll"]')).toBeDisabled();
  await tick(page, 100);
  await page.keyboard.press('Enter');
  for (let cycle = 0; cycle < 3; cycle++) {
    await until(page, cycle * 7 + 1.3);
    await page.keyboard.press('ArrowDown');
    if (cycle === 2) break;
    await until(page, cycle * 7 + 3);
    await page.keyboard.press('h');
    await expect(page.locator('.mg-phone-cover')).toBeVisible();
    await until(page, cycle * 7 + 6.1);
    await page.keyboard.press('Space');
    await expect(page.locator('.mg-phone-cover')).toBeHidden();
  }
  expect((await state(page)).state).toBe('success');
  expect((await state(page)).success).toBe(1);
});

test('phone: opening the phone during an inspection is detected immediately', async ({ page }) => {
  await mount(page, 'phone');
  await click(page, 'start');
  await page.keyboard.press('h');
  await until(page, 4.2);
  const before = await state(page);
  await page.keyboard.press('h');
  expect((await state(page)).remaining).toBeCloseTo(before.remaining - 1.5, 3);
  await expect(page.locator('.minigame')).toHaveClass(/mg-caught/);
});

test('delegation: matching expertise, explicit confirmation, complaint and visible departure', async ({ page }) => {
  await mount(page, 'delegate');
  await page.keyboard.press('Enter');
  await page.keyboard.press('3');
  await page.keyboard.press('d');
  expect((await state(page)).remaining).toBe(18.5);
  expect((await state(page)).progress).toBe(0);
  await expect(page.locator('.mg-delegate-status')).toContainText('proofread');
  await page.keyboard.press('1');
  await tick(page, .5);
  expect((await state(page)).progress).toBe(0);
  await page.keyboard.press('d');
  await expect(page.locator('.mg-departure-scene')).toBeVisible();
  const start = await page.locator('.mg-walker').boundingBox();
  await tick(page, .7);
  const walking = await page.locator('.mg-walker').boundingBox();
  expect(walking.x).toBeGreaterThan(start.x + 50);
  expect((await state(page)).progress).toBe(0);
  await tick(page, .7);
  expect((await state(page)).progress).toBe(1);
  await page.keyboard.press('2');
  await page.locator('[data-action="delegate-work"]').focus();
  await page.keyboard.press('Enter');
  await tick(page, 1.4);
  expect((await state(page)).state).toBe('success');
});

test('AI: one local request, short processing, humorous draft and keyboard filing', async ({ page }) => {
  const external = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url()); });
  await mount(page, 'ai', false, 'even');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-action="ask-ai"]')).toContainText('ASK AI');
  await page.keyboard.press('a');
  await expect(page.locator('[data-action="ask-ai"]')).toBeDisabled();
  await tick(page, 1);
  await expect(page.locator('.mg-ai-processing')).toBeVisible();
  expect((await state(page)).success).toBe(0);
  await tick(page, .5);
  await expect(page.locator('.mg-ai-output')).toContainText('negative Tuesday');
  await expect(page.locator('.mg-ai-warning')).toContainText('Human review required');
  await page.keyboard.press('f');
  expect((await state(page)).state).toBe('success');
  expect((await state(page)).elapsed).toBe(1.5);
  expect(external).toEqual([]);
});

test('AI: the alternate draft also admits its questionable recommendation', async ({ page }) => {
  await mount(page, 'ai', false, 'odd');
  await click(page, 'start');
  await click(page, 'ask-ai');
  await tick(page, 1.5);
  await expect(page.locator('.mg-ai-output')).toContainText('motivational cabbage');
  await click(page, 'file-ai');
  expect((await state(page)).success).toBe(1);
});

for (const type of ['delegate', 'ai']) {
  test(`${type}: an in-flight departure or AI request resumes only after the modal returns`, async ({ page }) => {
    await mount(page, type);
    await click(page, 'start');
    if (type === 'delegate') {
      await click(page, 'employee', 0);
      await click(page, 'delegate-work');
    } else await click(page, 'ask-ai');
    await tick(page, .5);
    const before = await state(page);
    await page.evaluate(() => { mini.suspend(); mini.root.remove(); });
    await tick(page, 20);
    expect(await state(page)).toEqual(before);
    await page.evaluate(() => document.querySelector('#multitask-host').append(mini.root));
    await tick(page, 1);
    if (type === 'delegate') expect((await state(page)).progress).toBe(1);
    else await expect(page.locator('[data-action="file-ai"]')).toBeVisible();
    expect((await state(page)).success).toBe(0);
  });
}

test('all 33 task types have a working control-only solver and progression has 64 unique tasks', async ({ page }) => {
  await mount(page, 'ai');
  const result = await page.evaluate(async () => {
    const { MiniGame, MINI_TYPES } = await import('/src/minigames.js');
    const { solveMiniGame } = await import('/test-support/minigame-bot.js');
    const { FLOORS } = await import('/src/content.js');
    const { NPC_SLOTS } = await import('/src/layout.js');
    mini.dispose();
    const solved = [];
    for (const type of MINI_TYPES) {
      const game = new MiniGame(document.querySelector('#multitask-host'), { id: type, type, reward: 25 });
      solveMiniGame(game);
      solved.push(type);
      game.dispose();
    }
    return {
      solved,
      tasks: FLOORS.flatMap(floor => floor.tasks).map(task => task.id),
      floors: FLOORS.slice(0, 4).map(floor => ({ tasks: floor.tasks.length, npcs: floor.npcs.length, optional: floor.tasks.filter(task => task.optional).length, energy: floor.tasks.reduce((sum, task) => sum + task.energyCost, 0) })),
      slots: NPC_SLOTS.length,
    };
  });
  expect(result.solved).toEqual(MINI_TYPES);
  expect(result.solved).toHaveLength(33);
  expect(new Set(result.solved).size).toBe(33);
  expect(result.tasks).toHaveLength(64);
  expect(new Set(result.tasks).size).toBe(64);
  expect(result.slots).toBe(16);
  for (const floor of result.floors) {
    expect(floor.tasks).toBe(16);
    expect(floor.npcs).toBe(16);
    expect(floor.optional).toBe(4);
    expect(floor.energy).toBeGreaterThan(100);
  }
});

test('multitasking remains readable and keyboard operable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, 'meeting');
  await click(page, 'start');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.mg-reel-caption')).toBeVisible();
  await expect(page.locator('[data-action="primary"]')).toBeVisible();
  await solve(page);
  expect((await state(page)).success).toBe(1);
});
