const CEO_TRACKS = import.meta.glob('../assets/**/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true, query: '?url', import: 'default',
});
const OPTIONAL_BOSS_AUDIO = import.meta.glob('../assets/audio/bosses/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true, query: '?url', import: 'default',
});

const CEO_BASE_VOLUME = 0.55;
const KJELL_CUES = {
  cmon: {
    filename: 'kjell_cmon.mp3',
    matcher: /kjell_cmon\.(mp3|ogg|wav|m4a|aac|flac)$/i,
    warning: '[Audio] Warning: Kjell CMON sound not found.',
  },
  random: {
    filename: 'kjell_random.mp3',
    matcher: /kjell_random\.(mp3|ogg|wav|m4a|aac|flac)$/i,
    warning: '[Audio] Warning: Kjell random voice sound not found.',
  },
};

export class GameAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.beat = 0;
    this.clock = 0;
    this.assetWarnings = new Set();
  }

  get muted() { return this._muted; }
  set muted(value) {
    this._muted = Boolean(value);
    if (this.ceoTrack) this.ceoTrack.muted = this._muted;
  }

  startCEO(notify, tracks = CEO_TRACKS) {
    const entries = Object.entries(tracks).sort(([a], [b]) => a.localeCompare(b));
    const chosen = entries.find(([path]) => /\/music\//.test(path)) ?? entries[0];
    if (!chosen) {
      console.warn('Workdayle CEO cinematic: no supplied song found in assets/music (mp3, ogg, wav, m4a, aac or flac). Continuing without music.');
      notify('CEO soundtrack missing from assets/music. The applause is implied.');
      return;
    }
    if (this.ceoTrack && this.ceoTrack.dataset?.source === chosen[0]) {
      this.ceoNotice = notify;
      this.ceoPhase = 'parade';
      this.resumeCEO();
      return;
    }
    this.stopCEO();
    this.ceoTrack = new Audio(chosen[1]);
    this.ceoTrack.dataset.source = chosen[0];
    this.ceoTrack.preload = 'auto';
    this.ceoTrack.loop = false;
    this.ceoTrack.volume = 0;
    this.ceoTrack.muted = this.muted;
    this.ceoNotice = notify;
    this.ceoPhase = 'parade';
    this.ceoTrack.addEventListener('error', () => {
      console.warn(`Workdayle could not load supplied CEO song ${chosen[0]}. Continuing without music.`);
      notify('The supplied CEO song could not be loaded. The parade continues.');
    }, { once: true });
    this.ceoTrack.addEventListener('ended', () => {
      if (this.ceoTrack?.dataset?.source !== chosen[0]) return;
      this.ceoTrack = null;
      this.ceoNotice = null;
      this.ceoPhase = null;
    }, { once: true });
    this.resumeCEO();
  }

  hasCEOTrack() { return Boolean(this.ceoTrack); }

  resumeCEO() {
    if (!this.ceoTrack) return;
    const track = this.ceoTrack;
    const notify = this.ceoNotice;
    track.play().catch(error => {
      if (error.name === 'AbortError' || track !== this.ceoTrack) return;
      console.warn('Workdayle CEO music playback was unavailable:', error);
      notify('Music playback was blocked. Unmute or resume the parade to try again.');
    });
  }

  pauseCEO() { this.ceoTrack?.pause(); }

  updateCEO(mode = this.ceoPhase, elapsed = 0, duration = 0) {
    if (!this.ceoTrack) return;
    this.ceoPhase = mode || this.ceoPhase || 'office';
    const fadeIn = Math.max(0, Math.min(1, elapsed / 1.2));
    const phaseVolume = this.ceoPhase === 'parade'
      ? CEO_BASE_VOLUME * fadeIn
      : this.ceoPhase === 'reveal'
        ? CEO_BASE_VOLUME
        : CEO_BASE_VOLUME * 0.95;
    const naturalFade = Number.isFinite(duration) && duration > 0 && this.ceoTrack.duration && Number.isFinite(this.ceoTrack.duration)
      ? Math.max(0, Math.min(1, (this.ceoTrack.duration - this.ceoTrack.currentTime) / Math.max(4, duration)))
      : 1;
    this.ceoTrack.volume = Math.max(0, Math.min(1, phaseVolume * naturalFade));
  }

  stopCEO() {
    if (!this.ceoTrack) return;
    this.ceoTrack.pause();
    this.ceoTrack.removeAttribute('src');
    this.ceoTrack.load();
    this.ceoTrack = null;
    this.ceoNotice = null;
    this.ceoPhase = null;
  }

  resolveOptionalBossCue(kind, tracks = OPTIONAL_BOSS_AUDIO) {
    const cue = KJELL_CUES[kind];
    if (!cue) return null;
    const entry = Object.entries(tracks).find(([path]) => cue.matcher.test(path.replaceAll('\\', '/')));
    if (entry) return entry[1];
    if (!this.assetWarnings.has(cue.filename)) {
      this.assetWarnings.add(cue.filename);
      console.warn(`${cue.warning} Expected assets/audio/bosses/${cue.filename}`);
    }
    return null;
  }

  playKjellCue(kind) {
    if (this.muted) return false;
    const source = this.resolveOptionalBossCue(kind);
    if (!source) return false;
    const label = kind === 'cmon' ? 'Kjell CMON cue' : 'Kjell random voice cue';
    const clip = new Audio(source);
    clip.preload = 'auto';
    clip.volume = kind === 'cmon' ? 0.9 : 0.72;
    clip.muted = this.muted;
    clip.addEventListener('error', () => {
      console.warn(`[Audio] Warning: ${label} could not be loaded.`);
    }, { once: true });
    clip.play().catch(error => {
      if (error?.name === 'AbortError') return;
      console.warn(`[Audio] Warning: ${label} playback failed.`, error);
    });
    return true;
  }

  start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration = 0.1, type = 'sine', volume = 0.035, delay = 0) {
    if (!this.context || this.muted) return;
    const t = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  play(name) {
    const notes = {
      success: [523, 659, 784, 1046], promotion: [392, 523, 659, 784, 1046],
      punch: [90, 55], hurt: [120, 65], dodge: [300, 600],
      telegraph: [220, 220, 220], error: [180, 140], click: [650], attack: [70],
      candy: [440, 660, 880, 330], number: [293, 196, 147],
      newsletter: [700, 900, 500], hole: [110, 75, 48],
      uppercut: [65, 49, 33, 98], aura: [98, 147, 196, 294, 392],
    }[name] || [440];
    notes.forEach((frequency, i) => this.tone(frequency, name === 'promotion' ? 0.3 : 0.13,
      ['punch', 'hurt', 'attack', 'uppercut', 'hole'].includes(name) ? 'sawtooth' : 'sine', 0.05, i * 0.095));
  }

  update(dt, mode) {
    if (!['office', 'combat', 'final', 'ending'].includes(mode)) return;
    const combat = mode === 'combat' || mode === 'final';
    if (this.mode !== mode) {
      this.mode = mode;
      this.clock = 0;
      this.beat = 0;
    }
    this.clock += dt;
    const interval = mode === 'final' ? 0.17 : combat ? 0.21 : mode === 'ending' ? 0.8 : 0.55;
    if (this.clock < interval) return;
    this.clock = 0;
    const sequence = mode === 'final' ? [73.42, 73.42, 110, 98, 87.31, 73.42, 130.81, 110]
      : combat ? [110, 110, 130.81, 110, 146.83, 110, 164.81, 130.81]
      : mode === 'ending' ? [196, 246.94, 293.66, 369.99, 329.63, 246.94, 220, 293.66]
      : [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];
    const note = sequence[this.beat++ % sequence.length];
    this.tone(note, combat ? 0.16 : 0.65, combat ? 'triangle' : 'sine', combat ? 0.022 : 0.008);
    if (combat && this.beat % 2 === 0) this.tone(45, 0.1, 'triangle', 0.04);
    if (mode === 'final' && this.beat % 4 === 0) {
      this.tone(note * 2, 0.32, 'sawtooth', 0.012);
      this.tone(note * 3, 0.3, 'triangle', 0.01, 0.04);
    }
    if (mode === 'ending') this.tone(note * 1.5, 1.2, 'sine', 0.006, 0.1);
  }
}
