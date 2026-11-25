/* Maskob — Branch staff, shift schedule and leave requests.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Branch staff and weekly shift schedule ================= */
/* staff/{id}: {branch, name, no, job, phone, nat, active}  — the branch's own list (no salaries)
   shifts/{branch}_{week}: {branch, week (Sunday, YYYY-MM-DD), cells:{staffId:{0..6:code}}, times:{m,e,n}} */
const SHIFT_CODES=['m','e','n','off'];
const SHIFT_TIMES={m:'06:00-14:00',e:'14:00-22:00',n:'22:00-06:00'};
const weekStart=k=>{const d=fromKey(k);d.setDate(d.getDate()-d.getDay());return dayKey(d)};
const addDays=(k,n)=>{const d=fromKey(k);d.setDate(d.getDate()+n);return dayKey(d)};
const activeStaff=()=>{const L=(S.staff||[]).filter(x=>x.active!==false),hr=L.filter(x=>x.fromHR);
  return L.filter(x=>x.fromHR||!hr.some(h=>(x.no&&h.no&&String(h.no)===String(x.no))||h.name===x.name)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'))};
/* approved leave from HR for a staff member on a day */
const onLeaveDay=(st,day)=>(S.leaveReqs||[]).some(r=>r.status==='approved'&&(r.staffId===st.id||(!r.staffId&&r.empName===st.name))&&r.from<=day&&r.to>=day);
function branchStaffTab(tb){
  const sub=S.shSub||'sched';
  const pend=(S.leaveReqs||[]).filter(r=>r.status==='pending').length;
  const nav=`<div class="kind sh-nav" role="tablist">${[['sched','sh_sched'],['leave','sh_leave'],['staff','sh_staff']].map(([k,l])=>`<button aria-pressed="${sub===k}" data-act="shSub" data-k="${k}">${esc(t(l))}${k==='leave'&&pend?` <span class="c num">(${pend})</span>`:''}${k==='staff'?` <span class="c num">(${activeStaff().length})</span>`:''}</button>`).join('')}</div>`;
  return`<h2>${t('tab_shifts')}</h2>${nav}`+(sub==='leave'?branchLeaveView(true):sub==='staff'?branchStaffList():shiftView());
}
function shiftView(){
  const wk=S.shWeek||weekStart(dayKey(Date.now()));const id=S.branch+'_'+wk;
  const doc=(S.shifts||[]).find(x=>x.id===id)||{};
  if(!S.shDraft||S.shDraft.id!==id)S.shDraft={id,cells:JSON.parse(JSON.stringify(doc.cells||{})),times:Object.assign({},SHIFT_TIMES,doc.times||{})};
  const d=S.shDraft,staff=activeStaff(),days=[0,1,2,3,4,5,6].map(i=>addDays(wk,i)),today=dayKey(Date.now());
  if(!staff.length)return`<div class="empty" style="margin-top:12px">${esc(t('sh_noStaff'))} <button class="btn btn-sun rp-btn" data-act="shSub" data-k="staff">${t('sh_addStaff')}</button></div>`;
  const cnt=days.map((_,i)=>staff.filter(st=>['m','e','n'].includes((d.cells[st.id]||{})[i])&&!onLeaveDay(st,days[i])).length);
  const lbl=dt=>{try{return fromKey(dt).toLocaleDateString(LOCALE[LANG],{weekday:'short',day:'numeric',month:'numeric'})}catch(e){return dt}};
  return`<div class="row sh-bar"><button class="btn btn-ghost rp-btn" data-act="shWeek" data-n="-7" aria-label="${esc(t('sh_prev'))}">→</button>
    <b>${esc(t('sh_weekOf',{d:dateLabel(wk)}))}</b><button class="btn btn-ghost rp-btn" data-act="shWeek" data-n="7" aria-label="${esc(t('sh_next'))}">←</button>
    ${wk!==weekStart(today)?`<button class="btn btn-ghost rp-btn" data-act="shWeek" data-n="0">${t('sh_thisWeek')}</button>`:''}
    <span class="spacer"></span><button class="btn btn-ghost rp-btn" data-act="shCopyPrev">${t('sh_copyPrev')}</button><button class="btn btn-ghost rp-btn" data-act="shXls">${t('xlsExport')}</button></div>
  <div class="sh-times">${['m','e','n'].map(k=>`<label><span class="sh-c sh-${k}">${esc(t('sh_'+k))}</span><input class="field" id="shT-${k}" data-in="shT" data-k="${k}" value="${esc(d.times[k]||'')}" dir="ltr"></label>`).join('')}</div>
  <p class="hint">${esc(t('sh_hint'))}</p>
  <div class="scroll"><table class="tbl sh-grid"><thead><tr><th>${t('lv_emp')}</th>${days.map(x=>`<th class="${x===today?'sh-today':''}">${esc(lbl(x))}</th>`).join('')}</tr></thead><tbody>
  ${staff.map(st=>`<tr><td><b>${esc(st.name)}</b>${st.job?`<div class="hint">${esc(st.job)}</div>`:''}</td>${days.map((x,i)=>{
    if(onLeaveDay(st,x))return`<td><span class="sh-c sh-L">${esc(t('sh_L'))}</span></td>`;
    const c=(d.cells[st.id]||{})[i]||'';
    return`<td><button class="sh-c sh-${c||'none'}" data-act="shCell" data-s="${esc(st.id)}" data-i="${i}" aria-label="${esc(st.name+' '+lbl(x))}">${c?esc(t('sh_'+c)):'+'}</button></td>`}).join('')}</tr>`).join('')}
  <tr class="sh-sum"><td>${t('sh_working')}</td>${cnt.map(n=>`<td class="n">${n}</td>`).join('')}</tr></tbody></table></div>`;
}
function branchStaffList(){
  const all=[...(S.staff||[])].sort((a,b)=>(+(b.active!==false)-+(a.active!==false))||String(a.name).localeCompare(String(b.name),'ar'));
  return`<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-sun" data-act="stNew">+ ${t('sh_addStaff')}</button></div>
  <div class="list" style="margin-top:10px">${all.length?all.map(st=>`<button class="oc ${st.active===false?'cat-off':''}" data-act="stOpen" data-id="${esc(st.id)}">
    <span style="min-width:0"><span class="t">${esc(st.name)} ${st.no?`<span class="hint num" dir="ltr">#${esc(st.no)}</span>`:''}</span>
      <span class="s">${[st.job,st.nat,st.phone].filter(Boolean).map(esc).join(' · ')}</span></span>
    <span class="side">${st.fromHR?`<span class="tag">${t('sh_fromHR')}</span>`:''}${st.active===false?`<span class="pill ms-open">${t('cat_off')}</span>`:''}</span></button>`).join(''):`<div class="empty">${esc(t('sh_noStaff'))}</div>`}</div>`;
}
function staffSheet(){
  const isNew=S.openStaff==='new';const d=S.hrDraft||{};
  if(d.fromHR)return hrSheetWrap(d.name||'',`<div class="box">${[[t('hr_no'),d.no],[t('hr_job'),d.job],[t('hr_nat'),d.nat],[t('hr_phone'),d.phone]].filter(x=>x[1]).map(x=>`<div><span class="hint">${esc(x[0])}:</span> ${esc(x[1])}</div>`).join('')}</div><p class="hint">${esc(t('sh_fromHRHint'))}</p>`,'<span class="spacer"></span>');
  const body=`<div class="sl-grid hr-grid">${hrIn('name',t('hr_name'))}${hrIn('no',t('hr_no'),'text','dir="ltr"')}${hrIn('job',t('hr_job'))}${hrIn('nat',t('hr_nat'))}${hrIn('phone',t('hr_phone'),'tel')}</div>
  <div class="kind" style="margin-top:12px">${[['on','es_active'],['off','cat_off']].map(([k,l])=>`<button aria-pressed="${(d.active===false?'off':'on')===k}" data-act="stActive" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
  <p class="hint">${esc(t('sh_staffHint'))}</p>`;
  const foot=`<span class="spacer"></span><button class="btn btn-sun" data-act="stSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('sh_addStaff'):(d.name||''),body,foot);
}
let shTimer=null;
function shSaveSoon(){
  clearTimeout(shTimer);const d=S.shDraft;if(!d)return;
  shTimer=setTimeout(()=>{const wk=d.id.slice(S.branch.length+1);
    X.put('shifts',d.id,{branch:S.branch,week:wk,cells:d.cells,times:d.times,updatedAt:nowIso()}).catch(()=>toast(t('saveFail')))},700);
}
/* HR employees appear in their branch's staff list: HR keeps a copy in staff/emp_<id> (name, number, job only — no salary) */
const MIRROR_KEYS=['branch','name','no','job','nat','phone','active'];
function empMirror(e){return{branch:e.branch,name:e.name||'',no:String(e.no||''),job:e.job||'',nat:e.nat||'',phone:e.phone||'',active:e.status!=='left',fromHR:true,emp:e.id}}
let hrSyncT=null;
function hrSyncStaff(){
  if(S.role!=='hr'||(S.fb&&!(S._hrEmpsIn&&S._hrStaffIn)))return;
  clearTimeout(hrSyncT);hrSyncT=setTimeout(async()=>{
    if(S.role!=='hr')return;            // signed out meanwhile: the next HR session syncs
    const E=S.emps||[],ST=S.staff||[],jobs=[];
    E.forEach(e=>{const id='emp_'+e.id,cur=ST.find(x=>x.id===id),want=S.branches.includes(e.branch)?empMirror(e):null;
      if(want&&(!cur||MIRROR_KEYS.some(k=>String(cur[k]??'')!==String(want[k]??''))))jobs.push(()=>X.put('staff',id,Object.assign(want,{updatedAt:nowIso()})));
      else if(!want&&cur)jobs.push(()=>X.del('staff',id))});
    ST.filter(x=>x.fromHR&&!E.some(e=>'emp_'+e.id===x.id)).forEach(x=>jobs.push(()=>X.del('staff',x.id)));
    for(const j of jobs){try{await j()}catch(e){}}
  },1200);
}
/* HR: staff added by branches that are not in the HR employee files yet */
function hrStaffInbox(){
  const E=S.emps||[];
  const miss=(S.staff||[]).filter(st=>st.active!==false&&!E.some(e=>(st.no&&String(e.no||'')===String(st.no))||(e.name===st.name&&e.branch===st.branch)));
  if(!miss.length)return'';
  return`<div class="rp-sec lr-hr"><h3>${t('sh_hrInbox')} <span class="badge num">${miss.length}</span></h3><div class="list" style="margin-top:10px">${miss.map(st=>`<div class="oc lr-card"><span style="min-width:0"><span class="t">${esc(st.name)} ${st.no?`<span class="hint num" dir="ltr">#${esc(st.no)}</span>`:''}</span><span class="s">${esc(st.branch)}${st.job?' · '+esc(st.job):''}</span></span>
    <span class="side"><button class="btn btn-sun rp-btn" data-act="hrFromStaff" data-id="${esc(st.id)}">${t('sh_hrAdd')}</button></span></div>`).join('')}</div></div>`;
}
Object.assign(A,{
  shSub(el){S.shSub=el.dataset.k;render()},
  shWeek(el){const n=+el.dataset.n;S.shWeek=n?addDays(S.shWeek||weekStart(dayKey(Date.now())),n):weekStart(dayKey(Date.now()));render()},
  shCell(el){const d=S.shDraft;if(!d)return;const s=el.dataset.s,i=el.dataset.i;d.cells[s]=d.cells[s]||{};
    const cur=d.cells[s][i]||'';const next=cur===''?'m':SHIFT_CODES[SHIFT_CODES.indexOf(cur)+1]||'';
    if(next)d.cells[s][i]=next;else delete d.cells[s][i];render();shSaveSoon()},
  shCopyPrev(){const d=S.shDraft;if(!d)return;const wk=d.id.slice(S.branch.length+1);const prev=(S.shifts||[]).find(x=>x.id===S.branch+'_'+addDays(wk,-7));
    if(!prev||!prev.cells||!Object.keys(prev.cells).length){toast(t('sh_noPrev'));return}
    d.cells=JSON.parse(JSON.stringify(prev.cells));d.times=Object.assign({},SHIFT_TIMES,prev.times||{});render();shSaveSoon();toast(t('sh_copied'))},
  async shXls(){const d=S.shDraft;if(!d)return;const wk=d.id.slice(S.branch.length+1);const days=[0,1,2,3,4,5,6].map(i=>addDays(wk,i));
    const name=x=>{try{return fromKey(x).toLocaleDateString(LOCALE[LANG],{weekday:'long'})+' '+x.split('-').reverse().join('/')}catch(e){return x}};
    const code=(st,i)=>onLeaveDay(st,days[i])?t('sh_L'):((d.cells[st.id]||{})[i]?t('sh_'+d.cells[st.id][i])+(d.times[d.cells[st.id][i]]?' ('+d.times[d.cells[st.id][i]]+')':''):'');
    await saveXlsx('maskob-shifts-'+S.branch+'-'+wk+'.xlsx',[{name:t('tab_shifts')+' '+S.branch,headers:[t('lv_emp'),t('hr_job'),...days.map(name)],rows:activeStaff().map(st=>[st.name,st.job||'',...days.map((_,i)=>code(st,i))])}])},
  stNew(){S.openStaff='new';S.hrDraft={name:'',no:'',job:'',nat:'',phone:'',active:true};render()},
  stOpen(el){const st=(S.staff||[]).find(x=>x.id===el.dataset.id);if(!st)return;S.openStaff=st.id;S.hrDraft=Object.assign({},st);render()},
  stActive(el){S.hrDraft.active=el.dataset.k!=='off';render()},
  stSave(){const d=S.hrDraft||{};const name=String(d.name||'').trim();if(!name){toast(t('hr_needName'));return}
    const id=S.openStaff==='new'?hrId('ST'):S.openStaff;const old=(S.staff||[]).find(x=>x.id===id)||{};const tm=nowIso();
    const data={branch:S.branch,name,no:String(d.no||'').trim(),job:String(d.job||'').trim(),nat:String(d.nat||'').trim(),phone:String(d.phone||'').trim(),active:d.active!==false,createdAt:old.createdAt||tm,updatedAt:tm};
    guard(async()=>{await X.put('staff',id,data);S.openStaff=null;S.hrDraft=null},()=>t('sh_staffSaved'))},
  hrFromStaff(el){const st=(S.staff||[]).find(x=>x.id===el.dataset.id);if(!st)return;
    S.openEmp='new';S.confirm=null;S.hrDraft={name:st.name,no:st.no||'',job:st.job||'',nat:st.nat||'',phone:st.phone||'',branch:S.branches.includes(st.branch)?st.branch:'@office',status:'active'};render()}
});
document.addEventListener('input',ev=>{const el=ev.target;if(!(el.dataset&&el.dataset.in==='shT')||!S.shDraft)return;S.shDraft.times[el.dataset.k]=el.value;shSaveSoon()});

/* ================= Leave requests: a branch asks, HR decides ================= */
/* leaveReqs/{id}: {branch, empName, empNo, type, from, to, days, note, status pending|approved|rejected, hrNote, emp, leaveId, createdAt, decidedAt} */
const lrDays=r=>isDay(r.from)&&isDay(r.to)&&r.to>=r.from?dayDiff(r.from,r.to)+1:0;
const lrPill=st=>`<span class="pill ${st==='approved'?'ms-done':st==='rejected'?'li-expired':'ms-progress'}">${esc(t('ls_'+st))}</span>`;
function branchLeaveView(embedded){
  const d=S.lrDraft||(S.lrDraft={empName:'',empNo:'',type:'annual',from:dayKey(Date.now()),to:dayKey(Date.now()),note:''});
  const list=[...(S.leaveReqs||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const n=lrDays(d);
  const li=(f,label,type,extra)=>`<label><span class="hint">${esc(label)}</span><input class="field" type="${type||'text'}" id="lr-${f}" data-in="lrF" data-f="${f}" value="${esc(d[f]||'')}" ${extra||'dir="auto"'}></label>`;
  return`${embedded?'':`<h2>${t('tab_lr')}</h2>`}
  <div class="box m-form" style="margin-top:12px">
    <div class="sl-grid hr-grid">${activeStaff().length?`<label><span class="hint">${t('lv_emp')}</span><select class="field" id="lr-staff" data-in="lrStaff"><option value="">${esc(t('hr_pickEmp'))}</option>${activeStaff().map(st=>`<option value="${esc(st.id)}" ${d.staffId===st.id?'selected':''}>${esc(st.name)}${st.no?' #'+esc(st.no):''}</option>`).join('')}</select></label>`:li('empName',t('lr_empName'))+li('empNo',t('hr_no'),'text','dir="ltr"')}
      <label><span class="hint">${t('lv_type')}</span><select class="field" id="lr-type" data-in="lrF" data-f="type">${LEAVE_TYPES.map(k=>`<option value="${k}" ${d.type===k?'selected':''}>${esc(t('lt_'+k))}</option>`).join('')}</select></label>
      ${li('from',t('lv_from'),'date','')}${li('to',t('lv_to'),'date','')}</div>
    <div class="hint" id="lrDays" style="margin:6px 0">${n?esc(t('hr_days',{n})):''}</div>
    <label style="display:block"><span class="hint">${t('lr_reason')}</span><textarea class="field" id="lr-note" rows="2" dir="auto" data-in="lrF" data-f="note">${esc(d.note||'')}</textarea></label>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-sun" data-act="lrSend" ${S.busy?'disabled':''}>${t('lr_send')}</button></div>
  </div>
  <div class="rp-sec"><h3>${t('lr_mine')}</h3><div class="list" style="margin-top:10px">${list.length?list.map(r=>`<div class="oc lr-card">
    <span style="min-width:0"><span class="t">${esc(r.empName)}${r.empNo?` <span class="hint num" dir="ltr">#${esc(r.empNo)}</span>`:''} <span class="tag">${esc(t('lt_'+(r.type||'annual')))}</span></span>
      <span class="s">${esc(dateLabel(r.from))} ← ${esc(dateLabel(r.to))} · ${esc(t('hr_days',{n:lrDays(r)}))}</span>
      ${r.hrNote?`<span class="s"><b>${esc(t('lr_hrNote'))}:</b> ${esc(r.hrNote)}</span>`:''}</span>
    <span class="side">${lrPill(r.status)}${r.status==='pending'?`<button class="btn btn-ghost rp-btn" data-act="lrCancel" data-id="${esc(r.id)}">${S.confirm==='lrCancel:'+r.id?t('lr_cancelConfirm'):t('lr_cancel')}</button>`:''}</span></div>`).join(''):`<div class="empty">${esc(t('lr_none'))}</div>`}</div></div>`;
}
/* HR: requests waiting at the top of the leave tab */
function hrLeaveRequests(){
  const pend=(S.leaveReqs||[]).filter(r=>r.status==='pending').sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
  if(!pend.length)return'';
  return`<div class="rp-sec lr-hr"><h3>${t('lr_fromBranches')} <span class="badge num">${pend.length}</span></h3><div class="list" style="margin-top:10px">${pend.map(r=>`<button class="oc" data-act="lrOpen" data-id="${esc(r.id)}">
    <span style="min-width:0"><span class="t">${esc(r.empName)}${r.empNo?` <span class="hint num" dir="ltr">#${esc(r.empNo)}</span>`:''} <span class="tag">${esc(t('lt_'+(r.type||'annual')))}</span></span>
      <span class="s">${esc(r.branch)} · ${esc(dateLabel(r.from))} ← ${esc(dateLabel(r.to))} · ${esc(t('hr_days',{n:lrDays(r)}))} · ${esc(when(r.createdAt))}</span></span>
    <span class="side">${lrPill('pending')}</span></button>`).join('')}</div></div>`;
}
const lrMatch=r=>{const st=(S.staff||[]).find(x=>x.id===r.staffId);if(st&&st.emp&&empById(st.emp))return empById(st.emp);
  const L=(S.emps||[]).filter(e=>e.status!=='left');
  return(r.empNo&&L.find(e=>String(e.no||'')===String(r.empNo)))||L.find(e=>e.name===r.empName&&e.branch===r.branch)||L.find(e=>e.name===r.empName)||null};
function lrSheet(){
  const r=(S.leaveReqs||[]).find(x=>x.id===S.openLr);if(!r)return'';
  const d=S.hrDraft||{};
  const emps=(S.emps||[]).filter(e=>e.status!=='left').sort((a,b)=>(+(b.branch===r.branch)-+(a.branch===r.branch))||String(a.name).localeCompare(String(b.name),'ar'));
  const body=`<div class="box"><div class="row" style="justify-content:space-between"><b>${esc(r.empName)}${r.empNo?' <span class="hint num" dir="ltr">#'+esc(r.empNo)+'</span>':''}</b><span class="hint">${esc(r.branch)} · ${esc(when(r.createdAt))}</span></div>
    <div>${esc(t('lt_'+(r.type||'annual')))} · ${esc(dateLabel(r.from))} ← ${esc(dateLabel(r.to))} · <b>${esc(t('hr_days',{n:lrDays(r)}))}</b></div>
    ${r.note?`<div class="hint" style="margin-top:6px" dir="auto">${esc(r.note)}</div>`:''}</div>
  <div class="sl-grid hr-grid" style="margin-top:12px">
    ${hrSel('emp',t('lr_linkEmp'),[['',t('hr_pickEmp')],...emps.map(e=>[e.id,e.name+(e.no?' #'+e.no:'')+' — '+placeL(e.branch)])])}
  </div>
  ${d.emp?'':`<p class="hint">${esc(t('lr_noMatch'))}</p>`}
  <label style="display:block;margin-top:10px"><span class="hint">${t('lr_hrNote')}</span><textarea class="field" id="hr-hrNote" rows="2" dir="auto" data-in="hrF" data-f="hrNote">${esc(d.hrNote||'')}</textarea></label>`;
  const foot=`<button class="btn btn-bad" data-act="lrDecide" data-k="rejected" ${S.busy?'disabled':''}>${t('lv_reject')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="lrDecide" data-k="approved" ${S.busy?'disabled':''}>${t('lv_approve')}</button>`;
  return hrSheetWrap(t('lr_title'),body,foot);
}
Object.assign(A,{
  lrSend(){
    const d=S.lrDraft||{};const empName=String(d.empName||'').trim();
    if(!empName||!isDay(d.from)||!isDay(d.to)){toast(t('lr_need'));return}
    if(d.to<d.from){toast(t('lv_badDates'));return}
    const id=hrId('LR');const tm=nowIso();
    const data={branch:S.branch,staffId:d.staffId||'',empName,empNo:String(d.empNo||'').trim(),type:LEAVE_TYPES.includes(d.type)?d.type:'annual',from:d.from,to:d.to,days:lrDays(d),
      note:String(d.note||'').trim(),status:'pending',createdAt:tm};
    guard(async()=>{await X.put('leaveReqs',id,data);S.lrDraft=null},()=>t('lr_sent'));
  },
  lrCancel(el){const id=el.dataset.id;if(S.confirm!=='lrCancel:'+id){S.confirm='lrCancel:'+id;render();return}
    guard(async()=>{await X.del('leaveReqs',id);S.confirm=null},()=>t('lr_cancelled'))},
  lrOpen(el){const r=(S.leaveReqs||[]).find(x=>x.id===el.dataset.id);if(!r)return;const m=lrMatch(r);
    S.openLr=r.id;S.hrDraft={emp:m?m.id:'',hrNote:''};render()},
  lrDecide(el){
    const r=(S.leaveReqs||[]).find(x=>x.id===S.openLr);if(!r)return;const d=S.hrDraft||{};const st=el.dataset.k;const tm=nowIso();
    if(st==='approved'&&!d.emp){toast(t('lr_pickFirst'));return}
    guard(async()=>{
      const upd={status:st,hrNote:String(d.hrNote||'').trim(),decidedAt:tm};
      if(st==='approved'){const lid=hrId('L');
        await X.put('leaves',lid,{emp:d.emp,type:r.type||'annual',from:r.from,to:r.to,days:lrDays(r),status:'approved',note:[r.note,t('lr_fromBranch',{b:r.branch})].filter(Boolean).join(' — '),req:r.id,createdAt:tm,updatedAt:tm});
        upd.emp=d.emp;upd.leaveId=lid}
      await X.upd('leaveReqs',r.id,upd);S.openLr=null;S.hrDraft=null;
    },()=>t(st==='approved'?'lr_approved':'lr_rejected'));
  }
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='lrStaff'){const st=(S.staff||[]).find(x=>x.id===el.value);S.lrDraft=S.lrDraft||{};S.lrDraft.staffId=st?st.id:'';S.lrDraft.empName=st?st.name:'';S.lrDraft.empNo=st?(st.no||''):'';return}
  if(!(el.dataset&&el.dataset.in==='lrF'))return;
  S.lrDraft=S.lrDraft||{};S.lrDraft[el.dataset.f]=el.value;
  if(el.dataset.f==='from'||el.dataset.f==='to'){const o=document.getElementById('lrDays');const n=lrDays(S.lrDraft);if(o)o.textContent=n?t('hr_days',{n}):''}});

