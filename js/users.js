/* Maskob — Personal user accounts and the activity log.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   users/{id}:  {name, role, branch, h, active, createdAt, updatedAt}
                h = sha256("maskob:u:" + code) — codes are unique across all users and shared codes
   codes/{h}:   {role, branch, user, name}  lets a device find the account behind a typed code
   sessions/{uid} gets {user, name} as well; firestore.rules accepts the session only while the
   account exists, is active, and still has that code and role.
   log/{id}:    {at, uid, user, name, role, branch, op, col, doc}  — read by the system admin only. */
const USER_ROLES=['owner','manager','warehouse','branch','hr','admin'];
const usersList=()=>[...(S.users||[])].sort((a,b)=>(+(b.active!==false)-+(a.active!==false))||String(a.name).localeCompare(String(b.name),'ar'));
const userRoleL=u=>roleL(u.role)+(u.role==='branch'&&u.branch?': '+u.branch:'');

function usersView(){
  const list=usersList();
  const shared=pinEntries().filter(e=>!e.user).length;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_users')}</h2><button class="btn btn-sun" data-act="usNew">+ ${t('us_add')}</button></div>
  <p class="hint">${esc(t('us_hint'))}</p><p class="hint">${esc(t('ow_hint'))}</p>
  ${shared&&list.some(u=>u.active!==false)?`<div class="note-bar" style="margin:8px 0">${esc(t('us_sharedLeft',{n:shared}))}</div>`:''}
  <div class="list" style="margin-top:10px">${list.length?list.map(u=>`<button class="oc ${u.active===false?'cat-off':''}" data-act="usOpen" data-id="${esc(u.id)}">
    <span style="min-width:0"><span class="t">${esc(u.name)}</span><span class="s">${esc(userRoleL(u))}</span></span>
    <span class="side">${u.active===false?`<span class="pill ms-open">${t('cat_off')}</span>`:`<span class="pill ms-done">${t('es_active')}</span>`}</span></button>`).join(''):`<div class="empty">${esc(t('us_none'))}</div>`}</div>`;
}
function userSheet(){
  const isNew=S.openUser==='new';const d=S.hrDraft||{};
  const body=`<div class="sl-grid hr-grid">${hrIn('name',t('us_name'))}${hrSel('role',t('us_role'),USER_ROLES.map(r=>[r,roleL(r)]))}
    ${d.role==='branch'?hrSel('branch',t('r_branch'),S.branches.map(b=>[b,b])):''}
    <label><span class="hint">${esc(isNew?t('us_code'):t('us_newCode'))}</span><input class="field" type="password" inputmode="numeric" id="hr-pin" data-in="hrF" data-f="pin" maxlength="${codeLenSet()||6}" autocomplete="new-password" placeholder="${esc(codePh())}" value="${esc(d.pin||'')}" style="direction:ltr;text-align:center;letter-spacing:.3em"></label></div>
  ${isNew?'':`<div class="kind" style="margin-top:12px">${[['on','es_active'],['off','cat_off']].map(([k,l])=>`<button aria-pressed="${(d.active===false?'off':'on')===k}" data-act="usActive" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>`}
  <p class="hint" style="margin-top:8px">${esc(t(isNew?'us_codeHint':'us_codeKeep'))}</p>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="usDel">${S.confirm==='usDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="usSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('us_add'):(d.name||''),body,foot);
}
/* ---------- activity log ---------- */
const LOG_SKIP=new Set(['shifts','checks','payroll','sessions','log','codes']);   // frequent auto-saves stay out of the log
const LOG_COL={orders:'tab_all',employees:'tab_emps',leaves:'tab_leaves',custody:'tab_custody',advances:'tab_adv',licenses:'tab_lic',vouchers:'tab_vc',forms:'tab_forms',
  leaveReqs:'tab_lr',staff:'sh_staff',sales:'tab_sales',maintenance:'tab_maint',users:'tab_users',targets:'tg_title'};
const logSeen={};
function logAct(op,col,doc){
  if(!S.role||LOG_SKIP.has(col))return;
  const k=op+'|'+col+'|'+doc;if(logSeen[k]&&Date.now()-logSeen[k]<60000)return;logSeen[k]=Date.now();
  const e={at:nowIso(),uid:S.uid||'',user:S.userId||'',name:S.userName||'',role:S.realRole||S.role,branch:S.role==='branch'?(S.branch||''):'',op,col,doc:String(doc||'')};
  if(S.fb){db.collection('log').add(e).catch(()=>{});return}
  MEMSET('log',[e,...MEM('log')].slice(0,500));
}
function logView(){
  const f=S.logUser||'';
  const all=(S.log||[]).filter(e=>!f||(f==='@shared'?!e.user:e.user===f));
  const who=e=>e.name?esc(e.name):`<span class="hint">${esc(t('us_sharedCode'))}</span>`;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_log2')}</h2>
    <select class="field" id="logUser" style="width:auto;min-width:180px"><option value="">${esc(t('us_allUsers'))}</option><option value="@shared" ${f==='@shared'?'selected':''}>${esc(t('us_sharedCode'))}</option>${usersList().map(u=>`<option value="${esc(u.id)}" ${f===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
  <p class="hint">${esc(t('lg_hint'))}</p>
  ${all.length?`<div class="scroll"><table class="tbl"><thead><tr><th>${t('lg_when')}</th><th>${t('lg_who')}</th><th>${t('us_role')}</th><th>${t('lg_what')}</th></tr></thead><tbody>
  ${all.slice(0,300).map(e=>`<tr><td class="n">${esc(when(e.at))}</td><td>${who(e)}</td><td>${esc(roleL(e.role))}${e.branch?': '+esc(e.branch):''}</td><td>${esc(t('lo_'+e.op))} — ${esc(LOG_COL[e.col]?t(LOG_COL[e.col]):e.col)} <span class="hint num" dir="ltr">${esc(e.doc)}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('lg_none'))}</div>`}`;
}
Object.assign(A,{
  usNew(){S.openUser='new';S.confirm=null;S.hrDraft={name:'',role:'branch',branch:S.branches[0]||'',pin:'',active:true};render()},
  usOpen(el){const u=(S.users||[]).find(x=>x.id===el.dataset.id);if(!u)return;S.openUser=u.id;S.confirm=null;S.hrDraft=Object.assign({},u,{pin:''});render()},
  usActive(el){S.hrDraft.active=el.dataset.k!=='off';render()},
  async usSave(){
    const d=S.hrDraft||{};const name=String(d.name||'').trim();const role=USER_ROLES.includes(d.role)?d.role:'branch';
    const isNew=S.openUser==='new';const id=isNew?'U-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6):S.openUser;
    const old=(S.users||[]).find(x=>x.id===id)||{};const pin=String(d.pin||'').trim();
    if(!name){toast(t('hr_needName'));return}
    if(role==='branch'&&!S.branches.includes(d.branch)){toast(t('us_pickBranch'));return}
    if(isNew&&!pin){toast(codeLenMsg());return}
    let h=old.h;
    if(pin){
      if(!codeOk(pin)){toast(codeLenMsg());return}
      const clash=await findLocal(pin);if(clash&&clash.user!==id){toast(t('codeInUse'));return}
      if(await overlapsOther(pin,'user:'+id)){toast(t('codeOverlap'));return}
      h=await hashPin('u',pin);
    }
    const active=isNew?true:d.active!==false,tm=nowIso();
    const data={name,role,branch:role==='branch'?d.branch:'',h,active,createdAt:old.createdAt||tm,updatedAt:tm};
    guard(async()=>{
      await X.put('users',id,data);
      if(S.fb){
        if(old.h&&(old.h!==h||!active))await db.doc('codes/'+old.h).delete().catch(()=>{});
        if(active)await db.doc('codes/'+h).set({role,branch:data.branch,user:id,name});
      }
      S.openUser=null;S.hrDraft=null;
    },()=>t('us_saved'));
  },
  usDel(){const id=S.openUser;const u=(S.users||[]).find(x=>x.id===id);if(!u)return;
    if(S.confirm!=='usDel'){S.confirm='usDel';render();return}
    guard(async()=>{await X.del('users',id);if(S.fb&&u.h)await db.doc('codes/'+u.h).delete().catch(()=>{});S.openUser=null;S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(!(S.openUser&&el.dataset&&el.dataset.in==='hrF'))return;
  if(el.dataset.f==='role')render();
  if(el.dataset.f==='pin'){el.value=el.value.replace(/[^0-9]/g,'').slice(0,codeLenSet()||6);S.hrDraft.pin=el.value}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='logUser'){S.logUser=el.value;render()}});

/* remove a shared department code (Settings): the stored value becomes "off:…" so the code no longer
   works and, for the system admin, operations cannot set a new one through the first-time handover */
A.delShared=function(el){
  const key=el.dataset.k;if(!hashForKey(key))return;
  if(key==='admin'&&!(S.users||[]).some(u=>u.role==='admin'&&u.active!==false)){toast(t('us_needAdminUser'));return}
  if(S.confirm!=='delShared:'+key){S.confirm='delShared:'+key;render();return}
  const oldH=hashForKey(key);const off='off:'+Math.random().toString(36).slice(2);
  const p=Object.assign({},S.pins);if(key.startsWith('branch:'))p.br=Object.assign({},S.pins.br||{},{[key.slice(7)]:off});else p[key]=off;
  guard(async()=>{await Store.savePins(p);S.pins=p;S.confirm=null;if(S.fb&&oldH)await db.doc('codes/'+oldH).delete().catch(()=>{})},()=>t('us_sharedRemoved'));
};

document.addEventListener('change',async ev=>{
  const el=ev.target;if(el.id!=='ownerView'||S.realRole!=='owner')return;
  const v=el.value.startsWith('branch:')?{role:'branch',branch:el.value.slice(7)}:{role:el.value};
  LS.set('mk.ownerView',v);S.role=v.role;if(v.branch)S.branch=v.branch;S.tab=null;S.open=null;S.menuOpen=false;
  if(S.fb){const a=Object.assign({},S.auth||{},{role:'owner',at:nowIso()});delete a.branch;if(v.branch)a.branch=v.branch;
    try{await db.doc('sessions/'+S.uid).set(a);S.auth=a}catch(e){toast(t('noPerm'))}
    Store.fbStart()}
  else xLoadDemo();
  render();window.scrollTo(0,0);
});
