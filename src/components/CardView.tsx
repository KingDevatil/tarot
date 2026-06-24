import type { DrawnCard, TarotCard } from '../types';

const cardBackImage = new URL('../../assets/tarot/cards/card_back_default.webp', import.meta.url).href;
const cardBackThumbnail = new URL('../../assets/tarot/cards/card_back_thumb.webp', import.meta.url).href;

interface CardViewProps {
  card?: TarotCard;
  drawn?: DrawnCard;
  isBack?: boolean;
  isSelected?: boolean;
  imageSize?: 'thumbnail' | 'full';
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
}

export function CardView({
  card,
  drawn,
  isBack,
  isSelected,
  imageSize = 'thumbnail',
  loading = 'lazy',
  onClick,
}: CardViewProps) {
  const activeCard = drawn?.card ?? card;
  const orientation = drawn?.orientation;
  const Element = onClick ? 'button' : 'div';
  const imageSource = activeCard
    ? imageSize === 'full'
      ? activeCard.image
      : activeCard.thumbnail
    : '';
  const backImageSource = imageSize === 'full' ? cardBackImage : cardBackThumbnail;

  return (
    <Element
      className={`tarot-card ${isBack ? 'is-back' : ''} ${isSelected ? 'is-selected' : ''} ${
        orientation === 'reversed' ? 'is-reversed' : ''
      }`}
      {...(onClick ? { type: 'button' } : {})}
      onClick={onClick}
      aria-label={!isBack && activeCard ? `${activeCard.name} ${orientation ?? ''}` : '塔罗牌'}
    >
      <span className="tarot-card__frame" />
      {isBack || !activeCard ? (
        <img className="tarot-card__back-image" src={backImageSource} alt="" loading={loading} decoding="async" />
      ) : (
        <>
          <img src={imageSource} alt={activeCard.name} loading={loading} decoding="async" />
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
