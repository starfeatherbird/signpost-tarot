import type { CSSProperties } from 'react';
import { FRAME_IMAGES, frameCssVars, getCardArtUrls, getCardTitle } from '../data/cardAssets';
import type { TarotCard } from '../domain/types';
import { useImageFallback } from './useImageFallback';

interface Props {
  card: TarotCard;
  /** 임시 SVG 로 그릴 때 한글 이름을 함께 넣을지 */
  showLabel?: boolean;
}

const FRAME_VARS = frameCssVars() as CSSProperties;

/**
 * 카드 앞면 = 그림(아래) + FRONT 틀(위) + Cinzel 영문 제목(명판).
 * - 그림 파일이 없으면 틀 안에 임시 상징을 넣습니다. (JUDGEMENT·WORLD 처럼 아직 없는 카드)
 * - 틀 파일마저 없으면 예전 임시 SVG 디자인으로 되돌아갑니다.
 */
export function CardFace({ card, showLabel = true }: Props) {
  const art = useImageFallback(getCardArtUrls(card));
  const frame = useImageFallback(FRAME_IMAGES);
  const label = `${card.number}번 ${card.nameKo}`;

  if (!frame.src) {
    return (
      <div className="card-face-wrap">
        <PlaceholderFace card={card} showLabel={showLabel} />
      </div>
    );
  }

  return (
    <div className="card-face-wrap" style={FRAME_VARS} role="img" aria-label={label}>
      <div className="card-art" aria-hidden="true">
        {art.src ? (
          <img src={art.src} alt="" onError={art.onError} />
        ) : (
          <div className="card-art-placeholder">{card.symbol}</div>
        )}
      </div>
      <img className="card-frame-img" src={frame.src} alt="" onError={frame.onError} />
      <span className="card-title" aria-hidden="true">{getCardTitle(card)}</span>
    </div>
  );
}

function PlaceholderFace({ card, showLabel }: { card: TarotCard; showLabel: boolean }) {
  const label = `${card.number}번 ${card.nameKo}`;
  return (
    <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`glow-${card.id}`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#d6ba78" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#17223f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="160" fill="#17223f" />
      <rect width="100" height="160" fill={`url(#glow-${card.id})`} />
      <rect x="5" y="5" width="90" height="150" rx="6" fill="none" stroke="#d6ba78" strokeWidth="1.2" opacity="0.8" />
      <text x="50" y="22" textAnchor="middle" fontSize="11" fill="#e8d6a5" fontFamily="serif" letterSpacing="1">
        {toRoman(card.number)}
      </text>
      <text x="50" y="82" textAnchor="middle" fontSize="34" fill="#f4ecd8">
        {card.symbol}
      </text>
      {showLabel && (
        <text x="50" y="132" textAnchor="middle" fontSize={card.nameKo.length > 5 ? 9 : 12} fontWeight="600" fill="#f4ecd8">
          {card.nameKo}
        </text>
      )}
      <text x="50" y="146" textAnchor="middle" fontSize="6" fill="#c9c0ab" letterSpacing="0.5">
        {card.nameEn.toUpperCase()}
      </text>
    </svg>
  );
}

function toRoman(n: number): string {
  if (n === 0) return '0';
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = n;
  let out = '';
  for (const [value, sym] of table) {
    while (rest >= value) {
      out += sym;
      rest -= value;
    }
  }
  return out;
}
