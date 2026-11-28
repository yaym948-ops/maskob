/* Maskob — Branch manager pages: sales, targets, maintenance, checklist.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Branch manager: sales, maintenance, checklist ================= */
const DEFAULT_CHECKLIST=['نظافة الصالة والطاولات','نظافة دورات المياه','درجة حرارة الثلاجات','تواريخ صلاحية المواد','نظافة منطقة التحضير','عمل أجهزة الكاشير والطابعة','الزي الرسمي للموظفين','الإضاءة واللوحات','مخزون الأكواب والمستهلكات','إغلاق الغاز والأجهزة نهاية اليوم'];
const MAINT_CATS=['electric','plumbing','ac','equipment','building','other'];
const sar=n=>{try{return(+n||0).toLocaleString(LOCALE[LANG],{maximumFractionDigits:0})}catch(e){return String(Math.round(+n||0))}};
const sar2=n=>{try{return(+n||0).toLocaleString(LOCALE[LANG],{maximumFractionDigits:1})}catch(e){return String(+n||0)}};
const monthKey=d=>dayKey(d).slice(0,7);
const daysInMonth=k=>{const [y,m]=k.split('-').map(Number);return new Date(y,m,0).getDate()};
const itemKey=txt=>{let h=0;for(const c of String(txt))h=(h*31+c.charCodeAt(0))|0;return 'i'+(h>>>0).toString(36)};
const checklistItems=()=>(S.checklist&&S.checklist.length?S.checklist:DEFAULT_CHECKLIST);

