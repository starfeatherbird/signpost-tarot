import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import type { AnalysisInput, DeepAnalysisInput } from '../../domain/types';
import { buildDeepSampleReading, buildSampleFollowUp, buildSampleReading, createMockAnalysisService } from './mockAnalysisService';

const input: AnalysisInput = {
  concern: '새로운 일을 시작하고 싶은데 망설여져요.',
  answers: [
    { questionId: 'priority', questionText: 'q1', value: '성장·기회' },
    { questionId: 'constraint', questionText: 'q2', value: null },
  ],
  cards: [
    { cardId: 'moon', positionId: 'core' },
    { cardId: 'star', positionId: 'blindspot' },
    { cardId: 'fool', positionId: 'next' },
  ],
};

const deepInput: DeepAnalysisInput = {
  ...input,
  deepAnswers: [
    { questionId: 'options', questionText: 'o', value: '남기 / 이직하기', values: ['지금 회사에 남기', '이직 준비하기'] },
    { questionId: 'criteria', questionText: 'c', value: '장기적인 만족' },
    { questionId: 'constraints', questionText: 'k', value: '기한이 정해져 있어요' },
  ],
};

function allText(obj: unknown): string {
  return JSON.stringify(obj);
}

function expectOnlySelectedCards(text: string) {
  expect(text).toContain('달');
  expect(text).toContain('별');
  expect(text).toContain('바보');
  const notSelected = CARDS.filter((c) => !['moon', 'star', 'fool'].includes(c.id));
  for (const card of notSelected) {
    expect(text).not.toContain(`「${card.nameKo}」`);
  }
}

describe('mockAnalysisService — 기본', () => {
  it('선택한 카드 이름만 결과에 등장한다', () => {
    expectOnlySelectedCards(allText(buildSampleReading(input)));
  });

  it('구조화된 예시 결과를 돌려준다', () => {
    const result = buildSampleReading(input);
    expect(result.isSample).toBe(true);
    expect(result.priority.length).toBeGreaterThan(10);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.perspectives.map((p) => p.positionId)).toEqual(['core', 'blindspot', 'next']);
    expect(result.notes.some((n) => n.includes('예시'))).toBe(true);
  });

  it('선택지 답변은 문장에 반영되고, 보충 내용은 접수 안내만 추가된다', () => {
    const result = buildSampleReading({ ...input, supplement: '이번 달 안에 결정해야 해요.' });
    expect(result.priority).toContain('성장·기회');
    expect(result.notes.some((n) => n.includes('보충'))).toBe(true);
    expect(allText(result)).not.toContain('이번 달 안에');
  });

  it('역방향 카드는 역방향 의미와 (역방향) 표시를 쓴다', () => {
    const result = buildSampleReading({ ...input, cards: [{ cardId: 'moon', positionId: 'core', reversed: true }, input.cards[1], input.cards[2]] });
    expect(result.reasons[0]).toContain('「달(역방향)」');
    expect(result.perspectives[0].text).toContain('역방향');
    expect(result.perspectives[0].text).toContain('착각');
    expect(result.perspectives[1].text).not.toContain('역방향');
  });

  it('세 자리가 모두 없으면 실패한다', () => {
    expect(() => buildSampleReading({ ...input, cards: input.cards.slice(0, 2) })).toThrow();
  });
});

describe('mockAnalysisService — 심층', () => {
  it('기본 결과에 비교·조건·실행 순서·장애물이 추가되고, 선택한 카드만 등장한다', () => {
    const result = buildDeepSampleReading(deepInput);
    expect(result.kind).toBe('deep');
    expect(result.isSample).toBe(true);
    expect(result.priority.length).toBeGreaterThan(10);
    expect(result.comparisons.map((c) => c.option)).toEqual(['지금 회사에 남기', '이직 준비하기']);
    for (const c of result.comparisons) {
      expect(c.benefits.length).toBeGreaterThan(0);
      expect(c.burdens.length).toBeGreaterThan(0);
    }
    expect(result.fitConditions.length).toBeGreaterThan(0);
    expect(result.executionSteps.length).toBeGreaterThanOrEqual(3);
    expect(result.obstacles.length).toBeGreaterThan(0);
    expect(result.criteriaSummary).toContain('장기적인 만족');
    expect(result.criteriaSummary).toContain('기한이 정해져 있어요');
    expect(result.notes.some((n) => n.includes('예시'))).toBe(true);
    expectOnlySelectedCards(allText(result));
  });

  it('선택지를 적지 않았으면 카드가 가리키는 두 방향으로 비교한다', () => {
    const result = buildDeepSampleReading({ ...input, deepAnswers: [] });
    expect(result.comparisons).toHaveLength(2);
    expect(allText(result.comparisons)).toContain('바보');
  });

  it('추가 질문은 접수 사실과 예시임을 밝히고 질문 내용을 분석한 척하지 않는다', () => {
    const deepResult = buildDeepSampleReading(deepInput);
    const reply = buildSampleFollowUp({ ...deepInput, deepResult, question: '첫 단계를 이번 주에 못 하면요?' });
    expect(reply.isSample).toBe(true);
    expect(reply.answer).toContain('예시');
    expect(reply.answer).not.toContain('이번 주에 못 하면');
  });

  it('비동기 인터페이스 세 가지가 모두 동작하고 실패 확률을 흉내 낼 수 있다', async () => {
    const ok = createMockAnalysisService({ delayMs: 0, failureRate: 0 });
    await expect(ok.analyze(input)).resolves.toMatchObject({ isSample: true });
    await expect(ok.analyzeDeep(deepInput)).resolves.toMatchObject({ kind: 'deep', isSample: true });
    const deepResult = await ok.analyzeDeep(deepInput);
    await expect(ok.askFollowUp({ ...deepInput, deepResult, question: 'q' })).resolves.toMatchObject({ isSample: true });
    const failing = createMockAnalysisService({ delayMs: 0, failureRate: 1 });
    await expect(failing.analyzeDeep(deepInput)).rejects.toThrow();
  });
});
