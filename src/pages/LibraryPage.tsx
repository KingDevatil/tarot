import { X, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardView } from '../components/CardView';
import { tarotCards } from '../data/cards';

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
  const selectedCard =
    tarotCards.find((card) => card.id === selectedCardId) ?? filteredCards[0] ?? tarotCards[0];

  return (
    <main className="screen library-screen">
      <section className="section-header">
        <div>
          <h1>大阿尔卡那牌库</h1>
          <p>查看每张大阿尔卡那的关键词、正逆位含义和行动建议。</p>
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

      <section className="library-grid">
        {filteredCards.map((card) => (
          <article className={`library-card ${card.id === selectedCard.id ? 'is-selected' : ''}`} key={card.id}>
            <CardView
              card={card}
              onClick={() => {
                setSelectedCardId(card.id);
                setIsDetailOpen(true);
              }}
            />
            <div>
              <span>#{String(card.number).padStart(2, '0')}</span>
              <h2>{card.name}</h2>
              <p>{card.keywords.join(' / ')}</p>
            </div>
          </article>
        ))}
      </section>

      {isDetailOpen ? (
        <div className="library-detail-overlay" role="dialog" aria-modal="true" aria-label={`${selectedCard.name}牌义`}>
          <section className="library-detail-drawer">
            <button className="detail-close-button" type="button" onClick={() => setIsDetailOpen(false)}>
              <X size={18} />
              <span>关闭</span>
            </button>
            <div>
              <span>#{String(selectedCard.number).padStart(2, '0')} / {selectedCard.enName}</span>
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
