/* Maskob — periodic maintenance and safety (الصيانة الدورية), a part of the maintenance page.
   Operations records, per branch, contracts and due dates — pest control, fire extinguishers, chimney cleaning,
   filters, water tanks, air conditioning, machines, cameras and alarms, or anything else — and sets the next date
   by hand each time it is done (with a log). Branches see their own items (read only). Due within 30 days → the bell.
   pm/{id}: {branch, type, title, company, contract, due, note, log:[{date, note, by}], photos, updatedAt}
   pm/{id}/photos/{p}: {data, branch, at} */
const PM_TYPES=['pest','extinguisher','chimney','filters','tanks','ac','machines','cctv','other'];
const PM_WARN=30;
const pmName=x=>x.type==='other'||!PM_TYPES.includes(x.type)?(x.title||t('pm_t_other')):t('pm_t_'+x.type)+(x.title?' — '+x.title:'');
const pmLeft=x=>isDay(x.due)?dayDiff(dayKey(Date.now()),x.due):null;
const pmState=x=>{const n=pmLeft(x);return n==null?'none':n<0?'out':n<=PM_WARN?'soon':'ok'};
const pmMine=()=>(S.pm||[]).filter(x=>S.role!=='branch'||x.branch===S.branch);
const pmAlerts=()=>pmMine().filter(x=>['out','soon'].includes(pmState(x)));

