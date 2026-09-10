# 서버 함수 (Supabase Edge Function) — tarot-reading

앱은 카드를 무작위로 뽑고, **해석만** 이 함수가 AI 에게 맡깁니다. AI API 키는 Supabase 시크릿에만 있습니다.

```
supabase/functions/
  tarot-reading/index.ts      요청 검증 → 프롬프트 → 후보 모델 순서대로 시도 → JSON 검증 → 응답
  _shared/
    registry.ts               모델 후보 목록 + 자동 후계 전환 (TAROT_MODELS)
    prompt.ts                 상담 태도 규칙(system) + 요청별 메시지, PROMPT_VERSION
    schema.ts                 응답 JSON 형식 (Anthropic 구조화 출력 / Gemini responseSchema)
    validate.ts               응답 정규화. 형식이 어긋나면 다음 후보로
    providers/anthropic.ts    Claude 호출 (@anthropic-ai/sdk)
    providers/gemini.ts       Gemini 호출 (REST, 모델 자동 선택)
    cards.json                카드 데이터 (npm run server:data 로 src/data/cards.ts 에서 생성)
    types.ts                  앱과 공유하는 형식의 복사본
```

## 배포 (프로젝트: signpost-tarot, ref `fvtarvatvqcozsrfetbf`)

프로젝트 ref 는 package.json 의 `server:*` 스크립트에 고정되어 있어 `supabase link` 가 필요 없습니다.

1. **시크릿 설정** (AI 키는 여기에만 둡니다. 둘 중 하나만 있어도 동작하고, 키가 없는 제공자는 건너뜁니다.)

   ```bash
   npm run server:secrets -- ANTHROPIC_API_KEY=sk-ant-... GEMINI_API_KEY=AIza...
   ```

2. **배포** — 코드나 카드 데이터를 고칠 때마다

   ```bash
   npm run server:deploy
   ```

3. **로그 보기**: 대시보드 → Edge Functions → tarot-reading → Logs (`npm run server:logs` 가 주소를 출력합니다).
   모든 후보가 실패하면 앱에는 안내 문구만 보이고, 응답 JSON 의 `detail` 배열에 "어느 후보가 왜 실패했는지"가 담깁니다(키 값은 포함되지 않음).

