import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, parseSave } from '../src/state.js';
import { createOfficeEventState, advanceOfficeEvents, relieveBathroom, resolveOfficeEvent } from '../src/office-events.js';

test('bathroom threshold starts a twenty-second race, pauses explicitly, and fails only at zero', () => {
  const state = createOfficeEventState(), context = { eligible: true, ticking: true, bathroom: 99 };
  assert.equal(advanceOfficeEvents(state, 1, context), null);
  context.bathroom = 100;
  assert.equal(advanceOfficeEvents(state, 0.01, context).id, 'bathroom-emergency');
  assert.equal(state.emergency, 20);
  assert.equal(state.gameOver, null);
  advanceOfficeEvents(state, 50, { ...context, ticking: false });
  assert.equal(state.emergency, 20);
  advanceOfficeEvents(state, 19, context);
  assert.equal(state.emergency, 1);
  assert.equal(state.gameOver, null);
  assert.equal(advanceOfficeEvents(state, 1, context).id, 'bathroom-failure');
  assert.equal(state.outcomes.bathroom, 'failed');
  assert.equal(state.gameOver, 'bathroom');
});

test('reaching the bathroom cancels urgency and suppresses immediate follow-up events', () => {
  const state = createOfficeEventState();
  state.emergency = 0.2;
  state.wait = 0;
  assert.equal(relieveBathroom(state), true);
  assert.equal(state.emergency, null);
  assert.equal(state.outcomes.bathroom, 'completed');
  assert.equal(advanceOfficeEvents(state, 1, { eligible: true, ticking: true, bathroom: 0 }, () => 0), null);
});

test('random events respect major-event exclusion, eligibility, probabilities and cooldowns', () => {
  const state = createOfficeEventState(), context = { eligible: true, ticking: true, bathroom: 0 };
  assert.equal(advanceOfficeEvents(state, 64, context, () => 0), null);
  assert.equal(advanceOfficeEvents(state, 1, context, () => 0).id, 'recruitment');
  assert.equal(advanceOfficeEvents(state, 200, context, () => 0), null);
  assert.equal(state.clock, 65);
  resolveOfficeEvent(state, 'completed');
  state.wait = 0;
  assert.equal(advanceOfficeEvents(state, 1, context, () => 0).id, 'cv-warning');
  assert.equal(state.outcomes.recruitment, 'completed');
  state.active = null;
  state.cvPending = 0;
  state.wait = 0;
  assert.equal(advanceOfficeEvents(state, 1, context, () => 0).id, 'meeting-invite');
  resolveOfficeEvent(state, 'declined');
  state.wait = 0;
  assert.equal(advanceOfficeEvents(state, 1, { ...context, eligible: false }, () => 0), null);
  assert.equal(advanceOfficeEvents(state, 1, context, () => 0.99), null);
});

test('collections, event results and emergency time persist without changing original save compatibility', () => {
  const state = new GameState();
  state.collectibles.add('camera:0');
  state.officeLife.emergency = 7.25;
  state.officeLife.cvPending = 0;
  state.officeLife.outcomes.recruitment = 'completed';
  const saved = state.serialize();
  const copy = new GameState(parseSave(JSON.stringify(saved)));
  assert.equal(copy.collectibles.has('camera:0'), true);
  assert.equal(copy.officeLife.emergency, 7.25);
  copy.officeLife.emergency = 1;
  assert.equal(state.officeLife.emergency, 7.25);
  const original = { ...saved };
  delete original.officeLife;
  delete original.collectibles;
  assert.deepEqual(new GameState(parseSave(JSON.stringify(original))).officeLife, createOfficeEventState());
  saved.officeLife.emergency = 21;
  assert.throws(() => parseSave(JSON.stringify(saved)), /event state/);
});
