import { BOSSES, FLOORS } from './content.js';
import { GameState } from './state.js';
import { RunClock } from './run.js';

export class DeveloperMode {
  constructor(game) { this.game = game; }

  open() {
    const game = this.game;
    if (['test-menu', 'test-confirm'].includes(game.mode)) return;
    this.from = game.mode;
    if (['dialogue', 'elevator', 'defeat', 'restart-confirm'].includes(this.from)) {
      this.savedModal = document.createElement('div');
      this.savedModal.className = game.ui.elements.modal.className;
      while (game.ui.elements.modal.firstChild) this.savedModal.append(game.ui.elements.modal.firstChild);
    }
    if (['office', 'combat', 'minigame', 'parade', 'reveal', 'cutscene', 'intro'].includes(game.mode)) {
      game.togglePause();
      this.from = 'paused';
    }
    game.ui.show('ending-layer', false);
    game.setMode(game.testing ? 'test-menu' : 'test-confirm');
    if (!game.testing) {
      const modal = game.ui.modal('<div class="eyebrow">DEVELOPER TOOLS / OFF BY DEFAULT</div><h2 id="modal-title">Test without the grind.</h2><p>Start an isolated test career with maximum required REP. Your normal career and personal best will not be changed. Test results are never saved.</p><div class="modal-footer"><button id="enable-test" class="primary">Enable isolated test mode</button><button id="cancel-test" class="secondary">Keep normal mode</button></div>');
      modal.querySelector('#enable-test').onclick = () => this.enable();
      modal.querySelector('#cancel-test').onclick = () => this.close();
      return;
    }
    this.menu();
  }

  menu() {
    const game = this.game;
    game.setMode('test-menu');
    const modal = game.ui.modal(`<div class="eyebrow">ISOLATED TEST CAREER / NO SAVES OR PB</div><h2 id="modal-title">Skip the middle management.</h2><div class="test-mode-grid">${BOSSES.map((boss, i) => `<button class="primary" data-test-boss="${i}">${boss.name}</button>`).join('')}<button id="test-office" class="secondary">Return to office</button><button id="test-skip" class="secondary">Skip cutscene</button><button id="test-snack" class="secondary">Jill snack introduction</button><button id="test-reset" class="secondary">Reset test state</button><button id="test-ceo" class="secondary">Explore CEO reward</button><button id="test-emergency" class="secondary">Bathroom emergency</button><button id="test-recruitment" class="secondary">Rival recruitment</button><button id="test-cv" class="secondary">Yellow CV event</button></div><div class="modal-footer"><button id="close-test" class="primary">Resume testing</button><button id="disable-test" class="secondary">Return to normal career</button></div>`);
    modal.querySelectorAll('[data-test-boss]').forEach(button => {
      button.onclick = () => { this.reset(Number(button.dataset.testBoss)); game.startCombat(); };
    });
    modal.querySelector('#test-office').onclick = () => { this.cleanup(); game.loadFloor(); game.roomChanged(); };
    modal.querySelector('#test-reset').onclick = () => this.reset(0);
    modal.querySelector('#test-snack').onclick = () => { this.reset(0); game.startJillIntro(); };
    modal.querySelector('#test-skip').onclick = () => {
      if (game.cutscene) { this.close(); game.cutscene.finish(); }
      else if (game.parade) { this.close(); game.parade.finish(); }
      else if (game.ending) { this.close(); game.ending.finish(); }
      else if (game.pauseFrom === 'intro') { game.introTime = game.introDuration; this.close(); }
      else if (game.pauseFrom === 'reveal') { this.close(); game.showFinalResults(); }
      else { this.close(); game.ui.toast('No cutscene is currently running.'); }
    };
    modal.querySelector('#test-ceo').onclick = () => this.reset(4);
    modal.querySelector('#test-emergency').onclick = () => {
      this.cleanup();
      game.loadFloor(); game.roomChanged();
      game.state.bathroom = 100;
      game.state.officeLife.emergency = 20;
      game.life.lastEmergencySecond = 21;
      game.refreshObjective();
    };
    modal.querySelector('#test-recruitment').onclick = () => {
      this.cleanup(); game.loadFloor(); game.roomChanged();
      game.life.present('recruitment');
    };
    modal.querySelector('#test-cv').onclick = () => {
      if (game.state.floor === 4) this.reset(0);
      else { this.cleanup(); game.loadFloor(); game.roomChanged(); }
      game.life.present('cv-warning');
    };
    modal.querySelector('#close-test').onclick = () => this.close();
    modal.querySelector('#disable-test').onclick = () => this.disable();
  }

