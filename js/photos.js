/* Maskob — photos attached to a record (up to 10): receipts, invoices, vouchers, forms, leaves, the daily
   sales closing report and the daily checklist.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   Stored beside the record: {collection}/{id}/photos/{pid} {data (JPEG data URL), branch, at}; the record
   keeps the count in `photos`. Each form on screen has its own set (S.phs[key], key = collection/id or
   collection/new) holding new and removed photos until the record is saved (phCommit); the checklist
   saves each photo at once (instant). Photos are made smaller before they are stored. */
const PH_MAX=10;
const PH_SHEETS=['expenses','supInvoices','vouchers','forms','leaves','visits','pm'];   // forms in a pop-up window: their sets go when it closes
const PH_STORE={
  async list(col,id){
    if(S.fb){const q=await db.collection(col+'/'+id+'/photos').get();return q.docs.map(d=>({pid:d.id,data:d.data().data})).sort((a,b)=>a.pid.localeCompare(b.pid))}
    return((S._demoPh||{})[col+'/'+id]||[]).slice()},
  async put(col,id,pid,data,branch){
    if(S.fb)return db.doc(col+'/'+id+'/photos/'+pid).set({data,branch:branch||'',at:nowIso()});
    const m=S._demoPh||(S._demoPh={}),k=col+'/'+id;m[k]=(m[k]||[]).filter(x=>x.pid!==pid).concat([{pid,data}])},
  async del(col,id,pid){
    if(S.fb)return db.doc(col+'/'+id+'/photos/'+pid).delete().catch(()=>{});
    const m=S._demoPh||{},k=col+'/'+id;if(m[k])m[k]=m[k].filter(x=>x.pid!==pid)}
};
/* a photo made smaller: at most 1600 px and about 700 KB (a stored record holds up to 1 MB) */
function phShrink(file){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{try{let max=1600,q=0.78,d;
      for(let i=0;i<6;i++){const sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
        const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);d=c.toDataURL('image/jpeg',q);
        if(d.length<=700000)break;q=Math.max(0.5,q-0.1);if(q===0.5)max=Math.round(max*0.8)}
      URL.revokeObjectURL(url);res(d)}catch(e){URL.revokeObjectURL(url);rej(e)}};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('image'))};img.src=url})}
