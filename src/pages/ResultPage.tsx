import { ArrowLeft, BookOpen, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CardView } from '../components/CardView';
import { getQuestionCategory, getTopic } from '../data/questions';
import { generateLlmAnalysis } from '../lib/llmAnalysis';
import { isLlmConfigUsable, loadLlmConfig } from '../lib/llmConfig';
import { getCardMeaning, updateSavedReading } from '../lib/reading';
import type { LlmAnalysis, ReadingResult } from '../types';

interface ResultPageProps {
  reading: ReadingResult;
  onRestart: () => void;
  onLibrary: () => void;
}

export function ResultPage({ reading, onRestart, onLibrary }: ResultPageProps) {
  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);
  const [llmAnalysis, setLlmAnalysis] = useState<LlmAnalysis | undefined>(reading.llmAnalysis);
  const [llmStatus, setLlmStatus] = useState<'disabled' | 'loading' | 'ready' | 'fallback'>('disabled');
  const [llmMessage, setLlmMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const config = loadLlmConfig();
    setLlmAnalysis(reading.llmAnalysis);

    if (!isLlmConfigUsable(config)) {
      setLlmStatus('disabled');
      setLlmMessage('未开启 LLM 辅助解析，当前使用默认牌义解析。');
      return () => {
        cancelled = true;
      };
    }

    if (reading.llmAnalysis) {
      setLlmStatus('ready');
      setLlmMessage(`LLM 辅助解析已生成：${reading.llmAnalysis.model}`);
      return () => {
        cancelled = true;
      };
    }

    setLlmStatus('loading');
    setLlmMessage('正在生成 LLM 辅助解析...');
    generateLlmAnalysis(reading, config)
      .then((analysis) => {
        if (cancelled) return;
        setLlmAnalysis(analysis);
        setLlmStatus('ready');
        setLlmMessage(`LLM 辅助解析已生成：${analysis.model}`);
        updateSavedReading({ ...reading, llmAnalysis: analysis });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setLlmStatus('fallback');
        setLlmMessage(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [reading]);

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
          <p>{llmAnalysis?.overview ?? reading.summary}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLibrary}>
          <BookOpen size={18} />
          查看牌义
        </button>
      </section>

      <section className={`llm-status-panel is-${llmStatus}`}>
        <Sparkles size={18} />
        <span>{llmMessage}</span>
      </section>

      <section className="drawn-card-list">
        {reading.cards.map((drawn, index) => {
          const meaning = getCardMeaning(drawn);
          const llmCard = llmAnalysis?.cards[index];
          return (
            <article className="drawn-card-row" key={drawn.position.id}>
              <CardView drawn={drawn} />
              <div>
                <span>{drawn.position.label}</span>
                <h3>{drawn.card.name} · {drawn.orientation === 'upright' ? '正位' : '逆位'}</h3>
                <p>{drawn.position.prompt}</p>
                <strong>{llmCard?.interpretation ?? meaning}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="advice-panel">
        <h2>行动建议</h2>
        {(llmAnalysis?.advice ?? reading.advice.split('\n')).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {llmAnalysis ? (
          <div className="llm-extra">
            <article>
              <h3>情绪反馈</h3>
              <p>{llmAnalysis.emotionalFeedback}</p>
            </article>
            <article>
              <h3>风险提醒</h3>
              {llmAnalysis.riskNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </article>
          </div>
        ) : null}
        <button className="primary-button" type="button" onClick={onRestart}>
          <RotateCcw size={18} />
          开始新的占卜
        </button>
      </section>
    </main>
  );
}
