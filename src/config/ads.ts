/**
 * AdMob 설정 (안드로이드 앱에서만 쓰임, 웹에는 광고 없음).
 * 실제 AdMob ID 입니다(2026-10-02). 테스트 광고로 돌리려면 Google 테스트 ID(ca-app-pub-3940256099942544~3347511713 / /6300978111)로 바꾸고
 * android/app/src/main/res/values/strings.xml 의 admob_app_id 를 함께 바꾸고 AD_TESTING 을 false 로 둡니다.
 * 광고 단위 ID 는 공개돼도 되는 값입니다.
 */
export const ADMOB_APP_ID = 'ca-app-pub-9884079525920738~5512678486';
export const ADMOB_BANNER_ID = 'ca-app-pub-9884079525920738/3293709252';
/** true 면 테스트 광고만 나옵니다 (실제 ID 로 바꿀 때 false 로) */
export const AD_TESTING = false;

/** 광고 제거 구매 여부 임시 저장 키 (3단계 결제 연결 전까지 자리만 둠) */
