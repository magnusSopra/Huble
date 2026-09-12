export const OFFICE_BOUNDS = Object.freeze({ x: 25, z: 19 });
export const OFFICE_SPAWN = Object.freeze({ x: 0, z: 16 });
export const ELEVATOR_SPAWN = Object.freeze({ x: 0, z: -15.5 });

export const NPC_SLOTS = Object.freeze([
  { x: -20, z: 15 }, { x: -8, z: 15 }, { x: 8, z: 15 }, { x: 20, z: 15 },
  { x: -8, z: 0 }, { x: -20, z: 3 }, { x: 8, z: 4 }, { x: 20, z: 4 },
  { x: -20, z: -12 }, { x: -8, z: -14 }, { x: 8, z: -12 }, { x: 20, z: -11 },
  { x: -14, z: 9 }, { x: 2, z: 10 }, { x: 14, z: 10 },
  { x: -6, z: 9 },
].map(Object.freeze));

export const OFFICE_STATIONS = Object.freeze([
  { id: 'coffee', kind: 'coffee', x: -22, z: -16, label: 'Kitchen · coffee machine' },
  { id: 'bathroom', kind: 'bathroom', x: 22, z: -16, label: 'Bathroom' },
  { id: 'elevator', kind: 'elevator', x: 0, z: -17, label: 'Promotion lift' },
  { id: 'boss', kind: 'boss', x: 22, z: 2, label: 'Management office' },
  { id: 'room', kind: 'room', x: 10, z: -16, label: 'FJORD meeting room' },
  { id: 'printer-east', kind: 'printer', x: 20, z: -5, label: 'East printer · PAPER JAM', name: 'East printer', status: 'jammed' },
  { id: 'printer-west', kind: 'printer', x: -20, z: 9, label: 'West printer · OFFLINE', name: 'West printer', status: 'offline' },
  { id: 'printer-working', kind: 'printer', x: -22, z: 0, label: 'Storage printer · READY', name: 'Storage printer', status: 'ready' },
  { id: 'cv-workstation', kind: 'computer', x: -6, z: 2.5, label: 'Computer · update your CV' },
].map(Object.freeze));
