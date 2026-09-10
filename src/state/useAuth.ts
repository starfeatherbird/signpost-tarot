import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
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
 * - Google: OAuth 로 이동했다가 돌아옵니다.
 * - 이메일: 비밀번호 없이 메일의 링크로 로그인합니다.
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

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    if (!supabase) return '로그인을 사용할 수 없어요.';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl() } });
    return error ? error.message : null;
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

  return { available, ready, user, signInWithGoogle, signInWithEmail, signOut };
}

export type AuthApi = ReturnType<typeof useAuth>;
