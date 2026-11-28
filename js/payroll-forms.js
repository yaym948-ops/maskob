/* Maskob — Payroll, payment vouchers, forms and printed documents.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ================= Ready-made form texts ================= */
const VIOLATIONS=[
  ['late','التأخر عن موعد بدء العمل دون إذن أو عذر مقبول'],
  ['early','الانصراف قبل موعد انتهاء العمل دون إذن'],
  ['absent','الغياب عن العمل دون إذن أو عذر مقبول',{days:1}],
  ['uniform','عدم الالتزام بالزي الرسمي أثناء العمل'],
  ['phone','استخدام الجوال أثناء العمل بشكل مخالف للتعليمات'],
  ['hygiene','عدم الالتزام بتعليمات النظافة وسلامة الغذاء'],
  ['customer','سوء التعامل مع العملاء'],
  ['cash','عجز في الصندوق أو مخالفة إجراءات الكاشير'],
  ['orders','عدم تنفيذ تعليمات الرئيس المباشر'],
  ['smoking','التدخين في أماكن العمل'],
  ['waste','الإهمال المتسبب في تلف المواد أو الأجهزة'],
  ['break','تجاوز وقت الاستراحة المحدد']];
const PRAISES=[
  ['service','التميز في خدمة العملاء'],
  ['target','المساهمة في تحقيق التارقت الشهري للفرع'],
  ['attend','الانضباط في الحضور وعدم الغياب خلال الشهر'],
  ['extra','العمل الإضافي والمساندة في فترات الضغط'],
  ['idea','تقديم مقترح ساهم في تحسين العمل'],
  ['clean','المحافظة المتميزة على نظافة الفرع وترتيبه']];
const positiveForm=ty=>ty==='reward'||ty==='thanks';
const formTpls=ty=>positiveForm(ty)?PRAISES:VIOLATIONS;

