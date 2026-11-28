/* Maskob — Human resources: employees, documents, leave, contracts, custody, advances, end of service, licenses.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Human resources: employees, document expiry, leave ================= */
const HR_WARN=60;                                   // documents expiring within this many days are listed
const HR_DOCS=['idExp','healthExp','contractEnd'];
const HR_DOC_L={idExp:'hr_idExp',healthExp:'hr_health',contractEnd:'hr_contract'};
const LEAVE_TYPES=['annual','sick','emergency','unpaid'];
const hrPlaces=()=>[...S.branches,'@wh','@office'];
const placeL=p=>p==='@all'?t('li_allPlaces'):p==='@wh'?t('r_warehouse'):p==='@office'?t('hr_office'):(p||'—');
const dayDiff=(a,b)=>Math.round((fromKey(b)-fromKey(a))/864e5);     // b - a in days
const leaveDays=l=>l.from&&l.to?dayDiff(l.from,l.to)+1:0;
const empById=id=>(S.emps||[]).find(e=>e.id===id);
const empName=id=>{const e=empById(id);return e?e.name:'—'};
const onLeaveToday=e=>{const d=dayKey(Date.now());return(S.leaves||[]).some(l=>l.emp===e.id&&l.status==='approved'&&l.from<=d&&l.to>=d)};
/* every document of working staff that expires within HR_WARN days (or already expired) */
function hrDocAlerts(){
  const today=dayKey(Date.now()),out=[];
  (S.emps||[]).filter(e=>e.status!=='left').forEach(e=>HR_DOCS.forEach(k=>{
    if(!e[k])return;const left=dayDiff(today,e[k]);
    if(left<=HR_WARN)out.push({e,k,date:e[k],left});
  }));
  return out.sort((a,b)=>a.left-b.left);
}
const leftLabel=n=>n<0?t('hr_daysAgo',{n:-n}):n===0?t('hr_today'):t('hr_daysLeft',{n});
function hrTabs(){
  const al=hrDocAlerts(),pend=(S.leaves||[]).filter(l=>l.status==='pending').length+(S.leaveReqs||[]).filter(r=>r.status==='pending').length;
  return[{k:'emps',l:t('tab_emps')},{k:'docs',l:t('tab_docs'),b:al.length,late:al.some(a=>a.left<0)},{k:'leaves',l:t('tab_leaves'),b:pend},{k:'custody',l:t('tab_custody'),b:(S.custody||[]).filter(custOut).length},{k:'advances',l:t('tab_adv'),b:(S.advances||[]).filter(a=>advRemain(a)>0).length},{k:'lic',l:t('tab_lic'),b:(S.licenses||[]).filter(l=>['expired','soon'].includes(licState(l))).length,late:(S.licenses||[]).some(l=>licState(l)==='expired')},{k:'payroll',l:t('tab_pr')},{k:'vouchers',l:t('tab_vc')},{k:'forms',l:t('tab_forms'),b:(S.forms||[]).filter(f=>f.status==='pending').length},...(typeof archiveView==='function'?[{k:'archive',l:t('tab_archive'),b:arcAlerts().length,late:arcAlerts().some(x=>arcExp(x)==='out')}]:[]),...(typeof mailView==='function'?[{k:'mail',l:t('tab_mail'),b:mailUnreadN()}]:[])];
}
function hrView(tb){
  if(tb==='mail'&&typeof mailView==='function')return mailView();
  if(tb==='archive'&&typeof archiveView==='function')return archiveView();
  if(tb==='docs')return hrDocsView();
  if(tb==='leaves')return hrLeavesView();
  if(tb==='custody')return custodyView();
  if(tb==='advances')return advancesView();
  if(tb==='lic')return licensesView();
  if(tb==='payroll')return payrollView();
  if(tb==='vouchers')return vouchersView();
  if(tb==='forms')return hrFormsView();
  return hrEmpsView();
}
function hrEmpsView(){
  const all=[...(S.emps||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const act=all.filter(e=>e.status!=='left');
  const place=S.hrPlace||'',q=String(S.hrQ||'').trim().toLowerCase();
  const al=hrDocAlerts(),lateIds=new Set(al.filter(a=>a.left<0).map(a=>a.e.id));
  const show=S.hrShow||'active';
  const list=all.filter(e=>(show==='all'||(show==='left')===(e.status==='left'))&&(!place||e.branch===place)&&(!q||[e.name,e.no,e.idNo,e.phone,e.job].some(x=>String(x||'').toLowerCase().includes(q))));
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_emps')}</h2><div class="row">${ioBtns('employees',`<button class="io-item" role="menuitem" data-act="hrXls">⬇ ${t('io_exportAll')}</button>`)}<button class="btn btn-sun" data-act="hrNew">+ ${t('hr_add')}</button></div></div>
  <div class="stats">${kpi(t('hr_working'),sar(act.length))}${kpi(t('hr_onLeave'),sar(act.filter(onLeaveToday).length))}${kpi(t('hr_expiring'),sar(al.length),al.length?'hot':'')}${kpi(t('hr_payroll'),sar(act.reduce((a,e)=>a+payTotal(e),0))+' '+t('sar'))}</div>
  <div class="row hr-filter"><input class="field" id="hrQ" data-in="hrQ" placeholder="${esc(t('hr_search'))}" value="${esc(S.hrQ||'')}" style="flex:2;min-width:180px">
    <select class="field" id="hrPlace" style="flex:1;min-width:140px"><option value="">${esc(t('hr_allPlaces'))}</option>${hrPlaces().map(p=>`<option value="${esc(p)}" ${place===p?'selected':''}>${esc(placeL(p))} (${act.filter(e=>e.branch===p).length})</option>`).join('')}</select></div>
  <div class="filters">${[['active','es_active'],['left','es_left'],['all','f_all']].map(([k,l])=>`<button class="chip" aria-pressed="${show===k}" data-act="hrShow" data-k="${k}">${t(l)} (${k==='all'?all.length:all.filter(e=>(k==='left')===(e.status==='left')).length})</button>`).join('')}</div>
  <div class="list">${list.length?list.map(e=>`<button class="oc ${lateIds.has(e.id)?'late':''}" data-act="hrOpen" data-id="${esc(e.id)}">
    <span style="min-width:0"><span class="t">${esc(e.name)} ${e.no?`<span class="hint num" dir="ltr">#${esc(e.no)}</span>`:''}</span>
      <span class="s">${esc(placeL(e.branch))}${e.job?' · '+esc(e.job):''}${e.nat?' · '+esc(e.nat):''}</span></span>
    <span class="side">${e.status==='left'?`<span class="pill ms-open">${t('es_left')}</span>`:onLeaveToday(e)?`<span class="pill ms-progress">${t('hr_inLeave')}</span>`:`<span class="pill ms-done">${t('es_active')}</span>`}</span></button>`).join(''):`<div class="empty">${esc(t(all.length?'hr_noMatch':'hr_none'))}</div>`}</div>`;
}
function hrDocsView(){
  const al=hrDocAlerts();
  return`<h2>${t('tab_docs')}</h2><p class="hint">${esc(t('hr_docsWithin',{n:HR_WARN}))}</p>
  ${al.length?`<div class="scroll"><table class="tbl"><thead><tr><th>${t('lv_emp')}</th><th>${t('hr_branch')}</th><th>${t('hr_doc')}</th><th style="text-align:center">${t('hr_expiry')}</th><th style="text-align:center">${t('hr_status')}</th></tr></thead><tbody>
  ${al.map(a=>`<tr class="${a.left<0?'hr-exp':a.left<=30?'hr-soon':''}"><td><button class="linkish" data-act="hrOpen" data-id="${esc(a.e.id)}">${esc(a.e.name)}</button></td><td>${esc(placeL(a.e.branch))}</td><td>${esc(t(HR_DOC_L[a.k]))}</td><td class="n">${esc(dateLabel(a.date))}</td><td class="n"><b>${esc(leftLabel(a.left))}</b></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('hr_docsNone',{n:HR_WARN}))}</div>`}`;
}
function hrLeavesView(){
  const f=S.lvFilter||'current',today=dayKey(Date.now());
  const all=[...(S.leaves||[])].sort((a,b)=>String(b.from).localeCompare(String(a.from)));
  const list=f==='pending'?all.filter(l=>l.status==='pending'):f==='current'?all.filter(l=>l.status!=='rejected'&&l.to>=today):all;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_leaves')}</h2><div class="row">${ioBtns('leaves')}<button class="btn btn-sun" data-act="lvNew" ${(S.emps||[]).some(e=>e.status!=='left')?'':'disabled'}>+ ${t('lv_add')}</button></div></div>
  ${hrLeaveRequests()}
  <div class="filters">${[['current','lf_current'],['pending','ls_pending'],['all','f_all']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="lvFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(l=>{const e=empById(l.emp);const now=l.status==='approved'&&l.from<=today&&l.to>=today;return`<button class="oc" data-act="lvOpen" data-id="${esc(l.id)}">
    <span style="min-width:0"><span class="t">${esc(e?e.name:'—')} <span class="tag">${esc(t('lt_'+(l.type||'annual')))}</span>${now?`<span class="tag ret">${t('hr_inLeave')}</span>`:''}</span>
      <span class="s">${esc(e?placeL(e.branch):'')} · ${esc(dateLabel(l.from))} ← ${esc(dateLabel(l.to))} · ${esc(t('hr_days',{n:leaveDays(l)}))}</span></span>
    <span class="side"><span class="pill ${l.status==='approved'?'ms-done':l.status==='rejected'?'ms-open':'ms-progress'}">${esc(t('ls_'+l.status))}</span></span></button>`}).join(''):`<div class="empty">${esc(t('lv_none'))}</div>`}</div>`;
}
/* form fields */
const hrIn=(f,label,type,extra)=>{const d=S.hrDraft||{};return`<label><span class="hint">${esc(label)}</span><input class="field${type==='number'||type==='tel'?' num':''}" type="${type||'text'}" id="hr-${f}" data-in="hrF" data-f="${f}" value="${esc(d[f]??'')}" ${type==='tel'||type==='number'?'dir="ltr" inputmode="'+(type==='tel'?'tel':'decimal')+'"':'dir="auto"'} ${extra||''}></label>`};
const hrSel=(f,label,opts)=>{const d=S.hrDraft||{};return`<label><span class="hint">${esc(label)}</span><select class="field" id="hr-${f}" data-in="hrF" data-f="${f}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(d[f]??'')===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`};
function hrSheetWrap(title,body,foot){
  return`<div class="veil" data-act="veil"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-brand"><span class="logo sm" role="img" aria-label="مسكوب MASKOB"></span></div>
  <div class="sh-head"><div class="row"><div style="flex:1;min-width:0"><h2>${esc(title)}</h2></div><button class="x" data-act="close" aria-label="${esc(t('close'))}">×</button></div></div>
  <div class="sh-body">${body}</div><div class="sh-foot">${foot}</div></div></div>`;
}
function empSheet(){
  const isNew=S.openEmp==='new',e=isNew?null:empById(S.openEmp);if(!isNew&&!e)return'';
  const d=S.hrDraft||{};
  const yr=String(new Date().getFullYear());
  const used=isNew?0:(S.leaves||[]).filter(l=>l.emp===e.id&&l.type==='annual'&&l.status==='approved'&&String(l.from).startsWith(yr)).reduce((a,l)=>a+leaveDays(l),0);
  const docs=isNew?'':HR_DOCS.filter(k=>e[k]).map(k=>{const n=dayDiff(dayKey(Date.now()),e[k]);return n<=HR_WARN?`<span class="tag ${n<0?'ret':''}">${esc(t(HR_DOC_L[k]))}: ${esc(leftLabel(n))}</span>`:''}).join('');
  const body=`${isNew?'':`<div class="row" style="gap:8px;margin-bottom:12px">${docs}<span class="tag">${esc(t('hr_annualUsed'))}: ${esc(t('hr_days',{n:used}))}</span>${empFormTags(e)}${(()=>{const cu=(S.custody||[]).filter(c=>c.emp===e.id&&custOut(c)).length,av=(S.advances||[]).filter(a=>a.emp===e.id).reduce((s,a)=>s+advRemain(a),0);return(cu?`<span class="tag">${esc(t('cu_ofEmp',{n:cu}))}</span>`:'')+(av>0?`<span class="tag ret">${esc(t('av_ofEmp',{n:sar2(av)}))}</span>`:'')})()}</div>`}
  ${typeof idScanBlock==='function'?idScanBlock():''}
  <div class="sl-grid hr-grid">
    ${hrIn('name',t('hr_name'))}${hrIn('no',t('hr_no'),'text','dir="ltr"')}
    ${hrSel('branch',t('hr_branch'),hrPlaces().map(p=>[p,placeL(p)]))}${hrIn('job',t('hr_job'))}
    ${hrIn('nat',t('hr_nat'))}${hrIn('phone',t('hr_phone'),'tel')}
    ${hrIn('idNo',t('hr_id'),'tel')}${hrIn('idExp',t('hr_idExp'),'date')}
    ${hrIn('passNo',t('hr_passNo'),'text','dir="ltr"')}${hrIn('passExp',t('hr_passExp'),'date')}${hrIn('birth',t('hr_birth'),'date')}
    ${hrIn('healthExp',t('hr_health'),'date')}${hrIn('contractEnd',t('hr_contract'),'date')}
    ${hrIn('hire',t('hr_hire'),'date')}${hrIn('salary',t('hr_salary')+' ('+t('sar')+')','number')}
    ${hrSel('status',t('hr_status'),[['active',t('es_active')],['left',t('es_left')]])}
  </div>
  <h4 class="hr-sub">${t('bk_title')}</h4>
  <div class="sl-grid hr-grid">${hrIn('bank',t('bk_bank'))}${hrIn('iban',t('bk_iban'),'text','dir="ltr" autocomplete="off" style="text-transform:uppercase"')}</div>
  <h4 class="hr-sub">${t('al_title')}</h4>
  <div class="sl-grid hr-grid">${ALLOWANCES.map(k=>hrIn(k,t(AL_L[k])+' ('+t('sar')+')','number')).join('')}</div>
  <div class="hr-total">${t('hr_totalPay')}: <b class="num" id="hrTotal">${esc(sar2(payTotal(d)))}</b> ${t('sar')}</div>
  <h4 class="hr-sub">${t('gs_title')}</h4>
  <div class="sl-grid hr-grid">${hrSel('gosi',t('gs_on'),[['',t('gs_no')],['yes',t('gs_yes')]])}${d.gosi==='yes'||d.gosi===true?hrIn('gosiRate',t('gs_rate'),'number','dir="ltr" inputmode="decimal" placeholder="9.75"'):''}${hrIn('gosiEmp',t('gs_emp'),'number','dir="ltr" inputmode="decimal" placeholder="'+(d.gosi==='yes'||d.gosi===true?'11.75':'2')+'"')}</div>
  <p class="hint">${esc(t('gs_empHint'))}</p>
  ${d.gosi==='yes'||d.gosi===true?`<div class="hint" id="gosiAmt">${esc(t('gs_monthly'))}: <b class="num">${esc(sar2(gosiMonthly(d)))}</b> ${t('sar')}</div>`:''}
  <p class="hint">${esc(t('gs_hint'))}</p>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>
  ${isNew?`<p class="hint" style="margin-top:10px">${esc(t('ef_saveFirst'))}</p>`:empFilesSection(S.openEmp)}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="hrDel">${S.confirm==='hrDel'?t('hr_delConfirm'):t('del')}</button>`}${isNew?'':`<button class="btn btn-ghost" data-act="hrEos">${e.status==='left'&&e.settlement?t('eos_view'):t('eos_title')}</button>`}<span class="spacer"></span><button class="btn btn-navy" data-act="hrContract" ${S.busy?'disabled':''}>${t('ct_make')}</button><button class="btn btn-sun" data-act="hrSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('hr_add'):(e.name||''),body,foot);
}
function leaveSheet(){
  const isNew=S.openLeave==='new',l=isNew?null:(S.leaves||[]).find(x=>x.id===S.openLeave);if(!isNew&&!l)return'';
  const d=S.hrDraft||{};
  const emps=(S.emps||[]).filter(e=>e.status!=='left'||e.id===d.emp).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const n=d.from&&d.to&&d.to>=d.from?leaveDays(d):0;
  const body=`<div class="sl-grid hr-grid">
    ${hrSel('emp',t('lv_emp'),[['',t('hr_pickEmp')],...emps.map(e=>[e.id,e.name+' — '+placeL(e.branch)])])}${hrSel('type',t('lv_type'),LEAVE_TYPES.map(k=>[k,t('lt_'+k)]))}
    ${hrIn('from',t('lv_from'),'date')}${hrIn('to',t('lv_to'),'date')}
  </div>
  <div class="hint" style="margin:8px 0" id="lvDays">${n?esc(t('hr_days',{n})):''}</div>
  <div class="kind" style="margin-bottom:10px">${['pending','approved','rejected'].map(s=>`<button aria-pressed="${(d.status||'pending')===s}" data-act="lvStatus" data-k="${s}">${esc(t('ls_'+s))}</button>`).join('')}</div>
  <label style="display:block"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="lvDel">${S.confirm==='lvDel'?t('lv_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="lvSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('lv_add'):t('tab_leaves')+': '+empName(l.emp),body+(typeof phBlock==='function'?phBlock('leaves',isNew?null:S.openLeave,{title:'ph_leave'}):''),foot);
}
/* ---------- allowances and pay ---------- */
const ALLOWANCES=['alHousing','alTransport','alFood','alOther'];
/* social insurance: employee share on basic + housing, capped at SAR 45,000 */
const GOSI_CAP=45000,GOSI_RATE=9.75;
const gosiMonthly=(e,f)=>{if(!(e.gosi===true||e.gosi==='yes'))return 0;const base=Math.min(GOSI_CAP,(+num(e.salary)||0)+(+num(e.alHousing)||0));
  const rate=e.gosiRate===''||e.gosiRate==null?GOSI_RATE:+num(e.gosiRate);return Math.round(base*(f==null?1:f)*rate)/100};
const AL_L={alHousing:'al_housing',alTransport:'al_transport',alFood:'al_food',alOther:'al_other'};
const payTotal=e=>(+e.salary||0)+ALLOWANCES.reduce((a,k)=>a+(+e[k]||0),0);
const isDay=v=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v||'');
const normIban=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const ibanOk=v=>/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(normIban(v));
const ibanFmt=v=>normIban(v).replace(/(.{4})/g,'$1 ').trim();
function empData(d,id){
  const tm=nowIso();
  const data={name:String(d.name||'').trim(),status:d.status==='left'?'left':'active',updatedAt:tm};
  ['no','branch','job','nat','phone','idNo','passNo','note','bank'].forEach(k=>data[k]=String(d[k]??'').trim());
  data.iban=normIban(d.iban);
  ['idExp','passExp','birth','healthExp','contractEnd','hire'].forEach(k=>data[k]=isDay(d[k])?d[k]:'');
  ['salary',...ALLOWANCES].forEach(k=>data[k]=d[k]===''||d[k]==null?null:num(d[k]));
  data.gosi=d.gosi==='yes'||d.gosi===true;data.gosiRate=d.gosiRate===''||d.gosiRate==null?null:num(d.gosiRate);data.gosiEmp=d.gosiEmp===''||d.gosiEmp==null?null:num(d.gosiEmp);
  const old=empById(id)||{};data.createdAt=old.createdAt||tm;if(old.contract)data.contract=old.contract;
  return data;
}

/* ---------- employment contract (printable, Arabic + English) ---------- */
const addYear=k=>{const d=fromKey(k);d.setFullYear(d.getFullYear()+1);d.setDate(d.getDate()-1);return dayKey(d)};
function contractDefaults(e){
  const c=e.contract||{};const start=c.start||e.hire||dayKey(Date.now());
  return{start,end:c.end||e.contractEnd||addYear(start),probation:c.probation??90,hours:c.hours??8,days:c.days??6,leave:c.leave??21};
}
function contractSheet(){
  const e=empById(S.openContract);if(!e)return'';
  const d=S.ctDraft,co=S.coDraft;
  const ci=(src,f,label,type,extra)=>`<label><span class="hint">${esc(label)}</span><input class="field${type==='number'?' num':''}" type="${type||'text'}" id="ct-${f}" data-in="${src}" data-f="${f}" value="${esc((src==='ctF'?d:co)[f]??'')}" ${type==='number'?'dir="ltr" inputmode="numeric"':'dir="auto"'} ${extra||''}></label>`;
  const pay=[['hr_salary',e.salary],...ALLOWANCES.map(k=>[AL_L[k],e[k]])].filter(r=>+r[1]>0);
  const body=`<div class="box"><div class="row" style="justify-content:space-between"><b>${esc(e.name)}</b><span class="hint">${esc(e.job||'')} · ${esc(placeL(e.branch))}</span></div>
    <div class="ct-pay">${pay.map(([l,v])=>`<span>${esc(t(l))}: <b class="num">${esc(sar2(v))}</b></span>`).join('')}<span class="ct-tot">${esc(t('hr_totalPay'))}: <b class="num">${esc(sar2(payTotal(e)))} ${t('sar')}</b></span></div>
    ${e.contract&&e.contract.at?`<div class="hint">${esc(t('ct_last',{d:when(e.contract.at)}))}</div>`:''}</div>
  <div class="sl-grid hr-grid">${ci('ctF','start',t('ct_start'),'date')}${ci('ctF','end',t('hr_contract'),'date')}${ci('ctF','probation',t('ct_probation'),'number')}${ci('ctF','leave',t('ct_leave'),'number')}${ci('ctF','hours',t('ct_hours'),'number')}${ci('ctF','days',t('ct_days'),'number')}</div>
  ${(()=>{const co=coInfo();return`<div class="box" style="margin-top:12px"><h4>${t('co_title')}</h4><div>${esc(co.name)}${co.nameEn?' · <span dir="ltr">'+esc(co.nameEn)+'</span>':''}</div>
    <div class="hint">${[co.cr?t('ct_cr')+': '+esc(co.cr):'',co.rep?t('co_rep')+': '+esc(co.rep):''].filter(Boolean).join(' · ')||''}</div><div class="hint">${esc(t('co_editHint'))}</div></div>`})()}
  <p class="hint" style="margin-top:10px">${esc(t('ct_hint'))}</p>`;
  const foot=`<button class="btn btn-ghost" data-act="ctBack">${t('ct_backEmp')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="ctPrint" ${S.busy?'disabled':''}>${t('ct_print')}</button>`;
  return hrSheetWrap(t('ct_title')+': '+e.name,body,foot);
}
function contractHtml(e,c,co){
  const h=esc,n=x=>(+x||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const dt=k=>isDay(k)?k.split('-').reverse().join('/'):'—';
  const months=Math.max(1,Math.round((dayDiff(c.start,c.end)+1)/30.44));
  const pl=e.branch==='@wh'?['المستودع','Warehouse']:e.branch==='@office'?['الإدارة','Head office']:[e.branch||'—',e.branch||'—'];
  const coName=co.name||'مسكوب',dash=v=>h(v||'—');
  const pay=[['الراتب الأساسي','Basic salary',e.salary],['بدل سكن','Housing allowance',e.alHousing],['بدل نقل','Transport allowance',e.alTransport],['بدل طعام','Food allowance',e.alFood],['بدلات أخرى','Other allowances',e.alOther]].filter(r=>+r[2]>0);
  const total=payTotal(e);
  const C=[
    ['الطرف الأول: '+h(coName)+'، سجل تجاري رقم '+dash(co.cr)+'، العنوان: '+dash(co.addr)+'، ويمثلها: '+dash(co.rep)+(co.repTitle?' ('+h(co.repTitle)+')':'')+'.',
     'First party: '+h(co.nameEn||coName)+', C.R. No. '+dash(co.cr)+', address: '+dash(co.addrEn||co.addr)+', represented by: '+dash(co.rep)+(co.repTitle?' ('+h(co.repTitle)+')':'')+'.'],
    ['الطرف الثاني: '+h(e.name)+'، الجنسية: '+dash(e.nat)+'، رقم الهوية / الإقامة: '+dash(e.idNo)+'، الجوال: '+dash(e.phone)+'.',
     'Second party: '+h(e.name)+', nationality: '+dash(e.nat)+', ID / Iqama No.: '+dash(e.idNo)+', mobile: '+dash(e.phone)+'.'],
    ['يعمل الطرف الثاني لدى الطرف الأول بمهنة ('+dash(e.job)+') في ('+h(pl[0])+')، ويؤدي المهام التي يكلفه بها الطرف الأول بما يتناسب مع مهنته.',
     'The second party works for the first party as ('+dash(e.job)+') at ('+h(pl[1])+'), performing the duties assigned in line with this profession.'],
    ['مدة هذا العقد '+months+' شهراً، تبدأ في '+dt(c.start)+' وتنتهي في '+dt(c.end)+'، وتُعد الأيام الـ'+n(c.probation)+' الأولى فترة تجربة.',
     'This contract runs for '+months+' months, from '+dt(c.start)+' to '+dt(c.end)+'. The first '+n(c.probation)+' days are a probation period.'],
    ['يدفع الطرف الأول للطرف الثاني أجراً شهرياً إجماليه '+n(total)+' ريال سعودي موزعاً كما في الجدول أدناه، ويُصرف في نهاية كل شهر ميلادي.',
     'The first party pays the second party a total monthly wage of SAR '+n(total)+', broken down in the table below, paid at the end of each calendar month.'],
    ['ساعات العمل '+n(c.hours)+' ساعات يومياً، لمدة '+n(c.days)+' أيام في الأسبوع.','Working hours are '+n(c.hours)+' hours a day, '+n(c.days)+' days a week.'],
    ['يستحق الطرف الثاني إجازة سنوية مدفوعة الأجر مدتها '+n(c.leave)+' يوماً.','The second party is entitled to '+n(c.leave)+' days of paid annual leave.'],
    ['يلتزم الطرف الثاني بأنظمة العمل ولوائح المنشأة، والمحافظة على أسرارها وممتلكاتها.','The second party abides by the company rules and regulations and protects its confidential information and property.'],
    ['فيما لم يرد فيه نص في هذا العقد يُطبق نظام العمل في المملكة العربية السعودية ولائحته التنفيذية.','Any matter not covered by this contract is governed by the Saudi Labor Law and its implementing regulations.'],
    ['حُرر هذا العقد من نسختين، بيد كل طرف نسخة للعمل بموجبها.','This contract is made in two copies, one for each party.']
  ];
  let logo='https://fllow-maskob.web.app/maskob-wordmark.png';
  try{if(/^https?:$/.test(location.protocol))logo=new URL('maskob-wordmark.png',location.href).href}catch(e){}
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>عقد عمل - ${h(e.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}body{font-family:"IBM Plex Sans Arabic",Arial,sans-serif;color:#13233a;margin:0;font-size:12.5px;line-height:1.7}
.top{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0758A7;padding-bottom:10px;margin-bottom:6px}
.top img{height:40px}.top .meta{font-size:11.5px;color:#4a5b73;text-align:left}
.bar{height:3px;width:90px;background:#EF8A22;margin:0 0 14px auto}
h1{font-size:22px;margin:0;color:#0758A7;font-weight:800}h1 small{display:block;font-size:13px;color:#4a5b73;font-weight:500}
table{width:100%;border-collapse:collapse}
.cl td{border-bottom:1px solid #dfe6ef;padding:7px 8px;vertical-align:top;width:50%}
.cl td.en{direction:ltr;text-align:left;color:#33445c}.cl td.no{width:26px;color:#EF8A22;font-weight:800;text-align:center}
.pay{margin:10px 0 16px}.pay th,.pay td{border:1px solid #c9d5e3;padding:6px 10px}.pay th{background:#e6eff9;color:#0758A7}
.pay td.v{text-align:center;direction:ltr;font-weight:700}.pay tr.tot td{background:#fdf1e3;font-weight:800}
.sig{display:flex;gap:30px;margin-top:26px}.sig div{flex:1;border:1px solid #c9d5e3;border-radius:8px;padding:10px 12px;min-height:120px}
.sig b{color:#0758A7}.line{border-bottom:1px dashed #8a9ab0;height:34px;margin-bottom:4px}
.foot{margin-top:14px;font-size:10.5px;color:#6b7a90;text-align:center}
</style></head><body>
${letterhead(co,'عقد عمل','Employment Contract',dt(dayKey(Date.now()))+(e.no?' &nbsp;·&nbsp; #'+h(e.no):''))}
<div class="bar"></div>
<table class="cl">${C.map((r,i)=>`<tr><td class="no">${i+1}</td><td>${r[0]}</td><td class="en">${r[1]}</td></tr>`).join('')}</table>
<table class="pay"><thead><tr><th>البند / Item</th><th>المبلغ الشهري (ريال) / Monthly (SAR)</th></tr></thead><tbody>
${pay.map(r=>`<tr><td>${r[0]} / ${r[1]}</td><td class="v">${n(r[2])}</td></tr>`).join('')}
<tr class="tot"><td>الإجمالي / Total</td><td class="v">${n(total)}</td></tr></tbody></table>
<div class="sig"><div><b>الطرف الأول / First party</b><div>${h(coName)}${co.rep?' — '+h(co.rep):''}</div><div class="line"></div>التوقيع والختم / Signature &amp; stamp</div>
<div><b>الطرف الثاني / Second party</b><div>${h(e.name)}</div><div class="line"></div>التوقيع / Signature</div></div>
${letterfoot(co)}
<script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print()},250)})}<\/script>
</body></html>`;
}
/* print in a new window; if pop-ups are blocked, print from a hidden frame */
function printHtml(html,win){
  if(win&&!win.closed){win.document.open();win.document.write(html);win.document.close();return}
  const old=document.getElementById('printFrame');if(old)old.remove();
  const f=document.createElement('iframe');f.id='printFrame';f.style.cssText='position:fixed;width:0;height:0;border:0;inset-inline-start:-9999px';
  document.body.appendChild(f);f.contentWindow.document.open();f.contentWindow.document.write(html);f.contentWindow.document.close();
}

/* ---------- custody items (العهد) and salary advances (السلف) ---------- */
const custOut=c=>!c.status||c.status==='out';
const advPaid=a=>(a.payments||[]).reduce((s,p)=>s+(+p.amount||0),0);
const advRemain=a=>Math.max(0,Math.round(((+a.amount||0)-advPaid(a))*100)/100);
const empOpts=keep=>[['',t('hr_pickEmp')],...(S.emps||[]).filter(e=>e.status!=='left'||e.id===keep).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).map(e=>[e.id,e.name+' — '+placeL(e.branch)])];
const empSub=id=>{const e=empById(id);return e?placeL(e.branch):''};
function custodyView(){
  const f=S.cuFilter||'out';
  const all=[...(S.custody||[])].sort((a,b)=>String(b.given).localeCompare(String(a.given)));
  const out=all.filter(custOut);
  const list=f==='out'?out:f==='returned'?all.filter(c=>!custOut(c)):all;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_custody')}</h2><div class="row">${ioBtns('custody')}<button class="btn btn-sun" data-act="cuNew" ${(S.emps||[]).some(e=>e.status!=='left')?'':'disabled'}>+ ${t('cu_add')}</button></div></div>
  <div class="stats">${kpi(t('cu_outN'),sar(out.length))}${kpi(t('cu_outVal'),sar(out.reduce((a,c)=>a+(+c.value||0),0))+' '+t('sar'))}</div>
  <div class="filters">${[['out','cs_out'],['returned','cs_returned'],['all','f_all']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="cuFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(c=>{const left=empById(c.emp)&&empById(c.emp).status==='left'&&custOut(c);return`<button class="oc ${left?'late':''}" data-act="cuOpen" data-id="${esc(c.id)}">
    <span style="min-width:0"><span class="t">${esc(c.item)} ${c.value?`<span class="tag num">${esc(sar(c.value))} ${t('sar')}</span>`:''}</span>
      <span class="s">${esc(empName(c.emp))} · ${esc(empSub(c.emp))} · ${esc(dateLabel(c.given))}${c.serial?' · '+esc(c.serial):''}</span></span>
    <span class="side"><span class="pill ${custOut(c)?'ms-progress':'ms-done'}">${esc(t('cs_'+(c.status||'out')))}</span></span></button>`}).join(''):`<div class="empty">${esc(t('cu_none'))}</div>`}</div>`;
}
function custodySheet(){
  const isNew=S.openCust==='new',c=isNew?null:(S.custody||[]).find(x=>x.id===S.openCust);if(!isNew&&!c)return'';
  const d=S.hrDraft||{};const ret=d.status==='returned';
  const body=`<div class="sl-grid hr-grid">
    ${hrSel('emp',t('lv_emp'),empOpts(d.emp))}${hrIn('item',t('cu_item'))}
    ${hrIn('serial',t('cu_serial'))}${hrIn('value',t('cu_value')+' ('+t('sar')+')','number')}
    ${hrIn('given',t('cu_given'),'date')}${ret?hrIn('returnedAt',t('cu_returnedAt'),'date'):''}
  </div>
  <div class="kind" style="margin:10px 0">${['out','returned'].map(s=>`<button aria-pressed="${(d.status||'out')===s}" data-act="cuStatus" data-k="${s}">${esc(t('cs_'+s))}</button>`).join('')}</div>
  <label style="display:block"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="cuDel">${S.confirm==='cuDel'?t('cu_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="cuSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('cu_add'):t('cu_item')+': '+(c.item||''),body,foot);
}
function advancesView(){
  const f=S.avFilter||'open';
  const all=[...(S.advances||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const open=all.filter(a=>advRemain(a)>0);
  const list=f==='open'?open:f==='closed'?all.filter(a=>advRemain(a)<=0):all;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_adv')}</h2><div class="row">${ioBtns('advances')}<button class="btn btn-sun" data-act="avNew" ${(S.emps||[]).some(e=>e.status!=='left')?'':'disabled'}>+ ${t('av_add')}</button></div></div>
  <div class="stats">${kpi(t('av_openN'),sar(open.length))}${kpi(t('av_outTotal'),sar(open.reduce((s,a)=>s+advRemain(a),0))+' '+t('sar'),open.length?'hot':'')}</div>
  <div class="filters">${[['open','as_open'],['closed','as_closed'],['all','f_all']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="avFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(a=>{const r=advRemain(a),left=r>0&&+a.monthly>0?Math.ceil(r/ +a.monthly):0;return`<button class="oc" data-act="avOpen" data-id="${esc(a.id)}">
    <span style="min-width:0"><span class="t">${esc(empName(a.emp))} <span class="tag num">${esc(sar(a.amount))} ${t('sar')}</span></span>
      <span class="s">${esc(empSub(a.emp))} · ${esc(dateLabel(a.date))} · ${esc(t('av_remain'))}: ${esc(sar(r))} ${t('sar')}${left?' · '+esc(t('av_left',{n:left})):''}</span>
      <span class="ad-bar"><i style="width:${+a.amount?Math.round(advPaid(a)/ +a.amount*100):0}%"></i></span></span>
    <span class="side"><span class="pill ${r>0?'ms-progress':'ms-done'}">${esc(t(r>0?'as_open':'as_closed'))}</span></span></button>`}).join(''):`<div class="empty">${esc(t('av_none'))}</div>`}</div>`;
}
function advanceSheet(){
  const isNew=S.openAdv==='new',a=isNew?null:(S.advances||[]).find(x=>x.id===S.openAdv);if(!isNew&&!a)return'';
  const d=S.hrDraft||{},p=S.avPay||{};
  const pays=isNew?'':`<h4 class="hr-sub">${t('av_payments')}</h4>
    <div class="ct-pay"><span>${t('av_paid')}: <b class="num">${esc(sar2(advPaid(a)))}</b></span><span class="ct-tot">${t('av_remain')}: <b class="num">${esc(sar2(advRemain(a)))} ${t('sar')}</b></span></div>
    ${(a.payments||[]).length?`<div class="scroll"><table class="tbl"><tbody>${a.payments.map((x,i)=>`<tr><td>${esc(dateLabel(x.date))}</td><td class="n">${esc(sar2(x.amount))} ${t('sar')}</td><td style="width:40px"><button class="x" data-act="avDelPay" data-i="${i}" aria-label="${esc(t('del'))}">×</button></td></tr>`).join('')}</tbody></table></div>`:''}
    ${advRemain(a)>0?`<div class="row ad-pay"><input class="field" type="date" id="av-payDate" data-in="avP" data-f="date" value="${esc(p.date||dayKey(Date.now()))}" style="flex:1;min-width:140px"><input class="field num" id="av-payAmt" data-in="avP" data-f="amount" inputmode="decimal" dir="ltr" placeholder="${esc(sar2(Math.min(advRemain(a),+a.monthly||advRemain(a))))}" value="${esc(p.amount||'')}" style="flex:1;min-width:110px"><button class="btn btn-navy" data-act="avAddPay">${t('av_pay')}</button></div>`:''}`;
  const body=`<div class="sl-grid hr-grid">
    ${hrSel('emp',t('lv_emp'),empOpts(d.emp))}${hrIn('amount',t('av_amount')+' ('+t('sar')+')','number')}
    ${hrIn('date',t('av_date'),'date')}${hrIn('monthly',t('av_monthly')+' ('+t('sar')+')','number')}
  </div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>${pays}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="avDel">${S.confirm==='avDel'?t('av_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="avSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('av_add'):t('tab_adv')+': '+empName(a.emp),body,foot);
}
Object.assign(A,{
  cuNew(){S.openCust='new';S.confirm=null;S.hrDraft={emp:'',item:'',given:dayKey(Date.now()),status:'out'};render()},
  cuOpen(el){const c=(S.custody||[]).find(x=>x.id===el.dataset.id);if(!c)return;S.openCust=c.id;S.confirm=null;S.hrDraft=Object.assign({},c);render()},
  cuFilter(el){S.cuFilter=el.dataset.k;render()},
  cuStatus(el){S.hrDraft=S.hrDraft||{};S.hrDraft.status=el.dataset.k;if(el.dataset.k==='returned'&&!S.hrDraft.returnedAt)S.hrDraft.returnedAt=dayKey(Date.now());render()},
  cuSave(){
    const d=S.hrDraft||{};const item=String(d.item||'').trim();if(!d.emp||!item){toast(t('cu_need'));return}
    const id=S.openCust==='new'?hrId('C'):S.openCust;const tm=nowIso();const ret=d.status==='returned';
    const data={emp:d.emp,item,serial:String(d.serial||'').trim(),value:d.value===''||d.value==null?null:num(d.value),given:isDay(d.given)?d.given:dayKey(Date.now()),
      status:ret?'returned':'out',returnedAt:ret&&isDay(d.returnedAt)?d.returnedAt:'',note:String(d.note||'').trim(),updatedAt:tm,
      createdAt:((S.custody||[]).find(x=>x.id===id)||{}).createdAt||tm};
    guard(async()=>{await X.put('custody',id,data);S.openCust=null;S.hrDraft=null},()=>t('cu_saved'));
  },
  cuDel(){const id=S.openCust;if(!id||id==='new')return;if(S.confirm!=='cuDel'){S.confirm='cuDel';render();return}
    guard(async()=>{await X.del('custody',id);S.openCust=null;S.confirm=null},()=>t('cu_deleted'))},
  avNew(){S.openAdv='new';S.confirm=null;S.avPay=null;S.hrDraft={emp:'',amount:'',monthly:'',date:dayKey(Date.now())};render()},
  avOpen(el){const a=(S.advances||[]).find(x=>x.id===el.dataset.id);if(!a)return;S.openAdv=a.id;S.confirm=null;S.avPay=null;S.hrDraft=Object.assign({},a);render()},
  avFilter(el){S.avFilter=el.dataset.k;render()},
  avSave(){
    const d=S.hrDraft||{};const amount=num(d.amount);if(!d.emp||!(amount>0)){toast(t('av_need'));return}
    const id=S.openAdv==='new'?hrId('A'):S.openAdv;const tm=nowIso();const old=(S.advances||[]).find(x=>x.id===id)||{};
    const data={emp:d.emp,amount,monthly:d.monthly===''||d.monthly==null?null:num(d.monthly),date:isDay(d.date)?d.date:dayKey(Date.now()),note:String(d.note||'').trim(),
      payments:old.payments||[],updatedAt:tm,createdAt:old.createdAt||tm};
    data.status=advRemain(data)>0?'open':'closed';
    guard(async()=>{await X.put('advances',id,data);S.openAdv=null;S.hrDraft=null},()=>t('av_saved'));
  },
  avAddPay(){
    const a=(S.advances||[]).find(x=>x.id===S.openAdv);if(!a)return;const p=S.avPay||{};
    const amount=num(p.amount);if(!(amount>0)){toast(t('av_payNeed'));return}
    if(amount>advRemain(a)+0.001){toast(t('av_payTooMuch'));return}
    const payments=[...(a.payments||[]),{date:isDay(p.date)?p.date:dayKey(Date.now()),amount}];
    const status=(+a.amount||0)-payments.reduce((s,x)=>s+x.amount,0)>0.001?'open':'closed';
    guard(async()=>{await X.upd('advances',a.id,{payments,status,updatedAt:nowIso()});S.avPay=null},()=>t('av_paySaved'));
  },
  avDelPay(el){
    const a=(S.advances||[]).find(x=>x.id===S.openAdv);if(!a)return;const payments=(a.payments||[]).filter((_,i)=>i!==+el.dataset.i);
    guard(()=>X.upd('advances',a.id,{payments,status:(+a.amount||0)-payments.reduce((s,x)=>s+x.amount,0)>0.001?'open':'closed',updatedAt:nowIso()}),()=>t('av_saved'));
  },
  avDel(){const id=S.openAdv;if(!id||id==='new')return;if(S.confirm!=='avDel'){S.confirm='avDel';render();return}
    guard(async()=>{await X.del('advances',id);S.openAdv=null;S.confirm=null},()=>t('av_deleted'))}
});
document.addEventListener('input',ev=>{
  const el=ev.target;if(el.dataset&&el.dataset.in==='avP'){S.avPay=S.avPay||{};S.avPay[el.dataset.f]=el.value}
});

/* ---------- end of service (إنهاء الخدمة) and final settlement ---------- */
const EOS_REASONS=['contract','resign','employer','mutual','art80','other'];
/* calendar difference: years, months, days (inclusive of the last day) */
function ymd(a,b){
  const s=fromKey(a),e=fromKey(b);e.setDate(e.getDate()+1);
  let y=e.getFullYear()-s.getFullYear(),m=e.getMonth()-s.getMonth(),d=e.getDate()-s.getDate();
  if(d<0){m--;d+=new Date(e.getFullYear(),e.getMonth(),0).getDate()}
  if(m<0){y--;m+=12}
  return{y:Math.max(0,y),m:Math.max(0,m),d:Math.max(0,d)};
}
const ymdText=p=>[p.y?t('eos_y',{n:p.y}):'',p.m?t('eos_m',{n:p.m}):'',p.d?t('eos_d',{n:p.d}):''].filter(Boolean).join(' ، ')||t('eos_d',{n:0});
const r2=x=>Math.round((+x||0)*100)/100;
/* Saudi Labor Law: half a month's wage for each of the first five years, a full month for each year after
   (fractions pro rata); resignation: none under 2 years, 1/3 for 2-5, 2/3 for 5-10, full from 10 (art. 85);
   dismissal under art. 80: none */
function eosCalc(e,d){
  const ok=isDay(d.start)&&isDay(d.last)&&d.last>=d.start;
  const days=ok?dayDiff(d.start,d.last)+1:0,years=days/365;
  const wage=num(d.wage);
  const full=years<=5?years*wage/2:2.5*wage+(years-5)*wage;
  const factor=d.reason==='art80'?0:d.reason==='resign'?(years<2?0:years<5?1/3:years<10?2/3:1):1;
  const award=r2(full*factor),leaveComp=r2(num(d.leaveDays)*wage/30),otherDue=r2(num(d.otherDue));
  const adv=r2((S.advances||[]).filter(a=>a.emp===e.id).reduce((s,a)=>s+advRemain(a),0));
  const cust=(S.custody||[]).filter(c=>c.emp===e.id&&custOut(c));
  const custVal=r2(cust.reduce((s,c)=>s+(+c.value||0),0));
  const dedAdv=d.dedAdv?adv:0,dedCust=d.dedCust?custVal:0,otherDed=r2(num(d.otherDed));
  const net=r2(award+leaveComp+otherDue-dedAdv-dedCust-otherDed);
  return{ok,days,years,period:ok?ymd(d.start,d.last):{y:0,m:0,d:0},wage,full:r2(full),factor,award,leaveComp,otherDue,adv,cust,custVal,dedAdv,dedCust,otherDed,net};
}
const factorText=f=>f===1?t('eos_fFull'):f===0?t('eos_fNone'):f<0.5?t('eos_fThird'):t('eos_fTwoThirds');
function eosDefaults(e){
  const st=e.settlement;if(st&&st.input)return Object.assign({},st.input);
  const last=dayKey(Date.now()),start=e.hire||'';
  // leave before the employee was added here is not recorded, so only estimate the balance from then on
  const added=e.createdAt?dayKey(e.createdAt):last,from=isDay(start)&&start>added?start:added;
  const yrs=Math.max(0,(dayDiff(from,last)+1)/365);
  const per=(e.contract&&+e.contract.leave)||21;
  const used=(S.leaves||[]).filter(l=>l.emp===e.id&&l.type==='annual'&&l.status==='approved').reduce((s,l)=>s+leaveDays(l),0);
  return{start,last,reason:'contract',wage:payTotal(e)||'',leaveDays:Math.max(0,Math.round(yrs*per-used)),otherDue:'',otherDed:'',dedAdv:true,dedCust:false,note:''};
}
function eosSheet(){
  const e=empById(S.openEos);if(!e)return'';
  const d=S.eosDraft,c=eosCalc(e,d);
  const ei=(f,label,type,extra)=>`<label><span class="hint">${esc(label)}</span><input class="field${type==='number'?' num':''}" type="${type||'text'}" id="eos-${f}" data-in="eosF" data-f="${f}" value="${esc(d[f]??'')}" ${type==='number'?'dir="ltr" inputmode="decimal"':''} ${extra||''}></label>`;
  const line=(l,v,cls)=>`<div class="eos-line ${cls||''}"><span>${l}</span><b class="num">${esc(sar2(v))} ${t('sar')}</b></div>`;
  const body=`${e.status==='left'&&e.settlement?`<div class="note-bar" style="margin-bottom:12px">${esc(t('eos_already',{d:dateLabel(e.endDate||e.settlement.input.last)}))}</div>`:''}
  <div class="sl-grid hr-grid">
    ${ei('start',t('hr_hire'),'date')}${ei('last',t('eos_last'),'date')}
    <label><span class="hint">${t('eos_reason')}</span><select class="field" id="eos-reason" data-in="eosF" data-f="reason">${EOS_REASONS.map(r=>`<option value="${r}" ${d.reason===r?'selected':''}>${esc(t('er_'+r))}</option>`).join('')}</select></label>
    ${ei('wage',t('eos_wage')+' ('+t('sar')+')','number')}
    ${ei('leaveDays',t('eos_leaveDays'),'number')}${ei('otherDue',t('eos_otherDue')+' ('+t('sar')+')','number')}
    ${ei('otherDed',t('eos_otherDed')+' ('+t('sar')+')','number')}
  </div>
  <div class="hint" style="margin-top:6px">${esc(t('eos_wageHint'))}</div>
  ${c.adv>0?`<label class="eos-chk"><input type="checkbox" id="eos-dedAdv" ${d.dedAdv?'checked':''}> ${esc(t('eos_dedAdv',{n:sar2(c.adv)}))}</label>`:''}
  ${c.cust.length?`<div class="eos-warn"><b>${esc(t('eos_custWarn'))}</b> ${c.cust.map(x=>esc(x.item)+(x.value?' ('+esc(sar(x.value))+')':'')).join('، ')}
    ${c.custVal>0?`<label class="eos-chk"><input type="checkbox" id="eos-dedCust" ${d.dedCust?'checked':''}> ${esc(t('eos_dedCust',{n:sar2(c.custVal)}))}</label>`:''}</div>`:''}
  <div class="eos-sum" id="eosSum">${eosSummary(c)}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="eos-note" rows="2" dir="auto" data-in="eosF" data-f="note">${esc(d.note||'')}</textarea></label>`;
  const foot=`<button class="btn btn-ghost" data-act="eosBack">${t('ct_backEmp')}</button><span class="spacer"></span>
    ${e.status==='left'&&e.settlement?`<button class="btn btn-ghost" data-act="eosReinstate">${S.confirm==='reinstate'?t('eos_reinstateConfirm'):t('eos_reinstate')}</button>`:''}
    <button class="btn btn-bad" data-act="eosDo" ${S.busy?'disabled':''}>${S.confirm==='eos'?t('eos_confirm'):e.status==='left'&&e.settlement?t('eos_reprint'):t('eos_do')}</button>`;
  return hrSheetWrap(t('eos_title')+': '+e.name,body,foot);
}
function eosSummary(c){
  const line=(l,v,cls)=>`<div class="eos-line ${cls||''}"><span>${esc(l)}</span><b class="num">${esc(sar2(v))} ${t('sar')}</b></div>`;
  if(!c.ok)return`<div class="hint">${esc(t('eos_needDates'))}</div>`;
  return`<div class="eos-line"><span>${esc(t('eos_period'))}</span><b>${esc(ymdText(c.period))}</b></div>
    ${line(t('eos_award')+' — '+factorText(c.factor),c.award)}
    ${c.leaveComp?line(t('eos_leaveComp'),c.leaveComp):''}${c.otherDue?line(t('eos_otherDue'),c.otherDue):''}
    ${c.dedAdv?line(t('eos_minusAdv'),-c.dedAdv,'minus'):''}${c.dedCust?line(t('eos_minusCust'),-c.dedCust,'minus'):''}${c.otherDed?line(t('eos_otherDed'),-c.otherDed,'minus'):''}
    ${line(c.net<0?t('eos_netOwed'):t('eos_net'),Math.abs(c.net),'net')}`;
}
function settlementHtml(e,d,c,co){
  const h=esc,n=x=>(+x||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const dt=k=>isDay(k)?k.split('-').reverse().join('/'):'—';
  const AR={contract:'انتهاء مدة العقد',resign:'استقالة',employer:'إنهاء من صاحب العمل',mutual:'اتفاق الطرفين',art80:'فصل وفق المادة 80',other:'أخرى'};
  const EN={contract:'End of contract term',resign:'Resignation',employer:'Terminated by employer',mutual:'Mutual agreement',art80:'Dismissal under Article 80',other:'Other'};
  const fr=c.factor===1?['كاملة','full']:c.factor===0?['لا تستحق','not due']:c.factor<0.5?['ثلث المكافأة','one third']:['ثلثا المكافأة','two thirds'];
  const pl=e.branch==='@wh'?'المستودع / Warehouse':e.branch==='@office'?'الإدارة / Head office':(e.branch||'—');
  const per=c.period,perAr=`${per.y} سنة، ${per.m} شهر، ${per.d} يوم`,perEn=`${per.y} y, ${per.m} m, ${per.d} d`;
  const rows=[['مكافأة نهاية الخدمة ('+fr[0]+')','End-of-service award ('+fr[1]+')',c.award],
    ['بدل رصيد الإجازات ('+n(d.leaveDays).replace('.00','')+' يوم)','Unused leave ('+n(d.leaveDays).replace('.00','')+' days)',c.leaveComp],
    ['مستحقات أخرى','Other dues',c.otherDue],['خصم السلف المتبقية','Less: outstanding advances',-c.dedAdv],
    ['خصم العهد غير المسترجعة','Less: unreturned custody items',-c.dedCust],['خصومات أخرى','Other deductions',-c.otherDed]].filter(r=>r[2]);
  let logo='https://fllow-maskob.web.app/maskob-wordmark.png';
  try{if(/^https?:$/.test(location.protocol))logo=new URL('maskob-wordmark.png',location.href).href}catch(x){}
  const coName=co.name||'مسكوب';
  const info=[['الموظف','Employee',h(e.name)],['الرقم الوظيفي','Employee no.',h(e.no||'—')],['رقم الهوية / الإقامة','ID / Iqama',h(e.idNo||'—')],['الجنسية','Nationality',h(e.nat||'—')],
    ['المهنة','Job',h(e.job||'—')],['مكان العمل','Workplace',h(pl)],['تاريخ المباشرة','Start date',dt(d.start)],['آخر يوم عمل','Last working day',dt(d.last)],
    ['مدة الخدمة','Length of service',perAr+' / '+perEn],['سبب انتهاء الخدمة','Reason',AR[d.reason]+' / '+EN[d.reason]],['الأجر المعتمد للحساب','Wage used',n(c.wage)+' SAR']];
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مخالصة نهائية - ${h(e.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:"IBM Plex Sans Arabic",Arial,sans-serif;color:#13233a;margin:0;font-size:12.5px;line-height:1.7}
.top{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0758A7;padding-bottom:10px;margin-bottom:6px}
.top img{height:40px}.top .meta{font-size:11.5px;color:#4a5b73;text-align:left}.bar{height:3px;width:90px;background:#EF8A22;margin:0 0 14px auto}
h1{font-size:22px;margin:0;color:#0758A7;font-weight:800}h1 small{display:block;font-size:13px;color:#4a5b73;font-weight:500}
table{width:100%;border-collapse:collapse;margin-bottom:14px}td,th{border:1px solid #c9d5e3;padding:6px 10px}th{background:#e6eff9;color:#0758A7;text-align:start}
.info td:first-child{width:34%;background:#f4f7fb;font-weight:700}.v{text-align:center;direction:ltr;font-weight:700;width:30%}
.neg{color:#b3261e}.net td{background:#fdf1e3;font-weight:800;font-size:14px}
.decl{border:1px solid #c9d5e3;border-radius:8px;padding:10px 12px;margin-bottom:6px}.decl .en{direction:ltr;text-align:left;color:#33445c;margin-top:6px}
.sig{display:flex;gap:30px;margin-top:22px}.sig div{flex:1;border:1px solid #c9d5e3;border-radius:8px;padding:10px 12px;min-height:110px}.sig b{color:#0758A7}
.line{border-bottom:1px dashed #8a9ab0;height:34px;margin-bottom:4px}.foot{margin-top:14px;font-size:10.5px;color:#6b7a90;text-align:center}
</style></head><body>
${letterhead(co,'مخالصة نهائية','Final Settlement',dt(dayKey(Date.now()))+(e.no?' &nbsp;·&nbsp; #'+h(e.no):''))}
<div class="bar"></div>
<table class="info">${info.map(r=>`<tr><td>${r[0]} / ${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
<table><thead><tr><th>البند / Item</th><th style="text-align:center">المبلغ (ريال) / Amount (SAR)</th></tr></thead><tbody>
${rows.map(r=>`<tr><td>${r[0]} / ${r[1]}</td><td class="v ${r[2]<0?'neg':''}">${r[2]<0?'(':''}${n(Math.abs(r[2]))}${r[2]<0?')':''}</td></tr>`).join('')}
<tr class="net"><td>${c.net<0?'المبلغ المستحق على الموظف / Amount owed by employee':'صافي المستحق للموظف / Net amount due to employee'}</td><td class="v">${n(Math.abs(c.net))}</td></tr></tbody></table>
${d.note?`<div class="decl">${h(d.note)}</div>`:''}
<div class="decl">أقر أنا الموظف الموقع أدناه بأنني استلمت من ${h(coName)} كامل مستحقاتي المذكورة أعلاه عن مدة خدمتي، وأنه لا يحق لي المطالبة بأي حقوق أخرى بعد ذلك، وهذه مخالصة نهائية مني بذلك.
<div class="en">I, the undersigned employee, confirm that I have received from ${h(co.nameEn||coName)} all my dues stated above for my period of service, that I have no further claims, and that this is my final settlement.</div></div>
<div class="sig"><div><b>الموظف / Employee</b><div>${h(e.name)}</div><div class="line"></div>التوقيع والتاريخ / Signature &amp; date</div>
<div><b>عن المنشأة / For the company</b><div>${h(coName)}${co.rep?' — '+h(co.rep):''}</div><div class="line"></div>التوقيع والختم / Signature &amp; stamp</div></div>
${letterfoot(co)}
<script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print()},250)})}<\/script>
</body></html>`;
}
Object.assign(A,{
  hrEos(){const e=empById(S.openEmp);if(!e)return;S.openEmp=null;S.hrDraft=null;S.openEos=e.id;S.confirm=null;S.eosDraft=eosDefaults(e);render()},
  eosBack(){const e=empById(S.openEos);S.openEos=null;S.confirm=null;if(e){S.openEmp=e.id;S.hrDraft=Object.assign({},e)}render()},
  eosDo(){
    const e=empById(S.openEos);if(!e)return;const d=S.eosDraft,c=eosCalc(e,d);
    if(!c.ok){toast(t('eos_needDates'));return}
    if(!(c.wage>0)){toast(t('eos_needWage'));return}
    const again=e.status==='left'&&e.settlement;
    if(!again&&S.confirm!=='eos'){S.confirm='eos';render();return}
    const win=window.open('','_blank');
    printHtml(settlementHtml(e,d,c,coInfo()),win);
    if(again){S.confirm=null;return}
    const tm=nowIso();
    const settlement={input:Object.assign({},d),award:c.award,leaveComp:c.leaveComp,otherDue:c.otherDue,dedAdv:c.dedAdv,dedCust:c.dedCust,otherDed:c.otherDed,net:c.net,factor:c.factor,at:tm};
    guard(async()=>{
      await X.upd('employees',e.id,{status:'left',endDate:d.last,endReason:d.reason,hire:e.hire||d.start,settlement,updatedAt:tm});
      if(c.dedAdv)for(const a of(S.advances||[]).filter(a=>a.emp===e.id&&advRemain(a)>0))
        await X.upd('advances',a.id,{payments:[...(a.payments||[]),{date:d.last,amount:advRemain(a),settle:true}],status:'closed',updatedAt:tm});
      if(c.dedCust)for(const x of c.cust)await X.upd('custody',x.id,{status:'deducted',returnedAt:d.last,updatedAt:tm});
      S.openEos=null;S.confirm=null;
    },()=>t('eos_done',{n:e.name}));
  },
  eosReinstate(){const e=empById(S.openEos);if(!e)return;
    if(S.confirm!=='reinstate'){S.confirm='reinstate';render();return}
    guard(async()=>{await X.upd('employees',e.id,{status:'active',endDate:'',endReason:'',settlement:null,updatedAt:nowIso()});S.openEos=null;S.confirm=null},()=>t('eos_reinstated'))},
  hrShow(el){S.hrShow=el.dataset.k;render()}
});
document.addEventListener('input',ev=>{
  const el=ev.target;if(!(el.dataset&&el.dataset.in==='eosF'))return;
  S.eosDraft[el.dataset.f]=el.value;if(S.confirm==='eos'){S.confirm=null;const b=document.querySelector('[data-act="eosDo"]');if(b)b.textContent=t('eos_do')}
  const e=empById(S.openEos),o=document.getElementById('eosSum');if(e&&o)o.innerHTML=eosSummary(eosCalc(e,S.eosDraft));
});
document.addEventListener('change',ev=>{
  const el=ev.target;if(el.id!=='eos-dedAdv'&&el.id!=='eos-dedCust')return;
  S.eosDraft[el.id==='eos-dedAdv'?'dedAdv':'dedCust']=el.checked;
  const e=empById(S.openEos),o=document.getElementById('eosSum');if(e&&o)o.innerHTML=eosSummary(eosCalc(e,S.eosDraft));
});

/* ---------- company licenses and contracts (التراخيص والعقود) ---------- */
const LIC_TYPES={license:['municipal','civil','cr','chamber','zakat','gosi','health','sign','other'],contract:['lease','maintenance','supply','cleaning','insurance','service','other']};
const licLeft=l=>isDay(l.expiry)?dayDiff(dayKey(Date.now()),l.expiry):null;
const licState=l=>{const n=licLeft(l);return n==null?'none':n<0?'expired':n<=HR_WARN?'soon':'valid'};
const licTypeL=l=>t((l.kind==='contract'?'ct_':'li_')+'t_'+(l.type||'other'));
function licensesView(){
  const f=S.liFilter||'all';
  const all=[...(S.licenses||[])].sort((a,b)=>String(a.expiry||'9999').localeCompare(String(b.expiry||'9999')));
  const list=f==='soon'?all.filter(l=>['expired','soon'].includes(licState(l))):f==='all'?all:all.filter(l=>l.kind===f);
  const n=k=>all.filter(l=>licState(l)===k).length;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_lic')}</h2><div class="row">${ioBtns('licenses')}<button class="btn btn-ghost rp-btn" data-act="liNew" data-k="contract">+ ${t('li_addContract')}</button><button class="btn btn-sun" data-act="liNew" data-k="license">+ ${t('li_addLicense')}</button></div></div>
  <div class="stats">${kpi(t('li_licenses'),sar(all.filter(l=>l.kind!=='contract').length))}${kpi(t('li_contracts'),sar(all.filter(l=>l.kind==='contract').length))}${kpi(t('li_soon'),sar(n('soon')),n('soon')?'hot':'')}${kpi(t('li_expired'),sar(n('expired')),n('expired')?'hot':'')}</div>
  <div class="filters">${[['all','f_all'],['license','li_licenses'],['contract','li_contracts'],['soon','li_needAction']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="liFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(l=>{const st=licState(l),left=licLeft(l);return`<button class="oc ${st==='expired'?'late':''}" data-act="liOpen" data-id="${esc(l.id)}">
    <span style="min-width:0"><span class="t">${esc(l.title||licTypeL(l))} ${l.title?`<span class="tag">${esc(licTypeL(l))}</span>`:''}${l.hasFile?' <span class="hint">📎</span>':''}</span>
      <span class="s">${esc(placeL(l.place))}${l.party?' · '+esc(l.party):''}${l.number?' · <span dir="ltr">'+esc(l.number)+'</span>':''}</span>
      <span class="s">${l.expiry?esc(t('hr_expiry'))+': '+esc(dateLabel(l.expiry))+' — '+esc(leftLabel(left)):esc(t('li_noExpiry'))}</span></span>
    <span class="side"><span class="pill li-${st}">${esc(t('ls2_'+st))}</span></span></button>`}).join(''):`<div class="empty">${esc(t('li_none'))}</div>`}</div>`;
}
function licenseSheet(){
  const isNew=S.openLic==='new',l=isNew?null:(S.licenses||[]).find(x=>x.id===S.openLic);if(!isNew&&!l)return'';
  const d=S.hrDraft||{};const kind=d.kind==='contract'?'contract':'license';
  const file=S.liFile;const shown=file&&file.data?file.data:(l&&S.liFiles&&S.liFiles[l.id]);
  const body=`<div class="kind" style="margin-bottom:12px">${['license','contract'].map(k=>`<button aria-pressed="${kind===k}" data-act="liKind" data-k="${k}">${esc(t(k==='license'?'li_license':'li_contract'))}</button>`).join('')}</div>
  <div class="sl-grid hr-grid">
    ${hrSel('type',t('li_type'),LIC_TYPES[kind].map(k=>[k,t((kind==='contract'?'ct_':'li_')+'t_'+k)]))}${hrIn('title',t('li_title'))}
    ${hrIn('number',t(kind==='contract'?'li_cnum':'li_num'),'text','dir="ltr"')}${hrSel('place',t('hr_branch'),[['@all',t('li_allPlaces')],...hrPlaces().map(p=>[p,placeL(p)])])}
    ${hrIn('party',t(kind==='contract'?'li_party':'li_issuer'))}${kind==='contract'?hrIn('amount',t('li_amount')+' ('+t('sar')+')','number'):''}
    ${hrIn('start',t(kind==='contract'?'ct_start':'li_issued'),'date')}${hrIn('expiry',t('hr_expiry'),'date')}
  </div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>
  <div class="m-photos" style="margin-top:10px">${shown?`<a class="m-thumb" href="${shown}" target="_blank" rel="noopener"><img src="${shown}" alt=""></a>`:(l&&l.hasFile&&!file?`<span class="hint">${t('checking')}</span>`:'')}
    <label class="m-add"><input type="file" id="liFile" accept="image/*" ${S.mBusy?'disabled':''}><span>${S.mBusy?esc(t('checking')):'📎 '+esc(t(shown||(l&&l.hasFile)?'li_replaceFile':'li_addFile'))}</span></label></div>
  ${l&&(l.history||[]).length?`<h4 class="hr-sub">${t('li_history')}</h4><div class="hint">${l.history.map(h=>esc(dateLabel(h.start||''))+' ← '+esc(dateLabel(h.expiry||''))).join('<br>')}</div>`:''}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="liDel">${S.confirm==='liDel'?t('li_delConfirm'):t('del')}</button><button class="btn btn-ghost" data-act="liRenew">${t('li_renew')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="liSave" ${S.busy||S.mBusy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t(kind==='contract'?'li_addContract':'li_addLicense'):(l.title||licTypeL(l)),body,foot);
}
Object.assign(A,{
  liNew(el){S.openLic='new';S.confirm=null;S.liFile=null;const kind=el.dataset.k==='contract'?'contract':'license';S.hrDraft={kind,type:LIC_TYPES[kind][0],place:'@all'};render()},
  liOpen(el){const l=(S.licenses||[]).find(x=>x.id===el.dataset.id);if(!l)return;S.openLic=l.id;S.confirm=null;S.liFile=null;S.hrDraft=Object.assign({},l);render();
    if(l.hasFile&&!(S.liFiles&&S.liFiles[l.id]))X.liFileGet(l.id).then(f=>{(S.liFiles||(S.liFiles={}))[l.id]=f;render()}).catch(()=>{})},
  liKind(el){S.hrDraft=S.hrDraft||{};const k=el.dataset.k;if(S.hrDraft.kind!==k){S.hrDraft.kind=k;S.hrDraft.type=LIC_TYPES[k][0]}render()},
  liFilter(el){S.liFilter=el.dataset.k;render()},
  liRenew(){const d=S.hrDraft;if(!d)return;
    if(isDay(d.expiry)){const s=fromKey(d.expiry);s.setDate(s.getDate()+1);const ns=dayKey(s);
      d._renewFrom={start:d.start||'',expiry:d.expiry};d.start=ns;d.expiry=addYear(ns)}
    toast(t('li_renewHint'));render()},
  liSave(){
    const d=S.hrDraft||{};const kind=d.kind==='contract'?'contract':'license';
    if(!String(d.title||'').trim()&&!d.type){toast(t('li_need'));return}
    if(isDay(d.start)&&isDay(d.expiry)&&d.expiry<d.start){toast(t('lv_badDates'));return}
    const id=S.openLic==='new'?hrId('LC'):S.openLic;const old=(S.licenses||[]).find(x=>x.id===id)||{};const tm=nowIso();
    const data={kind,type:LIC_TYPES[kind].includes(d.type)?d.type:'other',title:String(d.title||'').trim(),number:String(d.number||'').trim(),place:d.place||'@all',
      party:String(d.party||'').trim(),amount:kind==='contract'&&d.amount!==''&&d.amount!=null?num(d.amount):null,start:isDay(d.start)?d.start:'',expiry:isDay(d.expiry)?d.expiry:'',
      note:String(d.note||'').trim(),hasFile:!!(old.hasFile||(S.liFile&&S.liFile.data)),history:old.history||[],updatedAt:tm,createdAt:old.createdAt||tm};
    if(d._renewFrom&&(d._renewFrom.expiry!==data.expiry))data.history=[...data.history,Object.assign({},d._renewFrom,{at:tm})];
    const f=S.liFile&&S.liFile.data;
    guard(async()=>{await X.put('licenses',id,data);if(f){await X.liFilePut(id,f);(S.liFiles||(S.liFiles={}))[id]=f}
      S.openLic=null;S.hrDraft=null;S.liFile=null},()=>t('li_saved'));
  },
  liDel(){const id=S.openLic;if(!id||id==='new')return;if(S.confirm!=='liDel'){S.confirm='liDel';render();return}
    guard(async()=>{await X.liFileDel(id);await X.del('licenses',id);S.openLic=null;S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('change',async ev=>{
  const el=ev.target;if(el.id!=='liFile'||!el.files||!el.files[0])return;
  S.mBusy=true;render();
  try{S.liFile={data:await compressImage(el.files[0])}}catch(e){toast(t('m_photoFail'))}
  S.mBusy=false;render();
});

const hrId=p=>p+'-'+dayKey(Date.now()).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
Object.assign(A,{
  hrNew(){S.openEmp='new';S.confirm=null;S.hrDraft={branch:S.hrPlace||S.branches[0]||'@office',status:'active'};render()},
  hrOpen(el){const e=empById(el.dataset.id);if(!e)return;S.openEmp=e.id;S.confirm=null;S.hrDraft=Object.assign({},e,{gosi:e.gosi?'yes':''});render();efLoad(e.id)},
  hrSave(){
    const d=S.hrDraft||{};const name=String(d.name||'').trim();if(!name){toast(t('hr_needName'));return}
    if(d.iban&&!ibanOk(d.iban)){toast(t('bk_bad'));return}
    const id=S.openEmp==='new'?hrId('E'):S.openEmp;const data=empData(d,id);
    guard(async()=>{await X.put('employees',id,data);S.openEmp=null;S.hrDraft=null},()=>t('hr_saved'));
  },
  hrDel(){const id=S.openEmp;if(!id||id==='new')return;
    if(S.confirm!=='hrDel'){S.confirm='hrDel';render();return}
    guard(async()=>{await EF.delAll(id).catch(()=>{});await X.del('employees',id);for(const[col,arr]of[['leaves',S.leaves],['custody',S.custody],['advances',S.advances]])for(const r of(arr||[]).filter(x=>x.emp===id))await X.del(col,r.id);S.openEmp=null;S.confirm=null},()=>t('hr_deleted'))},
  async hrXls(){
    const rows=[...(S.emps||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).map(e=>[e.name,e.no||'',placeL(e.branch),e.job||'',e.nat||'',e.phone||'',e.bank||'',ibanFmt(e.iban),e.idNo||'',e.idExp||'',e.healthExp||'',e.contractEnd||'',e.hire||'',e.salary??'',...ALLOWANCES.map(k=>e[k]??''),payTotal(e),t(e.status==='left'?'es_left':'es_active'),e.note||'']);
    const lv=[...(S.leaves||[])].sort((a,b)=>String(b.from).localeCompare(String(a.from))).map(l=>[empName(l.emp),t('lt_'+(l.type||'annual')),l.from,l.to,leaveDays(l),t('ls_'+l.status),l.note||'']);
    await saveXlsx('maskob-hr-'+dayKey(Date.now())+'.xlsx',[
      {name:t('tab_emps'),headers:[t('hr_name'),t('hr_no'),t('hr_branch'),t('hr_job'),t('hr_nat'),t('hr_phone'),t('bk_bank'),t('bk_iban'),t('hr_id'),t('hr_idExp'),t('hr_health'),t('hr_contract'),t('hr_hire'),t('hr_salary'),...ALLOWANCES.map(k=>t(AL_L[k])),t('hr_totalPay'),t('hr_status'),t('hr_note')],rows},
      {name:t('tab_leaves'),headers:[t('lv_emp'),t('lv_type'),t('lv_from'),t('lv_to'),t('hr_daysN'),t('hr_status'),t('hr_note')],rows:lv},
      {name:t('tab_custody'),headers:[t('lv_emp'),t('cu_item'),t('cu_serial'),t('cu_value'),t('cu_given'),t('hr_status'),t('cu_returnedAt'),t('hr_note')],
        rows:(S.custody||[]).map(c=>[empName(c.emp),c.item,c.serial||'',c.value??'',c.given||'',t('cs_'+(c.status||'out')),c.returnedAt||'',c.note||''])},
      {name:t('tab_adv'),headers:[t('lv_emp'),t('av_date'),t('av_amount'),t('av_monthly'),t('av_paid'),t('av_remain'),t('hr_status'),t('hr_note')],
        rows:(S.advances||[]).map(a=>[empName(a.emp),a.date||'',+a.amount||0,a.monthly??'',advPaid(a),advRemain(a),t(advRemain(a)>0?'as_open':'as_closed'),a.note||''])},
      {name:t('tab_lic'),headers:[t('li_type'),t('li_title'),t('li_num'),t('hr_branch'),t('li_party'),t('li_amount'),t('li_issued'),t('hr_expiry'),t('hr_status'),t('hr_note')],
        rows:(S.licenses||[]).map(l=>[t(l.kind==='contract'?'li_contract':'li_license')+' — '+licTypeL(l),l.title||'',l.number||'',placeL(l.place),l.party||'',l.amount??'',l.start||'',l.expiry||'',t('ls2_'+licState(l)),l.note||''])}]);
  },
  hrContract(){
    const win0=null;const d=S.hrDraft||{};if(!String(d.name||'').trim()){toast(t('hr_needName'));return}
    if(d.iban&&!ibanOk(d.iban)){toast(t('bk_bad'));return}
    const id=S.openEmp==='new'?hrId('E'):S.openEmp;const data=empData(d,id);
    guard(async()=>{await X.put('employees',id,data);
      const e=Object.assign({},data,{id});S.openEmp=null;S.hrDraft=null;S.openContract=id;S.ctDraft=contractDefaults(e);
      S.coDraft=Object.assign({name:'مسكوب',cr:'',addr:'',rep:''},S.hrCfg||{})});
  },
  ctBack(){const e=empById(S.openContract);S.openContract=null;if(e){S.openEmp=e.id;S.hrDraft=Object.assign({},e)}render()},
  ctPrint(){
    const e=empById(S.openContract);if(!e)return;const c=S.ctDraft||{},co=S.coDraft||{};
    if(!isDay(c.start)||!isDay(c.end)||c.end<c.start){toast(t('ct_need'));return}
    const ct={start:c.start,end:c.end,probation:Math.max(0,Math.round(num(c.probation))),hours:num(c.hours)||8,days:Math.round(num(c.days))||6,leave:Math.round(num(c.leave))||21,at:nowIso()};
    const cof=coInfo();
    const win=window.open('','_blank');               // open now, while the tap still counts, so pop-up blockers allow it
    printHtml(contractHtml(e,ct,cof),win);
    guard(async()=>{
      await X.upd('employees',e.id,{contract:ct,hire:e.hire||ct.start,contractEnd:ct.end,updatedAt:nowIso()});S.openContract=null;
    },()=>t('ct_done'));
  },
  lvNew(){S.openLeave='new';S.confirm=null;const td=dayKey(Date.now());S.hrDraft={emp:'',type:'annual',from:td,to:td,status:'pending'};render()},
  lvOpen(el){const l=(S.leaves||[]).find(x=>x.id===el.dataset.id);if(!l)return;S.openLeave=l.id;S.confirm=null;S.hrDraft=Object.assign({},l);render()},
  lvStatus(el){S.hrDraft=S.hrDraft||{};S.hrDraft.status=el.dataset.k;render()},
  lvFilter(el){S.lvFilter=el.dataset.k;render()},
  lvSave(){
    const d=S.hrDraft||{};const ok=k=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d[k]||'');
    if(!d.emp||!ok('from')||!ok('to')){toast(t('lv_need'));return}
    if(d.to<d.from){toast(t('lv_badDates'));return}
    const id=S.openLeave==='new'?hrId('L'):S.openLeave;const tm=nowIso();
    const data={emp:d.emp,type:LEAVE_TYPES.includes(d.type)?d.type:'annual',from:d.from,to:d.to,days:leaveDays(d),status:['approved','rejected'].includes(d.status)?d.status:'pending',note:String(d.note||'').trim(),updatedAt:tm,
      createdAt:((S.leaves||[]).find(x=>x.id===id)||{}).createdAt||tm};
    const phId=S.openLeave==='new'?null:S.openLeave;if(typeof phCount==='function'){const _n=phCount('leaves',phId);if(_n!=null)data.photos=_n}
    guard(async()=>{await X.put('leaves',id,data);if(typeof phCommit==='function')await phCommit('leaves',phId,id,'');S.openLeave=null;S.hrDraft=null},()=>t('lv_saved'));
  },
  lvDel(){const id=S.openLeave;if(!id||id==='new')return;
    if(S.confirm!=='lvDel'){S.confirm='lvDel';render();return}
    guard(async()=>{await X.del('leaves',id);S.openLeave=null;S.confirm=null},()=>t('lv_deleted'))}
});
document.addEventListener('input',ev=>{
  const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='hrQ'){S.hrQ=el.value;clearTimeout(S._hrT);S._hrT=setTimeout(render,160);return}
  if(k==='ctF'){S.ctDraft[el.dataset.f]=el.value;return}
  if(k==='coF'){S.coDraft[el.dataset.f]=el.value;return}
  if(k==='hrF'){S.hrDraft=S.hrDraft||{};S.hrDraft[el.dataset.f]=el.value;
    if(el.dataset.f==='salary'||ALLOWANCES.includes(el.dataset.f)){const o=document.getElementById('hrTotal');if(o)o.textContent=sar2(payTotal(S.hrDraft))}
    if(S.openLeave&&(el.dataset.f==='from'||el.dataset.f==='to')){const d=S.hrDraft,o=document.getElementById('lvDays');if(o)o.textContent=d.from&&d.to&&d.to>=d.from?t('hr_days',{n:leaveDays(d)}):''}
    return}
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.id==='hrPlace'){S.hrPlace=el.value;render();return}
});


/* insurance box in the employee file: show the rate when switched on, keep the monthly amount current */
document.addEventListener('input',ev=>{const el=ev.target;if(!(S.openEmp&&el.dataset&&el.dataset.in==='hrF'))return;
  if(el.dataset.f==='gosi'){render();return}
  if(['salary','alHousing','gosiRate'].includes(el.dataset.f)){const o=document.querySelector('#gosiAmt b');if(o)o.textContent=sar2(gosiMonthly(S.hrDraft))}});
