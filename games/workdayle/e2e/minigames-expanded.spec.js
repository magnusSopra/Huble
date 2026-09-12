import { test, expect } from '@playwright/test';
import { OFFICE_MINI_TYPES as TYPES } from '../test-support/minigame-bot.js';

async function mount(page, type, disposeOnComplete = false) {
  // Exercise the real modules without the office renderer or Vite's live-reload
  // client replacing our test modal while other workstreams edit the app.
  await page.route('http://127.0.0.1:5173/', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/minigames.css"></head><body style="margin:0;font-family:system-ui;background:#e9eedf"></body></html>',
  }));
  await page.goto('/');
  await page.evaluate(async ({ type, disposeOnComplete }) => {
    const { MiniGame } = await import('/src/minigames.js');
    const container = document.createElement('div');
    container.id = 'mini-test-host';
    container.style.cssText = 'position:fixed;inset:20px auto auto 50%;transform:translateX(-50%);box-sizing:border-box;width:min(540px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;padding:22px;background:#fbfaf4;z-index:99999';
    document.body.append(container);
    window.miniResults = { success: 0, cancel: 0, sounds: [] };
    window.miniTest = new MiniGame(container, { id: `test-${type}`, title: 'Office task', type, description: 'A small job, done properly.', reward: 25, energyCost: 8 }, {
      onComplete: () => {
        window.miniResults.success++;
        if (disposeOnComplete) window.miniTest.dispose();
      },
      onCancel: () => window.miniResults.cancel++,
      sound: name => window.miniResults.sounds.push(name),
    });
  }, { type, disposeOnComplete });
}

const tick = (page, seconds) => page.evaluate(seconds => window.miniTest.update(seconds), seconds);
const action = (page, name, value) => page.locator(`#mini-test-host [data-action="${name}"]${value === undefined ? '' : `[data-value="${value}"]`}`).click();
const state = page => page.evaluate(() => ({ state: window.miniTest.state, progress: window.miniTest.progress, remaining: window.miniTest.remaining, ...window.miniResults }));

async function solve(page) {
  await page.evaluate(async () => {
    const { solveOfficeMini } = await import('/test-support/minigame-bot.js');
    solveOfficeMini(window.miniTest);
  });
}

for (const type of TYPES) {
  test(`${type}: success, stopped timer and exactly one reward`, async ({ page }) => {
    await mount(page, type);
    const before = await state(page);
    await tick(page, 100);
    expect((await state(page)).remaining).toBe(before.remaining);
    await action(page, 'start');
    await tick(page, 100);
    await action(page, 'retry');
    await solve(page, type);
    const won = await state(page);
    expect(won.state).toBe('success');
    expect(won.success).toBe(1);
    expect(won.cancel).toBe(0);
    await page.evaluate(() => { window.miniTest.update(100); window.miniTest.complete(); window.miniTest.cancel(); window.miniTest.start(); });
    expect((await state(page)).remaining).toBe(won.remaining);
    expect((await state(page)).success).toBe(1);
    await page.evaluate(() => window.miniTest.dispose());
    await expect(page.locator('#mini-test-host .minigame')).toHaveCount(0);
  });

  test(`${type}: timeout, retry and abandoning never reward`, async ({ page }) => {
    await mount(page, type);
    await action(page, 'start');
    await tick(page, 100);
    expect((await state(page)).state).toBe('failed');
    expect((await state(page)).success).toBe(0);
    await action(page, 'retry');
    expect((await state(page)).state).toBe('playing');
    expect((await state(page)).progress).toBe(0);
    await tick(page, 100);
    await action(page, 'cancel');
    await page.evaluate(() => { window.miniTest.cancel(); window.miniTest.update(100); });
    expect((await state(page)).cancel).toBe(1);
    expect((await state(page)).success).toBe(0);
  });
}

test('shredder requires a real hold and pauses on release, focus loss and detachment', async ({ page }) => {
  await mount(page, 'empty');
  await action(page, 'start');
  await action(page, 'shred-hold');
  await tick(page, .5);
  expect((await state(page)).progress).toBe(0);
  await page.locator('[data-action="shred-hold"]').focus();
  await page.keyboard.down('Space');
  await tick(page, 2);
  await page.keyboard.up('Space');
  expect((await state(page)).progress).toBe(40);
  await tick(page, .5);
  expect((await state(page)).progress).toBe(40);
  await page.keyboard.down('Space');
  await tick(page, .5);
  await page.evaluate(() => window.miniTest.root.focus());
  await tick(page, .5);
  expect((await state(page)).progress).toBe(50);
  await page.keyboard.up('Space');
  await page.locator('[data-action="shred-hold"]').focus();
  await page.keyboard.down('Space');
  await page.evaluate(() => window.miniTest.root.remove());
  const paused = await state(page);
  await tick(page, 10);
  expect((await state(page)).remaining).toBe(paused.remaining);
  await page.evaluate(() => { document.querySelector('#mini-test-host').append(window.miniTest.root); window.miniTest.root.focus(); });
  await page.keyboard.up('Space');
  await tick(page, .5);
  expect((await state(page)).progress).toBe(50);
  await page.locator('[data-action="shred-hold"]').focus();
  await page.keyboard.down('Space');
  await tick(page, 2.5);
  await page.keyboard.up('Space');
  expect((await state(page)).state).toBe('success');
});

