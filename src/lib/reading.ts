import { tarotCards } from '../data/cards';
import { getQuestionCategory } from '../data/questions';
import { formatChoiceOptions, getSpreadForReading } from '../data/spreads';
import type { DrawnCard, ReadingInput, ReadingResult, TarotCard } from '../types';

const HISTORY_KEY = 'tarot_reading_history_v1';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

export const buildQuestion = (template: string, params: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === 'choiceOptions') return formatChoiceOptions(params);
    return params[key] ?? '';
  });

const buildSpreadQuestionParams = (params: Record<string, string>, spread: ReturnType<typeof getSpreadForReading>) => ({
  ...params,
  spreadName: spread.name,
  spreadThemes: spread.themes?.join('、') ?? spread.description,
});

const orientationLabel = (orientation: DrawnCard['orientation']) =>
  orientation === 'upright' ? '正位' : '逆位';

export const getCardMeaning = (drawn: DrawnCard) =>
  drawn.orientation === 'upright' ? drawn.card.upright : drawn.card.reversed;

export type DrawCandidate = Pick<DrawnCard, 'card' | 'orientation'>;

const buildSummary = (cards: DrawnCard[], focus: string[]) => {
  if (cards.length === 1) {
    const drawn = cards[0];
    return `这次核心牌是「${drawn.card.name}（${orientationLabel(
      drawn.orientation,
    )}）」。它把重点放在「${drawn.card.keywords.join(' / ')}」上：${getCardMeaning(
      drawn,
    )} 本次解析会优先围绕${focus.join('、')}展开。`;
  }

  const firstCard = cards[0];
  const lastCard = cards[cards.length - 1];
  return `牌面从「${firstCard.position.label}」的「${firstCard.card.name}（${orientationLabel(
    firstCard.orientation,
  )}）」开始，说明问题入口更接近${firstCard.card.keywords[0]}：${getCardMeaning(
    firstCard,
  )} 最终落在「${lastCard.position.label}」的「${lastCard.card.name}（${orientationLabel(
    lastCard.orientation,
  )}）」，提醒你把后续行动放在${lastCard.card.keywords[1]}上。`;
};

export const createReading = (input: ReadingInput): ReadingResult => {
  const category = getQuestionCategory(input.categoryId);
  const spread = getSpreadForReading(input.spreadId ?? category.defaultSpread, input.params);
  const draws = createDrawDeck(spread.positions.length);

  return createReadingFromDraws(input, draws);
};

export const createDrawDeck = (count = 12): DrawCandidate[] =>
  shuffle<TarotCard>(tarotCards)
    .slice(0, count)
    .map((card) => ({
      card,
      orientation: Math.random() > 0.5 ? 'upright' : 'reversed',
    }));

export const createReadingFromDraws = (
  input: ReadingInput,
  draws: DrawCandidate[],
): ReadingResult => {
  const category = getQuestionCategory(input.categoryId);
  const spread = getSpreadForReading(input.spreadId ?? category.defaultSpread, input.params);
  const cards = draws.slice(0, spread.positions.length).map<DrawnCard>((draw, index) => ({
    ...draw,
    position: spread.positions[index],
  }));

  const question = input.questionSource === 'freeform'
    ? input.customContext?.trim()
      || buildQuestion(category.questionTemplate, buildSpreadQuestionParams(input.params, spread))
    : input.generatedQuestion?.trim()
      || buildQuestion(category.questionTemplate, buildSpreadQuestionParams(input.params, spread));
  const summaryFocus = input.questionSource === 'freeform'
    ? ['正式问题', '牌位含义', '可执行建议']
    : category.interpretationFocus;
  const summary = buildSummary(cards, summaryFocus);
  const advice = cards
    .map(
      (item) =>
        `${item.position.label}（${item.card.name} ${orientationLabel(item.orientation)}）：${
          item.card.advice
        }`,
    )
    .join('\n');

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    input,
    question,
    spread,
    cards,
    summary,
    advice,
  };
};

export const loadHistory = (): ReadingResult[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReadingResult[];
  } catch {
    return [];
  }
};

export const saveReading = (reading: ReadingResult) => {
  const history = loadHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([reading, ...history].slice(0, 20)));
};

export const updateSavedReading = (reading: ReadingResult) => {
  const history = loadHistory();
  const nextHistory = history.map((item) => (item.id === reading.id ? reading : item));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
