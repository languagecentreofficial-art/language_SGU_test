/* ===== الأدمن: الفصول الدراسية + نتائج التقييمات + تسجيل الغياب اليدوي ===== */
const EV_KEYS=['attendance','participation','assignment','presentation','midterm','final'];
const EV_KIND={quiz:'كويز',midterm:'ميد تيرم',final:'نهائي',weekly:'أسبوعي',monthly:'شهري'};

/* ---------- الفصول الدراسية ---------- */
async function termsTab(b){
 if(me().role!='admin'){b.innerHTML='<div class="msg">للأدمن فقط</div>';return}
 const [terms,ex]=await Promise.all([api('terms?order=start_date.desc').catch(()=>null),api('exams?order=id')]);
 if(!terms)return b.innerHTML='<div class="msg">جداول الفصول غير موجودة. شغّل ملف <b>database/4_evaluations_and_attendance.sql</b> في Supabase ثم أعد تحميل الصفحة.</div>';
 const act=terms.find(t=>t.status=='active'),tz=evToday(),y=new Date().getFullYear(),m=new Date().getMonth()+1,yr=m>=9?y+'/'+(y+1):(y-1)+'/'+y;
 const last=terms.map(t=>t.end_date).filter(Boolean).sort().pop(),nextStart=last?evAdd(last,1):tz;
 const used=(id,k)=>terms.some(t=>t.id!=id&&t.config&&t.config[k]&&t.config[k].exam_id&&terms.length);
 const cv=(t,k,f,d)=>{const v=t.config&&t.config[k]&&t.config[k][f];return v==null?d:v};
 const exOpts=(t,k)=>'<option value="">— لم يُحدَّد —</option>'+ex.slice().sort((a,c)=>(c.kind==k)-(a.kind==k)).map(e=>`<option value="${e.id}" ${cv(t,k,'exam_id',null)==e.id?'selected':''}>${esc(e.name)} (${e.max_mark})${e.kind?' · '+(EV_KIND[e.kind]||e.kind):''}</option>`).join('');
 const row=(t,k,label,extra)=>`<tr><td>${label}</td><td><input type="number" min="0" step="0.5" style="width:90px" data-t="${t.id}" data-k="${k}" data-f="max" value="${cv(t,k,'max','')}"></td><td>${extra||''}</td><td><input type="checkbox" data-t="${t.id}" data-k="${k}" data-f="show" ${cv(t,k,'show',true)!==false?'checked':''}></td></tr>`;
 const settings=t=>`<table class="table"><tr><th>البند</th><th>الدرجة العظمى</th><th>إعداد إضافي</th><th>يظهر للطالب</th></tr>
  ${row(t,'attendance','الغياب (تلقائي من سجل الحضور)',`<small>عدد الحضور المطلوب للدرجة الكاملة (اتركه فارغاً = حسب نسبة الحضور)</small><input type="number" min="1" style="width:90px" data-t="${t.id}" data-k="attendance" data-f="required" value="${cv(t,'attendance','required','')}">`)}
  ${row(t,'participation','المشاركة (يدوي أسبوعي)',`<small>الدرجة لكل حصة</small><input type="number" min="0" step="0.25" style="width:90px" data-t="${t.id}" data-k="participation" data-f="per_session" value="${cv(t,'participation','per_session',0.5)}">`)}
  ${row(t,'assignment','Assignment (يدوي)')}${row(t,'presentation','البرزنتيشن (يدوي)')}
  ${row(t,'midterm','الميد تيرم (من الدرجات)',`<select data-t="${t.id}" data-k="midterm" data-f="exam_id">${exOpts(t,'midterm')}</select>`)}
  ${row(t,'final','الاختبار النهائي (من الدرجات)',`<select data-t="${t.id}" data-k="final" data-f="exam_id">${exOpts(t,'final')}</select>`)}</table>
  <p class="note">ارفع اختبار الميد تيرم أو النهائي من تبويب «الدرجات» (النوع: ميد تيرم / نهائي)، ثم اختره هنا لهذا الترم. كل ترم يرتبط باختباره الخاص، ولا يمكن استخدام نفس الاختبار في ترمين فلا يحدث تداخل.</p>`;
 b.innerHTML=`<div class="card"><h3>الترم الدراسي الحالي</h3>${act?`<p><b>${esc(act.name)}</b> — العام ${esc(act.year_label)} — بدأ ${act.start_date}</p><p class="note">عند إغلاق الترم تُقفل سجلات التقييم (لا يستطيع المحاضرون تعديلها) وتُحفظ نتائجه. بعدها تفعّل ترماً جديداً (ثانياً أو صيفياً) فيبدأ كل طالب بسجلات جديدة.</p><button class="btn no" id="tcl">إغلاق الترم الدراسي</button>`:`<div class="msg">لا يوجد ترم نشط. فعّل ترماً جديداً ليتمكن المحاضرون من التقييم.</div>
  <label>اسم الترم</label><input id="tn" list="tnl" value="${terms.length?'Second Term':'First Term'}"><datalist id="tnl"><option value="First Term"><option value="Second Term"><option value="Summer Term"></datalist><label>العام الدراسي</label><input id="ty" value="${esc(terms[0]?terms[0].year_label:yr)}"><label>تاريخ بداية الترم</label><input type="date" id="ts" value="${nextStart}"><label class="chk"><input type="checkbox" id="tcp" ${terms.length?'checked':''}> نسخ إعدادات التقييم من آخر ترم</label><button class="btn" id="tnw">تفعيل الترم</button>`}</div>
 ${terms.map(t=>`<div class="card"><details ${t.status=='active'?'open':''}><summary>${esc(t.name)} — ${esc(t.year_label)} <span class="pill">${t.status=='active'?'جارٍ':'منتهٍ'}</span> ${t.visible?'<span class="pill">ظاهر للطلاب</span>':''}</summary><p class="note">من ${t.start_date} ${t.end_date?'إلى '+t.end_date:''}</p><label class="chk"><input type="checkbox" data-vis="${t.id}" ${t.visible?'checked':''}> إظهار نتائج هذا الترم للطلاب (في تبويب «تقييماتي»)</label>${settings(t)}<button class="btn alt" data-sv="${t.id}">حفظ إعدادات الترم</button></details></div>`).join('')}`;
 if(act)$('#tcl').onclick=async()=>{if(!confirm('إغلاق الترم "'+act.name+'"؟\nتُقفل سجلاته ولا يستطيع المحاضرون التعديل بعدها.'))return;try{await api('terms?id=eq.'+act.id,'PATCH',{status:'closed',end_date:evToday()});alert('تم إغلاق الترم. يمكنك الآن تفعيل ترم جديد.');termsTab(b)}catch(e){alert(e.message)}};
 else $('#tnw').onclick=async()=>{const name=$('#tn').value.trim(),yl=$('#ty').value.trim(),st=$('#ts').value;if(!name||!yl||!st)return alert('أكمل الاسم والعام وتاريخ البداية');
  if(terms.some(t=>t.end_date&&t.end_date>=st))return alert('تاريخ البداية يجب أن يكون بعد نهاية الترم السابق ('+last+')');
  let cfg;if($('#tcp').checked&&terms[0]&&terms[0].config){cfg=JSON.parse(JSON.stringify(terms[0].config));['midterm','final'].forEach(k=>{if(cfg[k])cfg[k].exam_id=null})}
  try{await api('terms','POST',{name,year_label:yl,start_date:st,status:'active',visible:false,...(cfg?{config:cfg}:{})},'return=minimal');alert('تم تفعيل الترم. اربط اختبار الميد تيرم والنهائي من إعدادات الترم.');termsTab(b)}catch(e){alert(e.message)}};
 b.querySelectorAll('[data-sv]').forEach(k=>k.onclick=async()=>{const id=+k.dataset.sv,t=terms.find(x=>x.id==id),cfg=JSON.parse(JSON.stringify(t.config||{}));
  b.querySelectorAll('[data-t="'+id+'"]').forEach(el=>{const key=el.dataset.k,f=el.dataset.f;cfg[key]=cfg[key]||{};cfg[key][f]=el.type=='checkbox'?el.checked:(el.value===''?null:(f=='exam_id'?+el.value:+el.value))});
  for(const key of EV_KEYS){const c=cfg[key]||{};if(!(c.max>=0))return alert('الدرجة العظمى غير صحيحة: '+key)}
  const m=cfg.midterm.exam_id,f=cfg.final.exam_id;if(m&&f&&m==f)return alert('لا يمكن أن يكون الميد تيرم والنهائي نفس الاختبار');
  for(const [key,eid] of [['الميد تيرم',m],['النهائي',f]])if(eid&&terms.some(o=>o.id!=id&&o.config&&[o.config.midterm,o.config.final].some(c=>c&&c.exam_id==eid)))return alert('اختبار '+key+' مستخدم في ترم آخر. اختر اختباراً خاصاً بهذا الترم.');
  const vis=b.querySelector('[data-vis="'+id+'"]').checked;
  try{await api('terms?id=eq.'+id,'PATCH',{config:cfg,visible:vis});alert('تم الحفظ');termsTab(b)}catch(e){alert(e.message)}})}

