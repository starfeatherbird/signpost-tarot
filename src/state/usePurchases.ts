import { useCallback, useEffect, useState } from 'react';
import { PRODUCT_DEEP_READING, PRODUCT_REMOVE_ADS } from '../config/purchases';
import { buyDeepReading, buyRemoveAds, configurePurchases, getCustomerInfo, getPrices, isAdFree, purchasesAvailable, restorePurchases, type PurchaseOutcome } from '../services/purchases';

/**
 * 결제 상태 훅. 로그인 사용자 id 가 바뀌면 RevenueCat 에 같은 id 로 맞추고, 광고 제거 여부·가격을 읽습니다.
 * 결제를 쓸 수 없는 환경(웹, 키 없음)에서는 available=false 이고 나머지는 비어 있습니다.
 */
export function usePurchases(userId: string | null) {
  const [adFree, setAdFree] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!purchasesAvailable) return;
    let active = true;
    (async () => {
      await configurePurchases(userId);
      const [info, priceMap] = await Promise.all([getCustomerInfo(), getPrices()]);
      if (!active) return;
      setAdFree(isAdFree(info));
      setPrices(priceMap);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const purchaseRemoveAds = useCallback(async (): Promise<{ outcome: PurchaseOutcome; message?: string }> => {
    setBusy(true);
    try {
      const r = await buyRemoveAds();
      if (r.outcome === 'purchased') setAdFree(isAdFree(r.info));
      return r;
    } finally {
      setBusy(false);
    }
  }, []);

  const purchaseDeepReading = useCallback(async (): Promise<{ outcome: PurchaseOutcome; message?: string }> => {
    setBusy(true);
    try {
      return await buyDeepReading();
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const info = await restorePurchases();
      const free = isAdFree(info);
      setAdFree(free);
      return free;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    available: purchasesAvailable,
    adFree,
    busy,
    deepPrice: prices[PRODUCT_DEEP_READING] ?? null,
    removeAdsPrice: prices[PRODUCT_REMOVE_ADS] ?? null,
    purchaseRemoveAds,
    purchaseDeepReading,
    restore,
  };
}

export type PurchasesApi = ReturnType<typeof usePurchases>;
