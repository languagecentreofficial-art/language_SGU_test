/* ===== التقييمات + نسبة الحضور: مساعدات مشتركة + تبويبات المحاضر والطالب ===== */
const EV_LBL={participation:'المشاركة',assignment:'Assignment',midterm:'الميد تيرم',final:'الاختبار النهائي'};
const evToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Cairo'});
const evDayOf=d=>DAYS[new Date(d+'T00:00:00Z').getUTCDay()];
const evAdd=(d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const evN=v=>v==null||v===''?'-':String(Math.round(+v*100)/100);
const evPct=v=>v==null?'-':evN(v)+'%';
function evPrint(title,sub,html){printReport(title,sub,html)}
const pbar=(pct,min)=>`<div class="pb2 ${pct!=null&&pct<min?'bad':''}"><i style="width:${Math.max(0,Math.min(100,pct||0))}%"></i></div>`;
function evSheetHtml(r){const c=r.cfg;
  return `<table class="table"><thead><tr><th>الطالب</th><th>الكود</th><th>الكلية</th><th>المستوى الدراسي</th><th>English</th><th>نسبة الحضور</th><th>المشاركة /${c.participation.max}</th><th>Assignment /${c.assignment.max}</th><th>الميد تيرم /${c.midterm.max}</th><th>النهائي /${c.final.max}</th><th>المجموع /${r.total_max}</th></tr></thead><tbody>`+
  r.students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.code)}</td><td>${esc(s.college)}</td><td>${esc(s.study_level)}</td><td>${esc(s.level)}</td><td>${evPct(s.att.pct)} (${s.att.p}/${s.att.e})</td><td>${evN(s.participation.total)}</td><td>${evN(s.assignment.total)}</td><td>${evN(s.midterm&&s.midterm.mark)}</td><td>${evN(s.final&&s.final.mark)}</td><td><b>${evN(s.total)}</b></td></tr>`).join('')+'</tbody></table>'}

/* ---------- المحاضر: تقييم أسبوعي (مشاركة + واجبات) والباقي تلقائي ---------- */
async function evalLecTab(b,u){
  const slots=await api(`slots?lecturer_code=eq.${u.code}&order=start_time`);
  if(!slots.length){b.innerHTML='<div class="msg">لا توجد جروبات مسندة إليك.</div>';return}
  let termId=null,S=null;
  b.innerHTML=`<div class="card"><h3>التقييمات</h3><label>الترم</label><select id="etm"><option value="">...</option></select><label>التاريخ — يمكنك الرجوع إلى أسابيع سابقة</label><div class="evnav"><button class="btn alt" id="epv" type="button">▶ أسبوع سابق</button><input type="date" id="edt" value="${evToday()}" max="${evToday()}"><button class="btn alt" id="enx" type="button">أسبوع تالٍ ◀</button></div><label>الجروب</label><select id="egs"></select></div><div id="evs"></div>`;
  const dt=()=>$('#edt').value||evToday();
  const fillSlots=()=>{const d=evDayOf(dt()),L=slots.filter(s=>s.day==d);$('#egs').innerHTML=L.map(x=>`<option value="${x.id}">${fmt(x.start_time)}-${fmt(x.end_time)} | ${esc(x.place)} | ${esc(x.level)}</option>`).join('')||`<option value="">لا توجد جروبات لك يوم ${d}</option>`};
  const load=async()=>{const id=$('#egs').value;
    if(!id){S=null;$('#evs').innerHTML=`<div class="msg">لا توجد جروبات لك يوم ${evDayOf(dt())}. اختر تاريخاً آخر.</div>`;return}
    $('#evs').innerHTML='<div class="msg">جارٍ التحميل...</div>';
    try{S=await gw('eval_sheet',{slot_id:+id,date:dt(),term_id:termId});render()}catch(e){$('#evs').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}};
  const render=()=>{const r=S;
    if(!r.term){$('#etm').innerHTML='<option>—</option>';$('#evs').innerHTML='<div class="msg">لا يوجد ترم دراسي نشط حالياً. تواصل مع الإدارة.</div>';return}
    $('#etm').innerHTML=r.terms.map(t=>`<option value="${t.id}" ${t.id==r.term.id?'selected':''}>${esc(t.name)} — ${esc(t.year_label)} ${t.status=='active'?'(جارٍ)':'(منتهٍ)'}</option>`).join('');
    const c=r.cfg,ed=r.editable,per={participation:+(c.participation.per_session??c.participation.max),assignment:+c.assignment.max};
    const why=r.term.status!='active'?'هذا الترم منتهٍ، العرض للقراءة فقط.':r.date>evToday()?'لا يمكن التقييم في تاريخ مستقبلي.':r.date<r.term.start_date?'هذا التاريخ قبل بداية الترم.':'هذا التاريخ ليس يوم هذا الجروب.';
    const inp=(k,s)=>ed?`<input class="evi" data-k="${k}" data-c="${esc(s.code)}" type="number" inputmode="decimal" step="0.25" min="0" max="${per[k]}" value="${s[k].today??''}"><small class="evs">${evN(s[k].total)}/${c[k].max}</small>`:`${evN(s[k].today)}<small class="evs">${evN(s[k].total)}/${c[k].max}</small>`;
    const at=s=>`<span class="${s.att.today=='present'?'ok':s.att.today=='absent'?'bad':''}">${s.att.today=='present'?'حاضر':s.att.today=='absent'?'غائب':'—'}</span><small class="evs ${s.att.below?'bad':''}">${s.att.p}/${s.att.e} · ${evPct(s.att.pct)}</small>`;
    $('#evs').innerHTML=`<div class="card wrap"><h3>${esc(r.slot.day)} ${fmt(r.slot.start_time)}-${fmt(r.slot.end_time)} | كلاس ${esc(r.slot.place)} — ${esc(r.term.name)}</h3>${ed?`<p class="note">المشاركة والواجبات: ضع درجة كل أسبوع حتى يصل المجموع إلى الحد الأقصى (المشاركة ${c.participation.max} والواجبات ${c.assignment.max})، واترك الخانة فارغة لحذف التقييم. الميد تيرم والنهائي يُملآن تلقائياً من الدرجات. الحضور نسبة (الحد الأدنى ${r.min_pct}%) وليس درجات.</p>`:`<div class="msg">${why}</div>`}
      <table class="table evt"><tr><th>الطالب</th><th>الكود</th><th>الكلية</th><th>المستوى الدراسي</th><th>English</th><th>الحضور (${r.date})</th><th>المشاركة /${c.participation.max}</th><th>Assignment /${c.assignment.max}</th><th>الميد تيرم /${c.midterm.max}</th><th>النهائي /${c.final.max}</th><th>المجموع /${r.total_max}</th></tr>
      ${r.students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.code)}</td><td>${esc(s.college)}</td><td>${esc(s.study_level)}</td><td>${esc(s.level)}</td><td>${at(s)}</td><td>${inp('participation',s)}</td><td>${inp('assignment',s)}</td><td>${evN(s.midterm&&s.midterm.mark)}</td><td>${evN(s.final&&s.final.mark)}</td><td><b>${evN(s.total)}</b></td></tr>`).join('')||'<tr><td colspan="11">لا يوجد طلاب في هذا الجروب</td></tr>'}</table>
      ${ed?'<button class="btn" id="esv">حفظ التقييمات</button>':''}<button class="btn alt" id="exl" type="button">تحميل Excel</button><button class="btn alt" id="epd" type="button">PDF / طباعة</button></div>`;
    if(ed)$('#esv').onclick=async()=>{const M={};document.querySelectorAll('.evi').forEach(el=>{(M[el.dataset.c]=M[el.dataset.c]||{code:el.dataset.c})[el.dataset.k]=el.value===''?null:+el.value});
        const k=$('#esv');k.disabled=true;try{await gw('eval_save',{slot_id:+$('#egs').value,date:S.date,rows:Object.values(M)});alert('تم حفظ التقييمات');await load()}catch(e){alert(e.message);k.disabled=false}};
    $('#epd').onclick=()=>printReport('تقييمات الطلاب — '+r.term.name+' '+r.term.year_label,`${r.slot.day} ${fmt(r.slot.start_time)} | كلاس ${r.slot.place}`,evSheetHtml(r));
    $('#exl').onclick=async()=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل، تأكد من الاتصال بالإنترنت');
      try{const f=await gw('eval_sheet',{slot_id:r.slot.id,date:r.date,term_id:r.term.id,detail:true}),c2=f.cfg,sl=f.slot,N={};f.students.forEach(s=>N[s.code]=s.name);
        const rows=[[`${sl.day} - ${fmt(sl.start_time)} - Class ${sl.place}`,'','',f.term.name+' — '+f.term.year_label],
          ['اسم الطالب','الكود','اسم الكلية','المستوى الدراسي','English Level','Attendance %','Participation','Assignment','Midterm','Final','Total'],
          ['','','','','','نسبة الحضور (الحد الأدنى '+f.min_pct+'%)','المشاركة /'+c2.participation.max,'Assignment /'+c2.assignment.max,'الميد تيرم /'+c2.midterm.max,'الاختبار النهائي /'+c2.final.max,'المجموع /'+f.total_max]];
        f.students.forEach(s=>rows.push([s.name,s.code,s.college,s.study_level,s.level,s.att.pct==null?'':s.att.pct,s.participation.total,s.assignment.total,s.midterm?s.midterm.mark:'',s.final?s.final.mark:'',s.total]));
        const ws=XLSX.utils.aoa_to_sheet(rows);ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:2}}];
        const det=[['الكود','الاسم','التاريخ','البند','الدرجة']].concat((f.records||[]).filter(x=>EV_LBL[x.comp]).map(x=>[x.student_code,N[x.student_code]||'',x.date,EV_LBL[x.comp],x.mark])),wb=XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb,ws,'Evaluation');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(det),'Weekly');
        XLSX.writeFile(wb,`evaluation_${String(sl.place).replace(/[^\w-]+/g,'_')}_${f.term.name.replace(/\s+/g,'_')}.xlsx`)}catch(e){alert(e.message)}}};
  $('#etm').onchange=()=>{termId=+$('#etm').value||null;load()};
  $('#edt').onchange=()=>{fillSlots();load()};$('#egs').onchange=load;
  $('#epv').onclick=()=>{$('#edt').value=evAdd(dt(),-7);fillSlots();load()};
  $('#enx').onclick=()=>{const n=evAdd(dt(),7);if(n>evToday())return alert('لا يمكن تجاوز تاريخ اليوم');$('#edt').value=n;fillSlots();load()};
  fillSlots();load()}

