/* Maskob — the Foodics "Sales by branch" report (المبيعات حسب الفرع) in and out, for finance (and operations reading).
   Import: one day → that day's sales of each branch (a branch's own daily closing is kept; Foodics figures are added
   beside it); a month or longer → a Foodics summary kept for matching against the daily closings, with the gap per branch.
   Export: the sales report in the same columns and order as Foodics.
   config/foodicsMap: {map:{ref or name: branch}}       Foodics branch → app branch, remembered
   fsales/{id}: {ref, name, branch, from, to, f:{…report fields}, at, by} */
const FX_COLS=[['branch','الفرع'],['ref','مرجع الفرع'],['gross','إجمالي المبيعات'],['grossPct','(إجمالي المبيعات %)'],['netVat','صافي المبيعات مع الضريبة'],['tax','الضرائب'],['disc','مبلغ الخصم'],
  ['grossEx','إجمالي المبيعات من غير ضريبة'],['net','صافي المبيعات'],['netPct','(صافي المبيعات %)'],['orders','عدد الطلبات'],['avgOrder','متوسط الطلب'],['visitors','عدد الزوار'],['avgVisitor','المتوسط للزائر'],
  ['customers','عدد العملاء'],['qty','صافي الكمية'],['cost','التكلفة'],['ret','مبلغ الإرجاع'],['retQty','كمية المرتجع'],['cancel','مبلغ الإلغاء'],['cancelQty','كمية الإلغاء'],['profit','الربح'],['fees','الرسوم'],['round','مبلغ التقريب'],['tips','الإكراميات']];
const fxNum=v=>{const n=parseFloat(String(v??'').replace(/[,%\s]/g,''));return isFinite(n)?n:0};
const fxMap=()=>((S.foodicsMap||{}).map)||{};
/* a Foodics branch name → app branch: remembered choice, else the app branch whose name it contains */
function fxBranch(ref,name){const m=fxMap();if(m[ref]&&S.branches.includes(m[ref]))return m[ref];if(m[name]&&S.branches.includes(m[name]))return m[name];
  const n=typeof meNorm==='function'?meNorm(name):String(name);return S.branches.find(b=>{const x=typeof meNorm==='function'?meNorm(b):b;return x&&(n===x||n.includes(x)||x.includes(n.replace(/^فرع\s*/,'')))})||''}
/* the sheet → {from, to, rows:[{ref, name, f}]} */
function fxParse(aoa){let from='',to='',hi=-1;
  for(let r=0;r<Math.min(aoa.length,12);r++){const row=aoa[r].map(x=>String(x||'').trim());
    if(/النطاق الزمني|date range/i.test(row[0]||'')){const m=String(row[1]||'').match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);if(m){from=m[1];to=m[2]}}
    if(row.includes('الفرع')&&row.some(x=>x.includes('إجمالي المبيعات'))){hi=r;break}}
  if(hi<0)return null;const hdr=aoa[hi].map(x=>String(x||'').trim()),col=lbl=>hdr.indexOf(lbl),rows=[];
  for(let r=hi+1;r<aoa.length;r++){const row=aoa[r];const name=String(row[col('الفرع')]||'').trim();if(!name||/^(total|الإجمالي|المجموع)/i.test(name))continue;
    const f={};FX_COLS.forEach(([k,l])=>{if(k==='branch'||k==='ref')return;const c=col(l);if(c>=0)f[k]=fxNum(row[c])});
    rows.push({ref:String(row[col('مرجع الفرع')]||'').trim(),name,f})}
  return{from,to,rows}}
async function fxImport(file){await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''});const P=fxParse(aoa);if(!P||!P.rows.length)throw new Error('format');
  if(!P.from||!P.to)throw new Error('range');
  const at=nowIso(),by=S.userName||roleL(S.realRole||S.role),unmatched=[];let n=0;
  for(const r of P.rows){const b=fxBranch(r.ref,r.name);if(!b){unmatched.push(r);continue}
    if(P.from===P.to){const id=b+'_'+P.from,old=(S.sales||[]).find(x=>x.id===id);
      const data=old&&old.dsr?{foodics:r.f}:{branch:b,date:P.from,sales:r.f.netVat||r.f.gross||0,invoices:Math.round(r.f.orders||0),foodics:r.f,src:'foodics',at};
      if(S.fb){if(old)await db.doc('sales/'+id).update(data);else await db.doc('sales/'+id).set(data)}
      else MEMSET('sales',MEM('sales').filter(x=>x.id!==id).concat([Object.assign({},old||{},data,{id})]))}
    else{const id=(r.ref||b)+'_'+P.from+'_'+P.to,data={ref:r.ref,name:r.name,branch:b,from:P.from,to:P.to,f:r.f,at,by};
      if(S.fb)await db.doc('fsales/'+id).set(data);else MEMSET('fsales',MEM('fsales').filter(x=>x.id!==id).concat([Object.assign({id},data)]))}
    n++}
  if(!S.fb)xLoadDemo();S.fxPending=unmatched.length?{P,rows:unmatched}:null;return{n,day:P.from===P.to,unmatched:unmatched.length}}
