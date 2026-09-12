// public/js/game-name-to-location.js
// "Name the Rooms" mode: a room name is shown, player clicks the matching
// room on the map, repeating (in shuffled order) until every room is found.

const params = new URLSearchParams(window.location.search);
const floorId = Number(params.get('floor'));

const els = {
  nameCard: document.getElementById('name-card'),
  playerName: document.getElementById('player-name'),
  startBtn: document.getElementById('start-btn'),
  gameArea: document.getElementById('game-area'),
  winBanner: document.getElementById('win-banner'),
  targetName: document.getElementById('target-name'),
  progressLabel: document.getElementById('progress-label'),
  mistakesLabel: document.getElementById('mistakes-label'),
  canvas: document.getElementById('canvas'),
};

let renderer = null;
let order = [];
let currentIndex = 0;
let mistakes = 0;
let totalClicks = 0;
let startTime = null;
let finished = false;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateLabels() {
  els.progressLabel.textContent = `Room ${currentIndex + 1} of ${order.length}`;
  els.mistakesLabel.textContent = `Mistakes: ${mistakes}`;
}

function showTarget() {
  const room = order[currentIndex];
  els.targetName.textContent = room.name;
  updateLabels();
}

async function start() {
  const playerName = els.playerName.value.trim();
  if (!playerName) {
    alert('Please enter your name.');
    return;
  }
  els.nameCard.style.display = 'none';
  els.gameArea.style.display = 'block';

  const rooms = await Api.get(`/api/floors/${floorId}/rooms`);
  const floor = await Api.get(`/api/floors/${floorId}`);
  renderer = new MapRenderer(els.canvas, floor, rooms);
  await renderer.load();
  renderer.draw();

  order = shuffle(rooms);
  currentIndex = 0;
  startTime = Date.now();
  showTarget();
  els.canvas.addEventListener('click', onCanvasClick);
}

async function onCanvasClick(evt) {
  if (finished) return;
  const point = renderer.eventToImagePoint(evt);
  const room = renderer.getRoomAtPoint(point);
  if (!room) return;
  totalClicks += 1;
  const target = order[currentIndex];

  if (room.id === target.id) {
    renderer.setRoomStyle(room.id, { fill: 'rgba(51,193,122,0.5)', stroke: '#33c17a', lineWidth: 3 });
    renderer.draw();
    currentIndex += 1;
    if (currentIndex >= order.length) {
      finished = true;
      const durationMs = Date.now() - startTime;
      els.winBanner.style.display = 'block';
      els.winBanner.textContent = `🎉 All ${order.length} rooms found! ${mistakes} mistake${mistakes === 1 ? '' : 's'} · ${formatDuration(durationMs)}`;
      await Api.post('/api/scores', {
        mode: 'name_to_location',
        player_name: els.playerName.value.trim(),
        floor_id: floorId,
        attempts: totalClicks,
        duration_ms: durationMs,
      });
      return;
    }
    showTarget();
  } else {
    mistakes += 1;
    updateLabels();
    renderer.setRoomStyle(room.id, { fill: 'rgba(209,67,91,0.35)', stroke: '#d1435b' });
    renderer.draw();
    setTimeout(() => {
      renderer.setRoomStyle(room.id, {});
      renderer.draw();
    }, 400);
  }
}

els.startBtn.addEventListener('click', start);
