/* Maskob — the products menu (قائمة المنتجات): operations adds products with name, category, price, photo and
   add-ons (each with its own price, 0 when left empty); branches see it as a menu and may only mark a product
   unavailable, with a reason, which operations sees (and the bell counts).
   products/{id}:   {name, cat, price, img, addons:[{name, price}], updatedAt}
   config/menuCats: {cats:[name]}
   menuOff/{branch}:{items:{productId:{reason, at, by}}} */
const menuCats=()=>((S.menuCats||{}).cats)||[];
const menuOffOf=b=>((S.menuOff||{})[b])||{};
const menuOffAll=()=>Object.keys(S.menuOff||{}).filter(b=>S.branches.includes(b)).flatMap(b=>Object.keys(menuOffOf(b)).filter(pid=>(S.products||[]).some(p=>p.id===pid)).map(pid=>Object.assign({branch:b,pid},menuOffOf(b)[pid])));
const menuPrice=n=>`${esc(sar2(+n||0))} ${esc(t('sar'))}`;
function menuSorted(){const cats=menuCats();
  return[...(S.products||[])].sort((a,c)=>{const ia=cats.indexOf(a.cat),ic=cats.indexOf(c.cat);return(ia<0?999:ia)-(ic<0?999:ic)||String(a.name).localeCompare(String(c.name),'ar')})}
/* products grouped by category, in the categories' order (no category last) */
function menuGroups(list){const cats=menuCats(),g={};list.forEach(p=>{const k=cats.includes(p.cat)?p.cat:'';(g[k]||(g[k]=[])).push(p)});
  return[...cats.filter(c=>g[c]),...(g['']?['']:[])].map(c=>[c,g[c]])}

/* data: demo / live (called from branch.js) */
function menuLoadDemo(){S.products=MEM('products');const c=MEM('menuCats');S.menuCats=c&&!Array.isArray(c)?c:{};
  const o=MEM('menuOff');S.menuOff=o&&!Array.isArray(o)?o:{};if(['branch','cashier','kitchen','display'].includes(S.role))S.menuOff={[S.branch]:S.menuOff[S.branch]||{}}}
function menuStart(u,onErr){if(!['branch','manager','cashier','kitchen','display'].includes(S.role))return;
  u.push(db.collection('products').onSnapshot(s=>{S.products=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  u.push(db.doc('config/menuCats').onSnapshot(s=>{S.menuCats=s.exists?s.data():{};render()},onErr));
  if(['branch','cashier','kitchen','display'].includes(S.role)){const b=S.branch;u.push(db.doc('menuOff/'+b).onSnapshot(s=>{S.menuOff={[b]:s.exists?(s.data().items||{}):{}};render()},onErr))}
  else u.push(db.collection('menuOff').onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data().items||{});S.menuOff=m;render()},onErr))}

/* ---------- a product card (menu look) ---------- */
function menuCard(p,o){o=o||{};const off=o.off;
  return`<div class="mn-card${off?' off':''}">${p.img?`<img class="mn-img" src="${esc(p.img)}" alt="">`:`<div class="mn-img mn-noimg" aria-hidden="true">${typeof ico==='function'?ico('coffee'):''}</div>`}
  <div class="mn-b"><div class="mn-top"><b class="mn-name">${esc(p.name)}</b><span class="mn-price num">${menuPrice(p.price)}</span></div>
  ${(p.addons||[]).length?`<div class="mn-add">${p.addons.map(a=>`<span class="mn-a">${esc(a.name)}${+a.price?` <span class="num">+${esc(sar2(a.price))}</span>`:''}</span>`).join('')}</div>`:''}
  ${off?`<div class="mn-off">${esc(t('mn_offTag'))}${off.reason?' · '+esc(off.reason):''}</div>`:''}
  ${o.foot||''}</div></div>`}

