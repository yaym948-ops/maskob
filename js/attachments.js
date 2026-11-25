/* Maskob — Employee attachments (iqama, passport, signed contract, health card, certificates).
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   Stored in Firestore (Firebase Storage needs the paid plan):
     employees/{emp}/files/{fid}            {kind, name, type, size, parts, at}
     employees/{emp}/files/{fid}/parts/p0…  {data}   — the file as text, split into pieces under the 1 MB document limit
   HR only (see firestore.rules). */
const EF_KINDS=['iqama','passport','contract','health','cert','other'];
const EF_MAX=4*1024*1024;            // 4 MB per file
const EF_PART=700000;                // characters per stored piece

/* turn a picked file into a data URL: photos are shrunk (still readable), PDFs kept as they are */
async function efRead(file){
  if(file.type==='application/pdf')return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const sc=Math.min(1,2000/Math.max(img.width,img.height));const w=Math.round(img.width*sc),h=Math.round(img.height*sc);
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);
    let q=0.85,d=c.toDataURL('image/jpeg',q);while(d.length>1500000&&q>0.4){q-=0.1;d=c.toDataURL('image/jpeg',q)}
    return d;
  }finally{URL.revokeObjectURL(url)}
}
const efSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';

/* storage: Firestore when live, memory in demo mode */
const EF={
  async list(emp){
    if(S.fb){const q=await db.collection('employees/'+emp+'/files').get();return q.docs.map(d=>Object.assign({},d.data(),{id:d.id}))}
    return((S._demoEF||{})[emp]||[]).map(x=>Object.assign({},x.meta));
  },
  async add(emp,meta,data){
    const fid='F-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const parts=[];for(let i=0;i<data.length;i+=EF_PART)parts.push(data.slice(i,i+EF_PART));
    const m=Object.assign({},meta,{parts:parts.length,at:nowIso()});
    if(S.fb){for(let i=0;i<parts.length;i++)await db.doc('employees/'+emp+'/files/'+fid+'/parts/p'+i).set({data:parts[i]});
      await db.doc('employees/'+emp+'/files/'+fid).set(m);return fid}
    const all=S._demoEF||(S._demoEF={});(all[emp]||(all[emp]=[])).push({meta:Object.assign({id:fid},m),data});return fid;
  },
  async get(emp,f){
    if(S.fb){let s='';for(let i=0;i<(f.parts||1);i++){const d=await db.doc('employees/'+emp+'/files/'+f.id+'/parts/p'+i).get();s+=d.exists?d.data().data:''}return s}
    const x=((S._demoEF||{})[emp]||[]).find(v=>v.meta.id===f.id);return x?x.data:'';
  },
  async del(emp,f){
    if(S.fb){for(let i=0;i<(f.parts||1);i++)await db.doc('employees/'+emp+'/files/'+f.id+'/parts/p'+i).delete().catch(()=>{});
      return db.doc('employees/'+emp+'/files/'+f.id).delete()}
    const all=S._demoEF||{};all[emp]=(all[emp]||[]).filter(v=>v.meta.id!==f.id);
  },
  async delAll(emp){for(const f of await EF.list(emp))await EF.del(emp,f)}
};
function efLoad(emp){
  S.efFiles=S.efFiles||{};S.efFiles[emp]=S.efFiles[emp]||null;render();
  EF.list(emp).then(l=>{S.efFiles[emp]=l.sort((a,b)=>String(b.at).localeCompare(String(a.at)));render()}).catch(()=>{S.efFiles[emp]=[];render()});
}
/* the section inside the employee file */
function empFilesSection(emp){
  const list=S.efFiles&&S.efFiles[emp];
  return`<h4 class="hr-sub">${t('ef_title')}${list&&list.length?` <span class="hint num">(${list.length})</span>`:''}</h4>
  <div class="ef-list">${list==null?`<div class="hint">${t('ef_loading')}</div>`:list.length?list.map(f=>`<div class="ef-row">
    <span class="ef-ico" aria-hidden="true">${f.type==='application/pdf'?'PDF':'🖼'}</span>
    <span class="ef-main"><b>${esc(t('ek_'+(f.kind||'other')))}</b><span class="hint">${esc(f.name||'')} · ${esc(efSize(f.size||0))} · ${esc(when(f.at))}</span></span>
    <button class="btn btn-ghost rp-btn" data-act="efView" data-id="${esc(f.id)}">${t('ef_view')}</button>
    <button class="btn btn-ghost rp-btn ef-del" data-act="efDel" data-id="${esc(f.id)}">${S.confirm==='efDel:'+f.id?t('li_delConfirm'):t('del')}</button></div>`).join(''):`<div class="hint">${t('ef_none')}</div>`}</div>
  <div class="row ef-add"><select class="field" id="efKind" style="width:auto">${EF_KINDS.map(k=>`<option value="${k}" ${(S.efKind||'iqama')===k?'selected':''}>${esc(t('ek_'+k))}</option>`).join('')}</select>
    <label class="btn btn-ghost rp-btn io-imp">${S.efBusy?esc(t('ef_loading')):'📎 '+esc(t('ef_add'))}<input type="file" id="efFile" accept="image/*,application/pdf" ${S.efBusy?'disabled':''}></label></div>
  <p class="hint">${esc(t('ef_hint'))}</p>`;
}
Object.assign(A,{
  async efView(el){
    const emp=S.openEmp,f=(S.efFiles&&S.efFiles[emp]||[]).find(x=>x.id===el.dataset.id);if(!f)return;
    const win=window.open('','_blank');          // open now, while the tap still counts
    try{
      const data=await EF.get(emp,f);const b64=data.slice(data.indexOf(',')+1);const bin=atob(b64);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([u8],{type:f.type||'application/octet-stream'}));
      if(win&&!win.closed)win.location.href=url;else{const a=document.createElement('a');a.href=url;a.download=f.name||'file';document.body.appendChild(a);a.click();a.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){if(win)win.close();toast(t('saveFail'))}
  },
  efDel(el){
    const emp=S.openEmp,f=(S.efFiles&&S.efFiles[emp]||[]).find(x=>x.id===el.dataset.id);if(!f)return;
    if(S.confirm!=='efDel:'+f.id){S.confirm='efDel:'+f.id;render();return}
    guard(async()=>{await EF.del(emp,f);S.confirm=null;efLoad(emp)},()=>t('ef_deleted'));
  }
});
document.addEventListener('change',async ev=>{
  const el=ev.target;
  if(el.id==='efKind'){S.efKind=el.value;return}
  if(el.id!=='efFile'||!el.files||!el.files[0])return;
  const file=el.files[0],emp=S.openEmp;el.value='';
  if(!emp||emp==='new')return;
  if(!(file.type==='application/pdf'||/^image\//.test(file.type))){toast(t('ef_badType'));return}
  if(file.size>EF_MAX){toast(t('ef_tooBig'));return}
  S.efBusy=true;render();
  try{const data=await efRead(file);
    await EF.add(emp,{kind:EF_KINDS.includes(S.efKind)?S.efKind:'iqama',name:file.name,type:file.type==='application/pdf'?'application/pdf':'image/jpeg',size:Math.round(data.length*0.75)},data);
    toast(t('ef_saved'));efLoad(emp)}
  catch(e){toast(t('saveFail'))}
  S.efBusy=false;render();
});