/* ---------- generic store for the new collections (Firestore live, localStorage demo) ---------- */
const MEM=k=>{const m=S._mem||(S._mem={});if(!(k in m))m[k]=LS.get('mk.demo.'+k,k==='targets'?{}:k==='checklist'?null:[]);return m[k]};
const MEMSET=(k,v)=>{S._mem[k]=v;LS.set('mk.demo.'+k,v)};
const X={
  async put(col,id,data){
    window.logAct&&logAct('add',col,id);
    if(S.fb)return queue(col+'/'+id,()=>db.doc(col+'/'+id).set(data));
    MEMSET(col,MEM(col).filter(x=>x.id!==id).concat([Object.assign({},data,{id})]));xLoadDemo();render();
  },
  async upd(col,id,data){
    window.logAct&&logAct('upd',col,id);
    if(S.fb)return queue(col+'/'+id,()=>db.doc(col+'/'+id).update(data));
    MEMSET(col,MEM(col).map(x=>x.id===id?Object.assign({},x,data):x));xLoadDemo();render();
  },
  async photo(mid,n,data,branch){
    if(S.fb)return db.doc('maintenance/'+mid+'/photos/'+n).set({branch,data});
    (S._demoPhotos||(S._demoPhotos={}))[mid]=((S._demoPhotos[mid])||[]).concat([data]);
  },
  async photos(mid){
    if(S.fb){const q=await db.collection('maintenance/'+mid+'/photos').get();return q.docs.sort((a,b)=>a.id.localeCompare(b.id)).map(d=>d.data().data)}
    return(S._demoPhotos&&S._demoPhotos[mid])||[];
  },
  async target(b,mk,data){
    if(S.fb)return queue('targets/'+b,()=>db.doc('targets/'+b).set({m:{[mk]:data}},{merge:true}));
    const all=Object.assign({},MEM('targets'));const cur=all[b]||{};all[b]=Object.assign({},cur,{m:Object.assign({},cur.m||{},{[mk]:data})});
    MEMSET('targets',all);xLoadDemo();render();
  },
  async hrCfg(data){
    if(S.fb)return queue('config/hr',()=>db.doc('config/hr').set(data,{merge:true}));
    MEMSET('hrcfg',data);xLoadDemo();render();
  },
  async liFilePut(id,data){
    if(S.fb)return db.doc('licenses/'+id+'/files/f0').set({data});
    (S._demoLic||(S._demoLic={}))[id]=data;
  },
  async liFileGet(id){
    if(S.fb){const d=await db.doc('licenses/'+id+'/files/f0').get();return d.exists?d.data().data:null}
    return(S._demoLic||{})[id]||null;
  },
  async liFileDel(id){
    if(S.fb)return db.doc('licenses/'+id+'/files/f0').delete().catch(()=>{});
    if(S._demoLic)delete S._demoLic[id];
  },
  async company(data){
    if(S.fb)return queue('config/company',()=>db.doc('config/company').set(data));
    MEMSET('company',data);xLoadDemo();render();
  },
  async companyLogo(data){
    if(S.fb)return data?db.doc('config/companyLogo').set({data}):db.doc('config/companyLogo').delete();
    MEMSET('companyLogo',data||'');xLoadDemo();render();
  },
  async catalog(items){
    if(S.fb)return queue('config/catalog',()=>db.doc('config/catalog').set({items,at:nowIso()}));
    MEMSET('catalog',items);xLoadDemo();render();
  },
  async del(col,id){
    window.logAct&&logAct('del',col,id);
    if(S.fb)return queue(col+'/'+id,()=>db.doc(col+'/'+id).delete());
    MEMSET(col,MEM(col).filter(x=>x.id!==id));xLoadDemo();render();
  },
  async checklist(items){
    if(S.fb)return queue('config/checklist',()=>db.doc('config/checklist').set({items}));
    MEMSET('checklist',items);xLoadDemo();render();
  }
};
function xLoadDemo(){
  {const c=MEM('company');S.company=c&&!Array.isArray(c)?c:{};const l=MEM('companyLogo');S.coLogo=typeof l==='string'&&l?l:null}
  S.catalog=MEM('catalog');applyCatalog();
  {const st=MEM('stock');S.stock=st&&!Array.isArray(st)?st:{};S.stockMoves=MEM('stockMoves')}
  {const c=MEM('costs');S.costs=c&&!Array.isArray(c)?c:{};const f=MEM('fincfg');S.finCfg=f&&!Array.isArray(f)?f:{};S.assets=MEM('assets')}
  S.users=MEM('users');S.log=S.role==='admin'?MEM('log'):[];
  const mine=a=>S.role==='branch'?a.filter(x=>x.branch===S.branch):a;
  S.sales=mine(MEM('sales'));S.maint=mine(MEM('maintenance'));
  S.checks=mine(MEM('checks'));S.targets=Object.assign({},MEM('targets'));S.checklist=MEM('checklist');
  S.emps=S.role==='hr'?MEM('employees'):[];S.leaves=S.role==='hr'?MEM('leaves'):[];S.custody=S.role==='hr'?MEM('custody'):[];S.advances=S.role==='hr'?MEM('advances'):[];S.licenses=S.role==='hr'?MEM('licenses'):[];S.leaveReqs=S.role==='hr'||S.role==='branch'||S.role==='manager'?mine(MEM('leaveReqs')):[];S.staff=S.role==='hr'||S.role==='branch'||S.role==='manager'?mine(MEM('staff')):[];if(S.role==='hr')hrSyncStaff();S.shifts=S.role==='branch'||S.role==='manager'?mine(MEM('shifts')):[];S.vouchers=S.role==='hr'?MEM('vouchers'):[];S.payroll=S.role==='hr'?MEM('payroll'):[];S.forms=S.role==='hr'||S.role==='branch'?mine(MEM('forms')):[];
  {const c=S.role==='hr'?MEM('hrcfg'):null;S.hrCfg=c&&!Array.isArray(c)?c:{}}
  if(S.role==='finance'){S.emps=MEM('employees');S.leaves=MEM('leaves');S.forms=MEM('forms');S.advances=MEM('advances');S.payroll=MEM('payroll');S.vouchers=MEM('vouchers');S.expenses=MEM('expenses');S.supInv=MEM('supInvoices');S.suppliers=MEM('suppliers');S.appPays=MEM('appPays');S.sales=MEM('sales')}
  if(S.role==='dash'){S.emps=MEM('employees');S.leaveReqs=MEM('leaveReqs');S.forms=MEM('forms');S.licenses=MEM('licenses');S.leaves=MEM('leaves')}
  if(typeof arcLoadDemo==='function')arcLoadDemo();
  if(typeof mailLoadDemo==='function')mailLoadDemo();
  if(typeof invLoadDemo==='function')invLoadDemo();
  if(typeof menuLoadDemo==='function')menuLoadDemo();
  if(typeof xfLoadDemo==='function')xfLoadDemo();
  if(typeof vsLoadDemo==='function')vsLoadDemo();
  if(typeof pmLoadDemo==='function')pmLoadDemo();
  if(typeof vhLoadDemo==='function')vhLoadDemo();
  for(const f of ['kpiLoadDemo','meLoadDemo','poLoadDemo','clLoadDemo','fxLoadDemo'])if(typeof window[f]==='function')window[f]();
}
/* live subscriptions per role */
function xStart(){
  xStop();const u=S._xUnsub=[];
  const onErr=()=>{};
  u.push(db.doc('config/company').onSnapshot(s=>{S.company=s.exists?s.data():{};render()},onErr));
  if(S.role==='admin'){
    u.push(db.collection('users').onSnapshot(s=>{S.users=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
    u.push(db.collection('log').orderBy('at','desc').limit(300).onSnapshot(s=>{S.log=s.docs.map(d=>d.data());render()},onErr));
  }
  if(S.role==='admin'||S.role==='hr'){
    u.push(db.doc('config/companyLogo').onSnapshot(s=>{S.coLogo=s.exists?s.data().data:null;render()},onErr));
  }
  u.push(db.doc('config/catalog').onSnapshot(s=>{S.catalog=s.exists&&Array.isArray(s.data().items)?s.data().items:null;applyCatalog();render()},onErr));
  const list=(col,set)=>{let q=db.collection(col);if(S.role==='branch')q=q.where('branch','==',S.branch);
    u.push(q.onSnapshot(s=>{set(s.docs.map(d=>Object.assign({},d.data(),{id:d.id})));render()},onErr))};
  if(S.role==='branch'||S.role==='manager'||S.role==='admin')
    u.push(db.doc('config/checklist').onSnapshot(s=>{S.checklist=s.exists&&Array.isArray(s.data().items)?s.data().items:null;render()},onErr));
  if(S.role==='branch'){
    list('sales',a=>S.sales=a);list('maintenance',a=>S.maint=a);list('checks',a=>S.checks=a);list('leaveReqs',a=>S.leaveReqs=a);list('staff',a=>S.staff=a);list('shifts',a=>S.shifts=a);list('forms',a=>S.forms=a);
    u.push(db.doc('targets/'+S.branch).onSnapshot(s=>{S.targets={[S.branch]:s.exists?s.data():{}};render()},onErr));
  }
  if(S.role==='manager'){
    list('sales',a=>S.sales=a);list('maintenance',a=>S.maint=a);list('staff',a=>S.staff=a);list('shifts',a=>S.shifts=a);list('leaveReqs',a=>S.leaveReqs=a);
    u.push(db.collection('checks').where('date','==',dayKey(Date.now())).onSnapshot(s=>{S.checks=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  }
  if(S.role==='hr'){
    const out=e=>{if(e&&e.code==='permission-denied')Store.fbSignOut()};   // code changed: sign out
    u.push(db.collection('employees').onSnapshot(s=>{S.emps=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));S._hrEmpsIn=true;hrSyncStaff();render()},out));
    u.push(db.collection('custody').onSnapshot(s=>{S.custody=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('staff').onSnapshot(s=>{S.staff=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));S._hrStaffIn=true;hrSyncStaff();render()},out));
    u.push(db.collection('payroll').onSnapshot(s=>{S.payroll=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('vouchers').onSnapshot(s=>{S.vouchers=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('forms').onSnapshot(s=>{S.forms=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('leaveReqs').onSnapshot(s=>{S.leaveReqs=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('licenses').onSnapshot(s=>{S.licenses=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.collection('advances').onSnapshot(s=>{S.advances=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
    u.push(db.doc('config/hr').onSnapshot(s=>{S.hrCfg=s.exists?s.data():{};render()},()=>{}));
    u.push(db.collection('leaves').onSnapshot(s=>{S.leaves=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
  }
  if(S.role==='manager')
    u.push(db.collection('targets').onSnapshot(s=>{const t={};s.docs.forEach(d=>t[d.id]=d.data());S.targets=t;render()},onErr));
  // warehouse stock (warehouse edits, operations and the dashboard look)
  if(['warehouse','manager','dash'].includes(S.role)){
    u.push(db.collection('stock').onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data());S.stock=m;render()},onErr));
    u.push(db.collection('stockMoves').orderBy('at','desc').limit(200).onSnapshot(s=>{S.stockMoves=s.docs.map(d=>d.data());render()},onErr));
  }
  // finance: money matters (payroll inputs read-only, its own expenses and supplier invoices)
  if(S.role==='finance'){
    const out=e=>{if(e&&e.code==='permission-denied')Store.fbSignOut()};
    for(const [col,key] of [['employees','emps'],['leaves','leaves'],['forms','forms'],['advances','advances'],['payroll','payroll'],['vouchers','vouchers'],['expenses','expenses'],['supInvoices','supInv'],['suppliers','suppliers'],['appPays','appPays'],['sales','sales'],['assets','assets']])
      u.push(db.collection(col).onSnapshot(s=>{S[key]=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},out));
  }
  // item costs (P&L, stock receipts) and finance settings
  if(['finance','warehouse','manager','dash'].includes(S.role))u.push(db.doc('config/costs').onSnapshot(s=>{S.costs=s.exists&&s.data().items?s.data().items:{};render()},onErr));
  if(S.role==='finance'){
    u.push(db.doc('config/finance').onSnapshot(s=>{S.finCfg=s.exists?s.data():{};render()},onErr));
    u.push(db.collection('orders').orderBy('createdAt','desc').limit(1500).onSnapshot(s=>{S.orders=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  }
  // the general manager's dashboard needs a little of everything
  if(S.role==='dash'){
    list('sales',a=>S.sales=a);list('maintenance',a=>S.maint=a);
    u.push(db.collection('targets').onSnapshot(s=>{const t={};s.docs.forEach(d=>t[d.id]=d.data());S.targets=t;render()},onErr));
    for(const [col,key] of [['employees','emps'],['leaveReqs','leaveReqs'],['forms','forms'],['licenses','licenses']])list(col,a=>S[key]=a);
  }
  // each department's archive (HR, operations, finance)
  if(typeof arcStart==='function')arcStart(u,onErr);
  // correspondence between departments, branches and the general manager
  if(typeof mailStart==='function')mailStart(u,onErr);
  // branch stock, production and counts; recipes, made items and units from operations
  if(typeof invStart==='function')invStart(u,onErr);
  // the products menu and what each branch has marked unavailable
  if(typeof menuStart==='function')menuStart(u,onErr);
  // stock transfers between branches
  if(typeof xfStart==='function')xfStart(u,onErr);
  // branch visits by operations
  if(typeof vsStart==='function')vsStart(u,onErr);
  // periodic maintenance and safety dates
  if(typeof pmStart==='function')pmStart(u,onErr);
  // company vehicles (HR)
  if(typeof vhStart==='function')vhStart(u,onErr);
  // indicators, menu engineering, purchase orders, monthly close
  for(const f of ['kpiStart','meStart','poStart','clStart','fxStart'])if(typeof window[f]==='function')window[f](u,onErr);
}
function xStop(){(S._xUnsub||[]).forEach(f=>{try{f()}catch(e){}});S._xUnsub=[];S.stock={};S.stockMoves=[];S.expenses=[];S.supInv=[];S._hrEmpsIn=S._hrStaffIn=false;S.emps=[];S.leaves=[];S.custody=[];S.advances=[];S.licenses=[];S.leaveReqs=[];S.staff=[];S.shifts=[];S.vouchers=[];S.forms=[];S.payroll=[];S.sales=[];S.maint=[];S.checks=[];S.targets={};S.checklist=null}

/* ---------- sales: numbers for a branch and month ---------- */
function salesStats(branch,mk){
  const rows=(S.sales||[]).filter(r=>r.branch===branch&&String(r.date).startsWith(mk));
  let sales=rows.reduce((a,r)=>a+(+r.sales||0),0),inv=rows.reduce((a,r)=>a+(+r.invoices||0),0);
  const fx=!rows.length&&typeof fxMonthOf==='function'?fxMonthOf(branch,mk):null;if(fx){sales=+fx.f.netVat||0;inv=Math.round(+fx.f.orders||0)}
  const td=(S.targets&&S.targets[branch])||{};const tg=(td.m&&td.m[mk])||{};
  const dim=daysInMonth(mk),today=dayKey(Date.now());
  const daysLeft=mk===today.slice(0,7)?dim-(+today.slice(8))+1:(mk>today.slice(0,7)?dim:0);
  const remain=tg.sales?Math.max(0,tg.sales-sales):null;
  return{rows,sales,inv,avg:inv?sales/inv:0,days:fx?daysInMonth(mk):rows.length,foodics:!!fx,target:+tg.sales||0,targetInv:+tg.invoices||0,
    pct:tg.sales?sales/tg.sales:null,pctInv:tg.invoices?inv/tg.invoices:null,remain,
    perDay:remain&&daysLeft>0?remain/daysLeft:null,dim,daysLeft};
}
function kpi(label,value,cls){return`<div class="stat ${cls||''}"><b class="num">${value}</b><span>${esc(label)}</span></div>`}
function progress(p){const v=Math.max(0,Math.min(1,p||0));return`<div class="tg-bar"><i style="width:${Math.round(v*100)}%"></i><span class="num">${Math.round((p||0)*100)}%</span></div>`}

/* daily bar chart (SVG), with the target pace as a dashed line */
function dailyChart(st,mk,metric){
  const dim=st.dim,by={};st.rows.forEach(r=>by[+String(r.date).slice(8)]=r);
  const vals=[];for(let d=1;d<=dim;d++){const r=by[d];vals.push(r?(+r[metric]||0):0)}
  const pace=metric==='sales'?(st.target?st.target/dim:0):(st.targetInv?st.targetInv/dim:0);
  const max=Math.max(1,...vals,pace)*1.15;
  const W=dim*20+44,H=180,top=10,bottom=24,left=40,ch=H-top-bottom,bw=12;
  const y=v=>top+ch-(v/max)*ch;
  const today=dayKey(Date.now()),isNow=today.startsWith(mk),td=+today.slice(8);
  let g='';
  for(let i=0;i<=4;i++){const v=max*i/4,yy=y(v);g+=`<line x1="${left}" x2="${W-4}" y1="${yy}" y2="${yy}" class="ch-grid"/><text x="${left-6}" y="${yy+4}" class="ch-ax" text-anchor="end">${esc(sar(v))}</text>`}
  vals.forEach((v,i)=>{const d=i+1,x=left+i*20+4;const h=Math.max(v?2:0,(v/max)*ch);
    g+=`<rect x="${x}" y="${top+ch-h}" width="${bw}" height="${h}" rx="2" class="${isNow&&d===td?'ch-bar today':'ch-bar'}"><title>${d}: ${esc(sar(v))}</title></rect>`;
    if(d===1||d%5===0)g+=`<text x="${x+bw/2}" y="${H-6}" class="ch-ax" text-anchor="middle">${d}</text>`});
  if(pace)g+=`<line x1="${left}" x2="${W-4}" y1="${y(pace)}" y2="${y(pace)}" class="ch-pace"/>`;
  return`<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(t(metric==='sales'?'sl_sales':'sl_inv'))}" style="min-width:${Math.min(W,640)}px">${g}</svg></div>`;
}

/* ---------- branch: sales tab ---------- */
function salesView(){
  const mk=monthKey(Date.now()),st=salesStats(S.branch,mk);
  const day=S.slDay||dayKey(Date.now());
  const ex=(S.sales||[]).find(r=>r.branch===S.branch&&r.date===day);
  const f=S.slForm&&S.slForm.day===day?S.slForm:{day,sales:ex?ex.sales:'',invoices:ex?ex.invoices:''};S.slForm=f;
  const metric=S.slMetric||'sales';
  const recent=[...st.rows].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_sales')}</h2><div class="row">${ioBtns('sales')}</div></div>
  ${typeof dsrForm==='function'?dsrForm(day,ex):`
  <div class="box sl-form">
    <div class="sl-grid">
      <label><span class="hint">${t('sl_day')}</span><input class="field" type="date" id="slDay" value="${esc(day)}" max="${dayKey(Date.now())}"></label>
      <label><span class="hint">${t('sl_sales')} (${t('sar')})</span><input class="field num" id="slSales" inputmode="decimal" value="${esc(f.sales)}" data-in="slSales" placeholder="0"></label>
      <label><span class="hint">${t('sl_inv')}</span><input class="field num" id="slInv" inputmode="numeric" value="${esc(f.invoices)}" data-in="slInv" placeholder="0"></label>
    </div>
    <div class="row" style="justify-content:space-between"><span class="hint">${f.sales&&f.invoices&&+f.invoices>0?esc(t('sl_avg'))+': <b class="num">'+esc(sar2(+f.sales/+f.invoices))+'</b> '+t('sar'):''}</span>
    <button class="btn btn-sun" data-act="saveSales">${ex?t('sl_update'):t('sl_save')}</button></div>
    ${typeof phBlock==='function'?phBlock('sales',S.branch+'_'+day,{title:'ph_sales',required:'ph_salesNeed',branch:S.branch}):''}
  </div>`}
  <div class="stats">
    ${kpi(t('sl_month'),sar(st.sales)+' '+t('sar'))}${kpi(t('sl_invCount'),sar(st.inv))}${kpi(t('sl_avg'),sar2(st.avg)+' '+t('sar'))}
    ${kpi(t('sl_target'),st.target?sar(st.target)+' '+t('sar'):'—')}
    ${kpi(t('sl_remain'),st.remain==null?'—':sar(st.remain)+' '+t('sar'),st.remain?'hot':'')}
    ${kpi(t('sl_perDay'),st.perDay==null?'—':sar(st.perDay)+' '+t('sar'))}
  </div>
  ${st.target?`<div class="rp-sec"><h3>${t('sl_progress')}</h3>${progress(st.pct)}${st.targetInv?`<div class="hint" style="margin-top:8px">${t('sl_invCount')}: ${sar(st.inv)} / ${sar(st.targetInv)}</div>${progress(st.pctInv)}`:''}</div>`:`<p class="hint" style="margin-top:10px">${esc(t('sl_noTarget'))}</p>`}
  <div class="rp-sec"><div class="row" style="justify-content:space-between"><h3>${t('sl_chart')}</h3>
    <div class="kind"><button aria-pressed="${metric==='sales'}" data-act="slMetric" data-k="sales">${t('sl_sales')}</button><button aria-pressed="${metric==='invoices'}" data-act="slMetric" data-k="invoices">${t('sl_inv')}</button></div></div>
    ${dailyChart(st,mk,metric)}</div>
  ${recent.length?`<div class="rp-sec"><h3>${t('sl_recent')}</h3><div class="scroll"><table class="tbl"><thead><tr><th>${t('sl_day')}</th><th style="text-align:center">${t('sl_sales')}</th><th style="text-align:center">${t('sl_inv')}</th><th style="text-align:center">${t('sl_avg')}</th><th></th></tr></thead><tbody>
    ${recent.map(r=>`<tr><td>${esc(dateLabel(r.date))}</td><td class="n">${sar(r.sales)}</td><td class="n">${sar(r.invoices)}</td><td class="n">${r.invoices?sar2(r.sales/r.invoices):'—'}</td><td><button class="btn btn-ghost" style="min-height:32px;padding:0 10px" data-act="slEdit" data-d="${esc(r.date)}">${t('change')}</button></td></tr>`).join('')}</tbody></table></div></div>`:''}`;
}

/* ---------- operations: all branches this month ---------- */
function targetCard(b,st){
  const head=`<div class="tg-head"><b>${esc(b)}</b>${st.target?`<span class="num">${esc(sar(st.target))} ${t('sar')}</span>`:''}</div>`;
  if(!st.target)return`<div class="tg-card none">${head}<div class="hint">${t('tg_none')}</div><div class="tg-line"><span>${t('tg_achieved')}</span><b class="num">${esc(sar(st.sales))} ${t('sar')}</b></div></div>`;
  const done=st.remain===0;
  return`<div class="tg-card${done?' done':''}">${head}${progress(st.pct)}
    <div class="tg-line"><span>${t('tg_achieved')}</span><b class="num">${esc(sar(st.sales))} ${t('sar')}</b></div>
    <div class="tg-line"><span>${t('sl_remain')}</span><b class="num">${done?esc(t('tg_reached')):esc(sar(st.remain))+' '+t('sar')}</b></div>
    ${st.perDay!=null&&!done?`<div class="tg-line"><span>${t('sl_perDay')}</span><b class="num">${esc(sar(st.perDay))} ${t('sar')}</b></div>`:''}
    ${st.targetInv?`<div class="tg-line"><span>${t('sl_invCount')}</span><b class="num">${esc(sar(st.inv))} / ${esc(sar(st.targetInv))}</b></div>${progress(st.pctInv)}`:''}
  </div>`;
}
function salesAllView(){
  if(S.slView==='days'&&typeof salesLogView==='function')return slViewSwitch()+salesLogView(true);
  const mk=S.slMonth||monthKey(Date.now());
  const today=dayKey(Date.now()),items=checklistItems().length;
  const rows=S.branches.map(b=>{const st=salesStats(b,mk);const ck=(S.checks||[]).find(c=>c.branch===b&&c.date===today);return{b,st,ck:ck?(ck.done||0)/(ck.total||items):null}});
  const act=rows.filter(r=>r.st.days);
  const tot=act.reduce((a,r)=>({s:a.s+r.st.sales,i:a.i+r.st.inv}),{s:0,i:0});
  const avgBranch=act.length?tot.s/act.length:0,avgTicket=tot.i?tot.s/tot.i:0;
  const maxS=Math.max(1,...rows.map(r=>Math.max(r.st.sales,r.st.target)));
  return slViewSwitch()+`<div class="row" style="justify-content:space-between"><h2>${t('tab_sales')}</h2><div class="row">${ioBtns('sales')}<input class="field" type="month" id="slMonth" value="${esc(mk)}" style="width:auto"></div></div>
  <div class="stats">${kpi(t('sl_totalAll'),sar(tot.s)+' '+t('sar'))}${kpi(t('sl_invCount'),sar(tot.i))}${kpi(t('sl_avgBranch'),sar(avgBranch)+' '+t('sar'))}${kpi(t('sl_avg'),sar2(avgTicket)+' '+t('sar'))}</div>
  <div class="rp-sec"><h3>${t('tg_cards')}</h3><div class="tg-cards">${rows.map(r=>targetCard(r.b,r.st)).join('')}</div></div>
  <div class="rp-sec"><h3>${t('sl_byBranch')}</h3><div class="cmp">${rows.map(r=>`<div class="cmp-row"><b>${esc(r.b)}</b><div class="cmp-bar"><i style="width:${Math.round(r.st.sales/maxS*100)}%"></i>${r.st.target?`<u style="inset-inline-start:${Math.round(r.st.target/maxS*100)}%"></u>`:''}</div><span class="num">${sar(r.st.sales)}</span></div>`).join('')}</div></div>
  <div class="rp-sec"><div class="scroll"><table class="tbl"><thead><tr><th>${t('r_branch')}</th><th style="text-align:center">${t('sl_sales')}</th><th style="text-align:center">${t('sl_inv')}</th><th style="text-align:center">${t('sl_avg')}</th><th style="text-align:center">${t('sl_target')}</th><th style="text-align:center">${t('sl_remain')}</th><th style="text-align:center">%</th><th style="text-align:center">${t('ck_today')}</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.b)}</b>${r.st.foodics?` <span class="tag">${esc(t('fx_from'))}</span>`:''}${r.st.days?'':`<div class="hint">${t('sl_noData')}</div>`}</td><td class="n">${sar(r.st.sales)}</td><td class="n">${sar(r.st.inv)}</td><td class="n">${r.st.inv?sar2(r.st.avg):'—'}</td><td class="n">${r.st.target?sar(r.st.target):'—'}</td><td class="n">${r.st.remain==null?'—':sar(r.st.remain)}</td><td class="n ${r.st.pct!=null&&r.st.pct<0.5&&mk===today.slice(0,7)&&+today.slice(8)>15?'mis':''}">${r.st.pct==null?'—':Math.round(r.st.pct*100)+'%'}</td><td class="n">${r.ck==null?'—':Math.round(r.ck*100)+'%'}</td></tr>`).join('')}</tbody></table></div></div>${targetsView()}`;
}

/* ---------- maintenance ---------- */
const mStatusL=s=>t('ms_'+s);
function maintCard(m){
  return`<button class="oc ${m.urgent&&m.status!=='done'?'late':''}" data-act="openMaint" data-id="${esc(m.id)}">
    <span style="min-width:0"><span class="t">${S.role==='branch'?esc(t('mc_'+(m.cat||'other'))):esc(m.branch)} ${S.role!=='branch'?`<span class="tag">${esc(t('mc_'+(m.cat||'other')))}</span>`:''}${m.urgent?`<span class="tag ret">${t('m_urgent')}</span>`:''}</span>
      <span class="s" dir="auto">${esc(String(m.desc||'').slice(0,90))}</span> <span class="s">${esc(when(m.createdAt))}${m.photos?' · '+esc(t('m_photosN',{n:m.photos})):''}</span></span>
    <span class="side"><span class="pill ms-${esc(m.status)}">${esc(mStatusL(m.status))}</span></span></button>`;
}
function maintView(){
  const d=S.mDraft||(S.mDraft={desc:'',cat:'other',urgent:false,photos:[]});
  const list=[...(S.maint||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return`<h2>${t('tab_maint')}</h2>
  <div class="box m-form">
    <div class="sl-grid">
      <label><span class="hint">${t('m_cat')}</span><select class="field" id="mCat">${MAINT_CATS.map(c=>`<option value="${c}" ${d.cat===c?'selected':''}>${esc(t('mc_'+c))}</option>`).join('')}</select></label>
      <label class="row" style="gap:8px;align-self:end;padding-bottom:10px"><input type="checkbox" id="mUrgent" ${d.urgent?'checked':''} style="width:20px;height:20px;accent-color:var(--late)"><b>${t('m_urgent')}</b></label>
    </div>
    <label><span class="hint">${t('m_desc')}</span><textarea class="field" id="mDesc" rows="3" dir="auto" data-in="mDesc" placeholder="${esc(t('m_descPh'))}">${esc(d.desc)}</textarea></label>
    <div class="m-photos">${d.photos.map((p,i)=>`<div class="m-thumb"><img src="${p}" alt=""><button class="x" data-act="mDelPhoto" data-i="${i}" aria-label="${esc(t('del'))}">×</button></div>`).join('')}
      ${d.photos.length<3?`<label class="m-add"><input type="file" id="mFile" accept="image/*" capture="environment" ${S.mBusy?'disabled':''}><span>${S.mBusy?esc(t('checking')):'+ '+esc(t('m_addPhoto'))}</span></label>`:''}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn btn-sun" data-act="sendMaint" ${d.desc.trim()&&!S.busy&&!S.mBusy?'':'disabled'}>${t('m_send')}</button></div>
  </div>
  <div class="rp-sec"><h3>${t('m_mine')}</h3><div class="list" style="margin-top:10px">${list.length?list.map(maintCard).join(''):`<div class="empty">${esc(t('m_none'))}</div>`}</div></div>`;
}
function maintAllView(){
  const f=S.mFilter||'open';
  const all=[...(S.maint||[])].sort((a,b)=>(+!!b.urgent - +!!a.urgent)||String(b.createdAt).localeCompare(String(a.createdAt)));
  const list=f==='all'?all:f==='done'?all.filter(m=>m.status==='done'):all.filter(m=>m.status!=='done');
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_maint')}</h2><div class="row">${ioBtns('maint')}</div></div><div class="filters">${['open','done','all'].map(k=>`<button class="chip" aria-pressed="${f===k}" data-act="mFilter" data-k="${k}">${t(k==='open'?'f_active':'f_'+k)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(maintCard).join(''):`<div class="empty">${esc(t('m_none'))}</div>`}</div>`;
}
function maintSheet(){
  const m=(S.maint||[]).find(x=>x.id===S.openMaint);if(!m)return'';
  const ph=S.mPhotos&&S.mPhotos[m.id];
  const ops=S.role==='manager';
  const steps=['open','progress','done'];
  return`<div class="veil" data-act="veil"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-brand"><span class="logo sm" role="img" aria-label="مسكوب MASKOB"></span></div>
  <div class="sh-head"><div class="row"><div style="flex:1;min-width:0"><div class="row" style="gap:8px"><h2>${esc(m.branch)}</h2><span class="tag">${esc(t('mc_'+(m.cat||'other')))}</span>${m.urgent?`<span class="tag ret">${t('m_urgent')}</span>`:''}<span class="pill ms-${esc(m.status)}">${esc(mStatusL(m.status))}</span></div>
    <div class="hint">${esc(when(m.createdAt))}</div></div><button class="x" data-act="close" aria-label="${esc(t('close'))}">×</button></div></div>
  <div class="sh-body">
    <div class="box"><h4>${t('m_desc')}</h4><div dir="auto" style="white-space:pre-wrap">${esc(m.desc)}</div></div>
    ${m.photos?`<div class="m-photos big">${ph?ph.map(p=>`<a href="${p}" target="_blank" rel="noopener" class="m-thumb"><img src="${p}" alt=""></a>`).join(''):`<span class="hint">${t('checking')}</span>`}</div>`:''}
    ${m.opsNote&&!ops?`<div class="box"><h4>${t('m_reply')}</h4><div dir="auto">${esc(m.opsNote)}</div></div>`:''}
    ${ops?`<label class="box" style="display:block"><h4>${t('m_reply')}</h4><textarea class="field" id="mReply" rows="2" dir="auto" data-in="mReply">${esc(S.mReply!=null?S.mReply:(m.opsNote||''))}</textarea></label>`:''}
  </div>
  ${ops?`<div class="sh-foot">${steps.map(s=>`<button class="btn ${m.status===s?'btn-navy':'btn-ghost'}" data-act="mStatus" data-k="${s}">${esc(mStatusL(s))}</button>`).join('')}<span class="spacer"></span><button class="btn btn-sun" data-act="mSaveReply">${t('waSave')}</button></div>`:''}
  </div></div>`;
}
/* shrink a photo on the phone before upload: max 1280px, JPEG, under ~600 KB of text */
async function compressImage(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const sc=Math.min(1,1280/Math.max(img.width,img.height));const w=Math.round(img.width*sc),h=Math.round(img.height*sc);
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    let q=0.72,d=c.toDataURL('image/jpeg',q);while(d.length>600000&&q>0.3){q-=0.1;d=c.toDataURL('image/jpeg',q)}
    return d;
  }finally{URL.revokeObjectURL(url)}
}

/* ---------- daily inspection checklist ---------- */
function checksView(){
  const today=dayKey(Date.now()),id=S.branch+'_'+today;
  const doc=(S.checks||[]).find(c=>c.id===id)||{};
  const marks=S.ckDraft&&S.ckDraft.id===id?S.ckDraft.items:(doc.items||{});
  const items=checklistItems();const done=items.filter(x=>marks[itemKey(x)]).length;
  const hist=[];for(let i=6;i>=0;i--){const k=dayKey(Date.now()-i*864e5);const c=(S.checks||[]).find(x=>x.id===S.branch+'_'+k);hist.push({k,p:c&&c.total?c.done/c.total:0,has:!!c})}
  return`<h2>${t('tab_checks')}</h2><p class="hint">${esc(dateLabel(today))}</p>
  <div class="prog" style="margin-top:10px"><span class="num">${esc(t('ck_done',{d:done,n:items.length}))}</span><div class="bar"><i style="width:${items.length?Math.round(done/items.length*100):0}%"></i></div></div>
  <div class="lines">${items.map(x=>{const on=!!marks[itemKey(x)];return`<div class="ln has-chk ${on?'done':''}"><button class="chk ${on?'on':''}" data-act="ckToggle" data-k="${esc(itemKey(x))}" aria-pressed="${on}">✓</button><div class="nm" dir="auto">${esc(x)}</div><span></span></div>`}).join('')}</div>
  ${typeof phBlock==='function'?phBlock('checks',id,{instant:true,branch:S.branch,title:'ph_checks'}):''}
  <div class="rp-sec"><h3>${t('ck_week')}</h3><div class="ck-week">${hist.map(h=>`<div class="ck-day"><div class="ck-col"><i style="height:${Math.round(h.p*100)}%"></i></div><span>${esc(weekdayName(fromKey(h.k).getDay()))}</span><b class="num">${h.has?Math.round(h.p*100)+'%':'—'}</b></div>`).join('')}</div></div>`;
}

/* ---------- settings (system admin): targets + checklist items ---------- */
const monthName=mk=>{try{return fromKey(mk+'-01').toLocaleDateString(LOCALE[LANG],{month:'long',year:'numeric'})}catch(e){return mk}};
const prevMonth=mk=>{const d=fromKey(mk+'-01');d.setMonth(d.getMonth()-1);return monthKey(d)};
const tgFor=(b,mk)=>{const td=(S.targets&&S.targets[b])||{};return(td.m&&td.m[mk])||{}};
function targetsView(){
  const mk=S.slMonth||monthKey(Date.now());
  return`<div class="row" style="justify-content:space-between;margin-top:28px"><h2>${t('tg_title')} — ${esc(monthName(mk))}</h2><div class="row">${ioBtns('targets')}<button class="btn btn-ghost rp-btn" data-act="copyPrevTargets">${t('tg_copyPrev')}</button></div></div><div class="codes">${S.branches.map((b,i)=>{const tg=tgFor(b,mk);const d=(S.tgDraft&&S.tgDraft[mk+'|'+b])||{};
    return`<div class="code"><div><b>${esc(b)}</b></div><div class="wide"><input class="field num" inputmode="numeric" id="tgS-${i}" placeholder="${esc(t('tg_sales'))}" value="${esc(d.sales!=null?d.sales:(tg.sales||''))}" data-in="tgS" data-b="${esc(b)}"><input class="field num" inputmode="numeric" id="tgI-${i}" placeholder="${esc(t('tg_inv'))}" value="${esc(d.invoices!=null?d.invoices:(tg.invoices||''))}" data-in="tgI" data-b="${esc(b)}"><button class="btn btn-navy" data-act="saveTarget" data-b="${esc(b)}">${t('waSave')}</button></div></div>`}).join('')}</div>`;
}
function checklistEditView(){
  const v=S.ckEdit!=null?S.ckEdit:checklistItems().join('\n');
  return`<h2 style="margin-top:28px">${t('ck_items')}</h2><div class="codes"><div class="code"><textarea class="field" id="ckItems" rows="8" dir="auto" data-in="ckEdit">${esc(v)}</textarea><div class="wide"><button class="btn btn-navy" data-act="saveChecklist">${t('waSave')}</button></div></div></div>`;
}

/* ---------- actions ---------- */
Object.assign(A,{
  async saveSales(){
    const f=S.slForm||{};const day=(document.getElementById('slDay')||{}).value||dayKey(Date.now());
    const sales=num(f.sales),inv=Math.round(num(f.invoices));
    if(!(sales>0)||!(inv>0)){toast(t('sl_need'));return}
    if(day>dayKey(Date.now())){toast(t('sl_future'));return}
    const id=S.branch+'_'+day;
    /* the photo of the cashier's closing report must come with the figures */
    const pn=typeof phCount==='function'?phCount('sales',id):null;
    if(pn===0){toast(t('ph_salesNeed'));return}
    const data={branch:S.branch,date:day,sales,invoices:inv,at:nowIso()};if(pn!=null)data.photos=pn;
    guard(async()=>{await X.put('sales',id,data);if(typeof phCommit==='function')await phCommit('sales',id,id,S.branch);},()=>t('sl_saved'));
  },
  slEdit(el){S.slDay=el.dataset.d;S.slForm=null;S.dsr=null;render();window.scrollTo(0,0)},
  slMetric(el){S.slMetric=el.dataset.k;render()},
  openMaint(el){
    S.openMaint=el.dataset.id;S.mReply=null;render();
    const m=(S.maint||[]).find(x=>x.id===S.openMaint);
    if(m&&m.photos&&!(S.mPhotos&&S.mPhotos[m.id]))X.photos(m.id).then(p=>{(S.mPhotos||(S.mPhotos={}))[m.id]=p;render()}).catch(()=>{});
  },
  mDelPhoto(el){S.mDraft.photos.splice(+el.dataset.i,1);render()},
  mFilter(el){S.mFilter=el.dataset.k;render()},
  async sendMaint(){
    const d=S.mDraft;if(!d||!d.desc.trim())return;
    const id='M-'+dayKey(Date.now()).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
    const tm=nowIso();const photos=[...d.photos];
    guard(async()=>{
      await X.put('maintenance',id,{branch:S.branch,desc:d.desc.trim(),cat:d.cat,urgent:!!d.urgent,status:'open',createdAt:tm,updatedAt:tm,photos:photos.length});
      for(let i=0;i<photos.length;i++)await X.photo(id,'p'+i,photos[i],S.branch);
      S.mDraft={desc:'',cat:'other',urgent:false,photos:[]};
    },()=>t('m_sent'));
  },
  mStatus(el){const id=S.openMaint;if(!id)return;guard(()=>X.upd('maintenance',id,{status:el.dataset.k,updatedAt:nowIso()}),()=>t('m_updated'))},
  mSaveReply(){const id=S.openMaint;if(!id)return;const v=(S.mReply!=null?S.mReply:'').trim();guard(()=>X.upd('maintenance',id,{opsNote:v,updatedAt:nowIso()}),()=>t('m_updated'))},
  ckToggle(el){
    const today=dayKey(Date.now()),id=S.branch+'_'+today;
    const doc=(S.checks||[]).find(c=>c.id===id)||{};
    if(!S.ckDraft||S.ckDraft.id!==id)S.ckDraft={id,items:Object.assign({},doc.items||{})};
    const k=el.dataset.k;S.ckDraft.items[k]=!S.ckDraft.items[k];if(!S.ckDraft.items[k])delete S.ckDraft.items[k];
    render();
    clearTimeout(S._ckT);S._ckT=setTimeout(()=>{const items=checklistItems();const marks=S.ckDraft.items;
      const done=items.filter(x=>marks[itemKey(x)]).length;
      X.put('checks',id,{branch:S.branch,date:today,items:marks,done,total:items.length,at:nowIso()}).catch(()=>toast(t('saveFail')))},600);
  },
  saveTarget(el){const b=el.dataset.b,mk=S.slMonth||monthKey(Date.now());const key=mk+'|'+b;const d=(S.tgDraft&&S.tgDraft[key])||{};const cur=tgFor(b,mk);
    const sales=num(d.sales!=null?d.sales:cur.sales),invoices=Math.round(num(d.invoices!=null?d.invoices:cur.invoices));
    guard(async()=>{await X.target(b,mk,{sales,invoices});if(S.tgDraft)delete S.tgDraft[key]},()=>t('tg_saved'))},
  copyPrevTargets(){const mk=S.slMonth||monthKey(Date.now()),pm=prevMonth(mk);
    const todo=S.branches.filter(b=>{const p=tgFor(b,pm);return(p.sales||p.invoices)});
    if(!todo.length){toast(t('tg_nothing'));return}
    guard(async()=>{for(const b of todo){const p=tgFor(b,pm);await X.target(b,mk,{sales:+p.sales||0,invoices:+p.invoices||0})}S.tgDraft={}},()=>t('tg_copied',{n:todo.length}))},
  saveChecklist(){const items=String(S.ckEdit!=null?S.ckEdit:checklistItems().join('\n')).split('\n').map(x=>x.trim()).filter(Boolean).slice(0,40);
    if(!items.length){toast(t('ck_needOne'));return}
    guard(async()=>{await X.checklist(items);S.ckEdit=null},()=>t('ck_saved'))}
});
document.addEventListener('input',ev=>{
  const el=ev.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='slSales'||k==='slInv'){S.slForm=S.slForm||{day:S.slDay||dayKey(Date.now())};S.slForm[k==='slSales'?'sales':'invoices']=el.value;return}
  if(k==='mDesc'){S.mDraft.desc=el.value;const b=document.querySelector('[data-act="sendMaint"]');if(b)b.disabled=!el.value.trim();return}
  if(k==='mReply'){S.mReply=el.value;return}
  if(k==='ckEdit'){S.ckEdit=el.value;return}
  if(k==='tgS'||k==='tgI'){const b=(S.slMonth||monthKey(Date.now()))+'|'+el.dataset.b;S.tgDraft=S.tgDraft||{};S.tgDraft[b]=S.tgDraft[b]||{};S.tgDraft[b][k==='tgS'?'sales':'invoices']=el.value;return}
});
document.addEventListener('change',async ev=>{
  const el=ev.target;
  if(el.id==='slDay'){S.slDay=el.value;S.slForm=null;S.dsr=null;render();return}
  if(el.id==='slMonth'){if(/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.slMonth=el.value;render()}return}
  if(el.id==='mCat'){S.mDraft.cat=el.value;return}
  if(el.id==='mUrgent'){S.mDraft.urgent=el.checked;return}
  if(el.id==='mFile'&&el.files&&el.files[0]){
    S.mBusy=true;render();
    try{const d=await compressImage(el.files[0]);if(S.mDraft.photos.length<3)S.mDraft.photos.push(d)}catch(e){toast(t('m_photoFail'))}
    S.mBusy=false;render();
  }
});


/* the sales report: month summary, or each day with its closing photos and finance's review */
function slViewSwitch(){const v=S.slView==='days'?'days':'sum',n=typeof slWaiting==='function'?slWaiting():0;
  return`<div class="kind" style="margin-bottom:12px">${[['sum','sl_vSum'],['days','sl_vDays']].map(([k,l])=>`<button aria-pressed="${v===k}" data-act="slView" data-k="${k}">${esc(t(l))}${k==='days'&&n?` <span class="badge num">${n}</span>`:''}</button>`).join('')}</div>`}
A.slView=el=>{S.slView=el.dataset.k;render()};
