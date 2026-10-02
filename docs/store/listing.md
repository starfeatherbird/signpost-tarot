# 이정표 — Play 스토어 등록 자료

Play Console → 스토어 등록정보에 붙여넣는 텍스트와 앱 콘텐츠 선언 답안. 차근차근(adhd-planner/store/listing.md)과 같은 구성.
패키지 `com.solamemento.signpost` · 개발자 솔라메멘토.

## 앱 이름 (30자 이내)

```
이정표 – 타로 상담, 고민 정리
```

## 짧은 설명 (80자 이내)

```
고민을 적고 카드 세 장을 뽑으면 AI가 먼저 할 일을 정리해 줘요. 타로 78장, 심층 상담, 상징 스톤, 돌아보기 기록장
```

## 전체 설명 (4000자 이내)

```
■ 이정표란?

고민이 막막할 때, 답을 점치는 대신 생각을 정리해 주는 타로 상담 앱이에요. 고민을 적고 섞인 덱에서 카드 세 장을 뽑으면, AI 상담사가 카드의 상징과 적어 주신 상황을 함께 읽어 먼저 고려할 방향과 오늘 할 수 있는 작은 행동을 제안합니다.

■ 상담은 이렇게 진행돼요

• 고민 적기 — 떠오르는 대로 편하게. 원하는 도움(마음 정리 · 선택지 비교 · 오늘 할 일)을 고르면 결과의 무게가 달라져요.
• 상황 확인 — 가장 지키고 싶은 것, 선택을 어렵게 하는 조건을 짧게 답해요.
• 카드 세 장 — 현재의 핵심 · 놓치고 있는 관점 · 다음 움직임. 메이저·마이너 아르카나 78장, 정방향과 역방향.
• 결과 — 먼저 제안드리는 방향, 이유, 다른 선택이 나은 경우, 지금 할 수 있는 일(체크리스트), 카드별 관점.

■ 심층 상담 (유료, 1회 단위)

선택지 2~3개의 이점과 부담 비교, 우선 제안이 적합한 조건, 실행 순서, 예상 장애물과 대응, 결과에 대한 추가 질문까지. 무료 결과에서 바로 이어서 진행할 수 있어요.

■ 상징 스톤과 돌아보기

• 결과마다 그날의 약속을 떠올리게 하는 상징 스톤 하나가 함께 와요(문스톤, 라피스 라줄리, 흑요석 등 19종). 모은 스톤은 내 공간에서 볼 수 있어요.
• 며칠 뒤 돌아볼 질문 — 상담 3일 뒤 기록장에서 "그 사이 실제로 확인된 것이 있었나요?" 같은 질문에 답하며 생각을 이어가요.

■ 기록장

저장한 상담은 기록장에 모이고, 결과를 다시 보거나 메모를 남기고 공유할 수 있어요. 기록은 이 기기에 저장되고, 로그인하면 다른 기기에서도 이어 볼 수 있어요.

■ 이런 분께

• 결정을 앞두고 생각이 정리되지 않는 분
• 타로를 좋아하지만 단정적인 점괘보다 실제 조언을 원하는 분
• 고민을 적어 두고 며칠 뒤 돌아보고 싶은 분

이정표의 결과는 참고용 제안이며 미래나 타인의 마음을 확정적으로 알려 주지 않아요. 전문 상담을 대신하지 않습니다. 화면 아래에 작은 배너 광고가 있고, 한 번 결제로 없앨 수 있어요.
```

## 출시 노트 (프로덕션 첫 출시)

```
<ko-KR>
이정표 첫 출시입니다.
• 고민을 적고 섞인 덱에서 카드 세 장을 뽑으면 AI가 먼저 고려할 방향과 작은 행동을 정리해 드려요.
• 메이저·마이너 아르카나 78장, 정·역방향 해석
• 심층 상담(1회 구매): 선택지 비교, 실행 순서, 예상 장애물, 추가 질문
• 상징 스톤과 며칠 뒤 돌아볼 질문, 기록장
• 로그인(Google·이메일 링크)하면 기록을 다른 기기에서도 이어 볼 수 있어요
• 화면 아래 배너 광고, 광고 제거 구매 가능
</ko-KR>
```

## 기타 입력값

| 항목 | 값 |
|---|---|
| 카테고리 | 라이프스타일 |
| 태그 | 타로 / 명상 및 마음챙김 / 자기계발 — 목록에 있는 것만 |
| 이메일 (공개) | support@solamemento.com |
| 전화번호 (공개) | 비워둠 |
| 웹사이트 | https://solamemento.com |
| 개인정보처리방침 URL | https://solamemento.com/signpost/privacy.html |
| 계정 삭제 안내 URL | https://solamemento.com/signpost/delete-account.html |

