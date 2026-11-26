/* Maskob — Warehouse stock: balances, supplier receipts, stock counts and low-stock alerts.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   stock/{itemId}:   {qty, min, updatedAt}
   stockMoves/{id}:  {item, delta, type receive|issue|return|adjust, ref, note, at, by}
   Shipping an order to a branch takes the sent quantities out; a return received by the warehouse
   puts the received quantities back. Warehouse edits; operations can look. */
const stockOf=id=>(S.stock&&S.stock[id])||{};
const stockQty=id=>+(stockOf(id).qty||0);
const stockState=id=>{const s=stockOf(id),q=+(s.qty||0),m=+(s.min||0);return q<=0&&(s.qty!=null||m>0)?'out':m>0&&q<=m?'low':'ok'};
const stockLow=()=>ITEMS.filter(it=>['low','out'].includes(stockState(it.id)));
const moveBy=()=>S.userName||roleL(S.realRole||S.role);
/* change balances: changes = [[itemId, +/-qty], …] */
async function stockApply(changes,type,ref,note){
  const tm=nowIso();const list=changes.filter(c=>c[0]&&+c[1]);if(!list.length)return;
  if(S.fb){
    const inc=firebase.firestore.FieldValue.increment;
    for(const [item,delta] of list){
      await db.doc('stock/'+item).set({qty:inc(+delta),updatedAt:tm},{merge:true});
      await db.collection('stockMoves').add({item,delta:+delta,type,ref:String(ref||''),note:String(note||''),at:tm,by:moveBy()});
    }
    return;
  }
  const st=Object.assign({},MEM('stock'));const mv=MEM('stockMoves');
  for(const [item,delta] of list){st[item]=Object.assign({},st[item]||{},{qty:r2p((+(st[item]||{}).qty||0)+(+delta)),updatedAt:tm});
    mv.unshift({item,delta:+delta,type,ref:String(ref||''),note:String(note||''),at:tm,by:moveBy()})}
  MEMSET('stock',st);MEMSET('stockMoves',mv.slice(0,1000));xLoadDemo();render();
}
async function stockSet(item,data){
  if(S.fb)return db.doc('stock/'+item).set(Object.assign({},data,{updatedAt:nowIso()}),{merge:true});
  const st=Object.assign({},MEM('stock'));st[item]=Object.assign({},st[item]||{},data,{updatedAt:nowIso()});MEMSET('stock',st);xLoadDemo();render();
}
/* ---------- page ---------- */
function stockView(){
  const edit=S.role==='warehouse';const f=S.stFilter||'all',q=String(S.stQ||'').trim().toLowerCase(),cf=S.stCat||'';
  const items=ITEMS.filter(it=>(!cf||it.cat===cf)&&(!q||[it.ar,it.en,it.sku].some(v=>String(v||'').toLowerCase().includes(q)))
    &&(f==='all'||(f==='low'&&stockState(it.id)==='low')||(f==='out'&&stockState(it.id)==='out')));
  const low=ITEMS.filter(it=>stockState(it.id)==='low').length,out=ITEMS.filter(it=>stockState(it.id)==='out').length;
  const moves=(S.stockMoves||[]).slice(0,40);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_stock')}</h2>${edit?`<div class="row">${ioBtns('stock')}<button class="btn btn-sun" data-act="stRecv">+ ${t('st_receive')}</button></div>`:''}</div>
  <div class="stats">${kpi(t('st_items'),sar(ITEMS.filter(it=>stockOf(it.id).qty!=null).length))}${kpi(t('st_low'),sar(low),low?'hot':'')}${kpi(t('st_out'),sar(out),out?'hot':'')}</div>
  <div class="filters">${[['all','f_all'],['low','st_low'],['out','st_out']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="stFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="row hr-filter"><input class="field" id="stQ" data-in="stQ" placeholder="${esc(t('cat_search'))}" value="${esc(S.stQ||'')}" style="flex:2;min-width:180px">
    <select class="field" id="stCat" style="flex:1;min-width:140px"><option value="">${esc(t('cat_allCats'))}</option>${CATS.map(c=>`<option value="${c.k}" ${cf===c.k?'selected':''}>${esc(catName(c))}</option>`).join('')}</select></div>
  <div class="scroll"><table class="tbl st-tbl"><thead><tr><th>${t('c_item')}</th><th>${t('c_unit')}</th><th>${t('st_qty')}</th><th>${t('st_min')}</th><th></th></tr></thead><tbody>
  ${items.map(it=>{const s=stockOf(it.id),st=stockState(it.id);return`<tr class="st-${st}"><td><b>${esc(nameOf_(it))}</b>${it.sku?`<div class="hint" dir="ltr">${esc(it.sku)}</div>`:''}</td><td>${esc(unitL(it.uk))}</td>
    <td class="n"><b>${s.qty==null?'—':esc(fmt(s.qty))}</b></td><td class="n">${s.min?esc(fmt(s.min)):'—'}</td>
    <td>${edit?`<button class="btn btn-ghost rp-btn" data-act="stOpen" data-id="${esc(it.id)}">${t('st_count')}</button>`:st!=='ok'?`<span class="pill ${st==='out'?'li-expired':'li-soon'}">${t('st_'+st)}</span>`:''}</td></tr>`}).join('')||`<tr><td colspan="5" class="hint">${esc(t('hr_noMatch'))}</td></tr>`}</tbody></table></div>
  <div class="rp-sec"><h3>${t('st_moves')}</h3>${moves.length?`<div class="scroll"><table class="tbl"><thead><tr><th>${t('lg_when')}</th><th>${t('c_item')}</th><th>${t('st_qty')}</th><th>${t('st_type')}</th><th>${t('st_ref')}</th><th>${t('lg_who')}</th></tr></thead><tbody>
    ${moves.map(m=>{const i=lineInfo({id:m.item});return`<tr><td class="n">${esc(when(m.at))}</td><td>${esc(i.name)}</td><td class="n ${m.delta<0?'mis':''}" dir="ltr">${m.delta>0?'+':''}${esc(fmt(m.delta))}</td><td>${esc(t('sm_'+m.type))}</td><td>${esc(m.ref||'')}${m.note?' — '+esc(m.note):''}</td><td>${esc(m.by||'')}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="hint">${esc(t('st_noMoves'))}</div>`}</div>`;
}
/* receive from a supplier: several lines at once */
function stockRecvSheet(){
  const d=S.hrDraft||{lines:[]};
  const opts=[['',t('st_pickItem')],...ITEMS.map(it=>[it.id,nameOf_(it)+' ('+unitL(it.uk)+')'])];
  const body=`<div class="sl-grid hr-grid">${hrIn('supplier',t('st_supplier'))}${hrIn('invoice',t('st_invoice'),'text','dir="ltr"')}</div>
  <div class="st-lines">${(d.lines||[]).map((l,i)=>`<div class="row st-line"><select class="field" id="stl-item-${i}" data-in="stLine" data-i="${i}" data-f="item" style="flex:3;min-width:180px">${opts.map(([v,lab])=>`<option value="${esc(v)}" ${l.item===v?'selected':''}>${esc(lab)}</option>`).join('')}</select>
    <input class="field num" id="stl-qty-${i}" data-in="stLine" data-i="${i}" data-f="qty" inputmode="decimal" dir="ltr" placeholder="${esc(t('st_qty'))}" value="${esc(l.qty||'')}" style="flex:1;min-width:90px">
    <button class="x" data-act="stLineDel" data-i="${i}" aria-label="${esc(t('del'))}">×</button></div>`).join('')}</div>
  <button class="btn btn-ghost rp-btn" data-act="stLineAdd">+ ${t('st_addLine')}</button>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>`;
  return hrSheetWrap(t('st_receive'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="stRecvSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`);
}
/* one item: count (set the real quantity) and minimum level */
function stockItemSheet(){
  const it=ITEM[S.openStock];if(!it)return'';const s=stockOf(it.id),d=S.hrDraft||{};
  const moves=(S.stockMoves||[]).filter(m=>m.item===it.id).slice(0,10);
  const body=`<div class="box"><b>${esc(nameOf_(it))}</b> <span class="hint">${esc(unitL(it.uk))}</span><div class="stats" style="margin-top:8px">${kpi(t('st_qty'),s.qty==null?'—':esc(fmt(s.qty)))}${kpi(t('st_min'),s.min?esc(fmt(s.min)):'—')}</div></div>
  <div class="sl-grid hr-grid">${hrIn('counted',t('st_counted'),'number','dir="ltr" inputmode="decimal"')}${hrIn('min',t('st_min'),'number','dir="ltr" inputmode="decimal"')}</div>
  <p class="hint">${esc(t('st_countHint'))}</p>
  ${moves.length?`<h4 class="hr-sub">${t('st_moves')}</h4>${moves.map(m=>`<div class="hint">${esc(when(m.at))} · <span dir="ltr">${m.delta>0?'+':''}${esc(fmt(m.delta))}</span> · ${esc(t('sm_'+m.type))}${m.ref?' · '+esc(m.ref):''}</div>`).join('')}`:''}`;
  return hrSheetWrap(t('st_count'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="stSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`);
}
Object.assign(A,{
  stFilter(el){S.stFilter=el.dataset.k;render()},
  stRecv(){S.openStockRecv=true;S.hrDraft={supplier:'',invoice:'',note:'',lines:[{item:'',qty:''}]};render()},
  stLineAdd(){S.hrDraft.lines.push({item:'',qty:''});render()},
  stLineDel(el){S.hrDraft.lines.splice(+el.dataset.i,1);if(!S.hrDraft.lines.length)S.hrDraft.lines.push({item:'',qty:''});render()},
  stRecvSave(){const d=S.hrDraft||{};const lines=(d.lines||[]).filter(l=>l.item&&num(l.qty)>0);
    if(!lines.length){toast(t('st_needLines'));return}
    const ref=[String(d.supplier||'').trim(),String(d.invoice||'').trim()].filter(Boolean).join(' — ');
    guard(async()=>{await stockApply(lines.map(l=>[l.item,num(l.qty)]),'receive',ref,d.note);S.openStockRecv=null;S.hrDraft=null},()=>t('st_received',{n:lines.length}))},
  stOpen(el){S.openStock=el.dataset.id;const s=stockOf(el.dataset.id);S.hrDraft={counted:'',min:s.min??''};render()},
  stSave(){const id=S.openStock;const d=S.hrDraft||{};const s=stockOf(id);
    guard(async()=>{
      if(d.counted!==''&&d.counted!=null){const delta=r2p(num(d.counted)-(+s.qty||0));if(delta)await stockApply([[id,delta]],'adjust',t('st_countRef'));else if(s.qty==null)await stockSet(id,{qty:num(d.counted)})}
      if(String(d.min??'')!==String(s.min??''))await stockSet(id,{min:d.min===''?null:num(d.min)});
      S.openStock=null;S.hrDraft=null},()=>t('st_saved'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(!el.dataset)return;
  if(el.dataset.in==='stQ'){S.stQ=el.value;clearTimeout(S._stT);S._stT=setTimeout(render,160)}
  if(el.dataset.in==='stLine'&&S.hrDraft&&S.hrDraft.lines){S.hrDraft.lines[+el.dataset.i][el.dataset.f]=el.value}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='stCat'){S.stCat=el.value;render()}});
/* Excel: count sheet in and out (code, name, quantity, minimum) */
IO.stock={name:()=>t('tab_stock'),list:()=>ITEMS.map(it=>({id:it.id,name:nameOf_(it),unit:unitL(it.uk),qty:stockOf(it.id).qty,min:stockOf(it.id).min})),
  cols:[['id','cat_code','text',1],['name','c_item'],['unit','c_unit'],['qty','st_qty','num'],['min','st_min','num']],
  match:(r,L)=>L.find(x=>x.id===r.id),build:(r,o)=>Object.assign({},o||{},r),idOf:d=>d.id,
  commit:async items=>{for(const x of items){if(!ITEM[x.id])continue;const s=stockOf(x.id);
    if(x.data.qty!=null&&+x.data.qty!==+(s.qty||0))await stockApply([[x.id,r2p(+x.data.qty-(+s.qty||0))]],'adjust',t('st_importRef'));
    if(x.data.min!=null&&+x.data.min!==+(s.min||0))await stockSet(x.id,{min:+x.data.min})}}};
