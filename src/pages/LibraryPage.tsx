import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardView } from '../components/CardView';
import { tarotCards } from '../data/cards';

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tarotCards;
    return tarotCards.filter((card) =>
      [card.name, card.enName, ...card.keywords].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);

  return (
    <main className="screen library-screen">
      <section className="section-header">
        <div>
          <h1>大阿尔卡那牌库</h1>
          <p>当前 MVP 使用 22 张大阿尔卡那，牌面边框由前端统一叠加。</p>
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
          <article className="library-card" key={card.id}>
            <CardView card={card} />
            <div>
              <span>#{String(card.number).padStart(2, '0')}</span>
              <h2>{card.name}</h2>
              <p>{card.keywords.join(' / ')}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
