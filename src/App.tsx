import { useCallback, useEffect, useState } from 'react';
import { NavBar } from './components/NavBar';
import { loadHistory } from './lib/reading';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ReadingPage } from './pages/ReadingPage';
import { ResultPage } from './pages/ResultPage';
import { SettingsPage } from './pages/SettingsPage';
import type { AppView, ReadingResult } from './types';

export function App() {
  const [view, setView] = useState<AppView>('home');
  const [history, setHistory] = useState<ReadingResult[]>([]);
  const [activeReading, setActiveReading] = useState<ReadingResult | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const navigate = (nextView: AppView) => {
    setView(nextView);
    if (nextView !== 'result') {
      setActiveReading((current) => (nextView === 'home' ? current : current));
    }
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
    if (view === 'reading') return <ReadingPage onComplete={completeReading} />;
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
      />
    );
  };

  return (
    <div className="app-shell">
      {renderView()}
      <NavBar activeView={view} onNavigate={navigate} />
    </div>
  );
}
