# 개발 문서 — 이정표 (타로 상담 앱 시제품)

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # 타입 검사
npm test           # vitest (카드 중복 방지·선택 유지·저장 복원)
npm run build      # dist/ 생성 (정적 파일, 서버 불필요)
```

## 폴더 구조와 책임 분리

| 위치 | 책임 |
| --- | --- |
| `src/config/appConfig.ts` | 앱 이름·버전·글자 수 제한·저장 키·모의 지연 시간 |
| `src/styles/tokens.css` | 디자인 토큰 (시안 A dark 기본 / B light, `data-theme` 로 전환). 값은 `이정표 시안 디자인.zip` 의 README 그대로 |
| `src/styles/global.css` | 전체 스타일 (클래스 기반, 컴포넌트 CSS 없음) |
| `src/domain/types.ts` | 카드·질문·답변·결과·기록 타입 |
| `src/data/cards.ts` | **카드 기준 데이터** 22장 (이름·의미·자리별 관점·행동·이미지 경로) |
| `src/data/positions.ts` | 세 자리(현재의 핵심 / 놓치고 있는 관점 / 다음 움직임) |
| `src/services/deck.ts` | **카드 추첨** (중복 없는 셔플, 덱 검증) |
| `src/services/questions.ts` | **상황 확인 질문 제공** (`QuestionProvider` 인터페이스, 기본·심층 두 제공자) |
| `src/config/products.ts` | 상담 상품(무료 기본 / 유료 심층) 문구·제공 내용·체험 횟수 |
| `src/services/analysis/` | **상담 결과 생성** (`AnalysisService` 인터페이스 + 모의 구현) |
| `src/services/storage.ts` | localStorage 안전 래퍼 (손상·실패 처리) |
| `src/services/records.ts` | **기록 저장** (중복 방지 upsert, 메모, 삭제) |
| `src/state/session.ts` | 진행 중인 상담 상태(reducer) + 임시 보관/복구 |
| `src/state/useRecords.ts` | 기록 목록 훅 |
| `src/components/` | 카드 앞/뒷면, 결과 본문(ReadingView), 확인 대화상자, 하단 메뉴 |
| `src/screens/` | **결과 화면 표시** 등 화면 (counsel / records / space) |

## 카드 이미지 (자동 연결)

카드 앞면은 **그림 + FRONT.png 틀 + Cinzel 영문 제목** 세 겹으로 화면에서 합성됩니다. 별도 합성 파일을 만들 필요가 없습니다.

1. 원본 PNG 는 `app/card_asset/` 폴더에 둡니다. (`FRONT.png`, `BACK.png`, `TOWER.png`, `HIGH PRIESTESS.png` …)
2. `npm run dev` / `npm run build` 를 실행하면 `scripts/sync-cards.mjs` 가 먼저 돌아
   바뀐 파일만 **폭 810px WebP(품질 85)** 로 줄여 `public/cards/` 에 넣습니다. (1.5MB PNG → 100KB 안팎)
   파일명은 소문자 + 공백→하이픈 (`high-priestess.webp`). 수동 실행: `npm run cards`
   폭·품질은 스크립트 위쪽의 `MAX_WIDTH`, `QUALITY` 로 조절합니다.
3. 앱은 카드 ID 와 같은 이름의 파일을 `.webp` → `.png` 순서로 자동으로 찾습니다. (`src/data/cardAssets.ts`)
   - 그림이 아직 없는 카드(JUDGEMENT, WORLD)는 틀 안에 임시 상징이 표시됩니다.
   - 틀(front) 파일이 없으면 예전 SVG 임시 디자인으로 돌아갑니다.
   - 축소 도구(sharp)를 불러올 수 없는 환경에서는 PNG 그대로 복사되며, 앱은 `.png` 로 자동 대체합니다.
4. 특정 카드만 다른 파일을 쓰려면 `src/data/cards.ts` 의 `image` 필드에 경로를 적습니다.

배치 수치(틀 805×1293 기준)는 `FRAME_LAYOUT` 에 있습니다: 그림 712×1072 를 투명 구멍 중앙에, 제목은 명판 중심(y 1195),
글자 크기 44pt(카드 너비의 7.29%). 글꼴은 index.html 에서 Google Fonts 의 Cinzel 을 불러오며, 오프라인이면 시스템 세리프로 대체됩니다.

`public/cards/` 는 생성물이므로 지워도 됩니다. 다음 실행 때 다시 만들어집니다.

## 무료 기본 상담 / 유료 심층 상담

- 상품 정보(이름·설명·제공 내용·체험 안내 문구)는 `src/config/products.ts` 한 곳에 있습니다. **가격과 이용 횟수는 미정이라 적지 않습니다.**
  `DEEP_FOLLOWUP_TRIAL_COUNT`(추가 질문 체험 횟수, 기본 1)는 시제품 체험용 값이며 실제 상품 한도가 아닙니다.
- 흐름
  - 무료: 상품 선택 → 고민 입력 → 상황 확인 2문항 → 카드 3장 → 기본 결과
  - 심층(처음부터): 상품 선택 → 체험 안내 → 고민 입력 → 상황 확인 → 심층 질문 3문항(선택지 2~3개·기준·제약) → 카드 3장 → 심층 결과
  - 무료 결과에서 전환: "이 고민을 더 자세히 살펴보기" → 체험 안내 → 심층 질문 → (같은 카드로) 심층 결과. 무료 결과는 보존됩니다.
- 결제·카드 입력·결제 완료 화면·구독은 없습니다. 체험 안내 화면(`DeepIntroStep`)이 결제 자리를 대신하며,
  체험은 구매나 유료 권한으로 기록되지 않습니다.
- 결과 형식: 기본 `ReadingResult`, 심층 `DeepReadingResult`(기본 + `criteriaSummary`, `comparisons`, `fitConditions`, `executionSteps`, `obstacles`).
- 두 기능의 구분
  - **상황 보충하기**: 잘못 이해한 상황·빠진 조건을 적고 같은 카드로 결과를 다시 생성 (`analyze` / `analyzeDeep` 재호출)
  - **결과에 대해 더 묻기**(심층 전용): 결과를 다시 만들지 않고 질문·응답을 덧붙임 (`askFollowUp`)
- 기록(`ConsultationRecord`)에는 `plan`, `result`, `deepResult`, `followUps`, `isSample` 이 함께 저장됩니다.
  기록을 다시 열면 저장 당시 내용을 그대로 보여 주고, 기본·심층 결과가 모두 있으면 전환해 볼 수 있습니다.

## 실제 분석 서비스 연결 (구현됨)

- 서버: `supabase/functions/tarot-reading` (Supabase Edge Function). 배포·시크릿·모델 교체 방법은 [supabase/README.md](../supabase/README.md).
- 앱: `.env` 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 가 있으면 `src/services/analysis/index.ts` 가
  `remoteAnalysisService` 를, 없으면 `mockAnalysisService` 를 씁니다. 화면은 `isRemoteAnalysis` 로 안내 문구만 바꿉니다.
- 세 함수(`analyze` / `analyzeDeep` / `askFollowUp`)가 각각 요청 `kind` = `basic` / `deep` / `followUp` 으로 같은 함수를 호출합니다.
- 카드 추첨은 앱이 무작위로 하고(`services/deck.ts`), 서버는 해석만 맡습니다. 결과에는 `source`(제공자·모델·프롬프트 버전·전환 이력)가 붙어 기록에 저장됩니다.
- 카드 데이터를 고치면 `npm run server:data` 로 `_shared/cards.json` 을 다시 만들고 함수를 재배포합니다.

### 보안 규칙 (중요)

- 생성형 분석 API 의 비밀 키를 **프런트엔드 코드나 `.env` 로 번들에 넣지 마세요.** Vite 의 `VITE_` 변수는
  브라우저에 그대로 노출됩니다. anon 키만 예외(공개용)입니다.
- 흐름은 `브라우저 → Edge Function → 분석 API` 이고, 키는 Supabase 시크릿에만 둡니다.
- 서버가 프롬프트 구성(카드 의미 + 상담 태도 규칙)과 응답 정규화(`isSample: false`)를 맡습니다.

### 질문 생성도 같은 방식

`src/services/questions.ts` 의 `questionProvider` 를 서버 호출 구현으로 바꾸면, 고민을 읽고 필요한 질문만 만들거나
질문을 생략(빈 배열 반환 → 자동으로 카드 선택으로 이동)할 수 있습니다. (아직 미구현)

## 저장 규칙

- 기록: `localStorage['tarot-counsel.records.v1']` — `ConsultationRecord[]`
- 임시 보관(진행 중 상담): `localStorage['tarot-counsel.draft.v1']` — `SessionState`
- 같은 상담(`consultationId`)은 한 번만 저장되고, 결과가 바뀌면 "기록 업데이트"로 같은 기록을 갱신합니다.
- 손상된 데이터는 무시하고 새 상태로 시작합니다. 저장 실패는 `StorageResult` 로 화면에 그대로 알립니다.

## 디자인 시안 반영 (2026-09-10)

- 시안 패키지: `이정표 시안 디자인.zip` (design_handoff_ijeongpyo/README.md 가 최종값). 색·글자·간격·모서리·그림자를 `tokens.css` 에 그대로 옮겼고, 화면 구조는 README 의 14개 화면 명세를 따릅니다.
- 테마: 기본 어두운(A). 내 공간 → "화면 테마" 행에서 밝은(B)로 바꿀 수 있고 `localStorage['tarot-counsel.theme.v1']` 에 저장됩니다. 구조는 같고 토큰만 바뀝니다.
- 시안에서 새로 들어온 동작: 진행 막대, 자리 카드 3종 상태, "지금 할 수 있는 일" 체크(기록에 저장), 저장 후 "저장됨" 태그 + 토스트, 새 상담 대화상자 3버튼(저장하고 새 상담 / 저장 없이 시작 / 취소), 호출 제한 안내(고민 입력 화면), 선택지 비교의 "우선 제안" 표시(`recommendedOption`), 실행 순서 타임라인, 추가 질문 말풍선.
- 아이콘은 이미지 없이 CSS 도형, 글꼴은 Pretendard(jsdelivr) + Cinzel(카드명만).

## 기록 내보내기·가져오기

- 내 공간 → "기록 파일로 저장": 기록 전체를 JSON(`이정표-기록-날짜.json`)으로 저장합니다. 휴대폰에서 파일 공유가 되면 공유 창, 아니면 내려받기.
- "파일에서 불러오기": 같은 형식 파일을 읽어 기존 기록과 합칩니다. 같은 id 는 더 최근에 수정된 쪽을 남깁니다(`mergeRecords`).
- 형식은 `services/records.ts` 의 `RecordsExport`(`format: 1`). 나중에 계정 동기화를 붙일 때 이 파일로 옮길 수 있습니다.

## 카드 방향 (정방향·역방향)

- 상담을 시작할 때 덱을 섞으면서 카드마다 역방향 여부를 정해 세션(`reversedIds`)에 저장합니다. 확률은 `appConfig.ts` 의 `REVERSED_RATE`(기본 0.4). 새로고침·재시도로 바뀌지 않습니다.
- 뽑힌 카드(`DrawnCard.reversed`)에 방향이 붙어 결과·기록에 함께 저장됩니다. 예전 기록에는 없으므로 정방향으로 취급합니다.
- 카드 데이터(`src/data/cards.ts`)에 `reversedEssence`, `reversedKeywords` 가 있습니다. 서버 프롬프트(counsel-v3)는 역방향을 "나쁜 카드"가 아니라 힘이 막히거나·지나치거나·안으로 향한 상태로 읽도록 지시하고, 이름 뒤에 "(역방향)"을 붙입니다.
- 화면에서는 카드 전체를 180도 돌려 보여 주고 "역방향" 태그를 붙입니다(`CardFace` 의 `reversed`).
- 골든 세트에서는 카드 ID 뒤에 `!` 를 붙이면 역방향입니다 (`"tower!"`).

## 상징 스톤 · 이후 돌아보기

- 스톤 목록은 `src/data/stones.ts`(12종, 색·상징·어울리는 상황·설명). 서버에는 `npm run server:data` 로 `_shared/stones.json` 을 내보냅니다. 스톤은 행동을 떠올리게 하는 상징물이며 효능을 말하지 않습니다.
- 결과(`ReadingResult`)에 `stone{stoneId, promise}` 와 `reflectionQuestion` 이 붙습니다(프롬프트 counsel-v4, 모의 분석도 생성). 예전 결과에는 없으므로 화면은 있을 때만 보여 줍니다.
- 결과 화면: 패널 4 뒤에 스톤 패널, 마지막에 "며칠 뒤 돌아볼 질문". 기록장: 저장 `REFLECTION_AFTER_DAYS`(3일) 뒤부터 "돌아볼 때" 태그, 기록 상세의 메모 칸이 그 질문의 답이 됩니다(`followUpMemo` 그대로 사용, 답이 있으면 "돌아봄"). 상태 계산은 `services/reflection.ts`.
- 내 공간 "모은 스톤": 저장된 기록의 스톤을 모아 12종 중 만난 돌만 색으로 보여 줍니다. 보석 그림은 `components/StoneGem.tsx`.

## 화면 캡처 (디자인 시안·문서용)

- `npm run dev` 를 켠 상태에서 `node scripts/make-capture-targets.mjs` 로 화면별 상태 목록을 만든 뒤 `npm run capture` → `docs/screens/A01~A14, B01~B10.png` (375px, 2배 해상도, 전체 페이지, 어두운/밝은 테마). Chrome 필요. 이름 일부를 인자로 주면 그 화면만 찍습니다: `node scripts/capture-screens.mjs A09`
- 개발 모드 전용 `?seed=<base64 JSON>` 로 상담 상태를 주입해 특정 단계를 바로 열 수도 있습니다 (`src/main.tsx`).

## 골든 세트 (상담문 품질 비교)

- `eval/golden-set.json` 에 대표 고민 8개(답변·고정 카드·심층 데이터)가 있습니다. 자유롭게 고쳐 쓰세요.
- `npm run golden -- --label v1` → 배포된 서버에 전부 보내 `eval/runs/<날짜>-v1/*.md` 와 `summary.md` 로 저장 (실제 AI 비용 발생, 케이스당 25초 안팎).
  `--deep` 을 붙이면 심층 데이터가 있는 케이스는 심층으로, `--only <id>` 로 하나만 실행합니다.
- 프롬프트(`supabase/functions/_shared/prompt.ts`)나 후보 모델을 바꾼 뒤 다른 label 로 다시 돌려 두 폴더를 나란히 읽어 비교합니다. 결과 폴더는 git 에 넣지 않습니다.

## 모의 분석 동작 확인 팁

- `src/config/appConfig.ts` 의 `MOCK_ANALYSIS_FAILURE_RATE` 를 `0.5` 로 올리면 실패·재시도 흐름을 볼 수 있습니다.
- `MOCK_ANALYSIS_DELAY_MS` 로 대기 시간을 조절합니다.
