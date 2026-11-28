/* Maskob — printing for the cashier and the kitchen.
   Two ways, chosen per device (saved on the device):
   - the device's print window, laid out for 80 mm (or 58 mm) receipt paper — works with any printer the device knows;
   - direct to a thermal (ESC/POS) printer over Bluetooth or USB (Chrome / Edge on Android, Windows, Mac), without a print
     window. The receipt is drawn as an image and sent as raster data, so Arabic prints correctly on any thermal printer.
   The receipt is a simplified tax invoice with the ZATCA phase-1 QR. */
const PRN_KEY='mk.printer';
const prnCfg=()=>Object.assign({mode:'browser',width:80,autoReceipt:true,autoKitchen:false,kitchenCopy:false},LS.get(PRN_KEY,{})||{});
const prnSave=c=>{LS.set(PRN_KEY,c);render()};
const PRN_BLE_SERVICES=['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455','0000ff00-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb'];
let PRN={dev:null,ch:null,port:null,writer:null};
const prnCan={bt:!!(navigator.bluetooth),serial:!!(navigator.serial)};
const prnConnected=()=>!!(PRN.ch||PRN.writer);

/* ---------- what is printed ---------- */
function receiptModel(o,kind){const co=typeof coInfo==='function'?coInfo():{name:'مسكوب',vat:''},cfg=S.posCfg||{};
  return{kind,co,branch:o.branch,no:o.no,at:o.at,type:o.type,by:o.by,lines:o.lines,total:+o.total||0,vat:+o.vat||0,payments:o.payments||[],change:+o.change||0,
    header:cfg.header||'',footer:cfg.footer||t('pos_thanks'),qr:kind==='receipt'?orderQR(o):''}}
