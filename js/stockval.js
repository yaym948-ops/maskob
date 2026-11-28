/* Maskob — branch stock in riyals (تقييم المخزون): value at unit cost, use in the last 30 days, days of cover, dead stock
   (nothing used in 60 days), the month's actual use against the theoretical cost of what was sold, and high-value items
   that branches count every day (config/invUnits.hv: [item ids]). */
const SV_COVER=[4,8];          // healthy days of cover; above 12 → review buying
const svHv=()=>((S.invUnits||{}).hv)||[];
/* used quantity of an item in a branch between two days: count shortfalls, production use, waste */
function svUsed(b,id,from,to){return(S.bmoves||[]).filter(m=>m.branch===b&&m.item===id&&String(m.at).slice(0,10)>=from&&String(m.at).slice(0,10)<=to&&['count','prod_out','waste','sale'].includes(m.kind)&&m.qty<0).reduce((s0,m)=>s0-m.qty,0)}
function svRows(b){const st=(S.bstock||{})[b]||{},today=dayKey(Date.now()),d30=addDays(today,-30),d60=addDays(today,-60);
  return Object.keys(st).map(id=>{const qty=+st[id]||0,c=typeof unitCostOf==='function'?unitCostOf(id):(+itemCost(id)||0),used=svUsed(b,id,d30,today),daily=used/30;
    const last=(S.bmoves||[]).filter(m=>m.branch===b&&m.item===id&&m.qty<0).map(m=>String(m.at).slice(0,10)).sort().pop()||'';
    const firstIn=(S.bmoves||[]).filter(m=>m.branch===b&&m.item===id).map(m=>String(m.at).slice(0,10)).sort()[0]||today;
    return{id,it:invItem(id),qty,cost:c,value:qty*c,used,cover:daily>0?qty/daily:null,dead:qty>0&&(!last||last<d60)&&firstIn<=d60,hv:svHv().includes(id)}}).sort((a,c)=>c.value-a.value)}
/* the month's actual use in riyals, and the theoretical cost of the products sold (menu engineering upload) */
function svMonth(b,mk){const from=mk+'-01',to=mk+'-31';let actual=0;
  (S.bmoves||[]).filter(m=>m.branch===b&&String(m.at).startsWith(mk)&&['count','prod_out','waste','sale'].includes(m.kind)&&m.qty<0&&!(m.kind==='prod_out')).forEach(m=>{actual+=(-m.qty)*(typeof unitCostOf==='function'?unitCostOf(m.item):(+itemCost(m.item)||0))});
  let theo=null;const doc=(S.psales||[]).find(x=>x.branch===b&&x.month===mk);
  if(doc&&typeof prodCost==='function'){theo=0;(doc.rows||[]).forEach(r=>{const p=(S.products||[]).find(x=>x.id===(r.pid||(typeof meMatch==='function'?meMatch(r.name):'')));if(p)theo+=prodCost(p)*(+r.qty||0)})}
  const sales=(S.sales||[]).filter(r=>r.branch===b&&String(r.date).startsWith(mk)).reduce((s0,r)=>s0+(+r.sales||0),0)/(1+VAT_RATE/100);
  return{actual,theo,sales}}
