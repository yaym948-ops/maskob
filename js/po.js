/* Maskob — purchase orders to suppliers (أوامر الشراء) and the three-way match (مطابقة المستندات الثلاثة).
   A branch picks a supplier and the items, and can send the list to the supplier on WhatsApp; operations approves
   (quote photos needed above 5,000 SAR); the branch records what arrived (catalog items go into its stock); finance
   matches order ↔ receipt ↔ supplier invoice before paying. Price rises against the last order from the same supplier
   are flagged.
   pos/{id}: {num, branch, supplierId, supplier, phone, lines:[{item, name, unit, qty, price, recv}], note, status:
              'pending'|'approved'|'rejected'|'received'|'matched', at, by, apAt, apBy, apNote, recvAt, recvBy, recvNote,
              invoice, matchAt, matchBy, matchNote, photos}
   config/supList: {list:[{id, name, phone, cat}]} — names and phones of suppliers for branches and operations (kept by finance) */
const PO_QUOTES=5000;
const poById=id=>(S.pos||[]).find(x=>x.id===id);
const poSups=()=>S.role==='finance'?(S.suppliers||[]).map(s=>({id:s.id,name:s.name,phone:s.phone||'',cat:s.cat||''})):(((S.supList||{}).list)||[]);
const poTotal=(p,k)=>(p.lines||[]).reduce((s0,l)=>s0+(+(k==='recv'?(l.recv??0):l.qty)||0)*(+l.price||0),0);
const poLineName=l=>l.item&&ITEM[l.item]?nameOf_(ITEM[l.item]):(l.name||'');
const poLineUnit=l=>l.item&&ITEM[l.item]?unitL(ITEM[l.item].uk):(l.unit||'');
const PO_ST={pending:'ms-progress',approved:'ms-progress',received:'ms-progress',matched:'ms-done',rejected:'li-expired'};
/* last price of the same item from the same supplier in an earlier order */
function poLastPrice(p,l){const key=l.item||poLineName(l);let best=null;
  (S.pos||[]).filter(x=>x.id!==p.id&&(x.supplierId?x.supplierId===p.supplierId:x.supplier===p.supplier)&&['approved','received','matched'].includes(x.status)&&String(x.at)<String(p.at||'9'))
    .forEach(x=>(x.lines||[]).forEach(y=>{if((y.item||poLineName(y))===key&&+y.price>0&&(!best||String(x.at)>best.at))best={at:String(x.at),price:+y.price}}));return best}
function poRises(p){return(p.lines||[]).map(l=>{const b=poLastPrice(p,l);return b&&+l.price>b.price?{l,from:b.price,to:+l.price,pct:(+l.price-b.price)/b.price*100}:null}).filter(Boolean)}
function poWaText(p){return[t('po_waHead',{n:p.num||'',b:p.branch}),...(p.lines||[]).map((l,i)=>`${i+1}. ${poLineName(l)} — ${invFmt(l.qty)} ${poLineUnit(l)}`),p.note?t('po_note')+': '+p.note:''].filter(Boolean).join('\n')}
const poWaLink=p=>{const ph=typeof vsWaPhone==='function'?vsWaPhone(p.phone):'';return'https://wa.me/'+(ph||'')+'?text='+encodeURIComponent(poWaText(p))};

