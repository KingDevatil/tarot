const AMBIENT_TRACK_SRC = "/assets/audio/mystic-journey.mp3";
const MASTER_GAIN = 0.46;

let audio: HTMLAudioElement | null = null;
let started = false;

function createAudio(src: string): HTMLAudioElement {
  const player = new Audio(src);
  player.loop = true;
  player.preload = "auto";
  return player;
}

function getAudio(): HTMLAudioElement {
  if (!audio) audio = createAudio(AMBIENT_TRACK_SRC);
  return audio;
}

export function isAudioContextReady(): boolean {
  return typeof Audio !== "undefined";
}

export function preloadAmbient() {
  if (isAudioContextReady()) getAudio().load();
}

export async function startAmbient(volume: number): Promise<boolean> {
  if (!isAudioContextReady()) return false;

  const player = getAudio();
  player.volume = Math.max(0, Math.min(1, volume * MASTER_GAIN));

  try {
    await player.play();
    started = true;
    return true;
  } catch {
    started = false;
    return false;
  }
}

export function stopAmbient() {
  if (!audio) return;
  audio.pause();
  started = false;
}

export function setAmbientVolume(v: number) {
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, v * MASTER_GAIN));
}

export function getAmbientDebugState() {
  return {
    started,
    source: AMBIENT_TRACK_SRC,
    paused: audio?.paused ?? true,
    currentTime: audio?.currentTime ?? 0,
    duration: Number.isFinite(audio?.duration) ? audio?.duration ?? null : null,
    volume: audio?.volume ?? null,
  };
}
