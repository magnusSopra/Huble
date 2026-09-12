import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../src/bosses.js';
import { buildApprovalChoices, buildScheduleChoices } from '../src/office-minigames.js';
import { buildDelegationStaffChoices } from '../src/multitask-minigames.js';
import { shuffleChoiceTexts } from '../src/rng.js';

const cycleRng = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('shuffled text choices keep one correct answer while its position varies', () => {
  const rng = cycleRng(0.95, 0.1, 0.6, 0.2, 0.8, 0.35, 0.05, 0.7);
  const positions = new Set();
  for (let i = 0; i < 8; i++) {
    const choices = shuffleChoiceTexts(['Wrong', 'Right', 'Also wrong'], 1, rng);
    assert.equal(choices.filter(choice => choice.isCorrect).length, 1);
    assert.equal(choices.find(choice => choice.isCorrect)?.text, 'Right');
    positions.add(choices.findIndex(choice => choice.isCorrect));
  }
  assert.ok(positions.size > 1, 'expected the correct answer to move across instances');
});

test('schedule and approval choices randomize order without losing solvability', () => {
  const rng = cycleRng(0.9, 0.1, 0.7, 0.2, 0.8, 0.3, 0.6, 0.4, 0.05, 0.95);
  const scenario = {
    participants: ['Nora', 'Aksel', 'Magnus'],
    correctParticipants: ['Nora', 'Aksel'],
    slot: '10:00',
    room: 'Fjord',
  };
  const slotPositions = new Set();
  const roomPositions = new Set();
  const approvalPositions = new Set();

  for (let i = 0; i < 6; i++) {
    const schedule = buildScheduleChoices(scenario, rng);
    assert.deepEqual(schedule.participants.filter(choice => choice.isCorrect).map(choice => choice.value).sort(), ['Aksel', 'Nora']);
    assert.equal(schedule.times.filter(choice => choice.isCorrect).length, 1);
    assert.equal(schedule.rooms.filter(choice => choice.isCorrect).length, 1);
    slotPositions.add(schedule.times.findIndex(choice => choice.isCorrect));
    roomPositions.add(schedule.rooms.findIndex(choice => choice.isCorrect));

    const approvals = buildApprovalChoices({ hours: [8, 8, 7.5, 8, 6], claimed: 37.5 }, rng);
    assert.equal(approvals.filter(choice => choice.isCorrect).length, 1);
    assert.equal(approvals.find(choice => choice.isCorrect)?.value, 'yes');
    approvalPositions.add(approvals.findIndex(choice => choice.isCorrect));
  }

  assert.ok(slotPositions.size > 1, 'expected the schedule slot button order to vary');
  assert.ok(roomPositions.size > 1, 'expected the schedule room button order to vary');
  assert.ok(approvalPositions.size > 1, 'expected approve/reject order to vary');
});

test('delegation staff order changes while expert identity stays attached', () => {
  const rng = cycleRng(0.85, 0.2, 0.65, 0.1, 0.95, 0.35, 0.55, 0.05);
  const expertPositions = new Set();
  for (let i = 0; i < 6; i++) {
    const staff = buildDelegationStaffChoices([
      { name: 'Mira', skill: 'Spreadsheets' },
      { name: 'Omar', skill: 'Networks' },
      { name: 'Liv', skill: 'Writing' },
    ], rng);
    assert.deepEqual(staff.map(member => member.staffId).sort((a, b) => a - b), [0, 1, 2]);
    expertPositions.add(staff.findIndex(member => member.staffId === 1));
  }
  assert.ok(expertPositions.size > 1, 'expected the correct delegate to move across instances');
});

test('all bosses declare distinct data-driven music ids', () => {
  const ids = BOSSES.map(boss => boss.bossMusic);
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach(id => assert.match(id, /_boss$/));
});
