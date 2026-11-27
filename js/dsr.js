/* Maskob — the branch's daily closing (DSR, as in the company's "Daily Sales Report" sheet), filled from
   photos of the Foodics reports, and handed to finance.
   Loaded by index.html as a classic script after invscan.js (it uses its photo readers).

   Each row has the actual amount (counted / terminal / app) and the Foodics amount; a difference shows in a
   red mark. Cash, Mada and Apple Pay come per shift (morning / evening); delivery apps, voids and discounts per
   day. A photo of a Foodics "Till" report or "Orders Summary" fills the Foodics column of its shift, the
   counted cash (Closing Amount) and the number of orders.

   sales/{branch_date}: {branch, date, sales (total sales, Foodics when read, else actual), invoices, photos,
     balPhotos, dsr:{a:{key:n}, f:{key:n}, fs:{am:{…}, pm:{…}} (Foodics per shift), cashier:{am,pm},
          till:{am:{opening,closing,estimated,short}, pm:{…}}, net, tax}, dsrA, dsrF, dsrDiff} */
const DSR_SHIFTS=['am','pm'];
const DSR_BAL='__bal';   // the reconciliation photos sit at sales/{id}__bal/photos (no record of their own)
const DSR_PAY=['cash','mada','apple'];
const DSR_APPS=['hunger','koinz','keeta','ninja','locate','maskob','jahez','other'];
const DSR_ADJ=['void','disc'];
const DSR_SHIFT_KEYS=DSR_PAY.flatMap(p=>DSR_SHIFTS.map(s=>p+'_'+s));
const DSR_SALES_KEYS=[...DSR_SHIFT_KEYS,...DSR_APPS];
const DSR_KEYS=[...DSR_SALES_KEYS,...DSR_ADJ];
const dsrNum=v=>{const n=parseFloat(String(v??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g,''));return isFinite(n)?Math.round(n*100)/100:0};
const dsrHas=v=>v!==''&&v!=null;
const dsrLabel=k=>{const m=k.match(/^(cash|mada|apple)_(am|pm)$/);return m?t('dsr_'+m[1])+' — '+t('dsr_'+m[2]):t('dsr_'+k)};
/* totals: the sum of the payments (END D.S.R), then less voids and discounts (TOTAL SALES) */
function dsrTotals(D){
  const sum=(o,keys)=>keys.reduce((s,k)=>s+dsrNum(o&&o[k]),0),r2=x=>Math.round(x*100)/100;
  const endA=sum(D.a,DSR_SALES_KEYS),endF=sum(D.f,DSR_SALES_KEYS);
  const totA=endA-sum(D.a,DSR_ADJ),totF=endF-sum(D.f,DSR_ADJ);
  const part=(o,keys)=>r2(sum(o,keys));
  return{endA:r2(endA),endF:r2(endF),totA:r2(totA),totF:r2(totF),diff:r2(totA-totF),
    cashA:part(D.a,['cash_am','cash_pm']),cashF:part(D.f,['cash_am','cash_pm']),cardA:part(D.a,['mada_am','mada_pm','apple_am','apple_pm']),cardF:part(D.f,['mada_am','mada_pm','apple_am','apple_pm']),
    appsA:part(D.a,DSR_APPS),appsF:part(D.f,DSR_APPS)};
}
const dsrDiffOf=(D,k)=>dsrHas(D.a[k])||dsrHas(D.f[k])?Math.round((dsrNum(D.a[k])-dsrNum(D.f[k]))*100)/100:0;

/* ---------- reading a Foodics report ---------- */
const DSR_METHOD=[[/apple/,'apple'],[/mada|visa|master|card|credit|atm|span|network/,'mada'],[/cash|naqd|نقد/,'cash'],[/hunger/,'hunger'],[/koin/,'koinz'],[/kee?ta|kita/,'keeta'],
  [/ninja/,'ninja'],[/locate/,'locate'],[/mask[ou]?[bp]|app/,'maskob'],[/jah[ae]z|jahiz/,'jahez']];
