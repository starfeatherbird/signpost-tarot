import type {
  AnalysisInput,
  DeepAnalysisInput,
  DeepReadingResult,
  FollowUpInput,
  Provenance,
  ReadingResult,
} from '../../domain/types';

export interface FollowUpAnswer {
  answer: string;
  isSample: boolean;
  source?: Provenance;
}

/**
 * 상담 결과 생성 서비스 인터페이스.
 *
 * 지금은 로컬 모의 서비스(mockAnalysisService)가 구현하고 있으며,
 * 실제 생성형 분석(AI)을 붙일 때는 이 인터페이스를 구현하는 서비스를 하나 더 만들어
 * index.ts 에서 교체하면 됩니다. 화면 코드는 바꾸지 않아도 됩니다.
 *
 * - analyze      : 무료 기본 상담 결과
 * - analyzeDeep  : 유료 심층 상담 결과 (기본 결과 + 비교·실행 계획)
 * - askFollowUp  : 심층 결과에 대한 추가 질문 응답
 *
 * 실제 연결 시 주의:
 * - API 비밀 키는 프런트엔드(브라우저 번들)에 넣지 않습니다.
 * - 브라우저 → 우리 서버 → 분석 API 순서로 호출하고, 키는 서버 환경 변수에만 둡니다.
 * - 서버 응답은 ReadingResult / DeepReadingResult 형태로 정규화해서 돌려주면 됩니다(isSample: false).
 */
export interface AnalysisService {
  analyze(input: AnalysisInput, options?: { signal?: AbortSignal }): Promise<ReadingResult>;
  analyzeDeep(input: DeepAnalysisInput, options?: { signal?: AbortSignal }): Promise<DeepReadingResult>;
  askFollowUp(input: FollowUpInput, options?: { signal?: AbortSignal }): Promise<FollowUpAnswer>;
}

export class AnalysisError extends Error {
  /** rate_limited: 호출 횟수 제한 (retryAfterSeconds 뒤에 풀림) */
  code?: 'rate_limited';
  retryAfterSeconds?: number;
  constructor(message: string, public readonly retryable = true) {
    super(message);
    this.name = 'AnalysisError';
  }
}
