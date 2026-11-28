/* Maskob — HR reads an identity document from a photo (Iqama, Saudi national ID or passport) with Gemini and fills
   the employee form: name, ID / passport number, nationality, profession, birth date and expiry.
   Hijri dates are converted to Gregorian here (Umm al-Qura calendar), not by the model. Uses aiModel() from dsr.js. */
const ID_PROMPT='This photo is an identity document from Saudi Arabia: a Saudi residence permit (Iqama / إقامة), a Saudi national ID card (الهوية الوطنية), or a passport of any country. '+
 'Read it exactly as printed. Answer with JSON only, null for anything not printed: '+
 '{"kind":"iqama"|"national"|"passport"|"other","nameAr":string (Arabic name if printed),"nameEn":string (Latin name if printed),'+
 '"idNumber":string (the 10-digit Iqama or national ID number; for a passport the passport number),"nationality":string (in Arabic if printed in Arabic),'+
 '"profession":string (المهنة, Iqama only),"birth":{"date":"YYYY-MM-DD","calendar":"hijri"|"gregorian"},"expiry":{"date":"YYYY-MM-DD","calendar":"hijri"|"gregorian"}}. '+
 'Write dates with Western digits as printed; say "hijri" when the date is in the Hijri calendar (year 13xx or 14xx).';
/* a Hijri (Umm al-Qura) date to Gregorian YYYY-MM-DD */
function hijriToG(y,m,d){y=+y;m=+m;d=+d;if(!(y>1300&&m>=1&&m<=12&&d>=1&&d<=30))return'';
  let f;try{f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{year:'numeric',month:'numeric',day:'numeric'})}catch(e){return''}
  const parts=dt=>{const p={};f.formatToParts(dt).forEach(x=>p[x.type]=x.value);return[parseInt(p.year),+p.month,+p.day]};
  const want=y*400+m*31+d,guess=Date.UTC(622,6,16)+((y-1)*354.367+(m-1)*29.53+(d-1))*864e5;
  for(let i=-45;i<=45;i++){const dt=new Date(guess+i*864e5),[a,b,c]=parts(dt);if(a*400+b*31+c===want)return dt.toISOString().slice(0,10)}
  return''}
function idDate(x){if(!x)return'';const s=typeof x==='string'?x:x.date,cal=typeof x==='string'?'':x.calendar;const m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s||'').trim());if(!m)return'';
  const y=+m[1];if(cal==='hijri'||y<1600)return hijriToG(y,m[2],m[3]);return`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`}
/* the model's answer → employee form fields */
function idFromAI(j){if(!j||typeof j!=='object')return null;const r={kind:['iqama','national','passport'].includes(j.kind)?j.kind:'other'};
  const nm=String(j.nameAr||'').trim()||String(j.nameEn||'').trim();if(nm)r.name=nm.replace(/\s+/g,' ');
  const no=String(j.idNumber||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\s/g,'');
  const birth=idDate(j.birth),exp=idDate(j.expiry);
  if(r.kind==='passport'){if(no)r.passNo=no.toUpperCase();if(exp)r.passExp=exp}else{if(no)r.idNo=no;if(exp)r.idExp=exp}
  if(birth)r.birth=birth;
  if(j.nationality)r.nat=String(j.nationality).trim();else if(r.kind==='national')r.nat='سعودي';
  if(j.profession&&r.kind==='iqama')r.job=String(j.profession).trim();
  return Object.keys(r).length>1?r:null}
async function readIdAI(dataUrl){if(typeof aiModel!=='function'||!S.fb||!window.FIREBASE_CONFIG)throw new Error('offline');
  const data=dataUrl.split(',')[1];let last=null;
  for(const name of AI_MODELS){if(aiDead[name])continue;
    try{const m=await aiModel(name);
      const res=await Promise.race([m.generateContent([ID_PROMPT,{inlineData:{mimeType:'image/jpeg',data}}]),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),25000))]);
      const r=idFromAI(JSON.parse(res.response.text().replace(/^\s*\x60\x60\x60(?:json)?|\x60\x60\x60\s*$/g,'')));if(r)return r}
    catch(e){last=e;if(/404|not found/i.test(String(e&&e.message)))aiDead[name]=true}}
  if(last)throw last;return null}
const ID_LABEL={name:'hr_name',idNo:'hr_id',idExp:'hr_idExp',passNo:'hr_passNo',passExp:'hr_passExp',birth:'hr_birth',nat:'hr_nat',job:'hr_job'};
function idScanBlock(){const r=S.idRead;
  return`<div class="id-scan"><label class="btn btn-navy rp-btn${S.idBusy?' busy':''}" style="cursor:pointer">${typeof ico==='function'?ico('camera','b-ic'):''}${esc(t(S.idBusy?'id_reading':'id_scan'))}<input type="file" id="idScanIn" accept="image/*" hidden ${S.idBusy?'disabled':''}></label>
    <span class="hint">${esc(t('id_hint'))}</span>
    ${r?`<div class="id-res">${esc(t('id_kind_'+r.kind))}: ${Object.keys(ID_LABEL).filter(k=>r[k]).map(k=>`<span class="tag">${esc(t(ID_LABEL[k]))}</span>`).join(' ')}<div class="hint">${esc(t('id_check'))}</div></div>`:''}</div>`}
document.addEventListener('change',async ev=>{const el=ev.target;if(el.id!=='idScanIn'||!el.files||!el.files[0]||!S.hrDraft)return;
  S.idBusy=true;S.idRead=null;render();
  try{const url=typeof phShrink==='function'?await phShrink(el.files[0]):null;const r=url?await readIdAI(url):null;
    if(!r)toast(t('id_fail'));else{const d=S.hrDraft;Object.keys(ID_LABEL).forEach(k=>{if(r[k])d[k]=r[k]});S.idRead=r;toast(t('id_done'))}}
  catch(e){toast(t(String(e&&e.message)==='offline'?'id_offline':'id_fail'))}
  S.idBusy=false;render()});
