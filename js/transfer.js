/* Maskob — stock transfers between branches (تحويل المخزون).
   The sending branch writes the transfer; nothing moves until the receiving branch confirms the quantities it got.
   On confirming, the receiver adds them to its own stock in the same transaction; the sender's stock is lowered by
   the sender's own app (or operations) as soon as it sees the confirmation — each branch only writes its own stock.
   transfers/{id}: {num, from, to, lines:[{item, qty, recv}], note, status:'sent'|'received'|'rejected'|'cancelled',
                    at, by, recvAt, recvBy, recvNote, outApplied, outAt} */
const XF_ST={sent:'ms-progress',received:'ms-done',rejected:'ms-open',cancelled:'ms-open'};
const xfMine=()=>[...(S.transfers||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at)));
const xfIncoming=()=>(S.transfers||[]).filter(x=>x.to===S.branch&&x.status==='sent');
const xfQty=l=>l.recv!=null?+l.recv:+l.qty;

function xfLoadDemo(){const L=MEM('transfers');S.transfers=S.role==='branch'?L.filter(x=>x.from===S.branch||x.to===S.branch):S.role==='manager'?L:[];xfApplyOutAll()}
function xfStart(u,onErr){if(!['branch','manager'].includes(S.role))return;
  const set=(key,docs)=>{(S._xf||(S._xf={}))[key]=docs.map(d=>Object.assign({},d.data(),{id:d.id}));
    const m={};Object.values(S._xf).flat().forEach(x=>m[x.id]=x);S.transfers=Object.values(m);xfApplyOutAll();render()};
  if(S.role==='branch'){S._xf={};
    u.push(db.collection('transfers').where('from','==',S.branch).onSnapshot(s=>set('out',s.docs),onErr));
    u.push(db.collection('transfers').where('to','==',S.branch).onSnapshot(s=>set('in',s.docs),onErr))}
  else{S._xf={};u.push(db.collection('transfers').onSnapshot(s=>set('all',s.docs),onErr))}}

/* the sender's side of a confirmed transfer, applied once (a transaction guards against two devices) */
function xfApplyOutAll(){const todo=(S.transfers||[]).filter(x=>x.status==='received'&&!x.outApplied&&(S.role==='manager'||x.from===S.branch));
  const busy=S._xfOut||(S._xfOut=new Set());for(const x of todo){if(busy.has(x.id))continue;busy.add(x.id);xfApplyOut(x).catch(()=>{}).finally(()=>busy.delete(x.id))}}
async function xfApplyOut(x){const pairs=(x.lines||[]).filter(l=>xfQty(l)>0).map(l=>[l.item,-xfQty(l)]),at=nowIso(),ref=x.num||x.id;
  if(!S.fb){const L=MEM('transfers').map(y=>y.id===x.id?Object.assign({},y,{outApplied:true,outAt:at}):y);MEMSET('transfers',L);
    await bstockApply(x.from,pairs,'xfer_out',ref+' → '+x.to);return}
  const inc=firebase.firestore.FieldValue.increment,tr=db.doc('transfers/'+x.id),st=db.doc('bstock/'+x.from);
  await db.runTransaction(async tx=>{const s=await tx.get(tr);if(!s.exists)return;const d=s.data();if(d.status!=='received'||d.outApplied)return;
    const items={};pairs.forEach(([id,q])=>items[id]=inc(q));tx.set(st,{items},{merge:true});
    pairs.forEach(([id,q])=>tx.set(db.collection('bmoves').doc(),{branch:x.from,at,kind:'xfer_out',item:id,qty:q,ref:ref+' → '+x.to,by:S.userName||roleL(S.realRole||S.role)}));
    tx.update(tr,{outApplied:true,outAt:at})})}

