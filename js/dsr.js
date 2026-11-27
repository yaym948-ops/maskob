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
/* a row's difference shows once its actual amount is typed (a Foodics figure alone is not yet a difference) */
const dsrDiffOf=(D,k)=>dsrHas(D.a[k])?Math.round((dsrNum(D.a[k])-dsrNum(D.f[k]))*100)/100:0;

/* ---------- reading a Foodics report ---------- */
/* payment method names as printed (English or Arabic), forgiving the usual misreadings */
const DSR_METHOD=[[/apple|ابل|أبل/,'apple'],[/m[a@4]d[a@4]|visa|master|card|credit|atm|span|network|مدى|مدي|شبكة/,'mada'],[/c[a@4][s5]h|naqd|نقد|كاش/,'cash'],
  [/h?ung[ae]r|unger|stat[i1l]on|هنقر|هنجر/,'hunger'],[/k[o0]in|كوين/,'koinz'],[/ke+t|kita|كيت/,'keeta'],[/n[i1l]n[jy]|نينج|ننج/,'ninja'],[/locat|لوكيت/,'locate'],
  [/mask[ou]?[bp]|مسكوب/,'maskob'],[/jah[ae]?z|jahiz|جاهز/,'jahez'],[/to\s?you|تويو/,'other']];
function parseFoodicsReport(text){
  const T=toLatinDigits(text).replace(/[‎‏‪-‮⁦-⁩]/g,'');
  const lines=T.split(/\n+/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const out={pay:{},raw:{},unknown:[]};
  out.kind=/drawer|closing\s*amount|estimated\s*cash|till/i.test(T)?'till':/orders\s*summary|gross\s*sales/i.test(T)?'orders':'other';
  /* amounts: 1,653.00 / 1.653,00 / 136,00 — and in a till report (one amount per line, always two decimals)
     also "3 873.00", "47 00" or "4.154 50" as a blurred photo gives them */
  const AMT=/-?\d{1,3}(?:[.,]\d{3})+[.,]\d{2}(?!\d)|-?\d+[.,]\d{2}(?!\d)/g;
  const norm=x=>{const neg=x.startsWith('-'),d=x.replace(/^-/,''),i=Math.max(d.lastIndexOf('.'),d.lastIndexOf(','));return(neg?'-':'')+d.slice(0,i).replace(/[.,]/g,'')+'.'+d.slice(i+1)};
  const money=l=>{const m=[...l.matchAll(AMT)];return m.length?norm(m[m.length-1][0]):null};
  const tillAmt=l=>{const tail=l.includes(':')?l.slice(l.lastIndexOf(':')+1):l;const g=tail.match(/(\d[\d .,]*\d|\d)\s*$/);if(!g)return null;
    const grp=g[1],dig=grp.replace(/\D/g,'');if(!dig)return null;const cents=/[ .,]\d{2}$/.test(grp)||/^0+$/.test(dig)&&dig.length>2;
    return String(cents?+dig/100:+dig)};
  const amt=l=>out.kind==='till'?(tillAmt(l)??money(l)):money(l);
  const qtyOf=l=>{const s=l.replace(AMT,' ');const m=s.match(/(?:^|\s)(\d{1,5})(?=\s|$)/);return m?+m[1]:null};
  /* the label: digits inside words read as letters (Cl0sing), the side of the colon that has letters (Arabic prints right to left) */
  const lab=l=>{const x=l.replace(/([A-Za-z])0(?=[A-Za-z])/g,'$1o').replace(/([A-Za-z])1(?=[A-Za-z])/g,'$1l').replace(/([A-Za-z])5(?=[A-Za-z])/g,'$1s').replace(AMT,' ');
    const parts=x.split(/[:;]/).map(p=>p.replace(/\d/g,' ').toLowerCase().replace(/[^a-z؀-ۿ ]/g,' ').replace(/\s+/g,' ').trim());
    const lead=parts[0].replace(/^(?:[a-z]{1,2} )+/,'');return parts.length>1?(lead||parts.find(p=>p)||''):lead};
  const dm=T.match(/business\s*date\s*:?\s*(\d{4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/i);if(dm)out.date=dm[1]+'-'+dm[2].padStart(2,'0')+'-'+dm[3].padStart(2,'0');
  const om=T.match(/opened\s*at\s*:?\s*\d{4}\S*\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if(om){let h=+om[1];if(om[3]){const pm=/pm/i.test(om[3]);if(pm&&h<12)h+=12;if(!pm&&h===12)h=0}out.openHour=h}
  const um=T.match(/user\s*:?\s*([^\n]{2,40})/i);if(um)out.user=um[1].replace(/[^؀-ۿA-Za-z ]/g,' ').replace(/\s+/g,' ').trim();
  const STOP=/drawer|operation|short|over|drop|register|open\w* am|clos\w* am|estim|pay in|pay out|^total|^net/;
  const addPay=(L,m)=>{const hit=L&&DSR_METHOD.find(([re])=>re.test(L));if(hit){const k=hit[1];out.raw[k]=out.raw[k]!=null?String(dsrNum(out.raw[k])+dsrNum(m)):m}else out.unknown.push(dsrNum(m))};
  let inPay=false;
  for(const l of lines){
    const L=lab(l),m=amt(l);
    if(/^pay\s?m\w*$/.test(L)&&!m){inPay=true;continue}
    if(inPay&&/^net pay/.test(L)){if(m)out.netPay=m;inPay=false;continue}
    if(inPay){
      if(!m||/^(name|quantity|amount)/.test(L))continue;
      if(/^total pay\w*$|^total payments?/.test(L)&&!/oper/.test(L)){out.totalPay=m;continue}
      if(/^total returns?/.test(L)){out.returns=m;continue}
      if(STOP.test(L))inPay=false;else{addPay(L,m);continue}}
    if(!m&&!/guest count/.test(L))continue;
    if(/^gross sales without/.test(L))out.grossNet=m;
    else if(/^gross sales/.test(L)){out.gross=m;const q=qtyOf(l);if(q!=null)out.orders=q}
    else if(/^total discounts?/.test(L))out.disc=m;
    else if(/^total void/.test(L))out.void=m;
    else if(/^net sales/.test(L))out.net=m;
    else if(/^total tax/.test(L))out.tax=m;
    else if(/^guest count/.test(L)){const q=qtyOf(l);if(q!=null)out.guests=q}
    else if(/^total payment oper/.test(L))out.payOps=m;
    else if(/^total payments?$/.test(L))out.totalPay=m;
    else if(/^total returns?$/.test(L))out.returns=m;
    else if(/^open\w* am/.test(L))out.opening=m;
    else if(/^clos\w* am/.test(L))out.closing=m;
    else if(/^estim/.test(L))out.estimated=m;
    else if(/short/.test(L))out.short=m;
    else if(/^cash over|overage/.test(L))out.over=m;
    else if(/^total pay in/.test(L))out.payIn=m;
    else if(/^total pay out/.test(L))out.payOut=m;
    else if(/^total cash drops?/.test(L))out.drops=m;
  }
  /* no "Payments" heading read: the lines just above "Total Payments" are the methods */
  if(!Object.keys(out.raw).length&&!out.unknown.length){const ti=lines.findIndex(l=>/^total\s*paym/.test(lab(l))&&!/oper/.test(lab(l)));
    const NOT=/total|net|short|over|drop|register|operation|opening|closing|estimat|gift|house|third|count|gross|discount|tax|void|return|printed|business|opened|closed|user|date/;
    if(ti>=0){lines.slice(Math.max(0,ti-10),ti).forEach(l=>{const L=lab(l),m=amt(l);if(!m||NOT.test(L))return;addPay(L,m)});
      if(out.totalPay==null){const m=amt(lines[ti]);if(m)out.totalPay=m}}}
  /* in a till report "Total Payment Operations" is the cash taken: clearer than a blurred "Cash" line */
  if(out.kind==='till'&&out.payOps!=null&&(out.raw.cash==null||Math.abs(dsrNum(out.raw.cash)-dsrNum(out.payOps))>=0.01))out.raw.cash=out.payOps;
  /* the riyal sign is sometimes read as a digit stuck to the amount (₼1,653.00 → 41,653.00):
     when the methods do not add up to the total, try each amount without its first digit */
  const keys=Object.keys(out.raw),tot=out.totalPay!=null?dsrNum(out.totalPay):null;
  const fix=s=>s.replace(/^(-?)\d(?=\d)/,'$1').replace(/^,/,'');
  if(tot!=null&&keys.length&&keys.length<=8){const vals=keys.map(k=>out.raw[k]),extra=out.unknown.reduce((s0,v)=>s0+v,0);
    const ok=a=>Math.abs(a.reduce((s0,v)=>s0+dsrNum(v),0)+extra-tot)<0.01;
    if(!ok(vals)){for(let mask=1;mask<(1<<keys.length);mask++){const a2=vals.map((v,i)=>mask&(1<<i)?fix(v):v);if(ok(a2)){keys.forEach((k,i)=>out.raw[k]=a2[i]);break}}}}
  for(const k of keys)out.pay[k]=dsrNum(out.raw[k]);delete out.raw;
  if(tot!=null&&out.unknown.length&&out.unknown.length<=10){const need=Math.round((tot-Object.values(out.pay).reduce((s0,v)=>s0+v,0))*100)/100,U=out.unknown;
    let pick=null;for(let mask=0;mask<(1<<U.length);mask++){const sub=U.filter((v,i)=>mask&(1<<i));if(Math.abs(sub.reduce((s0,v)=>s0+v,0)-need)<0.01&&(!pick||sub.length>pick.length))pick=sub}
    if(pick)out.unknown=pick}
  if(out.unknown.length)out.pay.other=Math.round(out.unknown.reduce((s0,v)=>s0+v,0)*100)/100;
  for(const k of ['totalPay','netPay','returns','gross','grossNet','disc','void','net','tax','opening','closing','estimated','short','over','payIn','payOut','drops','payOps'])if(out[k]!=null)out[k]=dsrNum(out[k]);
  return out;
}
/* the photo → text: only the paper, turned upright; first in black and white with shadows evened out and
   read in English as one block (Foodics prints its reports in English), then other ways if that reads little */
let tessEngW=null;
async function readEng(c,psm,onStep){
  await loadScript(SCAN_LIBS.tess);
  if(!tessEngW)tessEngW=Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text'&&readEng.onStep)readEng.onStep(Math.round((m.progress||0)*100))}}).catch(e=>{tessEngW=null;throw e});
  const w=await tessEngW;readEng.onStep=onStep;
  try{await w.setParameters({tessedit_pageseg_mode:String(psm||6),preserve_interword_spaces:'1'})}catch(e){}
  const {data}=await w.recognize(c);return data.text||'';
}
/* black and white against the local brightness (thermal paper, shadows, a phone's uneven light) */
function binarize(c){const g=c.getContext('2d'),W=c.width,H=c.height,d=g.getImageData(0,0,W,H),p=d.data,L=new Float32Array(W*H);
  for(let i=0;i<W*H;i++)L[i]=p[i*4]*0.5+p[i*4+1]*0.35+p[i*4+2]*0.15;
  const I=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++){let s0=0;for(let x=0;x<W;x++){s0+=L[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+s0}}
  const r=Math.max(8,Math.round(W/40));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const x0=Math.max(0,x-r),x1=Math.min(W,x+r+1),y0=Math.max(0,y-r),y1=Math.min(H,y+r+1);
    const m=(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((x1-x0)*(y1-y0));const v=L[y*W+x]<m*0.86?0:255;p[i4(x,y)]=p[i4(x,y)+1]=p[i4(x,y)+2]=v}
  function i4(x,y){return(y*W+x)*4}
  g.putImageData(d,0,0);return c}
const reportScore=r=>Object.keys(r.pay).length+(r.closing!=null)+(r.orders!=null)+(r.totalPay!=null)+(r.short!=null);
async function readReportText(img,onStep){
  try{const b=paperBox(img);if(b)img=canvasOf(img,Math.max(img.width*b[2],img.height*b[3]),b)}catch(e){}
  let turns=[0];try{if(textRunsSideways(img))turns=[90,270]}catch(e){}
  let best=null;const keep=(text,im)=>{const r=parseFoodicsReport(text),sc=reportScore(r);if(!best||sc>best.sc)best={r,sc,text,im};return sc};
  const step=(a,b)=>p=>onStep&&onStep(Math.round(a+(b-a)*p/100));
  for(let i=0;i<turns.length;i++){const im=rotated(img,turns[i]);
    if(keep(await readEng(binarize(canvasOf(im,2600,[0,0,1,1])),6,step(i*40/turns.length,(i+1)*40/turns.length)),im)>=4)break}
  if(best.sc<4)keep(await readEng(enhance(canvasOf(best.im,2200,[0,0,1,1]),'red'),4,step(40,70)),best.im);
  if(best.sc<4)keep(await readText(best.im,step(70,100),'red'),best.im);
  else if(best.r.unknown&&best.r.unknown.length){const r2=parseFoodicsReport(await readText(best.im,step(70,100),'red')),r=best.r;
    for(const k of Object.keys(r2.pay)){if(k==='other'||r.pay[k]!=null)continue;const i=r.unknown.findIndex(v=>Math.abs(v-r2.pay[k])<0.01);if(i>=0){r.pay[k]=r2.pay[k];r.unknown.splice(i,1)}}
    if(r.unknown.length)r.pay.other=Math.round(r.unknown.reduce((s0,v)=>s0+v,0)*100)/100;else delete r.pay.other}
  S.dsrText=best.text;S.dsrTextScore=best.sc;
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
function dsrSumApps(d){for(const k of [...DSR_APPS,...DSR_ADJ]){const v=DSR_SHIFTS.reduce((t0,x)=>t0+(+((d.fs[x]||{})[k])||0),0);
  if(DSR_SHIFTS.some(x=>(d.fs[x]||{})[k]!=null))d.f[k]=String(Math.round(v*100)/100)}}
/* the branch says which app an unread amount belongs to */
function dsrUnkBox(d){const items=[];DSR_SHIFTS.forEach(s=>((d.fs[s]||{}).unk||[]).forEach((v,i)=>items.push({s,i,v})));if(!items.length)return'';
  return`<div class="dsr-unk"><b>${esc(t('dsr_unkTitle'))}</b><p class="hint">${esc(t('dsr_unkHint'))}</p>${items.map(x=>`<label class="row" style="gap:8px;align-items:center;margin-top:6px"><span class="num" dir="ltr"><b>${esc(sar2(x.v))}</b></span>
    <select class="field" data-in="dsrUnk" data-s="${x.s}" data-i="${x.i}" style="width:auto"><option value="">${esc(t('dsr_unkPick'))}</option>${DSR_APPS.filter(k=>k!=='other').map(k=>`<option value="${k}">${esc(t('dsr_'+k))}</option>`).join('')}</select></label>`).join('')}</div>`}
function dsrApply(d,r,s){
  const fs=d.fs[s]=d.fs[s]||{};
  if(Object.keys(r.pay).length){for(const k of [...DSR_PAY,...DSR_APPS])delete fs[k];Object.assign(fs,r.pay)}
  if(r.void!=null)fs.void=r.void;if(r.disc!=null)fs.disc=r.disc;if(r.orders!=null)fs.orders=r.orders;
  for(const p of DSR_PAY)if(fs[p]!=null||d.f[p+'_'+s]!=null)d.f[p+'_'+s]=fs[p]!=null?String(fs[p]):d.f[p+'_'+s];
  fs.unk=(r.unknown||[]).slice();if(fs.unk.length)fs.other=Math.round(fs.unk.reduce((t0,v)=>t0+v,0)*100)/100;
  dsrSumApps(d);
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
    ${S.dsrText!=null&&S.dsrTextScore<4?`<details class="dsr-raw"><summary>${esc(t('dsr_rawShow'))}</summary><p class="hint">${esc(t('dsr_rawHint'))}</p><textarea class="field" rows="8" readonly dir="ltr">${esc(S.dsrText)}</textarea></details>`:''}
    ${dsrUnkBox(d)}
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
document.addEventListener('change',ev=>{const el=ev.target;if(!(S.dsr&&el.dataset&&el.dataset.in==='dsrUnk'&&el.value))return;
  const d=S.dsr,fs=d.fs[el.dataset.s]||{},i=+el.dataset.i,v=(fs.unk||[])[i];if(v==null)return;
  fs.unk.splice(i,1);fs[el.value]=Math.round(((+fs[el.value]||0)+v)*100)/100;fs.other=Math.round(((+fs.other||0)-v)*100)/100;if(!(fs.other>0))delete fs.other;
  if(!fs.unk.length)delete fs.unk;dsrSumApps(d);if(d.f.other!=null&&!DSR_SHIFTS.some(x=>(d.fs[x]||{}).other!=null))delete d.f.other;render()});
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
