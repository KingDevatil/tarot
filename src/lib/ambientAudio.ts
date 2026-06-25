// ──────────────────────────────────────────────────────────────────────────────
// Programmatic ambient BGM – melodic, eighth-note-scheduled, no permanent oscs
// ──────────────────────────────────────────────────────────────────────────────

// ── Audio-graph singletons ───────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let filter: BiquadFilterNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delayWet: GainNode | null = null;

let started = false;

// ── Scheduler state (persistent across interval ticks) ───────────────────────

let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;
let schedulerActive = false;
let currentStep = 0;
let nextStepTime = 0;

// Active voices awaiting scheduled stop / disconnect
const activeVoices = new Map<
  number,
  { osc: OscillatorNode; gain: GainNode; timeoutId: ReturnType<typeof setTimeout> }
>();
let voiceIdCounter = 0;

let fadeTimeoutId: ReturnType<typeof setTimeout> | null = null;

// ── Musical constants ────────────────────────────────────────────────────────

const BPM = 66;
const STEPS_PER_BEAT = 2; // eighth-note grid
const BEAT_SEC = 60 / BPM;
const EIGHTH_SEC = BEAT_SEC / STEPS_PER_BEAT; // ≈0.4545 s
const STEPS_PER_BAR = 4 * STEPS_PER_BEAT; // 8 steps per 4/4 bar
const LOOP_BARS = 16;
const LOOP_STEPS = LOOP_BARS * STEPS_PER_BAR; // 128 eighth-notes
const LOOKAHEAD = 0.1; // seconds to look ahead each scheduler tick

// ── Gain structure ───────────────────────────────────────────────────────────
// At user vol 0.70: 0.70 × 0.55 × 0.43 voice sum ≈ 0.17 peak.
// DynamicsCompressorNode (thr −12 dB) prevents clipping at max slider.

const MASTER_GAIN = 0.55;

const BASS_GAIN = 0.09;
const CHORD_GAIN = 0.07;
const ARP_GAIN = 0.08;
const MELODY_GAIN = 0.12;

const FILTER_FREQ = 900;
const FILTER_Q = 0.7;
const DELAY_TIME = EIGHTH_SEC * 3; // dotted quarter ≈ 1.364 s
const DELAY_FB_GAIN = 0.25;
const DELAY_WET_GAIN = 0.2;

// ── Envelope presets [attack, sustain, release] in seconds ────────────────────

// Bass: 1 bar long (8 eighth-notes × 0.4545 s ≈ 3.64 s)
const BASS_ENV: [number, number, number] = [0.18, 2.5, 1.0]; // total ≈ 3.68 s
// Chord pad: slightly shorter than a bar for breathing room
const CHORD_ENV: [number, number, number] = [0.15, 2.4, 1.0]; // total ≈ 3.55 s
// Arpeggio: per eighth-note
const ARP_ENV: [number, number, number] = [0.02, 0.25, 0.3]; // total ≈ 0.57 s
// Melody: per eighth-note, slightly longer tail
const MELODY_ENV: [number, number, number] = [0.04, 0.25, 0.45]; // total ≈ 0.74 s

// ── Chord progression (16 bars): Cmaj7 → Am7 → Fmaj7 → G ────────────────────

const BASS_NOTES: number[] = [
  130.81, 130.81, 130.81, 130.81,
  110.00, 110.00, 110.00, 110.00,
   87.31,  87.31,  87.31,  87.31,
   98.00,  98.00,  98.00,  98.00,
];

const CHORD_NOTES: number[][] = [
  [261.63, 329.63, 392.00, 493.88],
  [261.63, 329.63, 392.00, 493.88],
  [261.63, 329.63, 392.00, 493.88],
  [261.63, 329.63, 392.00, 493.88],
  [220.00, 261.63, 329.63, 392.00],
  [220.00, 261.63, 329.63, 392.00],
  [220.00, 261.63, 329.63, 392.00],
  [220.00, 261.63, 329.63, 392.00],
  [174.61, 220.00, 261.63, 329.63],
  [174.61, 220.00, 261.63, 329.63],
  [174.61, 220.00, 261.63, 329.63],
  [174.61, 220.00, 261.63, 329.63],
  [196.00, 246.94, 293.66, 392.00],
  [196.00, 246.94, 293.66, 392.00],
  [196.00, 246.94, 293.66, 392.00],
  [196.00, 246.94, 293.66, 392.00],
];

