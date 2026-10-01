import { describe, expect, it } from 'vitest';
import { shouldShowAds } from './useAds';

describe('광고 표시 화면', () => {
  it('기록장·내 공간과 상담 결과 화면에서만 보인다', () => {
    expect(shouldShowAds('records', 'plan')).toBe(true);
    expect(shouldShowAds('space', 'cards')).toBe(true);
    expect(shouldShowAds('counsel', 'result')).toBe(true);
    expect(shouldShowAds('counsel', 'deepResult')).toBe(true);
  });

  it('상담 진행 화면(입력·질문·카드·분석)에서는 보이지 않는다', () => {
    for (const step of ['plan', 'deepIntro', 'input', 'questions', 'deepQuestions', 'cards', 'analyzing'] as const) {
      expect(shouldShowAds('counsel', step)).toBe(false);
    }
  });
});
