# 이정표 — 타로 상담 앱

막막한 고민을 적고 카드 세 장을 뽑으면, AI가 먼저 고려할 방향과 작은 행동을 정리해 주는 타로 상담 앱입니다.

- 웹: https://starfeatherbird.github.io/signpost-tarot/ (React + TypeScript + Vite, PWA)
- 안드로이드: Capacitor (`android/`), GitHub Actions 로 APK·AAB 빌드
- 해석: Supabase Edge Function 이 Claude(기본)·Gemini(후계) 를 호출, 카드 추첨은 앱이 무작위로
- 기록: 기기 저장 + 로그인 시 계정 동기화

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test
npm run build
```

자세한 구조와 운영 방법은 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), 서버는 [supabase/README.md](supabase/README.md) 를 보세요.
