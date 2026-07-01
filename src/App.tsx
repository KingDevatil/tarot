import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AmbientMusicControl } from './components/AmbientMusicControl';
import { NavBar } from './components/NavBar';
import { isBilibiliVariant } from './lib/appVariant';
import { loadHistory } from './lib/reading';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ReadingPage } from './pages/ReadingPage';
import { ResultPage } from './pages/ResultPage';
import { SettingsPage } from './pages/SettingsPage';
import type { AppView, ReadingInput, ReadingResult } from './types';

export function App() {
  const [view, setView] = useState<AppView>('home');
  const [history, setHistory] = useState<ReadingResult[]>([]);
  const [activeReading, setActiveReading] = useState<ReadingResult | null>(null);
  const [preparedReading, setPreparedReading] = useState<ReadingInput | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const navigate = (nextView: AppView) => {
    if (isBilibiliVariant && nextView === 'settings') {
      setView('home');
      return;
    }
    setView(nextView);
    if (nextView !== 'reading') {
      setPreparedReading(null);
    }
    if (nextView !== 'result') {
      setActiveReading(null);
    }
  };

  const startPreparedReading = (input: ReadingInput) => {
    setPreparedReading(input);
    setActiveReading(null);
    setView('reading');
  };

  const openReading = (reading: ReadingResult) => {
    setActiveReading(reading);
    setView('result');
  };

  const completeReading = (reading: ReadingResult) => {
    setHistory(loadHistory());
    openReading(reading);
  };

  const updateReading = useCallback((reading: ReadingResult) => {
    setActiveReading(reading);
    setHistory(loadHistory());
  }, []);

  const renderView = () => {
    if (view === 'reading') {
      return (
        <ReadingPage
          key={preparedReading
            ? `${preparedReading.questionSource}-${preparedReading.customContext}-${preparedReading.generatedQuestion}-${preparedReading.spreadId}`
            : 'manual'}
          initialInput={preparedReading ?? undefined}
          onComplete={completeReading}
          onExit={() => navigate('home')}
        />
      );
    }
    if (view === 'history') {
      return (
        <HistoryPage
          history={history}
          onOpen={openReading}
          onCleared={() => {
            setHistory([]);
            setView('home');
          }}
        />
      );
    }
    if (view === 'library') return <LibraryPage />;
    if (view === 'settings' && !isBilibiliVariant) return <SettingsPage />;
    if (view === 'result' && activeReading) {
      return (
        <ResultPage
          reading={activeReading}
          onRestart={() => navigate('home')}
          onReadingUpdated={updateReading}
        />
      );
    }
    return (
      <HomePage
        latest={history[0]}
        onNavigate={navigate}
        onOpenLatest={openReading}
        onStartReading={startPreparedReading}
      />
    );
  };

  return (
    <div className={`app-shell view-${view}`}>
      {view === 'home' ? <HomeAtmosphere /> : null}
      {renderView()}
      <AmbientMusicControl />
      <NavBar activeView={view} onNavigate={navigate} />
    </div>
  );
}

function HomeAtmosphere() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || reduceMotion) return undefined;

    let lastTrailAt = 0;

    const moveCursor = (event: PointerEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      const now = performance.now();
      if (!trailRef.current || now - lastTrailAt < 28) return;
      lastTrailAt = now;

      const spark = document.createElement('span');
      spark.className = 'cursor-comet';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--drift-x', `${-18 - Math.random() * 34}px`);
      spark.style.setProperty('--drift-y', `${8 + Math.random() * 28}px`);
      spark.style.setProperty('--spark-size', `${4 + Math.random() * 5}px`);
      trailRef.current.appendChild(spark);
      window.setTimeout(() => spark.remove(), 760);
    };

    window.addEventListener('pointermove', moveCursor, { passive: true });
    return () => window.removeEventListener('pointermove', moveCursor);
  }, []);

  return (
    <>
      <div className="home-atmosphere" aria-hidden="true">
        <div className="home-starry-bg" />
        <div className="home-mystic-mask" />
        <div className="meteor-field">
          <span className="meteor meteor-1" />
          <span className="meteor meteor-2" />
          <span className="meteor meteor-3" />
          <span className="meteor meteor-4" />
        </div>
      </div>
      <div className="home-cursor-layer" aria-hidden="true">
        <div className="cursor-trails" ref={trailRef} />
        <div className="star-cursor" ref={cursorRef}>
          <Sparkles size={18} />
        </div>
      </div>
    </>
  );
}