## 그래픽 자산 체크리스트

- [x] 앱 아이콘 512×512 — `docs/store/icon-512.png`
- [x] 그래픽 이미지 1024×500 — `docs/store/feature-graphic.png`
- [x] 휴대전화 스크린샷 1080×1920 6장 — `docs/store/phone-1~6-*.png` (`node scripts/make-store-shots.mjs`, 문구는 스크립트 FRAMES)
- [x] 7인치·10인치 태블릿 스크린샷 1620×2880 3장씩 — `docs/store/tablet7-*.png`, `tablet10-*.png` (같은 구성 1.5배)

## 앱 콘텐츠(App content) 선언 답안

| 항목 | 답변 |
|---|---|
| 개인정보처리방침 | https://solamemento.com/signpost/privacy.html |
| 앱 액세스 권한 | **일부 기능이 제한됨** — 로그인은 선택(기록 동기화·심층 상담 구매에만 필요). 아래 영어 안내문 + 검수용 계정 |
| 광고 | **예, 앱에 광고가 있습니다** |
| 광고 ID | **예** — 사용 목적: 광고 또는 마케팅, 분석, 사기 예방·보안·규정 준수 (AdMob SDK 가 AD_ID 권한 자동 병합) |
| 콘텐츠 등급 | 이메일 contact@solamemento.com / "다른 모든 앱 유형" → 폭력·성·약물 등 전 문항 아니요. "디지털 상품 구매" 예. "점성술·타로 등 운세" 문항이 있으면 **예**(엔터테인먼트 목적) |
| 타겟층 | **18세 이상** (타로·상담 특성상 성인 대상으로 선언) |
| 뉴스 앱 / 정부 앱 / 금융 기능 | 아니요 |
| 건강 | 해당 없음 (의료·정신건강 서비스가 아니라고 선언하지 않음 — 체크하지 않음) |
| 앱 카테고리 | 라이프스타일 / 연락처 support@solamemento.com |

### 로그인 세부정보 영어 안내문 (500자 이내)

```
The app is fully usable without an account: free readings, records and stones all work offline-first on the device. Signing in (Google or email magic link) is optional and only enables cloud sync of records across devices and purchasing the paid "deep reading". To sign in: tap "내 공간" (My space) in the bottom tab bar → "계정" (Account) → "Google로 계속하기" (Continue with Google) or enter an email to receive a magic link. No password, no two-factor authentication. The app shows a bottom banner ad; a one-time in-app purchase ("광고 제거") removes it. A consumable in-app purchase ("심층 상담 1회") unlocks one deep reading.
```

검수용 계정: Google 로그인은 심사자의 Google 계정으로 가능. 이메일 링크 방식은 검수자가 메일함을 못 보므로 Google 로그인을 안내.

## 데이터 보안(Data safety) 설문 답변

**데이터 수집: 예.** **데이터 공유: 예** (AdMob SDK → Google). 전송 중 암호화: 예(HTTPS). 삭제 요청 방법: 예(앱 내 계정 삭제 + 안내 페이지).

| 질문 | 답변 |
|---|---|
| 계정 생성 방법 | Google 계정(OAuth), 이메일(비밀번호 없음·링크) |
| 계정 삭제 요청 방법 제공 | 예 — 앱 내 "내 공간 → 계정 → 계정 삭제" + https://solamemento.com/signpost/delete-account.html |
| 계정 삭제 없이 데이터 일부/전체 삭제 (선택) | 예 — "내 공간 → 전체 기록 삭제"(기기+클라우드 기록 삭제, 계정 유지) |

수집 항목:

