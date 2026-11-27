/* Maskob — internal correspondence (المراسلات) between HR, operations, finance, the branches and the general
   manager: subject, text, attachments (photos / PDF, or a document from the archive), replies in the same
   thread, read receipts, a menu badge and a phone notification for new mail.
   Loaded by index.html as a classic script after archive.js (it reuses its file reading and storage pieces).

   mail/{id}:          {from, to:[box], parties:[box], subject, by, at, last, lastFrom, n, readBy:{box:iso}}
   mail/{id}/msgs/{m}: {from, by, body, at, att:[{fid,name,type,size,parts}]}
   mail/{id}/parts/{fid}_pN: {data}
   Boxes: hr, ops, fin, gm, br:<branch>. Only the parties of a thread can read or answer it (firestore.rules). */
const MAIL_DEPTS=['hr','ops','fin','gm'];
const mailBox=()=>S.role==='hr'?'hr':S.role==='manager'?'ops':S.role==='finance'?'fin':S.role==='dash'?'gm':S.role==='branch'&&S.branch?'br:'+S.branch:null;
const mailBoxName=b=>b&&b.startsWith('br:')?t('ml_branch')+' '+b.slice(3):t('ml_box_'+b);
const mailBoxes=()=>[...MAIL_DEPTS,...S.branches.map(b=>'br:'+b)];
const mailUnread=m=>{const me=mailBox();return!!me&&m.lastFrom!==me&&String(m.last||'')>String((m.readBy||{})[me]||'')};
const mailUnreadN=()=>(S.mail||[]).filter(mailUnread).length;
const MAIL_PART=700000,MAIL_MAX=5*1024*1024,MAIL_FILES=5;
const MAILS={
  async create(head,msg,files){
    const id='ML-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    if(S.fb){await db.doc('mail/'+id).set(head)}else{MEMSET('mail',MEM('mail').concat([Object.assign({id},head)]))}
    await MAILS.reply(id,msg,files,true);return id;
  },
  async reply(id,msg,files,first){
    const att=[];
    for(const f of files||[]){const fid='F'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),parts=[];
      for(let i=0;i<f.data.length;i+=MAIL_PART)parts.push(f.data.slice(i,i+MAIL_PART));
      for(let i=0;i<parts.length;i++){if(S.fb)await db.doc('mail/'+id+'/parts/'+fid+'_p'+i).set({data:parts[i]});else(S._demoMail||(S._demoMail={}))[id+'/'+fid+'_p'+i]=parts[i]}
      att.push({fid,name:f.name,type:f.type,size:f.size,parts:parts.length})}
    const mid='M'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),m=Object.assign({},msg,{att});
    const up={last:msg.at,lastFrom:msg.from,['readBy.'+msg.from]:msg.at};
    if(S.fb){await db.doc('mail/'+id+'/msgs/'+mid).set(m);if(!first){await db.doc('mail/'+id).update(Object.assign(up,{n:firebase.firestore.FieldValue.increment(1)}))}}
    else{(S._demoMsgs||(S._demoMsgs={}))[id]=((S._demoMsgs||{})[id]||[]).concat([Object.assign({id:mid},m)]);
      MEMSET('mail',MEM('mail').map(x=>x.id!==id?x:Object.assign({},x,{last:msg.at,lastFrom:msg.from,n:(x.n||0)+(first?0:1),readBy:Object.assign({},x.readBy,{[msg.from]:msg.at})})));xLoadDemo();render()}
  },
  async msgs(id){if(S.fb){const q=await db.collection('mail/'+id+'/msgs').orderBy('at').get();return q.docs.map(d=>Object.assign({},d.data(),{id:d.id}))}return((S._demoMsgs||{})[id]||[]).slice()},
  async file(id,a){let s='';for(let i=0;i<(a.parts||1);i++){if(S.fb){const d=await db.doc('mail/'+id+'/parts/'+a.fid+'_p'+i).get();s+=d.exists?d.data().data:''}else s+=(S._demoMail||{})[id+'/'+a.fid+'_p'+i]||''}return s},
  async read(id){const me=mailBox();if(!me)return;const at=nowIso();
    if(S.fb)return db.doc('mail/'+id).update({['readBy.'+me]:at}).catch(()=>{});
    MEMSET('mail',MEM('mail').map(x=>x.id!==id?x:Object.assign({},x,{readBy:Object.assign({},x.readBy,{[me]:at})})));xLoadDemo();render()}
};
/* called from xLoadDemo / xStart (branch.js) */
function mailLoadDemo(){const me=mailBox();S.mail=me?MEM('mail').filter(x=>(x.parties||[]).includes(me)):[]}
function mailStart(u,onErr){const me=mailBox();S.mail=[];if(!me)return;let first=true;
  u.push(db.collection('mail').where('parties','array-contains',me).onSnapshot(s=>{
    const before=new Set((S.mail||[]).filter(mailUnread).map(x=>x.id+'@'+x.last));
    S.mail=s.docs.map(x=>Object.assign({},x.data(),{id:x.id}));
    if(!first)S.mail.filter(mailUnread).filter(x=>!before.has(x.id+'@'+x.last)).forEach(mailNotify);
    first=false;render()},onErr))}