/* ---------- المحاضر: غياب جروباته ونسب الحضور والإنذارات الشهرية ---------- */
async function attLecTab(b,u){
  const slots=await api(`slots?lecturer_code=eq.${u.code}&order=day,start_time`);
  if(!slots.length){b.innerHTML='<div class="msg">لا توجد جروبات مسندة إليك.</div>';return}
  let R=null;
  b.innerHTML=`<div class="card"><h3>غياب جروباتي ونسب الحضور</h3><label>الجروب</label><select id="alg"><option value="">كل جروباتي</option>${slots.map(x=>`<option value="${x.id}">${esc(x.day)} ${fmt(x.start_time)}-${fmt(x.end_time)} | ${esc(x.place)} | ${esc(x.level)}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="alb"> عرض الطلاب دون الحد الأدنى فقط</label><button class="btn" id="alr" type="button">عرض</button></div><div id="alo"></div>`;
  const draw=()=>{const below=$('#alb').checked,rows=R.rows.filter(x=>!below||x.below),nb=R.rows.filter(x=>x.below).length,nw=R.rows.filter(x=>x.below&&!x.warned).length,min=R.min_pct;
    const tbl=`<table class="table"><thead><tr><th>الطالب</th><th>الكود</th><th>الليفل</th><th>حضر</th><th>غاب</th><th>المتوقع من جدوله</th><th>نسبة الحضور</th><th>الحالة</th><th>إنذار ${esc(R.month)}</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${esc(x.level)}</td><td>${x.p}</td><td>${x.absent}</td><td>${x.e}</td><td>${evPct(x.pct)}${pbar(x.pct,min)}</td><td class="${x.below?'bad':'ok'}">${x.pct==null?'—':x.below?'دون الحد':'مستوفٍ'}</td><td>${x.below?(x.warned?'<b class="ok">أُرسل</b>':'<b class="bad">لم يُرسل</b>'):'—'}</td></tr>`).join('')||'<tr><td colspan="9">لا يوجد طلاب</td></tr>'}</tbody></table>`;
    $('#alo').innerHTML=`<div class="card"><h3>${esc(R.term.name)} — ${esc(R.term.year_label)}</h3><p>الحد الأدنى لنسبة الحضور: <b>${min}%</b> — عدد الطلاب: <b>${R.rows.length}</b> — دون الحد: <b class="bad">${nb}</b> — لم يُنذروا هذا الشهر: <b class="bad">${nw}</b></p><p class="note">تُرسل الإنذارات شهرياً للطلاب دون الحد الأدنى. إن كان الأدمن قد أرسلها فلن تتكرر، ويمكنك إرسال ما لم يُرسل بعد لطلاب جروباتك.</p><button class="btn" id="alw" ${nw?'':'disabled'}>إرسال إنذارات الشهر (${nw})</button><button class="btn alt" id="alx" type="button">تحميل Excel</button><button class="btn alt" id="alp" type="button">PDF / طباعة</button></div><div class="card wrap">${tbl}</div>`;
    $('#alw').onclick=async()=>{if(!confirm('إرسال إنذار حضور لـ '+nw+' طالب لم يُنذروا هذا الشهر؟'))return;const k=$('#alw');k.disabled=true;
      try{const r=await gw('att_warn',{slot_id:$('#alg').value?+$('#alg').value:undefined});alert('تم إرسال '+r.sent+' إنذار'+(r.already?'، وكان '+r.already+' منهم قد أُنذروا مسبقاً':''));await load()}catch(e){alert(e.message);k.disabled=false}};
    $('#alp').onclick=()=>printReport('نسب حضور الطلاب — '+R.term.name,'الحد الأدنى '+min+'% | '+R.month,tbl.replace(/<div class="pb2[^>]*><i[^>]*><\/i><\/div>/g,''));
    $('#alx').onclick=()=>{if(typeof XLSX=='undefined')return alert('مكتبة الإكسيل لم تُحمَّل');const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['الطالب','الكود','الليفل','حضر','غاب','المتوقع','النسبة %','الحالة'],...rows.map(x=>[x.name,x.code,x.level,x.p,x.absent,x.e,x.pct==null?'':x.pct,x.pct==null?'':x.below?'دون الحد':'مستوفٍ'])]),'Attendance');XLSX.writeFile(wb,'attendance_percent_'+R.month+'.xlsx')}};
  const load=async()=>{$('#alo').innerHTML='<div class="msg">جارٍ التحميل...</div>';try{R=await gw('att_overview',{slot_id:$('#alg').value?+$('#alg').value:undefined});draw()}catch(e){$('#alo').innerHTML='<div class="msg">'+esc(e.message)+'</div>'}};
  $('#alr').onclick=load;$('#alb').onchange=()=>{if(R)draw()};load()}

