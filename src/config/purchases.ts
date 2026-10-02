/**
 * Play 인앱 결제 설정 (RevenueCat 경유, 안드로이드 앱에서만).
 * - REVENUECAT_ANDROID_KEY: RevenueCat 프로젝트의 Google Play 공개 SDK 키(goog_…). 공개돼도 되는 값입니다.
 *   비어 있으면 결제 기능이 꺼지고(웹과 같이) 심층 상담은 서버 설정에 따라 무료로 열립니다.
 * - 상품 ID 는 Play Console 인앱 상품과 글자까지 같아야 합니다.
 * - 광고 제거는 RevenueCat 의 entitlement(ad_free)로 판단합니다.
 * 서버 쪽 검증(심층 1회 차감)은 supabase/functions/_shared/purchases.ts 가 RevenueCat 비밀 키로 합니다.
 */
export const REVENUECAT_ANDROID_KEY = '';

export const PRODUCT_DEEP_READING = 'deep_reading_1';
export const PRODUCT_REMOVE_ADS = 'remove_ads';
export const ENTITLEMENT_AD_FREE = 'ad_free';
