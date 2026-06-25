let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let started = false;

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

export function startAmbient(volume: number): boolean {
  if (started) return true;
  if (!isAudioContextReady()) return false;
  try {
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    master = ctx.createGain();
    master.gain.value = volume * 0.18;
    master.connect(ctx.destination);

    // Pad layers — quiet major triad with perfect fifth
    createOsc('sine',     130.81, 0.13);  // C3
    createOsc('sine',     164.81, 0.10);  // E3
    createOsc('sine',     196.00, 0.10);  // G3
    createOsc('sine',      98.00, 0.07);  // G2 bass
    createOsc('triangle', 261.63, 0.04);  // C4 shimmer
    createOsc('sine',     329.63, 0.03);  // E4 overtone

    // Slow volume lfo
    lfo = ctx.createOscillator();
    lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = volume * 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    nodes.push(lfo, lfoGain);

    started = true;
    return true;
  } catch { return false; }
}

export function stopAmbient() {
  if (!started || !ctx) return;
  try {
    nodes.forEach(n => { try { n.disconnect(); } catch {} });
    lfo?.stop();
    ctx.close();
  } catch {}
  ctx = null; master = null; nodes = []; lfo = null; lfoGain = null;
  started = false;
}

export function setAmbientVolume(v: number) {
  if (master) master.gain.value = v * 0.18;
  if (lfoGain) lfoGain.gain.value = v * 0.008;
}
