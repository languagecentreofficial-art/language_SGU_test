// =====================================================================
//  gw : بوابة الأمان الوحيدة بين الموقع وقاعدة البيانات
//  - المتصفح لا يملك أي مفتاح للجداول، وكل الطلبات تمر من هنا بتوكن موقّع
//  - مفتاح service_role يبقى سرّاً داخل Supabase ولا يظهر في GitHub أبداً
//  أسرار مطلوبة (Edge Functions → Secrets):
//    SESSION_SECRET   نص عشوائي طويل (32+ حرف)
//    ALLOWED_ORIGINS  مثل https://username.github.io  (يمكن أكثر من واحد بفاصلة)
//  وSUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY موجودان تلقائياً.
//  مهم: عطّل خيار "Verify JWT" لهذه الدالة (التحقق يتم بتوكن الجلسة هنا).
// =====================================================================
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET = Deno.env.get('SESSION_SECRET') || '';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((s: string) => s.trim().replace(/\/$/, '')).filter(Boolean);
const BUCKET = 'fille';
const ADM = ['admin', 'assistant', 'affairs'];
const enc = encodeURIComponent;
const te = new TextEncoder();

// ---------- جداول مسموحة للإدارة (أي جدول غير مذكور يُرفض) ----------
const ADMIN_TABLES = new Set(['students', 'staff', 'slots', 'enrollments', 'attendance', 'change_requests', 'complaints', 'announcements',
  'notifications', 'grades', 'exams', 'rules', 'blocks', 'day_rules', 'level_rules', 'content_folders', 'content_items',
  'v_study_counts', 'v_slot_counts', 'v_rule_violations', 'v_level_mismatch', 'v_day_study']);

// ---------- الأعمدة المسموح قراءتها لغير الإدارة (تشمل الجداول المضمّنة embed) ----------
type Cols = string[] | '*';
const SCOLS = ['code', 'name', 'phone', 'college', 'level', 'study_level', 'section', 'place'];
const STU: Record<string, Cols> = { students: SCOLS, staff: ['name'], enrollments: '*', slots: '*', attendance: '*', grades: '*', exams: '*', complaints: '*',
  change_requests: '*', announcements: '*', rules: '*', blocks: '*', notifications: '*', content_folders: '*', content_items: '*' };
const LEC: Record<string, Cols> = { students: SCOLS, staff: ['code', 'name', 'phone'], enrollments: '*', slots: '*', attendance: '*',
  change_requests: '*', rules: '*', notifications: '*', content_folders: '*', content_items: '*' };

// ---------- أدوات عامة ----------
const allowOrigin = (req: Request) => {
  const o = (req.headers.get('origin') || '').replace(/\/$/, '');
  return !ORIGINS.length ? '*' : ORIGINS.includes(o) ? o : ORIGINS[0];
};
const cors = (req: Request) => ({ 'Access-Control-Allow-Origin': allowOrigin(req), 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-st', 'Access-Control-Max-Age': '86400' });
const J = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const E = (req: Request, status: number, message: string, code?: string) => J(req, { message, code }, status);
const DENY = 'غير مسموح بهذه العملية';

const b64u = (b: Uint8Array | ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(data: string) {
  const k = await crypto.subtle.importKey('raw', te.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, te.encode(data)));
}
const sign = async (p: unknown) => { const a = b64u(te.encode(JSON.stringify(p))); return a + '.' + await hmac(a); };
async function verify(t: string) {
  const [a, s] = (t || '').split('.'); if (!a || !s || !SECRET) return null;
  const e = await hmac(a); if (e.length !== s.length) return null;
  let d = 0; for (let i = 0; i < e.length; i++) d |= e.charCodeAt(i) ^ s.charCodeAt(i); if (d) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(a.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

// ---------- الاتصال بـ PostgREST بمفتاح الخدمة ----------
const hdr = (extra: Record<string, string> = {}) => ({ apikey: SRK, ...(SRK.startsWith('eyJ') ? { Authorization: 'Bearer ' + SRK } : {}), ...extra });
const pg = (path: string, method = 'GET', body?: unknown, prefer?: string, extra: Record<string, string> = {}) =>
  fetch(URL_ + '/rest/v1/' + path, { method, headers: hdr({ 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}), ...extra }),
    body: body === undefined || body === null ? undefined : JSON.stringify(body) });
async function pgj(path: string) { const r = await pg(path); const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : []; }
async function cnt(path: string) {
  const r = await pg(path, 'GET', undefined, 'count=exact', { 'Range-Unit': 'items', Range: '0-0' });
  await r.text(); return +((r.headers.get('content-range') || '/0').split('/')[1]) || 0;
}
const notifyRows = (codes: string[], title: string, body: string) => codes.length ? pg('notifications', 'POST', codes.map(c => ({ target_code: c, title, body })), 'return=minimal') : Promise.resolve();

const clean = (x: any, perms: boolean): any => Array.isArray(x) ? x.map(i => clean(i, perms)) :
  x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'password_hash' && (perms || k !== 'perms')).map(([k, v]) => [k, clean(v, perms)])) : x;

