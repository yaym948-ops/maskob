/* Maskob — Profit & loss (قائمة الدخل) per branch and for the company, plus the data it needs:
   item costs, fixed assets (depreciation) and finance settings.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   config/costs:   {items:{itemId: unit cost}}  — finance edits; a supplier receipt with a unit cost
                   updates the weighted average; each shipped order line keeps the cost of the day
   config/finance: {salesVat: true}             — recorded branch sales include 15% VAT
   assets/{id}:    {name, place, cost, date, life (years)} — straight-line monthly depreciation

   The statement (accrual view):
     net sales (VAT removed) + other income
   − cost of goods: items sent from the warehouse at cost (− returns) + cash purchases
   = gross profit
   − salaries & allowances, employer social insurance, end-of-service provision, each expense type
     (spread over the months it covers), depreciation
   = net operating profit
   Head-office and warehouse costs can be spread over the branches by their share of sales. */
const VAT_RATE=15;
const itemCost=id=>+((S.costs||{})[id]||0);
const finCfg=()=>Object.assign({salesVat:true},S.finCfg||{});
const monthsBetween=(a,b)=>{const out=[];if(!a||!b||a>b)return out;let[y,m]=a.split('-').map(Number);const[ye,me]=b.split('-').map(Number);
  while(y<ye||(y===ye&&m<=me)){out.push(y+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++}}return out};
