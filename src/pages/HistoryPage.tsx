import { Trash2 } from 'lucide-react';
import { clearHistory } from '../lib/reading';
import type { ReadingResult } from '../types';

interface HistoryPageProps {
  history: ReadingResult[];
  onOpen: (reading: ReadingResult) => void;
  onCleared: () => void;
}

export function HistoryPage({ history, onOpen, onCleared }: HistoryPageProps) {
  const clear = () => {
    clearHistory();
    onCleared();
  };

  return (
    <main className="screen history-screen">
      <section className="section-header">
        <div>
          <h1>历史记录</h1>
          <p>本地保存最近 20 次占卜，便于复盘和观察趋势。</p>
        </div>
        {history.length ? (
          <button className="icon-text-button" type="button" onClick={clear}>
            <Trash2 size={18} />
            清空
          </button>
        ) : null}
      </section>

      <section className="history-list">
        {history.length ? (
          history.map((item) => (
            <button className="history-item" type="button" key={item.id} onClick={() => onOpen(item)}>
              <span>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
              <strong>{item.question}</strong>
              <em>{item.spread.name} · {item.cards.map((drawn) => drawn.card.name).join(' / ')}</em>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <h2>暂无记录</h2>
            <p>完成一次占卜后，结果会自动保存到本机浏览器。</p>
          </div>
        )}
      </section>
    </main>
  );
}
