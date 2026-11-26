/* Maskob — Break-even report (نقطة التعادل) per branch and for the company.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   Built on the P&L (pnlCalc) for the chosen months:
     variable costs  = cost of sales (goods at cost + direct-cost items) + delivery-app commissions
     fixed costs     = all other operating costs (pay, insurance, provision, rent, energy, gov, …, depreciation)
     contribution    = 1 − variable ÷ net sales
     break-even      = fixed ÷ contribution            (for the period, then per day)
     invoices needed = daily break-even ÷ average net invoice value
   Daily figures are also shown including VAT so a branch can compare them with the sales it records. */
const BE_VARIABLE_EXP=['delivery'];
function beRow(name,x,recs,days,vatF){
  const sales=x.sales,variable=x.cogs+BE_VARIABLE_EXP.reduce((s,c)=>s+(x.exp[c]||0),0);
  const fixed=x.opex-BE_VARIABLE_EXP.reduce((s,c)=>s+(x.exp[c]||0),0);
  const cm=sales>0?(sales-variable)/sales:null;
  const be=cm!=null&&cm>0?fixed/cm:null;
  const daysRec=new Set(recs.map(r=>r.date)).size,inv=recs.reduce((s,r)=>s+(+r.invoices||0),0);
  const ticket=inv?sales/inv:null;                         // average invoice, without VAT
  const beDaily=be!=null?be/days:null;
  const actualDaily=daysRec?sales/daysRec:null;
  const status=sales<=0?'na':cm<=0?'loss':be!=null&&(actualDaily??0)>=beDaily?'above':'below';
  return{name,sales,variable,fixed,cm,be,beDaily,beDailyVat:beDaily!=null?beDaily*vatF:null,actualDaily,actualDailyVat:actualDaily!=null?actualDaily*vatF:null,
    ticket,beInvDaily:beDaily!=null&&ticket?beDaily/ticket:null,actualInvDaily:daysRec?inv/daysRec:null,
    safety:be!=null&&sales>0?(sales-be)/sales:null,status,daysRec};
}
function beCalc(from,to,alloc){
  let R=pnlCalc(from,to);if(alloc)R=pnlAllocate(R);
  const days=R.months.reduce((s,m)=>s+daysInMonth(m),0),vatF=R.cfg.salesVat?1+VAT_RATE/100:1;
  const recsOf=b=>(S.sales||[]).filter(r=>(!b||r.branch===b)&&R.months.includes(String(r.date||'').slice(0,7)));
  const rows=S.branches.filter(b=>R.P[b]).map(b=>beRow(b,R.P[b],recsOf(b),days,vatF));
  const company=beRow(t('pl_company'),R.C,recsOf(null),days,vatF);
  // a company day is the sum of its branches' days
  company.actualDaily=rows.reduce((s,r)=>s+(r.actualDaily||0),0)||null;company.actualDailyVat=company.actualDaily!=null?company.actualDaily*vatF:null;
  company.actualInvDaily=rows.reduce((s,r)=>s+(r.actualInvDaily||0),0)||null;
  company.status=company.sales<=0?'na':company.cm<=0?'loss':company.be!=null&&(company.actualDaily??0)>=company.beDaily?'above':'below';
  return{R,days,vatF,rows,company};
}
const pct=v=>v==null?'—':Math.round(v*1000)/10+'%';
const amt=v=>v==null?'—':esc(sar(v));
function beCard(r,vat){
  const ratio=r.beDaily&&r.actualDaily!=null?Math.min(1.5,r.actualDaily/r.beDaily):0;
  const line=(l,v)=>`<div class="tg-line"><span>${esc(l)}</span><b class="num">${v}</b></div>`;
  return`<div class="tg-card be-card be-${r.status}"><div class="tg-head"><b>${esc(r.name)}</b><span class="pill ${r.status==='above'?'ms-done':r.status==='na'?'ms-progress':'li-expired'}">${esc(t('be_st_'+r.status))}</span></div>
    ${r.beDaily!=null?`<div class="hint">${esc(t('be_dailyVs'))}</div>${progress(Math.min(1,ratio))}`:''}
    ${line(vat?t('be_dailyVat'):t('be_daily'),amt(vat?r.beDailyVat:r.beDaily))}
    ${line(vat?t('be_actualVat'):t('be_actual'),amt(vat?r.actualDailyVat:r.actualDaily))}
    ${line(t('be_invNeeded'),r.beInvDaily==null?'—':esc(Math.ceil(r.beInvDaily)))}
    ${line(t('be_invActual'),r.actualInvDaily==null?'—':esc(Math.round(r.actualInvDaily)))}
    ${line(t('be_cm'),pct(r.cm))}
    ${line(t('be_safety'),pct(r.safety))}</div>`;
}
function breakEvenView(){
  const now=monthKey(Date.now());const from=S.beFrom||now,to=S.beTo||from;const alloc=S.beAlloc!==false;
  const B=beCalc(from,to,alloc),vat=B.vatF>1;
  const head=[t('hr_branch'),t('be_sales'),t('be_variable'),t('be_cm'),t('be_fixed'),t('be_point'),t('be_daily'),...(vat?[t('be_dailyVat')]:[]),t('be_ticket'),t('be_invNeeded'),t('be_invActual'),t('be_safety')];
  const cells=r=>[esc(r.name),amt(r.sales),amt(r.variable),pct(r.cm),amt(r.fixed),amt(r.be),amt(r.beDaily),...(vat?[amt(r.beDailyVat)]:[]),r.ticket?esc(sar2(r.ticket)):'—',r.beInvDaily==null?'—':esc(Math.ceil(r.beInvDaily)),r.actualInvDaily==null?'—':esc(Math.round(r.actualInvDaily)),pct(r.safety)];
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_be')}</h2><div class="row">
    <label class="hint">${t('pl_from')} <input class="field" type="month" id="beFrom" value="${esc(from)}" style="width:auto"></label>
    <label class="hint">${t('pl_to')} <input class="field" type="month" id="beTo" value="${esc(to)}" style="width:auto"></label>
    <button class="btn btn-ghost rp-btn" data-act="beXls">${t('xlsExport')}</button><button class="btn btn-ghost rp-btn" data-act="bePrint">${t('fm_print')}</button></div></div>
  <label class="eos-chk" style="margin:6px 0 10px"><input type="checkbox" id="beAlloc" ${alloc?'checked':''}> ${esc(t('pl_alloc'))}</label>
  <div class="tg-cards">${B.rows.map(r=>beCard(r,vat)).join('')}${beCard(B.company,vat)}</div>
  <div class="rp-sec"><h3>${t('be_table')}</h3><div class="scroll"><table class="tbl pl-tbl"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
    ${[...B.rows,B.company].map((r,i,a)=>`<tr class="${i===a.length-1?'pl-sum':''}">${cells(r).map((c,j)=>`<td class="${j?'n':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
  <p class="hint">${esc(t('be_hint'))}</p>`;
}
function beSheet(B){
  const vat=B.vatF>1;
  const headers=[t('hr_branch'),t('be_sales'),t('be_variable'),t('be_cm'),t('be_fixed'),t('be_point'),t('be_daily'),...(vat?[t('be_dailyVat')]:[]),t('be_actual'),t('be_ticket'),t('be_invNeeded'),t('be_invActual'),t('be_safety'),t('hr_status')];
  const n=v=>v==null?'':r2p(v),p=v=>v==null?'':Math.round(v*1000)/10+'%';
  return{name:t('tab_be')+' '+B.R.from+(B.R.to!==B.R.from?' — '+B.R.to:''),headers,
    rows:[...B.rows,B.company].map(r=>[r.name,n(r.sales),n(r.variable),p(r.cm),n(r.fixed),n(r.be),n(r.beDaily),...(vat?[n(r.beDailyVat)]:[]),n(r.actualDaily),n(r.ticket),r.beInvDaily==null?'':Math.ceil(r.beInvDaily),r.actualInvDaily==null?'':Math.round(r.actualInvDaily),p(r.safety),t('be_st_'+r.status)])};
}
Object.assign(A,{
  beXls(){const now=monthKey(Date.now());const B=beCalc(S.beFrom||now,S.beTo||S.beFrom||now,S.beAlloc!==false);saveXlsx('maskob-break-even-'+B.R.from+'_'+B.R.to+'.xlsx',[beSheet(B)])},
  bePrint(){const now=monthKey(Date.now());const B=beCalc(S.beFrom||now,S.beTo||S.beFrom||now,S.beAlloc!==false);const sh=beSheet(B);
    const body=`<style>@page{size:A4 landscape;margin:10mm}table{font-size:10px}td,th{padding:4px 5px}td:not(:first-child),th:not(:first-child){text-align:center}</style>
      <table><thead><tr>${sh.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sh.rows.map(r=>`<tr>${r.map((c,i)=>`<td>${i&&typeof c==='number'?nfmt(c):esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="para">${esc(t('be_hint'))}</div>`;
    printDoc('تقرير نقطة التعادل','Break-even report',esc(B.R.from)+(B.R.to!==B.R.from?' — '+esc(B.R.to):''),body,[['الإدارة المالية / Finance',''],['المدير المعتمد / Approved by',coInfo().rep]],window.open('','_blank'))}
});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='beFrom'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.beFrom=el.value;if(!S.beTo||S.beTo<el.value)S.beTo=el.value;render()}
  if(el.id==='beTo'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.beTo=el.value;if(!S.beFrom||S.beFrom>el.value)S.beFrom=el.value;render()}
  if(el.id==='beAlloc'){S.beAlloc=el.checked;render()}});
