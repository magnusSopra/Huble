// public/js/main.js
// Landing page: floor selection, mode navigation, leaderboard.

const floorSelect = document.getElementById('floor-select');
const noRoomsWarning = document.getElementById('no-rooms-warning');
const modeGrid = document.getElementById('mode-grid');
const leaderboardMode = document.getElementById('leaderboard-mode');
const leaderboardBody = document.getElementById('leaderboard-body');

let floors = [];

function selectedFloorId() {
  return Number(floorSelect.value);
}

async function checkRooms() {
  const floorId = selectedFloorId();
  if (!floorId) return;
  const rooms = await Api.get(`/api/floors/${floorId}/rooms`);
  noRoomsWarning.style.display = rooms.length === 0 ? 'block' : 'none';
  modeGrid.style.display = rooms.length === 0 ? 'none' : 'grid';
}

async function refreshLeaderboard() {
  const floorId = selectedFloorId();
  if (!floorId) return;
  const params = { mode: leaderboardMode.value, floor_id: floorId, limit: 10 };
  if (leaderboardMode.value === 'daily' || leaderboardMode.value === 'daily_expert') {
    params.challenge_date = new Date().toISOString().slice(0, 10);
  }
  await renderLeaderboard(leaderboardBody, params);
}

async function init() {
  floors = await Api.get('/api/floors');
  if (floors.length === 0) {
    floorSelect.innerHTML = '<option>No floors yet — go to Admin</option>';
    modeGrid.style.display = 'none';
    return;
  }
  floorSelect.innerHTML = floors.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
  localStorage.getItem('officeGlobleFloorId');
  const saved = localStorage.getItem('officeGlobleFloorId');
  if (saved && floors.some((f) => f.id === Number(saved))) floorSelect.value = saved;
  await checkRooms();
  await refreshLeaderboard();
}

floorSelect.addEventListener('change', async () => {
  localStorage.setItem('officeGlobleFloorId', selectedFloorId());
  await checkRooms();
  await refreshLeaderboard();
});
leaderboardMode.addEventListener('change', refreshLeaderboard);

modeGrid.addEventListener('click', (evt) => {
  const card = evt.target.closest('.mode-card');
  if (!card) return;
  const mode = card.dataset.mode;
  const floorId = selectedFloorId();
  if (mode === 'name_to_location') {
    window.location.href = `/name.html?floor=${floorId}`;
  } else {
    window.location.href = `/game.html?mode=${mode}&floor=${floorId}`;
  }
});

init();