// ---------- فحص select (يمنع قراءة أعمدة حساسة بالتضمين) ----------
function splitTop(s: string) { const o: string[] = []; let d = 0, c = ''; for (const ch of s) { if (ch == '(') d++; if (ch == ')') d--; if (ch == ',' && d == 0) { o.push(c); c = ''; } else c += ch; } if (c) o.push(c); return o; }
function checkSel(sel: string, table: string, M: Record<string, Cols>): boolean {
  const cols = M[table]; if (!cols) return false;
  for (const it of splitTop(sel)) {
    const t = it.trim(); if (!t) return false;
    const m = t.match(/^(?:(\w+):)?(\w+|\*)(?:!(\w+))?(?:\(([\s\S]*)\))?$/); if (!m) return false;
    const [, , name, hint, inner] = m;
    if (inner !== undefined) { if (hint && !['inner', 'left'].includes(hint)) return false; if (!checkSel(inner, name, M)) return false; continue; }
    if (hint) return false;
    if (name == '*') { if (cols !== '*') return false; continue; }
    if (cols !== '*' && !cols.includes(name)) return false;
  }
  return true;
}
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict']);
function checkParams(sp: URLSearchParams, dotted: string[]) {
  for (const [k, v] of sp) {
    if (/password_hash|perms/i.test(k + v)) return false;
    if (k == 'order' && !/^[\w.,]+$/.test(v)) return false;
    if ((k == 'limit' || k == 'offset') && !/^\d+$/.test(v)) return false;
    if (k == 'on_conflict' && !/^[\w,]+$/.test(v)) return false;
    if (RESERVED.has(k)) continue;
    if (dotted.includes(k)) continue;
    if (!/^\w+$/.test(k)) return false;       // يمنع or/and/not والمفاتيح المنقوطة
    if (['or', 'and', 'not'].includes(k)) return false;
  }
  return true;
}
const hasFilter = (sp: URLSearchParams) => [...sp.keys()].some(k => !RESERVED.has(k));
const idsOf = (sp: URLSearchParams, k: string): number[] | null => {
  const v = sp.get(k); if (!v) return null;
  const m = v.match(/^(?:eq\.(\d+)|in\.\(([\d,]*)\))$/); if (!m) return null;
  return (m[1] ? [m[1]] : m[2].split(',').filter(Boolean)).map(Number);
};
const onlyKeys = (rows: any[], keys: string[]) => rows.length > 0 && rows.every(r => r && typeof r === 'object' && Object.keys(r).every(k => keys.includes(k)));
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const lvN = (x: unknown) => String(x ?? '').trim().toUpperCase();

type Ctx = { me: string; role: string; table: string; method: string; sp: URLSearchParams; rows: any[]; body: any };
const force = (c: Ctx, col: string, val: string) => c.sp.set(col, 'eq.' + val);