/* ---------- نتائج التقييمات (ترم أو عام كامل) ---------- */
async function evalReportTab(b){
 const terms=await api('terms?order=start_date.desc').catch(()=>null);
 if(!terms)return b.innerHTML='<div class="msg">شغّل ملف <b>database/4_evaluations_and_attendance.sql</b> أولاً.</div>';
 if(!terms.length)return b.innerHTML='<div class="msg">لا توجد فصول دراسية بعد.</div>';
 const years=[...new Set(terms.map(t=>t.year_label))];let cur=null;
 b.innerHTML=`<div class="card"><h3>نتائج التقييمات</h3><label>العرض</label><select id="rm"><option value="t">ترم محدد</option><option value="y">العام الدراسي كاملاً</option></select><div id="wt"><label>الترم</label><select id="rt">${terms.map(t=>`<option value="${t.id}">${esc(t.name)} — ${esc(t.year_label)} ${t.status=='active'?'(جارٍ)':'(منتهٍ)'}</option>`).join('')}</select></div><div id="wy" style="display:none"><label>العام الدراسي</label><select id="ry">${years.map(y=>`<option>${esc(y)}</option>`).join('')}</select></div><label>الليفل (اختياري)</label><input id="rl"><label>الكلية (اختياري)</label><input id="rc"><label>بحث بالاسم أو الكود (اختياري)</label><input id="rq"><button class="btn" id="rg">عرض النتائج</button></div><div id="rr"></div>`;
 const sync=()=>{const y=$('#rm').value=='y';$('#wt').style.display=y?'none':'';$('#wy').style.display=y?'':'none'};$('#rm').onchange=sync;sync();
 const fl=()=>({level:$('#rl').value.trim(),college:$('#rc').value.trim(),q:$('#rq').value.trim()});
 $('#rg').onclick=async()=>{const k=$('#rg');k.disabled=true;$('#rr').innerHTML='<div class="msg">جارٍ الحساب...</div>';
  try{if($('#rm').value=='t'){const r=await gw('eval_report',{term_id:+$('#rt').value,...fl()});cur={mode:'t',r};drawTerm(r)}
   else{const ts=terms.filter(t=>t.year_label==$('#ry').value).slice().reverse(),R=[];for(const t of ts)R.push(await gw('eval_report',{term_id:t.id,...fl()}));cur={mode:'y',R,y:$('#ry').value};drawYear(R,$('#ry').value)}}
  catch(e){$('#rr').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}k.disabled=false};
 const drawTerm=r=>{const c=r.cfg,H=['الطالب','الكود','الكلية','المستوى الدراسي','English','الغياب /'+c.attendance.max,'المشاركة /'+c.participation.max,'Assignment /'+c.assignment.max,'البرزنتيشن /'+c.presentation.max,'الميد تيرم /'+c.midterm.max,'النهائي /'+c.final.max,'المجموع /'+r.total_max];
  const D=r.rows.map(s=>[s.name,s.code,s.college,s.study_level,s.level,s.attendance,s.participation,s.assignment,s.presentation,s.midterm,s.final,s.total]);
  $('#rr').innerHTML=`<div class="card wrap"><h3>${esc(r.term.name)} — ${esc(r.term.year_label)} (${r.rows.length} طالب)</h3><p class="note">${r.term.status=='active'?'الترم جارٍ، النتائج حتى اليوم.':'ترم منتهٍ.'} ${r.term.visible?'ظاهر للطلاب.':'غير ظاهر للطلاب (فعّله من «الفصول الدراسية»).'}</p><button class="btn alt" id="rx">تحميل Excel</button><button class="btn alt" id="rp">PDF / طباعة</button><table class="table"><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${D.map(d=>`<tr>${d.map((v,i)=>`<td>${i<5?esc(v):i==11?'<b>'+evN(v)+'</b>':evN(v)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="12">لا توجد نتائج</td></tr>'}</table></div>`;
  $('#rx').onclick=()=>xl([H,...D.map(d=>d.map((v,i)=>i>4?(v==null?'':v):v))],r.term.name+'_'+r.term.year_label);
  $('#rp').onclick=()=>evPrint('نتائج التقييمات — '+r.term.name+' '+r.term.year_label,'عدد الطلاب: '+r.rows.length,`<table class="table"><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${D.map(d=>`<tr>${d.map((v,i)=>`<td>${i<5?esc(v):evN(v)}</td>`).join('')}</tr>`).join('')}</table>`)};
 const drawYear=(R,y)=>{const M={};R.forEach((r,i)=>r.rows.forEach(s=>{const o=M[s.code]=M[s.code]||{...s,t:{}};o.t[i]=s.total}));
  const H=['الطالب','الكود','الكلية','المستوى الدراسي','English',...R.map(r=>r.term.name+' /'+r.total_max),'المتوسط'];
  const D=Object.values(M).sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar')).map(o=>{const v=R.map((_,i)=>o.t[i]??null),n=v.filter(x=>x!=null);return[o.name,o.code,o.college,o.study_level,o.level,...v,n.length?Math.round(n.reduce((s,x)=>s+x,0)/n.length*100)/100:null]});
  $('#rr').innerHTML=`<div class="card wrap"><h3>النتيجة النهائية للعام ${esc(y)} (${D.length} طالب)</h3><p class="note">المتوسط = متوسط مجموع الترمات التي لها نتائج للطالب.</p><button class="btn alt" id="rx">تحميل Excel</button><button class="btn alt" id="rp">PDF / طباعة</button><table class="table"><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${D.map(d=>`<tr>${d.map((v,i)=>`<td>${i<5?esc(v):evN(v)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="8">لا توجد نتائج</td></tr>'}</table></div>`;
  $('#rx').onclick=()=>xl([H,...D.map(d=>d.map((v,i)=>i>4&&v==null?'':v))],'Year_'+y);
  $('#rp').onclick=()=>evPrint('النتيجة النهائية للعام الدراسي '+y,'عدد الطلاب: '+D.length,`<table class="table"><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${D.map(d=>`<tr>${d.map((v,i)=>`<td>${i<5?esc(v):evN(v)}</td>`).join('')}</tr>`).join('')}</table>`)};
 const xl=(rows,name)=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Results');XLSX.writeFile(wb,String(name).replace(/[^\w\-]+/g,'_')+'.xlsx')}}

/* ---------- تسجيل حضور / غياب يدوي لطلاب محددين في أي تاريخ ---------- */
async function manualAttTab(b){
 const sel=new Map(),enc_=encodeURIComponent;
 b.innerHTML=`<div class="card"><h3>تسجيل حضور / غياب يدوي</h3><label>ابحث باسم الطالب أو كوده</label><input id="mq" placeholder="جزء من الاسم أو الكود"><button class="btn alt" id="ms" type="button">بحث</button><div id="mres"></div></div>
 <div class="card"><h3>إضافة مجموعة بالأكواد</h3><label>الصق الأكواد مفصولة بمسافة أو سطر جديد</label><textarea id="mc" rows="3"></textarea><button class="btn alt" id="mca" type="button">إضافة الأكواد</button></div>
 <div class="card"><h3>الطلاب المحددون (<span id="mn">0</span>)</h3><div id="msl"></div><label>التاريخ</label><input type="date" id="md" value="${evToday()}" max="${evToday()}"><label>الحالة</label><select id="mst"><option value="1">حاضر</option><option value="0">غائب</option></select><p class="note">للطالب حالة واحدة فقط في اليوم. إن كان له سجل في هذا التاريخ يُستبدل بالحالة المختارة.</p><button class="btn" id="mgo">تسجيل</button><button class="btn no" id="mclr" type="button">مسح التحديد</button></div>`;
 const draw=()=>{$('#mn').textContent=sel.size;$('#msl').innerHTML=[...sel].map(([c,n])=>`<span class="pill">${esc(n)} (${esc(c)}) <a href="#" data-x="${esc(c)}" class="bad">✕</a></span>`).join('')||'<small>لم تحدد أحداً بعد</small>';
  $('#msl').querySelectorAll('[data-x]').forEach(a=>a.onclick=e=>{e.preventDefault();sel.delete(a.dataset.x);draw()})};draw();
 $('#ms').onclick=async()=>{const q=$('#mq').value.replace(/[,()*%"']/g,' ').trim();if(!q)return;
  const r=await api(`students?select=code,name,college,level&or=${enc_(`(name.ilike.*${q}*,code.ilike.*${q}*)`)}&order=name&limit=40`);
  $('#mres').innerHTML=r.map(s=>`<div class="stud" data-c="${esc(s.code)}" data-n="${esc(s.name)}"><span>${esc(s.name)}<br><small>${esc(s.code)} · ${esc(s.college)} · ${esc(s.level)}</small></span><span>${sel.has(s.code)?'✔ مضاف':'+ إضافة'}</span></div>`).join('')||'<div class="msg">لا توجد نتائج</div>';
  $('#mres').querySelectorAll('.stud').forEach(d=>d.onclick=()=>{sel.set(d.dataset.c,d.dataset.n);d.lastChild.textContent='✔ مضاف';draw()})};
 $('#mq').onkeydown=e=>{if(e.key=='Enter')$('#ms').click()};
 $('#mca').onclick=async()=>{const cs=[...new Set($('#mc').value.split(/\s+/).filter(Boolean))];if(!cs.length)return;const got=new Set();
  for(let i=0;i<cs.length;i+=80)(await api(`students?select=code,name&code=in.(${cs.slice(i,i+80).map(enc_).join(',')})`)).forEach(s=>{sel.set(s.code,s.name);got.add(s.code)});
  draw();const miss=cs.filter(c=>!got.has(c));$('#mc').value=miss.join('\n');alert('تمت إضافة '+got.size+' طالب'+(miss.length?'، وغير موجود: '+miss.length+' (تُركت في الخانة)':''))};
 $('#mclr').onclick=()=>{sel.clear();draw()};
 $('#mgo').onclick=async()=>{const codes=[...sel.keys()],d=$('#md').value,present=$('#mst').value=='1';if(!codes.length)return alert('حدد طالباً واحداً على الأقل');if(!d)return alert('حدد التاريخ');
  if(!confirm('تسجيل '+codes.length+' طالب كـ'+(present?'حاضر':'غائب')+' بتاريخ '+d+'؟'))return;const k=$('#mgo');k.disabled=true;
  try{const ex={},en={};
   for(let i=0;i<codes.length;i+=80){const inl=codes.slice(i,i+80).map(enc_).join(',');
    (await api(`attendance?date=eq.${d}&student_code=in.(${inl})`)).forEach(a=>ex[a.student_code]=a);
    (await api(`enrollments?student_code=in.(${inl})&select=student_code,slot:slots(id,day)`)).forEach(e=>{if(e.slot)(en[e.student_code]=en[e.student_code]||[]).push(e.slot)})}
   const day=evDayOf(d),rows=[],skip=[];
   codes.forEach(c=>{const L=en[c]||[],sid=ex[c]?ex[c].slot_id:((L.find(s=>s.day==day)||L[0]||{}).id);if(!sid)skip.push(c);else rows.push({student_code:c,slot_id:sid,date:d,present,marked_by:me().code})});
   for(let i=0;i<rows.length;i+=200)await api('attendance?on_conflict=student_code,date','POST',rows.slice(i,i+200),'resolution=merge-duplicates,return=minimal');
   alert('تم تسجيل '+rows.length+' طالب كـ'+(present?'حاضر':'غائب')+' بتاريخ '+d+(skip.length?'\nلم يُسجَّلوا لأنهم غير مسجلين في أي جروب: '+skip.join('، '):''));
   if(rows.length){sel.clear();draw()}}catch(e){alert(e.message)}k.disabled=false}}


/* ---------- ساعات عمل المحاضرين (الأسبوع والشهر) ---------- */
async function hoursTab(b){
 const HD=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'],tz=evToday();
 b.innerHTML=`<div class="card"><h3>ساعات عمل المحاضرين</h3><label>أي يوم داخل الأسبوع (الأسبوع من السبت إلى الجمعة)</label><input type="date" id="hw" value="${tz}"><label>الشهر</label><input type="month" id="hm" value="${tz.slice(0,7)}"><p class="note"><b>المجدول</b>: ساعات الجروبات حسب الجدول الأسبوعي. <b>الفعلي</b>: الحصص التي سُجّل فيها غياب فعلاً في الفترة.</p><button class="btn" id="hg">عرض التقرير</button></div><div id="ho"></div>`;
 const wk=d=>{const x=new Date(d+'T00:00:00Z'),back=(x.getUTCDay()+1)%7;x.setUTCDate(x.getUTCDate()-back);const s=x.toISOString().slice(0,10);return[s,evAdd(s,6)]};
 const agg=r=>{const L={};r.rows.forEach(s=>{const o=L[s.lecturer_code]=L[s.lecturer_code]||{name:s.lecturer_name,g:0,ss:0,hs:0,sa:0,ha:0,d:{}};o.g++;o.ss+=s.sched;o.hs+=s.sched*s.hours;o.sa+=s.actual;o.ha+=s.actual*s.hours;o.d[s.day]=(o.d[s.day]||0)+s.sched*s.hours});return Object.values(L).sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'))};
 const f2=v=>evN(Math.round(v*100)/100);
 $('#hg').onclick=async()=>{const k=$('#hg');k.disabled=true;$('#ho').innerHTML='<div class="msg">جارٍ حساب الساعات...</div>';
  try{const [wf,wt]=wk($('#hw').value||tz),m=$('#hm').value||tz.slice(0,7),[W,M]=await Promise.all([gw('hours_report',{from:wf,to:wt}),gw('hours_report',{from:m+'-01',to:monthEnd(m)})]),A=agg(W),B=agg(M);
   const wH=['المحاضر','عدد الجروبات',...HD.map(d=>d+' (مجدول)'),'المجدول (ساعة)','الفعلي (ساعة)'],wR=A.map(o=>[o.name,o.g,...HD.map(d=>f2(o.d[d]||0)),f2(o.hs),f2(o.ha)]);
   const mH=['المحاضر','حصص مجدولة','ساعات مجدولة','حصص فعلية','ساعات فعلية','الالتزام %'],mR=B.map(o=>[o.name,o.ss,f2(o.hs),o.sa,f2(o.ha),o.hs?f2(o.ha/o.hs*100)+'%':'-']);
   const dH=['المحاضر','اليوم','من','إلى','الكلاس','الليفل','ساعات الحصة','حصص مجدولة','حصص فعلية','ساعات فعلية'],dR=M.rows.slice().sort((a,c)=>String(a.lecturer_name).localeCompare(String(c.lecturer_name),'ar')||HD.indexOf(a.day)-HD.indexOf(c.day)||a.start.localeCompare(c.start)).map(s=>[s.lecturer_name,s.day,s.start,s.end,s.place,s.level,f2(s.hours),s.sched,s.actual,f2(s.actual*s.hours)]);
   const tot=(R,i)=>f2(R.reduce((s,r)=>s+(+String(r[i]).replace('%','')||0),0)),tbl=(H,R,foot)=>`<table class="table"><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${R.map(r=>`<tr>${r.map((v,i)=>`<td>${i?esc(v):'<b>'+esc(v)+'</b>'}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${H.length}">لا توجد بيانات</td></tr>`}${foot||''}</table>`;
   const wFoot=R=>R.length?`<tr>${['الإجمالي','',...HD.map((_,i)=>tot(R,i+2)),tot(R,9),tot(R,10)].map(v=>`<th>${v}</th>`).join('')}</tr>`:'',mFoot=R=>R.length?`<tr><th>الإجمالي</th><th>${tot(R,1)}</th><th>${tot(R,2)}</th><th>${tot(R,3)}</th><th>${tot(R,4)}</th><th></th></tr>`:'';
   $('#ho').innerHTML=`<div class="card wrap"><h3>الأسبوع: ${wf} → ${wt}</h3>${tbl(wH,wR,wFoot(wR))}</div><div class="card wrap"><h3>الشهر: ${m}</h3>${tbl(mH,mR,mFoot(mR))}</div><div class="card wrap"><details><summary>تفاصيل كل جروب خلال الشهر (${dR.length})</summary>${tbl(dH,dR)}</details><button class="btn alt" id="hx">تحميل Excel</button><button class="btn alt" id="hp">PDF / طباعة</button></div>`;
   $('#hx').onclick=()=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');const wb=XLSX.utils.book_new();[['Week',wH,wR],['Month',mH,mR],['Details',dH,dR]].forEach(([n,H,Rw])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([H,...Rw]),n));XLSX.writeFile(wb,'lecturer_hours_'+m+'.xlsx')};
   $('#hp').onclick=()=>printReport('ساعات عمل المحاضرين','الأسبوع '+wf+' → '+wt+' | الشهر '+m,`<h3>الأسبوع</h3>${tbl(wH,wR,wFoot(wR))}<h3>الشهر</h3>${tbl(mH,mR,mFoot(mR))}<h3>تفاصيل الجروبات (الشهر)</h3>${tbl(dH,dR)}`)}
  catch(e){$('#ho').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}k.disabled=false};
 $('#hg').click()}
