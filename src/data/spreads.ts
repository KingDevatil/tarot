import type { Spread, SpreadPosition } from '../types';

export const spreads: Spread[] = [
  {
    id: 'single',
    name: '单张指引',
    description: '适合今日状态、一个核心问题或短期提醒。',
    layout: 'single',
    themes: ['今日指引', '短期提醒', '简单问题', '行动建议'],
    positions: [{ id: 'guide', label: '核心指引', prompt: '这张牌指出当下最需要看见的重点。', layoutArea: 'center' }],
  },
  {
    id: 'three_trend',
    name: '三张趋势',
    description: '以过去、现在、趋势观察一个问题的演化。',
    layout: 'line',
    themes: ['近期趋势', '事业学业', '选择判断', '内在状态'],
    positions: [
      { id: 'past', label: '过去基础', prompt: '这张牌说明问题形成的背景。', layoutArea: 'past' },
      { id: 'present', label: '当前状态', prompt: '这张牌说明你现在面对的真实局面。', layoutArea: 'present' },
      { id: 'future', label: '近期趋势', prompt: '这张牌说明若维持当前路径，接下来更可能出现的方向。', layoutArea: 'future' },
    ],
  },
  {
    id: 'relationship_5',
    name: '五张关系',
    description: '适合感情、合作、拉扯明显的问题。',
    layout: 'relationship',
    themes: ['感情关系', '合作关系', '沟通修复', '互动阻力'],
    positions: [
      { id: 'self', label: '我的状态', prompt: '这张牌说明你在关系中的真实状态。', layoutArea: 'self' },
      { id: 'other', label: '对方状态', prompt: '这张牌说明对方或外部对象的状态。', layoutArea: 'other' },
      { id: 'block', label: '隐藏阻力', prompt: '这张牌指出容易被忽略的阻力。', layoutArea: 'block' },
      { id: 'trend', label: '发展趋势', prompt: '这张牌说明关系或事件的近期走向。', layoutArea: 'trend' },
      { id: 'advice', label: '行动建议', prompt: '这张牌给出最应该采取的姿态。', layoutArea: 'advice' },
    ],
  },
  {
    id: 'choice_compare',
    name: '多项选择比较',
    description: '适合在两个或多个明确选项之间比较收益、代价和更稳妥路径。',
    layout: 'choice',
    themes: ['选择判断', '方案比较', '行动取舍', '优先级'],
    positions: [
      { id: 'context', label: '当前判断背景', prompt: '这张牌说明你做出选择时真正需要看见的背景。', layoutArea: 'context' },
      { id: 'option_a', label: '选项 A 的倾向', prompt: '这张牌说明选择 A 更可能带来的结果、收益或代价。', layoutArea: 'option-a' },
      { id: 'option_b', label: '选项 B 的倾向', prompt: '这张牌说明选择 B 更可能带来的结果、收益或代价。', layoutArea: 'option-b' },
      { id: 'advice', label: '最终建议', prompt: '这张牌给出更稳妥的取舍方式和下一步行动。', layoutArea: 'advice' },
    ],
  },
  {
    id: 'body_mind_spirit',
    name: '身心灵三牌',
    description: '从身体状态、心理状态和内在精神三个层面观察当下。',
    layout: 'triangle',
    themes: ['内在状态', '情绪整理', '自我修复', '压力恢复'],
    positions: [
      { id: 'body', label: '身体层面', prompt: '这张牌说明身体、行动或现实负荷正在传递的信息。', layoutArea: 'body' },
      { id: 'mind', label: '心理层面', prompt: '这张牌说明你的思维、情绪或判断模式。', layoutArea: 'mind' },
      { id: 'spirit', label: '精神层面', prompt: '这张牌说明更深层的需求、信念或内在方向。', layoutArea: 'spirit' },
    ],
  },
  {
    id: 'horseshoe_7',
    name: '七张马蹄',
    description: '适合观察复杂问题的背景、阻力、外部影响和最终建议。',
    layout: 'horseshoe',
    themes: ['复杂趋势', '事业学业', '选择判断', '计划推进', '风险判断'],
    positions: [
      { id: 'past', label: '过去影响', prompt: '这张牌说明影响当前局面的过去因素。', layoutArea: 'past' },
      { id: 'present', label: '当前局面', prompt: '这张牌说明此刻最真实的状态。', layoutArea: 'present' },
      { id: 'hidden', label: '隐藏因素', prompt: '这张牌说明容易被忽略或尚未显露的变量。', layoutArea: 'hidden' },
      { id: 'obstacle', label: '主要阻力', prompt: '这张牌指出推进中最需要处理的阻力。', layoutArea: 'obstacle' },
      { id: 'outside', label: '外部影响', prompt: '这张牌说明他人、环境或外部条件的影响。', layoutArea: 'outside' },
      { id: 'advice', label: '行动建议', prompt: '这张牌给出更稳妥的行动方式。', layoutArea: 'advice' },
      { id: 'outcome', label: '可能结果', prompt: '这张牌说明维持当前路径时更可能出现的结果。', layoutArea: 'outcome' },
    ],
  },
  {
    id: 'celtic_cross_10',
    name: '凯尔特十字',
    description: '用于信息较多、牵涉因素复杂的问题，完整观察核心、阻碍、根源、外部环境和趋势。',
    layout: 'celtic',
    themes: ['复杂问题', '长期趋势', '关系困局', '职业规划', '重大选择'],
    positions: [
      { id: 'core', label: '核心现状', prompt: '这张牌说明问题最核心的状态。', layoutArea: 'core' },
      { id: 'cross', label: '交叉阻碍', prompt: '这张牌说明压在核心问题上的阻碍或挑战。', layoutArea: 'cross' },
      { id: 'root', label: '深层根源', prompt: '这张牌说明问题下方的根基、动机或潜在原因。', layoutArea: 'root' },
      { id: 'past', label: '过去影响', prompt: '这张牌说明正在退去但仍有影响的过去因素。', layoutArea: 'past' },
      { id: 'crowning', label: '显意识目标', prompt: '这张牌说明你当前看得见的目标、期待或表层判断。', layoutArea: 'crowning' },
      { id: 'near_future', label: '近期发展', prompt: '这张牌说明短期内更可能出现的变化。', layoutArea: 'near-future' },
      { id: 'self', label: '自我姿态', prompt: '这张牌说明你在这个问题中的态度和可控部分。', layoutArea: 'self' },
      { id: 'environment', label: '外部环境', prompt: '这张牌说明外部条件、他人态度或环境压力。', layoutArea: 'environment' },
      { id: 'hope_fear', label: '希望与担忧', prompt: '这张牌说明你内心的期待、害怕或投射。', layoutArea: 'hope-fear' },
      { id: 'outcome', label: '最终倾向', prompt: '这张牌说明当前路径下更可能抵达的结果。', layoutArea: 'outcome' },
    ],
  },
];

