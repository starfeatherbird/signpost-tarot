import { CardBack } from './CardBack';
import { LoadingSymbol } from './LoadingSymbol';

/**
 * 첫 화면 장면: 금빛 후광 앞에 표지판 심볼, 그 아래 부채꼴로 겹친 카드 뒷면 세 장.
 * 장식용이라 보조 기술에는 노출하지 않습니다. 애니메이션은 없습니다.
 */
export function HeroScene() {
  return (
    <div className="hero" aria-hidden="true">
      <div className="hero-halo" />
      <div className="hero-symbol"><LoadingSymbol size={40} /></div>
      <div className="hero-cards">
        <CardBack />
        <CardBack />
        <CardBack />
      </div>
    </div>
  );
}
