/** 카드 자리(스프레드 위치) 식별자 */
export type PositionId = 'core' | 'blindspot' | 'next';

/** 상담 상품 종류 */
export type PlanId = 'basic' | 'deep';

export interface CardPosition {
  id: PositionId;
  /** 자리 순서 (0부터) */
  index: number;
  title: string;
  description: string;
}

/** 카드 기준 데이터 */
export interface TarotCard {
  id: string;
  /** 메이저 아르카나 번호 0~21 */
  number: number;
  nameKo: string;
  nameEn: string;
  /** 임시 앞면에 표시할 간단한 상징 문자 */
  symbol: string;
  keywords: string[];
  /** 기본 의미 (정방향) */
  essence: string;
  /** 역방향 핵심어·의미: 에너지가 막히거나 지나치거나 안으로 향한 상태 */
  reversedKeywords: string[];
  reversedEssence: string;
  /** 자리별로 살펴볼 관점 문구 */
  perspectives: Record<PositionId, string>;
  /** 이 카드가 제안하는 작은 행동 */
  actions: string[];
  /**
   * 카드 앞면 이미지 경로. 비어 있으면 카드 ID 로 public/cards/ 에서 자동으로 찾습니다.
   */
  image?: string;
}

/** 상황 확인 질문 */
export interface Question {
  id: string;
  text: string;
  /** choice: 선택지 하나 / list: 짧은 항목 여러 개 (예: 선택지 2~3개) */
  kind: 'choice' | 'list';
  options: string[];
  allowCustom: boolean;
  hint?: string;
  minItems?: number;
  maxItems?: number;
}

export interface Answer {
  questionId: string;
  questionText: string;
  /** null 이면 건너뜀/모르겠어요 */
  value: string | null;
  /** list 질문의 항목들 */
  values?: string[];
}

/** 선택된 카드와 자리 */
export interface DrawnCard {
  cardId: string;
  positionId: PositionId;
  /** 역방향 여부 (예전 기록에는 없을 수 있음 → 정방향으로 취급) */
  reversed?: boolean;
}

/** 기본 분석 입력 */
export interface AnalysisInput {
  concern: string;
  answers: Answer[];
  cards: DrawnCard[];
  supplement?: string;
}

/** 심층 분석 입력 = 기본 입력 + 심층 질문 답변 */
export interface DeepAnalysisInput extends AnalysisInput {
  deepAnswers: Answer[];
}

export interface CardPerspective {
  cardId: string;
  positionId: PositionId;
  text: string;
}

/** 결과 출처. 실제 분석 결과에만 붙으며, 어떤 제공자·모델·프롬프트로 만들었는지 기록에 남깁니다. */
export interface Provenance {
  provider: string;
  model: string;
  promptVersion: string;
  fallbackFrom?: string[];
}

/** 기본 상담 결과 (구조화) */
export interface ReadingResult {
  /** 실제 분석 결과의 출처 (모의 결과에는 없음) */
  source?: Provenance;
  priority: string;
  reasons: string[];
  alternatives: string[];
  actions: string[];
  perspectives: CardPerspective[];
  /** 예시 결과 여부. 실제 분석 연결 후에는 false */
  isSample: boolean;
  /** 보충 내용 접수 등 서비스가 사용자에게 알리고 싶은 문구 */
  notes: string[];
  generatedAt: string;
}

export interface OptionComparison {
  option: string;
  benefits: string[];
  burdens: string[];
}

export interface Obstacle {
  obstacle: string;
  response: string;
}

/** 심층 상담 결과 = 기본 결과 + 비교·실행 계획 */
export interface DeepReadingResult extends ReadingResult {
  kind: 'deep';
  /** 확인한 기준·제약 요약 */
  criteriaSummary: string;
  comparisons: OptionComparison[];
  /** 우선 제안에 해당하는 선택지 이름 (comparisons 의 option 과 같은 값) */
  recommendedOption?: string;
  /** 우선 제안이 적합한 조건 */
  fitConditions: string[];
  executionSteps: string[];
  obstacles: Obstacle[];
}

/** 추가 심층 질문 입력/응답 */
export interface FollowUpInput extends DeepAnalysisInput {
  deepResult: DeepReadingResult;
  question: string;
}

export interface FollowUp {
  question: string;
  answer: string;
  isSample: boolean;
  askedAt: string;
}

/** 저장된 상담 기록 */
export interface ConsultationRecord {
  id: string;
  consultationId: string;
  createdAt: string;
  updatedAt: string;
  plan: PlanId;
  concern: string;
  answers: Answer[];
  deepAnswers: Answer[];
  cards: DrawnCard[];
  supplement?: string;
  /** 기본 결과 (심층으로 바로 시작한 경우 없음) */
  result: ReadingResult | null;
  deepResult: DeepReadingResult | null;
  followUps: FollowUp[];
  /** '지금 할 수 있는 일' 중 체크한 항목 */
  actionChecks: string[];
  /** 저장 시점 결과가 예시였는지 */
  isSample: boolean;
  /** 이후 상황 메모 */
  followUpMemo: string;
}
