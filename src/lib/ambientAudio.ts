let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let started = false;

/** Unified master scale — keeps master gain proportional across all call sites. */
const MASTER_SCALE = 0.6;

function createOsc(type: OscillatorType, freq: number, gain: number) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g);
  g.connect(master!);
  o.start();
  nodes.push(o, g);
  return o;
}

export function isAudioContextReady(): boolean {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return Boolean(window.AudioContext || audioWindow.webkitAudioContext);
}

export async function startAmbient(volume: number): Promise<boolean> {
  if (started) return true;
  if (!isAudioContextReady()) return false;

  let localCtx: AudioContext | null = null;
  try {
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AC) return false;

    localCtx = new AC();
    ctx = localCtx;

    master = ctx.createGain();
    master.gain.value = 0; // will fade in
    master.connect(ctx.destination);

    // Pad layers — quiet major triad with perfect fifth
    // Individual gains kept low; MASTER_SCALE provides the audible level.
    createOsc("sine",     130.81, 0.10);  // C3
    createOsc("sine",     164.81, 0.08);  // E3
    createOsc("sine",     196.00, 0.08);  // G3
    createOsc("sine",      98.00, 0.06);  // G2 bass
    createOsc("triangle", 261.63, 0.04);  // C4 shimmer
    createOsc("sine",     329.63, 0.03);  // E4 overtone

    // Slow volume lfo
    lfo = ctx.createOscillator();
    lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = volume * 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    nodes.push(lfo, lfoGain);

    // Fade in master gain over 100 ms
    const target = volume * MASTER_SCALE;
    const now = ctx.currentTime;
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(target, now + 0.1);

    started = true;
    if (localCtx.state === "suspended") {
      void localCtx.resume();
    }
    return true;
  } catch {
    // Full cleanup on failure — must not leave half-created state
    if (localCtx) {
      try { localCtx.close(); } catch { /* ignore */ }
    }
    ctx = null;
    master = null;
    nodes = [];
    lfo = null;
    lfoGain = null;
    started = false;
    return false;
  }
}

export function stopAmbient() {
  if (!started || !ctx) return;
  try {
    nodes.forEach((n) => { try { n.disconnect(); } catch { /* ignore */ } });
    lfo?.stop();
    ctx.close();
  } catch { /* ignore */ }
  ctx = null; master = null; nodes = []; lfo = null; lfoGain = null;
  started = false;
}

export function setAmbientVolume(v: number) {
  if (master) master.gain.value = v * MASTER_SCALE;
  if (lfoGain) lfoGain.gain.value = v * 0.01;
}
