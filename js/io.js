/* Maskob — Excel import / export.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Excel import / export for every data list ================= */
/* each dataset: columns [key, label key, type, required]; type: text (default) | num | date | month | place | branch | emp | litype | {value: label key} */
const yesNo={yes:'io_yes',no:'io_no'};
const IO={
  employees:{name:()=>t('tab_emps'),col:'employees',idp:'E',list:()=>S.emps||[],
    cols:[['name','hr_name','text',2],['no','hr_no'],['branch','hr_branch','place'],['job','hr_job'],['nat','hr_nat'],['phone','hr_phone'],['bank','bk_bank'],['iban','bk_iban'],['idNo','hr_id'],
      ['idExp','hr_idExp','date'],['healthExp','hr_health','date'],['contractEnd','hr_contract','date'],['hire','hr_hire','date'],
      ['salary','hr_salary','num'],['gosi','gs_on',{no:'gs_no',yes:'gs_yes'}],['gosiRate','gs_rate','num'],['alHousing','al_housing','num'],['alTransport','al_transport','num'],['alFood','al_food','num'],['alOther','al_other','num'],
      ['status','hr_status',{active:'es_active',left:'es_left'}],['note','hr_note']],
    extra:[['hr_totalPay',e=>payTotal(e)]],
    get:(e,k)=>k==='gosi'?(e.gosi?'yes':'no'):e[k],
    match:(r,L)=>L.find(e=>(r.no&&String(e.no)===r.no)||(r.idNo&&String(e.idNo)===r.idNo))||(!r.no&&!r.idNo?L.find(e=>e.name===r.name):null),
    build:(r,o)=>{const d=Object.assign({status:'active',branch:S.branches[0]||'@office'},o||{},r);if('gosi' in r)d.gosi=r.gosi==='yes';return d}},
  leaves:{name:()=>t('tab_leaves'),col:'leaves',idp:'L',list:()=>S.leaves||[],
    cols:[['emp','lv_emp','emp',1],['type','lv_type',{annual:'lt_annual',sick:'lt_sick',emergency:'lt_emergency',unpaid:'lt_unpaid'}],['from','lv_from','date',1],['to','lv_to','date',1],
      ['status','hr_status',{pending:'ls_pending',approved:'ls_approved',rejected:'ls_rejected'}],['note','hr_note']],
    extra:[['hr_daysN',l=>leaveDays(l)]],
    check:r=>r.to<r.from?t('lv_badDates'):null,
    match:(r,L)=>L.find(l=>l.emp===r.emp&&l.from===r.from),
    build:(r,o)=>{const d=Object.assign({type:'annual',status:'pending'},o||{},r);d.days=leaveDays(d);return d}},
  custody:{name:()=>t('tab_custody'),col:'custody',idp:'C',list:()=>S.custody||[],
    cols:[['emp','lv_emp','emp',1],['item','cu_item','text',1],['serial','cu_serial'],['value','cu_value','num'],['given','cu_given','date'],
      ['status','hr_status',{out:'cs_out',returned:'cs_returned',deducted:'cs_deducted'}],['returnedAt','cu_returnedAt','date'],['note','hr_note']],
    match:(r,L)=>L.find(c=>c.emp===r.emp&&c.item===r.item&&String(c.serial||'')===String(r.serial||'')),
    build:(r,o)=>Object.assign({status:'out',given:dayKey(Date.now())},o||{},r)},
  advances:{name:()=>t('tab_adv'),col:'advances',idp:'A',list:()=>S.advances||[],
    cols:[['emp','lv_emp','emp',1],['date','av_date','date'],['amount','av_amount','num',1],['monthly','av_monthly','num'],['paid','av_paid','num'],['note','hr_note']],
    extra:[['av_remain',a=>advRemain(a)]],
    get:(a,k)=>k==='paid'?advPaid(a):a[k],
    match:(r,L)=>L.find(a=>a.emp===r.emp&&a.date===r.date&&+a.amount===+r.amount),
    build:(r,o)=>{const d=Object.assign({date:dayKey(Date.now())},o||{},r);delete d.paid;
      if(r.paid!=null&&r.paid!==advPaid(o||{}))d.payments=r.paid>0?[{date:d.date,amount:Math.min(r.paid,+d.amount||0)}]:[];else d.payments=(o&&o.payments)||[];
      d.status=advRemain(d)>0?'open':'closed';return d}},
  licenses:{name:()=>t('tab_lic'),col:'licenses',idp:'LC',list:()=>S.licenses||[],
    cols:[['kind','io_kind',{license:'li_license',contract:'li_contract'},1],['type','li_type','litype'],['title','li_title'],['number','li_num'],['place','hr_branch','place'],
      ['party','li_party'],['amount','li_amount','num'],['start','li_issued','date'],['expiry','hr_expiry','date'],['note','hr_note']],
    extra:[['hr_status',l=>t('ls2_'+licState(l))]],
    match:(r,L)=>L.find(l=>l.kind===r.kind&&l.type===r.type&&(r.number?String(l.number||'')===r.number:(l.title||'')===(r.title||''))),
    build:(r,o)=>{const d=Object.assign({place:'@all',history:[],hasFile:false},o||{},r);if(!d.type)d.type='other';return d}},
  sales:{name:()=>t('tab_sales'),col:'sales',list:()=>S.sales||[],
    cols:[['branch','r_branch','branch'],['date','sl_day','date',1],['sales','sl_sales','num',1],['invoices','sl_inv','num',1]],
    check:r=>{if(S.role==='branch'){if(r.branch&&r.branch!==S.branch)return t('io_otherBranch');r.branch=S.branch}
      if(!r.branch)return t('io_req',{c:t('r_branch')});if(r.date>dayKey(Date.now()))return t('sl_future');return null},
    idOf:r=>r.branch+'_'+r.date,
    match:(r,L)=>L.find(x=>x.branch===r.branch&&x.date===r.date),
    build:(r,o)=>Object.assign({},o||{},r,{invoices:Math.round(r.invoices),at:nowIso()})},
  targets:{name:()=>t('tg_title'),list:()=>{const out=[];for(const b in(S.targets||{})){const m=(S.targets[b]||{}).m||{};for(const mk in m)out.push({id:b+'|'+mk,branch:b,month:mk,sales:m[mk].sales,invoices:m[mk].invoices})}return out.sort((a,b)=>(a.month+a.branch).localeCompare(b.month+b.branch))},
    cols:[['branch','r_branch','branch',1],['month','io_month','month',1],['sales','sl_target','num'],['invoices','sl_inv','num']],
    idOf:r=>r.branch+'|'+r.month,
    match:(r,L)=>L.find(x=>x.branch===r.branch&&x.month===r.month),
    build:(r,o)=>Object.assign({},o||{},r),
    save:x=>X.target(x.data.branch,x.data.month,{sales:+x.data.sales||0,invoices:Math.round(+x.data.invoices||0)})},
  catalog:{name:()=>t('tab_catalog'),list:()=>catList().map(x=>Object.assign({},x)),
    cols:[['id','cat_code'],['cat','cat_cat','cat'],['ar','cat_ar','text',2],['en','cat_en'],['bn','cat_bn'],['ur','cat_ur'],['uk','cat_unit','unit'],['par','cat_par','num'],['sku','cat_sku'],['state','cat_status',{on:'cat_on',off:'cat_off'}]],
    get:(it,k)=>k==='state'?(it.off?'off':'on'):it[k],
    match:(r,L)=>r.id?L.find(x=>x.id===r.id):L.find(x=>x.ar===r.ar&&(!r.uk||x.uk===r.uk)),
    idOf:d=>(d.cat||'other')+'-n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    build:(r,o)=>{const d=Object.assign({cat:'other',uk:'PC'},o||{},r);if(r.state)d.off=r.state==='off';delete d.state;return cleanItem(d)},
    commit:async items=>{const list=catList().map(x=>Object.assign({},x));
      items.forEach(x=>{const it=cleanItem(Object.assign({},x.data,{id:x.id}));const i=list.findIndex(y=>y.id===x.id);if(i>=0)list[i]=it;else list.push(it)});
      await X.catalog(list.map(cleanItem))}},
  maint:{name:()=>t('tab_maint'),readOnly:true,list:()=>[...(S.maint||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),
    cols:[['branch','r_branch','branch'],['cat','m_cat',Object.fromEntries(MAINT_CATS.map(c=>[c,'mc_'+c]))],['desc','m_desc'],['urgent','m_urgent',yesNo],
      ['status','hr_status',{open:'ms_open',progress:'ms_progress',done:'ms_done'}],['createdAt','c_created'],['opsNote','m_reply']],
    get:(m,k)=>k==='urgent'?(m.urgent?'yes':'no'):k==='createdAt'?fmtDT(m.createdAt):m[k]}
};
const ioCan=k=>({employees:'hr',leaves:'hr',custody:'hr',advances:'hr',licenses:'hr',vouchers:'hr',targets:'manager',maint:'manager',catalog:'admin'}[k]||(k==='sales'?(S.role==='manager'||S.role==='branch')&&S.role:null))===S.role;
/* one drop-down per list: export, import (and any extra item) */
function ioBtns(k,extra){
  if(!ioCan(k))return'';
  return`<details class="io-menu"><summary class="btn btn-ghost rp-btn">${t(IO[k].readOnly?'io_export':'io_menu')} <span aria-hidden="true">▾</span></summary><div class="io-pop" role="menu">
    <button class="io-item" role="menuitem" data-act="ioExport" data-k="${k}">⬇ ${t('io_export')}</button>
    ${IO[k].readOnly?'':`<label class="io-item io-imp" role="menuitem">⬆ ${t('io_import')}<input type="file" class="imp-in" data-k="${k}" accept=".xlsx,.xls,.csv" aria-label="${esc(t('io_import'))}"></label>`}
    ${extra||''}</div></details>`;
}
/* close an open drop-down when tapping elsewhere, after choosing an item, or opening another */
document.addEventListener('click',ev=>{
  const inMenu=ev.target.closest&&ev.target.closest('.io-menu');
  document.querySelectorAll('.io-menu[open]').forEach(d=>{if(d!==inMenu||ev.target.closest('button.io-item'))d.open=false});
});
/* ---- values: export in the current language, import from any of the four ---- */
const labelsOf=k=>(T[k]||[k]).map(x=>String(x).trim().toLowerCase());
const normH=v=>String(v??'').replace(/\s+/g,' ').trim().toLowerCase();
const asciiDigits=v=>String(v).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const PLACE_KEYS={'@wh':'r_warehouse','@office':'hr_office','@all':'li_allPlaces'};
function ioOut(def,row,c){
  const [k,,type]=c;const v=def.get?def.get(row,k):row[k];
  if(v==null||v==='')return'';
  if(type==='place'||type==='branch')return placeL(v);
  if(type==='emp')return empName(v);
  if(type==='litype')return licTypeL(row);
  if(type==='cat')return CAT[v]?catName(CAT[v]):v;
  if(type==='unit')return unitL(v);
  if(type&&typeof type==='object')return type[v]?t(type[v]):v;
  return v;
}
function ioDate(v){
  if(v instanceof Date&&!isNaN(v))return dayKey(v);
  if(typeof v==='number'&&window.XLSX){const p=XLSX.SSF.parse_date_code(v);if(p&&p.y)return`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;return null}
  const s=asciiDigits(v).trim();let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/),y,mo,d;
  if(m){y=+m[1];mo=+m[2];d=+m[3]}else if((m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))){d=+m[1];mo=+m[2];y=+m[3]}else return null;
  const dt=new Date(y,mo-1,d);if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null;
  return dayKey(dt);
}
function ioIn(c,raw,ctx){
  const [k,lk,type]=c;const label=t(lk);
  if(raw==null||String(raw).trim()==='')return{skip:true};
  const s=typeof raw==='string'?raw.trim():raw;
  if(type==='num'){const n=typeof s==='number'?s:Number(asciiDigits(s).replace(/[,،\s]/g,'').replace(/[^\d.\-]/g,''));return isFinite(n)&&String(s)!==''?{v:n}:{err:t('io_badNum',{c:label})}}
  if(type==='date'){const d=ioDate(s);return d?{v:d}:{err:t('io_badDate',{c:label})}}
  if(type==='month'){const m=asciiDigits(s).trim().match(/^(\d{4})[-\/.](\d{1,2})$/);if(m)return{v:m[1]+'-'+String(+m[2]).padStart(2,'0')};const d=ioDate(s);return d?{v:d.slice(0,7)}:{err:t('io_badDate',{c:label})}}
  const low=String(s).toLowerCase();
  if(type==='place'||type==='branch'){
    const b=S.branches.find(x=>x.toLowerCase()===low);if(b)return{v:b};
    if(type==='place')for(const pk in PLACE_KEYS)if(pk===low||labelsOf(PLACE_KEYS[pk]).includes(low))return{v:pk};
    return{err:t('io_noPlace',{v:s})}}
  if(type==='emp'){const L=S.emps||[];const e=L.find(x=>x.no&&String(x.no)===String(s))||L.find(x=>x.idNo&&String(x.idNo)===String(s))||L.find(x=>x.name===s);return e?{v:e.id}:{err:t('io_noEmp',{v:s})}}
  if(type==='cat'){const c=CATS.find(c=>c.k===low||c.n.some(n=>String(n).toLowerCase()===low));return c?{v:c.k}:{err:t('io_badOpt',{c:label,v:s})}}
  if(type==='unit'){const u=Object.keys(UNITS).find(k=>k.toLowerCase()===low||UNITS[k].some(n=>String(n).toLowerCase()===low));return{v:u||String(s)}}
  if(type==='litype'){const kind=ctx.kind||'license';const opts=LIC_TYPES[kind];
    const hit=opts.find(o=>o===low||labelsOf((kind==='contract'?'ct_':'li_')+'t_'+o).includes(low));return hit?{v:hit}:{err:t('io_badOpt',{c:label,v:s})}}
  if(type&&typeof type==='object'){for(const ok in type)if(ok===low||labelsOf(type[ok]).includes(low))return{v:ok};return{err:t('io_badOpt',{c:label,v:s})}}
  return{v:String(s)};
}
async function ioRead(k,file){
  const def=IO[k];
  try{await ensureXlsx();if(!window.XLSX)throw 0}catch(e){toast(t('xlsFail'));return}
  let aoa;
  try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''})}
  catch(e){toast(t('io_readFail'));return}
  const known=new Set(def.cols.flatMap(c=>[c[0].toLowerCase(),...labelsOf(c[1])]));
  let hi=-1,best=0;
  aoa.slice(0,25).forEach((r,i)=>{const n=r.filter(v=>known.has(normH(v))).length;if(n>best){best=n;hi=i}});
  if(hi<0)hi=aoa.findIndex(r=>r.some(v=>String(v).trim()!==''));
  const imp={k,file:file.name,ok:[],errors:[],missing:[]};
  if(hi<0){imp.fatal=t('io_empty');S.imp=imp;render();return}
  const head=aoa[hi].map(normH);
  // which file column holds each dataset column (header text in any language, or the field key)
  const at={};def.cols.forEach(c=>{const names=[c[0].toLowerCase(),...labelsOf(c[1])];const i=head.findIndex(h=>names.includes(h));if(i>=0)at[c[0]]=i});
  imp.missing=def.cols.filter(c=>c[3]===1&&at[c[0]]==null&&!(k==='sales'&&c[0]==='branch')).map(c=>t(c[1]));
  if(k==='sales'&&S.role==='manager'&&at.branch==null)imp.missing.push(t('r_branch'));
  if(k==='employees'&&at.name==null&&at.no==null&&at.idNo==null)imp.missing.push(t('hr_name'));
  if(imp.missing.length){imp.fatal=t('io_missing',{c:imp.missing.join('، ')});S.imp=imp;render();return}
  const list=def.list().map(x=>Object.assign({},x));   // copies: nothing changes until the import is confirmed
  for(let i=hi+1;i<aoa.length;i++){
    const row=aoa[i];if(!row.some(v=>String(v).trim()!==''))continue;
    const r={},errs=[];
    for(const c of def.cols){if(at[c[0]]==null)continue;const x=ioIn(c,row[at[c[0]]],r);
      if(x.err)errs.push(x.err);else if(!x.skip)r[c[0]]=x.v;else if(c[3]===1)errs.push(t('io_req',{c:t(c[1])}))}
    if(!errs.length&&def.check){const e=def.check(r);if(e)errs.push(e)}
    if(errs.length){imp.errors.push({n:i+1,msg:errs.join(' — ')});continue}
    const old=def.match(r,list);
    // flag 2 = needed only when the row creates a new record (an update can leave it out)
    const needNew=old?[]:def.cols.filter(c=>c[3]===2&&r[c[0]]==null);
    if(needNew.length){imp.errors.push({n:i+1,msg:needNew.map(c=>t('io_req',{c:t(c[1])})).join(' — ')});continue}
    const data=def.build(r,old);
    const id=old?old.id:(def.idOf?def.idOf(data):hrId(def.idp));
    const tm=nowIso();if(def.col&&def.col!=='sales'){data.updatedAt=tm;if(!data.createdAt)data.createdAt=tm}
    delete data.id;
    const prev=imp.ok.find(x=>x.id===id);
    if(prev)prev.data=data;else imp.ok.push({id,data,isNew:!old});
    if(!old)list.push(Object.assign({},data,{id}));else Object.assign(old,data);
  }
  if(!imp.ok.length&&!imp.errors.length)imp.fatal=t('io_empty');
  S.imp=imp;render();
}
function impSheet(){
  const m=S.imp,def=IO[m.k];if(!def)return'';
  const nw=m.ok.filter(x=>x.isNew).length,up=m.ok.length-nw;
  const show=def.cols.slice(0,4);
  const body=`<div class="hint" style="margin-bottom:10px">📄 ${esc(m.file)}</div>
  ${m.fatal?`<div class="eos-warn">${esc(m.fatal)}</div>`:`<div class="stats">${kpi(t('io_new'),sar(nw))}${kpi(t('io_upd'),sar(up))}${kpi(t('io_err'),sar(m.errors.length),m.errors.length?'hot':'')}</div>`}
  ${m.errors.length?`<div class="eos-warn" style="margin-top:10px">${m.errors.slice(0,30).map(e=>`<div><b>${esc(t('io_row',{n:e.n}))}:</b> ${esc(e.msg)}</div>`).join('')}${m.errors.length>30?`<div>…</div>`:''}</div>`:''}
  ${m.ok.length?`<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th></th>${show.map(c=>`<th>${esc(t(c[1]))}</th>`).join('')}</tr></thead><tbody>
    ${m.ok.slice(0,8).map(x=>`<tr><td><span class="tag">${esc(t(x.isNew?'io_new':'io_upd'))}</span></td>${show.map(c=>`<td>${esc(String(ioOut(def,Object.assign({id:x.id},x.data),c)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${m.ok.length>8?`<div class="hint">+ ${m.ok.length-8}</div>`:''}`:''}
  <p class="hint" style="margin-top:12px">${esc(t('io_hint'))}</p>`;
  const foot=`<button class="btn btn-ghost" data-act="close">${t('io_cancel')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="ioCommit" ${m.ok.length&&!S.busy?'':'disabled'}>${esc(t('io_go',{n:m.ok.length}))}</button>`;
  return hrSheetWrap(t('io_title',{n:def.name()}),body,foot);
}
Object.assign(A,{
  async ioExport(el){
    const k=el.dataset.k,def=IO[k];if(!def||!ioCan(k))return;
    const rows=def.list().map(r=>[...def.cols.map(c=>ioOut(def,r,c)),...(def.extra||[]).map(x=>x[1](r))]);
    await saveXlsx('maskob-'+k+'-'+dayKey(Date.now())+'.xlsx',[{name:def.name(),headers:[...def.cols.map(c=>t(c[1])),...(def.extra||[]).map(x=>t(x[0]))],rows}]);
  },
  ioCommit(){
    const m=S.imp,def=m&&IO[m.k];if(!def||!m.ok.length)return;const items=[...m.ok];
    guard(async()=>{
      if(def.commit)await def.commit(items);else for(let i=0;i<items.length;i+=20)await Promise.all(items.slice(i,i+20).map(x=>def.save?def.save(x):X.put(def.col,x.id,x.data)));
      S.imp=null;
    },()=>t('io_done',{n:items.length}));
  }
});
document.addEventListener('change',ev=>{
  const el=ev.target;if(!el.classList||!el.classList.contains('imp-in')||!el.files||!el.files[0])return;
  const f=el.files[0],k=el.dataset.k;el.value='';
  if(ioCan(k))ioRead(k,f);
});