/* ---------- branch: the menu ---------- */
function menuBranchView(){
  const b=S.branch,offs=menuOffOf(b),L=menuSorted();
  const n=Object.keys(offs).filter(pid=>L.some(p=>p.id===pid)).length;
  if(!L.length)return`<h2>${t('tab_menu')}</h2><div class="empty">${esc(t('mn_noneBranch'))}</div>`;
  return`<h2>${t('tab_menu')}</h2><p class="hint">${esc(t('mn_branchHint'))}${n?' · '+esc(t('mn_offN',{n})):''}</p>
  ${menuGroups(L).map(([c,ps])=>`<div class="mn-sec"><h3>${esc(c||t('mn_noCat'))}</h3><div class="mn-grid">${ps.map(p=>{const off=offs[p.id];
    return menuCard(p,{off,foot:`<div class="mn-act">${off?`<span class="hint">${esc(when(off.at))}</span><button class="btn btn-navy rp-btn" data-act="mnOn" data-id="${esc(p.id)}">${t('mn_on')}</button>`
      :`<button class="btn btn-ghost rp-btn" data-act="mnOffOpen" data-id="${esc(p.id)}">${t('mn_off')}</button>`}</div>`})}).join('')}</div></div>`).join('')}`;
}
function menuOffSheet(){const p=(S.products||[]).find(x=>x.id===S.mnOff);if(!p)return'';
  const body=`<p class="hint">${esc(t('mn_offHint'))}</p><label><span class="hint">${t('mn_reason')}</span><textarea class="field" id="mnReason" data-in="mnReason" rows="3" dir="auto">${esc(S.mnReason||'')}</textarea></label>
  <div class="ml-to" style="margin-top:8px">${['mn_r1','mn_r2','mn_r3'].map(k=>`<button class="chip" data-act="mnReasonPick" data-k="${k}">${esc(t(k))}</button>`).join('')}</div>`;
  return hrSheetWrap(t('mn_offTitle',{x:p.name}),body,`<span class="spacer"></span><button class="btn btn-bad" data-act="mnOffSave" ${S.busy?'disabled':''}>${t('mn_off')}</button>`)}

