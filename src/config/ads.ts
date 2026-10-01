/**
 * AdMob 설정 (안드로이드 앱에서만 쓰임, 웹에는 광고 없음).
 * 지금은 Google 공식 테스트 ID 입니다. 실제 ID 를 받으면 아래 두 값과
 * android/app/src/main/res/values/strings.xml 의 admob_app_id 를 함께 바꾸고 AD_TESTING 을 false 로 둡니다.
 * 광고 단위 ID 는 공개돼도 되는 값입니다.
 */
export const ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
/** true 면 테스트 광고만 나옵니다 (실제 ID 로 바꿀 때 false 로) */
export const AD_TESTING = true;

/** 광고 제거 구매 여부 임시 저장 키 (3단계 결제 연결 전까지 자리만 둠) */
export const AD_FREE_STORAGE_KEY = 'tarot-counsel.adfree.v1';
