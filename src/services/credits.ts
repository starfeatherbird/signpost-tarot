import { getAccessToken } from './supabase';

/**
 * 서버가 보는 구매 상태: 아직 쓰지 않은 심층 상담 횟수.
 * 서버 함수 tarot-reading 에 kind: 'credits' 로 묻습니다 (로그인 토큰 필요).
 */
export interface CreditsInfo {
  /** 구매했지만 아직 상담에 쓰지 않은 심층 횟수 */
  deepCredits: number;
  /** 서버가 결제 확인을 하고 있는지 (false 면 오픈 기간: 심층 무료) */
  enforced: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export async function fetchCredits(): Promise<CreditsInfo | null> {
  if (!supabaseUrl || !anonKey) return null;
  try {
    const token = (await getAccessToken()) ?? anonKey;
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/tarot-reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'credits' }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<CreditsInfo>;
    return { deepCredits: Number(body.deepCredits ?? 0), enforced: !!body.enforced };
  } catch {
    return null;
  }
}
