import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  GitFork,
  Heart,
  LayoutTemplate,
  Sparkles,
} from 'lucide-react';
import type { ParamKey, ParamOption, QuestionCategory, Topic } from '../types';

export const topics: Topic[] = [
  {
    id: 'daily',
    name: '今日指引',
    description: '抽取今天最需要留意的能量、提醒和行动方向。',
    icon: CalendarDays,
    defaultSpread: 'single',
  },
  {
    id: 'love',
    name: '感情关系',
    description: '查看关系状态、隐藏阻力与下一步建议。',
    icon: Heart,
    defaultSpread: 'relationship_5',
  },
  {
    id: 'career',
    name: '事业学业',
    description: '判断推进节奏、机会、阻力和投入重点。',
    icon: BriefcaseBusiness,
    defaultSpread: 'three_trend',
  },
  {
    id: 'choice',
    name: '选择判断',
    description: '在两个或多个选项之间比较收益、代价和更稳妥路径。',
    icon: GitFork,
    defaultSpread: 'choice_compare',
  },
  {
    id: 'inner',
    name: '内在状态',
    description: '识别情绪根源、潜在需求和自我修复方向。',
    icon: Brain,
    defaultSpread: 'three_trend',
  },
  {
    id: 'trend',
    name: '近期趋势',
    description: '观察未来一段时间的整体走向和关键提醒。',
    icon: Sparkles,
    defaultSpread: 'three_trend',
  },
  {
    id: 'spreads',
    name: '牌阵',
    description: '选择常见牌阵，按牌阵结构处理不同主题的问题。',
    icon: LayoutTemplate,
    defaultSpread: 'three_trend',
  },
];

export const paramOptions: Record<ParamKey, ParamOption[]> = {
  timeRange: [
    { value: '一周内', label: '一周内' },
    { value: '一个月内', label: '一个月内' },
    { value: '三个月内', label: '三个月内' },
  ],
  relationshipStage: [
    { value: '暧昧阶段', label: '暧昧阶段' },
    { value: '稳定关系', label: '稳定关系' },
    { value: '冷淡拉扯', label: '冷淡拉扯' },
  ],
  careerFocus: [
    { value: '当前项目', label: '当前项目' },
    { value: '升职转岗', label: '升职转岗' },
    { value: '学习考试', label: '学习考试' },
  ],
  choiceMode: [
    { value: '继续推进', label: '继续推进' },
    { value: '暂缓观察', label: '暂缓观察' },
    { value: '更换方向', label: '更换方向' },
  ],
  choiceOptionCount: [
    { value: '2', label: '2 个选项' },
    { value: '3', label: '3 个选项' },
    { value: '4', label: '4 个选项' },
  ],
  choiceOptionA: [],
  choiceOptionB: [],
  choiceOptionC: [],
  choiceOptionD: [],
  innerFocus: [
    { value: '情绪低落', label: '情绪低落' },
    { value: '焦虑不安', label: '焦虑不安' },
    { value: '缺乏动力', label: '缺乏动力' },
  ],
  trendFocus: [
    { value: '整体运势', label: '整体运势' },
    { value: '人际关系', label: '人际关系' },
    { value: '计划推进', label: '计划推进' },
  ],
};

const spreadQuestionTemplate = '我想使用{spreadName}观察{spreadThemes}相关问题，本次最需要看清什么？';

