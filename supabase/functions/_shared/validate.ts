import { ProviderError } from './registry.ts';
import { getCardData, getStoneData } from './prompt.ts';
import type {
  DeepReadingResult,
  DrawnCard,
  FollowUpAnswer,
  PositionId,
  Provenance,
  ReadingResult,
  StonePick,
} from './types.ts';

/**
 * 모델이 돌려준 JSON 을 앱이 기대하는 형식으로 다듬습니다.
 * 형식이 크게 어긋나면 ProviderError('output') 을 던져 다음 후보로 넘어가게 합니다.
 */

const POSITIONS: PositionId[] = ['core', 'blindspot', 'next'];
const MAX_TEXT = 2000;

function text(value: unknown, field: string, required = true): string {
  if (typeof value !== 'string' || !value.trim()) {
    if (required) throw new ProviderError(`응답에 ${field} 가 없어요.`, 'output');
    return '';
  }
  return value.trim().slice(0, MAX_TEXT);
}

function list(value: unknown, field: string, min = 1, max = 8): string[] {
  const items = Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v.trim()).map((v) => (v as string).trim().slice(0, MAX_TEXT)) : [];
  if (items.length < min) throw new ProviderError(`응답의 ${field} 항목이 부족해요.`, 'output');
  return items.slice(0, max);
}

function parseJson(raw: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    // 코드 블록으로 감싼 경우를 한 번 더 시도
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new ProviderError('응답이 JSON 형식이 아니에요.', 'output');
    try {
      value = JSON.parse(match[0]);
    } catch {
      throw new ProviderError('응답이 JSON 형식이 아니에요.', 'output');
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProviderError('응답이 객체 형식이 아니에요.', 'output');
  }
  return value as Record<string, unknown>;
}

function perspectives(value: unknown, cards: DrawnCard[]) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  return cards.map((drawn) => {
    const found = items.find((p) => p && p.positionId === drawn.positionId);
    let body = typeof found?.text === 'string' ? found.text.trim().slice(0, MAX_TEXT) : '';
    if (!body) {
      // 빠진 자리는 카드 기본 의미로 채워 화면이 비지 않게 합니다.
      const card = getCardData(drawn.cardId);
      body = card ? `${card.essence} ${card.perspectives[drawn.positionId]}` : '';
    }
    return { cardId: drawn.cardId, positionId: drawn.positionId, text: body };
  });
}

/** 스톤은 있으면 좋고 없어도 결과를 버리지 않습니다 (목록에 없는 id 면 제외). */
function stone(value: unknown): StonePick | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const stoneId = typeof raw.stoneId === 'string' ? raw.stoneId.trim() : '';
  const promise = text(raw.promise, 'stone.promise', false);
  if (!getStoneData(stoneId) || !promise) return undefined;
  return { stoneId, promise };
}

function base(raw: Record<string, unknown>, cards: DrawnCard[], source: Provenance, generatedAt: string): ReadingResult {
  const reflectionQuestion = text(raw.reflectionQuestion, 'reflectionQuestion', false);
  return {
    priority: text(raw.priority, 'priority'),
    reasons: list(raw.reasons, 'reasons'),
    alternatives: list(raw.alternatives, 'alternatives'),
    actions: list(raw.actions, 'actions'),
    perspectives: perspectives(raw.perspectives, cards),
    notes: list(raw.notes, 'notes', 0, 5),
    isSample: false,
    generatedAt,
    source,
    stone: stone(raw.stone),
    reflectionQuestion: reflectionQuestion || undefined,
  };
}

export function normalizeBasic(rawText: string, cards: DrawnCard[], source: Provenance, generatedAt = new Date().toISOString()): ReadingResult {
  return base(parseJson(rawText), cards, source, generatedAt);
}

export function normalizeDeep(rawText: string, cards: DrawnCard[], source: Provenance, generatedAt = new Date().toISOString()): DeepReadingResult {
  const raw = parseJson(rawText);
  const comparisonsRaw = Array.isArray(raw.comparisons) ? (raw.comparisons as Record<string, unknown>[]) : [];
  const comparisons = comparisonsRaw
    .filter((c) => c && typeof c.option === 'string')
    .map((c) => ({
      option: text(c.option, 'comparisons.option'),
      benefits: list(c.benefits, 'comparisons.benefits', 1, 5),
      burdens: list(c.burdens, 'comparisons.burdens', 1, 5),
    }));
  if (comparisons.length < 2) throw new ProviderError('선택지 비교가 2개 미만이에요.', 'output');

  const obstaclesRaw = Array.isArray(raw.obstacles) ? (raw.obstacles as Record<string, unknown>[]) : [];
  const obstacles = obstaclesRaw
    .filter((o) => o && typeof o.obstacle === 'string' && typeof o.response === 'string')
    .map((o) => ({ obstacle: text(o.obstacle, 'obstacles.obstacle'), response: text(o.response, 'obstacles.response') }));
  if (obstacles.length < 1) throw new ProviderError('장애물 항목이 없어요.', 'output');

  return {
    ...base(raw, cards, source, generatedAt),
    kind: 'deep',
    criteriaSummary: text(raw.criteriaSummary, 'criteriaSummary'),
    recommendedOption: pickRecommended(raw.recommendedOption, comparisons.map((c) => c.option)),
    comparisons: comparisons.slice(0, 3),
    fitConditions: list(raw.fitConditions, 'fitConditions', 1, 5),
    executionSteps: list(raw.executionSteps, 'executionSteps', 2, 6),
    obstacles: obstacles.slice(0, 3),
  };
}

/** 모델이 적은 우선 선택지 이름을 비교 목록의 이름과 맞춥니다 (없으면 첫 번째). */
function pickRecommended(value: unknown, options: string[]): string {
  const wanted = typeof value === 'string' ? value.trim() : '';
  const exact = options.find((o) => o === wanted);
  if (exact) return exact;
  const loose = options.find((o) => wanted && (o.includes(wanted) || wanted.includes(o)));
  return loose ?? options[0] ?? '';
}

export function normalizeFollowUp(rawText: string, source: Provenance): FollowUpAnswer {
  const raw = parseJson(rawText);
  return { answer: text(raw.answer, 'answer'), isSample: false, source };
}

/** 요청에 담긴 카드가 세 자리를 모두 채우는지 확인 */
export function assertCards(cards: unknown): DrawnCard[] {
  if (!Array.isArray(cards) || cards.length !== 3) throw new ProviderError('카드 3장이 필요해요.', 'bad_request', 400);
  const drawn = cards as DrawnCard[];
  for (const p of POSITIONS) {
    const found = drawn.find((c) => c && c.positionId === p && typeof c.cardId === 'string' && getCardData(c.cardId));
    if (!found) throw new ProviderError(`'${p}' 자리의 카드가 없거나 알 수 없는 카드예요.`, 'bad_request', 400);
  }
  return drawn.map((c) => ({ cardId: c.cardId, positionId: c.positionId, reversed: c.reversed === true }));
}
