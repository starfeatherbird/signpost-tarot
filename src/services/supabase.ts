import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 앱 전체가 함께 쓰는 Supabase 클라이언트 (인증 + 기록 동기화).
 * .env 에 URL/anon 키가 없으면 null 이며, 그때는 로그인 없이 기기 저장만 씁니다.
 * anon 키는 공개용이고, AI 키는 서버 시크릿에만 있습니다.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // 이메일 링크·Google 로그인 뒤 돌아온 주소에서 세션을 읽습니다.
        storageKey: 'tarot-counsel.auth.v1',
      },
    })
  : null;

/** 로그인 뒤 돌아올 주소 (GitHub Pages 하위 경로 포함). Supabase 대시보드의 Redirect URLs 에 같은 값이 있어야 합니다. */
export function authRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/** 현재 로그인 토큰. 서버 함수 호출에 붙여 사람 기준 한도를 적용받습니다. 없으면 null(익명). */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
