import { useEffect, useState } from 'react';

/** 브라우저의 연결 상태. 서버 분석을 시작하기 전에 안내하는 용도이며, 실제 실패 처리는 분석 서비스가 맡습니다. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
