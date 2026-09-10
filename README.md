# 이정표 — 타로 상담 앱 시제품

막막한 고민을 정리하고, 먼저 고려할 방향과 다음 행동을 제안하는 타로 상담 앱의 첫 시제품입니다.

- React + TypeScript + Vite, 서버 없이 실행
- 데이터는 브라우저 localStorage 에만 저장
- 상담 결과는 **모의(예시) 결과**입니다. 실제 분석 API 는 아직 연결하지 않았습니다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. 휴대폰에서 보려면 같은 Wi-Fi 에서 `npm run dev -- --host` 로 실행하고
터미널에 표시되는 Network 주소로 접속하세요.

자세한 구조·교체 지점은 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) 를 보세요.
