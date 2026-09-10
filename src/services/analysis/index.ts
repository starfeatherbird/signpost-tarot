import { getAccessToken } from '../supabase';
import { createMockAnalysisService } from './mockAnalysisService';
import { createRemoteAnalysisService } from './remoteAnalysisService';
import type { AnalysisService } from './types';

export type { AnalysisService, FollowUpAnswer } from './types';
export { AnalysisError } from './types';

/**
 * 앱에서 사용하는 분석 서비스.
 * - .env 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 가 있으면 실제 서비스(Edge Function)를 씁니다.
 * - 없으면 로컬 모의 서비스(예시 결과)로 동작합니다. (docs/DEVELOPMENT.md 참고)
 * anon 키는 공개용 키라 브라우저에 들어가도 괜찮습니다. AI API 키는 절대 여기에 두지 않습니다.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isRemoteAnalysis = Boolean(supabaseUrl && anonKey);

export const analysisService: AnalysisService = isRemoteAnalysis
  ? createRemoteAnalysisService({ supabaseUrl: supabaseUrl!, anonKey: anonKey!, getAccessToken })
  : createMockAnalysisService();
