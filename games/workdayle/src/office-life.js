import { FLOORS } from './content.js';
import { advanceOfficeEvents, resolveOfficeEvent, relieveBathroom } from './office-events.js';

const RIVALS = ['Capgemini', 'Tietoevry', 'Bouvet'];

export class OfficeLife {
  constructor(game, random = Math.random) {
    this.game = game;
    this.random = random;
    this.lastEmergencySecond = -1;
  }

  update(dt) {
    const game = this.game, data = game.state.officeLife;
    const ticking = !['title', 'paused', 'test-menu', 'test-confirm', 'game-over', 'result-confirm', 'restart-confirm'].includes(game.mode);
    const event = advanceOfficeEvents(data, dt, {
      ticking,
      eligible: !game.testing && data.cvPending === null && game.mode === 'office' && !game.bathroomReturn && !game.secretReturn && !game.state.complete && !game.quest,
      bathroom: game.state.bathroom,
    }, this.random);
    if (event?.id === 'bathroom-emergency') {
      game.mini?.dispose();
      game.mini = null;
      if (['dialogue', 'minigame', 'event', 'elevator'].includes(game.mode)) game.returnToOffice();
      game.audio.play('telegraph');
      game.ui.toast('BATHROOM EMERGENCY. Twenty seconds. Get through a WC door!');
      this.lastEmergencySecond = 21;
      game.refreshObjective();
      game.save();
    } else if (event?.id === 'bathroom-failure') this.gameOver('bathroom');
    else if (event) this.present(event.id);
    this.paintEmergency();
  }

  paintEmergency() {
    const game = this.game;
    const remaining = game.state.officeLife.emergency;
    const active = remaining !== null && !game.state.officeLife.gameOver;
    game.ui.show('bathroom-emergency', active);
    game.ui.show('bathroom-vignette', active);
    if (!active) return;
    const seconds = Math.ceil(remaining);
    game.ui.text('emergency-count', `${seconds} SECONDS`);
    game.ui.text('emergency-line', seconds <= 1 ? '...' : seconds <= 3 ? 'OH NO.' : seconds <= 5 ? 'RUN.' : seconds <= 10 ? 'THIS IS GETTING SERIOUS.' : 'GET TO THE BATHROOM.');
    game.ui.elements['bathroom-vignette'].style.opacity = String(0.45 + (20 - remaining) / 36);
    if (seconds !== this.lastEmergencySecond && game.mode !== 'paused') {
      if (seconds <= 10 || seconds % 5 === 0) game.audio.play(seconds <= 5 ? 'error' : 'click');
      this.lastEmergencySecond = seconds;
    }
  }

  relieve() {
    const game = this.game;
    const emergency = relieveBathroom(game.state.officeLife);
    game.state.bathroom = 0;
    this.paintEmergency();
    if (emergency) game.ui.toast('Crisis avoided. Professionalism preserved. Barely.');
    game.refreshObjective();
    game.save();
  }

  reward(amount, message) {
    const game = this.game;
    game.state.rep[game.state.floor] = Math.min(10000, game.state.rep[game.state.floor] + amount);
    game.audio.play('success');
    game.ui.toast(`${message} +${amount} REP.`);
    game.refreshObjective();
    game.save();
  }

  present(id) {
    const game = this.game, data = game.state.officeLife;
    game.setMode('event');
    data.active = id;
    if (id === 'recruitment') {
      const rival = RIVALS[Math.min(RIVALS.length - 1, Math.floor(this.random() * RIVALS.length))];
      const modal = game.ui.modal(`<div class="eyebrow">CAREER OPPORTUNITY / FICTIONAL RECRUITMENT</div><h2 id="modal-title">${rival} has entered the chat.</h2><p>A fictional recruiter offers a new role. Same meetings. Different lanyard.</p><p class="event-note">Staying loyal earns 15 REP. Accepting ends this career immediately. This is an affectionate office parody, not a real offer.</p><div class="modal-footer"><button id="reject-offer" class="primary">NO. I am loyal.</button><button id="accept-offer" class="secondary">YES. End this career.</button></div>`);
      modal.querySelector('#reject-offer').onclick = () => {
        resolveOfficeEvent(data, 'completed');
        game.returnToOffice();
        this.reward(15, 'Loyalty has been added to a slide');
      };
      modal.querySelector('#accept-offer').onclick = () => {
        resolveOfficeEvent(data, 'failed');
        this.gameOver('recruitment');
      };
    } else if (id === 'cv-warning') {
      data.cvPending = game.state.floor;
      const modal = game.ui.modal('<div class="eyebrow">CV STATUS WARNING</div><h2 id="modal-title">Your CV is YELLOW.</h2><p>“Worked with computers” is apparently not a thought-leadership strategy. Find the marked CV workstation on this floor and ask an AI to add syllables.</p><button id="cv-acknowledge" class="primary full-width">Find a workstation</button>');
      modal.querySelector('#cv-acknowledge').onclick = () => {
        resolveOfficeEvent(data, 'pending');
        game.returnToOffice();
        game.save();
      };
    } else {
      const modal = game.ui.modal('<div class="eyebrow">CALENDAR THREAT DETECTED</div><h2 id="modal-title">You have been invited to a meeting.</h2><p>Duration: “quick”. Agenda: to be discovered during the meeting.</p><div class="modal-footer"><button id="dodge-invite" class="primary">Dodge the meeting</button><button id="defer-invite" class="secondary">Not now</button></div>');
      modal.querySelector('#dodge-invite').onclick = () => this.startEventMini('dodge-meeting');
      modal.querySelector('#defer-invite').onclick = () => this.dismiss();
    }
    data.wait = Math.max(data.wait, 95);
    game.save();
  }

