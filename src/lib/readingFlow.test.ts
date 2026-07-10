import { describe, expect, it } from 'vitest';
import { tarotCards } from '../data/cards';
import type { LlmConfig, QuestionAnalysis, ReadingResult } from '../types';
import { analyzeDivinationQuestion, buildReadingPayload } from './llmAnalysis';
import { createFreeformReadingInput } from './readingFlow';
import { getReadingContextLabel } from './readingPresentation';

const analysis: QuestionAnalysis = {
  topicId: 'daily',
  categoryId: 'daily_energy',
  categoryLabel: '今天我最需要注意什么',
  normalizedQuestion: '我明天最需要留意什么？',
  params: {},
  recommendations: [],
  source: 'llm',
};

const freeformReading: ReadingResult = {
  id: 'reading-1',
  createdAt: '2026-06-25T00:00:00.000Z',
  input: {
    topicId: 'daily',
    categoryId: 'daily_energy',
    params: {},
    spreadId: 'single',
    questionSource: 'freeform',
    customContext: '明天北京天气怎么样？',
  },
  question: '明天北京天气怎么样？',
  spread: {
    id: 'single',
    name: '单牌指引',
    description: '聚焦一个核心提醒',
    layout: 'single',
    positions: [{ id: 'focus', label: '核心', prompt: '核心提示' }],
  },
  cards: [{
    card: tarotCards[0],
    orientation: 'upright',
    position: { id: 'focus', label: '核心', prompt: '核心提示' },
  }],
  summary: 'summary',
  advice: 'advice',
};

const templateReading: ReadingResult = {
  ...freeformReading,
  id: 'reading-2',
  input: {
    ...freeformReading.input,
    questionSource: 'template',
    customContext: '最近有点疲惫',
    generatedQuestion: '我今天最需要留意什么？',
  },
  question: '我今天最需要留意什么？',
};

describe('freeform reading flow', () => {
  it('treats homepage analysis text as an intent summary instead of formatting a new question', async () => {
    const disabledConfig: LlmConfig = {
      enabled: false,
      thinkingEnabled: false,
      provider: 'openai_compatible',
      baseUrl: '',
      model: '',
      apiKey: '',
      providerApiKeys: {},
      temperature: 0.4,
      timeoutMs: 1000,
    };

    const result = await analyzeDivinationQuestion('最近工作发展', disabledConfig);

    expect(result.normalizedQuestion).toBe('最近工作发展');
  });

  it('creates homepage input without promoting the analysis wording to an official question', () => {
    expect(createFreeformReadingInput('  明天北京天气怎么样？  ', analysis, 'single')).toEqual({
      topicId: 'daily',
      categoryId: 'daily_energy',
      params: {},
      spreadId: 'single',
      questionSource: 'freeform',
      customContext: '明天北京天气怎么样？',
    });
  });

  it('uses a neutral result label instead of inferred template labels', () => {
    expect(getReadingContextLabel(freeformReading)).toBe('问题占卜');
  });

  it('does not duplicate the official freeform question as userContext in the LLM payload', () => {
    const payload = buildReadingPayload(freeformReading);

    expect(payload.question).toBe('明天北京天气怎么样？');
    expect(payload.userContext).toBe('');
    expect(payload.topic).toBe('问题占卜');
    expect(payload.category).toBe('自由问题');
  });

  it('keeps template labels and context for direct template readings', () => {
    const payload = buildReadingPayload(templateReading);

    expect(getReadingContextLabel(templateReading)).toBe('今日指引 / 今天我最需要注意什么');
    expect(payload.question).toBe('我今天最需要留意什么？');
    expect(payload.userContext).toBe('最近有点疲惫');
    expect(payload.topic).toBe('今日指引');
    expect(payload.category).toBe('今天我最需要注意什么');
  });
});
