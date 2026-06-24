import { getQuestionCategory, getTopic } from '../data/questions';
import { normalizeBaseUrl } from './llmConfig';
import { getCardMeaning } from './reading';
import type {
  DrawnCard,
  LlmAnalysis,
  LlmCardInterpretation,
  LlmConfig,
  QuestionCategory,
  ReadingResult,
  Topic,
} from '../types';

interface RawLlmAnalysis {
  question?: unknown;
  overview?: unknown;
  summary?: unknown;
  overall?: unknown;
  cards?: unknown;
  cardReadings?: unknown;
  cardInterpretations?: unknown;
  advice?: unknown;
  suggestions?: unknown;
  actions?: unknown;
  emotionalFeedback?: unknown;
  emotional_feedback?: unknown;
  emotion?: unknown;
  riskNotes?: unknown;
  risk_notes?: unknown;
  risks?: unknown;
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

export const generateLlmQuestion = async (
  topic: Topic,
  category: QuestionCategory,
  params: Record<string, string>,
  customContext: string,
  standardQuestion: string,
  config: LlmConfig,
): Promise<string> => {
  const context = customContext.trim();
  if (!context) {
    throw new LlmAnalysisError('请先填写你想咨询的具体情况');
  }
  if (!config.enabled || !config.baseUrl.trim() || !config.model.trim() || !config.apiKey.trim()) {
    throw new LlmAnalysisError('LLM 配置不完整，请先在配置页开启并填写接口信息');
  }

  const result = await requestLlmContent(config, {
    temperature: Math.min(config.temperature, 0.7),
    maxTokens: 256,
    messages: [
      {
        role: 'system',
        content: [
          '你是塔罗占卜问题整理助手。',
          '根据固定问题类别和用户描述，生成一个清晰、具体、适合塔罗进行自我观察的问题。',
          '只返回 JSON 对象，格式为 {"question":"问题文本"}。',
          '问题必须保持在给定类别内，使用第一人称，只问一个核心问题。',
          '避免绝对预言、读心、医疗、法律、投资、生死判断；遇到高风险内容时改写为情绪、行动或可控因素层面的提问。',
          '不要添加解释、建议、Markdown 或额外字段。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({
          topic: topic.name,
          category: category.label,
          selectedParams: params,
          standardQuestion,
          userContext: context,
        }, null, 2),
      },
    ],
  });

  const parsed = parseLlmJson(result.content);
  const question = normalizeText(parsed.question, '').replace(/\s+/g, ' ').trim();
  if (!question) {
    throw new LlmAnalysisError('LLM 未返回有效问题，请重试');
  }
  return /[？?]$/.test(question) ? question : `${question}？`;
};

export const generateLlmAnalysis = async (
  reading: ReadingResult,
  config: LlmConfig,
): Promise<LlmAnalysis> => {
  const result = await requestLlmContent(config, {
    temperature: config.temperature,
    maxTokens: 2048,
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

  return normalizeLlmAnalysis(parseLlmJson(result.content), reading, config.model.trim());
};

export const testLlmConnection = async (config: LlmConfig): Promise<LlmConnectionTestResult> => {
  if (!config.baseUrl.trim() || !config.model.trim() || !config.apiKey.trim()) {
    throw new LlmAnalysisError('请先填写 Base URL、模型和 API Key');
  }

  const result = await requestLlmContent(config, {
    temperature: 0,
    maxTokens: 2048,
    messages: [
      {
        role: 'system',
        content: '你只返回 JSON 对象，不要输出 Markdown、翻译、解释、推理过程或额外文字。',
      },
      {
        role: 'user',
        content: '直接原样返回这个 JSON 对象：{"ok":true,"message":"connected"}',
      },
    ],
  });

  const parsed = parseLlmJson(result.content) as { ok?: unknown; message?: unknown };
  if (parsed.ok !== true) {
    throw new LlmAnalysisError('连接成功，但测试 JSON 字段不符合预期，请检查模型输出格式');
  }

  return {
    message: '连接成功，模型返回 JSON 格式正常。',
    model: config.model.trim(),
    rawPreview: result.content.trim().slice(0, 160),
  };
};

const requestLlmContent = async (
  config: LlmConfig,
  request: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature: number;
    maxTokens?: number;
  },
): Promise<{ content: string; finishReason: string }> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: config.model.trim(),
      temperature: request.temperature,
      messages: request.messages,
    };
    if (request.maxTokens) {
      if (config.provider === 'mimo') {
        body.max_completion_tokens = request.maxTokens;
      } else {
        body.max_tokens = request.maxTokens;
      }
    }

    const response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LlmAnalysisError(`LLM 请求失败：HTTP ${response.status}`);
    }

    const payload = await response.json();
    const content = extractLlmContent(payload);
    if (!content) {
      const finishReason = getFinishReason(payload);
      if (finishReason === 'length') {
        throw new LlmAnalysisError(`LLM 已连接成功，但模型把输出额度耗在推理过程里，最终正文为空。请重试，或换用非深度思考模型。响应预览：${previewPayload(payload)}`);
      }
      throw new LlmAnalysisError(`LLM 响应中没有可解析内容，请确认 Base URL、模型名称和鉴权方式。响应预览：${previewPayload(payload)}`);
    }

    return {
      content,
      finishReason: getFinishReason(payload),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LlmAnalysisError(`LLM 请求超过 ${Math.round(config.timeoutMs / 1000)} 秒未返回，已回退到本地解析`);
    }
    if (error instanceof LlmAnalysisError) {
      throw error;
    }
    throw new LlmAnalysisError('LLM 解析不可用，可能是网络、跨域或接口配置问题');
  } finally {
    window.clearTimeout(timeout);
  }
};