const phNewId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const phKey=(col,id)=>col+'/'+(id||'new');
/* the set of one record: {key, col, id, branch, instant, list:[{pid,data,saved}], removed:[pid], loading} */
function phEnsure(col,id,o){
  const key=phKey(col,id),m=S.phs||(S.phs={});if(m[key])return m[key];
  const p=m[key]={key,col,id:id||null,branch:(o&&o.branch)||'',instant:!!(o&&o.instant),list:[],removed:[],loading:!!id};
  if(id)PH_STORE.list(col,id).then(L=>{if((S.phs||{})[key]!==p)return;p.list=L.map(x=>Object.assign(x,{saved:true})).concat(p.list.filter(x=>!x.saved));p.loading=false;render()})
    .catch(()=>{if((S.phs||{})[key]===p){p.loading=false;render()}});
  return p;
}
const phGet=(col,id)=>(S.phs||{})[phKey(col,id)]||null;
/* how many photos the record will have (null when its form never showed the photo strip) */
const phCount=(col,id)=>{const p=phGet(col,id);return p?p.list.length:null};
/* the photo strip: thumbnails (tap to see large), a remove cross, and an add button for camera or gallery */
function phBlock(col,id,o){
  o=o||{};const p=phEnsure(col,id,o),ro=!!o.readOnly,k=esc(p.key);
  if(ro&&!p.loading&&!p.list.length)return'';
  const ic=n=>typeof ico==='function'?ico(n):'',busy=S.phBusy===p.key;
  return`<div class="ph-block${o.required&&!p.loading&&!p.list.length?' need':''}"><div class="ph-h"><b>${ic('camera')} ${esc(t(o.title||'ph_title'))}</b><span class="hint num" ${p.loading?'':'dir="ltr"'}>${p.loading?esc(t('ef_loading')):p.list.length+' / '+PH_MAX}</span></div>
    ${o.required&&!ro?`<p class="hint">${esc(t(o.required))}</p>`:''}
    <div class="ph-grid">${p.list.map((x,i)=>`<div class="ph-th"><button class="ph-img" data-act="phView" data-k="${k}" data-i="${i}" aria-label="${esc(t('ph_view'))}"><img src="${x.data}" alt=""></button>${ro?'':`<button class="ph-x" data-act="phDel" data-k="${k}" data-i="${i}" aria-label="${esc(t('del'))}">${ic('x')}</button>`}</div>`).join('')}
    ${!ro&&p.list.length<PH_MAX?`<label class="ph-add${busy?' busy':''}">${busy?`<span>${esc(t('checking'))}</span>`:`${ic('plus')}<span>${esc(t('ph_add'))}</span>`}<input type="file" class="ph-in" data-k="${k}" accept="image/*" multiple ${busy?'disabled':''} aria-label="${esc(t('ph_add'))}"></label>`:''}</div></div>`;
}
/* after the record is saved (realId: its id, when it was new): store the new photos, remove the deleted ones */
async function phCommit(col,id,realId,branch){
  const p=phGet(col,id);if(!p)return null;const rid=realId||id;
  for(const pid of p.removed)await PH_STORE.del(col,rid,pid);
  for(const x of p.list)if(!x.saved){await PH_STORE.put(col,rid,x.pid,x.data,branch||p.branch);x.saved=true}
  delete S.phs[p.key];return p.list.length;
}
/* closing a pop-up form drops its unsaved photos; changing page drops all */
const phDropSheets=()=>{const m=S.phs||{};for(const k in m)if(PH_SHEETS.includes(m[k].col))delete m[k]};
const phDropAll=()=>{S.phs={}};
Object.assign(A,{
  phDel(el){const p=(S.phs||{})[el.dataset.k];if(!p)return;const i=+el.dataset.i,x=p.list[i];if(!x)return;p.list.splice(i,1);
    if(x.saved){if(p.instant&&p.id)PH_STORE.del(p.col,p.id,x.pid).catch(()=>toast(t('saveFail')));else p.removed.push(x.pid)}
    render()},
  phView(el){S.phOpen={k:el.dataset.k,i:+el.dataset.i};phShow()},
  phStep(el){const o=S.phOpen,p=o&&(S.phs||{})[o.k];if(!p||!p.list.length)return;o.i=(o.i+(+el.dataset.k)+p.list.length)%p.list.length;phShow()},
  phClose(){S.phOpen=null;const o=document.getElementById('phBox');if(o)o.remove()}
});
/* the large view sits above everything and is not part of the screen render */
function phShow(){
  const o0=S.phOpen,p=o0&&(S.phs||{})[o0.k],x=p&&p.list[o0.i];let o=document.getElementById('phBox');if(!x){if(o)o.remove();return}
  if(!o){o=document.createElement('div');o.id='phBox';o.className='ph-box';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');document.getElementById('app').appendChild(o)}
  const ic=n=>typeof ico==='function'?ico(n):'';
  o.innerHTML=`<button class="ph-bg" data-act="phClose" aria-label="${esc(t('ph_close'))}"></button><img src="${x.data}" alt="">
    <div class="ph-bar">${p.list.length>1?`<button class="btn btn-ghost" data-act="phStep" data-k="-1" aria-label="‹">‹</button>`:''}<span class="num" dir="ltr">${o0.i+1} / ${p.list.length}</span>${p.list.length>1?`<button class="btn btn-ghost" data-act="phStep" data-k="1" aria-label="›">›</button>`:''}
    <a class="btn btn-ghost" href="${x.data}" download="maskob-photo-${o0.i+1}.jpg" aria-label="${esc(t('ph_save'))}">${ic('download')}</a><button class="btn btn-sun" data-act="phClose" aria-label="${esc(t('ph_close'))}">${ic('x')}</button></div>`;
}
document.addEventListener('change',async ev=>{const el=ev.target;if(!el.classList||!el.classList.contains('ph-in'))return;
  const p=(S.phs||{})[el.dataset.k];if(!p)return;const all=[...(el.files||[])],files=all.slice(0,PH_MAX-p.list.length);el.value='';if(!files.length)return;
  if(all.length>files.length)toast(t('ph_max',{n:PH_MAX}));
  S.phBusy=p.key;render();
  try{for(const f of files){const data=await phShrink(f),x={pid:phNewId(),data,saved:false};
      if(p.instant&&p.id){await PH_STORE.put(p.col,p.id,x.pid,data,p.branch);x.saved=true}
      p.list.push(x)}}
  catch(e){toast(t('ph_fail'))}
  S.phBusy=null;render()});
document.addEventListener('keydown',ev=>{if(S.phOpen&&ev.key==='Escape')A.phClose()});
