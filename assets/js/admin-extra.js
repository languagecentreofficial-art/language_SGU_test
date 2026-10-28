const EN2AR={sunday:'الأحد',monday:'الاثنين',tuesday:'الثلاثاء',wednesday:'الأربعاء',thursday:'الخميس',friday:'الجمعة',saturday:'السبت'};
const q=s=>encodeURIComponent(s);
const nzp=s=>String(s||'').toLowerCase().replace(/^class\s*/,'').replace(/^c(?=\d)/,'').split('-')[0].trim();
function t24(s){const m=s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);let h=+m[1];const a=(m[3]||'').toUpperCase();if(a=='PM'&&h<12)h+=12;if(a=='AM'&&h==12)h=0;if(!a&&h<7)h+=12;return String(h).padStart(2,'0')+':'+m[2]}
async function all(path){return (await gw('db_all',{p:path}))||[]}
// قراءة الشيت: يدعم أكثر من بلوك (يوم/وقت/مبنى/كلاس/جدول طلاب) في نفس الملف
function parseRows(rows){const out=[];let c=null,h=false;
 for(const r of rows){const a=String(r[0]??'').trim();
  const p=a.split('—').map(x=>x.trim());
  if(p.length>=3&&(EN2AR[p[0].toLowerCase()]||DAYS.includes(p[0]))&&/\d:\d/.test(p[2])){const [s,e]=p[2].split(/[–-]/);c={day:EN2AR[p[0].toLowerCase()]||p[0],start:t24(s),end:t24(e),building:'',cls:'',level:'',rows:[]};out.push(c);h=false;continue}
  if(!c)continue;
  let m;if(m=a.match(/^Building:\s*([^|]*)/i)){c.building=m[1].trim();continue}
  if(m=a.match(/^Class\s*(\S+)\s*—\s*English Level\s*(\S+)/i)){c.cls=m[1];c.level=m[2];continue}
  if(/^(name|student name|full name|الاسم|اسم الطالب)$/i.test(a)||String(r[1]??'').trim().toLowerCase()=='code'){h=true;continue}
  if(h){if(r[1]!=null&&String(r[1]).trim())c.rows.push({name:a,code:String(r[1]).trim(),college:r[2]||null,section:r[3]||null,level:r[4]||c.level,lec:r[5]?String(r[5]).trim():null});else if(!a)h=false}}
 return out}
