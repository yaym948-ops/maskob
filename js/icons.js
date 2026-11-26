/* Maskob — one consistent set of line icons (drawn in the style of Lucide, ISC licence: 24×24, round
   joins, 1.75 stroke) for the side menu, buttons and the figure cards.
   Loaded by index.html as a classic script before core.js: files share one global scope.

   ico(name)       → inline SVG markup
   NAV_ICON        → icon of each side-menu page
   decorateIcons() → after each render: puts an icon on buttons (by their action) and on figure cards
                     (by their label), so the screens themselves need no change */
const LINE_ICONS={
  dot:'<circle cx="12" cy="12" r="1.5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  clipboard:'<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  clipCheck:'<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  bars:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  trend:'<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  trendDown:'<path d="M22 17 13.5 8.5 8.5 13.5 2 7"/><path d="M16 17h6v-6"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  listCheck:'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  calClock:'<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>',
  cal:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  calCheck:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  filePen:'<path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M13.38 15.63a1 1 0 1 0-3-3l-5.01 5.01a2 2 0 0 0-.51.85l-.84 2.87a.5.5 0 0 0 .62.62l2.87-.84a2 2 0 0 0 .85-.5z"/>',
  fileText:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  fileSheet:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  box:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  history:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  sliders:'<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userCheck:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  tag:'<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  idCard:'<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
  key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  cash:'<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  coins:'<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  percent:'<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  dash:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  archive:'<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  pie:'<path d="M21 12c.55 0 1-.45.95-1a10 10 0 0 0-8.95-8.95c-.55-.06-1 .4-1 .95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
  store:'<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ban:'<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  layers:'<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  sheet:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M12 11v8"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  printer:'<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkCircle:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  bank:'<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 8 5H4z"/>',
  hash:'<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>'
};
const ico=(name,cls)=>`<svg class="ic${cls?' '+cls:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE_ICONS[name]||LINE_ICONS.dot}</svg>`;

/* side menu pages */
const NAV_ICON={rep:'pie',new:'plus',tasks:'inbox',orders:'clipboard',sales:'bars',maint:'wrench',checks:'listCheck',lr:'calClock',forms:'filePen',
  pending:'clock',report:'fileText',all:'list',salesAll:'bars',maintAll:'wrench',stock:'box',prep:'clipCheck',sched:'cal',incoming:'truck',done:'history',
  branches:'sliders',users:'users',actlog:'activity',catalog:'tag',emps:'users',docs:'idCard',leaves:'calCheck',custody:'key',advances:'wallet',lic:'shield',
  payroll:'cash',vouchers:'receipt',dash:'dash',fsum:'dash',expenses:'receipt',supinv:'fileSheet',suppliers:'truck',pnl:'trend',be:'target',supst:'book',
  costs:'tag',assets:'archive'};

/* buttons, by what they do */
const BTN_ICON=[
  [/^(ioExport|fnXls|hrXls|prXls|plXls|beXls|ssXls|shXls|xls[A-Z]\w*)$/,'download'],
  [/^(prWps)$/,'bank'],
  [/(Print|^prSlip)$/,'printer'],
  [/^(\w+Del|deleteOrder|delBranch|delShared|efDel|mDelPhoto|avDelPay)$/,'trash'],
  [/^(\w+Save|saveSales|saveTarget|savePin|saveChecklist|waSave|coSave|mSaveReply)$/,'check'],
  [/^(\w+New|addBranch|stLineAdd|stRecv|hrFromStaff)$/,'plus'],
  [/^(siPay|avAddPay|exPaid)$/,'coins'],
  [/^(submit|sendMaint|lrSend|fmSend|ship)$/,'send'],
  [/^(approve|prApprove|receive)$/,'checkCircle'],
  [/^(reject|cancel|lrCancel)$/,'x'],
  [/^(supSt)$/,'book'],
  [/^(rpCopy|copyPrevTargets|shCopyPrev)$/,'copy'],
  [/^(fmVoucher)$/,'receipt'],
  [/^(prReopen)$/,'history']
];
/* figure cards, by their label (translation key → icon) */
const CARD_ICON={
  sl_avg:'receipt',sl_avgBranch:'store',sl_invCount:'hash',sl_month:'bars',sl_perDay:'trend',sl_remain:'target',sl_target:'target',sl_totalAll:'bars',
  cat_active:'checkCircle',cat_cats:'layers',cat_offN:'ban',
  ex_total:'receipt',ex_vat:'percent',fn_owed:'wallet',si_overdue:'alert',si_overdueAmt:'alert',tm_unpaidExp:'clock',vc_count:'hash',vc_total:'cash',
  av_openN:'wallet',av_outTotal:'coins',cu_outN:'key',cu_outVal:'coins',hr_expiring:'alert',hr_onLeave:'calCheck',hr_payroll:'cash',hr_working:'userCheck',
  li_contracts:'fileText',li_expired:'alert',li_licenses:'shield',li_soon:'clock',io_err:'alert',io_new:'plus',io_upd:'history',
  pr_deds:'trendDown',pr_gross:'cash',pr_net:'wallet',tab_emps:'users',as_count:'archive',as_monthly:'cal',as_total:'coins',co_missing:'alert',co_priced:'tag',
  st_items:'box',st_low:'alert',st_min:'trendDown',st_out:'ban',st_qty:'layers',sp_count:'truck',sp_late:'alert',ss_close:'wallet',ss_invs:'fileSheet',ss_open:'book',ss_paid:'coins',
  dh_best:'award',dh_inTransit:'truck',dh_late:'alert',dh_payrollShare:'pie',dh_requests:'inbox',dh_sales:'bars',dh_toShip:'box',dh_worst:'trendDown',
  tab_docs:'idCard',tab_lic:'shield',tab_maint:'wrench',tab_pending:'clock',fn_net:'trend',fn_payroll:'cash',fn_purchases:'fileSheet',fn_sales:'bars',tab_exp:'receipt'
};
let cardIconLang=null,cardIconByText={};
function cardIconFor(text){
  if(cardIconLang!==LANG){cardIconLang=LANG;cardIconByText={};for(const k in CARD_ICON)cardIconByText[t(k)]=CARD_ICON[k]}
  return cardIconByText[String(text||'').trim()]||null;
}
function decorateIcons(root){
  root=root||document;
  root.querySelectorAll('button.btn[data-act]:not([data-ic]),summary.btn:not([data-ic])').forEach(b=>{
    b.setAttribute('data-ic','');
    const act=b.dataset.act||(b.closest('.io-menu')?'ioMenu':'');let name=act==='ioMenu'?'sheet':null;
    if(!name)for(const [re,n] of BTN_ICON)if(re.test(act)){name=n;break}
    if(!name)return;
    /* "+ Add" → icon + "Add" */
    const tn=[...b.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(tn&&name==='plus')tn.textContent=tn.textContent.replace(/^\s*\+\s*/,'');
    b.insertAdjacentHTML('afterbegin',ico(name,'b-ic'));
  });
  root.querySelectorAll('.stat:not([data-ic])').forEach(s=>{s.setAttribute('data-ic','');const l=s.querySelector('span');const n=l&&cardIconFor(l.textContent);
    if(n)s.insertAdjacentHTML('afterbegin',`<i class="st-ic">${ico(n)}</i>`)});
  root.querySelectorAll('.dash-card:not([data-ic])').forEach(c=>{c.setAttribute('data-ic','');const l=c.querySelector('.dash-t');const n=l&&cardIconFor(l.textContent);
    if(n)l.insertAdjacentHTML('afterbegin',`<i class="dc-ic">${ico(n)}</i>`)});
}