export const questionCategories: QuestionCategory[] = [
  {
    id: 'daily_energy',
    topic: 'daily',
    label: '今天我最需要注意什么',
    questionTemplate: '今天我最需要注意什么？',
    requiredParams: [],
    defaultSpread: 'single',
    interpretationFocus: ['今日能量', '提醒', '行动建议'],
  },
  {
    id: 'daily_action',
    topic: 'daily',
    label: '今天适合采取什么行动',
    questionTemplate: '今天我适合采取什么行动？',
    requiredParams: [],
    defaultSpread: 'single',
    interpretationFocus: ['行动窗口', '阻力', '建议'],
  },
  {
    id: 'love_relationship_trend',
    topic: 'love',
    label: '关系接下来会怎样',
    questionTemplate: '我和这个人在{timeRange}的{relationshipStage}关系发展趋势是什么？',
    requiredParams: ['timeRange', 'relationshipStage'],
    defaultSpread: 'relationship_5',
    interpretationFocus: ['双方状态', '隐藏阻力', '近期发展', '行动建议'],
  },
  {
    id: 'love_hidden_block',
    topic: 'love',
    label: '关系中的隐藏阻力',
    questionTemplate: '这段{relationshipStage}关系在{timeRange}最大的隐藏阻力是什么？',
    requiredParams: ['relationshipStage', 'timeRange'],
    defaultSpread: 'relationship_5',
    interpretationFocus: ['真实阻力', '对方状态', '我的行动'],
  },
  {
    id: 'love_action',
    topic: 'love',
    label: '我该主动还是等待',
    questionTemplate: '面对这段{relationshipStage}关系，我在{timeRange}该主动推进还是等待观察？',
    requiredParams: ['relationshipStage', 'timeRange'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['主动成本', '等待成本', '更稳妥选择'],
  },
  {
    id: 'love_repair',
    topic: 'love',
    label: '关系如何修复',
    questionTemplate: '这段{relationshipStage}关系在{timeRange}应该如何修复？',
    requiredParams: ['relationshipStage', 'timeRange'],
    defaultSpread: 'relationship_5',
    interpretationFocus: ['裂缝', '修复条件', '行动建议'],
  },
  {
    id: 'career_progress',
    topic: 'career',
    label: '当前事情能否推进',
    questionTemplate: '我的{careerFocus}在{timeRange}能否顺利推进？',
    requiredParams: ['careerFocus', 'timeRange'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['当前条件', '主要阻力', '推进建议'],
  },
  {
    id: 'career_opportunity',
    topic: 'career',
    label: '近期机会在哪里',
    questionTemplate: '我在{timeRange}围绕{careerFocus}的机会在哪里？',
    requiredParams: ['timeRange', 'careerFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['机会来源', '需要准备', '风险'],
  },
  {
    id: 'career_block',
    topic: 'career',
    label: '卡住的原因是什么',
    questionTemplate: '我的{careerFocus}目前卡住的核心原因是什么？',
    requiredParams: ['careerFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['表层问题', '深层问题', '突破口'],
  },
  {
    id: 'choice_direction',
    topic: 'choice',
    label: '比较多个选项',
    questionTemplate: '面对当前选择，我应该如何比较这些选项：{choiceOptions}？',
    requiredParams: ['choiceOptionCount', 'choiceOptionA', 'choiceOptionB'],
    defaultSpread: 'choice_compare',
    interpretationFocus: ['判断背景', '各选项收益代价', '更合适路径'],
  },
  {
    id: 'inner_emotion',
    topic: 'inner',
    label: '我为什么会这样感受',
    questionTemplate: '我现在的{innerFocus}背后真正需要被看见的是什么？',
    requiredParams: ['innerFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['情绪根源', '未满足需求', '修复方向'],
  },
  {
    id: 'inner_restore',
    topic: 'inner',
    label: '如何恢复内在稳定',
    questionTemplate: '面对{innerFocus}，我接下来应该如何恢复稳定？',
    requiredParams: ['innerFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['失衡点', '支持资源', '恢复行动'],
  },
  {
    id: 'trend_overall',
    topic: 'trend',
    label: '近期整体趋势',
    questionTemplate: '我在{timeRange}的{trendFocus}趋势是什么？',
    requiredParams: ['timeRange', 'trendFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['起势', '变化点', '结果倾向'],
  },
  {
    id: 'trend_warning',
    topic: 'trend',
    label: '近期需要避开什么',
    questionTemplate: '我在{timeRange}围绕{trendFocus}最需要避开什么？',
    requiredParams: ['timeRange', 'trendFocus'],
    defaultSpread: 'three_trend',
    interpretationFocus: ['风险来源', '误判点', '规避建议'],
  },
  {
    id: 'spread_single',
    topic: 'spreads',
    label: '单张指引',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'single',
    interpretationFocus: ['核心重点', '短期提醒', '行动建议'],
  },
  {
    id: 'spread_three_trend',
    topic: 'spreads',
    label: '三张时间线',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'three_trend',
    interpretationFocus: ['过去影响', '当前状态', '近期趋势'],
  },
  {
    id: 'spread_body_mind_spirit',
    topic: 'spreads',
    label: '身心灵三牌',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'body_mind_spirit',
    interpretationFocus: ['身体层面', '心理层面', '精神层面'],
  },
  {
    id: 'spread_relationship_5',
    topic: 'spreads',
    label: '五张关系',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'relationship_5',
    interpretationFocus: ['双方状态', '隐藏阻力', '发展趋势', '行动建议'],
  },
  {
    id: 'spread_horseshoe_7',
    topic: 'spreads',
    label: '七张马蹄',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'horseshoe_7',
    interpretationFocus: ['背景因素', '隐藏变量', '外部影响', '可能结果'],
  },
  {
    id: 'spread_celtic_cross_10',
    topic: 'spreads',
    label: '凯尔特十字',
    questionTemplate: spreadQuestionTemplate,
    requiredParams: [],
    defaultSpread: 'celtic_cross_10',
    interpretationFocus: ['核心现状', '深层根源', '外部环境', '长期倾向'],
  },
];

export const getTopic = (topicId: string) => {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }
  return topic;
};

export const getQuestionCategory = (categoryId: string) => {
  const category = questionCategories.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error(`Unknown category: ${categoryId}`);
  }
  return category;
};
