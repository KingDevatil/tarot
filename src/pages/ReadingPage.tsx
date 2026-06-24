import { ChevronLeft, LoaderCircle, RotateCcw, Shuffle, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CardView } from '../components/CardView';
import { paramOptions, questionCategories, topics } from '../data/questions';
import { getSpread } from '../data/spreads';
import { generateLlmQuestion } from '../lib/llmAnalysis';
import { loadLlmConfig } from '../lib/llmConfig';
import {
  buildQuestion,
  createDrawDeck,
  createReadingFromDraws,
  saveReading,
  type DrawCandidate,
} from '../lib/reading';
import type { DrawnCard, ParamKey, ReadingResult, TopicId } from '../types';

interface ReadingPageProps {
  onComplete: (reading: ReadingResult) => void;
}

type RitualStage = 'select' | 'shuffle' | 'cut' | 'draw';

const SHUFFLE_TRANSITION_MS = 900;
const CUT_TRANSITION_MS = 760;
const CARD_REVEAL_MS = 720;

export function ReadingPage({ onComplete }: ReadingPageProps) {
  const [topicId, setTopicId] = useState<TopicId>('daily');
  const categories = questionCategories.filter((item) => item.topic === topicId);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const category = questionCategories.find((item) => item.id === categoryId) ?? categories[0];
  const [params, setParams] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<RitualStage>('select');
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [pickedSlots, setPickedSlots] = useState<number[]>([]);
  const [drawDeck, setDrawDeck] = useState<DrawCandidate[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isDrawCompleteOpen, setIsDrawCompleteOpen] = useState(false);
  const [selectedShuffleCard, setSelectedShuffleCard] = useState<number | null>(null);
  const [selectedCutPile, setSelectedCutPile] = useState<number | null>(null);
  const [revealingSlot, setRevealingSlot] = useState<number | null>(null);
  const transitionTimers = useRef<number[]>([]);
  const [llmConfig] = useState(() => loadLlmConfig());
  const [customContexts, setCustomContexts] = useState<Record<string, string>>({});
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<string, string>>({});
  const [questionGeneration, setQuestionGeneration] = useState<{
    categoryId: string;
    status: 'idle' | 'loading' | 'error';
    message: string;
  }>({ categoryId: '', status: 'idle', message: '' });

  const selectedTopic = topics.find((item) => item.id === topicId) ?? topics[0];
  const SelectedTopicIcon = selectedTopic.icon;
  const currentSpread = getSpread(category.defaultSpread);

  const standardQuestion = useMemo(
    () => buildQuestion(category.questionTemplate, params),
    [category.questionTemplate, params],
  );
  const customContext = customContexts[categoryId] ?? '';
  const generatedQuestion = generatedQuestions[categoryId] ?? '';
  const question = generatedQuestion || standardQuestion;

  useEffect(() => () => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const scheduleTransition = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      transitionTimers.current = transitionTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);
    transitionTimers.current.push(timer);
  };

  const resetRitualAnimation = () => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimers.current = [];
    setSelectedShuffleCard(null);
    setSelectedCutPile(null);
    setRevealingSlot(null);
  };

  const setTopic = (nextTopicId: TopicId) => {
    resetRitualAnimation();
    const nextCategory = questionCategories.find((item) => item.topic === nextTopicId);
    setTopicId(nextTopicId);
    setCategoryId(nextCategory?.id ?? categoryId);
    setParams({});
    setStage('select');
    setReading(null);
    setPickedSlots([]);
    setDrawDeck([]);
    setDrawnCards([]);
    setIsDrawCompleteOpen(false);
  };

  const setCategory = (nextCategoryId: string) => {
    resetRitualAnimation();
    setCategoryId(nextCategoryId);
    setParams({});
    setStage('select');
    setReading(null);
    setPickedSlots([]);
    setDrawDeck([]);
    setDrawnCards([]);
    setIsDrawCompleteOpen(false);
    setQuestionGeneration({ categoryId: '', status: 'idle', message: '' });
  };

  const updateParam = (paramKey: ParamKey, value: string) => {
    setParams((current) => ({ ...current, [paramKey]: value }));
    setGeneratedQuestions((current) => {
      if (!current[categoryId]) return current;
      const next = { ...current };
      delete next[categoryId];
      return next;
    });
    setQuestionGeneration({ categoryId: '', status: 'idle', message: '' });
  };

  const updateCustomContext = (value: string) => {
    setCustomContexts((current) => ({ ...current, [categoryId]: value }));
    setGeneratedQuestions((current) => {
      if (!current[categoryId]) return current;
      const next = { ...current };
      delete next[categoryId];
      return next;
    });
    setQuestionGeneration({ categoryId: '', status: 'idle', message: '' });
  };

  const generateQuestion = async () => {
    setQuestionGeneration({
      categoryId,
      status: 'loading',
      message: '正在根据类别和你的描述整理问题...',
    });
    try {
      const nextQuestion = await generateLlmQuestion(
        selectedTopic,
        category,
        params,
        customContext,
        standardQuestion,
        llmConfig,
      );
      setGeneratedQuestions((current) => ({ ...current, [categoryId]: nextQuestion }));
      setQuestionGeneration({
        categoryId,
        status: 'idle',
        message: '问题已生成，可以开始洗牌。',
      });
    } catch (error) {
      setQuestionGeneration({
        categoryId,
        status: 'error',
        message: error instanceof Error ? error.message : '问题生成失败，请重试',
      });
    }
  };

  const startShuffle = () => {
    resetRitualAnimation();
    setReading(null);
    setPickedSlots([]);
    setDrawnCards([]);
    setIsDrawCompleteOpen(false);
    setDrawDeck(createDrawDeck(12));
    setStage('shuffle');
  };

  const selectShuffleCard = (index: number) => {
    if (selectedShuffleCard !== null) return;
    setSelectedShuffleCard(index);
    scheduleTransition(() => {
      setSelectedShuffleCard(null);
      setStage('cut');
    }, SHUFFLE_TRANSITION_MS);
  };

  const selectCutPile = (index: number) => {
    if (selectedCutPile !== null) return;
    setSelectedCutPile(index);
    scheduleTransition(() => {
      setSelectedCutPile(null);
      setPickedSlots([]);
      setIsDrawCompleteOpen(false);
      setStage('draw');
    }, CUT_TRANSITION_MS);
  };

  const returnToQuestion = () => {
    resetRitualAnimation();
    setStage('select');
  };

  const pickCard = (slotIndex: number) => {
    if (revealingSlot !== null) return;
    if (pickedSlots.includes(slotIndex)) return;
    if (drawnCards.length >= currentSpread.positions.length) return;

    const candidate = drawDeck[slotIndex];
    if (!candidate) return;

    const nextDrawnCards = [
      ...drawnCards,
      {
        ...candidate,
        position: currentSpread.positions[drawnCards.length],
      },
    ];
    setRevealingSlot(slotIndex);
    setDrawnCards(nextDrawnCards);
    setPickedSlots((current) => [...current, slotIndex]);

    if (nextDrawnCards.length === currentSpread.positions.length) {
      setReading(
        createReadingFromDraws(
          {
            topicId,
            categoryId,
            params,
            customContext: customContext.trim() || undefined,
            generatedQuestion: generatedQuestion || undefined,
          },
          nextDrawnCards.map(({ card, orientation }) => ({ card, orientation })),
        ),
      );
    }

    scheduleTransition(() => {
      setRevealingSlot(null);
      if (nextDrawnCards.length === currentSpread.positions.length) {
        setIsDrawCompleteOpen(true);
      }
    }, CARD_REVEAL_MS);
  };

  const finishReading = () => {
    if (!reading) return;
    saveReading(reading);
    onComplete(reading);
  };

  const allParamsReady = category.requiredParams.every((key) => params[key]);
  const hasCustomContext = Boolean(customContext.trim());
  const requiresGeneratedQuestion = llmConfig.enabled && hasCustomContext;
  const isGeneratingQuestion =
    questionGeneration.categoryId === categoryId
    && questionGeneration.status === 'loading';
  const canGenerateQuestion = allParamsReady && hasCustomContext && !isGeneratingQuestion;
  const canStartShuffle =
    allParamsReady
    && (!requiresGeneratedQuestion || Boolean(generatedQuestion))
    && !isGeneratingQuestion;

  return (
    <main className="screen reading-screen">
      <section className="section-header">
        <div>
          <h1>{pageTitle(stage)}</h1>
          <p>{pageDescription(stage, llmConfig.enabled)}</p>
        </div>
      </section>

      {stage === 'select' ? (
        <div className="reading-layout">
          <section className="topic-grid" aria-label="主题">
            {topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.id}
                  className={`topic-tile ${topic.id === topicId ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => setTopic(topic.id)}
                >
                  <Icon size={22} />
                  <strong>{topic.name}</strong>
                  <span>{topic.description}</span>
                </button>
              );
            })}
          </section>

          <section className="selection-panel">
            <div className="panel-title">
              <SelectedTopicIcon size={22} />
              <div>
                <h2>{selectedTopic.name}</h2>
                <p>{selectedTopic.description}</p>
              </div>
            </div>

            <div className="field-group">
              <label>问题类别</label>
              <div className="segmented-list">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === categoryId ? 'is-selected' : ''}
                    type="button"
                    onClick={() => setCategory(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {category.requiredParams.map((paramKey) => (
              <div className="field-group" key={paramKey}>
                <label>{paramLabel(paramKey)}</label>
                <div className="choice-row">
                  {paramOptions[paramKey].map((option) => (
                    <button
                      key={option.value}
                      className={params[paramKey] === option.value ? 'is-selected' : ''}
                      type="button"
                      onClick={() => updateParam(paramKey, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {llmConfig.enabled ? (
              <div className="field-group custom-question-field">
                <label htmlFor={`custom-question-${categoryId}`}>补充你的具体情况</label>
                <textarea
                  id={`custom-question-${categoryId}`}
                  value={customContext}
                  maxLength={500}
                  rows={4}
                  placeholder="例如：我们最近沟通变少，我不确定应该主动谈清楚，还是先给彼此一些空间。"
                  onChange={(event) => updateCustomContext(event.target.value)}
                />
                <div className="custom-question-actions">
                  <span>{customContext.length} / 500</span>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!canGenerateQuestion}
                    onClick={generateQuestion}
                  >
                    {isGeneratingQuestion ? (
                      <LoaderCircle className="is-spinning" size={17} />
                    ) : (
                      <WandSparkles size={17} />
                    )}
                    {isGeneratingQuestion ? '生成中' : generatedQuestion ? '重新生成问题' : '生成问题'}
                  </button>
                </div>
                {questionGeneration.categoryId === categoryId && questionGeneration.message ? (
                  <p className={`question-generation-message is-${questionGeneration.status}`}>
                    {questionGeneration.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="question-preview">
              <span>{generatedQuestion ? 'LLM 生成问题' : '标准化问题'}</span>
              <strong>{question}</strong>
            </div>

            <p className="entertainment-notice">
              塔罗占卜纯属娱乐，仅供参考，不构成医疗、法律、投资或其他专业建议。
            </p>

            <button
              className="primary-button full-width"
              type="button"
              disabled={!canStartShuffle}
              onClick={startShuffle}
            >
              <Shuffle size={18} />
              开始洗牌
            </button>
          </section>
        </div>
      ) : (
        <section className={`ritual-panel is-${stage}`}>
          <button
            className="ritual-back-button"
            type="button"
            disabled={selectedShuffleCard !== null || selectedCutPile !== null || revealingSlot !== null}
            onClick={returnToQuestion}
          >
            <ChevronLeft size={18} />
            返回问题
          </button>

          <div className="ritual-copy">
            <h2>{ritualTitle(stage, currentSpread.name)}</h2>
            <p>{ritualDescription(stage, question, currentSpread.positions.length, drawnCards.length)}</p>
          </div>

          {stage === 'shuffle' ? (
            <div className={`ritual-deck shuffle-deck ${selectedShuffleCard !== null ? 'is-resolving' : ''}`}>
              {Array.from({ length: 7 }).map((_, index) => (
                <button
                  className={`shuffle-card-button ${selectedShuffleCard === index ? 'is-chosen' : ''}`}
                  type="button"
                  key={index}
                  disabled={selectedShuffleCard !== null}
                  onClick={() => selectShuffleCard(index)}
                >
                  <CardView isBack isSelected={index === 3} />
                </button>
              ))}
            </div>
          ) : null}

          {stage === 'cut' ? (
            <div className={`cut-deck ${selectedCutPile !== null ? 'is-resolving' : ''}`}>
              {Array.from({ length: 3 }).map((_, index) => (
                <button
                  className={`cut-pile ${selectedCutPile === index ? 'is-chosen' : ''}`}
                  type="button"
                  key={index}
                  disabled={selectedCutPile !== null}
                  onClick={() => selectCutPile(index)}
                >
                  <CardView isBack />
                  <span>{['左手牌堆', '中间牌堆', '右手牌堆'][index]}</span>
                </button>
              ))}
            </div>
          ) : null}

          {stage === 'draw' ? (
            <div className="manual-draw-area">
              <div className="draw-slots">
                {Array.from({ length: 12 }).map((_, index) => {
                  const pickedOrder = pickedSlots.indexOf(index);
                  const drawn = pickedOrder >= 0 ? drawnCards[pickedOrder] : undefined;
                  const disabled = drawnCards.length >= currentSpread.positions.length && pickedOrder < 0;
                  return (
                    <button
                      className={`draw-slot ${drawn ? 'is-picked' : ''}`}
                      type="button"
                      key={index}
                      disabled={disabled || revealingSlot !== null}
                      onClick={() => pickCard(index)}
                    >
                      <CardView isBack={!drawn} drawn={drawn} />
                      <span>{drawn?.position.label ?? '点击抽取'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {stage === 'draw' && reading && isDrawCompleteOpen ? (
            <div className="draw-complete-overlay" role="dialog" aria-modal="true" aria-label="抽牌完成">
              <section className="draw-complete-panel">
                <div className="draw-complete-copy">
                  <span>{reading.spread.name}</span>
                  <h2>抽牌完成</h2>
                  <p>{reading.question}</p>
                </div>
                <div className="draw-complete-cards">
                  {reading.cards.map((drawn) => (
                    <article key={drawn.position.id}>
                      <CardView drawn={drawn} />
                      <span>{drawn.position.label}</span>
                    </article>
                  ))}
                </div>
                <div className="ritual-actions">
                  <button className="ghost-button" type="button" onClick={startShuffle}>
                    <RotateCcw size={18} />
                    重新洗牌
                  </button>
                  <button className="primary-button" type="button" onClick={finishReading}>
                    <Sparkles size={18} />
                    查看解析
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function ritualTitle(stage: RitualStage, spreadName: string) {
  if (stage === 'shuffle') return '手动洗牌';
  if (stage === 'cut') return '选择切牌牌堆';
  return spreadName;
}

function ritualDescription(stage: RitualStage, question: string, totalCards: number, pickedCount: number) {
  if (stage === 'shuffle') return '保持当前问题，点击任意牌背完成洗牌并进入切牌。';
  if (stage === 'cut') return '选择一个牌堆作为本次占卜的切入点。';
  return `${question} 已抽取 ${pickedCount} / ${totalCards} 张。`;
}

function pageTitle(stage: RitualStage) {
  if (stage === 'select') return '选择占卜类别';
  if (stage === 'shuffle') return '洗牌';
  if (stage === 'cut') return '切牌';
  return '抽牌';
}

function pageDescription(stage: RitualStage, llmEnabled: boolean) {
  if (stage === 'select') {
    return llmEnabled
      ? '选择类别和参数后，可以补充具体情况，由 LLM 整理为清晰的占卜问题。'
      : '问题由类别和参数生成；开启 LLM 后，可以补充具体情况并生成定制问题。';
  }
  if (stage === 'shuffle') return '由玩家手动确认洗牌完成，系统不会自动跳过仪式步骤。';
  if (stage === 'cut') return '从三组牌堆中选择一个，作为本次占卜的切入点。';
  return '从牌背中手动抽取需要的牌，抽满后再查看解析。';
}

function paramLabel(paramKey: ParamKey) {
  const labels: Record<ParamKey, string> = {
    timeRange: '时间范围',
    relationshipStage: '关系阶段',
    careerFocus: '关注方向',
    choiceMode: '倾向选项',
    innerFocus: '当前状态',
    trendFocus: '趋势主题',
  };
  return labels[paramKey];
}
