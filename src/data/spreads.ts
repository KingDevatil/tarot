import type { Spread } from '../types';

export const spreads: Spread[] = [
  {
    id: 'single',
    name: '单张指引',
    description: '适合今日状态、一个核心问题或短期提醒。',
    positions: [{ id: 'guide', label: '核心指引', prompt: '这张牌指出当下最需要看见的重点。' }],
  },
  {
    id: 'three_trend',
    name: '三张趋势',
    description: '以过去、现在、趋势观察一个问题的演化。',
    positions: [
      { id: 'past', label: '过去基础', prompt: '这张牌说明问题形成的背景。' },
      { id: 'present', label: '当前状态', prompt: '这张牌说明你现在面对的真实局面。' },
      { id: 'future', label: '近期趋势', prompt: '这张牌说明若维持当前路径，接下来更可能出现的方向。' },
    ],
  },
  {
    id: 'relationship_5',
    name: '五张关系',
    description: '适合感情、合作、拉扯明显的问题。',
    positions: [
      { id: 'self', label: '我的状态', prompt: '这张牌说明你在关系中的真实状态。' },
      { id: 'other', label: '对方状态', prompt: '这张牌说明对方或外部对象的状态。' },
      { id: 'block', label: '隐藏阻力', prompt: '这张牌指出容易被忽略的阻力。' },
      { id: 'trend', label: '发展趋势', prompt: '这张牌说明关系或事件的近期走向。' },
      { id: 'advice', label: '行动建议', prompt: '这张牌给出最应该采取的姿态。' },
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
