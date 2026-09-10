import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { STORAGE_KEYS } from './config/appConfig';

// 개발 모드 전용: ?seed=<base64 JSON> 로 진행 중 상담 상태를 주입합니다. (화면 캡처·디자인 확인용)
// 예: http://localhost:5173/?seed=eyJzdGVwIjoi...  → 저장 후 주소에서 seed 를 지웁니다.
if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed) {
    try {
      const json = decodeURIComponent(escape(atob(seed)));
      JSON.parse(json); // 형식 확인
      window.localStorage.setItem(STORAGE_KEYS.draft, json);
    } catch (err) {
      console.warn('seed 를 읽지 못했어요', err);
    }
    params.delete('seed');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
