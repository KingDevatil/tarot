import { X, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardView } from '../components/CardView';
import { tarotCards } from '../data/cards';
import type { MinorSuit, TarotCard } from '../types';

const libraryGroups: Array<{
  id: 'major' | MinorSuit;
  title: string;
  description: string;
  matches: (card: TarotCard) => boolean;
}> = [
  {
    id: 'major',
    title: '大阿尔卡那',
    description: '22 张主牌，呈现核心原型、人生阶段与关键主题。',
    matches: (card) => card.arcana !== 'minor',
  },
  {
    id: 'wands',
    title: '小阿尔卡那 · 权杖',
    description: '行动、创造、热情与推进。',
    matches: (card) => card.suit === 'wands',
  },
  {
    id: 'cups',
    title: '小阿尔卡那 · 圣杯',
    description: '情感、关系、直觉与内在感受。',
    matches: (card) => card.suit === 'cups',
  },
  {
    id: 'swords',
    title: '小阿尔卡那 · 宝剑',
    description: '思考、沟通、判断与冲突处理。',
    matches: (card) => card.suit === 'swords',
  },
  {
    id: 'pentacles',
    title: '小阿尔卡那 · 星币',
    description: '现实、资源、稳定与长期积累。',
    matches: (card) => card.suit === 'pentacles',
  },
];

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(tarotCards[0].id);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tarotCards;
    return tarotCards.filter((card) =>
      [card.name, card.enName, ...card.keywords].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);
  const groupedCards = useMemo(
    () =>
      libraryGroups
        .map((group) => ({
          ...group,
          cards: filteredCards.filter(group.matches),
        }))
        .filter((group) => group.cards.length > 0),
    [filteredCards],
  );
  const selectedCard =
    tarotCards.find((card) => card.id === selectedCardId) ?? filteredCards[0] ?? tarotCards[0];

  return (
    <main className="screen library-screen">
      <section className="section-header">
        <div>
          <h1>完整塔罗牌库</h1>
          <p>查看78张大、小阿尔卡那的关键词、正逆位含义和行动建议。</p>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            placeholder="搜索牌名或关键词"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <div className="library-groups">
        {groupedCards.map((group) => (
          <section className="library-group" key={group.id} aria-labelledby={`library-group-${group.id}`}>
            <div className="library-group__header">
              <div>
                <h2 id={`library-group-${group.id}`}>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <span>{group.cards.length} 张</span>
            </div>
            <div className="library-grid">
              {group.cards.map((card) => (
                <article className={`library-card ${card.id === selectedCard.id ? 'is-selected' : ''}`} key={card.id}>
                  <CardView
                    card={card}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      setIsDetailOpen(true);
                    }}
                  />
                  <div>
                    <span>{cardLabel(card)}</span>
                    <h2>{card.name}</h2>
                    <p>{card.keywords.join(' / ')}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {isDetailOpen ? (
        <div className="library-detail-overlay" role="dialog" aria-modal="true" aria-label={`${selectedCard.name}牌义`}>
          <section className="library-detail-drawer">
            <button className="detail-close-button" type="button" onClick={() => setIsDetailOpen(false)}>
              <X size={18} />
              <span>关闭</span>
            </button>
            <div>
              <span>{cardLabel(selectedCard)} / {selectedCard.enName}</span>
              <h2>{selectedCard.name}</h2>
              <p>{selectedCard.keywords.join(' / ')}</p>
            </div>
            <div className="library-meanings">
              <article>
                <strong>正位</strong>
                <p>{selectedCard.upright}</p>
              </article>
              <article>
                <strong>逆位</strong>
                <p>{selectedCard.reversed}</p>
              </article>
              <article>
                <strong>建议</strong>
                <p>{selectedCard.advice}</p>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function cardLabel(card: (typeof tarotCards)[number]) {
  if (card.arcana === 'minor') {
    const courtLabel = ['侍从', '骑士', '王后', '国王'][card.number - 11];
    return `${card.displayNumeral ?? courtLabel} · 小阿尔卡那`;
  }
  return `#${String(card.number).padStart(2, '0')} · 大阿尔卡那`;
}
