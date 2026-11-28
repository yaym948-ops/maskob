/* Maskob — point of sale: the cashier page (الكاشير), the kitchen screen (المطبخ) and the order hand-off screen (شاشة الطلبات),
   with payment methods set by the system admin. Each branch has cashier / kitchen / display accounts (users with a branch).
   A paid order prints a simplified tax invoice with the ZATCA QR (phase 1) and goes to the kitchen; the kitchen marks it
   ready, the hand-off screen shows it and marks it delivered. Closing a cashier shift writes the day's sales (beside any
   branch closing), adds the shift's product quantities to the month's item sales and takes the ingredients off stock.
   config/payMethods: {list:[{id, name, kind:'cash'|'card'|'app'|'other', active}]}
   config/posCfg:     {footer, header}
   posOrders/{id}:    {branch, day, no, at, by, type:'in'|'out', lines:[{pid,name,qty,price,addons:[{name,price}],note}], total, vat,
                       payments:[{m,name,kind,amount}], paid, change, status:'new'|'prep'|'ready'|'done'|'void', prepAt, readyAt, doneAt,
                       voidReason, shift}
   posSeq/{branch_day}: {n}           order numbers per branch per day
   posShifts/{id}:    {branch, by, openAt, openCash, status:'open'|'closed', closeAt, counted, totals:{methodId:amount}, n, total} */
const POS_ROLES=['cashier','kitchen','display'];
const BR_ROLES=['branch',...POS_ROLES];
const PAY_KINDS=['cash','card','app','other'];
const PAY_DEFAULT=[{id:'cash',name:'نقدي',kind:'cash',active:true},{id:'mada',name:'مدى',kind:'card',active:true},{id:'visa',name:'فيزا / ماستركارد',kind:'card',active:true},
  {id:'apple',name:'Apple Pay',kind:'card',active:true},{id:'stc',name:'STC Pay',kind:'other',active:true}];
const payMethods=()=>(((S.payMethods||{}).list)||PAY_DEFAULT);
const payActive=()=>payMethods().filter(m=>m.active!==false);
const posToday=()=>dayKey(Date.now());
const posOpenShift=()=>(S.posShifts||[]).find(x=>x.status==='open'&&x.branch===S.branch)||null;
const posR2=v=>Math.round((+v||0)*100)/100;
const lineTotal=l=>posR2((+l.price||0)+(l.addons||[]).reduce((s0,a)=>s0+(+a.price||0),0))*(+l.qty||0);
const cartTotal=c=>posR2((c||[]).reduce((s0,l)=>s0+lineTotal(l),0));
const vatOf=total=>posR2(total-total/(1+VAT_RATE/100));

/* ---------- ZATCA phase-1 QR: TLV of seller, VAT number, time, total, VAT → base64 ---------- */
function zatcaTLV(seller,vatNo,iso,total,vat){const enc=new TextEncoder(),parts=[];
  [seller,vatNo,iso,(+total).toFixed(2),(+vat).toFixed(2)].forEach((v,i)=>{const b=enc.encode(String(v||''));parts.push(i+1,b.length,...b)});
  let s='';new Uint8Array(parts).forEach(x=>s+=String.fromCharCode(x));return btoa(s)}
