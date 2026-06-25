import { ChevronLeft, LoaderCircle, RotateCcw, Shuffle, Sparkles, WandSparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CardView } from '../components/CardView';
import { paramOptions, questionCategories, topics } from '../data/questions';
import { getChoiceOptionCount, getSpreadForReading } from '../data/spreads';
import { generateLlmQuestion } from '../lib/llmAnalysis';
import { loadLlmConfig } from '../lib/llmConfig';
import {
  buildQuestion,
  createDrawDeck,
  createReadingFromDraws,
  saveReading,
  type DrawCandidate,
} from '../lib/reading';
import type {
  DrawnCard,
  ParamKey,
  QuestionCategory,
  ReadingInput,
  ReadingResult,
  Spread,
  SpreadId,
  TopicId,
} from '../types';

interface ReadingPageProps {
  initialInput?: ReadingInput;
  onComplete: (reading: ReadingResult) => void;
}

type RitualStage = 'select' | 'focus' | 'shuffle' | 'cut' | 'draw' | 'reveal';

const SHUFFLE_ROUNDS = 3;
const SHUFFLE_TRANSITION_MS = 680;
const CUT_TRANSITION_MS = 620;
const CARD_REVEAL_MS = 720;

export function ReadingPage({ initialInput, onComplete }: ReadingPageProps) {
  const [topicId, setTopicId] = useState<TopicId>(initialInput?.topicId ?? 'daily');
  const categories = questionCategories.filter((item) => item.topic === topicId);
  const [categoryId, setCategoryId] = useState(initialInput?.categoryId ?? categories[0].id);
  const category = questionCategories.find((item) => item.id === categoryId) ?? categories[0];
  const [params, setParams] = useState<Record<string, string>>(initialInput?.params ?? {});
  const [spreadId, setSpreadId] = useState<SpreadId | undefined>(initialInput?.spreadId);
  const [stage, setStage] = useState<RitualStage>(initialInput ? 'focus' : 'select');
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [pickedSlots, setPickedSlots] = useState<number[]>([]);
  const [drawDeck, setDrawDeck] = useState<DrawCandidate[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isDrawCompleteOpen, setIsDrawCompleteOpen] = useState(false);
  const [selectedShuffleCard, setSelectedShuffleCard] = useState<number | null>(null);
  const [shuffleRound, setShuffleRound] = useState(0);
  const [cutOrder, setCutOrder] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [shuffleDragX, setShuffleDragX] = useState(0);
  const transitionTimers = useRef<number[]>([]);
  const shuffleStartX = useRef<number | null>(null);
  const drawReadyRef = useRef<HTMLDivElement | null>(null);
  const llmConfig = loadLlmConfig();
  const [customContexts, setCustomContexts] = useState<Record<string, string>>(
    initialInput?.customContext ? { [categoryId]: initialInput.customContext } : {},
  );
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<string, string>>(
    initialInput?.generatedQuestion ? { [categoryId]: initialInput.generatedQuestion } : {},
  );
  const [questionGeneration, setQuestionGeneration] = useState<{
    categoryId: string;
    status: 'idle' | 'loading' | 'error';
    message: string;
  }>({ categoryId: '', status: 'idle', message: '' });

  const selectedTopic = topics.find((item) => item.id === topicId) ?? topics[0];
  const SelectedTopicIcon = selectedTopic.icon;
  const currentSpread = getSpreadForReading(spreadId ?? category.defaultSpread, params);
  const isChoiceComparison = (spreadId ?? category.defaultSpread) === 'choice_compare';
  const isSpreadTopic = topicId === 'spreads';

  const standardQuestion = useMemo(
    () => buildQuestion(category.questionTemplate, {
      ...params,
      spreadName: currentSpread.name,
      spreadThemes: currentSpread.themes?.join('、') ?? currentSpread.description,
    }),
    [category.questionTemplate, currentSpread.description, currentSpread.name, currentSpread.themes, params],
  );
  const customContext = customContexts[categoryId] ?? '';
  const generatedQuestion = generatedQuestions[categoryId] ?? '';
  const question = generatedQuestion || standardQuestion;

  useEffect(() => () => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!isDrawCompleteOpen) return undefined;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isDrawCompleteOpen]);

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
    setShuffleRound(0);
    setShuffleDragX(0);
    setCutOrder([]);
    setRevealedCount(0);
  };

  const setTopic = (nextTopicId: TopicId) => {
    resetRitualAnimation();
    const nextCategory = questionCategories.find((item) => item.topic === nextTopicId);
    setTopicId(nextTopicId);
    setCategoryId(nextCategory?.id ?? categoryId);
    setSpreadId(undefined);
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
    setSpreadId(undefined);
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

  const startRitual = () => {
    resetRitualAnimation();
    setReading(null);
    setPickedSlots([]);
    setDrawnCards([]);
    setIsDrawCompleteOpen(false);
    setStage('focus');
  };

  const startShuffle = () => {
    resetRitualAnimation();
    setReading(null);
    setPickedSlots([]);
    setDrawnCards([]);
    setIsDrawCompleteOpen(false);
    setDrawDeck(createDrawDeck(12));
    setShuffleRound(0);
    setStage('shuffle');
  };

  const completeShuffleGesture = (direction: number) => {
    if (selectedShuffleCard !== null) return;
    setSelectedShuffleCard(direction);
    scheduleTransition(() => {
      setSelectedShuffleCard(null);
      setShuffleDragX(0);
      const nextRound = shuffleRound + 1;
      setShuffleRound(nextRound);
      if (nextRound >= SHUFFLE_ROUNDS) {
        setCutOrder([]);
        setStage('cut');
      }
    }, SHUFFLE_TRANSITION_MS);
  };

  const beginShuffleGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (selectedShuffleCard !== null) return;
    shuffleStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveShuffleGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (shuffleStartX.current === null || selectedShuffleCard !== null) return;
    const distance = Math.max(-150, Math.min(150, event.clientX - shuffleStartX.current));
    setShuffleDragX(distance);
  };

  const endShuffleGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (shuffleStartX.current === null || selectedShuffleCard !== null) return;
    const distance = event.clientX - shuffleStartX.current;
    shuffleStartX.current = null;
    if (Math.abs(distance) >= 70) {
      completeShuffleGesture(distance > 0 ? 1 : -1);
    } else {
      setShuffleDragX(0);
    }
  };

  const selectCutPile = (index: number) => {
    if (cutOrder.includes(index)) return;
    const nextOrder = [...cutOrder, index];
    setCutOrder(nextOrder);
    if (nextOrder.length < 3) return;
    scheduleTransition(() => {
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
    setDrawnCards(nextDrawnCards);
    setPickedSlots((current) => [...current, slotIndex]);

    if (nextDrawnCards.length === currentSpread.positions.length) {
      setReading(
        createReadingFromDraws(
          {
            topicId,
            categoryId,
            params,
            spreadId: currentSpread.id,
            customContext: customContext.trim() || undefined,
            generatedQuestion: generatedQuestion || undefined,
          },
          nextDrawnCards.map(({ card, orientation }) => ({ card, orientation })),
        ),
      );
    }
  };

  useEffect(() => {
    if (!reading || stage !== 'draw') return;
    window.requestAnimationFrame(() => {
      drawReadyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [reading, stage]);

  const startReveal = () => {
    if (!reading || drawnCards.length !== currentSpread.positions.length) return;
    setRevealedCount(0);
    setStage('reveal');
    reading.cards.forEach((_, index) => {
      scheduleTransition(() => {
        setRevealedCount(index + 1);
        if (index === reading.cards.length - 1) {
          scheduleTransition(() => setIsDrawCompleteOpen(true), CARD_REVEAL_MS);
        }
      }, CARD_REVEAL_MS * (index + 1));
    });
  };

  const finishReading = () => {
    if (!reading) return;
    saveReading(reading);
    onComplete(reading);
  };

  const requiredParamKeys = isChoiceComparison
    ? getRequiredChoiceParamKeys(params)
    : category.requiredParams;
  const allParamsReady =
    Boolean(generatedQuestion)
    || requiredParamKeys.every((key) => params[key]?.trim());
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
          <div className="topic-scroll-wrapper">
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
          </div>

          <section className="selection-panel">
            <div className="panel-title">
              <SelectedTopicIcon size={22} />
              <div>
                <h2>{selectedTopic.name}</h2>
                <p>{selectedTopic.description}</p>
              </div>
            </div>

            <div className={`field-group ${isSpreadTopic ? 'spread-picker-field' : ''}`}>
              <label>问题类别</label>
              <div className={isSpreadTopic ? 'spread-option-grid' : 'segmented-list'}>
                {categories.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === categoryId ? 'is-selected' : ''}
                    type="button"
                    onClick={() => setCategory(item.id)}
                  >
                    {isSpreadTopic ? (
                      <SpreadOption category={item} params={params} />
                    ) : (
                      item.label
                    )}
                  </button>
                ))}
              </div>
            </div>

            {isChoiceComparison ? (
              <ChoiceComparisonFields params={params} updateParam={updateParam} />
            ) : (
              category.requiredParams.map((paramKey) => (
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
              ))
            )}

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
              <em>{currentSpread.name} · 需要抽取 {currentSpread.positions.length} 张</em>
              {currentSpread.themes?.length ? (
                <small>适用主题：{currentSpread.themes.join(' / ')}</small>
              ) : null}
            </div>

            <p className="entertainment-notice">
              塔罗占卜纯属娱乐，仅供参考，不构成医疗、法律、投资或其他专业建议。
            </p>

            <button
              className="primary-button full-width"
              type="button"
              disabled={!canStartShuffle}
              onClick={startRitual}
            >
              <Shuffle size={18} />
              确认问题，开始仪式
            </button>
          </section>
        </div>
      ) : (
        <section className={`ritual-panel is-${stage}`}>
          <button
            className="ritual-back-button"
            type="button"
            disabled={selectedShuffleCard !== null || stage === 'reveal'}
            onClick={returnToQuestion}
          >
            <ChevronLeft size={18} />
            返回问题
          </button>

          <div className="ritual-copy">
            <h2>{ritualTitle(stage, currentSpread.name)}</h2>
            <p>{ritualDescription(
              stage,
              question,
              currentSpread.positions.length,
              drawnCards.length,
              shuffleRound,
              cutOrder.length,
              revealedCount,
            )}</p>
          </div>

          {stage === 'focus' ? (
            <div className="focus-ritual">
              <span className="focus-ritual__symbol" aria-hidden="true">✦</span>
              <p>{question}</p>
              <ol>
                <li>确认本次只围绕这一个问题抽牌</li>
                <li>安静呼吸，将注意力放在问题的具体对象上</li>
                <li>准备好后再开始洗牌</li>
              </ol>
              <button className="primary-button" type="button" onClick={startShuffle}>
                我已专注问题，开始洗牌
              </button>
            </div>
          ) : null}

          {stage === 'shuffle' ? (
            <>
              <div className="ritual-progress" aria-label={`洗牌进度 ${shuffleRound} / ${SHUFFLE_ROUNDS}`}>
                {Array.from({ length: SHUFFLE_ROUNDS }).map((_, index) => (
                  <span className={index < shuffleRound ? 'is-complete' : ''} key={index} />
                ))}
              </div>
              <div
                className={`shuffle-gesture ${selectedShuffleCard !== null ? 'is-resolving' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`左右划动牌堆完成第 ${Math.min(shuffleRound + 1, SHUFFLE_ROUNDS)} 次洗牌`}
                onPointerDown={beginShuffleGesture}
                onPointerMove={moveShuffleGesture}
                onPointerUp={endShuffleGesture}
                onPointerCancel={endShuffleGesture}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') completeShuffleGesture(-1);
                  if (event.key === 'ArrowRight') completeShuffleGesture(1);
                }}
              >
                <div
                  className="shuffle-gesture__deck"
                  style={{
                    '--shuffle-drag': `${shuffleDragX}px`,
                    '--shuffle-rotate': `${shuffleDragX * 0.025}deg`,
                  } as React.CSSProperties}
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className="shuffle-gesture__card" key={index}>
                      <CardView isBack />
                    </div>
                  ))}
                </div>
                <div className="shuffle-gesture__hint">
                  <span aria-hidden="true">←</span>
                  <strong>用手指缓慢划动牌堆</strong>
                  <span aria-hidden="true">→</span>
                  <small>跟随呼吸，让牌在手中重新排列</small>
                </div>
              </div>
            </>
          ) : null}

          {stage === 'cut' ? (
            <div className="cut-ritual">
              <p>不要计算顺序。依直觉依次触碰三叠牌，它们会按照你的选择重新合为一体。</p>
              <div className={`cut-deck ${cutOrder.length === 3 ? 'is-resolving' : ''}`}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <button
                    className={`cut-pile ${cutOrder.includes(index) ? 'is-chosen' : ''}`}
                    type="button"
                    key={index}
                    disabled={cutOrder.includes(index) || cutOrder.length === 3}
                    onClick={() => selectCutPile(index)}
                  >
                    <CardView isBack />
                    <span>{['左侧', '中央', '右侧'][index]}</span>
                    {cutOrder.includes(index) ? (
                      <strong className="cut-order">{cutOrder.indexOf(index) + 1}</strong>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stage === 'draw' ? (
            <div className="manual-draw-area">
              {reading ? (
                <div className="draw-ready" ref={drawReadyRef}>
                  <span className="draw-ready__symbol" aria-hidden="true">✦</span>
                  <strong>{currentSpread.positions.length} 张牌已选定</strong>
                  <p>牌面仍然保持隐藏。准备好后，让它们依次回应你的问题。</p>
                  <button className="primary-button reveal-button" type="button" onClick={startReveal}>
                    <Sparkles size={18} />
                    开始揭牌
                  </button>
                </div>
              ) : (
                <div className="draw-slots">
                  {Array.from({ length: 12 }).map((_, index) => {
                    const pickedOrder = pickedSlots.indexOf(index);
                    const drawn = pickedOrder >= 0 ? drawnCards[pickedOrder] : undefined;
                    return (
                      <button
                        className={`draw-slot ${drawn ? 'is-picked' : ''}`}
                        type="button"
                        key={index}
                        disabled={Boolean(drawn)}
                        onClick={() => pickCard(index)}
                      >
                        <CardView isBack drawn={drawn} />
                        <span>{drawn?.position.label ?? '点击抽取'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {stage === 'reveal' && reading ? (
            <SpreadCardLayout spread={reading.spread} className="reveal-spread">
              {reading.cards.map((drawn, index) => {
                const isRevealed = index < revealedCount;
                return (
                  <article
                    className={`reveal-position ${isRevealed ? 'is-revealed' : ''}`}
                    key={drawn.position.id}
                    style={drawn.position.layoutArea ? { gridArea: drawn.position.layoutArea } : undefined}
                  >
                    <CardView isBack={!isRevealed} drawn={drawn} />
                    <span>{drawn.position.label}</span>
                  </article>
                );
              })}
            </SpreadCardLayout>
          ) : null}

          {stage === 'reveal' && reading && isDrawCompleteOpen ? (
            <div className="draw-complete-overlay" role="dialog" aria-modal="true" aria-label="抽牌完成">
              <section className="draw-complete-panel">
                <div className="draw-complete-scroll">
                  <div className="draw-complete-copy">
                    <span>{reading.spread.name}</span>
                    <h2>抽牌完成</h2>
                    <p>{reading.question}</p>
                  </div>
                  <SpreadCardLayout spread={reading.spread} className="draw-complete-cards">
                    {reading.cards.map((drawn) => (
                      <article
                        key={drawn.position.id}
                        style={drawn.position.layoutArea ? { gridArea: drawn.position.layoutArea } : undefined}
                      >
                        <CardView drawn={drawn} />
                        <span>{drawn.position.label}</span>
                      </article>
                    ))}
                  </SpreadCardLayout>
                </div>
                <div className="ritual-actions draw-complete-actions">
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
  if (stage === 'focus') return '静心确认问题';
  if (stage === 'shuffle') return '手动洗牌';
  if (stage === 'cut') return '三叠切牌';
  if (stage === 'reveal') return '依次翻牌';
  return spreadName;
}

function ritualDescription(
  stage: RitualStage,
  question: string,
  totalCards: number,
  pickedCount: number,
  shuffleRound: number,
  cutCount: number,
  revealedCount: number,
) {
  if (stage === 'focus') return '先确认问题，再进入洗牌、切牌、抽牌和翻牌。';
  if (stage === 'shuffle') return `左右划动牌堆，完成第 ${Math.min(shuffleRound + 1, SHUFFLE_ROUNDS)} / ${SHUFFLE_ROUNDS} 次洗牌。`;
  if (stage === 'cut') return `按你希望重新合牌的顺序选择三叠牌。已选择 ${cutCount} / 3。`;
  if (stage === 'reveal') return `按照牌阵位置依次翻开。已翻开 ${revealedCount} / ${totalCards} 张。`;
  return `${question} 已抽取 ${pickedCount} / ${totalCards} 张。`;
}

function pageTitle(stage: RitualStage) {
  if (stage === 'select') return '选择占卜类别';
  if (stage === 'focus') return '确认问题';
  if (stage === 'shuffle') return '洗牌';
  if (stage === 'cut') return '切牌';
  if (stage === 'reveal') return '翻牌';
  return '抽牌';
}

function pageDescription(stage: RitualStage, llmEnabled: boolean) {
  if (stage === 'select') {
    return llmEnabled
      ? '选择类别和参数后，可以补充具体情况，由 LLM 整理为清晰的占卜问题。'
      : '问题由类别和参数生成；开启 LLM 后，可以补充具体情况并生成定制问题。';
  }
  if (stage === 'focus') return '静心确认本次占卜只回应一个明确问题。';
  if (stage === 'shuffle') return '用手指划动整叠牌，让动作、呼吸与问题慢慢同步。';
  if (stage === 'cut') return '将牌分为三叠，并按选择顺序重新合牌。';
  if (stage === 'reveal') return '全部选牌完成后，按牌位顺序统一揭示牌面。';
  return '从牌背中选出牌阵需要的牌；选牌阶段不提前查看牌面。';
}

interface SpreadOptionProps {
  category: QuestionCategory;
  params: Record<string, string>;
}

function SpreadOption({ category, params }: SpreadOptionProps) {
  const spread = getSpreadForReading(category.defaultSpread, params);
  return (
    <>
      <strong>{spread.name}</strong>
      <span>{spread.positions.length} 张 · {spread.description}</span>
      {spread.themes?.length ? <em>适用：{spread.themes.join(' / ')}</em> : null}
    </>
  );
}

interface SpreadCardLayoutProps {
  spread: Spread;
  className: string;
  children: React.ReactNode;
}

function SpreadCardLayout({ spread, className, children }: SpreadCardLayoutProps) {
  return (
    <div className={`${className} spread-layout spread-layout--${spread.layout}`} data-spread={spread.id}>
      {children}
    </div>
  );
}

const choiceOptionParamKeys = ['choiceOptionA', 'choiceOptionB', 'choiceOptionC', 'choiceOptionD'] as const;
const choiceOptionLabels = ['A', 'B', 'C', 'D'] as const;

function getRequiredChoiceParamKeys(params: Record<string, string>): ParamKey[] {
  const optionCount = getChoiceOptionCount(params);
  return [...choiceOptionParamKeys.slice(0, optionCount)];
}

interface ChoiceComparisonFieldsProps {
  params: Record<string, string>;
  updateParam: (paramKey: ParamKey, value: string) => void;
}

function ChoiceComparisonFields({ params, updateParam }: ChoiceComparisonFieldsProps) {
  const optionCount = getChoiceOptionCount(params);

  return (
    <>
      <div className="field-group">
        <label>比较选项数量</label>
        <div className="choice-row">
          {paramOptions.choiceOptionCount.map((option) => (
            <button
              key={option.value}
              className={(params.choiceOptionCount || '2') === option.value ? 'is-selected' : ''}
              type="button"
              onClick={() => updateParam('choiceOptionCount', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group choice-options-field">
        <label>填写要比较的选项</label>
        <div className="choice-option-inputs">
          {choiceOptionParamKeys.slice(0, optionCount).map((paramKey, index) => (
            <label className="choice-option-input" key={paramKey}>
              <span>选项 {choiceOptionLabels[index]}</span>
              <input
                value={params[paramKey] ?? ''}
                maxLength={28}
                placeholder={['继续推进', '暂缓观察', '更换方向', '维持现状'][index]}
                onChange={(event) => updateParam(paramKey, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function paramLabel(paramKey: ParamKey) {
  const labels: Record<ParamKey, string> = {
    timeRange: '时间范围',
    relationshipStage: '关系阶段',
    careerFocus: '关注方向',
    choiceMode: '倾向选项',
    choiceOptionCount: '比较选项数量',
    choiceOptionA: '选项 A',
    choiceOptionB: '选项 B',
    choiceOptionC: '选项 C',
    choiceOptionD: '选项 D',
    innerFocus: '当前状态',
    trendFocus: '趋势主题',
  };
  return labels[paramKey];
}
