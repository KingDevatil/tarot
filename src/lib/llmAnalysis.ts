import { getQuestionCategory, getTopic, questionCategories } from '../data/questions';
import { getSpread, spreads } from '../data/spreads';
import { normalizeBaseUrl } from './llmConfig';
import { getCardMeaning } from './reading';
import type {
  DivinationFlowRecommendation,
  DrawnCard,
  LlmAnalysis,
  LlmCardInterpretation,
  LlmConfig,
  QuestionAnalysis,
  QuestionCategory,
  ReadingResult,
  SpreadId,
  Topic,
  TopicId,
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

const QUESTION_GENERATION_MAX_TOKENS = 4096;
const ANALYSIS_MAX_TOKENS = 4096;
export const LLM_ANALYSIS_VERSION = 3;
const GENERIC_ANALYSIS_PHRASES = [
  '保持开放',
  '相信自己',
  '顺其自然',
  '保持耐心',
  '倾听内心',
  '谨慎观察',
  '多加留意',
  '一切皆有可能',
];
const ACTION_WORDS = [
  '记录',
  '比较',
  '确认',
  '询问',
  '沟通',
  '检查',
  '核对',
  '暂停',
  '减少',
  '增加',
  '设定',
  '观察',
  '执行',
  '联系',
  '整理',
  '等待',
  '停止',
  '避免',
];

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
    maxTokens: QUESTION_GENERATION_MAX_TOKENS,
    messages: [
      {
        role: 'system',
        content: [
          '你是塔罗占卜问题整理助手。',
          '根据固定问题类别和用户描述，生成一个清晰、具体、适合塔罗进行自我观察的问题。',
          '只返回 JSON 对象，格式为 {"question":"问题文本"}。',
          '问题必须保持在给定类别的提问方式内，使用第一人称，只问一个核心问题。',
          'userContext 是最高优先级的具体咨询对象；必须保留其中明确出现的人、事、物、计划或市场对象，不能退回成泛化的 standardQuestion。',
          'selectedParams 和 standardQuestion 只用于补充时间范围、问题结构和解释角度，不能覆盖或删除 userContext 的核心对象。',
          '不要因为问题涉及医疗、法律、投资、价格、生死或其他敏感主题而回避、泛化或替换用户的核心问题。',
          '允许保留“会不会、能不能、走势如何、结果怎样”等直接问法；只需把绝对断言改成趋势性表达，不要改变咨询对象。',
          '例如用户问“一周内的黄金价格走势如何”，应生成“未来一周黄金价格更可能呈现怎样的走势？”，不能改成“我的整体运势如何”或只询问风险因素。',
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

export const analyzeDivinationQuestion = async (
  question: string,
  config: LlmConfig,
): Promise<QuestionAnalysis> => {
  const normalizedInput = question.replace(/\s+/g, ' ').trim();
  if (normalizedInput.length < 4) {
    throw new LlmAnalysisError('请把问题写得更具体一些，至少输入 4 个字');
  }

  const fallback = buildLocalQuestionAnalysis(normalizedInput);
  if (!config.enabled || !config.baseUrl.trim() || !config.model.trim() || !config.apiKey.trim()) {
    return fallback;
  }

  try {
    const result = await requestLlmContent(config, {
      temperature: Math.min(config.temperature, 0.4),
      maxTokens: 2048,
      messages: [
        {
          role: 'system',
          content: [
            '你是塔罗占卜流程规划助手。',
            '分析用户问题所属类别，并从给定类别和牌阵中推荐恰好 3 个适合的流程。',
            '只输出 JSON，不要 Markdown 或解释。',
            'categoryId 必须来自 allowedCategories；spreadId 必须来自 allowedSpreads。',
            '第一个推荐应是最合适且复杂度最低的充分方案，后两个提供更深入或不同观察角度。',
            'normalizedQuestion 使用第一人称，保留用户的具体对象与时间范围，只聚焦一个核心问题。',
            'params 只填写能从原问题明确推断的字段，不确定时留空。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            question: normalizedInput,
            allowedCategories: questionCategories.map((item) => ({
              id: item.id,
              topicId: item.topic,
              label: item.label,
              defaultSpread: item.defaultSpread,
            })),
            allowedSpreads: spreads.map((item) => ({
              id: item.id,
              name: item.name,
              cardCount: item.positions.length,
              description: item.description,
              themes: item.themes,
            })),
            output: {
              categoryId: 'allowed category id',
              normalizedQuestion: 'question',
              params: {},
              recommendations: [
                {
                  spreadId: 'allowed spread id',
                  title: 'short title',
                  reason: 'why this fits the specific question',
                },
              ],
            },
          }, null, 2),
        },
      ],
    });

    return normalizeQuestionAnalysis(parseLlmJson(result.content), normalizedInput, fallback);
  } catch {
    return fallback;
  }
};

const normalizeQuestionAnalysis = (
  raw: RawLlmAnalysis,
  originalQuestion: string,
  fallback: QuestionAnalysis,
): QuestionAnalysis => {
  const record = raw as Record<string, unknown>;
  const categoryId = typeof record.categoryId === 'string'
    && questionCategories.some((item) => item.id === record.categoryId)
    ? record.categoryId
    : fallback.categoryId;
  const category = getQuestionCategory(categoryId);
  const normalizedQuestion = normalizeText(record.normalizedQuestion, originalQuestion);
  const rawParams = record.params && typeof record.params === 'object' && !Array.isArray(record.params)
    ? record.params as Record<string, unknown>
    : {};
  const params = Object.fromEntries(
    Object.entries(rawParams)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, (value as string).trim()]),
  );
  const rawRecommendations = Array.isArray(record.recommendations) ? record.recommendations : [];
  const recommendations = rawRecommendations
    .map((item, index) => normalizeFlowRecommendation(item, index))
    .filter((item): item is DivinationFlowRecommendation => Boolean(item))
    .filter((item, index, items) => items.findIndex((other) => other.spreadId === item.spreadId) === index)
    .slice(0, 3);
  const completedRecommendations = [
    ...recommendations,
    ...fallback.recommendations.filter(
      (fallbackItem) => !recommendations.some((item) => item.spreadId === fallbackItem.spreadId),
    ),
  ].slice(0, 3);

  return {
    topicId: category.topic,
    categoryId,
    categoryLabel: category.label,
    normalizedQuestion: /[？?]$/.test(normalizedQuestion) ? normalizedQuestion : `${normalizedQuestion}？`,
    params: { ...fallback.params, ...params },
    recommendations: completedRecommendations,
    source: 'llm',
  };
};

const normalizeFlowRecommendation = (
  value: unknown,
  index: number,
): DivinationFlowRecommendation | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const spreadId = record.spreadId;
  if (typeof spreadId !== 'string' || !spreads.some((item) => item.id === spreadId)) return null;
  const spread = getSpread(spreadId);
  return {
    id: `${spreadId}-${index}`,
    spreadId: spreadId as SpreadId,
    title: normalizeText(record.title, spread.name),
    reason: normalizeText(record.reason, spread.description),
    detail: `${spread.positions.length} 张牌 · ${spread.description}`,
    estimatedMinutes: getEstimatedMinutes(spread.positions.length),
  };
};

