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
  const head=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_pcost')}</h2><div class="row" style="gap:6px">${S.role==='manager'?`<details class="io-menu"><summary class="btn btn-ghost rp-btn">${t('io_menu')} <span aria-hidden="true" class="io-car">${typeof ico==='function'?ico('chevron'):'▾'}</span></summary><div class="io-pop" role="menu"><button class="io-item" role="menuitem" data-act="pcXls">${typeof ico==='function'?ico('download','b-ic'):''}${t('io_export')}</button><label class="io-item io-imp" role="menuitem">${typeof ico==='function'?ico('upload','b-ic'):''}${t('io_import')}<input type="file" id="pcImp" accept=".xlsx,.xls" aria-label="${esc(t('io_import'))}"></label></div></details>`:`<button class="btn btn-ghost rp-btn" data-act="pcXls">${t('xlsExport')}</button>`}<button class="btn btn-ghost rp-btn" data-act="pcPrint">${t('fm_print')}</button></div></div>
  <div class="kind" style="margin:8px 0">${[['products','pc_tProducts'],['prod','pc_tProd']].map(([k,l])=>`<button aria-pressed="${tb===k}" data-act="pcTab" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
  ${S.pcImpRes&&(S.pcImpRes.noProd.length||S.pcImpRes.skipped.length)?`<div class="box" style="border-color:var(--late)">${S.pcImpRes.noProd.length?`<div><b>${esc(t('pc_impNoProd'))}</b> ${S.pcImpRes.noProd.map(esc).join('، ')}</div>`:''}${S.pcImpRes.skipped.length?`<div><b>${esc(t('pc_impSkipped'))}</b> ${S.pcImpRes.skipped.slice(0,20).map(esc).join('، ')}</div>`:''}</div>`:''}
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
  pcXls(){saveXlsx('maskob-product-cost.xlsx',pcSheets())},
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

/* ---------- Excel: the same workbook out and back in ----------
   sheet 1 (products): product | component | quantity | unit | unit price (before VAT) | totals (ignored on import)
   sheet 2 (production recipes): recipe | output item | output unit | yield per batch | component | quantity */
function pcSheets(){const rows=[];(S.products||[]).forEach(p=>{(p.lines||[]).forEach(l=>{const c=pcLineCost(l);rows.push([p.name,pcLineName(l),+l.qty||0,pcLineUnit(l),Math.round(pcUnitPrice(l)*10000)/10000,+c.toFixed(2),+(c*pcVat()).toFixed(2),+(c*(1+pcVat())).toFixed(2)])});
    const tot=prodCost(p);rows.push([p.name,t('pc_total'),'','','',+tot.toFixed(2),+(tot*pcVat()).toFixed(2),+(tot*(1+pcVat())).toFixed(2)])});
  const rrows=[];(S.recipes||[]).forEach(r=>{const o=invItem(r.out);(r.lines||[]).forEach(l=>rrows.push([r.name,o.name,o.unit,+r.yield||0,invItem(l.item).name,+l.qty||0]))});
  return[{name:t('pc_tProducts'),headers:[t('pc_product'),t('pc_comp'),t('inv_qty'),t('inv_unit'),t('pc_unitPrice'),t('pc_beforeVat'),t('pc_vat'),t('pc_withVat')],rows},
    {name:t('pc_tProd'),headers:[t('pc_recipe'),t('inv_out'),t('pc_outUnit'),t('inv_yield'),t('pc_comp'),t('inv_qty')],rows:rrows.length?rrows:[['','','','','','']]}]}
const pcFindItem=name=>{const n=meNorm(name);if(!n)return'';return invAllItems().find(id=>meNorm(invItem(id).name)===n)||''};
const pcCol=(hdr,...keys)=>hdr.findIndex(h=>keys.some(k=>h===k||h.includes(k)));
/* rows → {products:{name:[lines]}, recipes:{name:{out,unit,yield,lines}}} plus problems */
function pcParse(sheets){const out={products:{},recipes:{},skipped:[]};const H=v=>meNorm(v);
  const sets=[t('pc_total'),'تكلفة المنتج','product cost','total'].map(H);
  for(const aoa of sheets){let hi=-1,hdr=[];for(let r=0;r<Math.min(aoa.length,10);r++){const row=(aoa[r]||[]).map(H);if(pcCol(row,H(t('pc_comp')),'المكون','component')>=0){hi=r;hdr=row;break}}
    if(hi<0)continue;const cRec=pcCol(hdr,H(t('pc_recipe')),'الوصفه','recipe'),cComp=pcCol(hdr,H(t('pc_comp')),'المكون','component'),cQty=pcCol(hdr,H(t('inv_qty')),'الكميه','quantity','qty');
    if(cRec>=0){const cOut=pcCol(hdr,H(t('inv_out')),'الصنف الناتج','output'),cOU=pcCol(hdr,H(t('pc_outUnit')),'وحده الناتج','output unit'),cY=pcCol(hdr,H(t('inv_yield')),'الناتج للدفعه','yield');
      for(let r=hi+1;r<aoa.length;r++){const row=aoa[r]||[],rn=String(row[cRec]||'').trim(),comp=String(row[cComp]||'').trim(),q=+String(row[cQty]).replace(',','.');if(!rn||!comp||!(q>0))continue;
        const R=out.recipes[rn]||(out.recipes[rn]={out:String(row[cOut]||'').trim(),unit:cOU>=0?String(row[cOU]||'').trim():'',yield:+row[cY]||0,lines:[]});const item=pcFindItem(comp);
        if(item)R.lines.push({item,qty:q});else out.skipped.push(rn+': '+comp)}
      continue}
    const cProd=pcCol(hdr,H(t('pc_product')),'المنتج','product'),cUnit=pcCol(hdr,H(t('inv_unit')),'الوحده','unit'),cPrice=pcCol(hdr,H(t('pc_unitPrice')),'سعر الوحده','unit price');if(cProd<0)continue;
    for(let r=hi+1;r<aoa.length;r++){const row=aoa[r]||[],pn=String(row[cProd]||'').trim(),comp=String(row[cComp]||'').trim(),q=+String(row[cQty]).replace(',','.');
      if(!pn||!comp||sets.includes(H(comp))||!(q>0))continue;const item=pcFindItem(comp),price=cPrice>=0&&String(row[cPrice]).trim()!==''?+String(row[cPrice]).replace(',','.'):null;
      const L=out.products[pn]||(out.products[pn]=[]);
      if(item){const l={item,qty:q};const auto=pcUnitPrice({item});if(price!=null&&isFinite(price)&&!(auto>0&&Math.abs(price-auto)<=Math.max(0.0001,auto*0.01)))l.price=price;L.push(l)}
      else L.push(Object.assign({name:comp,unit:cUnit>=0?String(row[cUnit]||'').trim():'',qty:q},price!=null&&isFinite(price)?{price}:{}))}}
  return out}
async function pcImport(file){await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const sheets=wb.SheetNames.map(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}));const P=pcParse(sheets),tm=nowIso();
  let np=0,nr=0,ni=0;const noProd=[];
  for(const name of Object.keys(P.products)){const p=(S.products||[]).find(x=>meNorm(x.name)===meNorm(name));if(!p){noProd.push(name);continue}
    await X.upd('products',p.id,{lines:P.products[name],updatedAt:tm});np++}
  for(const name of Object.keys(P.recipes)){const R=P.recipes[name];if(!R.lines.length||!(R.yield>0))continue;
    let out=pcFindItem(R.out);if(!out&&R.out){out='mi-'+Date.now().toString(36)+(ni++).toString(36);await X.put('invItems',out,{name:R.out,unit:R.unit||''})}if(!out)continue;
    const old=(S.recipes||[]).find(x=>meNorm(x.name)===meNorm(name));await X.put('recipes',old?old.id:hrId('RC'),{name,out,yield:R.yield,lines:R.lines,updatedAt:tm});nr++}
  return{np,nr,noProd,skipped:P.skipped}}
document.addEventListener('change',async ev=>{const el=ev.target;if(el.id!=='pcImp'||!el.files||!el.files[0])return;
  try{const r=await pcImport(el.files[0]);S.pcImpRes=r;toast(t('pc_impDone',{p:r.np,r:r.nr}))}catch(e){toast(t('saveFail'))}el.value='';render()});
