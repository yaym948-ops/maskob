/* Maskob — branch visits (زيارات الفروع) by operations.
   Operations plans a visit for a day, then documents it: notes, photos and the action taken — none, a warning or
   a deduction — on the branch manager. Closing the visit writes the warning/deduction as an approved HR form, so a
   deduction goes straight into that month's payroll; a WhatsApp message to the manager is one tap away.
   The branch sees its visits once closed.
   visits/{id}: {branch, date, status:'planned'|'closed', notes, action:'none'|'warning'|'deduction', amount, level,
                 staffId, emp, empName, phone, form, photos, by, createdAt, closedAt}
   visits/{id}/photos/{p}: {data, branch, at} */
const VS_ACTIONS=['none','warning','deduction'];
const vsById=id=>(S.visits||[]).find(v=>v.id===id);
/* the branch staff, the manager first (job contains "مدير" / "manager") */
function vsStaff(b){const L=(typeof activeStaff==='function'?activeStaff(b):(S.staff||[]).filter(x=>x.branch===b));
  const isMgr=x=>/مدير|manager|supervisor|مشرف/i.test(String(x.job||''));return[...L.filter(isMgr),...L.filter(x=>!isMgr(x))]}
/* a phone number for wa.me: digits with the country code (Saudi numbers starting 05 become 9665…) */
function vsWaPhone(p){let d=String(p||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g,'');
  if(d.startsWith('00'))d=d.slice(2);if(/^05\d{8}$/.test(d))d='966'+d.slice(1);else if(/^5\d{8}$/.test(d))d='966'+d;return/^\d{10,15}$/.test(d)?d:''}
function vsWaText(v){const lines=[t(v.action==='deduction'?'vs_waDed':'vs_waWarn',{b:v.branch,d:dateLabel(v.date),n:v.empName||''})];
  if(v.action==='deduction')lines.push(t('vs_waAmount',{a:sar2(v.amount)}));if(v.notes)lines.push(t('vs_notes')+': '+v.notes);return lines.join('\n')}
const vsWaLink=v=>{const p=vsWaPhone(v.phone);return p?'https://wa.me/'+p+'?text='+encodeURIComponent(vsWaText(v)):''};

