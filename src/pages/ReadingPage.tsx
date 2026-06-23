import { ChevronLeft, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardView } from '../components/CardView';
import { paramOptions, questionCategories, topics } from '../data/questions';
import { buildQuestion, createReading, saveReading } from '../lib/reading';
import type { ParamKey, ReadingResult, TopicId } from '../types';

interface ReadingPageProps {
  onComplete: (reading: ReadingResult) => void;
}

type RitualStage = 'select' | 'shuffle' | 'reveal';

export function ReadingPage({ onComplete }: ReadingPageProps) {
  const [topicId, setTopicId] = useState<TopicId>('daily');
  const categories = questionCategories.filter((item) => item.topic === topicId);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const category = questionCategories.find((item) => item.id === categoryId) ?? categories[0];
  const [params, setParams] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<RitualStage>('select');
  const [reading, setReading] = useState<ReadingResult | null>(null);

  const selectedTopic = topics.find((item) => item.id === topicId) ?? topics[0];
  const SelectedTopicIcon = selectedTopic.icon;

  const question = useMemo(
    () => buildQuestion(category.questionTemplate, params),
    [category.questionTemplate, params],
  );

  const setTopic = (nextTopicId: TopicId) => {
    const nextCategory = questionCategories.find((item) => item.topic === nextTopicId);
    setTopicId(nextTopicId);
    setCategoryId(nextCategory?.id ?? categoryId);
    setParams({});
    setStage('select');
    setReading(null);
  };

  const setCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setParams({});
    setStage('select');
    setReading(null);
  };

  const startShuffle = () => {
    const result = createReading({ topicId, categoryId, params });
    setReading(result);
    setStage('shuffle');
    window.setTimeout(() => setStage('reveal'), 1200);
  };

  const finishReading = () => {
    if (!reading) return;
    saveReading(reading);
    onComplete(reading);
  };

  const allParamsReady = category.requiredParams.every((key) => params[key]);

  return (
    <main className="screen reading-screen">
      <section className="section-header">
        <div>
          <h1>选择占卜类别</h1>
          <p>问题由类别和参数生成，不开放自由输入，避免低质量问题影响解析。</p>
        </div>
        {stage !== 'select' ? (
          <button className="icon-text-button" type="button" onClick={() => setStage('select')}>
            <ChevronLeft size={18} />
            返回选择
          </button>
        ) : null}
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
                      onClick={() => setParams((current) => ({ ...current, [paramKey]: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="question-preview">
              <span>标准化问题</span>
              <strong>{question}</strong>
            </div>

            <button
              className="primary-button full-width"
              type="button"
              disabled={!allParamsReady}
              onClick={startShuffle}
            >
              <Shuffle size={18} />
              洗牌并抽牌
            </button>
          </section>
        </div>
      ) : (
        <section className={`ritual-panel is-${stage}`}>
          <div className="ritual-copy">
            <h2>{stage === 'shuffle' ? '正在洗牌' : reading?.spread.name}</h2>
            <p>{stage === 'shuffle' ? '保持当前问题，系统将随机抽取牌面与正逆位。' : reading?.question}</p>
          </div>
          <div className="ritual-deck">
            {stage === 'shuffle'
              ? Array.from({ length: 7 }).map((_, index) => (
                  <CardView key={index} isBack isSelected={index === 3} />
                ))
              : reading?.cards.map((drawn) => <CardView key={drawn.position.id} drawn={drawn} />)}
          </div>
          {stage === 'reveal' ? (
            <div className="ritual-actions">
              <button className="ghost-button" type="button" onClick={startShuffle}>
                <RotateCcw size={18} />
                重新抽取
              </button>
              <button className="primary-button" type="button" onClick={finishReading}>
                <Sparkles size={18} />
                查看解析
              </button>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
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
