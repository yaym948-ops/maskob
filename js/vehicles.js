/* Maskob — company vehicles (المركبات), kept by HR: vehicle and driver, document expiry (registration, insurance,
   periodic inspection, operating card), maintenance and oil changes, fuel, and traffic fines — a fine can be
   deducted from the driver's pay (an approved HR deduction form, cancellable like any deduction).
   vehicles/{id}: {plate, make, model, year, color, place, driver, regExp, insExp, inspExp, opExp, km, oilKm, oilDate, note,
                   maint:[{id,date,km,desc,cost,oil}], fuel:[{id,date,km,liters,amount}], fines:[{id,date,no,desc,amount,emp,form}]} */
const VH_DOCS=[['regExp','vh_reg'],['insExp','vh_ins'],['inspExp','vh_insp'],['opExp','vh_op']];
const vhById=id=>(S.vehicles||[]).find(v=>v.id===id);
const vhName=v=>[v.make,v.model,v.year].filter(Boolean).join(' ')||t('vh_vehicle');
/* what needs attention: documents expiring within HR_WARN days, or the oil change due (14 days / 500 km) */
function vhIssues(v){const out=[],today=dayKey(Date.now());
  VH_DOCS.forEach(([k,l])=>{if(isDay(v[k])){const n=dayDiff(today,v[k]);if(n<=HR_WARN)out.push({k,l,n,late:n<0})}});
  const oilD=isDay(v.oilDate)?dayDiff(today,v.oilDate):null,oilK=+v.oilKm&&+v.km?(+v.oilKm)-(+v.km):null;
  if((oilD!=null&&oilD<=14)||(oilK!=null&&oilK<=500))out.push({k:'oil',l:'vh_oilDue',n:oilD,km:oilK,late:(oilD!=null&&oilD<0)||(oilK!=null&&oilK<0)});
  return out}
const vhAlerts=()=>(S.vehicles||[]).filter(v=>vhIssues(v).length);

