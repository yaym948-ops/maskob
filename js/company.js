/* Maskob — Company details and letterhead.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Company details: letterhead for contracts, settlements and other printed documents ================= */
const CO_FIELDS=[['nameAr','co_nameAr'],['nameEn','co_nameEn','ltr'],['cr','ct_cr','ltr'],['vat','co_vat','ltr'],['addrAr','co_addrAr'],['addrEn','co_addrEn','ltr'],
  ['phone','co_phone','ltr'],['email','co_email','ltr'],['web','co_web','ltr'],['rep','co_rep'],['repTitle','co_repTitle']];
const DEFAULT_LOGO=()=>{let l='https://fllow-maskob.web.app/maskob-wordmark.png';try{if(/^https?:$/.test(location.protocol))l=new URL('maskob-wordmark.png',location.href).href}catch(e){}return l};
/* one shape for every document; older contract details saved by HR (config/hr) fill any gaps */
function coInfo(){
  const o=S.hrCfg||{},c=S.company||{};
  return{name:c.nameAr||o.name||'مسكوب',nameEn:c.nameEn||'',cr:c.cr||o.cr||'',vat:c.vat||'',addr:c.addrAr||o.addr||'',addrEn:c.addrEn||'',
    phone:c.phone||'',email:c.email||'',web:c.web||'',rep:c.rep||o.rep||'',repTitle:c.repTitle||'',logo:S.coLogo||DEFAULT_LOGO()};
}
const LH_CSS=`.lh{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0758A7;padding-bottom:10px;margin-bottom:6px}
.lh-co{flex:1;min-width:0;line-height:1.5}.lh-co b{display:block;font-size:15px;color:#0758A7;font-weight:800}
.lh-co .en{display:block;direction:ltr;text-align:right;font-size:12px;color:#33445c;font-weight:700}
.lh-co small{display:block;font-size:10.5px;color:#4a5b73}
.lh img{max-height:54px;max-width:160px;object-fit:contain}
.lh-doc{flex:1;text-align:left}.lh-doc h1{font-size:21px;margin:0;color:#0758A7;font-weight:800;line-height:1.3}.lh-doc h1 small{display:block;font-size:12.5px;color:#4a5b73;font-weight:500}
.lh-doc .meta{font-size:11px;color:#4a5b73;direction:ltr}
.lf{margin-top:18px;border-top:1px solid #dfe6ef;padding-top:6px;font-size:10px;color:#6b7a90;text-align:center;line-height:1.6}`;
function letterhead(co,ar,en,meta){
  const h=esc;
  const ids=[co.cr?'س.ت / C.R.: '+h(co.cr):'',co.vat?'الرقم الضريبي / VAT: '+h(co.vat):''].filter(Boolean).join(' &nbsp;·&nbsp; ');
  return`<style>${LH_CSS}</style><div class="lh"><div class="lh-co"><b>${h(co.name)}</b>${co.nameEn?`<span class="en">${h(co.nameEn)}</span>`:''}${ids?`<small>${ids}</small>`:''}</div>
  <img src="${h(co.logo)}" alt=""><div class="lh-doc">${ar?`<h1>${h(ar)}<small>${h(en||'')}</small></h1>`:''}${meta?`<div class="meta">${meta}</div>`:''}</div></div>`;
}
function letterfoot(co){
  const h=esc;
  const a=[co.addr,co.addrEn].filter(Boolean).map(h).join(' — '),c=[co.phone,co.email,co.web].filter(Boolean).map(h).join(' &nbsp;·&nbsp; ');
  return`<div class="lf">${a?a+'<br>':''}${c||h(co.name)}</div>`;
}
/* admin settings section */
function companyView(){
  const d=S.coSet||(S.coSet=Object.assign({},S.company||{}));
  const logo=d._logo!==undefined?d._logo:S.coLogo;
  const co=Object.assign(coInfo(),{name:d.nameAr||'مسكوب',nameEn:d.nameEn||'',cr:d.cr||'',vat:d.vat||'',logo:logo||DEFAULT_LOGO()});
  const prev=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body{margin:10px 14px;font-family:"IBM Plex Sans Arabic",Arial,sans-serif;color:#13233a}</style></head><body>${letterhead(co,'عقد عمل','Employment Contract',dayKey(Date.now()).split('-').reverse().join('/'))}${letterfoot(Object.assign({},co,{addr:d.addrAr||'',addrEn:d.addrEn||'',phone:d.phone||'',email:d.email||'',web:d.web||''}))}</body></html>`;
  return`<h2 style="margin-top:28px">${t('co_title')}</h2><p class="hint">${esc(t('co_hint'))}</p>
  <div class="codes"><div class="code" style="display:block">
    <div class="sl-grid hr-grid">${CO_FIELDS.map(([f,l,dir])=>`<label><span class="hint">${esc(t(l))}</span><input class="field" id="co-${f}" data-in="coSet" data-f="${f}" value="${esc(d[f]||'')}" ${dir?'dir="ltr"':'dir="auto"'} ${f==='email'?'type="email"':''}></label>`).join('')}</div>
    <div class="row co-logo" style="margin-top:12px"><span class="hint">${t('co_logo')}</span><img src="${esc(logo||DEFAULT_LOGO())}" alt="">
      <label class="btn btn-ghost rp-btn io-imp">${esc(t('co_logoAdd'))}<input type="file" id="coLogoFile" accept="image/*"></label>
      ${logo?`<button class="btn btn-ghost rp-btn" data-act="coLogoDel">${t('co_logoDel')}</button>`:`<span class="hint">${esc(t('co_logoDefault'))}</span>`}</div>
    <div class="hint" style="margin-top:12px">${t('co_preview')}</div>
    <iframe class="co-prev" title="${esc(t('co_preview'))}" srcdoc="${esc(prev)}"></iframe>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-navy" data-act="coSave" ${S.busy?'disabled':''}>${t('waSave')}</button></div>
  </div></div>`;
}
/* shrink a logo: max 500px, PNG keeps transparency; fall back to JPEG on white if large */
async function compressLogo(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const sc=Math.min(1,500/Math.max(img.width,img.height));const w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc));
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0,w,h);
    let d=c.toDataURL('image/png');
    if(d.length>350000){g.globalCompositeOperation='destination-over';g.fillStyle='#fff';g.fillRect(0,0,w,h);d=c.toDataURL('image/jpeg',0.85)}
    return d;
  }finally{URL.revokeObjectURL(url)}
}
Object.assign(A,{
  coSave(){
    const d=S.coSet||{};const data={};CO_FIELDS.forEach(([f])=>data[f]=String(d[f]||'').trim());data.at=nowIso();
    const logoChanged=d._logo!==undefined;
    guard(async()=>{await X.company(data);if(logoChanged)await X.companyLogo(d._logo||null);S.coSet=null},()=>t('co_saved'));
  },
  coLogoDel(){S.coSet=S.coSet||{};S.coSet._logo=null;render()}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='coSet'){S.coSet=S.coSet||{};S.coSet[el.dataset.f]=el.value;
  clearTimeout(S._coT);S._coT=setTimeout(()=>{const f=document.querySelector('.co-prev');if(f){const keep=document.activeElement&&document.activeElement.id;render();const k=keep&&document.getElementById(keep);if(k)k.focus()}},600)}});
document.addEventListener('change',async ev=>{
  const el=ev.target;if(el.id!=='coLogoFile'||!el.files||!el.files[0])return;
  try{const d=await compressLogo(el.files[0]);S.coSet=S.coSet||{};S.coSet._logo=d;render()}catch(e){toast(t('m_photoFail'))}
});

