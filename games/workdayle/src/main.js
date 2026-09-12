import * as THREE from 'three';
import './style.css';
import './expansion.css';
import './iteration4.css';
import { FLOORS, BOSSES, TITLES } from './content.js';
import { GameState, SAVE_KEY, parseSave, moveWithCollisions, hasClearPath, clamp } from './state.js';
import { Combat } from './combat.js';
import { CombatEffects } from './combat-effects.js';
import { animateBoss } from './boss-animation.js';
import { GameAudio } from './audio.js';
import { createOffice, createCharacter, createArena } from './world.js';
import { MiniGame } from './minigames.js';
import { UI, icon } from './ui.js';
import { OFFICE_SPAWN } from './layout.js';
import { RunClock, BEST_KEY, formatTime } from './run.js';
import { CorporateEnding } from './ending.js';
import { createBathroom, createSecretRoom } from './interiors.js';
import { CEOParade } from './ceo-parade.js';
import { createCEOOffice, CEO_BUTTONS } from './ceo-office.js';
import { OfficeLife } from './office-life.js';
import { DeveloperMode } from './developer-mode.js';
import { CareerCutscene } from './career-cutscene.js';

class Workdayle {
  constructor(renderer) {
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e8ebe5');
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight('#fff8e5', '#b1c0ac', 2.4));
    this.sun = new THREE.DirectionalLight('#fff4da', 3.1);
    this.sun.position.set(-10, 24, 12);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -23, right: 23, top: 23, bottom: -23, near: 1, far: 65 });
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.bias = -0.0002;
    this.scene.add(this.sun);
    this.audio = new GameAudio();
    this.state = new GameState();
    this.mode = 'title';
    this.keys = new Set();
    this.time = 0;
    this.lastFrame = 0;
    this.saveClock = 0;
    this.storageError = false;
    this.quest = null;
    this.nearest = null;
    this.combat = null;
    this.arena = null;
    this.mini = null;
    this.follow = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(7.3, 11.3, 9.3);
    this.ui = new UI(document.getElementById('app'), {
      sound: () => {
        this.audio.start();
        this.audio.muted = !this.audio.muted;
        this.ui.elements.sound.style.opacity = this.audio.muted ? '0.4' : '1';
        this.ui.elements.sound.setAttribute('aria-label', this.audio.muted ? 'Unmute audio' : 'Mute audio');
        this.ui.text('parade-sound', this.audio.muted ? 'Unmute music' : 'Mute music');
        this.ui.toast(this.audio.muted ? 'Quiet quitting: audio off.' : 'Office soundtrack: on.');
        if (this.audio.hasCEOTrack() && !this.audio.muted) this.audio.resumeCEO();
      },
      pause: () => this.togglePause(),
      stats: () => this.toggleStats(),
      testMode: () => this.openTestMode(),
    });
    this.saved = this.readSave();
    if (this.saved) this.state = new GameState(this.saved);
    this.run = new RunClock(this.state);
    this.life = new OfficeLife(this);
    this.developer = new DeveloperMode(this);
    this.bestTime = this.readBest();
    this.ui.text('best-time', this.bestTime === null ? 'PB --:--' : `PB ${formatTime(this.bestTime)}`);
    this.playerMesh = createCharacter('#567763');
    const playerHalo = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.5, 32),
      new THREE.MeshBasicMaterial({ color: '#86ac49', side: THREE.DoubleSide }));
    playerHalo.rotation.x = -Math.PI / 2;
    playerHalo.position.y = 0.05;
    this.playerMesh.add(playerHalo);
    this.scene.add(this.playerMesh);
    this.makeCombatEffects();
    this.loadFloor();
    this.installControls();
    this.welcome();
    this.resize();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  enterBathroom() {
    this.bathroomReturn = { office: this.office, position: { ...this.state.position } };
    this.office.group.visible = false;
    this.office = createBathroom(this.state.floor === 4, { floor: this.state.floor, collected: this.state.collectibles });
    this.scene.add(this.office.group);
    this.state.position = { ...this.office.spawn };
    this.roomChanged();
    this.ui.text('floor-title', this.state.floor === 4 ? 'Executive relief.' : 'A private moment.');
    this.ui.text('floor-subtitle', 'Actual walls. Zero stakeholders.');
    this.ui.toast('Bathroom entered. Find a toilet to resolve the internal matter.');
    if (this.state.officeLife.emergency !== null) this.life.relieve();
    this.save();
  }

  leaveBathroom() {
    const previous = this.bathroomReturn;
    this.office.dispose();
    this.office = previous.office;
    this.state.position = previous.position;
    this.bathroomReturn = null;
    this.office.group.visible = true;
    this.ui.floor(this.state.floor);
    this.roomChanged();
    this.save();
  }

  enterSecret() {
    this.secretReturn = { office: this.office, position: { ...this.state.position } };
    this.office.group.visible = false;
    this.office = createSecretRoom();
    this.scene.add(this.office.group);
    this.state.position = { ...this.office.spawn };
    this.roomChanged();
    this.ui.text('floor-title', 'The source of synergy.');
    this.ui.text('floor-subtitle', 'This room was not in the onboarding slides.');
    this.save();
  }

  leaveSecret() {
    const previous = this.secretReturn;
    this.office.dispose();
    this.office = previous.office;
    this.state.position = previous.position;
    this.secretReturn = null;
    this.office.group.visible = true;
    this.ui.floor(this.state.floor);
    this.roomChanged();
    this.save();
  }

  roomChanged() {
    this.nearest = null;
    this.follow.set(this.state.position.x, 0, this.state.position.z);
    this.doorFade = 0.5;
    this.ui.elements['transition-overlay'].style.opacity = 0.9;
    this.returnToOffice();
    this.updateOffice(0);
  }

  readSave() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      return data ? parseSave(data) : null;
    } catch (error) {
      console.warn('Workdayle could not load the local save:', error);
      this.ui.toast('Saved progress could not be loaded. You can start a new career.');
      return null;
    }
  }

  save() {
    if (this.testing) { this.ui.text('save-status', 'TEST MODE: saving disabled'); return; }
    if (this.mode === 'title') return;
    this.run.sync();
    try {
      const saved = this.state.serialize();
      if (this.bathroomReturn) saved.position = { ...this.bathroomReturn.position };
      if (this.secretReturn) saved.position = { ...this.secretReturn.position };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
      this.ui.text('save-status', 'Progress saved locally');
    } catch (error) {
      if (!this.storageError) {
        console.warn('Workdayle cannot save progress:', error);
        this.ui.toast('Browser storage is unavailable. Progress lasts for this visit only.');
        this.storageError = true;
      }
      this.ui.text('save-status', 'Saving unavailable in this browser');
    }
  }

  readBest() {
    try {
      const text = localStorage.getItem(BEST_KEY);
      if (!text) return null;
      const record = JSON.parse(text);
      if (record.version !== 2 || !Number.isFinite(record.time) || record.time < 0) throw new Error('Invalid speedrun record.');
      return record.time;
    } catch (error) {
      console.warn('Workdayle could not read the personal best:', error);
      this.ui.toast('Your personal best could not be loaded. Career progress is separate.');
      return null;
    }
  }

  recordResult() {
    if (this.testing) { this.newRecord = false; return; }
    const result = this.state.result;
    this.newRecord = !result.legacy && (this.bestTime === null || result.time < this.bestTime);
    if (!this.newRecord) return;
    this.bestTime = result.time;
    this.ui.text('best-time', `PB ${formatTime(this.bestTime)}`);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify({ version: 2, time: result.time }));
    } catch (error) {
      console.warn('Workdayle could not save the personal best:', error);
      this.ui.text('save-status', 'Personal best could not be saved');
    }
  }

  welcome() {
    const modal = this.ui.modal(`
      <div class="eyebrow">WELCOME TO YOUR FIRST DAY <span>EST. 09:00</span></div>
      <h2 id="modal-title">Big ambitions.<br>Small <em>pay rise.</em></h2>
      <p>You are the new consultant at Sopra Steria Stavanger. Do the work. Earn a reputation. Literally fight your way up the corporate ladder.</p>
      <div class="welcome-stamp"><div><strong>01 / AVOID THE WORK</strong><br>${FLOORS.reduce((sum, floor) => sum + floor.tasks.length, 0)} favours. Increasingly delegated.</div><div><strong>02 / BEAT THE CLOCK</strong><br>Four bosses. One corner office.</div></div>
      <div class="modal-footer"><button id="begin" class="primary full-width">${this.saved ? 'Continue your career' : 'Clock in. Cause problems.'}${icon('arrow')}</button></div>
      ${this.saved ? '<button id="fresh" class="secondary full-width" style="margin-top:10px">Start a new career</button>' : ''}
      <div class="welcome-small">WASD TO MOVE &nbsp; / &nbsp; E TO INTERACT &nbsp; / &nbsp; FICTIONALIZED OFFICE COMEDY</div>
      ${this.state.legacy ? '<p class="welcome-small">Original career preserved. Start a new career for the four-boss speedrun.</p>' : ''}
    `, 'welcome');
    modal.querySelector('#begin').onclick = () => this.start(false);
    modal.querySelector('#fresh')?.addEventListener('click', () => this.confirmRestart());
  }

  start(fresh) {
    this.audio.start();
    if (fresh) {
      if (this.testing) { this.developer.reset(0); return; }
      this.developer.cleanup();
      this.run.mode('title');
      this.ending?.dispose();
      this.ending = null;
      this.parade?.dispose();
      this.parade = null;
      this.audio.stopCEO();
      this.state = new GameState();
      this.run = new RunClock(this.state);
      this.quest = null;
      this.effects.reset();
      this.loadFloor();
    }
    if (this.state.officeLife.gameOver) { this.life.gameOver(this.state.officeLife.gameOver); return; }
    if (this.state.officeLife.active) { this.life.present(this.state.officeLife.active); return; }
    if (this.state.complete && this.state.floor !== FLOORS.length - 1) {
      this.state.changeFloor(FLOORS.length - 1);
      this.loadFloor();
    }
    if (!this.state.complete && !this.state.introSeen && this.state.rank === 0
      && this.state.floor === 0 && this.state.completed.size === 0 && this.state.elapsed === 0) {
      this.startNewHireIntro();
      return;
    }
    this.setMode('office');
    this.ui.closeModal();
    this.ui.toast(this.state.complete ? 'Welcome back, CEO. The inbox missed you.' : 'Find the green markers. Press E to make yourself useful.');
    this.refreshObjective();
    this.save();
  }

  setMode(mode) {
    this.run.mode(mode);
    this.mode = mode;
    this.keys.clear();
    this.ui.hint(null);
    if (mode !== 'combat' && document.pointerLockElement) document.exitPointerLock();
    this.ui.update(this.state, mode, 0);
    this.resize();
  }

  loadFloor() {
    if (this.secretReturn) {
      this.secretReturn.office.dispose();
      this.secretReturn = null;
    }
    if (this.bathroomReturn) {
      this.bathroomReturn.office.dispose();
      this.bathroomReturn = null;
    }
    if (this.office) {
      this.scene.remove(this.office.group);
      this.office.dispose();
    }
    this.office = this.state.floor === FLOORS.length - 1
      ? createCEOOffice() : createOffice(FLOORS[this.state.floor], this.state.floor, { completed: this.state.completed, collected: this.state.collectibles });
    if (Math.abs(this.state.position.x) > this.office.bounds.x || Math.abs(this.state.position.z) > this.office.bounds.z
      || this.office.colliders.some(c => Math.abs(c.x - this.state.position.x) < c.w / 2 + 0.34 && Math.abs(c.z - this.state.position.z) < c.d / 2 + 0.34)) {
      this.state.position = { ...(this.office.spawn ?? OFFICE_SPAWN) };
      this.ui.toast('The office has been rearranged. You are back at reception; your career is safe.');
    }
    this.scene.add(this.office.group);
    this.playerMesh.visible = true;
    if (this.arena) this.arena.group.visible = false;
    this.scene.background.set('#e8ebe5');
    this.sun.intensity = 3.1;
    this.ui.floor(this.state.floor);
    this.follow.set(this.state.position.x, 0, this.state.position.z);
    this.camera.position.copy(this.follow).add(this.cameraOffset);
    this.camera.lookAt(this.follow);
    this.updateMarkers();
    this.refreshObjective();
  }

  updateMarkers() {
    for (const item of this.office.interactables) {
      if (item.kind === 'npc' && item.marker) item.marker.visible = !this.state.isDone(item.npc.task);
    }
  }

  refreshObjective() {
    if (this.state.officeLife.emergency !== null) this.ui.objective('GET TO THE BATHROOM.', 'Twenty seconds. Sprint with SHIFT; press E at the WC door.');
    else if (this.state.officeLife.cvPending !== null) this.ui.objective('CV STATUS: YELLOW.', `Find the CV workstation on ${FLOORS[this.state.officeLife.cvPending].name}. Ask AI to fix it.`);
    else if (this.quest) this.ui.objective(`Find ${this.quest.destinationName}.`, this.quest.type === 'printer' ? 'Check the printer stations. Only a READY printer will do.' : 'Follow the FJORD room signs. Press E inside, not through a wall.');
    else if (this.bathroomReturn) this.ui.objective('An internal matter.', 'Use the toilet, wash your hands, then leave through the door.');
    else if (this.state.complete) this.ui.objective('Enjoy the corner office.', 'Your time is final. Explore the trophies, controls and executive facilities.');
    else if (this.state.floor < this.state.rank) this.ui.objective('Onwards and upwards.', 'Your promotion unlocked the next floor. Find the lift.');
    else if (this.state.bossReady) this.ui.objective(`${BOSSES[this.state.floor].name} is waiting.`, 'Performance review unlocked. Follow the MANAGEMENT signs.');
    else this.ui.objective('Make yourself useful.', `Complete colleague tasks. Earn ${FLOORS[this.state.floor].threshold} REP to challenge your boss.`);
  }

  installControls() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', event => {
      if (event.code === 'F2') {
        event.preventDefault();
        if (!event.repeat) this.openTestMode();
        return;
      }
      if ((event.code === 'Tab' && this.mode === 'office' && !event.shiftKey && [document.body, this.canvas].includes(document.activeElement))
        || (event.code === 'KeyM' && !event.target.matches?.('input,textarea,select') && ['office', 'combat', 'paused'].includes(this.mode))) {
        event.preventDefault();
        if (!event.repeat) this.toggleStats();
        return;
      }
      if (event.code === 'Escape') {
        event.preventDefault();
        if (this.mode === 'test-menu' || this.mode === 'test-confirm') this.developer.close();
        else if (this.mode === 'event') this.life.dismiss();
        else if (this.mode === 'cutscene') this.cutscene.finish();
        else if (this.mode === 'ending') this.ending.finish();
        else if (this.mode === 'parade') this.parade.finish();
        else if (this.mode === 'reveal') this.showFinalResults();
        else if (this.mode === 'results') this.enjoyOffice();
        else if (this.mode === 'minigame') this.cancelMini();
        else if (this.mode === 'dialogue' || this.mode === 'elevator') this.returnToOffice();
        else this.togglePause();
        return;
      }
      if (event.target instanceof Element && event.target.matches('input, textarea, select')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'KeyE' && this.mode === 'office') this.interact();
      if (this.mode === 'combat') {
        if (event.code === 'Space') this.combat.dodge(this.keys.has('KeyA') ? -1 : 1);
        if (event.code === 'KeyF') this.combat.punch();
      }
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      if (['office', 'combat', 'minigame', 'parade', 'reveal', 'cutscene', 'intro'].includes(this.mode)) this.togglePause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && ['office', 'combat', 'minigame', 'parade', 'reveal', 'cutscene', 'intro'].includes(this.mode)) this.togglePause();
    });
    window.addEventListener('beforeunload', () => this.save());
    this.canvas.addEventListener('mousedown', event => {
      if (this.mode !== 'combat') return;
      if (event.button === 2) { this.combat.dodge(this.keys.has('KeyA') ? -1 : 1); return; }
      if (event.button !== 0) return;
      if (!document.pointerLockElement) {
        const result = this.canvas.requestPointerLock?.();
        result?.catch(error => {
          console.info('Pointer lock unavailable; keyboard look remains available.', error.message);
          this.ui.toast('Mouse capture unavailable. Use Q / R to turn and F to punch.');
        });
      }
      this.combat.punch();
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('mousemove', event => {
      if (this.mode === 'combat' && document.pointerLockElement === this.canvas) {
        this.combat.player.yaw -= event.movementX * 0.0025;
        this.pitch = clamp((this.pitch || 0) - event.movementY * 0.002, -0.45, 0.45);
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.ui.show('lock-hint', !document.pointerLockElement);
    });
  }

  resize() {
    const combat = this.mode === 'combat' || this.mode === 'intro' || (this.mode === 'paused' && ['combat', 'intro'].includes(this.pauseFrom));
    const cinematic = ['parade', 'reveal', 'cutscene'].includes(this.mode);
    const top = cinematic ? 0 : window.innerWidth <= 760 ? 64 : 78;
    const side = combat || cinematic || this.statsClosed ? 0 : window.innerWidth <= 760 ? 180 : window.innerWidth <= 1100 ? 250 : 284;
    this.renderer.setSize(Math.max(1, window.innerWidth - side), Math.max(1, window.innerHeight - top), false);
    this.camera.aspect = (window.innerWidth - side) / (window.innerHeight - top);
    this.camera.fov = combat ? 70 : cinematic ? 58 : (this.camera.aspect < 1 ? 57 : 42);
    this.camera.updateProjectionMatrix();
  }

  toggleStats() {
    this.statsClosed = !this.statsClosed;
    document.body.classList.toggle('stats-closed', this.statsClosed);
    this.ui.elements['stats-toggle'].setAttribute('aria-expanded', String(!this.statsClosed));
    this.ui.text('stats-toggle', this.statsClosed ? 'Show stats' : 'Hide stats');
    this.resize();
  }

  openTestMode() { this.developer.open(); }

  interact() {
    const item = this.nearest;
    if (!item) { this.ui.toast('Get a little closer to a colleague or office station.'); return; }
    this.audio.play('click');
    if (this.state.officeLife.emergency !== null && !['bathroom', 'exit-secret', 'exit-bathroom', 'toilet'].includes(item.kind)) {
      this.ui.toast('No time for side quests. GET TO THE BATHROOM!');
      return;
    }
    if (item.kind === 'npc') {
      const npc = item.npc;
      if (this.state.isDone(npc.task)) { this.ui.toast(`${npc.name}: "Thanks! I have put your contribution in a slide."`); return; }
      this.setMode('dialogue');
      const modal = this.ui.modal(`
        <div class="dialogue-person"><span class="person-initial">${npc.name[0]}</span><div><strong>${npc.name}</strong><small>${npc.role}</small></div></div>
        <p class="dialogue-quote">${npc.dialogue}</p>
        <section class="task-offer"><div class="micro">A SMALL FAVOUR</div><h3 id="modal-title">${npc.task.title}</h3><p>${npc.task.description}</p><div class="reward"><span>+${npc.task.reward} REP</span><span>${npc.task.type === 'coffee' ? '+35 ENERGY / +25 BATHROOM' : `-${npc.task.energyCost} ENERGY`}</span></div></section>
        ${this.state.energy < npc.task.energyCost ? '<p>Energy too low. A coffee break restores 35 energy.</p>' : ''}
        <div class="modal-footer"><button id="accept" class="primary" ${this.state.energy < npc.task.energyCost ? 'disabled' : ''}>I am on it ${icon('arrow')}</button><button id="leave" class="secondary">Not right now</button></div>
      `);
      modal.querySelector('#accept').onclick = () => {
        if (npc.task.destination) {
          this.quest = npc.task;
          this.returnToOffice();
          this.ui.toast(`Find ${npc.task.destinationName}. Follow the signs and check the rooms.`);
        } else this.startMini(npc.task);
      };
      modal.querySelector('#leave').onclick = () => this.returnToOffice();
    } else if (item.kind === 'coffee') {
      this.startMini({ id: 'coffee-break', type: 'coffee', title: 'A well-earned coffee break', description: 'Brew a coffee. Restore 35 energy. Create one new problem.', reward: 0, energyCost: 0 }, true);
    } else if (item.kind === 'bathroom') {
      this.enterBathroom();
    } else if (item.kind === 'exit-bathroom') {
      this.leaveBathroom();
    } else if (item.kind === 'toilet') {
      this.life.relieve();
      this.ui.toast('Private meeting concluded. Bathroom need: 0. Dignity: restored.');
      this.audio.play('success');
      this.save();
    } else if (item.kind === 'sink') {
      this.ui.toast('Hands washed. Corporate conscience remains a separate ticket.');
      this.audio.play('success');
    } else if (item.kind === 'computer') this.life.workstation();
    else if (item.kind === 'collectible' || item.kind === 'camera') {
      if (item.kind === 'camera' && !this.state.collectibles.has(item.collectionId)) {
        this.setMode('dialogue');
        const modal = this.ui.modal('<div class="eyebrow">FICTIONAL CORPORATE SURVEILLANCE</div><h2 id="modal-title">WAIT... WHY IS THERE A CAMERA HERE?</h2><p>A cartoon camera is hiding in the bathroom fixture. Apparently someone misunderstood “performance monitoring”.</p><div class="modal-footer"><button id="destroy-camera" class="primary">DESTROY CAMERA</button><button id="leave-camera" class="secondary">Step away</button></div>');
        modal.querySelector('#destroy-camera').onclick = () => { this.returnToOffice(); this.life.collect(item); };
        modal.querySelector('#leave-camera').onclick = () => this.returnToOffice();
      } else this.life.collect(item);
    } else if (item.kind === 'secret-door') this.enterSecret();
    else if (item.kind === 'exit-secret') this.leaveSecret();
    else if (item.kind === 'easter-egg') this.ui.toast(item.message);
    else if (item.kind === 'ceo') {
      if (item.id === 'buttons') this.openCEOControls();
      else {
        this.ui.toast(this.office.interact(item.id));
        if (item.id === 'coffee') this.state.drinkCoffee();
        if (item.id === 'jacuzzi') this.state.energy = 100;
        if (item.id === 'coffee' || item.id === 'jacuzzi') this.save();
        this.audio.play(item.id === 'ferrari' ? 'uppercut' : 'success');
      }
    } else if (item.kind === 'elevator') this.elevator();
    else if (item.kind === 'boss') this.bossDoor();
    else if (item.kind === 'room') {
      if (this.quest?.destination === item.id) { const task = this.quest; this.quest = null; this.finishTask(task); }
      else this.ui.toast('FJORD meeting room. Occupancy: one meeting that could have been an email.');
    } else if (item.kind === 'printer') {
      if (this.quest?.destination === item.id) {
        const task = this.quest;
        this.quest = null;
        this.finishTask(task);
      } else this.ui.toast(item.id === 'printer-working' ? 'READY. A printer with an actual work ethic.' : `${item.label}. Try another printer. This one is working from home.`);
    }
  }

  openCEOControls() {
    this.setMode('dialogue');
    const modal = this.ui.modal(`
      <div class="eyebrow">EXECUTIVE ACCESS / NO ADULT SUPERVISION</div>
      <h2 id="modal-title">An unreasonable number of buttons.</h2>
      <p>Some change the office. Others only change your opinion of yourself.</p>
      <div class="ceo-buttons">${CEO_BUTTONS.map(button => `<button type="button" data-ceo-button="${button.id}">${button.label.toUpperCase()}</button>`).join('')}</div>
      <p class="ceo-panel-feedback" role="status" aria-live="polite">${this.office.interact('buttons')}</p>
      <button id="leave" class="secondary full-width">Return to my empire</button>
    `);
    modal.querySelectorAll('[data-ceo-button]').forEach(button => {
      button.onclick = () => {
        modal.querySelector('.ceo-panel-feedback').textContent = this.office.interact(button.dataset.ceoButton);
        this.audio.play('click');
      };
    });
    modal.querySelector('#leave').onclick = () => this.returnToOffice();
  }

  startMini(task, coffeeBreak = false, onComplete = null) {
    this.setMode('minigame');
    this.activeTask = task;
    this.activeCoffeeBreak = coffeeBreak;
    this.activeMiniComplete = onComplete;
    const modal = this.ui.modal('<div id="mini-container"></div>', 'minigame-modal');
    this.mini = new MiniGame(modal.querySelector('#mini-container'), task, {
      sound: name => this.audio.play(name),
      onCancel: () => this.cancelMini(),
      onComplete: () => {
        this.mini?.dispose();
        this.mini = null;
        if (onComplete) { this.activeMiniComplete = null; onComplete(); }
        else if (coffeeBreak) {
          this.state.drinkCoffee();
          this.returnToOffice();
          this.ui.toast('+35 ENERGY / +25 BATHROOM NEED. A balanced business decision.');
          this.audio.play('success');
          this.save();
        } else this.finishTask(task);
      },
    });
  }

  cancelMini() {
    this.mini?.dispose();
    this.mini = null;
    this.activeMiniComplete = null;
    if (this.state.officeLife.active === 'meeting-invite') {
      this.state.officeLife.outcomes['meeting-invite'] = 'declined';
      this.state.officeLife.active = null;
    }
    this.returnToOffice();
    this.ui.toast('Task postponed. No energy or REP lost. Classic.');
    this.save();
  }

  finishTask(task) {
    const wasReady = this.state.bossReady;
    const completed = this.state.completeTask(task);
    this.returnToOffice();
    if (completed) {
      this.audio.play('success');
      this.ui.toast(`TASK COMPLETE! +${task.reward} REP. ${!wasReady && this.state.bossReady ? 'Your performance review is unlocked!' : 'This will look excellent on LinkedIn.'}`);
      this.updateMarkers();
      this.save();
    }
  }

  returnToOffice() {
    this.setMode('office');
    this.ui.closeModal();
    this.refreshObjective();
  }

  elevator() {
    this.setMode('elevator');
    const modal = this.ui.modal(`<div class="eyebrow">VERTICAL CAREER MOBILITY</div><h2 id="modal-title">Going up?</h2><p>New title. New floor. Same coffee machine.</p>${FLOORS.map((floor, i) => `
      <button class="floor-option" data-floor="${i}" ${i > this.state.rank ? 'disabled' : ''}><span>0${i + 1}</span><div><strong>${floor.name}</strong><small>${i > this.state.rank ? `LOCKED / Requires ${TITLES[i]}` : i === this.state.floor ? 'YOU ARE HERE' : floor.subtitle}</small></div>${icon('arrow')}</button>`).join('')}<div class="modal-footer"><button id="leave" class="secondary">Back to work</button></div>`);
    modal.querySelectorAll('[data-floor]').forEach(button => {
      button.onclick = () => {
        if (this.quest && Number(button.dataset.floor) !== this.state.floor) {
          this.ui.toast(`Finish finding ${this.quest.destinationName} on this floor first.`);
          return;
        }
        if (this.state.changeFloor(Number(button.dataset.floor))) {
          this.loadFloor();
          this.returnToOffice();
          this.ui.toast(`Floor ${this.state.floor + 1}. ${FLOORS[this.state.floor].subtitle}`);
          this.save();
        }
      };
    });
    modal.querySelector('#leave').onclick = () => this.returnToOffice();
  }

  bossDoor() {
    if (this.state.floor < this.state.rank) { this.ui.toast('That is your old office now. Your next boss is upstairs.'); return; }
    if (!this.state.bossReady) {
      this.ui.toast(`Earn ${FLOORS[this.state.floor].threshold - this.state.rep[this.state.floor]} more REP. Your manager does not know your name yet.`);
      return;
    }
    const boss = BOSSES[this.state.floor];
    this.setMode('dialogue');
    const modal = this.ui.modal(`<div class="eyebrow">PERFORMANCE REVIEW / NON-OPTIONAL</div><h2 id="modal-title">${boss.name}</h2><p class="dialogue-quote">"${boss.intro}"</p><section class="task-offer"><h3>Defeat the ${boss.title}. Take their job.</h3><p>First-person boxing. Watch the wind-up, dodge, then get close and counterpunch. You enter with full health.</p><div class="reward"><span>CLICK / F: PUNCH</span><span>SPACE: DODGE</span></div></section><div class="modal-footer"><button id="fight" class="primary">Let's circle back outside ${icon('arrow')}</button><button id="leave" class="secondary">Prepare first</button></div>`);
    modal.querySelector('#fight').onclick = () => this.state.floor === 0 ? this.startJillIntro() : this.startCombat();
    modal.querySelector('#leave').onclick = () => this.returnToOffice();
  }

  startJillIntro() {
    this.cutscene?.dispose();
    this.cutscene = new CareerCutscene(this, 'snack', () => {
      this.cutscene = null;
      this.startCombat();
    });
  }

  startNewHireIntro() {
    this.cutscene?.dispose();
    this.cutscene = new CareerCutscene(this, 'intro', () => {
      this.cutscene = null;
      this.state.introSeen = true;
      this.setMode('office');
      this.ui.toast('Orientation complete. Find the green markers. Pretend this all seems normal.');
      this.refreshObjective();
      this.save();
    });
  }

  makeCombatEffects() {
    this.fists = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: '#486653', roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#dfb58d', roughness: 0.9 });
    for (const side of [-1, 1]) {
      const fist = new THREE.Group();
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.56), sleeveMat);
      sleeve.position.z = 0.22;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.27, 0.27), skinMat);
      hand.position.z = -0.12;
      fist.add(sleeve, hand);
      fist.position.set(side * 0.43, -0.36, -0.7);
      fist.rotation.set(-0.12, side * -0.2, side * 0.12);
      this.fists.add(fist);
    }
    this.fists.visible = false;
    this.camera.add(this.fists);
    this.effects = new CombatEffects(this.scene);
    this.warningRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 48),
      new THREE.MeshBasicMaterial({ color: '#e19d54', side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    this.warningRing.rotation.x = -Math.PI / 2;
    this.warningRing.visible = false;
    this.scene.add(this.warningRing);
    this.particles = [];
    const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(particleGeometry, new THREE.MeshBasicMaterial({ color: ['#d7ec9b', '#faf4cf', '#dca679'][i % 3] }));
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity: new THREE.Vector3(), life: 0 });
    }
  }

  burst(x, y, z) {
    this.particles.forEach(particle => {
      particle.mesh.position.set(x, y, z);
      particle.velocity.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
      particle.life = 0.6 + Math.random() * 0.5;
      particle.mesh.visible = true;
    });
  }

  startCombat() {
    if (this.arena) { this.scene.remove(this.arena.group); this.arena.dispose(); }
    this.effects.reset();
    const boss = BOSSES[this.state.floor];
    this.arena = createArena(boss, this.state.floor);
    const arena = this.arena;
    arena.bossMesh.visible = false;
    arena.bossMesh.userData.headSurface.ready.then(status => {
      if (this.arena !== arena || status === 'disposed') return;
      arena.bossMesh.visible = true;
      if (status !== 'ready') this.ui.toast(`Portrait unavailable: ${arena.bossMesh.userData.headSurface.group.userData.expectedPath}. See the console for the loading error.`);
    });
    this.scene.add(this.arena.group);
    this.office.group.visible = false;
    this.playerMesh.visible = false;
    this.state.health = 100;
    this.pitch = 0;
    this.combat = new Combat(boss, (event, message) => this.combatEvent(event, message));
    this.combatMessageTime = 0;
    this.introTime = 0;
    this.introDuration = this.state.floor === BOSSES.length - 1 ? 3.2 : 1.8;
    this.introPosition = this.camera.position.clone();
    this.introRotation = this.camera.quaternion.clone();
    this.scene.background.set('#24342e');
    this.sun.intensity = 2.3;
    this.ui.closeModal();
    this.ui.show('toast', false);
    this.ui.toastTime = 0;
    this.setMode('intro');
    this.ui.text('boss-name', boss.name);
    this.ui.bar('boss-bar', 100);
    this.ui.text('boss-hp', `${boss.hp} / ${boss.hp} HP`);
    this.ui.text('combat-hp', 100);
    this.ui.radar(this.combat);
    this.ui.text('review-label', this.state.floor === BOSSES.length - 1 ? 'FINAL BOSS / KJELL RUSTI / CEO' : 'MANDATORY PERFORMANCE REVIEW');
    this.ui.text('attack-callout', this.state.floor === BOSSES.length - 1 ? 'FINAL BOSS: KJELL RUSTI' : 'THIS MEETING JUST GOT PERSONAL');
    this.ui.show('attack-callout', true);
    this.ui.text('boss-phase', '');
    this.ui.show('hazard-warning', false);
    this.ui.show('lock-hint', true);
    this.audio.play('telegraph');
  }

  combatEvent(event, message) {
    if (['punch', 'dodge', 'hurt', 'telegraph', 'attack', 'candy', 'number', 'newsletter', 'uppercut', 'aura', 'hole'].includes(event)) this.audio.play(event);
    if (event === 'punch' || event === 'miss' || event === 'avoided') {
      this.combatMessage = message;
      this.combatMessageTime = 0.9;
    }
    if (event === 'punch') this.burst(this.combat.boss.x, 1.7, this.combat.boss.z);
    if (event === 'win') this.endCombat(true);
    if (event === 'lose') this.endCombat(false);
  }

  endCombat(won) {
    this.fists.visible = false;
    this.warningRing.visible = false;
    this.effects.reset();
    this.particles.forEach(particle => { particle.life = 0; particle.mesh.visible = false; });
    this.ui.elements['damage-overlay'].style.opacity = 0;
    this.ui.elements['attack-callout'].classList.remove('uppercut-callout');
    this.ui.show('attack-callout', false);
    this.state.health = won ? this.combat.player.hp : 100;
    this.run.sync();
    if (won) {
      this.state.promote();
      this.audio.play('promotion');
      this.save();
      if (this.state.complete) {
        this.recordResult();
      }
      this.cutscene = new CareerCutscene(this, 'victory', () => {
        this.cutscene = null;
        this.arena.group.visible = false;
        if (this.state.complete) this.showEnding();
        else {
          if (this.state.floor !== this.state.rank) {
            this.state.changeFloor(this.state.rank);
            this.loadFloor();
          }
          this.roomChanged();
          this.ui.toast(`PROMOTED TO ${this.state.title.toUpperCase()}. Welcome to your new floor.`);
          this.save();
        }
      });
      return;
    }
    this.setMode('defeat');
    this.office.group.visible = true;
    this.arena.group.visible = false;
    this.playerMesh.visible = true;
    this.scene.background.set('#e8ebe5');
    this.sun.intensity = 3.1;
    this.camera.position.copy(this.follow).add(this.cameraOffset);
    this.camera.lookAt(this.follow);
    this.resize();
    const modal = this.ui.modal(`<div class="eyebrow">A DEVELOPMENT OPPORTUNITY</div><h2 id="modal-title">You have been<br>out-managed.</h2><p>No REP lost. No tasks lost. The clock is still running.</p><section class="task-offer"><h3>A little unsolicited feedback</h3><p>Step away from warning cracks: open holes are instantly lethal, even during a dodge. Keep moving through projectile volleys. Counter during recovery. Q / R turn if mouse capture is unavailable.</p></section><div class="modal-footer"><button id="retry" class="primary">Request another review</button><button id="leave" class="secondary">Back to office</button></div>`);
    modal.querySelector('#retry').onclick = () => this.startCombat();
    modal.querySelector('#leave').onclick = () => this.returnToOffice();
  }

  showEnding(skip = false) {
    this.parade?.dispose();
    this.parade = null;
    this.audio.stopCEO();
    this.ui.closeModal();
    this.fists.visible = false;
    this.warningRing.visible = false;
    this.effects.reset();
    this.setMode('ending');
    this.ending?.dispose();
    this.ending = new CorporateEnding(this.ui.elements['ending-layer'], this.state.result, {
      bestTime: this.bestTime, newRecord: this.newRecord,
      onCrawlComplete: () => this.startParade(),
      onRestart: () => {
        this.ending.dispose();
        this.setMode('result-confirm');
        this.confirmRestart();
      },
      onOffice: () => this.enjoyOffice(),
    });
    if (skip) this.showFinalResults();
  }

  startParade() {
    this.ending.dispose();
    this.ui.show('toast', false);
    this.ui.toastTime = 0;
    this.ui.text('parade-audio', '');
    this.office.group.visible = false;
    if (this.arena) this.arena.group.visible = false;
    this.scene.background.set('#152923');
    this.sun.intensity = 2.8;
    this.setMode('parade');
    this.ui.text('parade-title', 'A totally normal promotion');
    this.ui.elements['skip-parade'].onclick = () => this.parade.finish();
    this.parade = new CEOParade(this.scene, this.camera, this.playerMesh, {
      onFinish: () => this.finishParade(),
      onLine: line => this.ui.text('parade-line', line),
    });
    this.audio.startCEO(message => this.ui.text('parade-audio', message));
    this.audio.updateCEO('parade', 0, this.parade.duration);
  }

  finishParade() {
    this.parade?.dispose();
    this.parade = null;
    this.state.changeFloor(FLOORS.length - 1);
    this.loadFloor();
    if (this.office.spawn) this.state.position = { ...this.office.spawn };
    this.roomChanged();
    this.revealEnd = this.camera.position.clone();
    this.revealStart = new THREE.Vector3(0, 3.2, this.state.position.z + 6);
    this.revealTime = 0;
    this.setMode('reveal');
    this.ui.text('parade-title', 'Your expense account has no ceiling');
    this.ui.text('parade-line', 'One enormous office. Absolutely no self-awareness.');
    this.ui.elements['skip-parade'].onclick = () => this.showFinalResults();
    this.audio.updateCEO('reveal', 0, 2);
    this.save();
  }

  showFinalResults() {
    this.setMode('results');
    this.ending.showResults();
  }

  enjoyOffice() {
    this.ending?.dispose();
    this.ending = null;
    if (this.state.floor !== FLOORS.length - 1) {
      this.state.changeFloor(FLOORS.length - 1);
      this.loadFloor();
    }
    this.roomChanged();
    this.ui.toast('YOU ARE MANAGEMENT. Try not to schedule anything.');
    this.save();
  }

  togglePause() {
    if (this.mode === 'paused') { this.resume(); return; }
    if (!['office', 'combat', 'minigame', 'parade', 'reveal', 'cutscene', 'intro'].includes(this.mode)) return;
    this.pauseFrom = this.mode;
    this.audio.pauseCEO();
    if (this.mode === 'minigame') {
      this.mini.suspend?.();
      this.pausedMini = document.createElement('div');
      while (this.ui.elements.modal.firstChild) this.pausedMini.append(this.ui.elements.modal.firstChild);
    }
    this.setMode('paused');
    this.ui.show('cinematic-layer', false);
    const modal = this.ui.modal(`<div class="eyebrow">CURRENT STATUS: AWAY</div><h2 id="modal-title">Taking a breather.</h2><p>The clock pauses here. Dialogue, tasks and reviews all count.</p><div class="pause-controls"><strong>Office:</strong> WASD / Arrows move. E interacts. Shift sprints.<br><strong>Review:</strong> Mouse / Q / R look. Click / F punches.<br><strong>Defence:</strong> Space / Right click dodges. Never cross open holes.<br><strong>Strategy:</strong> Dodge the wind-up. Counter during recovery.</div><div class="modal-footer"><button id="resume" class="primary">Back to being productive</button><button id="restart" class="secondary">New career</button></div>${this.state.result ? '<button id="results" class="secondary full-width" style="margin-top:12px">View final results</button>' : ''}`);
    modal.querySelector('#resume').onclick = () => this.resume();
    modal.querySelector('#restart').onclick = () => this.confirmRestart();
    modal.querySelector('#results')?.addEventListener('click', () => this.showEnding(true));
    this.save();
  }

  resume() {
    this.audio.start();
    const mode = this.pauseFrom;
    this.setMode(mode);
    if (this.audio.hasCEOTrack()) this.audio.resumeCEO();
    if (mode === 'cutscene') this.ui.show('cinematic-layer', true);
    if (mode === 'minigame') {
      this.ui.elements.modal.innerHTML = '';
      this.ui.elements.modal.className = 'modal minigame-modal';
      while (this.pausedMini.firstChild) this.ui.elements.modal.append(this.pausedMini.firstChild);
      this.pausedMini = null;
      this.mini.root.focus({ preventScroll: true });
    } else this.ui.closeModal();
  }

  confirmRestart() {
    const from = this.mode;
    this.setMode('restart-confirm');
    const modal = this.ui.modal(`<div class="eyebrow">CAREER RESET</div><h2 id="modal-title">Back to day one?</h2><p>This replaces your locally saved career. Your current promotions and completed tasks will be reset.</p><div class="modal-footer"><button id="keep" class="primary">Keep my career</button><button id="reset" class="secondary">Start over</button></div>`);
    modal.querySelector('#reset').onclick = () => {
      this.mini?.dispose();
      this.mini = null;
      this.pausedMini = null;
      this.combat = null;
      this.fists.visible = false;
      this.warningRing.visible = false;
      this.effects.reset();
      this.ui.elements['damage-overlay'].style.opacity = 0;
      this.start(true);
    };
    modal.querySelector('#keep').onclick = () => {
      if (from === 'title') this.welcome();
      else if (from === 'paused') this.resume();
      else if (from === 'result-confirm') this.showEnding(true);
      else this.returnToOffice();
    };
  }

  updateOffice(dt) {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const moving = Boolean(x || z);
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = sprint && this.state.energy > 0 ? 6.2 : 3.8;
    const length = Math.max(1, Math.hypot(x, z));
    const dx = (x * 0.78 + z * 0.625) / length * speed * dt;
    const dz = (-x * 0.625 + z * 0.78) / length * speed * dt;
    moveWithCollisions(this.state.position, dx, dz, this.office.colliders, this.office.bounds);
    if (moving) {
      this.playerMesh.rotation.y = Math.atan2(dx, dz);
      if (sprint && this.state.energy > 0) this.state.energy = Math.max(0, this.state.energy - dt * 1.8);
    }
    this.playerMesh.position.set(this.state.position.x, moving ? Math.abs(Math.sin(this.time * 12)) * 0.045 : 0, this.state.position.z);
    this.playerMesh.rotation.z = moving ? Math.sin(this.time * 12) * 0.035 : 0;
    this.playerMesh.userData.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(this.time * 12 + i * Math.PI) * 0.4 : 0; });
    this.playerMesh.userData.arms.forEach((arm, i) => { arm.rotation.x = moving ? -Math.sin(this.time * 12 + i * Math.PI) * 0.3 : 0; });
    this.follow.lerp(this.target.set(this.state.position.x, 0, this.state.position.z), 1 - Math.exp(-3 * dt));
    this.camera.position.copy(this.follow).add(this.cameraOffset);
    this.camera.lookAt(this.follow);
    this.nearest = null;
    let distance = 2.35;
    for (const item of this.office.interactables) {
      if (item.collected || item.collectionId && this.state.collectibles.has(item.collectionId)) continue;
      if (item.kind === 'room' && !this.quest) continue;
      const d = Math.hypot(item.x - this.state.position.x, item.z - this.state.position.z);
      if (d < distance && hasClearPath(this.state.position, item, this.office.colliders)) { this.nearest = item; distance = d; }
    }
    if (this.nearest) {
      let label = this.nearest.label;
      if (this.nearest.kind === 'npc') label = this.state.isDone(this.nearest.npc.task) ? `Talk to ${this.nearest.npc.name} / task complete` : `Talk to ${this.nearest.npc.name} / +${this.nearest.npc.task.reward} REP`;
      if (this.nearest.kind === 'bathroom') label = 'Enter bathroom';
      if (this.nearest.kind === 'boss') label = this.state.bossReady ? 'Enter your performance review' : this.state.floor < this.state.rank ? 'Your former manager\'s office' : `Boss office / ${FLOORS[this.state.floor].threshold} REP required`;
      this.ui.hint(label);
    } else this.ui.hint(null);
  }

  updateCombat(dt, input = null) {
    const combat = this.combat;
    combat.update(dt, input ?? {
      x: Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')),
      z: Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')),
      turn: Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyR')),
    });
    if (combat.consumeKjellCmonCue()) this.audio.playKjellCue('cmon');
    if (combat.consumeKjellVoiceCue()) this.audio.playKjellCue('random');
    if (this.mode !== 'combat') return;
    this.state.health = combat.player.hp;
    this.camera.position.set(combat.player.x, 1.6 + (combat.invulnerable > 0 ? -0.2 : 0), combat.player.z);
    this.camera.rotation.set(this.pitch || 0, combat.player.yaw, 0, 'YXZ');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && combat.shake > 0) {
      this.camera.position.x += Math.sin(this.time * 67) * combat.shake * 0.07;
      this.camera.position.y += Math.cos(this.time * 53) * combat.shake * 0.05;
    }
    this.fists.visible = true;
    this.fists.children[1].position.z = -0.7 - Math.sin(combat.punchAnimation / 0.25 * Math.PI) * 0.5;
    this.fists.children[0].position.y = -0.36 + Math.sin(this.time * 3) * 0.02;
    this.arena.bossMesh.position.set(combat.boss.x, combat.boss.phase === 'telegraph' ? Math.sin(this.time * 32) * 0.035 : 0, combat.boss.z);
    this.arena.bossMesh.rotation.y = Math.atan2(combat.player.x - combat.boss.x, combat.player.z - combat.boss.z);
    animateBoss(this.arena.bossMesh, combat, this.time);
    this.warningRing.visible = true;
    this.warningRing.position.set(combat.boss.x, 0.04, combat.boss.z);
    this.warningRing.material.color.set(combat.boss.phase === 'telegraph' ? '#f38a51' : combat.boss.phase === 'recover' ? '#c7ef80' : '#8da68b');
    this.warningRing.scale.setScalar(combat.boss.phase === 'telegraph' ? 1 + Math.sin(this.time * 20) * 0.12 : 1);
    this.effects.update(combat, dt);
    const auraCharge = combat.attack.kind === 'aura' && combat.boss.phase === 'telegraph';
    this.sun.intensity = auraCharge ? 1.4 + Math.sin(this.time * 12) * 0.25 : 2.3;
    this.ui.bar('boss-bar', combat.boss.hp / combat.definition.hp * 100);
    this.ui.text('boss-hp', `${combat.boss.hp} / ${combat.definition.hp} HP`);
    this.ui.text('combat-hp', combat.player.hp);
    this.ui.radar(combat);
    this.ui.text('boss-phase', `PHASE ${combat.boss.stage} / ${combat.currentPhase.name.toUpperCase()}`);
    const holes = combat.hazards;
    this.ui.show('hazard-warning', holes.length > 0);
    if (holes.length) this.ui.text('hazard-warning', holes.some(h => h.state === 'warning')
      ? 'FLOOR WARNING: leave the striped circles. Holes are instantly lethal.'
      : 'OPEN HOLES: do not walk or dodge across the dark voids.');
    this.ui.bar('dodge-bar', (1 - combat.dodgeReadyIn / 0.7) * 100);
    this.ui.text('dodge-label', combat.canDodge ? 'DODGE READY' : 'REPOSITIONING');
    this.ui.elements['damage-overlay'].style.opacity = combat.hitFlash * 1.8;
    this.combatMessageTime = Math.max(0, (this.combatMessageTime || 0) - dt);
    const callout = this.ui.elements['attack-callout'];
    let calloutHtml = '';
    let calloutColor = '#e3efbb';
    callout.classList.toggle('uppercut-callout', combat.attack.kind === 'uppercut' && combat.boss.phase === 'attack');
    if (combat.attack.kind === 'uppercut' && combat.boss.phase === 'attack') {
      calloutHtml = 'CMON!!';
      calloutColor = '#ffe590';
    } else if (combat.boss.phase === 'telegraph') {
      calloutHtml = `${combat.attack.name}<small>${combat.attack.line}</small>`;
      calloutColor = '#ffc195';
    } else if (this.combatMessageTime > 0) {
      calloutHtml = this.combatMessage;
    } else if (combat.boss.phase === 'recover') {
      calloutHtml = 'COUNTER WINDOW<small>Get close. Punch. Provide feedback.</small>';
      calloutColor = '#d9fba1';
    }
    callout.innerHTML = calloutHtml;
    callout.style.color = calloutColor;
    this.ui.show('attack-callout', Boolean(calloutHtml));
  }

  frame(timestamp) {
    const wallDt = Math.max(0, (timestamp - (this.lastFrame || timestamp)) / 1000);
    const dt = Math.min(wallDt, 0.05);
    this.lastFrame = timestamp;
    this.run.sync();
    this.life.update(wallDt);
    this.time += dt;
    if (this.doorFade > 0 && this.mode !== 'paused') {
      this.doorFade = Math.max(0, this.doorFade - dt);
      this.ui.elements['transition-overlay'].style.opacity = this.doorFade * 1.8;
    }
    if (this.mode === 'office') this.updateOffice(dt);
    else if (this.mode === 'cutscene') this.cutscene?.update(dt);
    else if (this.mode === 'combat') this.updateCombat(dt);
    else if (this.mode === 'minigame') this.mini?.update(dt);
    else if (this.mode === 'ending') this.ending?.update(wallDt);
    else if (this.mode === 'parade') {
      this.audio.updateCEO('parade', this.parade.elapsed, this.parade.duration);
      this.parade.update(dt);
    } else if (this.mode === 'reveal') {
      if (this.audio.hasCEOTrack()) this.audio.updateCEO('reveal', this.revealTime, 2);
      this.revealTime += dt;
      const alpha = Math.min(1, this.revealTime / 2);
      this.camera.position.lerpVectors(this.revealStart, this.revealEnd, alpha * alpha * (3 - 2 * alpha));
      this.camera.lookAt(this.state.position.x, 0, this.state.position.z - 5 * (1 - alpha));
      if (alpha === 1) this.showFinalResults();
    }
    else if (this.mode === 'intro') {
      if (this.arena.bossMesh.userData.headSurface.group.userData.photoState !== 'loading') this.introTime += dt;
      else this.ui.text('attack-callout', 'LOADING MANAGER PORTRAIT...');
      const alpha = clamp(this.introTime / this.introDuration, 0, 1);
      const eased = alpha * alpha * (3 - 2 * alpha);
      this.camera.position.lerpVectors(this.introPosition, this.target.set(0, 1.6, 4), eased);
      this.camera.quaternion.slerpQuaternions(this.introRotation, new THREE.Quaternion(), eased);
      this.ui.elements['transition-overlay'].style.opacity = Math.sin(alpha * Math.PI) * 0.65;
      if (alpha === 1) {
        this.setMode('combat');
        this.ui.elements['transition-overlay'].style.opacity = 0;
      }
    }
    if (this.audio.hasCEOTrack() && ['office', 'results', 'paused'].includes(this.mode) && this.state.complete) {
      this.audio.updateCEO('office');
    }
    if (this.run.active) {
      this.saveClock += wallDt;
      if (this.saveClock >= 5) { this.save(); this.saveClock = 0; }
    }
    if (!['paused', 'title', 'parade', 'reveal', 'results'].includes(this.mode)) {
      const audioMode = this.mode === 'ending' ? 'ending'
        : this.mode === 'combat' || this.mode === 'intro' ? (this.state.floor === BOSSES.length - 1 ? 'final' : 'combat') : 'office';
      this.audio.update(dt, audioMode);
    }
    if (this.mode !== 'paused' && this.mode !== 'ending') {
      this.office.update(dt, this.time, { playerPosition: this.state.position, allowMovement: this.mode === 'office' });
      if (this.arena?.group.visible) this.arena.update(dt, this.time);
      for (const particle of this.particles) {
        particle.life -= dt;
        particle.mesh.visible = particle.life > 0;
        if (particle.life > 0) {
          particle.velocity.y -= dt * 7;
          particle.mesh.position.addScaledVector(particle.velocity, dt);
          particle.mesh.rotation.x += dt * 4;
        }
      }
    }
    if (!['office', 'combat', 'intro', 'cutscene'].includes(this.mode) && this.office.group.visible) {
      this.playerMesh.position.set(this.state.position.x, 0, this.state.position.z);
    }
    this.ui.update(this.state, this.mode === 'paused' && ['combat', 'intro'].includes(this.pauseFrom) ? 'combat' : this.mode, dt);
    if (this.mode !== 'ending' || this.ending.elapsed < 1.2) this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  }
}

function createRenderer() {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    return renderer;
  } catch (error) {
    console.error('Workdayle could not initialize WebGL:', error);
    document.getElementById('app').innerHTML = '<div class="error-message"><h1>Workdayle needs WebGL.</h1><p>Enable hardware acceleration or open the game in a current desktop browser with WebGL support, then reload.</p></div>';
    return null;
  }
}

const renderer = createRenderer();
export const game = renderer ? new Workdayle(renderer) : null;
if (import.meta.env.DEV) window.__workdayle = game;