  dismiss() {
    const game = this.game;
    resolveOfficeEvent(game.state.officeLife, 'declined');
    game.returnToOffice();
    game.save();
  }

  startEventMini(type) {
    const game = this.game;
    const cv = type === 'cv-ai';
    game.startMini({
      id: `event-${type}`, type, title: cv ? 'Update your yellow CV' : 'Dodge this meeting',
      description: cv ? 'Turn ordinary work into extraordinary corporate language.' : 'Avoid attending. Deliver a believable excuse.',
      reward: cv ? 20 : 15, energyCost: 0,
    }, false, () => {
      if (cv) {
        game.state.officeLife.cvPending = null;
        game.state.officeLife.outcomes['cv-warning'] = 'completed';
      }
      resolveOfficeEvent(game.state.officeLife, 'completed');
      game.returnToOffice();
      this.reward(cv ? 20 : 15, cv ? 'CV STATUS: GREEN. Buzzwords restored' : 'Meeting avoided. Productivity suspiciously improved');
    });
  }

  workstation() {
    const game = this.game, floor = game.state.officeLife.cvPending;
    if (floor === game.state.floor) this.startEventMini('cv-ai');
    else game.ui.toast(floor === null ? 'CV STATUS: GREEN. The computer requests a break.' : `Your flagged CV is on ${FLOORS[floor].name}. Find its workstation.`);
  }

  collect(item) {
    const game = this.game;
    if (game.state.collectibles.has(item.collectionId)) {
      game.ui.toast('Already filed in your collection. No double billing.');
      return;
    }
    game.state.collectibles.add(item.collectionId);
    game.office.collect?.(item.collectionId);
    item.collected = true;
    if (item.kind === 'collectible' && item.mesh) item.mesh.visible = false;
    const message = item.message || (item.kind === 'camera' ? 'WAIT... WHY IS THERE A CAMERA HERE? Cartoon camera destroyed. Privacy restored.' : `${item.label} collected. Your inventory is now slightly more corporate.`);
    this.reward(item.kind === 'camera' ? 10 : 3, message);
  }

  gameOver(reason) {
    const game = this.game;
    game.state.officeLife.gameOver = reason;
    game.state.officeLife.active = null;
    game.state.officeLife.emergency = null;
    game.mini?.dispose();
    game.mini = null;
    game.audio.stopCEO();
    game.setMode('game-over');
    this.paintEmergency();
    const bathroom = reason === 'bathroom';
    const modal = game.ui.modal(`<div class="eyebrow">${bathroom ? 'HR HAS BEEN NOTIFIED' : 'EXIT INTERVIEW / EFFECTIVE IMMEDIATELY'}</div><h2 id="modal-title">GAME OVER</h2>${bathroom ? '<div class="hr-incident" aria-label="A cartoon puddle"></div>' : ''}<p>${bathroom ? 'A small cartoon puddle. A very large HR incident. Human Resources has received a report regarding the internal liquidity crisis.' : 'You accepted another offer. Management has decided this is unacceptable. Your corporate career has ended. Your new employer also uses timesheets.'}</p><p>Your personal best is safe. This career is over.</p><button id="restart-career" class="primary full-width">Start a fresh workday</button>`);
    modal.querySelector('#restart-career').onclick = () => game.start(true);
    game.audio.play('error');
    game.save();
  }
}