/* a phone / desktop notification when new mail arrives and notifications are allowed */
function mailNotify(m){try{if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  const title=t('ml_newFrom',{x:mailBoxName(m.lastFrom)}),opt={body:m.subject||'',icon:'favicon-192.png?v=2',tag:'mail-'+m.id,lang:LANG,dir:RTL[LANG]?'rtl':'ltr'};
  if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(r=>r.showNotification(title,opt)).catch(()=>{try{new Notification(title,opt)}catch(e){}});else new Notification(title,opt)}catch(e){}}

/* ---------- the page ---------- */
function mailView(){
  const me=mailBox();if(!me)return'';const f=S.mlBox||'in';
  const all=[...(S.mail||[])].sort((a,b)=>String(b.last).localeCompare(String(a.last)));
  const list=f==='out'?all.filter(m=>m.from===me):f==='unread'?all.filter(mailUnread):all;
  const ic=n=>typeof ico==='function'?ico(n):'';
  const canAsk=typeof Notification!=='undefined'&&Notification.permission==='default';
  return`<div class="row" style="justify-content:space-between"><h2>${t('tab_mail')}</h2><div class="row">${canAsk?`<button class="btn btn-ghost rp-btn" data-act="enableAlerts">${t('nEnable')}</button>`:''}<button class="btn btn-sun" data-act="mlNew">+ ${t('ml_new')}</button></div></div>
  <div class="filters">${[['in','ml_all'],['unread','ml_unread'],['out','ml_sent']].map(([k,l])=>`<button class="chip" aria-pressed="${f===k}" data-act="mlBox" data-k="${k}">${esc(t(l))}${k==='unread'&&mailUnreadN()?` <span class="c num">(${mailUnreadN()})</span>`:''}</button>`).join('')}</div>
  <div class="list">${list.length?list.map(m=>{const un=mailUnread(m),mine=m.from===me,other=mine?(m.to||[]).map(mailBoxName).join('، '):mailBoxName(m.from);
    const seen=mine?(m.to||[]).filter(b=>String((m.readBy||{})[b]||'')>=String(m.last||'')).length:0;
    return`<button class="oc ml-row ${un?'ml-new':''}" data-act="mlOpen" data-id="${esc(m.id)}">
      <span class="ml-av" aria-hidden="true">${ic(mine?'send':'inbox')}</span>
      <span style="min-width:0;flex:1"><span class="t">${un?'<i class="ml-dot"></i>':''}${esc(m.subject||t('ml_noSubject'))}</span>
        <span class="s">${esc(t(mine?'ml_to':'ml_from'))}: ${esc(other)}${m.n?' · '+esc(t('ml_replies',{n:m.n})):''}</span></span>
      <span class="side"><span class="hint">${esc(when(m.last))}</span>${mine?`<span class="pill ${seen?'ms-done':'ms-progress'}">${esc(t(seen?'ml_seen':'ml_notSeen'))}</span>`:''}</span></button>`}).join('')
    :`<div class="empty">${esc(t(all.length?'ml_noneHere':'ml_none'))}</div>`}</div>`;
}
/* a new message */
function mailNewSheet(){
  const me=mailBox(),d=S.mlDraft||{};
  const files=d.files||[];
  const body=`<div><span class="hint">${t('ml_toPick')}</span><div class="ml-to">${mailBoxes().filter(b=>b!==me).map(b=>`<button class="chip" aria-pressed="${(d.to||[]).includes(b)}" data-act="mlTo" data-k="${esc(b)}">${esc(mailBoxName(b))}</button>`).join('')}</div></div>
  <label style="display:block;margin-top:10px"><span class="hint">${t('ml_subject')}</span><input class="field" id="ml-subject" data-in="mlF" data-f="subject" dir="auto" value="${esc(d.subject||'')}"></label>
  <label style="display:block;margin-top:10px"><span class="hint">${t('ml_body')}</span><textarea class="field" id="ml-body" rows="5" dir="auto" data-in="mlF" data-f="body">${esc(d.body||'')}</textarea></label>
  ${mailAttachBlock(files)}`;
  return hrSheetWrap(t('ml_new'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="mlSend" ${S.mlBusy?'disabled':''}>${S.mlBusy?t('ef_loading'):t('ml_send')}</button>`);
}
function mailAttachBlock(files){
  const arc=typeof arcDept==='function'&&arcDept()&&(S.archive||[]).length;
  return`<div class="ml-att">${files.map((f,i)=>`<span class="tag">${esc(f.name)} · ${esc(efSize(f.size))} <button class="ml-x" data-act="mlRmFile" data-i="${i}" aria-label="${esc(t('del'))}">×</button></span>`).join('')}</div>
  ${files.length<MAIL_FILES?`<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><label class="btn btn-ghost rp-btn io-imp">${typeof ico==='function'?ico('upload','b-ic'):''}${esc(t('ml_attach'))}<input type="file" id="mlFile" accept="image/*,application/pdf" multiple></label>
    ${arc?`<select class="field" id="mlArc" style="width:auto"><option value="">${esc(t('ml_fromArchive'))}</option>${(S.archive||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.title||x.name)}</option>`).join('')}</select>`:''}</div>`:''}`;
}
/* a thread */
function mailThreadSheet(){
  const m=(S.mail||[]).find(x=>x.id===S.mlOpen);if(!m)return'';const me=mailBox(),msgs=S.mlMsgs&&S.mlMsgs.id===m.id?S.mlMsgs.list:null,d=S.mlDraft||{};
  const others=(m.parties||[]).filter(b=>b!==me);
  const receipts=others.map(b=>{const r=(m.readBy||{})[b];return`<span class="tag ${r&&r>=m.last?'':'ret'}">${esc(mailBoxName(b))}: ${r?esc(t('ml_readAt',{d:when(r)})):esc(t('ml_notSeen'))}</span>`}).join(' ');
  const body=`<p class="hint">${esc(t('ml_parties'))}: ${(m.parties||[]).map(mailBoxName).map(esc).join('، ')}</p><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">${receipts}</div>
  <div class="ml-thread">${msgs==null?`<p class="hint">${esc(t('ef_loading'))}</p>`:msgs.map(x=>`<div class="ml-msg ${x.from===me?'me':''}"><div class="ml-meta"><b>${esc(mailBoxName(x.from))}</b>${x.by?' · '+esc(x.by):''} · ${esc(when(x.at))}</div>
    <div class="ml-text" dir="auto">${esc(x.body||'').replace(/\n/g,'<br>')}</div>
    ${(x.att||[]).length?`<div class="ml-att">${x.att.map(a=>`<button class="tag ml-file" data-act="mlFileOpen" data-m="${esc(x.id)}" data-f="${esc(a.fid)}">${a.type==='application/pdf'?'PDF':'🖼'} ${esc(a.name)} · ${esc(efSize(a.size))}</button>`).join('')}</div>`:''}</div>`).join('')}</div>
  <label style="display:block;margin-top:12px"><span class="hint">${t('ml_reply')}</span><textarea class="field" id="ml-body" rows="3" dir="auto" data-in="mlF" data-f="body">${esc(d.body||'')}</textarea></label>
  ${mailAttachBlock(d.files||[])}`;
  return hrSheetWrap(m.subject||t('ml_noSubject'),body,`<span class="spacer"></span><button class="btn btn-sun" data-act="mlReply" ${S.mlBusy?'disabled':''}>${S.mlBusy?t('ef_loading'):t('ml_send')}</button>`);
}
function mailLoadThread(id){S.mlMsgs={id,list:null};render();MAILS.msgs(id).then(list=>{if(S.mlOpen===id){S.mlMsgs={id,list};render()}}).catch(()=>{S.mlMsgs={id,list:[]};render()})}
Object.assign(A,{
  mlBox(el){S.mlBox=el.dataset.k;render()},
  mlNew(){S.mlNewOpen=true;S.mlOpen=null;S.mlDraft={to:[],subject:'',body:'',files:[]};render()},
  mlTo(el){const d=S.mlDraft;if(!d)return;const b=el.dataset.k;d.to=d.to.includes(b)?d.to.filter(x=>x!==b):d.to.concat([b]);render()},
  mlRmFile(el){const d=S.mlDraft;if(!d)return;d.files.splice(+el.dataset.i,1);render()},
  mlOpen(el){S.mlOpen=el.dataset.id;S.mlNewOpen=false;S.mlDraft={body:'',files:[]};mailLoadThread(S.mlOpen);MAILS.read(S.mlOpen)},
  async mlSend(){const me=mailBox(),d=S.mlDraft||{};if(!me)return;
    if(!(d.to||[]).length){toast(t('ml_needTo'));return}
    if(!String(d.subject||'').trim()){toast(t('ml_needSubject'));return}
    if(!String(d.body||'').trim()&&!(d.files||[]).length){toast(t('ml_needBody'));return}
    const at=nowIso(),by=S.userName||roleL(S.realRole||S.role);
    const head={from:me,to:d.to,parties:[me,...d.to],subject:String(d.subject).trim(),by,at,last:at,lastFrom:me,n:0,readBy:{[me]:at}};
    S.mlBusy=true;render();
    try{await MAILS.create(head,{from:me,by,body:String(d.body||'').trim(),at},d.files);S.mlNewOpen=false;S.mlDraft=null;toast(t('ml_sent2'))}catch(e){toast(t('saveFail'))}
    S.mlBusy=false;render()},
  async mlReply(){const me=mailBox(),d=S.mlDraft||{},id=S.mlOpen;if(!me||!id)return;
    if(!String(d.body||'').trim()&&!(d.files||[]).length){toast(t('ml_needBody'));return}
    S.mlBusy=true;render();
    try{await MAILS.reply(id,{from:me,by:S.userName||roleL(S.realRole||S.role),body:String(d.body||'').trim(),at:nowIso()},d.files);S.mlDraft={body:'',files:[]};mailLoadThread(id)}catch(e){toast(t('saveFail'))}
    S.mlBusy=false;render()},
  async mlFileOpen(el){const id=S.mlOpen,msg=(S.mlMsgs&&S.mlMsgs.list||[]).find(x=>x.id===el.dataset.m),a=msg&&(msg.att||[]).find(x=>x.fid===el.dataset.f);if(!a)return;
    const win=window.open('','_blank');
    try{const data=await MAILS.file(id,a),b64=data.slice(data.indexOf(',')+1),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([u8],{type:a.type||'application/octet-stream'}));
      if(win&&!win.closed)win.location.href=url;else{const l=document.createElement('a');l.href=url;l.download=a.name||'file';document.body.appendChild(l);l.click();l.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){if(win)win.close();toast(t('saveFail'))}}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.in==='mlF'){S.mlDraft=S.mlDraft||{files:[]};S.mlDraft[el.dataset.f]=el.value}});
document.addEventListener('change',async ev=>{const el=ev.target;
  if(el.id==='mlFile'&&el.files&&el.files.length){const d=S.mlDraft||(S.mlDraft={files:[]});d.files=d.files||[];const picked=[...el.files];el.value='';
    for(const f of picked){if(d.files.length>=MAIL_FILES){toast(t('ml_maxFiles',{n:MAIL_FILES}));break}
      if(!(f.type==='application/pdf'||/^image\//.test(f.type))){toast(t('ef_badType'));continue}
      if(f.size>MAIL_MAX){toast(t('ar_tooBig'));continue}
      S.mlBusy=true;render();try{const data=await efRead(f);d.files.push({name:f.name,type:f.type==='application/pdf'?'application/pdf':'image/jpeg',size:Math.round(data.length*0.75),data})}catch(e){toast(t('saveFail'))}}
    S.mlBusy=false;render()}
  if(el.id==='mlArc'&&el.value){const x=(S.archive||[]).find(v=>v.id===el.value);el.value='';if(!x||typeof ARC==='undefined')return;const d=S.mlDraft||(S.mlDraft={files:[]});d.files=d.files||[];
    if(d.files.length>=MAIL_FILES){toast(t('ml_maxFiles',{n:MAIL_FILES}));return}
    S.mlBusy=true;render();try{const data=await ARC.get(x);d.files.push({name:x.name||x.title,type:x.type,size:x.size||Math.round(data.length*0.75),data})}catch(e){toast(t('saveFail'))}S.mlBusy=false;render()}});
