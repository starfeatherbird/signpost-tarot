// 타로 상담 결과 생성 Edge Function (Deno)
// 배포: npm run server:deploy  (= npx supabase functions deploy tarot-reading, 프로젝트는 supabase link 로 지정)
// 시크릿: ANTHROPIC_API_KEY, GEMINI_API_KEY, (선택) TAROT_MODELS
//
// 흐름: 앱 → 이 함수(입력 검증 + 프롬프트 구성) → 후보 모델 순서대로 시도(자동 후계 전환) → JSON 검증 → 앱
// API 키는 Supabase 시크릿에만 존재하고 앱 번들에는 들어가지 않습니다.

import { buildUserMessage, PROMPT_VERSION, SYSTEM_PROMPT } from '../_shared/prompt.ts';
import { callAnthropic, type ProviderCall } from '../_shared/providers/anthropic.ts';
import { callGemini } from '../_shared/providers/gemini.ts';
import { candidateLabel, parseCandidates, ProviderError, runWithFallback, type Candidate } from '../_shared/registry.ts';
import { BASIC_SCHEMA, DEEP_SCHEMA, FOLLOWUP_SCHEMA, type JsonSchema } from '../_shared/schema.ts';
import type { DeepReadingResult, Provenance, ReadingRequest } from '../_shared/types.ts';
import { assertCards, normalizeBasic, normalizeDeep, normalizeFollowUp } from '../_shared/validate.ts';
import { checkRateLimit, clientIp, hashIp, parseLimits, retryAfterSeconds, type HitResult } from '../_shared/rateLimit.ts';
import { buildUsageRow, type UsageRow } from '../_shared/usage.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONCERN = 1000;
const MAX_FIELD = 600;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function cleanAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a) => a && typeof a === 'object' && typeof a.questionId === 'string')
    .slice(0, 10)
    .map((a) => ({
      questionId: clip(a.questionId, 60),
      questionText: clip(a.questionText, 200),
      value: typeof a.value === 'string' ? clip(a.value, MAX_FIELD) : null,
      values: Array.isArray(a.values) ? a.values.filter((v: unknown) => typeof v === 'string').slice(0, 5).map((v: string) => clip(v, MAX_FIELD)) : undefined,
    }));
}

/** 요청 본문을 신뢰하지 않고 필요한 필드만 길이 제한을 두고 추립니다. */
function parseRequest(body: Record<string, unknown>): ReadingRequest {
  const kind = body.kind;
  const raw = (body.input ?? {}) as Record<string, unknown>;
  const concern = clip(raw.concern, MAX_CONCERN).trim();
  if (!concern) throw new ProviderError('고민 내용이 비어 있어요.', 'bad_request', 400);
  const base = {
    concern,
    answers: cleanAnswers(raw.answers),
    cards: assertCards(raw.cards),
    supplement: clip(raw.supplement, MAX_FIELD).trim() || undefined,
  };
  if (kind === 'basic') return { kind, input: base };
  if (kind === 'deep') return { kind, input: { ...base, deepAnswers: cleanAnswers(raw.deepAnswers) } };
  if (kind === 'followUp') {
    const question = clip(raw.question, MAX_FIELD).trim();
    const deepResult = raw.deepResult;
    if (!question) throw new ProviderError('질문이 비어 있어요.', 'bad_request', 400);
    if (!deepResult || typeof deepResult !== 'object') throw new ProviderError('심층 결과가 없어요.', 'bad_request', 400);
    return {
      kind,
      input: {
        ...base,
        deepAnswers: cleanAnswers(raw.deepAnswers),
        deepResult: deepResult as DeepReadingResult,
        question,
      },
    };
  }
  throw new ProviderError('알 수 없는 요청 종류예요.', 'bad_request', 400);
}

/**
 * Authorization 헤더의 토큰이 로그인한 사용자의 것이면 그 id 를 돌려줍니다.
 * anon 키(로그인 안 함)나 확인 실패면 null → IP 기준으로 처리합니다.
 */
async function resolveUserId(admin: ReturnType<typeof createClient>, headers: Headers): Promise<string | null> {
  const auth = headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token === (Deno.env.get('SUPABASE_ANON_KEY') ?? '')) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

