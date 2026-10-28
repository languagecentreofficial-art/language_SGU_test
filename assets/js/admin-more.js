const dl=(a,n)=>{const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(a),'Sheet1');XLSX.writeFile(w,n)};
const rd=async f=>{const w=XLSX.read(await f.arrayBuffer());return w.SheetNames.flatMap(n=>XLSX.utils.sheet_to_json(w.Sheets[n],{defval:null}))};
const S=v=>v==null?null:String(v).trim()||null;
const tm=v=>{if(v instanceof Date)return String(v.getHours()).padStart(2,'0')+':'+String(v.getMinutes()).padStart(2,'0');if(typeof v=='number'){let m=Math.round((v-Math.floor(v))*1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}return t24(String(v))};
const nA=x=>String(x).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').trim();
const dayOf=v=>{const s=String(v).trim().toLowerCase(),k=s.length>=3&&Object.keys(EN2AR).find(k=>k.startsWith(s.slice(0,3)));if(k)return EN2AR[k];return DAYS.find(d=>nA(d)==nA(s))||String(v).trim()};
const upBox=(b,title,hint,tplFn,run)=>{b.innerHTML=`<div class="card"><h3>${title}</h3><p>${hint}</p><input type="file" id="f" accept=".xlsx,.xls,.csv"><button class="btn alt" id="go">رفع وتنفيذ</button> <button class="btn" id="tp">تحميل القالب</button></div>`;$('#tp').onclick=tplFn;$('#go').onclick=async()=>{const f=$('#f').files[0];if(!f)return alert('اختر ملفاً');try{alert(await run(await rd(f)))}catch(e){alert('خطأ: '+e.message)}}};
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Cairo'});

// ===== رفع الطلاب فقط =====
const studentsUploadTab=b=>upBox(b,'رفع / تحديث طلاب','الأعمدة: Code, Name, Phone, Faculty, Level, Section, Place، والاختيارية: Day, From, To لتحديد الجروب بدقة عندما يتكرر الكلاس في أكثر من يوم. الخلية الفارغة تُبقي القيمة القديمة، وكلمة المرور = الكود للجدد. عند وجود Place يُنقل الطالب فوراً إلى جروب هذا الكلاس في الجداول (بدون أي شروط ليفل أو سعة) ويُحذف من جروبه القديم.',
 ()=>dl([['Code','Name','Phone','Faculty','Level','Section','Place','Day','From','To'],['261541','اسم الطالب','01000000000','Computer Science','B2','Section A1','Class 0022','Monday','9:00 AM','11:00 AM']],'students_template.xlsx'),
 async rows=>{const [oldL,sl,en]=await Promise.all([all('students?select=code,name,phone,college,level,section,place,is_new'),all('slots?select=id,day,start_time,end_time,place,level'),all('enrollments?select=slot_id,student_code')]);
  const old=Object.fromEntries(oldL.map(s=>[s.code,s])),R=rows.filter(r=>S(r.Code));
  const out=[...new Map(R.map(r=>{const c=S(r.Code),o=old[c]||{};return[c,{code:c,name:S(r.Name)||o.name||c,phone:S(r.Phone)||o.phone||null,college:S(r.Faculty)||o.college||null,level:S(r.Level)||o.level||null,section:S(r.Section)||o.section||null,place:S(r.Place)||o.place||null,is_new:o.code?o.is_new:true}]})).values()];
  const nw=out.filter(r=>!old[r.code]).map(r=>({...r,is_new:true})),ex=out.filter(r=>old[r.code]).map(({is_new,...r})=>r);if(nw.length)await api('students','POST',nw,'return=minimal');if(ex.length)await api('students?on_conflict=code','POST',ex,'resolution=merge-duplicates,return=minimal');
  // ===== مزامنة التسكين (enrollments) مع الكلاس المرفوع =====
  const SM=Object.fromEntries(sl.map(s=>[s.id,s])),cur={};en.forEach(e=>(cur[e.student_code]=cur[e.student_code]||[]).push(e.slot_id));
  const del=[],add=[],bad=[],amb=[];let same=0;
  for(const r of R){const pl=S(r.Place);if(!pl)continue;const c=S(r.Code),K=nzp(pl);let cand=sl.filter(s=>nzp(s.place)==K),dy=null,fr=null;
   try{if(S(r.Day))dy=dayOf(r.Day);if(r.From!=null&&r.From!=='')fr=tm(r.From)}catch(e){bad.push(c+': يوم/وقت غير مفهوم');continue}
   if(dy)cand=cand.filter(s=>s.day==dy);if(fr)cand=cand.filter(s=>fmt(s.start_time)==fr);
   if(!cand.length){bad.push(`${c}: لا يوجد جروب للكلاس ${pl}${dy?' في يوم '+dy:''}${fr?' الساعة '+fr:''}`);continue}
   const cs=(cur[c]||[]).map(id=>SM[id]).filter(Boolean);
   if(cand.some(s=>cs.some(o=>o.id==s.id))){same++;continue}
   const sc=t=>{let m=3,oo=null;for(const o of cs){const v=o.day==t.day?(fmt(o.start_time)==fmt(t.start_time)?0:1):2;if(v<m){m=v;oo=o}}return{t,m,o:oo}};
   const L=cand.map(sc).sort((x,y)=>x.m-y.m||fmt(x.t.start_time).localeCompare(fmt(y.t.start_time))),h=L[0];
   if(L.filter(x=>x.m==h.m).length>1)amb.push(`${c}: اختير ${h.t.day} ${fmt(h.t.start_time)} كلاس ${pl}`);
   const o=h.o&&nzp(h.o.place)!=K&&(cs.length==1||h.o.day==h.t.day)?h.o:null;
   if(o){del.push({c,id:o.id});cur[c]=cur[c].filter(i=>i!=o.id)}
   add.push({student_code:c,slot_id:h.t.id});(cur[c]=cur[c]||[]).push(h.t.id)}
  const grp={};del.forEach(d=>(grp[d.id]=grp[d.id]||[]).push(d.c));
  for(const id in grp)for(let i=0;i<grp[id].length;i+=80)await api(`enrollments?slot_id=eq.${id}&student_code=in.(${grp[id].slice(i,i+80).map(q).join(',')})`,'DELETE');
  const AD=[...new Map(add.map(a=>[a.student_code+'|'+a.slot_id,a])).values()];
  for(let i=0;i<AD.length;i+=500)await api('enrollments?on_conflict=student_code,slot_id','POST',AD.slice(i,i+500),'resolution=merge-duplicates,return=minimal');
  const mvC=[...new Set(AD.map(a=>a.student_code))],nwC=mvC.filter(c=>!old[c]||old[c].is_new);
  for(let i=0;i<nwC.length;i+=80)await api(`students?code=in.(${nwC.slice(i,i+80).map(q).join(',')})`,'PATCH',{is_new:false});
  if(mvC.length)await notify(mvC,'تحديث الجدول','تم تحديث كلاسك وجدولك، راجع جدولك');
  return`طلاب جدد: ${nw.length} (كلمة المرور = الكود) — موجودون: ${ex.length} (كلمة المرور لم تتغير)\nتم تحديث التسكين في الجداول: ${mvC.length} طالب (نُقلوا: ${del.length})\nكانوا في الكلاس نفسه أصلاً: ${same}${amb.length?'\nاختيار تلقائي عند تعدد الجروبات ('+amb.length+') — يمكن تحديد Day/From/To في الملف لتفادي ذلك:\n'+amb.slice(0,15).join('\n')+(amb.length>15?'\n...':''):''}${bad.length?'\nلم يُسكَّنوا ('+bad.length+'):\n'+bad.slice(0,20).join('\n')+(bad.length>20?'\n...':''):''}`});

// ===== رفع المحاضرين والتوقيتات =====
const LA={code:['code','كود','الكود','lecturercode'],name:['name','الاسم','اسم'],phone:['phone','mobile','tel','الهاتف','رقمالهاتف'],role:['role','الصلاحية'],day:['day','اليوم'],from:['from','start','starttime','من'],to:['to','end','endtime','الى','إلى'],cls:['class','classroom','room','place','كلاس','الكلاس'],level:['level','englishlevel','الليفل']};
const lecRow=r=>{const K={};Object.keys(r).forEach(k=>K[k.toLowerCase().replace(/[\s_.\-]/g,'')]=r[k]);const o={};for(const f in LA){const k=LA[f].find(n=>K[n]!=null&&K[n]!=='');o[f]=k?K[k]:null}return o};
const mins=t=>{const [h,m]=String(t).split(':');return +h*60+ +m};
// مطابقة الجروب: نفس اليوم + نفس الكلاس، ثم التوقيت (مطابق تماماً أو متداخل)
const lecMatch=(sl,d,f,t,p)=>{const same=sl.filter(s=>s.day==d&&nzp(s.place)==nzp(p));
 let hit=same.filter(s=>mins(fmt(s.start_time))==mins(f)&&mins(fmt(s.end_time))==mins(t));if(hit.length)return{hit,how:'exact'};
 hit=same.filter(s=>mins(fmt(s.start_time))<mins(t)&&mins(fmt(s.end_time))>mins(f));if(hit.length)return{hit,how:'overlap'};
 return{hit:[],why:same.length?'الكلاس موجود في هذا اليوم لكن بتوقيت مختلف ('+same.map(s=>fmt(s.start_time)+'-'+fmt(s.end_time)).join('، ')+')':'لا يوجد هذا الكلاس في هذا اليوم'}};
const lecTab=b=>{upBox(b,'رفع / تحديث المحاضرين وتوقيتاتهم','ارفع هذا الملف بعد رفع جدول الطلاب. يربط كل محاضر بالجروبات المطابقة (نفس اليوم والكلاس والوقت) دون المساس بالطلاب. الأعمدة: Code, Name, Phone, Role, Day, From, To, Class, Level. كرّر المحاضر في أكثر من صف لتحديد أكثر من توقيت في اليوم.',
 ()=>dl([['Code','Name','Phone','Role','Day','From','To','Class','Level'],['L100','د. أحمد','01000000000','lecturer','Monday','9:00 AM','11:00 AM','c0012','A1'],['L100','د. أحمد','01000000000','lecturer','Monday','11:30 AM','3:30 PM','c0020','C1']],'lecturers_template.xlsx'),
 async rows0=>{const rows=[...new Map(rows0.map(lecRow).filter(r=>S(r.code)).map(r=>[[S(r.code),r.day,r.from,r.to,r.cls].join('|'),r])).values()];
  if(!rows.length)throw new Error('لم يتم التعرف على الأعمدة. المطلوب: Code, Name, Phone, Role, Day, From, To, Class, Level');
  const st={};rows.forEach(r=>{const c=S(r.code),ro=(S(r.role)||'').toLowerCase();st[c]=st[c]||{name:S(r.name),phone:S(r.phone),role:['admin','assistant','affairs'].includes(ro)?ro:'lecturer'}});
  const have=new Set((await all('staff?select=code')).map(x=>x.code));let nu=0,up=0;
  for(const c in st){const x=st[c];if(have.has(c)){const d={};if(x.name)d.name=x.name;if(x.phone)d.phone=x.phone;if(Object.keys(d).length)await api('staff?code=eq.'+q(c),'PATCH',d);up++}else{await api('staff','POST',{code:c,name:x.name||c,phone:x.phone,role:x.role,roles:[x.role]},'return=minimal');nu++}}
  const sl=await all('slots?select=id,day,start_time,end_time,place,level,lecturer_code&order=id'),mk=$('#mk')?.checked,L={};let ex=0,ov=0,noT=0;const cr=[],sk=[];
  for(const r of rows){if(!r.day||!r.from||!r.to){noT++;continue}
   let d,f,t;try{d=dayOf(r.day);f=tm(r.from);t=tm(r.to)}catch(e){sk.push(S(r.code)+': وقت غير مفهوم ('+r.from+' / '+r.to+')');continue}
   const p=S(r.cls)||'',c=S(r.code),m=lecMatch(sl,d,f,t,p);
   if(m.hit.length){for(const s of m.hit){await api('slots?id=eq.'+s.id,'PATCH',{lecturer_code:c});s.lecturer_code=c}if(m.how=='exact')ex+=m.hit.length;else ov+=m.hit.length;L[c]=(L[c]||0)+m.hit.length}
   else if(mk){const [n]=await api('slots','POST',{day:d,start_time:f,end_time:t,place:p,level:S(r.level),lecturer_code:c});sl.push(n);cr.push(d+' '+f+'-'+t+' '+p);L[c]=(L[c]||0)+1}
   else sk.push(`${c} | ${d} ${f}-${t} | كلاس ${p} ← ${m.why}`)}
  for(const c in L)await notify([c],'تحديث جدولك','تم ربطك بـ '+L[c]+' جروب. راجع جدول محاضراتك');
  return`محاضرون جدد: ${nu} — موجودون: ${up}\nربط مطابق للوقت: ${ex} جروب\nربط بوقت متداخل: ${ov} جروب\nجروبات جديدة أُنشئت: ${cr.length}${cr.length?'\n'+cr.join('\n'):''}\nصفوف بلا يوم/وقت (حسابات فقط): ${noT}\nلم تُربط (${sk.length}):${sk.length?'\n'+sk.join('\n'):''}`});
 b.querySelector('#tp').insertAdjacentHTML('beforebegin','<label style="display:block;margin:10px 0"><input type="checkbox" id="mk"> إنشاء جروب جديد عند عدم وجود جروب مطابق (الافتراضي: ربط المحاضر فقط)</label>')};

// ===== الدرجات =====
async function gradesTab(b){
 const ex=await api('exams?order=id');
 b.innerHTML=`<div class="card"><h3>إنشاء اختبار / تقييم</h3><label>الاسم</label><input id="en"><label>النوع</label><select id="ek"><option value="quiz">كويز</option><option value="midterm">ميد تيرم (اختبار فصلي)</option><option value="final">اختبار نهائي (نهاية الترم)</option><option value="weekly">تقييم أسبوعي</option><option value="monthly">تقييم شهري</option></select><label>الدرجة العظمى</label><input id="em" type="number" value="10"><p class="note">لاختبار الميد تيرم أو النهائي: اختر النوع المناسب (أو ارفعه من ملف)، ثم اربطه بالترم من تبويب «الفصول الدراسية». كل ترم يرتبط باختباره الخاص فلا يحدث أي تداخل بين الأترام.</p><button class="btn" id="ea">إضافة</button></div>
 <div class="card"><h3>الاختبارات الحالية</h3>${ex.map(e=>`<span class="pill">${esc(e.name)} (${e.max_mark}) · <a href="#" data-p="${e.id}" data-v="${e.published?0:1}">${e.published?'منشور — إخفاء':'مخفي — نشر'}</a> <a href="#" data-d="${e.id}" class="bad">✕</a></span> `).join('')||'لا يوجد'}</div><div id="up"></div>`;
 $('#ea').onclick=async()=>{await api('exams','POST',{name:$('#en').value,kind:$('#ek').value,max_mark:+$('#em').value},'return=minimal');gradesTab(b)};
 b.querySelectorAll('[data-p]').forEach(a=>a.onclick=async e=>{e.preventDefault();const v=a.dataset.v=='1';await api('exams?id=eq.'+a.dataset.p,'PATCH',{published:v});if(v){const x=ex.find(q=>q.id==a.dataset.p);notify((await all('students?select=code')).map(q=>q.code),'تم نشر درجات',x.name)}gradesTab(b)});
 b.querySelectorAll('[data-d]').forEach(a=>a.onclick=async e=>{e.preventDefault();if(confirm('حذف الاختبار ودرجاته؟')){await api('exams?id=eq.'+a.dataset.d,'DELETE',null,'return=minimal');gradesTab(b)}});
 upBox($('#up'),'رفع الدرجات','الصف الأول: Code ثم أسماء الاختبارات كأعمدة، ويمكن كتابة الدرجة العظمى بين قوسين مثل Quiz 1 (10). الاختبار الجديد يُنشأ تلقائياً.',
  ()=>dl([['Code','Name','Quiz 1 (10)','Midterm (30)'],['261541','اسم الطالب',8,25]],'grades_template.xlsx'),
  async rows=>{const cols=Object.keys(rows[0]||{}).filter(k=>!['Code','Name'].includes(k));const have=Object.fromEntries((await api('exams')).map(e=>[e.name,e]));
   for(const c of cols){const m=c.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\)\s*$/),nm=m?m[1]:c;if(!have[nm])[have[nm]]=await api('exams','POST',{name:nm,max_mark:m?+m[2]:100})}
   const codes=new Set((await all('students?select=code')).map(s=>s.code));let g=[],skip=0;
   rows.forEach(r=>{const c=S(r.Code);if(!codes.has(c)){skip++;return}cols.forEach(k=>{if(r[k]==null||r[k]==='')return;const nm=(k.match(/^(.*?)\s*\(/)||[0,k])[1];g.push({exam_id:have[nm].id,student_code:c,mark:+r[k]})})});
   await api('grades?on_conflict=exam_id,student_code','POST',g,'resolution=merge-duplicates,return=minimal');
   return`تم رفع ${g.length} درجة، وتخطي ${skip} كود غير مسجل`})}