/* ---------- الطالب: التقييمات التي أتاحها الأدمن (مرتبة بالعام ثم الترم) ---------- */
async function evalStuTab(b,u){
  const r=await gw('my_evals');
  if(!r||!r.terms.length){b.innerHTML='<div class="msg">لا توجد تقييمات متاحة لك حالياً. تظهر هنا عندما تتيحها الإدارة.</div>';return}
  const Y={};r.terms.forEach(t=>(Y[t.year_label]=Y[t.year_label]||[]).push(t));
  b.innerHTML=Object.entries(Y).map(([y,ts])=>`<div class="card"><h3>العام الدراسي ${esc(y)} ${ts.every(t=>t.status=='closed')?'<span class="pill">عام منقضٍ</span>':'<span class="pill">العام الحالي</span>'}</h3>${ts.map(t=>`<details ${t.status=='active'?'open':''}><summary>${esc(t.name)} — ${t.status=='active'?'الترم الجاري':'ترم منتهٍ'}</summary>${t.attendance?`<div class="msg ${t.attendance.below?'':'okmsg'}">نسبة حضورك: <b>${evPct(t.attendance.pct)}</b> (حضرت ${t.attendance.present} من ${t.attendance.expected} حصة) — الحد الأدنى المطلوب ${t.attendance.min_pct}% ${t.attendance.below?'<b class="bad">— أنت دون الحد الأدنى</b>':''}</div>`:''}<div class="wrap"><table class="table"><tr><th>البند</th><th>الدرجة</th><th>من</th></tr>${t.comps.map(c=>`<tr><td>${esc(c.label)}</td><td>${evN(c.mark)}</td><td>${c.max}</td></tr>`).join('')}<tr><th>${t.partial?'المجموع (للبنود الظاهرة)':'المجموع'}</th><th>${evN(t.total)}</th><th>${t.total_max}</th></tr></table></div></details>`).join('')}</div>`).join('')}