4. **앱 연결**: `app/.env` 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`(공개용 anon 키) 가 들어 있습니다.
   두 값이 없으면 앱은 자동으로 모의(예시) 결과로 동작합니다. `.env` 는 git 에 올리지 않습니다.

## 모델 바꾸기·은퇴 대비

후보 목록은 시크릿 `TAROT_MODELS` 로 정합니다. 앞이 1순위이고, 실패하면 다음으로 넘어갑니다.

```bash
npm run server:secrets -- TAROT_MODELS="anthropic:claude-sonnet-5,gemini:auto,anthropic:claude-sonnet-4-6"
```

- 형식: `제공자:모델` 을 쉼표로 나열. 제공자는 `anthropic` / `gemini`.
- `gemini:auto` 는 키로 쓸 수 있는 flash 계열 최신 모델을 자동 선택합니다.
- 시크릿만 바꾸면 되고 함수·앱을 다시 배포할 필요가 없습니다. 값이 없으면 `registry.ts` 의 `DEFAULT_CANDIDATES` 를 씁니다.
- 넘어간 이유는 함수 로그(대시보드 → Edge Functions → Logs)에 `candidate failed …` / `fallback → …` 로 남고,
  결과의 `source.fallbackFrom` 에도 담겨 기록에 저장됩니다.
- 신모델이 나오면: 1순위에 새 모델을 넣고, 기존 모델을 2순위로 내려 잠시 두었다가 지웁니다.
  프롬프트 문구를 바꿨다면 `prompt.ts` 의 `PROMPT_VERSION` 을 올려 기록에서 구분되게 합니다.

## 프롬프트 버전

- counsel-v1: 초기 규칙 · v2: 행동 개인화, 전문가 권유 축소, 카드 주어 문장 축소, 적합 조건 구분 · v3: 정·역방향 해석 규칙 추가 · **v4(현재)**: 상징 스톤(`stone`, 목록은 `_shared/stones.json`)과 며칠 뒤 돌아볼 질문(`reflectionQuestion`) 추가. 둘 다 없어도 결과를 버리지 않습니다.
- 문구를 바꾸면 `_shared/prompt.ts` 의 `PROMPT_VERSION` 을 올리고 `npm run golden` 으로 전후를 비교하세요.

## 응답 시간·비용 (2026-09-10 실측, Claude Sonnet 5, effort low)

| 요청 | 시간 |
| --- | --- |
| 기본 상담 | 20~25초 |
| 심층 상담 | 30~35초 |
| 추가 질문 | 10초 안팎 |
| Gemini flash 로 전환 시 기본 상담 | 9초 |

- `providers/anthropic.ts` 의 `effort`(생각 깊이)는 `low` 입니다. `medium` 이상으로 올리면 심층 상담이 1분을 훌쩍 넘습니다(high 로 103초 측정).
- 앱의 서버 대기 시간은 150초(`remoteAnalysisService.ts`)입니다.
- Gemini `auto` 는 목록에서 flash → pro 순으로 고르되, 다른 API 전용(omni)·실험·경량 모델은 제외하고, 골라 둔 모델이 거부(404/400)되면 다음 모델로 넘어가 성공한 모델을 기억합니다.

## 로컬에서 확인할 수 있는 것

- `npm test` : 후보 전환 로직, 프롬프트 구성, 스키마, 응답 정규화 (Node 에서 실행, API 호출 없음)
- 실제 AI 호출은 배포 후 앱에서 확인합니다. 이 PC 에는 Deno/Docker 가 없어 `supabase functions serve` 는 쓰지 않습니다.

## 호출 횟수 제한

함수는 로그인 없이 anon 키로 호출되므로 IP 기준 한도와 전체 합계 한도를 둡니다 (`_shared/rateLimit.ts`).

| 한도 | 기본값 | 시크릿 |
| --- | --- | --- |
| IP 별 시간당 | 20회 | `TAROT_LIMIT_IP_HOUR` |
| IP 별 하루 | 60회 | `TAROT_LIMIT_IP_DAY` |
| 전체 하루 (비용 보호) | 300회 | `TAROT_LIMIT_GLOBAL_DAY` |

- 횟수는 테이블 `tarot_rate_limits` 에 기록되며 RPC `tarot_rate_limit_hit` 로만 갱신됩니다. 둘 다 service role 전용이라 앱(anon)에서는 접근할 수 없습니다.
  테이블·함수 생성: `npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/rate_limit.sql` (한 번만)
- IP 는 원문 대신 짧은 해시로 저장합니다. 3일 지난 행은 자동 정리됩니다.
- 넘으면 429 와 안내 문구(`error`), `retryAfterSeconds` 를 돌려주고 앱은 그 문구를 그대로 보여 줍니다. 막힌 요청도 횟수에 포함됩니다.
- 기록 테이블에 문제가 생기면(예: 테이블 미생성) 로그만 남기고 요청을 통과시킵니다. 앱이 멈추지 않게 하기 위한 선택이니, 대시보드 로그에 `rate limit check failed` 가 보이면 SQL 을 다시 실행하세요.
- 한도를 바꾸려면 시크릿만 바꾸면 됩니다: `npm run server:secrets -- TAROT_LIMIT_IP_DAY=100`

## 사용 기록 (비용·이용량 파악)

상담 한 건마다 `tarot_usage_log` 표에 한 줄을 남깁니다: 종류(basic/deep/followUp), 제공자·모델·프롬프트 버전, 소요 시간, 성공 여부·실패 종류, 전환 횟수, IP 해시. **고민 내용·결과는 저장하지 않습니다.**

- 표 생성(한 번): `npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/usage_log.sql`
- 보는 곳: 대시보드 → Table Editor → `tarot_usage_log`, 또는 SQL Editor 에서 `select * from tarot_usage_daily order by day desc` (일별 건수·평균 시간·실패 수 뷰)
- 표가 없어도 상담은 정상 동작하고 로그에 `usage log failed` 만 남습니다.
- 이 프로젝트는 "Automatically expose new tables" 를 꺼 두었으므로, 새 표를 만들면 서버 함수 역할에 `grant … to service_role` 을 직접 줘야 합니다(SQL 파일 끝 참고). 안 주면 조용히 실패합니다.
- 비용 어림: Sonnet 5 기준 기본 상담 1건 ≈ 15~25원, 심층 ≈ 30~45원 수준(입력·출력 토큰에 따라 다름). 월 건수 × 단가로 잡으면 됩니다.

## 주의

- 요청 본문은 길이 제한을 두고 필요한 필드만 추립니다 (`index.ts` 의 `parseRequest`).