test('swipe rejects short, slow and incomplete reads; pointer cancellation releases capture', async ({ page }) => {
  await mount(page, 'swipe');
  await action(page, 'start');
  await page.locator('[data-action="swipe-hold"]').focus();
  for (const seconds of [.3, 2]) {
    await page.keyboard.down('Space');
    await tick(page, seconds);
    await page.keyboard.up('Space');
    expect((await state(page)).progress).toBe(0);
  }
  let card = await page.locator('.mg-access-card').boundingBox();
  await page.mouse.move(card.x + 15, card.y + 25);
  await page.mouse.down();
  await tick(page, 1);
  await page.mouse.up();
  expect((await state(page)).progress).toBe(0);
  for (let i = 0; i < 2; i++) {
    card = await page.locator('.mg-access-card').boundingBox();
    const track = await page.locator('.mg-reader-track').boundingBox();
    await page.mouse.move(card.x + 15, card.y + 25);
    await page.mouse.down();
    await tick(page, 1.1);
    await page.mouse.move(card.x + 15 + track.width - card.width, card.y + 25, { steps: 5 });
    await page.mouse.up();
  }
  expect((await state(page)).state).toBe('success');
});

test('pointer cancel stops shredding; disposal removes all root-local listeners', async ({ page }) => {
  await mount(page, 'empty');
  await action(page, 'start');
  const hold = await page.locator('[data-action="shred-hold"]').boundingBox();
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await tick(page, 1);
  await page.evaluate(() => window.miniTest.root.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));
  await page.mouse.up();
  const progress = (await state(page)).progress;
  await tick(page, 1);
  expect((await state(page)).progress).toBe(progress);
  expect(await page.evaluate(() => window.miniTest.holding)).toBe(false);
  const removed = await page.evaluate(() => {
    const game = window.miniTest, root = game.root;
    const counts = [];
    const original = root.removeEventListener.bind(root);
    root.removeEventListener = (name, listener, options) => { counts.push(name); original(name, listener, options); };
    game.dispose();
    game.dispose();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    game.update(100);
    return { counts, listeners: game.inputListeners.length, state: game.state, holding: game.holding, results: window.miniResults };
  });
  expect(removed.counts).toEqual(expect.arrayContaining(['click', 'keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'focusout', 'input', 'change', 'dragstart', 'dragend', 'dragover', 'drop']));
  expect(removed.listeners).toBe(0);
  expect(removed.holding).toBe(false);
  expect(removed.state).toBe('disposed');
  expect(removed.results.success).toBe(0);
  expect(removed.results.cancel).toBe(0);
});

test('explicit suspend releases keyboard and pointer holds without resetting completed work', async ({ page }) => {
  await mount(page, 'empty');
  await action(page, 'start');
  await page.locator('[data-action="shred-hold"]').focus();
  await page.keyboard.down('Space');
  await tick(page, 1);
  const before = await state(page);
  await page.evaluate(() => window.miniTest.suspend());
  expect((await state(page)).remaining).toBe(before.remaining);
  expect((await state(page)).state).toBe('playing');
  await tick(page, 1);
  await page.keyboard.up('Space');
  expect((await state(page)).progress).toBe(20);
  expect((await state(page)).success).toBe(0);
  expect((await state(page)).cancel).toBe(0);

  await mount(page, 'swipe');
  await action(page, 'start');
  const card = await page.locator('.mg-access-card').boundingBox();
  await page.mouse.move(card.x + 15, card.y + 25);
  await page.mouse.down();
  await tick(page, 1);
  const released = await page.evaluate(() => {
    const game = window.miniTest, pointer = game.pointerId;
    game.suspend();
    return { holding: game.holding, captured: game.root.hasPointerCapture(pointer), distance: game.swipeDistance, seconds: game.swipeSeconds };
  });
  expect(released).toEqual({ holding: false, captured: false, distance: 0, seconds: 0 });
  await page.mouse.up();
  await tick(page, .5);
  expect((await state(page)).progress).toBe(0);
  await solve(page, 'swipe');
  expect((await state(page)).success).toBe(1);
  await page.evaluate(() => { window.miniTest.dispose(); window.miniTest.suspend(); });
});

test('file and mail sorting both support actual drag and drop, plus keyboard destinations', async ({ page }) => {
  for (const type of ['desktop', 'sortmail']) {
    await mount(page, type);
    await action(page, 'start');
    const destination = type === 'desktop' ? 'Reports' : 'Important';
    await page.locator('[data-action="select-item"][data-value="0"]').dragTo(page.locator(`[data-action="destination"][data-value="${destination}"]`));
    expect((await state(page)).progress).toBe(1);
    const other = type === 'desktop' ? 'Finance' : 'Spam';
    await page.locator('[data-action="select-item"][data-value="1"]').focus();
    await page.keyboard.press('Enter');
    await page.locator(`[data-action="destination"][data-value="${other}"]`).focus();
    await page.keyboard.press('Enter');
    expect((await state(page)).progress).toBe(2);
    await action(page, 'cancel');
    expect((await state(page)).success).toBe(0);
  }
});

test('timesheet edits stay native; wrong hours and booking conflicts are recoverable', async ({ page }) => {
  await mount(page, 'timesheet');
  await action(page, 'start');
  await page.getByRole('spinbutton', { name: 'Mon hours' }).fill('9');
  await action(page, 'submit-hours');
  await expect(page.getByRole('spinbutton', { name: 'Mon hours' })).toHaveAttribute('aria-invalid', 'true');
  expect((await state(page)).success).toBe(0);
  await solve(page, 'timesheet');
  expect((await state(page)).success).toBe(1);
  await mount(page, 'schedule');
  await action(page, 'start');
  await page.getByLabel('Nora', { exact: true }).check();
  await page.getByLabel('Aksel', { exact: true }).check();
  await action(page, 'slot', '09:00');
  await action(page, 'room', 'Fjord');
  await action(page, 'book');
  expect((await state(page)).success).toBe(0);
  await expect(page.locator('#mini-test-host .mg-feedback')).toContainText('10:00');
  await action(page, 'slot', '10:00');
  await action(page, 'room', 'Birch');
  await action(page, 'book');
  expect((await state(page)).success).toBe(0);
  await action(page, 'room', 'Fjord');
  await action(page, 'book');
  expect((await state(page)).success).toBe(1);
});

test('all original game types remain playable, including upgraded meeting multitasking', async ({ page }) => {
  const sequences = { repair: [1, 3, 2, 0], docs: [2, 3, 0, 1], deploy: [2, 3, 0, 1], jira: [2, 3, 1, 0], email: [1, 0, 2], client: [1, 0, 2], help: [0, 1, 2], sql: [1, 0, 2] };
  for (const type of [...Object.keys(sequences), 'coffee', 'meeting', 'survive', 'password', 'deadline']) {
    await mount(page, type);
    await action(page, 'start');
    if (sequences[type]) {
      for (const index of sequences[type]) { await tick(page, .3); await action(page, 'choose', index); }
    } else if (type === 'meeting' || type === 'survive') {
      await solve(page);
    } else if (type === 'password') {
      await action(page, 'remember');
      for (const digit of '2413') await action(page, 'digit', digit);
    } else {
      await page.evaluate(() => {
        const game = window.miniTest;
        for (let frame = 0; frame < 1200 && game.state === 'playing'; frame++) {
          game.update(1 / 60);
          const ready = game.task.type === 'coffee' ? game.coffeePosition() >= .45 && game.coffeePosition() <= .6 : game.task.type === 'deadline' ? game.cooldown === 0 : game.elapsed % 3 > 1.3 && game.elapsed % 3 < 2;
          if (ready) game.root.querySelector('[data-action="primary"]')?.click();
        }
      });
    }
    expect((await state(page)).success, type).toBe(1);
  }
});

test('shared solver starts ready games, supports synchronous host disposal, and throws on failure', async ({ page }) => {
  for (const type of TYPES) {
    await mount(page, type, true);
    await solve(page);
    const result = await state(page);
    expect(result.state, type).toBe('disposed');
    expect(result.success, type).toBe(1);
    expect(result.cancel, type).toBe(0);
  }
  await mount(page, 'empty');
  await action(page, 'start');
  await tick(page, 100);
  await expect(solve(page)).rejects.toThrow('Start or retry the task before solving it');
  expect((await state(page)).success).toBe(0);
});

test('every expanded view fits a narrow viewport without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const type of TYPES) {
    await mount(page, type);
    await action(page, 'start');
    const dimensions = await page.evaluate(() => {
      const root = window.miniTest.root;
      return { width: root.clientWidth, scroll: root.scrollWidth, host: document.querySelector('#mini-test-host').getBoundingClientRect().width };
    });
    expect(dimensions.scroll, type).toBeLessThanOrEqual(dimensions.width + 1);
    expect(dimensions.host, type).toBeLessThanOrEqual(390);
  }
});
