import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PROJECTILE_SLOTS = 16;
const HAZARD_SLOTS = 8;
const AURA_SPARKS = 64;

export class CombatEffects {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'combat-effects';
    scene.add(this.group);
    this.disposed = false;
    this.time = 0;
    this.materials = new Set();
    this.geometries = new Set();
    this.textures = new Map();
    this.target = new THREE.Vector3();
    this.plane = this.geometry(new THREE.PlaneGeometry(1, 1));
    this.sphere = this.geometry(new THREE.IcosahedronGeometry(1, 2));
    this.ring = this.geometry(new THREE.TorusGeometry(1, 0.045, 5, 40));
    this.disc = this.geometry(new THREE.CircleGeometry(1, 48));
    this.warningRing = this.geometry(new THREE.RingGeometry(0.94, 1.12, 48));
    this.candy = this.createCandyGeometry();
    this.candyMaterials = ['#ec689f', '#f1b64a', '#85cfe5'].map(color => this.material({
      color, roughness: 0.32, metalness: 0.15, emissive: color, emissiveIntensity: 0.17,
    }));
    this.auraCore = this.material({ color: '#ffe7a0', emissive: '#efac39', emissiveIntensity: 1.8, roughness: 0.22 });
    this.auraGlow = this.basic({ color: '#ffc95c', transparent: true, opacity: 0.19, depthWrite: false, blending: THREE.AdditiveBlending });
    this.auraRing = this.basic({ color: '#fff0b8', transparent: true, opacity: 0.85, depthWrite: false });
    this.labelMaterials = new Map();
    for (const label of ['404', '-25%', '110%']) this.labelMaterial('number', label);
    for (const label of ['DAILY DIGEST', 'APPS NYTT']) this.labelMaterial('newsletter', label);

    this.projectilePool = Array.from({ length: PROJECTILE_SLOTS }, () => {
      const group = new THREE.Group();
      const parts = Array.from({ length: 3 }, () => new THREE.Mesh(this.sphere, this.auraCore));
      group.add(...parts);
      group.visible = false;
      this.group.add(group);
      return { group, parts };
    });
    this.hazardPool = Array.from({ length: HAZARD_SLOTS }, () => this.createHazard());
    this.cmon = new THREE.Sprite(this.trackMaterial(new THREE.SpriteMaterial({
      map: this.textTexture('signature', 'CMON!!'), transparent: true, depthWrite: false,
    })));
    this.cmon.scale.set(5.8, 2.15, 1);
    this.cmon.visible = false;
    this.group.add(this.cmon);

