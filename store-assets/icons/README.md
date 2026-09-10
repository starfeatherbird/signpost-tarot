# 이정표 앱 아이콘 (추천안 · 남색 배경)

모티프: 갈림길 표지판 — 기둥과 오른쪽 판은 아이보리 #F3EEE4, 왼쪽 판은 밝은 파랑 #8FB4E8, 판 위 작은 별은 #1D559C. 배경 #0F1A2E. 글자 없음, 플랫.

- app-icon-1024.png — iOS/스토어용 정사각 원본 (OS가 모서리를 자름)
- android-foreground-1024.png — 적응형 아이콘 전경 (투명, 모티프는 중앙 66% 안)
- android-background-1024.png — 적응형 아이콘 배경 (#0F1A2E 단색)
- maskable-512.png — PWA manifest `"purpose": "maskable"` (모티프는 중앙 80% 원 안)
- favicon-64.png — 투명 배경 아이보리 실루엣 / favicon-64-navy.png — 남색 배경판
- loading-symbol.svg — 앱 내 로딩 심볼, 단색 currentColor. 제안: 기둥 하단 축 ±6° 흔들림 2.4s ease-in-out 반복, prefers-reduced-motion 시 흔들림 없이 불투명도 맥동만
- preview-*.png — 검토용 미리보기

PWA manifest 예시:
```json
"icons": [
  { "src": "/icons/app-icon-1024.png", "sizes": "1024x1024", "type": "image/png" },
  { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```
