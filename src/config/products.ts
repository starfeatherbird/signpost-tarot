import type { PlanId } from '../domain/types';

/**
 * 상담 상품 정보. 가격·무료 이용 횟수는 아직 미정이라 적지 않습니다.
 * 문구를 바꾸거나 나중에 가격을 붙일 때 이 파일만 수정하면 됩니다.
 */
export interface PlanInfo {
  id: PlanId;
  name: string;
  badge: string;
  description: string;
  /** 제공 내용 (상품 선택 화면 목록) */
  features: string[];
  /** 시작 버튼 문구 */
  cta: string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  basic: {
    id: 'basic',
    name: '무료 기본 상담',
    badge: '무료',
    description: '고민의 핵심을 정리하고, 먼저 고려할 방향과 작은 행동을 살펴봐요.',
    features: [
      '고민 입력과 상황 확인',
      '카드 3장 선택',
      '먼저 제안드리는 방향과 이유',
      '다른 선택이 나은 경우',
      '지금 할 수 있는 일',
      '카드별로 살펴볼 관점',
    ],
    cta: '무료로 시작하기',
  },
  deep: {
    id: 'deep',
    name: '유료 심층 상담',
    badge: '유료 예정',
    description: '선택지의 이점과 부담을 비교하고, 실행 순서까지 구체적으로 정리해요.',
    features: [
      '기본 상담의 모든 내용',
      '중요하게 생각하는 기준과 현실적인 제약 확인',
      '선택지 2~3개의 이점·부담 비교',
      '우선 제안이 적합한 조건',
      '선택한 방향의 실행 순서',
      '예상되는 장애물과 대응 방안',
      '결과에 대한 추가 질문',
    ],
    cta: '심층 상담 알아보기',
  },
};

export const PLAN_LIST: PlanInfo[] = [PLANS.basic, PLANS.deep];

/** 심층 상담 체험 안내 화면의 번호 목록 */
export const DEEP_INTRO_STEPS = [
  '중요하게 생각하는 기준과 현실적인 제약 확인',
  '선택지 2~3개의 이점과 부담 비교',
  '우선 제안이 적합한 조건',
  '선택한 방향의 실행 순서',
  '예상되는 장애물과 대응 방안',
  '결과에 대해 더 묻기',
  '심층 결과를 기록장에 저장',
];

/** 심층 상담 체험 안내 문구 */
export const DEEP_TRIAL_NOTICE =
  '심층 상담은 정식 서비스에서 유료로 제공할 예정이에요. 현재 시제품에서는 결제 없이 예시 흐름을 체험할 수 있어요.';

/**
 * 시제품에서 추가 심층 질문을 체험할 수 있는 횟수.
 * 실제 상품의 이용 한도가 아니며, 정식 정책이 정해지면 서버 쪽 규칙으로 옮깁니다.
 */
export const DEEP_FOLLOWUP_TRIAL_COUNT = 1;

/** 고민 입력 화면의 예시 칩: 짧은 라벨 → 입력란에 들어갈 문장 */
export const CONCERN_EXAMPLES: { label: string; text: string }[] = [
  { label: '이직을 할지 남을지', text: '지금 회사에 남을지, 이직을 할지 고민돼요. 조건은 나쁘지 않은데 마음이 자꾸 흔들려요.' },
  { label: '친구에게 서운함을 말할지', text: '친구에게 서운한 마음을 말할지 고민돼요. 말하면 관계가 어색해질까 봐 걱정이에요.' },
  { label: '새로운 공부를 시작할지', text: '새로운 공부를 시작하고 싶은데 시간과 비용이 부담돼서 망설여져요.' },
];
