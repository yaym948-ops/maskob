/* Maskob — daily sales log (المبيعات اليومية) for operations and finance: each branch's day with its figures
   and the photo of the till closing report, and a review mark after comparing them:
   sales/{id}.review = {st:'ok'|'diff', note, by, role, at}. A branch that changes its figures saves the day
   again without the mark, so it comes back for review.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
const slRevState=r=>r.review&&r.review.st?r.review.st:'wait';
const slNoPhoto=r=>!(+r.photos>0);
/* days waiting for review (with figures) in the last 31 days: the menu badge */
const slWaiting=()=>{const from=dayKey(Date.now()-31*864e5);return(S.sales||[]).filter(r=>r.date>=from&&slRevState(r)==='wait').length};
function salesLogView(){
  const mk=S.slLogMonth||monthKey(Date.now()),bf=S.slLogBranch||'',sf=S.slLogSt||'';
  const all=(S.sales||[]).filter(r=>String(r.date).startsWith(mk));
  const list=all.filter(r=>(!bf||r.branch===bf)&&(!sf||(sf==='nophoto'?slNoPhoto(r):slRevState(r)===sf)))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.branch).localeCompare(String(b.branch),'ar'));
  const cnt=k=>all.filter(r=>(!bf||r.branch===bf)&&(k==='nophoto'?slNoPhoto(r):slRevState(r)===k)).length;
  const days=[...new Set(list.map(r=>r.date))];
  const ic=n=>typeof ico==='function'?ico(n):'';
  const chip=(k,l,n)=>`<button class="chip" aria-pressed="${sf===k}" data-act="slLogSt" data-k="${k}">${esc(t(l))}${n!=null?` <span class="c num">(${n})</span>`:''}</button>`;
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_slLog')}</h2><div class="row"><input class="field" type="month" id="slLogMonth" value="${esc(mk)}" style="width:auto"></div></div>
  <div class="stats">${kpi(t('sl_totalAll'),sar(list.reduce((s,r)=>s+(+r.sales||0),0))+' '+t('sar'))}${kpi(t('slr_wait'),sar(cnt('wait')),cnt('wait')?'hot':'')}${kpi(t('slr_diff'),sar(cnt('diff')),cnt('diff')?'hot':'')}${kpi(t('slr_nophoto'),sar(cnt('nophoto')))}</div>
  <div class="filters"><button class="chip" aria-pressed="${!bf}" data-act="slLogBranch" data-k="">${t('f_all')}</button>${S.branches.map(b=>`<button class="chip" aria-pressed="${bf===b}" data-act="slLogBranch" data-k="${esc(b)}">${esc(b)}</button>`).join('')}</div>
  <div class="filters">${chip('',"f_all")}${chip('wait','slr_wait',cnt('wait'))}${chip('ok','slr_ok',cnt('ok'))}${chip('diff','slr_diff',cnt('diff'))}${chip('nophoto','slr_nophoto',cnt('nophoto'))}</div>
  ${days.length?days.map(dk=>`<div class="cat-h">${esc(dateLabel(dk))}</div><div class="list">${list.filter(r=>r.date===dk).map(r=>{const st=slRevState(r);
    return`<button class="oc ${st==='diff'?'late':''}" data-act="slLogOpen" data-id="${esc(r.id)}">
      <span style="min-width:0"><span class="t">${esc(r.branch)}</span>
        <span class="s">${esc(t('sl_inv'))}: <b class="num">${esc(sar(r.invoices))}</b> · ${esc(t('sl_avg'))}: <span class="num">${+r.invoices?esc(sar2(r.sales/r.invoices)):'—'}</span>${r.review&&r.review.note?' · '+esc(String(r.review.note).slice(0,60)):''}</span></span>
      <span class="side"><b class="num">${esc(sar(r.sales))} ${t('sar')}</b>
        <span class="row" style="gap:6px;justify-content:flex-end">${slNoPhoto(r)?`<span class="pill sl-nophoto">${esc(t('slr_nophoto'))}</span>`:`<span class="pill sl-ph">${ic('camera')} <span class="num">${+r.photos}</span></span>`}
        <span class="pill ${st==='ok'?'ms-done':st==='diff'?'li-expired':'ms-progress'}">${esc(t('slr_'+st))}</span></span></span></button>`}).join('')}</div>`).join('')
    :`<div class="empty">${esc(t('fn_noData'))}</div>`}`;
}
function salesDaySheet(){
  const r=(S.sales||[]).find(x=>x.id===S.openSl);if(!r)return'';
  const st=slRevState(r),rv=r.review||{};
  const body=`<div class="stats">${kpi(t('sl_sales'),sar2(r.sales)+' '+t('sar'))}${kpi(t('sl_inv'),sar(r.invoices))}${kpi(t('sl_avg'),+r.invoices?sar2(r.sales/r.invoices)+' '+t('sar'):'—')}</div>
  ${slNoPhoto(r)?`<div class="note-bar">${esc(t('slr_nophotoHint'))}</div>`:(typeof phBlock==='function'?phBlock('sales',r.id,{readOnly:true,title:'ph_sales'}):'')}
  <h4 class="hr-sub">${t('slr_title')}</h4>
  ${st==='wait'?'':`<p class="hint"><span class="pill ${st==='ok'?'ms-done':'li-expired'}">${esc(t('slr_'+st))}</span> ${esc(rv.by||'')}${rv.at?' · '+esc(when(rv.at)):''}${rv.note?`<br><span dir="auto">${esc(rv.note)}</span>`:''}</p>`}
  <label style="display:block"><span class="hint">${t('slr_note')}</span><textarea class="field" id="slRevNote" rows="2" dir="auto" data-in="slRev">${esc(S.slRevNote!=null?S.slRevNote:(rv.note||''))}</textarea></label>`;
  const foot=`<button class="btn btn-bad" data-act="slRev" data-k="diff" ${S.busy?'disabled':''}>${t('slr_markDiff')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="slRev" data-k="ok" ${S.busy?'disabled':''}>${t('slr_markOk')}</button>`;
  return hrSheetWrap(r.branch+' · '+dateLabel(r.date),body,foot);
}
Object.assign(A,{
  slLogOpen(el){S.openSl=el.dataset.id;S.slRevNote=null;render()},
  slLogBranch(el){S.slLogBranch=el.dataset.k;render()},
  slLogSt(el){S.slLogSt=el.dataset.k;render()},
  slRev(el){const r=(S.sales||[]).find(x=>x.id===S.openSl);if(!r)return;const st=el.dataset.k==='diff'?'diff':'ok';
    const note=String(S.slRevNote!=null?S.slRevNote:((r.review||{}).note||'')).trim();
    if(st==='diff'&&!note){toast(t('slr_needNote'));return}
    const review={st,note,by:S.userName||roleL(S.realRole||S.role),role:S.role,at:nowIso()};
    guard(async()=>{await X.upd('sales',r.id,{review});S.openSl=null;S.slRevNote=null},()=>t('slr_saved'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='slRev')S.slRevNote=el.value});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='slLogMonth'&&/^[0-9]{4}-[0-9]{2}$/.test(el.value)){S.slLogMonth=el.value;render()}});
