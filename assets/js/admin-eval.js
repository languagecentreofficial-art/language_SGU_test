/* ===== الأدمن: الفصول الدراسية + نتائج التقييمات + تسجيل الغياب اليدوي ===== */
const EV_KEYS=['participation','assignment','midterm','final'];
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
  <tr><td>الحضور (نسبة وليس درجات)</td><td>—</td><td><small>الحد الأدنى لنسبة الحضور %</small><input type="number" min="0" max="100" step="1" style="width:90px" data-t="${t.id}" data-k="attendance" data-f="min_pct" value="${cv(t,'attendance','min_pct',75)}"><br><small>احتساب الحصص المتوقعة</small><select data-t="${t.id}" data-k="attendance" data-f="basis"><option value="schedule" ${cv(t,'attendance','basis','schedule')!='recorded'?'selected':''}>حسب جدول كل طالب (الأيام التي يجب أن يحضرها)</option><option value="recorded" ${cv(t,'attendance','basis','schedule')=='recorded'?'selected':''}>حسب الحصص المسجّل فيها غياب فقط</option></select></td><td><input type="checkbox" data-t="${t.id}" data-k="attendance" data-f="show" ${cv(t,'attendance','show',true)!==false?'checked':''}></td></tr>
  ${row(t,'participation','المشاركة (يضع المحاضر درجة كل أسبوع حتى الحد الأقصى)',`<small>أقصى درجة في الأسبوع الواحد (اختياري)</small><input type="number" min="0" step="0.25" style="width:90px" data-t="${t.id}" data-k="participation" data-f="per_session" value="${cv(t,'participation','per_session','')}">`)}
  ${row(t,'assignment','الواجبات / Assignment (أسبوعياً من المحاضر حتى الحد الأقصى)')}
  ${row(t,'midterm','الميد تيرم (تلقائي من الدرجات)',`<select data-t="${t.id}" data-k="midterm" data-f="exam_id">${exOpts(t,'midterm')}</select>`)}
  ${row(t,'final','الاختبار النهائي (تلقائي من الدرجات)',`<select data-t="${t.id}" data-k="final" data-f="exam_id">${exOpts(t,'final')}</select>`)}</table>
  <p class="note">مجموع الدرجات العظمى الحالي: <b>${EV_KEYS.reduce((s,k)=>s+(+cv(t,k,'max',0)),0)}</b> (المقترح 100: ميد تيرم 20 + نهائي 70 + مشاركة 5 + واجبات 5). ارفع اختبار الميد تيرم أو النهائي من تبويب «الدرجات» ثم اختره هنا لهذا الترم، ولا يمكن استخدام نفس الاختبار في ترمين فلا يحدث تداخل.</p>`;
 b.innerHTML=`<div class="card"><h3>الترم الدراسي الحالي</h3>${act?`<p><b>${esc(act.name)}</b> — العام ${esc(act.year_label)} — بدأ ${act.start_date}</p><p class="note">عند إغلاق الترم تُقفل سجلات التقييم (لا يستطيع المحاضرون تعديلها) وتُحفظ نتائجه. بعدها تفعّل ترماً جديداً (ثانياً أو صيفياً) فيبدأ كل طالب بسجلات جديدة.</p><button class="btn no" id="tcl">إغلاق الترم الدراسي</button>`:`<div class="msg">لا يوجد ترم نشط. فعّل ترماً جديداً ليتمكن المحاضرون من التقييم.</div>
  <label>اسم الترم</label><input id="tn" list="tnl" value="${terms.length?'Second Term':'First Term'}"><datalist id="tnl"><option value="First Term"><option value="Second Term"><option value="Summer Term"></datalist><label>العام الدراسي</label><input id="ty" value="${esc(terms[0]?terms[0].year_label:yr)}"><label>تاريخ بداية الترم</label><input type="date" id="ts" value="${nextStart}"><label class="chk"><input type="checkbox" id="tcp" ${terms.length?'checked':''}> نسخ إعدادات التقييم من آخر ترم</label><label class="chk"><input type="checkbox" id="tub" checked> رفع حجب «نسبة الحضور» عن الطلاب المحجوبين عند بدء الترم الجديد</label><button class="btn" id="tnw">تفعيل الترم</button>`}</div>
 <div class="card"><h3>بدء احتساب الحضور من اليوم (تصفير الغياب السابق)</h3><p class="note">يحذف كل سجلات الحضور والغياب قبل اليوم، وتبدأ نسبة الحضور من اليوم (ويُضبط بدء الترم الجاري على اليوم). تُنزَّل نسخة احتياطية Excel تلقائياً قبل الحذف. لا يمكن التراجع. لن يتأثر ما يراه الطلاب من سجل الأيام الجديدة.</p><button class="btn no" id="trs">تصفير الغياب السابق والبدء من اليوم</button></div>
 ${terms.map(t=>`<div class="card"><details ${t.status=='active'?'open':''}><summary>${esc(t.name)} — ${esc(t.year_label)} <span class="pill">${t.status=='active'?'جارٍ':'منتهٍ'}</span> ${t.visible?'<span class="pill">ظاهر للطلاب</span>':''}</summary><p class="note">من ${t.start_date} ${t.end_date?'إلى '+t.end_date:''}</p><label class="chk"><input type="checkbox" data-vis="${t.id}" ${t.visible?'checked':''}> إظهار نتائج هذا الترم للطلاب (في تبويب «تقييماتي»)</label>${settings(t)}<button class="btn alt" data-sv="${t.id}">حفظ إعدادات الترم</button></details></div>`).join('')}`;
 if(act)$('#tcl').onclick=async()=>{try{const pre=await gw('att_overview',{term_id:act.id}),below=pre.rows.filter(x=>x.below&&!x.blocked).length;
  if(!confirm('إغلاق الترم "'+act.name+'"؟\nتُقفل سجلاته ولا يستطيع المحاضرون التعديل بعدها.\n\nالحد الأدنى لنسبة الحضور: '+pre.min_pct+'%\nطلاب دون النسبة: '+below+(below?'\nسيُسأل بعد الإغلاق عن حجبهم.':'')))return;
  await api('terms?id=eq.'+act.id,'PATCH',{status:'closed',end_date:evToday()});let msg='تم إغلاق الترم.';
  if(below&&confirm('حجب '+below+' طالب لم يتجاوزوا نسبة الحضور '+pre.min_pct+'%؟\nيُقفل لهم كل شيء ويظهر أنهم محجوبون بسبب نسبة الحضور، وتراهم في تبويب «نسبة الحضور».')){const r=await gw('att_block',{term_id:act.id});msg+=' وتم حجب '+r.blocked+' طالب.'}
  alert(msg+' يمكنك الآن تفعيل ترم جديد.');termsTab(b)}catch(e){alert(e.message)}};
 else $('#tnw').onclick=async()=>{const name=$('#tn').value.trim(),yl=$('#ty').value.trim(),st=$('#ts').value;if(!name||!yl||!st)return alert('أكمل الاسم والعام وتاريخ البداية');
  if(terms.some(t=>t.end_date&&t.end_date>=st))return alert('تاريخ البداية يجب أن يكون بعد نهاية الترم السابق ('+last+')');
  let cfg;if($('#tcp').checked&&terms[0]&&terms[0].config){cfg=JSON.parse(JSON.stringify(terms[0].config));['midterm','final'].forEach(k=>{if(cfg[k])cfg[k].exam_id=null})}
  try{await api('terms','POST',{name,year_label:yl,start_date:st,status:'active',visible:false,...(cfg?{config:cfg}:{})},'return=minimal');if($('#tub').checked){try{await gw('att_unblock')}catch(e){}}alert('تم تفعيل الترم. اربط اختبار الميد تيرم والنهائي من إعدادات الترم.');termsTab(b)}catch(e){alert(e.message)}};
 $('#trs').onclick=async()=>{const tz2=evToday();if(!confirm('سيتم حذف كل سجلات الحضور والغياب قبل '+tz2+' نهائياً وبدء احتساب النسبة من اليوم.\nتُنزَّل نسخة احتياطية أولاً. متابعة؟'))return;
  if(prompt('للتأكيد اكتب كلمة: تصفير')!=='تصفير')return alert('لم يتم الحذف');const k=$('#trs');k.disabled=true;
  try{const old=await all('attendance?date=lt.'+tz2+'&select=*');
   if(old.length){if(typeof XLSX!='undefined'){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(old),'Attendance');XLSX.writeFile(wb,'attendance_backup_'+tz2+'.xlsx')}else if(!confirm('تعذر تنزيل نسخة احتياطية (مكتبة الإكسيل لم تُحمَّل). متابعة الحذف بدونها؟')){k.disabled=false;return}
    await api('attendance?date=lt.'+tz2,'DELETE')}
   if(act)await api('terms?id=eq.'+act.id,'PATCH',{start_date:tz2});
   alert('تم حذف '+old.length+' سجل قبل '+tz2+(act?' وضبط بداية الترم الجاري على اليوم.':'.'));termsTab(b)}catch(e){alert(e.message);k.disabled=false}};
 b.querySelectorAll('[data-sv]').forEach(k=>k.onclick=async()=>{const id=+k.dataset.sv,t=terms.find(x=>x.id==id),cfg=JSON.parse(JSON.stringify(t.config||{}));
  b.querySelectorAll('[data-t="'+id+'"]').forEach(el=>{const key=el.dataset.k,f=el.dataset.f;cfg[key]=cfg[key]||{};cfg[key][f]=el.type=='checkbox'?el.checked:(f=='basis'?el.value:(el.value===''?null:+el.value))});
  for(const key of EV_KEYS){const c=cfg[key]||{};if(!(c.max>=0))return alert('الدرجة العظمى غير صحيحة: '+key)}
  if(!(cfg.attendance&&cfg.attendance.min_pct>=0&&cfg.attendance.min_pct<=100))return alert('نسبة الحضور يجب أن تكون بين 0 و100');
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
 const drawTerm=r=>{const c=r.cfg,H=['الطالب','الكود','الكلية','المستوى الدراسي','English','نسبة الحضور %','المشاركة /'+c.participation.max,'Assignment /'+c.assignment.max,'الميد تيرم /'+c.midterm.max,'النهائي /'+c.final.max,'المجموع /'+r.total_max];
  const D=r.rows.map(s=>[s.name,s.code,s.college,s.study_level,s.level,s.att_pct,s.participation,s.assignment,s.midterm,s.final,s.total]);
  $('#rr').innerHTML=`<div class="card wrap"><h3>${esc(r.term.name)} — ${esc(r.term.year_label)} (${r.rows.length} طالب)</h3><p class="note">${r.term.status=='active'?'الترم جارٍ، النتائج حتى اليوم.':'ترم منتهٍ.'} ${r.term.visible?'ظاهر للطلاب.':'غير ظاهر للطلاب (فعّله من «الفصول الدراسية»).'} الحضور نسبة (الحد الأدنى ${r.min_pct}%) وليس ضمن المجموع.</p><button class="btn alt" id="rx">تحميل Excel</button><button class="btn alt" id="rp">PDF / طباعة</button><table class="table"><thead><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${D.map((d,ri)=>`<tr>${d.map((v,i)=>`<td class="${i==5&&r.rows[ri].att_below?'bad':''}">${i<5?esc(v):i==10?'<b>'+evN(v)+'</b>':i==5?evPct(v):evN(v)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="11">لا توجد نتائج</td></tr>'}</tbody></table></div>`;
  $('#rx').onclick=()=>xl([H,...D.map(d=>d.map((v,i)=>i>4?(v==null?'':v):v))],r.term.name+'_'+r.term.year_label);
  $('#rp').onclick=()=>evPrint('نتائج التقييمات — '+r.term.name+' '+r.term.year_label,'عدد الطلاب: '+r.rows.length,`<table class="table"><thead><tr>${H.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${D.map(d=>`<tr>${d.map((v,i)=>`<td>${i<5?esc(v):i==5?evPct(v):evN(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)};
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


/* ---------- ساعات عمل المحاضرين: ملخص شهري (ساعات كل أسبوع + الإجمالي) وتفصيلي، بحقول يحددها الأدمن ---------- */
async function hoursTab(b){
 const tz=evToday(),f2=v=>evN(Math.round(v*100)/100);
 b.innerHTML=`<div class="card"><h3>ساعات عمل المحاضرين</h3><label>الشهر</label><input type="month" id="hm" value="${tz.slice(0,7)}"><label>نوع التقرير</label><select id="ht"><option value="s">ملخص المحاضرين: ساعات كل أسبوع وإجمالي الشهر</option><option value="d">تفصيلي: كل جروب على حدة</option></select><p class="note">تُحسب الساعات من الجروبات (الكلاسات) المسندة لكل محاضر: عدد حصص الجروب × مدة الحصة. الأسبوع من السبت إلى الجمعة، والأسبوع الأول والأخير يُحسبان داخل حدود الشهر فقط، فمجموع الأسابيع = إجمالي الشهر.</p><button class="btn" id="hg">عرض التقرير</button></div><div id="ho"></div>`;
 const weeksOf=m=>{const z=monthEnd(m),out=[];let s=m+'-01';while(s<=z){const idx=(new Date(s+'T00:00:00Z').getUTCDay()+1)%7;let e=evAdd(s,6-idx);if(e>z)e=z;out.push([s,e]);s=evAdd(e,1)}return out};
 const ON={},cache={};
 const build=(D,type)=>{const W=D.W,wl=W.map((w,i)=>`الأسبوع ${i+1} (${+w[0].slice(8)}–${+w[1].slice(8)})`);
  if(type=='s'){const L={};D.rows.forEach(s=>{const o=L[s.lecturer_code]=L[s.lecturer_code]||{name:s.lecturer_name,code:s.lecturer_code,groups:0,sessions:0,total:0,actual:0,...Object.fromEntries(W.map((_,i)=>['w'+i,0]))};o.groups++;o.sessions+=s.sched;o.total+=s.hours*s.sched;o.actual+=s.hours*s.actual;W.forEach((_,i)=>o['w'+i]+=s.hours*((s.w[i]||{}).sched||0))});
   const rows=Object.values(L).sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar')).map(o=>({...o,pct:o.total?o.actual/o.total*100:null}));
   return{cols:[['name','المحاضر',1],['code','الكود',0],['groups','عدد الجروبات',1],...W.map((_,i)=>['w'+i,wl[i],1]),['sessions','عدد الحصص في الشهر',0],['total','إجمالي ساعات الشهر',1],['actual','الساعات الفعلية (حسب تسجيل الغياب)',0],['pct','نسبة الالتزام %',0]],rows,sum:['groups','sessions','total','actual',...W.map((_,i)=>'w'+i)]}}
  const rows=D.rows.slice().sort((a,c)=>String(a.lecturer_name).localeCompare(String(c.lecturer_name),'ar')||['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].indexOf(a.day)-['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].indexOf(c.day)||a.start.localeCompare(c.start)).map(s=>({name:s.lecturer_name,code:s.lecturer_code,day:s.day,from:s.start,to:s.end,place:s.place,level:s.level,hrs:s.hours,...Object.fromEntries(W.map((_,i)=>['w'+i,s.hours*((s.w[i]||{}).sched||0)])),sessions:s.sched,total:s.hours*s.sched,asess:s.actual,actual:s.hours*s.actual}));
  return{cols:[['name','المحاضر',1],['code','الكود',0],['day','اليوم',1],['from','من',1],['to','إلى',1],['place','الكلاس',1],['level','الليفل',1],['hrs','ساعات الحصة',1],...W.map((_,i)=>['w'+i,wl[i],1]),['sessions','حصص الشهر',1],['total','ساعات الشهر',1],['asess','حصص فعلية',0],['actual','ساعات فعلية',0]],rows,sum:['sessions','total','asess','actual',...W.map((_,i)=>'w'+i)]}};
 const val=(c,r)=>{const v=r[c];return typeof v=='number'?(c=='pct'?f2(v)+'%':f2(v)):(v==null?'-':v)};
 const draw=()=>{const D=cache.D,type=$('#ht').value,B=build(D,type);ON[type]=ON[type]||new Set(B.cols.filter(c=>c[2]).map(c=>c[0]));
  const vis=()=>B.cols.filter(c=>ON[type].has(c[0])),tot={};B.sum.forEach(k=>tot[k]=B.rows.reduce((s,r)=>s+(+r[k]||0),0));if(type=='s')tot.pct=tot.total?tot.actual/tot.total*100:null;
  const foot=k=>k.map((c,i)=>i==0?'الإجمالي':(c[0] in tot?val(c[0],tot):''));
  const cells=k=>B.rows.map(r=>k.map(c=>val(c[0],r)));
  $('#ho').innerHTML=`<div class="card noprint"><h3>الحقول المطلوب إظهارها — ${esc(D.m)}</h3><div id="hc">${B.cols.map(c=>`<button type="button" class="chip ${ON[type].has(c[0])?'on':''}" data-k="${c[0]}">${esc(c[1])}</button>`).join('')}</div><button class="btn alt" id="hsa" type="button">إظهار الكل</button><button class="btn alt" id="hna" type="button">إخفاء الكل</button><button class="btn" id="hp" type="button">طباعة / PDF</button><button class="btn" id="hx" type="button">تحميل Excel</button></div><div class="card wrap"><h3>${type=='s'?'ملخص ساعات المحاضرين':'التقرير التفصيلي للجروبات'} — ${esc(D.m)} (${B.rows.length} ${type=='s'?'محاضر':'جروب'})</h3><div id="ht2"></div></div>`;
  const tbl=k=>k.length?`<table class="table"><thead><tr>${k.map(c=>`<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${cells(k).map(r=>`<tr>${r.map((v,i)=>`<td>${i?esc(v):'<b>'+esc(v)+'</b>'}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${k.length}">لا توجد بيانات</td></tr>`}${B.rows.length?`<tr>${foot(k).map(v=>`<th>${esc(v)}</th>`).join('')}</tr>`:''}</tbody></table>`:'<div class="msg">اختر حقلاً واحداً على الأقل</div>';
  $('#ht2').innerHTML=tbl(vis());
  $('#hc').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ON[type].has(c.dataset.k)?ON[type].delete(c.dataset.k):ON[type].add(c.dataset.k);draw()});
  $('#hsa').onclick=()=>{B.cols.forEach(c=>ON[type].add(c[0]));draw()};$('#hna').onclick=()=>{ON[type].clear();draw()};
  $('#hp').onclick=()=>{const k=vis();if(!k.length)return alert('اختر حقلاً واحداً على الأقل');printReport(type=='s'?'ساعات عمل المحاضرين — ملخص شهري':'ساعات عمل المحاضرين — تفصيلي','الشهر '+D.m,tbl(k))};
  $('#hx').onclick=()=>{const k=vis();if(!k.length)return alert('اختر حقلاً واحداً على الأقل');if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');
   const num=(c,r)=>typeof r[c]=='number'?Math.round(r[c]*100)/100:(r[c]==null?'':r[c]),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([k.map(c=>c[1]),...B.rows.map(r=>k.map(c=>num(c[0],r))),...(B.rows.length?[k.map((c,i)=>i==0?'الإجمالي':(c[0] in tot?num(c[0],tot):''))]:[])]),type=='s'?'Summary':'Details');XLSX.writeFile(wb,'lecturer_hours_'+D.m+'_'+(type=='s'?'summary':'details')+'.xlsx')}};
 $('#ht').onchange=()=>{if(cache.D)draw()};
 $('#hg').onclick=async()=>{const k=$('#hg');k.disabled=true;$('#ho').innerHTML='<div class="msg">جارٍ حساب الساعات...</div>';
  try{const m=$('#hm').value||tz.slice(0,7),W=weeksOf(m),r=await gw('hours_report',{from:m+'-01',to:monthEnd(m),weeks:W.map(w=>({from:w[0],to:w[1]}))});cache.D={m,W,rows:r.rows};draw()}
  catch(e){$('#ho').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}k.disabled=false};
 $('#hg').click()}


/* ---------- كلاسات المحاضرين: لوحة أسبوعية (اليوم بجانب اليوم) + ملخص + تفصيلي + حذف محاضر ---------- */
async function classesTab(b){
 const tz=evToday(),HD=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'],canDel=me().role=='admin';
 b.innerHTML=`<div class="card"><h3>كلاسات المحاضرين</h3><label>الشهر</label><input type="month" id="cm" value="${tz.slice(0,7)}"><label>طريقة العرض</label><select id="ct"><option value="b">لوحة أسبوعية: كل محاضر وكلاساته يوماً بيوم</option><option value="s">ملخص بالأعداد (حقول قابلة للاختيار)</option><option value="d">تفصيلي: كل كلاس على حدة</option></select><p class="note">الكلاس = جروب بيوم ووقت محدد مسند للمحاضر، مرتبة كلاسات كل يوم حسب الوقت. «كلاسات الشهر» = عدد مرات انعقاد كلاساته المجدولة خلال الشهر.</p><button class="btn" id="cg">عرض</button></div><div id="co"></div>`;
 const ON={},cache={},enc_=encodeURIComponent,ls=d=>d.lecturers||[];
 const byLec=D=>{const L={};D.rows.forEach(s=>{const o=L[s.lecturer_code]=L[s.lecturer_code]||{name:s.lecturer_name,code:s.lecturer_code,groups:0,sessions:0,actual:0,byDay:{}};o.groups++;o.sessions+=s.sched;o.actual+=s.actual;(o.byDay[s.day]=o.byDay[s.day]||[]).push({start:s.start,end:s.end,place:s.place,level:s.level,sched:s.sched})});
  Object.values(L).forEach(o=>Object.values(o.byDay).forEach(a=>a.sort((x,y)=>x.start.localeCompare(y.start))));return Object.values(L).sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'))};
 const build=(D,type)=>{
  if(type=='s'){const rows=byLec(D).map(o=>({name:o.name,code:o.code,...Object.fromEntries(HD.map(d=>['d_'+d,(o.byDay[d]||[]).length])),groups:o.groups,sessions:o.sessions,actual:o.actual,details:HD.filter(d=>o.byDay[d]).map(d=>d+': '+o.byDay[d].map(c=>`${c.place} (${c.start}-${c.end})`).join('، ')).join(' | ')}));
   return{cols:[['name','المحاضر',1],['code','الكود',0],...HD.map(d=>['d_'+d,d,1]),['groups','إجمالي الكلاسات في الأسبوع',1],['sessions','كلاسات الشهر',1],['actual','الكلاسات الفعلية في الشهر',0],['details','تفاصيل الكلاسات (الكلاس والوقت)',0]],rows,sum:[...HD.map(d=>'d_'+d),'groups','sessions','actual']}}
  const rows=D.rows.slice().sort((a,c)=>String(a.lecturer_name).localeCompare(String(c.lecturer_name),'ar')||HD.indexOf(a.day)-HD.indexOf(c.day)||a.start.localeCompare(c.start)).map(s=>({name:s.lecturer_name,code:s.lecturer_code,day:s.day,from:s.start,to:s.end,place:s.place,level:s.level,sessions:s.sched,actual:s.actual}));
  return{cols:[['name','المحاضر',1],['code','الكود',0],['day','اليوم',1],['from','من',1],['to','إلى',1],['place','الكلاس',1],['level','الليفل',1],['sessions','كلاسات الشهر',1],['actual','فعلية',0]],rows,sum:['sessions','actual']}};
 const val=(c,r)=>{const v=r[c];return typeof v=='number'?(c.startsWith('d_')&&!v?'-':String(Math.round(v*100)/100)):(v==null||v===''?'-':v)};
 // ---- اللوحة الأسبوعية ----
 const boardHtml=(L,print)=>{const dt={};L.forEach(o=>HD.forEach(d=>dt[d]=(dt[d]||0)+(o.byDay[d]||[]).length));
  return `<div class="lb-wrap"><table class="lboard"><thead><tr><th class="lb-name">المحاضر</th>${HD.map(d=>`<th>${d}<small>${dt[d]||0} كلاس</small></th>`).join('')}<th>كلاسات الشهر</th></tr></thead><tbody>${L.map(o=>`<tr><td class="lb-name"><b>${esc(o.name)}</b><small>${esc(o.code)} · ${o.groups} كلاس في الأسبوع</small>${canDel&&!print?`<button class="lb-del" data-del="${esc(o.code)}" type="button">حذف المحاضر</button>`:''}</td>${HD.map(d=>`<td>${(o.byDay[d]||[]).map(c=>`<div class="lb-chip"><b>${c.start} – ${c.end}</b><span>كلاس ${esc(c.place)}</span><small>${esc(c.level||'')} · ${c.sched} مرة في الشهر</small></div>`).join('')||'<span class="lb-none">—</span>'}</td>`).join('')}<td class="lb-m"><b>${o.sessions}</b></td></tr>`).join('')||`<tr><td colspan="9">لا توجد بيانات</td></tr>`}</tbody></table></div>`};
 const delLec=async code=>{
  if(!canDel)return alert('الحذف للأدمن فقط');
  try{const [s]=await api('staff?code=eq.'+enc_(code)+'&select=code,name,role,roles');if(!s)return alert('المحاضر غير موجود');
   const rs=(s.roles&&s.roles.length)?s.roles:[s.role],other=rs.filter(r=>r!='lecturer');
   if(other.length)return alert('لهذا الحساب صلاحيات أخرى ('+other.join('، ')+') فلا يمكن حذفه من هنا. يمكنك إلغاء إسناد كلاساته من «توزيع المحاضرين».');
   const [sl,fo]=await Promise.all([api('slots?lecturer_code=eq.'+enc_(code)+'&select=id'),api('content_folders?lecturer_code=eq.'+enc_(code)+'&select=id').catch(()=>[])]);
   if(fo.length)return alert('لا يمكن حذف '+s.name+' لأن لديه '+fo.length+' مجلد محتوى. احذف مجلداته أولاً من تبويب «المحتوى».');
   if(!confirm('حذف المحاضر «'+s.name+'» ('+s.code+') نهائياً؟\n'+(sl.length?'سيصبح لـ '+sl.length+' كلاس بلا محاضر (أسندها لمحاضر آخر من «توزيع المحاضرين»).\n':'')+'لا تُحذف سجلات الغياب والتقييمات السابقة.'))return;
   if(sl.length)await api('slots?lecturer_code=eq.'+enc_(code),'PATCH',{lecturer_code:null});
   await api('staff?code=eq.'+enc_(code),'DELETE');alert('تم حذف المحاضر «'+s.name+'»');$('#cg').click()}
  catch(e){alert('تعذر الحذف: '+e.message)}};
 const draw=()=>{const D=cache.D,type=$('#ct').value;
  if(type=='b'){const L=byLec(D),q=cache.q||'',F=()=>L.filter(o=>!q||(o.name+' '+o.code).toLowerCase().includes(q.toLowerCase()));
   $('#co').innerHTML=`<div class="card noprint"><h3>لوحة كلاسات المحاضرين — ${esc(D.m)}</h3><label>بحث عن محاضر</label><input id="cq" placeholder="اكتب جزءاً من الاسم أو الكود" value="${esc(q)}"><button class="btn" id="cp" type="button">طباعة / PDF</button><button class="btn" id="cx" type="button">تحميل Excel</button></div><div class="card" id="cbd">${boardHtml(F(),false)}</div>
   ${canDel?`<div class="card noprint"><h3>حذف محاضر</h3><label>اختر المحاضر</label><select id="cdl"><option value="">— اختر —</option>${(D.staff||[]).map(s=>`<option value="${esc(s.code)}">${esc(s.name)} (${esc(s.code)}) — ${(L.find(o=>o.code==s.code)||{groups:0}).groups} كلاس</option>`).join('')}</select><button class="btn no" id="cdb" type="button">حذف المحاضر المحدد</button><p class="note">يُحذف حساب المحاضر، وتبقى كلاساته بلا محاضر لتسندها لغيره. لا يُحذف حساب له صلاحيات أخرى، ولا محاضر لديه مجلدات محتوى.</p></div>`:''}`;
   const bind=()=>$('#cbd').querySelectorAll('[data-del]').forEach(k=>k.onclick=()=>delLec(k.dataset.del));bind();
   $('#cq').oninput=e=>{cache.q=e.target.value;$('#cbd').innerHTML=boardHtml(F(),false);bind()};
   $('#cp').onclick=()=>printReport('لوحة كلاسات المحاضرين','الشهر '+D.m,boardHtml(F(),true));
   $('#cx').onclick=()=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['المحاضر','الكود',...HD,'كلاسات الأسبوع','كلاسات الشهر'],...F().map(o=>[o.name,o.code,...HD.map(d=>(o.byDay[d]||[]).map(c=>`${c.start}-${c.end} كلاس ${c.place}`).join('\n')),o.groups,o.sessions])]),'Board');XLSX.writeFile(wb,'lecturer_classes_board_'+D.m+'.xlsx')};
   if(canDel)$('#cdb').onclick=()=>{const c=$('#cdl').value;if(!c)return alert('اختر المحاضر أولاً');delLec(c)};return}
  const B=build(D,type);ON[type]=ON[type]||new Set(B.cols.filter(c=>c[2]).map(c=>c[0]));
  const vis=()=>B.cols.filter(c=>ON[type].has(c[0])),tot={};B.sum.forEach(k=>tot[k]=B.rows.reduce((s,r)=>s+(+r[k]||0),0));
  const cells=k=>B.rows.map(r=>k.map(c=>val(c[0],r))),foot=k=>k.map((c,i)=>i==0?'الإجمالي':(c[0] in tot?val(c[0],tot):''));
  const tbl=k=>k.length?`<table class="table"><thead><tr>${k.map(c=>`<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${cells(k).map(r=>`<tr>${r.map((x,i)=>`<td>${i?esc(x):'<b>'+esc(x)+'</b>'}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${k.length}">لا توجد بيانات</td></tr>`}${B.rows.length?`<tr>${foot(k).map(x=>`<th>${esc(x)}</th>`).join('')}</tr>`:''}</tbody></table>`:'<div class="msg">اختر حقلاً واحداً على الأقل</div>';
  $('#co').innerHTML=`<div class="card noprint"><h3>الحقول المطلوب إظهارها — ${esc(D.m)}</h3><div id="cc">${B.cols.map(c=>`<button type="button" class="chip ${ON[type].has(c[0])?'on':''}" data-k="${c[0]}">${esc(c[1])}</button>`).join('')}</div><button class="btn alt" id="csa" type="button">إظهار الكل</button><button class="btn alt" id="cna" type="button">إخفاء الكل</button><button class="btn" id="cp" type="button">طباعة / PDF</button><button class="btn" id="cx" type="button">تحميل Excel</button></div><div class="card wrap"><h3>${type=='s'?'كلاسات كل محاضر':'التقرير التفصيلي للكلاسات'} — ${esc(D.m)} (${B.rows.length} ${type=='s'?'محاضر':'كلاس'})</h3>${tbl(vis())}</div>`;
  $('#cc').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ON[type].has(c.dataset.k)?ON[type].delete(c.dataset.k):ON[type].add(c.dataset.k);draw()});
  $('#csa').onclick=()=>{B.cols.forEach(c=>ON[type].add(c[0]));draw()};$('#cna').onclick=()=>{ON[type].clear();draw()};
  $('#cp').onclick=()=>{const k=vis();if(!k.length)return alert('اختر حقلاً واحداً على الأقل');printReport(type=='s'?'كلاسات المحاضرين — ملخص':'كلاسات المحاضرين — تفصيلي','الشهر '+D.m,tbl(k))};
  $('#cx').onclick=()=>{const k=vis();if(!k.length)return alert('اختر حقلاً واحداً على الأقل');if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');
   const num=(c,r)=>typeof r[c]=='number'?r[c]:(r[c]==null?'':r[c]),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([k.map(c=>c[1]),...B.rows.map(r=>k.map(c=>num(c[0],r))),...(B.rows.length?[k.map((c,i)=>i==0?'الإجمالي':(c[0] in tot?tot[c[0]]:''))]:[])]),type=='s'?'Summary':'Classes');XLSX.writeFile(wb,'lecturer_classes_'+D.m+'_'+(type=='s'?'summary':'details')+'.xlsx')}};
 $('#ct').onchange=()=>{if(cache.D)draw()};
 $('#cg').onclick=async()=>{const k=$('#cg');k.disabled=true;$('#co').innerHTML='<div class="msg">جارٍ تحميل البيانات...</div>';
  try{const m=$('#cm').value||tz.slice(0,7),[r,st]=await Promise.all([gw('hours_report',{from:m+'-01',to:monthEnd(m)}),canDel?api('staff?role=eq.lecturer&select=code,name&order=name'):Promise.resolve([])]);cache.D={m,rows:r.rows,staff:st};draw()}catch(e){$('#co').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}k.disabled=false};
 $('#cg').click()}


/* ---------- نسبة الحضور والإنذارات والحجب (للأدمن) ---------- */
async function attReportTab(b){
 const terms=await api('terms?order=start_date.desc').catch(()=>null);
 if(!terms||!terms.length)return b.innerHTML='<div class="msg">لا توجد فصول دراسية. شغّل ملفات SQL (4 و5) أولاً.</div>';
 const tz=evToday();let R=null;
 b.innerHTML=`<div class="card"><h3>نسبة الحضور والإنذارات</h3><label>الترم</label><select id="atm">${terms.map(t=>`<option value="${t.id}">${esc(t.name)} — ${esc(t.year_label)} ${t.status=='active'?'(جارٍ)':'(منتهٍ)'}</option>`).join('')}</select><label>شهر الإنذارات</label><input type="month" id="amo" value="${tz.slice(0,7)}" max="${tz.slice(0,7)}"><label>الليفل (اختياري)</label><input id="alv"><label>الكلية (اختياري)</label><input id="acl"><label>بحث بالاسم أو الكود (اختياري)</label><input id="aq"><label class="chk"><input type="checkbox" id="abl"> عرض الطلاب دون الحد الأدنى فقط</label><button class="btn" id="agb" type="button">عرض</button></div><div id="aro"></div>`;
 const flt=()=>({term_id:+$('#atm').value,month:$('#amo').value,level:$('#alv').value.trim(),college:$('#acl').value.trim(),q:$('#aq').value.trim()});
 const draw=()=>{const below=$('#abl').checked,rows=R.rows.filter(x=>!below||x.below),nb=R.rows.filter(x=>x.below).length,nw=R.rows.filter(x=>x.below&&!x.warned).length,nk=R.rows.filter(x=>x.below&&!x.blocked).length,nbk=R.rows.filter(x=>x.blocked).length,min=R.min_pct,act=R.term.status=='active';
  const tbl=pr=>`<table class="table"><thead><tr><th>الطالب</th><th>الكود</th><th>الكلية</th><th>الليفل</th><th>حضر</th><th>غاب</th><th>المتوقع</th><th>النسبة</th><th>الحالة</th><th>إنذار ${esc(R.month)}</th><th>الحجب</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${esc(x.college)}</td><td>${esc(x.level)}</td><td>${x.p}</td><td>${x.absent}</td><td>${x.e}</td><td>${evPct(x.pct)}${pr?'':pbar(x.pct,min)}</td><td class="${x.below?'bad':'ok'}">${x.pct==null?'—':x.below?'دون الحد':'مستوفٍ'}</td><td>${x.below?(x.warned?'أُرسل':'لم يُرسل'):'—'}</td><td class="${x.blocked?'bad':''}">${x.blocked?'محجوب':'—'}</td></tr>`).join('')||'<tr><td colspan="11">لا توجد بيانات</td></tr>'}</tbody></table>`;
  $('#aro').innerHTML=`<div class="card"><h3>${esc(R.term.name)} — ${esc(R.term.year_label)} ${act?'(جارٍ)':'(منتهٍ)'}</h3><p>الحد الأدنى لنسبة الحضور: <b>${min}%</b> (يُغيَّر من «الفصول الدراسية») — الطلاب: <b>${R.rows.length}</b> — دون الحد: <b class="bad">${nb}</b> — لم يُنذروا في ${esc(R.month)}: <b class="bad">${nw}</b> — محجوبون بسبب الحضور: <b class="bad">${nbk}</b></p><button class="btn" id="aw" ${act&&nw?'':'disabled'}>إرسال إنذارات الشهر (${nw})</button><button class="btn no" id="ak" ${nk?'':'disabled'}>حجب الطلاب دون الحد الأدنى (${nk})</button><button class="btn alt" id="au" ${nbk?'':'disabled'}>رفع حجب الحضور عن الجميع (${nbk})</button><button class="btn alt" id="ax" type="button">تحميل Excel</button><button class="btn alt" id="ap" type="button">PDF / طباعة</button><p class="note">الإنذار يُرسل مرة واحدة لكل طالب في الشهر (حتى لو أرسله محاضر). الحجب يُقفل كل أيقونات الطالب ويعرض له سبب نسبة الحضور، ويُنفَّذ تلقائياً عند إغلاق الترم إن اخترت ذلك.</p></div><div class="card wrap">${tbl(false)}</div>`;
  $('#aw').onclick=async()=>{if(!confirm('إرسال إنذار حضور لـ '+nw+' طالب؟'))return;try{const r=await gw('att_warn',flt());alert('تم إرسال '+r.sent+' إنذار');await load()}catch(e){alert(e.message)}};
  $('#ak').onclick=async()=>{if(!confirm('حجب '+nk+' طالب دون نسبة الحضور '+min+'%؟\nيُقفل لهم كل شيء ويظهر لهم سبب الحجب.'))return;try{const r=await gw('att_block',flt());alert('تم حجب '+r.blocked+' طالب');await load()}catch(e){alert(e.message)}};
  $('#au').onclick=async()=>{if(!confirm('رفع حجب نسبة الحضور عن '+nbk+' طالب؟'))return;try{const r=await gw('att_unblock');alert('تم رفع الحجب عن '+r.lifted+' طالب');await load()}catch(e){alert(e.message)}};
  $('#ap').onclick=()=>printReport('تقرير نسبة الحضور — '+R.term.name+' '+R.term.year_label,'الحد الأدنى '+min+'% | عدد الظاهر '+rows.length,tbl(true));
  $('#ax').onclick=()=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['الطالب','الكود','الكلية','الليفل','حضر','غاب','المتوقع','النسبة %','الحالة','إنذار '+R.month,'الحجب'],...rows.map(x=>[x.name,x.code,x.college,x.level,x.p,x.absent,x.e,x.pct==null?'':x.pct,x.pct==null?'':x.below?'دون الحد':'مستوفٍ',x.below?(x.warned?'أُرسل':'لم يُرسل'):'',x.blocked?'محجوب':''])]),'Attendance');XLSX.writeFile(wb,'attendance_percent_'+R.term.name.replace(/\s+/g,'_')+'.xlsx')}};
 const load=async()=>{$('#aro').innerHTML='<div class="msg">جارٍ حساب نسب الحضور...</div>';try{R=await gw('att_overview',flt());draw()}catch(e){$('#aro').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}};
 $('#agb').onclick=load;$('#abl').onchange=()=>{if(R)draw()};load()}