function stockValView(){const b=S.svBranch&&S.branches.includes(S.svBranch)?S.svBranch:S.branches[0];if(!b)return'';const mk=S.svMonth||monthKey(Date.now());
  const R=svRows(b),total=R.reduce((s0,x)=>s0+x.value,0),dead=R.filter(x=>x.dead),M=svMonth(b,mk);
  const pct=v=>M.sales?sar2(v/M.sales*100)+'%':'—';
  return`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_stockVal')}</h2><div class="row" style="gap:6px"><button class="btn btn-ghost rp-btn" data-act="svXls">${t('xlsExport')}</button><input class="field" type="month" id="svMonth" value="${esc(mk)}" style="width:auto"></div></div>
  <div class="filters">${S.branches.map(x=>`<button class="chip" aria-pressed="${x===b}" data-act="svBranch" data-k="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="stats">${kpi(t('sv_value'),sar2(total)+' '+t('sar'))}${kpi(t('sv_actual'),sar2(M.actual)+' · '+pct(M.actual))}${kpi(t('sv_theo'),M.theo==null?'—':sar2(M.theo)+' · '+pct(M.theo))}${kpi(t('sv_gap'),M.theo==null?'—':sar2(M.actual-M.theo),M.theo!=null&&M.actual-M.theo>M.sales*0.02?'bad':'')}</div>
  <p class="hint">${esc(t('sv_hint'))}</p>
  ${dead.length?`<div class="box" style="border-color:var(--late)"><b>${esc(t('sv_dead',{n:dead.length,v:sar2(dead.reduce((s0,x)=>s0+x.value,0))}))}</b><div class="hint">${dead.map(x=>esc(x.it.name)).join('، ')}</div></div>`:''}
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('inv_item')}</th><th>${t('inv_qty')}</th><th>${t('sv_unitCost')}</th><th>${t('sv_value')}</th><th>${t('sv_used30')}</th><th>${t('sv_cover')}</th><th>${t('sv_hv')}</th></tr></thead><tbody>
  ${R.map(x=>`<tr><td><b>${esc(x.it.name)}</b> <span class="hint">${esc(x.it.unit)}</span>${x.dead?` <span class="tag ret">${esc(t('sv_deadTag'))}</span>`:''}</td><td class="n">${esc(invFmt(x.qty))}</td><td class="n">${x.cost?esc(sar2(x.cost)):'—'}</td><td class="n"><b>${esc(sar2(x.value))}</b></td><td class="n">${esc(invFmt(x.used))}</td>
    <td class="n">${x.cover==null?'—':`<span class="kpi-v ${x.cover>12?'bad':x.cover>SV_COVER[1]?'mid':'ok'}">${esc(sar2(x.cover))}</span>`}</td>
    <td><button class="chip" aria-pressed="${x.hv}" data-act="svHv" data-k="${esc(x.id)}">${x.hv?'★':'☆'}</button></td></tr>`).join('')||`<tr><td colspan="7" class="hint">${esc(t('inv_none'))}</td></tr>`}</tbody></table></div>
  <p class="hint">${esc(t('sv_hvHint'))}</p>`}
/* branches: high-value items not counted today */
const svHvDue=()=>{if(S.role!=='branch'||!svHv().length)return 0;const today=dayKey(Date.now());
  const done=new Set((S.bcounts||[]).filter(c=>String(c.at).slice(0,10)===today).flatMap(c=>(c.lines||[]).map(l=>l.item)));return svHv().filter(id=>!done.has(id)).length};
Object.assign(A,{svXls(){const sheets=S.branches.map(b=>({name:b,headers:[t('inv_item'),t('inv_unit'),t('inv_qty'),t('sv_unitCost'),t('sv_value'),t('sv_used30'),t('sv_cover')],
    rows:svRows(b).map(x=>[x.it.name,x.it.unit,x.qty,+x.cost.toFixed(4),+x.value.toFixed(2),x.used,x.cover==null?'':+x.cover.toFixed(1)])}));saveXlsx('maskob-stock-value.xlsx',sheets)},
  svBranch(el){S.svBranch=el.dataset.k;render()},
  svHv(el){const id=el.dataset.k,cur=svHv(),hv=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];const cfg=Object.assign({},invUnitsCfg(),{hv});invSaveUnits(cfg)},
  countHv(){S.countHvOnly=!S.countHvOnly;render()}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='svMonth'&&/^\d{4}-\d{2}$/.test(el.value)){S.svMonth=el.value;render()}});
EXT.tabs.push({k:'stockVal',l:'tab_stockVal',roles:['manager'],g:'inv',view:stockValView});
