import { CARDS } from '../data/cards';

/** Fisher–Yates 셔플. 원본 배열은 바꾸지 않습니다. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 덱을 중복 없이 섞어 카드 ID 순서를 돌려줍니다.
 * 상담 세션이 시작될 때 한 번만 호출하고, 결과는 세션 상태에 보관해
 * 화면이 다시 그려지거나 분석을 재시도해도 순서가 바뀌지 않게 합니다.
 */
export function createShuffledDeck(random: () => number = Math.random): string[] {
  return shuffle(CARDS.map((c) => c.id), random);
}

/** 덱 순서가 유효한지(22장, 중복 없음, 모두 실제 카드) 확인 */
export function isValidDeck(deck: unknown): deck is string[] {
  if (!Array.isArray(deck) || deck.length !== CARDS.length) return false;
  const known = new Set(CARDS.map((c) => c.id));
  const seen = new Set<string>();
  for (const id of deck) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