/* ---------- operations: products ---------- */
function menuOpsView(){
  const cf=S.mnCat||'',all=menuSorted(),L=all.filter(p=>!cf||(cf==='-'?!menuCats().includes(p.cat):p.cat===cf)),offs=menuOffAll();
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_products')}</h2><div class="row" style="gap:8px;flex-wrap:wrap">${typeof menuFlavourOld==='function'&&menuFlavourOld().length?`<button class="btn btn-sun rp-btn" data-act="menuFixFlavours">${esc(t('mn_flavFix'))}</button>`:''}${typeof menuSeedMissing==='function'&&menuSeedMissing().length?`<button class="btn btn-navy rp-btn" data-act="menuSeed">${S.confirm==='menuSeed'?esc(t('mn_seedSure',{n:menuSeedMissing().length})):esc(t('mn_seed'))}</button>`:''}<button class="btn btn-ghost rp-btn" data-act="mnCatsOpen">${t('mn_cats')}</button><button class="btn btn-sun" data-act="pdNew">+ ${t('mn_new')}</button></div></div>
  <div class="filters"><button class="chip" aria-pressed="${!cf}" data-act="mnCat" data-k="">${t('f_all')} <span class="num">${all.length}</span></button>${menuCats().map(c=>`<button class="chip" aria-pressed="${cf===c}" data-act="mnCat" data-k="${esc(c)}">${esc(c)}</button>`).join('')}${all.some(p=>!menuCats().includes(p.cat))?`<button class="chip" aria-pressed="${cf==='-'}" data-act="mnCat" data-k="-">${t('mn_noCat')}</button>`:''}</div>
  ${L.length?`<div class="mn-grid">${L.map(p=>{const n=offs.filter(x=>x.pid===p.id).length;
    return`<button class="mn-btn" data-act="pdOpen" data-id="${esc(p.id)}">${menuCard(p,{foot:`<div class="mn-act"><span class="tag">${esc(p.cat||t('mn_noCat'))}</span>${n?`<span class="pill ms-progress">${esc(t('mn_offIn',{n}))}</span>`:''}</div>`})}</button>`}).join('')}</div>`
    :`<div class="empty">${esc(t('mn_none'))}</div>`}`;
}
function menuOffView(){const L=menuOffAll().sort((a,c)=>String(c.at).localeCompare(String(a.at)));
  const P=id=>(S.products||[]).find(x=>x.id===id)||{name:id};
  return`<h2>${t('tab_menuOff')}</h2><p class="hint">${esc(t('mn_offOpsHint'))}</p>
  ${L.length?`<div class="list">${L.map(x=>`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(P(x.pid).name)} <span class="tag">${esc(x.branch)}</span></span>
    <span class="s">${esc(x.reason||'')}${x.by?' · '+esc(x.by):''} · ${esc(when(x.at))}</span></span></div>`).join('')}</div>`:`<div class="empty">${esc(t('mn_allOn'))}</div>`}`;
}
function productSheet(){const d=S.pdDraft||{addons:[]},isNew=S.openPd==='new';
  const body=`<div class="mn-edit-img">${d.img?`<img src="${esc(d.img)}" alt="">`:`<div class="mn-noimg" aria-hidden="true">${typeof ico==='function'?ico('coffee'):''}</div>`}
    <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn btn-ghost rp-btn" style="cursor:pointer">${typeof ico==='function'?ico('camera','b-ic'):''}${t(d.img?'mn_imgChange':'mn_imgAdd')}<input type="file" id="pdImg" accept="image/*" hidden></label>${d.img?`<button class="btn btn-ghost rp-btn" data-act="pdImgDel">${t('del')}</button>`:''}</div></div>
  <div class="sl-grid hr-grid"><label><span class="hint">${t('mn_name')}</span><input class="field" id="pd-name" data-in="pdF" data-f="name" dir="auto" value="${esc(d.name||'')}"></label>
    <label><span class="hint">${t('mn_cat')}</span><select class="field" id="pd-cat" data-in="pdF" data-f="cat"><option value="">${esc(t('mn_noCat'))}</option>${menuCats().map(c=>`<option ${d.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
    <label><span class="hint">${t('mn_price')} (${t('sar')})</span><input class="field num" id="pd-price" data-in="pdF" data-f="price" inputmode="decimal" dir="ltr" value="${esc(d.price??'')}"></label></div>
  ${menuCats().length?'':`<p class="hint">${esc(t('mn_catHint'))}</p>`}
  ${!isNew&&typeof prodCost==='function'?`<div class="box" style="margin-top:10px"><b>${t('tab_pcost')}</b><div class="hint">${esc(t('me_costLine',{c:sar2(prodCost(d)),m:sar2(prodMargin(d)),p:prodNet(d)?sar2(prodCost(d)/prodNet(d)*100):'—'}))}</div><button class="btn btn-navy rp-btn" data-act="pcOpen" data-id="${esc(S.openPd)}" style="margin-top:6px">${t('pc_edit')}</button></div>`:''}
  <h4 class="hr-sub">${t('mn_addons')}</h4><p class="hint">${esc(t('mn_addonsHint'))}</p>
  ${(d.addons||[]).map((a,i)=>`<div class="row" style="gap:8px;margin-top:6px"><input class="field" data-in="pdA" data-i="${i}" data-f="name" dir="auto" placeholder="${esc(t('mn_addonName'))}" value="${esc(a.name||'')}" style="flex:2">
    <input class="field num" data-in="pdA" data-i="${i}" data-f="price" inputmode="decimal" dir="ltr" placeholder="0" value="${esc(a.price??'')}" style="flex:1;min-width:80px"><span class="hint">${t('sar')}</span>
    <button class="btn btn-ghost rp-btn" data-act="pdADel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></div>`).join('')}
  <button class="btn btn-ghost rp-btn" data-act="pdAAdd" style="margin-top:8px">+ ${t('mn_addon')}</button>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="pdDel">${S.confirm==='pdDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="pdSave" ${S.busy||S.pdImgBusy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('mn_new'):(d.name||''),body,foot)}
function menuCatsSheet(){const cats=menuCats();
  const body=`<div class="list">${cats.map((c,i)=>`<div class="oc" style="cursor:default"><span class="t" style="flex:1">${esc(c)}</span><span class="side">
    <button class="btn btn-ghost rp-btn" data-act="mnCatMove" data-i="${i}" data-d="-1" ${i?'':'disabled'} aria-label="${esc(t('mn_up'))}">↑</button>
    <button class="btn btn-ghost rp-btn" data-act="mnCatMove" data-i="${i}" data-d="1" ${i<cats.length-1?'':'disabled'} aria-label="${esc(t('mn_down'))}">↓</button>
    <button class="btn btn-ghost rp-btn" data-act="mnCatDel" data-i="${i}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></span></div>`).join('')||`<div class="empty">${esc(t('mn_noCats'))}</div>`}</div>
  <div class="row" style="gap:8px;margin-top:10px"><input class="field" id="mnCatNew" dir="auto" placeholder="${esc(t('mn_catNew'))}" style="flex:1"><button class="btn btn-navy" data-act="mnCatAdd">+ ${t('inv_addUnit')}</button></div>`;
  return hrSheetWrap(t('mn_cats'),body,'')}

/* a product photo, small enough to sit in the product itself */
function menuShrink(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{try{const max=520,sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);let q=0.8,d=c.toDataURL('image/jpeg',q);
    while(d.length>160000&&q>0.4){q-=0.1;d=c.toDataURL('image/jpeg',q)}URL.revokeObjectURL(url);res(d)}catch(e){URL.revokeObjectURL(url);rej(e)}};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('image'))};img.src=url})}
function menuSaveCats(cats){const cfg={cats};guard(async()=>{if(S.fb)await db.doc('config/menuCats').set(cfg);else{MEMSET('menuCats',cfg);xLoadDemo()}S.menuCats=cfg},()=>t('st_saved'))}
async function menuSetOff(b,pid,val){
  if(S.fb){if(val)await db.doc('menuOff/'+b).set({items:{[pid]:val}},{merge:true});
    else await db.doc('menuOff/'+b).update({['items.'+pid]:firebase.firestore.FieldValue.delete()}).catch(()=>{});return}
  const all=Object.assign({},(()=>{const o=MEM('menuOff');return o&&!Array.isArray(o)?o:{}})()),cur=Object.assign({},all[b]||{});
  if(val)cur[pid]=val;else delete cur[pid];all[b]=cur;MEMSET('menuOff',all);xLoadDemo();render()}