/* matching a Foodics period with the daily closings */
function fxMatchRows(){return(S.fsales||[]).map(x=>{const own=(S.sales||[]).filter(r=>r.branch===x.branch&&r.date>=x.from&&r.date<=x.to);
  const ours=own.reduce((s0,r)=>s0+(+r.sales||0),0),theirs=+x.f.netVat||0;return Object.assign({},x,{ours,theirs,days:own.length,diff:ours-theirs,pct:theirs?(ours-theirs)/theirs*100:null})})
  .sort((a,c)=>String(c.to).localeCompare(String(a.to))||String(a.branch).localeCompare(String(c.branch),'ar'))}
function fxSection(){const L=fxMatchRows(),P=S.fxPending,fin=S.role==='finance';
  return`<div class="rp-sec"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3>${t('fx_title')}</h3>${fin?`<div class="row" style="gap:6px"><label class="btn btn-navy rp-btn" style="cursor:pointer">${typeof ico==='function'?ico('upload','b-ic'):''}${t('fx_import')}<input type="file" id="fxFile" accept=".xls,.xlsx,.csv,.html" hidden></label><button class="btn btn-ghost rp-btn" data-act="fxExport">${t('fx_export')}</button></div>`:''}</div>
  <p class="hint">${esc(t('fx_hint'))}</p>
  ${P?`<div class="box" style="border-color:var(--late)"><b>${esc(t('fx_unmatched',{n:P.rows.length}))}</b>${P.rows.map((r,i)=>`<div class="row" style="gap:8px;margin-top:6px"><span style="flex:1">${esc(r.name)} <span class="hint num" dir="ltr">${esc(r.ref)}</span></span><select class="field" data-in="fxMap" data-i="${i}" style="width:auto"><option value="">${esc(t('inv_pick'))}</option>${S.branches.map(b=>`<option>${esc(b)}</option>`).join('')}</select></div>`).join('')}
    <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sun rp-btn" data-act="fxMapSave">${t('fx_mapSave')}</button></div></div>`:''}
  ${L.length?`<div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('r_branch')}</th><th>${t('fx_period')}</th><th>${t('fx_theirs')}</th><th>${t('fx_ours')}</th><th>${t('fx_diff')}</th></tr></thead><tbody>
  ${L.map(x=>`<tr><td><b>${esc(x.branch)}</b><div class="hint">${esc(x.name)}</div></td><td class="hint">${esc(x.from)} → ${esc(x.to)}<div>${esc(t('kp_days',{n:x.days}))}</div></td><td class="n">${esc(sar2(x.theirs))}</td><td class="n">${esc(sar2(x.ours))}</td>
    <td class="n"><span class="kpi-v ${x.pct==null?'':Math.abs(x.pct)<=1?'ok':Math.abs(x.pct)<=3?'mid':'bad'}">${esc(sar2(x.diff))}${x.pct!=null?' ('+esc(sar2(x.pct))+'%)':''}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('fx_none'))}</div>`}</div>`}
/* export: our sales in the Foodics columns for the chosen month */
function fxExportRows(mk){const vat=1+VAT_RATE/100;const R=S.branches.map(b=>{const L=(S.sales||[]).filter(r=>r.branch===b&&String(r.date).startsWith(mk));
    const sum=k=>L.reduce((s0,r)=>s0+(+((r.foodics||{})[k])||0),0);
    const netVat=L.reduce((s0,r)=>s0+(+r.sales||0),0),orders=L.reduce((s0,r)=>s0+(+r.invoices||0),0),disc=sum('disc'),tax=netVat-netVat/vat;
    return{b,f:{gross:netVat+disc,netVat,tax,disc,grossEx:(netVat+disc)/vat,net:netVat/vat,orders,avgOrder:orders?netVat/orders:0,visitors:sum('visitors')||orders,customers:sum('customers'),qty:sum('qty'),ret:sum('ret'),retQty:sum('retQty'),cancel:sum('cancel'),cancelQty:sum('cancelQty'),fees:sum('fees'),round:sum('round'),tips:sum('tips')}}});
  const totG=R.reduce((s0,x)=>s0+x.f.gross,0),totN=R.reduce((s0,x)=>s0+x.f.net,0);
  R.forEach(x=>{x.f.grossPct=totG?(x.f.gross/totG*100).toFixed(2)+' %':'0 %';x.f.netPct=totN?(x.f.net/totN*100).toFixed(2)+' %':'0 %';x.f.avgVisitor=x.f.visitors?x.f.netVat/x.f.visitors:0});
  return R}
