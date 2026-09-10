/**
 * 앱 전역 설정. 이름·버전·저장 키처럼 한 곳에서 바꾸고 싶은 값을 모아 둡니다.
 */
export const APP_NAME = '이정표';
export const APP_VERSION = '0.3 시제품';

/** 고민 입력 최대 글자 수 */
export const CONCERN_MAX_LENGTH = 300;
/** 상황 확인 직접 입력·보충 입력 최대 글자 수 */
export const ANSWER_MAX_LENGTH = 150;
export const SUPPLEMENT_MAX_LENGTH = 300;
export const MEMO_MAX_LENGTH = 1000;

/** localStorage 키. 앱 이름과 별개로 유지해 이름을 바꿔도 기록이 유지되게 합니다. */
export const STORAGE_KEYS = {
  records: 'tarot-counsel.records.v1',
  draft: 'tarot-counsel.draft.v1',
} as const;

/** 역방향으로 나올 확률(0~1). 상담 시작 시 카드마다 정해지고 이후 바뀌지 않습니다. */
export const REVERSED_RATE = 0.4;

/** 저장 뒤 며칠이 지나면 기록장에서 "돌아볼 때" 라고 알릴지 */
export const REFLECTION_AFTER_DAYS = 3;

/** 모의 분석 대기 시간(ms). 실제 서비스 연결 시 의미가 없어집니다. */
export const MOCK_ANALYSIS_DELAY_MS = 1400;
/**
 * 모의 분석 실패 확률(0~1). 재시도 흐름을 확인하고 싶을 때 0.5 등으로 올려 보세요.
 */
export const MOCK_ANALYSIS_FAILURE_RATE = 0;
