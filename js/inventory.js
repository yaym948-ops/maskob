/* Maskob — branch stock (مخزون الفروع), production (الإنتاج) and stock counts (الجرد); recipes, made items and
   units set by operations. Loaded by index.html as a classic script after stock.js / pnl.js.

   Stock moves in a branch: + received from the warehouse, + produced, − used in production, − waste, − returned;
   a count sets the real figure and its difference is the consumption since the last count.
   invItems/{id}:  {name, unit}                         made items (cold brew, syrups, desserts …)
   recipes/{id}:   {name, out, yield, lines:[{item, qty}]}   qty in the item's recipe unit when it has one
   config/invUnits:{units:[name], items:{id:{rUnit, rPer}}}  rPer recipe units in one stock unit (box = 12000 ml)
   bstock/{branch}:{items:{id:qty}}                     quantities in stock units
   bmoves/{id}:    {branch, at, kind, item, qty, ref, by}  kind recv|prod_in|prod_out|waste|count|return
   prods/{id}:     {branch, recipe, out, outQty, batches, lines:[{item,qty}], at, by}
   bcounts/{id}:   {branch, at, by, lines:[{item, expected, counted}]} */
const INV_DEF_UNITS=['مل','لتر','جرام','كجم','حبة','كوب','ملعقة'];
const invUnitsCfg=()=>Object.assign({units:INV_DEF_UNITS,items:{}},S.invUnits||{});
/* one item, from the warehouse catalogue or made in a branch */
function invItem(id){const it=ITEM[id];if(it)return{id,name:nameOf_(it),unit:unitL(it.uk),made:false};
  const m=(S.invItems||[]).find(x=>x.id===id);return m?{id,name:m.name,unit:m.unit||'',made:true}:{id,name:id,unit:'',made:false}}
const invConv=id=>{const c=(invUnitsCfg().items||{})[id];return c&&c.rUnit&&+c.rPer>0?{rUnit:c.rUnit,rPer:+c.rPer}:null};
const invRUnit=id=>{const c=invConv(id);return c?c.rUnit:invItem(id).unit};
/* a recipe quantity in the stock unit */
const invToStock=(id,q)=>{const c=invConv(id);return c?q/c.rPer:q};
const invFmt=n=>{const v=Math.round((+n||0)*1000)/1000;return(Number.isInteger(v)?String(v):String(v)).replace(/\.?0+$/,m=>m.startsWith('.')?'':m)};
const invQty=(b,id)=>+(((S.bstock||{})[b]||{})[id]||0);
const invAllItems=()=>[...ITEMS.map(it=>it.id),...(S.invItems||[]).map(x=>x.id)];
/* change a branch's stock: pairs [[item, +/-qty]] in stock units, with a move per item */
async function bstockApply(branch,pairs,kind,ref,extra){
  pairs=pairs.filter(([,q])=>q&&isFinite(q));if(!branch||!pairs.length)return;const at=nowIso(),by=S.userName||roleL(S.realRole||S.role);
  if(S.fb){const inc=firebase.firestore.FieldValue.increment,items={};pairs.forEach(([id,q])=>items[id]=inc(q));
    await db.doc('bstock/'+branch).set({items},{merge:true});
    const bt=db.batch();pairs.forEach(([id,q])=>bt.set(db.collection('bmoves').doc(),Object.assign({branch,at,kind,item:id,qty:q,ref:ref||'',by},extra||{})));await bt.commit();return}
  const all=Object.assign({},MEM('bstock')&&!Array.isArray(MEM('bstock'))?MEM('bstock'):{}),cur=Object.assign({},all[branch]||{});
  pairs.forEach(([id,q])=>cur[id]=Math.round(((+cur[id]||0)+q)*1000)/1000);all[branch]=cur;MEMSET('bstock',all);
  MEMSET('bmoves',MEM('bmoves').concat(pairs.map(([id,q],i)=>Object.assign({id:'BM'+Date.now()+i,branch,at,kind,item:id,qty:q,ref:ref||'',by},extra||{}))));xLoadDemo();render();
}
/* data: demo / live (called from branch.js) */
function invLoadDemo(){const c=MEM('invUnits');S.invUnits=c&&!Array.isArray(c)?c:{};S.invItems=MEM('invItems');S.recipes=MEM('recipes');
  const bs=MEM('bstock');S.bstock=bs&&!Array.isArray(bs)?bs:{};
  const mine=a=>S.role==='branch'?a.filter(x=>x.branch===S.branch):a;S.bmoves=mine(MEM('bmoves'));S.prods=mine(MEM('prods'));S.bcounts=mine(MEM('bcounts'))}
