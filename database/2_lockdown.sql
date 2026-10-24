-- الخطوة 2 (الإغلاق): شغّله فقط بعد نجاح الدخول بأدمن ومحاضر وطالب من الموقع الجديد.
-- بعده لا يستطيع أي شخص (حتى لو معه مفتاح anon) قراءة أو تعديل أي جدول أو تشغيل أي دالة.
-- البوابة gw تعمل بمفتاح service_role السري فتتجاوز هذا الإغلاق وتطبّق الصلاحيات بنفسها.

-- 1) تفعيل RLS على كل الجداول بدون أي policy (= لا أحد غير service_role)
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 2) سحب كل الصلاحيات من الأدوار العامة (يشمل الـ views لأنها تتجاوز RLS)
revoke all on all tables    in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
revoke execute on all functions in schema public from anon, authenticated, public;

-- 3) منع أي جدول/دالة تُنشأ مستقبلاً من أن تُمنح للعامة تلقائياً
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- 4) إبقاء صلاحيات الخدمة (البوابة)
grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';

-- فحص: يجب أن يكون anon بلا أي صلاحية (النتيجة 0 صفوف في الاستعلامين)
select table_name, privilege_type from information_schema.role_table_grants
 where grantee in ('anon','authenticated') and table_schema = 'public';
select routine_name from information_schema.routine_privileges
 where grantee in ('anon','authenticated','PUBLIC') and routine_schema = 'public';
