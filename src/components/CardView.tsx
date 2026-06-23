import type { DrawnCard, TarotCard } from '../types';

const cardBackImage = new URL('../../assets/tarot/cards/card_back_default.webp', import.meta.url).href;

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
  const Element = onClick ? 'button' : 'div';

  return (
    <Element
      className={`tarot-card ${isBack ? 'is-back' : ''} ${isSelected ? 'is-selected' : ''} ${
        orientation === 'reversed' ? 'is-reversed' : ''
      }`}
      {...(onClick ? { type: 'button' } : {})}
      onClick={onClick}
      aria-label={activeCard ? `${activeCard.name} ${orientation ?? ''}` : '塔罗牌'}
    >
      <span className="tarot-card__frame" />
      {isBack || !activeCard ? (
        <img className="tarot-card__back-image" src={cardBackImage} alt="" />
      ) : (
        <>
          <img src={activeCard.image} alt={activeCard.name} />
          {orientation ? (
            <span className={`tarot-card__orientation is-${orientation}`}>
              {orientation === 'upright' ? '正' : '逆'}
            </span>
          ) : null}
          <span className="tarot-card__meta">
            <strong>{activeCard.name}</strong>
          </span>
        </>
      )}
    </Element>
  );
}
