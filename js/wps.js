/* Maskob — Wage Protection System (WPS) salary file from an approved payroll.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there.

   One row per employee paid by bank transfer: ID, IBAN, bank code (from the IBAN), basic, housing,
   other earnings, deductions and net pay. The sheet has no letterhead so a bank or Mudad upload reads
   the column titles from the first row. Bank templates differ: match the columns to your bank's
   template if it asks for a different order. */
function wpsRows(P){
  const ok=[],skipped=[];
  P.rows.forEach(r=>{
    const e=empById(r.id)||{};
    const allowFull=ALLOWANCES.reduce((s,k)=>s+(+e[k]||0),0);
    const housing=allowFull>0?r2p(r.allow*(+e.alHousing||0)/allowFull):0;
    const other=r2p(r.allow-housing+(r.reward||0)+(r.ot||0)+(r.add||0));
    const deds=r2p((r.formDed||0)+(r.unpaid||0)+(r.adv||0)+(r.gosi||0)+(r.ded||0));
    const iban=normIban(e.iban||r.iban||'');
    const why=[];
    if(!(r.net>0))why.push(t('wps_noNet'));
    if(!iban||!ibanOk(iban))why.push(t('wps_noIban'));
    if(!e.idNo)why.push(t('wps_noId'));
    if(why.length){skipped.push([r.name,r.no||'',why.join('، ')]);return}
    ok.push([ok.length+1,r.no||'',r.name,String(e.idNo),iban,iban.slice(4,6),e.bank||'',r2p(r.basic),housing,other,deds,r2p(r.net),P.mk]);
  });
  return{ok,skipped};
}
A.prWps=async function(){
  const mk=S.prMonth||monthKey(Date.now());const P=payrollCalc(mk);
  if(P.doc.status!=='approved'){toast(t('wps_needApproved'));return}
  const {ok,skipped}=wpsRows(P);
  if(!ok.length){toast(t('wps_none'));return}
  const sheets=[{plain:true,name:'WPS '+mk,headers:['#','Employee No. / الرقم الوظيفي','Employee Name / اسم الموظف','ID / Iqama No. / رقم الهوية','IBAN / الآيبان','Bank Code / رمز البنك','Bank / البنك',
    'Basic Salary / الأساسي','Housing / السكن','Other Earnings / بدلات وإضافات','Deductions / الاستقطاعات','Net Salary / الصافي','Month / الشهر'],rows:ok}];
  if(skipped.length)sheets.push({plain:true,name:t('wps_skipped'),headers:[t('lv_emp'),t('hr_no'),t('wps_reason')],rows:skipped});
  await saveXlsx('maskob-wps-'+mk+'.xlsx',sheets);
  if(skipped.length)toast(t('wps_someSkipped',{n:skipped.length}));
};
