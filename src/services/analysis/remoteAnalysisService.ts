import type {
  AnalysisInput,
  DeepAnalysisInput,
  DeepReadingResult,
  FollowUpInput,
  ReadingResult,
} from '../../domain/types';
import { AnalysisError, type AnalysisService, type FollowUpAnswer } from './types';

/**
 * 실제 분석 서비스: Supabase Edge Function(tarot-reading)을 호출합니다.
 * - 브라우저에는 공개용 anon 키만 들어갑니다. AI API 키는 서버 시크릿에만 있습니다.
 * - 서버가 후보 모델을 순서대로 시도하므로(자동 후계 전환) 앱은 모델 이름을 모릅니다.
 */
export interface RemoteConfig {
  supabaseUrl: string;
  anonKey: string;
  functionName?: string;
  timeoutMs?: number;
}

interface ServerResponse<T> {
  kind?: string;
  result?: T;
  error?: string;
  retryAfterSeconds?: number;
}

export function createRemoteAnalysisService(config: RemoteConfig): AnalysisService {
  const endpoint = `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/${config.functionName ?? 'tarot-reading'}`;
  const timeoutMs = config.timeoutMs ?? 150_000;

  async function post<T>(kind: 'basic' | 'deep' | 'followUp', input: unknown, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    signal?.addEventListener('abort', () => controller.abort());
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
        body: JSON.stringify({ kind, input }),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) throw new AnalysisError('응답이 너무 오래 걸려 중단했어요. 다시 시도해 주세요.');
      throw new AnalysisError('분석 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      clearTimeout(timer);
    }

    let body: ServerResponse<T> | null = null;
    try {
      body = (await res.json()) as ServerResponse<T>;
    } catch {
      body = null;
    }
    if (!res.ok || !body?.result) {
      const message = body?.error ?? `분석 서버가 응답하지 않았어요. (${res.status})`;
      const error = new AnalysisError(message, res.status !== 400);
      if (res.status === 429) {
        error.code = 'rate_limited';
        error.retryAfterSeconds = body?.retryAfterSeconds ?? 3600;
      }
      throw error;
    }
    return body.result;
  }

  return {
    analyze: (input: AnalysisInput, options) => post<ReadingResult>('basic', input, options?.signal),
    analyzeDeep: (input: DeepAnalysisInput, options) => post<DeepReadingResult>('deep', input, options?.signal),
    askFollowUp: (input: FollowUpInput, options) => post<FollowUpAnswer>('followUp', input, options?.signal),
  };
}