// Arpeggio: per-bar 4-note patterns (played per quarter-note beat, not eighth)
// Each bar has 4 arp notes cycling through chord tones with varied direction.
const ARP_PATTERNS: number[][] = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7 up
  [493.88, 392.00, 329.63, 261.63], // Cmaj7 down
  [329.63, 392.00, 493.88, 659.26], // Cmaj7 up-shifted
  [493.88, 329.63, 392.00, 261.63], // Cmaj7 wave
  [220.00, 261.63, 329.63, 392.00], // Am7 up
  [392.00, 329.63, 261.63, 220.00], // Am7 down
  [261.63, 329.63, 392.00, 523.25], // Am7 up to octave
  [392.00, 261.63, 329.63, 220.00], // Am7 wave
  [174.61, 220.00, 261.63, 329.63], // Fmaj7 up
  [329.63, 261.63, 220.00, 174.61], // Fmaj7 down
  [220.00, 261.63, 329.63, 440.00], // Fmaj7 up to A4
  [329.63, 220.00, 261.63, 174.61], // Fmaj7 wave
  [196.00, 246.94, 293.66, 392.00], // G up
  [392.00, 293.66, 246.94, 196.00], // G down
  [246.94, 293.66, 392.00, 493.88], // G up-shifted
  [392.00, 246.94, 293.66, 196.00], // G wave
];

// ── Melody: 16 bars × 8 eighth-notes. 0 = rest ──────────────────────────────

const MELODY: number[][] = [
  [523.25,     0, 587.33,     0, 659.26,     0, 587.33,     0],
  [523.25,     0, 493.88,     0, 440.00,     0,        0,     0],
  [392.00,     0, 440.00,     0, 493.88,     0, 523.25,     0],
  [587.33,     0,        0,     0, 493.88,     0,        0,     0],
  [523.25,     0, 587.33,     0, 659.26,     0, 783.99,     0],
  [659.26,     0, 587.33,     0, 523.25,     0,        0,     0],
  [440.00,     0, 493.88,     0, 523.25,     0, 587.33,     0],
  [523.25,     0,        0,     0,        0,     0,        0,     0],
  [659.26,     0,        0,     0, 783.99,     0,        0,     0],
  [880.00,     0, 783.99,     0, 659.26,     0,        0,     0],
  [587.33,     0, 523.25,     0, 493.88,     0, 523.25,     0],
  [587.33,     0,        0,     0,        0,     0,        0,     0],
  [783.99,     0, 659.26,     0, 587.33,     0, 523.25,     0],
  [493.88,     0, 523.25,     0, 587.33,     0,        0,     0],
  [659.26,     0, 587.33,     0, 523.25,     0, 493.88,     0],
  [523.25,     0,        0,     0,        0,     0,        0,     0],
];

// ── Shared cleanup (used by stopAmbient and catch branches) ──────────────────

function cleanupAll() {
  if (schedulerIntervalId != null) { clearInterval(schedulerIntervalId); schedulerIntervalId = null; }
  if (fadeTimeoutId != null) { clearTimeout(fadeTimeoutId); fadeTimeoutId = null; }

  for (const [, v] of activeVoices) {
    clearTimeout(v.timeoutId);
    try { v.osc.stop(); } catch { /* */ }
    try { v.osc.disconnect(); } catch { /* */ }
    try { v.gain.disconnect(); } catch { /* */ }
  }
  activeVoices.clear();

  filter?.disconnect();       filter = null;
  delayNode?.disconnect();    delayNode = null;
  delayFeedback?.disconnect(); delayFeedback = null;
  delayWet?.disconnect();     delayWet = null;
  master?.disconnect();       master = null;
  compressor?.disconnect();   compressor = null;

  try { ctx?.close(); } catch { /* */ }
  ctx = null;

  schedulerActive = false;
  currentStep = 0;
  nextStepTime = 0;
  voiceIdCounter = 0;
  started = false;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isAudioContextReady(): boolean {
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return Boolean(window.AudioContext || w.webkitAudioContext);
}

export async function startAmbient(volume: number): Promise<boolean> {
  if (started) return true;
  if (!isAudioContextReady()) return false;

  let localCtx: AudioContext | null = null;
  try {
    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || w.webkitAudioContext;
    if (!AC) return false;

    localCtx = new AC();
    ctx = localCtx;

    // ── Build audio graph ──────────────────────────────────────────────────
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(compressor);

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = FILTER_FREQ;
    filter.Q.value = FILTER_Q;
    filter.connect(master);

    // Feedback delay for arpeggio spaciousness
    delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = DELAY_TIME;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = DELAY_FB_GAIN;
    delayWet = ctx.createGain();
    delayWet.gain.value = DELAY_WET_GAIN;
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);
    delayWet.connect(master);

    // ── Scheduler init (persistent nextStepTime) ───────────────────────────
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05; // tiny offset to fill initial buffer
    schedulerActive = true;

    schedulerIntervalId = setInterval(schedulerTick, 25);
    schedulerTick(); // kick off first batch immediately

    // ── Fade in over 2 s ───────────────────────────────────────────────────
    const target = volume * MASTER_GAIN;
    const now = ctx.currentTime;
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(target, now + 2.0);

    started = true;
    if (localCtx.state === "suspended") void localCtx.resume();
    return true;
  } catch {
    // Clean up anything partially created
    cleanupAll();
    return false;
  }
}

