import { describe, expect, it } from 'vitest';
import { CARDS } from '../data/cards';
import { createShuffledDeck, drawReversed, isValidDeck, shuffle } from './deck';

describe('deck', () => {
  it('카드 데이터는 78장(메이저 22 + 마이너 56)이고 번호·ID가 중복되지 않는다', () => {
    expect(CARDS).toHaveLength(78);
    expect(CARDS.filter((c) => c.arcana === 'major')).toHaveLength(22);
    expect(CARDS.filter((c) => c.arcana === 'minor')).toHaveLength(56);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(78);
    expect(CARDS.map((c) => c.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 78 }, (_, i) => i));
    // 마이너: 수트당 14장, 순서 1~14, id 는 그림 파일명 규칙
    for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) {
      const suitCards = CARDS.filter((c) => c.suit === suit);
      expect(suitCards.map((c) => c.rank)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
      expect(suitCards.every((c) => c.id.endsWith(`-of-${suit}`))).toBe(true);
    }
    expect(CARDS.find((c) => c.id === 'knight-of-swords')?.nameKo).toBe('소드 나이트');
  });

  it('섞은 덱은 78장 전부를 중복 없이 담고, 예전 22장 덱도 유효하다', () => {
    for (let i = 0; i < 50; i += 1) {
      const deck = createShuffledDeck();
      expect(isValidDeck(deck)).toBe(true);
      expect(new Set(deck).size).toBe(78);
    }
    const oldDeck = CARDS.filter((c) => c.arcana === 'major').map((c) => c.id);
    expect(isValidDeck(oldDeck)).toBe(true);
    expect(isValidDeck(['fool', 'fool', 'sun'])).toBe(false);
    expect(isValidDeck(['fool', 'nope', 'sun'])).toBe(false);
  });

  it('shuffle 은 원본 배열을 바꾸지 않는다', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original, () => 0.1);
    expect(original).toEqual(copy);
  });

  it('역방향 추첨은 확률을 따르고 덱에 있는 카드만 고른다', () => {
    const deck = createShuffledDeck();
    expect(drawReversed(deck, 0, () => 0.5)).toEqual([]);
    expect(drawReversed(deck, 1, () => 0.5)).toEqual(deck);
    let i = 0;
    const half = drawReversed(deck, 0.5, () => (i++ % 2 === 0 ? 0.1 : 0.9));
    expect(half).toHaveLength(deck.length / 2);
    expect(half.every((id) => deck.includes(id))).toBe(true);
  });

  it('손상된 덱을 거부한다', () => {
    expect(isValidDeck(null)).toBe(false);
    expect(isValidDeck(['fool'])).toBe(false);
    const dup = createShuffledDeck();
    dup[1] = dup[0];
    expect(isValidDeck(dup)).toBe(false);
    const unknown = createShuffledDeck();
    unknown[0] = 'not-a-card';
    expect(isValidDeck(unknown)).toBe(false);
  });
});