function vhLoadDemo(){S.vehicles=S.role==='hr'?MEM('vehicles'):[]}
function vhStart(u,onErr){if(S.role!=='hr')return;u.push(db.collection('vehicles').onSnapshot(s=>{S.vehicles=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}

function vehiclesView(){const L=[...(S.vehicles||[])].sort((a,c)=>vhIssues(c).length-vhIssues(a).length||String(a.plate).localeCompare(String(c.plate)));
  const mk=monthKey(Date.now()),fuelM=L.reduce((s0,v)=>s0+(v.fuel||[]).filter(x=>String(x.date).startsWith(mk)).reduce((a,x)=>a+(+x.amount||0),0),0),
    maintM=L.reduce((s0,v)=>s0+(v.maint||[]).filter(x=>String(x.date).startsWith(mk)).reduce((a,x)=>a+(+x.cost||0),0),0);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_vehicles')}</h2><button class="btn btn-sun" data-act="vhNew">+ ${t('vh_new')}</button></div>
  <div class="stats">${kpi(t('tab_vehicles'),L.length)}${kpi(t('vh_fuelMonth'),sar2(fuelM)+' '+t('sar'))}${kpi(t('vh_maintMonth'),sar2(maintM)+' '+t('sar'))}${kpi(t('vh_attention'),vhAlerts().length)}</div>
  <div class="list">${L.map(v=>{const iss=vhIssues(v),drv=v.driver?empById(v.driver):null;
    return`<button class="oc" data-act="vhOpen" data-id="${esc(v.id)}"><span style="min-width:0;flex:1"><span class="t"><b dir="auto">${esc(v.plate||'—')}</b> · ${esc(vhName(v))}</span>
      <span class="s">${drv?esc(t('vh_driver'))+': '+esc(drv.name):esc(t('vh_noDriver'))}${v.place?' · '+esc(placeL(v.place)):''}${+v.km?' · '+esc(sar2(v.km))+' '+esc(t('vh_kmU')):''}</span></span>
      <span class="side">${iss.map(x=>`<span class="tag ${x.late?'ret':''}">${esc(t(x.l))}${x.k!=='oil'?': '+esc(leftLabel(x.n)):''}</span>`).join('')}</span></button>`}).join('')||`<div class="empty">${esc(t('vh_none'))}</div>`}</div>`}

function vehicleSheet(){const isNew=S.openVh==='new',v=isNew?{}:vhById(S.openVh);if(!isNew&&!v)return'';
  const tb=isNew?'info':(S.vhTab||'info'),d=S.hrDraft||{},emps=(S.emps||[]).filter(e=>e.status!=='left').sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const tabs=isNew?'':`<div class="kind" style="margin-bottom:12px">${[['info','vh_tInfo'],['maint','vh_tMaint'],['fuel','vh_tFuel'],['fines','vh_tFines']].map(([k,l])=>`<button aria-pressed="${tb===k}" data-act="vhTab" data-k="${k}">${esc(t(l))}</button>`).join('')}</div>`;
  const e=S.vhEntry||{};let body='',foot='';
  if(tb==='info'){
    body=`<div class="sl-grid hr-grid">${hrIn('plate',t('vh_plate'))}${hrIn('make',t('vh_make'))}${hrIn('model',t('vh_model'))}${hrIn('year',t('vh_year'),'number')}${hrIn('color',t('vh_color'))}
      ${hrSel('place',t('hr_branch'),[['',t('inv_pick')],...hrPlaces().map(p=>[p,placeL(p)])])}${hrSel('driver',t('vh_driver'),[['',t('vh_noDriver')],...emps.map(x=>[x.id,x.name+(x.no?' #'+x.no:'')])])}
      ${VH_DOCS.map(([k,l])=>hrIn(k,t(l),'date')).join('')}${hrIn('km',t('vh_km'),'number')}${hrIn('oilKm',t('vh_oilKm'),'number')}${hrIn('oilDate',t('vh_oilDate'),'date')}</div>
      <label style="display:block;margin-top:8px"><span class="hint">${t('pm_note')}</span><textarea class="field" id="hr-note" data-in="hrF" data-f="note" rows="2" dir="auto">${esc(d.note||'')}</textarea></label>
      ${typeof phBlock==='function'?phBlock('vehicles',isNew?null:v.id,{title:'vh_photos'}):''}`;
    foot=`${isNew?'':`<button class="btn btn-bad" data-act="vhDel">${S.confirm==='vhDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="vhSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`}
  else{const L=[...(v[tb]||[])].sort((a,c)=>String(c.date).localeCompare(String(a.date)));
    const inp=(f,label,type)=>`<label><span class="hint">${esc(label)}</span><input class="field${type==='number'?' num':''}" type="${type||'text'}" id="vhe-${f}" data-in="vhE" data-f="${f}" value="${esc(e[f]??'')}" ${type==='number'?'inputmode="decimal" dir="ltr"':'dir="auto"'}></label>`;
    const form=tb==='maint'?`${inp('date',t('sl_day'),'date')}${inp('km',t('vh_km'),'number')}${inp('desc',t('vh_maintDesc'))}${inp('cost',t('vh_cost')+' ('+t('sar')+')','number')}
        <label class="row" style="gap:8px;align-self:end;padding-bottom:10px"><input type="checkbox" id="vhe-oil" ${e.oil?'checked':''} style="width:20px;height:20px"><b>${t('vh_isOil')}</b></label>${e.oil?inp('nextKm',t('vh_oilKm'),'number')+inp('nextDate',t('vh_oilDate'),'date'):''}`
      :tb==='fuel'?`${inp('date',t('sl_day'),'date')}${inp('km',t('vh_km'),'number')}${inp('liters',t('vh_liters'),'number')}${inp('amount',t('vh_amount')+' ('+t('sar')+')','number')}`
      :`${inp('date',t('sl_day'),'date')}${inp('no',t('vh_fineNo'))}${inp('desc',t('vh_fineDesc'))}${inp('amount',t('vh_amount')+' ('+t('sar')+')','number')}
        <label><span class="hint">${t('vh_fineEmp')}</span><select class="field" id="vhe-emp" data-in="vhE" data-f="emp"><option value="">${esc(t('hr_pickEmp'))}</option>${emps.map(x=>`<option value="${esc(x.id)}" ${(e.emp??v.driver)===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="row" style="gap:8px;align-self:end;padding-bottom:10px"><input type="checkbox" id="vhe-ded" ${e.ded?'checked':''} style="width:20px;height:20px"><b>${t('vh_fineDed')}</b></label>`;
    const sum=L.reduce((s0,x)=>s0+(+(x.cost??x.amount)||0),0);
    body=`<div class="box"><div class="sl-grid hr-grid">${form}</div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-navy rp-btn" data-act="vhAdd" ${S.busy?'disabled':''}>+ ${t('vh_add_'+tb)}</button></div></div>
      ${L.length?`<p class="hint">${esc(t('vh_total',{a:sar2(sum)}))}</p>`:''}
      <div class="list">${L.map(x=>{const f=x.form?(S.forms||[]).find(y=>y.id===x.form):null;
        return`<div class="oc" style="cursor:default"><span style="min-width:0;flex:1"><span class="t">${esc(dateLabel(x.date))}${x.desc?' · '+esc(x.desc):''}${x.no?` <span class="hint num" dir="ltr">#${esc(x.no)}</span>`:''}</span>
        <span class="s">${+x.km?esc(sar2(x.km))+' '+esc(t('vh_kmU')):''}${+x.liters?' · '+esc(sar2(x.liters))+' '+esc(t('vh_lU')):''}${x.oil?' · '+esc(t('vh_isOil')):''}${x.emp&&empById(x.emp)?' · '+esc(empById(x.emp).name):''}${f?' · '+esc(t(f.status==='cancelled'?'vh_dedCancelled':'vh_deducted')):''}</span></span>
        <span class="side"><b class="num">${esc(sar2(x.cost??x.amount))}</b><button class="btn btn-ghost rp-btn" data-act="vhRm" data-id="${esc(x.id)}" aria-label="${esc(t('del'))}" title="${esc(t('del'))}"></button></span></div>`}).join('')||`<div class="empty">${esc(t('vh_noEntries'))}</div>`}</div>`}
  return hrSheetWrap(isNew?t('vh_new'):`${v.plate||''} · ${vhName(v)}`,tabs+body,foot)}

Object.assign(A,{
  vhNew(){S.openVh='new';S.vhTab='info';S.confirm=null;S.hrDraft={place:'',driver:''};render()},
  vhOpen(el){const v=vhById(el.dataset.id);if(!v)return;S.openVh=v.id;S.vhTab='info';S.confirm=null;S.hrDraft=Object.assign({},v);S.vhEntry={date:dayKey(Date.now())};render()},
  vhTab(el){S.vhTab=el.dataset.k;S.vhEntry={date:dayKey(Date.now())};render()},
  vhSave(){const d=S.hrDraft||{};if(!String(d.plate||'').trim()){toast(t('vh_needPlate'));return}
    const isNew=S.openVh==='new',id=isNew?hrId('VH'):S.openVh,old=isNew?{}:(vhById(id)||{});
    const data={plate:String(d.plate).trim(),make:String(d.make||'').trim(),model:String(d.model||'').trim(),year:String(d.year||'').trim(),color:String(d.color||'').trim(),
      place:d.place||'',driver:d.driver||'',note:String(d.note||'').trim(),km:num(d.km)||null,oilKm:num(d.oilKm)||null,oilDate:isDay(d.oilDate)?d.oilDate:'',
      maint:old.maint||[],fuel:old.fuel||[],fines:old.fines||[],updatedAt:nowIso()};
    VH_DOCS.forEach(([k])=>data[k]=isDay(d[k])?d[k]:'');
    guard(async()=>{const n=typeof phCommit==='function'?await phCommit('vehicles',isNew?null:id,id,''):null;if(n!=null)data.photos=n;else if(old.photos)data.photos=old.photos;
      await X.put('vehicles',id,data);if(isNew){S.openVh=id;S.hrDraft=Object.assign({},data,{id})}else{S.openVh=null;S.hrDraft=null}},()=>t('st_saved'))},
  vhDel(){const id=S.openVh;if(!id||id==='new')return;if(S.confirm!=='vhDel'){S.confirm='vhDel';render();return}
    guard(async()=>{await X.del('vehicles',id);S.openVh=null;S.confirm=null},()=>t('li_deleted'))},
  vhAdd(){const v=vhById(S.openVh),tb=S.vhTab,e=S.vhEntry||{};if(!v||!['maint','fuel','fines'].includes(tb))return;
    if(!isDay(e.date)){toast(t('pm_needDone'));return}
    const x={id:'x'+Date.now().toString(36),date:e.date},patch={};
    if(tb==='maint'){x.desc=String(e.desc||'').trim();x.km=num(e.km)||null;x.cost=num(e.cost);x.oil=!!e.oil;if(!x.desc&&!x.oil){toast(t('vh_needDesc'));return}
      if(x.oil){if(num(e.nextKm))patch.oilKm=num(e.nextKm);if(isDay(e.nextDate))patch.oilDate=e.nextDate}}
    if(tb==='fuel'){x.km=num(e.km)||null;x.liters=num(e.liters)||null;x.amount=num(e.amount);if(!(x.amount>0)){toast(t('vh_needAmount'));return}}
    if(tb==='fines'){x.no=String(e.no||'').trim();x.desc=String(e.desc||'').trim();x.amount=num(e.amount);x.emp=e.emp??v.driver??'';
      if(!(x.amount>0)){toast(t('vh_needAmount'));return}if(e.ded&&!x.emp){toast(t('vs_needWho'));return}}
    if(x.km&&x.km>(+v.km||0))patch.km=x.km;
    guard(async()=>{
      if(tb==='fines'&&e.ded){const emp=empById(x.emp)||{},fid=hrId('F'),tm=nowIso();x.form=fid;
        await X.put('forms',fid,{branch:S.branches.includes(emp.branch)?emp.branch:'',staffId:'',emp:x.emp,empName:emp.name||'',empNo:String(emp.no||''),type:'deduction',date:x.date,
          reason:t('vh_fineReason',{p:v.plate||'',n:x.no||'—'})+(x.desc?'\n'+x.desc:''),amount:x.amount,days:null,level:null,status:'approved',by:'hr',vehicle:v.id,createdAt:tm,decidedAt:tm})}
      await X.upd('vehicles',v.id,Object.assign({[tb]:[...(v[tb]||[]),x],updatedAt:nowIso()},patch));S.vhEntry={date:dayKey(Date.now())}},()=>t('st_saved'))},
  vhRm(el){const v=vhById(S.openVh),tb=S.vhTab;if(!v)return;const x=(v[tb]||[]).find(y=>y.id===el.dataset.id);if(!x)return;
    if(x.form){const f=(S.forms||[]).find(y=>y.id===x.form);if(f&&f.status!=='cancelled'){toast(t('vh_cancelFirst'));return}}
    if(S.confirm!=='vhRm'+x.id){S.confirm='vhRm'+x.id;toast(t('vh_rmAgain'));return}
    guard(async()=>{await X.upd('vehicles',v.id,{[tb]:(v[tb]||[]).filter(y=>y.id!==x.id),updatedAt:nowIso()});S.confirm=null},()=>t('li_deleted'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='vhE'&&S.vhEntry)S.vhEntry[el.dataset.f]=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(!S.vhEntry)return;
  if(el.id==='vhe-oil'){S.vhEntry.oil=el.checked;render()}else if(el.id==='vhe-ded'){S.vhEntry.ded=el.checked}});