const buildChatCompletionsUrl = (baseUrl: string) => `${normalizeBaseUrl(baseUrl)}/chat/completions`;

const buildHeaders = (config: LlmConfig) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.provider === 'mimo') {
    headers['api-key'] = config.apiKey.trim();
  } else {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }
  return headers;
};

const getFinishReason = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as { choices?: Array<{ finish_reason?: unknown }> };
  const reason = data.choices?.[0]?.finish_reason;
  return typeof reason === 'string' ? reason : '';
};

const extractLlmContent = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as {
    choices?: Array<{
      message?: { content?: unknown; reasoning_content?: unknown };
      delta?: { content?: unknown };
      text?: unknown;
    }>;
    output_text?: unknown;
    output?: unknown;
  };

  const choice = data.choices?.[0];
  return normalizeContentPart(choice?.message?.content)
    || normalizeContentPart(choice?.text)
    || normalizeContentPart(choice?.delta?.content)
    || normalizeContentPart(data.output_text)
    || normalizeContentPart(data.output);
};

const previewPayload = (payload: unknown) => {
  try {
    return JSON.stringify(payload).slice(0, 240);
  } catch {
    return String(payload).slice(0, 240);
  }
};

const normalizeContentPart = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      const item = part as { text?: unknown; content?: unknown; type?: unknown };
      if (typeof item.text === 'string') return item.text;
      if (typeof item.content === 'string') return item.content;
      if (Array.isArray(item.content)) return normalizeContentPart(item.content);
      return '';
    })
    .join('')
    .trim();
};

const buildSystemPrompt = () => `
你是一个面向具体问题的塔罗解析助手。你的任务不是复述牌义，而是用抽到的牌回答输入里的 question。
你必须只输出一个 JSON 对象，不要输出 Markdown、代码块、解释文字或额外前后缀。
输出必须符合以下结构：
{
  "overview": "100-180字的整体解析，第一句必须直接回应 question 的核心判断",
  "cards": [
    {
      "positionId": "牌位ID",
      "label": "牌位名称",
      "cardName": "牌名",
      "orientation": "upright 或 reversed",
      "interpretation": "80-140字。必须说明这张牌在该牌位上如何回答 question，不能只解释通用牌义"
    }
  ],
  "advice": ["结合 question 的具体行动建议1", "结合 question 的具体行动建议2", "结合 question 的具体行动建议3"],
  "emotionalFeedback": "50-110字。承认用户处境和情绪，给出稳定感，但不做虚假保证",
  "riskNotes": ["与 question 直接相关的误判或风险提醒1", "与 question 直接相关的误判或风险提醒2"]
}
解释优先级：
1. 先回答 question，不要先讲抽象牌义。
2. 结合 topic、category、params、interpretationFocus 判断用户真正关心的维度。
3. 再使用牌阵、牌位、牌名、正逆位、本地牌义作为证据。
4. 最后给出可执行建议和风险提醒。

主题判断框架：
- 今日指引：重点回答今天最该留意的能量、行动窗口、需要避免的反应。
- 感情关系：重点区分我的状态、对方状态、关系阻力、互动建议；不要直接断言对方一定爱或不爱。
- 事业学业：重点回答推进条件、机会来源、阻力、下一步投入重点。
- 选择判断：重点比较当前选择的动机、代价、短期结果和更稳妥路径。
- 内在状态：重点回答情绪根源、未满足需求、恢复稳定的具体方式。
- 近期趋势：重点回答时间范围内的起势、变化点、风险和可控行动。

硬性约束：
- 每个 cards[i].interpretation 必须同时提到牌位含义和 question 的具体对象，不能写成任何问题都适用的通用解释。
- advice 每条都必须是可执行动作，避免“保持开放”“相信自己”这类空泛句。
- riskNotes 必须提醒用户可能误判什么，或哪里需要现实验证。
- 不要声称绝对预言，不要承诺必然结果。
- 不要提供医疗、法律、金融等高风险决定的确定性建议。
- cards 数量必须与输入 cards 数量一致，顺序必须一致。
`.trim();

