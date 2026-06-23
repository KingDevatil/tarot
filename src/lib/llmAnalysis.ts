import { getQuestionCategory, getTopic } from '../data/questions';
import { getCardMeaning } from './reading';
import type { DrawnCard, LlmAnalysis, LlmCardInterpretation, LlmConfig, ReadingResult } from '../types';

interface RawLlmAnalysis {
  overview?: unknown;
  cards?: unknown;
  advice?: unknown;
  emotionalFeedback?: unknown;
  riskNotes?: unknown;
}

export interface LlmConnectionTestResult {
  message: string;
  model: string;
  rawPreview: string;
}

export class LlmAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmAnalysisError';
  }
}

export const generateLlmAnalysis = async (
  reading: ReadingResult,
  config: LlmConfig,
): Promise<LlmAnalysis> => {
  const content = await requestLlmContent(config, {
    temperature: config.temperature,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      {
        role: 'user',
        content: JSON.stringify(buildReadingPayload(reading), null, 2),
      },
    ],
  });

  return normalizeLlmAnalysis(parseLlmJson(content), reading, config.model.trim());
};

export const testLlmConnection = async (config: LlmConfig): Promise<LlmConnectionTestResult> => {
  if (!config.endpoint.trim() || !config.model.trim() || !config.apiKey.trim()) {
    throw new LlmAnalysisError('请先填写接口地址、模型和 API Key');
  }

  const content = await requestLlmContent(config, {
    temperature: 0,
    maxTokens: 80,
    messages: [
      {
        role: 'system',
        content: '你只返回 JSON 对象，不要输出 Markdown 或额外解释。',
      },
      {
        role: 'user',
        content: '请返回 {"ok": true, "message": "connected"} 用于连接测试。',
      },
    ],
  });

  const parsed = parseLlmJson(content) as { ok?: unknown; message?: unknown };
  if (parsed.ok !== true) {
    throw new LlmAnalysisError('连接成功，但测试 JSON 字段不符合预期，请检查模型输出格式');
  }

  return {
    message: '连接成功，模型返回 JSON 格式正常。',
    model: config.model.trim(),
    rawPreview: content.trim().slice(0, 160),
  };
};

const requestLlmContent = async (
  config: LlmConfig,
  request: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature: number;
    maxTokens?: number;
  },
) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: config.model.trim(),
      temperature: request.temperature,
      messages: request.messages,
    };
    if (request.maxTokens) body.max_tokens = request.maxTokens;

    const response = await fetch(config.endpoint.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LlmAnalysisError(`LLM 请求失败：HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmAnalysisError('LLM 响应中没有可解析内容');
    }

    return content;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LlmAnalysisError('LLM 请求超时，已回退到本地解析');
    }
    if (error instanceof LlmAnalysisError) {
      throw error;
    }
    throw new LlmAnalysisError('LLM 解析不可用，可能是网络、跨域或接口配置问题');
  } finally {
    window.clearTimeout(timeout);
  }
};

const buildSystemPrompt = () => `
你是一个塔罗解析助手。你必须只输出一个 JSON 对象，不要输出 Markdown、代码块、解释文字或额外前后缀。
输出必须符合以下结构：
{
  "overview": "80-160字的整体解析",
  "cards": [
    {
      "positionId": "牌位ID",
      "label": "牌位名称",
      "cardName": "牌名",
      "orientation": "upright 或 reversed",
      "interpretation": "60-120字的该牌位解析"
    }
  ],
  "advice": ["具体建议1", "具体建议2", "具体建议3"],
  "emotionalFeedback": "40-100字的情绪反馈，安抚但不虚假承诺",
  "riskNotes": ["风险提醒1", "风险提醒2"]
}
约束：
- 必须尊重用户问题、牌阵、牌位、牌名、正逆位和本地牌义。
- 不要声称绝对预言，不要承诺必然结果。
- 不要提供医疗、法律、金融等高风险决定的确定性建议。
- cards 数量必须与输入 cards 数量一致。
`.trim();

const buildReadingPayload = (reading: ReadingResult) => {
  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);
  return {
    question: reading.question,
    topic: topic.name,
    category: category.label,
    spread: {
      id: reading.spread.id,
      name: reading.spread.name,
      description: reading.spread.description,
    },
    interpretationFocus: category.interpretationFocus,
    localSummary: reading.summary,
    localAdvice: reading.advice,
    cards: reading.cards.map((drawn) => ({
      positionId: drawn.position.id,
      label: drawn.position.label,
      positionPrompt: drawn.position.prompt,
      cardName: drawn.card.name,
      enName: drawn.card.enName,
      orientation: drawn.orientation,
      keywords: drawn.card.keywords,
      localMeaning: getCardMeaning(drawn),
      localAdvice: drawn.card.advice,
    })),
  };
};

const parseLlmJson = (content: string): RawLlmAnalysis => {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  const objectText = extractFirstJsonObject(cleaned);
  const extracted = objectText ? tryParseJson(objectText) : null;
  if (extracted) return extracted;

  throw new LlmAnalysisError('LLM 输出不是有效 JSON，已回退到本地解析');
};

const tryParseJson = (text: string): RawLlmAnalysis | null => {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === 'object' ? (value as RawLlmAnalysis) : null;
  } catch {
    return null;
  }
};

const extractFirstJsonObject = (text: string) => {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
};

const normalizeLlmAnalysis = (
  raw: RawLlmAnalysis,
  reading: ReadingResult,
  model: string,
): LlmAnalysis => {
  const cards = normalizeCards(raw.cards, reading.cards);
  return {
    overview: normalizeText(raw.overview, reading.summary),
    cards,
    advice: normalizeStringArray(raw.advice, reading.advice.split('\n')).slice(0, 5),
    emotionalFeedback: normalizeText(
      raw.emotionalFeedback,
      '你已经通过明确问题和抽牌完成了一次整理。接下来适合把牌面提醒落实到一个具体行动上，而不是急着追求确定答案。',
    ),
    riskNotes: normalizeStringArray(raw.riskNotes, [
      '牌面适合作为自我观察与决策辅助，不应替代现实沟通和专业建议。',
    ]).slice(0, 4),
    source: 'llm',
    model,
    generatedAt: new Date().toISOString(),
  };
};

const normalizeCards = (value: unknown, cards: DrawnCard[]): LlmCardInterpretation[] => {
  const rawCards = Array.isArray(value) ? value : [];
  return cards.map((drawn, index) => {
    const raw = rawCards[index] && typeof rawCards[index] === 'object'
      ? (rawCards[index] as Partial<LlmCardInterpretation>)
      : {};
    return {
      positionId: drawn.position.id,
      label: drawn.position.label,
      cardName: drawn.card.name,
      orientation: drawn.orientation,
      interpretation: normalizeText(raw.interpretation, getCardMeaning(drawn)),
    };
  });
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
};