export function stopAmbient() {
  if (!started && !ctx) return;
  cleanupAll();
}

export function setAmbientVolume(v: number) {
  if (!master || !ctx) return;
  if (fadeTimeoutId != null) { clearTimeout(fadeTimeoutId); fadeTimeoutId = null; }
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(v * MASTER_GAIN, now + 0.15);
  fadeTimeoutId = setTimeout(() => { fadeTimeoutId = null; }, 200);
}

export function getAmbientDebugState() {
  return {
    started,
    contextState: ctx?.state ?? null,
    bpm: BPM,
    currentStep,
    nextStepTime,
    scheduledVoiceCount: activeVoices.size,
    schedulerActive,
    masterGain: master?.gain.value ?? null,
  };
}

// ── Scheduler tick (persistent nextStepTime + currentStep) ───────────────────

function schedulerTick() {
  if (!schedulerActive || !ctx) return;
  while (nextStepTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(currentStep, nextStepTime);
    nextStepTime += EIGHTH_SEC;
    currentStep = (currentStep + 1) % LOOP_STEPS;
  }
}

// ── Per-step dispatch ────────────────────────────────────────────────────────

function scheduleStep(step: number, time: number) {
  const bar = Math.floor(step / STEPS_PER_BAR);    // 0-15
  const stepInBar = step % STEPS_PER_BAR;           // 0-7

  // Bass – once per bar (first step of bar)
  if (stepInBar === 0) {
    const freq = BASS_NOTES[bar];
    if (freq) createNote("sine", freq, BASS_GAIN, BASS_ENV, time);
  }

  // Chord pad – once per bar (first step of bar)
  if (stepInBar === 0) {
    const notes = CHORD_NOTES[bar];
    if (notes) for (const freq of notes) createNote("sine", freq, CHORD_GAIN, CHORD_ENV, time);
  }

  // Arpeggio – once per quarter-note beat (steps 0, 2, 4, 6 within bar)
  if (stepInBar % 2 === 0) {
    const arpIndex = Math.floor(stepInBar / 2); // 0-3
    const freq = ARP_PATTERNS[bar]?.[arpIndex];
    if (freq) createNote("triangle", freq, ARP_GAIN, ARP_ENV, time, true);
  }

  // Melody – every eighth-note step
  const freq = MELODY[bar]?.[stepInBar];
  if (freq && freq > 0) createNote("sine", freq, MELODY_GAIN, MELODY_ENV, time);
}

// ── Voice creation with envelope and auto-cleanup ────────────────────────────

function createNote(
  type: OscillatorType,
  freq: number,
  gainValue: number,
  env: [number, number, number],
  time: number,
  useDelay = false,
) {
  if (!ctx || !filter) return;
  if (!Number.isFinite(freq) || freq <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  // ADSR-ish: linear attack → hold → exponential release
  const [attack, sustain, release] = env;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(gainValue, time + attack);
  gain.gain.setValueAtTime(gainValue, time + attack + sustain);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + sustain + release);

  osc.connect(gain);
  gain.connect(filter);
  if (useDelay && delayNode) gain.connect(delayNode);

  osc.start(time);
  const stopTime = time + attack + sustain + release + 0.01;
  osc.stop(stopTime);

  const id = voiceIdCounter++;
  // Clamp timeout delay ≥ 0 to avoid negative timer values
  const timeoutMs = Math.max(0, (stopTime - ctx.currentTime + 0.05) * 1000);
  const timeoutId = setTimeout(() => {
    try { osc.disconnect(); } catch { /* */ }
    try { gain.disconnect(); } catch { /* */ }
    activeVoices.delete(id);
  }, timeoutMs);

  activeVoices.set(id, { osc, gain, timeoutId });
}
