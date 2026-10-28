const SB='https://qbeppmgyrxpyhzchswdw.supabase.co/rest/v1/';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZXBwbWd5cnhweWh6Y2hzd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDcwOTksImV4cCI6MjEwNzIyMzA5OX0.mbgQV8L7moc5Xk39e7BokEAlbj69Ypp-zZI4MdhnJN4';
// روابط المبرمج - عدّلها
const SOCIAL={whatsapp:'https://wa.me/20XXXXXXXXXX',instagram:'https://instagram.com/XXXX',facebook:'https://facebook.com/XXXX'};
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
// كل الوصول لقاعدة البيانات يمر عبر بوابة الأمان gw (لا مفاتيح للجداول في المتصفح)
const GW=SB.replace('/rest/v1/','/functions/v1/gw');
async function gw(op,d){
  const u=JSON.parse(localStorage.getItem('u')||'null');
  const r=await fetch(GW,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY,...(u&&u.tk?{'x-st':u.tk}:{})},body:JSON.stringify({op,role:u&&u.role,...d})});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){
    if(r.status==401&&j&&j.code=='SESSION'){localStorage.removeItem('u');if(!/index\.html$|\/$/.test(location.pathname))location='index.html';throw new Error(j.message)}
    if(/authorization|jwt/i.test(t)&&!(j&&j.code))throw new Error('أوقف خيار Verify JWT لدالة gw في Supabase (Edge Functions ← gw ← Details)');
    throw new Error((j&&j.message)||t||('خطأ '+r.status))}
  return j}
async function api(path,method='GET',body,prefer){
  prefer=prefer||(method=='POST'?'return=representation':'return=minimal');
  return gw('db',{p:path,m:method,b:body,pf:prefer})}