function vsLoadDemo(){const L=MEM('visits');S.visits=S.role==='manager'?L:S.role==='branch'?L.filter(v=>v.branch===S.branch&&v.status==='closed'):[]}
function vsStart(u,onErr){
  if(S.role==='manager')u.push(db.collection('visits').onSnapshot(s=>{S.visits=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  else if(S.role==='branch')u.push(db.collection('visits').where('branch','==',S.branch).where('status','==','closed').onSnapshot(s=>{S.visits=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}
/* visits planned for today or earlier that are not documented yet */
const vsDue=()=>(S.visits||[]).filter(v=>v.status==='planned'&&v.date<=dayKey(Date.now()));

function vsRow(v){const late=v.status==='planned'&&v.date<dayKey(Date.now()),act=v.action&&v.action!=='none'?v.action:'';
  return`<button class="oc" data-act="vsOpen" data-id="${esc(v.id)}"><span style="min-width:0;flex:1"><span class="t">${esc(v.branch)} <span class="hint">${esc(dateLabel(v.date))}</span></span>
    <span class="s">${v.status==='closed'?esc(String(v.notes||'').slice(0,90)||t('vs_noNotes')):esc(t(late?'vs_late':'vs_planned'))}${v.photos?' · '+esc(t('vs_nPhotos',{n:v.photos})):''}</span></span>
    <span class="side">${act?`<span class="pill ${act==='deduction'?'ms-open':'ms-progress'}">${esc(t('vs_a_'+act))}${act==='deduction'?' '+esc(sar2(v.amount)):''}</span>`:''}<span class="pill ${v.status==='closed'?'ms-done':late?'ms-open':'ms-progress'}">${esc(t('vs_st_'+v.status))}</span></span></button>`}
function visitsView(){
  const L=[...(S.visits||[])].sort((a,c)=>String(c.date).localeCompare(String(a.date))),bf=S.vsBranch||'';
  const F=L.filter(v=>!bf||v.branch===bf),open=F.filter(v=>v.status==='planned').sort((a,c)=>String(a.date).localeCompare(String(c.date))),done=F.filter(v=>v.status==='closed');
  if(S.role==='branch')return`<h2>${t('tab_visits')}</h2><p class="hint">${esc(t('vs_branchHint'))}</p><div class="list">${done.map(vsRow).join('')||`<div class="empty">${esc(t('vs_none'))}</div>`}</div>`;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_visits')}</h2><button class="btn btn-sun" data-act="vsNew">+ ${t('vs_new')}</button></div>
  <div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="vsBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="vsBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  <div class="rp-sec"><h3>${t('vs_open')}</h3><div class="list">${open.map(vsRow).join('')||`<div class="empty">${esc(t('vs_noOpen'))}</div>`}</div></div>
  <div class="rp-sec"><h3>${t('vs_done')}</h3><div class="list">${done.map(vsRow).join('')||`<div class="empty">${esc(t('vs_none'))}</div>`}</div></div>`;
}
function visitNewSheet(){const d=S.vsDraft||{};
  const body=`<div class="sl-grid hr-grid"><label><span class="hint">${t('vs_branch')}</span><select class="field" id="vs-branch" data-in="vsF" data-f="branch"><option value="">${esc(t('inv_pick'))}</option>${S.branches.map(b=>`<option ${d.branch===b?'selected':''}>${esc(b)}</option>`).join('')}</select></label>
    <label><span class="hint">${t('vs_date')}</span><input class="field" type="date" id="vs-date" data-in="vsF" data-f="date" value="${esc(d.date||'')}"></label></div><p class="hint">${esc(t('vs_newHint'))}</p>`;
  return hrSheetWrap(t('vs_new'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="vsAdd" ${S.busy?'disabled':''}>${t('vs_add')}</button>`)}
function visitSheet(){const v=vsById(S.openVs);if(!v)return'';const edit=S.role==='manager'&&v.status==='planned',d=S.vsDoc||{};
  if(!edit){const act=v.action&&v.action!=='none'?v.action:'',wa=S.role==='manager'&&act?vsWaLink(v):'';
    const body=`<div class="box"><div><b>${esc(v.branch)}</b> · ${esc(dateLabel(v.date))}</div>${v.closedAt?`<div class="hint">${esc(t('vs_closedAt',{d:when(v.closedAt),b:v.by||''}))}</div>`:''}</div>
    <h4 class="hr-sub">${t('vs_notes')}</h4><p class="ml-text">${esc(v.notes||t('vs_noNotes')).replace(/\n/g,'<br>')}</p>
    ${typeof phBlock==='function'?phBlock('visits',v.id,{readOnly:true,title:'vs_photos',branch:v.branch}):''}
    <h4 class="hr-sub">${t('vs_action')}</h4><p>${act?`<span class="pill ${act==='deduction'?'ms-open':'ms-progress'}">${esc(t('vs_a_'+act))}</span> ${esc(v.empName||'')}${act==='deduction'?' · <b class="num">'+esc(sar2(v.amount))+'</b> '+esc(t('sar')):''}`:esc(t('vs_a_none'))}</p>
    ${act&&S.role==='manager'?`<p class="hint">${esc(t(act==='deduction'?'vs_inPayroll':'vs_inHR'))}</p>`:''}
    ${S.role==='manager'&&act==='deduction'&&v.form?(v.dedCancelled?`<div class="box"><b>${t('fm_cancelled')}</b><div dir="auto">${esc(v.cancelReason||'')}</div><div class="hint">${esc(when(v.cancelledAt))}</div></div>`
      :`<div class="box"><label style="display:block"><span class="hint">${t('fm_cancelReason')}</span><textarea class="field" id="vs-cancel" data-in="vsC" rows="2" dir="auto">${esc(S.vsCancel||'')}</textarea></label><p class="hint">${esc(t('fm_cancelHint'))}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-bad rp-btn" data-act="vsDedCancel">${S.confirm==='vsDedCancel'?t('fm_cancelSure'):t('fm_cancel')}</button></div></div>`):''}
    ${S.role==='manager'&&act&&!v.dedCancelled?(wa?`<a class="btn btn-ok" href="${esc(wa)}" target="_blank" rel="noopener">${typeof ico==='function'?ico('send','b-ic'):''}${esc(t('vs_wa'))}</a>`:`<p class="hint">${esc(t('vs_noPhone'))}</p>`):''}`;
    return hrSheetWrap(t('vs_title',{b:v.branch}),body,'')}
  const staff=vsStaff(v.branch),act=d.action||'none';
  const body=`<div class="box"><b>${esc(v.branch)}</b> · ${esc(dateLabel(v.date))}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('vs_notes')}</span><textarea class="field" id="vs-notes" data-in="vsD" data-f="notes" rows="5" dir="auto">${esc(d.notes||'')}</textarea></label>
  ${typeof phBlock==='function'?phBlock('visits',v.id,{title:'vs_photos',branch:v.branch}):''}
  <h4 class="hr-sub">${t('vs_action')}</h4>
  <div class="kind">${VS_ACTIONS.map(k=>`<button aria-pressed="${act===k}" data-act="vsAct" data-k="${k}">${esc(t('vs_a_'+k))}</button>`).join('')}</div>
  ${act!=='none'?`<div class="sl-grid hr-grid" style="margin-top:10px"><label><span class="hint">${t('vs_who')}</span><select class="field" id="vs-staff" data-in="vsD" data-f="staffId"><option value="">${esc(t('inv_pick'))}</option>${staff.map(x=>`<option value="${esc(x.id)}" ${d.staffId===x.id?'selected':''}>${esc(x.name)}${x.job?' — '+esc(x.job):''}</option>`).join('')}</select></label>
    ${act==='deduction'?`<label><span class="hint">${t('fm_amount')} (${t('sar')})</span><input class="field num" id="vs-amount" data-in="vsD" data-f="amount" inputmode="decimal" dir="ltr" value="${esc(d.amount||'')}"></label>`:''}</div>
    ${staff.length?'':`<p class="hint">${esc(t('wk_noStaff'))}</p>`}<p class="hint">${esc(t(act==='deduction'?'vs_dedHint':'vs_warnHint'))}</p>`:''}`;
  const foot=`<button class="btn btn-bad" data-act="vsDel">${S.confirm==='vsDel'?t('li_delConfirm'):t('del')}</button><span class="spacer"></span><button class="btn btn-ghost" data-act="vsSave" ${S.busy?'disabled':''}>${t('waSave')}</button><button class="btn btn-sun" data-act="vsClose" ${S.busy?'disabled':''}>${S.confirm==='vsClose'?t('vs_closeSure'):t('vs_close')}</button>`;
  return hrSheetWrap(t('vs_title',{b:v.branch}),body,foot)}

Object.assign(A,{
  vsBranch(el){S.vsBranch=el.dataset.k;render()},
  vsNew(){S.openVsNew=true;S.vsDraft={branch:S.vsBranch||'',date:dayKey(Date.now())};render()},
  vsAdd(){const d=S.vsDraft||{};if(!d.branch||!isDay(d.date)){toast(t('vs_needBD'));return}
    const id=hrId('VS'),data={branch:d.branch,date:d.date,status:'planned',notes:'',action:'none',by:S.userName||roleL(S.realRole||S.role),createdAt:nowIso()};
    guard(async()=>{await X.put('visits',id,data);S.openVsNew=false;S.vsDraft=null},()=>t('vs_added'))},
  vsOpen(el){const v=vsById(el.dataset.id);if(!v)return;S.openVs=v.id;S.confirm=null;
    S.vsDoc={notes:v.notes||'',action:v.action||'none',staffId:v.staffId||'',amount:v.amount||''};
    if(v.status==='planned'&&!S.vsDoc.staffId){const m=vsStaff(v.branch)[0];if(m)S.vsDoc.staffId=m.id}render()},
  vsAct(el){S.vsDoc.action=el.dataset.k;S.confirm=null;render()},
  vsSave(){const v=vsById(S.openVs);if(!v)return;const d=S.vsDoc||{};
    guard(async()=>{const n=typeof phCommit==='function'?await phCommit('visits',v.id,v.id,v.branch):null;
      await X.upd('visits',v.id,Object.assign({notes:String(d.notes||'').trim(),action:d.action||'none',staffId:d.staffId||'',amount:num(d.amount)||null},n!=null?{photos:n}:{}));S.openVs=null},()=>t('st_saved'))},
  vsClose(){const v=vsById(S.openVs);if(!v)return;const d=S.vsDoc||{},act=d.action||'none',notes=String(d.notes||'').trim();
    const st=act!=='none'?(S.staff||[]).find(x=>x.id===d.staffId):null,amount=num(d.amount);
    if(!notes){toast(t('vs_needNotes'));return}
    if(act!=='none'&&!st){toast(t('vs_needWho'));return}
    if(act==='deduction'&&!(amount>0)){toast(t('fm_needDed'));return}
    if(act==='deduction'&&!st.emp){toast(t('vs_needEmp'));return}
    if(S.confirm!=='vsClose'){S.confirm='vsClose';render();return}
    const tm=nowIso(),by=S.userName||roleL(S.realRole||S.role);
    guard(async()=>{const n=typeof phCommit==='function'?await phCommit('visits',v.id,v.id,v.branch):null;
      let form='';
      if(act!=='none'){form=hrId('F');
        /* an approved HR form: a deduction is counted in the month's payroll, a warning sits in the employee's record */
        await X.put('forms',form,{branch:v.branch,staffId:st.id,emp:st.emp||'',empName:st.name,empNo:String(st.no||''),type:act,date:v.date,
          reason:t('vs_formReason',{d:dateLabel(v.date)})+'\n'+notes,amount:act==='deduction'?amount:null,days:null,level:act==='warning'?'1':null,
          status:'approved',by:'ops',visit:v.id,createdAt:tm,decidedAt:tm})}
      await X.upd('visits',v.id,Object.assign({notes,action:act,staffId:st?st.id:'',emp:st?(st.emp||''):'',empName:st?st.name:'',phone:st?(st.phone||''):'',amount:act==='deduction'?amount:null,form,status:'closed',closedAt:tm,by},n!=null?{photos:n}:{}));
      S.confirm=null},()=>t('vs_closed'))},
  vsDedCancel(){const v=vsById(S.openVs);if(!v||!v.form||v.dedCancelled)return;const r=String(S.vsCancel||'').trim();if(!r){toast(t('fm_needCancelReason'));return}
    if(S.confirm!=='vsDedCancel'){S.confirm='vsDedCancel';render();return}
    guard(async()=>{await dedCancel(v.form,r);await X.upd('visits',v.id,{dedCancelled:true,cancelReason:r,cancelledAt:nowIso()});S.confirm=null;S.vsCancel=''},()=>t('fm_cancelDone'))},
  vsDel(){const v=vsById(S.openVs);if(!v||v.status!=='planned')return;if(S.confirm!=='vsDel'){S.confirm='vsDel';render();return}
    guard(async()=>{await X.del('visits',v.id);S.openVs=null;S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='vsF'&&S.vsDraft)S.vsDraft[el.dataset.f]=el.value;
  else if(k==='vsD'&&S.vsDoc)S.vsDoc[el.dataset.f]=el.value;
  else if(k==='vsC')S.vsCancel=el.value});
