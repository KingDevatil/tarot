import type { DrawnCard, TarotCard } from '../types';

interface CardViewProps {
  card?: TarotCard;
  drawn?: DrawnCard;
  isBack?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CardView({ card, drawn, isBack, isSelected, onClick }: CardViewProps) {
  const activeCard = drawn?.card ?? card;
  const orientation = drawn?.orientation;

  return (
    <button
      className={`tarot-card ${isBack ? 'is-back' : ''} ${isSelected ? 'is-selected' : ''} ${
        orientation === 'reversed' ? 'is-reversed' : ''
      }`}
      type="button"
      onClick={onClick}
      aria-label={activeCard ? `${activeCard.name} ${orientation ?? ''}` : '塔罗牌'}
    >
      <span className="tarot-card__frame" />
      {isBack || !activeCard ? (
        <span className="tarot-card__back">
          <span className="tarot-card__sigil" />
        </span>
      ) : (
        <>
          <img src={activeCard.image} alt={activeCard.name} />
          <span className="tarot-card__meta">
            <strong>{activeCard.name}</strong>
            {orientation ? <em>{orientation === 'upright' ? '正位' : '逆位'}</em> : null}
          </span>
        </>
      )}
    </button>
  );
}
