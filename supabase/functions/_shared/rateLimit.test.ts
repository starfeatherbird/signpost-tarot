import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, checkRateLimit, clientIp, hashIp, parseLimits, retryAfterSeconds, type HitFn } from './rateLimit.ts';

/** 메모리에서 창(window)을 흉내 내는 가짜 RPC */
function fakeHit(now = () => Date.now()): HitFn {
  const store = new Map<string, { start: number; count: number }>();
  return async (key, windowSeconds, limit) => {
    const t = now();
    const row = store.get(key);
    if (!row || row.start + windowSeconds * 1000 <= t) store.set(key, { start: t, count: 1 });
    else row.count += 1;
    const cur = store.get(key)!;
    return { allowed: cur.count <= limit, remaining: Math.max(limit - cur.count, 0), reset_at: new Date(cur.start + windowSeconds * 1000).toISOString() };
  };
}

describe('rateLimit', () => {
  it('시크릿 값이 없거나 잘못되면 기본 한도를 쓴다', () => {
    expect(parseLimits({})).toEqual(DEFAULT_LIMITS);
    expect(parseLimits({ ipHour: 'abc', ipDay: '-3', globalDay: '0' })).toEqual(DEFAULT_LIMITS);
    expect(parseLimits({ ipHour: '5', ipDay: '10', globalDay: '99' })).toEqual({ perIpHour: 5, perIpDay: 10, globalDay: 99 });
  });

  it('프록시 헤더에서 첫 IP 를 읽고, 없으면 unknown', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers({ 'cf-connecting-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });

  it('IP 해시는 짧고 같은 입력에 같은 값', async () => {
    const a = await hashIp('1.2.3.4');
    expect(a).toHaveLength(16);
    expect(await hashIp('1.2.3.4')).toBe(a);
    expect(await hashIp('1.2.3.5')).not.toBe(a);
  });

  it('시간당 한도를 넘으면 ip-hour 로 막힌다', async () => {
    const hit = fakeHit();
    const limits = { perIpHour: 2, perIpDay: 10, globalDay: 100 };
    expect((await checkRateLimit(hit, 'abc', limits)).allowed).toBe(true);
    expect((await checkRateLimit(hit, 'abc', limits)).allowed).toBe(true);
    const third = await checkRateLimit(hit, 'abc', limits);
    expect(third.allowed).toBe(false);
    expect(third.scope).toBe('ip-hour');
    expect(third.message).toContain('잠시');
    // 다른 IP 는 영향 없음
    expect((await checkRateLimit(hit, 'xyz', limits)).allowed).toBe(true);
  });

  it('전체 하루 한도는 모든 IP 를 합쳐 센다', async () => {
    const hit = fakeHit();
    const limits = { perIpHour: 10, perIpDay: 10, globalDay: 2 };
    expect((await checkRateLimit(hit, 'a', limits)).allowed).toBe(true);
    expect((await checkRateLimit(hit, 'b', limits)).allowed).toBe(true);
    const blocked = await checkRateLimit(hit, 'c', limits);
    expect(blocked.allowed).toBe(false);
    expect(blocked.scope).toBe('global-day');
  });

  it('창이 지나면 다시 허용된다', async () => {
    let t = 1_000_000;
    const hit = fakeHit(() => t);
    const limits = { perIpHour: 1, perIpDay: 10, globalDay: 100 };
    expect((await checkRateLimit(hit, 'a', limits)).allowed).toBe(true);
    expect((await checkRateLimit(hit, 'a', limits)).allowed).toBe(false);
    t += 3600 * 1000 + 1;
    expect((await checkRateLimit(hit, 'a', limits)).allowed).toBe(true);
  });

  it('Retry-After 초를 계산한다', () => {
    const now = Date.parse('2026-09-10T00:00:00Z');
    expect(retryAfterSeconds('2026-09-10T00:10:00Z', now)).toBe(600);
    expect(retryAfterSeconds('2026-09-09T00:00:00Z', now)).toBe(60);
    expect(retryAfterSeconds(undefined, now)).toBe(60);
  });
});
