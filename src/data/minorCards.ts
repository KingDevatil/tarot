import type { CardRank, MinorSuit, TarotCard } from '../types';

interface SuitDefinition {
  id: MinorSuit;
  cnName: string;
  enName: string;
  keywords: string[];
  uprightTheme: string;
  reversedTheme: string;
  adviceTheme: string;
  images: Record<CardRank, { image: string; thumbnail: string }>;
}

interface RankMeaning {
  keywords: string[];
  upright: string;
  reversed: string;
  advice: string;
}

const minorImage = (suit: MinorSuit, fileName: string) => ({
  image: new URL(`../../assets/tarot/cards/minor/${suit}/${fileName}`, import.meta.url).href,
  thumbnail: new URL(
    `../../assets/tarot/cards/minor_thumbs/${suit}/${fileName}`,
    import.meta.url,
  ).href,
});

const suitDefinitions: SuitDefinition[] = [
  {
    id: 'wands',
    cnName: '权杖',
    enName: 'Wands',
    keywords: ['行动', '创造', '热情'],
    uprightTheme: '行动力、创造冲动与主动推进正在成为局面的主要动力。',
    reversedTheme: '行动可能过急、受阻或失去方向，需要重新校准投入方式。',
    adviceTheme: '把热情落实为一个清晰且能持续的行动。',
    images: {
      number: minorImage('wands', 'card_minor_wands_number_base.webp'),
      page: minorImage('wands', 'card_minor_wands_page.webp'),
      knight: minorImage('wands', 'card_minor_wands_knight.webp'),
      queen: minorImage('wands', 'card_minor_wands_queen.webp'),
      king: minorImage('wands', 'card_minor_wands_king.webp'),
    },
  },
  {
    id: 'cups',
    cnName: '圣杯',
    enName: 'Cups',
    keywords: ['情感', '关系', '直觉'],
    uprightTheme: '情感交流、关系连接与内在感受正在影响当前判断。',
    reversedTheme: '情绪可能堵塞、失衡或被理想化，需要区分感受与事实。',
    adviceTheme: '先承认真实感受，再决定如何回应关系。',
    images: {
      number: minorImage('cups', 'card_minor_cups_number_base.webp'),
      page: minorImage('cups', 'card_minor_cups_page.webp'),
      knight: minorImage('cups', 'card_minor_cups_knight.webp'),
      queen: minorImage('cups', 'card_minor_cups_queen.webp'),
      king: minorImage('cups', 'card_minor_cups_king.webp'),
    },
  },
  {
    id: 'swords',
    cnName: '宝剑',
    enName: 'Swords',
    keywords: ['思考', '沟通', '冲突'],
    uprightTheme: '事实、判断、沟通方式或必要的取舍正在主导局面。',
    reversedTheme: '思绪可能混乱、沟通失真或冲突内耗，需要恢复清晰。',
    adviceTheme: '把事实、假设与情绪拆开，再做决定。',
    images: {
      number: minorImage('swords', 'card_minor_swords_number_base.webp'),
      page: minorImage('swords', 'card_minor_swords_page.webp'),
      knight: minorImage('swords', 'card_minor_swords_knight.webp'),
      queen: minorImage('swords', 'card_minor_swords_queen.webp'),
      king: minorImage('swords', 'card_minor_swords_king.webp'),
    },
  },
  {
    id: 'pentacles',
    cnName: '星币',
    enName: 'Pentacles',
    keywords: ['现实', '资源', '稳定'],
    uprightTheme: '现实条件、长期积累与资源安排正在决定事情能否稳定落地。',
    reversedTheme: '资源分配、执行基础或安全感可能失衡，需要回到现实成本。',
    adviceTheme: '优先处理最具体、最可验证的现实条件。',
    images: {
      number: minorImage('pentacles', 'card_minor_pentacles_number_base.webp'),
      page: minorImage('pentacles', 'card_minor_pentacles_page.webp'),
      knight: minorImage('pentacles', 'card_minor_pentacles_knight.webp'),
      queen: minorImage('pentacles', 'card_minor_pentacles_queen.webp'),
      king: minorImage('pentacles', 'card_minor_pentacles_king.webp'),
    },
  },
];

