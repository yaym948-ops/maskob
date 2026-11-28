/* Maskob — the indicators board (لوحة المؤشرات): the nine monthly indicators of each branch next to the healthy range
   for coffee shops (from the restaurant-finance book's reference ratios), plus labour hours from the work schedule and
   sales per labour hour (SPLH).
   Finance and the general manager see all nine; operations sees what needs no pay or profit data
   (sales, average ticket, goods cost, labour hours, SPLH). */
const KPI_RANGES={cogs:[18,26],labour:[25,32],prime:[45,56],rent:[10,18],net:[8,16]};
/* hours of a shift from "06:00-14:00" (overnight shifts wrap) */
function shiftHours(r){const m=/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(String(r||'').trim());if(!m)return 8;
  let a=+m[1]*60+(+m[2]),b=+m[3]*60+(+m[4]);if(b<=a)b+=1440;return(b-a)/60}
/* labour hours of a branch in a month, from its weekly schedules (leave days not counted) */
function labourHours(b,mk){let h=0;const daysOf={};
  (S.shifts||[]).filter(x=>x.branch===b).forEach(doc=>{const times=Object.assign({},SHIFT_TIMES,doc.times||{});
    Object.keys(doc.cells||{}).forEach(sid=>{const st=(S.staff||[]).find(x=>x.id===sid);const row=doc.cells[sid]||{};
      for(let i=0;i<7;i++){const c=row[i];if(!['m','e','n'].includes(c))continue;const day=addDays(doc.week,i);if(!day.startsWith(mk))continue;
        if(st&&typeof onLeaveDay==='function'&&onLeaveDay(st,day))continue;h+=shiftHours(times[c]);daysOf[day]=(daysOf[day]||0)+shiftHours(times[c])}})});
  return{h,days:daysOf}}
function kpiCalc(mk){const full=['finance','dash'].includes(S.role)||S.realRole==='owner'&&S.role!=='manager';
  const vat=1+VAT_RATE/100,cfg=typeof finCfg==='function'?finCfg():{salesVat:true};
  const R=full&&typeof pnlCalc==='function'?pnlCalc(mk,mk):null;
  return S.branches.map(b=>{const sales=(S.sales||[]).filter(r=>r.branch===b&&String(r.date).startsWith(mk));
    const gross=sales.reduce((s0,r)=>s0+(+r.sales||0),0),net=cfg.salesVat?gross/vat:gross,inv=sales.reduce((s0,r)=>s0+(+r.invoices||0),0);
    let goods=0;(S.orders||[]).forEach(o=>{if(o.branch!==b)return;
      if(o.kind!=='return'&&['shipped','received'].includes(o.status)&&String(o.shippedAt).startsWith(mk))(o.lines||[]).forEach(l=>goods+=(+l.sent||0)*(+l.cost||itemCost(l.id)));
      if(o.kind==='return'&&o.status==='received'&&String(o.receivedAt).startsWith(mk))(o.lines||[]).forEach(l=>goods-=(+l.received||0)*(+l.cost||itemCost(l.id)))});
    const L=labourHours(b,mk),x={b,sales:net,days:sales.length,inv,avg:inv?gross/inv:null,hours:L.h,splh:L.h?net/L.h:null,cogsV:goods};
    if(R&&R.P[b]){const P=R.P[b],rev=P.rev||net,labour=P.pay+P.gosi+P.eos,cogs=P.cogs;
      Object.assign(x,{cogsV:cogs,labourV:labour,rentV:(P.exp.rent||0),netV:P.net,cogs:rev?cogs/rev*100:null,labour:rev?labour/rev*100:null,prime:rev?(cogs+labour)/rev*100:null,rent:rev?(P.exp.rent||0)/rev*100:null,net:rev?P.net/rev*100:null})}
    else x.cogs=net?goods/net*100:null;
    return x})}
