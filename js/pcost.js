/* Maskob — product costing (تكلفة المنتجات) for operations, in the company's sheet layout: for each product its components
   with quantity, unit, unit price, total before VAT, VAT and total with VAT, then the product cost. Components come from
   the stock items (price from the warehouse cost through the unit conversion, or a made item's recipe) or are typed in
   with their own unit price (cups, lids, bags…). The same lines drive the item margin, menu engineering and the stock
   taken off a branch when its product sales are uploaded. Production recipes are shown in the same layout. */
const pcVat=()=>VAT_RATE/100;
/* unit price of a component line, before VAT, per recipe unit */
function pcUnitPrice(l){if(l.price!=null&&l.price!==''&&isFinite(+l.price))return+l.price;if(!l.item)return 0;
  const c=typeof unitCostOf==='function'?unitCostOf(l.item):(+itemCost(l.item)||0),cv=typeof invConv==='function'?invConv(l.item):null;return cv?c/cv.rPer:c}
const pcLineName=l=>l.item?invItem(l.item).name:(l.name||'');
const pcLineUnit=l=>l.item?(typeof invRUnit==='function'?invRUnit(l.item):invItem(l.item).unit):(l.unit||'');
const pcLineCost=l=>(+l.qty||0)*pcUnitPrice(l);
function pcTable(title,lines,foot){const r4=v=>{const x=Math.round(v*10000)/10000;return String(x)};
  const tot=lines.reduce((s0,l)=>s0+pcLineCost(l),0);
  return`<div class="pc-card"><div class="pc-title">${t('pc_product')}: <b>${esc(title)}</b></div>
  <div class="scroll"><table class="tbl pc-tbl"><thead><tr><th>${t('pc_comp')}</th><th>${t('inv_qty')}</th><th>${t('inv_unit')}</th><th>${t('pc_unitPrice')}</th><th>${t('pc_beforeVat')}</th><th>${t('pc_vat')}</th><th>${t('pc_withVat')}</th></tr></thead><tbody>
  ${lines.map(l=>{const c=pcLineCost(l);return`<tr><td>${esc(pcLineName(l))}</td><td class="n">${esc(invFmt(l.qty))}</td><td>${esc(pcLineUnit(l))}</td><td class="n">${esc(r4(pcUnitPrice(l)))}</td><td class="n">${esc(c.toFixed(2))}</td><td class="n">${esc((c*pcVat()).toFixed(2))}</td><td class="n">${esc((c*(1+pcVat())).toFixed(2))}</td></tr>`}).join('')||`<tr><td colspan="7" class="hint">${esc(t('pc_noLines'))}</td></tr>`}
  <tr class="pc-sum"><td colspan="4">${t('pc_total')}</td><td class="n">${esc(tot.toFixed(2))}</td><td></td><td class="n">${esc((tot*(1+pcVat())).toFixed(2))}</td></tr></tbody></table></div>${foot||''}</div>`}