  close() {
    const game = this.game;
    if (this.savedModal) {
      game.setMode(this.from);
      game.ui.elements.modal.replaceChildren(...this.savedModal.childNodes);
      game.ui.elements.modal.className = this.savedModal.className;
      this.savedModal = null;
      game.ui.show('modal-backdrop', true);
      game.ui.elements.modal.querySelector('button:not(:disabled)')?.focus();
    }
    else if (this.from === 'paused') game.resume();
    else if (['ending', 'results'].includes(this.from)) {
      game.setMode(this.from);
      game.ui.closeModal();
      game.ui.show('ending-layer', true);
    }
    else if (this.from === 'title') { game.setMode('title'); game.welcome(); }
    else if (game.state.officeLife.gameOver) game.life.gameOver(game.state.officeLife.gameOver);
    else if (game.state.officeLife.active) game.life.present(game.state.officeLife.active);
    else { game.setMode(this.from); game.ui.closeModal(); }
  }

  cleanup() {
    const game = this.game;
    this.savedModal = null;
    game.mini?.dispose(); game.mini = null; game.pausedMini = null;
    game.cutscene?.dispose(); game.cutscene = null;
    game.ending?.dispose(); game.ending = null;
    game.parade?.dispose(); game.parade = null;
    game.audio.stopCEO();
    game.combat = null;
    game.fists.visible = false;
    game.warningRing.visible = false;
    game.effects.reset();
    game.particles.forEach(particle => { particle.life = 0; particle.mesh.visible = false; });
    game.ui.elements['damage-overlay'].style.opacity = 0;
    game.ui.elements['transition-overlay'].style.opacity = 0;
    game.doorFade = 0;
    game.ui.show('cinematic-layer', false);
    game.quest = null;
    game.activeTask = null;
    game.activeMiniComplete = null;
    game.life.paintEmergency();
  }

  enable() {
    const game = this.game;
    const state = game.state.serialize();
    if (game.bathroomReturn) state.position = { ...game.bathroomReturn.position };
    if (game.secretReturn) state.position = { ...game.secretReturn.position };
    this.normal = { state, health: game.state.health, quest: game.quest, title: this.from === 'title', bestTime: game.bestTime, newRecord: game.newRecord };
    game.testing = true;
    game.ui.show('test-mode-badge', true);
    this.reset(0);
  }

  reset(floor) {
    const game = this.game;
    this.cleanup();
    game.run.mode('paused');
    game.state = new GameState();
    game.state.rank = floor;
    game.state.bossesDefeated = floor;
    game.state.rep = FLOORS.map(level => level.threshold || 0);
    game.state.complete = floor === 4;
    game.state.changeFloor(floor);
    game.run = new RunClock(game.state);
    game.loadFloor();
    game.roomChanged();
    game.ui.toast('TEST MODE: maximum required REP. F2 opens boss selection. Nothing is saved.');
  }

  disable() {
    const game = this.game;
    this.cleanup();
    game.run.mode('paused');
    game.state = new GameState(this.normal.state);
    game.state.health = this.normal.health;
    if (game.state.complete && game.state.floor !== 4) game.state.changeFloor(4);
    game.quest = this.normal.quest;
    game.bestTime = this.normal.bestTime;
    game.newRecord = this.normal.newRecord;
    game.run = new RunClock(game.state);
    game.testing = false;
    game.ui.show('test-mode-badge', false);
    game.loadFloor();
    if (this.normal.title) { game.setMode('title'); game.welcome(); }
    else if (game.state.officeLife.gameOver) game.life.gameOver(game.state.officeLife.gameOver);
    else if (game.state.officeLife.active) game.life.present(game.state.officeLife.active);
    else game.roomChanged();
    this.normal = null;
    game.ui.toast('Normal career restored. Test progress was discarded.');
  }
}