| 카테고리 | 데이터 유형 | 수집/공유 | 필수 여부 | 목적 | 근거 |
|---|---|---|---|---|---|
| 개인 정보 | 이메일 주소 | 수집 / 공유 안 함 | 선택(로그인 시) | 계정 관리 | Supabase 인증 |
| 개인 정보 | 사용자 ID | 수집 / 공유 안 함 | 선택(로그인 시) | 계정 관리, 앱 기능(구매 확인) | Supabase UUID, RevenueCat app user id |
| 앱 활동 | 기타 사용자 제작 콘텐츠 | **수집 / 공유 안 함** | **필수**(상담 요청 시) | 앱 기능 | 고민·답변 텍스트가 서버를 거쳐 AI(Anthropic/Google)로 전송 — 서비스 제공자(처리 위탁)이므로 "공유"는 아님. 서버는 본문을 저장하지 않음 |
| 앱 활동 | 기타 사용자 제작 콘텐츠 | 수집 / 공유 안 함 | 선택(로그인 시) | 앱 기능 | 기록 동기화 (상담 기록 전체) |
| 기기 또는 기타 ID | 기기 또는 기타 ID | 수집 / **공유** | 필수 | 광고 또는 마케팅, 분석, 사기 예방·보안·규정 준수 | AdMob: 광고 ID, App Set ID |
| 위치 | 대략적인 위치 | 수집 / 공유 | 필수 | 광고 또는 마케팅, 분석, 사기 예방·보안·규정 준수 | AdMob: IP 기반 |
| 앱 활동 | 앱 상호작용 | 수집 / 공유 | 필수 | 광고 또는 마케팅, 분석 | AdMob |
| 앱 정보 및 성능 | 진단 | 수집 / 공유 | 필수 | 분석, 사기 예방·보안·규정 준수 | AdMob |

- 구매 정보(구매 내역)는 Google Play 결제가 처리하므로 신고 대상 아님. RevenueCat 은 구매 검증 처리자(서비스 제공자).
- "종단간 암호화"는 아니오, "전송 중 암호화"만 예.
- 건강 정보 아니오, 비정상 종료 로그 아니오, 푸시 토큰 없음.
- AdMob 항목은 Google 공식 "AdMob SDK 데이터 공개" 문서 기준 — 입력 직전에 한 번 더 확인: developers.google.com/admob/android/privacy/play-data-disclosure

## 선행 체크리스트

- [x] solamemento.com/app-ads.txt (AdMob 게시자 pub-9884079525920738, 기존 파일 공용)
- [x] 개인정보처리방침·계정 삭제 안내 페이지 게시
- [x] AdMob 앱 ID·배너 단위 ID 반영 (`src/config/ads.ts`, strings.xml)
- [x] 인앱 상품 2개 (`deep_reading_1` 소모성, `remove_ads` 비소모성) 등록·활성화
- [x] RevenueCat 연결, 서버 시크릿 REVENUECAT_SECRET_KEY
- [x] 내부 테스트에서 심층 구매 → 결과 실측 (2026-10-02)
- [ ] 광고 제거 구매·복원 실측
- [ ] 앱 내 계정 삭제 실측
- [ ] AdMob 에서 앱을 스토어와 연결(출시 후 가능), 테스트 기기 등록
- [x] 스크린샷·그래픽 이미지 제작 (docs/store) → [ ] 등록정보 입력
- [ ] 앱 콘텐츠 선언 입력 → 프로덕션 검토 제출

## 스크린샷 문구 (`docs/store/phone-N-*.png`)

| # | 파일 | 헤드라인 | 부제 | 원본 화면 |
|---|---|---|---|---|
| 1 | phone-1-hero | 고민이 막막할 때, 카드가 방향을 보여 줘요 | 고민을 적고 세 장을 뽑으면 AI가 먼저 할 일을 정리해요 | 상담실 첫 화면 |
| 2 | phone-2-deck | 섞인 덱에서 세 장을 뽑아요 | 메이저·마이너 78장, 정방향과 역방향 | 카드 뽑기 |
| 3 | phone-3-reveal | 현재의 핵심, 놓친 관점, 다음 움직임 | 세 자리에 놓인 카드를 상황과 함께 읽어요 | 카드 공개 |
| 4 | phone-4-result | 먼저 할 일부터 작은 행동까지 | 단정 대신, 지금 상황에 맞는 제안과 체크리스트 | 결과(실제 AI 응답) |
| 5 | phone-5-stone | 약속을 떠올리게 하는 상징 스톤 | 며칠 뒤 돌아볼 질문으로 생각을 이어가요 | 결과 하단 |
| 6 | phone-6-space | 기록은 내 폰에, 로그인하면 어디서나 | 모은 스톤과 기록장 · 계정 없이도 바로 시작 | 내 공간 |

제작: `npm run dev` 켠 상태에서 `node scripts/make-capture-targets.mjs` → `node scripts/capture-screens.mjs` → `node scripts/make-store-shots.mjs`. 결과 화면에 실제 응답을 쓰려면 %TMP%/res-basic.txt 에 서버 응답을 두고 캡처합니다.
