import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CardView } from '../components/CardView';
import { generateLlmAnalysis, LLM_ANALYSIS_VERSION } from '../lib/llmAnalysis';
import { isLlmConfigUsable, loadLlmConfig } from '../lib/llmConfig';
import { getCardMeaning, updateSavedReading } from '../lib/reading';
import { getReadingContextLabel } from '../lib/readingPresentation';
import type { LlmAnalysis, ReadingResult } from '../types';

interface ResultPageProps {
  reading: ReadingResult;
  onRestart: () => void;
  onReadingUpdated: (reading: ReadingResult) => void;
}

const llmAnalysisRequests = new Map<string, Promise<LlmAnalysis>>();
const llmFailedAttempts = new Set<string>();

const getLlmAttemptKey = (reading: ReadingResult) => {
  const config = loadLlmConfig();
  return [
    reading.id,
    config.provider,
    config.baseUrl,
    config.model,
    config.thinkingEnabled ? 'thinking' : 'non-thinking',
  ].join('|');
};

const getLlmAnalysisRequest = (reading: ReadingResult, signal?: AbortSignal) => {
  const attemptKey = getLlmAttemptKey(reading);
  const existing = llmAnalysisRequests.get(attemptKey);
  if (existing) return existing;
  const request = generateLlmAnalysis(reading, loadLlmConfig(), signal).finally(() => {
    llmAnalysisRequests.delete(attemptKey);
  });
  llmAnalysisRequests.set(attemptKey, request);
  return request;
};

export function ResultPage({ reading, onRestart, onReadingUpdated }: ResultPageProps) {
  const savedLlmAnalysis =
    reading.llmAnalysis?.version === LLM_ANALYSIS_VERSION
      ? reading.llmAnalysis
      : undefined;
  const [llmAnalysis, setLlmAnalysis] = useState<LlmAnalysis | undefined>(savedLlmAnalysis);
  const [llmStatus, setLlmStatus] = useState<'disabled' | 'loading' | 'ready' | 'fallback'>('disabled');
  const [llmMessage, setLlmMessage] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const config = loadLlmConfig();
    const currentSavedAnalysis =
      reading.llmAnalysis?.version === LLM_ANALYSIS_VERSION
        ? reading.llmAnalysis
        : undefined;
    setLlmAnalysis(currentSavedAnalysis);

    if (!isLlmConfigUsable(config)) {
      setLlmStatus('disabled');
      setLlmMessage('未开启 LLM 辅助解析，当前使用默认牌义解析。');
      return () => {
        cancelled = true;
      };
    }

    if (currentSavedAnalysis) {
      setLlmStatus('ready');
      setLlmMessage(`LLM 辅助解析已生成：${currentSavedAnalysis.model}`);
      return () => {
        cancelled = true;
      };
    }

    const attemptKey = getLlmAttemptKey(reading);
    if (llmFailedAttempts.has(attemptKey)) {
      setLlmStatus('fallback');
      setLlmMessage('本次会话已尝试生成 LLM 解析但失败，避免重复请求。修改 LLM 配置后会重新尝试。');
      return () => {
        cancelled = true;
      };
    }

    setLlmStatus('loading');
    setLlmMessage('正在生成 LLM 辅助解析...');
    getLlmAnalysisRequest(reading, controller.signal)
      .then((analysis) => {
        if (cancelled) return;
        const updatedReading = { ...reading, llmAnalysis: analysis };
        setLlmAnalysis(analysis);
        setLlmStatus('ready');
        setLlmMessage(`LLM 辅助解析已生成：${analysis.model}`);
        updateSavedReading(updatedReading);
        onReadingUpdated(updatedReading);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        // AbortError means the user navigated away; do not update state
        if (error instanceof DOMException && error.name === 'AbortError') return;
        llmFailedAttempts.add(attemptKey);
        setLlmStatus('fallback');
        setLlmMessage(error.message);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [onReadingUpdated, reading, retryNonce]);

  const retryLlmAnalysis = () => {
    llmFailedAttempts.delete(getLlmAttemptKey(reading));
    setLlmAnalysis(undefined);
    setRetryNonce((current) => current + 1);
  };

  const canRetryLlm =
    llmStatus === 'fallback'
    && !savedLlmAnalysis
    && isLlmConfigUsable(loadLlmConfig());

  return (
    <main className="screen result-screen">
      <section className="section-header">
        <div>
          <h1>结果解析</h1>
          <p>{reading.question}</p>
        </div>
      </section>

      <section className="result-summary">
        <div>
          <span>{getReadingContextLabel(reading)}</span>
          <h2>{reading.spread.name}</h2>
          <p>{llmAnalysis?.overview ?? reading.summary}</p>
        </div>
      </section>

      <p className="entertainment-notice result-notice">
        本结果由塔罗牌与 AI 生成，纯属娱乐，仅供参考，不构成医疗、法律、投资或其他专业建议。
      </p>

      <section className={`llm-status-panel is-${llmStatus}`}>
        <Sparkles size={18} />
        <span>{llmMessage}</span>
        {canRetryLlm ? (
          <button className="llm-retry-button" type="button" onClick={retryLlmAnalysis}>
            重新请求 LLM
          </button>
        ) : null}
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
        <ol className="advice-list">
          {(llmAnalysis?.advice ?? reading.advice.split('\n')).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
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
          <Sparkles size={18} />
          开始新的占卜
        </button>
      </section>
    </main>
  );
}
