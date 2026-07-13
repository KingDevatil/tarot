import {
  ArrowRight,
  Clock3,
  History,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { getSpread } from '../data/spreads';
import { analyzeDivinationQuestion } from '../lib/llmAnalysis';
import { loadLlmConfig, resolveLlmConfig } from '../lib/llmConfig';
import { createFreeformReadingInput } from '../lib/readingFlow';
import type {
  AppView,
  QuestionAnalysis,
  ReadingInput,
  ReadingResult,
} from '../types';

interface HomePageProps {
  latest?: ReadingResult;
  onNavigate: (view: AppView) => void;
  onOpenLatest: (reading: ReadingResult) => void;
  onStartReading: (input: ReadingInput) => void;
}

export function HomePage({
  latest,
  onNavigate,
  onOpenLatest,
  onStartReading,
}: HomePageProps) {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const llmConfig = resolveLlmConfig(loadLlmConfig(), `question-${crypto.randomUUID()}`);
    setStatus('loading');
    try {
      const nextAnalysis = await analyzeDivinationQuestion(question, llmConfig);
      setAnalysis(nextAnalysis);
      setSelectedFlowId(nextAnalysis.recommendations[0]?.id ?? '');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '暂时无法分析这个问题，请稍后再试');
    }
  };

  const resetQuestion = () => {
    setAnalysis(null);
    setSelectedFlowId('');
    setMessage('');
    setStatus('idle');
  };

  const beginReading = () => {
    if (!analysis) return;
    const selected = flowOptions.find((item) => item.id === selectedFlowId);
    if (!selected) return;
    onStartReading(createFreeformReadingInput(question, analysis, selected.spreadId));
  };

  const flowOptions = analysis
    ? analysis.recommendations.some((item) => item.spreadId === 'single')
      ? analysis.recommendations
      : [
          {
            id: 'single-card-quick',
            spreadId: 'single' as const,
            title: '一张牌快速占卜',
            reason: '用一张牌先抓住问题的核心提醒，适合想快速获得一个观察角度的时候。',
            detail: '1 张牌 · 适合快速指引',
            estimatedMinutes: '约 2 分钟',
          },
          ...analysis.recommendations,
        ]
    : [];

  return (
    <main className="screen home-search-screen">
      <header className="home-search-header">
        <button className="home-brand" type="button" onClick={resetQuestion}>
          <span aria-hidden="true">✦</span>
          <strong>塔罗占卜</strong>
        </button>
        <button className="home-history-link" type="button" onClick={() => onNavigate('history')}>
          <History size={17} />
          查看历史
        </button>
      </header>

      <section className={`question-search ${analysis ? 'has-results' : ''}`}>
        <div className="question-search-copy">
          <h1>你想问塔罗什么？</h1>
          <p>写下此刻最想厘清的问题，我们会为你匹配合适的占卜方式。</p>
        </div>

        <form className="question-search-form" onSubmit={submitQuestion}>
          <Search size={22} aria-hidden="true" />
          <textarea
            aria-label="要占卜的问题"
            value={question}
            maxLength={300}
            rows={1}
            placeholder="例如：未来三个月，我和他的关系会怎样发展？"
            onChange={(event) => {
              setQuestion(event.target.value);
              if (message) setMessage('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            className="question-submit-button"
            type="submit"
            disabled={status === 'loading' || question.trim().length < 4}
          >
            {status === 'loading' ? (
              <LoaderCircle className="is-spinning" size={19} />
            ) : (
              <Sparkles size={19} />
            )}
            <span>{status === 'loading' ? '正在分析' : '分析问题'}</span>
          </button>
        </form>
        <div className="question-search-meta">
          <span>{question.length} / 300</span>
          <span>Enter 分析 · Shift + Enter 换行</span>
        </div>
        {message ? <p className="question-search-error" role="alert">{message}</p> : null}

        {status === 'loading' ? (
          <div className="question-analysis-loading" role="status">
            <span />
            <div>
              <strong>正在理解你的问题</strong>
              <p>识别主题、时间范围与适合的牌阵结构…</p>
            </div>
          </div>
        ) : null}
      </section>

      {analysis && status !== 'loading' ? (
        <section className="flow-recommendations" aria-live="polite">
          <div className="flow-recommendations-header">
            <div>
              <p className="analysis-category">
                {analysis.categoryLabel}
                <span>{analysis.source === 'llm' ? 'LLM 分析' : '智能匹配'}</span>
              </p>
              <h2>选择占卜方式</h2>
              <blockquote>
                <strong>意图摘要（仅用于匹配）：</strong>
                {analysis.normalizedQuestion}
              </blockquote>
            </div>
            <button className="change-question-button" type="button" onClick={resetQuestion}>
              <RotateCcw size={16} />
              换一个问题
            </button>
          </div>

          <div className="flow-option-list" role="radiogroup" aria-label="占卜方式">
            {flowOptions.map((flow, index) => {
              const spread = getSpread(flow.spreadId);
              const isSelected = flow.id === selectedFlowId;
              return (
                <button
                  key={flow.id}
                  className={`flow-option ${isSelected ? 'is-selected' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedFlowId(flow.id)}
                >
                  <span className="flow-option-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flow-option-copy">
                    <strong>{flow.title}</strong>
                    <span>{flow.reason}</span>
                  </span>
                  <span className="flow-option-meta">
                    <span>{spread.positions.length} 张牌</span>
                    <span>{flow.estimatedMinutes}</span>
                  </span>
                  <span className="flow-option-check" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="flow-confirmation">
            <p>选择后将进入专注、洗牌、切牌与抽牌流程。</p>
            <button className="primary-button" type="button" onClick={beginReading}>
              选择此方式
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : null}

      {!analysis && status !== 'loading' ? (
        <footer className="home-search-footer">
          <p>塔罗占卜仅供自我观察与娱乐参考，不替代医疗、法律或投资等专业建议。</p>
          {latest ? (
            <button type="button" onClick={() => onOpenLatest(latest)}>
              <Clock3 size={16} />
              继续查看上次占卜：{latest.question}
            </button>
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}