/* employer insurance share and end-of-service provision for one month */
const gosiEmpRate=e=>e.gosiEmp===''||e.gosiEmp==null?((e.gosi===true||e.gosi==='yes')?11.75:2):+num(e.gosiEmp);
const gosiEmployer=(e,f)=>Math.round(Math.min(GOSI_CAP,(+e.salary||0)+(+e.alHousing||0))*(f==null?1:f)*gosiEmpRate(e))/100;
function eosProvision(e,mk,f){
  if(!e.hire)return 0;const end=mk+'-'+String(daysInMonth(mk)).padStart(2,'0');if(e.hire>end)return 0;
  const years=(dayDiff(e.hire,end)+1)/365,wage=payTotal(e);
  return r2p((years<5?wage/2:wage)/12*(f==null?1:f));
}
/* ---------- the statement ---------- */
function pnlCalc(from,to){
  const months=monthsBetween(from,to);const cfg=finCfg();
  const places=[...S.branches,'@wh','@office'];
  const z=()=>({sales:0,otherInc:0,cogsGoods:0,cogsCash:0,pay:0,gosi:0,eos:0,dep:0,exp:{}});
  const P={};places.forEach(p=>P[p]=z());
  const at=p=>P[p]||P['@office'];
  const inPeriod=d=>{const m=String(d||'').slice(0,7);return months.includes(m)};
  // sales (VAT removed when recorded sales include it)
  (S.sales||[]).filter(r=>inPeriod(r.date)).forEach(r=>{at(r.branch).sales+=(+r.sales||0)/(cfg.salesVat?1+VAT_RATE/100:1)});
  // goods sent to branches at cost, less returns
  (S.orders||[]).forEach(o=>{
    if(o.kind!=='return'&&['shipped','received'].includes(o.status)&&inPeriod(o.shippedAt))
      (o.lines||[]).forEach(l=>{at(o.branch).cogsGoods+=(+l.sent||0)*(+l.cost||itemCost(l.id))});
    if(o.kind==='return'&&o.status==='received'&&inPeriod(o.receivedAt))
      (o.lines||[]).forEach(l=>{at(o.branch).cogsGoods-=(+l.received||0)*(+l.cost||itemCost(l.id))});
  });
  // expenses and other income, spread over the months they cover; VAT is not a cost
  (S.expenses||[]).forEach(e=>{
    const span=e.periodFrom&&e.periodTo?monthsBetween(e.periodFrom,e.periodTo):[String(e.date||'').slice(0,7)];
    const hit=span.filter(m=>months.includes(m)).length;if(!hit)return;
    const net=((+e.amount||0)-(+e.vat||0))*hit/span.length;
    const p=e.place==='@all'||!P[e.place]?'@office':e.place;
    if(e.kind==='income'){at(p).otherInc+=net;return}
    if(e.cat==='purchases'){at(p).cogsCash+=net;return}
    const c=e.cat||'other';at(p).exp[c]=(at(p).exp[c]||0)+net;
  });
  // people: pay, employer insurance, end-of-service provision (by workplace)
  months.forEach(mk=>{
    const PR=payrollCalc(mk),dim=daysInMonth(mk);
    PR.rows.forEach(r=>{const e=empById(r.id)||{};const f=Math.min(1,(r.days||0)/dim);const p=P[r.branch]?r.branch:'@office';
      P[p].pay+=(r.gross||0)+(r.reward||0)+(r.ot||0)+(r.add||0);
      P[p].gosi+=gosiEmployer(e,f);P[p].eos+=eosProvision(e,mk,f)});
    // depreciation
    (S.assets||[]).forEach(a=>{if(!a.date||!(+a.cost>0)||!(+a.life>0))return;const start=String(a.date).slice(0,7);
      const endD=fromKey(a.date);endD.setMonth(endD.getMonth()+Math.round(+a.life*12)-1);const end=monthKey(endD);
      if(mk>=start&&mk<=end){const p=P[a.place]?a.place:'@office';P[p].dep+=(+a.cost)/(+a.life*12)}});
  });
  // totals per place
  const cats=[...new Set(places.flatMap(p=>Object.keys(P[p].exp)))].sort((a,b)=>EXP_CATS.indexOf(a)-EXP_CATS.indexOf(b));
  const tot=x=>{const rev=x.sales+x.otherInc,cogs=x.cogsGoods+x.cogsCash,gross=rev-cogs;
    const opex=x.pay+x.gosi+x.eos+x.dep+Object.values(x.exp).reduce((s,v)=>s+v,0);return{rev,cogs,gross,opex,net:gross-opex}};
  places.forEach(p=>Object.assign(P[p],tot(P[p])));
  // company total
  const C=z();places.forEach(p=>{for(const k of ['sales','otherInc','cogsGoods','cogsCash','pay','gosi','eos','dep'])C[k]+=P[p][k];
    for(const c in P[p].exp)C.exp[c]=(C.exp[c]||0)+P[p].exp[c]});Object.assign(C,tot(C));
  return{from,to,months,places,P,C,cats,cfg};
}
/* spread head-office and warehouse lines over the branches by share of net sales */
function pnlAllocate(R){
  const br=S.branches.filter(b=>R.P[b]);const base=br.reduce((s,b)=>s+R.P[b].sales,0);
  if(!(base>0))return R;
  const P=JSON.parse(JSON.stringify(R.P));
  for(const src of ['@office','@wh']){const s=P[src];
    br.forEach(b=>{const w=R.P[b].sales/base,d=P[b];
      for(const k of ['otherInc','cogsGoods','cogsCash','pay','gosi','eos','dep'])d[k]+=s[k]*w;
      for(const c in s.exp)d.exp[c]=(d.exp[c]||0)+s.exp[c]*w});
    P[src]={sales:0,otherInc:0,cogsGoods:0,cogsCash:0,pay:0,gosi:0,eos:0,dep:0,exp:{}}}
  const tot=x=>{const rev=x.sales+x.otherInc,cogs=x.cogsGoods+x.cogsCash,gross=rev-cogs;const opex=x.pay+x.gosi+x.eos+x.dep+Object.values(x.exp).reduce((s,v)=>s+v,0);return{rev,cogs,gross,opex,net:gross-opex}};
  Object.keys(P).forEach(p=>Object.assign(P[p],tot(P[p])));
  return Object.assign({},R,{P,places:br,allocated:true});
}
/* the lines of the statement: [label, value(x), style] */
function pnlLines(R){
  const L=[[t('pl_revenue'),null,'h'],[t('pl_netSales'),x=>x.sales],[t('pl_otherInc'),x=>x.otherInc],[t('pl_totalRev'),x=>x.rev,'sum'],
    [t('pl_cogs'),null,'h'],[t('pl_cogsGoods'),x=>x.cogsGoods],[t('pl_cogsCash'),x=>x.cogsCash],[t('pl_totalCogs'),x=>x.cogs,'sum'],
    [t('pl_gross'),x=>x.gross,'big'],[t('pl_grossM'),x=>x.rev?x.gross/x.rev:null,'pct'],
    [t('pl_opex'),null,'h'],[t('pl_pay'),x=>x.pay],[t('pl_gosi'),x=>x.gosi],[t('pl_eos'),x=>x.eos],
    ...R.cats.map(c=>[t('ec_'+c),x=>x.exp[c]||0]),[t('pl_dep'),x=>x.dep],[t('pl_totalOpex'),x=>x.opex,'sum'],
    [t('pl_net'),x=>x.net,'big'],[t('pl_netM'),x=>x.rev?x.net/x.rev:null,'pct']];
  return L;
}
function pnlView(){
  const now=monthKey(Date.now());const from=S.plFrom||now,to=S.plTo||from;
  let R=pnlCalc(from,to);if(S.plAlloc)R=pnlAllocate(R);
  const cols=[...R.places.filter(p=>{const x=R.P[p];return x.rev||x.cogs||x.opex}),'@total'];
  const val=(p)=>p==='@total'?R.C:R.P[p];
  const cell=(v,st)=>v==null?'—':st==='pct'?Math.round(v*1000)/10+'%':esc(sar(v));
  const missingCost=ITEMS.filter(it=>!(itemCost(it.id)>0)).length;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_pnl')}</h2><div class="row">
    <label class="hint">${t('pl_from')} <input class="field" type="month" id="plFrom" value="${esc(from)}" style="width:auto"></label>
    <label class="hint">${t('pl_to')} <input class="field" type="month" id="plTo" value="${esc(to)}" style="width:auto"></label>
    <button class="btn btn-ghost rp-btn" data-act="plXls">${t('xlsExport')}</button><button class="btn btn-ghost rp-btn" data-act="plPrint">${t('fm_print')}</button></div></div>
  <div class="row" style="gap:14px;flex-wrap:wrap;margin:6px 0 10px">
    <label class="eos-chk"><input type="checkbox" id="plAlloc" ${S.plAlloc?'checked':''}> ${esc(t('pl_alloc'))}</label>
    <label class="eos-chk"><input type="checkbox" id="plVat" ${R.cfg.salesVat?'checked':''}> ${esc(t('pl_salesVat'))}</label></div>
  ${missingCost?`<div class="note-bar" style="margin-bottom:10px">${esc(t('pl_missingCost',{n:missingCost}))} <button class="btn btn-ghost rp-btn" data-act="tab" data-k="costs">${t('tab_costs')}</button></div>`:''}
  <div class="scroll"><table class="tbl pl-tbl"><thead><tr><th></th>${cols.map(p=>`<th>${esc(p==='@total'?t('pl_company'):placeL(p))}</th>`).join('')}</tr></thead><tbody>
  ${pnlLines(R).map(([label,fn,st])=>st==='h'?`<tr class="pl-h"><td colspan="${cols.length+1}">${esc(label)}</td></tr>`
    :`<tr class="pl-${st||'row'}"><td>${esc(label)}</td>${cols.map(p=>{const v=fn(val(p));return`<td class="n ${st!=='pct'&&v<0?'mis':''}">${cell(v,st)}</td>`}).join('')}</tr>`).join('')}
  </tbody></table></div>
  <p class="hint" style="margin-top:8px">${esc(t('pl_hint'))}</p>`;
}
function pnlSheet(R){
  const cols=[...R.places,'@total'];const val=p=>p==='@total'?R.C:R.P[p];
  return{name:'P&L '+R.from+(R.to!==R.from?' — '+R.to:''),headers:['',...cols.map(p=>p==='@total'?t('pl_company'):placeL(p))],
    rows:pnlLines(R).map(([label,fn,st])=>[label,...cols.map(p=>!fn?'':st==='pct'?(fn(val(p))==null?'':Math.round(fn(val(p))*1000)/10+'%'):r2p(fn(val(p))))])};
}
/* ---------- item costs ---------- */
function costsView(){
  const q=String(S.coQ||'').trim().toLowerCase(),cf=S.coCat||'';
  const items=ITEMS.filter(it=>(!cf||it.cat===cf)&&(!q||[it.ar,it.en,it.sku].some(v=>String(v||'').toLowerCase().includes(q))));
  const missing=ITEMS.filter(it=>!(itemCost(it.id)>0)).length;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_costs')}</h2><div class="row">${ioBtns('costs')}</div></div>
  <p class="hint">${esc(t('co_hint2'))}</p>
  <div class="stats">${kpi(t('co_priced'),sar(ITEMS.length-missing))}${kpi(t('co_missing'),sar(missing),missing?'hot':'')}</div>
  <div class="row hr-filter"><input class="field" id="coQ" data-in="coQ" placeholder="${esc(t('cat_search'))}" value="${esc(S.coQ||'')}" style="flex:2;min-width:180px">
    <select class="field" id="coCat" style="flex:1;min-width:140px"><option value="">${esc(t('cat_allCats'))}</option>${CATS.map(c=>`<option value="${c.k}" ${cf===c.k?'selected':''}>${esc(catName(c))}</option>`).join('')}</select></div>
  <div class="scroll"><table class="tbl st-tbl"><thead><tr><th>${t('c_item')}</th><th>${t('c_unit')}</th><th>${t('co_cost')} (${t('sar')})</th></tr></thead><tbody>
  ${items.map(it=>`<tr class="${itemCost(it.id)>0?'':'st-low'}"><td><b>${esc(nameOf_(it))}</b>${it.sku?`<div class="hint" dir="ltr">${esc(it.sku)}</div>`:''}</td><td>${esc(unitL(it.uk))}</td>
    <td><input class="field num pr-in" id="cost-${esc(it.id)}" data-in="costIn" data-id="${esc(it.id)}" inputmode="decimal" dir="ltr" value="${itemCost(it.id)||''}" placeholder="0"></td></tr>`).join('')}</tbody></table></div>`;
}
async function saveCosts(map){
  if(S.fb)return queue('config/costs',()=>db.doc('config/costs').set({items:map,at:nowIso()},{merge:true}));
  MEMSET('costs',Object.assign({},MEM('costs')&&!Array.isArray(MEM('costs'))?MEM('costs'):{},map));xLoadDemo();render();
}
/* ---------- fixed assets ---------- */
function assetsView(){
  const list=[...(S.assets||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const monthly=list.reduce((s,a)=>s+((+a.cost>0&&+a.life>0)?(+a.cost)/(+a.life*12):0),0);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_assets')}</h2><button class="btn btn-sun" data-act="asNew">+ ${t('as_add')}</button></div>
  <p class="hint">${esc(t('as_hint'))}</p>
  <div class="stats">${kpi(t('as_count'),sar(list.length))}${kpi(t('as_total'),sar(list.reduce((s,a)=>s+(+a.cost||0),0))+' '+t('sar'))}${kpi(t('as_monthly'),sar2(monthly)+' '+t('sar'))}</div>
  <div class="list">${list.length?list.map(a=>`<button class="oc" data-act="asOpen" data-id="${esc(a.id)}"><span style="min-width:0"><span class="t">${esc(a.name)} <span class="tag">${esc(placeL(a.place))}</span></span>
    <span class="s">${esc(dateLabel(a.date))} · ${esc(t('as_lifeN',{n:a.life}))} · ${esc(t('as_perMonth',{n:sar2((+a.cost||0)/((+a.life||1)*12))}))}</span></span>
    <span class="side"><b class="num">${esc(sar(a.cost))}</b></span></button>`).join(''):`<div class="empty">${esc(t('as_none'))}</div>`}</div>`;
}
function assetSheet(){
  const isNew=S.openAsset==='new';const d=S.hrDraft||{};
  const body=`<div class="sl-grid hr-grid">${hrIn('name',t('as_name'))}${hrSel('place',t('hr_branch'),hrPlaces().map(p=>[p,placeL(p)]))}
    ${hrIn('cost',t('as_cost')+' ('+t('sar')+')','number')}${hrIn('date',t('as_date'),'date')}${hrIn('life',t('as_life'),'number','dir="ltr" inputmode="decimal" placeholder="5"')}</div>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="asDel">${S.confirm==='asDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="asSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('as_add'):(d.name||''),body,foot);
}
async function saveFinCfg(data){
  if(S.fb)return queue('config/finance',()=>db.doc('config/finance').set(data,{merge:true}));
  MEMSET('fincfg',Object.assign({},MEM('fincfg')&&!Array.isArray(MEM('fincfg'))?MEM('fincfg'):{},data));xLoadDemo();render();
}
Object.assign(A,{
  plXls(){const now=monthKey(Date.now());let R=pnlCalc(S.plFrom||now,S.plTo||S.plFrom||now);if(S.plAlloc)R=pnlAllocate(R);saveXlsx('maskob-pnl-'+R.from+'_'+R.to+'.xlsx',[pnlSheet(R)])},
  plPrint(){const now=monthKey(Date.now());let R=pnlCalc(S.plFrom||now,S.plTo||S.plFrom||now);if(S.plAlloc)R=pnlAllocate(R);const sh=pnlSheet(R);
    const body=`<style>@page{size:A4 landscape;margin:10mm}table{font-size:10.5px}td,th{padding:4px 6px}td:not(:first-child),th:not(:first-child){text-align:center}</style>
      <table><thead><tr>${sh.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sh.rows.map(r=>`<tr>${r.map((c,i)=>i?`<td>${typeof c==='number'?nfmt(c):esc(c)}</td>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="para">${esc(t('pl_hint'))}</div>`;
    printDoc('قائمة الدخل','Profit & Loss',esc(R.from)+(R.to!==R.from?' — '+esc(R.to):'')+(R.allocated?' · '+esc(t('pl_alloc')):''),body,[['الإدارة المالية / Finance',''],['المدير المعتمد / Approved by',coInfo().rep]],window.open('','_blank'))},
  asNew(){S.openAsset='new';S.confirm=null;S.hrDraft={name:'',place:S.branches[0]||'@office',cost:'',date:dayKey(Date.now()),life:'5'};render()},
  asOpen(el){const a=(S.assets||[]).find(x=>x.id===el.dataset.id);if(!a)return;S.openAsset=a.id;S.confirm=null;S.hrDraft=Object.assign({},a);render()},
  asSave(){const d=S.hrDraft||{};const name=String(d.name||'').trim(),cost=num(d.cost),life=num(d.life);
    if(!name||!(cost>0)||!(life>0)){toast(t('as_need'));return}
    const id=S.openAsset==='new'?hrId('AS'):S.openAsset;const tm=nowIso();
    guard(async()=>{await X.put('assets',id,{name,place:d.place||'@office',cost,date:isDay(d.date)?d.date:dayKey(Date.now()),life,updatedAt:tm});S.openAsset=null;S.hrDraft=null},()=>t('st_saved'))},
  asDel(){const id=S.openAsset;if(!id||id==='new')return;if(S.confirm!=='asDel'){S.confirm='asDel';render();return}
    guard(async()=>{await X.del('assets',id);S.openAsset=null;S.confirm=null},()=>t('li_deleted'))}
});
let costT=null;const costPending={};
document.addEventListener('input',ev=>{const el=ev.target;if(!el.dataset)return;
  if(el.dataset.in==='costIn'){const v=num(el.value);costPending[el.dataset.id]=v>0?v:0;S.costs=Object.assign({},S.costs||{},{[el.dataset.id]:v>0?v:0});
    clearTimeout(costT);costT=setTimeout(()=>{const m=Object.assign({},costPending);for(const k in costPending)delete costPending[k];saveCosts(m).catch(()=>toast(t('saveFail')))},800)}
  if(el.dataset.in==='coQ'){S.coQ=el.value;clearTimeout(S._coQT);S._coQT=setTimeout(render,160)}});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='plFrom'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.plFrom=el.value;if(!S.plTo||S.plTo<el.value)S.plTo=el.value;render()}
  if(el.id==='plTo'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.plTo=el.value;if(!S.plFrom||S.plFrom>el.value)S.plFrom=el.value;render()}
  if(el.id==='plAlloc'){S.plAlloc=el.checked;render()}
  if(el.id==='plVat'){saveFinCfg({salesVat:el.checked}).catch(()=>toast(t('saveFail')));S.finCfg=Object.assign({},S.finCfg||{},{salesVat:el.checked});render()}
  if(el.id==='coCat'){S.coCat=el.value;render()}});
/* Excel: item costs in and out */
IO.costs={name:()=>t('tab_costs'),list:()=>ITEMS.map(it=>({id:it.id,name:nameOf_(it),unit:unitL(it.uk),cost:itemCost(it.id)||null})),
  cols:[['id','cat_code','text',1],['name','c_item'],['unit','c_unit'],['cost','co_cost','num']],
  match:(r,L)=>L.find(x=>x.id===r.id),build:(r,o)=>Object.assign({},o||{},r),idOf:d=>d.id,
  commit:async items=>{const m={};items.forEach(x=>{if(ITEM[x.id]&&x.data.cost!=null)m[x.id]=+x.data.cost});if(Object.keys(m).length)await saveCosts(m)}};
