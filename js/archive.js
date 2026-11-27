/* Maskob — the archive (الأرشيف) of HR, operations and finance: each department keeps its own documents,
   sorted into sections (ready-made ones it can rename, plus its own), with the linked branch, an expiry date
   that warns 30 days ahead, and search.
   Loaded by index.html as a classic script after attachments.js (photos are shrunk the same way).

   archive/{id}:            {dept:'hr'|'ops'|'fin', sec, title, ref, branch, expiry, note, name, type, size, parts, at, by}
   archive/{id}/parts/pN:   {data, dept}   — the file as text in pieces under the 1 MB document limit
   archiveSecs/{dept}:      {names:{secId:name}, extra:[{id,name}]}
   Each department reads and writes only its own (firestore.rules); the general manager sees every one. */
const ARC_MAX=5*1024*1024, ARC_PART=700000, ARC_SOON=30;
const ARC_DEPT={hr:'hr',manager:'ops',finance:'fin'};
const ARC_DEFAULT={
  hr:['contracts','gov','policies','letters','training','other'],
  ops:['licenses','leases','maintc','inspect','quality','other'],
  fin:['bank','tax','supcon','invoices','audit','cr','other']};
const arcDept=()=>ARC_DEPT[S.role]||null;
const arcSecs=d=>{const cfg=S.arcSecs||{},names=cfg.names||{};
  return[...(ARC_DEFAULT[d]||[]).map(id=>({id,name:names[id]||t('as_'+d+'_'+id),base:true})),...(cfg.extra||[]).map(x=>({id:x.id,name:names[x.id]||x.name}))]};
const arcSecName=(d,id)=>(arcSecs(d).find(s=>s.id===id)||{name:t('as_unsorted')}).name;
/* expiry: 'out' (passed), 'soon' (within 30 days) or '' */
const arcExp=x=>{if(!isDay(x.expiry))return'';const today=dayKey(Date.now());if(x.expiry<today)return'out';return x.expiry<=dayKey(Date.now()+ARC_SOON*864e5)?'soon':''};
const arcAlerts=()=>(S.archive||[]).filter(x=>arcExp(x));

/* storage: Firestore when live, memory in demo mode */
const ARC={
  async add(meta,data){
    const id='AR-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const parts=[];for(let i=0;i<data.length;i+=ARC_PART)parts.push(data.slice(i,i+ARC_PART));
    const m=Object.assign({},meta,{parts:parts.length,at:nowIso()});
    if(S.fb){await db.doc('archive/'+id).set(m);
      for(let i=0;i<parts.length;i++)await db.doc('archive/'+id+'/parts/p'+i).set({data:parts[i],dept:m.dept})}
    else{MEMSET('archive',MEM('archive').concat([Object.assign({id},m)]));(S._demoArc||(S._demoArc={}))[id]=data;xLoadDemo();render()}
    return id;
  },
  async get(x){
    if(S.fb){let s='';for(let i=0;i<(x.parts||1);i++){const d=await db.doc('archive/'+x.id+'/parts/p'+i).get();s+=d.exists?d.data().data:''}return s}
    return(S._demoArc||{})[x.id]||'';
  },
  async del(x){
    if(S.fb){for(let i=0;i<(x.parts||1);i++)await db.doc('archive/'+x.id+'/parts/p'+i).delete().catch(()=>{});return db.doc('archive/'+x.id).delete()}
    MEMSET('archive',MEM('archive').filter(v=>v.id!==x.id));if(S._demoArc)delete S._demoArc[x.id];xLoadDemo();render();
  },
  async saveSecs(d,cfg){
    if(S.fb)return db.doc('archiveSecs/'+d).set(cfg);
    const all=Object.assign({},MEM('archiveSecs')&&!Array.isArray(MEM('archiveSecs'))?MEM('archiveSecs'):{});all[d]=cfg;MEMSET('archiveSecs',all);xLoadDemo();render();
  }
};
/* called from xLoadDemo / xStart (branch.js) */
function arcLoadDemo(){const d=arcDept();S.archive=d?MEM('archive').filter(x=>x.dept===d):[];const all=MEM('archiveSecs');S.arcSecs=d&&all&&!Array.isArray(all)?all[d]||{}:{}}
function arcStart(u,onErr){const d=arcDept();S.archive=[];S.arcSecs={};if(!d)return;
  u.push(db.collection('archive').where('dept','==',d).onSnapshot(s=>{S.archive=s.docs.map(x=>Object.assign({},x.data(),{id:x.id}));render()},onErr));
  u.push(db.doc('archiveSecs/'+d).onSnapshot(s=>{S.arcSecs=s.exists?s.data():{};render()},onErr))}

