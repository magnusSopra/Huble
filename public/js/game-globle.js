// public/js/game-globle.js
// Globle-style mystery room guessing: works for the daily challenge,
// unlimited practice mode, and "Expert Daily" (type the name instead of
// clicking), selected via ?mode=daily|globle|daily_expert&floor=<id>.

const params = new URLSearchParams(window.location.search);
const VALID_MODES = ['daily', 'globle', 'daily_expert'];
const mode = VALID_MODES.includes(params.get('mode')) ? params.get('mode') : 'globle';
const floorId = Number(params.get('floor'));
const todayIso = new Date().toISOString().slice(0, 10);

const DIRECTION_ARROWS = {
  N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️',
};

const MODE_TITLES = {
  daily: '📅 Daily Challenge',
  daily_expert: '🧠 Expert Daily',
  globle: '🔁 Practice Globle',
};

const els = {
  modeTitle: document.getElementById('mode-title'),
  nameCard: document.getElementById('name-card'),
  playerName: document.getElementById('player-name'),
  startBtn: document.getElementById('start-btn'),
  gameArea: document.getElementById('game-area'),
  winBanner: document.getElementById('win-banner'),
  attemptsLabel: document.getElementById('attempts-label'),
  canvasInstructions: document.getElementById('canvas-instructions'),
  canvas: document.getElementById('canvas'),
  feedbackList: document.getElementById('feedback-list'),
  nameGuessForm: document.getElementById('name-guess-form'),
  nameGuessInput: document.getElementById('name-guess-input'),
  nameGuessError: document.getElementById('name-guess-error'),
};

els.modeTitle.textContent = MODE_TITLES[mode];

let renderer = null;
let rooms = [];
let sessionId = null; // practice mode only
let guessedIds = new Set();
let attempts = 0;
let startTime = null;
let finished = false;

async function start() {
  const playerName = els.playerName.value.trim();
  if (!playerName) {
    alert('Please enter your name.');
    return;
  }
  els.nameCard.style.display = 'none';
  els.gameArea.style.display = 'block';

  rooms = await Api.get(`/api/floors/${floorId}/rooms`);
  const floor = await Api.get(`/api/floors/${floorId}`);
  renderer = new MapRenderer(els.canvas, floor, rooms);
  await renderer.load();
  renderer.draw();

  if (mode === 'daily') {
    await Api.get(`/api/floors/${floorId}/daily?date=${todayIso}`);
  } else if (mode === 'daily_expert') {
    await Api.get(`/api/floors/${floorId}/daily-expert?date=${todayIso}`);
  } else {
    const res = await Api.post(`/api/floors/${floorId}/practice/start`);
    sessionId = res.sessionId;
  }

  startTime = Date.now();
  updateAttemptsLabel();

  if (mode === 'daily_expert') {
    // Expert mode: the map is read-only (still shows guessed rooms
    // highlighted), guessing happens by typing the room's name.
    els.canvasInstructions.textContent = "Type the room's exact name to guess.";
    els.nameGuessForm.style.display = 'block';
    els.nameGuessForm.addEventListener('submit', onNameGuessSubmit);
    els.canvas.style.cursor = 'default';
  } else {
    els.canvas.addEventListener('click', onCanvasClick);
  }
}

function updateAttemptsLabel() {
  els.attemptsLabel.textContent = `Guesses: ${attempts}`;
}

async function onCanvasClick(evt) {
  if (finished) return;
  const point = renderer.eventToImagePoint(evt);
  const room = renderer.getRoomAtPoint(point);
  if (!room) return;
  if (guessedIds.has(room.id)) return;
  await processGuess(room);
}

async function onNameGuessSubmit(evt) {
  evt.preventDefault();
  if (finished) return;
  const typed = els.nameGuessInput.value.trim();
  els.nameGuessError.textContent = '';
  if (!typed) return;
  const room = rooms.find((r) => r.name.trim().toLowerCase() === typed.toLowerCase());
  els.nameGuessInput.value = '';
  if (!room) {
    els.nameGuessError.textContent = `No room named "${typed}" on this floor.`;
    return;
  }
  if (guessedIds.has(room.id)) {
    els.nameGuessError.textContent = `You already guessed "${room.name}".`;
    return;
  }
  await processGuess(room);
}

/** Shared guess-processing for both the canvas-click and typed-name
 * inputs: records the attempt, fetches feedback from the right endpoint,
 * updates the map/feedback list, and handles a correct win. */
async function processGuess(room) {
  guessedIds.add(room.id);
  attempts += 1;
  updateAttemptsLabel();

  const body = { guessRoomId: room.id };
  let feedback;
  if (mode === 'daily') {
    feedback = await Api.post(`/api/floors/${floorId}/daily/guess`, { ...body, date: todayIso });
  } else if (mode === 'daily_expert') {
    feedback = await Api.post(`/api/floors/${floorId}/daily-expert/guess`, { ...body, date: todayIso });
  } else {
    feedback = await Api.post(`/api/floors/${floorId}/practice/guess`, { ...body, sessionId });
  }
  addFeedback(feedback);

  if (feedback.correct) {
    finished = true;
    renderer.setRoomStyle(room.id, { fill: 'rgba(51,193,122,0.5)', stroke: '#33c17a', lineWidth: 3 });
    renderer.draw();
    const durationMs = Date.now() - startTime;
    els.winBanner.style.display = 'block';
    els.winBanner.textContent = `🎉 You found it in ${attempts} guess${attempts === 1 ? '' : 'es'} (${formatDuration(durationMs)})!`;
    await Api.post('/api/scores', {
      mode,
      player_name: els.playerName.value.trim(),
      floor_id: floorId,
      room_id: room.id,
      attempts,
      duration_ms: durationMs,
      challenge_date: mode === 'daily' || mode === 'daily_expert' ? todayIso : null,
    });
  } else {
    renderer.setRoomStyle(room.id, { fill: 'rgba(209,67,91,0.35)', stroke: '#d1435b' });
    renderer.draw();
  }
}

function addFeedback(feedback) {
  const div = document.createElement('div');
  div.className = `feedback-item${feedback.correct ? ' correct' : ''}`;
  if (feedback.correct) {
    const capacityNote = feedback.guessRoomCapacity ? ` · Capacity: ${feedback.guessRoomCapacity}` : '';
    div.innerHTML = `<strong>${feedback.guessRoomName}</strong> — ✅ Correct!${capacityNote}`;
  } else {
    const arrow = feedback.direction ? DIRECTION_ARROWS[feedback.direction] || '' : '';
    const directionText = feedback.direction ? `target is to the ${feedback.direction}` : 'target is very close';
    const categoryNote =
      feedback.categoryMatch === null
        ? ''
        : feedback.categoryMatch
          ? ' · Same category ✅'
          : ' · Different category ❌';
    let capacityNote = feedback.guessRoomCapacity ? ` · Capacity: ${feedback.guessRoomCapacity}` : '';
    if (feedback.capacityHint) {
      capacityNote += ` (target is <strong>${feedback.capacityHint}</strong>)`;
    }
    div.innerHTML = `
      <strong>${feedback.guessRoomName}</strong><br />
      <span class="direction">${arrow}</span> ${directionText}${categoryNote}${capacityNote}`;
  }
  els.feedbackList.prepend(div);
}

els.startBtn.addEventListener('click', start);

