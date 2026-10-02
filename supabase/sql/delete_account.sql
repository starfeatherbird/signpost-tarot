-- 계정 삭제: 앱의 내 공간 → 계정 → 계정 삭제가 rpc('delete_my_account') 로 호출합니다.
-- 호출한 본인(auth.uid())의 기록·구매 사용 내역을 지우고 사용 기록표의 계정 식별자를 비운 뒤 계정을 삭제합니다.
-- 실행: npx supabase db query --linked --project-ref fvtarvatvqcozsrfetbf -f supabase/sql/delete_account.sql

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tarot_records where user_id = auth.uid();
  delete from public.tarot_deep_uses where user_id = auth.uid();
  update public.tarot_usage_log set user_id = null where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
