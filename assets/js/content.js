/* ===== المحتوى التعليمي: مجلدات المحاضرين (يعتمد على app.js) =====
   كل الأسماء العامة هنا تبدأ بـ ct حتى لا تتعارض مع بقية الملفات */
const CT_BUCKET='fille',CT_ST=SB.replace('/rest/v1/','/storage/v1/'),ctq=encodeURIComponent;
Object.assign(P,{folder:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'});
MAP['المحتوى']='folder';MAP['طلبات حذف المحتوى']='warn';DESC['المحتوى']='المواد والملفات التعليمية (فيديو، PDF، عروض، ملفات)';

const CT_MIME={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',txt:'text/plain',zip:'application/zip'};
const ctUrl=p=>CT_ST+'object/public/'+CT_BUCKET+'/'+p.split('/').map(ctq).join('/');
const ctExt=n=>((String(n||'').match(/\.([A-Za-z0-9]{1,8})$/)||[])[1]||'').toLowerCase();
const ctSz=n=>{n=+n||0;return n>=1073741824?(n/1073741824).toFixed(2)+' GB':n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'};
const ctIsVid=i=>/^video\//.test(i.mime||'')||/^(mp4|mov|webm|mkv|avi|m4v)$/.test(ctExt(i.file_name));
const ctIcon=n=>{const e=ctExt(n);return /^(mp4|mov|webm|mkv|avi|m4v)$/.test(e)?'🎬':e=='pdf'?'📕':/^pptx?$/.test(e)?'📊':/^docx?$/.test(e)?'📝':/^xlsx?$/.test(e)?'📗':/^(png|jpe?g|gif|webp)$/.test(e)?'🖼️':/^(mp3|m4a|wav)$/.test(e)?'🎧':'📎'};
const ctOpen=i=>{const u=ctUrl(i.file_path);return /^(docx?|pptx?|xlsx?)$/.test(ctExt(i.file_name))?'https://view.officeapps.live.com/op/view.aspx?src='+ctq(u):u};
const ctDown=i=>ctUrl(i.file_path)+'?download='+ctq(i.file_name||i.title||'file');
const ctRand=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID().replace(/-/g,''):Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const ctEnc=a=>ctq('('+a.map(c=>'"'+c+'"').join(',')+')');
const ctSafe=s=>String(s||'ملف').replace(/[\\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,90)||'ملف';
const ctErr=e=>'<div class="msg">'+(/content_|relation|schema cache/i.test(e.message)?'جداول المحتوى غير منشأة بعد. شغّل ملف <b>phase12_content.sql</b> في Supabase ← SQL Editor ثم أعد تحميل الصفحة.':'حدث خطأ: '+esc(e.message))+'</div>';
async function ctAll(path){let o=[],i=0,r;do{r=await api(path+(path.includes('?')?'&':'?')+'limit=1000&offset='+i);o=o.concat(r);i+=1000}while(r.length==1000);return o}

async function ctUpload(path,file,onp){await rpc('app_storage_ticket',{p_action:'up',p_paths:[path]});return new Promise((ok,no)=>{
 const e=ctExt(file.name),f=file.type?file:new File([file],file.name,{type:CT_MIME[e]||'application/octet-stream'}),fd=new FormData();
 fd.append('cacheControl','3600');fd.append('',f);
 const x=new XMLHttpRequest();x.open('POST',CT_ST+'object/'+CT_BUCKET+'/'+path.split('/').map(ctq).join('/'));
 x.setRequestHeader('apikey',KEY);x.setRequestHeader('Authorization','Bearer '+KEY);
 x.upload.onprogress=ev=>{if(ev.lengthComputable)onp(ev.loaded/ev.total)};
 x.onload=()=>x.status<300?ok():no(new Error(x.status==413?'حجم الملف أكبر من الحد المسموح في Supabase (Storage ← Settings ← Upload file size limit)':'فشل الرفع ('+x.status+'): '+x.responseText));
 x.onerror=()=>no(new Error('انقطع الاتصال أثناء الرفع'));x.send(fd)})}
async function ctRm(paths){for(let i=0;i<paths.length;i+=50){await rpc('app_storage_ticket',{p_action:'del',p_paths:paths.slice(i,i+50)});const r=await fetch(CT_ST+'object/'+CT_BUCKET,{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths.slice(i,i+50)})});if(!r.ok)throw new Error(await r.text())}}

// ===== إدارة مجلدات محاضر واحد (تُستخدم للمحاضر وللأدمن) =====
async function ctManager(box,code,o,openIds){
 const keep=new Set([...(openIds||[]).map(String),...[...box.querySelectorAll('details[open]')].map(d=>d.dataset.d)]);
 const F=await api('content_folders?lecturer_code=eq.'+ctq(code)+'&order=id.desc');
 const I=F.length?await ctAll('content_items?folder_id=in.('+F.map(f=>f.id).join(',')+')&order=id'):[];
 const by={};I.forEach(i=>(by[i.folder_id]=by[i.folder_id]||[]).push(i));
 const bad='style="background:#fde2e6;color:#b3263f"';
 const fdel=f=>o.adm?`<button type="button" class="chip" data-fa="rm" data-f="${f.id}">حذف المجلد نهائياً</button>`:f.del_req?`<button type="button" class="chip" data-fa="undo" data-f="${f.id}">إلغاء طلب حذف المجلد</button>`:`<button type="button" class="chip" data-fa="req" data-f="${f.id}">طلب حذف المجلد</button>`;
 const idel=i=>o.adm?`<button type="button" class="chip" data-ia="rm" data-i="${i.id}">حذف نهائي</button>`:i.del_req?`<button type="button" class="chip" data-ia="undo" data-i="${i.id}">إلغاء طلب الحذف</button>`:`<button type="button" class="chip" data-ia="req" data-i="${i.id}">طلب حذف</button>`;
 const row=i=>`<tr><td>${ctIcon(i.file_name)} <b>${esc(i.title)}</b>${i.del_req?` <span class="pill" ${bad}>طلب حذف بانتظار الأدمن</span>`:''}<br><small>${esc(i.file_name)}</small></td><td>${ctSz(i.size)}</td><td>${(i.created_at||'').slice(0,10)}</td><td>${i.visible?'<b class="ok">ظاهر</b>':'<b class="bad">مخفي</b>'}</td><td><a class="chip" href="${ctOpen(i)}" target="_blank" rel="noopener">فتح</a><button type="button" class="chip" data-ia="vis" data-i="${i.id}">${i.visible?'إخفاء':'إظهار'}</button><button type="button" class="chip" data-ia="ren" data-i="${i.id}">تسمية</button>${idel(i)}</td></tr>`;
 box.innerHTML=`<div class="card"><h3>إنشاء مجلد جديد</h3><input id="ctn" placeholder="اسم المجلد، مثال: المحاضرة الأولى"><button class="btn" id="ctadd">إنشاء المجلد</button></div>`+
 (F.map(f=>{const A=by[f.id]||[];return`<div class="card"><div class="sh2"><b>📁 ${esc(f.name)}</b><span class="pill">${A.length} ملف</span><span class="pill" ${f.visible?'':bad}>${f.visible?'ظاهر للطلاب':'مخفي عن الطلاب'}</span>${f.del_req?`<span class="pill" ${bad}>طلب حذف بانتظار الأدمن</span>`:''}</div>
 <div><button type="button" class="chip" data-fa="vis" data-f="${f.id}">${f.visible?'إخفاء المجلد':'إظهار المجلد'}</button><button type="button" class="chip" data-fa="ren" data-f="${f.id}">تغيير الاسم</button>${fdel(f)}</div>
 <details data-d="${f.id}" ${keep.has(String(f.id))?'open':''}><summary>رفع وإدارة الملفات</summary>
 <div style="margin:10px 0"><label class="chk"><input type="checkbox" data-vis="${f.id}" checked> إظهار الملفات للطلاب فور رفعها</label></div>
 <input type="file" multiple data-up="${f.id}"><div id="pg${f.id}" class="note"></div>
 <div class="wrap"><table class="table"><tr><th>الملف</th><th>الحجم</th><th>التاريخ</th><th>الحالة</th><th></th></tr>${A.map(row).join('')||'<tr><td colspan="5">لا توجد ملفات بعد</td></tr>'}</table></div></details></div>`}).join('')||'<div class="msg">لا توجد مجلدات بعد. أنشئ مجلداً ثم ارفع بداخله.</div>');
 const again=ids=>ctManager(box,code,o,ids);
 box.onclick=async e=>{const t=e.target.closest('#ctadd,button[data-fa],button[data-ia]');if(!t)return;
  try{
   if(t.id=='ctadd'){const n=$('#ctn').value.trim();if(!n)return alert('اكتب اسم المجلد');await api('content_folders','POST',{lecturer_code:code,name:n,created_by:o.u.code},'return=minimal');return again()}
   if(t.dataset.fa){const f=F.find(x=>x.id==t.dataset.f),a=t.dataset.fa;
    if(a=='vis')await api('content_folders?id=eq.'+f.id,'PATCH',{visible:!f.visible});
    else if(a=='ren'){const n=prompt('اسم المجلد',f.name);if(!n||!n.trim())return;await api('content_folders?id=eq.'+f.id,'PATCH',{name:n.trim()})}
    else if(a=='req'){if(!confirm('إرسال طلب حذف المجلد «'+f.name+'» وكل ملفاته إلى الأدمن؟ لن يُحذف إلا بموافقته.'))return;await api('content_folders?id=eq.'+f.id,'PATCH',{del_req:true,del_by:o.u.code,del_at:new Date().toISOString()});notifyAdmins('طلب حذف مجلد محتوى','المحاضر '+o.u.name+' يطلب حذف المجلد: '+f.name);alert('تم إرسال الطلب للأدمن')}
    else if(a=='undo')await api('content_folders?id=eq.'+f.id,'PATCH',{del_req:false,del_by:null,del_at:null});
    else if(a=='rm'){if(!confirm('حذف المجلد «'+f.name+'» وكل ملفاته نهائياً؟ لا يمكن التراجع.'))return;await ctRm((by[f.id]||[]).map(i=>i.file_path));await api('content_folders?id=eq.'+f.id,'DELETE');}
    return again()}
   if(t.dataset.ia){const i=I.find(x=>x.id==t.dataset.i),a=t.dataset.ia;
    if(a=='vis')await api('content_items?id=eq.'+i.id,'PATCH',{visible:!i.visible});
    else if(a=='ren'){const n=prompt('اسم الملف كما يظهر للطلاب',i.title);if(!n||!n.trim())return;await api('content_items?id=eq.'+i.id,'PATCH',{title:n.trim()})}
    else if(a=='req'){if(!confirm('إرسال طلب حذف «'+i.title+'» إلى الأدمن؟ لن يُحذف إلا بموافقته.'))return;await api('content_items?id=eq.'+i.id,'PATCH',{del_req:true,del_by:o.u.code,del_at:new Date().toISOString()});notifyAdmins('طلب حذف ملف محتوى','المحاضر '+o.u.name+' يطلب حذف الملف: '+i.title);alert('تم إرسال الطلب للأدمن')}
    else if(a=='undo')await api('content_items?id=eq.'+i.id,'PATCH',{del_req:false,del_by:null,del_at:null});
    else if(a=='rm'){if(!confirm('حذف «'+i.title+'» نهائياً؟'))return;await ctRm([i.file_path]);await api('content_items?id=eq.'+i.id,'DELETE')}
    return again([i.folder_id])}
  }catch(er){alert(er.message)}};
 box.onchange=async e=>{const t=e.target;if(!t.dataset||!t.dataset.up||!t.files.length)return;
  const fid=+t.dataset.up,files=[...t.files],vis=box.querySelector(`[data-vis="${fid}"]`).checked,pg=box.querySelector('#pg'+fid);let okN=0;t.disabled=true;
  for(let k=0;k<files.length;k++){const f=files[k],path=fid+'/'+ctRand()+'.'+(ctExt(f.name)||'bin'),pre=`(${k+1}/${files.length}) ${esc(f.name)} — `;
   pg.innerHTML=pre+'0%';
   try{await ctUpload(path,f,p=>pg.innerHTML=pre+Math.round(p*100)+'% <progress max="100" value="'+Math.round(p*100)+'"></progress>')}catch(er){alert('تعذر رفع «'+f.name+'»:\n'+er.message);continue}
   try{await api('content_items','POST',{folder_id:fid,title:f.name.replace(/\.[^.]+$/,'')||f.name,file_path:path,file_name:f.name,mime:f.type||CT_MIME[ctExt(f.name)]||null,size:f.size,visible:vis,uploaded_by:o.u.code},'return=minimal');okN++}
   catch(er){alert('رُفع «'+f.name+'» لكن تعذر تسجيله: '+er.message);ctRm([path]).catch(()=>{})}}
  alert('تم رفع '+okN+' من '+files.length+' ملف');again([fid])}}

// ===== تبويب المحاضر =====
async function lecContentTab(b,u){try{
 b.innerHTML='<div class="msg">أنشئ مجلداً باسم مناسب ثم ارفع بداخله موادك. يظهر المجلد والملفات لطلاب كلاساتك فقط، ويمكنك إخفاء أو إظهار أي مجلد أو ملف في أي وقت. الحذف يتم بطلب موافقة الأدمن.</div><div id="ctm"></div>';
 await ctManager($('#ctm'),u.code,{u,adm:false})}catch(e){b.innerHTML=ctErr(e)}}

// ===== تبويب الأدمن: الرفع لأي محاضر + التحميل الشامل =====
const ctLoadZip=()=>window.JSZip?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=ok;s.onerror=()=>no(new Error('تعذر تحميل مكتبة الضغط، تأكد من الاتصال'));document.head.append(s)});
async function ctZip(code,noVid,prog){
 await ctLoadZip();
 const fl=await ctAll('content_folders?select=*,lec:staff(name)&order=lecturer_code,id'+(code?'&lecturer_code=eq.'+ctq(code):'')),FM=Object.fromEntries(fl.map(f=>[f.id,f]));
 let items=(await ctAll('content_items?order=id')).filter(i=>FM[i.folder_id]);if(noVid)items=items.filter(i=>!ctIsVid(i));
 if(!items.length)return alert('لا توجد ملفات للتحميل');
 const tot=items.reduce((a,i)=>a+(+i.size||0),0);
 if(!confirm('عدد الملفات: '+items.length+' — الحجم التقريبي: '+ctSz(tot)+(tot>1.5e9?'\nالحجم كبير وقد يتعذر تجميعه على هذا الجهاز؛ جرّب استبعاد الفيديوهات أو حمّل محاضراً محاضراً.':'')+'\nمتابعة؟'))return;
 const zip=new JSZip(),used=new Set(),fail=[];
 for(let k=0;k<items.length;k++){const i=items[k],f=FM[i.folder_id];prog('جارٍ التحميل '+(k+1)+' / '+items.length+' ...');
  try{const r=await fetch(ctUrl(i.file_path));if(!r.ok)throw 0;const bl=await r.blob();
   let nm=ctSafe(f.lec&&f.lec.name||f.lecturer_code)+'/'+ctSafe(f.name)+'/'+ctSafe(i.file_name||i.title),n=1;const base=nm;
   while(used.has(nm)){n++;nm=base.replace(/(\.[^.\/]*)?$/,' ('+n+')$1')}used.add(nm);zip.file(nm,bl,{binary:true})}catch(x){fail.push(i.title)}}
 if(fail.length)zip.file('_failed.txt','تعذر تحميل:\n'+fail.join('\n'));
 const out=await zip.generateAsync({type:'blob',compression:'STORE',streamFiles:true},m=>prog('تجميع الملف المضغوط '+Math.round(m.percent)+'%'));
 const a=document.createElement('a');a.href=URL.createObjectURL(out);a.download='content_'+(code?ctSafe(code)+'_':'all_')+today()+'.zip';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},60000);
 prog('تم التحميل'+(fail.length?' — تعذر '+fail.length+' ملف (مذكورة في _failed.txt)':''))}