const buildReadingPayload = (reading: ReadingResult) => {
  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);
  return {
    question: reading.question,
    topic: topic.name,
    category: category.label,
    params: reading.input.params,
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
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  const objectText = extractFirstJsonObject(cleaned);
  const extracted = objectText ? tryParseJson(objectText) : null;
  if (extracted) return extracted;

  const repaired = repairJsonText(objectText ?? cleaned);
  const repairedParsed = tryParseJson(repaired);
  if (repairedParsed) return repairedParsed;

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

const repairJsonText = (text: string) => text
  .replace(/^\uFEFF/, '')
  .replace(/,\s*([}\]])/g, '$1');

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
  const cards = normalizeCards(
    pickFirst(raw.cards, raw.cardReadings, raw.cardInterpretations),
    reading.cards,
  );
  return {
    overview: normalizeText(pickFirst(raw.overview, raw.summary, raw.overall), reading.summary),
    cards,
    advice: normalizeStringArray(
      pickFirst(raw.advice, raw.suggestions, raw.actions),
      reading.advice.split('\n'),
    ).slice(0, 5),
    emotionalFeedback: normalizeText(
      pickFirst(raw.emotionalFeedback, raw.emotional_feedback, raw.emotion),
      '你已经通过明确问题和抽牌完成了一次整理。接下来适合把牌面提醒落实到一个具体行动上，而不是急着追求确定答案。',
    ),
    riskNotes: normalizeStringArray(pickFirst(raw.riskNotes, raw.risk_notes, raw.risks), [
      '牌面适合作为自我观察与决策辅助，不应替代现实沟通和专业建议。',
    ]).slice(0, 4),
    source: 'llm',
    model,
    generatedAt: new Date().toISOString(),
  };
};

const normalizeCards = (value: unknown, cards: DrawnCard[]): LlmCardInterpretation[] => {
  const rawCards = normalizeRawCards(value, cards);
  return cards.map((drawn, index) => {
    const raw = rawCards[index] && typeof rawCards[index] === 'object'
      ? (rawCards[index] as Partial<LlmCardInterpretation> & {
        meaning?: unknown;
        analysis?: unknown;
        message?: unknown;
      })
      : {};
    return {
      positionId: drawn.position.id,
      label: drawn.position.label,
      cardName: drawn.card.name,
      orientation: drawn.orientation,
      interpretation: normalizeText(
        pickFirst(raw.interpretation, raw.meaning, raw.analysis, raw.message),
        getCardMeaning(drawn),
      ),
    };
  });
};

const normalizeRawCards = (value: unknown, cards: DrawnCard[]) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return cards.map((drawn) =>
    record[drawn.position.id]
    ?? record[drawn.position.label]
    ?? record[drawn.card.name]
    ?? {},
  );
};

const pickFirst = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeStringArray = (value: unknown, fallback: string[]) => {
  if (typeof value === 'string') {
    const lines = value
      .split(/\n|；|;/)
      .map((item) => item.replace(/^[-*\d.、\s]+/, '').trim())
      .filter(Boolean);
    return lines.length ? lines : fallback;
  }
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
};
