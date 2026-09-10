import { BACK_IMAGES } from '../data/cardAssets';
import { useImageFallback } from './useImageFallback';

/**
 * 카드 뒷면. public/cards/back.webp (원본 BACK.png 를 sync-cards 가 변환) 를 쓰고,
 * 없거나 로드에 실패하면 시안의 자리표시자(surface-strong + 대각 줄무늬)를 그립니다.
 */
export function CardBack() {
  const back = useImageFallback(BACK_IMAGES);

  return (
    <div className="card-face-wrap" aria-hidden="true">
      {back.src ? (
        <img src={back.src} alt="" onError={back.onError} />
      ) : (
        <div className="card-back-placeholder" />
      )}
    </div>
  );
}
