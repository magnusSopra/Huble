import { formatTime } from './run.js';

const CRAWL = [
  'In a rapidly transforming digital workplace, one consultant was asked to demonstrate a little more initiative.',
  'They registered the hours. They updated the CV. They located a printer capable of printing.',
  'Through unprecedented cross-functional alignment, Jill\'s confectionery strategy was successfully restructured.',
  'Sander\'s budget holes were navigated. Alf\'s newsletters were finally, physically, unsubscribed from.',
  'At the summit of the organizational chart, Kjell manifested an aura so powerful that Finance requested a separate cost centre.',
  'But no uppercut could stop the delivery of measurable stakeholder value.',
  'They defeated management. They became management. The circle-back was complete.',
  'The new CEO opened the calendar. At last, the power to change everything.',
  '"Let us schedule a quick meeting."',
  'And so the journey ends. Until someone schedules another meeting.',
];

export class CorporateEnding {
  constructor(container, result, { onRestart, onOffice, onCrawlComplete, bestTime, newRecord }) {
    this.container = container;
    this.result = result;
    this.actions = { onRestart, onOffice, onCrawlComplete, bestTime, newRecord };
    this.elapsed = 0;
    this.finished = false;
    container.hidden = false;
    container.innerHTML = `
      <div class="ending-stars" aria-hidden="true"></div>
      <div class="ending-heading"><span>WORKDAYLE</span><small>A FICTIONAL CORPORATE SPACE OPERA</small></div>
      <div class="crawl-viewport"><article class="corporate-crawl"><p class="crawl-kicker">CHAPTER IV</p><h1>THE FINAL<br>ALIGNMENT</h1>${CRAWL.map(text => `<p>${text}</p>`).join('')}<h2>THE END</h2></article></div>
      <div class="ending-footer"><span>CAREER COMPLETE &nbsp; / &nbsp; FINAL TIME ${formatTime(result.time)}</span><button id="skip-ending" class="secondary">Continue to CEO parade</button></div>
    `;
    this.crawl = container.querySelector('.corporate-crawl');
    container.querySelector('#skip-ending').onclick = () => this.finish();
    container.querySelector('button').focus();
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;
    this.container.style.opacity = Math.min(1, this.elapsed / 1.2);
    const start = this.container.clientHeight * 0.72;
    const end = -this.crawl.offsetHeight - 100;
    const progress = Math.min(1, Math.max(0, (this.elapsed - 1.5) / 38));
    this.crawl.style.transform = `rotateX(12deg) translateY(${start + (end - start) * progress}px)`;
    if (progress === 1) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.actions.onCrawlComplete();
  }

  showResults() {
    this.finished = true;
    const r = this.result;
    this.container.hidden = false;
    this.container.style.opacity = 1;
    this.container.innerHTML = `
      <div class="ending-stars" aria-hidden="true"></div>
      <section class="final-results" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <div class="eyebrow">WORKDAYLE COMPLETE / THE END</div>
        <h1 id="ending-title">YOU DID IT.<br><em>YOU ARE NOW THE CEO.</em></h1>
        <p class="ceo-final-story">Congratulations. You have successfully climbed the corporate ladder.<br>You started as a consultant. You answered the emails. You attended the meetings.<br>You delegated the work. You asked AI to do the rest. You defeated management.<br>And now... <strong>YOU ARE MANAGEMENT.</strong></p>
        <div class="final-time"><span>FINAL TIME</span><strong>${formatTime(r.time)}</strong><small>${r.legacy ? 'LEGACY CAREER / UNRANKED' : this.actions.newRecord ? 'NEW PERSONAL BEST' : `PERSONAL BEST ${formatTime(this.actions.bestTime ?? r.time)}`}</small></div>
        <div class="final-stat-grid"><div><strong>CEO</strong><span>FINAL JOB TITLE</span></div><div><strong>${r.rep}</strong><span>TOTAL REP</span></div><div><strong>${r.tasks}</strong><span>TASKS COMPLETED</span></div><div><strong>${r.bosses}</strong><span>BOSSES DEFEATED</span></div></div>
        <div class="final-rating"><span>CORPORATE SPEEDRUN RATING</span><h2>${r.rating.name}</h2><p>${r.rating.line}</p><strong>${r.score.toLocaleString('en-US')} <small>POINTS</small></strong></div>
        <div class="modal-footer"><button id="ending-restart" class="primary">One more workday</button><button id="ending-office" class="secondary">Enjoy the corner office</button></div>
        <p class="final-note">Score is based on completion time. Beat your best. Maybe take a lunch break first.</p>
      </section>
    `;
    this.container.querySelector('#ending-restart').onclick = this.actions.onRestart;
    this.container.querySelector('#ending-office').onclick = this.actions.onOffice;
    this.container.querySelector('#ending-restart').focus();
  }

  dispose() {
    this.container.hidden = true;
    this.container.replaceChildren();
    this.container.style.opacity = '';
  }
}
