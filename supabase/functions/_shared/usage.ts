/**
 * 사용 기록 한 줄(tarot_usage_log). 고민 내용·결과 본문은 절대 넣지 않습니다.
 * 비용·이용량 파악과 실패 추적이 목적입니다.
 */
export interface UsageRow {
  kind: 'basic' | 'deep' | 'followUp';
  ok: boolean;
  provider: string | null;
  model: string | null;
  prompt_version: string | null;
  duration_ms: number;
  error_kind: string | null;
  fallback_count: number;
  ip_hash: string | null;
}

export function buildUsageRow(input: {
  kind: UsageRow['kind'];
  ok: boolean;
  provider?: string;
  model?: string;
  promptVersion?: string;
  durationMs: number;
  errorKind?: string;
  fallbackCount?: number;
  ipHash?: string;
}): UsageRow {
  return {
    kind: input.kind,
    ok: input.ok,
    provider: input.provider ?? null,
    model: input.model ?? null,
    prompt_version: input.promptVersion ?? null,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    error_kind: input.errorKind ? input.errorKind.slice(0, 60) : null,
    fallback_count: input.fallbackCount ?? 0,
    ip_hash: input.ipHash ?? null,
  };
}
