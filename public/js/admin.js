// public/js/admin.js
// Admin tool: upload a floor plan image and click-trace room polygons.

let floors = [];
let currentFloor = null;
let rooms = [];
let renderer = null;
let tracing = false;

const els = {
  uploadForm: document.getElementById('upload-form'),
  floorName: document.getElementById('floor-name'),
  floorImage: document.getElementById('floor-image'),
  floorSelect: document.getElementById('floor-select'),
  deleteFloorBtn: document.getElementById('delete-floor-btn'),
  editor: document.getElementById('editor'),
  canvas: document.getElementById('canvas'),
  startTraceBtn: document.getElementById('start-trace-btn'),
  finishTraceBtn: document.getElementById('finish-trace-btn'),
  cancelTraceBtn: document.getElementById('cancel-trace-btn'),
  undoPointBtn: document.getElementById('undo-point-btn'),
  roomList: document.getElementById('room-list'),
  roomCount: document.getElementById('room-count'),
  editModal: document.getElementById('edit-room-modal'),
  editRoomName: document.getElementById('edit-room-name'),
  editCategory: document.getElementById('edit-room-category'),
  editCapacityWrap: document.getElementById('edit-room-capacity-wrap'),
  editCapacity: document.getElementById('edit-room-capacity'),
  editSaveBtn: document.getElementById('edit-room-save-btn'),
  editCancelBtn: document.getElementById('edit-room-cancel-btn'),
};

let editingRoomId = null;

async function refreshFloors(selectId) {
  floors = await Api.get('/api/floors');
  els.floorSelect.innerHTML = floors
    .map((f) => `<option value="${f.id}">${f.name}</option>`)
    .join('');
  if (floors.length === 0) {
    els.editor.style.display = 'none';
    return;
  }
  const idToSelect = selectId || floors[0].id;
  els.floorSelect.value = idToSelect;
  await loadFloor(Number(els.floorSelect.value));
}

async function loadFloor(floorId) {
  currentFloor = floors.find((f) => f.id === floorId);
  if (!currentFloor) return;
  const roomsRaw = await Api.get(`/api/floors/${floorId}/rooms`);
  rooms = roomsRaw;
  renderer = new MapRenderer(els.canvas, currentFloor, rooms);
  await renderer.load();
  renderer.draw();
  els.editor.style.display = 'grid';
  renderRoomList();
  cancelTrace();
}

function renderRoomList() {
  els.roomCount.textContent = rooms.length;
  els.roomList.innerHTML = rooms
    .map(
      (r) => `
      <div class="room-list-item" data-room-id="${r.id}">
        <div><strong>${r.name}</strong>${r.category ? ` <span class="pill">${r.category}</span>` : ''}${r.capacity ? ` <span class="pill">👥 ${r.capacity}</span>` : ''}</div>
        <div class="actions">
          <button class="secondary" data-action="rename">Rename</button>
          <button class="danger" data-action="delete">Delete</button>
        </div>
      </div>`
    )
    .join('');
}

els.roomList.addEventListener('click', async (evt) => {
  const btn = evt.target.closest('button');
  const item = evt.target.closest('.room-list-item');
  if (!item) return;
  const roomId = Number(item.dataset.roomId);
  const room = rooms.find((r) => r.id === roomId);
  if (!btn) {
    // Clicked the row itself (not an action button): open the
    // category/capacity edit modal.
    openEditModal(room);
    return;
  }
  if (btn.dataset.action === 'delete') {
    if (!confirm(`Delete room "${room.name}"?`)) return;
    await Api.del(`/api/rooms/${roomId}`);
    await loadFloor(currentFloor.id);
  } else if (btn.dataset.action === 'rename') {
    const name = prompt('Room name', room.name);
    if (!name) return;
    const category = prompt('Category (optional, e.g. meeting room, kitchen)', room.category || '') || null;
    const capacity = isMeetingRoom(category) ? promptCapacity(room.capacity) : null;
    await Api.put(`/api/rooms/${roomId}`, { name, category, capacity, polygon: room.polygon });
    await loadFloor(currentFloor.id);
  }
});

// --- Category/capacity edit modal ---

function openEditModal(room) {
  editingRoomId = room.id;
  els.editRoomName.textContent = room.name;
  els.editCategory.value = room.category || '';
  els.editCapacity.value = room.capacity != null ? room.capacity : '';
  updateCapacityVisibility();
  els.editModal.style.display = 'flex';
}

function closeEditModal() {
  editingRoomId = null;
  els.editModal.style.display = 'none';
}

function updateCapacityVisibility() {
  const show = isMeetingRoom(els.editCategory.value);
  els.editCapacityWrap.style.display = show ? '' : 'none';
}

