/**
 * 서버 함수와 앱이 주고받는 형식.
 * 앱의 src/domain/types.ts 와 같은 모양을 유지합니다 (서버는 src 를 import 하지 않으므로 복사본).
 */
export type PositionId = 'core' | 'blindspot' | 'next';

export interface Answer {
  questionId: string;
  questionText: string;
  value: string | null;
  values?: string[];
}

export interface DrawnCard {
  cardId: string;
  positionId: PositionId;
  /** 역방향 여부 */
  reversed?: boolean;
}

export interface AnalysisInput {
  concern: string;
  answers: Answer[];
  cards: DrawnCard[];
  supplement?: string;
}

export interface DeepAnalysisInput extends AnalysisInput {
  deepAnswers: Answer[];
}

export interface CardPerspective {
  cardId: string;
  positionId: PositionId;
  text: string;
}

/** 결과 출처. 어떤 제공자·모델·프롬프트로 만들었는지 기록에 남깁니다. */
export interface Provenance {
  provider: string;
  model: string;
  promptVersion: string;
  /** 앞선 후보가 실패해 넘어온 경우 실패한 후보 목록 */
  fallbackFrom?: string[];
}

export interface ReadingResult {
  priority: string;
  reasons: string[];
  alternatives: string[];
  actions: string[];
  perspectives: CardPerspective[];
  isSample: boolean;
  notes: string[];
  generatedAt: string;
  source?: Provenance;
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

export interface DeepReadingResult extends ReadingResult {
  kind: 'deep';
  criteriaSummary: string;
  comparisons: OptionComparison[];
  /** 우선 제안에 해당하는 선택지 이름 (comparisons 의 option 과 같은 값) */
  recommendedOption?: string;
  fitConditions: string[];
  executionSteps: string[];
  obstacles: Obstacle[];
}

export interface FollowUpInput extends DeepAnalysisInput {
  deepResult: DeepReadingResult;
  question: string;
}

export interface FollowUpAnswer {
  answer: string;
  isSample: boolean;
  source?: Provenance;
}

export type ReadingRequest =
  | { kind: 'basic'; input: AnalysisInput }
  | { kind: 'deep'; input: DeepAnalysisInput }
  | { kind: 'followUp'; input: FollowUpInput };

export type ReadingKind = ReadingRequest['kind'];

export interface CardData {
  id: string;
  number: number;
  nameKo: string;
  nameEn: string;
  keywords: string[];
  essence: string;
  reversedKeywords: string[];
  reversedEssence: string;
  perspectives: Record<PositionId, string>;
  actions: string[];
}

export const POSITION_TITLES: Record<PositionId, string> = {
  core: '현재의 핵심',
  blindspot: '놓치고 있는 관점',
  next: '다음 움직임',
};