const rpc=(f,a)=>f=='login'?gw('login',{code:a.p_code,pass:a.p_pass}):api('rpc/'+f,'POST',a);
const me=()=>JSON.parse(localStorage.getItem('u')||'null');
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>(t||'').slice(0,5);
const ROLE={student:'طالب',lecturer:'محاضر',admin:'أدمن',assistant:'مساعد أدمن',affairs:'شؤون الطلاب'};
const P={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',grad:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',chat:'<path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4A8 8 0 1 1 21 12z"/>',swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',mega:'<path d="M3 11v3l14 5V6z"/><path d="M7 15l1 5h3l-1-4"/>',pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',inbox:'<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',plus:'<path d="M12 5v14M5 12h14"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',chart:'<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3"/>',warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M10 10v10"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-4-5.5"/>',shield:'<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',board:'<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M12 15v5M8 20h8"/>',clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',home:'<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',out:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',ig:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',wa:'<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>',dot:'<circle cx="12" cy="12" r="3"/>'};
const ic=(n,z=20)=>`<svg width="${z}" height="${z}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||P.dot}</svg>`;
const MAP={'بياناتي':'user','جدولي':'cal','غيابي':'check','درجاتي':'grad','شكوى':'chat','طلب تغيير':'swap','الإعلانات':'mega','تسجيل الغياب':'clip','ملفي':'user','جدول محاضراتي':'cal','طلبات التغيير':'swap','الرئيسية':'home','الطلبات':'inbox','الشكاوى':'chat','إعلان':'mega','طالب جديد':'plus','جروب جديد':'cal','حسابات':'key','رفع إكسيل':'up','التقارير':'chart','الدرجات':'grad','الغياب والإنذارات':'warn','الجداول ونقل الطلاب':'table','تعديل الغياب':'pen','رفع طلاب':'users','بيانات الطلاب':'users','المحاضرون':'board','توزيع المحاضرين':'board','الصلاحيات':'shield','معاينة الجداول':'table','إعادة توزيع الليفل المخالف':'swap','الطلاب الجدد':'users','قواعد الأيام':'cal','الطلاب في أكثر من كلاس':'users','الحجب وشؤون الطلاب':'shield','شروط النجاح والترقية':'grad'};
const DESC={'بياناتي':'الملف الشخصي وكلمة المرور','جدولي':'اليوم والمكان والمحاضر والتوقيت','غيابي':'حضورك الأسبوعي والشهري والترم','درجاتي':'الكويزات والاختبارات والتقييمات','شكوى':'أرسل شكوى أو تعارضاً','طلب تغيير':'طلب نقل إلى جروب آخر','الإعلانات':'جداول الاختبارات والتنبيهات','تسجيل الغياب':'سجّل حضور طلاب جروبات اليوم','ملفي':'الهاتف وكلمة المرور','جدول محاضراتي':'جروباتك وكلاساتك وليفلاتك في كل يوم','طلبات التغيير':'طلبات نقل الطلاب إلى جروباتك'};
function guard(roles){const u=me();if(!u||!roles.includes(u.role)){location='index.html';throw 0}return u}
function logout(){localStorage.removeItem('u');location='index.html'}
async function count(t,c,f=''){const r=await gw('count',{p:`${t}?select=${c}${f}`});return r?+r.count||0:0}
function shell(u){
  const side=u&&['admin','assistant','affairs'].includes(u.role);
  document.body.insertAdjacentHTML('afterbegin',`<header>${side?`<button class="menu" aria-label="القائمة" onclick="document.body.classList.toggle('open')">${ic('menu',22)}</button>`:''}<img src="assets/logo.png" alt="" onerror="this.style.visibility='hidden'"><h1>جامعة الصالحية الجديدة<small>كورس اللغة الإنجليزية</small></h1>${u?`<div class="who"><b>${esc(u.name)}</b><small>${ROLE[u.role]} · ${esc(u.code)}</small></div><button class="bell" id="bell" aria-label="الإشعارات">${ic('bell')}<b>0</b></button><button class="out" onclick="logout()" aria-label="خروج">${ic('out')}</button>`:''}</header>`);
  document.body.insertAdjacentHTML('beforeend',`<footer><div class="soc"><a href="${SOCIAL.whatsapp}" aria-label="واتساب">${ic('wa',22)}</a><a href="${SOCIAL.instagram}" aria-label="إنستجرام">${ic('ig',22)}</a><a href="${SOCIAL.facebook}" aria-label="فيسبوك">${ic('fb',22)}</a></div><small>M.H.D</small></footer>`);
  if(u){const poll=async()=>{try{const n=await api(`notifications?target_code=eq.${u.code}&read=eq.false&order=id.desc`);$('#bell b').textContent=n.length;$('#bell').onclick=async()=>{alert(n.map(x=>x.title+'\n'+(x.body||'')).join('\n\n')||'لا توجد إشعارات');if(n.length)await api(`notifications?target_code=eq.${u.code}&read=eq.false`,'PATCH',{read:true});poll()}}catch(e){}};poll();setInterval(poll,20000)}}
function lay(box){box.querySelectorAll('.card>label').forEach(l=>{const i=l.nextElementSibling;if(i&&/^(INPUT|SELECT|TEXTAREA)$/.test(i.tagName)){const w=document.createElement('div');w.className='f'+(i.tagName=='TEXTAREA'?' fw':'');l.replaceWith(w);w.append(l,i)}});
  box.querySelectorAll('.card').forEach(c=>{const g=!!c.querySelector(':scope>.f'),w=!!c.querySelector('table,.msbar');if(c.classList.contains('gf')!==g)c.classList.toggle('gf',g);if(c.classList.contains('wide')!==w)c.classList.toggle('wide',w)})}
function tabs(defs,box){
  const u=me(),side=['admin','assistant','affairs'].includes(u.role),h=document.createElement('h2');h.className='pt';
  let _r;new MutationObserver(()=>{cancelAnimationFrame(_r);_r=requestAnimationFrame(()=>lay(box))}).observe(box,{childList:true,subtree:true});
  const run=async(l,f)=>{h.textContent=l;box.innerHTML='<div class="msg">جارٍ التحميل...</div>';try{await f(box)}catch(e){box.innerHTML='<div class="msg">حدث خطأ: '+esc(e.message)+'</div>'}};
  if(side){document.body.classList.add('has-side');const nav=document.createElement('nav');nav.className='side';document.body.append(nav);box.before(h);
   defs.forEach(([l,f],i)=>{const b=document.createElement('button');b.innerHTML=ic(MAP[l]||'dot',19)+'<span>'+l+'</span>';b.onclick=()=>{[...nav.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');document.body.classList.remove('open');run(l,f)};nav.append(b);if(!i)b.click()});
   document.addEventListener('click',e=>{if(!e.target.closest('nav,.menu'))document.body.classList.remove('open')});return}
  const g=document.createElement('div'),sh=document.createElement('section'),hd=document.createElement('div'),x=document.createElement('button');
  g.className='home';g.innerHTML=`<div class="hero"><small>مرحباً بك</small><h2>${esc(u.name)}</h2><span>${ROLE[u.role]} · ${esc(u.code)}</span></div><div class="tiles"></div>`;
  sh.className='sheet';sh.hidden=true;hd.className='sh';x.className='x';x.textContent='إغلاق';hd.append(h,x);box.before(g);box.before(sh);sh.append(hd,box);
  x.onclick=()=>{sh.hidden=true;g.hidden=false;scrollTo(0,0)};
  defs.forEach(([l,f])=>{const t=document.createElement('button');t.className='tile';t.innerHTML=`<span class="ic">${ic(MAP[l]||'dot',26)}</span><b>${l}</b><small>${DESC[l]||''}</small>`;t.onclick=()=>{g.hidden=true;sh.hidden=false;scrollTo(0,0);run(l,f)};g.querySelector('.tiles').append(t)})}
async function notify(codes,title,body){if(codes.length)await api('notifications','POST',codes.map(c=>({target_code:c,title,body})),'return=minimal')}
async function changePassForm(box,u){
  box.insertAdjacentHTML('beforeend',`<div class="card"><h3>تغيير كلمة المرور</h3><label>الحالية</label><input type="password" id="o"><label>الجديدة</label><input type="password" id="n"><button class="btn" id="cp">حفظ كلمة المرور</button></div>`);
  $('#cp').onclick=async()=>{if($('#n').value.length<6)return alert('6 أحرف على الأقل');const ok=await rpc('change_password',{p_code:u.code,p_old:$('#o').value,p_new:$('#n').value});alert(ok?'تم تغيير كلمة المرور':'كلمة المرور الحالية غير صحيحة')}}

// أداة تشخيص: افتح أي صفحة بإضافة #diag لعرض عدّاد التحميل وتغيّر الأبعاد
if(location.hash=='#diag'){try{const k='dg',n=+(sessionStorage.getItem(k)||0)+1;sessionStorage.setItem(k,n);let rs=0,sc=0;const d=document.createElement('div');d.setAttribute('style','position:fixed;bottom:0;left:0;z-index:9999;background:#000c;color:#0f0;font:11px monospace;padding:6px 8px;direction:ltr;pointer-events:none');const nv=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{},up=()=>{const v=window.visualViewport;d.textContent='nav:'+(nv.type||'?')+' redir:'+(nv.redirectCount||0)+' loads:'+n+' resize:'+rs+' scroll:'+sc+' inner:'+innerWidth+'x'+innerHeight+(v?' vv:'+Math.round(v.width)+'x'+Math.round(v.height):'')};addEventListener('resize',()=>{rs++;up()});addEventListener('scroll',()=>{sc++;up()});document.addEventListener('DOMContentLoaded',()=>{document.body.append(d);up()})}catch(e){}}

// ===== مساعدات: الليفل، القبول التلقائي، شروط النجاح =====
const lvN=x=>String(x||'').trim().toUpperCase();
function passNeed(ex){if(!ex||ex.pass_value==null||ex.pass_value==='')return null;return ex.pass_type=='mark'?+ex.pass_value:(+ex.max_mark)*(+ex.pass_value)/100}
function passOf(mark,ex){const n=passNeed(ex);if(n==null||mark==null||mark==='')return null;return +mark>=n}
async function approveReq(x,msg){
  await api('enrollments?on_conflict=student_code,slot_id','POST',{student_code:x.student_code,slot_id:x.to_slot},'resolution=merge-duplicates,return=minimal');
  if(x.from_slot&&x.from_slot!=x.to_slot)await api(`enrollments?student_code=eq.${encodeURIComponent(x.student_code)}&slot_id=eq.${x.from_slot}`,'DELETE');
  await api('change_requests?id=eq.'+x.id,'PATCH',{status:'approved'});
  await notify([x.student_code],'تمت الموافقة على طلبك',msg||'تم نقلك إلى الجروب الجديد')}
// قبول فوري لحظة إرسال الطلب (إن فعّله الأدمن): نفس الليفل + الكلاس لم يمتلئ
async function tryAutoApprove(x){try{const r=await gw('auto_approve',{id:x.id});return !!(r&&r.ok)}catch(e){return false}}
// قبول كل الطلبات المعلّقة المؤهلة (slotIds: للمحاضر جروباته فقط، وبدونها للأدمن كل الجروبات)
async function autoApprovePending(slotIds){
  let r=await api('change_requests?status=eq.pending'+(slotIds&&slotIds.length?'&to_slot=in.('+slotIds.map(Number).join(',')+')':'')+'&select=*,student:students(level)&order=id');
  if(slotIds){const S=slotIds.map(Number);r=r.filter(x=>S.includes(+x.to_slot))}
  const ids=[...new Set(r.map(x=>x.to_slot))],done=[];if(!ids.length)return{ok:0,skip:0,done};
  const sl=Object.fromEntries((await api('slots?id=in.('+ids.join(',')+')&select=id,level,capacity')).map(g=>[g.id,g])),N={};
  for(const i of ids)N[i]=await count('enrollments','slot_id','&slot_id=eq.'+i);
  for(const x of r){const g=sl[x.to_slot],l=lvN(x.student&&x.student.level);if(!g||!l||l!=lvN(g.level)||N[g.id]>=(g.capacity||35))continue;
    try{await approveReq(x,'تمت الموافقة على طلبك ونقلك إلى الجروب الجديد');N[g.id]++;done.push(x.id)}catch(e){}}
  return{ok:done.length,skip:r.length-done.length,done}}

Object.assign(MAP,{'التقييمات':'clip','تقييماتي':'chart','تسجيل غياب يدوي':'pen','الفصول الدراسية':'cal','نتائج التقييمات':'chart'});
Object.assign(DESC,{'التقييمات':'قيّم طلاب جروباتك أسبوعياً وحمّل السجلات','تقييماتي':'نتائجك في الترم والعام الدراسي'});
