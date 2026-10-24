-- الخطوة C (اختيارية، بعد التأكد أن رفع الملفات يعمل من الموقع الجديد):
-- تمنع الرفع والحذف المباشر في تخزين الملفات بمفتاح anon. القراءة العامة للملفات (الطلاب) تبقى كما هي.
-- 1) اعرض السياسات الحالية أولاً:
select policyname, cmd, roles from pg_policies where schemaname = 'storage' and tablename = 'objects';
-- 2) احذف أي سياسة تسمح لـ anon/public بـ INSERT أو UPDATE أو DELETE على bucket: fille (بالاسم الظاهر في النتيجة أعلاه):
-- drop policy "اسم السياسة" on storage.objects;
-- ملاحظة: الـ bucket "fille" يجب أن يبقى Public حتى يفتح الطلاب الملفات.
