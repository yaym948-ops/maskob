/* Maskob — delivery apps for finance (تطبيقات التوصيل): each app's sales from the branches' daily closings,
   its commission, what it owes after commission, and the transfers it has made to the bank.
   Loaded by index.html as a classic script after dsr.js.

   config/finance.appFees: {hunger: 20, …}  commission % of the app's sales (as recorded, VAT included)
   appPays/{id}: {app, date, amount, from, to (months the transfer covers), ref, note}
   The commission goes into P&L as "delivery app commissions" (and so into break-even as a variable cost). */
const appFee=k=>{const v=+((finCfg().appFees||{})[k]);return isFinite(v)&&v>0?v:0};
/* an app's sales in a closing: the actual amount when typed, else Foodics */
const appAmt=(r,k)=>{const D=r.dsr||{};const a=(D.a||{})[k],f=(D.f||{})[k];return+(a!=null&&a!==''?a:(f!=null?f:0))||0};
/* commission of one day in one branch (for P&L): app sales × its % */
const appCommission=r=>r.dsr?DSR_APPS.reduce((s,k)=>s+appAmt(r,k)*appFee(k)/100,0):0;
function appStats(rows){
  const by={};DSR_APPS.forEach(k=>by[k]={sales:0,fee:0});
  rows.filter(r=>r.dsr).forEach(r=>DSR_APPS.forEach(k=>{const v=appAmt(r,k);by[k].sales+=v;by[k].fee+=v*appFee(k)/100}));
  DSR_APPS.forEach(k=>{const x=by[k];x.sales=r2p(x.sales);x.fee=r2p(x.fee);x.net=r2p(x.sales-x.fee)});return by;
}
const appPaid=k=>r2p((S.appPays||[]).filter(p=>p.app===k).reduce((s,p)=>s+(+p.amount||0),0));
function appsView(){
  const mk=S.apMonth||monthKey(Date.now()),bf=S.apBranch||'';
  const month=(S.sales||[]).filter(r=>String(r.date).startsWith(mk)&&(!bf||r.branch===bf));
  const M=appStats(month),ALL=appStats(S.sales||[]);
  const keys=DSR_APPS.filter(k=>M[k].sales||ALL[k].sales||appPaid(k)||appFee(k));
  const tot=f=>r2p(keys.reduce((s,k)=>s+M[k][f],0));
  const bal=k=>r2p(ALL[k].net-appPaid(k)),owedAll=r2p(keys.reduce((s,k)=>s+bal(k),0));
  const pays=[...(S.appPays||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_apps')}</h2><div class="row"><button class="btn btn-ghost rp-btn" data-act="apXls">${t('xlsExport')}</button><input class="field" type="month" id="apMonth" value="${esc(mk)}" style="width:auto"><button class="btn btn-sun" data-act="apNew">+ ${t('ap_add')}</button></div></div>
  <div class="stats">${kpi(t('ap_sales'),sar2(tot('sales'))+' '+t('sar'))}${kpi(t('ap_fee'),sar2(tot('fee'))+' '+t('sar'))}${kpi(t('ap_net'),sar2(tot('net'))+' '+t('sar'))}${kpi(t('ap_owed'),sar2(owedAll)+' '+t('sar'),owedAll>0?'hot':'')}</div>
  <div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="apBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="apBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  <div class="rp-sec"><h3>${esc(t('ap_month',{m:monthName(mk)}))}</h3><div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('ap_app')}</th><th>${t('ap_sales')}</th><th>${t('ap_rate')}</th><th>${t('ap_fee')}</th><th>${t('ap_net')}</th></tr></thead><tbody>
    ${keys.length?keys.map(k=>`<tr><td><b>${esc(t('dsr_'+k))}</b></td><td class="n">${esc(sar2(M[k].sales))}</td>
      <td class="n"><input class="field num ap-rate" id="apRate-${k}" data-k="${k}" inputmode="decimal" dir="ltr" value="${appFee(k)||''}" placeholder="0" aria-label="${esc(t('ap_rate'))}"> %</td>
      <td class="n">${esc(sar2(M[k].fee))}</td><td class="n"><b>${esc(sar2(M[k].net))}</b></td></tr>`).join('')
      +`<tr class="pl-sub"><td><b>${t('dsr_total')}</b></td><td class="n"><b>${esc(sar2(tot('sales')))}</b></td><td></td><td class="n"><b>${esc(sar2(tot('fee')))}</b></td><td class="n"><b>${esc(sar2(tot('net')))}</b></td></tr>`
      :`<tr><td colspan="5" class="hint">${esc(t('ap_none'))}</td></tr>`}
  </tbody></table></div><p class="hint">${esc(t('ap_rateHint'))}</p></div>
  <div class="rp-sec"><h3>${t('ap_balTitle')}</h3><div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('ap_app')}</th><th>${t('ap_netAll')}</th><th>${t('ap_paid')}</th><th>${t('ap_bal')}</th></tr></thead><tbody>
    ${keys.map(k=>{const b=bal(k);return`<tr><td><b>${esc(t('dsr_'+k))}</b></td><td class="n">${esc(sar2(ALL[k].net))}</td><td class="n">${esc(sar2(appPaid(k)))}</td><td class="n ${b>0?'mis':''}"><b>${esc(sar2(b))}</b></td></tr>`}).join('')||`<tr><td colspan="4" class="hint">${esc(t('ap_none'))}</td></tr>`}
  </tbody></table></div></div>
  <div class="rp-sec"><h3>${t('ap_pays')}</h3><div class="list">${pays.length?pays.map(p=>`<button class="oc" data-act="apOpen" data-id="${esc(p.id)}">
    <span style="min-width:0"><span class="t">${esc(t('dsr_'+(p.app||'other')))}</span><span class="s">${esc(dateLabel(p.date))}${p.from?' · '+esc(p.from)+(p.to&&p.to!==p.from?' → '+esc(p.to):''):''}${p.ref?' · <span dir="ltr">'+esc(p.ref)+'</span>':''}</span></span>
    <span class="side"><b class="num">${esc(sar2(p.amount))} ${t('sar')}</b></span></button>`).join(''):`<div class="empty">${esc(t('ap_noPays'))}</div>`}</div></div>`;
}
function appPaySheet(){
  const isNew=S.openAp==='new',d=S.hrDraft||{};
  const body=`<div class="sl-grid hr-grid">${hrSel('app',t('ap_app'),DSR_APPS.map(k=>[k,t('dsr_'+k)]))}${hrIn('date',t('ap_date'),'date')}${hrIn('amount',t('ap_amount')+' ('+t('sar')+')','number')}
    ${hrIn('from',t('ap_from'),'month')}${hrIn('to',t('ap_to'),'month')}${hrIn('ref',t('ex_ref'),'text','dir="ltr"')}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="apDel">${S.confirm==='apDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="apSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('ap_add'):t('ap_pay'),body,foot);
}
Object.assign(A,{
  apBranch(el){S.apBranch=el.dataset.k;render()},
  apNew(){const mk=S.apMonth||monthKey(Date.now());S.openAp='new';S.confirm=null;S.hrDraft={app:'hunger',date:dayKey(Date.now()),amount:'',from:mk,to:mk,ref:'',note:''};render()},
  apOpen(el){const p=(S.appPays||[]).find(x=>x.id===el.dataset.id);if(!p)return;S.openAp=p.id;S.confirm=null;S.hrDraft=Object.assign({},p);render()},
  apSave(){const d=S.hrDraft||{},amount=num(d.amount);if(!(amount>0)){toast(t('vc_need'));return}
    const okM=v=>/^[0-9]{4}-[0-9]{2}$/.test(v||'');const id=S.openAp==='new'?hrId('AP'):S.openAp,old=(S.appPays||[]).find(x=>x.id===id)||{},tm=nowIso();
    const data={app:DSR_APPS.includes(d.app)?d.app:'other',date:isDay(d.date)?d.date:dayKey(Date.now()),amount,from:okM(d.from)?d.from:'',to:okM(d.to)?d.to:(okM(d.from)?d.from:''),
      ref:String(d.ref||'').trim(),note:String(d.note||'').trim(),createdAt:old.createdAt||tm,updatedAt:tm};
    guard(async()=>{await X.put('appPays',id,data);S.openAp=null;S.hrDraft=null},()=>t('st_saved'))},
  apDel(){const id=S.openAp;if(!id||id==='new')return;if(S.confirm!=='apDel'){S.confirm='apDel';render();return}
    guard(async()=>{await X.del('appPays',id);S.openAp=null;S.confirm=null},()=>t('li_deleted'))},
  apXls(){const mk=S.apMonth||monthKey(Date.now()),bf=S.apBranch||'';
    const rows=[];S.branches.filter(b=>!bf||b===bf).forEach(b=>{const M=appStats((S.sales||[]).filter(r=>r.branch===b&&String(r.date).startsWith(mk)));
      DSR_APPS.forEach(k=>{if(M[k].sales)rows.push([b,t('dsr_'+k),M[k].sales,appFee(k),M[k].fee,M[k].net])})});
    saveXlsx('maskob-delivery-apps-'+mk+'.xlsx',[{name:t('tab_apps'),headers:[t('r_branch'),t('ap_app'),t('ap_sales'),t('ap_rate'),t('ap_fee'),t('ap_net')],rows},
      {name:t('ap_pays'),headers:[t('ap_date'),t('ap_app'),t('ap_amount'),t('ap_from'),t('ap_to'),t('ex_ref'),t('hr_note')],rows:(S.appPays||[]).map(p=>[p.date,t('dsr_'+p.app),+p.amount||0,p.from||'',p.to||'',p.ref||'',p.note||''])}])}
});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='apMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.apMonth=el.value;render()}
  if(el.classList&&el.classList.contains('ap-rate')){const v=Math.max(0,Math.min(100,parseFloat(el.value)||0));const fees=Object.assign({},finCfg().appFees||{},{[el.dataset.k]:v});
    S.finCfg=Object.assign({},S.finCfg||{},{appFees:fees});saveFinCfg({appFees:fees}).catch(()=>toast(t('saveFail')));render()}});
