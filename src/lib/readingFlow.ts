import type { QuestionAnalysis, ReadingInput, SpreadId } from '../types';

export const createFreeformReadingInput = (
  question: string,
  analysis: QuestionAnalysis,
  spreadId: SpreadId,
): ReadingInput => ({
  topicId: analysis.topicId,
  categoryId: analysis.categoryId,
  params: analysis.params,
  spreadId,
  questionSource: 'freeform',
  customContext: question.trim(),
});
