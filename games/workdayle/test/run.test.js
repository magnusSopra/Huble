import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunClock, formatTime, rateRun, finalResult } from '../src/run.js';

test('timer covers dialogue, tasks, combat and retry screens but not title or explicit pause', () => {
  let now = 0;
  const state = { elapsed: 0, complete: false };
  const clock = new RunClock(state, () => now);
  now += 10000;
  clock.mode('office');
  assert.equal(state.elapsed, 0);
  for (const mode of ['office', 'dialogue', 'minigame', 'elevator', 'intro', 'combat', 'defeat', 'promotion', 'event', 'cutscene']) {
    clock.mode(mode);
    now += 2000;
    clock.sync();
  }
  assert.equal(state.elapsed, 20);
  clock.mode('paused');
  now += 100000;
  clock.mode('office');
  assert.equal(state.elapsed, 20);
  now += 1000;
  clock.sync();
  state.complete = true;
  now += 50000;
  clock.sync();
  assert.equal(state.elapsed, 21);
});

test('wall-clock accounting is independent of rendering frequency', () => {
  let now = 0;
  const state = { elapsed: 0, complete: false };
  const clock = new RunClock(state, () => now);
  clock.mode('office');
  now = 10432;
  clock.sync();
  assert.equal(state.elapsed, 10.432);
  assert.equal(formatTime(1122.9), '18:42');
  assert.equal(formatTime(3601), '60:01');
});

test('final results freeze all career totals and favor faster runs', () => {
  const state = { elapsed: 600, rep: [150, 160, 190, 210, 0], completed: new Set(['a', 'b']), bossesDefeated: 4, legacy: false };
  const result = finalResult(state);
  assert.equal(result.rep, 710);
  assert.equal(result.tasks, 2);
  assert.equal(result.bosses, 4);
  assert.equal(result.rating.name, 'Executive Material');
  state.elapsed = 1200;
  assert.ok(finalResult(state).score < result.score);
  assert.equal(result.time, 600);
  assert.notEqual(rateRun(1801).name, rateRun(599).name);
});
