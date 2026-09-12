const PATH_SAMPLES = [0, 0.25, 0.5, 0.75, 1];
const PROJECTILE_SAMPLES = [0.08, 0.18, 0.3];

export function chooseCombatInput(combat) {
  const { player, boss } = combat;
  if (combat.finished) {
    return { input: { x: 0, z: 0, turn: 0 }, dodgeSide: null, punch: false, yaw: player.yaw };
  }
  const dx = boss.x - player.x;
  const dz = boss.z - player.z;
  const distance = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(-dx, -dz);
  const dangerous = combat.projectiles.length || boss.phase === 'telegraph' || boss.phase === 'attack';
  let best = { score: -Infinity, x: 0, z: 0 };
  for (let candidate = 0; candidate < 17; candidate++) {
    const angle = candidate * Math.PI / 8;
    const wx = candidate === 16 ? 0 : Math.cos(angle);
    const wz = candidate === 16 ? 0 : Math.sin(angle);
    const nx = player.x + wx * 1.4;
    const nz = player.z + wz * 1.4;
    let score = -Math.abs(Math.hypot(boss.x - nx, boss.z - nz) - 2.65) * 2;
    score += (wx * dz - wz * dx) / distance * (dangerous ? 1.8 : 0.2);
    if (Math.abs(nx) > 6.7 || Math.abs(nz) > 6.7) score -= 50;
    for (const h of combat.hazards) {
      const hd = Math.hypot(nx - h.x, nz - h.z);
      if (hd < h.radius + 0.7) score -= 150 + (h.radius + 0.7 - hd) * 100;
      if (h.state === 'open') {
        for (const t of PATH_SAMPLES) {
          if (Math.hypot(player.x + wx * 1.4 * t - h.x, player.z + wz * 1.4 * t - h.z) < h.radius + 0.35) score -= 1000;
        }
      }
    }
    for (const p of combat.projectiles) {
      for (const t of PROJECTILE_SAMPLES) {
        if (Math.hypot(p.x + p.vx * t - player.x - wx * 4 * t, p.z + p.vz * t - player.z - wz * 4 * t) < p.radius + 0.55) score -= 80;
      }
    }
    if (score > best.score) best = { score, x: wx, z: wz };
  }
  let dodgeSide = null;
  if (combat.canDodge && combat.incomingDodgeThreats.length > 0) {
    for (const side of [1, -1]) {
      const sx = Math.cos(yaw) * side * 1.65;
      const sz = -Math.sin(yaw) * side * 1.65;
      const safe = PATH_SAMPLES.every(t =>
        combat.hazards.every(h => Math.hypot(player.x + sx * t - h.x, player.z + sz * t - h.z) > h.radius + 0.4));
      if (safe && Math.abs(player.x + sx) < 6.8 && Math.abs(player.z + sz) < 6.8) {
        dodgeSide = side;
        break;
      }
    }
  }
  return {
    input: {
      x: Math.cos(yaw) * best.x - Math.sin(yaw) * best.z,
      z: Math.sin(yaw) * best.x + Math.cos(yaw) * best.z,
      turn: 0,
    },
    dodgeSide,
    punch: boss.phase === 'recover' && combat.punchCooldown <= 0 && distance <= 3.5,
    yaw,
  };
}
