import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { isNativeApp } from '../services/native';
import { authRedirectUrl, supabase } from '../services/supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  /** google / email */
  provider: string;
}

function toUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user;
  return { id: u.id, email: u.email ?? null, provider: u.app_metadata?.provider ?? 'email' };
}

/**
 * 로그인 상태. 로그인은 선택이며, 하지 않아도 기기 저장으로 계속 쓸 수 있습니다.
 * - Google: 웹은 같은 창에서 OAuth 로 이동했다가 돌아오고, 앱은 시스템 브라우저를 열었다가 앱 스킴으로 돌아옵니다.
 * - 이메일: 비밀번호 없이 메일의 링크로 로그인합니다. 앱에서는 링크가 앱을 엽니다.
 */
export function useAuth() {
  const available = !!supabase;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(!available);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toUser(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(toUser(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 네이티브: 앱 스킴으로 돌아온 주소의 code 를 세션으로 바꿉니다.
  useEffect(() => {
    if (!supabase || !isNativeApp) return;
    const client = supabase;
    const handle = CapApp.addListener('appUrlOpen', async ({ url }) => {
      try {
        const code = new URL(url).searchParams.get('code');
        if (!code) return;
        await Browser.close().catch(() => {});
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) console.warn('[auth] code exchange failed', error.message);
      } catch (err) {
        console.warn('[auth] appUrlOpen', err);
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    if (!supabase) return '로그인을 사용할 수 없어요.';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: isNativeApp },
    });
    if (error) return error.message;
    if (isNativeApp && data.url) await Browser.open({ url: data.url });
    return null;
  }, []);

  const signInWithEmail = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return '로그인을 사용할 수 없어요.';
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectUrl() } });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signOut();
    return error ? error.message : null;
  }, []);

  /** 계정과 클라우드 기록을 서버에서 지우고(rpc delete_my_account) 로그아웃합니다. 기기의 기록은 남습니다. */
  const deleteAccount = useCallback(async (): Promise<string | null> => {
    if (!supabase) return '로그인을 사용할 수 없어요.';
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return error.message;
    await supabase.auth.signOut().catch(() => {});
    return null;
  }, []);

  return { available, ready, user, signInWithGoogle, signInWithEmail, signOut, deleteAccount };
}

export type AuthApi = ReturnType<typeof useAuth>;
