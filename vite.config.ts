import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 처럼 하위 경로에 올릴 때 VITE_BASE_PATH="/저장소이름/" 로 지정합니다. (기본 '/')
const base = process.env.VITE_BASE_PATH ?? '/';

/**
 * 오프라인 대비 서비스 워커 (빌드 때만 생성, 개발 서버에서는 꺼져 있음).
 * - 앱 껍데기(js/css/html/아이콘)는 미리 저장해 연결이 없어도 기록장이 열립니다.
 * - 카드 이미지는 한 번 본 것만 저장(CacheFirst), 글꼴은 Google Fonts 응답을 저장합니다.
 * - 새 배포는 다음 방문 때 자동 반영(autoUpdate). 매니페스트는 public/manifest.webmanifest 를 그대로 씁니다.
 */
const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  manifest: false,
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
    navigateFallback: `${base}index.html`,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.includes('/cards/'),
        handler: 'CacheFirst',
        options: { cacheName: 'card-images', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 90 } },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://cdn.jsdelivr.net',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'font-styles', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
        handler: 'CacheFirst',
        options: { cacheName: 'font-files', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
      },
    ],
  },
});

export default defineConfig(({ mode }) => ({
  base,
  plugins: [react(), ...(mode === 'test' ? [] : [pwa])],
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
  },
}));