async function adminContentTab(b){try{
 const u=me();let L;try{L=await api('staff?or='+ctq('(role.eq.lecturer,roles.cs.{lecturer})')+'&select=code,name&order=name')}catch(e){L=await api('staff?role=eq.lecturer&select=code,name&order=name')}
 b.innerHTML=`<div class="card"><h3>محتوى المحاضرين</h3><label>المحاضر</label><select id="ctl"><option value="">اختر المحاضر...</option>${L.map(l=>`<option value="${esc(l.code)}">${esc(l.name)} (${esc(l.code)})</option>`).join('')}</select><div style="margin:10px 0"><label class="chk"><input type="checkbox" id="ctnv"> استبعاد الفيديوهات من ملف التحميل</label></div><button type="button" class="btn alt" id="ctz1">تحميل ملفات المحاضر المختار (ZIP)</button><button type="button" class="btn" id="ctzA">تحميل ملفات كل المحاضرين (ZIP)</button><div id="ctzp" class="note"></div></div><div id="ctm"></div>`;
 const prog=t=>$('#ctzp').textContent=t,run=async code=>{const bs=[$('#ctz1'),$('#ctzA')];bs.forEach(x=>x.disabled=true);try{await ctZip(code,$('#ctnv').checked,prog)}catch(e){alert(e.message);prog('')}bs.forEach(x=>x.disabled=false)};
 $('#ctl').onchange=()=>{const c=$('#ctl').value;if(!c){$('#ctm').innerHTML='';return}ctManager($('#ctm'),c,{u,adm:u.role=='admin'}).catch(e=>$('#ctm').innerHTML=ctErr(e))};
 $('#ctz1').onclick=()=>{const c=$('#ctl').value;if(!c)return alert('اختر المحاضر أولاً');run(c)};$('#ctzA').onclick=()=>run(null)}catch(e){b.innerHTML=ctErr(e)}}

