/* Maskob — Wi-Fi / network printers through a print queue.
   The branch adds its printers (name, IP address, port, paper, receipt / kitchen / both, and for kitchen or bar printers
   the menu categories they take). A print becomes a job in printJobs; a small program on an always-on phone or computer
   in the branch (bridge/bridge.js, signed in with the branch code) sends it to the printer over the network (port 9100).
   Works from any device, the cashier's iPhone too.
   bprinters/{branch}: {printers:[{id, name, ip, port, width, kind:'receipt'|'kitchen'|'both', cats:[category]}], bridgeAt, bridgeName}
   printJobs/{id}:     {branch, printer, data (ESC/POS, base64), kind, no, at, by, status:'new'|'done'|'error', err, tries, doneAt} */
const bpDoc=()=>((S.bprinters||{})[S.branch])||{};
const bpList=()=>bpDoc().printers||[];
const bpOnline=()=>{const a=bpDoc().bridgeAt;return!!a&&Date.now()-new Date(a)<150000};
function bpLoadDemo(){if(BR_ROLES.includes(S.role)){const m=MEM('bprinters');const all=m&&!Array.isArray(m)?m:{};S.bprinters={[S.branch]:all[S.branch]||{}};S.printJobs=MEM('printJobs').filter(j=>j.branch===S.branch)}}
function bpStart(u,onErr){if(!BR_ROLES.includes(S.role))return;const b=S.branch;
  u.push(db.doc('bprinters/'+b).onSnapshot(s=>{S.bprinters={[b]:s.exists?s.data():{}};render()},onErr));
  if(S.role==='branch'||S.role==='cashier')u.push(db.collection('printJobs').where('branch','==',b).onSnapshot(s=>{S.printJobs=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}
async function bpSaveList(list){const b=S.branch;if(S.fb)await db.doc('bprinters/'+b).set({printers:list},{merge:true});
  else{const m=MEM('bprinters'),all=m&&!Array.isArray(m)?Object.assign({},m):{};all[b]=Object.assign({},all[b]||{},{printers:list});MEMSET('bprinters',all);bpLoadDemo()}}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)};
async function bpJob(printer,kind,o,bytes){const job={branch:S.branch,printer:printer.id,data:b64(bytes),kind,no:o.no||0,at:nowIso(),by:S.userName||roleL(S.realRole||S.role),status:'new',tries:0};
  if(S.fb)await db.collection('printJobs').add(job);else{MEMSET('printJobs',MEM('printJobs').concat([Object.assign({id:'J'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)},job)]));bpLoadDemo()}}
/* the kitchen ticket of one printer: only the lines of its categories (none set → every line) */
function bpLinesFor(p,o){const cats=p.cats||[];if(!cats.length)return o.lines;return o.lines.filter(l=>{const pr=(S.products||[]).find(x=>x.id===l.pid);return pr&&cats.includes(pr.cat)})}
/* send a receipt or kitchen tickets through the queue */
async function bpPrint(kind,o){const cfg=prnCfg(),L=bpList();if(!L.length){toast(t('bp_noPrinters'));return false}
  if(kind==='receipt'){const p=L.find(x=>x.id===cfg.netReceipt)||L.find(x=>x.kind==='receipt')||L.find(x=>x.kind==='both');if(!p){toast(t('bp_noReceipt'));return false}
    await bpJob(p,'receipt',o,escposRaster(await receiptCanvas(receiptModel(o,'receipt'),p.width)));return true}
  const K=L.filter(x=>x.kind==='kitchen'||x.kind==='both');let n=0;
  for(const p of K){const lines=bpLinesFor(p,o);if(!lines.length)continue;await bpJob(p,'kitchen',o,escposRaster(await receiptCanvas(receiptModel(Object.assign({},o,{lines}),'kitchen'),p.width)));n++}
  return n>0}

