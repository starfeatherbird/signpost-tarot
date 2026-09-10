import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'tarot-counsel.theme.v1';

function readStored(): Theme {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * 시안 A(dark, 기본) / B(light) 전환. <html data-theme="..."> 에 반영되고 토큰만 바뀝니다.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStored());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, setTheme, toggle };
}
