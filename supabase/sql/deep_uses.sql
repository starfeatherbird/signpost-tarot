-- 심층 상담 구매(RevenueCat 거래) 를 어느 상담에 썼는지 기록합니다. 서버 함수(service role)만 읽고 씁니다.
-- 실행: npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/deep_uses.sql

create table if not exists public.tarot_deep_uses (
  user_id uuid not null,
  consultation_id text not null,
  transaction_id text not null,            -- RevenueCat non_subscriptions[].id
  created_at timestamptz not null default now(),
  primary key (user_id, consultation_id),
  unique (user_id, transaction_id)
);

alter table public.tarot_deep_uses enable row level security;
-- 정책 없음: service role 외 접근 불가
grant select, insert on table public.tarot_deep_uses to service_role;
