import { ArrowLeft, BookOpen, RotateCcw } from 'lucide-react';
import { CardView } from '../components/CardView';
import { getQuestionCategory, getTopic } from '../data/questions';
import { getCardMeaning } from '../lib/reading';
import type { ReadingResult } from '../types';

interface ResultPageProps {
  reading: ReadingResult;
  onRestart: () => void;
  onLibrary: () => void;
}

export function ResultPage({ reading, onRestart, onLibrary }: ResultPageProps) {
  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);

  return (
    <main className="screen result-screen">
      <section className="section-header">
        <div>
          <h1>结果解析</h1>
          <p>{reading.question}</p>
        </div>
        <button className="icon-text-button" type="button" onClick={onRestart}>
          <ArrowLeft size={18} />
          再占一次
        </button>
      </section>

      <section className="result-summary">
        <div>
          <span>{topic.name} / {category.label}</span>
          <h2>{reading.spread.name}</h2>
          <p>{reading.summary}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLibrary}>
          <BookOpen size={18} />
          查看牌义
        </button>
      </section>

      <section className="drawn-card-list">
        {reading.cards.map((drawn) => {
          const meaning = getCardMeaning(drawn);
          return (
            <article className="drawn-card-row" key={drawn.position.id}>
              <CardView drawn={drawn} />
              <div>
                <span>{drawn.position.label}</span>
                <h3>{drawn.card.name} · {drawn.orientation === 'upright' ? '正位' : '逆位'}</h3>
                <p>{drawn.position.prompt}</p>
                <strong>{meaning}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="advice-panel">
        <h2>行动建议</h2>
        {reading.advice.split('\n').map((line) => (
          <p key={line}>{line}</p>
        ))}
        <button className="primary-button" type="button" onClick={onRestart}>
          <RotateCcw size={18} />
          开始新的占卜
        </button>
      </section>
    </main>
  );
}
