/* Maskob — item cost, margin and menu engineering (هندسة المنيو).
   Each product of the menu may list its ingredients per serving (item + quantity in the recipe unit); its cost comes from
   the warehouse unit costs (config/costs) through the unit conversion, and for made items from their recipe.
   Monthly product sales come from the Foodics "product sales" report (Excel) uploaded per branch:
   psales/{branch}_{YYYY-MM}: {branch, month, rows:[{name, qty, sales, pid}], at, by}
   Menu engineering puts each product in one of four boxes by quantity sold and margin in riyals (70% rule):
   star, plowhorse, puzzle, dog — with the action the book recommends for each. Delivery margins after the app's cut. */
/* cost of one stock unit of an item: warehouse cost, or for a made item its recipe cost per unit of output */
function unitCostOf(id,depth){depth=depth||0;const c=+itemCost(id)||0;if(c>0||depth>3)return c;
  const r=(S.recipes||[]).find(x=>x.out===id);if(!r||!(+r.yield>0))return 0;
  return(r.lines||[]).reduce((s0,l)=>s0+invToStock(l.item,+l.qty||0)*unitCostOf(l.item,depth+1),0)/(+r.yield)}
const prodCost=p=>(p.lines||[]).reduce((s0,l)=>s0+(typeof pcLineCost==='function'?pcLineCost(l):invToStock(l.item,+l.qty||0)*unitCostOf(l.item)),0);
const prodNet=p=>(+p.price||0)/(1+VAT_RATE/100);
const prodMargin=p=>prodNet(p)-prodCost(p);
const meKey=(b,mk)=>b+'_'+mk;
const meNorm=s=>String(s||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();
function meMatch(name){const n=meNorm(name);const P=S.products||[];return(P.find(p=>meNorm(p.name)===n)||P.find(p=>n&&(n.includes(meNorm(p.name))||meNorm(p.name).includes(n))&&meNorm(p.name).length>2)||{}).id||''}
/* the Foodics product sales sheet → rows {name, qty, sales} (header row found by its titles, Arabic or English) */
function meParse(aoa){const H=i=>String(i||'').trim().toLowerCase();let hi=-1,cn=-1,cq=-1,cs=-1;
  for(let r=0;r<Math.min(aoa.length,15)&&hi<0;r++){const row=aoa[r].map(H);
    const n=row.findIndex(x=>/^(name|product|item|product name|الاسم|المنتج|الصنف|اسم المنتج)$/.test(x)),q=row.findIndex(x=>/(quantity|qty|الكمية|العدد)/.test(x));
    if(n>=0&&q>=0){hi=r;cn=n;cq=q;cs=row.findIndex(x=>/(net sales|total|sales|المبيعات|الإجمالي|صافي)/.test(x))}}
  if(hi<0)return null;const out=[];
  for(let r=hi+1;r<aoa.length;r++){const row=aoa[r],name=String(row[cn]||'').trim(),qty=+String(row[cq]).replace(/,/g,'');if(!name||!(qty>0)||/^(total|الإجمالي|المجموع)/i.test(name))continue;
    out.push({name,qty,sales:cs>=0?+String(row[cs]).replace(/,/g,'')||0:0})}
  return out}
function meRows(mk,b){const docs=(S.psales||[]).filter(x=>x.month===mk&&(!b||x.branch===b)),by={};
  docs.forEach(d=>(d.rows||[]).forEach(r=>{const pid=r.pid||meMatch(r.name);if(!pid)return;by[pid]=(by[pid]||0)+(+r.qty||0)}));
  const L=(S.products||[]).filter(p=>by[p.id]).map(p=>({p,qty:by[p.id],cost:prodCost(p),net:prodNet(p),m:prodMargin(p)}));
  if(!L.length)return{L,avgQ:0,avgM:0};
  const totQ=L.reduce((s0,x)=>s0+x.qty,0),avgQ=totQ/L.length*0.7,avgM=L.reduce((s0,x)=>s0+x.m*x.qty,0)/totQ;
  L.forEach(x=>{x.cls=x.qty>=avgQ?(x.m>=avgM?'star':'horse'):(x.m>=avgM?'puzzle':'dog');x.total=x.m*x.qty});
  return{L:L.sort((a,c)=>c.total-a.total),avgQ,avgM}}
function menuEngView(){
  const mk=S.meMonth||monthKey(Date.now()),bf=S.meBranch||'',tb=S.meTab||'eng',{L,avgQ,avgM}=meRows(mk,bf);
  const docs=(S.psales||[]).filter(x=>x.month===mk),unmatched=docs.flatMap(d=>(d.rows||[]).filter(r=>!r.pid&&!meMatch(r.name)).map(r=>({d,r})));
  const head=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_menuEng')}</h2><div class="row" style="gap:8px"><button class="btn btn-ghost rp-btn" data-act="meXls">${t('xlsExport')}</button><input class="field" type="month" id="meMonth" value="${esc(mk)}" style="width:auto"></div></div>
  <div class="kind" style="margin:8px 0">${[['eng','me_tEng'],['cost','me_tCost'],['upload','me_tUpload']].map(([k,l])=>`<button aria-pressed="${tb===k}" data-act="meTab" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>`;
  if(tb==='cost'){const fee=Math.max(0,...((typeof DSR_APPS!=='undefined'?DSR_APPS:[]).map(k=>typeof appFee==='function'?appFee(k):0)));
    const P=[...(S.products||[])].sort((a,c)=>prodMargin(c)-prodMargin(a));
    return head+`<p class="hint">${esc(t('me_costHint'))}</p><div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('mn_name')}</th><th>${t('me_netPrice')}</th><th>${t('me_cost')}</th><th>${t('me_costPct')}</th><th>${t('me_margin')}</th>${fee?`<th>${esc(t('me_appMargin',{p:fee}))}</th>`:''}</tr></thead><tbody>
    ${P.map(p=>{const c=prodCost(p),n=prodNet(p),has=(p.lines||[]).length;return`<tr><td>${S.role==='manager'?`<button class="link" data-act="pdOpen" data-id="${esc(p.id)}">${esc(p.name)}</button>`:esc(p.name)}${has?'':` <span class="tag ret">${esc(t('me_noIng'))}</span>`}</td><td class="n">${esc(sar2(n))}</td><td class="n">${has?esc(sar2(c)):'—'}</td>
      <td class="n">${has&&n?`<span class="kpi-v ${c/n*100<=26?'ok':c/n*100<=31?'mid':'bad'}">${esc(sar2(c/n*100))}%</span>`:'—'}</td><td class="n"><b>${esc(sar2(n-c))}</b></td>${fee?`<td class="n">${esc(sar2(n-c-n*fee/100))}</td>`:''}</tr>`}).join('')}</tbody></table></div>`}
  if(tb==='upload'){return head+`<p class="hint">${esc(t('me_upHint'))}</p>
    <div class="box"><div class="sl-grid hr-grid"><label><span class="hint">${t('r_branch')}</span><select class="field" id="meUpBranch">${S.branches.map(b=>`<option ${S.meUpB===b?'selected':''}>${esc(b)}</option>`).join('')}</select></label>
      <label class="btn btn-navy" style="cursor:pointer;align-self:end">${typeof ico==='function'?ico('upload','b-ic'):''}${esc(t('me_upload'))}<input type="file" id="meFile" accept=".xlsx,.xls,.csv" hidden></label></div></div>
    <div class="list" style="margin-top:10px">${docs.map(d=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(d.branch)}</span><span class="s">${esc(t('me_nRows',{n:(d.rows||[]).length}))} · ${esc(when(d.at))}${d.by?' · '+esc(d.by):''}</span></span></div>`).join('')||`<div class="empty">${esc(t('me_noUpload'))}</div>`}</div>
    ${unmatched.length?`<div class="rp-sec"><h3>${t('me_unmatched',{n:unmatched.length})}</h3><p class="hint">${esc(t('me_unmatchedHint'))}</p><div class="list">${unmatched.slice(0,60).map(({d,r})=>`<div class="oc" style="cursor:default"><span class="t" style="flex:1">${esc(r.name)} <span class="hint">${esc(d.branch)} · ${esc(sar2(r.qty))}</span></span>
      <select class="field" data-in="meMap" data-k="${esc(d.id)}" data-n="${esc(r.name)}" style="width:auto"><option value="">${esc(t('inv_pick'))}</option>${(S.products||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>`).join('')}</div></div>`:''}`}
  const box=k=>L.filter(x=>x.cls===k);
  return head+`<div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="meBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="meBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  ${L.length?`<p class="hint">${esc(t('me_engHint',{q:sar2(avgQ),m:sar2(avgM)}))}</p>
  <div class="me-grid">${['star','horse','puzzle','dog'].map(k=>`<div class="me-box me-${k}"><b>${esc(t('me_'+k))}</b><p class="hint">${esc(t('me_'+k+'Do'))}</p>${box(k).map(x=>`<div class="me-it"><span>${esc(x.p.name)}</span><span class="num">${esc(sar2(x.qty))} · ${esc(sar2(x.m))}</span></div>`).join('')||'<div class="hint">—</div>'}</div>`).join('')}</div>
  <div class="scroll" style="margin-top:12px"><table class="tbl fn-tbl"><thead><tr><th>${t('mn_name')}</th><th>${t('me_qty')}</th><th>${t('me_margin')}</th><th>${t('me_total')}</th><th>${t('me_class')}</th></tr></thead><tbody>
  ${L.map(x=>`<tr><td>${esc(x.p.name)}</td><td class="n">${esc(sar2(x.qty))}</td><td class="n">${esc(sar2(x.m))}</td><td class="n"><b>${esc(sar2(x.total))}</b></td><td><span class="tag me-t-${x.cls}">${esc(t('me_'+x.cls))}</span></td></tr>`).join('')}</tbody></table></div>`
  :`<div class="empty">${esc(t('me_noData'))}</div>`}`}
async function meUpload(file,b,mk){await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''});const rows=meParse(aoa);if(!rows||!rows.length)throw new Error('format');
  rows.forEach(r=>{r.pid=meMatch(r.name)});const id=meKey(b,mk),data={branch:b,month:mk,rows,at:nowIso(),by:S.userName||roleL(S.realRole||S.role)};
  const old=(S.psales||[]).find(x=>x.id===id);data.applied=(old&&old.applied)||{};
  if(S.fb)await db.doc('psales/'+id).set(data);else{MEMSET('psales',MEM('psales').filter(x=>x.id!==id).concat([Object.assign({id},data)]));meLoadDemo()}
  await meApplyStock(Object.assign({id},data));return rows.length}
/* stock the sold products used: quantity sold × each stock-item component, in stock units */
function meWanted(doc){const want={};(doc.rows||[]).forEach(r=>{const p=(S.products||[]).find(x=>x.id===(r.pid||meMatch(r.name)));if(!p)return;
  (p.lines||[]).forEach(l=>{if(!l.item)return;want[l.item]=(want[l.item]||0)+invToStock(l.item,+l.qty||0)*(+r.qty||0)})});return want}
async function meApplyStock(doc){if(typeof bstockApply!=='function')return;const want=meWanted(doc),had=doc.applied||{},pairs=[];
  new Set([...Object.keys(want),...Object.keys(had)]).forEach(id=>{const d=Math.round(((want[id]||0)-(+had[id]||0))*1000)/1000;if(d)pairs.push([id,-d])});
  if(!pairs.length)return;await bstockApply(doc.branch,pairs,'sale',t('mv_saleRef',{m:doc.month}));
  const applied={};Object.keys(want).forEach(id=>{if(want[id])applied[id]=Math.round(want[id]*1000)/1000});
  if(S.fb)await db.doc('psales/'+doc.id).update({applied});else{MEMSET('psales',MEM('psales').map(x=>x.id===doc.id?Object.assign({},x,{applied}):x));meLoadDemo()}}
function meLoadDemo(){S.psales=['manager','finance'].includes(S.role)?MEM('psales'):[]}
function meStart(u,onErr){if(!['manager','finance'].includes(S.role))return;
  u.push(db.collection('psales').onSnapshot(s=>{S.psales=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  if(S.role==='finance'){u.push(db.collection('products').onSnapshot(s=>{S.products=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
    u.push(db.collection('recipes').onSnapshot(s=>{S.recipes=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
    u.push(db.doc('config/invUnits').onSnapshot(s=>{S.invUnits=s.exists?s.data():{};render()},onErr));
    u.push(db.collection('invItems').onSnapshot(s=>{S.invItems=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}}
Object.assign(A,{meTab(el){S.meTab=el.dataset.k;render()},meBranch(el){S.meBranch=el.dataset.k;render()}});
document.addEventListener('change',async ev=>{const el=ev.target;
  if(el.id==='meMonth'&&/^\d{4}-\d{2}$/.test(el.value)){S.meMonth=el.value;render()}
  if(el.id==='meUpBranch')S.meUpB=el.value;
  if(el.id==='meFile'&&el.files&&el.files[0]){const b=S.meUpB||S.branches[0],mk=S.meMonth||monthKey(Date.now());
    try{const n=await meUpload(el.files[0],b,mk);toast(t('me_upDone',{n}))}catch(e){toast(t(String(e&&e.message)==='format'?'me_badFile':'saveFail'))}el.value='';render()}
  if(el.dataset&&el.dataset.in==='meMap'&&el.value){const d=(S.psales||[]).find(x=>x.id===el.dataset.k);if(!d)return;
    const rows=(d.rows||[]).map(r=>r.name===el.dataset.n?Object.assign({},r,{pid:el.value}):r);
    guard(async()=>{if(S.fb)await db.doc('psales/'+d.id).update({rows});else{MEMSET('psales',MEM('psales').map(x=>x.id===d.id?Object.assign({},x,{rows}):x));meLoadDemo()}
      await meApplyStock(Object.assign({},d,{rows}))},()=>t('st_saved'))}});
A.meXls=()=>{const P=[...(S.products||[])];saveXlsx('maskob-item-margins.xlsx',[{name:t('me_tCost'),headers:[t('mn_name'),t('mn_cat'),t('me_netPrice'),t('me_cost'),t('me_costPct'),t('me_margin')],
  rows:P.map(p=>{const c=prodCost(p),n=prodNet(p);return[p.name,p.cat||'',+n.toFixed(2),+c.toFixed(2),n?+(c/n*100).toFixed(1):'',+(n-c).toFixed(2)]})}])};
EXT.tabs.push({k:'menuEng',l:'tab_menuEng',roles:['manager'],g:'menu',view:menuEngView},{k:'menuEng',l:'tab_menuEng',roles:['finance'],g:'rep',view:menuEngView});
