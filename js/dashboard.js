/* Maskob — Dashboard for the general manager: the whole business on one page.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.
   Shown when a general manager (role 'owner') picks «لوحة المؤشرات»; every card opens the department behind it. */
function dashboardView(){
  const mk=monthKey(Date.now());
  // sales and targets
  const br=S.branches.map(b=>({b,st:salesStats(b,mk)}));
  const sales=br.reduce((s,x)=>s+x.st.sales,0),target=br.reduce((s,x)=>s+(x.st.target||0),0);
  const ranked=br.filter(x=>x.st.target).sort((a,b)=>(b.st.pct||0)-(a.st.pct||0));
  // orders
  const c=counts(),late=S.orders.filter(o=>!['received','cancelled','rejected'].includes(o.status)&&lateInfo(o)).length;
  const inTransit=S.orders.filter(o=>o.kind!=='return'&&o.status==='shipped').length;
  // people
  const act=(S.emps||[]).filter(e=>e.status!=='left');
  const payroll=act.reduce((s,e)=>s+payTotal(e),0);
  const docs=hrDocAlerts(),docsExpired=docs.filter(a=>a.left<0).length;
  const reqs=(S.leaveReqs||[]).filter(r=>r.status==='pending').length+(S.forms||[]).filter(f=>f.status==='pending').length;
  const lic=(S.licenses||[]).filter(l=>['expired','soon'].includes(licState(l))).length;
  // maintenance and stock
  const mOpen=(S.maint||[]).filter(m=>m.status!=='done'),mUrgent=mOpen.filter(m=>m.urgent).length;
  const low=stockLow().length;
  const card=(title,big,sub,go,hot)=>`<button class="dash-card ${hot?'hot':''}" data-act="dashGo" data-v="${esc(go[0])}" data-k="${esc(go[1]||'')}">
    <span class="dash-t">${esc(title)}</span><b class="num">${big}</b>${sub?`<span class="dash-s">${sub}</span>`:''}</button>`;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_dash')}</h2><span class="hint">${esc(monthName(mk))}</span></div>
  <div class="rp-sec"><h3>${t('tab_sales')}</h3>
    <div class="dash-grid">
      ${card(t('dh_sales'),esc(sar(sales))+' <small>'+t('sar')+'</small>',target?esc(t('dh_ofTarget',{p:Math.round(sales/target*100),t:sar(target)})):esc(t('tg_none')),['manager','salesAll'])}
      ${ranked.length?card(t('dh_best'),esc(ranked[0].b),esc(Math.round((ranked[0].st.pct||0)*100)+'%'),['manager','salesAll']):''}
      ${ranked.length>1?card(t('dh_worst'),esc(ranked[ranked.length-1].b),esc(Math.round((ranked[ranked.length-1].st.pct||0)*100)+'%'),['manager','salesAll'],(ranked[ranked.length-1].st.pct||0)<0.5):''}
      ${card(t('dh_payrollShare'),sales?esc(Math.round(payroll/sales*100))+'%':'—',esc(t('dh_payrollOf',{n:sar(payroll)})),['hr','payroll'],sales&&payroll/sales>0.3)}
    </div>
    ${target?`<div style="margin-top:10px">${progress(Math.min(1,sales/target))}</div>`:''}</div>
  <div class="rp-sec"><h3>${t('dh_ops')}</h3><div class="dash-grid">
    ${card(t('tab_pending'),esc(c.pending),'',['manager','pending'],c.pending>0)}
    ${card(t('dh_late'),esc(late),'',['manager','all'],late>0)}
    ${card(t('dh_toShip'),esc(c.prep),'',['warehouse','prep'])}
    ${card(t('dh_inTransit'),esc(inTransit),'',['manager','all'])}
    ${card(t('tab_maint'),esc(mOpen.length),mUrgent?esc(t('dh_urgent',{n:mUrgent})):'',['manager','maintAll'],mUrgent>0)}
    ${card(t('st_low'),esc(low),'',['warehouse','stock'],low>0)}
  </div></div>
  <div class="rp-sec"><h3>${t('r_hr')}</h3><div class="dash-grid">
    ${card(t('hr_working'),esc(act.length),'',['hr','emps'])}
    ${card(t('dh_requests'),esc(reqs),'',['hr','forms'],reqs>0)}
    ${card(t('tab_docs'),esc(docs.length),docsExpired?esc(t('dh_expired',{n:docsExpired})):'',['hr','docs'],docsExpired>0)}
    ${card(t('tab_lic'),esc(lic),'',['hr','lic'],lic>0)}
  </div></div>`;
}
A.dashGo=function(el){
  const v=el.dataset.v,k=el.dataset.k;const sel=document.getElementById(String(v||'').startsWith('branch:')?'ownerBranch':'ownerView');
  if(!sel)return;LS.set('mk.tab',k);sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));
  setTimeout(()=>{if(k&&tabsFor().some(x=>x.k===k)){S.tab=k;LS.set('mk.tab',k);render()}},400);
};
