import { describe, expect, it } from 'vitest';
import { DEFAULT_CANDIDATES, ProviderError, classifyStatus, parseCandidates, runWithFallback } from './registry.ts';

describe('model registry', () => {
  it('환경 변수 문자열을 후보 목록으로 읽는다', () => {
    expect(parseCandidates('anthropic:claude-sonnet-5, gemini:auto ,anthropic:claude-sonnet-4-6')).toEqual([
      { provider: 'anthropic', model: 'claude-sonnet-5' },
      { provider: 'gemini', model: 'auto' },
      { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    ]);
  });

  it('비어 있거나 잘못된 값이면 기본 후보를 쓴다', () => {
    expect(parseCandidates(undefined)).toEqual(DEFAULT_CANDIDATES);
    expect(parseCandidates('')).toEqual(DEFAULT_CANDIDATES);
    expect(parseCandidates('openai:gpt')).toEqual(DEFAULT_CANDIDATES);
    expect(parseCandidates('anthropic:')).toEqual(DEFAULT_CANDIDATES);
  });

  it('상태 코드를 실패 종류로 나눈다', () => {
    expect(classifyStatus(404)).toBe('model_unavailable');
    expect(classifyStatus(429)).toBe('rate_limit');
    expect(classifyStatus(503)).toBe('server');
    expect(classifyStatus(401)).toBe('config');
    expect(classifyStatus(400)).toBe('bad_request');
  });

  it('1순위 모델이 은퇴(404)하면 다음 후보로 자동 전환하고 그 사실을 남긴다', async () => {
    const candidates = parseCandidates('anthropic:old-model,gemini:auto');
    const outcome = await runWithFallback(candidates, async (c) => {
      if (c.model === 'old-model') throw new ProviderError('not found', 'model_unavailable', 404);
      return `ok:${c.provider}`;
    });
    expect(outcome.value).toBe('ok:gemini');
    expect(outcome.candidate.provider).toBe('gemini');
    expect(outcome.fallbackFrom).toHaveLength(1);
    expect(outcome.fallbackFrom[0]).toContain('anthropic:old-model');
    expect(outcome.fallbackFrom[0]).toContain('model_unavailable');
  });

  it('첫 후보가 성공하면 전환 기록이 비어 있다', async () => {
    const outcome = await runWithFallback(DEFAULT_CANDIDATES, async () => 'ok');
    expect(outcome.candidate).toEqual(DEFAULT_CANDIDATES[0]);
    expect(outcome.fallbackFrom).toEqual([]);
  });

  it('모든 후보가 실패하면 마지막 오류를 던진다', async () => {
    await expect(
      runWithFallback(DEFAULT_CANDIDATES, async (c) => {
        throw new ProviderError(`fail ${c.model}`, 'server', 500);
      }),
    ).rejects.toThrow('fail claude-sonnet-4-6');
  });
});
