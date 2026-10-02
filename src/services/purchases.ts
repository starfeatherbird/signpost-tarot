import { LOG_LEVEL, PRODUCT_CATEGORY, Purchases, PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { ENTITLEMENT_AD_FREE, PRODUCT_DEEP_READING, PRODUCT_REMOVE_ADS, REVENUECAT_ANDROID_KEY } from '../config/purchases';
import { isNativeApp } from './native';

/**
 * 인앱 결제 (RevenueCat). 네이티브 앱 + SDK 키가 있을 때만 동작합니다.
 * - 사용자 id 는 Supabase 로그인 id 를 씁니다(서버가 같은 id 로 구매를 확인). 로그아웃하면 익명 id 로 돌아갑니다.
 * - 광고 제거: entitlement `ad_free` 가 활성이면 true.
 * - 심층 상담 1회: 소모성 상품. 구매 사실은 서버가 RevenueCat 에서 확인하고 상담 1건에 1회를 묶습니다.
 */
export const purchasesAvailable = isNativeApp && REVENUECAT_ANDROID_KEY.length > 0;

let configuredFor: string | null | undefined; // undefined = 아직 configure 안 함

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'error';

export async function configurePurchases(userId: string | null): Promise<void> {
  if (!purchasesAvailable) return;
  try {
    if (configuredFor === undefined) {
      await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: userId ?? undefined });
      configuredFor = userId;
      return;
    }
    if (configuredFor === userId) return;
    if (userId) await Purchases.logIn({ appUserID: userId });
    else await Purchases.logOut();
    configuredFor = userId;
  } catch (err) {
    console.warn('[purchases] configure failed', err);
  }
}

export function isAdFree(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_AD_FREE];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!purchasesAvailable) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch {
    return null;
  }
}

/** 두 상품의 스토어 가격 문구. 못 받으면 빈 객체. */
export async function getPrices(): Promise<Partial<Record<string, string>>> {
  if (!purchasesAvailable) return {};
  try {
    const { products } = await Purchases.getProducts({ productIdentifiers: [PRODUCT_DEEP_READING, PRODUCT_REMOVE_ADS], type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
    return Object.fromEntries(products.map((p: PurchasesStoreProduct) => [p.identifier, p.priceString]));
  } catch (err) {
    console.warn('[purchases] getProducts failed', err);
    return {};
  }
}

async function buy(productId: string): Promise<{ outcome: PurchaseOutcome; info?: CustomerInfo; message?: string }> {
  if (!purchasesAvailable) return { outcome: 'error', message: '이 환경에서는 결제를 사용할 수 없어요.' };
  try {
    const { products } = await Purchases.getProducts({ productIdentifiers: [productId], type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
    const product = products[0];
    if (!product) return { outcome: 'error', message: '스토어에서 상품을 찾지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
    return { outcome: 'purchased', info: customerInfo };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { outcome: 'cancelled' };
    console.warn('[purchases] purchase failed', err);
    return { outcome: 'error', message: '결제를 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
  }
}

export const buyDeepReading = () => buy(PRODUCT_DEEP_READING);
export const buyRemoveAds = () => buy(PRODUCT_REMOVE_ADS);

/** 기기를 바꿨을 때 이전 구매(광고 제거) 되살리기 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!purchasesAvailable) return null;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (err) {
    console.warn('[purchases] restore failed', err);
    return null;
  }
}
