-- طوارئ: يعيد الوضع المفتوح القديم (استخدمه فقط إن تعطل الموقع وتحتاج رجوعاً مؤقتاً، ثم أخبرني بالخطأ)
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
notify pgrst, 'reload schema';
