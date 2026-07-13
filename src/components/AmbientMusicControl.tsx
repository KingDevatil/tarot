import { useEffect, useRef, useState } from "react";
import { Music, Music2, Volume2, VolumeX } from "lucide-react";
import {
  startAmbient,
  stopAmbient,
  setAmbientVolume,
  isAudioContextReady,
  preloadAmbient,
} from "../lib/ambientAudio";

const STORAGE_KEY = "tarot-ambient-music-v2";

interface StoredPrefs {
  playing: boolean;
  volume: number;
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        playing: Boolean(obj.playing),
        volume: typeof obj.volume === "number" ? obj.volume : 0.7,
      };
    }
  } catch {}
  return { playing: true, volume: 0.7 };
}

function savePrefs(prefs: StoredPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function AmbientMusicControl() {
  const prefsRef = useRef(loadPrefs());
  const [playing, setPlaying] = useState(false);
  const [wantsPlayback, setWantsPlayback] = useState(prefsRef.current.playing);
  const [volume, setVolume] = useState(() => Math.min(prefsRef.current.volume, 1));
  const [supported] = useState(isAudioContextReady);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  // Save preferences whenever they change
  useEffect(() => {
    savePrefs({ playing: wantsPlayback, volume });
  }, [wantsPlayback, volume]);

  useEffect(() => {
    preloadAmbient();
  }, []);

  useEffect(() => {
    if (!supported || !wantsPlayback || playing || startingRef.current) return;

    let cancelled = false;
    const beginPlayback = async () => {
      if (startingRef.current || cancelled) return;
      startingRef.current = true;
      setStarting(true);
      try {
        const ok = await startAmbient(volume);
        if (!mountedRef.current || cancelled) {
          if (ok) stopAmbient();
          return;
        }
        if (ok) setPlaying(true);
      } finally {
        startingRef.current = false;
        if (mountedRef.current && !cancelled) setStarting(false);
      }
    };

    void beginPlayback();
    window.addEventListener("pointerdown", beginPlayback, { once: true, passive: true });
    window.addEventListener("keydown", beginPlayback, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", beginPlayback);
      window.removeEventListener("keydown", beginPlayback);
    };
  }, [playing, supported, volume, wantsPlayback]);

  // Pause on hidden tab, restore when visible
  useEffect(() => {
    if (!playing) return;
    const onVis = () => {
      if (document.hidden) setAmbientVolume(0);
      else setAmbientVolume(volume);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [playing, volume]);

  // Cleanup on unmount, including an AudioContext that finishes resuming late.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAmbient();
    };
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    if (playing) {
      stopAmbient();
      setPlaying(false);
      setWantsPlayback(false);
      return;
    }
    // Guard against double-click while AudioContext is resuming
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      const ok = await startAmbient(volume);
      if (!mountedRef.current) {
        if (ok) stopAmbient();
        return;
      }
      setWantsPlayback(true);
      if (ok) setPlaying(true);
      // On failure: keep playing=false, user sees no false-positive state
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (playing) setAmbientVolume(v);
  };

  return (
    <div className="ambient-music-control" role="group" aria-label="背景音乐控制">
      <button
        className="ambient-toggle"
        type="button"
        onClick={toggle}
        disabled={starting}
        aria-pressed={playing}
        aria-busy={starting || undefined}
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
        title={playing ? "暂停" : "播放背景音乐"}
      >
        {playing ? <Music size={15} /> : <Music2 size={15} />}
      </button>
      {playing ? (
        <div className="ambient-volume-row">
          <VolumeX size={13} aria-hidden="true" />
          <input
            className="ambient-volume"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={onVolume}
            aria-label="背景音乐音量"
          />
          <Volume2 size={13} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