function parseFoodicsReport(text){
  const T=toLatinDigits(text).replace(/[‎‏‪-‮⁦-⁩]/g,'');
  const lines=T.split(/\n+/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const out={pay:{},raw:{}};
  const money=l=>{const m=[...l.matchAll(/-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})|-?\d+\.\d{1,2}/g)];return m.length?m[m.length-1][0]:null};
  const qtyOf=l=>{const s=l.replace(/-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})|-?\d+\.\d{1,2}/g,' ');const m=s.match(/(?:^|\s)(\d{1,5})(?=\s|$)/);return m?+m[1]:null};
  const lab=l=>l.split(/[:#\d]/)[0].toLowerCase().replace(/[^a-z؀-ۿ ]/g,' ').replace(/\s+/g,' ').trim();
  const dm=T.match(/business\s*date\s*:?\s*(\d{4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/i);if(dm)out.date=dm[1]+'-'+dm[2].padStart(2,'0')+'-'+dm[3].padStart(2,'0');
  const om=T.match(/opened\s*at\s*:?\s*\d{4}\S*\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if(om){let h=+om[1];if(om[3]){const pm=/pm/i.test(om[3]);if(pm&&h<12)h+=12;if(!pm&&h===12)h=0}out.openHour=h}
  const um=T.match(/user\s*:?\s*([^\n]{2,40})/i);if(um)out.user=um[1].replace(/[^؀-ۿA-Za-z ]/g,' ').replace(/\s+/g,' ').trim();
  out.kind=/drawer|closing\s*amount|estimated\s*cash|till/i.test(T)?'till':/orders\s*summary|gross\s*sales/i.test(T)?'orders':'other';
  let inPay=false;
  for(const l of lines){
    const L=lab(l),m=money(l);
    if(/^payments?$/.test(L)&&!m){inPay=true;continue}
    if(inPay&&/^net payments?/.test(L)){if(m)out.netPay=m;inPay=false;continue}
    if(inPay){
      if(!m||/^(name|quantity|amount)/.test(L))continue;
      if(/^total payments?/.test(L)){out.totalPay=m;continue}
      if(/^total returns?/.test(L)){out.returns=m;continue}
      const hit=DSR_METHOD.find(([re])=>re.test(L));const k=hit?hit[1]:'other';
      out.raw[k]=out.raw[k]?String(dsrNum(out.raw[k])+dsrNum(m)):m;continue}
    if(!m&&!/guest count/.test(L))continue;
    if(/^gross sales without/.test(L))out.grossNet=m;
    else if(/^gross sales/.test(L)){out.gross=m;const q=qtyOf(l);if(q!=null)out.orders=q}
    else if(/^total discounts?/.test(L))out.disc=m;
    else if(/^total void/.test(L))out.void=m;
    else if(/^net sales/.test(L))out.net=m;
    else if(/^total tax/.test(L))out.tax=m;
    else if(/^guest count/.test(L)){const q=qtyOf(l);if(q!=null)out.guests=q}
    else if(/^total returns?$/.test(L))out.returns=m;
    else if(/^opening amount/.test(L))out.opening=m;
    else if(/^closing amount/.test(L))out.closing=m;
    else if(/^estimated cash/.test(L))out.estimated=m;
    else if(/^cash shortage/.test(L))out.short=m;
    else if(/^cash over/.test(L))out.over=m;
    else if(/^total pay in/.test(L))out.payIn=m;
    else if(/^total pay out/.test(L))out.payOut=m;
    else if(/^total cash drops?/.test(L))out.drops=m;
  }
  /* the riyal sign is sometimes read as a digit stuck to the amount (₼1,653.00 → 41,653.00):
     when the methods do not add up to the total, try each amount without its first digit */
  const keys=Object.keys(out.raw),tot=out.totalPay!=null?dsrNum(out.totalPay):null;
  const fix=s=>s.replace(/^(-?)\d(?=\d)/,'$1').replace(/^,/,'');
  if(tot!=null&&keys.length&&keys.length<=8){const vals=keys.map(k=>out.raw[k]);
    const ok=a=>Math.abs(a.reduce((s,v)=>s+dsrNum(v),0)-tot)<0.01;
    if(!ok(vals)){for(let mask=1;mask<(1<<keys.length);mask++){const a=vals.map((v,i)=>mask&(1<<i)?fix(v):v);if(ok(a)){keys.forEach((k,i)=>out.raw[k]=a[i]);break}}}}
  for(const k of keys)out.pay[k]=dsrNum(out.raw[k]);delete out.raw;
  for(const k of ['totalPay','netPay','returns','gross','grossNet','disc','void','net','tax','opening','closing','estimated','short','over','payIn','payOut','drops'])if(out[k]!=null)out[k]=dsrNum(out[k]);
  return out;
}
/* the photo → text, as for invoices: only the paper, turned upright, read in red then grey */
async function readReportText(img,onStep){
  try{const b=paperBox(img);if(b)img=canvasOf(img,Math.max(img.width*b[2],img.height*b[3]),b)}catch(e){}
  let turns=[0];try{if(textRunsSideways(img))turns=[90,270]}catch(e){}
  let best=null;
  for(let i=0;i<turns.length;i++){const tx=await readText(rotated(img,turns[i]),p=>onStep&&onStep(Math.round((i*100+p)/(turns.length+1))),'red'),r=parseFoodicsReport(tx);
    const sc=Object.keys(r.pay).length+(r.closing!=null)+(r.orders!=null)+(r.totalPay!=null);if(!best||sc>best.sc)best={r,sc,im:rotated(img,turns[i])};if(sc>=3)break}
  if(best.sc<3){const r2=parseFoodicsReport(await readText(best.im,p=>onStep&&onStep(80+Math.round(p/5))));
    const sc=Object.keys(r2.pay).length+(r2.closing!=null)+(r2.orders!=null)+(r2.totalPay!=null);if(sc>best.sc)best={r:r2,sc}}
  return best.r;
}

/* ---------- the branch's form ---------- */
function dsrBlank(){return{a:{},f:{},why:{},fs:{am:{},pm:{}},cashier:{am:'',pm:''},till:{am:{},pm:{}},inv:''}}
function dsrState(day,ex){
  const key=S.branch+'_'+day;if(S.dsr&&S.dsr.key===key)return S.dsr;
  const d=ex&&ex.dsr?JSON.parse(JSON.stringify(ex.dsr)):dsrBlank();
  for(const k of ['a','f','why','fs','cashier','till'])d[k]=d[k]||(k==='fs'||k==='till'?{am:{},pm:{}}:{});
  d.inv=ex&&+ex.invoices?String(ex.invoices):(d.inv||'');
  /* a day entered the old way (one total): show it as the evening cash actual so nothing is lost */
  if(ex&&!ex.dsr&&+ex.sales)d.a.cash_pm=String(ex.sales);
  d.key=key;S.dsr=d;return d;
}
/* a report read for a shift: Foodics figures of that shift, counted cash, orders, cashier */
function dsrApply(d,r,s){
  const fs=d.fs[s]=d.fs[s]||{};
  if(Object.keys(r.pay).length){for(const k of [...DSR_PAY,...DSR_APPS])delete fs[k];Object.assign(fs,r.pay)}
  if(r.void!=null)fs.void=r.void;if(r.disc!=null)fs.disc=r.disc;if(r.orders!=null)fs.orders=r.orders;
  for(const p of DSR_PAY)if(fs[p]!=null||d.f[p+'_'+s]!=null)d.f[p+'_'+s]=fs[p]!=null?String(fs[p]):d.f[p+'_'+s];
  for(const k of [...DSR_APPS,...DSR_ADJ]){const v=DSR_SHIFTS.reduce((t0,x)=>t0+(+((d.fs[x]||{})[k])||0),0);if(DSR_SHIFTS.some(x=>(d.fs[x]||{})[k]!=null))d.f[k]=String(Math.round(v*100)/100)}
  const ord=DSR_SHIFTS.reduce((t0,x)=>t0+(+((d.fs[x]||{}).orders)||0),0);if(ord)d.inv=String(ord);
  if(r.closing!=null){const till=d.till[s]={opening:r.opening||0,closing:r.closing,estimated:r.estimated,short:r.short||0,over:r.over||0};
    if(!dsrHas(d.a['cash_'+s]))d.a['cash_'+s]=String(Math.round((r.closing-(r.opening||0)-(r.payIn||0)+(r.payOut||0)+(r.drops||0))*100)/100);void till}
  if(r.user&&!d.cashier[s])d.cashier[s]=r.user;
  if(r.net!=null)d.net=Math.round(((d.netBy||(d.netBy={}))[s]=r.net,DSR_SHIFTS.reduce((t0,x)=>t0+(+(d.netBy[x]||0)),0))*100)/100;
  if(r.tax!=null)d.tax=Math.round(((d.taxBy||(d.taxBy={}))[s]=r.tax,DSR_SHIFTS.reduce((t0,x)=>t0+(+(d.taxBy[x]||0)),0))*100)/100;
}
function dsrRow(d,k,ro){
  const df=dsrDiffOf(d,k),inp=(c)=>ro?`<td class="n">${dsrHas(d[c][k])?esc(sar2(dsrNum(d[c][k]))):'—'}</td>`
    :`<td><input class="field num dsr-in" id="dsr-${c}-${k}" data-in="dsr" data-c="${c}" data-k="${k}" inputmode="decimal" dir="ltr" value="${esc(d[c][k]??'')}" placeholder="0"></td>`;
  return`<tr class="${df?'dsr-off':''}" id="dsr-r-${k}"><th scope="row">${esc(dsrLabel(k))}</th>${inp('a')}${inp('f')}<td class="n dsr-d" id="dsr-d-${k}">${df?esc(sar2(df)):''}</td></tr>`;
}
function dsrTable(d,ro){
  const T=dsrTotals(d),sec=(l,keys)=>`<tr class="dsr-sec"><th colspan="4">${esc(t(l))}</th></tr>`+keys.map(k=>dsrRow(d,k,ro)).join('');
  const tot=(l,a,f,id)=>`<tr class="dsr-tot"><th scope="row">${esc(t(l))}</th><td class="n" id="${id}-a">${esc(sar2(a))}</td><td class="n" id="${id}-f">${esc(sar2(f))}</td><td class="n" id="${id}-d">${Math.round((a-f)*100)/100?esc(sar2(Math.round((a-f)*100)/100)):''}</td></tr>`;
  return`<div class="scroll"><table class="tbl dsr-tbl"><thead><tr><th>${t('dsr_details')}</th><th>${t('dsr_actual')}</th><th>${t('dsr_foodics')}</th><th>${t('dsr_diff')}</th></tr></thead><tbody>
    ${sec('dsr_secCash',['cash_am','cash_pm'])}${tot('dsr_total',T.cashA,T.cashF,'dsr-tc')}
    ${sec('dsr_secCard',['mada_am','mada_pm','apple_am','apple_pm'])}${tot('dsr_total',T.cardA,T.cardF,'dsr-tk')}
    ${sec('dsr_secApps',DSR_APPS)}${tot('dsr_total',T.appsA,T.appsF,'dsr-tp')}
    ${tot('dsr_end',T.endA,T.endF,'dsr-te')}
    ${sec('dsr_secAdj',DSR_ADJ)}
    ${tot('dsr_totalSales',T.totA,T.totF,'dsr-tt')}
  </tbody></table></div>`;
}
function dsrForm(day,ex){
  const d=dsrState(day,ex),id=S.branch+'_'+day,ic=n=>typeof ico==='function'?ico(n,'b-ic'):'';
  const tillNote=s=>{const x=d.till[s];return x&&x.closing!=null?`<span class="tag ${x.short?'ret':''}">${esc(t('dsr_'+s))}: ${esc(t('dsr_counted'))} ${esc(sar2(x.closing))}${x.short?' · '+esc(t('dsr_short'))+' '+esc(sar2(x.short)):x.over?' · '+esc(t('dsr_over'))+' '+esc(sar2(x.over)):''}</span>`:''};
  return`<div class="box sl-form dsr-form">
    <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b class="dsr-h">${esc(t('dsr_title'))}</b>
      <label><span class="hint">${t('sl_day')}</span> <input class="field" type="date" id="slDay" value="${esc(day)}" max="${dayKey(Date.now())}" style="width:auto"></label></div>
    <p class="hint">${esc(t('dsr_hint'))}</p>
    <div class="row dsr-scan">${DSR_SHIFTS.map(s=>`<label class="btn btn-navy rp-btn io-imp">${ic('camera')}${esc(t('dsr_scan_'+s))}<input type="file" class="dsr-scan-in" data-s="${s}" accept="image/*" capture="environment" aria-label="${esc(t('dsr_scan_'+s))}"></label>`).join('')}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0">${tillNote('am')}${tillNote('pm')}</div>
    ${dsrTable(d,false)}
    <div class="sl-grid hr-grid" style="margin-top:10px">
      <label><span class="hint">${t('dsr_orders')}</span><input class="field num" id="dsr-inv" data-in="dsrX" data-k="inv" inputmode="numeric" dir="ltr" value="${esc(d.inv||'')}" placeholder="0"></label>
      <label><span class="hint">${t('dsr_cashier_am')}</span><input class="field" id="dsr-c-am" data-in="dsrX" data-k="cashier_am" dir="auto" value="${esc(d.cashier.am||'')}"></label>
      <label><span class="hint">${t('dsr_cashier_pm')}</span><input class="field" id="dsr-c-pm" data-in="dsrX" data-k="cashier_pm" dir="auto" value="${esc(d.cashier.pm||'')}"></label></div>
    ${typeof phBlock==='function'?phBlock('sales',id,{title:'ph_sales',required:'ph_salesNeed',branch:S.branch}):''}
    ${typeof phBlock==='function'?phBlock('sales',id+DSR_BAL,{title:'ph_bal',required:'ph_balNeed',branch:S.branch}):''}
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-sun" data-act="dsrSave" ${S.busy?'disabled':''}>${ex?t('sl_update'):t('dsr_send')}</button></div>
  </div>`;
}
/* totals and differences follow the typing without drawing the form again */
function dsrPaint(){
  const d=S.dsr;if(!d)return;const T=dsrTotals(d),set=(id,v)=>{const o=document.getElementById(id);if(o)o.textContent=v};
  for(const k of DSR_KEYS){const df=dsrDiffOf(d,k);set('dsr-d-'+k,df?sar2(df):'');const r=document.getElementById('dsr-r-'+k);if(r)r.classList.toggle('dsr-off',!!df);
  }
  for(const [id,a,f] of [['dsr-tc',T.cashA,T.cashF],['dsr-tk',T.cardA,T.cardF],['dsr-tp',T.appsA,T.appsF],['dsr-te',T.endA,T.endF],['dsr-tt',T.totA,T.totF]]){
    set(id+'-a',sar2(a));set(id+'-f',sar2(f));const x=Math.round((a-f)*100)/100;set(id+'-d',x?sar2(x):'')}
}
async function dsrScan(file,s){
  const day=S.slDay||dayKey(Date.now()),ex=(S.sales||[]).find(r=>r.branch===S.branch&&r.date===day),d=dsrState(day,ex),id=S.branch+'_'+day;
  S.scan={step:t('dsr_reading'),pct:0};render();
  try{
    /* the photo goes with the day's photos at once */
    if(typeof phShrink==='function'&&typeof phEnsure==='function'){const p=phEnsure('sales',id,{branch:S.branch});if(p.list.length<PH_MAX)p.list.push({pid:phNewId(),data:await phShrink(file),saved:false})}
    const img=await imgFromFile(file);
    const r=await readReportText(img,p=>{S.scan={step:t('dsr_reading'),pct:p};render()});
    const n=Object.keys(r.pay).length+(r.closing!=null)+(r.orders!=null);
    S.scan=null;
    if(!n){toast(t('dsr_noRead'));render();return}
    dsrApply(d,r,s);
    if(r.date&&r.date!==day)toast(t('dsr_otherDate',{d:r.date}));else toast(t('dsr_read',{n}));
  }catch(e){S.scan=null;toast(t('sc_fail'))}
  render();
}
Object.assign(A,{
  dsrSave(){
    const day=S.slDay||dayKey(Date.now()),id=S.branch+'_'+day,d=S.dsr;if(!d||d.key!==id)return;
    if(day>dayKey(Date.now())){toast(t('sl_future'));return}
    const T=dsrTotals(d);if(!(T.endA>0||T.endF>0)){toast(t('dsr_need'));return}
    const pn=typeof phCount==='function'?phCount('sales',id):null;if(pn===0){toast(t('ph_salesNeed'));return}
    const bn=typeof phCount==='function'?phCount('sales',id+DSR_BAL):null;if(bn===0){toast(t('ph_balNeed'));return}
    const clean=o=>{const r={};for(const k in o)if(dsrHas(o[k]))r[k]=dsrNum(o[k]);return r};
    const dsr={a:clean(d.a),f:clean(d.f),fs:d.fs,cashier:d.cashier,till:d.till,net:d.net??null,tax:d.tax??null};
    const data={branch:S.branch,date:day,sales:T.totF>0?T.totF:T.totA,invoices:Math.round(dsrNum(d.inv))||0,at:nowIso(),dsr,dsrA:T.totA,dsrF:T.totF,dsrDiff:T.diff};
    if(pn!=null)data.photos=pn;if(bn!=null)data.balPhotos=bn;
    guard(async()=>{await X.put('sales',id,data);if(typeof phCommit==='function'){await phCommit('sales',id,id,S.branch);await phCommit('sales',id+DSR_BAL,id+DSR_BAL,S.branch)}S.dsr=null},()=>t('dsr_saved'));
  }
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!S.dsr||!k)return;
  if(k==='dsr'){S.dsr[el.dataset.c][el.dataset.k]=el.value;dsrPaint()}
  else if(k==='dsrX'){const f=el.dataset.k;if(f==='inv')S.dsr.inv=el.value;else S.dsr.cashier[f.slice(8)]=el.value}});
document.addEventListener('change',ev=>{const el=ev.target;if(!el.classList||!el.classList.contains('dsr-scan-in'))return;const f=el.files&&el.files[0];el.value='';if(f)dsrScan(f,el.dataset.s)});

/* ---------- finance and operations: a month by payment method, and the DSR sheet in Excel ---------- */
function dsrMonthRows(list){return list.filter(r=>r.dsr)}
function dsrMonthSummary(list){
  const rows=dsrMonthRows(list);if(!rows.length)return'';
  const sum=(c,keys)=>Math.round(rows.reduce((s,r)=>s+keys.reduce((a,k)=>a+(+((r.dsr[c]||{})[k])||0),0),0)*100)/100;
  const lines=[['dsr_secCash',['cash_am','cash_pm']],['dsr_mada',['mada_am','mada_pm']],['dsr_apple',['apple_am','apple_pm']],...DSR_APPS.map(k=>['dsr_'+k,[k]]),['dsr_void',['void']],['dsr_disc',['disc']]]
    .map(([l,keys])=>({l,a:sum('a',keys),f:sum('f',keys)})).filter(x=>x.a||x.f);
  const short=Math.round(rows.reduce((s,r)=>s+DSR_SHIFTS.reduce((a,x)=>a+(+(((r.dsr.till||{})[x]||{}).short)||0),0),0)*100)/100;
  return`<div class="rp-sec"><div class="row" style="justify-content:space-between"><h3>${t('dsr_byMethod')}</h3><button class="btn btn-ghost rp-btn" data-act="dsrXls">${t('dsr_xls')}</button></div>
    <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('dsr_details')}</th><th>${t('dsr_actual')}</th><th>${t('dsr_foodics')}</th><th>${t('dsr_diff')}</th></tr></thead><tbody>
    ${lines.map(x=>{const df=Math.round((x.a-x.f)*100)/100;return`<tr><td><b>${esc(t(x.l))}</b></td><td class="n">${esc(sar2(x.a))}</td><td class="n">${esc(sar2(x.f))}</td><td class="n ${df?'mis':''}">${df?esc(sar2(df)):''}</td></tr>`}).join('')}
    </tbody></table></div>${short?`<p class="hint">${esc(t('dsr_shortMonth',{n:sar2(short)}))}</p>`:''}</div>`;
}
A.dsrXls=function(){
  const mk=S.slLogMonth||monthKey(Date.now()),bf=S.slLogBranch||'';
  const rows=(S.sales||[]).filter(r=>r.dsr&&String(r.date).startsWith(mk)&&(!bf||r.branch===bf)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.branch).localeCompare(String(b.branch)));
  const headers=[t('sl_day'),t('r_branch'),...DSR_KEYS.flatMap(k=>[dsrLabel(k)+' — '+t('dsr_actual'),dsrLabel(k)+' — '+t('dsr_foodics')]),t('dsr_totalSales')+' — '+t('dsr_actual'),t('dsr_totalSales')+' — '+t('dsr_foodics'),t('dsr_diff'),t('dsr_orders'),t('dsr_cashier_am'),t('dsr_cashier_pm'),t('slr_title')];
  const body=rows.map(r=>[r.date,r.branch,...DSR_KEYS.flatMap(k=>[r.dsr.a[k]??'',r.dsr.f[k]??'']),r.dsrA??'',r.dsrF??'',r.dsrDiff??'',r.invoices||'',(r.dsr.cashier||{}).am||'',(r.dsr.cashier||{}).pm||'',r.review?t('slr_'+r.review.st):t('slr_wait')]);
  saveXlsx('maskob-dsr-'+mk+(bf?'-'+bf:'')+'.xlsx',[{name:'DSR '+mk,headers,rows:body}]);
};