/* ---------- branch page ---------- */
function xfRow(x){const me=S.branch,out=x.from===me||S.role==='manager';
  const other=S.role==='manager'?`${esc(x.from)} ← ${esc(x.to)}`:esc(x.from===me?x.to:x.from);
  return`<button class="oc" data-act="xfOpen" data-id="${esc(x.id)}"><span style="min-width:0;flex:1"><span class="t">${S.role==='manager'?'':`<span class="tag">${esc(t(x.from===me?'xf_out':'xf_in'))}</span> `}${other} <span class="hint num" dir="ltr">${esc(x.num||'')}</span></span>
    <span class="s">${esc(t('xf_nLines',{n:(x.lines||[]).length}))} · ${esc(when(x.at))}${x.by?' · '+esc(x.by):''}</span></span>
    <span class="side"><span class="pill ${XF_ST[x.status]||''}">${esc(t('xf_st_'+x.status))}</span></span></button>`}
function xferView(){const L=xfMine(),inc=xfIncoming();
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_xfer')}</h2><button class="btn btn-sun" data-act="xfNew">+ ${t('xf_new')}</button></div>
  <p class="hint">${esc(t('xf_hint'))}</p>
  ${inc.length?`<div class="rp-sec"><h3>${t('xf_waiting')}</h3><div class="list">${inc.map(xfRow).join('')}</div></div>`:''}
  <div class="rp-sec"><h3>${t('xf_all')}</h3><div class="list">${L.filter(x=>!inc.includes(x)).map(xfRow).join('')||`<div class="empty">${esc(t('xf_none'))}</div>`}</div></div>`}
/* operations: every transfer */
function xferOpsView(){const f=S.xfF||'',L=xfMine().filter(x=>!f||x.from===f||x.to===f);
  return`<h2>${t('tab_xferAll')}</h2><div class="filters"><button class="chip" aria-pressed="${!f}" data-act="xfF" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${f===b}" data-act="xfF" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  <div class="list">${L.map(xfRow).join('')||`<div class="empty">${esc(t('xf_none'))}</div>`}</div>`}

function xferNewSheet(){const d=S.xfDraft,b=S.branch,ids=invAllItems().sort((a,c)=>(invQty(b,c)>0)-(invQty(b,a)>0)||invItem(a).name.localeCompare(invItem(c).name,'ar'));
  const body=`<label><span class="hint">${t('xf_to')}</span><select class="field" id="xf-to" data-in="xfF" data-f="to"><option value="">${esc(t('inv_pick'))}</option>${S.branches.filter(x=>x!==b).map(x=>`<option ${d.to===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
  <h4 class="hr-sub">${t('xf_items')}</h4>
  ${d.lines.map((l,i)=>{const it=l.item?invItem(l.item):null;return`<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><select class="field" data-in="xfL" data-i="${i}" data-f="item" style="flex:2;min-width:160px"><option value="">${esc(t('inv_pick'))}</option>${ids.map(id=>{const x=invItem(id),q=invQty(b,id);return`<option value="${esc(id)}" ${l.item===id?'selected':''}>${esc(x.name)}${q?' ('+esc(invFmt(q))+')':''}</option>`}).join('')}</select>
    <input class="field num" data-in="xfL" data-i="${i}" data-f="qty" inputmode="decimal" dir="ltr" placeholder="0" value="${esc(l.qty??'')}" style="flex:1;min-width:80px"><span class="hint" style="min-width:44px">${esc(it?it.unit:'')}</span>
    <button class="btn btn-ghost rp-btn" data-act="xfLDel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></div>`}).join('')}
  <button class="btn btn-ghost rp-btn" data-act="xfLAdd" style="margin-top:8px">+ ${t('inv_item')}</button>
  <label style="display:block;margin-top:10px"><span class="hint">${t('xf_note')}</span><input class="field" id="xf-note" data-in="xfF" data-f="note" dir="auto" value="${esc(d.note||'')}"></label>
  <p class="hint">${esc(t('xf_newHint'))}</p>`;
  return hrSheetWrap(t('xf_new'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="xfSend" ${S.busy?'disabled':''}>${t('xf_send')}</button>`)}
function xferSheet(){const x=(S.transfers||[]).find(y=>y.id===S.openXf);if(!x)return'';
  const recv=S.role==='branch'&&x.to===S.branch&&x.status==='sent',cancel=S.role==='branch'&&x.from===S.branch&&x.status==='sent',r=S.xfRecv||{};
  const done=x.status==='received';
  const body=`<div class="box"><div><span class="hint">${t('xf_from')}:</span> <b>${esc(x.from)}</b> · <span class="hint">${t('xf_to')}:</span> <b>${esc(x.to)}</b></div>
    <div class="hint">${esc(when(x.at))}${x.by?' · '+esc(x.by):''}${x.note?' · '+esc(x.note):''}</div>
    ${x.recvAt?`<div class="hint">${esc(t(done?'xf_recvAt':'xf_rejAt',{d:when(x.recvAt),b:x.recvBy||''}))}${x.recvNote?' · '+esc(x.recvNote):''}</div>`:''}
    ${done&&!x.outApplied?`<div class="hint">${esc(t('xf_outPending'))}</div>`:''}</div>
  <table class="tbl fn-tbl" style="margin-top:10px"><thead><tr><th>${t('inv_item')}</th><th>${t('xf_sent')}</th><th>${t('xf_recv')}</th></tr></thead><tbody>
  ${(x.lines||[]).map((l,i)=>{const it=invItem(l.item);return`<tr><td>${esc(it.name)} <span class="hint">${esc(it.unit)}</span></td><td class="n">${esc(invFmt(l.qty))}</td>
    <td class="n">${recv?`<input class="field num" data-in="xfR" data-i="${i}" inputmode="decimal" dir="ltr" value="${esc(r[i]??l.qty)}" style="width:100px">`:done?`<span class="${xfQty(l)!==+l.qty?'mis':''}">${esc(invFmt(xfQty(l)))}</span>`:'—'}</td></tr>`}).join('')}</tbody></table>
  ${recv?`<label style="display:block;margin-top:10px"><span class="hint">${t('xf_recvNote')}</span><input class="field" id="xf-rnote" data-in="xfRN" dir="auto" value="${esc(S.xfRNote||'')}"></label><p class="hint">${esc(t('xf_recvHint'))}</p>`:''}`;
  const foot=recv?`<button class="btn btn-bad" data-act="xfReject">${S.confirm==='xfReject'?t('xf_rejectSure'):t('xf_reject')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="xfConfirm" ${S.busy?'disabled':''}>${t('xf_confirm')}</button>`
    :cancel?`<button class="btn btn-bad" data-act="xfCancel">${S.confirm==='xfCancel'?t('li_delConfirm'):t('xf_cancel')}</button><span class="spacer"></span>`:'';
  return hrSheetWrap(t('xf_title',{n:x.num||''}),body,foot)}

Object.assign(A,{
  xfF(el){S.xfF=el.dataset.k;render()},
  xfNew(){S.openXfNew=true;S.xfDraft={to:'',note:'',lines:[{item:'',qty:''}]};render()},
  xfLAdd(){S.xfDraft.lines.push({item:'',qty:''});render()},
  xfLDel(el){S.xfDraft.lines.splice(+el.dataset.i,1);if(!S.xfDraft.lines.length)S.xfDraft.lines.push({item:'',qty:''});render()},
  xfSend(){const d=S.xfDraft||{},lines=d.lines.filter(l=>l.item&&num(l.qty)>0).map(l=>({item:l.item,qty:num(l.qty)}));
    if(!d.to){toast(t('xf_needTo'));return}if(!lines.length){toast(t('xf_needLines'));return}
    const id=hrId('TR'),data={num:id.replace(/^TR-\d{4}/,'TR-'),from:S.branch,to:d.to,lines,note:String(d.note||'').trim(),status:'sent',at:nowIso(),by:S.userName||roleL(S.realRole||S.role)};
    guard(async()=>{if(S.fb)await db.doc('transfers/'+id).set(data);else{MEMSET('transfers',MEM('transfers').concat([Object.assign({id},data)]));xLoadDemo()}S.openXfNew=false;S.xfDraft=null},()=>t('xf_sentOk'))},
  xfOpen(el){S.openXf=el.dataset.id;S.xfRecv={};S.xfRNote='';S.confirm=null;render()},
  xfConfirm(){const x=(S.transfers||[]).find(y=>y.id===S.openXf);if(!x||x.status!=='sent')return;const r=S.xfRecv||{};
    const lines=x.lines.map((l,i)=>{const v=r[i];const q=v==null||v===''?+l.qty:Math.max(0,+String(v).replace(',','.')||0);return Object.assign({},l,{recv:Math.round(q*1000)/1000})});
    const at=nowIso(),by=S.userName||roleL(S.realRole||S.role),note=String(S.xfRNote||'').trim(),pairs=lines.filter(l=>l.recv>0).map(l=>[l.item,l.recv]),ref=(x.num||x.id)+' ← '+x.from;
    guard(async()=>{
      if(!S.fb){MEMSET('transfers',MEM('transfers').map(y=>y.id===x.id?Object.assign({},y,{lines,status:'received',recvAt:at,recvBy:by,recvNote:note}):y));await bstockApply(x.to,pairs,'xfer_in',ref)}
      else{const inc=firebase.firestore.FieldValue.increment,tr=db.doc('transfers/'+x.id);
        await db.runTransaction(async tx=>{const s=await tx.get(tr);if(!s.exists||s.data().status!=='sent')throw new Error('state');
          const items={};pairs.forEach(([id,q])=>items[id]=inc(q));tx.set(db.doc('bstock/'+x.to),{items},{merge:true});
          pairs.forEach(([id,q])=>tx.set(db.collection('bmoves').doc(),{branch:x.to,at,kind:'xfer_in',item:id,qty:q,ref,by}));
          tx.update(tr,{lines,status:'received',recvAt:at,recvBy:by,recvNote:note})})}
      S.openXf=null},()=>t('xf_confirmed'))},
  xfReject(){const x=(S.transfers||[]).find(y=>y.id===S.openXf);if(!x)return;if(S.confirm!=='xfReject'){S.confirm='xfReject';render();return}
    const note=String(S.xfRNote||'').trim();if(!note){S.confirm=null;toast(t('xf_needReason'));render();return}
    const f={status:'rejected',recvAt:nowIso(),recvBy:S.userName||roleL(S.realRole||S.role),recvNote:note};
    guard(async()=>{if(S.fb)await db.doc('transfers/'+x.id).update(f);else{MEMSET('transfers',MEM('transfers').map(y=>y.id===x.id?Object.assign({},y,f):y));xLoadDemo()}S.openXf=null;S.confirm=null},()=>t('xf_rejected'))},
  xfCancel(){const x=(S.transfers||[]).find(y=>y.id===S.openXf);if(!x)return;if(S.confirm!=='xfCancel'){S.confirm='xfCancel';render();return}
    guard(async()=>{if(S.fb)await db.doc('transfers/'+x.id).update({status:'cancelled'});else{MEMSET('transfers',MEM('transfers').map(y=>y.id===x.id?Object.assign({},y,{status:'cancelled'}):y));xLoadDemo()}S.openXf=null;S.confirm=null},()=>t('xf_cancelled'))}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='xfF'&&S.xfDraft)S.xfDraft[el.dataset.f]=el.value;
  else if(k==='xfL'&&S.xfDraft)S.xfDraft.lines[+el.dataset.i][el.dataset.f]=el.value;
  else if(k==='xfR')(S.xfRecv||(S.xfRecv={}))[+el.dataset.i]=el.value;
  else if(k==='xfRN')S.xfRNote=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='xfL'&&el.dataset.f==='item')render()});