// ===== شروط الغياب والإنذارات =====
async function rulesTab(b){
 const R=Object.fromEntries((await api('rules')).map(r=>[r.key,r.value])),mo=today().slice(0,7);
 b.innerHTML=`<div class="card"><h3>شروط احتساب الغياب</h3><label>أقل عدد أيام حضور في الشهر قبل الإنذار</label><input id="r1" type="number" value="${R.min_days_per_month??4}"><label>درجة اليوم الواحد</label><input id="r2" type="number" step="0.1" value="${R.mark_per_day??0.5}"><button class="btn" id="sv">حفظ الشروط</button></div><div class="card"><h3>الإنذارات</h3><label>الشهر</label><input id="mo" type="month" value="${mo}"><div id="w" class="wrap"></div></div>`;
 $('#sv').onclick=async()=>{await api('rules?on_conflict=key','POST',[{key:'min_days_per_month',value:+$('#r1').value},{key:'mark_per_day',value:+$('#r2').value}],'resolution=merge-duplicates,return=minimal');alert('تم');rulesTab(b)};
 const show=async()=>{const m=$('#mo').value,[st,at]=await Promise.all([all('students?select=code,name,level&order=name'),all(`attendance?date=gte.${m}-01&date=lte.${monthEnd(m)}&select=student_code,present`)]);
  const c={};at.forEach(a=>{c[a.student_code]=c[a.student_code]||{p:0,a:0};a.present?c[a.student_code].p++:c[a.student_code].a++});
  const min=R.min_days_per_month??4,mk=R.mark_per_day??0.5,rows=st.filter(s=>c[s.code]).map(s=>({...s,p:c[s.code].p,a:c[s.code].a,w:c[s.code].p<min}));
  $('#w').innerHTML=`<table class="table"><tr><th>الكود</th><th>الاسم</th><th>حضور</th><th>غياب</th><th>درجة الحضور</th><th></th></tr>${rows.map(r=>`<tr><td>${r.code}</td><td>${esc(r.name)}</td><td>${r.p}</td><td>${r.a}</td><td>${(r.p*mk).toFixed(1)}</td><td>${r.w?'<span class="bad">⚠ إنذار</span>':''}</td></tr>`).join('')}</table><button class="btn no" id="nw">إرسال الإنذار للمنذَرين (${rows.filter(r=>r.w).length})</button>`;
  $('#nw').onclick=async()=>{await notify(rows.filter(r=>r.w).map(r=>r.code),'إنذار حضور','حضورك أقل من '+min+' أيام في شهر '+m);alert('تم الإرسال')}};
 $('#mo').onchange=show;show()}

