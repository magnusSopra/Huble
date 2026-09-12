import { test, expect } from '@playwright/test';

async function mount(page, type) {
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/minigames.css"></head><body style="margin:0;font-family:system-ui"></body></html>',
  }));
  await page.goto('/');
  await page.evaluate(async type => {
    const { MiniGame } = await import('/src/minigames.js');
    const host = document.createElement('div');
    host.id = 'mini-host';
    host.style.cssText = 'width:min(560px,calc(100vw - 24px));padding:12px;box-sizing:border-box;margin:auto';
    document.body.append(host);
    window.results = { success: 0, cancel: 0 };
    window.mini = new MiniGame(host, { type, id: `iteration4-${type}`, reward: 25 }, {
      onComplete: () => window.results.success++,
      onCancel: () => window.results.cancel++,
    });
  }, type);
  await page.locator('[data-action="start"]').click();
}
const click = (page, action, value) => page.locator(`[data-action="${action}"]${value === undefined ? '' : `[data-value="${value}"]`}`).click();
const tick = (page, seconds) => page.evaluate(seconds => mini.update(seconds), seconds);
const state = page => page.evaluate(() => ({
  state: mini.state, progress: mini.progress, remaining: mini.remaining, elapsed: mini.elapsed,
  meetingTime: mini.meetingTime, questions: mini.questionIndex, active: mini.questionActive,
  reels: [...mini.scrolled], nods: [...mini.nodded], ...results,
}));
const solve = page => page.evaluate(async () => {
  const { solveMiniGame } = await import('/test-support/minigame-bot.js');
  return solveMiniGame(mini);
});

for (const type of ['meeting', 'survive']) {
  test(`${type}: NPC question stops reels, gives a visible answer hint and resumes the same paired game`, async ({ page }) => {
    await mount(page, type);
    await tick(page, 1.3);
    await click(page, 'scroll');
    await tick(page, 1.2);
    await click(page, 'primary');
    expect((await state(page)).progress).toBe(2);
    await tick(page, 2.3);
    await expect(page.locator('.mg-direct-question')).toBeVisible();
    await expect(page.locator('.mg-direct-question')).toContainText('Magnus, what do you think?');
    await expect(page.locator('.mg-direct-question .mg-note')).toContainText('Name an owner and a next step');
    await expect(page.locator('[data-action="scroll"]')).toBeDisabled();
    await expect(page.locator('[data-action="primary"]')).toBeDisabled();
    const paused = await state(page);
    await page.keyboard.press('ArrowDown');
    expect((await state(page)).reels).toEqual(paused.reels);
    expect((await state(page)).remaining).toBeCloseTo(paused.remaining - .6);
    await tick(page, .5);
    await page.locator('[data-reel]').dispatchEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    expect((await state(page)).reels).toEqual(paused.reels);
    expect((await state(page)).meetingTime).toBe(paused.meetingTime);
    const beforeWrong = await state(page);
    await page.keyboard.press('1');
    expect((await state(page)).remaining).toBeCloseTo(beforeWrong.remaining - .75);
    expect((await state(page)).active).toBe(true);
    await expect(page.locator('.mg-feedback')).toContainText('Name an owner and a next step');
    await tick(page, .4);
    await page.keyboard.press('2');
    expect((await state(page)).questions).toBe(1);
    await expect(page.locator('.mg-direct-question')).toBeHidden();
    await expect(page.locator('[data-action="scroll"]')).toBeEnabled();
    await expect(page.locator('[data-action="primary"]')).toBeFocused();
    const resumed = await state(page);
    await tick(page, .5);
    expect((await state(page)).meetingTime).toBeCloseTo(resumed.meetingTime + .5);
    await solve(page);
    expect((await state(page)).questions).toBe(2);
    expect((await state(page)).success).toBe(1);
    const done = await page.evaluate(() => [...mini.nodded].filter(round => mini.scrolled.has(round)));
    expect(done).toHaveLength(3);
  });

  test(`${type}: ignoring questions cannot win and a late answer is recoverable with a time cost`, async ({ page }) => {
    await mount(page, type);
    await tick(page, 4.8);
    const before = await state(page);
    await tick(page, 4.1);
    expect((await state(page)).remaining).toBeCloseTo(before.remaining - 4.1 - 1.5);
    expect((await state(page)).questions).toBe(0);
    expect((await state(page)).meetingTime).toBe(4.8);
    await expect(page.locator('.mg-feedback')).toContainText('Reply overdue');
    await page.keyboard.press('2');
    expect((await state(page)).active).toBe(false);
    await solve(page);
    expect((await state(page)).success).toBe(1);

    await mount(page, type);
    await tick(page, 4.8);
    for (let frame = 0; frame < 8; frame++) {
      await page.keyboard.press('n');
      await page.keyboard.press('ArrowDown');
      await tick(page, 4);
    }
    expect((await state(page)).state).toBe('failed');
    expect((await state(page)).questions).toBe(0);
    expect((await state(page)).success).toBe(0);
    await click(page, 'retry');
    await solve(page);
    expect((await state(page)).success).toBe(1);
  });

  test(`${type}: a paused direct question ignores controls until reattached`, async ({ page }) => {
    await mount(page, type);
    await tick(page, 4.8);
    await page.evaluate(() => { mini.suspend(); mini.root.remove(); });
    const paused = await state(page);
    await page.evaluate(() => {
      mini.update(100);
      mini.root.querySelector('[data-action="answer-question"][data-value="1"]').click();
      mini.root.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    });
    expect(await state(page)).toEqual(paused);
    await page.evaluate(() => document.querySelector('#mini-host').append(mini.root));
    await click(page, 'answer-question', 1);
    expect((await state(page)).questions).toBe(1);
    await click(page, 'cancel');
    expect((await state(page)).cancel).toBe(1);
    expect((await state(page)).success).toBe(0);
  });
}