let qrLoading=null;
function ensureQR(){if(window.qrcode)return Promise.resolve();if(!qrLoading)qrLoading=new Promise((res,rej)=>{const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';s.onload=res;s.onerror=()=>{qrLoading=null;rej(new Error('qr'))};document.head.appendChild(s)});return qrLoading}
async function qrMatrix(text){await ensureQR();const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),m=[];for(let r=0;r<n;r++){const row=[];for(let c=0;c<n;c++)row.push(q.isDark(r,c));m.push(row)}return m}
const orderQR=o=>{const co=typeof coInfo==='function'?coInfo():{name:'مسكوب',vat:''};return zatcaTLV(co.name,co.vat,o.at,o.total,o.vat)};

/* ---------- data ---------- */
function posLoadDemo(){const c=MEM('payMethods');S.payMethods=c&&!Array.isArray(c)?c:{};const p=MEM('posCfg');S.posCfg=p&&!Array.isArray(p)?p:{};
  if(POS_ROLES.includes(S.role)||S.role==='branch'){const d=posToday();S.posOrders=MEM('posOrders').filter(o=>o.branch===S.branch&&o.day===d);S.posShifts=MEM('posShifts').filter(x=>x.branch===S.branch)}
  else if(['manager','finance'].includes(S.role)){S.posOrders=MEM('posOrders');S.posShifts=MEM('posShifts')}}
function posStart(u,onErr){
  u.push(db.doc('config/payMethods').onSnapshot(s=>{S.payMethods=s.exists?s.data():{};render()},onErr));
  u.push(db.doc('config/posCfg').onSnapshot(s=>{S.posCfg=s.exists?s.data():{};render()},onErr));
  if(!POS_ROLES.includes(S.role))return;const b=S.branch,d=posToday();
  u.push(db.collection('posOrders').where('branch','==',b).where('day','==',d).onSnapshot(s=>{const prev=new Set((S.posOrders||[]).map(o=>o.id+o.status));
    S.posOrders=s.docs.map(x=>Object.assign({},x.data(),{id:x.id}));posOnOrders(prev);render()},onErr));
  u.push(db.collection('posShifts').where('branch','==',b).where('status','==','open').onSnapshot(s=>{S.posShifts=s.docs.map(x=>Object.assign({},x.data(),{id:x.id}));render()},onErr));
  if(S.role==='cashier')u.push(db.doc('config/invUnits').onSnapshot(s=>{S.invUnits=s.exists?s.data():{};render()},onErr))}
/* new orders on the kitchen screen / ready ones on the hand-off screen: a short sound, and the kitchen ticket if set */
function posOnOrders(prev){if(!prev.size)return;const L=S.posOrders||[];
  if(S.role==='kitchen'){const fresh=L.filter(o=>o.status==='new'&&!prev.has(o.id+'new'));if(fresh.length){posBeep(880);fresh.forEach(o=>{if(typeof prnAuto==='function')prnAuto('kitchen',o)})}}
  if(S.role==='display'&&L.some(o=>o.status==='ready'&&!prev.has(o.id+'ready')))posBeep(660)}
function posBeep(f){try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);g.gain.value=0.15;o.start();setTimeout(()=>{o.stop();a.close()},350)}catch(e){}}
async function posNextNo(b,d){const id=b+'_'+d;
  if(!S.fb){const m=MEM('posSeq'),all=m&&!Array.isArray(m)?Object.assign({},m):{};all[id]=(+all[id]||0)+1;MEMSET('posSeq',all);return all[id]}
  return db.runTransaction(async tx=>{const r=db.doc('posSeq/'+id),s=await tx.get(r),n=(s.exists?+s.data().n||0:0)+1;tx.set(r,{n,branch:b});return n})}
async function posSave(o){if(S.fb){if(o.id){const id=o.id,x=Object.assign({},o);delete x.id;await db.doc('posOrders/'+id).set(x,{merge:true});return id}const r=await db.collection('posOrders').add(o);return r.id}
  const id=o.id||'PO'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);MEMSET('posOrders',MEM('posOrders').filter(x=>x.id!==id).concat([Object.assign({},o,{id})]));posLoadDemo();return id}
async function posUpd(id,f){if(S.fb)await db.doc('posOrders/'+id).update(f);else{MEMSET('posOrders',MEM('posOrders').map(x=>x.id===id?Object.assign({},x,f):x));posLoadDemo()}}