const prnDate=iso=>{try{const d=new Date(iso);return d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}catch(e){return iso}};
/* HTML for the print window */
async function receiptHTML(m){const qr=m.qr?await qrMatrix(m.qr).catch(()=>null):null;let qrImg='';
  if(qr){const n=qr.length,c=document.createElement('canvas'),s=4;c.width=c.height=(n+8)*s;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#000';
    qr.forEach((row,y)=>row.forEach((on,x)=>{if(on)g.fillRect((x+4)*s,(y+4)*s,s,s)}));qrImg=`<img src="${c.toDataURL()}" style="width:38mm;height:38mm">`}
  const L=m.lines.map(l=>`<tr><td>${esc(l.qty)} × ${esc(l.name)}${(l.addons||[]).length?`<div class="a">${l.addons.map(a=>esc(a.name)+(+a.price?' +'+(+a.price).toFixed(2):'')).join('، ')}</div>`:''}${l.note?`<div class="a">${esc(l.note)}</div>`:''}</td>${m.kind==='receipt'?`<td class="n">${lineTotal(l).toFixed(2)}</td>`:''}</tr>`).join('');
  const k=m.kind==='kitchen';
  return`<html dir="rtl"><head><meta charset="utf-8"><style>@page{size:${prnCfg().width}mm auto;margin:3mm}body{font-family:Tahoma,Arial,sans-serif;width:${prnCfg().width-6}mm;margin:0;font-size:${k?15:12}px;color:#000}
  h1{font-size:${k?30:16}px;text-align:center;margin:2px 0}.c{text-align:center}table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top;border-bottom:1px dashed #999}.n{text-align:left;white-space:nowrap}.a{font-size:${k?13:10}px;color:#333}
  .t td{border:0;font-weight:bold}.s{font-size:10px}</style></head><body>
  ${k?`<h1># ${esc(m.no)}</h1><div class="c">${esc(t(m.type==='out'?'pos_out':'pos_in'))} · ${esc(prnDate(m.at))}</div>`
     :`<h1>${esc(m.co.name)}</h1><div class="c s">${esc(m.branch||'')}${m.co.vat?`<br>الرقم الضريبي ${esc(m.co.vat)}`:''}${m.header?'<br>'+esc(m.header):''}</div><div class="c"><b>فاتورة ضريبية مبسطة</b></div>
       <div class="c s">رقم الطلب ${esc(m.no)} · ${esc(prnDate(m.at))} · ${esc(t(m.type==='out'?'pos_out':'pos_in'))}</div>`}
  <table>${L}</table>
  ${k?'':`<table class="t"><tr><td>الإجمالي شامل الضريبة</td><td class="n">${m.total.toFixed(2)}</td></tr><tr><td>ضريبة القيمة المضافة 15%</td><td class="n">${m.vat.toFixed(2)}</td></tr>
  ${m.payments.map(p=>`<tr><td>${esc(p.name)}</td><td class="n">${(+p.amount).toFixed(2)}</td></tr>`).join('')}${m.change?`<tr><td>الباقي</td><td class="n">${m.change.toFixed(2)}</td></tr>`:''}</table>
  <div class="c">${qrImg}</div><div class="c s">${esc(m.footer)}</div>`}</body></html>`}
/* the same receipt drawn on a canvas, for raster printing (576 dots = 80 mm, 384 = 58 mm) */
async function receiptCanvas(m){const W=prnCfg().width>=80?576:384,k=m.kind==='kitchen',c=document.createElement('canvas');c.width=W;c.height=3000;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,c.height);g.fillStyle='#000';g.direction='rtl';let y=10;const pad=8;
  const font=(px,b)=>{g.font=`${b?'bold ':''}${px}px Tahoma, Arial, sans-serif`};
  const center=(txt,px,b)=>{font(px,b);g.textAlign='center';y+=px+6;g.fillText(txt,W/2,y)};
  const row=(r,l,px,b)=>{font(px,b);y+=px+6;g.textAlign='right';g.fillText(r,W-pad,y);if(l!=null){g.textAlign='left';g.direction='ltr';g.fillText(l,pad,y);g.direction='rtl'}};
  const wrap=(txt,px,indent)=>{font(px);const words=String(txt).split(' ');let line='';const max=W-pad*2-(indent||0);words.forEach(w=>{const tt=line?line+' '+w:w;if(g.measureText(tt).width>max&&line){row(line,null,px);line=w}else line=tt});if(line)row(line,null,px)};
  const rule=()=>{y+=8;g.fillRect(pad,y,W-pad*2,1);y+=4};
  if(k){center('# '+m.no,64,true);center(t(m.type==='out'?'pos_out':'pos_in')+' · '+prnDate(m.at),22)}
  else{center(m.co.name,32,true);if(m.branch)center(m.branch,20);if(m.co.vat)center('الرقم الضريبي '+m.co.vat,20);if(m.header)center(m.header,20);center('فاتورة ضريبية مبسطة',24,true);center('رقم الطلب '+m.no+' · '+prnDate(m.at),20)}
  rule();
  m.lines.forEach(l=>{row(l.qty+' × '+l.name,k?null:lineTotal(l).toFixed(2),k?30:22,k);if((l.addons||[]).length)wrap('  '+l.addons.map(a=>a.name).join('، '),k?24:18,12);if(l.note)wrap('  '+l.note,k?24:18,12)});
  rule();
  if(!k){row('الإجمالي شامل الضريبة',m.total.toFixed(2),24,true);row('ضريبة القيمة المضافة 15%',m.vat.toFixed(2),20);m.payments.forEach(p=>row(p.name,(+p.amount).toFixed(2),20));if(m.change)row('الباقي',m.change.toFixed(2),20);
    const qr=m.qr?await qrMatrix(m.qr).catch(()=>null):null;if(qr){const n=qr.length,s=Math.floor(240/n),x0=Math.floor((W-n*s)/2);y+=14;qr.forEach((r,yy)=>r.forEach((on,xx)=>{if(on)g.fillRect(x0+xx*s,y+yy*s,s,s)}));y+=n*s+6}
    center(m.footer,20)}
  y+=40;const out=document.createElement('canvas');out.width=W;out.height=y;out.getContext('2d').drawImage(c,0,0);return out}
/* canvas → ESC/POS raster (GS v 0), in bands, then feed and cut */
function escposRaster(canvas){const W=canvas.width,H=canvas.height,bw=Math.ceil(W/8),px=canvas.getContext('2d').getImageData(0,0,W,H).data,out=[0x1b,0x40];
  for(let y0=0;y0<H;y0+=255){const h=Math.min(255,H-y0);out.push(0x1d,0x76,0x30,0,bw&255,bw>>8,h&255,h>>8);
    for(let y=y0;y<y0+h;y++)for(let bx=0;bx<bw;bx++){let b=0;for(let bit=0;bit<8;bit++){const x=bx*8+bit;if(x<W){const i=(y*W+x)*4;if(px[i+3]>0&&(px[i]+px[i+1]+px[i+2])/3<128)b|=0x80>>bit}}out.push(b)}}
  out.push(0x1b,0x64,4,0x1d,0x56,0x42,0);return new Uint8Array(out)}

/* ---------- connections ---------- */
async function prnConnectBT(){const dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:PRN_BLE_SERVICES});
  const srv=await dev.gatt.connect();let ch=null;
  for(const s of await srv.getPrimaryServices()){for(const c of await s.getCharacteristics()){if(c.properties.write||c.properties.writeWithoutResponse){ch=c;break}}if(ch)break}
  if(!ch)throw new Error('nochar');PRN.dev=dev;PRN.ch=ch;dev.addEventListener('gattserverdisconnected',()=>{PRN.ch=null;render()});return dev.name||'Bluetooth'}
async function prnConnectSerial(){const port=await navigator.serial.requestPort();await port.open({baudRate:9600});PRN.port=port;PRN.writer=port.writable.getWriter();return'USB'}
async function prnSend(bytes){
  if(PRN.writer){await PRN.writer.write(bytes);return}
  if(PRN.ch){const n=PRN.ch.properties.writeWithoutResponse?180:100;for(let i=0;i<bytes.length;i+=n){const part=bytes.slice(i,i+n);
    if(PRN.ch.properties.writeWithoutResponse&&PRN.ch.writeValueWithoutResponse)await PRN.ch.writeValueWithoutResponse(part);else await PRN.ch.writeValue(part)}return}
  throw new Error('noprinter')}
/* print: direct when a printer is connected on this device, else the print window */
async function prnPrint(kind,o){const m=receiptModel(o,kind),cfg=prnCfg();
  try{if(cfg.mode!=='browser'&&prnConnected()){await prnSend(escposRaster(await receiptCanvas(m)));return}}catch(e){toast(t('prn_fail'))}
  const html=await receiptHTML(m),f=document.createElement('iframe');f.style.cssText='position:fixed;width:0;height:0;border:0;opacity:0';document.body.appendChild(f);
  f.contentDocument.open();f.contentDocument.write(html);f.contentDocument.close();setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){}setTimeout(()=>f.remove(),2000)},400)}
/* automatic printing after a sale (cashier) or on a new order (kitchen), once per order on this device */
function prnAuto(kind,o){const cfg=prnCfg(),key='mk.printed.'+kind,done=LS.get(key,[])||[];if(done.includes(o.id))return;
  const want=kind==='receipt'?cfg.autoReceipt:cfg.autoKitchen;if(!want)return;LS.set(key,[...done.slice(-200),o.id]);
  prnPrint(kind,o).then(()=>{if(kind==='receipt'&&cfg.kitchenCopy)prnPrint('kitchen',o)})}

function printerView(){const c=prnCfg(),con=prnConnected();
  return`<h2>${t('tab_printer')}</h2><p class="hint">${esc(t('prn_hint'))}</p>
  <div class="box"><b>${t('prn_mode')}</b><div class="kind" style="margin-top:8px">${[['browser','prn_browser'],['direct','prn_direct']].map(([k,l])=>`<button aria-pressed="${(c.mode==='browser'?'browser':'direct')===k}" data-act="prnMode" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
    ${c.mode!=='browser'?`<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">${prnCan.bt?`<button class="btn btn-navy rp-btn" data-act="prnBT">${t('prn_bt')}</button>`:''}${prnCan.serial?`<button class="btn btn-navy rp-btn" data-act="prnSerial">${t('prn_usb')}</button>`:''}
      <span class="pill ${con?'ms-done':'ms-open'}">${esc(con?t('prn_on',{n:S.prnName||''}):t('prn_off'))}</span></div>
      ${prnCan.bt||prnCan.serial?'':`<p class="hint" style="color:var(--late)">${esc(t('prn_noApi'))}</p>`}<p class="hint">${esc(t('prn_directHint'))}</p>`:''}</div>
  <div class="box"><b>${t('prn_paper')}</b><div class="kind" style="margin-top:8px">${[80,58].map(w=>`<button aria-pressed="${c.width===w}" data-act="prnWidth" data-k="${w}">${w} mm</button>`).join('')}</div></div>
  <div class="box">${[['autoReceipt','prn_autoReceipt'],['kitchenCopy','prn_kitchenCopy'],['autoKitchen','prn_autoKitchen']].map(([k,l])=>`<label class="row" style="gap:8px;margin:6px 0"><input type="checkbox" data-prn="${k}" ${c[k]?'checked':''} style="width:20px;height:20px"><span>${esc(t(l))}</span></label>`).join('')}</div>
  <button class="btn btn-sun" data-act="prnTest">${t('prn_test')}</button>`}
Object.assign(A,{
  prnMode(el){const c=prnCfg();c.mode=el.dataset.k==='browser'?'browser':'direct';prnSave(c)},
  prnWidth(el){const c=prnCfg();c.width=+el.dataset.k;prnSave(c)},
  async prnBT(){try{S.prnName=await prnConnectBT();toast(t('prn_connected'))}catch(e){if(!(e&&e.name==='NotFoundError'))toast(t('prn_connFail'))}render()},
  async prnSerial(){try{S.prnName=await prnConnectSerial();toast(t('prn_connected'))}catch(e){if(!(e&&e.name==='NotFoundError'))toast(t('prn_connFail'))}render()},
  prnTest(){prnPrint(S.role==='kitchen'?'kitchen':'receipt',{id:'test',branch:S.branch||'',no:0,at:nowIso(),type:'in',by:'',lines:[{name:t('prn_testItem'),qty:1,price:10,addons:[{name:'إضافة',price:0}]}],total:10,vat:vatOf(10),payments:[{name:'نقدي',kind:'cash',amount:10}],change:0})}
});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.prn){const c=prnCfg();c[el.dataset.prn]=el.checked;prnSave(c)}});
EXT.tabs.push({k:'printer',l:'tab_printer',roles:['cashier','kitchen'],view:printerView});
