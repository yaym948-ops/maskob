/* Maskob — Read a photographed invoice and fill in a supplier invoice or an expense.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   1. QR code: Saudi e-invoices (ZATCA) carry a QR with the seller name, VAT number, date/time, total
      (incl. VAT) and VAT amount — read exactly, no guessing. Uses the browser's own reader when it has
      one, otherwise jsQR (loaded on first use).
   2. Text recognition (Tesseract, Arabic + English, loaded on first use) for what the QR does not
      carry — mainly the invoice number — and as a fallback when there is no QR.
   Everything read is put into the form for a person to check before saving. The photo is kept with
   the record: {collection}/{id}/files/f0 {data}. */
const SCAN_LIBS={jsqr:'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',tess:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'};
const scanLoaded={};
function loadScript(src){return scanLoaded[src]||(scanLoaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>{delete scanLoaded[src];rej(new Error('load'))};document.head.appendChild(s)}))}
const toLatinDigits=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

/* ---------- ZATCA QR (base64 TLV) ---------- */
function parseZatcaQR(raw){
  let bytes;
  try{const bin=atob(String(raw||'').trim());bytes=Uint8Array.from(bin,c=>c.charCodeAt(0))}catch(e){return null}
  const dec=new TextDecoder('utf-8'),out={};let i=0;
  while(i+2<=bytes.length){const tag=bytes[i],len=bytes[i+1];if(i+2+len>bytes.length)break;
    const v=dec.decode(bytes.slice(i+2,i+2+len));i+=2+len;
    if(tag===1)out.supplier=v.trim();else if(tag===2)out.vatNo=v.trim();else if(tag===3)out.at=v.trim();else if(tag===4)out.amount=+v;else if(tag===5)out.vat=+v;}
  if(!out.vatNo&&!out.amount)return null;
  if(out.at){const m=out.at.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)out.date=m[1]+'-'+m[2]+'-'+m[3]}
  return out;
}
/* ---------- text recognised from the photo ---------- */
function parseInvoiceText(text){
  const T=toLatinDigits(text).replace(/[٫]/g,'.').replace(/[،]/g,',');
  const lines=T.split(/\n+/).map(l=>l.trim()).filter(Boolean);
  const out={};
  const vat=T.match(/(?<!\d)3\d{13}3(?!\d)/);if(vat)out.vatNo=vat[0];
  const inv=T.match(/(?:رقم\s*الفاتور[ةه]|فاتور[ةه]\s*رقم|رقم\s*الفاتور[ةه]\s*الضريبية|Invoice\s*(?:No\.?|Number|#)|INV(?:OICE)?\s*#?)\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,24})/i);
  if(inv)out.number=inv[1];
  const today=new Date(),okD=(y,m,d)=>{const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&Math.abs(x-today)<2*365*864e5};
  for(const m of T.matchAll(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})|(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g)){
    const y=+(m[1]||m[6]),mo=+(m[2]||m[5]),d=+(m[3]||m[4]);if(okD(y,mo,d)){out.date=y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');break}}
  const nums=l=>[...l.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g)].map(m=>+(m[1].replace(/,/g,'')+(m[2]?'.'+m[2]:'')));
  let total=null,vatAmt=null;
  for(const l of lines){
    if(/(الإجمالي|الاجمالي|الإجمالى|المجموع|المبلغ المستحق|إجمالي|اجمالي|Total|Amount\s*Due|Grand\s*Total)/i.test(l)&&!/(قبل|بدون|excl|before|sub)/i.test(l)){
      const v=nums(l).filter(n=>n>0&&!(/%/.test(l)&&n===15));if(v.length){const m=Math.max(...v);if(total==null||m>total)total=m}}
    if(/(ضريبة القيمة المضافة|القيمة المضافة|الضريبة|VAT)/i.test(l)&&!/(الرقم|رقم|No|Number|Registration)/i.test(l)
       &&!/(الإجمالي|الاجمالي|الإجمالى|المجموع|إجمالي|اجمالي|Total|شامل|قبل|بدون|incl|excl|before|sub)/i.test(l)){
      const v=nums(l).filter(n=>n>0&&n!==15&&!String(n).match(/^3\d{14}$/));if(v.length)vatAmt=Math.max(...v)}
  }
  if(total!=null)out.amount=total;if(vatAmt!=null&&(total==null||vatAmt<total))out.vat=vatAmt;
  const first=lines.find(l=>/[A-Za-z؀-ۿ]{3,}/.test(l)&&!/(فاتورة|invoice|tax|ضريبي)/i.test(l));if(first)out.supplier=first.slice(0,60);
  return out;
}
/* ---------- reading the photo ---------- */
async function imgFromFile(file){const url=URL.createObjectURL(file);try{return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url})}finally{setTimeout(()=>URL.revokeObjectURL(url),30000)}}
function canvasOf(img,max){const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);return c}
async function readQR(img){
  if('BarcodeDetector' in window){try{const det=new BarcodeDetector({formats:['qr_code']});const r=await det.detect(img);if(r&&r[0])return r[0].rawValue}catch(e){}}
  await loadScript(SCAN_LIBS.jsqr);
  for(const max of [1600,1000,2400]){const c=canvasOf(img,max);const d=c.getContext('2d').getImageData(0,0,c.width,c.height);
    const r=window.jsQR&&jsQR(d.data,c.width,c.height,{inversionAttempts:'attemptBoth'});if(r&&r.data)return r.data}
  return null;
}
async function readText(img,onStep){
  await loadScript(SCAN_LIBS.tess);
  const worker=await Tesseract.createWorker(['ara','eng'],1,{logger:m=>{if(m.status==='recognizing text'&&onStep)onStep(Math.round((m.progress||0)*100))}});
  try{const {data}=await worker.recognize(canvasOf(img,2000));return data.text||''}finally{await worker.terminate()}
}
function photoForStore(img){let c=canvasOf(img,1600),q=0.8,d=c.toDataURL('image/jpeg',q);while(d.length>850000&&q>0.35){q-=0.1;d=c.toDataURL('image/jpeg',q)}
  if(d.length>850000){c=canvasOf(img,1100);d=c.toDataURL('image/jpeg',0.6)}return d}