function bprintersView(){const L=bpList(),on=bpOnline(),jobs=[...(S.printJobs||[])].sort((a,c)=>String(c.at).localeCompare(String(a.at))).slice(0,12),cats=typeof menuCats==='function'?menuCats():[];
  const edit=S.role==='branch'||S.realRole==='owner';
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_bprinters')}</h2>${edit?`<button class="btn btn-sun" data-act="bpNew">+ ${t('bp_new')}</button>`:''}</div>
  <div class="box"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${t('bp_bridge')}</b><span class="pill ${on?'ms-done':'ms-open'}">${esc(on?t('bp_on',{n:bpDoc().bridgeName||''}):t('bp_off'))}</span></div>
    <p class="hint">${esc(on?t('bp_onHint',{d:when(bpDoc().bridgeAt)}):t('bp_offHint'))}</p></div>
  <div class="list">${L.map((p,i)=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(p.name)} <span class="hint num" dir="ltr">${esc(p.ip)}:${esc(p.port||9100)}</span></span>
    <span class="s">${esc(t('bp_k_'+p.kind))} · ${esc(p.width||80)} mm${(p.cats||[]).length?' · '+esc(p.cats.join('، ')):''}</span></span>
    <span class="side"><button class="btn btn-ghost rp-btn" data-act="bpTest" data-i="${i}">${t('prn_test')}</button>${edit?`<button class="btn btn-ghost rp-btn" data-act="bpEdit" data-i="${i}">${t('edit')}</button>`:''}</span></div>`).join('')||`<div class="empty">${esc(t('bp_none'))}</div>`}</div>
  ${jobs.length?`<div class="rp-sec"><h3>${t('bp_jobs')}</h3><div class="list">${jobs.map(j=>{const p=L.find(x=>x.id===j.printer);return`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(p?p.name:j.printer)} · ${esc(t(j.kind==='kitchen'?'bp_ticket':'bp_invoice'))}${j.no?' #'+esc(j.no):''}</span><span class="s">${esc(when(j.at))}${j.err?' · '+esc(j.err):''}</span></span>
    <span class="side"><span class="pill ${j.status==='done'?'ms-done':j.status==='error'?'li-expired':'ms-progress'}">${esc(t('bp_st_'+j.status))}</span>${j.status==='error'?`<button class="btn btn-ghost rp-btn" data-act="bpRetry" data-id="${esc(j.id)}">${t('bp_retry')}</button>`:''}</span></div>`}).join('')}</div></div>`:''}
  <div class="rp-sec"><h3>${t('bp_setup')}</h3><ol class="cf-order bp-steps">${['bp_s1','bp_s2','bp_s3','bp_s4','bp_s5','bp_s6'].map(k=>`<li>${t(k)}</li>`).join('')}</ol>
    <pre class="bp-cmd" dir="ltr">pkg update -y && pkg install -y nodejs
mkdir -p ~/maskob && cd ~/maskob
curl -fsSLO ${esc(location.origin)}/bridge/bridge.js
curl -fsSLO ${esc(location.origin)}/bridge/package.json
npm install
termux-wake-lock
node bridge.js</pre><p class="hint">${esc(t('bp_cmdHint'))}</p></div>`}
function bprinterSheet(){const d=S.bpDraft||{},cats=typeof menuCats==='function'?menuCats():[];
  const body=`<div class="sl-grid hr-grid"><label><span class="hint">${t('bp_name')}</span><input class="field" id="bp-name" data-in="bpD" data-f="name" dir="auto" value="${esc(d.name||'')}" placeholder="${esc(t('bp_namePh'))}"></label>
    <label><span class="hint">${t('bp_ip')}</span><input class="field num" id="bp-ip" data-in="bpD" data-f="ip" dir="ltr" inputmode="decimal" value="${esc(d.ip||'')}" placeholder="192.168.1.100"></label>
    <label><span class="hint">${t('bp_port')}</span><input class="field num" id="bp-port" data-in="bpD" data-f="port" dir="ltr" inputmode="numeric" value="${esc(d.port||9100)}"></label>
    <label><span class="hint">${t('prn_paper')}</span><select class="field" id="bp-width" data-in="bpD" data-f="width">${[80,58].map(w=>`<option value="${w}" ${+d.width===w?'selected':''}>${w} mm</option>`).join('')}</select></label>
    <label><span class="hint">${t('bp_kind')}</span><select class="field" id="bp-kind" data-in="bpD" data-f="kind">${['receipt','kitchen','both'].map(k=>`<option value="${k}" ${d.kind===k?'selected':''}>${esc(t('bp_k_'+k))}</option>`).join('')}</select></label></div>
  ${d.kind!=='receipt'&&cats.length?`<h4 class="hr-sub">${t('bp_cats')}</h4><p class="hint">${esc(t('bp_catsHint'))}</p><div class="pos-addons">${cats.map(c=>`<button class="chip" aria-pressed="${(d.cats||[]).includes(c)}" data-act="bpCat" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:''}
  <p class="hint">${esc(t('bp_ipHint'))}</p>`;
  return hrSheetWrap(S.bpEdit==null?t('bp_new'):(d.name||''),body,`${S.bpEdit==null?'':`<button class="btn btn-bad" data-act="bpDel">${S.confirm==='bpDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="bpSave">${t('waSave')}</button>`)}
const BP_IP=/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
Object.assign(A,{
  bpNew(){S.bpEdit=null;S.bpDraft={name:'',ip:'',port:9100,width:80,kind:bpList().some(p=>p.kind!=='kitchen')?'kitchen':'receipt',cats:[]};S.openBp=true;render()},
  bpEdit(el){const p=bpList()[+el.dataset.i];if(!p)return;S.bpEdit=+el.dataset.i;S.bpDraft=JSON.parse(JSON.stringify(p));S.openBp=true;S.confirm=null;render()},
  bpCat(el){const d=S.bpDraft,c=el.dataset.k;d.cats=(d.cats||[]).includes(c)?d.cats.filter(x=>x!==c):[...(d.cats||[]),c];render()},
  bpSave(){const d=S.bpDraft||{},name=String(d.name||'').trim(),ip=String(d.ip||'').trim(),port=Math.round(+d.port||9100);
    if(!name){toast(t('mn_needName'));return}if(!BP_IP.test(ip)){toast(t('bp_badIp'));return}
    const L=bpList().map(x=>Object.assign({},x)),p={id:S.bpEdit==null?'pr'+Date.now().toString(36):L[S.bpEdit].id,name,ip,port:port>0&&port<65536?port:9100,width:+d.width===58?58:80,kind:['receipt','kitchen','both'].includes(d.kind)?d.kind:'receipt',cats:d.kind==='receipt'?[]:(d.cats||[])};
    if(S.bpEdit==null)L.push(p);else L[S.bpEdit]=p;guard(async()=>{await bpSaveList(L);S.openBp=false},()=>t('st_saved'))},
  bpDel(){if(S.bpEdit==null)return;if(S.confirm!=='bpDel'){S.confirm='bpDel';render();return}const L=bpList().filter((_,i)=>i!==S.bpEdit);guard(async()=>{await bpSaveList(L);S.openBp=false;S.confirm=null},()=>t('li_deleted'))},
  bpTest(el){const p=bpList()[+el.dataset.i];if(!p)return;const o={id:'test',branch:S.branch,no:0,at:nowIso(),type:'in',lines:[{name:t('prn_testItem')+' — '+p.name,qty:1,price:10,addons:[]}],total:10,vat:vatOf(10),payments:[{name:'نقدي',kind:'cash',amount:10}],change:0};
    guard(async()=>{await bpJob(p,p.kind==='kitchen'?'kitchen':'receipt',o,escposRaster(await receiptCanvas(receiptModel(o,p.kind==='kitchen'?'kitchen':'receipt'),p.width)))},()=>t('bp_sent'))},
  bpRetry(el){guard(async()=>{if(S.fb)await db.doc('printJobs/'+el.dataset.id).update({status:'new',err:'',tries:0});else{MEMSET('printJobs',MEM('printJobs').map(j=>j.id===el.dataset.id?Object.assign({},j,{status:'new',err:''}):j));bpLoadDemo()}})},
  prnNetReceipt(el){const c=prnCfg();c.netReceipt=el.value;prnSave(c)}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='bpD'&&S.bpDraft)S.bpDraft[el.dataset.f]=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='bpD'&&el.dataset.f==='kind')render();if(el.id==='prnNetReceipt'){const c=prnCfg();c.netReceipt=el.value;prnSave(c)}});
EXT.tabs.push({k:'bprinters',l:'tab_bprinters',roles:['branch','cashier'],view:bprintersView,badge:()=>{const e=(S.printJobs||[]).filter(j=>j.status==='error').length;return e?{b:e,late:true}:0}});
EXT.sheets.push(()=>S.openBp?bprinterSheet():'');
EXT.close.push(()=>{S.openBp=false});