/* ---------- system admin: payment methods and receipt text ---------- */
function payMethodsView(){const L=payMethods(),cfg=S.posCfg||{};
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_payMethods')}</h2><button class="btn btn-sun" data-act="pmNewM">+ ${t('pay_new')}</button></div>
  <p class="hint">${esc(t('pay_hint'))}</p>
  <div class="list">${L.map((m,i)=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(m.name)}</span><span class="s">${esc(t('pay_k_'+m.kind))}</span></span>
    <span class="side"><button class="btn btn-ghost rp-btn" data-act="pmMove" data-i="${i}" data-d="-1" ${i?'':'disabled'} aria-label="${esc(t('mn_up'))}">↑</button><button class="btn btn-ghost rp-btn" data-act="pmEditM" data-i="${i}">${t('edit')}</button>
    <button class="chip" aria-pressed="${m.active!==false}" data-act="pmToggle" data-i="${i}">${esc(t(m.active!==false?'es_active':'cat_off'))}</button></span></div>`).join('')}</div>
  <div class="rp-sec"><h3>${t('pos_receipt')}</h3><p class="hint">${esc(t('pos_receiptHint'))}</p>
    <label><span class="hint">${t('pos_rHeader')}</span><input class="field" id="posHeader" dir="auto" value="${esc(cfg.header||'')}"></label>
    <label style="display:block;margin-top:8px"><span class="hint">${t('pos_rFooter')}</span><input class="field" id="posFooter" dir="auto" value="${esc(cfg.footer||t('pos_thanks'))}"></label>
    <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sun rp-btn" data-act="posCfgSave">${t('waSave')}</button></div></div>`}
function payMethodSheet(){const d=S.pmDraft||{};
  const body=`<div class="sl-grid hr-grid"><label><span class="hint">${t('pay_name')}</span><input class="field" id="pm-name" data-in="pmD" data-f="name" dir="auto" value="${esc(d.name||'')}"></label>
    <label><span class="hint">${t('pay_kind')}</span><select class="field" id="pm-kind" data-in="pmD" data-f="kind">${PAY_KINDS.map(k=>`<option value="${k}" ${d.kind===k?'selected':''}>${esc(t('pay_k_'+k))}</option>`).join('')}</select></label></div>
    <p class="hint">${esc(t('pay_kindHint'))}</p>`;
  return hrSheetWrap(S.pmEdit==null?t('pay_new'):d.name||'',body,`${S.pmEdit==null?'':`<button class="btn btn-bad" data-act="pmDelM">${S.confirm==='pmDelM'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="pmSaveM">${t('waSave')}</button>`)}
function paySaveList(list){const cfg={list};guard(async()=>{if(S.fb)await db.doc('config/payMethods').set(cfg);else MEMSET('payMethods',cfg);S.payMethods=cfg},()=>t('st_saved'))}

/* ---------- the cashier page ---------- */
function posView(){const sh=posOpenShift(),cats=typeof menuCats==='function'?menuCats():[],cf=S.posCat||'',offs=typeof menuOffOf==='function'?menuOffOf(S.branch):{};
  const P=(S.products||[]).filter(p=>!cf||p.cat===cf).sort((a,c)=>{const i=cats.indexOf(a.cat),j=cats.indexOf(c.cat);return(i<0?99:i)-(j<0?99:j)||String(a.name).localeCompare(String(c.name),'ar')});
  const cart=S.posCart||[],tot=cartTotal(cart);
  if(!sh)return`<h2>${t('tab_pos')}</h2><div class="box"><b>${t('pos_noShift')}</b><p class="hint">${esc(t('pos_noShiftHint'))}</p><div class="row" style="gap:8px;margin-top:8px"><input class="field num" id="posOpenCash" inputmode="decimal" dir="ltr" placeholder="${esc(t('pos_openCash'))}" style="width:160px"><button class="btn btn-sun" data-act="posOpenShift">${t('pos_openShift')}</button></div></div>`;
  return`<div class="pos">
  <div class="pos-menu"><div class="filters pos-cats"><button class="chip" aria-pressed="${!cf}" data-act="posCat" data-k="">${t('f_all')}</button>${cats.map(c=>`<button class="chip" aria-pressed="${cf===c}" data-act="posCat" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="pos-grid">${P.map(p=>{const off=offs[p.id];return`<button class="pos-tile${off?' off':''}" data-act="posAdd" data-id="${esc(p.id)}" ${off?'disabled':''}>${p.img?`<img src="${esc(p.img)}" alt="">`:''}<b>${esc(p.name)}</b><span class="num">${esc(sar2(p.price))}</span>${off?`<small>${esc(t('mn_offTag'))}</small>`:''}</button>`}).join('')||`<div class="empty">${esc(t('mn_noneBranch'))}</div>`}</div></div>
  <div class="pos-cart"><div class="row" style="justify-content:space-between"><b>${t('pos_cart')}</b><div class="kind">${[['in','pos_in'],['out','pos_out']].map(([k,l])=>`<button aria-pressed="${(S.posType||'in')===k}" data-act="posType" data-k="${k}">${esc(t(l))}</button>`).join('')}</div></div>
    <div class="pos-lines">${cart.map((l,i)=>`<div class="pos-line"><div style="flex:1;min-width:0"><b>${esc(l.name)}</b>${(l.addons||[]).length?`<div class="hint">${l.addons.map(a=>esc(a.name)+(+a.price?' +'+esc(sar2(a.price)):'')).join('، ')}</div>`:''}${l.note?`<div class="hint">📝 ${esc(l.note)}</div>`:''}</div>
      <div class="pos-qty"><button data-act="posQty" data-i="${i}" data-d="-1" aria-label="-">−</button><span class="num">${l.qty}</span><button data-act="posQty" data-i="${i}" data-d="1" aria-label="+">+</button></div><span class="num pos-lt">${esc(sar2(lineTotal(l)))}</span></div>`).join('')||`<div class="hint" style="padding:14px 0">${esc(t('pos_empty'))}</div>`}</div>
    <div class="pos-sum"><div><span>${t('pos_vatIncl')}</span><span class="num">${esc(sar2(vatOf(tot)))}</span></div><div class="pos-tot"><span>${t('pos_total')}</span><b class="num">${esc(sar2(tot))} ${t('sar')}</b></div></div>
    <div class="row" style="gap:8px"><button class="btn btn-ghost" data-act="posClear" ${cart.length?'':'disabled'}>${t('pos_clear')}</button><button class="btn btn-sun" style="flex:1" data-act="posPayOpen" ${cart.length?'':'disabled'}>${t('pos_pay')}</button></div>
    ${S.posLast?`<div class="pos-done"><b>${esc(t('pos_orderNo',{n:S.posLast.no}))}</b><button class="btn btn-ghost rp-btn" data-act="posReprint" data-id="${esc(S.posLast.id)}">${t('pos_print')}</button></div>`:''}</div></div>`}
function posAddonSheet(){const p=(S.products||[]).find(x=>x.id===S.posPick);if(!p)return'';const d=S.posPickD||{sel:{},qty:1,note:''};
  const tot=posR2(((+p.price||0)+(p.addons||[]).reduce((s0,a,i)=>s0+(d.sel[i]?+a.price||0:0),0))*d.qty);
  const body=`<div class="pos-addons">${(p.addons||[]).map((a,i)=>`<button class="chip" aria-pressed="${!!d.sel[i]}" data-act="posAddonT" data-i="${i}">${esc(a.name)}${+a.price?' +'+esc(sar2(a.price)):''}</button>`).join('')}</div>
  <div class="row" style="gap:10px;margin-top:12px"><span class="hint">${t('inv_qty')}</span><div class="pos-qty"><button data-act="posPickQ" data-d="-1">−</button><span class="num">${d.qty}</span><button data-act="posPickQ" data-d="1">+</button></div></div>
  <input class="field" id="posNote" data-in="posNote" dir="auto" placeholder="${esc(t('pos_note'))}" value="${esc(d.note||'')}" style="margin-top:10px">`;
  return hrSheetWrap(p.name+' · '+sar2(p.price),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="posPickAdd">${t('pos_addCart')} · ${esc(sar2(tot))}</button>`)}
function posPaySheet(){const tot=cartTotal(S.posCart),pays=S.posPays||[],paid=posR2(pays.reduce((s0,x)=>s0+(+x.amount||0),0)),left=posR2(tot-paid);
  const cashIn=pays.filter(x=>x.kind==='cash').reduce((s0,x)=>s0+(+x.amount||0),0),change=left<0&&cashIn>0?posR2(-left):0;
  const body=`<div class="pos-due"><span>${t('pos_total')}</span><b class="num">${esc(sar2(tot))} ${t('sar')}</b></div>
  <div class="pos-methods">${payActive().map(m=>`<button class="btn btn-ghost pos-m" data-act="posPayM" data-k="${esc(m.id)}">${esc(m.name)}</button>`).join('')}</div>
  ${pays.map((x,i)=>`<div class="row" style="gap:8px;margin-top:8px"><span style="flex:1"><b>${esc(x.name)}</b></span><input class="field num" data-in="posPayA" data-i="${i}" inputmode="decimal" dir="ltr" value="${esc(x.amount)}" style="width:120px"><button class="btn btn-ghost rp-btn" data-act="posPayDel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></div>`).join('')}
  ${pays.some(x=>x.kind==='cash')?`<div class="pos-fast">${[5,10,50,100,200,500].filter(v=>v>=tot-paid+cashIn-0.001||v>=tot).slice(0,4).map(v=>`<button class="chip" data-act="posCashFast" data-k="${v}">${v}</button>`).join('')}</div>`:''}
  <div class="pos-sum" style="margin-top:12px"><div><span>${t('pos_paid')}</span><span class="num">${esc(sar2(paid))}</span></div><div><span>${t(left>0?'pos_left':'pos_change')}</span><b class="num ${left>0?'mis':''}">${esc(sar2(left>0?left:change))}</b></div></div>`;
  return hrSheetWrap(t('pos_pay'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="posPayDone" ${left>0.009||S.busy||!pays.length?'disabled':''}>${t('pos_confirm')}</button>`)}
function posOrdersView(){const L=[...(S.posOrders||[])].sort((a,c)=>(+c.no||0)-(+a.no||0));
  return`<h2>${t('tab_posOrders')}</h2><div class="stats">${kpi(t('pos_nOrders'),L.filter(o=>o.status!=='void').length)}${kpi(t('pos_total'),sar2(L.filter(o=>o.status!=='void').reduce((s0,o)=>s0+(+o.total||0),0))+' '+t('sar'))}</div>
  <div class="list">${L.map(o=>`<button class="oc" data-act="posOOpen" data-id="${esc(o.id)}"><span style="min-width:0;flex:1"><span class="t"># ${esc(o.no)} · ${esc(t(o.type==='out'?'pos_out':'pos_in'))}</span><span class="s">${esc(when(o.at))} · ${esc((o.payments||[]).map(p=>p.name).join(' + '))}</span></span>
    <span class="side"><b class="num">${esc(sar2(o.total))}</b><span class="pill ${o.status==='void'?'li-expired':o.status==='done'?'ms-done':'ms-progress'}">${esc(t('pos_st_'+o.status))}</span></span></button>`).join('')||`<div class="empty">${esc(t('pos_noOrders'))}</div>`}</div>`}
function posOrderSheet(){const o=(S.posOrders||[]).find(x=>x.id===S.posOpen);if(!o)return'';const canVoid=S.role!=='display'&&o.status!=='void'&&o.status!=='done'&&posOpenShift()&&o.shift===posOpenShift().id;
  const body=`<div class="box"><b># ${esc(o.no)}</b> · ${esc(when(o.at))}${o.by?' · '+esc(o.by):''}</div>${o.lines.map(l=>`<div class="pos-line"><span style="flex:1">${esc(l.qty)} × ${esc(l.name)}${(l.addons||[]).length?`<div class="hint">${l.addons.map(a=>esc(a.name)).join('، ')}</div>`:''}</span><span class="num">${esc(sar2(lineTotal(l)))}</span></div>`).join('')}
  <div class="pos-sum"><div class="pos-tot"><span>${t('pos_total')}</span><b class="num">${esc(sar2(o.total))}</b></div></div>${o.voidReason?`<p class="hint">${esc(t('pos_voided'))}: ${esc(o.voidReason)}</p>`:''}
  ${canVoid?`<input class="field" id="posVoidR" data-in="posVoidR" dir="auto" placeholder="${esc(t('pos_voidReason'))}" value="${esc(S.posVoidR||'')}" style="margin-top:10px">`:''}`;
  return hrSheetWrap(t('pos_orderNo',{n:o.no}),body,`${canVoid?`<button class="btn btn-bad" data-act="posVoid">${S.confirm==='posVoid'?t('xf_rejectSure'):t('pos_void')}</button>`:''}<span class="spacer"></span><button class="btn btn-sun" data-act="posReprint" data-id="${esc(o.id)}">${t('pos_print')}</button>`)}
/* the shift: totals by payment method, counted cash, closing */
function posShiftTotals(sh){const T={},L=(S.posOrders||[]).filter(o=>o.shift===sh.id&&o.status!=='void');let total=0;
  L.forEach(o=>{total+=+o.total||0;(o.payments||[]).forEach(p=>{T[p.m]=posR2((T[p.m]||0)+(+p.amount||0)-(p.kind==='cash'?(+o.change||0):0))})});return{T,total:posR2(total),n:L.length}}
function posShiftView(){const sh=posOpenShift();if(!sh)return posView();const R=posShiftTotals(sh),cashId=(payMethods().find(m=>m.kind==='cash')||{}).id;
  const expected=posR2((+sh.openCash||0)+(R.T[cashId]||0));
  return`<h2>${t('tab_posShift')}</h2><div class="box"><div>${esc(t('pos_shiftBy',{b:sh.by||'',d:when(sh.openAt)}))}</div><div class="hint">${esc(t('pos_openCash'))}: ${esc(sar2(sh.openCash))}</div></div>
  <div class="stats">${kpi(t('pos_nOrders'),R.n)}${kpi(t('pos_total'),sar2(R.total)+' '+t('sar'))}${kpi(t('pos_cashExpected'),sar2(expected))}</div>
  <table class="tbl fn-tbl"><thead><tr><th>${t('pay_name')}</th><th>${t('pos_amount')}</th></tr></thead><tbody>${payMethods().map(m=>`<tr><td>${esc(m.name)}</td><td class="n">${esc(sar2(R.T[m.id]||0))}</td></tr>`).join('')}</tbody></table>
  <div class="box" style="margin-top:10px"><label><span class="hint">${t('pos_counted')}</span><input class="field num" id="posCounted" inputmode="decimal" dir="ltr" value="${esc(S.posCounted||'')}" data-in="posCounted" style="width:160px"></label>
    ${S.posCounted!==''&&S.posCounted!=null?`<p class="hint">${esc(t('pos_cashDiff',{d:sar2(posR2(num(S.posCounted)-expected))}))}</p>`:''}
    <p class="hint">${esc(t('pos_closeHint'))}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-sun" data-act="posCloseShift" ${S.busy?'disabled':''}>${S.confirm==='posClose'?t('pos_closeSure'):t('pos_closeShift')}</button></div></div>`}

/* ---------- kitchen screen ---------- */
function kdsView(){const L=(S.posOrders||[]).filter(o=>o.status==='new'||o.status==='prep').sort((a,c)=>String(a.at).localeCompare(String(c.at))),now=Date.now();
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_kds')}</h2><span class="hint">${esc(t('kds_n',{n:L.length}))}</span></div>
  <div class="kds">${L.map(o=>{const mins=Math.floor((now-new Date(o.at))/60000);return`<div class="kds-card ${o.status}${mins>=10?' late':''}"><div class="kds-h"><b># ${esc(o.no)}</b><span>${esc(t(o.type==='out'?'pos_out':'pos_in'))}</span><span class="num">${mins} ${t('kds_min')}</span></div>
    ${o.lines.map(l=>`<div class="kds-l"><b class="num">${esc(l.qty)}×</b> ${esc(l.name)}${(l.addons||[]).length?`<div class="kds-a">${l.addons.map(a=>esc(a.name)).join('، ')}</div>`:''}${l.note?`<div class="kds-a">📝 ${esc(l.note)}</div>`:''}</div>`).join('')}
    <div class="row" style="gap:6px;margin-top:8px">${o.status==='new'?`<button class="btn btn-navy" style="flex:1" data-act="kdsSet" data-id="${esc(o.id)}" data-k="prep">${t('kds_start')}</button>`:''}<button class="btn btn-sun" style="flex:1" data-act="kdsSet" data-id="${esc(o.id)}" data-k="ready">${t('kds_ready')}</button></div></div>`}).join('')||`<div class="empty">${esc(t('kds_none'))}</div>`}</div>`}
/* ---------- order hand-off screen ---------- */
function odsView(){const L=S.posOrders||[],prep=L.filter(o=>o.status==='new'||o.status==='prep').sort((a,c)=>(+a.no)-(+c.no)),ready=L.filter(o=>o.status==='ready').sort((a,c)=>String(a.readyAt).localeCompare(String(c.readyAt)));
  return`<div class="ods"><div class="ods-col"><h2>${t('ods_prep')}</h2><div class="ods-nums">${prep.map(o=>`<span class="ods-n">${esc(o.no)}</span>`).join('')||'<span class="hint">—</span>'}</div></div>
  <div class="ods-col ready"><h2>${t('ods_ready')}</h2><div class="ods-nums">${ready.map(o=>`<button class="ods-n" data-act="odsDone" data-id="${esc(o.id)}" title="${esc(t('ods_tapDone'))}">${esc(o.no)}</button>`).join('')||'<span class="hint">—</span>'}</div><p class="hint">${esc(t('ods_hint'))}</p></div></div>`}

/* ---------- actions ---------- */
Object.assign(A,{
  pmNewM(){S.pmEdit=null;S.pmDraft={name:'',kind:'card'};S.openPm2=true;render()},
  pmEditM(el){const m=payMethods()[+el.dataset.i];S.pmEdit=+el.dataset.i;S.pmDraft=Object.assign({},m);S.openPm2=true;render()},
  pmToggle(el){const L=payMethods().map(x=>Object.assign({},x)),m=L[+el.dataset.i];m.active=m.active===false;paySaveList(L)},
  pmMove(el){const L=payMethods().map(x=>Object.assign({},x)),i=+el.dataset.i,j=i-1;if(j<0)return;[L[i],L[j]]=[L[j],L[i]];paySaveList(L)},
  pmSaveM(){const d=S.pmDraft||{},name=String(d.name||'').trim();if(!name){toast(t('mn_needName'));return}const L=payMethods().map(x=>Object.assign({},x));
    const m={id:S.pmEdit==null?'pm'+Date.now().toString(36):L[S.pmEdit].id,name,kind:PAY_KINDS.includes(d.kind)?d.kind:'other',active:S.pmEdit==null?true:L[S.pmEdit].active!==false};
    if(S.pmEdit==null)L.push(m);else L[S.pmEdit]=m;S.openPm2=false;paySaveList(L)},
  pmDelM(){if(S.pmEdit==null)return;if(S.confirm!=='pmDelM'){S.confirm='pmDelM';render();return}const L=payMethods().filter((_,i)=>i!==S.pmEdit);S.openPm2=false;S.confirm=null;paySaveList(L)},
  posCfgSave(){const cfg={header:String((document.getElementById('posHeader')||{}).value||'').trim(),footer:String((document.getElementById('posFooter')||{}).value||'').trim()};
    guard(async()=>{if(S.fb)await db.doc('config/posCfg').set(cfg);else MEMSET('posCfg',cfg);S.posCfg=cfg},()=>t('st_saved'))},
  posCat(el){S.posCat=el.dataset.k;render()},
  posType(el){S.posType=el.dataset.k;render()},
  posAdd(el){const p=(S.products||[]).find(x=>x.id===el.dataset.id);if(!p)return;S.posLast=null;
    if((p.addons||[]).length){S.posPick=p.id;S.posPickD={sel:{},qty:1,note:''};render();return}
    const c=S.posCart||(S.posCart=[]),same=c.find(l=>l.pid===p.id&&!(l.addons||[]).length&&!l.note);if(same)same.qty++;else c.push({pid:p.id,name:p.name,qty:1,price:+p.price||0,addons:[],note:''});render()},
  posAddonT(el){const d=S.posPickD;d.sel[el.dataset.i]=!d.sel[el.dataset.i];render()},
  posPickQ(el){const d=S.posPickD;d.qty=Math.max(1,d.qty+(+el.dataset.d));render()},
  posPickAdd(){const p=(S.products||[]).find(x=>x.id===S.posPick),d=S.posPickD;if(!p)return;const addons=(p.addons||[]).filter((a,i)=>d.sel[i]).map(a=>({name:a.name,price:+a.price||0}));
    (S.posCart||(S.posCart=[])).push({pid:p.id,name:p.name,qty:d.qty,price:+p.price||0,addons,note:String(d.note||'').trim()});S.posPick=null;S.posPickD=null;render()},
  posQty(el){const c=S.posCart||[],l=c[+el.dataset.i];if(!l)return;l.qty+=+el.dataset.d;if(l.qty<=0)c.splice(+el.dataset.i,1);render()},
  posClear(){S.posCart=[];render()},
  posPayOpen(){if(!(S.posCart||[]).length)return;S.posPays=[];S.openPosPay=true;render()},
  posPayM(el){const m=payMethods().find(x=>x.id===el.dataset.k);if(!m)return;const tot=cartTotal(S.posCart),pays=S.posPays||(S.posPays=[]),paid=pays.reduce((s0,x)=>s0+(+x.amount||0),0);
    const left=posR2(tot-paid);pays.push({m:m.id,name:m.name,kind:m.kind,amount:left>0?left:0});render()},
  posPayDel(el){S.posPays.splice(+el.dataset.i,1);render()},
  posCashFast(el){const pays=S.posPays||[],c=pays.find(x=>x.kind==='cash');if(!c)return;const other=pays.filter(x=>x!==c).reduce((s0,x)=>s0+(+x.amount||0),0);c.amount=Math.max(+el.dataset.k,0);void other;render()},
  posPayDone(){const sh=posOpenShift();if(!sh){toast(t('pos_noShift'));return}const cart=S.posCart||[],tot=cartTotal(cart),pays=(S.posPays||[]).filter(x=>+x.amount>0);
    const paid=posR2(pays.reduce((s0,x)=>s0+(+x.amount||0),0));if(paid+0.009<tot){toast(t('pos_left'));return}
    const change=pays.some(x=>x.kind==='cash')?posR2(paid-tot):0;if(change>0&&!pays.some(x=>x.kind==='cash'&&+x.amount>=change)){toast(t('pos_overpay'));return}
    guard(async()=>{const d=posToday(),no=await posNextNo(S.branch,d),at=nowIso();
      const o={branch:S.branch,day:d,no,at,by:S.userName||roleL(S.realRole||S.role),type:S.posType||'in',lines:cart.map(l=>Object.assign({},l)),total:tot,vat:vatOf(tot),
        payments:pays.map(x=>({m:x.m,name:x.name,kind:x.kind,amount:posR2(x.amount)})),paid,change,status:'new',shift:sh.id};
      const id=await posSave(o);S.posLast=Object.assign({id},o);S.posCart=[];S.posPays=[];S.openPosPay=false;
      if(typeof prnAuto==='function')prnAuto('receipt',S.posLast)},()=>t('pos_saved',{n:S.posLast?S.posLast.no:''}))},
  posReprint(el){const o=(S.posOrders||[]).find(x=>x.id===el.dataset.id)||(S.posLast&&S.posLast.id===el.dataset.id?S.posLast:null);if(o&&typeof prnPrint==='function')prnPrint('receipt',o)},
  posOOpen(el){S.posOpen=el.dataset.id;S.posVoidR='';S.confirm=null;render()},
  posVoid(){const o=(S.posOrders||[]).find(x=>x.id===S.posOpen);if(!o)return;const r=String(S.posVoidR||'').trim();if(!r){toast(t('xf_needReason'));return}
    if(S.confirm!=='posVoid'){S.confirm='posVoid';render();return}guard(async()=>{await posUpd(o.id,{status:'void',voidReason:r,voidAt:nowIso()});S.posOpen=null;S.confirm=null},()=>t('pos_voided'))},
  posOpenShift(){const v=num((document.getElementById('posOpenCash')||{}).value);
    guard(async()=>{const data={branch:S.branch,by:S.userName||roleL(S.realRole||S.role),openAt:nowIso(),openCash:v||0,status:'open'};
      if(S.fb)await db.collection('posShifts').add(data);else{MEMSET('posShifts',MEM('posShifts').concat([Object.assign({id:'SH'+Date.now().toString(36)},data)]));posLoadDemo()}},()=>t('pos_shiftOpened'))},
  posCloseShift(){const sh=posOpenShift();if(!sh)return;if(S.confirm!=='posClose'){S.confirm='posClose';render();return}
    const R=posShiftTotals(sh),counted=S.posCounted===''||S.posCounted==null?null:num(S.posCounted);
    guard(async()=>{const f={status:'closed',closeAt:nowIso(),counted,totals:R.T,n:R.n,total:R.total};
      if(S.fb)await db.doc('posShifts/'+sh.id).update(f);else{MEMSET('posShifts',MEM('posShifts').map(x=>x.id===sh.id?Object.assign({},x,f):x))}
      await posFeed(sh);S.confirm=null;S.posCounted='';if(!S.fb)posLoadDemo()},()=>t('pos_shiftClosed'))},
  kdsSet(el){const k=el.dataset.k,f={status:k};f[k==='prep'?'prepAt':'readyAt']=nowIso();guard(()=>posUpd(el.dataset.id,f))},
  odsDone(el){guard(()=>posUpd(el.dataset.id,{status:'done',doneAt:nowIso()}))}
});
/* the shift's sales into the day's sales, the month's item sales and the stock */
async function posFeed(sh){const b=sh.branch,orders=(S.posOrders||[]).filter(o=>o.shift===sh.id&&o.status!=='void');if(!orders.length)return;
  /* 1. the day(s) the orders belong to */
  const days={};orders.forEach(o=>{const x=days[o.day]||(days[o.day]={total:0,n:0,m:{}});x.total=posR2(x.total+(+o.total||0));x.n++;(o.payments||[]).forEach(p=>{x.m[p.m]=posR2((x.m[p.m]||0)+(+p.amount||0)-(p.kind==='cash'?(+o.change||0):0))})});
  for(const d of Object.keys(days)){const id=b+'_'+d,x=days[d];let old=null;
    if(S.fb){const s=await db.doc('sales/'+id).get();old=s.exists?s.data():null}else old=MEM('sales').find(r=>r.id===id)||null;
    const pos0=(old&&old.pos)||{total:0,n:0,m:{}},pos={total:posR2((+pos0.total||0)+x.total),n:(+pos0.n||0)+x.n,m:Object.assign({},pos0.m||{})};Object.keys(x.m).forEach(k=>pos.m[k]=posR2((+pos.m[k]||0)+x.m[k]));
    const data=old&&old.dsr?{pos}:{branch:b,date:d,sales:pos.total,invoices:pos.n,src:'pos',pos,at:nowIso()};
    if(S.fb){if(old)await db.doc('sales/'+id).update(data);else await db.doc('sales/'+id).set(data)}else MEMSET('sales',MEM('sales').filter(r=>r.id!==id).concat([Object.assign({},old||{},data,{id})]))}
  /* 2. item sales of the month (menu engineering) and 3. stock */
  const months={};orders.forEach(o=>{const mk=o.day.slice(0,7),q=months[mk]||(months[mk]={});o.lines.forEach(l=>{q[l.pid]=(q[l.pid]||0)+(+l.qty||0)})});
  for(const mk of Object.keys(months)){const id=b+'_'+mk;let doc=null;
    if(S.fb){const s=await db.doc('psales/'+id).get();doc=s.exists?Object.assign({id},s.data()):null}else doc=MEM('psales').find(x=>x.id===id)||null;
    const rows=[...((doc&&doc.rows)||[])];Object.keys(months[mk]).forEach(pid=>{const p=(S.products||[]).find(x=>x.id===pid),r=rows.find(x=>x.pid===pid);
      if(r)r.qty=(+r.qty||0)+months[mk][pid];else rows.push({name:p?p.name:pid,qty:months[mk][pid],sales:0,pid})});
    const next={branch:b,month:mk,rows,at:nowIso(),by:sh.by||'',applied:(doc&&doc.applied)||{},src:'pos'};
    if(S.fb)await db.doc('psales/'+id).set(next);else MEMSET('psales',MEM('psales').filter(x=>x.id!==id).concat([Object.assign({id},next)]));
    if(typeof meApplyStock==='function')await meApplyStock(Object.assign({id},next)).catch(()=>{})}}
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='pmD'&&S.pmDraft)S.pmDraft[el.dataset.f]=el.value;
  else if(k==='posNote'&&S.posPickD)S.posPickD.note=el.value;
  else if(k==='posPayA'&&S.posPays){S.posPays[+el.dataset.i].amount=num(el.value);clearTimeout(S._posT);S._posT=setTimeout(render,400)}
  else if(k==='posVoidR')S.posVoidR=el.value;
  else if(k==='posCounted'){S.posCounted=el.value;clearTimeout(S._posT);S._posT=setTimeout(render,400)}});
/* kitchen screen: refresh the minutes */
setInterval(()=>{if(S.role==='kitchen'&&S.tab==='kds'&&!document.querySelector('.sheet'))render()},30000);

/* ---------- menus, sheets ---------- */
EXT.tabs.push({k:'payMethods',l:'tab_payMethods',roles:['admin'],view:payMethodsView},
  {k:'pos',l:'tab_pos',roles:['cashier'],view:posView},{k:'posOrders',l:'tab_posOrders',roles:['cashier'],view:posOrdersView},{k:'posShift',l:'tab_posShift',roles:['cashier'],view:posShiftView},
  {k:'kds',l:'tab_kds',roles:['kitchen'],view:kdsView,badge:()=>({b:(S.posOrders||[]).filter(o=>o.status==='new').length})},
  {k:'ods',l:'tab_ods',roles:['display'],view:odsView,badge:()=>({b:(S.posOrders||[]).filter(o=>o.status==='ready').length})});
EXT.sheets.push(()=>S.openPm2?payMethodSheet():'',()=>S.posPick?posAddonSheet():'',()=>S.openPosPay?posPaySheet():'',()=>S.posOpen?posOrderSheet():'');
EXT.close.push(()=>{S.openPm2=false;S.posPick=null;S.posPickD=null;S.openPosPay=false;S.posOpen=null;S.confirm=null});