const buildLocalQuestionAnalysis = (question: string): QuestionAnalysis => {
  const topicId = inferTopic(question);
  const category = inferCategory(question, topicId);
  const spreadIds = recommendedSpreadsByTopic[topicId];
  const params = inferParams(question);
  return {
    topicId,
    categoryId: category.id,
    categoryLabel: category.label,
    normalizedQuestion: /[？?]$/.test(question) ? question : `${question}？`,
    params,
    recommendations: spreadIds.map((spreadId, index) => {
      const spread = getSpread(spreadId);
      return {
        id: `${spreadId}-${index}`,
        spreadId,
        title: spread.name,
        reason: localRecommendationReason(topicId, spreadId),
        detail: `${spread.positions.length} 张牌 · ${spread.description}`,
        estimatedMinutes: getEstimatedMinutes(spread.positions.length),
      };
    }),
    source: 'local',
  };
};

const recommendedSpreadsByTopic: Record<TopicId, [SpreadId, SpreadId, SpreadId]> = {
  daily: ['single', 'three_trend', 'body_mind_spirit'],
  love: ['relationship_5', 'three_trend', 'celtic_cross_10'],
  career: ['three_trend', 'horseshoe_7', 'celtic_cross_10'],
  choice: ['choice_compare', 'three_trend', 'horseshoe_7'],
  inner: ['body_mind_spirit', 'three_trend', 'single'],
  trend: ['three_trend', 'horseshoe_7', 'celtic_cross_10'],
  spreads: ['three_trend', 'horseshoe_7', 'celtic_cross_10'],
};