function poLoadDemo(){const L=MEM('pos');S.pos=S.role==='branch'?L.filter(x=>x.branch===S.branch):['manager','finance'].includes(S.role)?L:[];const c=MEM('supList');S.supList=c&&!Array.isArray(c)?c:{}}
function poStart(u,onErr){if(!['branch','manager','finance'].includes(S.role))return;
  let q=db.collection('pos');if(S.role==='branch')q=q.where('branch','==',S.branch);
  u.push(q.onSnapshot(s=>{S.pos=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  u.push(db.doc('config/supList').onSnapshot(s=>{S.supList=s.exists?s.data():{};render()},onErr));
  if(S.role==='finance')u.push(db.collection('suppliers').onSnapshot(()=>poSyncSupList(),onErr))}
/* finance keeps the supplier names and phones list for the others */
let poSupT=null;function poSyncSupList(){if(S.role!=='finance'||!S.fb||!S.suppliers)return;clearTimeout(poSupT);poSupT=setTimeout(()=>{
  const list=(S.suppliers||[]).map(s=>({id:s.id,name:s.name||'',phone:s.phone||'',cat:s.cat||''})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  if(JSON.stringify(list)!==JSON.stringify(((S.supList||{}).list)||null)){S.supList={list};db.doc('config/supList').set({list,at:nowIso()}).catch(()=>{})}},1500)}

function poRow(p){const ris=poRises(p).length;
  return`<button class="oc" data-act="poOpen" data-id="${esc(p.id)}"><span style="min-width:0;flex:1"><span class="t">${esc(p.supplier)} ${S.role!=='branch'?`<span class="tag">${esc(p.branch)}</span>`:''} <span class="hint num" dir="ltr">${esc(p.num||'')}</span></span>
    <span class="s">${esc(t('xf_nLines',{n:(p.lines||[]).length}))}${poTotal(p)?' · '+esc(sar2(poTotal(p)))+' '+esc(t('sar')):''} · ${esc(when(p.at))}${ris?' · '+esc(t('po_rises',{n:ris})):''}</span></span>
    <span class="side"><span class="pill ${PO_ST[p.status]||''}">${esc(t('po_st_'+p.status))}</span></span></button>`}
/* branch: inside "My orders" */
function poBranchList(){const L=[...(S.pos||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at)));
  return`<div class="rp-sec"><div class="row" style="justify-content:space-between"><h3>${t('po_title')}</h3><button class="btn btn-sun rp-btn" data-act="poNew">+ ${t('po_new')}</button></div>
  <div class="list">${L.map(poRow).join('')||`<div class="empty">${esc(t('po_none'))}</div>`}</div></div>`}
function poOpsView(){const f=S.poF||'pending',L=[...(S.pos||[])].filter(p=>f==='all'||p.status===f).sort((a,c)=>String(c.at).localeCompare(String(a.at)));
  return`<h2>${t('po_title')}</h2><div class="filters">${['pending','approved','received','matched','rejected','all'].map(k=>`<button class="chip" aria-pressed="${f===k}" data-act="poF" data-k="${k}">${esc(k==='all'?t('f_all'):t('po_st_'+k))}${k==='pending'&&(S.pos||[]).some(p=>p.status==='pending')?` <span class="num">${(S.pos||[]).filter(p=>p.status==='pending').length}</span>`:''}</button>`).join('')}</div>
  <div class="list">${L.map(poRow).join('')||`<div class="empty">${esc(t('po_none'))}</div>`}</div>`}
function poMatchView(){const L=[...(S.pos||[])].filter(p=>['received','matched'].includes(p.status)).sort((a,c)=>(a.status==='received'?0:1)-(c.status==='received'?0:1)||String(c.recvAt).localeCompare(String(a.recvAt)));
  return`<h2>${t('tab_poMatch')}</h2><p class="hint">${esc(t('po_matchHint'))}</p><div class="list">${L.map(poRow).join('')||`<div class="empty">${esc(t('po_none'))}</div>`}</div>`}

function poNewSheet(){const d=S.poDraft,sups=poSups(),ids=ITEMS.map(it=>it.id);
  const est=d.lines.reduce((s0,l)=>s0+num(l.qty)*num(l.price),0);
  const body=`<label><span class="hint">${t('po_supplier')}</span><select class="field" id="po-sup" data-in="poF" data-f="supplierId"><option value="">${esc(t('inv_pick'))}</option>${sups.map(s=>`<option value="${esc(s.id)}" ${d.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
  ${sups.length?'':`<p class="hint">${esc(t('po_noSups'))}</p>`}
  <h4 class="hr-sub">${t('xf_items')}</h4>
  ${d.lines.map((l,i)=>`<div class="row po-line" style="gap:6px;margin-top:6px;flex-wrap:wrap"><select class="field" data-in="poL" data-i="${i}" data-f="item" style="flex:2;min-width:150px"><option value="">${esc(t('po_freeItem'))}</option>${ids.map(id=>`<option value="${esc(id)}" ${l.item===id?'selected':''}>${esc(nameOf_(ITEM[id]))}</option>`).join('')}</select>
    ${l.item?'':`<input class="field" data-in="poL" data-i="${i}" data-f="name" dir="auto" placeholder="${esc(t('po_itemName'))}" value="${esc(l.name||'')}" style="flex:2;min-width:120px"><input class="field" data-in="poL" data-i="${i}" data-f="unit" dir="auto" placeholder="${esc(t('inv_unit'))}" value="${esc(l.unit||'')}" style="width:80px">`}
    <input class="field num" data-in="poL" data-i="${i}" data-f="qty" inputmode="decimal" dir="ltr" placeholder="${esc(t('inv_qty'))}" value="${esc(l.qty||'')}" style="width:80px">
    <input class="field num" data-in="poL" data-i="${i}" data-f="price" inputmode="decimal" dir="ltr" placeholder="${esc(t('po_price'))}" value="${esc(l.price||'')}" style="width:90px">
    <button class="btn btn-ghost rp-btn" data-act="poLDel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></div>`).join('')}
  <button class="btn btn-ghost rp-btn" data-act="poLAdd" style="margin-top:8px">+ ${t('inv_item')}</button>
  <label style="display:block;margin-top:10px"><span class="hint">${t('po_note')}</span><input class="field" id="po-note" data-in="poF" data-f="note" dir="auto" value="${esc(d.note||'')}"></label>
  <p class="hint">${esc(t('po_est',{a:sar2(est)}))}${est>PO_QUOTES?' · '+esc(t('po_quotesNeed',{a:sar2(PO_QUOTES)})):''}</p>
  ${typeof phBlock==='function'?phBlock('pos',null,{title:'po_quotes',branch:S.branch}):''}`;
  return hrSheetWrap(t('po_new'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="poSend" ${S.busy?'disabled':''}>${t('po_send')}</button>`)}
function poSheet(){const p=poById(S.openPo);if(!p)return'';const r=S.poEdit||{},role=S.role;
  const canAp=role==='manager'&&p.status==='pending',canRecv=role==='branch'&&p.status==='approved',canMatch=role==='finance'&&p.status==='received';
  const rises=poRises(p);
  const invs=canMatch||p.invoice?(S.supInv||[]).filter(i=>(p.supplierId&&i.supplierId===p.supplierId)||i.supplier===p.supplier).sort((a,c)=>String(c.date).localeCompare(String(a.date))):[];
  const inv=p.invoice?(S.supInv||[]).find(i=>i.id===p.invoice):(r.invoice?(S.supInv||[]).find(i=>i.id===r.invoice):null);
  const T1=poTotal(p),T2=poTotal(p,'recv'),T3=inv?+inv.amount||0:null,ok=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(1,b*0.01);
  const body=`<div class="box"><div><b>${esc(p.supplier)}</b> · ${esc(p.branch)} <span class="hint num" dir="ltr">${esc(p.num||'')}</span></div><div class="hint">${esc(when(p.at))}${p.by?' · '+esc(p.by):''}${p.note?' · '+esc(p.note):''}</div>
    ${p.apAt?`<div class="hint">${esc(t(p.status==='rejected'?'po_rejBy':'po_apBy',{b:p.apBy||'',d:when(p.apAt)}))}${p.apNote?' · '+esc(p.apNote):''}</div>`:''}${p.recvAt?`<div class="hint">${esc(t('po_recvBy',{b:p.recvBy||'',d:when(p.recvAt)}))}${p.recvNote?' · '+esc(p.recvNote):''}</div>`:''}</div>
  ${rises.length?`<div class="box" style="border-color:var(--late)"><b>${esc(t('po_riseTitle'))}</b>${rises.map(x=>`<div class="hint">${esc(poLineName(x.l))}: ${esc(sar2(x.from))} ← ${esc(sar2(x.to))} (+${esc(sar2(x.pct))}%)</div>`).join('')}</div>`:''}
  <table class="tbl fn-tbl" style="margin-top:10px"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_qty')}</th><th>${t('po_price')}</th><th>${t('xf_recv')}</th></tr></thead><tbody>
  ${(p.lines||[]).map((l,i)=>`<tr><td>${esc(poLineName(l))} <span class="hint">${esc(poLineUnit(l))}</span></td>
    <td class="n">${canAp?`<input class="field num" data-in="poE" data-k="q${i}" inputmode="decimal" dir="ltr" value="${esc(r['q'+i]??l.qty)}" style="width:80px">`:esc(invFmt(l.qty))}</td>
    <td class="n">${canAp?`<input class="field num" data-in="poE" data-k="p${i}" inputmode="decimal" dir="ltr" value="${esc(r['p'+i]??(l.price||''))}" style="width:90px">`:l.price?esc(sar2(l.price)):'—'}</td>
    <td class="n">${canRecv?`<input class="field num" data-in="poE" data-k="r${i}" inputmode="decimal" dir="ltr" value="${esc(r['r'+i]??l.qty)}" style="width:80px">`:l.recv!=null?`<span class="${+l.recv!==+l.qty?'mis':''}">${esc(invFmt(l.recv))}</span>`:'—'}</td></tr>`).join('')}</tbody></table>
  ${typeof phBlock==='function'?phBlock('pos',p.id,{readOnly:true,title:'po_quotes',branch:p.branch}):''}
  ${canAp||canRecv?`<label style="display:block;margin-top:10px"><span class="hint">${t(canAp?'po_apNote':'xf_recvNote')}</span><input class="field" id="po-enote" data-in="poE" data-k="note" dir="auto" value="${esc(r.note||'')}"></label>`:''}
  ${canMatch||p.status==='matched'?`<div class="box" style="margin-top:10px"><b>${t('po_match3')}</b>
    ${canMatch?`<label style="display:block;margin-top:6px"><span class="hint">${t('po_invoice')}</span><select class="field" id="po-inv" data-in="poE" data-k="invoice"><option value="">${esc(t('inv_pick'))}</option>${invs.map(i=>`<option value="${esc(i.id)}" ${r.invoice===i.id?'selected':''}>${esc(i.number||i.id)} · ${esc(dateLabel(i.date))} · ${esc(sar2(i.amount))}</option>`).join('')}</select></label>${invs.length?'':`<p class="hint">${esc(t('po_noInv'))}</p>`}`:''}
    <table class="tbl fn-tbl" style="margin-top:6px"><tbody><tr><td>${t('po_t1')}</td><td class="n">${esc(sar2(T1))}</td></tr><tr><td>${t('po_t2')}</td><td class="n ${ok(T2,T1)?'':'mis'}">${esc(sar2(T2))}</td></tr>
      <tr><td>${t('po_t3')}</td><td class="n ${T3==null?'':ok(T3,T2)?'':'mis'}">${T3==null?'—':esc(sar2(T3))}</td></tr></tbody></table>
    ${T3!=null?`<p class="hint" style="color:${ok(T3,T2)&&ok(T2,T1)?'var(--ok)':'var(--late)'}">${esc(t(ok(T3,T2)&&ok(T2,T1)?'po_matchOk':'po_matchDiff'))}</p>`:''}
    ${p.matchNote?`<p class="hint">${esc(p.matchNote)}</p>`:''}
    ${canMatch?`<input class="field" id="po-mnote" data-in="poE" data-k="mnote" dir="auto" placeholder="${esc(t('po_matchNote'))}" value="${esc(r.mnote||'')}">`:''}</div>`:''}`;
  const foot=canAp?`<button class="btn btn-bad" data-act="poReject">${S.confirm==='poReject'?t('xf_rejectSure'):t('xf_reject')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="poApprove" ${S.busy?'disabled':''}>${t('lv_approve')}</button>`
    :canRecv?`<a class="btn btn-ghost" href="${esc(poWaLink(p))}" target="_blank" rel="noopener">${typeof ico==='function'?ico('send','b-ic'):''}${esc(t('po_wa'))}</a><span class="spacer"></span><button class="btn btn-sun" data-act="poRecv" ${S.busy?'disabled':''}>${t('xf_confirm')}</button>`
    :canMatch?`<span class="spacer"></span><button class="btn btn-sun" data-act="poMatch" ${S.busy?'disabled':''}>${t('po_doMatch')}</button>`
    :p.status==='matched'&&role==='finance'&&inv?`<span class="spacer"></span><button class="btn btn-sun" data-act="poPay">${t('po_pay')}</button>`
    :p.status==='pending'&&role==='branch'?`<a class="btn btn-ghost" href="${esc(poWaLink(p))}" target="_blank" rel="noopener">${esc(t('po_wa'))}</a><span class="spacer"></span>`:'';
  return hrSheetWrap(t('po_one',{s:p.supplier}),body,foot)}

const poUpd=async(p,f)=>{if(S.fb)await db.doc('pos/'+p.id).update(f);else{MEMSET('pos',MEM('pos').map(x=>x.id===p.id?Object.assign({},x,f):x));xLoadDemo()}};
Object.assign(A,{
  poF(el){S.poF=el.dataset.k;render()},
  poNew(){S.openPoNew=true;S.poDraft={supplierId:'',note:'',lines:[{item:'',name:'',unit:'',qty:'',price:''}]};render()},
  poLAdd(){S.poDraft.lines.push({item:'',name:'',unit:'',qty:'',price:''});render()},
  poLDel(el){S.poDraft.lines.splice(+el.dataset.i,1);if(!S.poDraft.lines.length)S.poDraft.lines.push({item:'',name:'',unit:'',qty:'',price:''});render()},
  poSend(){const d=S.poDraft||{},s=poSups().find(x=>x.id===d.supplierId);if(!s){toast(t('po_needSup'));return}
    const lines=d.lines.filter(l=>(l.item||String(l.name||'').trim())&&num(l.qty)>0).map(l=>({item:l.item||'',name:l.item?'':String(l.name).trim(),unit:l.item?'':String(l.unit||'').trim(),qty:num(l.qty),price:num(l.price)||null}));
    if(!lines.length){toast(t('xf_needLines'));return}
    const est=lines.reduce((s0,l)=>s0+l.qty*(l.price||0),0),ph=typeof phCount==='function'?phCount('pos',null):null;
    if(est>PO_QUOTES&&!(ph>0)){toast(t('po_quotesNeed',{a:sar2(PO_QUOTES)}));return}
    const id=hrId('PO'),data={num:id.replace(/^PO-\d{4}/,'PO-'),branch:S.branch,supplierId:s.id,supplier:s.name,phone:s.phone||'',lines,note:String(d.note||'').trim(),status:'pending',at:nowIso(),by:S.userName||roleL(S.realRole||S.role)};
    if(ph!=null)data.photos=ph;
    guard(async()=>{if(S.fb)await db.doc('pos/'+id).set(data);else{MEMSET('pos',MEM('pos').concat([Object.assign({id},data)]));xLoadDemo()}
      if(typeof phCommit==='function')await phCommit('pos',null,id,S.branch);S.openPoNew=false;S.poDraft=null;S.openPo=id},()=>t('po_sent'))},
  poOpen(el){S.openPo=el.dataset.id;S.poEdit={};S.confirm=null;render()},
  poApprove(){const p=poById(S.openPo);if(!p||p.status!=='pending')return;const r=S.poEdit||{};
    const lines=p.lines.map((l,i)=>Object.assign({},l,{qty:r['q'+i]!=null&&r['q'+i]!==''?num(r['q'+i]):l.qty,price:r['p'+i]!=null&&r['p'+i]!==''?num(r['p'+i]):l.price})).filter(l=>l.qty>0);
    guard(async()=>{await poUpd(p,{lines,status:'approved',apAt:nowIso(),apBy:S.userName||roleL(S.realRole||S.role),apNote:String(r.note||'').trim()})},()=>t('po_approved'))},
  poReject(){const p=poById(S.openPo);if(!p)return;const note=String((S.poEdit||{}).note||'').trim();if(!note){toast(t('xf_needReason'));return}
    if(S.confirm!=='poReject'){S.confirm='poReject';render();return}
    guard(async()=>{await poUpd(p,{status:'rejected',apAt:nowIso(),apBy:S.userName||roleL(S.realRole||S.role),apNote:note});S.openPo=null;S.confirm=null},()=>t('po_rejected'))},
  poRecv(){const p=poById(S.openPo);if(!p||p.status!=='approved')return;const r=S.poEdit||{};
    const lines=p.lines.map((l,i)=>{const v=r['r'+i];return Object.assign({},l,{recv:v==null||v===''?+l.qty:Math.max(0,+String(v).replace(',','.')||0)})});
    guard(async()=>{await poUpd(p,{lines,status:'received',recvAt:nowIso(),recvBy:S.userName||roleL(S.realRole||S.role),recvNote:String(r.note||'').trim()});
      const pairs=lines.filter(l=>l.item&&l.recv>0).map(l=>[l.item,l.recv]);if(pairs.length&&typeof bstockApply==='function')await bstockApply(p.branch,pairs,'recv',p.num||p.id).catch(()=>{})},()=>t('po_received'))},
  poMatch(){const p=poById(S.openPo);if(!p||p.status!=='received')return;const r=S.poEdit||{};if(!r.invoice){toast(t('po_needInv'));return}
    guard(async()=>{await poUpd(p,{status:'matched',invoice:r.invoice,matchAt:nowIso(),matchBy:S.userName||roleL(S.realRole||S.role),matchNote:String(r.mnote||'').trim()})},()=>t('po_matched'))},
  poPay(){const p=poById(S.openPo);if(!p||!p.invoice)return;S.openPo=null;S.tab='supinv';if(A.siOpen)A.siOpen({dataset:{id:p.invoice}});else render()}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='poF'&&S.poDraft)S.poDraft[el.dataset.f]=el.value;
  else if(k==='poL'&&S.poDraft){S.poDraft.lines[+el.dataset.i][el.dataset.f]=el.value}
  else if(k==='poE')(S.poEdit||(S.poEdit={}))[el.dataset.k]=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&((el.dataset.in==='poL'&&el.dataset.f==='item')||(el.dataset.in==='poE'&&el.dataset.k==='invoice')))render()});
EXT.tabs.push({k:'poAll',l:'po_title',roles:['manager'],g:'ord',view:poOpsView,badge:()=>({b:(S.pos||[]).filter(p=>p.status==='pending').length})},
  {k:'poMatch',l:'tab_poMatch',roles:['finance'],view:poMatchView,badge:()=>({b:(S.pos||[]).filter(p=>p.status==='received').length})});
EXT.sheets.push(()=>S.openPoNew&&S.poDraft?poNewSheet():'',()=>S.openPo?poSheet():'');
EXT.close.push(()=>{S.openPoNew=false;S.poDraft=null;S.openPo=null;S.poEdit=null});