Object.assign(A,{
  mnCat(el){S.mnCat=el.dataset.k;render()},
  mnCatsOpen(){S.openMnCats=true;render()},
  mnCatAdd(){const el=document.getElementById('mnCatNew'),c=String(el&&el.value||'').trim();if(!c||menuCats().includes(c))return;menuSaveCats([...menuCats(),c])},
  mnCatDel(el){const cats=menuCats(),c=cats[+el.dataset.i];if((S.products||[]).some(p=>p.cat===c)){toast(t('mn_catUsed'));return}menuSaveCats(cats.filter((_,i)=>i!==+el.dataset.i))},
  mnCatMove(el){const cats=[...menuCats()],i=+el.dataset.i,j=i+(+el.dataset.d);if(j<0||j>=cats.length)return;[cats[i],cats[j]]=[cats[j],cats[i]];menuSaveCats(cats)},
  pdNew(){S.openPd='new';S.confirm=null;S.pdDraft={name:'',cat:S.mnCat&&S.mnCat!=='-'?S.mnCat:'',price:'',img:'',addons:[]};render()},
  pdOpen(el){const p=(S.products||[]).find(x=>x.id===el.dataset.id);if(!p)return;S.openPd=p.id;S.confirm=null;S.pdDraft=JSON.parse(JSON.stringify(p));render()},
  pdAAdd(){(S.pdDraft.addons||(S.pdDraft.addons=[])).push({name:'',price:''});render()},
  pdADel(el){S.pdDraft.addons.splice(+el.dataset.i,1);render()},
  pdLAdd(){(S.pdDraft.lines||(S.pdDraft.lines=[])).push({item:'',qty:''});render()},
  pdLDel(el){S.pdDraft.lines.splice(+el.dataset.i,1);render()},
  pdImgDel(){S.pdDraft.img='';render()},
  pdSave(){const d=S.pdDraft||{},name=String(d.name||'').trim(),price=num(d.price);
    if(!name){toast(t('mn_needName'));return}if(!(price>0)){toast(t('mn_needPrice'));return}
    const addons=(d.addons||[]).filter(a=>String(a.name||'').trim()).map(a=>({name:String(a.name).trim(),price:num(a.price)}));
    const lines=(d.lines||[]).filter(l=>l.item&&num(l.qty)>0).map(l=>({item:l.item,qty:num(l.qty)}));
    const id=S.openPd==='new'?'pd-'+Date.now().toString(36):S.openPd,data={name,cat:d.cat||'',price,img:d.img||'',addons,lines:(((S.products||[]).find(x=>x.id===S.openPd)||{}).lines)||[],updatedAt:nowIso()};
    guard(async()=>{await X.put('products',id,data);S.openPd=null;S.pdDraft=null},()=>t('st_saved'))},
  pdDel(){const id=S.openPd;if(!id||id==='new')return;if(S.confirm!=='pdDel'){S.confirm='pdDel';render();return}
    guard(async()=>{await X.del('products',id);S.openPd=null;S.confirm=null},()=>t('li_deleted'))},
  mnOffOpen(el){S.mnOff=el.dataset.id;S.mnReason='';render()},
  mnReasonPick(el){S.mnReason=t(el.dataset.k);render()},
  mnOffSave(){const reason=String(S.mnReason||'').trim();if(!reason){toast(t('mn_needReason'));return}
    const pid=S.mnOff,val={reason,at:nowIso(),by:S.userName||roleL(S.realRole||S.role)};
    guard(async()=>{await menuSetOff(S.branch,pid,val);S.mnOff=null;S.mnReason=''},()=>t('mn_offDone'))},
  mnOn(el){const pid=el.dataset.id;guard(async()=>{await menuSetOff(S.branch,pid,null)},()=>t('mn_onDone'))}
});
document.addEventListener('input',ev=>{const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='pdF')S.pdDraft[el.dataset.f]=el.value;
  else if(k==='pdA')S.pdDraft.addons[+el.dataset.i][el.dataset.f]=el.value;
  else if(k==='pdL'){S.pdDraft.lines[+el.dataset.i][el.dataset.f]=el.value;if(el.dataset.f==='qty'){clearTimeout(S._pdT);S._pdT=setTimeout(render,500)}}
  else if(k==='mnReason')S.mnReason=el.value});
document.addEventListener('change',async ev=>{const el=ev.target;if(el.id!=='pdImg'||!el.files||!el.files[0]||!S.pdDraft)return;
  S.pdImgBusy=true;render();try{S.pdDraft.img=await menuShrink(el.files[0])}catch(e){toast(t('mn_imgFail'))}S.pdImgBusy=false;render()});

document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='pdL'&&el.dataset.f==='item')render()});
