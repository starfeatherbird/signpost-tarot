-- 사용 기록 표 (비용·이용량 파악용). 고민 내용·결과 본문은 저장하지 않습니다.
-- 실행: npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/usage_log.sql

create table if not exists public.tarot_usage_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,                 -- basic / deep / followUp
  ok boolean not null,
  provider text,                      -- anthropic / gemini
  model text,
  prompt_version text,
  duration_ms integer not null default 0,
  error_kind text,                    -- 실패 종류 (rate_limited:ip-hour, model_unavailable, output …)
  fallback_count integer not null default 0,
  ip_hash text                        -- IP 원문이 아닌 짧은 해시
);

create index if not exists tarot_usage_log_created_at_idx on public.tarot_usage_log (created_at desc);

alter table public.tarot_usage_log enable row level security;
-- 정책을 만들지 않으므로 service role(서버 함수) 외에는 읽고 쓸 수 없습니다.

-- 일별 요약 뷰: select * from tarot_usage_daily order by day desc;
create or replace view public.tarot_usage_daily
with (security_invoker = true)
as
select
  (created_at at time zone 'Asia/Seoul')::date as day,
  kind,
  count(*) as calls,
  count(*) filter (where ok) as ok_calls,
  count(*) filter (where not ok) as failed_calls,
  round(avg(duration_ms) filter (where ok) / 1000.0, 1) as avg_seconds,
  count(distinct ip_hash) as users
from public.tarot_usage_log
group by 1, 2;

-- 프로젝트 설정 "Automatically expose new tables" 가 꺼져 있어 서버 함수 역할에 권한을 직접 줍니다.
grant insert, select on table public.tarot_usage_log to service_role;
grant usage, select on sequence public.tarot_usage_log_id_seq to service_role;
grant select on public.tarot_usage_daily to service_role;
