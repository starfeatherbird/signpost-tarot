import { describe, expect, it } from 'vitest';
import { buildUserMessage, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt.ts';
import { BASIC_SCHEMA, DEEP_SCHEMA, toGeminiSchema } from './schema.ts';
import type { DrawnCard, Provenance } from './types.ts';
import { assertCards, normalizeBasic, normalizeDeep, normalizeFollowUp } from './validate.ts';

const cards: DrawnCard[] = [
  { cardId: 'tower', positionId: 'core' },
  { cardId: 'lovers', positionId: 'blindspot' },
  { cardId: 'world', positionId: 'next' },
];
const source: Provenance = { provider: 'anthropic', model: 'test-model', promptVersion: PROMPT_VERSION };

const basicJson = {
  priority: '먼저 이쪽을 제안드려요.',
  reasons: ['이유 1', '이유 2'],
  alternatives: ['대안 조건'],
  actions: ['오늘 할 일'],
  perspectives: [
    { positionId: 'core', text: '핵심 관점' },
    { positionId: 'next', text: '다음 관점' },
  ],
  notes: [],
};

describe('prompt', () => {
  it('시스템 프롬프트에 상담 태도 규칙이 들어 있다', () => {
    expect(SYSTEM_PROMPT).toContain('존댓말');
    expect(SYSTEM_PROMPT).toContain('단정하지 않습니다');
    expect(SYSTEM_PROMPT).toContain('세 장만');
  });

  it('사용자 메시지에 고민·카드 의미·답변·보충 내용이 들어간다', () => {
    const msg = buildUserMessage({
      kind: 'basic',
      input: {
        concern: '이직할지 고민이에요',
        answers: [{ questionId: 'priority', questionText: '지키고 싶은 것', value: '안정' }],
        cards,
        supplement: '이번 달 안에 결정해야 해요',
      },
    });
    expect(msg).toContain('이직할지 고민이에요');
    expect(msg).toContain('「탑」');
    expect(msg).toContain('「연인」');
    expect(msg).toContain('「세계」');
    expect(msg).toContain('지키고 싶은 것 → 안정');
    expect(msg).toContain('이번 달 안에 결정해야 해요');
    expect(msg).toContain('positionId: core');
  });

  it('심층·추가 질문 메시지는 각각 심층 답변과 질문을 담는다', () => {
    const deep = buildUserMessage({
      kind: 'deep',
      input: { concern: 'c', answers: [], cards, deepAnswers: [{ questionId: 'options', questionText: '선택지', value: null, values: ['남기', '이직'] }] },
    });
    expect(deep).toContain('남기 / 이직');
    expect(deep).toContain('comparisons');
    const followUp = buildUserMessage({
      kind: 'followUp',
      input: {
        concern: 'c', answers: [], cards, deepAnswers: [],
        deepResult: { ...basicJson, perspectives: [], kind: 'deep', isSample: false, generatedAt: 'x', criteriaSummary: '기준', comparisons: [], fitConditions: [], executionSteps: ['먼저', '다음'], obstacles: [{ obstacle: '장애', response: '대응' }] },
        question: '첫 단계가 어렵다면요?',
      },
    });
    expect(followUp).toContain('첫 단계가 어렵다면요?');
    expect(followUp).toContain('먼저 → 다음');
  });
});

describe('schema', () => {
  it('Anthropic 스키마는 모든 객체에 additionalProperties:false 와 required 가 있다', () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'object') {
        expect(n.additionalProperties).toBe(false);
        expect(Array.isArray(n.required)).toBe(true);
      }
      Object.values(n).forEach(walk);
    };
    walk(BASIC_SCHEMA);
    walk(DEEP_SCHEMA);
  });

  it('Gemini 스키마에는 additionalProperties 가 없다', () => {
    expect(JSON.stringify(toGeminiSchema(DEEP_SCHEMA))).not.toContain('additionalProperties');
  });
});