// ---------- صلاحيات الطالب ----------
async function authStudent(c: Ctx): Promise<string | null> {
  const { table: t, method: m, me } = c;
  const safeRows = () => c.rows.length > 0 && c.rows.length <= 1;
  switch (t) {
    case 'students':
      if (m == 'GET') { force(c, 'code', me); return null; }
      if (m == 'PATCH') { force(c, 'code', me); return onlyKeys(c.rows, ['name', 'phone']) && String(c.rows[0].name ?? 'x').length <= 100 && String(c.rows[0].phone ?? '').length <= 30 ? null : DENY; }
      return DENY;
    case 'enrollments': case 'attendance': case 'blocks':
      if (m == 'GET') { force(c, 'student_code', me); return null; } return DENY;
    case 'grades':
      if (m != 'GET') return DENY;
      force(c, 'student_code', me); c.sp.set('exam.published', 'eq.true');
      return /exam:exams!inner\(/.test(c.sp.get('select') || '') ? null : DENY;      // لا درجات غير منشورة
    case 'slots': case 'announcements': case 'rules':
      return m == 'GET' ? null : DENY;
    case 'complaints':
      if (m == 'GET') { force(c, 'student_code', me); return null; }
      if (m == 'POST') {
        if (!safeRows() || !onlyKeys(c.rows, ['student_code', 'body'])) return DENY;
        const body = String(c.rows[0].body ?? '').trim(); if (!body || body.length > 3000) return 'نص الشكوى غير صالح';
        c.rows[0].student_code = me;
        if ((await pgj(`complaints?student_code=eq.${enc(me)}&status=eq.open&select=id&limit=1`)).length) return 'لديك شكوى لم يتم الرد عليها بعد';
        return null;
      }
      return DENY;
    case 'change_requests':
      if (m == 'GET') { force(c, 'student_code', me); return null; }
      if (m == 'POST') {
        if (!safeRows() || !onlyKeys(c.rows, ['student_code', 'from_slot', 'to_slot', 'reason'])) return DENY;
        const r = c.rows[0]; r.student_code = me;
        const to = +r.to_slot; if (!to) return DENY; if (String(r.reason ?? '').length > 2000) return DENY;
        if ((await pgj(`blocks?student_code=eq.${enc(me)}&active=eq.true&select=reason&limit=1`).catch(() => [])).length) return 'تم إيقاف طلبات التغيير لحسابك';
        const [[s], [g]] = await Promise.all([pgj(`students?code=eq.${enc(me)}&select=level`), pgj(`slots?id=eq.${to}&select=level`)]);
        if (!s || !g || !lvN(s.level) || lvN(s.level) != lvN(g.level)) return 'الجروب المطلوب ليس بنفس ليفلك';
        if (r.from_slot != null && !(await pgj(`enrollments?student_code=eq.${enc(me)}&slot_id=eq.${+r.from_slot}&select=slot_id`)).length) return DENY;
        return null;
      }
      return DENY;
    case 'notifications':
      if (m == 'GET') { force(c, 'target_code', me); return null; }
      if (m == 'PATCH') { force(c, 'target_code', me); return onlyKeys(c.rows, ['read']) ? null : DENY; }
      return DENY;
    case 'content_folders': case 'content_items':
      if (m != 'GET') return DENY; c.sp.set('visible', 'eq.true'); return null;
  }
  return DENY;
}

// ---------- صلاحيات المحاضر ----------
async function authLecturer(c: Ctx): Promise<string | null> {
  const { table: t, method: m, me } = c;
  const own = new Set<number>((await pgj(`slots?lecturer_code=eq.${enc(me)}&select=id`)).map((x: any) => +x.id));
  const sub = (a: number[] | null) => !!a && a.length > 0 && a.every(i => own.has(i));
  const ownedFolders = async () => new Set<number>((await pgj(`content_folders?lecturer_code=eq.${enc(me)}&select=id`)).map((x: any) => +x.id));
  switch (t) {
    case 'slots': return m == 'GET' ? null : DENY;
    case 'rules': return m == 'GET' ? null : DENY;
    case 'enrollments':
      if (m == 'GET') return sub(idsOf(c.sp, 'slot_id')) ? null : DENY;
      if (m == 'POST') return onlyKeys(c.rows, ['student_code', 'slot_id']) && c.rows.every(r => own.has(+r.slot_id)) ? null : DENY;
      if (m == 'DELETE') {
        const sc = c.sp.get('student_code'), sl = idsOf(c.sp, 'slot_id');
        if (!sc || !sc.startsWith('eq.') || !sl || sl.length != 1) return DENY;
        if (own.has(sl[0])) return null;
        const q = [...own].join(',') || '0';       // يُسمح بالحذف من الجروب القديم فقط عند وجود طلب نقل معلّق إلى جروبه
        return (await pgj(`change_requests?student_code=eq.${enc(sc.slice(3))}&status=eq.pending&to_slot=in.(${q})&select=id&limit=1`)).length ? null : DENY;
      }
      return DENY;
    case 'attendance':
      if (m == 'GET') return sub(idsOf(c.sp, 'slot_id')) ? null : DENY;
      if (m == 'POST') {
        if (!onlyKeys(c.rows, ['student_code', 'slot_id', 'date', 'present', 'marked_by']) || c.rows.length > 1000) return DENY;
        if (!c.rows.every(r => own.has(+r.slot_id) && r.date == today())) return 'يمكنك تسجيل غياب اليوم الحالي لجروباتك فقط';
        c.rows.forEach(r => r.marked_by = me); return null;
      }
      return DENY;
    case 'change_requests': {
      const idq = idsOf(c.sp, 'id');
      const rowOwned = async () => { if (!idq || idq.length != 1) return false; const [x] = await pgj(`change_requests?id=eq.${idq[0]}&select=to_slot`); return !!x && own.has(+x.to_slot); };
      if (m == 'GET') return (sub(idsOf(c.sp, 'to_slot')) || await rowOwned()) ? null : DENY;
      if (m == 'PATCH') {
        if (!onlyKeys(c.rows, ['status', 'reject_reason']) || !['approved', 'rejected'].includes(c.rows[0].status)) return DENY;
        return await rowOwned() ? null : DENY;
      }
      return DENY;
    }
    case 'notifications':
      if (m == 'GET') { force(c, 'target_code', me); return null; }
      if (m == 'PATCH') { force(c, 'target_code', me); return onlyKeys(c.rows, ['read']) ? null : DENY; }
      if (m == 'POST') return c.rows.length <= 500 && onlyKeys(c.rows, ['target_code', 'title', 'body']) ? null : DENY;
      return DENY;
    case 'staff':
      if (m == 'GET') { force(c, 'code', me); return null; }
      if (m == 'PATCH') { force(c, 'code', me); return onlyKeys(c.rows, ['phone']) ? null : DENY; }
      return DENY;
    case 'content_folders':
      if (m == 'POST') { if (!onlyKeys(c.rows, ['lecturer_code', 'name', 'created_by', 'visible'])) return DENY; c.rows.forEach(r => { r.lecturer_code = me; r.created_by = me; }); return null; }
      force(c, 'lecturer_code', me); return null;
    case 'content_items': {
      const F = await ownedFolders();
      if (m == 'POST') return c.rows.length > 0 && c.rows.every(r => F.has(+r.folder_id)) ? null : DENY;
      const fids = idsOf(c.sp, 'folder_id'), ids = idsOf(c.sp, 'id');
      if (fids) return fids.every(i => F.has(i)) ? null : DENY;
      if (ids && ids.length == 1) { const [x] = await pgj(`content_items?id=eq.${ids[0]}&select=folder_id`); return x && F.has(+x.folder_id) ? null : DENY; }
      return DENY;
    }
  }
  return DENY;
}

// ---------- الإدارة ----------
function authAdmin(c: Ctx): string | null {
  if (!ADMIN_TABLES.has(c.table)) return 'جدول غير مدرج في البوابة: ' + c.table;
  if (c.table == 'staff' && c.method != 'GET' && c.role != 'admin') return 'تعديل الحسابات للأدمن فقط';
  return null;
}

// ---------- معالج استعلامات قاعدة البيانات ----------
async function dbOp(req: Request, me: string, role: string, p: string, method: string, b: any, pf: string | undefined, asCount: boolean) {
  p = String(p || ''); method = String(method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) return E(req, 405, DENY);
  const qi = p.indexOf('?'), path = qi < 0 ? p : p.slice(0, qi), qs = qi < 0 ? '' : p.slice(qi + 1);
  if (pf !== undefined && pf !== null && !/^[a-z0-9=,\- ]{1,100}$/i.test(String(pf))) return E(req, 400, DENY);
  const isAdm = ADM.includes(role);
  if (b !== undefined && b !== null && method != 'GET' && /"password_hash"/.test(JSON.stringify(b))) return E(req, 403, DENY);

  // ---- دوال RPC ----
  if (path.startsWith('rpc/')) {
    const fn = path.slice(4), a = b || {};
    const ok = fn == 'change_password' ? a.p_code === me
      : fn == 'change_student_code' ? isAdm
      : fn == 'admin_set_password' ? role == 'admin' && a.p_admin === me : false;
    if (!ok || method != 'POST') return E(req, 403, DENY);
    const r = await pg(path, 'POST', a); const t = await r.text();
    return new Response(t, { status: r.status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  if (!/^[a-z_]+$/.test(path)) return E(req, 400, DENY);
  const sp = new URLSearchParams(qs);
  const rows = b === undefined || b === null ? [] : Array.isArray(b) ? b : [b];
  const c: Ctx = { me, role, table: path, method, sp, rows, body: b };
  if (asCount) c.method = 'GET';

  if ((method == 'PATCH' || method == 'DELETE') && !hasFilter(sp)) return E(req, 400, 'يلزم شرط تصفية للتعديل/الحذف');
  if ((method == 'POST' || method == 'PATCH') && (rows.length == 0 || rows.some(r => !r || typeof r !== 'object'))) return E(req, 400, 'بيانات غير صالحة');

  let err: string | null;
  if (isAdm) err = authAdmin(c);
  else {
    const M = role == 'student' ? STU : role == 'lecturer' ? LEC : null;
    if (!M) return E(req, 403, DENY);
    if (!checkParams(sp, role == 'student' && path == 'grades' ? ['exam.published'] : [])) return E(req, 403, DENY);
    if (!M[path]) return E(req, 403, DENY);
    const sel = sp.get('select');
    if (sel === null) { if (M[path] !== '*' && c.method == 'GET') return E(req, 403, DENY); }
    else if (!checkSel(sel, path, M)) return E(req, 403, DENY);
    err = role == 'student' ? await authStudent(c) : await authLecturer(c);
  }
  if (err) return E(req, 403, err);

  const out = [...sp].map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  const body = method == 'GET' || method == 'DELETE' ? undefined : (Array.isArray(b) ? rows : rows[0]);
  const r = asCount ? await pg(path + '?' + out, 'GET', undefined, 'count=exact', { 'Range-Unit': 'items', Range: '0-0' })
    : await pg(path + (out ? '?' + out : ''), method, body, pf || undefined);
  const txt = await r.text();
  if (asCount) return J(req, { count: +((r.headers.get('content-range') || '/0').split('/')[1]) || 0 });
  let outTxt = txt;
  if (txt && r.ok) { try { outTxt = JSON.stringify(clean(JSON.parse(txt), isAdm)); } catch { /* نص عادي */ } }
  return new Response(outTxt, { status: r.status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// ---------- تسجيل الدخول مع حماية من التخمين ----------
async function login(req: Request, code: unknown, pass: unknown) {
  const c = String(code ?? '').trim().slice(0, 64), pw = String(pass ?? '').slice(0, 200);
  if (!c || !pw) return J(req, null);
  const ip = (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || '?').trim().slice(0, 64);
  const since = enc(new Date(Date.now() - 15 * 60 * 1000).toISOString());
  const [fc, fi] = await Promise.all([cnt(`login_attempts?code=eq.${enc(c)}&ok=eq.false&at=gte.${since}`), cnt(`login_attempts?ip=eq.${enc(ip)}&ok=eq.false&at=gte.${since}`)]);
  if (fc >= 8 || fi >= 40) return E(req, 429, 'محاولات دخول كثيرة، انتظر 15 دقيقة ثم حاول مرة أخرى');
  const r = await pg('rpc/login', 'POST', { p_code: c, p_pass: pw }); const t = await r.text();
  if (!r.ok) return E(req, 500, 'تعذر تسجيل الدخول');
  let u: any = t ? JSON.parse(t) : null; if (Array.isArray(u)) u = u[0];
  if (!u || !u.code || !u.role) {
    await pg('login_attempts', 'POST', { code: c, ip, ok: false }, 'return=minimal');
    if (Math.random() < 0.02) await pg('login_attempts?at=lt.' + enc(new Date(Date.now() - 86400000).toISOString()), 'DELETE', undefined, 'return=minimal');
    return J(req, null);
  }
  await pg(`login_attempts?code=eq.${enc(c)}`, 'DELETE', undefined, 'return=minimal');
  const rs: string[] = Array.isArray(u.roles) && u.roles.length ? u.roles : [u.role];
  const hours = rs.some(x => ADM.includes(x)) ? 12 : 24 * 14;
  const tk = await sign({ c: u.code, rs, exp: Math.floor(Date.now() / 1000) + hours * 3600 });
  return J(req, { ...clean(u, true), tk });
}

// ---------- عمليات خاصة ----------
async function autoApprove(me: string, id: number) {
  const [rule] = await pgj('rules?key=eq.auto_accept_requests&select=value');
  if (!(rule && +rule.value == 1)) return { ok: false };
  const [x] = await pgj(`change_requests?id=eq.${id}&student_code=eq.${enc(me)}&status=eq.pending&select=*`); if (!x) return { ok: false };
  if ((await pgj(`blocks?student_code=eq.${enc(me)}&active=eq.true&select=reason&limit=1`).catch(() => [])).length) return { ok: false };
  const [[s], [g]] = await Promise.all([pgj(`students?code=eq.${enc(me)}&select=level`), pgj(`slots?id=eq.${+x.to_slot}&select=id,level,capacity,lecturer_code,day,start_time,place`)]);
  if (!s || !g || !lvN(s.level) || lvN(s.level) != lvN(g.level)) return { ok: false };
  if (await cnt(`enrollments?slot_id=eq.${g.id}&select=slot_id`) >= (g.capacity || 35)) return { ok: false };
  await pg('enrollments?on_conflict=student_code,slot_id', 'POST', { student_code: me, slot_id: g.id }, 'resolution=merge-duplicates,return=minimal');
  if (x.from_slot && x.from_slot != g.id) await pg(`enrollments?student_code=eq.${enc(me)}&slot_id=eq.${+x.from_slot}`, 'DELETE', undefined, 'return=minimal');
  await pg(`change_requests?id=eq.${id}`, 'PATCH', { status: 'approved' }, 'return=minimal');
  await notifyRows([me], 'تمت الموافقة على طلبك', 'تمت الموافقة تلقائياً وتم نقلك إلى الجروب الجديد');
  if (g.lecturer_code) await notifyRows([g.lecturer_code], 'نقل تلقائي', 'انتقل طالب إلى جروبك (' + g.day + ' كلاس ' + g.place + ')');
  return { ok: true };
}
async function notifyAdmins(me: string, title: string, body: string, lecturer?: string) {
  const a = await pgj('staff?role=in.(admin,assistant)&select=code');
  const codes = new Set<string>(a.map((x: any) => x.code));
  if (lecturer && /^[\w\-.]{1,64}$/.test(lecturer) && (await pgj(`staff?code=eq.${enc(lecturer)}&select=code`)).length) codes.add(lecturer);
  await notifyRows([...codes], title.slice(0, 200), body.slice(0, 1000));
}
const okPath = /^\d{1,12}\/[A-Za-z0-9]{8,64}\.[A-Za-z0-9]{1,8}$/;
async function folderAllowed(me: string, role: string, path: string) {
  if (ADM.includes(role)) return true;
  const fid = +path.split('/')[0];
  return (await pgj(`content_folders?id=eq.${fid}&lecturer_code=eq.${enc(me)}&select=id`)).length > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method == 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method != 'POST') return E(req, 405, DENY);
  if (!SECRET || SECRET.length < 24) return E(req, 500, 'SESSION_SECRET غير مضبوط');
  let d: any; try { d = await req.json(); } catch { return E(req, 400, 'طلب غير صالح'); }
  try {
    if (d.op == 'login') return await login(req, d.code, d.pass);
    const tok = req.headers.get('x-st') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const s = await verify(tok);
    const role = String(d.role || '');
    if (!s || !Array.isArray(s.rs) || !s.rs.includes(role)) return E(req, 401, 'انتهت الجلسة، سجّل الدخول من جديد', 'SESSION');
    const me: string = s.c;
    switch (d.op) {
      case 'db': return await dbOp(req, me, role, d.p, d.m, d.b, d.pf, false);
      case 'count': return await dbOp(req, me, role, d.p, 'GET', null, undefined, true);
      case 'notify_admins':
        if (!['student', 'lecturer'].includes(role) && !ADM.includes(role)) return E(req, 403, DENY);
        await notifyAdmins(me, String(d.title || ''), String(d.body || ''), d.lecturer ? String(d.lecturer) : undefined); return J(req, { ok: true });
      case 'auto_approve':
        if (role != 'student' || !(+d.id > 0)) return E(req, 403, DENY);
        return J(req, await autoApprove(me, +d.id));
      case 'sign_upload': {
        if (role == 'student' || !okPath.test(String(d.path)) || !(await folderAllowed(me, role, d.path))) return E(req, 403, DENY);
        const r = await fetch(`${URL_}/storage/v1/object/upload/sign/${BUCKET}/${d.path}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json', 'x-upsert': 'false' }), body: '{}' });
        const t = await r.text(); if (!r.ok) return E(req, 502, 'تعذر تجهيز الرفع: ' + t);
        return J(req, JSON.parse(t));
      }
      case 'rm_files': {
        const paths: string[] = Array.isArray(d.paths) ? d.paths.map(String) : [];
        if (role == 'student' || !paths.length || paths.length > 50 || !paths.every(p => okPath.test(p))) return E(req, 403, DENY);
        for (const p of paths) if (!(await folderAllowed(me, role, p))) return E(req, 403, DENY);
        const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: paths }) });
        const t = await r.text(); return new Response(t || '{}', { status: r.status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
      }
    }
    return E(req, 400, DENY);
  } catch (e) {
    return E(req, 500, 'خطأ في الخادم: ' + (e instanceof Error ? e.message : String(e)));
  }
});
