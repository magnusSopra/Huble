import * as THREE from 'three';
import { BOSSES, FLOORS } from './content.js';
import { builder, framedDoor, sign, disposeGroup, createCharacter } from './world.js';
import { createSnackRoom } from './interiors.js';

const clamp01 = value => Math.max(0, Math.min(1, value));

function liftHall(index) {
  const group = new THREE.Group(), b = builder();
  group.name = 'promotion-lift-hall';
  const gold = index >= 2 ? '#d4b766' : '#99ab8e';
  b.box(group, index >= 2 ? '#e9e1c7' : '#b8bcae', 0, -0.15, 0, 8, 0.3, 18);
  b.box(group, '#273e33', -4, 1.7, 0, 0.3, 3.4, 18);
  b.box(group, '#273e33', 4, 1.7, 0, 0.3, 3.4, 18);
  b.box(group, '#324439', 0, 1.7, -8, 8, 3.4, 0.3);
  for (const x of [-3.7, 3.7]) b.box(group, gold, x, 0.1, 0, 0.12, 0.08, 18);
  framedDoor(b, group, 0, -7.6, 'PROMOTION LIFT', gold);
  sign(group, 'LESS WORK / MORE RESPONSIBILITY', 0, 3.6, -7.4, 6.5, 0.45);
  return { group, dispose: () => disposeGroup(group) };
}

export class CareerCutscene {
  constructor(game, kind, onFinish) {
    this.game = game;
    this.kind = kind;
    this.onFinish = onFinish;
    this.elapsed = 0;
    this.duration = kind === 'intro' ? 11 : kind === 'snack' ? 8 : 9;
    this.boss = BOSSES[game.state.floor];
    this.finished = false;
    this.cameraOffset = new THREE.Vector3(6, 8, 10);
    this.knocked = false;
    this.revealed = false;
    game.playerMesh.visible = true;
    game.ui.closeModal();
    game.ui.show('toast', false);
    game.ui.toastTime = 0;
    game.ui.show('cinematic-layer', true);
    game.ui.elements['skip-cinematic'].onclick = () => this.finish();
    game.ui.text('cinematic-title', kind === 'intro' ? 'WELCOME TO THE OFFICE'
      : kind === 'snack' ? "JILL'S SNACK KINGDOM" : `${this.boss.name.toUpperCase()} DEFEATED`);
    if (kind === 'intro') {
      game.office.group.visible = true;
      game.playerMesh.visible = false;
      this.host = new THREE.Group();
      this.host.name = 'new-hire-intro';
      this.jill = createCharacter(this.boss.color, true, this.boss);
      this.jill.scale.setScalar(1.08);
      this.jill.position.set(18.2, 0, 1.5);
      this.jill.rotation.y = -Math.PI / 2;
      this.host.add(this.jill);
      game.scene.add(this.host);
      this.cameraPath = [
        { at: 0, from: new THREE.Vector3(-8.2, 6.6, 22), to: new THREE.Vector3(-6, 1.2, 8) },
        { at: 0.28, from: new THREE.Vector3(-21.5, 4.7, -4), to: new THREE.Vector3(-21.5, 1.1, -13.8) },
        { at: 0.56, from: new THREE.Vector3(10.2, 4.9, -1.8), to: new THREE.Vector3(8.5, 1.1, -13.2) },
        { at: 0.82, from: new THREE.Vector3(12.5, 4.1, 7.4), to: new THREE.Vector3(18.2, 1.4, 1.5) },
        { at: 1, from: new THREE.Vector3(14.2, 3.2, 8.6), to: new THREE.Vector3(18.2, 1.4, 1.5) },
      ];
    } else if (kind === 'snack') {
      game.office.group.visible = false;
      if (game.arena) game.arena.group.visible = false;
      this.room = createSnackRoom(this.boss);
      const b = builder();
      b.box(this.room.group, '#74533d', 1.7, 0.85, 0.5, 0.35, 1.7, 0.55);
      sign(this.room.group, "JILL'S DOMAIN", 1.7, 1.95, 0.81, 1.7, 0.35);
      game.scene.add(this.room.group);
      this.photo = this.room.bossMesh.userData.headSurface;
      this.room.bossMesh.visible = false;
    } else {
      this.exit = new THREE.Group();
      framedDoor(builder(), this.exit, 0, 8.4, 'NEXT FLOOR', '#d4b766', Math.PI);
      game.scene.add(this.exit);
      this.origin = new THREE.Vector3(game.combat.player.x, 0, game.combat.player.z);
      game.arena.bossMesh.rotation.z = -0.45;
      game.arena.bossMesh.userData.body.position.y = -0.35;
    }
    game.setMode('cutscene');
    this.update(0);
  }