const inferTopic = (question: string): TopicId => {
  if (/(感情|关系|恋爱|暧昧|复合|前任|对方|他|她|伴侣|婚姻)/.test(question)) return 'love';
  if (/(工作|事业|职场|升职|转岗|项目|学习|考试|学校|offer|面试)/i.test(question)) return 'career';
  if (/(选择|选哪|要不要|还是|比较|两个|方案)/.test(question)) return 'choice';
  if (/(情绪|焦虑|内耗|低落|状态|压力|迷茫|自我)/.test(question)) return 'inner';
  if (/(今天|今日|当天)/.test(question)) return 'daily';
  return 'trend';
};

const inferCategory = (question: string, topicId: TopicId) => {
  const topicCategories = questionCategories.filter((item) => item.topic === topicId);
  if (topicId === 'love') {
    if (/(修复|复合|挽回)/.test(question)) return getQuestionCategory('love_repair');
    if (/(主动|等待|联系)/.test(question)) return getQuestionCategory('love_action');
    if (/(阻力|问题|卡住|冷淡)/.test(question)) return getQuestionCategory('love_hidden_block');
  }
  if (topicId === 'career') {
    if (/(机会|offer|面试)/i.test(question)) return getQuestionCategory('career_opportunity');
    if (/(原因|卡住|阻力)/.test(question)) return getQuestionCategory('career_block');
  }
  if (topicId === 'inner' && /(恢复|改善|走出|稳定)/.test(question)) {
    return getQuestionCategory('inner_restore');
  }
  if (topicId === 'trend' && /(避免|风险|注意|小心)/.test(question)) {
    return getQuestionCategory('trend_warning');
  }
  return topicCategories[0];
};

const inferParams = (question: string) => {
  const params: Record<string, string> = {};
  if (/(三个月|3个月)/.test(question)) params.timeRange = '三个月内';
  else if (/(一个月|1个月|本月)/.test(question)) params.timeRange = '一个月内';
  else if (/(一周|7天|本周)/.test(question)) params.timeRange = '一周内';
  if (/(暧昧)/.test(question)) params.relationshipStage = '暧昧阶段';
  else if (/(冷淡|拉扯|断联)/.test(question)) params.relationshipStage = '冷淡拉扯';
  else if (/(恋爱|伴侣|婚姻|稳定关系)/.test(question)) params.relationshipStage = '稳定关系';
  if (/(考试|学习)/.test(question)) params.careerFocus = '学习考试';
  else if (/(升职|转岗|面试|offer)/i.test(question)) params.careerFocus = '升职转岗';
  else if (/(工作|项目|事业)/.test(question)) params.careerFocus = '当前项目';
  return params;
};