// ===== تبويب الأدمن: طلبات حذف المحتوى =====
async function contentDelTab(b){try{
 const u=me(),[F,I]=await Promise.all([api('content_folders?del_req=eq.true&select=*,lec:staff(name)&order=del_at'),api('content_items?del_req=eq.true&select=*,folder:content_folders(name,lecturer_code,lec:staff(name))&order=del_at')]);
 const cnt={};if(F.length)(await ctAll('content_items?folder_id=in.('+F.map(f=>f.id).join(',')+')&select=folder_id')).forEach(x=>cnt[x.folder_id]=(cnt[x.folder_id]||0)+1);
 const btn=(k,id)=>`<button type="button" class="btn no" style="margin:0 0 0 6px" data-ok="${k}${id}">${u.role=='admin'?'موافقة وحذف نهائي':'للأدمن فقط'}</button><button type="button" class="btn alt" style="margin:0" data-no="${k}${id}">رفض الطلب</button>`;
 b.innerHTML=`<div class="card wrap"><h3>طلبات حذف مجلدات (${F.length})</h3><table class="table"><tr><th>المجلد</th><th>المحاضر</th><th>عدد ملفاته</th><th>التاريخ</th><th></th></tr>${F.map(f=>`<tr><td>📁 ${esc(f.name)}</td><td>${esc(f.lec&&f.lec.name)}</td><td>${cnt[f.id]||0}</td><td>${(f.del_at||'').slice(0,10)}</td><td>${btn('f',f.id)}</td></tr>`).join('')||'<tr><td colspan="5">لا توجد طلبات</td></tr>'}</table></div>
 <div class="card wrap"><h3>طلبات حذف ملفات (${I.length})</h3><table class="table"><tr><th>الملف</th><th>المجلد</th><th>المحاضر</th><th>الحجم</th><th>التاريخ</th><th></th></tr>${I.map(i=>`<tr><td>${ctIcon(i.file_name)} ${esc(i.title)}<br><small>${esc(i.file_name)}</small></td><td>${esc(i.folder&&i.folder.name)}</td><td>${esc(i.folder&&i.folder.lec&&i.folder.lec.name)}</td><td>${ctSz(i.size)}</td><td>${(i.del_at||'').slice(0,10)}</td><td><a class="chip" href="${ctOpen(i)}" target="_blank" rel="noopener">فتح</a>${btn('i',i.id)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد طلبات</td></tr>'}</table></div>`;
 b.onclick=async e=>{const k=e.target.closest('[data-ok],[data-no]');if(!k)return;const ok=k.dataset.ok!==undefined,v=k.dataset.ok||k.dataset.no,kind=v[0],id=v.slice(1),tbl=kind=='f'?'content_folders':'content_items',row=(kind=='f'?F:I).find(x=>x.id==id),lc=kind=='f'?row.lecturer_code:row.folder&&row.folder.lecturer_code,nm=kind=='f'?row.name:row.title;
  try{if(ok){if(u.role!='admin')return alert('الموافقة على الحذف للأدمن فقط');if(!confirm('حذف «'+nm+'» نهائياً؟'))return;
    const paths=kind=='f'?(await ctAll('content_items?folder_id=eq.'+id+'&select=file_path')).map(x=>x.file_path):[row.file_path];await ctRm(paths);await api(tbl+'?id=eq.'+id,'DELETE');if(lc)notify([lc],'تمت الموافقة على الحذف','تم حذف: '+nm)}
   else{await api(tbl+'?id=eq.'+id,'PATCH',{del_req:false,del_by:null,del_at:null});if(lc)notify([lc],'تم رفض طلب الحذف','لم يُحذف: '+nm)}
   contentDelTab(b)}catch(er){alert(er.message)}}}catch(e){b.innerHTML=ctErr(e)}}

// ===== تبويب الطالب =====
async function stuContentTab(b,u){try{
 const en=await api('enrollments?student_code=eq.'+ctq(u.code)+'&select=slot:slots(lecturer_code)'),L=[...new Set(en.map(x=>x.slot&&x.slot.lecturer_code).filter(Boolean))];
 if(!L.length){b.innerHTML='<div class="msg">لا يوجد محتوى متاح حالياً.</div>';return}
 const F=await api('content_folders?visible=eq.true&lecturer_code=in.'+ctEnc(L)+'&select=id,name,lecturer_code,lec:staff(name)&order=id.desc'),
  I=F.length?await ctAll('content_items?visible=eq.true&folder_id=in.('+F.map(f=>f.id).join(',')+')&select=id,folder_id,title,file_path,file_name,size,created_at&order=id'):[],by={};
 I.forEach(i=>(by[i.folder_id]=by[i.folder_id]||[]).push(i));
 const FF=F.filter(f=>(by[f.id]||[]).length);if(!FF.length){b.innerHTML='<div class="msg">لا يوجد محتوى متاح حالياً.</div>';return}
 b.innerHTML=L.filter(l=>FF.some(f=>f.lecturer_code==l)).map(l=>`<div class="dayh">${esc(FF.find(f=>f.lecturer_code==l).lec&&FF.find(f=>f.lecturer_code==l).lec.name)}</div>`+FF.filter(f=>f.lecturer_code==l).map(f=>`<div class="card"><details open><summary>📁 ${esc(f.name)} (${by[f.id].length})</summary><div class="wrap"><table class="table">${by[f.id].map(i=>`<tr><td>${ctIcon(i.file_name)} <b>${esc(i.title)}</b><br><small>${ctSz(i.size)} · ${(i.created_at||'').slice(0,10)}</small></td><td style="white-space:nowrap"><a class="chip" href="${ctOpen(i)}" target="_blank" rel="noopener">فتح</a><a class="chip" href="${ctDown(i)}" download>تحميل</a></td></tr>`).join('')}</table></div></details></div>`).join('')).join('')}catch(e){b.innerHTML=ctErr(e)}}