function downloadTemplate(){const ws=XLSX.utils.aoa_to_sheet([
 ['ENGLISH LANGUAGE COURSE'],['صيغة اليوم والوقت: اليوم بالإنجليزي — اسم الفترة — الوقت 24 ساعة أو AM/PM مثل 9:00 AM–11:00 AM'],[],
 ['Monday — First Period — 9:00 AM–11:00 AM'],['Building: Faculty of Pharmacy  |  Floor: First Floor'],['Class 0022 — English Level B2'],[],
 ['Name','Code','Faculty','Department','English Level','The Lecturer'],['اسم الطالب','261541','Computer Science','Section A1','B2','كود المحاضر (اختياري)']]);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sheet1');XLSX.writeFile(wb,'template.xlsx')}
function askConflicts(conf,blocks,SM){return new Promise(res=>{
 const lv=v=>String(v||'').trim().toUpperCase(),blab=i=>{const x=blocks[i];return`جديد: ${x.day} ${x.start}-${x.end} | كلاس ${x.cls} | ${x.level}`},slab=id=>{const s=SM[id];return`الحالي: ${s.day} ${fmt(s.start_time)}-${fmt(s.end_time)} | ${s.place} | ${s.level}`};
 const opts=c=>{const o=[...c.bs.map(i=>({v:'n'+i,t:blab(i),ok:lv(blocks[i].level)==lv(c.lvl)})),...c.cs.map(id=>({v:'c'+id,t:slab(id),ok:lv(SM[id].level)==lv(c.lvl)}))];o.forEach(x=>x.dis=!x.ok&&x.v[0]=='n'&&o.some(y=>y.v[0]=='c'||y.ok));return o},def=c=>{const o=opts(c);return(o.find(x=>x.ok&&x.v[0]=='n')||o.find(x=>x.ok)||o.find(x=>x.v[0]=='c')||o[0]).v};
 const m=document.createElement('div');m.setAttribute('style','position:fixed;inset:0;background:#0a1a4499;z-index:100;overflow:auto;padding:20px;display:flex;justify-content:center;align-items:flex-start');
 m.innerHTML=`<div class="card" style="width:100%;max-width:980px;margin:20px 0"><h3>طلاب موجودون في جروبات أخرى (${conf.length})</h3><p class="note">لكل طالب اختر المكان النهائي: البقاء في جروبه الحالي، أو الانتقال إلى الجروب الجديد. الانتقال لا يُسمح به إلا لجروب بنفس ليفل الطالب، وبعد الانتقال يُحذف من جروبه القديم فيبقى في جروب واحد.</p><div class="wrap"><table class="table"><tr><th>الطالب</th><th>ليفله</th><th>القرار</th></tr>${conf.map(c=>`<tr><td>${esc(c.name)}<br><small>${esc(c.c)}</small></td><td>${esc(c.lvl)}</td><td><select data-c="${esc(c.c)}">${opts(c).map(o=>`<option value="${o.v}" ${o.v==def(c)?'selected':''} ${o.dis?'disabled':''}>${esc(o.t)}${o.ok?'':' — ليفل مختلف'}</option>`).join('')}</select></td></tr>`).join('')}</table></div><button class="btn" id="cgo">متابعة الاستيراد</button><button class="btn alt" id="cno">إلغاء</button></div>`;
 document.body.append(m);m.querySelector('#cno').onclick=()=>{m.remove();res(null)};
 m.querySelector('#cgo').onclick=()=>{const ch={};m.querySelectorAll('select[data-c]').forEach(s=>ch[s.dataset.c]={t:s.value[0],v:+s.value.slice(1)});m.remove();res(ch)}})}
async function importTab(b){
 b.innerHTML=`<div class="card"><h3>رفع جدول حضور (إكسيل)</h3><label>طريقة الاستبدال</label><div><label class="chk"><input type="radio" name="rm" value="cls" checked> حذف الكلاسات الموجودة في الملف فقط (نفس اليوم والكلاس) وإعادة إنشائها بطلاب الملف</label><br><label class="chk"><input type="radio" name="rm" value="day"> حذف كل جروبات الأيام الموجودة في الملف واستبدالها بالملف</label></div><p><b>تنبيه:</b> الجروبات المحذوفة تُنشأ من جديد من الملف. الطالب الجديد يُسجَّل بكلمة مرور = كوده، والموجود تُحدَّث بياناته الأكاديمية فقط دون المساس بكلمة المرور. الطالب المسجّل أصلاً في جروب آخر تُسأل عن نقله، ولا يُنقل إلا لجروب بنفس ليفله.</p><input type="file" id="f" accept=".xlsx,.xls,.csv"><div id="pv"></div><button class="btn alt" id="go" disabled>استيراد</button> <button class="btn" id="tp">تحميل القالب</button></div><div id="rp"></div>`;
 $('#tp').onclick=downloadTemplate;let blocks=[];
 $('#f').onchange=async e=>{const wb=XLSX.read(await e.target.files[0].arrayBuffer());blocks=wb.SheetNames.flatMap(n=>parseRows(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:null})));
  $('#pv').innerHTML=blocks.map(x=>`<div class="msg">${x.day} ${x.start}-${x.end} | ${esc(x.cls)} | ${esc(x.level)} | ${x.rows.length} طالب</div>`).join('')||'<div class="msg">لم يتم التعرف على أي جدول، استخدم القالب</div>';$('#go').disabled=!blocks.length};
 $('#go').onclick=async()=>{try{
  const days=[...new Set(blocks.map(x=>x.day))],mode=document.querySelector('input[name=rm]:checked').value,mn=t=>{const [h,m]=String(t).split(':');return +h*60+ +m};
  const [st,sl,en]=await Promise.all([all('students?select=code,is_new,level'),all('slots?select=id,day,start_time,end_time,place,level,lecturer_code,capacity'),all('enrollments?select=slot_id,student_code')]);
  const SM=Object.fromEntries(sl.map(s=>[s.id,s])),SD=Object.fromEntries(st.map(s=>[s.code,s])),cur={},app={};
  const old=mode=='day'?sl.filter(s=>days.includes(s.day)):sl.filter(s=>blocks.some(x=>s.day==x.day&&nzp(s.place)==nzp(x.cls)&&mn(fmt(s.start_time))<mn(x.end)&&mn(fmt(s.end_time))>mn(x.start))),delIds=new Set(old.map(s=>s.id));
  en.forEach(e=>{const s=SM[e.slot_id];if(s&&!delIds.has(s.id))(cur[e.student_code]=cur[e.student_code]||[]).push(s.id)});
  blocks.forEach((x,i)=>x.rows.forEach(r=>(app[r.code]=app[r.code]||new Set()).add(i)));
  const conf=[];Object.keys(app).forEach(c=>{const bs=[...app[c]],cs=cur[c]||[];if(bs.length>1||cs.length){const r0=blocks[bs[0]].rows.find(r=>r.code==c);conf.push({c,name:r0.name,lvl:SD[c]?.level||r0.level||blocks[bs[0]].level,bs,cs})}});
  let choice={};if(conf.length){choice=await askConflicts(conf,blocks,SM);if(!choice)return}
  if(!confirm((mode=='day'?`سيتم حذف كل الجروبات الموجودة في الأيام: ${days.join('، ')} (${old.length} جروب)`:`سيتم حذف الجروبات الموجودة في الملف فقط (${old.length} جروب: نفس اليوم والكلاس) وتبقى باقي جروبات اليوم كما هي`)+` وإعادة إنشائها من الملف.\nيُعاد ربط المحاضرين عند تطابق اليوم والوقت والكلاس، وتبقى سجلات الغياب القديمة محفوظة. متابعة؟`))return;
  $('#go').disabled=true;const rep=[],mv=new Set(),lm={};old.forEach(o=>{if(o.lecturer_code)lm[[o.day,fmt(o.start_time),fmt(o.end_time),nzp(o.place)].join('|')]=o.lecturer_code});
  if(mode=='day'){for(const d of days)await api('slots?day=eq.'+q(d),'DELETE')}else{const ids=old.map(s=>s.id);for(let i=0;i<ids.length;i+=100)await api('slots?id=in.('+ids.slice(i,i+100).join(',')+')','DELETE')}
  const isn=Object.fromEntries(st.map(r=>[r.code,r.is_new])),mk={};
  for(let bi=0;bi<blocks.length;bi++){const x=blocks[bi],place=x.cls+(x.building?' - '+x.building:''),key=[x.day,x.start,x.end,nzp(x.cls)].join('|');
   let s=mk[key],made=false,lcode=lm[key]||null;const lc=x.rows.find(r=>r.lec)?.lec;if(lc){const [l]=await api('staff?code=eq.'+q(lc)+'&select=code');if(l)lcode=l.code}
   if(!s){[s]=await api('slots','POST',{day:x.day,start_time:x.start,end_time:x.end,place,level:x.level,lecturer_code:lcode});mk[key]=s;made=true}
   const R=[...new Map(x.rows.map(r=>[r.code,{code:r.code,name:r.name,college:r.college,section:r.section,level:r.level,place:x.cls}])).values()],nw=R.filter(r=>!(r.code in isn)).map(r=>({...r,is_new:true})),ex=R.filter(r=>r.code in isn);
   if(nw.length)await api('students','POST',nw,'return=minimal');if(ex.length)await api('students?on_conflict=code','POST',ex,'resolution=merge-duplicates,return=minimal');nw.forEach(r=>isn[r.code]=true);
   const E=R.filter(r=>{const c=choice[r.code];return !c||(c.t=='n'&&c.v==bi)});
   if(E.length)await api('enrollments?on_conflict=student_code,slot_id','POST',E.map(r=>({student_code:r.code,slot_id:s.id})),'resolution=merge-duplicates,return=minimal');
   E.forEach(r=>{if(choice[r.code]&&(cur[r.code]||[]).length)mv.add(r.code)});await notify(E.map(r=>r.code),'تحديث الجدول','تم تحديث جدولك: '+x.day+' '+x.start);
   rep.push({x,s,made,nw:nw.length,ex:ex.length,u:E.length,kept:R.length-E.length,real:await count('enrollments','slot_id','&slot_id=eq.'+s.id)})}
  for(const c of mv)await api(`enrollments?student_code=eq.${q(c)}&slot_id=in.(${cur[c].join(',')})`,'DELETE');
  $('#pv').innerHTML='';$('#rp').innerHTML=`<div class="card wrap"><h3>نتيجة الاستيراد (تم التحقق من قاعدة البيانات) — طلاب نُقلوا من جروباتهم القديمة: ${mv.size}</h3><table class="table"><tr><th>اليوم والوقت</th><th>الكلاس</th><th>الجروب</th><th>جدد</th><th>موجودون</th><th>لم يُسكَّنوا (بقوا في جروبهم)</th><th>المسجلون فعلياً الآن</th></tr>${rep.map(r=>`<tr><td>${r.x.day} ${r.x.start}-${r.x.end}</td><td>${esc(r.x.cls)}</td><td>${r.made?'<b>جروب جديد</b>':'جروب مشترك #'+r.s.id}</td><td>${r.nw}</td><td>${r.ex}</td><td>${r.kept}</td><td class="${r.real<r.u?'bad':'ok'}">${r.real} / ${r.s.capacity||35}${r.real>(r.s.capacity||35)?' • تجاوز الحد':''}${r.real<r.u?' • نقص عن الملف':''}</td></tr>`).join('')}</table></div>`;
  alert('تم استيراد '+rep.reduce((a,r)=>a+r.u,0)+' تسكين في '+rep.length+' جروب. راجع جدول النتيجة.');$('#go').disabled=false}catch(e){alert('خطأ: '+e.message);$('#go').disabled=false}}}

