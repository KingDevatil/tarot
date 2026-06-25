import { describe, expect, it } from 'vitest';
import { tarotCards } from '../data/cards';
import { createReadingFromDraws } from './reading';

describe('createReadingFromDraws', () => {
  it('keeps the trimmed freeform question as the official reading question', () => {
    const reading = createReadingFromDraws(
      {
        topicId: 'daily',
        categoryId: 'daily_energy',
        params: {},
        spreadId: 'single',
        questionSource: 'freeform',
        customContext: '  明天北京天气怎么样？  ',
        generatedQuestion: '我明天最需要留意什么？',
      },
      [{ card: tarotCards[0], orientation: 'upright' }],
    );

    expect(reading.question).toBe('明天北京天气怎么样？');
    expect(reading.summary).toContain('正式问题');
    expect(reading.summary).not.toContain('今日能量');
  });

  it('keeps generated questions for template readings', () => {
    const reading = createReadingFromDraws(
      {
        topicId: 'daily',
        categoryId: 'daily_energy',
        params: {},
        spreadId: 'single',
        questionSource: 'template',
        customContext: '最近有点疲惫',
        generatedQuestion: '我今天最需要留意什么？',
      },
      [{ card: tarotCards[0], orientation: 'upright' }],
    );

    expect(reading.question).toBe('我今天最需要留意什么？');
  });
});
