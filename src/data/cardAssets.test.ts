import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
import { getCardArtUrls, getCardTitle, normalizeAssetName } from './cardAssets';

const SOURCE_FILES = [
  'FOOL.png', 'MAGICIAN.png', 'HIGH PRIESTESS.png', 'EMPRESS.png', 'EMPEROR.png', 'HIEROPHANT.png',
  'LOVERS.png', 'CHARIOT.png', 'STRENGTH.png', 'HERMIT.png', 'WHEEL OF FORTUNE.png', 'JUSTICE.png',
  'HANGED MAN.png', 'DEATH.png', 'TEMPERANCE.png', 'DEVIL.png', 'TOWER.png', 'STAR.png', 'MOON.png', 'SUN.png',
];

describe('cardAssets', () => {
  it('원본 파일명이 카드 ID 로 정확히 대응된다', () => {
    const ids = new Set(CARDS.map((c) => c.id));
    for (const file of SOURCE_FILES) {
      expect(ids.has(normalizeAssetName(file)), file).toBe(true);
    }
  });

  it('카드 그림 경로는 ID 기반으로 webp → png 순서이고, image 필드가 있으면 그것만 쓴다', () => {
    expect(getCardArtUrls({ id: 'high-priestess' })).toEqual(['/cards/high-priestess.webp', '/cards/high-priestess.png']);
    expect(getCardArtUrls({ id: 'tower', image: '/custom/tower.webp' })).toEqual(['/custom/tower.webp']);
  });

  it('명판 제목은 The 를 떼고 대문자로 만든다', () => {
    expect(getCardTitle({ nameEn: 'The Tower' })).toBe('TOWER');
    expect(getCardTitle({ nameEn: 'Wheel of Fortune' })).toBe('WHEEL OF FORTUNE');
    expect(getCardTitle({ nameEn: 'Strength' })).toBe('STRENGTH');
  });
});
