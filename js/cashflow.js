/* Maskob — cash for finance: a 13-week cash forecast (توقع التدفق النقدي) with the weekly VAT set-aside, the order in
   which to pay, and the monthly close in seven days (الإقفال الشهري) as a checklist, part of it ticked by itself.
   config/finance.cashStart: {amount, date}   opening cash for the forecast
   closes/{YYYY-MM}: {done:{step:{at,by}}, note} */
const CF_WEEKS=13;
const cfWeekStart=d=>{const x=fromKey(d);x.setDate(x.getDate()-x.getDay());return dayKey(x)};
function cfCalc(){const today=dayKey(Date.now()),w0=cfWeekStart(today),vat=VAT_RATE/(100+VAT_RATE);
  const cfg=typeof finCfg==='function'?finCfg():{},start=cfg.cashStart||{};
  /* average weekly sales of the last four full weeks (VAT included, as collected) */
  const from=addDays(w0,-28),last4=(S.sales||[]).filter(r=>r.date>=from&&r.date<w0).reduce((s0,r)=>s0+(+r.sales||0),0),wSales=last4/4;
  /* app sales come in later through the apps' transfers; they are part of the sales figure, so no double count */
  /* the month's people cost from the last payroll */
  const prs=[...(S.payroll||[])].sort((a,c)=>String(c.id).localeCompare(String(a.id)));let payM=0;
  if(prs[0]){const R=typeof payrollCalc==='function'?payrollCalc(prs[0].id):null;payM=R?R.rows.reduce((s0,r)=>s0+(+r.net||0),0):0}
  /* regular monthly expenses: average of the last three months of paid expenses (not supplier invoices) */
  const m3=addDays(today,-90),expM=(S.expenses||[]).filter(e=>e.kind!=='income'&&e.date>=m3&&!(e.terms==='credit'&&!e.paid)).reduce((s0,e)=>s0+(+e.amount||0),0)/3;
  const weeks=[];let bal=+start.amount||0;
  for(let i=0;i<CF_WEEKS;i++){const ws=addDays(w0,i*7),we=addDays(ws,6);
    const sup=(S.supInv||[]).filter(x=>supRemain(x)>0&&(x.due||x.date)>=(i===0?'0000':ws)&&(x.due||x.date)<=we).reduce((s0,x)=>s0+supRemain(x),0);
    const exp=(S.expenses||[]).filter(e=>typeof expUnpaid==='function'&&expUnpaid(e)&&(e.due||e.date)>=(i===0?'0000':ws)&&(e.due||e.date)<=we).reduce((s0,e)=>s0+(+e.amount||0),0);
    const payday=[...Array(7)].some((_,k)=>{const d=addDays(ws,k);return d.slice(8)===String(daysInMonth(d.slice(0,7))).padStart(2,'0')});
    const pay=payday?payM:0,regular=expM/4.33,inflow=wSales,vatSet=wSales*vat;
    const out=sup+exp+pay+regular;bal+=inflow-out;weeks.push({ws,we,inflow,sup,exp,pay,regular,out,vatSet,bal})}
  return{weeks,wSales,payM,expM,start}}
function cashView(){const C=cfCalc(),low=C.weeks.find(w=>w.bal<0);
  return`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_cash')}</h2>
    <div class="row" style="gap:6px"><button class="btn btn-ghost rp-btn" data-act="cfXls">${t('xlsExport')}</button><span class="hint">${t('cf_start')}</span><input class="field num" id="cfStart" inputmode="decimal" dir="ltr" value="${esc(C.start.amount??'')}" style="width:120px"><button class="btn btn-navy rp-btn" data-act="cfSaveStart">${t('waSave')}</button></div></div>
  <p class="hint">${esc(t('cf_hint'))}</p>
  <div class="stats">${kpi(t('cf_wSales'),sar2(C.wSales))}${kpi(t('cf_vatWeek'),sar2(C.wSales*VAT_RATE/(100+VAT_RATE)))}${kpi(t('cf_payM'),sar2(C.payM))}${kpi(t('cf_expM'),sar2(C.expM))}</div>
  ${low?`<div class="box" style="border-color:var(--late)"><b>${esc(t('cf_low',{d:dateLabel(low.ws)}))}</b></div>`:''}
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('cf_week')}</th><th>${t('cf_in')}</th><th>${t('cf_sup')}</th><th>${t('cf_payroll')}</th><th>${t('cf_regular')}</th><th>${t('cf_out')}</th><th>${t('cf_vatSet')}</th><th>${t('cf_bal')}</th></tr></thead><tbody>
  ${C.weeks.map(w=>`<tr><td>${esc(dateLabel(w.ws))}</td><td class="n">${esc(sar2(w.inflow))}</td><td class="n">${esc(sar2(w.sup+w.exp))}</td><td class="n">${w.pay?esc(sar2(w.pay)):'—'}</td><td class="n">${esc(sar2(w.regular))}</td><td class="n">${esc(sar2(w.out))}</td><td class="n">${esc(sar2(w.vatSet))}</td><td class="n ${w.bal<0?'mis':''}"><b>${esc(sar2(w.bal))}</b></td></tr>`).join('')}</tbody></table></div>
  <div class="rp-sec"><h3>${t('cf_order')}</h3><ol class="cf-order">${['cf_o1','cf_o2','cf_o3','cf_o4','cf_o5'].map(k=>`<li>${esc(t(k))}</li>`).join('')}</ol><p class="hint">${esc(t('cf_vatHint'))}</p></div>`}