    this.bossAura = new THREE.Group();
    this.bossAuraShell = new THREE.Mesh(this.sphere, this.basic({
      color: '#e7b553', transparent: true, opacity: 0.08, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.bossAuraRings = [0, 1].map(() => new THREE.Mesh(this.ring, this.basic({
      color: '#f2cf73', transparent: true, opacity: 0.45, depthWrite: false,
    })));
    this.sparkTransform = new THREE.Object3D();
    this.bossAuraSparks = new THREE.InstancedMesh(
      this.geometry(new THREE.OctahedronGeometry(1, 0)),
      this.basic({
        color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
      AURA_SPARKS,
    );
    this.bossAuraSparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bossAuraSparks.frustumCulled = false;
    this.bossAuraSparks.count = 0;
    this.bossAuraSparks.visible = false;
    const sparkColor = new THREE.Color();
    for (let i = 0; i < AURA_SPARKS; i++) {
      sparkColor.setHSL(0.09 + (i % 5) * 0.009, 0.85, 0.58 + (i % 3) * 0.09);
      this.bossAuraSparks.setColorAt(i, sparkColor);
    }
    this.bossAura.add(this.bossAuraShell, ...this.bossAuraRings, this.bossAuraSparks);
    this.bossAura.visible = false;
    this.group.add(this.bossAura);
  }

  geometry(value) { this.geometries.add(value); return value; }
  trackMaterial(value) { this.materials.add(value); return value; }
  material(options) { return this.trackMaterial(new THREE.MeshStandardMaterial(options)); }
  basic(options) { return this.trackMaterial(new THREE.MeshBasicMaterial(options)); }

  createCandyGeometry() {
    const body = new THREE.SphereGeometry(0.2, 10, 7);
    const left = new THREE.ConeGeometry(0.16, 0.19, 5);
    const right = new THREE.ConeGeometry(0.16, 0.19, 5);
    left.rotateZ(-Math.PI / 2);
    left.translate(-0.25, 0, 0);
    right.rotateZ(Math.PI / 2);
    right.translate(0.25, 0, 0);
    const merged = this.geometry(mergeGeometries([body, left, right]));
    for (const part of [body, left, right]) part.dispose();
    return merged;
  }

  textTexture(type, text) {
    const key = `${type}:${text}`;
    if (this.textures.has(key)) return this.textures.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = type === 'number' ? 512 : 384;
    const ctx = canvas.getContext('2d');
    if (type === 'newsletter') {
      ctx.fillStyle = '#fff7e5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#223b34';
      ctx.fillRect(0, 0, 1024, 126);
      ctx.font = '900 88px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff7e5';
      ctx.fillText(text, 512, 94, 960);
      ctx.textAlign = 'left';
      ctx.font = 'bold 29px Arial, sans-serif';
      ctx.fillStyle = '#9c4328';
      ctx.fillText('MANDATORY READING. OPTIONAL SURVIVAL.', 38, 174);
      ctx.fillStyle = '#3d514a';
      for (let column = 0; column < 2; column++) {
        for (let line = 0; line < 5; line++) ctx.fillRect(38 + column * 492, 201 + line * 29, 435 - (line % 3) * 35, 9);
      }
      ctx.strokeStyle = '#c5ae81';
      ctx.lineWidth = 7;
      ctx.strokeRect(4, 4, 1016, 376);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${type === 'signature' ? 240 : 225}px Arial, sans-serif`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = type === 'signature' ? 28 : 20;
      ctx.strokeStyle = '#342414';
      ctx.strokeText(text, 512, canvas.height / 2 + 5, 960);
      ctx.fillStyle = type === 'signature' ? '#fff1b5' : '#ffcd61';
      ctx.fillText(text, 512, canvas.height / 2, 960);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    this.textures.set(key, texture);
    return texture;
  }

  labelMaterial(type, label) {
    const key = `${type}:${label}`;
    if (!this.labelMaterials.has(key)) {
      this.labelMaterials.set(key, this.basic({
        map: this.textTexture(type, label), transparent: type !== 'newsletter',
        side: THREE.DoubleSide, depthWrite: type === 'newsletter', alphaTest: 0.03,
      }));
    }
    return this.labelMaterials.get(key);
  }

  createHazard() {
    const group = new THREE.Group();
    const voidMaterial = this.basic({ color: '#050608', side: THREE.DoubleSide });
    const ringMaterial = this.basic({ color: '#ffc052', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const voidMesh = new THREE.Mesh(this.disc, voidMaterial);
    voidMesh.rotation.x = -Math.PI / 2;
    voidMesh.position.y = 0.085;
    const rim = new THREE.Mesh(this.warningRing, ringMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.105;
    const cracks = [];
    const crackGeometry = this.geometry(new THREE.PlaneGeometry(0.055, 0.34));
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const crack = new THREE.Mesh(crackGeometry, ringMaterial);
      crack.rotation.set(-Math.PI / 2, 0, -angle);
      crack.position.set(Math.sin(angle) * 0.99, 0.115, Math.cos(angle) * 0.99);
      cracks.push(crack);
    }
    const inner = new THREE.Mesh(this.warningRing, this.basic({
      color: '#6941a4', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
    }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.12;
    inner.scale.setScalar(0.58);
    group.add(voidMesh, rim, inner, ...cracks);
    group.visible = false;
    this.group.add(group);
    return { group, voidMesh, rim, inner, cracks, ringMaterial };
  }

  update(combat, dt = 0) {
    if (this.disposed) return;
    if (!combat || combat.finished) { this.reset(); return; }
    this.time += Math.max(0, dt);
    this.target.set(combat.player.x, 1.6, combat.player.z);
    for (let i = 0; i < this.projectilePool.length; i++) {
      const slot = this.projectilePool[i];
      const projectile = combat.projectiles[i];
      slot.group.visible = Boolean(projectile);
      if (!projectile) continue;
      const { group, parts } = slot;
      const type = projectile.type || projectile.kind || 'newsletter';
      group.position.set(projectile.x, projectile.y ?? 1.4, projectile.z);
      group.rotation.set(0, 0, 0);
      group.scale.setScalar(1);
      for (const part of parts) {
        part.visible = false;
        part.position.set(0, 0, 0);
        part.rotation.set(0, 0, 0);
        part.scale.setScalar(1);
      }
      if (type === 'candy') {
        group.rotation.set(this.time * 2, this.time * 1.8, this.time);
        parts.forEach((part, index) => {
          part.visible = true;
          part.geometry = this.candy;
          part.material = this.candyMaterials[index];
          const angle = index * Math.PI * 2 / 3;
          part.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, index === 1 ? 0.12 : -0.06);
          part.rotation.z = angle;
          part.scale.setScalar(0.85);
        });
      } else if (type === 'number' || type === 'newsletter') {
        parts[0].visible = true;
        parts[0].geometry = this.plane;
        // Only the fixed vocabulary is cached, keeping text resources bounded across retries.
        const labels = type === 'number' ? ['404', '-25%', '110%'] : ['DAILY DIGEST', 'APPS NYTT'];
        const label = labels.includes(projectile.label) ? projectile.label : labels[0];
        parts[0].material = this.labelMaterial(type, label);
        parts[0].scale.set(type === 'number' ? 1.25 : 1.8, type === 'number' ? 0.72 : 0.78, 1);
        group.lookAt(this.target);
        parts[0].rotation.z = type === 'newsletter' ? Math.sin(this.time * 7 + projectile.id) * 0.09 : 0;
      } else if (type === 'aura') {
        group.scale.setScalar(projectile.radius || 0.9);
        parts.forEach(part => { part.visible = true; });
        parts[0].geometry = this.sphere;
        parts[0].material = this.auraCore;
        parts[0].scale.setScalar(0.64);
        parts[0].rotation.set(this.time, this.time * 1.8, 0);
        parts[1].geometry = this.sphere;
        parts[1].material = this.auraGlow;
        parts[1].scale.setScalar(1.1 + Math.sin(this.time * 8) * 0.07);
        parts[2].geometry = this.ring;
        parts[2].material = this.auraRing;
        parts[2].rotation.set(this.time * 1.8, this.time * 2, this.time);
      }
    }
    for (let i = 0; i < this.hazardPool.length; i++) {
      const slot = this.hazardPool[i];
      const hazard = combat.hazards?.[i];
      slot.group.visible = Boolean(hazard);
      if (!hazard) continue;
      const open = hazard.state === 'open';
      const pulse = Math.sin(this.time * (open ? 3 : 7));
      slot.group.position.set(hazard.x, 0, hazard.z);
      slot.group.scale.setScalar(hazard.radius);
      slot.voidMesh.visible = open;
      slot.inner.visible = open;
      slot.ringMaterial.color.set(open ? '#ad8bdf' : '#ffc052');
      slot.ringMaterial.opacity = open ? 0.78 : 0.7 + pulse * 0.2;
      slot.rim.scale.setScalar(open ? 1 : 1 + pulse * 0.035);
      slot.inner.scale.setScalar(0.58 + Math.sin(this.time * 2 + i) * 0.13);
      slot.inner.material.opacity = 0.3 + (pulse + 1) * 0.12;
      slot.cracks.forEach((crack, index) => {
        crack.visible = !open || index % 2 === 0;
        crack.scale.y = open ? 0.75 : 0.45 + (hazard.progress || 0) * 0.75;
      });
    }
    const uppercut = combat.attack.kind === 'uppercut';
    this.cmon.visible = uppercut && ['telegraph', 'attack'].includes(combat.boss.phase);
    if (this.cmon.visible) {
      const charge = combat.boss.phase === 'attack' ? 1 : Math.min(1, combat.boss.time / combat.windup);
      this.cmon.position.set(combat.boss.x, 3.3 + charge * 0.4, combat.boss.z);
      const impact = combat.boss.phase === 'attack' ? Math.max(0, 1 - Math.abs(combat.boss.time - combat.uppercutContact) / 0.1) : 0;
      this.cmon.scale.set(4.4 + charge * 2 + impact * 0.45, 1.65 + charge * 0.75 + impact * 0.2, 1);
      this.cmon.material.opacity = 0.6 + charge * 0.4;
    }
    this.bossAura.visible = combat.definition.id === 'kjell_rusti';
    this.bossAuraSparks.visible = this.bossAura.visible;
    this.bossAuraSparks.count = 0;
    if (this.bossAura.visible) {
      const stage = combat.phaseIndex + 1;
      const charging = combat.attack.kind === 'aura' && combat.boss.phase === 'telegraph';
      const charge = charging ? Math.min(1, combat.boss.time / combat.windup) : 0;
      const radius = 0.68 + stage * 0.13 + charge * 0.65;
      this.bossAura.position.set(combat.boss.x, 1.3, combat.boss.z);
      this.bossAuraShell.scale.set(radius, 1.3 + charge * 0.3, radius);
      this.bossAuraShell.material.opacity = 0.025 + stage * 0.015 + charge * 0.14;
      this.bossAuraShell.rotation.y = this.time * 0.5;
      this.bossAuraRings.forEach((ring, index) => {
        ring.position.y = -0.8 + index * 1.45 + Math.sin(this.time * 2 + index) * 0.08;
        ring.rotation.set(Math.PI / 2 + Math.sin(this.time + index) * 0.18, 0, this.time * (index ? -1 : 1));
        ring.scale.setScalar(radius + index * 0.1);
        ring.material.opacity = 0.15 + stage * 0.07 + charge * 0.3;
      });
      this.bossAuraSparks.count = Math.min(AURA_SPARKS, 12 + stage * 8 + Math.floor(charge * 20));
      this.bossAuraSparks.material.opacity = 0.55 + stage * 0.065 + charge * 0.18;
      for (let i = 0; i < this.bossAuraSparks.count; i++) {
        const life = (this.time * (0.34 + (i % 5) * 0.045 + charge * 0.16) + i * 0.618034) % 1;
        const angle = i * 2.399963 + this.time * (0.32 + (i % 3) * 0.07);
        const orbit = radius * (0.8 + Math.sin(i * 1.7 + life * Math.PI) * 0.16);
        const pulse = Math.sin(life * Math.PI) * (0.7 + Math.sin(this.time * 6 + i) * 0.3);
        const size = (0.028 + (i % 3) * 0.01 + charge * 0.025) * pulse;
        this.sparkTransform.position.set(Math.cos(angle) * orbit, -1.15 + life * (2.8 + charge * 0.6), Math.sin(angle) * orbit);
        this.sparkTransform.rotation.set(angle, life * Math.PI, this.time + i);
        this.sparkTransform.scale.set(size, size * (1.7 + charge), size);
        this.sparkTransform.updateMatrix();
        this.bossAuraSparks.setMatrixAt(i, this.sparkTransform.matrix);
      }
      this.bossAuraSparks.instanceMatrix.needsUpdate = true;
    }
  }

  reset() {
    this.time = 0;
    for (const slot of [...this.projectilePool, ...this.hazardPool]) slot.group.visible = false;
    this.cmon.visible = false;
    this.bossAura.visible = false;
    this.bossAuraSparks.visible = false;
    this.bossAuraSparks.count = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.scene.remove(this.group);
    this.bossAuraSparks.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures.values()) texture.dispose();
    this.group.clear();
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
    this.labelMaterials.clear();
  }
}