async function reportTab(b){
 const [sl,st,at]=await Promise.all([all('slots?order=day'),all('students?select=code,name,college,level,section,place&order=name'),all('attendance?select=student_code,present')]);
 const C=[['code','الكود'],['name','الاسم'],['college','الكلية'],['level','الليفل'],['section','السكشن'],['present','حضور'],['absent','غياب']];
 b.innerHTML=`<div class="card noprint"><h3>تقرير الحضور والغياب</h3><div>${C.map(([k,l])=>`<label style="display:inline-block;margin-inline-end:14px"><input type="checkbox" class="ck" value="${k}" checked> ${l}</label>`).join('')}</div><button class="btn" id="pr">تحميل PDF</button> <button class="btn alt" id="xl">تحميل إكسيل</button></div><div class="printhead"><b>كورس اللغة الإنجليزية</b><img src="assets/logo.png" height="56" alt=""></div><div class="card wrap" id="rt"></div>`;
 const m={};at.forEach(a=>{m[a.student_code]=m[a.student_code]||{p:0,a:0};a.present?m[a.student_code].p++:m[a.student_code].a++});
 const rows=st.map(s=>({...s,present:m[s.code]?.p||0,absent:m[s.code]?.a||0}));
 const draw=()=>{const k=C.filter(c=>document.querySelector(`.ck[value=${c[0]}]`).checked);$('#rt').innerHTML='<table class="table"><tr>'+k.map(c=>`<th>${c[1]}</th>`).join('')+'</tr>'+rows.map(r=>'<tr>'+k.map(c=>`<td>${esc(r[c[0]])}</td>`).join('')+'</tr>').join('')+'</table>';return k};
 document.querySelectorAll('.ck').forEach(c=>c.onchange=draw);draw();
 $('#pr').onclick=()=>print();
 $('#xl').onclick=()=>{const k=draw();const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.map(r=>Object.fromEntries(k.map(c=>[c[1],r[c[0]]])))),'Report');XLSX.writeFile(wb,'report.xlsx')}}
