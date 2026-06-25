import { useCallback, useEffect, useState } from 'react';
import { AmbientMusicControl } from './components/AmbientMusicControl';
import { NavBar } from './components/NavBar';
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
          key={preparedReading ? `${preparedReading.generatedQuestion}-${preparedReading.spreadId}` : 'manual'}
          initialInput={preparedReading ?? undefined}
          onComplete={completeReading}
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
    if (view === 'settings') return <SettingsPage />;
    if (view === 'result' && activeReading) {
      return (
        <ResultPage
          reading={activeReading}
          onRestart={() => setView('reading')}
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
    <div className="app-shell">
      {renderView()}
      <AmbientMusicControl />
      <NavBar activeView={view} onNavigate={navigate} />
    </div>
  );
}