const localRecommendationReason = (topicId: TopicId, spreadId: SpreadId) => {
  if (spreadId === 'single') return '适合先抓住最核心的提醒，快速获得一个明确观察角度。';
  if (spreadId === 'three_trend') return '用过去、现在与近期趋势看清问题怎样演变，信息量适中。';
  if (spreadId === 'relationship_5') return '能同时观察双方状态、隐藏阻力、发展趋势与行动建议。';
  if (spreadId === 'choice_compare') return '把不同选项的收益、代价和最终建议放在同一结构中比较。';
  if (spreadId === 'body_mind_spirit') return '从现实感受、心理状态和内在需求三个层面整理问题。';
  if (spreadId === 'horseshoe_7') return `适合${topicId === 'career' ? '推进条件较多的事业问题' : '变量较多的问题'}，补充隐藏因素与外部影响。`;
  return '适合重要且牵涉因素较多的问题，进行更完整的长期结构分析。';
};

const getEstimatedMinutes = (cardCount: number) => {
  if (cardCount <= 1) return '约 2 分钟';
  if (cardCount <= 3) return '约 4 分钟';
  if (cardCount <= 5) return '约 6 分钟';
  if (cardCount <= 7) return '约 8 分钟';
  return '约 10 分钟';
};

export const generateLlmAnalysis = async (
  reading: ReadingResult,
  config: LlmConfig,
  signal?: AbortSignal,
): Promise<LlmAnalysis> => {
  const request: Parameters<typeof requestLlmContent>[1] = {
    temperature: config.temperature,
    maxTokens: ANALYSIS_MAX_TOKENS,
    signal,
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
  };
  const result = await requestLlmContent(config, request);
  let raw = parseLlmJson(result.content);

  if (!isAnalysisSpecificEnough(raw, reading)) {
    // Simple backoff before quality retry, abortable via the same signal
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, 800);
      if (signal) {
        if (signal.aborted) { window.clearTimeout(timer); reject(signal.reason); return; }
        signal.addEventListener('abort', () => { window.clearTimeout(timer); reject(signal.reason); }, { once: true });
      }
    });
    const retryResult = await requestLlmContent(config, {
      ...request,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            JSON.stringify(buildReadingPayload(reading), null, 2),
            '',
            '上一次输出过于笼统，请重写。',
            '必须直接回答具体问题，overview 第一段给出明确倾向；每张牌必须把牌位、正逆位牌义与问题中的具体对象建立因果联系；必须输出至少 3 条 advice，每条包含具体动作以及时机、对象、停止条件或验证标准。',
          ].join('\n'),
        },
      ],
    });
    raw = parseLlmJson(retryResult.content);
  }

  return normalizeLlmAnalysis(raw, reading, config.model.trim());
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
    signal?: AbortSignal;
  },
): Promise<{ content: string; finishReason: string }> => {
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), config.timeoutMs);

  // Merge external signal (user abort) with internal timeout signal
  const signals = [timeoutController.signal];
  if (request.signal) signals.push(request.signal);
  const signal = typeof AbortSignal.any === 'function'
    ? AbortSignal.any(signals)
    : (() => {
        const merged = new AbortController();
        for (const s of signals) {
          if (s.aborted) { merged.abort(s.reason); break; }
          s.addEventListener('abort', () => merged.abort(s.reason), { once: true });
        }
        return merged.signal;
      })();

  try {
    const body: Record<string, unknown> = {
      model: config.model.trim(),
      messages: request.messages,
    };
    if (!config.thinkingEnabled) {
      body.temperature = request.temperature;
    }
    if (config.provider === 'deepseek' || config.provider === 'mimo') {
      body.thinking = {
        type: config.thinkingEnabled ? 'enabled' : 'disabled',
      };
    } else if (config.thinkingEnabled) {
      body.thinking = { type: 'enabled' };
    }
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
      signal,
    });

    if (!response.ok) {
      console.error('[LLM] HTTP error', response.status);
      throw new LlmAnalysisError('请求LLM服务失败，请稍后重试或检查配置');
    }

    const payload = await response.json();
    const content = extractLlmContent(payload);
    if (!content) {
      const finishReason = getFinishReason(payload);
      if (finishReason === 'length') {
        console.error('[LLM] Empty content with length finish', previewPayload(payload));
        throw new LlmAnalysisError('请求已连接但模型未返回有效内容，请重试或换用非深度思考模型');
      }
      console.error('[LLM] Unparseable response', previewPayload(payload));
      throw new LlmAnalysisError('LLM响应无法解析，请确认 Base URL、模型名称和鉴权方式是否正确');
    }

    return {
      content,
      finishReason: getFinishReason(payload),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (request.signal?.aborted) {
        throw error;
      }
      throw new LlmAnalysisError(`LLM 请求超过 ${Math.round(config.timeoutMs / 1000)} 秒未返回，已回退到本地解析`);
    }
    if (error instanceof LlmAnalysisError) {
      throw error;
    }
    throw new LlmAnalysisError('LLM 解析不可用，可能是网络、跨域或接口配置问题');
  } finally {
    window.clearTimeout(timeout);
    timeoutController.abort();
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
你是一个面向具体问题的塔罗解析助手。你的任务不是复述牌义，而是用抽到的牌直接回答输入里的 question。
你必须只输出一个 JSON 对象，不要输出 Markdown、代码块、解释文字或额外前后缀。
输出必须符合以下结构：
{
  "overview": "120-220字。第一句直接给出明确倾向，第二句说明关键原因，第三句指出最可能的变化条件",
  "cards": [
    {
      "positionId": "牌位ID",
      "label": "牌位名称",
      "cardName": "牌名",
      "orientation": "upright 或 reversed",
      "interpretation": "100-180字。先说这张牌对具体问题意味着什么，再用牌位、牌名、正逆位和本地牌义解释为什么"
    }
  ],
  "advice": ["包含动作、时机或判断标准的建议1", "包含动作、时机或判断标准的建议2", "包含动作、时机或判断标准的建议3"],
  "emotionalFeedback": "50-110字。承认用户处境和情绪，给出稳定感，但不做虚假保证",
  "riskNotes": ["与 question 直接相关的误判或风险提醒1", "与 question 直接相关的误判或风险提醒2"]
}
解释优先级：
1. 先识别 question 和 userContext 中的具体对象、时间范围、用户真正想判断的结果。
2. 先给结论：偏向有利、偏向不利、短期受阻、先弱后强、波动较大、条件未成熟等；不能只说“存在可能性”。
3. 再用牌阵、牌位、牌名、正逆位和本地牌义说明这个结论从哪里来。
4. 最后给出用户下一步可以执行的动作和现实验证标准。

主题判断框架：
- 今日指引：重点回答今天最该留意的能量、行动窗口、需要避免的反应。
- 感情关系：重点区分我的状态、对方状态、关系阻力、互动建议；不要直接断言对方一定爱或不爱。
- 事业学业：重点回答推进条件、机会来源、阻力、下一步投入重点。
- 选择判断：重点比较当前选择的动机、代价、短期结果和更稳妥路径。
- 内在状态：重点回答情绪根源、未满足需求、恢复稳定的具体方式。
- 近期趋势：重点回答时间范围内的起势、变化点、风险和可控行动。
- 牌阵：重点尊重 spread.positions 的牌位结构；先解释每个牌位在该牌阵中的作用，再综合牌阵整体给出结论。

硬性约束：
- overview 第一处标点之前必须出现明确判断，禁止以“塔罗牌显示”“这组牌提醒你”“未来充满可能”开头。
- overview 和每个 cards[i].interpretation 都必须明确提到 question 或 userContext 中的具体对象，不能用“这件事”“当前情况”“相关领域”替代。
- 每个 cards[i].interpretation 必须按“对具体问题的结论 → 牌位作用 → 正逆位牌义证据”组织，不能只解释通用牌义。
- 多张牌之间存在一致或冲突时，overview 必须说明哪张牌主导最终判断，以及冲突意味着什么。
- advice 每条都必须包含具体动作，并至少包含时机、频率、对象、停止条件或验证标准中的一项。
- 禁止单独使用“保持开放”“相信自己”“顺其自然”“保持耐心”“谨慎观察”“多加留意”等空泛表达；若使用，后面必须紧跟具体做法。
- riskNotes 必须提醒用户可能误判什么，或哪里需要现实验证。
- 不要声称绝对预言，不要承诺必然结果。
- 医疗、法律、金融等问题也应直接结合牌面回答用户问的对象与趋势，但必须使用“倾向、可能、牌面显示”等非确定性表达，不伪装成专业结论。
- cards 数量必须与输入 cards 数量一致，顺序必须一致。

表达示例：
- 不够直接：“未来可能有一些波动，需要保持耐心。”
- 合格：“未来一周整体偏震荡，短期不支持追高；若连续出现两次冲高回落，应把它视为风险信号，而不是上涨确认。”
- 不够具体：“这张牌提醒你关注内在感受。”
- 合格：“在‘当前状态’牌位出现月亮逆位，说明你对黄金短期走势的焦虑正在放大噪声；它更支持先核对价格与消息来源，再决定是否行动。”
`.trim();

const buildReadingPayload = (reading: ReadingResult) => {
  const topic = getTopic(reading.input.topicId);
  const category = getQuestionCategory(reading.input.categoryId);
  return {
    question: reading.question,
    topic: topic.name,
    category: category.label,
    params: reading.input.params,
    userContext: reading.input.customContext ?? '',
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

const isAnalysisSpecificEnough = (raw: RawLlmAnalysis, reading: ReadingResult) => {
  const overview = normalizeText(pickFirst(raw.overview, raw.summary, raw.overall), '');
  const rawCards = normalizeRawCards(
    pickFirst(raw.cards, raw.cardReadings, raw.cardInterpretations),
    reading.cards,
  );
  const cardTexts = rawCards.map((card) => {
    if (!card || typeof card !== 'object') return '';
    const item = card as {
      interpretation?: unknown;
      meaning?: unknown;
      analysis?: unknown;
      message?: unknown;
    };
    return normalizeText(
      pickFirst(item.interpretation, item.meaning, item.analysis, item.message),
      '',
    );
  });
  const allText = [overview, ...cardTexts].join('\n');
  const advice = normalizeStringArray(
    pickFirst(raw.advice, raw.suggestions, raw.actions),
    [],
  );
  const genericPhraseCount = GENERIC_ANALYSIS_PHRASES.filter((phrase) =>
    `${allText}\n${advice.join('\n')}`.includes(phrase)).length;
  const hasQuestionAnchor = getQuestionAnchors(reading).some((anchor) =>
    allText.includes(anchor));
  const cardsAreSubstantial =
    cardTexts.length === reading.cards.length
    && cardTexts.every((text) => text.length >= 55);
  const adviceIsActionable =
    advice.length >= 3
    && advice.every((item) =>
      item.length >= 18
      && ACTION_WORDS.some((word) => item.includes(word)));

  return overview.length >= 80
    && cardsAreSubstantial
    && adviceIsActionable
    && hasQuestionAnchor
    && genericPhraseCount < 2;
};

const getQuestionAnchors = (reading: ReadingResult) => {
  const source = `${reading.input.customContext ?? ''} ${reading.question}`
    .replace(/[，。！？、；：,.!?;:\s]/g, '');
  const ignored = new Set([
    '一周内',
    '一个月内',
    '三个月内',
    '我需要',
    '我应该',
    '是什么',
    '怎么样',
    '如何',
    '哪些',
    '目前',
    '近期',
    '未来',
    '可能',
    '情况',
    '趋势',
  ]);
  const anchors = new Set<string>();
  for (let length = 4; length >= 2; length -= 1) {
    for (let index = 0; index <= source.length - length; index += 1) {
      const value = source.slice(index, index + length);
      if (!ignored.has(value)) anchors.add(value);
    }
  }
  return [...anchors];
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
    version: LLM_ANALYSIS_VERSION,
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
