/**
 * 호출 횟수 제한.
 * - IP 별 시간당 / 하루 한도, 그리고 전체 합계 하루 한도(비용 보호)를 둡니다.
 * - 횟수는 Supabase 테이블(tarot_rate_limits)의 RPC 함수 tarot_rate_limit_hit 로 셉니다. (supabase/sql/rate_limit.sql)
 * - 한도는 시크릿으로 조절합니다: TAROT_LIMIT_IP_HOUR, TAROT_LIMIT_IP_DAY, TAROT_LIMIT_GLOBAL_DAY
 * - IP 는 그대로 저장하지 않고 짧은 해시로 저장합니다.
 */
export interface RateLimits {
  perIpHour: number;
  perIpDay: number;
  globalDay: number;
}

export const DEFAULT_LIMITS: RateLimits = {
  perIpHour: 20,
  perIpDay: 60,
  globalDay: 300,
};

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

function positiveInt(value: string | undefined | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function parseLimits(env: { ipHour?: string | null; ipDay?: string | null; globalDay?: string | null }): RateLimits {
  return {
    perIpHour: positiveInt(env.ipHour, DEFAULT_LIMITS.perIpHour),
    perIpDay: positiveInt(env.ipDay, DEFAULT_LIMITS.perIpDay),
    globalDay: positiveInt(env.globalDay, DEFAULT_LIMITS.globalDay),
  };
}

/** 프록시를 거쳐 온 요청의 실제 클라이언트 IP */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? 'unknown';
}

/** IP 를 저장용 짧은 해시로 (원문 IP 는 남기지 않음) */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`tarot:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface HitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

/** RPC 호출 함수 형태. 테스트에서는 가짜를 넣습니다. */
export type HitFn = (key: string, windowSeconds: number, limit: number) => Promise<HitResult>;

export type LimitScope = 'ip-hour' | 'ip-day' | 'global-day';

export interface RateLimitDecision {
  allowed: boolean;
  scope?: LimitScope;
  resetAt?: string;
  message?: string;
}

const MESSAGES: Record<LimitScope, string> = {
  'ip-hour': '짧은 시간에 상담을 많이 요청했어요. 잠시 쉬었다가 다시 시도해 주세요.',
  'ip-day': '오늘 상담 횟수를 모두 사용했어요. 내일 다시 찾아 주세요.',
  'global-day': '지금은 상담 요청이 많아 잠시 쉬고 있어요. 내일 다시 시도해 주세요.',
};

/**
 * 세 가지 한도를 모두 세고, 하나라도 넘으면 막습니다.
 * (막힌 요청도 횟수에 포함되므로, 계속 두드려도 창이 지나야 풀립니다.)
 */
export async function checkRateLimit(hit: HitFn, ipHash: string, limits: RateLimits): Promise<RateLimitDecision> {
  const checks: { scope: LimitScope; key: string; window: number; limit: number }[] = [
    { scope: 'ip-hour', key: `ip:${ipHash}:hour`, window: HOUR, limit: limits.perIpHour },
    { scope: 'ip-day', key: `ip:${ipHash}:day`, window: DAY, limit: limits.perIpDay },
    { scope: 'global-day', key: 'global:day', window: DAY, limit: limits.globalDay },
  ];
  let blocked: RateLimitDecision | null = null;
  for (const c of checks) {
    const result = await hit(c.key, c.window, c.limit);
    if (!result.allowed && !blocked) {
      blocked = { allowed: false, scope: c.scope, resetAt: result.reset_at, message: MESSAGES[c.scope] };
    }
  }
  return blocked ?? { allowed: true };
}

/** 429 응답에 넣을 Retry-After(초) */
export function retryAfterSeconds(resetAt: string | undefined, now = Date.now()): number {
  if (!resetAt) return 60;
  const ms = new Date(resetAt).getTime() - now;
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 1000) : 60;
}