for (const mistake of ['implausible excuse', 'still available']) {
  test(`dodge-meeting: ${mistake} sends fail, then native controls retry successfully`, async ({ page }) => {
    await mount(page, 'dodge-meeting');
    if (mistake === 'implausible excuse') await page.getByLabel('Mark me unavailable').check();
    await page.locator(`[data-input="excuse"][value="${mistake === 'implausible excuse' ? 'moon' : 'client'}"]`).check();
    const before = await state(page);
    await click(page, 'send-excuse');
    expect((await state(page)).state).toBe('failed');
    expect((await state(page)).success).toBe(0);
    expect((await state(page)).remaining).toBe(before.remaining - 2);
    await expect(page.locator('.mg-result')).toContainText('47-minute');
    await expect(page.locator('.mg-result')).toContainText('Productivity: 0%');
    await expect(page.locator('.mg-result')).toContainText('2 virtual seconds');
    await click(page, 'retry');
    expect((await state(page)).remaining).toBe(20);
    await expect(page.locator('[data-input="unavailable"]')).not.toBeChecked();
    await page.locator('[data-action="send-excuse"]').focus();
    await page.keyboard.press('u');
    await page.keyboard.press('1');
    expect((await state(page)).success).toBe(0);
    expect((await state(page)).progress).toBe(2);
    await page.keyboard.press('s');
    expect((await state(page)).success).toBe(1);
    await page.evaluate(() => { mini.complete(); mini.act('send-excuse'); mini.cancel(); });
    expect((await state(page)).success).toBe(1);
    expect((await state(page)).cancel).toBe(0);
  });
}

for (const provider of ['ChatGPT', 'Claude', 'Sonnet']) {
  test(`cv-ai: ${provider} is local, shows before/after and only completes after filing`, async ({ page }) => {
    const external = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url()); });
    await mount(page, 'cv-ai');
    await expect(page.locator('[data-action="ask-cv"]')).toBeDisabled();
    await page.getByLabel('Choose your fictional assistant').selectOption(provider);
    await expect(page.locator('[data-action="ask-cv"]')).toHaveText('ASK AI TO FIX IT A');
    await expect(page.locator('[data-action="ask-cv"]')).toBeEnabled();
    await page.locator('[data-action="ask-cv"]').focus();
    await page.keyboard.press('a');
    await tick(page, .5);
    await expect(page.locator('.mg-ai-processing')).toBeVisible();
    expect((await state(page)).success).toBe(0);
    await page.evaluate(() => { mini.suspend(); mini.root.remove(); });
    const paused = await state(page);
    await tick(page, 100);
    expect(await state(page)).toEqual(paused);
    await page.evaluate(() => document.querySelector('#mini-host').append(mini.root));
    await tick(page, 1);
    await expect(page.locator('.mg-ai-console')).toContainText(`Assistant: ${provider}`);
    await expect(page.locator('.mg-cv-comparison')).toContainText('BEFORE');
    await expect(page.locator('.mg-cv-after')).toContainText('toner-location intelligence');
    await expect(page.locator('.mg-cv-status')).toContainText('CV POLISHED ✓');
    await expect(page.locator('.mg-ai-warning')).toContainText('not verified experience');
    expect((await state(page)).success).toBe(0);
    await page.keyboard.press('f');
    expect((await state(page)).success).toBe(1);
    await page.evaluate(() => { mini.act('file-cv'); mini.complete(); });
    expect((await state(page)).success).toBe(1);
    expect(external).toEqual([]);
  });
}

test('cv-ai: cancelling processing never publishes a result or a reward', async ({ page }) => {
  await mount(page, 'cv-ai');
  await page.getByLabel('Choose your fictional assistant').selectOption('Sonnet');
  await click(page, 'ask-cv');
  await tick(page, .4);
  await click(page, 'cancel');
  const cancelled = await state(page);
  await tick(page, 100);
  expect(await state(page)).toEqual(cancelled);
  expect(cancelled.cancel).toBe(1);
  expect(cancelled.success).toBe(0);
  await expect(page.locator('[data-action="file-cv"]')).toHaveCount(0);
});

test('new tasks and NPC questions fit a narrow viewport with native keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const type of ['meeting', 'dodge-meeting', 'cv-ai']) {
    await mount(page, type);
    if (type === 'meeting') await tick(page, 4.8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await solve(page);
    expect((await state(page)).success).toBe(1);
  }
});

test('every floor has one optional meeting escape with a real person and dialogue', async ({ page }) => {
  await mount(page, 'dodge-meeting');
  const floors = await page.evaluate(async () => {
    const { FLOORS } = await import('/src/content.js');
    return FLOORS.slice(0, 4).map(floor => ({
      tasks: floor.tasks.filter(task => task.type === 'dodge-meeting'),
      people: floor.npcs.filter(person => person.task.type === 'dodge-meeting'),
      cvEvents: floor.tasks.filter(task => task.type === 'cv-ai').length,
    }));
  });
  expect(floors.map(floor => floor.tasks[0].id)).toEqual(['delivery-dodge-meeting', 'manager-dodge-meeting', 'strategy-dodge-meeting', 'board-dodge-meeting']);
  for (const floor of floors) {
    expect(floor.tasks).toHaveLength(1);
    expect(floor.tasks[0].optional).toBe(true);
    expect(floor.people).toHaveLength(1);
    expect(floor.people[0].name).toBeTruthy();
    expect(floor.people[0].dialogue).toContain('47 minutes');
    expect(floor.cvEvents).toBe(0);
  }
});
