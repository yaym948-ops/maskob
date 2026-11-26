/* Maskob — Suppliers (الموردين): supplier cards, picking a supplier in invoices and expenses, and the
   supplier statement (كشف حساب المورد) as a finance report.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   suppliers/{id}: {name, vatNo, phone, cat, termDays, bank, iban, note, createdAt, updatedAt}
   An invoice belongs to a supplier by supplierId, or (older invoices) by VAT number or name. */
const SUP_CATS=['dairy','produce','coffee','bakery','meat','packaging','cleaning','equipment','services','other'];
const supList=()=>[...(S.suppliers||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
const supById=id=>(S.suppliers||[]).find(s=>s.id===id)||null;
/* a supplier by its VAT number (most reliable), else by its exact name */
const supFind=(name,vatNo)=>{const L=S.suppliers||[],v=String(vatNo||'').trim(),n=String(name||'').trim();
  return(v&&L.find(s=>s.vatNo===v))||(n&&L.find(s=>String(s.name).trim()===n))||null};
const supInvOf=s=>(S.supInv||[]).filter(i=>i.supplierId?i.supplierId===s.id:((s.vatNo&&i.vatNo===s.vatNo)||String(i.supplier||'').trim()===String(s.name).trim()));
const supBalance=s=>r2p(supInvOf(s).reduce((a,i)=>a+supRemain(i),0));
function supDatalist(){return`<datalist id="supList">${supList().map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>`}
/* a supplier picked in an invoice or expense: its VAT number and usual credit term come with it */
function supApply(d,s){if(!s)return;d.supplierId=s.id;if(!d.vatNo&&s.vatNo)d.vatNo=s.vatNo;
  if(S.openSi&&s.termDays){d.terms='credit';d.termDays=String(s.termDays);if(isDay(d.date))d.due=addDays(d.date,+s.termDays)}}

/* ---------- list ---------- */
function suppliersView(){
  const q=String(S.supQ||'').trim().toLowerCase(),today=dayKey(Date.now());
  const all=supList().map(s=>{const inv=supInvOf(s);return{s,bal:supBalance(s),late:inv.filter(i=>supRemain(i)>0&&i.due&&i.due<today).length,n:inv.length}});
  const list=all.filter(x=>!q||[x.s.name,x.s.vatNo,x.s.phone,t('spc_'+(x.s.cat||'other'))].some(v=>String(v||'').toLowerCase().includes(q)));
  const owed=all.reduce((a,x)=>a+x.bal,0);
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_sup')}</h2><div class="row">${ioBtns('suppliers')}<button class="btn btn-sun" data-act="supNew">+ ${t('sp_add')}</button></div></div>
  <div class="stats">${kpi(t('sp_count'),sar(all.length))}${kpi(t('fn_owed'),sar2(owed)+' '+t('sar'),owed?'hot':'')}${kpi(t('sp_late'),sar(all.filter(x=>x.late).length),all.some(x=>x.late)?'hot':'')}</div>
  <input class="field" id="supQ" data-in="supQ" placeholder="${esc(t('sp_search'))}" value="${esc(S.supQ||'')}" style="margin-bottom:10px">
  <div class="list">${list.length?list.map(({s,bal,late,n})=>`<button class="oc ${late?'late':''}" data-act="supOpen" data-id="${esc(s.id)}">
    <span style="min-width:0"><span class="t">${esc(s.name)} <span class="tag">${esc(t('spc_'+(s.cat||'other')))}</span></span>
      <span class="s">${s.vatNo?`<span dir="ltr">${esc(s.vatNo)}</span> · `:''}${s.termDays?esc(t('tm_nDays',{n:s.termDays})):esc(t('tm_cash'))} · ${esc(t('sp_invN',{n}))}${s.phone?` · <span dir="ltr">${esc(s.phone)}</span>`:''}</span></span>
    <span class="side"><b class="num">${esc(sar2(bal))} ${t('sar')}</b>${late?`<span class="pill li-expired">${esc(t('si_overdue'))}: ${late}</span>`:''}</span></button>`).join('')
    :`<div class="empty">${esc(t(all.length?'sp_noMatch':'sp_none'))}</div>`}</div>`;
}
/* ---------- card ---------- */
function supplierSheet(){
  const isNew=S.openSup==='new',d=S.hrDraft||{},s=isNew?null:supById(S.openSup);if(!isNew&&!s)return'';
  const inv=s?supInvOf(s).sort((a,b)=>String(b.date).localeCompare(String(a.date))):[];
  const body=`<div class="sl-grid hr-grid">${hrIn('name',t('sp_name'))}${hrIn('vatNo',t('sc_vatNo'),'text','dir="ltr" inputmode="numeric"')}${hrIn('phone',t('sp_phone'),'tel')}
    ${hrSel('cat',t('sp_cat'),SUP_CATS.map(c=>[c,t('spc_'+c)]))}${hrSel('termDays',t('sp_terms'),[['0',t('tm_cash')],...TERM_DAYS.map(n=>[String(n),t('tm_nDays',{n})])])}
    ${hrIn('bank',t('bk_bank'))}${hrIn('iban',t('bk_iban'),'text','dir="ltr"')}</div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('hr_note')}</span><textarea class="field" id="hr-note" rows="2" dir="auto" data-in="hrF" data-f="note">${esc(d.note||'')}</textarea></label>
  ${s?`<h4 class="hr-sub">${t('tab_supst')}</h4>
    <div class="ct-pay"><span>${esc(t('sp_invN',{n:inv.length}))}</span><span class="ct-tot">${t('sp_balance')}: <b class="num">${esc(sar2(supBalance(s)))} ${t('sar')}</b></span></div>
    ${inv.slice(0,6).map(i=>`<div class="hint">${esc(dateLabel(i.date))} · ${i.number?'<span dir="ltr">#'+esc(i.number)+'</span> · ':''}<b class="num">${esc(sar2(i.amount))}</b> · ${esc(t('av_remain'))}: ${esc(sar2(supRemain(i)))}</div>`).join('')}
    <div class="row" style="margin-top:8px"><button class="btn btn-navy rp-btn" data-act="supSt" data-id="${esc(s.id)}">${t('sp_statement')}</button><button class="btn btn-ghost rp-btn" data-act="siNew" data-sup="${esc(s.id)}">+ ${t('si_add')}</button></div>`:''}`;
  const foot=`${isNew?'':`<button class="btn btn-bad" data-act="supDel">${S.confirm==='supDel'?t('li_delConfirm'):t('del')}</button>`}<span class="spacer"></span><button class="btn btn-sun" data-act="supSave" ${S.busy?'disabled':''}>${t('waSave')}</button>`;
  return hrSheetWrap(isNew?t('sp_add'):s.name,body,foot);
}
/* ---------- statement (a report) ---------- */
/* invoices are what we owe (له), payments reduce it (عليه); the balance runs from the opening balance */
function supStatement(s,from,to){
  const ev=[];
  supInvOf(s).forEach(i=>{ev.push({date:i.date,kind:'inv',desc:t('ss_inv',{n:i.number||'—'})+(i.terms==='cash'?' · '+t('tm_cash'):''),credit:+i.amount||0,debit:0});
    (i.payments||[]).forEach(p=>ev.push({date:p.date,kind:'pay',desc:t('ss_pay',{n:i.number||'—'})+(p.vno?' · '+t('vc_title')+' #'+p.vno:'')+' · '+t('pm_'+(p.method||'bank')),credit:0,debit:+p.amount||0}))});
  ev.sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.kind==='inv'?-1:1));
  let open=0;const rows=[];
  for(const e of ev){if(from&&e.date<from){open+=e.credit-e.debit;continue}if(to&&e.date>to)continue;rows.push(e)}
  let bal=open;rows.forEach(r=>{bal+=r.credit-r.debit;r.bal=r2p(bal)});
  return{open:r2p(open),rows,close:r2p(bal),inv:r2p(rows.reduce((a,r)=>a+r.credit,0)),paid:r2p(rows.reduce((a,r)=>a+r.debit,0))};
}
const ssRange=()=>({from:isDay(S.ssFrom)?S.ssFrom:dayKey(Date.now()).slice(0,4)+'-01-01',to:isDay(S.ssTo)?S.ssTo:dayKey(Date.now())});
function supStatementView(){
  const L=supList(),s=supById(S.ssSup)||L[0]||null,R=ssRange();
  const head=`<div class="row" style="justify-content:space-between"><h2>${t('tab_supst')}</h2>${s?`<div class="row"><button class="btn btn-ghost rp-btn" data-act="ssXls">${t('xlsExport')}</button><button class="btn btn-ghost rp-btn" data-act="ssPrint">${t('fm_print')}</button></div>`:''}</div>`;
  if(!s)return head+`<div class="empty">${esc(t('sp_none'))}</div>`;
  const st=supStatement(s,R.from,R.to);
  return head+`<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <select class="field" id="ssSup" style="width:auto;min-width:200px">${L.map(x=>`<option value="${esc(x.id)}" ${x.id===s.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
    <label class="row" style="gap:4px"><span class="hint">${t('ss_from')}</span><input class="field" type="date" id="ssFrom" value="${esc(R.from)}" style="width:auto"></label>
    <label class="row" style="gap:4px"><span class="hint">${t('ss_to')}</span><input class="field" type="date" id="ssTo" value="${esc(R.to)}" style="width:auto"></label></div>
  <div class="stats">${kpi(t('ss_open'),sar2(st.open))}${kpi(t('ss_invs'),sar2(st.inv))}${kpi(t('ss_paid'),sar2(st.paid))}${kpi(t('ss_close'),sar2(st.close)+' '+t('sar'),st.close>0?'hot':'')}</div>
  <div class="scroll"><table class="tbl fn-tbl ss-tbl"><thead><tr><th>${t('sl_day')}</th><th>${t('ss_desc')}</th><th>${t('ss_credit')}</th><th>${t('ss_debit')}</th><th>${t('ss_bal')}</th></tr></thead><tbody>
    <tr class="pl-sub"><td></td><td>${esc(t('ss_open'))}</td><td></td><td></td><td class="n"><b>${esc(sar2(st.open))}</b></td></tr>
    ${st.rows.map(r=>`<tr><td>${esc(dateLabel(r.date))}</td><td>${esc(r.desc)}</td><td class="n">${r.credit?esc(sar2(r.credit)):''}</td><td class="n">${r.debit?esc(sar2(r.debit)):''}</td><td class="n">${esc(sar2(r.bal))}</td></tr>`).join('')||`<tr><td colspan="5" class="hint">${esc(t('fn_noData'))}</td></tr>`}
    <tr class="pl-sub"><td></td><td><b>${esc(t('ss_close'))}</b></td><td class="n"><b>${esc(sar2(st.inv))}</b></td><td class="n"><b>${esc(sar2(st.paid))}</b></td><td class="n"><b>${esc(sar2(st.close))}</b></td></tr>
  </tbody></table></div>`;
}
function ssSheet(){const s=supById(S.ssSup)||supList()[0];if(!s)return null;const R=ssRange(),st=supStatement(s,R.from,R.to);
  return{s,R,st,name:t('tab_supst'),headers:[t('sl_day'),t('ss_desc'),t('ss_credit'),t('ss_debit'),t('ss_bal')],
    rows:[['',t('ss_open'),'','',st.open],...st.rows.map(r=>[r.date,r.desc,r.credit||'',r.debit||'',r.bal]),['',t('ss_close'),st.inv,st.paid,st.close]]}}
Object.assign(A,{
  supNew(){S.openSup='new';S.confirm=null;S.hrDraft={name:'',vatNo:'',phone:'',cat:'other',termDays:'30',bank:'',iban:'',note:''};render()},
  supOpen(el){const s=supById(el.dataset.id);if(!s)return;S.openSup=s.id;S.confirm=null;S.hrDraft=Object.assign({},s,{termDays:String(s.termDays||0)});render()},
  supSave(){const d=S.hrDraft||{},name=String(d.name||'').trim(),vatNo=String(d.vatNo||'').trim();
    if(!name){toast(t('sp_need'));return}
    if(vatNo&&!/^3[0-9]{13}3$/.test(vatNo)){toast(t('sc_badVat'));return}
    const id=S.openSup==='new'?hrId('SP'):S.openSup,old=supById(id)||{},tm=nowIso();
    const dup=(S.suppliers||[]).find(x=>x.id!==id&&((vatNo&&x.vatNo===vatNo)||String(x.name).trim()===name));if(dup){toast(t('sp_dup',{n:dup.name}));return}
    const td=+d.termDays||0;
    const data={name,vatNo,phone:String(d.phone||'').trim(),cat:SUP_CATS.includes(d.cat)?d.cat:'other',termDays:TERM_DAYS.includes(td)?td:0,
      bank:String(d.bank||'').trim(),iban:String(d.iban||'').replace(/\s+/g,'').toUpperCase(),note:String(d.note||'').trim(),createdAt:old.createdAt||tm,updatedAt:tm};
    guard(async()=>{await X.put('suppliers',id,data);S.openSup=null;S.hrDraft=null},()=>t('st_saved'))},
  supDel(){const s=supById(S.openSup);if(!s)return;if(supInvOf(s).length){toast(t('sp_hasInv'));return}
    if(S.confirm!=='supDel'){S.confirm='supDel';render();return}
    guard(async()=>{await X.del('suppliers',s.id);S.openSup=null;S.confirm=null},()=>t('li_deleted'))},
  supSt(el){S.ssSup=el.dataset.id;S.openSup=null;S.hrDraft=null;S.tab='supst';S.navRep=true;render()},
  ssXls(){const x=ssSheet();if(x)saveXlsx('maskob-supplier-'+x.R.from+'_'+x.R.to+'.xlsx',[{name:x.name,headers:x.headers,rows:x.rows}])},
  ssPrint(){const x=ssSheet();if(!x)return;
    const body=`<div class="para"><b>${esc(x.s.name)}</b>${x.s.vatNo?' · الرقم الضريبي / VAT: '+esc(x.s.vatNo):''}</div>
      <table><thead><tr>${x.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.rows.map(r=>`<tr>${r.map((c,i)=>`<td>${i>1&&typeof c==='number'?nfmt(c):esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    printDoc('كشف حساب مورد','Supplier statement',esc(x.R.from)+' — '+esc(x.R.to),body,[['الإدارة المالية / Finance',''],['المورد / Supplier',x.s.name]],window.open('','_blank'))}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='supQ'){S.supQ=el.value;clearTimeout(S._supT);S._supT=setTimeout(render,160)}});
document.addEventListener('change',ev=>{const el=ev.target;
  if(el.id==='ssSup'){S.ssSup=el.value;render()}
  if(el.id==='ssFrom'&&isDay(el.value)){S.ssFrom=el.value;render()}
  if(el.id==='ssTo'&&isDay(el.value)){S.ssTo=el.value;render()}});
/* Excel import / export */
IO.suppliers={name:()=>t('tab_sup'),col:'suppliers',idp:'SP',list:()=>supList(),
  cols:[['name','sp_name','text',1],['vatNo','sc_vatNo'],['phone','sp_phone'],['cat','sp_cat',Object.fromEntries(SUP_CATS.map(c=>[c,'spc_'+c]))],['termDays','sp_terms','num'],['bank','bk_bank'],['iban','bk_iban'],['note','hr_note']],
  extra:[['sp_balance',s=>supBalance(s)]],
  match:(r,L)=>L.find(s=>(r.vatNo&&s.vatNo===String(r.vatNo))||s.name===r.name),
  build:(r,o)=>Object.assign({cat:'other',termDays:0},o||{},r)};