els.editCategory.addEventListener('input', updateCapacityVisibility);

els.editCancelBtn.addEventListener('click', closeEditModal);

els.editModal.addEventListener('click', (evt) => {
  if (evt.target === els.editModal) closeEditModal();
});

document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && els.editModal.style.display !== 'none') closeEditModal();
});

els.editSaveBtn.addEventListener('click', async () => {
  if (editingRoomId == null) return;
  const room = rooms.find((r) => r.id === editingRoomId);
  if (!room) return;
  const category = els.editCategory.value.trim() || null;
  const capacity = isMeetingRoom(category)
    ? (Number.isInteger(parseInt(els.editCapacity.value, 10)) && parseInt(els.editCapacity.value, 10) > 0
      ? parseInt(els.editCapacity.value, 10)
      : null)
    : null;
  closeEditModal();
  await Api.put(`/api/rooms/${room.id}`, { name: room.name, category, capacity, polygon: room.polygon });
  await loadFloor(currentFloor.id);
});


els.floorSelect.addEventListener('change', () => loadFloor(Number(els.floorSelect.value)));

els.deleteFloorBtn.addEventListener('click', async () => {
  if (!currentFloor) return;
  if (!confirm(`Delete floor "${currentFloor.name}" and all its rooms?`)) return;
  await Api.del(`/api/floors/${currentFloor.id}`);
  currentFloor = null;
  await refreshFloors();
});

els.uploadForm.addEventListener('submit', async (evt) => {
  evt.preventDefault();
  const file = els.floorImage.files[0];
  if (!file) return;
  const dims = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
  const form = new FormData();
  form.append('image', file);
  form.append('name', els.floorName.value);
  form.append('width', dims.width);
  form.append('height', dims.height);
  const floor = await Api.postForm('/api/floors', form);
  els.uploadForm.reset();
  await refreshFloors(floor.id);
});

// --- Polygon tracing ---

function startTrace() {
  tracing = true;
  renderer.tracePoints = [];
  els.startTraceBtn.disabled = true;
  els.finishTraceBtn.disabled = false;
  els.cancelTraceBtn.disabled = false;
  els.undoPointBtn.disabled = false;
}

function cancelTrace() {
  tracing = false;
  if (renderer) renderer.tracePoints = null;
  els.startTraceBtn.disabled = false;
  els.finishTraceBtn.disabled = true;
  els.cancelTraceBtn.disabled = true;
  els.undoPointBtn.disabled = true;
  if (renderer) renderer.draw();
}

els.startTraceBtn.addEventListener('click', startTrace);
els.cancelTraceBtn.addEventListener('click', cancelTrace);

els.undoPointBtn.addEventListener('click', () => {
  if (!tracing || !renderer.tracePoints) return;
  renderer.tracePoints.pop();
  renderer.draw();
});

els.finishTraceBtn.addEventListener('click', finishTrace);

async function finishTrace() {
  if (!tracing || !renderer.tracePoints || renderer.tracePoints.length < 3) {
    alert('Trace at least 3 points to form a room outline.');
    return;
  }
  const name = prompt('Room name');
  if (!name) return;
  const category = prompt('Category (optional, e.g. meeting room, kitchen)') || null;
  const capacity = isMeetingRoom(category) ? promptCapacity() : null;
  const polygon = renderer.tracePoints;
  cancelTrace();
  await Api.post(`/api/floors/${currentFloor.id}/rooms`, { name, category, capacity, polygon });
  await loadFloor(currentFloor.id);
}

/** Case-insensitive check for whether a room category is a meeting room. */
function isMeetingRoom(category) {
  return !!category && /meeting/i.test(category);
}

/** Prompt for a meeting room's capacity (number of people); returns an
 * integer or null if left blank/invalid. */
function promptCapacity(existingValue) {
  const raw = prompt('Capacity (number of people)', existingValue != null ? String(existingValue) : '');
  if (raw === null || raw.trim() === '') return null;
  const value = parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

els.canvas.addEventListener('click', (evt) => {
  if (!tracing || !renderer) return;
  const point = renderer.eventToImagePoint(evt);
  const points = renderer.tracePoints;

  // Clicking near the first placed point closes the polygon (same as
  // pressing "Finish room") instead of adding a new, redundant point.
  if (points.length >= 3) {
    const closeThreshold = renderer.screenPxToImagePx(10);
    const first = points[0];
    const dist = Math.hypot(point.x - first.x, point.y - first.y);
    if (dist <= closeThreshold) {
      finishTrace();
      return;
    }
  }

  points.push(point);
  renderer.draw();
});

refreshFloors();