// ===== نقل الطلاب وتعديل الجداول =====
async function moveTab(b){
 const sl=await all('slots?select=*,lec:staff(name)&order=day,start_time'),lec=await api('staff?role=eq.lecturer&select=code,name');
 const lb=s=>`${s.day} ${fmt(s.start_time)}-${fmt(s.end_time)} | ${esc(s.place)} | ${esc(s.level)}`,opt=sel=>sl.map(s=>`<option value="${s.id}" ${s.id==sel?'selected':''}>${lb(s)}</option>`).join('');
 b.innerHTML=`<div class="card"><label>الجروب</label><select id="a">${opt()}</select><div id="ed"></div></div><div class="card"><h3>الطلاب</h3><div id="ls"></div><label>نقل المحددين إلى</label><select id="t">${opt()}</select><button class="btn" id="mv">نقل</button></div>`;
 const load=async()=>{const id=+$('#a').value,s=sl.find(x=>x.id==id);if(!s)return;
  $('#ed').innerHTML=`<label>اليوم</label><select id="d">${DAYS.map(d=>`<option ${d==s.day?'selected':''}>${d}</option>`).join('')}</select><label>من</label><input type="time" id="f" value="${fmt(s.start_time)}"><label>إلى</label><input type="time" id="e" value="${fmt(s.end_time)}"><label>المكان</label><input id="p" value="${esc(s.place)}"><label>الليفل</label><input id="l" value="${esc(s.level)}"><label>المحاضر</label><select id="lc"><option value="">-</option>${lec.map(x=>`<option value="${x.code}" ${x.code==s.lecturer_code?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="btn alt" id="sv">حفظ التعديل</button> <button class="btn no" id="rm">حذف الجروب</button>`;
  $('#sv').onclick=async()=>{await api('slots?id=eq.'+id,'PATCH',{day:$('#d').value,start_time:$('#f').value,end_time:$('#e').value,place:$('#p').value,level:$('#l').value,lecturer_code:$('#lc').value||null});const en=await api('enrollments?slot_id=eq.'+id+'&select=student_code');notify(en.map(x=>x.student_code),'تغيير في الجدول','تم تعديل موعد أو مكان جروبك');moveTab(b)};
  $('#rm').onclick=async()=>{if(confirm('حذف الجروب؟')){await api('slots?id=eq.'+id,'DELETE',null,'return=minimal');moveTab(b)}};
  const en=await api('enrollments?slot_id=eq.'+id+'&select=student:students(code,name)');$('#ls').innerHTML=en.map(x=>`<div class="stud" onclick="this.classList.toggle('p')" data-c="${x.student.code}">${esc(x.student.name)}<small>${x.student.code}</small></div>`).join('')||'لا يوجد طلاب'};
 $('#a').onchange=load;load();
 $('#mv').onclick=async()=>{const c=[...document.querySelectorAll('.stud.p')].map(d=>d.dataset.c);if(!c.length)return alert('حدد طلاباً');const from=$('#a').value,to=$('#t').value;if(from==to)return;
  await api(`enrollments?slot_id=eq.${from}&student_code=in.(${c.join(',')})`,'DELETE',null,'return=minimal');await api('enrollments?on_conflict=student_code,slot_id','POST',c.map(x=>({student_code:x,slot_id:+to})),'resolution=merge-duplicates,return=minimal');await notify(c,'تم نقلك','تم تعديل جدولك');alert('تم النقل');load()}}

// ===== تعديل الغياب (للأدمن، أي يوم) =====
async function attTab(b){
 if(me().role!='admin'){b.innerHTML='<div class="msg">للأدمن فقط</div>';return}
 const sl=await all('slots?order=day,start_time');
 b.innerHTML=`<div class="card"><label>الجروب</label><select id="a">${sl.map(s=>`<option value="${s.id}">${s.day} ${fmt(s.start_time)} | ${esc(s.place)}</option>`).join('')}</select><label>التاريخ</label><input type="date" id="dt" value="${today()}"></div><div id="l"></div>`;
 const load=async()=>{const id=$('#a').value,d=$('#dt').value;const en=await api('enrollments?slot_id=eq.'+id+'&select=student:students(code,name)');const at=en.length?await api(`attendance?date=eq.${d}&student_code=in.(${en.map(e=>encodeURIComponent(e.student.code)).join(',')})`):[];const SO=Object.fromEntries(at.map(x=>[x.student_code,x.slot_id]));const on=new Set(at.filter(x=>x.present).map(x=>x.student_code));
  $('#l').innerHTML=en.map(e=>`<div class="stud ${on.has(e.student.code)?'p':''}" data-c="${e.student.code}" onclick="this.classList.toggle('p')">${esc(e.student.name)}<small>${e.student.code}</small></div>`).join('')+'<button class="btn alt" id="sv">حفظ</button>';
  $('#sv').onclick=async()=>{await api('attendance?on_conflict=student_code,date','POST',[...document.querySelectorAll('.stud')].map(x=>({student_code:x.dataset.c,slot_id:SO[x.dataset.c]||+id,date:d,present:x.classList.contains('p'),marked_by:me().code})),'resolution=merge-duplicates,return=minimal');alert('تم')}};
 $('#a').onchange=$('#dt').onchange=load;load()}

// ===== الصلاحيات: اختيار الشخص ثم منحه أي عدد من الصفات والأقسام =====
async function permTab(b){
 if(me().role!='admin'){b.innerHTML='<div class="msg">للأدمن فقط</div>';return}
 const as=await api('staff?select=code,name,role,roles,perms&order=name'),R=[['admin','أدمن'],['assistant','مساعد أدمن'],['affairs','شؤون الطلاب'],['lecturer','محاضر']],PRI=R.map(x=>x[0]),T=TABNAMES.filter(t=>!['الصلاحيات','حسابات'].includes(t));
 b.innerHTML=`<div class="card"><h3>اختيار الشخص</h3><label>الحساب</label><select id="ps"><option value="">اختر الشخص...</option>${as.map(a=>`<option value="${a.code}">${esc(a.name)} (${a.code})</option>`).join('')}</select></div><div id="pb"></div>`;
 $('#ps').onchange=()=>{const a=as.find(x=>x.code==$('#ps').value);if(!a){$('#pb').innerHTML='';return}const rs=a.roles||[a.role];
  $('#pb').innerHTML=`<div class="card"><h3>صلاحيات ${esc(a.name)}</h3><label>الصفات — اضغط لاختيار واحدة أو أكثر</label><div id="rc">${R.map(([k,l])=>`<button type="button" class="chip ${rs.includes(k)?'on':''}" data-k="${k}">${l}</button>`).join('')}</div><label>الأقسام المسموح له برؤيتها — اختر ما تشاء</label><div id="tc">${T.map(t=>`<button type="button" class="chip ${a.perms?.[t]?'on':''}" data-k="${t}">${t}</button>`).join('')}</div><button type="button" class="btn alt" id="sa">تحديد كل الأقسام</button><button type="button" class="btn alt" id="sn">مسح الأقسام</button><button type="button" class="btn" id="sv">حفظ الصلاحيات</button></div>`;
  $('#pb').onclick=e=>{const c=e.target.closest('.chip');if(c)c.classList.toggle('on')};
  $('#sa').onclick=()=>document.querySelectorAll('#tc .chip').forEach(c=>c.classList.add('on'));$('#sn').onclick=()=>document.querySelectorAll('#tc .chip').forEach(c=>c.classList.remove('on'));
  $('#sv').onclick=async()=>{const roles=[...document.querySelectorAll('#rc .chip.on')].map(x=>x.dataset.k),p={};document.querySelectorAll('#tc .chip.on').forEach(x=>p[x.dataset.k]=true);if(!roles.length)return alert('اختر صفة واحدة على الأقل');
   await api('staff?code=eq.'+a.code,'PATCH',{role:PRI.find(x=>roles.includes(x)),roles,perms:p});a.roles=roles;a.role=PRI.find(x=>roles.includes(x));a.perms=p;alert('تم حفظ الصلاحيات')}}}
