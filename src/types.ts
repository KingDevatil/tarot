import type { LucideIcon } from 'lucide-react';

export type TopicId = 'daily' | 'love' | 'career' | 'choice' | 'inner' | 'trend' | 'spreads';

export type SpreadId =
  | 'single'
  | 'three_trend'
  | 'relationship_5'
  | 'choice_compare'
  | 'body_mind_spirit'
  | 'horseshoe_7'
  | 'celtic_cross_10';

export type SpreadLayout = 'single' | 'line' | 'relationship' | 'choice' | 'triangle' | 'horseshoe' | 'celtic';

export type Orientation = 'upright' | 'reversed';

export type Arcana = 'major' | 'minor';

export type MinorSuit = 'wands' | 'cups' | 'swords' | 'pentacles';

export type CardRank = 'number' | 'page' | 'knight' | 'queen' | 'king';

export type AppView = 'home' | 'reading' | 'result' | 'history' | 'library' | 'settings';

export type LlmProvider = 'openai_compatible' | 'deepseek' | 'mimo';

export type ParamKey =
  | 'timeRange'
  | 'relationshipStage'
  | 'careerFocus'
  | 'choiceMode'
  | 'choiceOptionCount'
  | 'choiceOptionA'
  | 'choiceOptionB'
  | 'choiceOptionC'
  | 'choiceOptionD'
  | 'innerFocus'
  | 'trendFocus';

export interface Topic {
  id: TopicId;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultSpread: SpreadId;
}

export interface ParamOption {
  value: string;
  label: string;
}

export interface QuestionCategory {
  id: string;
  topic: TopicId;
  label: string;
  questionTemplate: string;
  requiredParams: ParamKey[];
  defaultSpread: SpreadId;
  interpretationFocus: string[];
}

export interface SpreadPosition {
  id: string;
  label: string;
  prompt: string;
  layoutArea?: string;
}

export interface Spread {
  id: SpreadId;
  name: string;
  description: string;
  layout: SpreadLayout;
  themes?: string[];
  positions: SpreadPosition[];
}

export interface TarotCard {
  id: string;
  number: number;
  name: string;
  enName: string;
  arcana?: Arcana;
  suit?: MinorSuit;
  rank?: CardRank;
  displayNumeral?: string;
  image: string;
  thumbnail: string;
  keywords: string[];
  upright: string;
  reversed: string;
  advice: string;
}

export interface DrawnCard {
  card: TarotCard;
  orientation: Orientation;
  position: SpreadPosition;
}

export interface ReadingInput {
  topicId: TopicId;
  categoryId: string;
  params: Record<string, string>;
  spreadId?: SpreadId;
  questionSource?: 'freeform' | 'template';
  customContext?: string;
  generatedQuestion?: string;
}

export interface DivinationFlowRecommendation {
  id: string;
  spreadId: SpreadId;
  title: string;
  reason: string;
  detail: string;
  estimatedMinutes: string;
}

export interface QuestionAnalysis {
  topicId: TopicId;
  categoryId: string;
  categoryLabel: string;
  normalizedQuestion: string;
  params: Record<string, string>;
  recommendations: DivinationFlowRecommendation[];
  source: 'llm' | 'local';
}

export interface ReadingResult {
  id: string;
  createdAt: string;
  input: ReadingInput;
  question: string;
  spread: Spread;
  cards: DrawnCard[];
  summary: string;
  advice: string;
  llmAnalysis?: LlmAnalysis;
}

export interface LlmCardInterpretation {
  positionId: string;
  label: string;
  cardName: string;
  orientation: Orientation;
  interpretation: string;
}

export interface LlmAnalysis {
  version?: number;
  overview: string;
  cards: LlmCardInterpretation[];
  advice: string[];
  emotionalFeedback: string;
  riskNotes: string[];
  source: 'llm';
  model: string;
  generatedAt: string;
}

export interface LlmConfig {
  enabled: boolean;
  thinkingEnabled: boolean;
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  providerApiKeys: Partial<Record<LlmProvider, string>>;
  temperature: number;
  timeoutMs: number;
  privateChat?: {
    endpoint: string;
    kid: string;
    chatMod: string;
  };
}
