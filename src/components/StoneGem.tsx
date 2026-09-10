import type { Stone } from '../data/stones';

interface Props {
  stone: Stone;
  size?: number;
  /** 아직 모으지 않은 돌은 흐리게 */
  dim?: boolean;
}

/** 스톤을 나타내는 보석 모양 SVG. 색은 스톤 데이터의 대표 색을 씁니다. */
export function StoneGem({ stone, size = 40, dim = false }: Props) {
  const id = `gem-${stone.id}`;
  return (
    <svg
      className={`stone-gem ${dim ? 'is-dim' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={stone.nameKo}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={stone.color} />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* 바탕색 + 그러데이션을 겹쳐 단색 위에 빛이 들어오게 */}
      <polygon points="20,2 35,12 35,28 20,38 5,28 5,12" fill={stone.color} />
      <polygon points="20,2 35,12 35,28 20,38 5,28 5,12" fill={`url(#${id}-body)`} />
      <polygon points="20,10 28,15 28,25 20,30 12,25 12,15" fill="#ffffff" fillOpacity="0.18" />
      <polygon points="20,2 35,12 20,10 5,12" fill="#ffffff" fillOpacity="0.28" />
      <polygon points="20,2 35,12 35,28 20,38 5,28 5,12" fill="none" stroke="#000000" strokeOpacity="0.25" />
    </svg>
  );
}