  walk(mesh, x, z, moving = true) {
    mesh.position.set(x, moving ? Math.abs(Math.sin(this.elapsed * 10)) * 0.035 : 0, z);
    mesh.rotation.z = 0;
    mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(this.elapsed * 10 + i * Math.PI) * 0.4 : 0; });
    mesh.userData.arms.forEach((arm, i) => { arm.rotation.x = moving ? -Math.sin(this.elapsed * 10 + i * Math.PI) * 0.3 : 0; });
  }

  update(dt) {
    if (this.finished) return;
    const game = this.game;
    if (this.photo?.group.userData.photoState === 'loading') {
      game.ui.text('cinematic-line', 'Jill is checking the snack inventory. Loading her portrait...');
      return;
    }
    if (this.photo && this.photo.group.userData.photoState !== 'ready' && !this.photoWarning) {
      this.photoWarning = true;
      game.ui.toast(`Jill's portrait could not load: ${this.photo.group.userData.expectedPath}. See console details.`);
    }
    this.elapsed += dt;
    const t = this.elapsed;
    if (this.kind === 'intro') {
      const progress = clamp01(t / this.duration);
      const segment = this.cameraPath.findLast((keyframe) => progress >= keyframe.at) || this.cameraPath[0];
      const next = this.cameraPath.find((keyframe) => keyframe.at > segment.at) || segment;
      const range = Math.max(0.001, next.at - segment.at);
      const local = clamp01((progress - segment.at) / range);
      game.camera.position.lerpVectors(segment.from, next.from, local);
      game.camera.lookAt(new THREE.Vector3().lerpVectors(segment.to, next.to, local));
      if (this.jill) {
        this.jill.visible = true;
        this.jill.userData.body.rotation.z = Math.sin(t * 1.2) * 0.025;
        this.jill.userData.arms[1].rotation.x = t > 7 ? -1.1 + Math.sin(t * 7) * 0.35 : -0.25;
        this.jill.userData.arms[0].rotation.x = 0.12 + Math.sin(t * 2.1) * 0.08;
        this.jill.userData.head.rotation.y = 0.08 + Math.sin(t * 1.7) * 0.15;
      }
      game.ui.text('cinematic-line',
        t < 2.2 ? 'JILL: "Welcome to the office! You are the new consultant. Please look busy immediately."'
          : t < 4.5 ? 'JILL: "Kitchen there. Meeting rooms there. Bathrooms there. None of them improve the meetings."'
            : t < 7 ? 'JILL: "Your job is simple: attend meetings, answer emails, and pretend to understand the roadmap."'
              : t < 9.2 ? 'JILL: "If anyone asks for a quick favour, say yes. If anyone says “quick meeting”, run."'
                : 'JILL: "Great. You will fit right in. Grab some REP and try not to anger management."');
    } else if (this.kind === 'snack') {
      const boss = this.room.bossMesh;
      boss.visible = true;
      const departing = clamp01((t - 5) / 3);
      this.walk(game.playerMesh, -0.6, 5 - clamp01(t / 1.5) * 2 + departing * 3, t < 1.5 || t > 5);
      game.playerMesh.rotation.y = t > 5 ? 0 : Math.PI;
      this.walk(boss, 1 - departing, -0.5 + departing * 6.5, t > 5);
      boss.rotation.y = 0;
      if (t >= 1.8 && t < 3.4) {
        boss.userData.arms[1].rotation.x = -1.2 + Math.sin(t * 19) * 0.6;
        if (!this.knocked) { game.audio.play('uppercut'); this.knocked = true; }
      }
      game.camera.position.set(7, 6, 11);
      game.camera.lookAt(0, 1, 1);
      game.ui.text('cinematic-line', t < 1.8 ? 'A snack room. Surely nothing political happens here.' : t < 3.4 ? 'JILL: "HEY! GET OUT! This is MY domain!"' : t < 5 ? 'JILL: "If you want to challenge me... COME OUT AND FIGHT."' : 'Follow Jill outside. The candy budget has become a contact sport.');
      this.room.update?.(dt, t);
    } else {
      game.ui.text('cinematic-line', t < 1.8 ? `PROMOTION APPROVED: ${game.state.title.toUpperCase()}. ${this.boss.promotion}` : t < 4 ? 'Performance review concluded. Please leave the arena with your new title.' : t < 7 ? `Going up. ${game.state.complete ? 'CEO ACCESS GRANTED.' : FLOORS[game.state.rank].subtitle}` : `WELCOME, ${game.state.title.toUpperCase()}. Your office has been upgraded.`);
      if (t < 4) {
        const progress = clamp01((t - 1.6) / 2.4);
        this.walk(game.playerMesh, this.origin.x * (1 - progress), THREE.MathUtils.lerp(this.origin.z, 7.4, progress), t > 1.6);
        game.playerMesh.rotation.y = 0;
        game.camera.position.set(5, 4.7, 10);
        game.camera.lookAt(game.playerMesh.position.x, 1, game.playerMesh.position.z - 2);
      } else if (t < 7) {
        if (!this.room) {
          game.arena.group.visible = false;
          this.exit.visible = false;
          this.room = liftHall(game.state.rank);
          game.scene.add(this.room.group);
        }
        this.walk(game.playerMesh, 0, 5 - clamp01((t - 4) / 3) * 11);
        game.playerMesh.rotation.y = Math.PI;
        game.camera.position.set(3, 3.6, game.playerMesh.position.z + 6);
        game.camera.lookAt(0, 1.4, game.playerMesh.position.z - 2);
        game.ui.elements['transition-overlay'].style.opacity = String(clamp01((t - 6.5) * 2));
      } else {
        if (game.state.complete) {
          game.ui.elements['transition-overlay'].style.opacity = String(clamp01((t - 7) / 2));
          if (t >= this.duration) this.finish();
          return;
        }
        if (!this.revealed) {
          this.revealed = true;
          this.room?.dispose();
          this.room = null;
          if (this.exit) { disposeGroup(this.exit); this.exit = null; }
          game.state.changeFloor(game.state.rank);
          game.loadFloor();
          game.ui.elements['transition-overlay'].style.opacity = 1;
        }
        const progress = clamp01((t - 7) / 2);
        this.walk(game.playerMesh, game.state.position.x, game.state.position.z + progress * 2);
        game.playerMesh.rotation.y = 0;
        game.camera.position.copy(game.playerMesh.position).add(this.cameraOffset);
        game.camera.lookAt(game.playerMesh.position.x, 0.8, game.playerMesh.position.z);
        game.ui.elements['transition-overlay'].style.opacity = String(1 - progress);
      }
    }
    if (t >= this.duration) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.kind === 'victory' && this.revealed && !this.game.state.complete) {
      this.game.state.position = { x: this.game.playerMesh.position.x, z: this.game.playerMesh.position.z };
    }
    this.dispose();
    this.onFinish();
  }

  dispose() {
    this.finished = true;
    this.room?.dispose();
    this.room = null;
    if (this.host) {
      disposeGroup(this.host);
      this.host = null;
      this.jill = null;
    }
    if (this.exit) { disposeGroup(this.exit); this.exit = null; }
    this.game.ui.show('cinematic-layer', false);
    this.game.ui.elements['transition-overlay'].style.opacity = 0;
    this.game.playerMesh.userData.body.position.y = 0;
    this.game.playerMesh.visible = true;
  }
}