function schemaFor(kind: ReadingRequest['kind']): JsonSchema {
  return kind === 'basic' ? BASIC_SCHEMA : kind === 'deep' ? DEEP_SCHEMA : FOLLOWUP_SCHEMA;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST 만 지원해요.' }, 405);

  let request: ReadingRequest;
  try {
    request = parseRequest((await req.json()) as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : '요청 형식이 올바르지 않아요.';
    return json({ error: message }, 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const ipHash = await hashIp(clientIp(req.headers));
  const userId = await resolveUserId(admin, req.headers);
  const startedAt = Date.now();

  /** 사용 기록(고민 내용은 저장하지 않음). 실패해도 응답에는 영향 없음. */
  const logUsage = async (row: UsageRow) => {
    try {
      const { error } = await admin.from('tarot_usage_log').insert(row);
      if (error) console.warn('[tarot-reading] usage log failed', error.message);
    } catch (err) {
      console.warn('[tarot-reading] usage log failed', err);
    }
  };

  // ── 호출 횟수 제한 ──────────────────────────────
  // IP 별 시간당/하루 + 전체 하루 한도. 횟수 기록은 service role 로만 접근하는 테이블에 둡니다.
  // 기록 테이블에 문제가 있으면(미생성 등) 로그만 남기고 통과시킵니다(앱이 멈추지 않게).
  try {
    const hit = async (key: string, windowSeconds: number, limit: number): Promise<HitResult> => {
      const { data, error } = await admin.rpc('tarot_rate_limit_hit', { p_key: key, p_window_seconds: windowSeconds, p_limit: limit });
      if (error) throw new Error(error.message);
      const row = (Array.isArray(data) ? data[0] : data) as HitResult | undefined;
      if (!row) throw new Error('rate limit rpc returned no row');
      return row;
    };
    const limits = parseLimits({
      ipHour: Deno.env.get('TAROT_LIMIT_IP_HOUR'),
      ipDay: Deno.env.get('TAROT_LIMIT_IP_DAY'),
      userHour: Deno.env.get('TAROT_LIMIT_USER_HOUR'),
      userDay: Deno.env.get('TAROT_LIMIT_USER_DAY'),
      globalDay: Deno.env.get('TAROT_LIMIT_GLOBAL_DAY'),
    });
    const decision = await checkRateLimit(hit, { ipHash, userId }, limits);
    if (!decision.allowed) {
      const retryAfter = retryAfterSeconds(decision.resetAt);
      console.log(`[tarot-reading] rate limited scope=${decision.scope} retryAfter=${retryAfter}s`);
      await logUsage(buildUsageRow({ kind: request.kind, ok: false, errorKind: `rate_limited:${decision.scope}`, durationMs: Date.now() - startedAt, ipHash, userId }));
      return new Response(JSON.stringify({ error: decision.message, scope: decision.scope, retryAfterSeconds: retryAfter }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
      });
    }
  } catch (err) {
    console.error('[tarot-reading] rate limit check failed (allowing request)', err);
  }

  const keys = {
    anthropic: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    gemini: Deno.env.get('GEMINI_API_KEY') ?? '',
  };
  const candidates = parseCandidates(Deno.env.get('TAROT_MODELS'));
  const call: Omit<ProviderCall, 'model'> = {
    system: SYSTEM_PROMPT,
    user: buildUserMessage(request),
    schema: schemaFor(request.kind),
    maxTokens: request.kind === 'followUp' ? 2000 : 8000,
    effort: 'low',
  };

  const attempts: string[] = [];
  try {
    const outcome = await runWithFallback(
      candidates,
      async (candidate: Candidate) => {
        const apiKey = keys[candidate.provider];
        if (!apiKey) throw new ProviderError(`${candidate.provider} 키가 설정되지 않았어요.`, 'config');
        let rawText: string;
        let usedModel = candidate.model;
        if (candidate.provider === 'anthropic') {
          rawText = await callAnthropic(apiKey, { ...call, model: candidate.model });
        } else {
          const gemini = await callGemini(apiKey, { ...call, model: candidate.model });
          rawText = gemini.text;
          usedModel = gemini.model; // 'auto' 면 실제로 성공한 모델 이름
        }
        const source: Provenance = { provider: candidate.provider, model: usedModel, promptVersion: PROMPT_VERSION };
        // 형식이 어긋나면 ProviderError('output') → 다음 후보로
        if (request.kind === 'basic') return normalizeBasic(rawText, request.input.cards, source);
        if (request.kind === 'deep') return normalizeDeep(rawText, request.input.cards, source);
        return normalizeFollowUp(rawText, source);
      },
      (message) => { attempts.push(message); console.log(`[tarot-reading] ${message}`); },
    );

    const result = outcome.value;
    if (result.source && outcome.fallbackFrom.length > 0) result.source.fallbackFrom = outcome.fallbackFrom;
    console.log(`[tarot-reading] ok kind=${request.kind} via ${candidateLabel(outcome.candidate)}`);
    await logUsage(buildUsageRow({ kind: request.kind, ok: true, provider: result.source?.provider, model: result.source?.model, promptVersion: result.source?.promptVersion, durationMs: Date.now() - startedAt, fallbackCount: outcome.fallbackFrom.length, ipHash, userId }));
    return json({ kind: request.kind, result });
  } catch (err) {
    console.error('[tarot-reading] all candidates failed', err);
    const message = err instanceof ProviderError && err.kind === 'config'
      ? '분석 서비스가 아직 준비되지 않았어요. (서버 키 설정 필요)'
      : '지금은 결과를 정리하지 못했어요. 잠시 후 다시 시도해 주세요.';
    await logUsage(buildUsageRow({ kind: request.kind, ok: false, errorKind: err instanceof ProviderError ? err.kind : 'unknown', durationMs: Date.now() - startedAt, fallbackCount: attempts.length, ipHash, userId }));
    // detail: 어떤 후보가 왜 실패했는지 (대시보드 로그와 같은 내용). 키 값은 포함되지 않습니다.
    return json({ error: message, detail: attempts }, 502);
  }
});
