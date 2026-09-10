/**
 * 모델 후보 목록과 자동 후계 전환.
 *
 * 후보는 환경 변수 TAROT_MODELS 로 바꿉니다 (앱 재배포 불필요, 함수 재배포도 불필요 — 시크릿만 갱신).
 *   예) TAROT_MODELS="anthropic:claude-sonnet-5,gemini:auto,anthropic:claude-sonnet-4-6"
 * - 형식: "제공자:모델" 을 쉼표로 나열. 앞이 1순위.
 * - gemini:auto 는 키로 사용 가능한 flash 계열 최신 모델을 자동 선택합니다.
 * 1순위가 은퇴(404)·한도 초과(429)·장애(5xx)·형식 오류 등으로 실패하면 다음 후보로 넘어갑니다.
 */
export type ProviderId = 'anthropic' | 'gemini';

export interface Candidate {
  provider: ProviderId;
  model: string;
}

export const DEFAULT_CANDIDATES: Candidate[] = [
  { provider: 'anthropic', model: 'claude-sonnet-5' },
  { provider: 'gemini', model: 'auto' },
  { provider: 'anthropic', model: 'claude-sonnet-4-6' },
];

const PROVIDERS: ProviderId[] = ['anthropic', 'gemini'];

export function parseCandidates(raw: string | undefined | null): Candidate[] {
  if (!raw || !raw.trim()) return DEFAULT_CANDIDATES;
  const parsed: Candidate[] = [];
  for (const part of raw.split(',')) {
    const [provider, ...rest] = part.trim().split(':');
    const model = rest.join(':').trim();
    if (PROVIDERS.includes(provider as ProviderId) && model) {
      parsed.push({ provider: provider as ProviderId, model });
    }
  }
  return parsed.length > 0 ? parsed : DEFAULT_CANDIDATES;
}

export function candidateLabel(c: Candidate): string {
  return `${c.provider}:${c.model}`;
}

export type ProviderErrorKind =
  | 'config'            // 키 없음 등 설정 문제
  | 'model_unavailable' // 404: 모델 은퇴·이름 변경
  | 'rate_limit'        // 429
  | 'server'            // 5xx
  | 'network'
  | 'bad_request'       // 400: 요청 형식 문제
  | 'output';           // 응답이 형식에 맞지 않음

export class ProviderError extends Error {
  constructor(message: string, public readonly kind: ProviderErrorKind, public readonly status?: number) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function classifyStatus(status: number): ProviderErrorKind {
  if (status === 404) return 'model_unavailable';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  if (status === 401 || status === 403) return 'config';
  return 'bad_request';
}

export interface FallbackOutcome<T> {
  value: T;
  candidate: Candidate;
  /** 실패해서 건너뛴 후보들 ("제공자:모델 — 이유") */
  fallbackFrom: string[];
}

/**
 * 후보를 순서대로 시도해 첫 성공을 돌려줍니다. 모두 실패하면 마지막 오류를 던집니다.
 * attempt 는 실패 시 예외를 던지면 됩니다(ProviderError 권장).
 */
export async function runWithFallback<T>(
  candidates: Candidate[],
  attempt: (candidate: Candidate) => Promise<T>,
  log: (message: string) => void = () => {},
): Promise<FallbackOutcome<T>> {
  const fallbackFrom: string[] = [];
  let lastError: unknown = new ProviderError('사용할 수 있는 모델 후보가 없어요.', 'config');

  for (const candidate of candidates) {
    try {
      const value = await attempt(candidate);
      if (fallbackFrom.length > 0) log(`fallback → ${candidateLabel(candidate)} (skipped: ${fallbackFrom.join(' | ')})`);
      return { value, candidate, fallbackFrom };
    } catch (err) {
      lastError = err;
      const kind = err instanceof ProviderError ? err.kind : 'network';
      const reason = err instanceof Error ? err.message : String(err);
      fallbackFrom.push(`${candidateLabel(candidate)} — ${kind}: ${reason.slice(0, 160)}`);
      log(`candidate failed ${candidateLabel(candidate)} [${kind}] ${reason}`);
    }
  }
  throw lastError;
}