Object.assign(A,{
  fxExport(){const mk=S.slMonth||monthKey(Date.now()),[y,m]=mk.split('-').map(Number),last=String(daysInMonth(mk)).padStart(2,'0');
    const R=fxExportRows(mk),r5=v=>typeof v==='number'?Math.round(v*100000)/100000:v;
    const rows=[['Title','Value'],['النطاق الزمني',`${mk}-01 - ${mk}-${last}`],FX_COLS.map(x=>x[1]),...R.map(x=>FX_COLS.map(([k])=>k==='branch'?x.b:k==='ref'?(Object.keys(fxMap()).find(r=>fxMap()[r]===x.b)||''):r5(x.f[k]??0)))];
    saveXlsx('المبيعات حسب الفرع Report '+mk+'.xlsx',[{name:'Sheet1',headers:['المبيعات حسب الفرع Report'],rows,plain:true}])},
  fxMapSave(){const P=S.fxPending;if(!P)return;const sel=S.fxSel||{},map=Object.assign({},fxMap());let any=false;
    P.rows.forEach((r,i)=>{if(sel[i]){map[r.ref||r.name]=sel[i];any=true}});if(!any)return;
    guard(async()=>{if(S.fb)await db.doc('config/foodicsMap').set({map});else MEMSET('foodicsMap',{map});S.foodicsMap={map};
      /* the rows just chosen are saved now */
      const keep=P.rows.filter((r,i)=>!sel[i]);for(const r of P.rows.filter((r,i)=>sel[i])){const b=map[r.ref||r.name];
        if(P.P.from===P.P.to){const id=b+'_'+P.P.from,old=(S.sales||[]).find(x=>x.id===id),data=old&&old.dsr?{foodics:r.f}:{branch:b,date:P.P.from,sales:r.f.netVat||0,invoices:Math.round(r.f.orders||0),foodics:r.f,src:'foodics',at:nowIso()};
          if(S.fb){if(old)await db.doc('sales/'+id).update(data);else await db.doc('sales/'+id).set(data)}else MEMSET('sales',MEM('sales').filter(x=>x.id!==id).concat([Object.assign({},old||{},data,{id})]))}
        else{const id=(r.ref||b)+'_'+P.P.from+'_'+P.P.to,data={ref:r.ref,name:r.name,branch:b,from:P.P.from,to:P.P.to,f:r.f,at:nowIso(),by:S.userName||''};
          if(S.fb)await db.doc('fsales/'+id).set(data);else MEMSET('fsales',MEM('fsales').filter(x=>x.id!==id).concat([Object.assign({id},data)]))}}
      if(!S.fb)xLoadDemo();S.fxPending=keep.length?{P:P.P,rows:keep}:null;S.fxSel={}},()=>t('st_saved'))}
});
function fxLoadDemo(){if(['finance','manager'].includes(S.role)){S.fsales=MEM('fsales');const m=MEM('foodicsMap');S.foodicsMap=m&&!Array.isArray(m)?m:{}}}
function fxStart(u,onErr){if(!['finance','manager'].includes(S.role))return;
  u.push(db.collection('fsales').onSnapshot(s=>{S.fsales=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  u.push(db.doc('config/foodicsMap').onSnapshot(s=>{S.foodicsMap=s.exists?s.data():{};render()},onErr))}
document.addEventListener('change',async ev=>{const el=ev.target;
  if(el.dataset&&el.dataset.in==='fxMap'){(S.fxSel||(S.fxSel={}))[+el.dataset.i]=el.value;return}
  if(el.id!=='fxFile'||!el.files||!el.files[0])return;
  try{const r=await fxImport(el.files[0]);toast(t(r.day?'fx_doneDay':'fx_donePeriod',{n:r.n})+(r.unmatched?' · '+t('fx_unmatched',{n:r.unmatched}):''))}
  catch(e){toast(t(String(e&&e.message)==='range'?'fx_noRange':String(e&&e.message)==='format'?'fx_badFile':'saveFail'))}el.value='';render()});

/* the sales report shows the Foodics matching under the month summary */
if(typeof salesAllView==='function'){const _sa=salesAllView;salesAllView=function(){const h=_sa();return S.slView==='days'?h:h+fxSection()}}
