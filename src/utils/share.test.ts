import { describe, expect, it } from 'vitest';
import type { DeepReadingResult, DrawnCard, ReadingResult } from '../domain/types';
import { buildShareText } from './share';

const cards: DrawnCard[] = [
  { cardId: 'tower', positionId: 'core' },
  { cardId: 'lovers', positionId: 'blindspot', reversed: true },
  { cardId: 'world', positionId: 'next' },
];
const basic: ReadingResult = {
  priority: '먼저 이쪽', reasons: ['이유1'], alternatives: ['대안1'], actions: ['행동1', '행동2'], perspectives: [], isSample: false, notes: [], generatedAt: 'x',
};

describe('결과 공유 텍스트', () => {
  it('고민·카드(역방향 표시)·5개 항목이 순서대로 들어간다', () => {
    const t = buildShareText({ plan: 'basic', concern: '고민이에요', cards, result: basic });
    expect(t).toContain('[이정표 · 무료 기본 상담]');
    expect(t).toContain('고민: 고민이에요');
    expect(t).toContain('현재의 핵심: 탑 · 놓치고 있는 관점: 연인(역방향) · 다음 움직임: 세계');
    expect(t.indexOf('먼저 제안드리는 방향')).toBeLessThan(t.indexOf('이렇게 제안하는 이유'));
    expect(t).toContain('☐ 행동1');
    expect(t).not.toContain('선택지 비교');
    expect(t).not.toContain('상징 스톤');
    expect(t).toContain('최종 선택은 스스로');
  });

  it('스톤과 돌아볼 질문이 있으면 마지막에 붙는다', () => {
    const t = buildShareText({ plan: 'basic', concern: '고민', cards, result: { ...basic, stone: { stoneId: 'moonstone', promise: '이 돌을 볼 때 단정하지 않기로 해요.' }, reflectionQuestion: '그 사이 확인된 사실이 있었나요?' } });
    expect(t).toContain('■ 상징 스톤: 문스톤 (단정하지 않기)');
    expect(t).toContain('이 돌을 볼 때 단정하지 않기로 해요.');
    expect(t.indexOf('■ 며칠 뒤 돌아볼 질문')).toBeGreaterThan(t.indexOf('■ 상징 스톤'));
  });

  it('심층 결과는 비교·실행 순서·장애물까지 붙는다', () => {
    const deep: DeepReadingResult = {
      ...basic, kind: 'deep', criteriaSummary: 'c', recommendedOption: 'A',
      comparisons: [{ option: 'A', benefits: ['좋음'], burdens: ['부담'] }, { option: 'B', benefits: ['b'], burdens: ['c'] }],
      fitConditions: ['f'], executionSteps: ['먼저: 하나', '다음: 둘'], obstacles: [{ obstacle: '벽', response: '넘기' }],
    };
    const t = buildShareText({ plan: 'deep', concern: 'x', cards, result: deep });
    expect(t).toContain('유료 심층 상담');
    expect(t).toContain('선택지 비교 (우선: A)');
    expect(t).toContain('  + 좋음');
    expect(t).toContain('1. 먼저: 하나');
    expect(t).toContain('- 벽 → 넘기');
  });

  it('예시 결과는 예시라고 밝힌다', () => {
    const t = buildShareText({ plan: 'basic', concern: 'x', cards, result: { ...basic, isSample: true } });
    expect(t).toContain('시제품 예시 결과');
  });
});
