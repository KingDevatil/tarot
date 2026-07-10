import { getQuestionCategory, getTopic } from '../data/questions';
import type { ReadingResult } from '../types';

export const getReadingContextLabel = (reading: ReadingResult) => {
  if (reading.input.questionSource === 'freeform') {
    return '问题占卜';
  }

  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);
  return `${topic.name} / ${category.label}`;
};
