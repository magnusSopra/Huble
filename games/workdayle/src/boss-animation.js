const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// Run after root position/yaw are set. Only child joints animate; head aim
// counter-rotates the torso so the photographic face stays toward the player.
export function animateBoss(mesh, combat, time = 0) {
  const { body, head, arms, legs = [] } = mesh.userData;
  if (!body || !head || !arms) return;
  const { phase, time: phaseTime } = combat.boss;
  mesh.rotation.x = 0;
  mesh.rotation.z = 0;
  body.position.y = 0;
  body.rotation.set(0, 0, 0);
  legs.forEach(leg => { leg.rotation.x = 0; leg.scale.y = 1; });
  arms.forEach((arm, i) => {
    arm.rotation.set(phase === 'attack' ? -1.4 : phase === 'telegraph' ? -0.7 : -0.2 + Math.sin(time * 3 + i) * 0.08, 0, (i ? 1 : -1) * 0.075);
  });

  if (!combat.finished && combat.attack.kind === 'uppercut' && ['telegraph', 'attack', 'recover'].includes(phase)) {
    const charge = phase === 'telegraph' ? smooth(phaseTime / combat.windup) : 1;
    const sweep = phase === 'telegraph' ? 0 : smooth(phaseTime / (combat.uppercutContact + 0.06));
    const recover = phase === 'recover' ? smooth(phaseTime / (combat.attack.recovery || 1.8)) : 0;
    const rise = phase === 'recover' ? 1 : sweep;
    body.position.y = mix(-0.32 * charge, 0.22, rise) * (1 - recover);
    body.rotation.set(
      mix(0.13 * charge, -0.1, rise) * (1 - recover),
      mix(-0.24 * charge, 0.18, rise) * (1 - recover),
      mix(-0.1 * charge, 0.045, rise) * (1 - recover),
    );
    arms[1].rotation.set(
      mix(mix(-0.2, 0.8, charge), -2.85, rise) * (1 - recover) - 0.2 * recover,
      mix(-0.3 * charge, 0.12, rise) * (1 - recover),
      mix(0.2, -0.12, rise) * (1 - recover) + 0.075 * recover,
    );
    arms[0].rotation.x = mix(-0.85 * charge, -1.05, rise) * (1 - recover) - 0.2 * recover;
    const crouch = charge * (1 - rise) * (1 - recover);
    legs.forEach((leg, i) => {
      leg.rotation.x = crouch * (i ? -0.22 : 0.28);
      leg.scale.y = 1 - crouch * 0.22;
    });
  } else {
    body.position.y = Math.sin(time * 3) * 0.012;
    body.rotation.z = phase === 'recover' ? 0.07 : phase === 'telegraph' ? -0.05 : 0;
  }
  head.quaternion.copy(body.quaternion).invert();
}
