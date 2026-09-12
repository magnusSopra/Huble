import { NEW_TYPES } from '../src/office-minigames.js';
import { MULTITASK_TYPES, ORIGINAL_TYPES } from '../src/multitask-minigames.js';

export const OFFICE_MINI_TYPES = NEW_TYPES;
export { MULTITASK_TYPES } from '../src/multitask-minigames.js';
export const MINI_TYPES = Object.freeze([...ORIGINAL_TYPES, ...NEW_TYPES, ...MULTITASK_TYPES]);

export function solveOfficeMini(mini) {
  return solveMiniGame(mini);
}

/**
 * Drive an expanded mini-game through its real controls and 60 Hz updates.
 * Works with a standalone view or a live host that disposes it on completion.
 * Does not modify game state, award rewards, or call completion callbacks.
 */
export function solveMiniGame(mini) {
  const type = mini?.task?.type;
  if (!MINI_TYPES.includes(type)) throw new Error(`No mini-game solver for "${type}".`);
  const fail = message => {
    throw new Error(`${type}: ${message} [state=${mini.state}; feedback=${mini.feedback?.textContent || 'none'}]`);
  };
  const completed = () => mini.settled && mini.progress >= mini.config.total && ['success', 'disposed'].includes(mini.state);
  const tick = (dt = 1 / 60) => {
    if (completed()) return;
    if (mini.disposed || mini.state !== 'playing') fail('The game stopped before success.');
    mini.update(dt);
    if (mini.state === 'failed') fail('The task timer ran out.');
  };
  const advance = seconds => {
    for (let time = 0; time < seconds && !completed(); time += 1 / 60) tick(Math.min(1 / 60, seconds - time));
  };
  const waitFor = (predicate, label) => {
    for (let frame = 0; frame < 1500 && !predicate(); frame++) tick();
    if (!predicate()) fail(`Timed out waiting for ${label}.`);
  };
  const control = selector => {
    const element = mini.root.querySelector(selector);
    if (!element || element.disabled) fail(`Missing or disabled control: ${selector}`);
    return element;
  };
  const click = (action, value) => {
    const selector = `[data-action="${action}"]${value === undefined ? '' : `[data-value="${value}"]`}`;
    control(selector).click();
    if (mini.state === 'failed') fail(`Failed after clicking ${action}.`);
    if (mini.state === 'playing') tick();
  };
  const input = (selector, value) => {
    const element = control(selector);
    element.focus({ preventScroll: true });
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    tick();
  };
  const holdSpace = (selector, seconds) => {
    const element = control(selector);
    element.focus({ preventScroll: true });
    element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
    advance(seconds);
    element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
  };

  if (mini.state === 'ready') click('start');
  else if (mini.state !== 'playing' && !completed()) fail('Start or retry the task before solving it.');
  if (completed()) return { type, elapsed: mini.elapsed, remaining: mini.remaining };

  if (type === 'meeting' || type === 'survive' || type === 'phone') {
    for (let frame = 0; frame < 2400 && !completed(); frame++) {
      tick();
      if (completed()) break;
      if (type === 'phone') {
        const status = mini.root.querySelector('.mg-approach-status').textContent;
        const hidden = mini.root.querySelector('[data-action="toggle-phone"]').getAttribute('aria-pressed') === 'true';
        if ((!hidden && status.includes('WALKING TOWARD')) || (hidden && status.includes('safe to read'))) click('toggle-phone');
        if (mini.root.querySelector('.mg-reel-cue').textContent.includes('SCROLL DOWN TO SAVE')) click('scroll');
      } else {
        const question = mini.root.querySelector('.mg-direct-question:not([hidden])');
        if (question) {
          const answer = question.querySelector('.mg-note').textContent.includes('Name an owner')
            ? 'I’ll own the draft and share it today.' : 'Let’s agree the priority and deliver that first.';
          waitFor(() => mini.cooldown === 0, 'the next reply');
          const choice = [...question.querySelectorAll('button')].find(button => button.textContent.includes(answer));
          if (!choice) fail('No answer matches the visible question hint.');
          choice.click();
          tick();
          continue;
        }
        if (mini.root.querySelector('.mg-reel-cue').textContent === 'SCROLL DOWN NOW ↓') click('scroll');
        if (mini.state === 'playing' && mini.root.querySelector('.mg-meeting-cue').textContent === 'NOD NOW ↓') click('primary');
      }
    }
  } else if (type === 'delegate') {
    for (const job of mini.jobs) {
      click('employee', job.expert);
      click('delegate-work');
      waitFor(() => completed() || !mini.departure, 'the employee reaching their job');
    }
  } else if (type === 'ai') {
    click('ask-ai');
    waitFor(() => Boolean(mini.root.querySelector('[data-action="file-ai"]')), 'the offline AI draft');
    click('file-ai');
  } else if (type === 'cv-ai') {
    input('[data-input="ai-provider"]', 'Sonnet');
    click('ask-cv');
    waitFor(() => Boolean(mini.root.querySelector('[data-action="file-cv"]')), 'the polished CV draft');
    click('file-cv');
  } else if (type === 'dodge-meeting') {
    const unavailable = control('[data-input="unavailable"]');
    if (!unavailable.checked) unavailable.click();
    control('[data-input="excuse"][value="client"]').click();
    click('send-excuse');
  } else if (type === 'coffee') {
    for (let pour = 0; pour < 3; pour++) {
      waitFor(() => mini.coffeePosition() >= .45 && mini.coffeePosition() <= .6 && mini.cooldown === 0 && mini.lastPourPass !== Math.floor(mini.elapsed * 2 / Math.PI), 'the next coffee sweet spot');
      click('primary');
    }
  } else if (['repair', 'docs', 'deploy', 'jira', 'email', 'client', 'help', 'sql'].includes(type)) {
    const answers = { repair: [1, 3, 2, 0], docs: [2, 3, 0, 1], deploy: [2, 3, 0, 1], jira: [2, 3, 1, 0] };
    if (answers[type]) {
      for (const answer of answers[type]) { waitFor(() => mini.cooldown === 0, 'the next choice'); click('choose', answer); }
    } else {
      while (!completed()) {
        waitFor(() => mini.cooldown === 0, 'the next choice');
        const prompt = type === 'sql' ? mini.sqlSteps[mini.progress] : mini.dialogues[mini.progress];
        click('choose', prompt.choices.findIndex(choice => choice.isCorrect));
      }
    }
  } else if (type === 'password') {
    if (mini.memoryVisible) click('remember');
    for (const digit of '2413') click('digit', digit);
  } else if (type === 'deadline') {
    for (let request = 0; request < 8; request++) { waitFor(() => mini.cooldown === 0, 'the next request'); click('primary'); }
  } else if (type === 'cables') {
    for (const index of [0, 1, 2, 3]) { click('wire', index); click('socket', index); }
  } else if (type === 'swipe') {
    holdSpace('[data-action="swipe-hold"]', 1.2);
    holdSpace('[data-action="swipe-hold"]', 1.2);
  } else if (type === 'upload') {
    waitFor(() => Boolean(mini.root.querySelector('[data-action="reconnect"]')), 'the first link drop');
    click('reconnect');
    waitFor(() => Boolean(mini.root.querySelector('[data-input="channel"]')), 'the channel calibration');
    input('[data-input="channel"]', 60);
    click('reconnect');
    waitFor(completed, 'the completed upload');
  } else if (type === 'calibrate') {
    for (let frame = 0; frame < 1200 && !completed(); frame++) {
      tick();
      mini.root.querySelectorAll('.mg-gauge-row').forEach((row, index) => {
        const stop = row.querySelector('[data-action="stop-gauge"]');
        const position = parseFloat(row.querySelector('.mg-needle').style.left);
        if (!completed() && !stop.disabled && position >= 45 && position <= 60) click('stop-gauge', index);
      });
    }
  } else if (type === 'empty') {
    holdSpace('[data-action="shred-hold"]', 5.1);
  } else if (type === 'reset') {
    if (mini.root.querySelector('[data-action="hide-reset"]')) click('hide-reset');
    for (const index of [2, 0, 3, 1]) click('reset-key', index);
  } else if (type === 'cv') {
    for (const index of [0, 1, 2, 3]) {
      click('cv-field', index);
      click('cv-fix', mini.cvFields[index].options.findIndex(choice => choice.isCorrect));
    }
  } else if (type === 'timesheet') {
    [8, 8, 7.5, 8, 6].forEach((value, index) => input(`[data-input="hours"][data-index="${index}"]`, value));
    click('submit-hours');
  } else if (type === 'schedule') {
    const wanted = mini.scheduleChoices.participants.filter(choice => choice.isCorrect).map(choice => choice.value);
    for (const choice of mini.scheduleChoices.participants) {
      const name = choice.value;
      const checkbox = control(`[data-input="participant"][value="${name}"]`);
      if (checkbox.checked !== wanted.includes(name)) checkbox.click();
    }
    click('slot', mini.scheduleChoices.times.find(choice => choice.isCorrect).value);
    click('room', mini.scheduleChoices.rooms.find(choice => choice.isCorrect).value);
    click('book');
  } else if (type === 'approve') {
    while (!completed()) {
      click('total');
      click('approve', mini.approvals[mini.progress].choices.find(choice => choice.isCorrect).value);
    }
  } else if (type === 'rename') {
    while (!completed()) click('rename-choice', mini.renameItems[mini.progress].choices.findIndex(choice => choice.isCorrect));
  } else if (type === 'desktop' || type === 'sortmail') {
    mini.sortingItems().forEach((item, index) => { click('select-item', index); click('destination', item.destination); });
  } else if (type === 'spreadsheet') {
    for (const cell of ['D2', 'D4']) {
      click('cell', cell);
      click('formula', mini.sheetSteps[mini.progress].options.findIndex(choice => choice.isCorrect));
    }
  } else if (type === 'requirement') {
    while (!completed()) click('requirement-choice', mini.requirements[mini.progress].choices.findIndex(choice => choice.isCorrect));
  }

  if (!completed()) fail('The controls did not complete the task.');
  return { type, elapsed: mini.elapsed, remaining: mini.remaining };
}
