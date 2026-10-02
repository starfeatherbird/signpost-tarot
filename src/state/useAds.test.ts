import { describe, expect, it } from 'vitest';
import { shouldShowAds } from './useAds';

describe('광고 표시 화면', () => {
  it('모든 탭·단계에서 보인다 (광고 제거 구매 시에는 useAds 가 끔)', () => {
    for (const step of ['plan', 'input', 'questions', 'cards', 'analyzing', 'result', 'deepResult'] as const) {
      expect(shouldShowAds('counsel', step)).toBe(true);
    }
    expect(shouldShowAds('records', 'plan')).toBe(true);
    expect(shouldShowAds('space', 'plan')).toBe(true);
  });
});
