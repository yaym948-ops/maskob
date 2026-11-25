/* Maskob — Item catalog editor.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Item catalog: editable by the system admin, stored in config/catalog ================= */
/* The built-in list (from the original Excel file) is used until the admin saves a catalog.
   Items are never deleted, only switched off, so old orders keep their names. */
const BUILTIN_ITEMS=ITEMS.map(x=>{const o=Object.assign({},x);return o});
const catList=()=>(Array.isArray(S.catalog)&&S.catalog.length?S.catalog:BUILTIN_ITEMS);
function applyCatalog(){
  const src=catList();
  ITEMS.length=0;for(const k in ITEM)delete ITEM[k];for(const k in ITEM_POS)delete ITEM_POS[k];
  CATS.forEach(c=>c.list=[]);
  src.forEach(x=>{const it=Object.assign({},x);if(!CAT[it.cat])it.cat='other';it.bn=it.bn||it.en||it.ar;it.ur=it.ur||it.ar;it.en=it.en||it.ar;
    ITEM[it.id]=it;if(!it.off){ITEMS.push(it);CAT[it.cat].list.push(it)}});
  ITEMS.forEach((it,i)=>ITEM_POS[it.id]=i);
  S._catV=(S._catV||0)+1;
}
const cleanItem=x=>{const o={id:x.id,cat:CAT[x.cat]?x.cat:'other',ar:String(x.ar||'').trim(),en:String(x.en||'').trim(),bn:String(x.bn||'').trim(),ur:String(x.ur||'').trim(),
  uk:String(x.uk||'PC').trim()||'PC',par:x.par===''||x.par==null||isNaN(+x.par)?null:+x.par,sku:String(x.sku||'').trim()};if(x.off)o.off=true;return o};
function catalogView(){
  const q=String(S.catQ||'').trim().toLowerCase(),cf=S.catCat||'';
  const all=catList();
  const list=all.filter(it=>(!cf||it.cat===cf)&&(!q||[it.ar,it.en,it.bn,it.ur,it.sku].some(v=>String(v||'').toLowerCase().includes(q))));
  const groups=CATS.map(c=>({c,items:list.filter(it=>(CAT[it.cat]?it.cat:'other')===c.k)})).filter(g=>g.items.length);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_catalog')}</h2><div class="row">${ioBtns('catalog')}<button class="btn btn-sun" data-act="catNew">+ ${t('cat_add')}</button></div></div>
  <div class="stats">${kpi(t('cat_active'),sar(all.filter(x=>!x.off).length))}${kpi(t('cat_offN'),sar(all.filter(x=>x.off).length))}${kpi(t('cat_cats'),sar(CATS.length))}</div>
  ${Array.isArray(S.catalog)&&S.catalog.length?'':`<p class="hint">${esc(t('cat_builtin'))}</p>`}
  <div class="row hr-filter"><input class="field" id="catQ" data-in="catQ" placeholder="${esc(t('cat_search'))}" value="${esc(S.catQ||'')}" style="flex:2;min-width:180px">
    <select class="field" id="catCat" style="flex:1;min-width:140px"><option value="">${esc(t('cat_allCats'))}</option>${CATS.map(c=>`<option value="${c.k}" ${cf===c.k?'selected':''}>${esc(catName(c))}</option>`).join('')}</select></div>
  ${groups.length?groups.map(g=>`<div class="rp-sec"><h3>${esc(catName(g.c))} <span class="hint num">(${g.items.length})</span></h3><div class="list" style="margin-top:8px">${g.items.map(it=>`<button class="oc ${it.off?'cat-off':''}" data-act="catOpen" data-id="${esc(it.id)}">
    <span style="min-width:0"><span class="t">${esc(it[LANG]||it.ar)}</span><span class="s">${esc(LANG==='en'?it.ar:(it.en||''))}${it.sku?' · <span dir="ltr">'+esc(it.sku)+'</span>':''}</span></span>
    <span class="side"><span class="tag">${esc(unitL(it.uk))}</span>${it.par!=null?`<span class="hint num">${esc(t('cat_parShort'))} ${esc(fmt(it.par))}</span>`:''}${it.off?`<span class="pill ms-open">${t('cat_off')}</span>`:''}</span></button>`).join('')}</div></div>`).join(''):`<div class="empty">${esc(t('hr_noMatch'))}</div>`}`;
}
function catSheet(){
  const isNew=S.openCat==='new';const d=S.hrDraft||{};
  const body=`<div class="sl-grid hr-grid">
    ${hrIn('ar',t('cat_ar'))}${hrIn('en',t('cat_en'),'text','dir="ltr"')}
    ${hrIn('bn',t('cat_bn'))}${hrIn('ur',t('cat_ur'))}
    ${hrSel('cat',t('cat_cat'),CATS.map(c=>[c.k,catName(c)]))}${hrSel('uk',t('cat_unit'),[...new Set([...Object.keys(UNITS).filter(k=>k!=='BOX'),d.uk].filter(Boolean))].map(k=>[k,unitL(k)]))}
    ${hrIn('par',t('cat_par'),'number')}${hrIn('sku',t('cat_sku'),'text','dir="ltr"')}
  </div>
  <p class="hint" style="margin-top:6px">${esc(t('cat_langHint'))}</p>
  <div class="kind" style="margin-top:10px">${[['on','cat_on'],['off','cat_off']].map(([k,l])=>`<button aria-pressed="${(d.off?'off':'on')===k}" data-act="catState" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>
  ${!isNew&&d.off?`<p class="hint">${esc(t('cat_offHint'))}</p>`:''}`;
  const foot=`<span class="spacer"></span><button class="btn btn-sun" data-act="catSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('cat_add'):(d.ar||''),body,foot);
}
Object.assign(A,{
  catNew(){S.openCat='new';S.hrDraft={cat:S.catCat||CATS[0].k,uk:'PC',ar:'',en:'',bn:'',ur:'',par:'',sku:''};render()},
  catOpen(el){const it=catList().find(x=>x.id===el.dataset.id);if(!it)return;S.openCat=it.id;S.hrDraft=Object.assign({},it,{par:it.par==null?'':it.par});render()},
  catState(el){S.hrDraft.off=el.dataset.k==='off';render()},
  catSave(){
    const d=S.hrDraft||{};if(!String(d.ar||'').trim()){toast(t('cat_need'));return}
    const id=S.openCat==='new'?(d.cat||'other')+'-n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5):S.openCat;
    const list=catList().map(x=>Object.assign({},x));const item=cleanItem(Object.assign({},d,{id,par:d.par===''?null:num(d.par)}));
    const i=list.findIndex(x=>x.id===id);if(i>=0)list[i]=item;else list.push(item);
    guard(async()=>{await X.catalog(list.map(cleanItem));S.openCat=null;S.hrDraft=null},()=>t('cat_saved'));
  }
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='catQ'){S.catQ=el.value;clearTimeout(S._catT);S._catT=setTimeout(render,160)}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='catCat'){S.catCat=el.value;render()}});
