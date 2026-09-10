-- 로그인한 사용자의 상담 기록 (기기 간 동기화용).
-- 실행: npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/records.sql
-- 이 프로젝트는 "새 테이블 자동 노출"이 꺼져 있어 grant 를 직접 줘야 합니다.

create table if not exists public.tarot_records (
  id text primary key,                        -- 앱에서 만든 기록 id (기기에서 만든 것을 그대로 씀)
  user_id uuid not null references auth.users (id) on delete cascade,
  consultation_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,                     -- 삭제 표시(묘비). 다른 기기가 되살리지 않도록 행을 남깁니다.
  data jsonb not null                         -- ConsultationRecord 전체
);

create index if not exists tarot_records_user_idx on public.tarot_records (user_id, updated_at desc);

alter table public.tarot_records enable row level security;

drop policy if exists "own records select" on public.tarot_records;
drop policy if exists "own records insert" on public.tarot_records;
drop policy if exists "own records update" on public.tarot_records;
drop policy if exists "own records delete" on public.tarot_records;

create policy "own records select" on public.tarot_records for select to authenticated using (user_id = auth.uid());
create policy "own records insert" on public.tarot_records for insert to authenticated with check (user_id = auth.uid());
create policy "own records update" on public.tarot_records for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own records delete" on public.tarot_records for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on table public.tarot_records to authenticated;

-- 사용 기록표에 사용자 id 를 추가 (로그인한 요청만 채워짐)
alter table public.tarot_usage_log add column if not exists user_id uuid;
