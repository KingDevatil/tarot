import { useEffect, useRef, useState } from "react";
import { Music, Music2, Volume2, VolumeX } from "lucide-react";
import {
  startAmbient,
  stopAmbient,
  setAmbientVolume,
  isAudioContextReady,
} from "../lib/ambientAudio";

const STORAGE_KEY = "tarot-ambient-music";

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
        volume: typeof obj.volume === "number" ? obj.volume : 0.35,
      };
    }
  } catch {}
  return { playing: false, volume: 0.35 };
}

function savePrefs(prefs: StoredPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function AmbientMusicControl() {
  const prefsRef = useRef(loadPrefs());
  const [playing, setPlaying] = useState(false); // always starts silent
  const [volume, setVolume] = useState(() => prefsRef.current.volume);
  const [supported] = useState(isAudioContextReady);

  // Save preferences whenever they change
  useEffect(() => {
    savePrefs({ playing, volume });
  }, [playing, volume]);

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

  // Cleanup on unmount
  useEffect(() => () => stopAmbient(), []);

  if (!supported) return null;

  const toggle = () => {
    if (playing) {
      stopAmbient();
      setPlaying(false);
    } else {
      const ok = startAmbient(volume);
      if (ok) setPlaying(true);
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
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
        aria-pressed={playing}
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
            max={0.6}
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