export const getSpread = (spreadId: string) => {
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) {
    throw new Error(`Unknown spread: ${spreadId}`);
  }
  return spread;
};

const choiceOptionKeys = ['choiceOptionA', 'choiceOptionB', 'choiceOptionC', 'choiceOptionD'] as const;
const choiceOptionLabels = ['A', 'B', 'C', 'D'] as const;

export const getChoiceOptionCount = (params: Record<string, string>) => {
  const parsed = Number(params.choiceOptionCount);
  if (Number.isNaN(parsed)) return 2;
  return Math.min(Math.max(parsed, 2), 4);
};

export const getChoiceOptionNames = (params: Record<string, string>) => {
  const optionCount = getChoiceOptionCount(params);
  return choiceOptionKeys.slice(0, optionCount).map((key, index) => {
    const fallback = `选项 ${choiceOptionLabels[index]}`;
    return params[key]?.trim() || fallback;
  });
};

export const formatChoiceOptions = (params: Record<string, string>) =>
  getChoiceOptionNames(params)
    .map((name, index) => `${choiceOptionLabels[index]}：${name}`)
    .join('；');

export const getChoiceComparisonSpread = (params: Record<string, string>): Spread => {
  const optionNames = getChoiceOptionNames(params);
  const optionPositions: SpreadPosition[] = optionNames.map((name, index) => ({
    id: `option_${choiceOptionLabels[index].toLowerCase()}`,
    label: `${choiceOptionLabels[index]}：${name}`,
    prompt: `这张牌说明「${name}」更可能带来的结果、收益、代价或风险。`,
  }));

  return {
    id: 'choice_compare',
    name: `${optionNames.length} 项选择比较`,
    description: `比较 ${formatChoiceOptions(params)}，并给出更稳妥的取舍方式。`,
    layout: 'choice',
    themes: ['选择判断', '方案比较', '行动取舍', '优先级'],
    positions: [
      {
        id: 'context',
        label: '当前判断背景',
        prompt: '这张牌说明你做出选择时真正需要看见的背景和判断标准。',
        layoutArea: 'context',
      },
      ...optionPositions.map((position, index) => ({
        ...position,
        layoutArea: `option-${choiceOptionLabels[index].toLowerCase()}`,
      })),
      {
        id: 'advice',
        label: '最终建议',
        prompt: '这张牌给出更稳妥的取舍方式、行动顺序或验证标准。',
        layoutArea: 'advice',
      },
    ],
  };
};

export const getSpreadForReading = (spreadId: string, params: Record<string, string>) =>
  spreadId === 'choice_compare' ? getChoiceComparisonSpread(params) : getSpread(spreadId);