/* ---------- the monthly close in seven days ---------- */
const CL_STEPS=[['d1','counts'],['d1','sales'],['d2','supinv'],['d2','apps'],['d3','payroll'],['d3','advances'],['d4','assets'],['d4','bank'],['d5','pnl'],['d6','kpi'],['d7','review']];
function clAuto(mk){const br=S.branches,P=(S.payroll||[]).find(p=>p.id===mk);const dim=daysInMonth(mk);
  return{counts:br.length&&br.every(b=>(S.bcounts||[]).some(c=>c.branch===b&&String(c.at).slice(0,7)>=mk))||null,
    sales:br.length&&br.every(b=>(S.sales||[]).filter(r=>r.branch===b&&String(r.date).startsWith(mk)).length>=dim)||null,
    payroll:P&&P.status==='approved'||null,
    supinv:!(S.supInv||[]).some(x=>String(x.date).startsWith(mk)&&!x.supplierId)||null}}
function closeView(){const now=monthKey(Date.now()),def=(()=>{const d=fromKey(now+'-01');d.setMonth(d.getMonth()-1);return monthKey(d)})(),mk=S.clMonth||def;
  const doc=(S.closes||[]).find(x=>x.id===mk)||{},done=doc.done||{},auto=clAuto(mk);
  const n=CL_STEPS.filter(([,k])=>done[k]||auto[k]).length;
  return`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_close')}</h2><input class="field" type="month" id="clMonth" value="${esc(mk)}" style="width:auto"></div>
  <p class="hint">${esc(t('cl_hint'))}</p><div class="stats">${kpi(t('cl_done'),n+' / '+CL_STEPS.length)}</div>
  <div class="list">${CL_STEPS.map(([d,k])=>{const x=done[k],a=auto[k];return`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t"><span class="tag">${esc(t('cl_'+d))}</span> ${esc(t('cl_'+k))}</span>
    <span class="s">${x?esc(t('cl_by',{b:x.by||'',d:when(x.at)})):a?esc(t('cl_auto')):''}</span></span><span class="side"><button class="chip" aria-pressed="${!!(x||a)}" data-act="clTick" data-k="${k}" ${a&&!x?'disabled':''}>${x||a?'✓':''}</button></span></div>`}).join('')}</div>`}
function clLoadDemo(){S.closes=S.role==='finance'?MEM('closes'):[]}
function clStart(u,onErr){if(S.role!=='finance')return;u.push(db.collection('closes').onSnapshot(s=>{S.closes=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}
Object.assign(A,{
  cfSaveStart(){const el=document.getElementById('cfStart'),v=num(el&&el.value);const cfg=Object.assign({},S.finCfg||{},{cashStart:{amount:v,date:dayKey(Date.now())}});
    guard(async()=>{if(S.fb)await db.doc('config/finance').set({cashStart:cfg.cashStart},{merge:true});else MEMSET('fincfg',cfg);S.finCfg=cfg},()=>t('st_saved'))},
  clTick(el){const k=el.dataset.k,now=monthKey(Date.now()),def=(()=>{const d=fromKey(now+'-01');d.setMonth(d.getMonth()-1);return monthKey(d)})(),mk=S.clMonth||def;
    const doc=(S.closes||[]).find(x=>x.id===mk)||{},done=Object.assign({},doc.done||{});if(done[k])delete done[k];else done[k]={at:nowIso(),by:S.userName||roleL(S.realRole||S.role)};
    guard(async()=>{await X.put('closes',mk,{done,updatedAt:nowIso()})},()=>t('st_saved'))}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='clMonth'&&/^\d{4}-\d{2}$/.test(el.value)){S.clMonth=el.value;render()}});
EXT.tabs.push({k:'cash',l:'tab_cash',roles:['finance'],g:'rep',view:cashView},{k:'close',l:'tab_close',roles:['finance'],view:closeView});

A.cfXls=()=>{const C=cfCalc(),f=v=>+(+v||0).toFixed(2);saveXlsx('maskob-cash-forecast.xlsx',[{name:t('tab_cash'),headers:[t('cf_week'),t('cf_in'),t('cf_sup'),t('cf_payroll'),t('cf_regular'),t('cf_out'),t('cf_vatSet'),t('cf_bal')],
  rows:C.weeks.map(w=>[w.ws,f(w.inflow),f(w.sup+w.exp),f(w.pay),f(w.regular),f(w.out),f(w.vatSet),f(w.bal)])}])};