const numberRanks: Array<RankMeaning & { number: number; cn: string; en: string; roman: string }> = [
  { number: 1, cn: '一', en: 'Ace', roman: 'I', keywords: ['起点', '机会'], upright: '新的入口正在出现，适合确认最值得投入的方向。', reversed: '机会尚未成熟，或启动能量被犹豫和准备不足压住。', advice: '先完成最小可行的一步。' },
  { number: 2, cn: '二', en: 'Two', roman: 'II', keywords: ['权衡', '配对'], upright: '两个方向或两股力量需要被比较、协调或共同推进。', reversed: '选择迟疑或双方失衡，使局面停留在反复权衡中。', advice: '明确选择标准，不要只比较表面得失。' },
  { number: 3, cn: '三', en: 'Three', roman: 'III', keywords: ['发展', '协作'], upright: '事情进入扩展阶段，协作和持续投入会带来进展。', reversed: '配合不足或预期不一致，正在削弱原本可形成的合力。', advice: '确认参与者对目标和分工是否一致。' },
  { number: 4, cn: '四', en: 'Four', roman: 'IV', keywords: ['稳定', '结构'], upright: '局面需要稳定结构、清晰边界或阶段性休整。', reversed: '稳定正在变成停滞，或基础结构仍存在松动。', advice: '保留有效秩序，同时修复最不稳定的一环。' },
  { number: 5, cn: '五', en: 'Five', roman: 'V', keywords: ['摩擦', '考验'], upright: '冲突、落差或资源竞争正在暴露真正的问题。', reversed: '表面冲突可能缓和，但未处理的分歧仍在消耗局面。', advice: '先解决核心矛盾，不必赢下每个争论。' },
  { number: 6, cn: '六', en: 'Six', roman: 'VI', keywords: ['调整', '恢复'], upright: '局面开始恢复平衡，过去的投入可能得到回应或修正。', reversed: '给予与获得不对等，或旧问题仍妨碍真正恢复。', advice: '检查交换是否公平，并调整投入比例。' },
  { number: 7, cn: '七', en: 'Seven', roman: 'VII', keywords: ['评估', '坚持'], upright: '你需要守住立场、评估进度，并面对进一步挑战。', reversed: '防御过度、信心下降或评估失真，容易消耗在错误位置。', advice: '确认哪些值得坚持，哪些只是惯性。' },
  { number: 8, cn: '八', en: 'Eight', roman: 'VIII', keywords: ['推进', '约束'], upright: '事情正在加速或进入高度专注的执行阶段。', reversed: '推进受阻、节奏失控，或你被自己设定的限制困住。', advice: '移除一个关键阻碍，再恢复行动节奏。' },
  { number: 9, cn: '九', en: 'Nine', roman: 'IX', keywords: ['积累', '临界'], upright: '经验和成果已经积累到临界点，需要保持韧性并完成收尾。', reversed: '疲惫、担忧或过度独立，使最后阶段比预期更艰难。', advice: '保护已有成果，不要在临近完成时透支。' },
  { number: 10, cn: '十', en: 'Ten', roman: 'X', keywords: ['完成', '负荷'], upright: '一个周期接近完成，同时也带来责任、结果或新的承载压力。', reversed: '负担超过承受范围，旧周期迟迟不能真正结束。', advice: '完成必要闭环，并卸下不再属于你的责任。' },
];

const courtRanks: Array<RankMeaning & { number: number; rank: Exclude<CardRank, 'number'>; cn: string; en: string }> = [
  { number: 11, rank: 'page', cn: '侍从', en: 'Page', keywords: ['消息', '学习'], upright: '新的消息、兴趣或学习机会正在出现，适合保持开放。', reversed: '经验不足、表达幼稚或消息不可靠，仍需要验证。', advice: '先观察和学习，不急着做成熟度不足的承诺。' },
  { number: 12, rank: 'knight', cn: '骑士', en: 'Knight', keywords: ['追求', '推进'], upright: '能量正在主动向目标推进，行动态度比等待更重要。', reversed: '推进方式过猛、反复或不切实际，容易制造额外问题。', advice: '保留行动力，同时为速度设置边界。' },
  { number: 13, rank: 'queen', cn: '王后', en: 'Queen', keywords: ['掌控', '内在成熟'], upright: '成熟、稳定的内在力量正在帮助你照顾局面并影响他人。', reversed: '内在失衡、过度照顾或情绪化控制正在削弱判断。', advice: '先稳定自己，再承担他人的需要。' },
  { number: 14, rank: 'king', cn: '国王', en: 'King', keywords: ['领导', '外在成熟'], upright: '局面需要成熟决策、责任承担和对外部资源的有效组织。', reversed: '权威可能变成僵化、操控或责任回避。', advice: '用清晰规则和实际承担建立可信度。' },
];

const buildNumberCards = (suit: SuitDefinition): TarotCard[] =>
  numberRanks.map((rank) => ({
    id: `minor_${suit.id}_${String(rank.number).padStart(2, '0')}`,
    number: rank.number,
    name: `${suit.cnName}${rank.cn}`,
    enName: `${rank.en} of ${suit.enName}`,
    arcana: 'minor',
    suit: suit.id,
    rank: 'number',
    displayNumeral: rank.roman,
    ...suit.images.number,
    keywords: [suit.keywords[0], ...rank.keywords],
    upright: `${rank.upright}${suit.uprightTheme}`,
    reversed: `${rank.reversed}${suit.reversedTheme}`,
    advice: `${rank.advice}${suit.adviceTheme}`,
  }));

const buildCourtCards = (suit: SuitDefinition): TarotCard[] =>
  courtRanks.map((rank) => ({
    id: `minor_${suit.id}_${rank.rank}`,
    number: rank.number,
    name: `${suit.cnName}${rank.cn}`,
    enName: `${rank.en} of ${suit.enName}`,
    arcana: 'minor',
    suit: suit.id,
    rank: rank.rank,
    ...suit.images[rank.rank],
    keywords: [suit.keywords[0], ...rank.keywords],
    upright: `${rank.upright}${suit.uprightTheme}`,
    reversed: `${rank.reversed}${suit.reversedTheme}`,
    advice: `${rank.advice}${suit.adviceTheme}`,
  }));

export const minorArcanaCards: TarotCard[] = suitDefinitions.flatMap((suit) => [
  ...buildNumberCards(suit),
  ...buildCourtCards(suit),
]);
