import { useEffect, useState } from 'react';
import { AD_FREE_STORAGE_KEY } from '../config/ads';
import { setBannerVisible } from '../services/ads';
import { isNativeApp } from '../services/native';
import type { Step } from './session';
import type { Tab } from '../components/BottomNav';

/** 광고가 나와도 되는 화면: 기록장·내 공간, 상담실의 결과 화면. 입력·카드 장면에서는 뺍니다. */
export function shouldShowAds(tab: Tab, step: Step): boolean {
  if (tab === 'records' || tab === 'space') return true;
  return tab === 'counsel' && (step === 'result' || step === 'deepResult');
}

function readAdFree(): boolean {
  try {
    return window.localStorage.getItem(AD_FREE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 하단 배너 표시 제어. 광고 제거를 샀으면(adFree) 어디서도 보여 주지 않습니다.
 * adFree 는 3단계(결제)에서 스토어 구매 상태로 바뀔 예정이며, 지금은 기기 저장값만 읽습니다.
 */
export function useAds(tab: Tab, step: Step) {
  const [adFree, setAdFree] = useState(readAdFree);
  const visible = isNativeApp && !adFree && shouldShowAds(tab, step);

  useEffect(() => {
    void setBannerVisible(visible);
  }, [visible]);

  return { adFree, setAdFree, adsVisible: visible };
}
