-- 호출 횟수 제한용 테이블과 함수
-- 실행: npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/rate_limit.sql
-- 서버 함수(tarot-reading)만 service role 로 접근합니다. anon/authenticated 는 접근할 수 없습니다.

create table if not exists public.tarot_rate_limits (
  key text primary key,                 -- 예: ip:<해시>:hour / ip:<해시>:day / global:day
  window_start timestamptz not null,
  count integer not null default 0
);

alter table public.tarot_rate_limits enable row level security;
-- 정책을 만들지 않으므로 service role 외에는 읽고 쓸 수 없습니다.

-- 한 번 호출할 때마다 해당 키의 횟수를 1 올리고, 한도 안인지 돌려줍니다. (창이 지났으면 새로 셉니다)
create or replace function public.tarot_rate_limit_hit(p_key text, p_window_seconds integer, p_limit integer)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_start timestamptz;
  v_count integer;
begin
  insert into public.tarot_rate_limits (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set count = case
          when public.tarot_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now then 1
          else public.tarot_rate_limits.count + 1
        end,
        window_start = case
          when public.tarot_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now then v_now
          else public.tarot_rate_limits.window_start
        end
  returning public.tarot_rate_limits.window_start, public.tarot_rate_limits.count into v_start, v_count;

  -- 오래된 행 정리 (표가 커지지 않게)
  delete from public.tarot_rate_limits where window_start < v_now - interval '3 days';

  return query select v_count <= p_limit, greatest(p_limit - v_count, 0), v_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.tarot_rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.tarot_rate_limit_hit(text, integer, integer) to service_role;