function pmLoadDemo(){const L=MEM('pm');S.pm=S.role==='manager'?L:S.role==='branch'?L.filter(x=>x.branch===S.branch):[]}
function pmStart(u,onErr){let q=db.collection('pm');if(S.role==='branch')q=q.where('branch','==',S.branch);else if(S.role!=='manager')return;
  u.push(q.onSnapshot(s=>{S.pm=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}

/* the maintenance page with its two parts: requests | periodic maintenance */
function pmWrap(html){const sub=S.mSub==='pm'?'pm':'req',n=pmAlerts().length;
  return`<div class="kind" style="margin-bottom:12px">${[['req','pm_req'],['pm','pm_tab']].map(([k,l])=>`<button aria-pressed="${sub===k}" data-act="mSub" data-k="${k}">${esc(t(l))}${k==='pm'&&n?` <span class="badge num${pmAlerts().some(x=>pmState(x)==='out')?' late':''}">${n}</span>`:''}</button>`).join('')}</div>`+(sub==='pm'?pmView():html)}
function pmView(){
  const ed=S.role==='manager',bf=ed?(S.pmBranch||''):S.branch,tf=S.pmType||'';
  const L=pmMine().filter(x=>(!bf||x.branch===bf)&&(!tf||x.type===tf)).sort((a,c)=>{const A=pmLeft(a),C=pmLeft(c);return(A==null?1e9:A)-(C==null?1e9:C)});
  const left=n=>n==null?t('pm_noDate'):n<0?t('pm_late',{n:-n}):n===0?t('pm_today'):t('pm_in',{n});
  return`<div class="row" style="justify-content:space-between"><h2>${t('pm_tab')}</h2>${ed?`<button class="btn btn-sun" data-act="pmNew">+ ${t('pm_new')}</button>`:''}</div>
  <p class="hint">${esc(t(ed?'pm_hint':'pm_branchHint'))}</p>
  ${ed?`<div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="pmBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="pmBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>`:''}
  <div class="filters"><button class="chip" aria-pressed="${!tf}" data-act="pmType" data-k="">${t('f_all')}</button>${PM_TYPES.map(k=>`<button class="chip" aria-pressed="${tf===k}" data-act="pmType" data-k="${k}">${esc(t('pm_t_'+k))}</button>`).join('')}</div>
  <div class="list">${L.map(x=>{const st=pmState(x),n=pmLeft(x);return`<button class="oc" data-act="pmOpen" data-id="${esc(x.id)}"><span style="min-width:0;flex:1"><span class="t">${esc(pmName(x))}${ed?` <span class="tag">${esc(x.branch)}</span>`:''}</span>
    <span class="s">${x.company?esc(x.company)+' · ':''}${isDay(x.due)?esc(t('pm_due'))+': '+esc(dateLabel(x.due)):''}${(x.log||[]).length?' · '+esc(t('pm_lastDone',{d:dateLabel(x.log[x.log.length-1].date)})):''}</span></span>
    <span class="side"><span class="pill ${st==='out'?'ms-open':st==='soon'?'ms-progress':st==='ok'?'ms-done':''}">${esc(left(n))}</span></span></button>`}).join('')||`<div class="empty">${esc(t('pm_none'))}</div>`}</div>`;
}
function pmSheet(){const isNew=S.openPm==='new',x=isNew?null:(S.pm||[]).find(y=>y.id===S.openPm);if(!isNew&&!x)return'';
  const ed=S.role==='manager',d=S.hrDraft||{},log=x?[...(x.log||[])].reverse():[];
  const logHtml=log.length?`<h4 class="hr-sub">${t('pm_log')}</h4><div class="list">${log.map(l=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(dateLabel(l.date))}</span><span class="s">${esc(l.note||'')}${l.by?' · '+esc(l.by):''}</span></span></div>`).join('')}</div>`:'';
  if(!ed){const body=`<div class="box">${[[t('vs_branch'),x.branch],[t('pm_company'),x.company],[t('pm_contract'),x.contract],[t('pm_due'),isDay(x.due)?dateLabel(x.due):''],[t('pm_note'),x.note]].filter(r=>r[1]).map(r=>`<div><span class="hint">${esc(r[0])}:</span> ${esc(r[1])}</div>`).join('')}</div>
    ${typeof phBlock==='function'?phBlock('pm',x.id,{readOnly:true,title:'pm_photos',branch:x.branch}):''}${logHtml}`;
    return hrSheetWrap(pmName(x),body,'')}
  const done=S.pmDone;
  const body=`<div class="sl-grid hr-grid">${hrSel('branch',t('vs_branch'),S.branches.map(b=>[b,b]))}${hrSel('type',t('pm_type'),PM_TYPES.map(k=>[k,t('pm_t_'+k)]))}
    ${hrIn('title',t(d.type==='other'?'pm_titleReq':'pm_title'))}${hrIn('company',t('pm_company'))}${hrIn('contract',t('pm_contract'))}${hrIn('due',t('pm_due'),'date')}</div>
  <label style="display:block;margin-top:8px"><span class="hint">${t('pm_note')}</span><textarea class="field" id="hr-note" data-in="hrF" data-f="note" rows="2" dir="auto">${esc(d.note||'')}</textarea></label>
  ${typeof phBlock==='function'?phBlock('pm',isNew?null:x.id,{title:'pm_photos',branch:d.branch}):''}
  ${!isNew?(done?`<div class="box" style="margin-top:10px"><b>${t('pm_doneTitle')}</b><div class="sl-grid hr-grid" style="margin-top:8px">
      <label><span class="hint">${t('pm_doneDate')}</span><input class="field" type="date" id="pm-dd" data-in="pmD" data-f="date" value="${esc(done.date||'')}"></label>
      <label><span class="hint">${t('pm_nextDate')}</span><input class="field" type="date" id="pm-dn" data-in="pmD" data-f="next" value="${esc(done.next||'')}"></label></div>
      <label style="display:block;margin-top:6px"><span class="hint">${t('pm_doneNote')}</span><input class="field" id="pm-dnote" data-in="pmD" data-f="note" dir="auto" value="${esc(done.note||'')}"></label>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-ok rp-btn" data-act="pmDoneSave">${t('pm_doneSave')}</button></div></div>`
    :`<div class="row" style="margin-top:10px"><button class="btn btn-navy rp-btn" data-act="pmDone">${t('pm_markDone')}</button></div>`):''}
  ${logHtml}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="pmDel">${S.confirm==='pmDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="pmSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('pm_new'):pmName(x),body,foot)}

Object.assign(A,{
  mSub(el){S.mSub=el.dataset.k;render()},
  pmBranch(el){S.pmBranch=el.dataset.k;render()},
  pmType(el){S.pmType=el.dataset.k;render()},
  pmNew(){S.openPm='new';S.confirm=null;S.pmDone=null;S.hrDraft={branch:S.pmBranch||S.branches[0]||'',type:S.pmType||'pest',title:'',company:'',contract:'',due:'',note:''};render()},
  pmOpen(el){const x=(S.pm||[]).find(y=>y.id===el.dataset.id);if(!x)return;S.openPm=x.id;S.confirm=null;S.pmDone=null;S.hrDraft=Object.assign({},x);render()},
  pmSave(){const d=S.hrDraft||{};if(!S.branches.includes(d.branch)){toast(t('vs_needBD'));return}
    if(d.type==='other'&&!String(d.title||'').trim()){toast(t('pm_needTitle'));return}
    const isNew=S.openPm==='new',id=isNew?hrId('PM'):S.openPm,old=isNew?{}:((S.pm||[]).find(y=>y.id===id)||{});
    const data={branch:d.branch,type:PM_TYPES.includes(d.type)?d.type:'other',title:String(d.title||'').trim(),company:String(d.company||'').trim(),contract:String(d.contract||'').trim(),
      due:isDay(d.due)?d.due:'',note:String(d.note||'').trim(),log:old.log||[],updatedAt:nowIso()};
    guard(async()=>{const n=typeof phCommit==='function'?await phCommit('pm',isNew?null:id,id,data.branch):null;if(n!=null)data.photos=n;else if(old.photos)data.photos=old.photos;
      await X.put('pm',id,data);S.openPm=null;S.hrDraft=null},()=>t('st_saved'))},
  pmDone(){S.pmDone={date:dayKey(Date.now()),next:'',note:''};render()},
  pmDoneSave(){const x=(S.pm||[]).find(y=>y.id===S.openPm),d=S.pmDone||{};if(!x)return;
    if(!isDay(d.date)){toast(t('pm_needDone'));return}if(!isDay(d.next)){toast(t('pm_needNext'));return}
    const log=[...(x.log||[]),{date:d.date,note:String(d.note||'').trim(),by:S.userName||roleL(S.realRole||S.role)}];
    guard(async()=>{await X.upd('pm',x.id,{log,due:d.next,updatedAt:nowIso()});S.pmDone=null;if(S.hrDraft)S.hrDraft.due=d.next},()=>t('pm_doneOk'))},
  pmDel(){const id=S.openPm;if(!id||id==='new')return;if(S.confirm!=='pmDel'){S.confirm='pmDel';render();return}
    guard(async()=>{await X.del('pm',id);S.openPm=null;S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='pmD'&&S.pmDone)S.pmDone[el.dataset.f]=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(S.openPm&&el.dataset&&el.dataset.in==='hrF'&&el.dataset.f==='type')render()});