function pcostView(){const tb=S.pcTab||'products',q=meNorm?meNorm(S.pcQ||''):String(S.pcQ||'');
  const head=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_pcost')}</h2><div class="row" style="gap:6px"><button class="btn btn-ghost rp-btn" data-act="pcXls">${t('xlsExport')}</button><button class="btn btn-ghost rp-btn" data-act="pcPrint">${t('fm_print')}</button></div></div>
  <div class="kind" style="margin:8px 0">${[['products','pc_tProducts'],['prod','pc_tProd']].map(([k,l])=>`<button aria-pressed="${tb===k}" data-act="pcTab" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
  <input class="field" id="pcQ" data-in="pcQ" placeholder="${esc(t('searchPh'))}" value="${esc(S.pcQ||'')}" style="margin-bottom:10px">`;
  if(tb==='prod'){const R=[...(S.recipes||[])].filter(r=>!q||meNorm(r.name).includes(q)).sort((a,c)=>String(a.name).localeCompare(String(c.name),'ar'));
    return head+`<p class="hint">${esc(t('pc_prodHint'))}</p>`+(R.map(r=>{const o=invItem(r.out),lines=(r.lines||[]).map(l=>({item:l.item,qty:l.qty})),tot=lines.reduce((s0,l)=>s0+pcLineCost(l),0);
      return pcTable(r.name,lines,`<p class="hint">${esc(t('pc_perUnit',{y:invFmt(r.yield),u:o.unit,x:o.name,c:(+r.yield?tot/r.yield:0).toFixed(3)}))}</p>`)}).join('')||`<div class="empty">${esc(t('inv_noRecipes'))}</div>`)}
  const P=[...(S.products||[])].filter(p=>!q||meNorm(p.name).includes(q)).sort((a,c)=>{const cats=menuCats();return(cats.indexOf(a.cat)-cats.indexOf(c.cat))||String(a.name).localeCompare(String(c.name),'ar')});
  return head+`<p class="hint">${esc(t('pc_hint'))}</p>`+(P.map(p=>{const tot=prodCost(p),n=prodNet(p);
    return pcTable(p.name,p.lines||[],`<div class="row pc-foot"><span class="hint">${esc(t('pc_priceLine',{p:sar2(p.price),n:sar2(n),m:sar2(n-tot),c:n?sar2(tot/n*100):'—'}))}</span>${S.role==='manager'?`<button class="btn btn-navy rp-btn" data-act="pcOpen" data-id="${esc(p.id)}">${t('pc_edit')}</button>`:''}</div>`)}).join('')||`<div class="empty">${esc(t('mn_none'))}</div>`)}
/* the editor: the same table with inputs */
function pcSheet(){const p=(S.products||[]).find(x=>x.id===S.openPc);if(!p)return'';const L=S.pcLines||[],ids=invAllItems();
  const tot=L.reduce((s0,l)=>s0+(+l.qty||0)*pcUnitPrice(l),0),n=prodNet(p);
  const body=`<p class="hint">${esc(t('pc_editHint'))}</p><div class="scroll"><table class="tbl pc-tbl"><thead><tr><th>${t('pc_comp')}</th><th>${t('inv_qty')}</th><th>${t('inv_unit')}</th><th>${t('pc_unitPrice')}</th><th>${t('pc_beforeVat')}</th><th></th></tr></thead><tbody>
  ${L.map((l,i)=>{const auto=l.item?(()=>{const c=unitCostOf(l.item),cv=invConv(l.item);return cv?c/cv.rPer:c})():null;return`<tr>
    <td><select class="field" data-in="pcL" data-i="${i}" data-f="item" style="min-width:150px"><option value="">${esc(t('pc_free'))}</option>${ids.map(id=>`<option value="${esc(id)}" ${l.item===id?'selected':''}>${esc(invItem(id).name)}</option>`).join('')}</select>${l.item?'':`<input class="field" data-in="pcL" data-i="${i}" data-f="name" dir="auto" placeholder="${esc(t('pc_compName'))}" value="${esc(l.name||'')}" style="margin-top:4px">`}</td>
    <td><input class="field num" data-in="pcL" data-i="${i}" data-f="qty" inputmode="decimal" dir="ltr" value="${esc(l.qty??'')}" style="width:80px"></td>
    <td>${l.item?esc(pcLineUnit(l)):`<input class="field" data-in="pcL" data-i="${i}" data-f="unit" dir="auto" value="${esc(l.unit||'')}" style="width:70px">`}</td>
    <td><input class="field num" data-in="pcL" data-i="${i}" data-f="price" inputmode="decimal" dir="ltr" value="${esc(l.price??'')}" placeholder="${auto!=null?esc(String(Math.round(auto*10000)/10000)):'0'}" style="width:90px"></td>
    <td class="n" id="pcc-${i}">${esc(((+l.qty||0)*pcUnitPrice(l)).toFixed(2))}</td>
    <td><button class="btn btn-ghost rp-btn" data-act="pcLDel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></td></tr>`}).join('')}
  <tr class="pc-sum"><td colspan="4">${t('pc_total')}</td><td class="n" id="pcTot">${esc(tot.toFixed(2))}</td><td></td></tr></tbody></table></div>
  <button class="btn btn-ghost rp-btn" data-act="pcLAdd" style="margin-top:8px">+ ${t('pc_comp')}</button>
  <p class="hint" id="pcMargin">${esc(t('pc_priceLine',{p:sar2(p.price),n:sar2(n),m:sar2(n-tot),c:n?sar2(tot/n*100):'—'}))}</p>`;
  return hrSheetWrap(t('pc_editTitle',{x:p.name}),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="pcSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`)}
const pcClean=L=>L.filter(l=>(l.item||String(l.name||'').trim())&&num(l.qty)>0).map(l=>{const o={qty:num(l.qty)};if(l.item)o.item=l.item;else{o.name=String(l.name).trim();o.unit=String(l.unit||'').trim()}
  if(l.price!=null&&l.price!==''&&isFinite(+String(l.price).replace(',','.')))o.price=+String(l.price).replace(',','.');return o});
Object.assign(A,{
  pcTab(el){S.pcTab=el.dataset.k;render()},
  pcOpen(el){S.openPd=null;const p=(S.products||[]).find(x=>x.id===el.dataset.id);if(!p)return;S.openPc=p.id;S.pcLines=JSON.parse(JSON.stringify(p.lines||[]));if(!S.pcLines.length)S.pcLines.push({item:'',qty:''});render()},
  pcLAdd(){S.pcLines.push({item:'',qty:''});render()},
  pcLDel(el){S.pcLines.splice(+el.dataset.i,1);render()},
  pcSave(){const p=(S.products||[]).find(x=>x.id===S.openPc);if(!p)return;const lines=pcClean(S.pcLines||[]);
    guard(async()=>{await X.upd('products',p.id,{lines,updatedAt:nowIso()});S.openPc=null;S.pcLines=null},()=>t('st_saved'))},
  pcPrint(){window.print()},
  pcXls(){const rows=[];(S.products||[]).forEach(p=>{(p.lines||[]).forEach(l=>{const c=pcLineCost(l);rows.push([p.name,pcLineName(l),+l.qty||0,pcLineUnit(l),Math.round(pcUnitPrice(l)*10000)/10000,+c.toFixed(2),+(c*pcVat()).toFixed(2),+(c*(1+pcVat())).toFixed(2)])});
      const tot=prodCost(p);rows.push([p.name,t('pc_total'),'','','',+tot.toFixed(2),+(tot*pcVat()).toFixed(2),+(tot*(1+pcVat())).toFixed(2)])});
    saveXlsx('maskob-product-cost.xlsx',[{name:t('tab_pcost'),headers:[t('pc_product'),t('pc_comp'),t('inv_qty'),t('inv_unit'),t('pc_unitPrice'),t('pc_beforeVat'),t('pc_vat'),t('pc_withVat')],rows}])}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='pcQ'){S.pcQ=el.value;clearTimeout(S._pcT);S._pcT=setTimeout(render,200)}
  else if(k==='pcL'&&S.pcLines){const l=S.pcLines[+el.dataset.i];l[el.dataset.f]=el.value;
    const c=document.getElementById('pcc-'+el.dataset.i);if(c)c.textContent=((+String(l.qty).replace(',','.')||0)*pcUnitPrice(l)).toFixed(2);
    const T=document.getElementById('pcTot');if(T)T.textContent=S.pcLines.reduce((s0,x)=>s0+(+String(x.qty).replace(',','.')||0)*pcUnitPrice(x),0).toFixed(2)}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='pcL'&&el.dataset.f==='item'){if(S.pcLines){S.pcLines[+el.dataset.i].price=''}render()}});
EXT.tabs.push({k:'pcost',l:'tab_pcost',roles:['manager'],g:'menu',view:pcostView},{k:'pcost',l:'tab_pcost',roles:['finance'],g:'rep',view:pcostView});
EXT.sheets.push(()=>S.openPc?pcSheet():'');
EXT.close.push(()=>{S.openPc=null;S.pcLines=null});