/* ================= Monthly payroll ================= */
/* payroll/{YYYY-MM}: {status draft|approved, adj:{empId:{add,ded,note}}, rows:{empId:{…frozen when approved}}, approvedAt} */
const r2p=x=>Math.round((+x||0)*100)/100;
const overlapDays=(a1,a2,b1,b2)=>{const s=a1>b1?a1:b1,e=a2<b2?a2:b2;return e>=s?dayDiff(s,e)+1:0};
function payrollCalc(mk){
  const dim=daysInMonth(mk),start=mk+'-01',end=mk+'-'+String(dim).padStart(2,'0');
  const doc=(S.payroll||[]).find(p=>p.id===mk)||{};
  if(doc.status==='approved'&&doc.rows)return{doc,mk,start,end,rows:Object.keys(doc.rows).map(id=>Object.assign({id},doc.rows[id])).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'))};
  const adj=doc.adj||{};
  const rows=(S.emps||[]).filter(e=>(!e.hire||e.hire<=end)&&!(e.status==='left'&&e.endDate&&e.endDate<start)&&!(e.status==='left'&&!e.endDate)).map(e=>{
    const from=e.hire&&e.hire>start?e.hire:start,to=e.status==='left'&&e.endDate&&e.endDate<end?e.endDate:end;
    const days=Math.max(0,dayDiff(from,to)+1);const full=days>=dim;
    const f=full?1:days/dim,daily=payTotal(e)/30;
    const basic=r2p((+e.salary||0)*f),allow=r2p(ALLOWANCES.reduce((s,k)=>s+(+e[k]||0),0)*f);
    const F=(S.forms||[]).filter(x=>x.emp===e.id&&x.status==='approved'&&String(x.date||'').startsWith(mk));
    const reward=r2p(F.filter(x=>x.type==='reward').reduce((s,x)=>s+(+x.amount||0),0));
    const formDed=r2p(F.filter(x=>x.type==='deduction').reduce((s,x)=>s+(+x.amount||0)+(+x.days||0)*daily,0));
    const unpaidDays=(S.leaves||[]).filter(l=>l.emp===e.id&&l.status==='approved'&&l.type==='unpaid').reduce((s,l)=>s+overlapDays(l.from,l.to,from,to),0);
    const unpaid=r2p(unpaidDays*daily);
    const advList=(S.advances||[]).filter(a=>a.emp===e.id&&advRemain(a)>0&&+a.monthly>0&&(!a.date||a.date<=end));
    const adv=r2p(advList.reduce((s,a)=>s+Math.min(+a.monthly,advRemain(a)),0));
    const refund=r2p((S.forms||[]).filter(x=>x.emp===e.id&&dedRefundMonth(x)===mk).reduce((s,x)=>s+(+x.amount||0)+(+x.days||0)*daily,0));
    const m=adj[e.id]||{};const add=r2p(num(m.add)+refund),ded=r2p(num(m.ded));
    const hpd=+(e.contract&&e.contract.hours)||8,otHours=r2p(num(m.otHours));
    const otRate=r2p(payTotal(e)/30/hpd+0.5*(+e.salary||0)/30/hpd),ot=r2p(otHours*otRate);
    const gross=r2p(basic+allow);
    const gosi=r2p(gosiMonthly(e,f));
    const net=r2p(gross+reward+ot+add-formDed-unpaid-adv-gosi-ded);
    return{id:e.id,name:e.name,no:e.no||'',branch:e.branch,bank:e.bank||'',iban:e.iban||'',days,basic,allow,gross,reward,otHours,otRate,ot,add,formDed,unpaidDays,unpaid,adv,
      advIds:advList.map(a=>[a.id,r2p(Math.min(+a.monthly,advRemain(a)))]),gosi,ded,note:m.note||'',net};
  }).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  return{doc,mk,start,end,rows};
}
const prSum=(rows,k)=>r2p(rows.reduce((s,r)=>s+(+r[k]||0),0));
function payrollView(){
  const mk=S.prMonth||monthKey(Date.now());const P=payrollCalc(mk);const place=S.prPlace||'';
  const rows=P.rows.filter(r=>!place||r.branch===place);const ok=P.doc.status==='approved';
  const cell=(r,f)=>ok?`<td class="n">${esc(sar2(r[f]))}</td>`:`<td><input class="field num pr-in" id="pr-${esc(r.id)}-${f}" inputmode="decimal" dir="ltr" data-in="prAdj" data-e="${esc(r.id)}" data-f="${f}" value="${r[f]?esc(r[f]):''}" placeholder="0"></td>`;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_pr')}</h2><div class="row">
    <input class="field" type="month" id="prMonth" value="${esc(mk)}" style="width:auto">
    <button class="btn btn-ghost rp-btn" data-act="prXls">${t('xlsExport')}</button><button class="btn btn-ghost rp-btn" data-act="prPrint">${t('fm_print')}</button>${ok?`<button class="btn btn-ghost rp-btn" data-act="prWps">${t('wps_btn')}</button>`:''}
    ${ok?`<button class="btn btn-ghost rp-btn" data-act="prReopen">${S.confirm==='prReopen'?t('pr_reopenConfirm'):t('pr_reopen')}</button>`:`<button class="btn btn-sun" data-act="prApprove" ${rows.length?'':'disabled'}>${S.confirm==='prApprove'?t('pr_approveConfirm'):t('pr_approve')}</button>`}</div></div>
  <div class="row" style="margin:6px 0 4px;gap:10px;flex-wrap:wrap"><span class="pill ${ok?'ms-done':'ms-progress'}">${t(ok?'pr_approved':'pr_draft')}</span>${ok&&P.doc.approvedAt?`<span class="hint">${esc(when(P.doc.approvedAt))}</span>`:''}
    <select class="field" id="prPlace" style="width:auto;min-width:160px"><option value="">${esc(t('hr_allPlaces'))}</option>${hrPlaces().map(p=>`<option value="${esc(p)}" ${place===p?'selected':''}>${esc(placeL(p))}</option>`).join('')}</select></div>
  <p class="hint">${esc(t(ok?'pr_hintLocked':'pr_hint'))}</p>${ok?'':`<p class="hint">${esc(t('pr_otHint'))}</p>`}
  <div class="stats">${kpi(t('tab_emps'),sar(rows.length))}${kpi(t('pr_gross'),sar(prSum(rows,'gross'))+' '+t('sar'))}${kpi(t('pr_deds'),sar(prSum(rows,'formDed')+prSum(rows,'unpaid')+prSum(rows,'adv')+prSum(rows,'gosi')+prSum(rows,'ded'))+' '+t('sar'))}${kpi(t('pr_net'),sar(prSum(rows,'net'))+' '+t('sar'),'hot')}</div>
  ${rows.length?`<div class="scroll"><table class="tbl pr-tbl"><thead><tr><th>${t('lv_emp')}</th><th>${t('pr_days')}</th><th>${t('hr_salary')}</th><th>${t('al_title')}</th><th>${t('fm_reward')}</th><th>${t('pr_ot')}<div class="hint">${t('pr_h')}</div></th><th>${t('pr_add')}</th><th>${t('pr_formDed')}</th><th>${t('pr_unpaid')}</th><th>${t('tab_adv')}</th><th>${t('pr_gosi')}</th><th>${t('pr_ded')}</th><th>${t('pr_net')}</th><th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.name)}</b><div class="hint">${r.no?'#'+esc(r.no)+' · ':''}${esc(placeL(r.branch))}</div></td><td class="n">${r.days}</td><td class="n">${esc(sar2(r.basic))}</td><td class="n">${esc(sar2(r.allow))}</td><td class="n">${r.reward?esc(sar2(r.reward)):'—'}</td><td class="pr-ot">${ok?(r.otHours?esc(sar2(r.otHours))+' '+t('pr_h'):'—'):`<input class="field num pr-in" id="pr-${esc(r.id)}-otHours" inputmode="decimal" dir="ltr" data-in="prAdj" data-e="${esc(r.id)}" data-f="otHours" value="${r.otHours?esc(r.otHours):''}" placeholder="0">`}${r.ot?`<div class="ot-amt num">${esc(sar2(r.ot))} ${t('sar')}</div>`:''}</td>${cell(r,'add')}
    <td class="n ${r.formDed?'mis':''}">${r.formDed?esc(sar2(r.formDed)):'—'}</td><td class="n ${r.unpaid?'mis':''}">${r.unpaid?esc(sar2(r.unpaid)):'—'}</td><td class="n ${r.adv?'mis':''}">${r.adv?esc(sar2(r.adv)):'—'}</td><td class="n ${r.gosi?'mis':''}">${r.gosi?esc(sar2(r.gosi)):'—'}</td>${cell(r,'ded')}
    <td class="n"><b>${esc(sar2(r.net))}</b></td><td><button class="btn btn-ghost pr-slip" data-act="prSlip" data-e="${esc(r.id)}" title="${esc(t('pr_slip'))}">🧾</button></td></tr>`).join('')}
  <tr class="sh-sum"><td>${t('pr_total')}</td><td></td>${['basic','allow','reward','ot','add','formDed','unpaid','adv','gosi','ded','net'].map(k=>`<td class="n">${esc(sar2(prSum(rows,k)))}</td>`).join('')}<td></td></tr></tbody></table></div>`:`<div class="empty">${esc(t('hr_none'))}</div>`}`;
}
const PR_COLS=[['pr_days','days'],['hr_salary','basic'],['al_title','allow'],['pr_gross','gross'],['fm_reward','reward'],['pr_otH','otHours'],['pr_ot','ot'],['pr_add','add'],['pr_formDed','formDed'],['pr_unpaid','unpaid'],['tab_adv','adv'],['pr_gosi','gosi'],['pr_ded','ded'],['pr_net','net']];
function printPayroll(P,rows,win){
  const h=esc,mn=monthName(P.mk);
  const body=`<style>@page{size:A4 landscape;margin:10mm}table{font-size:10.5px}td,th{padding:4px 6px}</style>
  <table><thead><tr><th>#</th><th>الموظف / Employee</th><th>مكان العمل</th>${PR_COLS.map(c=>`<th>${h(t(c[0]))}</th>`).join('')}<th>IBAN</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${h(r.name)}${r.no?' #'+h(r.no):''}</td><td>${h(placeL(r.branch))}</td>${PR_COLS.map(c=>`<td style="text-align:center">${c[1]==='days'?r.days:nfmt(r[c[1]])}</td>`).join('')}<td dir="ltr" style="white-space:nowrap">${h(ibanFmt(r.iban))}</td></tr>`).join('')}
  <tr><td></td><td><b>الإجمالي / Total</b></td><td></td>${PR_COLS.map(c=>`<td style="text-align:center"><b>${c[1]==='days'?'':nfmt(prSum(rows,c[1]))}</b></td>`).join('')}<td></td></tr></tbody></table>
  <div class="para">صافي الرواتب: <b>${nfmt(prSum(rows,'net'))}</b> ريال — ${h(tafqeet(prSum(rows,'net')))}</div>`;
  printDoc('كشف رواتب '+mn,'Payroll — '+P.mk,(P.doc.status==='approved'?'معتمد / Approved':'مسودة / Draft'),body,[['الموارد البشرية / HR',''],['المالية / Finance',''],['المدير المعتمد / Approved by',coInfo().rep]],win);
}
function printPayslip(P,r,win){
  const e=empById(r.id)||{};
  const earn=[['الراتب الأساسي / Basic',r.basic],['البدلات / Allowances',r.allow],['مكافآت / Rewards',r.reward],['عمل إضافي / Overtime'+(r.otHours?' ('+r.otHours+' '+'ساعة / h)':''),r.ot],['إضافات / Additions',r.add]].filter(x=>+x[1]);
  const deds=[['خصومات النماذج / Deductions',r.formDed],['إجازة بدون راتب / Unpaid leave'+(r.unpaidDays?' ('+r.unpaidDays+')':''),r.unpaid],['قسط السلفة / Advance',r.adv],['التأمينات الاجتماعية / GOSI',r.gosi],['خصم آخر / Other',r.ded]].filter(x=>+x[1]);
  const tb=(title,list)=>`<table><thead><tr><th>${title}</th><th style="text-align:center;width:30%">SAR</th></tr></thead><tbody>${list.length?list.map(x=>`<tr><td>${x[0]}</td><td style="text-align:center">${nfmt(x[1])}</td></tr>`).join(''):'<tr><td colspan="2">—</td></tr>'}</tbody></table>`;
  const body=`<table class="info">${[['الموظف / Employee',esc(r.name)],['الرقم الوظيفي / No.',esc(r.no||'—')],['المسمى / Job',esc(e.job||'—')],['مكان العمل / Workplace',esc(placeL(r.branch))],['الشهر / Month',esc(monthName(P.mk))],['أيام العمل / Days',r.days],
    ...(r.iban?[['البنك / Bank',esc(r.bank||'—')+' — <span dir="ltr">'+esc(ibanFmt(r.iban))+'</span>']]:[])].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table>
  ${tb('المستحقات / Earnings',earn)}${tb('الاستقطاعات / Deductions',deds)}
  <div class="para">صافي الراتب / Net pay: <span class="big">${nfmt(r.net)} SAR</span><br>${esc(tafqeet(r.net))}${r.note?'<br>'+esc(r.note):''}</div>`;
  printDoc('قسيمة راتب','Payslip',esc(P.mk),body,[['الموظف / Employee',r.name],['الموارد البشرية / HR','']],win);
}
let prSaveT=null;
Object.assign(A,{
  prXls(){const P=payrollCalc(S.prMonth||monthKey(Date.now()));const place=S.prPlace||'';const rows=P.rows.filter(r=>!place||r.branch===place);
    saveXlsx('maskob-payroll-'+P.mk+'.xlsx',[{name:t('tab_pr')+' '+P.mk,headers:[t('lv_emp'),t('hr_no'),t('hr_branch'),...PR_COLS.map(c=>t(c[0])),t('bk_bank'),t('bk_iban'),t('hr_note')],
      rows:[...rows.map(r=>[r.name,r.no,placeL(r.branch),...PR_COLS.map(c=>r[c[1]]),r.bank,ibanFmt(r.iban),r.note]),[t('pr_total'),'','',...PR_COLS.map(c=>c[1]==='days'?'':prSum(rows,c[1])),'','','']]}])},
  prPrint(){const P=payrollCalc(S.prMonth||monthKey(Date.now()));const place=S.prPlace||'';printPayroll(P,P.rows.filter(r=>!place||r.branch===place),window.open('','_blank'))},
  prSlip(el){const P=payrollCalc(S.prMonth||monthKey(Date.now()));const r=P.rows.find(x=>x.id===el.dataset.e);if(r)printPayslip(P,r,window.open('','_blank'))},
  prApprove(){
    const mk=S.prMonth||monthKey(Date.now());if(S.confirm!=='prApprove'){S.confirm='prApprove';render();return}
    const P=payrollCalc(mk);const rows={};P.rows.forEach(r=>{const c=Object.assign({},r);delete c.id;rows[r.id]=c});
    guard(async()=>{
      for(const r of P.rows)for(const [aid,amt] of (r.advIds||[])){const a=(S.advances||[]).find(x=>x.id===aid);if(!a||!(amt>0))continue;
        const payments=[...(a.payments||[]).filter(p=>p.payroll!==mk),{date:P.end,amount:amt,payroll:mk}];
        await X.upd('advances',aid,{payments,status:(+a.amount||0)-payments.reduce((s,p)=>s+(+p.amount||0),0)>0.001?'open':'closed',updatedAt:nowIso()})}
      await X.put('payroll',mk,{status:'approved',adj:P.doc.adj||{},rows,approvedAt:nowIso()});S.confirm=null;
    },()=>t('pr_approvedMsg'));
  },
  prReopen(){
    const mk=S.prMonth||monthKey(Date.now());if(S.confirm!=='prReopen'){S.confirm='prReopen';render();return}
    const doc=(S.payroll||[]).find(p=>p.id===mk)||{};
    guard(async()=>{
      for(const a of (S.advances||[]).filter(a=>(a.payments||[]).some(p=>p.payroll===mk))){const payments=a.payments.filter(p=>p.payroll!==mk);
        await X.upd('advances',a.id,{payments,status:(+a.amount||0)-payments.reduce((s,p)=>s+(+p.amount||0),0)>0.001?'open':'closed',updatedAt:nowIso()})}
      await X.put('payroll',mk,{status:'draft',adj:doc.adj||{},updatedAt:nowIso()});S.confirm=null;
    },()=>t('pr_reopened'));
  }
});
document.addEventListener('input',ev=>{const el=ev.target;if(!(el.dataset&&el.dataset.in==='prAdj'))return;
  const mk=S.prMonth||monthKey(Date.now());const doc=(S.payroll||[]).find(p=>p.id===mk)||{};if(doc.status==='approved')return;
  const adj=JSON.parse(JSON.stringify(doc.adj||{}));const e=el.dataset.e;adj[e]=adj[e]||{};adj[e][el.dataset.f]=el.value;
  const list=(S.payroll||[]).filter(p=>p.id!==mk);S.payroll=[...list,Object.assign({},doc,{id:mk,adj,status:'draft'})];
  if(el.dataset.f==='otHours'){const row=payrollCalc(mk).rows.find(r=>r.id===e);const td=el.closest('td');if(row&&td){let o=td.querySelector('.ot-amt');if(!o){o=document.createElement('div');o.className='ot-amt num';td.appendChild(o)}o.textContent=row.ot?sar2(row.ot)+' '+t('sar'):''}}
  clearTimeout(prSaveT);prSaveT=setTimeout(()=>{X.put('payroll',mk,{status:'draft',adj,updatedAt:nowIso()}).catch(()=>toast(t('saveFail')));render()},700)});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='prMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.prMonth=el.value;S.confirm=null;render()}
  if(el.id==='prPlace'){S.prPlace=el.value;render()}});

/* ================= Payment vouchers, branch forms (deduction / warning / reward) and HR document templates ================= */
/* vouchers/{id}: {no, date, payee, emp, amount, method, ref, cat, purpose, note, form, createdAt}  — HR only
   forms/{id}:    {branch, staffId, emp, empName, empNo, type deduction|warning|reward, date, reason, amount, days, level,
                   status pending|approved|rejected, hrNote, by branch|hr, createdAt, decidedAt} */
const FORM_TYPES=['deduction','warning','notice','reward','thanks'];
const VC_CATS=['advance','reward','eos','salary','allow','supplier','other'];
const PAY_METHODS=['cash','bank','cheque'];
/* amount in Arabic words: "فقط ألف ومائتان وخمسون ريالاً لا غير" */
function tafqeet(x){
  const U=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const TN=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const HN=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
  const b1000=n=>{const p=[],h=Math.floor(n/100),r=n%100;if(h)p.push(HN[h]);if(r){if(r<20)p.push(U[r]);else{const u=r%10,tt=Math.floor(r/10);p.push(u?U[u]+' و'+TN[tt]:TN[tt])}}return p.join(' و')};
  const scale=(n,one,two,few,many)=>n===1?one:n===2?two:n<=10?b1000(n)+' '+few:b1000(n)+' '+many;
  const words=n=>{if(!n)return'صفر';const p=[];const m=Math.floor(n/1e6),k=Math.floor(n%1e6/1000),r=n%1000;
    if(m)p.push(scale(m,'مليون','مليونان','ملايين','مليون'));if(k)p.push(scale(k,'ألف','ألفان','آلاف','ألف'));if(r)p.push(b1000(r));return p.join(' و')};
  const v=Math.round((+x||0)*100),ri=Math.floor(v/100),ha=v%100;
  return'فقط '+words(ri)+' ريال'+(ha?' و'+words(ha)+' هللة':'')+' لا غير';
}
const nextVoucherNo=()=>Math.max(0,...(S.vouchers||[]).map(v=>+v.no||0))+1;
/* ---------- vouchers (HR) ---------- */
function vouchersView(){
  const mk=S.vcMonth||monthKey(Date.now());
  const list=[...(S.vouchers||[])].filter(v=>String(v.date||'').startsWith(mk)).sort((a,b)=>(+b.no||0)-(+a.no||0));
  const total=list.reduce((s,v)=>s+(+v.amount||0),0);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_vc')}</h2><div class="row">${ioBtns('vouchers')}<input class="field" type="month" id="vcMonth" value="${esc(mk)}" style="width:auto"><button class="btn btn-sun" data-act="vcNew">+ ${t('vc_add')}</button></div></div>
  <div class="stats">${kpi(t('vc_count'),sar(list.length))}${kpi(t('vc_total'),sar2(total)+' '+t('sar'))}</div>
  <div class="list">${list.length?list.map(v=>`<button class="oc" data-act="vcOpen" data-id="${esc(v.id)}">
    <span style="min-width:0"><span class="t"><span class="num" dir="ltr">#${esc(v.no)}</span> ${esc(v.payee)} <span class="tag">${esc(t('vc_'+(v.cat||'other')))}</span></span>
      <span class="s">${esc(dateLabel(v.date))} · ${esc(t('pm_'+(v.method||'cash')))}${v.iban?' · <span dir="ltr">'+esc(ibanFmt(v.iban))+'</span>':''}${v.purpose?' · '+esc(String(v.purpose).slice(0,60)):''}</span></span>
    <span class="side"><b class="num">${esc(sar2(v.amount))} ${t('sar')}</b></span></button>`).join(''):`<div class="empty">${esc(t('vc_none'))}</div>`}</div>`;
}
function voucherSheet(){
  const isNew=S.openVc==='new';const d=S.hrDraft||{};
  const emps=(S.emps||[]).filter(e=>e.status!=='left'||e.id===d.emp).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const body=`<div class="sl-grid hr-grid">
    ${hrIn('no',t('vc_no'),'number','dir="ltr" inputmode="numeric"')}${hrIn('date',t('sl_day'),'date')}
    ${hrSel('emp',t('vc_emp'),[['',t('vc_other_payee')],...emps.map(e=>[e.id,e.name+(e.no?' #'+e.no:'')])])}${hrIn('payee',t('vc_payee'))}
    ${hrIn('amount',t('vc_amount')+' ('+t('sar')+')','number')}${hrSel('cat',t('vc_cat'),VC_CATS.map(k=>[k,t('vc_'+k)]))}
    ${hrSel('method',t('vc_method'),PAY_METHODS.map(k=>[k,t('pm_'+k)]))}${hrIn('ref',t('vc_ref'),'text','dir="ltr"')}
    ${hrIn('bank',t('bk_bank'))}${hrIn('iban',t('bk_iban'),'text','dir="ltr" autocomplete="off" style="text-transform:uppercase"')}
  </div>
  <div class="hint" id="vcWords" style="margin-top:8px">${+d.amount>0?esc(tafqeet(num(d.amount))):''}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('vc_purpose')}</span><textarea class="field" id="hr-purpose" rows="2" dir="auto" data-in="hrF" data-f="purpose">${esc(d.purpose||'')}</textarea></label>`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="vcDel">${S.confirm==='vcDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-ghost" data-act="vcSave" data-k="1" ${S.busy?'disabled':''}>${t('vc_savePrint')}</button><button class="btn btn-sun" data-act="vcSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('vc_add'):t('vc_title')+' #'+(d.no||''),body+(typeof phBlock==='function'?phBlock('vouchers',isNew?null:S.openVc):''),foot);
}
/* ---------- printing ---------- */
const PRINT_CSS=`@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:"IBM Plex Sans Arabic",Arial,sans-serif;color:#13233a;margin:0;font-size:13px;line-height:1.75}
.bar{height:3px;width:90px;background:#EF8A22;margin:0 0 14px auto}
table{width:100%;border-collapse:collapse;margin:8px 0 14px}td,th{border:1px solid #c9d5e3;padding:7px 10px;vertical-align:top}th{background:#e6eff9;color:#0758A7;text-align:start}
.info td:first-child{width:32%;background:#f4f7fb;font-weight:700}
.big{font-size:16px;font-weight:800;color:#0758A7}.en{direction:ltr;text-align:left;color:#33445c}
.para{border:1px solid #c9d5e3;border-radius:8px;padding:12px 14px;margin:10px 0}
.sig{display:flex;gap:16px;margin-top:26px}.sig div{flex:1;border:1px solid #c9d5e3;border-radius:8px;padding:10px 12px;min-height:100px}.sig b{color:#0758A7;display:block}
.line{border-bottom:1px dashed #8a9ab0;height:34px;margin-bottom:4px}`;
function printDoc(titleAr,titleEn,meta,body,sigs,win){
  const co=coInfo();
  const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(titleAr)}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>${PRINT_CSS}</style></head><body>
${letterhead(co,titleAr,titleEn,meta)}<div class="bar"></div>${body}
${sigs&&sigs.length?`<div class="sig">${sigs.map(s=>`<div><b>${s[0]}</b>${s[1]?`<div>${esc(s[1])}</div>`:''}<div class="line"></div>التوقيع / Signature</div>`).join('')}</div>`:''}
${letterfoot(co)}
<script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print()},250)})}<\/script></body></html>`;
  printHtml(html,win);
}
const dmy=k=>isDay(k)?k.split('-').reverse().join('/'):'—';
const nfmt=x=>(+x||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function printVoucher(v,win){
  const rows=[['صُرف إلى / Paid to',esc(v.payee)],['المبلغ / Amount',`<span class="big">${nfmt(v.amount)} SAR</span>`],['المبلغ كتابة / In words',esc(tafqeet(v.amount))],
    ['وذلك عن / For',esc(v.purpose||'—')],['نوع الصرف / Category',esc(t('vc_'+(v.cat||'other')))],['طريقة الدفع / Method',esc(t('pm_'+(v.method||'cash')))+(v.ref?' — <span dir="ltr">'+esc(v.ref)+'</span>':'')],
    ...(()=>{const e=v.emp&&empById(v.emp);const ib=v.iban||(v.method==='bank'&&e&&e.iban)||'';const bk=v.bank||(e&&e.bank)||'';
      return ib?[['البنك / Bank',esc(bk||'—')],['رقم الآيبان / IBAN','<span dir="ltr" style="font-weight:700;letter-spacing:.04em">'+esc(ibanFmt(ib))+'</span>']]:[]})(),['التاريخ / Date',dmy(v.date)]];
  printDoc('سند صرف','Payment Voucher','No. '+esc(v.no)+' &nbsp;·&nbsp; '+dmy(v.date),`<table class="info">${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`,
    [['المستلم / Received by',v.payee],['المحاسب / Accountant',''],['المدير المعتمد / Approved by',coInfo().rep]],win);
}
const FT={deduction:['نموذج خصم','Deduction Notice'],warning:['إنذار','Warning Notice'],notice:['لفت نظر','Notice'],reward:['مكافأة','Reward'],thanks:['شكر وتقدير','Letter of Appreciation']};
const LVL={1:['إنذار أول','First warning'],2:['إنذار ثانٍ','Second warning'],3:['إنذار نهائي','Final warning']};
function printForm(f,win){
  const e=f.emp&&empById(f.emp);
  const rows=[['الموظف / Employee',esc(f.empName)],['الرقم الوظيفي / Employee no.',esc(f.empNo||(e&&e.no)||'—')],['الفرع / Branch',esc(f.branch?placeL(f.branch):(e?placeL(e.branch):'—'))],
    ['المسمى / Job',esc((e&&e.job)||'—')],['التاريخ / Date',dmy(f.date)]];
  if(f.type==='warning')rows.push(['درجة الإنذار / Level',(LVL[f.level]||LVL[1]).join(' / ')]);
  if(f.type==='deduction'){if(+f.days)rows.push(['مدة الخصم / Days',esc(f.days)+' يوم / days']);if(+f.amount)rows.push(['مبلغ الخصم / Amount',nfmt(f.amount)+' SAR — '+esc(tafqeet(f.amount))])}
  if(f.type==='reward'&&+f.amount)rows.push(['مبلغ المكافأة / Amount',nfmt(f.amount)+' SAR — '+esc(tafqeet(f.amount))]);
  rows.push([positiveForm(f.type)?'السبب / Reason':'المخالفة / Violation',esc(f.reason||'—')]);
  if(f.status==='approved')rows.push(['اعتماد الموارد البشرية / HR approval','معتمد / Approved'+(f.hrNote?' — '+esc(f.hrNote):'')]);
  const text=f.type==='thanks'?'تتقدم إدارة المنشأة بخالص الشكر والتقدير للموظف المذكور أعلاه على جهوده المتميزة، متمنين له دوام التوفيق.':f.type==='notice'?'نلفت نظركم إلى الملاحظة الموضحة أعلاه، ونأمل مراعاتها مستقبلاً.':f.type==='reward'?'تقديراً لجهود الموظف المذكور أعلاه، تقرر منحه المكافأة الموضحة.':f.type==='warning'?'نلفت انتباهكم إلى المخالفة الموضحة أعلاه، ونأمل عدم تكرارها، وفي حال التكرار ستُتخذ الإجراءات النظامية.':'بناءً على المخالفة الموضحة أعلاه، تقرر الخصم الموضح وفق لائحة تنظيم العمل.';
  printDoc(FT[f.type][0],FT[f.type][1],dmy(f.date),`<table class="info">${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><div class="para">${text}</div>`,
    [['مدير الفرع / Branch manager',''],['الموظف (للعلم) / Employee (acknowledged)',f.empName],['الموارد البشرية / HR','']],win);
}
/* ready-made HR documents built from the employee file */
const TEMPLATES=['salary','experience','start','clear'];
function printTemplate(k,e,day,win){
  const co=coInfo(),h=esc,total=payTotal(e);
  const pl=placeL(e.branch);
  if(k==='salary')return printDoc('تعريف بالراتب','Salary Certificate',dmy(day),`<div class="para">تشهد ${h(co.name)} بأن السيد/ة <b>${h(e.name)}</b>، الجنسية: ${h(e.nat||'—')}، رقم الهوية/الإقامة: ${h(e.idNo||'—')}، يعمل لديها بوظيفة (${h(e.job||'—')}) في (${h(pl)}) منذ ${dmy(e.hire)}، ويتقاضى راتباً شهرياً إجمالياً قدره <b>${nfmt(total)}</b> ريال سعودي (${h(tafqeet(total))}).
  <br>وقد أُعطي هذا التعريف بناءً على طلبه دون أدنى مسؤولية على المنشأة.</div>
  <table><thead><tr><th>البند / Item</th><th style="text-align:center">المبلغ (ريال) / SAR</th></tr></thead><tbody>${[['الراتب الأساسي / Basic',e.salary],['بدل سكن / Housing',e.alHousing],['بدل نقل / Transport',e.alTransport],['بدل طعام / Food',e.alFood],['بدلات أخرى / Other',e.alOther]].filter(r=>+r[1]).map(r=>`<tr><td>${r[0]}</td><td style="text-align:center">${nfmt(r[1])}</td></tr>`).join('')}<tr><td><b>الإجمالي / Total</b></td><td style="text-align:center"><b>${nfmt(total)}</b></td></tr></tbody></table>
  <div class="para en">This is to certify that Mr./Ms. ${h(e.name)} has been working with ${h(co.nameEn||co.name)} as (${h(e.job||'—')}) since ${dmy(e.hire)}, with a total monthly salary of SAR ${nfmt(total)}. This certificate is issued upon the employee's request without any liability on the company.</div>`,[['الموارد البشرية / HR',co.rep]],win);
  if(k==='experience')return printDoc('شهادة خبرة','Experience Certificate',dmy(day),`<div class="para">تشهد ${h(co.name)} بأن السيد/ة <b>${h(e.name)}</b>، الجنسية: ${h(e.nat||'—')}، رقم الهوية/الإقامة: ${h(e.idNo||'—')}، قد عمل لديها بوظيفة (${h(e.job||'—')}) خلال الفترة من ${dmy(e.hire)} إلى ${e.status==='left'&&e.endDate?dmy(e.endDate):'تاريخه'}، وكان خلال فترة عمله حسن السيرة والسلوك.
  <br>وقد أُعطي هذه الشهادة بناءً على طلبه دون أدنى مسؤولية على المنشأة.</div>
  <div class="para en">This is to certify that Mr./Ms. ${h(e.name)} worked with ${h(co.nameEn||co.name)} as (${h(e.job||'—')}) from ${dmy(e.hire)} to ${e.status==='left'&&e.endDate?dmy(e.endDate):'date'}, and showed good conduct during this period.</div>`,[['الموارد البشرية / HR',co.rep]],win);
  if(k==='start')return printDoc('مباشرة عمل','Work Commencement',dmy(day),`<table class="info">${[['الموظف / Employee',h(e.name)],['الرقم الوظيفي / Employee no.',h(e.no||'—')],['المسمى / Job',h(e.job||'—')],['مكان العمل / Workplace',h(pl)],['تاريخ المباشرة / Start date',dmy(day)]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
  <div class="para">نفيدكم بأن الموظف المذكور أعلاه قد باشر عمله بتاريخ ${dmy(day)}.</div><div class="para en">The above employee started work on ${dmy(day)}.</div>`,[['الموظف / Employee',e.name],['المدير المباشر / Line manager',''],['الموارد البشرية / HR','']],win);
  // clearance: what the employee still holds or owes
  const cust=(S.custody||[]).filter(c=>c.emp===e.id&&custOut(c)),adv=(S.advances||[]).filter(a=>a.emp===e.id).reduce((s,a)=>s+advRemain(a),0);
  const depts=[['الفرع / مكان العمل','Workplace'],['المستودع','Warehouse'],['العهد','Custody items'],['السلف والمالية','Advances & finance'],['الموارد البشرية','HR']];
  return printDoc('إخلاء طرف','Clearance Form',dmy(day),`<table class="info">${[['الموظف / Employee',h(e.name)],['الرقم الوظيفي / Employee no.',h(e.no||'—')],['المسمى / Job',h(e.job||'—')],['مكان العمل / Workplace',h(pl)],['آخر يوم عمل / Last day',dmy(e.endDate||day)]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
  <div class="para"><b>عهد لم تُسترجع / Items not returned:</b> ${cust.length?cust.map(c=>h(c.item)+(c.value?' ('+nfmt(c.value)+')':'')).join('، '):'لا يوجد / None'}<br><b>سلف متبقية / Outstanding advances:</b> ${adv>0?nfmt(adv)+' SAR':'لا يوجد / None'}</div>
  <table><thead><tr><th>الجهة / Department</th><th>ملاحظات / Notes</th><th>الاسم والتوقيع / Name & signature</th></tr></thead><tbody>${depts.map(d=>`<tr><td>${d[0]} / ${d[1]}</td><td style="height:38px"></td><td></td></tr>`).join('')}</tbody></table>`,[['الموظف / Employee',e.name]],win);
}
/* ---------- forms: shared list card ---------- */
const formPill=st=>st==='cancelled'?`<span class="pill li-expired">${esc(t('ls_cancelled'))}</span>`:lrPill(st);
/* a deduction cancelled after its month's payroll was approved is paid back as an addition in a later payroll:
   the month after, or the month it was cancelled in if later. Before approval it simply drops out of the payroll. */
function dedRefundMonth(x){if(x.type!=='deduction'||x.status!=='cancelled'||!x.cancelledAt)return null;const om=String(x.date||'').slice(0,7);
  const P=(S.payroll||[]).find(p=>p.id===om);if(!P||P.status!=='approved'||!(String(P.approvedAt||'')<String(x.cancelledAt)))return null;
  const [y,mo]=om.split('-').map(Number),nm=new Date(Date.UTC(y,mo,1)).toISOString().slice(0,7),cm=String(x.cancelledAt).slice(0,7);return cm>nm?cm:nm}
function formCard(f,act){
  const det=f.type==='warning'?(LVL[f.level]||LVL[1])[0]:f.type==='deduction'?[+f.days?t('hr_days',{n:f.days}):'',+f.amount?sar2(f.amount)+' '+t('sar'):''].filter(Boolean).join(' + '):(+f.amount?sar2(f.amount)+' '+t('sar'):'');
  return`<button class="oc ${positiveForm(f.type)?'fm-reward':''}" data-act="${act}" data-id="${esc(f.id)}">
    <span style="min-width:0"><span class="t">${esc(f.empName)} <span class="tag fm-${f.type}">${esc(t('fm_'+f.type))}</span>${det?` <span class="hint">${esc(det)}</span>`:''}</span>
      <span class="s">${S.role==='hr'&&f.branch?esc(placeL(f.branch))+' · ':''}${esc(dateLabel(f.date))}${f.reason?' · '+esc(String(f.reason).slice(0,70)):''}</span></span>
    <span class="side">${formPill(f.status)}</span></button>`;
}
function formFields(d,staffOpts){
  const ty=d.type||'deduction';
  return`<div class="kind" style="margin-bottom:12px">${FORM_TYPES.map(k=>`<button aria-pressed="${ty===k}" data-act="fmType" data-k="${k}">${esc(t('fm_'+k))}</button>`).join('')}</div>
  <div class="sl-grid hr-grid">${hrSel('pick',t('lv_emp'),staffOpts)}${hrIn('date',t('sl_day'),'date')}
    ${hrSel('tplr',t('fm_tpl'),[['',t('fm_tplPick')],...formTpls(ty).map(x=>[x[0],x[1]])])}
    ${ty==='warning'?hrSel('level',t('fm_level'),[['1',t('fl_1')],['2',t('fl_2')],['3',t('fl_3')]]):''}
    ${ty==='deduction'?hrIn('days',t('fm_days'),'number')+hrIn('amount',t('fm_amount')+' ('+t('sar')+')','number'):''}
    ${ty==='reward'?hrIn('amount',t('fm_rewardAmount')+' ('+t('sar')+')','number'):''}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t(positiveForm(ty)?'fm_reasonReward':'fm_reason')}</span><textarea class="field" id="hr-reason" rows="3" dir="auto" data-in="hrF" data-f="reason">${esc(d.reason||'')}</textarea></label>`;
}
/* ---------- branch: forms tab ---------- */
function branchFormsView(){
  const list=[...(S.forms||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_forms')}</h2><button class="btn btn-sun" data-act="fmNew">+ ${t('fm_new')}</button></div>
  <div class="list" style="margin-top:10px">${list.length?list.map(f=>formCard(f,'fmOpen')).join(''):`<div class="empty">${esc(t('fm_none'))}</div>`}</div>`;
}
function formSheet(){
  const isNew=S.openForm==='new';const d=S.hrDraft||{};
  const f=isNew?null:(S.forms||[]).find(x=>x.id===S.openForm);if(!isNew&&!f)return'';
  if(!isNew){ // view (and HR decision)
    const hr=S.role==='hr',pending=f.status==='pending';
    const emps=(S.emps||[]).filter(e=>e.status!=='left'||e.id===d.emp).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
    const body=`<div class="box">${formCard(f,'').replace(/^<button/,'<div').replace(/<\/button>$/,'</div>')}</div>
    ${f.reason?`<div class="box"><h4>${t(positiveForm(f.type)?'fm_reasonReward':'fm_reason')}</h4><div dir="auto" style="white-space:pre-wrap">${esc(f.reason)}</div></div>`:''}
    ${f.status==='cancelled'?`<div class="box"><h4>${t('fm_cancelled')}</h4><div dir="auto">${esc(f.cancelReason||'')}</div><div class="hint">${esc(when(f.cancelledAt))}${f.cancelledBy?' · '+esc(f.cancelledBy):''}${dedRefundMonth(f)?' · '+esc(t('fm_refundIn',{m:dedRefundMonth(f)})):''}</div></div>`:''}
    ${hr&&f.type==='deduction'&&f.status==='approved'?`<div class="box"><h4>${t('fm_cancelTitle')}</h4><label style="display:block"><span class="hint">${t('fm_cancelReason')}</span><textarea class="field" id="hr-cancelReason" rows="2" dir="auto" data-in="hrF" data-f="cancelReason">${esc(d.cancelReason||'')}</textarea></label><p class="hint">${esc(t('fm_cancelHint'))}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-bad rp-btn" data-act="fmCancel">${S.confirm==='fmCancel'?t('fm_cancelSure'):t('fm_cancel')}</button></div></div>`:''}
    ${f.hrNote&&!(hr&&pending)?`<div class="box"><h4>${t('lr_hrNote')}</h4><div dir="auto">${esc(f.hrNote)}</div></div>`:''}
    ${hr&&pending?`<div class="sl-grid hr-grid">${hrSel('emp',t('lr_linkEmp'),[['',t('hr_pickEmp')],...emps.map(e=>[e.id,e.name+(e.no?' #'+e.no:'')+' — '+placeL(e.branch)])])}</div>
      <label style="display:block;margin-top:10px"><span class="hint">${t('lr_hrNote')}</span><textarea class="field" id="hr-hrNote" rows="2" dir="auto" data-in="hrF" data-f="hrNote">${esc(d.hrNote||'')}</textarea></label>`:''}`;
    const foot=hr&&pending?`<button class="btn btn-bad" data-act="fmDecide" data-k="rejected">${t('lv_reject')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="fmDecide" data-k="approved">${t('lv_approve')}</button>`
      :`${(hr||f.status==='pending')?`<button class="btn btn-bad" data-act="fmDel">${S.confirm==='fmDel'?t('li_delConfirm'):t('del')}</button>`:''}<span class="spacer"></span>${hr&&f.type==='reward'&&f.status==='approved'&&+f.amount&&!f.voucher?`<button class="btn btn-ghost" data-act="fmVoucher">${t('fm_toVoucher')}</button>`:''}${f.status!=='rejected'?`<button class="btn btn-sun" data-act="fmPrint">${t('fm_print')}</button>`:''}`;
    return hrSheetWrap(t('fm_'+f.type)+': '+f.empName,body+(f.photos&&typeof phBlock==='function'?phBlock('forms',f.id,{readOnly:true,title:'ph_proof'}):''),foot);
  }
  const opts=S.role==='hr'?[['',t('hr_pickEmp')],...(S.emps||[]).filter(e=>e.status!=='left').sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).map(e=>['e:'+e.id,e.name+(e.no?' #'+e.no:'')+' — '+placeL(e.branch)])]
    :[['',t('hr_pickEmp')],...activeStaff().map(st=>['s:'+st.id,st.name+(st.no?' #'+st.no:'')])];
  const foot=`<span class="spacer"></span><button class="btn btn-sun" data-act="fmSend" ${S.busy?'disabled':''}>${t(S.role==='hr'?'waSave':'fm_send')}</button>`;
  return hrSheetWrap(t('fm_new'),formFields(d,opts)+(S.role==='branch'&&!activeStaff().length?`<p class="hint">${esc(t('sh_noStaff'))}</p>`:'')+(typeof phBlock==='function'?phBlock('forms',null,{title:'ph_proof'}):''),foot);
}
/* ---------- HR: forms tab ---------- */
function hrFormsView(){
  const f=S.fmFilter||'all';
  const all=[...(S.forms||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const pend=all.filter(x=>x.status==='pending');
  const list=all.filter(x=>x.status!=='pending'&&(f==='all'||x.type===f));
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_forms')}</h2><div class="row"><button class="btn btn-ghost rp-btn" data-act="tpNew">${t('tp_print')}</button><button class="btn btn-sun" data-act="fmNew">+ ${t('fm_new')}</button></div></div>
  ${pend.length?`<div class="rp-sec lr-hr"><h3>${t('fm_pending')} <span class="badge num">${pend.length}</span></h3><div class="list" style="margin-top:10px">${pend.map(x=>formCard(x,'fmOpen')).join('')}</div></div>`:''}
  <div class="filters">${[['all','f_all'],...FORM_TYPES.map(k=>[k,'fm_'+k])].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="fmFilter" data-k="${k}">${t(l)}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(x=>formCard(x,'fmOpen')).join(''):`<div class="empty">${esc(t('fm_none'))}</div>`}</div>`;
}
function templateSheet(){
  const d=S.hrDraft||{};
  const emps=(S.emps||[]).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const body=`<div class="sl-grid hr-grid">${hrSel('tpl',t('tp_kind'),TEMPLATES.map(k=>[k,t('tp_'+k)]))}${hrSel('emp',t('lv_emp'),[['',t('hr_pickEmp')],...emps.map(e=>[e.id,e.name+(e.no?' #'+e.no:'')+(e.status==='left'?' ('+t('es_left')+')':'')])])}${hrIn('date',t('sl_day'),'date')}</div>
  <p class="hint" style="margin-top:8px">${esc(t('tp_hint'))}</p>`;
  return hrSheetWrap(t('tp_print'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="tpPrint">${t('fm_print')}</button>`);
}
const empFormTags=e=>{const F=(S.forms||[]).filter(f=>f.emp===e.id&&f.status==='approved');if(!F.length)return'';
  const w=F.filter(f=>f.type==='warning').length,dd=F.filter(f=>f.type==='deduction').length,r=F.filter(f=>f.type==='reward').length;
  return(w?`<span class="tag ret">${esc(t('fm_warning'))}: ${w}</span>`:'')+(dd?`<span class="tag ret">${esc(t('fm_deduction'))}: ${dd}</span>`:'')+(r?`<span class="tag">${esc(t('fm_reward'))}: ${r}</span>`:'')};
Object.assign(A,{
  vcNew(el){S.openVc='new';S.confirm=null;S.hrDraft={no:nextVoucherNo(),date:dayKey(Date.now()),emp:'',payee:'',amount:'',cat:'other',method:'cash',ref:'',purpose:''};render()},
  vcOpen(el){const v=(S.vouchers||[]).find(x=>x.id===el.dataset.id);if(!v)return;S.openVc=v.id;S.confirm=null;S.hrDraft=Object.assign({},v);render()},
  vcSave(el){const d=S.hrDraft||{};const amount=num(d.amount);const payee=String(d.payee||'').trim()||(d.emp?empName(d.emp):'');
    if(!payee||!(amount>0)){toast(t('vc_need'));return}
    if(d.iban&&!ibanOk(d.iban)){toast(t('bk_bad'));return}
    const id=S.openVc==='new'?hrId('V'):S.openVc;const old=(S.vouchers||[]).find(x=>x.id===id)||{};const tm=nowIso();
    const data={no:Math.round(num(d.no))||nextVoucherNo(),date:isDay(d.date)?d.date:dayKey(Date.now()),emp:d.emp||'',payee,amount,cat:VC_CATS.includes(d.cat)?d.cat:'other',method:PAY_METHODS.includes(d.method)?d.method:'cash',
      ref:String(d.ref||'').trim(),bank:String(d.bank||'').trim(),iban:normIban(d.iban),purpose:String(d.purpose||'').trim(),form:old.form||d.form||'',createdAt:old.createdAt||tm,updatedAt:tm};
    const phId=S.openVc==='new'?null:S.openVc;if(typeof phCount==='function'){const _n=phCount('vouchers',phId);if(_n!=null)data.photos=_n}
    const win=el&&el.dataset.k?window.open('','_blank'):null;if(win)printVoucher(data,win);
    guard(async()=>{await X.put('vouchers',id,data);if(typeof phCommit==='function')await phCommit('vouchers',phId,id,'');if(data.form)await X.upd('forms',data.form,{voucher:id}).catch(()=>{});S.openVc=null;S.hrDraft=null},()=>t('vc_saved'))},
  vcDel(){const id=S.openVc;if(!id||id==='new')return;if(S.confirm!=='vcDel'){S.confirm='vcDel';render();return}
    guard(async()=>{await X.del('vouchers',id);S.openVc=null;S.confirm=null},()=>t('li_deleted'))},
  fmNew(){S.openForm='new';S.confirm=null;S.hrDraft={type:'deduction',pick:'',date:dayKey(Date.now()),level:'1',days:'',amount:'',reason:''};render()},
  fmType(el){S.hrDraft.type=el.dataset.k;S.hrDraft.tplr='';render()},
  fmFilter(el){S.fmFilter=el.dataset.k;render()},
  fmOpen(el){const f=(S.forms||[]).find(x=>x.id===el.dataset.id);if(!f)return;S.openForm=f.id;S.confirm=null;
    const m=S.role==='hr'&&f.status==='pending'?(f.emp?empById(f.emp):lrMatch(f)):null;S.hrDraft={emp:m?m.id:(f.emp||''),hrNote:''};render()},
  fmSend(){
    const d=S.hrDraft||{};const ty=FORM_TYPES.includes(d.type)?d.type:'deduction';
    const pick=String(d.pick||'');let who=null,branch=S.branch||'',staffId='',emp='';
    if(pick.startsWith('s:')){who=(S.staff||[]).find(x=>x.id===pick.slice(2));if(who){staffId=who.id;emp=who.emp||''}}
    if(pick.startsWith('e:')){who=empById(pick.slice(2));if(who){emp=who.id;branch=S.branches.includes(who.branch)?who.branch:''}}
    if(!who||!String(d.reason||'').trim()){toast(t('fm_need'));return}
    if(ty==='deduction'&&!(num(d.days)>0)&&!(num(d.amount)>0)){toast(t('fm_needDed'));return}
    const tm=nowIso(),hr=S.role==='hr';
    const data={branch,staffId,emp,empName:who.name,empNo:String(who.no||''),type:ty,date:isDay(d.date)?d.date:dayKey(Date.now()),reason:String(d.reason).trim(),
      amount:ty!=='warning'&&num(d.amount)>0?num(d.amount):null,days:ty==='deduction'&&num(d.days)>0?num(d.days):null,level:ty==='warning'?String(d.level||'1'):null,
      status:hr?'approved':'pending',by:hr?'hr':'branch',createdAt:tm};
    if(hr)data.decidedAt=tm;if(typeof phCount==='function'){const _n=phCount('forms',null);if(_n!=null)data.photos=_n}
    const fid=hrId('F');
    guard(async()=>{await X.put('forms',fid,data);if(typeof phCommit==='function')await phCommit('forms',null,fid,branch);S.openForm=null;S.hrDraft=null},()=>t(hr?'fm_saved':'fm_sent'));
  },
  fmCancel(){const f=(S.forms||[]).find(x=>x.id===S.openForm);if(!f||f.type!=='deduction'||f.status!=='approved')return;const r=String((S.hrDraft||{}).cancelReason||'').trim();
    if(!r){toast(t('fm_needCancelReason'));return}if(S.confirm!=='fmCancel'){S.confirm='fmCancel';render();return}
    guard(async()=>{await dedCancel(f.id,r);S.confirm=null},()=>t('fm_cancelDone'))},
  fmDecide(el){const f=(S.forms||[]).find(x=>x.id===S.openForm);if(!f)return;const d=S.hrDraft||{};const st=el.dataset.k;
    if(st==='approved'&&!d.emp){toast(t('lr_pickFirst'));return}
    guard(async()=>{await X.upd('forms',f.id,{status:st,emp:d.emp||f.emp||'',hrNote:String(d.hrNote||'').trim(),decidedAt:nowIso()});S.openForm=null;S.hrDraft=null},()=>t(st==='approved'?'fm_approved':'lr_rejected'))},
  fmDel(){const id=S.openForm;if(!id)return;if(S.confirm!=='fmDel'){S.confirm='fmDel';render();return}
    guard(async()=>{await X.del('forms',id);S.openForm=null;S.confirm=null},()=>t('li_deleted'))},
  fmPrint(){const f=(S.forms||[]).find(x=>x.id===S.openForm);if(!f)return;printForm(f,window.open('','_blank'))},
  fmVoucher(){const f=(S.forms||[]).find(x=>x.id===S.openForm);if(!f)return;
    S.openForm=null;S.openVc='new';S.confirm=null;S.hrDraft={no:nextVoucherNo(),date:dayKey(Date.now()),emp:f.emp||'',payee:f.empName,amount:f.amount,cat:'reward',...(()=>{const e=f.emp&&empById(f.emp);return e&&e.iban?{method:'bank',bank:e.bank||'',iban:ibanFmt(e.iban)}:{method:'cash'}})(),ref:'',purpose:t('fm_reward')+': '+(f.reason||''),form:f.id};render()},
  tpNew(){S.openTpl=true;S.hrDraft={tpl:'salary',emp:'',date:dayKey(Date.now())};render()},
  tpPrint(){const d=S.hrDraft||{};const e=empById(d.emp);if(!e){toast(t('lr_pickFirst'));return}printTemplate(d.tpl||'salary',e,isDay(d.date)?d.date:dayKey(Date.now()),window.open('','_blank'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(!(el.dataset&&el.dataset.in==='hrF'))return;
  if(S.openVc&&el.dataset.f==='amount'){const o=document.getElementById('vcWords');if(o)o.textContent=num(el.value)>0?tafqeet(num(el.value)):''}
  if(S.openVc&&el.dataset.f==='emp'){const e=empById(el.value);const set=(f,v)=>{S.hrDraft[f]=v;const o=document.getElementById('hr-'+f);if(o)o.value=v};
    if(e){const p=document.getElementById('hr-payee');if(p&&!p.value)set('payee',e.name);set('bank',e.bank||'');set('iban',e.iban?ibanFmt(e.iban):'');if(e.iban&&(S.hrDraft.method||'cash')==='cash')set('method','bank')}
    else{set('bank','');set('iban','')}}});
/* voucher export (defined here: it needs VC_CATS / PAY_METHODS above) */
IO.vouchers={name:()=>t('tab_vc'),readOnly:true,list:()=>[...(S.vouchers||[])].sort((a,b)=>(+a.no||0)-(+b.no||0)),
    cols:[['no','vc_no','num'],['date','sl_day','date'],['payee','vc_payee'],['amount','vc_amount','num'],['cat','vc_cat',Object.fromEntries(VC_CATS.map(k=>[k,'vc_'+k]))],['method','vc_method',Object.fromEntries(PAY_METHODS.map(k=>[k,'pm_'+k]))],['ref','vc_ref'],['bank','bk_bank'],['iban','bk_iban'],['purpose','vc_purpose']]};
document.addEventListener('input',ev=>{const el=ev.target;if(!(S.openForm&&el.dataset&&el.dataset.in==='hrF'&&el.dataset.f==='tplr'))return;
  const x=formTpls(S.hrDraft.type||'deduction').find(v=>v[0]===el.value);if(!x)return;
  S.hrDraft.reason=x[1];const r=document.getElementById('hr-reason');if(r)r.value=x[1];
  if(x[2]&&x[2].days&&(S.hrDraft.type||'deduction')==='deduction'){S.hrDraft.days=x[2].days;const dd=document.getElementById('hr-days');if(dd)dd.value=x[2].days}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='vcMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.vcMonth=el.value;render()}});


/* cancel an approved deduction (HR, or operations for one it made on a branch visit) */
async function dedCancel(id,reason){await X.upd('forms',id,{status:'cancelled',cancelReason:reason,cancelledAt:nowIso(),cancelledBy:S.userName||roleL(S.realRole||S.role)})}
