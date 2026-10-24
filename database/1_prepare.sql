-- ============================================================
-- الخطوة 1: تجهيز قاعدة البيانات (آمن، يمكن تشغيله أكثر من مرة، لا يغلق شيئاً)
-- شغّله كاملاً مرة واحدة في Supabase ← SQL Editor
-- ============================================================

-- أ) حماية تسجيل الدخول من التخمين
create table if not exists public.login_attempts (
  id bigserial primary key, code text, ip text, ok boolean default false, at timestamptz default now());
create index if not exists la_code_at on public.login_attempts (code, at);
create index if not exists la_ip_at   on public.login_attempts (ip, at);

-- ب) شروط النجاح في الاختبارات
alter table public.exams add column if not exists pass_type  text default 'percent';  -- percent | mark
alter table public.exams add column if not exists pass_value numeric;

-- ج) قواعد الانتقال بين الليفلات
create table if not exists public.level_rules (
  id bigserial primary key, name text,
  from_level text not null, to_level text not null,
  exam_ids bigint[] not null default '{}',
  pass_mode text not null default 'all',      -- all | count
  min_count integer, min_avg numeric, min_att numeric,
  active boolean default true, created_at timestamptz default now());

-- د) إعداد القبول التلقائي للطلبات (0 = متوقف)
insert into public.rules(key, value) values ('auto_accept_requests', 0) on conflict (key) do nothing;

-- هـ) دالة تغيير كلمة مرور أي مستخدم (تُستدعى من البوابة للأدمن فقط)
create extension if not exists pgcrypto;
create or replace function public.admin_set_password(p_admin text, p_admin_pass text, p_target text, p_new text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare n int := 0; c int;
begin
  if coalesce(to_jsonb(public.login(p_admin, p_admin_pass))::text,'null') in ('null','{}') then return 'denied'; end if;
  if not exists (select 1 from public.staff where code = p_admin
                 and (role = 'admin' or 'admin' = any(coalesce(roles,'{}')))) then return 'denied'; end if;
  if coalesce(length(p_new),0) < 1 then return 'notfound'; end if;
  update public.students set password_hash = crypt(p_new, gen_salt('bf')) where code = p_target;
  get diagnostics c = row_count; n := n + c;
  update public.staff set password_hash = crypt(p_new, gen_salt('bf')) where code = p_target;
  get diagnostics c = row_count; n := n + c;
  return case when n > 0 then 'ok' else 'notfound' end;
end $$;

-- و) صلاحيات البوابة (service_role) على كل ما سبق
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';

-- فحص: كل القيم يجب أن تكون true
select
  to_regclass('public.login_attempts') is not null as login_attempts,
  to_regclass('public.level_rules')    is not null as level_rules,
  exists(select 1 from information_schema.columns where table_name='exams' and column_name='pass_value') as exams_pass_value,
  exists(select 1 from public.rules where key='auto_accept_requests') as auto_rule,
  to_regprocedure('public.admin_set_password(text,text,text,text)') is not null as admin_set_password;
