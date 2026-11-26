/* Maskob — Finance department (الإدارة المالية): monthly summary, expenses, supplier invoices,
   and shared access to payroll, payment vouchers and advances.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   expenses/{id}:    {date, place, cat, amount, vat, payee, method, ref, note, createdAt}
   supInvoices/{id}: {supplier, number, date, due, amount, vat, payments:[{date,amount,method,ref,voucher}], note, status open|paid} */
/* expense categories (فئة المصروف) and their items, as in the company's cost study; items marked
   old are kept only so earlier entries still read correctly — they are not offered for new entries */
const EXP_GROUPS=[
  ['cogs',['foodCost','packaging','purchases']],
  ['staff',['wages','tickets','leaveAllow','uniform']],
  ['rentals',['staffHousing','rent']],
  ['energy',['electricity','water','telecom','gas','utilities']],
  ['tech',['pos']],
  ['gov',['municipal','cr','chamber','civil','absher','muqeem','qiwa','mudad','tam','natAddress','staffGov','zakat','gosiSub','gov','iqama','medical']],
  ['clean',['maintenance','cleaning','housingMaint','pest']],
  ['marketing',['marketing','delivery']],
  ['consult',['consult']],
  ['admin',['transport','bank','other']]];
const EXP_OLD=['utilities','gov','iqama','medical'];
const EXP_CATS=EXP_GROUPS.flatMap(g=>g[1]);
const expGroup=c=>(EXP_GROUPS.find(g=>g[1].includes(c))||['admin'])[0];
function expCatSelect(cur){
  return`<label><span class="hint">${t('ex_cat')}</span><select class="field" id="hr-cat" data-in="hrF" data-f="cat">${EXP_GROUPS.map(([g,list])=>`<optgroup label="${esc(t('eg_'+g))}">${list.filter(c=>!EXP_OLD.includes(c)||c===cur).map(c=>`<option value="${c}" ${cur===c?'selected':''}>${esc(t('ec_'+c))}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
}
const INC_CATS=['catering','rebate','other'];
const expLabel=e=>t((e.kind==='income'?'ic_':'ec_')+(e.cat||'other'));
const finTabs=()=>{const due=(S.supInv||[]).filter(i=>supRemain(i)>0&&i.due&&i.due<=dayKey(Date.now())).length;
  return[{k:'fsum',l:t('tab_fsum')},{k:'expenses',l:t('tab_exp')},{k:'supinv',l:t('tab_supinv'),b:due,late:due>0},{k:'payroll',l:t('tab_pr')},{k:'vouchers',l:t('tab_vc')},{k:'advances',l:t('tab_adv')},{k:'pnl',l:t('tab_pnl')},{k:'be',l:t('tab_be')},{k:'costs',l:t('tab_costs')},{k:'assets',l:t('tab_assets')}]};
function financeView(tb){
  if(tb==='expenses')return expensesView();
  if(tb==='supinv')return supInvView();
  if(tb==='payroll')return payrollView();
  if(tb==='vouchers')return vouchersView();
  if(tb==='advances')return advancesView();
  if(tb==='pnl')return pnlView();
  if(tb==='be'&&window.breakEvenView)return breakEvenView();
  if(tb==='costs')return costsView();
  if(tb==='assets')return assetsView();
  return financeSummaryView();
}
const supPaid=i=>(i.payments||[]).reduce((s,p)=>s+(+p.amount||0),0);
const supRemain=i=>Math.max(0,r2p((+i.amount||0)-supPaid(i)));
const inMonth=(d,mk)=>String(d||'').startsWith(mk);

/* ---------- monthly summary ---------- */
function financeCalc(mk){
  const P=payrollCalc(mk);
  const places=[...S.branches,'@wh','@office'];
  const byPlace={};places.forEach(p=>byPlace[p]={sales:0,exp:0,pay:0});
  (S.sales||[]).filter(r=>inMonth(r.date,mk)).forEach(r=>{if(byPlace[r.branch])byPlace[r.branch].sales+=+r.sales||0});
  const exps=(S.expenses||[]).filter(e=>inMonth(e.date,mk)&&e.kind!=='income');
  exps.forEach(e=>{const p=byPlace[e.place]?e.place:'@office';byPlace[p].exp+=+e.amount||0});
  P.rows.forEach(r=>{const p=byPlace[r.branch]?r.branch:'@office';byPlace[p].pay+=(r.gross||0)+(r.reward||0)+(r.ot||0)+(r.add||0)});
  const byCat={};exps.forEach(e=>{const g=expGroup(e.cat||'other');byCat[g]=(byCat[g]||0)+(+e.amount||0)});
  const inv=(S.supInv||[]);
  const purchases=inv.filter(i=>inMonth(i.date,mk)).reduce((s,i)=>s+(+i.amount||0),0);
  const paidSup=inv.reduce((s,i)=>s+(i.payments||[]).filter(p=>inMonth(p.date,mk)).reduce((a,p)=>a+(+p.amount||0),0),0);
  const owed=inv.reduce((s,i)=>s+supRemain(i),0);
  const overdue=inv.filter(i=>supRemain(i)>0&&i.due&&i.due<dayKey(Date.now()));
  const sales=places.reduce((s,p)=>s+byPlace[p].sales,0),exp=exps.reduce((s,e)=>s+(+e.amount||0),0);
  const pay=places.reduce((s,p)=>s+byPlace[p].pay,0);
  return{mk,P,places,byPlace,byCat,sales:r2p(sales),exp:r2p(exp),pay:r2p(pay),purchases:r2p(purchases),paidSup:r2p(paidSup),owed:r2p(owed),overdue,
    net:r2p(sales-exp-pay-purchases)};
}
function financeSummaryView(){
  const mk=S.fnMonth||monthKey(Date.now());const F=financeCalc(mk);
  const money=v=>esc(sar(v))+' <small>'+t('sar')+'</small>';
  const cats=Object.keys(F.byCat).sort((a,b)=>F.byCat[b]-F.byCat[a]);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_fsum')}</h2><div class="row"><input class="field" type="month" id="fnMonth" value="${esc(mk)}" style="width:auto"><button class="btn btn-ghost rp-btn" data-act="fnXls">${t('xlsExport')}</button></div></div>
  <div class="dash-grid">
    <div class="dash-card"><span class="dash-t">${t('fn_sales')}</span><b class="num">${money(F.sales)}</b></div>
    <div class="dash-card"><span class="dash-t">${t('fn_payroll')}</span><b class="num">${money(F.pay)}</b><span class="dash-s">${esc(t(F.P.doc.status==='approved'?'pr_approved':'pr_draft'))}</span></div>
    <div class="dash-card"><span class="dash-t">${t('tab_exp')}</span><b class="num">${money(F.exp)}</b></div>
    <div class="dash-card"><span class="dash-t">${t('fn_purchases')}</span><b class="num">${money(F.purchases)}</b><span class="dash-s">${esc(t('fn_paidSup',{n:sar(F.paidSup)}))}</span></div>
    <div class="dash-card ${F.net<0?'hot':''}"><span class="dash-t">${t('fn_net')}</span><b class="num">${money(F.net)}</b><span class="dash-s">${esc(t('fn_netHint'))}</span></div>
    <div class="dash-card ${F.overdue.length?'hot':''}" data-act="tab" data-k="supinv"><span class="dash-t">${t('fn_owed')}</span><b class="num">${money(F.owed)}</b><span class="dash-s">${F.overdue.length?esc(t('fn_overdueN',{n:F.overdue.length})):''}</span></div>
  </div>
  <div class="rp-sec"><h3>${t('fn_byPlace')}</h3><div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('hr_branch')}</th><th>${t('fn_sales')}</th><th>${t('fn_payroll')}</th><th>${t('tab_exp')}</th><th>${t('fn_result')}</th></tr></thead><tbody>
    ${F.places.filter(p=>F.byPlace[p].sales||F.byPlace[p].exp||F.byPlace[p].pay).map(p=>{const x=F.byPlace[p],n=x.sales-x.pay-x.exp;return`<tr><td><b>${esc(placeL(p))}</b></td><td class="n">${esc(sar(x.sales))}</td><td class="n">${esc(sar(x.pay))}</td><td class="n">${esc(sar(x.exp))}</td><td class="n ${n<0?'mis':''}"><b>${esc(sar(n))}</b></td></tr>`}).join('')||`<tr><td colspan="5" class="hint">${esc(t('fn_noData'))}</td></tr>`}
  </tbody></table></div></div>
  ${cats.length?`<div class="rp-sec"><h3>${t('fn_byCat')}</h3><div class="cmp">${cats.map(c=>`<div class="cmp-row"><b>${esc(t('eg_'+c))}</b><div class="cmp-bar"><i style="width:${Math.round(F.byCat[c]/Math.max(...Object.values(F.byCat))*100)}%"></i></div><span class="num">${esc(sar(F.byCat[c]))}</span></div>`).join('')}</div></div>`:''}`;
}
/* ---------- expenses ---------- */
function expensesView(){
  const mk=S.fnMonth||monthKey(Date.now());const cf=S.expCat||'';
  const list=[...(S.expenses||[])].filter(e=>inMonth(e.date,mk)&&(!cf||expGroup(e.cat)===cf)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const total=list.reduce((s,e)=>s+(+e.amount||0),0),vat=list.reduce((s,e)=>s+(+e.vat||0),0);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_exp')}</h2><div class="row">${window.scanBtn?scanBtn('expenses'):''}${ioBtns('expenses')}<input class="field" type="month" id="fnMonth" value="${esc(mk)}" style="width:auto"><button class="btn btn-sun" data-act="exNew">+ ${t('ex_add')}</button></div></div>
  <div class="stats">${kpi(t('vc_count'),sar(list.length))}${kpi(t('ex_total'),sar2(total)+' '+t('sar'))}${kpi(t('ex_vat'),sar2(vat)+' '+t('sar'))}</div>
  <div class="filters"><button class="chip" aria-pressed="${!cf}" data-act="exCat" data-k="">${t('f_all')}</button>${EXP_GROUPS.map(([g])=>`<button class="chip" aria-pressed="${cf===g}" data-act="exCat" data-k="${g}">${esc(t('eg_'+g))}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(e=>`<button class="oc" data-act="exOpen" data-id="${esc(e.id)}">
    <span style="min-width:0"><span class="t">${esc(expLabel(e))} <span class="tag">${esc(placeL(e.place))}</span>${e.kind==='income'?` <span class="tag ex-inc">${t('ex_income')}</span>`:''}${e.periodFrom?` <span class="hint">${esc(e.periodFrom)} → ${esc(e.periodTo||'')}</span>`:''}</span>
      <span class="s">${esc(dateLabel(e.date))}${e.payee?' · '+esc(e.payee):''}${e.note?' · '+esc(String(e.note).slice(0,60)):''}</span></span>
    <span class="side"><b class="num">${esc(sar2(e.amount))} ${t('sar')}</b></span></button>`).join(''):`<div class="empty">${esc(t('ex_none'))}</div>`}</div>`;
}
function expenseSheet(){
  const isNew=S.openExp==='new';const d=S.hrDraft||{};
  const inc=d.kind==='income';
  const body=`${window.scanBanner?scanBanner():''}<div class="kind" style="margin-bottom:12px">${[['expense','ex_expense'],['income','ex_income']].map(([k,l])=>`<button aria-pressed="${(inc?'income':'expense')===k}" data-act="exKind" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
  <div class="sl-grid hr-grid">${hrIn('date',t('sl_day'),'date')}${inc?hrSel('cat',t('ex_cat'),INC_CATS.map(c=>[c,t('ic_'+c)])):expCatSelect(d.cat)}
    ${hrSel('place',t('hr_branch'),[['@all',t('li_allPlaces')],...hrPlaces().map(p=>[p,placeL(p)])])}${hrIn('payee',t('ex_payee'))}${hrIn('vatNo',t('sc_vatNo'),'text','dir="ltr" inputmode="numeric"')}
    ${hrIn('amount',t('vc_amount')+' ('+t('sar')+')','number')}${hrIn('vat',t('ex_vat')+' ('+t('sar')+')','number')}
    ${hrSel('method',t('vc_method'),PAY_METHODS.map(k=>[k,t('pm_'+k)]))}${hrIn('ref',t('ex_ref'),'text','dir="ltr"')}</div>
  <button class="btn btn-ghost rp-btn" data-act="exVat15" style="margin-top:8px">${t('ex_vat15')}</button>
  <h4 class="hr-sub">${t('ex_period')}</h4><div class="sl-grid hr-grid">${hrIn('periodFrom',t('ex_pFrom'),'month')}${hrIn('periodTo',t('ex_pTo'),'month')}</div><p class="hint">${esc(t('ex_periodHint'))}</p>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>${window.docImgBlock?docImgBlock('expenses',isNew?null:Object.assign({id:S.openExp},(S.expenses||[]).find(x=>x.id===S.openExp))):''}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="exDel">${S.confirm==='exDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="exSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('ex_add'):expLabel(d),body,foot);
}
/* ---------- supplier invoices ---------- */
function supInvView(){
  const f=S.siFilter||'open',today=dayKey(Date.now());
  const all=[...(S.supInv||[])].sort((a,b)=>String(a.due||'9').localeCompare(String(b.due||'9')));
  const list=f==='open'?all.filter(i=>supRemain(i)>0):f==='overdue'?all.filter(i=>supRemain(i)>0&&i.due&&i.due<today):f==='paid'?all.filter(i=>supRemain(i)<=0):all;
  const owed=all.reduce((s,i)=>s+supRemain(i),0),od=all.filter(i=>supRemain(i)>0&&i.due&&i.due<today);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_supinv')}</h2><div class="row">${window.scanBtn?scanBtn('supinv'):''}${ioBtns('supinv')}<button class="btn btn-sun" data-act="siNew">+ ${t('si_add')}</button></div></div>
  <div class="stats">${kpi(t('fn_owed'),sar2(owed)+' '+t('sar'),owed?'hot':'')}${kpi(t('si_overdue'),sar(od.length),od.length?'hot':'')}${kpi(t('si_overdueAmt'),sar2(od.reduce((s,i)=>s+supRemain(i),0))+' '+t('sar'))}</div>
  <div class="filters">${[['open','as_open'],['overdue','si_overdue'],['paid','as_closed'],['all','f_all']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="siFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(i=>{const r=supRemain(i),late=r>0&&i.due&&i.due<today;return`<button class="oc ${late?'late':''}" data-act="siOpen" data-id="${esc(i.id)}">
    <span style="min-width:0"><span class="t">${esc(i.supplier)} ${i.number?`<span class="hint num" dir="ltr">#${esc(i.number)}</span>`:''}</span>
      <span class="s">${esc(dateLabel(i.date))}${i.due?' · '+esc(t('si_due'))+': '+esc(dateLabel(i.due)):''} · ${esc(t('av_remain'))}: ${esc(sar2(r))} ${t('sar')}</span>
      <span class="ad-bar"><i style="width:${+i.amount?Math.round(supPaid(i)/ +i.amount*100):0}%"></i></span></span>
    <span class="side"><b class="num">${esc(sar2(i.amount))}</b><span class="pill ${r<=0?'ms-done':late?'li-expired':'ms-progress'}">${esc(t(r<=0?'as_closed':late?'si_overdue':'as_open'))}</span></span></button>`}).join(''):`<div class="empty">${esc(t('si_none'))}</div>`}</div>`;
}
function supInvSheet(){
  const isNew=S.openSi==='new';const d=S.hrDraft||{};const inv=isNew?null:(S.supInv||[]).find(x=>x.id===S.openSi);if(!isNew&&!inv)return'';
  const p=S.siPay||{};
  const pays=isNew?'':`<h4 class="hr-sub">${t('av_payments')}</h4>
    <div class="ct-pay"><span>${t('av_paid')}: <b class="num">${esc(sar2(supPaid(inv)))}</b></span><span class="ct-tot">${t('av_remain')}: <b class="num">${esc(sar2(supRemain(inv)))} ${t('sar')}</b></span></div>
    ${(inv.payments||[]).map((x,i)=>`<div class="hint">${esc(dateLabel(x.date))} · <b class="num">${esc(sar2(x.amount))}</b> · ${esc(t('pm_'+(x.method||'bank')))}${x.ref?' · <span dir="ltr">'+esc(x.ref)+'</span>':''}${x.voucher?' · '+esc(t('vc_title'))+' #'+esc(x.vno||''):''}</div>`).join('')}
    ${supRemain(inv)>0?`<div class="row ad-pay"><input class="field" type="date" id="si-payDate" data-in="siP" data-f="date" value="${esc(p.date||dayKey(Date.now()))}" style="flex:1;min-width:140px">
      <input class="field num" id="si-payAmt" data-in="siP" data-f="amount" inputmode="decimal" dir="ltr" placeholder="${esc(sar2(supRemain(inv)))}" value="${esc(p.amount||'')}" style="flex:1;min-width:110px">
      <select class="field" id="si-payMethod" data-in="siP" data-f="method" style="flex:1;min-width:120px">${PAY_METHODS.map(k=>`<option value="${k}" ${(p.method||'bank')===k?'selected':''}>${esc(t('pm_'+k))}</option>`).join('')}</select>
      <button class="btn btn-navy" data-act="siPay">${t('av_pay')}</button></div><p class="hint">${esc(t('si_payHint'))}</p>`:''}`;
  const body=`${window.scanBanner?scanBanner():''}<div class="sl-grid hr-grid">${hrIn('supplier',t('st_supplier'))}${hrIn('vatNo',t('sc_vatNo'),'text','dir="ltr" inputmode="numeric"')}${hrIn('number',t('st_invoice'),'text','dir="ltr"')}
    ${hrIn('date',t('si_date'),'date')}${hrIn('due',t('si_due'),'date')}
    ${hrIn('amount',t('si_amount')+' ('+t('sar')+')','number')}${hrIn('vat',t('ex_vat')+' ('+t('sar')+')','number')}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>${window.docImgBlock?docImgBlock('supInvoices',inv):''}${pays}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="siDel">${S.confirm==='siDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="siSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('si_add'):inv.supplier,body,foot);
}
Object.assign(A,{
  fnXls(){const F=financeCalc(S.fnMonth||monthKey(Date.now()));
    saveXlsx('maskob-finance-'+F.mk+'.xlsx',[
      {name:t('tab_fsum'),headers:[t('fn_item'),t('vc_amount')],rows:[[t('fn_sales'),F.sales],[t('fn_payroll'),F.pay],[t('tab_exp'),F.exp],[t('fn_purchases'),F.purchases],[t('fn_net'),F.net],[t('fn_paidSupL'),F.paidSup],[t('fn_owed'),F.owed]]},
      {name:t('fn_byPlace'),headers:[t('hr_branch'),t('fn_sales'),t('fn_payroll'),t('tab_exp'),t('fn_result')],rows:F.places.map(p=>{const x=F.byPlace[p];return[placeL(p),r2p(x.sales),r2p(x.pay),r2p(x.exp),r2p(x.sales-x.pay-x.exp)]})},
      {name:t('tab_exp'),headers:[t('sl_day'),t('ex_cat'),t('hr_branch'),t('ex_payee'),t('vc_amount'),t('ex_vat'),t('vc_method'),t('ex_ref'),t('hr_note')],
        rows:(S.expenses||[]).filter(e=>inMonth(e.date,F.mk)).map(e=>[e.date,expLabel(e),placeL(e.place),e.payee||'',+e.amount||0,+e.vat||0,t('pm_'+(e.method||'cash')),e.ref||'',e.note||''])}])},
  exNew(){S.openExp='new';S.confirm=null;S.docImg=null;S.scanInfo=null;S.hrDraft={date:dayKey(Date.now()),cat:S.expCat?(EXP_GROUPS.find(g=>g[0]===S.expCat)||[0,['other']])[1][0]:'other',place:'@office',payee:'',amount:'',vat:'',method:'cash',ref:'',note:''};render()},
  exOpen(el){const e=(S.expenses||[]).find(x=>x.id===el.dataset.id);if(!e)return;S.openExp=e.id;S.confirm=null;S.docImg=null;S.scanInfo=null;S.hrDraft=Object.assign({},e);render()},
  exCat(el){S.expCat=el.dataset.k;render()},
  exKind(el){const d=S.hrDraft;d.kind=el.dataset.k;d.cat=d.kind==='income'?'other':'other';render()},
  exVat15(){const d=S.hrDraft;const a=num(d.amount);if(!(a>0))return;d.vat=String(r2p(a*15/115));const o=document.getElementById('hr-vat');if(o)o.value=d.vat},
  exSave(){const d=S.hrDraft||{};const amount=num(d.amount);if(!(amount>0)){toast(t('vc_need'));return}
    if(!(!d.vatNo||/^3[0-9]{13}3$/.test(String(d.vatNo).trim()))){toast(t('sc_badVat'));return}
    const id=S.openExp==='new'?hrId('X'):S.openExp;const old=(S.expenses||[]).find(x=>x.id===id)||{};const tm=nowIso();
    const kind=d.kind==='income'?'income':'expense',okM=v=>/^[0-9]{4}-[0-9]{2}$/.test(v||'');
    if(okM(d.periodFrom)!==okM(d.periodTo)||(okM(d.periodFrom)&&d.periodTo<d.periodFrom)){toast(t('lv_badDates'));return}
    const data={kind,periodFrom:okM(d.periodFrom)?d.periodFrom:'',periodTo:okM(d.periodTo)?d.periodTo:'',date:isDay(d.date)?d.date:dayKey(Date.now()),cat:(kind==='income'?INC_CATS:EXP_CATS).includes(d.cat)?d.cat:'other',place:d.place||'@office',payee:String(d.payee||'').trim(),vatNo:String(d.vatNo||'').trim(),hasFile:!!(old.hasFile||S.docImg),amount,
      vat:d.vat===''||d.vat==null?null:num(d.vat),method:PAY_METHODS.includes(d.method)?d.method:'cash',ref:String(d.ref||'').trim(),note:String(d.note||'').trim(),createdAt:old.createdAt||tm,updatedAt:tm};
    const img=S.docImg;
    guard(async()=>{await X.put('expenses',id,data);if(img&&typeof DOC_FILES!=='undefined'){await DOC_FILES.put('expenses',id,img);(S.docImgs||(S.docImgs={}))['expenses/'+id]=img}
      S.openExp=null;S.hrDraft=null;S.docImg=null;S.scanInfo=null},()=>t('st_saved'))},
  exDel(){const id=S.openExp;if(!id||id==='new')return;if(S.confirm!=='exDel'){S.confirm='exDel';render();return}
    guard(async()=>{if(typeof DOC_FILES!=='undefined')await DOC_FILES.del('expenses',id);await X.del('expenses',id);S.openExp=null;S.confirm=null},()=>t('li_deleted'))},
  siNew(){S.openSi='new';S.confirm=null;S.siPay=null;S.docImg=null;S.scanInfo=null;S.hrDraft={supplier:'',number:'',date:dayKey(Date.now()),due:'',amount:'',vat:'',note:''};render()},
  siOpen(el){const i=(S.supInv||[]).find(x=>x.id===el.dataset.id);if(!i)return;S.openSi=i.id;S.confirm=null;S.siPay=null;S.docImg=null;S.scanInfo=null;S.hrDraft=Object.assign({},i);render()},
  siFilter(el){S.siFilter=el.dataset.k;render()},
  siSave(){const d=S.hrDraft||{};const amount=num(d.amount);const supplier=String(d.supplier||'').trim();
    if(!supplier||!(amount>0)){toast(t('si_need'));return}
    if(!(!d.vatNo||/^3[0-9]{13}3$/.test(String(d.vatNo).trim()))){toast(t('sc_badVat'));return}
    const id=S.openSi==='new'?hrId('SI'):S.openSi;const old=(S.supInv||[]).find(x=>x.id===id)||{};const tm=nowIso();
    const num0=String(d.number||'').trim(),vat0=String(d.vatNo||'').trim();
    if(num0&&S.confirm!=='siDup'&&(S.supInv||[]).some(x=>x.id!==id&&String(x.number||'')===num0&&(vat0&&x.vatNo?x.vatNo===vat0:x.supplier===supplier))){S.confirm='siDup';toast(t('sc_dup'));return}
    const data={supplier,vatNo:String(d.vatNo||'').trim(),hasFile:!!(old.hasFile||S.docImg),number:String(d.number||'').trim(),date:isDay(d.date)?d.date:dayKey(Date.now()),due:isDay(d.due)?d.due:'',amount,vat:d.vat===''||d.vat==null?null:num(d.vat),
      note:String(d.note||'').trim(),payments:old.payments||[],createdAt:old.createdAt||tm,updatedAt:tm};
    data.status=supRemain(data)>0?'open':'paid';
    const img=S.docImg;
    guard(async()=>{await X.put('supInvoices',id,data);if(img&&typeof DOC_FILES!=='undefined'){await DOC_FILES.put('supInvoices',id,img);(S.docImgs||(S.docImgs={}))['supInvoices/'+id]=img}
      S.openSi=null;S.hrDraft=null;S.docImg=null;S.scanInfo=null;S.confirm=null},()=>t('st_saved'))},
  /* a payment is recorded on the invoice and as a payment voucher */
  siPay(){const inv=(S.supInv||[]).find(x=>x.id===S.openSi);if(!inv)return;const p=S.siPay||{};
    const amount=num(p.amount);if(!(amount>0)){toast(t('av_payNeed'));return}
    if(amount>supRemain(inv)+0.001){toast(t('av_payTooMuch'));return}
    const date=isDay(p.date)?p.date:dayKey(Date.now()),method=PAY_METHODS.includes(p.method)?p.method:'bank';
    guard(async()=>{
      const vid=hrId('V'),vno=nextVoucherNo(),tm=nowIso();
      await X.put('vouchers',vid,{no:vno,date,emp:'',payee:inv.supplier,amount,cat:'supplier',method,ref:'',purpose:t('si_payFor',{n:inv.number||inv.supplier}),createdAt:tm,updatedAt:tm});
      const payments=[...(inv.payments||[]),{date,amount,method,voucher:vid,vno}];
      await X.upd('supInvoices',inv.id,{payments,status:(+inv.amount||0)-payments.reduce((s,x)=>s+x.amount,0)>0.001?'open':'paid',updatedAt:tm});
      S.siPay=null},()=>t('si_paid'))},
  siDel(){const id=S.openSi;if(!id||id==='new')return;if(S.confirm!=='siDel'){S.confirm='siDel';render();return}
    guard(async()=>{if(typeof DOC_FILES!=='undefined')await DOC_FILES.del('supInvoices',id);await X.del('supInvoices',id);S.openSi=null;S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='siP'){S.siPay=S.siPay||{};S.siPay[el.dataset.f]=el.value}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='fnMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.fnMonth=el.value;render()}});
/* Excel import / export */
IO.expenses={name:()=>t('tab_exp'),col:'expenses',idp:'X',list:()=>S.expenses||[],
  cols:[['kind','ex_kind',{expense:'ex_expense',income:'ex_income'}],['date','sl_day','date',1],['cat','ex_cat',Object.fromEntries([...EXP_CATS.map(c=>[c,'ec_'+c]),...INC_CATS.filter(c=>c!=='other').map(c=>[c,'ic_'+c])])],['periodFrom','ex_pFrom','month'],['periodTo','ex_pTo','month'],['place','hr_branch','place'],['payee','ex_payee'],['amount','vc_amount','num',1],['vat','ex_vat','num'],
    ['method','vc_method',Object.fromEntries(PAY_METHODS.map(k=>[k,'pm_'+k]))],['ref','ex_ref'],['note','hr_note']],
  match:(r,L)=>L.find(e=>e.date===r.date&&+e.amount===+r.amount&&(e.payee||'')===(r.payee||'')&&(e.cat||'other')===(r.cat||'other')),
  build:(r,o)=>Object.assign({kind:'expense',cat:'other',place:'@office',method:'cash'},o||{},r)};
IO.supinv={name:()=>t('tab_supinv'),col:'supInvoices',idp:'SI',list:()=>S.supInv||[],
  cols:[['supplier','st_supplier','text',1],['number','st_invoice'],['date','si_date','date'],['due','si_due','date'],['amount','si_amount','num',1],['vat','ex_vat','num'],['paid','av_paid','num'],['note','hr_note']],
  get:(i,k)=>k==='paid'?supPaid(i):i[k],
  extra:[['av_remain',i=>supRemain(i)]],
  match:(r,L)=>L.find(i=>i.supplier===r.supplier&&String(i.number||'')===String(r.number||'')),
  build:(r,o)=>{const d=Object.assign({date:dayKey(Date.now())},o||{},r);delete d.paid;
    if(r.paid!=null&&r.paid!==supPaid(o||{}))d.payments=r.paid>0?[{date:d.date,amount:Math.min(r.paid,+d.amount||0),method:'bank'}]:[];else d.payments=(o&&o.payments)||[];
    d.status=supRemain(d)>0?'open':'paid';return d}};