const kpiState=(k,v)=>{const r=KPI_RANGES[k];if(!r||v==null)return'';if(k==='net')return v>=r[0]?'ok':v>=0?'mid':'bad';return v<=r[1]?'ok':v<=r[1]+5?'mid':'bad'};
function kpiView(){const mk=S.kpiMonth||monthKey(Date.now()),rows=kpiCalc(mk),full=rows.some(r=>r.labour!=null);
  const pct=(k,v)=>v==null?'—':`<span class="kpi-v ${kpiState(k,v)}">${esc(sar2(v))}%</span>`;
  const cols=[['kp_sales',r=>esc(sar2(r.sales))],['kp_avg',r=>r.avg==null?'—':esc(sar2(r.avg))],['kp_cogs',r=>pct('cogs',r.cogs)],
    ...(full?[['kp_labour',r=>pct('labour',r.labour)],['kp_prime',r=>pct('prime',r.prime)],['kp_rent',r=>pct('rent',r.rent)],['kp_net',r=>pct('net',r.net)]]:[]),
    ['kp_hours',r=>r.hours?esc(sar2(r.hours)):'—'],['kp_splh',r=>r.splh==null?'—':esc(sar2(r.splh))]];
  const tot=rows.reduce((a,r)=>({sales:a.sales+r.sales,inv:a.inv+r.inv,hours:a.hours+r.hours}),{sales:0,inv:0,hours:0});
  const best=rows.filter(r=>r.splh!=null).sort((a,c)=>c.splh-a.splh);
  return`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${t('tab_kpi')}</h2><input class="field" type="month" id="kpiMonth" value="${esc(mk)}" style="width:auto"></div>
  <p class="hint">${esc(t(full?'kp_hint':'kp_hintOps'))}</p>
  <div class="stats">${kpi(t('kp_sales'),sar2(tot.sales)+' '+t('sar'))}${kpi(t('kp_inv'),sar2(tot.inv))}${kpi(t('kp_hours'),sar2(tot.hours))}${kpi(t('kp_splh'),tot.hours?sar2(tot.sales/tot.hours):'—')}</div>
  <div class="scroll"><table class="tbl fn-tbl"><thead><tr><th>${t('r_branch')}</th>${cols.map(([l])=>`<th>${esc(t(l))}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.b)}</b><div class="hint">${esc(t('kp_days',{n:r.days}))}</div></td>${cols.map(([,f])=>`<td class="n">${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="rp-sec"><h3>${t('kp_ranges')}</h3><div class="kpi-ranges">${Object.keys(KPI_RANGES).filter(k=>full||k==='cogs').map(k=>`<span class="tag">${esc(t('kp_'+k))}: ${KPI_RANGES[k][0]}–${KPI_RANGES[k][1]}%</span>`).join('')}</div>
  <p class="hint">${esc(t('kp_legend'))}</p></div>
  ${best.length>1?`<div class="rp-sec"><h3>${t('kp_splhRank')}</h3><p class="hint">${esc(t('kp_splhHint'))}</p><div class="list">${best.map(r=>`<div class="oc" style="cursor:default"><span class="t" style="flex:1">${esc(r.b)}</span><span class="side"><b class="num">${esc(sar2(r.splh))}</b> ${esc(t('kp_perH'))}</span></div>`).join('')}</div></div>`:''}`}
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='kpiMonth'&&/^\d{4}-\d{2}$/.test(el.value)){S.kpiMonth=el.value;render()}});
EXT.tabs.push({k:'kpi',l:'tab_kpi',roles:['finance','manager'],g:'rep',view:kpiView});
/* finance needs the work schedules and staff for labour hours */
function kpiLoadDemo(){if(S.role==='finance'){S.shifts=MEM('shifts');S.staff=MEM('staff');S.leaveReqs=S.leaveReqs&&S.leaveReqs.length?S.leaveReqs:[]}}
function kpiStart(u,onErr){if(S.role!=='finance')return;
  u.push(db.collection('shifts').onSnapshot(s=>{S.shifts=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr));
  u.push(db.collection('staff').onSnapshot(s=>{S.staff=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},onErr))}
