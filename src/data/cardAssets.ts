import type { TarotCard } from '../domain/types';

/**
 * 카드 이미지 자산 규칙.
 *
 * scripts/sync-cards.mjs 가 app/card_asset/ 의 PNG 를 폭 810px WebP 로 줄여 public/cards/ 에 넣으면서
 * 파일명을 "소문자 + 공백→하이픈" 으로 바꿉니다. 카드 ID 와 같은 규칙이라
 * 카드 데이터에 경로를 일일이 적지 않아도 자동으로 연결됩니다.
 *   TOWER.png → /cards/tower.webp,  HIGH PRIESTESS.png → /cards/high-priestess.webp
 * 축소 도구(sharp)를 쓸 수 없을 때는 .png 그대로 복사되므로, 화면은 .webp → .png 순서로 찾습니다.
 */
/** 배포 경로(BASE_URL, 예: '/signpost-tarot/')를 앞에 붙여 하위 경로 배포에서도 이미지를 찾습니다. */
export const CARD_ASSET_DIR = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cards`;
const EXTENSIONS = ['webp', 'png'] as const;

const candidates = (name: string) => EXTENSIONS.map((ext) => `${CARD_ASSET_DIR}/${name}.${ext}`);

/** 틀(FRONT) 이미지 후보. 앞에서부터 시도합니다. */
export const FRAME_IMAGES: readonly string[] = candidates('front');
/** 뒷면(BACK) 이미지 후보 */
export const BACK_IMAGES: readonly string[] = candidates('back');

/** 카드 그림 경로 후보. 카드 데이터에 image 가 직접 적혀 있으면 그 값만 사용합니다. */
export function getCardArtUrls(card: Pick<TarotCard, 'id' | 'image'>): readonly string[] {
  return card.image ? [card.image] : candidates(card.id);
}

/** 원본 파일명을 카드 ID 규칙으로 바꿉니다. (sync-cards.mjs 의 baseName 과 동일) */
export function normalizeAssetName(fileName: string): string {
  return fileName.replace(/\.png$/i, '').trim().toLowerCase().replace(/\s+/g, '-');
}

/** 명판에 쓸 영문 제목: "The Tower" → "TOWER" */
export function getCardTitle(card: Pick<TarotCard, 'nameEn'>): string {
  return card.nameEn.replace(/^the\s+/i, '').toUpperCase();
}

/**
 * FRONT.png(805×1293) 기준 배치. 값은 카드 크기 대비 비율(%)입니다.
 * - 그림 영역: 712×1072, 틀의 투명 구멍(x 57~743, y 56~1106) 중앙에 맞춤. 가장자리는 틀이 덮습니다.
 * - 명판: y 1109~1281 → 글자 중심 y 1195
 * - 글자 크기: 44pt = 58.67px → 카드 너비의 7.29%
 */
export const FRAME_LAYOUT = {
  width: 805,
  height: 1293,
  art: { left: 46.5, top: 45, width: 712, height: 1072 },
  titleCenterY: 1195,
  titleFontPx: 58.67,
} as const;

export function frameCssVars(): Record<string, string> {
  const { width, height, art, titleCenterY, titleFontPx } = FRAME_LAYOUT;
  const pct = (v: number, base: number) => `${((v / base) * 100).toFixed(3)}%`;
  return {
    '--art-left': pct(art.left, width),
    '--art-top': pct(art.top, height),
    '--art-width': pct(art.width, width),
    '--art-height': pct(art.height, height),
    '--title-center': pct(titleCenterY, height),
    '--title-size': `${((titleFontPx / width) * 100).toFixed(3)}cqw`,
  };
}