describe('validate', () => {
  it('기본 결과를 정규화하고 빠진 자리의 관점은 카드 의미로 채운다', () => {
    const result = normalizeBasic(JSON.stringify(basicJson), cards, source, '2026-09-10T00:00:00.000Z');
    expect(result.isSample).toBe(false);
    expect(result.source).toEqual(source);
    expect(result.perspectives.map((p) => p.positionId)).toEqual(['core', 'blindspot', 'next']);
    expect(result.perspectives[0].cardId).toBe('tower');
    expect(result.perspectives[1].text.length).toBeGreaterThan(10); // lovers 기본 의미로 채움
    expect(result.stone).toBeUndefined(); // 스톤·질문은 없어도 결과를 버리지 않음
    expect(result.reflectionQuestion).toBeUndefined();
  });

  it('스톤은 목록에 있는 id 만 받고, 돌아볼 질문은 그대로 담는다', () => {
    const ok = normalizeBasic(JSON.stringify({ ...basicJson, stone: { stoneId: 'moonstone', promise: '이 돌을 볼 때 단정하지 않기로 해요.' }, reflectionQuestion: '그 사이 확인된 사실이 있었나요?' }), cards, source);
    expect(ok.stone).toEqual({ stoneId: 'moonstone', promise: '이 돌을 볼 때 단정하지 않기로 해요.' });
    expect(ok.reflectionQuestion).toBe('그 사이 확인된 사실이 있었나요?');
    const unknown = normalizeBasic(JSON.stringify({ ...basicJson, stone: { stoneId: 'diamond', promise: 'x' } }), cards, source);
    expect(unknown.stone).toBeUndefined();
  });

  it('스키마와 프롬프트에 스톤 목록이 들어 있다', () => {
    expect(JSON.stringify(BASIC_SCHEMA)).toContain('"moonstone"');
    expect(JSON.stringify(DEEP_SCHEMA)).toContain('reflectionQuestion');
    const msg = buildUserMessage({ kind: 'basic', input: { concern: '고민', answers: [], cards } });
    expect(msg).toContain('[상징 스톤 목록]');
    expect(msg).toContain('moonstone: 문스톤');
    const followUp = buildUserMessage({ kind: 'followUp', input: { concern: '고민', answers: [], deepAnswers: [], cards, question: 'q', deepResult: { priority: 'p', reasons: [], alternatives: [], actions: [], perspectives: [], isSample: false, notes: [], generatedAt: 'x', kind: 'deep', criteriaSummary: 'c', comparisons: [], fitConditions: [], executionSteps: [], obstacles: [] } } });
    expect(followUp).not.toContain('[상징 스톤 목록]');
  });

  it('코드 블록으로 감싼 JSON 도 읽는다', () => {
    const wrapped = '```json\n' + JSON.stringify(basicJson) + '\n```';
    expect(normalizeBasic(wrapped, cards, source).priority).toBe('먼저 이쪽을 제안드려요.');
  });

  it('필수 항목이 없으면 output 오류로 다음 후보에 넘긴다', () => {
    expect(() => normalizeBasic(JSON.stringify({ ...basicJson, priority: '' }), cards, source)).toThrow('priority');
    expect(() => normalizeBasic('not json', cards, source)).toThrow('JSON');
  });

  it('심층 결과는 비교 2개 이상·장애물 1개 이상을 요구한다', () => {
    const deep = {
      ...basicJson,
      criteriaSummary: '기준 요약',
      comparisons: [
        { option: 'A', benefits: ['b1'], burdens: ['c1'] },
        { option: 'B', benefits: ['b2'], burdens: ['c2'] },
      ],
      fitConditions: ['f'],
      executionSteps: ['먼저', '다음', '그다음'],
      obstacles: [{ obstacle: 'o', response: 'r' }],
    };
    const result = normalizeDeep(JSON.stringify(deep), cards, source);
    expect(result.kind).toBe('deep');
    expect(result.comparisons).toHaveLength(2);
    expect(() => normalizeDeep(JSON.stringify({ ...deep, comparisons: deep.comparisons.slice(0, 1) }), cards, source)).toThrow('2개');
  });

  it('추가 질문 응답과 카드 검증', () => {
    expect(normalizeFollowUp(JSON.stringify({ answer: '답' }), source)).toMatchObject({ answer: '답', isSample: false });
    expect(assertCards(cards)).toEqual(cards.map((c) => ({ ...c, reversed: false })));
    expect(assertCards([{ ...cards[0], reversed: true }, cards[1], cards[2]])[0].reversed).toBe(true);
    expect(() => assertCards(cards.slice(0, 2))).toThrow('3장');
    expect(() => assertCards([...cards.slice(0, 2), { cardId: 'nope', positionId: 'next' }])).toThrow('next');
  });
});