/* scan a photo, then open the right form filled in */
async function scanInvoice(file,target){
  S.scan={step:t('sc_qr'),pct:null};render();
  try{
    const img=await imgFromFile(file);
    const photo=photoForStore(img);
    let fromQr={},fromText={};
    try{const raw=await readQR(img);const q=raw&&parseZatcaQR(raw);if(q)fromQr=q}catch(e){}
    S.scan={step:t('sc_text'),pct:0};render();
    try{const txt=await readText(img,p=>{S.scan={step:t('sc_text'),pct:p};render()});fromText=parseInvoiceText(txt)}catch(e){toast(t('sc_noText'))}
    const pick=k=>fromQr[k]!=null&&fromQr[k]!==''?fromQr[k]:fromText[k];
    const got={supplier:pick('supplier'),vatNo:pick('vatNo'),number:pick('number'),date:pick('date'),amount:pick('amount'),vat:pick('vat')};
    S.scanInfo={qr:Object.keys(fromQr).filter(k=>['supplier','vatNo','date','amount','vat'].includes(k)),text:Object.keys(got).filter(k=>got[k]!=null&&got[k]!==''&&!(k in fromQr))};
    S.scan=null;S.docImg=photo;
    const f=v=>v==null?'':String(v);
    if(target==='expenses'){S.openExp='new';S.confirm=null;
      S.hrDraft={kind:'expense',date:got.date||dayKey(Date.now()),cat:'other',place:'@office',payee:f(got.supplier),vatNo:f(got.vatNo),amount:f(got.amount),vat:f(got.vat),method:'bank',ref:f(got.number),note:''}}
    else{S.openSi='new';S.confirm=null;S.siPay=null;
      S.hrDraft={supplier:f(got.supplier),vatNo:f(got.vatNo),number:f(got.number),date:got.date||dayKey(Date.now()),due:'',amount:f(got.amount),vat:f(got.vat),note:''}}
    render();
  }catch(e){S.scan=null;toast(t('sc_fail'));render()}
}
/* ---------- pieces used by the forms ---------- */
function scanSheet(){return S.scan?hrSheetWrap(t('sc_title'),`<div class="scan-wait"><div class="scan-spin"></div><b>${esc(S.scan.step)}</b>${S.scan.pct!=null?progress(S.scan.pct/100):''}<p class="hint">${esc(t('sc_wait'))}</p></div>`,''):''}
function scanBanner(){const i=S.scanInfo;if(!i)return'';const n=k=>t({supplier:'st_supplier',vatNo:'sc_vatNo',number:'st_invoice',date:'sl_day',amount:'vc_amount',vat:'ex_vat'}[k]);
  return`<div class="scan-note">${i.qr.length?`<div>✅ ${esc(t('sc_fromQr'))}: ${i.qr.map(n).map(esc).join('، ')}</div>`:`<div>${esc(t('sc_noQr'))}</div>`}
    ${i.text.length?`<div>🔎 ${esc(t('sc_fromText'))}: ${i.text.map(n).map(esc).join('، ')}</div>`:''}<div class="hint">${esc(t('sc_check'))}</div></div>`}
function scanBtn(target){return`<label class="btn btn-navy rp-btn io-imp">📷 ${t('sc_btn')}<input type="file" class="scan-in" data-k="${target}" accept="image/*" capture="environment" aria-label="${esc(t('sc_btn'))}"></label>`}
/* the stored photo of a record */
const DOC_FILES={
  async put(col,id,data){if(S.fb)return db.doc(col+'/'+id+'/files/f0').set({data});(S._demoDocs||(S._demoDocs={}))[col+'/'+id]=data},
  async get(col,id){if(S.fb){const d=await db.doc(col+'/'+id+'/files/f0').get();return d.exists?d.data().data:null}return(S._demoDocs||{})[col+'/'+id]||null},
  async del(col,id){if(S.fb)return db.doc(col+'/'+id+'/files/f0').delete().catch(()=>{});if(S._demoDocs)delete S._demoDocs[col+'/'+id]}
};
function docImgBlock(col,rec){
  const key=rec?col+'/'+rec.id:null;
  const src=S.docImg||(key&&S.docImgs&&S.docImgs[key]);
  if(!src&&rec&&rec.hasFile&&!(S.docImgs&&key in S.docImgs)){(S.docImgs||(S.docImgs={}))[key]=null;DOC_FILES.get(col,rec.id).then(d=>{S.docImgs[key]=d;render()}).catch(()=>{})}
  return src?`<div class="m-photos" style="margin-top:10px"><a class="m-thumb scan-thumb" href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${esc(t('sc_photo'))}"></a></div>`:(rec&&rec.hasFile?`<div class="hint">${esc(t('ef_loading'))}</div>`:'');
}
document.addEventListener('change',ev=>{const el=ev.target;if(!el.classList||!el.classList.contains('scan-in')||!el.files||!el.files[0])return;
  const f=el.files[0],k=el.dataset.k;el.value='';scanInvoice(f,k)});
