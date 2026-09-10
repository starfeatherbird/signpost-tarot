import { describe, expect, it } from 'vitest';
import { CARDS } from '../data/cards';
import { createShuffledDeck, isValidDeck, shuffle } from './deck';

describe('deck', () => {
  it('카드 데이터는 22장이고 번호·ID가 중복되지 않는다', () => {
    expect(CARDS).toHaveLength(22);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(22);
    expect(new Set(CARDS.map((c) => c.number)).size).toBe(22);
    expect(CARDS.map((c) => c.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });

  it('섞은 덱은 22장 전부를 중복 없이 담는다', () => {
    for (let i = 0; i < 50; i += 1) {
      const deck = createShuffledDeck();
      expect(isValidDeck(deck)).toBe(true);
      expect(new Set(deck).size).toBe(22);
    }
  });

  it('shuffle 은 원본 배열을 바꾸지 않는다', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original, () => 0.1);
    expect(original).toEqual(copy);
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