/* ---------- the page ---------- */
function archiveView(){
  const d=arcDept();if(!d)return'';
  const secs=arcSecs(d),f=S.arcSec||'',q=String(S.arcQ||'').trim().toLowerCase(),bf=S.arcBranch||'';
  const all=[...(S.archive||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const list=all.filter(x=>(!f||(f==='@alert'?arcExp(x):x.sec===f))&&(!bf||x.branch===bf)
    &&(!q||[x.title,x.ref,x.note,x.name,arcSecName(d,x.sec),x.branch].some(v=>String(v||'').toLowerCase().includes(q))));
  const cnt=id=>all.filter(x=>x.sec===id).length,al=arcAlerts();
  const ic=n=>typeof ico==='function'?ico(n):'';
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_archive')}</h2><div class="row"><button class="btn btn-ghost rp-btn" data-act="arcSecs">${t('ar_manageSecs')}</button><button class="btn btn-sun" data-act="arcNew">+ ${t('ar_add')}</button></div></div>
  <div class="stats">${kpi(t('ar_count'),sar(all.length))}${kpi(t('ar_soon'),sar(al.filter(x=>arcExp(x)==='soon').length),al.some(x=>arcExp(x)==='soon')?'hot':'')}${kpi(t('ar_out'),sar(al.filter(x=>arcExp(x)==='out').length),al.some(x=>arcExp(x)==='out')?'hot':'')}</div>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><input class="field" id="arcQ" data-in="arcQ" placeholder="${esc(t('ar_search'))}" value="${esc(S.arcQ||'')}" style="flex:1;min-width:200px">
    <select class="field" id="arcBranch" style="width:auto"><option value="">${esc(t('ar_allBranches'))}</option>${S.branches.map(b=>`<option value="${esc(b)}" ${bf===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div>
  <div class="arc-secs"><button class="arc-sec" aria-pressed="${!f}" data-act="arcSec" data-k=""><span class="arc-ic">${ic('layers')}</span><b>${t('f_all')}</b><span class="num">${all.length}</span></button>
    ${al.length?`<button class="arc-sec warn" aria-pressed="${f==='@alert'}" data-act="arcSec" data-k="@alert"><span class="arc-ic">${ic('alert')}</span><b>${t('ar_alerts')}</b><span class="num">${al.length}</span></button>`:''}
    ${secs.map(s=>`<button class="arc-sec" aria-pressed="${f===s.id}" data-act="arcSec" data-k="${esc(s.id)}"><span class="arc-ic">${ic('archive')}</span><b>${esc(s.name)}</b><span class="num">${cnt(s.id)}</span></button>`).join('')}</div>
  <div class="list">${list.length?list.map(x=>{const e=arcExp(x);return`<div class="oc arc-row ${e==='out'?'late':''}">
    <span class="arc-type ${x.type==='application/pdf'?'pdf':''}" aria-hidden="true">${x.type==='application/pdf'?'PDF':ic('camera')}</span>
    <span style="min-width:0;flex:1"><span class="t">${esc(x.title||x.name)} <span class="tag">${esc(arcSecName(d,x.sec))}</span>${x.branch?` <span class="tag">${esc(x.branch)}</span>`:''}</span>
      <span class="s">${x.ref?`<span dir="ltr">#${esc(x.ref)}</span> · `:''}${esc(efSize(x.size||0))} · ${esc(when(x.at))}${x.note?' · '+esc(String(x.note).slice(0,70)):''}</span></span>
    <span class="side">${x.expiry?`<span class="pill ${e==='out'?'li-expired':e==='soon'?'ms-progress':'ms-done'}">${esc(t(e==='out'?'ar_expired':'ar_until'))} ${esc(dateLabel(x.expiry))}</span>`:''}
      <span class="row" style="gap:6px;justify-content:flex-end"><button class="btn btn-ghost rp-btn" data-act="arcView" data-id="${esc(x.id)}">${t('ef_view')}</button><button class="btn btn-ghost rp-btn" data-act="arcEdit" data-id="${esc(x.id)}">${t('ar_edit')}</button></span></span></div>`}).join('')
    :`<div class="empty">${esc(t(all.length?'ar_noMatch':'ar_none'))}</div>`}</div>`;
}
/* add / edit a document */
function archiveSheet(){
  const d=arcDept(),isNew=S.openArc==='new',x=S.hrDraft||{};if(!d)return'';
  const body=`<div class="sl-grid hr-grid">${hrIn('title',t('ar_title'))}${hrSel('sec',t('ar_sec'),arcSecs(d).map(s=>[s.id,s.name]))}${hrIn('ref',t('ar_ref'),'text','dir="ltr"')}
    ${hrSel('branch',t('ar_branch'),[['',t('ar_noBranch')],...S.branches.map(b=>[b,b])])}${hrIn('expiry',t('ar_expiry'),'date')}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(x.note||'')}</textarea></label>
  ${isNew?`<div class="arc-file"><label class="btn btn-navy rp-btn io-imp">${typeof ico==='function'?ico('upload','b-ic'):''}${esc(S.arcFile?t('ar_fileChange'):t('ar_file'))}<input type="file" id="arcFile" accept="image/*,application/pdf"></label>
    <span class="hint">${S.arcFile?esc(S.arcFile.name+' · '+efSize(S.arcFile.size)):esc(t('ar_fileHint'))}</span></div>`:`<p class="hint">${esc(x.name||'')} · ${esc(efSize(x.size||0))}</p>`}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="arcDel">${S.confirm==='arcDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="arcSave" ${S.busy||S.arcBusy?'disabled':''}>${S.arcBusy?t('ef_loading'):t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('ar_add'):(x.title||x.name),body,foot);
}
/* rename the ready sections, add or remove the department's own */
function archiveSecsSheet(){
  const d=arcDept();if(!d)return'';const secs=arcSecs(d),used=id=>(S.archive||[]).some(x=>x.sec===id);
  const body=`<p class="hint">${esc(t('ar_secsHint'))}</p>
  ${secs.map(s=>`<div class="row" style="gap:8px;margin-top:8px"><input class="field" data-in="arcSecName" data-k="${esc(s.id)}" value="${esc(s.name)}" style="flex:1">
    ${s.base?'':`<button class="btn btn-ghost rp-btn" data-act="arcSecDel" data-k="${esc(s.id)}" ${used(s.id)?`title="${esc(t('ar_secUsed'))}"`:''}>${t('del')}</button>`}</div>`).join('')}
  <div class="row" style="gap:8px;margin-top:14px"><input class="field" id="arcNewSec" placeholder="${esc(t('ar_newSec'))}" style="flex:1"><button class="btn btn-navy" data-act="arcSecAdd">+ ${t('ar_addSec')}</button></div>`;
  return hrSheetWrap(t('ar_manageSecs'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="arcSecsSave">${t('waSave')}</button>`);
}
Object.assign(A,{
  arcSec(el){S.arcSec=el.dataset.k;render()},
  arcNew(){const d=arcDept();S.openArc='new';S.confirm=null;S.arcFile=null;S.hrDraft={title:'',sec:S.arcSec&&S.arcSec!=='@alert'?S.arcSec:(ARC_DEFAULT[d]||['other'])[0],ref:'',branch:S.arcBranch||'',expiry:'',note:''};render()},
  arcEdit(el){const x=(S.archive||[]).find(v=>v.id===el.dataset.id);if(!x)return;S.openArc=x.id;S.confirm=null;S.hrDraft=Object.assign({},x);render()},
  async arcSave(){
    const d=arcDept(),x=S.hrDraft||{},isNew=S.openArc==='new';if(!d)return;
    const title=String(x.title||'').trim();if(!title){toast(t('ar_needTitle'));return}
    const meta={dept:d,sec:arcSecs(d).some(s=>s.id===x.sec)?x.sec:'other',title,ref:String(x.ref||'').trim(),branch:S.branches.includes(x.branch)?x.branch:'',expiry:isDay(x.expiry)?x.expiry:'',note:String(x.note||'').trim()};
    if(isNew){const f=S.arcFile;if(!f){toast(t('ar_needFile'));return}
      S.arcBusy=true;render();
      try{const data=await efRead(f);
        await ARC.add(Object.assign(meta,{name:f.name,type:f.type==='application/pdf'?'application/pdf':'image/jpeg',size:Math.round(data.length*0.75),by:S.userName||roleL(S.realRole||S.role)}),data);
        S.openArc=null;S.hrDraft=null;S.arcFile=null;toast(t('ar_saved'))}catch(e){toast(t('saveFail'))}
      S.arcBusy=false;render();return}
    guard(async()=>{await X.upd('archive',S.openArc,meta);S.openArc=null;S.hrDraft=null},()=>t('ar_saved'));
  },
  arcDel(){const x=(S.archive||[]).find(v=>v.id===S.openArc);if(!x)return;if(S.confirm!=='arcDel'){S.confirm='arcDel';render();return}
    guard(async()=>{await ARC.del(x);S.openArc=null;S.confirm=null;S.hrDraft=null},()=>t('li_deleted'))},
  async arcView(el){
    const x=(S.archive||[]).find(v=>v.id===el.dataset.id);if(!x)return;const win=window.open('','_blank');
    try{const data=await ARC.get(x);const b64=data.slice(data.indexOf(',')+1),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([u8],{type:x.type||'application/octet-stream'}));
      if(win&&!win.closed)win.location.href=url;else{const a=document.createElement('a');a.href=url;a.download=x.name||'file';document.body.appendChild(a);a.click();a.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){if(win)win.close();toast(t('saveFail'))}},
  arcSecs(){S.openArcSecs=true;S.arcSecDraft=JSON.parse(JSON.stringify(S.arcSecs||{}));render()},
  arcSecAdd(){const el=document.getElementById('arcNewSec'),name=String(el&&el.value||'').trim();if(!name){toast(t('ar_needSec'));return}
    const c=S.arcSecDraft||(S.arcSecDraft={});(c.extra||(c.extra=[])).push({id:'s'+Date.now().toString(36),name});S.arcSecs=Object.assign({},S.arcSecs,{extra:c.extra});render()},
  arcSecDel(el){const id=el.dataset.k;if((S.archive||[]).some(x=>x.sec===id)){toast(t('ar_secUsed'));return}
    const c=S.arcSecDraft||{};c.extra=(c.extra||[]).filter(x=>x.id!==id);S.arcSecs=Object.assign({},S.arcSecs,{extra:c.extra});render()},
  arcSecsSave(){const d=arcDept(),c=S.arcSecDraft||{};guard(async()=>{await ARC.saveSecs(d,{names:c.names||{},extra:c.extra||[]});S.openArcSecs=false},()=>t('st_saved'))}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;
  if(k==='arcQ'){S.arcQ=el.value;clearTimeout(S._arcT);S._arcT=setTimeout(render,180)}
  if(k==='arcSecName'){const c=S.arcSecDraft||(S.arcSecDraft={});(c.names||(c.names={}))[el.dataset.k]=el.value;const ex=(c.extra||[]).find(x=>x.id===el.dataset.k);if(ex)ex.name=el.value}});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='arcBranch'){S.arcBranch=el.value;render()}
  if(el.id==='arcFile'&&el.files&&el.files[0]){const f=el.files[0];el.value='';
    if(!(f.type==='application/pdf'||/^image\//.test(f.type))){toast(t('ef_badType'));return}
    if(f.size>ARC_MAX){toast(t('ar_tooBig'));return}
    S.arcFile=f;if(S.hrDraft&&!String(S.hrDraft.title||'').trim())S.hrDraft.title=f.name.replace(/\.[^.]+$/,'');render()}});