function invStart(u,onErr){if(!['branch','manager'].includes(S.role))return;
  const list=(q,key)=>u.push(q.onSnapshot(s=>{S[key]=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  u.push(db.doc('config/invUnits').onSnapshot(s=>{S.invUnits=s.exists?s.data():{};render()},onErr));
  list(db.collection('invItems'),'invItems');list(db.collection('recipes'),'recipes');
  if(S.role==='branch'){const b=S.branch;
    u.push(db.doc('bstock/'+b).onSnapshot(s=>{S.bstock={[b]:s.exists?(s.data().items||{}):{}};render()},onErr));
    for(const [col,key] of [['bmoves','bmoves'],['prods','prods'],['bcounts','bcounts']])list(db.collection(col).where('branch','==',b),key)}
  else{u.push(db.collection('bstock').onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data().items||{});S.bstock=m;render()},onErr));
    for(const [col,key] of [['prods','prods'],['bcounts','bcounts']])list(db.collection(col),key)}}

/* ---------- branch: stock ---------- */
function invStockView(){
  const b=S.branch,st=(S.bstock||{})[b]||{},q=String(S.invQ||'').trim().toLowerCase();
  const ids=Object.keys(st).filter(id=>+st[id]!==0||(S.bmoves||[]).some(m=>m.item===id));
  const rows=ids.map(invItem).filter(x=>!q||x.name.toLowerCase().includes(q)).sort((a,c)=>a.name.localeCompare(c.name,'ar'));
  const moves=[...(S.bmoves||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at))).slice(0,25);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_bstock')}</h2><div class="row"><button class="btn btn-ghost rp-btn" data-act="invWaste">${t('inv_waste')}</button></div></div>
  <p class="hint">${esc(t('inv_stockHint'))}</p>
  <input class="field" id="invQ" data-in="invQ" placeholder="${esc(t('searchPh'))}" value="${esc(S.invQ||'')}" style="margin:8px 0">
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_qty')}</th><th>${t('inv_unit')}</th></tr></thead><tbody>
  ${rows.length?rows.map(x=>`<tr><td><b>${esc(x.name)}</b>${x.made?` <span class="tag">${esc(t('inv_made'))}</span>`:''}</td><td class="n ${+st[x.id]<0?'mis':''}">${esc(invFmt(st[x.id]))}</td><td>${esc(x.unit)}</td></tr>`).join('')
    :`<tr><td colspan="3" class="hint">${esc(t('inv_none'))}</td></tr>`}</tbody></table></div>
  ${moves.length?`<div class="rp-sec"><h3>${t('inv_moves')}</h3><div class="list">${moves.map(m=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(invItem(m.item).name)}</span><span class="s">${esc(t('mv_'+m.kind))}${m.ref?' · '+esc(m.ref):''} · ${esc(when(m.at))}</span></span><span class="side"><b class="num ${m.qty<0?'mis':''}" dir="ltr">${m.qty>0?'+':''}${esc(invFmt(m.qty))}</b></span></div>`).join('')}</div></div>`:''}`;
}
function invWasteSheet(){const d=S.hrDraft||{};const ids=invAllItems();
  const body=`<div class="sl-grid hr-grid">${hrSel('item',t('inv_item'),[['',t('inv_pick')],...ids.map(id=>{const x=invItem(id);return[id,x.name+(x.unit?' ('+x.unit+')':'')]})])}${hrIn('qty',t('inv_qtyStock'),'number')}${hrIn('reason',t('inv_reason'))}</div>`;
  return hrSheetWrap(t('inv_waste'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="invWasteSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`)}

/* ---------- branch: production ---------- */
function invNeed(r,batches){return(r.lines||[]).map(l=>({item:l.item,qty:Math.round(invToStock(l.item,(+l.qty||0)*batches)*1000)/1000,rqty:(+l.qty||0)*batches}))}
function invProdView(){
  const b=S.branch,recs=[...(S.recipes||[])].sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'));
  const r=recs.find(x=>x.id===S.prodRec)||null,n=Math.max(0,+S.prodN||1);
  const mine=[...(S.prods||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at))).slice(0,20);
  let plan='';
  if(r){const need=invNeed(r,n),short=need.filter(x=>invQty(b,x.item)<x.qty),out=invItem(r.out);
    plan=`<div class="box" style="margin-top:12px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b>${esc(r.name)}</b>
      <label class="row" style="gap:6px"><span class="hint">${t('inv_batches')}</span><input class="field num" id="prodN" data-in="prodN" inputmode="decimal" dir="ltr" value="${esc(S.prodN||'1')}" style="width:90px"></label></div>
      <p class="hint">${esc(t('inv_gives',{q:invFmt((+r.yield||1)*n),u:out.unit,x:out.name}))}</p>
      <table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_needRecipe')}</th><th>${t('inv_needStock')}</th><th>${t('inv_have')}</th></tr></thead><tbody>
      ${need.map(x=>{const it=invItem(x.item),have=invQty(b,x.item);return`<tr><td>${esc(it.name)}</td><td class="n">${esc(invFmt(x.rqty))} ${esc(invRUnit(x.item))}</td><td class="n">${esc(invFmt(x.qty))} ${esc(it.unit)}</td><td class="n ${have<x.qty?'mis':''}">${esc(invFmt(have))}</td></tr>`}).join('')}</tbody></table>
      ${short.length?`<p class="hint" style="color:var(--late)">${esc(t('inv_short'))}</p>`:''}
      <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-sun" data-act="prodSave" ${S.busy?'disabled':''}>${t('inv_produce')}</button></div></div>`}
  return`<h2>${t('tab_prod')}</h2><p class="hint">${esc(t('inv_prodHint'))}</p>
  <div class="arc-secs">${recs.length?recs.map(x=>`<button class="arc-sec" aria-pressed="${S.prodRec===x.id}" data-act="prodPick" data-k="${esc(x.id)}"><span class="arc-ic">${typeof ico==='function'?ico('inv'):''}</span><b>${esc(x.name)}</b></button>`).join(''):`<div class="empty">${esc(t('inv_noRecipes'))}</div>`}</div>
  ${plan}
  ${mine.length?`<div class="rp-sec"><h3>${t('inv_lastProd')}</h3><div class="list">${mine.map(p=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(invItem(p.out).name)} <span class="num">+${esc(invFmt(p.outQty))}</span></span><span class="s">${esc(when(p.at))}${p.by?' · '+esc(p.by):''}</span></span></div>`).join('')}</div></div>`:''}`;
}

/* ---------- branch: count ---------- */
function invCountView(){
  const b=S.branch,st=(S.bstock||{})[b]||{},d=S.countDraft||(S.countDraft={});
  const ids=[...new Set([...Object.keys(st),...(S.recipes||[]).flatMap(r=>[r.out,...(r.lines||[]).map(l=>l.item)])])].filter(Boolean);
  const rows=ids.map(invItem).sort((a,c)=>a.name.localeCompare(c.name,'ar'));
  const last=[...(S.bcounts||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at)));
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_count')}</h2><button class="btn btn-sun" data-act="countSave" ${S.busy?'disabled':''}>${t('inv_countSave')}</button></div>
  <p class="hint">${esc(t('inv_countHint'))}</p>
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_expected')}</th><th>${t('inv_counted')}</th><th>${t('inv_used')}</th></tr></thead><tbody>
  ${rows.length?rows.map(x=>{const exp=+st[x.id]||0,v=d[x.id],df=v!=null&&v!==''?Math.round((exp-(+v||0))*1000)/1000:null;
    return`<tr><td><b>${esc(x.name)}</b> <span class="hint">${esc(x.unit)}</span></td><td class="n">${esc(invFmt(exp))}</td>
    <td><input class="field num" data-in="countQ" data-k="${esc(x.id)}" id="cq-${esc(x.id)}" inputmode="decimal" dir="ltr" value="${esc(v??'')}" placeholder="${esc(invFmt(exp))}" style="width:110px"></td>
    <td class="n ${df&&df<0?'mis':''}" id="cd-${esc(x.id)}">${df==null?'':esc(invFmt(df))}</td></tr>`}).join(''):`<tr><td colspan="4" class="hint">${esc(t('inv_none'))}</td></tr>`}</tbody></table></div>
  ${last.length?`<div class="rp-sec"><h3>${t('inv_lastCounts')}</h3><div class="list">${last.slice(0,10).map(c=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(when(c.at))}</span><span class="s">${esc(t('inv_countLines',{n:(c.lines||[]).length}))}${c.by?' · '+esc(c.by):''}</span></span></div>`).join('')}</div></div>`:''}`;
}

/* ---------- operations: recipes, made items, units ---------- */
function invRecipesView(){
  const tb=S.rcTab||'recipes';const ic=n=>typeof ico==='function'?ico(n):'';
  const head=`<div class="row" style="justify-content:space-between"><h2>${t('tab_recipes')}</h2>${tb==='recipes'?`<button class="btn btn-sun" data-act="rcNew">+ ${t('inv_newRecipe')}</button>`:tb==='items'?`<button class="btn btn-sun" data-act="miNew">+ ${t('inv_newItem')}</button>`:''}</div>
  <div class="kind" style="margin:8px 0 12px">${[['recipes','inv_tRecipes'],['items','inv_tItems'],['units','inv_tUnits']].map(([k,l])=>`<button aria-pressed="${tb===k}" data-act="rcTab" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>`;
  if(tb==='items'){const L=[...(S.invItems||[])].sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'));
    return head+`<p class="hint">${esc(t('inv_itemsHint'))}</p><div class="list">${L.length?L.map(x=>`<button class="oc" data-act="miOpen" data-id="${esc(x.id)}"><span class="t">${esc(x.name)}</span><span class="side"><span class="tag">${esc(x.unit||'')}</span></span></button>`).join(''):`<div class="empty">${esc(t('inv_noItems'))}</div>`}</div>`}
  if(tb==='units'){const cfg=invUnitsCfg(),used=[...new Set((S.recipes||[]).flatMap(r=>(r.lines||[]).map(l=>l.item)))],q=String(S.unQ||'').trim().toLowerCase();
    const ids=[...used,...invAllItems().filter(id=>!used.includes(id))].filter(id=>!q||invItem(id).name.toLowerCase().includes(q)).slice(0,q?80:Math.max(used.length,30));
    return head+`<div class="box"><b>${t('inv_unitList')}</b><div class="ml-to" style="margin-top:8px">${cfg.units.map((u,i)=>`<span class="tag">${esc(u)} <button class="ml-x" data-act="unDel" data-i="${i}" aria-label="${esc(t('del'))}">×</button></span>`).join('')}</div>
      <div class="row" style="gap:8px;margin-top:8px"><input class="field" id="unNew" placeholder="${esc(t('inv_newUnit'))}" style="flex:1"><button class="btn btn-navy" data-act="unAdd">+ ${t('inv_addUnit')}</button></div></div>
    <div class="rp-sec"><h3>${t('inv_conv')}</h3><p class="hint">${esc(t('inv_convHint'))}</p><input class="field" data-in="unQ" id="unQ" placeholder="${esc(t('searchPh'))}" value="${esc(S.unQ||'')}" style="margin-bottom:8px">
    <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_stockUnit')}</th><th>${t('inv_rUnit')}</th><th>${t('inv_rPer')}</th></tr></thead><tbody>
    ${ids.map(id=>{const x=invItem(id),c=(cfg.items||{})[id]||{};return`<tr><td>${esc(x.name)}${used.includes(id)?` <span class="tag">${esc(t('inv_inRecipe'))}</span>`:''}</td><td>${esc(x.unit)}</td>
      <td><select class="field" data-in="convU" data-k="${esc(id)}" style="width:auto"><option value="">—</option>${cfg.units.map(u=>`<option ${c.rUnit===u?'selected':''}>${esc(u)}</option>`).join('')}</select></td>
      <td><input class="field num" data-in="convP" data-k="${esc(id)}" inputmode="decimal" dir="ltr" value="${esc(c.rPer||'')}" placeholder="12000" style="width:100px"></td></tr>`}).join('')}</tbody></table></div>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-sun" data-act="convSave">${t('waSave')}</button></div></div>`}
  const R=[...(S.recipes||[])].sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'));
  return head+`<div class="list">${R.length?R.map(r=>{const o=invItem(r.out);return`<button class="oc" data-act="rcOpen" data-id="${esc(r.id)}"><span style="min-width:0;flex:1"><span class="t">${esc(r.name)}</span><span class="s">${esc(t('inv_gives',{q:invFmt(r.yield),u:o.unit,x:o.name}))} · ${esc(t('inv_nLines',{n:(r.lines||[]).length}))}</span></span><span class="side">${ic('inv')}</span></button>`}).join(''):`<div class="empty">${esc(t('inv_noRecipes'))}</div>`}</div>`;
}
function recipeSheet(){const d=S.rcDraft||{lines:[]},isNew=S.openRc==='new',ids=invAllItems(),made=(S.invItems||[]);
  const body=`<div class="sl-grid hr-grid"><label><span class="hint">${t('inv_recipeName')}</span><input class="field" data-in="rcF" data-f="name" id="rc-name" dir="auto" value="${esc(d.name||'')}"></label>
    <label><span class="hint">${t('inv_out')}</span><select class="field" data-in="rcF" data-f="out" id="rc-out"><option value="">${esc(t('inv_pick'))}</option>${made.map(x=>`<option value="${esc(x.id)}" ${d.out===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
    <label><span class="hint">${t('inv_yield')}${d.out?' ('+esc(invItem(d.out).unit)+')':''}</span><input class="field num" data-in="rcF" data-f="yield" id="rc-yield" inputmode="decimal" dir="ltr" value="${esc(d.yield??'')}"></label></div>
  ${made.length?'':`<p class="hint">${esc(t('inv_needMade'))}</p>`}
  <h4 class="hr-sub">${t('inv_ingredients')}</h4>
  ${(d.lines||[]).map((l,i)=>`<div class="row" style="gap:8px;margin-top:6px"><select class="field" data-in="rcL" data-i="${i}" data-f="item" style="flex:2"><option value="">${esc(t('inv_pick'))}</option>${ids.map(id=>`<option value="${esc(id)}" ${l.item===id?'selected':''}>${esc(invItem(id).name)}</option>`).join('')}</select>
    <input class="field num" data-in="rcL" data-i="${i}" data-f="qty" inputmode="decimal" dir="ltr" value="${esc(l.qty??'')}" placeholder="0" style="flex:1;min-width:80px"><span class="hint" style="min-width:52px">${esc(l.item?invRUnit(l.item):'')}</span>
    <button class="btn btn-ghost rp-btn" data-act="rcLDel" data-i="${i}" aria-label="${esc(t('del'))}">×</button></div>`).join('')}
  <button class="btn btn-ghost rp-btn" data-act="rcLAdd" style="margin-top:8px">+ ${t('inv_addLine')}</button>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="rcDel">${S.confirm==='rcDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="rcSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('inv_newRecipe'):(d.name||''),body,foot)}
function madeItemSheet(){const d=S.hrDraft||{},isNew=S.openMi==='new';
  const body=`<div class="sl-grid hr-grid">${hrIn('name',t('inv_itemName'))}${hrSel('unit',t('inv_unit'),invUnitsCfg().units.map(u=>[u,u]))}</div>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="miDel">${S.confirm==='miDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="miSave">${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('inv_newItem'):(d.name||''),body,foot)}

/* ---------- operations: production of all branches, and branch stock ---------- */
function invOpsProdView(){
  const mk=S.prodMonth||monthKey(Date.now()),bf=S.prodBranch||'';
  const L=(S.prods||[]).filter(p=>String(p.at).startsWith(mk)&&(!bf||p.branch===bf)).sort((a,c)=>String(c.at).localeCompare(String(a.at)));
  const cost=p=>(p.lines||[]).reduce((s0,l)=>s0+(+l.qty||0)*(typeof itemCost==='function'?(+itemCost(l.item)||0):0),0);
  const byOut={};L.forEach(p=>{const k=p.out;byOut[k]=byOut[k]||{q:0,c:0,n:0};byOut[k].q+=+p.outQty||0;byOut[k].c+=cost(p);byOut[k].n++});
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_prod')}</h2><input class="field" type="month" id="prodMonth" value="${esc(mk)}" style="width:auto"></div>
  <div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="prodBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="prodBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_out')}</th><th>${t('inv_times')}</th><th>${t('inv_produced')}</th><th>${t('inv_cost')}</th><th>${t('inv_unitCost')}</th></tr></thead><tbody>
  ${Object.keys(byOut).length?Object.keys(byOut).map(k=>{const x=byOut[k],it=invItem(k);return`<tr><td><b>${esc(it.name)}</b></td><td class="n">${x.n}</td><td class="n">${esc(invFmt(x.q))} ${esc(it.unit)}</td><td class="n">${esc(sar2(x.c))}</td><td class="n">${x.q?esc(sar2(x.c/x.q)):'—'}</td></tr>`}).join(''):`<tr><td colspan="5" class="hint">${esc(t('fn_noData'))}</td></tr>`}</tbody></table></div>
  <div class="list" style="margin-top:12px">${L.slice(0,40).map(p=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(invItem(p.out).name)} <span class="num">+${esc(invFmt(p.outQty))}</span> <span class="tag">${esc(p.branch)}</span></span><span class="s">${esc(when(p.at))}${p.by?' · '+esc(p.by):''}</span></span><span class="side"><span class="num">${esc(sar2(cost(p)))} ${t('sar')}</span></span></div>`).join('')}</div>`;
}
function invOpsStockView(){
  const b=S.invBr||S.branches[0],st=(S.bstock||{})[b]||{};
  const rows=Object.keys(st).map(invItem).sort((a,c)=>a.name.localeCompare(c.name,'ar'));
  const last=(S.bcounts||[]).filter(c=>c.branch===b).sort((a,c)=>String(c.at).localeCompare(String(a.at)))[0];
  const usedOf=id=>{const l=last&&(last.lines||[]).find(x=>x.item===id);return l?Math.round(((+l.expected||0)-(+l.counted||0))*1000)/1000:null};
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_bstockAll')}</h2><select class="field" id="invBr" style="width:auto">${S.branches.map(x=>`<option ${x===b?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <p class="hint">${last?esc(t('inv_lastCountAt',{d:when(last.at)})):esc(t('inv_noCount'))}</p>
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_qty')}</th><th>${t('inv_unit')}</th><th>${t('inv_usedLast')}</th></tr></thead><tbody>
  ${rows.length?rows.map(x=>{const u=usedOf(x.id);return`<tr><td><b>${esc(x.name)}</b></td><td class="n">${esc(invFmt(st[x.id]))}</td><td>${esc(x.unit)}</td><td class="n">${u==null?'—':esc(invFmt(u))}</td></tr>`}).join(''):`<tr><td colspan="4" class="hint">${esc(t('inv_none'))}</td></tr>`}</tbody></table></div>`;
}

Object.assign(A,{
  invWaste(){S.openWaste=true;S.hrDraft={item:'',qty:'',reason:''};render()},
  invWasteSave(){const d=S.hrDraft||{},q=num(d.qty);if(!d.item||!(q>0)){toast(t('inv_needItemQty'));return}
    guard(async()=>{await bstockApply(S.branch,[[d.item,-q]],'waste',String(d.reason||'').trim());S.openWaste=false;S.hrDraft=null},()=>t('st_saved'))},
  prodPick(el){S.prodRec=el.dataset.k;S.prodN='1';render()},
  prodSave(){const r=(S.recipes||[]).find(x=>x.id===S.prodRec);const n=num(S.prodN);if(!r||!(n>0)){toast(t('inv_needBatches'));return}
    const need=invNeed(r,n),outQty=Math.round((+r.yield||1)*n*1000)/1000,at=nowIso(),by=S.userName||roleL(S.realRole||S.role),b=S.branch;
    guard(async()=>{
      if(S.fb)await db.collection('prods').add({branch:b,recipe:r.id,out:r.out,outQty,batches:n,lines:need.map(x=>({item:x.item,qty:x.qty})),at,by});
      else MEMSET('prods',MEM('prods').concat([{id:'PR'+Date.now(),branch:b,recipe:r.id,out:r.out,outQty,batches:n,lines:need.map(x=>({item:x.item,qty:x.qty})),at,by}]));
      await bstockApply(b,[...need.map(x=>[x.item,-x.qty])],'prod_out',r.name);
      await bstockApply(b,[[r.out,outQty]],'prod_in',r.name);
      S.prodRec=null},()=>t('inv_produced2'))},
  countSave(){const b=S.branch,st=(S.bstock||{})[b]||{},d=S.countDraft||{};
    const lines=Object.keys(d).filter(id=>d[id]!==''&&d[id]!=null&&isFinite(+d[id])).map(id=>({item:id,expected:+st[id]||0,counted:+d[id]}));
    if(!lines.length){toast(t('inv_needCount'));return}
    const at=nowIso(),by=S.userName||roleL(S.realRole||S.role);
    guard(async()=>{
      if(S.fb)await db.collection('bcounts').add({branch:b,at,by,lines});else MEMSET('bcounts',MEM('bcounts').concat([{id:'BC'+Date.now(),branch:b,at,by,lines}]));
      await bstockApply(b,lines.map(l=>[l.item,Math.round((l.counted-l.expected)*1000)/1000]),'count',t('tab_count'));
      S.countDraft={}},()=>t('inv_countSaved'))},
  rcTab(el){S.rcTab=el.dataset.k;render()},
  rcNew(){S.openRc='new';S.confirm=null;S.rcDraft={name:'',out:'',yield:'',lines:[{item:'',qty:''}]};render()},
  rcOpen(el){const r=(S.recipes||[]).find(x=>x.id===el.dataset.id);if(!r)return;S.openRc=r.id;S.confirm=null;S.rcDraft=JSON.parse(JSON.stringify(r));render()},
  rcLAdd(){(S.rcDraft.lines||(S.rcDraft.lines=[])).push({item:'',qty:''});render()},
  rcLDel(el){S.rcDraft.lines.splice(+el.dataset.i,1);render()},
  rcSave(){const d=S.rcDraft||{};const lines=(d.lines||[]).filter(l=>l.item&&num(l.qty)>0).map(l=>({item:l.item,qty:num(l.qty)}));
    if(!String(d.name||'').trim()||!d.out||!(num(d.yield)>0)||!lines.length){toast(t('inv_needRecipe2'));return}
    const id=S.openRc==='new'?hrId('RC'):S.openRc,data={name:String(d.name).trim(),out:d.out,yield:num(d.yield),lines,updatedAt:nowIso()};
    guard(async()=>{await X.put('recipes',id,data);S.openRc=null;S.rcDraft=null},()=>t('st_saved'))},
  rcDel(){const id=S.openRc;if(!id||id==='new')return;if(S.confirm!=='rcDel'){S.confirm='rcDel';render();return}
    guard(async()=>{await X.del('recipes',id);S.openRc=null;S.confirm=null},()=>t('li_deleted'))},
  miNew(){S.openMi='new';S.confirm=null;S.hrDraft={name:'',unit:invUnitsCfg().units[1]||''};render()},
  miOpen(el){const x=(S.invItems||[]).find(v=>v.id===el.dataset.id);if(!x)return;S.openMi=x.id;S.confirm=null;S.hrDraft=Object.assign({},x);render()},
  miSave(){const d=S.hrDraft||{},name=String(d.name||'').trim();if(!name){toast(t('inv_needName'));return}
    const id=S.openMi==='new'?'mi-'+Date.now().toString(36):S.openMi;guard(async()=>{await X.put('invItems',id,{name,unit:d.unit||''});S.openMi=null;S.hrDraft=null},()=>t('st_saved'))},
  miDel(){const id=S.openMi;if(!id||id==='new')return;if((S.recipes||[]).some(r=>r.out===id||(r.lines||[]).some(l=>l.item===id))){toast(t('inv_itemUsed'));return}
    if(S.confirm!=='miDel'){S.confirm='miDel';render();return}guard(async()=>{await X.del('invItems',id);S.openMi=null;S.confirm=null},()=>t('li_deleted'))},
  unAdd(){const el=document.getElementById('unNew'),u=String(el&&el.value||'').trim();if(!u)return;const c=invUnitsCfg();if(c.units.includes(u))return;
    invSaveUnits(Object.assign({},c,{units:[...c.units,u]}))},
  unDel(el){const c=invUnitsCfg(),u=c.units[+el.dataset.i];if(Object.values(c.items||{}).some(x=>x.rUnit===u)||(S.invItems||[]).some(x=>x.unit===u)){toast(t('inv_unitUsed'));return}
    invSaveUnits(Object.assign({},c,{units:c.units.filter((_,i)=>i!==+el.dataset.i)}))},
  convSave(){const c=invUnitsCfg(),items=Object.assign({},c.items||{},S.convDraft||{});
    for(const k of Object.keys(items)){const x=items[k];if(!x||!x.rUnit||!(+x.rPer>0))delete items[k]}
    invSaveUnits(Object.assign({},c,{items}),true)},
  prodBranch(el){S.prodBranch=el.dataset.k;render()}
});
function invSaveUnits(cfg,clear){guard(async()=>{if(S.fb)await db.doc('config/invUnits').set(cfg);else{MEMSET('invUnits',cfg);xLoadDemo()}if(clear)S.convDraft=null;S.invUnits=cfg},()=>t('st_saved'))}
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='invQ'){S.invQ=el.value;clearTimeout(S._invT);S._invT=setTimeout(render,180)}
  else if(k==='unQ'){S.unQ=el.value;clearTimeout(S._invT);S._invT=setTimeout(render,180)}
  else if(k==='prodN'){S.prodN=el.value;clearTimeout(S._invT);S._invT=setTimeout(render,350)}
  else if(k==='countQ'){const d=S.countDraft||(S.countDraft={});d[el.dataset.k]=el.value;const exp=+(((S.bstock||{})[S.branch]||{})[el.dataset.k]||0),o=document.getElementById('cd-'+el.dataset.k);
    if(o)o.textContent=el.value===''?'':invFmt(Math.round((exp-(+el.value||0))*1000)/1000)}
  else if(k==='rcF'){S.rcDraft[el.dataset.f]=el.value}
  else if(k==='rcL'){S.rcDraft.lines[+el.dataset.i][el.dataset.f]=el.value}
  else if(k==='convP'||k==='convU'){const d=S.convDraft||(S.convDraft={}),id=el.dataset.k,cur=Object.assign({},(invUnitsCfg().items||{})[id]||{},d[id]||{});
    if(k==='convP')cur.rPer=el.value;else cur.rUnit=el.value;d[id]=cur}});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.dataset&&(el.dataset.in==='rcF'&&el.dataset.f==='out'||el.dataset.in==='rcL'&&el.dataset.f==='item'))render();
  if(el.id==='prodMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.prodMonth=el.value;render()}
  if(el.id==='invBr'){S.invBr=el.value;render()}});
