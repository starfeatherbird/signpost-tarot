import { useEffect } from 'react';
import { setBannerVisible } from '../services/ads';
import { isNativeApp } from '../services/native';
import type { Step } from './session';
import type { Tab } from '../components/BottomNav';

/** 모든 화면에서 배너를 보여 줍니다 (입력 중 숨김은 services/ads.ts 가 처리). 화면별로 뺄 일이 생기면 여기서 조절합니다. */
export function shouldShowAds(_tab: Tab, _step: Step): boolean {
  return true;
}

/**
 * 하단 배너 표시 제어. 광고 제거를 샀으면(adFree, usePurchases 에서 옴) 어디서도 보여 주지 않습니다.
 */
export function useAds(tab: Tab, step: Step, adFree: boolean) {
  const visible = isNativeApp && !adFree && shouldShowAds(tab, step);

  useEffect(() => {
    void setBannerVisible(visible);
  }, [visible]);

  return { adsVisible: visible };
}
