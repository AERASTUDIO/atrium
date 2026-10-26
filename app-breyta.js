/* Breyta: eyðublöð og vistun breytinga
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* ---------- Breyta ---------- */
async function quickStatus(type,id,st,btn){
  const row=btn.closest(".stat-row"); row?.querySelectorAll("button").forEach(b=>b.disabled=true);
  try{
    await saveSnapshot(s=>{if(type==="verk"){const p=sFindP(s,id); if(p) p.stada=st;} else if(type==="skjal"){const x=(s.skjol||[]).find(x=>x.id===id); if(x){x.stada=st;x.breytt=new Date().toISOString();}} else {const [,u]=sFindU(s,id); if(u) u.stada=st;}});
    toast("Staða uppfærð: "+(STL[st]||st));
  }catch(e){toast(errText(e)); row?.querySelectorAll("button").forEach(b=>b.disabled=false);}
}
const dOnly=iso=>iso?String(iso).slice(0,10):"";
const opt=(v,l,sel)=>`<option value="${esc(v)}"${v===sel?" selected":""}>${esc(l??v)}</option>`;
const allProjOpts=sel=>verkefni().slice().sort((a,b)=>b.nr.localeCompare(a.nr)).map(p=>opt(p.id,p.nafn,sel)).join("");
function openEdit(type,id){
  let f="",title="Breyta";
  if(type==="verk"){const p=findProj(id); if(!p) return; title="Breyta verkefni";
    f=`<label>Heiti<input id="e-name" value="${esc(p.stutt)}" required></label><p class="hint">Verknúmerið <b class="nr">${esc(p.nr)}</b> helst óbreytt.</p>
    <label>Staða<select id="e-status">${STODUR().filter(x=>!x.falin||x.n===p.stada).map(x=>opt(x.n,x.n,p.stada)).join("")}</select></label>
    ${projFields("e",p)}
    ${window.ORG?.pakkaval?(window.tegSelect?tegSelect("e-deild",p.deild||""):""):(window.deildSelect?deildSelect("e-deild",p.deild||""):"")}
    ${thjField(p.thjonusta||[])}
    <label>Mappa (slóð)<input id="e-mappa" type="url" value="${esc(p.mappa||"")}" placeholder="https://…"></label>
    ${window.INNH?`<label>Innheimta<select id="e-innh"><option value="">Sjálfvirkt – ${esc((INNH[innheimtaOf({...p,innheimta:null})]||"").split(" – ")[0])}</option>${Object.entries(INNH).map(([k,l])=>`<option value="${k}"${p.innheimta===k?" selected":""}>${esc(l)}</option>`).join("")}</select></label>`:""}
    <div class="two"><label>Áætlaðir tímar<input id="e-aklst" inputmode="decimal" value="${p.aklst?esc(num(p.aklst)):""}" placeholder="t.d. 40"></label><label>Tilboð (kr.)<input id="e-tilbod" inputmode="numeric" value="${p.tilbod?esc(String(p.tilbod)):""}" placeholder="t.d. 450000"></label></div>
    ${window.VERD?`<div class="two"><label>Verkþáttur (verðskrá)<select id="e-taxti"><option value="">Sjálfvirkt${(()=>{const l=VERD().lidir.find(l=>(l.verkefni||[]).includes(p.nr))||VERD().lidir.find(l=>l.sjalfgefid); return l?" – "+esc(l.heiti):"";})()}</option>${VERD().lidir.map(l=>`<option value="${esc(l.id)}"${p.taxti===l.id?" selected":""}>${esc(l.heiti)} · ${esc(num(l.verd))} kr.</option>`).join("")}</select></label><label>Eigið tímagjald (kr./klst.)<input id="e-gjald" inputmode="numeric" value="${p.timagjald?esc(String(p.timagjald)):""}" placeholder="Autt = eftir verðskrá"></label></div>`:""}
    <label>Yfirlit<textarea id="e-yf">${esc(p.yfirlit||"")}</textarea></label>
    <div class="two"><label>Næst<input id="e-naest" value="${esc(p.naest||"")}"></label><label>Athuga<input id="e-ath" value="${esc(p.athuga||"")}"></label></div>
    <label>Teikningar frá<input id="e-tf" value="${esc(p.teikningarFra||"")}"></label>
    <label>Lýsing<textarea id="e-lys">${esc(p.lysing||"")}</textarea></label>`;}
  if(type==="vsk"){const c=findVsk(id); if(!c) return; title="Breyta viðskiptavini"; f=vskFormHTML("e",c);}
  if(type==="sub"){const r=findSub(id); if(!r) return; const u=r.u; title="Breyta undirverki";
    f=`<label>Heiti<input id="e-name" value="${esc(subName(u))}" required></label><p class="hint">Verknúmerið <b class="nr">${esc(u.nr)}</b> helst óbreytt.</p>
    <div class="two"><label>Staða<select id="e-status">${USTAT.map(s=>opt(s,STL[s],u.stada)).join("")}</select></label><label>Skiladagur<input id="e-date" type="date" value="${dOnly(u.skiladagur)}"></label></div>
    <label>Sérmappa (slóð)<input id="e-mappa" type="url" value="${esc(u.serMappa||"")}" placeholder="Tómt = mappa verkefnisins"></label>
    <label>Lýsing<textarea id="e-lys">${esc(u.lysing||"")}</textarea></label>`;}
  if(type==="fund"){const fd=findFund(id); if(!fd) return; const p=fundProj(fd); title="Breyta fundi";
    f=`<label>Heiti fundar<input id="e-name" value="${esc(fd.name)}" required></label>
    <div class="three fbtime"><label>Dagur<input id="e-date" type="date" value="${dOnly(fd.date)}" required></label><label>Byrjar<input id="e-time" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${hhmm(fd.date)}"></label><label>Lýkur<input id="e-end" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${hhmm(fd.dateEnd)||""}"></label></div>
    ${window.fbField?fbField("e",fd):""}
    <label>Staðsetning<input id="e-place" data-stadur value="${esc(fd.stadsetning||"")}"></label>
    <label>Fundarhlekkur<input id="e-link" type="url" value="${esc(fd.fundarhlekkur||"")}" placeholder="https://… (ef fjarfundur)"></label>
    <label>Fundargerð (slóð)<input id="e-fg" type="url" value="${esc(fd.fundargerd||"")}" placeholder="https://… skjal í OneDrive"></label>
    <label>Verkefni<select id="e-proj"><option value="">Ekkert</option>${allProjOpts(p?.id)}</select></label>
    <label>Lýsing<textarea id="e-lys">${esc(fd.lysing||"")}</textarea></label>`;}
  if(type==="skjal"){const x=findSkjal(id); if(!x) return; title="Breyta skjali";
    f=`<label>Heiti skjals<input id="e-name" value="${esc(x.name||"")}" required></label>
    <div class="two"><label>Tegund<select id="e-type"><option value="">Engin</option>${DTYPES.map(t=>opt(t,DTL[t]||t,x.tegund)).join("")}</select></label>
    <label>Staða<select id="e-status">${DSTAT.map(s=>opt(s,STL[s],x.stada||"Not started")).join("")}</select></label></div>
    <label>Verkefni<select id="e-proj"><option value="">Ekkert</option>${allProjOpts(x.projectId)}</select></label>
    <label>Efni<textarea id="e-lys">${esc(x.lysing||"")}</textarea></label>`;}
  if(type==="time"){const e=findTime(id); if(!e) return; title="Breyta tímaskráningu";
    f=`<label>Verkefni<select id="e-proj">${allProjOpts(e.verkefniId)}<option value=""${e.verkefniId?"":" selected"}>Ekkert verkefni (almennt)</option></select></label><label>Undirverk<select id="e-sub"></select></label>
    <label>Lýsing<input id="e-desc" value="${esc(cleanLys(e.lysing))}" required></label>
    ${window.taxtiSelect?taxtiSelect("e-taxti",e.taxti||""):""}
    <label>Dagsetning<input id="e-date" type="date" value="${dOnly(e.date)}" required></label>
    <div class="two"><label>Frá<input id="e-from" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${esc(e.fra||"")}"></label><label>Til<input id="e-to" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${esc(e.til||"")}"></label></div>
    ${STARFS().length>1&&can("fjarmal")?`<label>Starfsmaður<select id="e-starf">${STARFS().map(x=>opt(x.sk,x.nafn,e.starfsmadur||ME())).join("")}</select></label>`:""}
    ${e.fra?"":`<p class="hint" style="margin:0">Þessi færsla var skráð sem ${esc(hrs(e.timar))} án tímabils. Skráðu frá og til til að vista breytingu.</p>`}`;}
  if(type==="klukka"){const k=klukka(); if(!k) return; title="Breyta klukku"; const st=new Date(k.start);
    f=`<p class="hint" style="margin:0">Leiðréttu hvenær þú byrjaðir (t.d. ef þú gleymdir að ræsa klukkuna), verkefnið eða lýsinguna.</p>
    <div class="two"><label>Dagur<input id="e-date" type="date" value="${isoDay(st)}" max="${isoDay(new Date())}" required></label><label>Byrjaði kl.<input id="e-from" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${esc(hhmm(k.start))}"></label></div>
    <label>Verkefni<select id="e-proj"><option value="">Ekkert verkefni (almennt)</option>${verkefni().slice().sort((a,b)=>(isDone(a)-isDone(b))||b.nr.localeCompare(a.nr)).filter(p=>!isDone(p)||p.id===k.pid).map(p=>`<option value="${esc(p.id)}"${p.id===k.pid?" selected":""}>${esc(p.nr+" "+(p.stutt||p.nafn||""))}</option>`).join("")}</select></label>
    <label>Lýsing<input id="e-desc" value="${esc(k.desc||"")}" placeholder="Hvað ertu að gera"></label>
    <button type="button" class="btn danger" style="margin-top:6px" onclick="if(confirm('Hætta við klukkuna án þess að skrá tímann?')){saveSnapshot(s=>{s.klukka=null;}).then(()=>{closeSheet();toast('Hætt við klukku – enginn tími skráður');});}">Hætta við klukku (ekki skrá)</button>`;}
  if(type==="kostn"){const k=findKostn(id); if(!k) return; title="Breyta kostnaði";
    f=`<label>Verkefni<select id="e-proj">${allProjOpts(k.verkefniId)}<option value=""${k.verkefniId?"":" selected"}>Ekkert verkefni (almennt)</option></select></label><label>Undirverk<select id="e-sub"></select></label>
    <label>Lýsing<input id="e-desc" value="${esc(k.lysing||"")}" required></label>
    <div class="two"><label>Upphæð (kr.)<input id="e-amt" type="text" inputmode="numeric" value="${esc(String(k.upphaed||""))}" required autocomplete="off"></label><label>Dagsetning<input id="e-date" type="date" value="${dOnly(k.date)}" required></label></div>
    ${STARFS().length>1&&can("fjarmal")?`<label>Starfsmaður<select id="e-starf">${STARFS().map(x=>opt(x.sk,x.nafn,k.starfsmadur||ME())).join("")}</select></label>`:""}
    ${window.MS&&MS.on()?`<label>${k.kvittun?"Ný kvittun (kemur í stað þeirrar gömlu)":"Kvittun (mynd eða PDF)"}<input id="e-file" type="file" accept="image/*,application/pdf"></label>`:""}`;}
  sheet.innerHTML=`<h3 id="sheet-h">${title}</h3><form id="editf" novalidate>${f}<div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="e-cancel">Hætta við</button><button class="btn primary" id="e-save">Vista</button></div></form>`;
  sheetwrap.hidden=false; wireVskSelects(sheet);
  if(type==="fund"&&window.fbWire) fbWire("e");
  document.getElementById("e-cancel").onclick=closeSheet;
  if(type==="kostn"){const k=findKostn(id); let sel=k.undirverkId; const ps=document.getElementById("e-proj");
    const fill=()=>{const p=findProj(ps.value); document.getElementById("e-sub").innerHTML=`<option value="">Ekkert</option>`+(p?.undirverk||[]).map(u=>opt(u.id,u.heiti,sel)).join("");};
    ps.onchange=()=>{sel=null;fill();}; fill();}
  if(type==="time"){const e=findTime(id); let sel=e.undirverkId; const ps=document.getElementById("e-proj");
    const fill=()=>{const p=findProj(ps.value); document.getElementById("e-sub").innerHTML=`<option value="">Ekkert</option>`+(p?.undirverk||[]).map(u=>opt(u.id,u.heiti,sel)).join("");};
    ps.onchange=()=>{sel=null;fill();}; fill();}
  document.getElementById("editf").onsubmit=ev=>{ev.preventDefault(); saveEdit(type,id);};
}
async function saveEdit(type,id){
  const btn=document.getElementById("e-save"); msg("");
  const busy=()=>{btn.disabled=true; btn.textContent="Vista…";};
  try{
    if(type==="klukka"){const k=klukka(); if(!k) return closeSheet(); const dt=val("e-date"), fr=val("e-from");
      if(!dt||!/^\d{1,2}:\d{2}$/.test(fr)) return msg("Skráðu dag og tíma (hh:mm).","err");
      const [h,m]=fr.split(":").map(Number), st=new Date(dt+"T00:00:00"); st.setHours(h,m,0,0);
      if(isNaN(st)||st>new Date()) return msg("Upphafstíminn getur ekki verið í framtíðinni.","err");
      if(Date.now()-st>24*36e5&&!confirm("Klukkan hefur þá gengið í meira en sólarhring. Halda áfram?")) return;
      busy(); const pid=val("e-proj")||null; await saveSnapshot(s=>{if(s.klukka){s.klukka.start=st.toISOString(); s.klukka.desc=val("e-desc"); if(s.klukka.pid!==pid){s.klukka.pid=pid; s.klukka.sid=null;}}}); toast("Klukku breytt"); closeSheet(); return;}
    if(type==="verk"){const p=findProj(id); const name=val("e-name"), mp=val("e-mappa"); if(!name) return msg("Heiti vantar.","err"); if(!urlOk(mp)) return msg("Mappa þarf að vera slóð sem byrjar á https://","err");
      const snap=readProjDates("e",p);
      const thj=[...document.querySelectorAll('#editf input[name="thj"]:checked')].map(i=>i.value), st=val("e-status");
      busy(); const cl=await pickVsk("e","client","Viðskiptavinur"), vk=null;
      const extra={vskId:cl?.id||null,vkId:vk?.id||null,...snap};
      const dl=window.deildVal?deildVal("e-deild"):undefined;
      await saveSnapshot(s=>{const q=sFindP(s,id); if(q&&dl!==undefined) q.deild=dl; if(q) Object.assign(q,{stutt:name,nafn:p.nr+" "+name,stada:st,vidskiptavinur:cl?.name||null,verkkaupi:vk?.name||null,thjonusta:thj,mappa:mp||null,aklst:parseFloat(String(val("e-aklst")).replace(",","."))||null,...(document.getElementById("e-innh")?{innheimta:val("e-innh")||null}:{}),tilbod:parseInt(String(val("e-tilbod")).replace(/\D/g,""))||null,...(document.getElementById("e-taxti")?{taxti:val("e-taxti")||null,timagjald:parseKr(val("e-gjald"))||null}:{}),yfirlit:val("e-yf")||null,naest:val("e-naest")||null,athuga:val("e-ath")||null,teikningarFra:val("e-tf")||null,lysing:val("e-lys")||null,...extra});});
    }
    if(type==="vsk"){const old=findVsk(id); const {c}=readVskForm("e",true);
      const dup=vskList().find(x=>!sameId(x.id,id)&&x.name.toLowerCase()===c.name.toLowerCase()); if(dup) return msg(`${esc(dup.name)} er þegar á listanum.`,"err");
      busy();
      await saveSnapshot(s=>{const q=(s.vidskiptavinir||[]).find(x=>sameId(x.id,id)); if(q) Object.assign(q,c); else (s.vidskiptavinir=s.vidskiptavinir||[]).push({id:old.id,...c});});
    }
    if(type==="sub"){const {u,p}=findSub(id); const name=val("e-name"), mp=val("e-mappa"); if(!name) return msg("Heiti vantar.","err"); if(!urlOk(mp)) return msg("Sérmappa þarf að vera slóð sem byrjar á https://","err");
      const st=val("e-status"), dt=val("e-date"); busy();
      await saveSnapshot(s=>{const [q,w]=sFindU(s,id); if(w) Object.assign(w,{heiti:u.nr+" "+name,stada:st,skiladagur:dt||null,serMappa:mp||null,mappa:mp||q?.mappa||null,lysing:val("e-lys")||null});});
    }
    if(type==="fund"){const name=val("e-name"),dt=val("e-date"),tm=val("e-time"),place=val("e-place"),link=val("e-link"),fg=val("e-fg"),pid=val("e-proj");
      if(!name||!dt) return msg("Heiti og dagur verða að vera útfyllt.","err"); if(!urlOk(link)||!urlOk(fg)) return msg("Slóðir þurfa að byrja á https://","err");
      const start=tm?dt+"T"+tm+":00":dt; let te=val("e-end"); if(tm&&!te){const [h,m]=tm.split(":").map(Number); te=pad((h+1)%24)+":"+pad(m);} if(tm&&te&&te<=tm) return msg("Fundurinn þarf að enda eftir að hann byrjar.","err");
      const att=window.fbRead?fbRead("e"):null, wantSend=window.fbWantSend&&fbWantSend("e")&&(att||[]).length;
      {const o=findFund(id); if(att&&o&&(String(o.date||"")!==start||String(o.dateEnd||"")!==(tm&&te?dt+"T"+te+":00":""))) att.forEach(a=>{delete a.svar; delete a.svarDags;});} // nýr tími = nýtt svar
      if(tm&&window.fbConflicts){const o=findFund(id), c=await fbConflicts({slots:[{s:start,e:dt+"T"+te+":00"}],att:att||[],self:o});
        if(c&&c.length){const sig=c.join("|"); if(window.__fbOvr!==sig){window.__fbOvr=sig; return msg(fbConflictMsg(c),"err");}}}
      busy(); const p=findProj(pid);
      await saveSnapshot(s=>{const q=(s.fundir||[]).find(x=>x.id===id); if(q) Object.assign(q,{name,date:start,dateEnd:tm&&te?dt+"T"+te+":00":null,...(att?{attendees:att}:{}),stadsetning:place||null,fundarhlekkur:link||null,fundargerd:fg||null,projectId:pid||null,verknr:p?.nafn||null,mappa:p?.mappa||null,lysing:val("e-lys")||null});});
      if(wantSend&&window.fbSend) fbSend(id);
    }
    if(type==="skjal"){const name=val("e-name"),tp=val("e-type"),st=val("e-status"),pid=val("e-proj");
      if(!name) return msg("Heiti vantar.","err");
      busy();
      await saveSnapshot(s=>{const q=(s.skjol||[]).find(x=>x.id===id); if(q) Object.assign(q,{name,tegund:tp||null,stada:st,projectId:pid||null,lysing:val("e-lys")||null,breytt:new Date().toISOString()});});
    }
    if(type==="time"){const e=findTime(id); const pid=val("e-proj"),sid=val("e-sub"),desc=val("e-desc"),dt=val("e-date"),fr=val("e-from"),to=val("e-to"),kl=parseKlst(val("e-klst"));
      if(!desc||!dt) return msg("Fylltu út lýsingu og dag.","err");
      if(!(fr&&to)) return msg("Skráðu tímabil: frá og til (hh:mm).","err");
      const t=fr&&to?hoursBetween(fr,to):kl, lys=lysFmt(dt,desc,t), sk=val("e-starf")||e.starfsmadur||ME();
      if(fr&&to){const ov=overlaps(dt,fr,to,sk,id); if(ov&&!confirm(`Þessi tími skarast við „${cleanLys(ov.lysing)}“ kl. ${ov.fra}–${ov.til}.\n\nVista samt?`)) return;}
      busy(); const old=+e.timar||0, diff=t-old;
      await saveSnapshot(s=>{const L=sTimes(s); const q=L.find(x=>x.id===id); const p=sFindP(s,pid), u=sid?sFindU(s,sid)[1]:null;
        const oP=sFindP(s,e.verkefniId), oU=e.undirverkId?sFindU(s,e.undirverkId)[1]:null; if(oP) oP.timar=(oP.timar||0)-old; if(oU) oU.timar=(oU.timar||0)-old;
        if(p) p.timar=(p.timar||0)+t; if(u) u.timar=(u.timar||0)+t; s.timar.samtals=(s.timar.samtals||0)+diff;
        if(s.timar.timabil){const was=(e.timabil||timabilOf(e.date))===s.timar.timabil, now=timabilOf(dt)===s.timar.timabil; s.timar.timabilSamtals=(s.timar.timabilSamtals||0)-(was?old:0)+(now?t:0);}
        if(q) Object.assign(q,{date:dt,lysing:lys,fra:fr&&to?fr:null,til:fr&&to?to:null,timar:t,starfsmadur:sk,verkefniId:pid,undirverkId:sid||null,nr:u?.nr||p?.nr,timabil:timabilOf(dt),...(document.getElementById("e-taxti")?{taxti:val("e-taxti")||null}:{})});
        if(s.timar.faerslur) s.timar.nyjast=s.timar.faerslur.slice(0,10);});
    }
    if(type==="kostn"){const pid=val("e-proj"),sid=val("e-sub"),desc=val("e-desc"),dt=val("e-date"),amt=parseKr(val("e-amt")),sk=val("e-starf")||findKostn(id)?.starfsmadur||ME(), file=document.getElementById("e-file")?.files?.[0];
      if(!desc||!dt) return msg("Fylltu út lýsingu og dag.","err"); if(!amt) return msg("Skráðu upphæð í krónum.","err");
      busy(); let kv=null; if(file){btn.textContent="Sendi kvittun…"; try{kv=await msKvittun(file,findProj(pid),dt,desc);}catch(e){toast("Kvittun vistaðist ekki: "+(e?.message||"villa"));}}
      await saveSnapshot(s=>{const q=(s.kostnadur||[]).find(x=>x.id===id); if(q){Object.assign(q,{verkefniId:pid,undirverkId:sid||null,lysing:desc,date:dt,upphaed:amt,starfsmadur:sk}); if(kv){q.kvittun=kv.url; q.kvittunId=kv.id;}}});
    }
    toast("Breyting vistuð"); closeSheet();
  }catch(e){btn.disabled=false; btn.textContent="Vista"; msg(esc(e?.code==="form"?e.message:errText(e)),"err");}
}


function syncNow(){
  if(!S) return; if(window.can&&!can("stillingar")) return toast("Aðeins admin getur sótt afrit af öllum gögnum."); // persónuvernd (2.44.0) const blob=new Blob([JSON.stringify(S,null,1)],{type:"application/json"}); const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="aera-afrit-"+isoDay(new Date())+".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  toast("Afrit vistað á tækinu");
}
function importView(){
  document.getElementById("view").innerHTML=`<h2 class="big">Engin gögn ennþá</h2><div class="empty" style="text-align:left">Veldu gagnaskrána (aera-gogn.json eða afrit) til að flytja gögnin inn.</div>
  <div class="links" style="margin-top:12px"><label class="btn primary" style="cursor:pointer">Flytja inn gögn<input type="file" id="imp" accept="application/json,.json" hidden></label></div><div id="imp-msg"></div>`;
  document.getElementById("imp").onchange=async ev=>{const f=ev.target.files[0]; if(!f) return; const out=document.getElementById("imp-msg");
    try{const d=JSON.parse(await f.text()); if(!Array.isArray(d.verkefni)) throw {message:"Þetta er ekki gagnaskrá appsins."};
      delete d._snid; d.uppfaert=new Date().toISOString(); S=d; render(); await DB.set("app/state",d); toast("Gögnin eru komin inn");}
    catch(e){out.innerHTML=`<div class="msg err">${esc(e?.message||"Gat ekki lesið skrána.")}</div>`;}};
}
render();
/* ---------- Skrár í OneDrive (lesnar af Claude, geymdar í app/skrar) ---------- */
let SK=null;
const kb=n=>{n=+n||0; if(!n) return "Tómt"; const u=["B","KB","MB","GB"]; let i=0; while(n>=1024&&i<3){n/=1024;i++;} return (n<10&&i?n.toFixed(1):Math.round(n)).toString().replace(".",",")+" "+u[i];};
const ODTYPE={pdf:"PDF",docx:"Word",doc:"Word",xlsx:"Excel",xls:"Excel",pptx:"PowerPoint",dwg:"AutoCAD",rvt:"Revit",c2p:"Capture",zip:"Zip",jpg:"Mynd",jpeg:"Mynd",png:"Mynd",tm:"Twinmotion",pcp:"Plot"};
const odUrl=(parts,isFile)=>{const u=SK.grunnur+parts.map(encodeURIComponent).join("/"); return isFile&&/\.(docx?|xlsx?|pptx?)$/i.test(parts[parts.length-1])?u+"?web=1":u;};
function projFolder(p){if(!SK?.moppur) return null; const k=Object.keys(SK.moppur).find(k=>k===p.nafn)||Object.keys(SK.moppur).find(k=>p.nr&&k.startsWith(p.nr+" ")); return k?{k,...SK.moppur[k]}:null;}
function skrarHTML(p){
  if(window.MS&&MS.on()&&window.msSkrar) return msSkrar(p);
  const m=projFolder(p); if(!SK) return window.msMissing?`<div class="viewtitle">Skrár í ${ODN()}</div><div class="empty">Tengdu Microsoft til að sjá skrár verkefnisins.${msMissing()}</div>`:"";
  if(!m) return `<div class="viewtitle">Skrár í ${ODN()}</div><div class="empty">Engin mappa fannst fyrir ${esc(p.nafn)} undir ${esc(ORG.od.verkefni)}.</div>`;
  const item=(parts,it)=>{const isF=it.t==="f", ext=isF?(it.n.split(".").pop()||"").toLowerCase():"";
    return `<a class="lrow fl" href="${esc(odUrl(parts.concat(it.n),isF))}" target="_blank" rel="noopener"><div class="lm"><div class="lt">${isF?"":""}${esc(it.n)}</div><div class="ls">${esc([isF?(ODTYPE[ext]||ext.toUpperCase()):"Mappa",kb(it.s)].join(" · "))}</div></div><div class="lr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></div></a>`;};
  const rows=(m.atridi||[]).map(d=>{const parts=[m.k,d.n], has=d.s>0;
    return `<details class="fold"${has&&/^0[478]/.test(d.n)?" open":""}><summary class="lrow"><div class="lm"><div class="lt"${has?"":' style="color:var(--muted)"'}>${esc(d.n)}</div><div class="ls">${esc(has?kb(d.s)+(d.i?` · ${d.i.length} ${d.i.length===1?"atriði":"atriði"}`:""):"Tóm mappa")}</div></div>
      ${has?`<a class="plink" href="${esc(odUrl(parts))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Opna</a>`:""}</summary>
      ${d.i&&d.i.length?`<div class="fitems">${d.i.map(it=>item(parts,it)).join("")}</div>`:has?`<div class="fitems"><div class="ls" style="padding:8px 0">Opnaðu möppuna til að sjá innihaldið.</div></div>`:""}</details>`;}).join("");
  return `<div class="viewtitle" style="display:flex;justify-content:space-between;gap:8px"><span>Skrár í OneDrive</span><a class="plink" href="${esc(odUrl([m.k]))}" target="_blank" rel="noopener">Opna möppu</a></div>
  <div class="llist">${rows}</div><p class="hint" style="margin-top:8px">Listi síðast uppfærður ${esc(fmtDate(SK.uppfaert))}. ${window.msMissing?"Tengdu Microsoft til að sjá nýjustu skrárnar og forskoða þær.":"Biddu Claude að „uppfæra skráalistann“ til að fá nýjar skrár."}</p>${window.msMissing?msMissing():""}`;
}
window.aeraStart=function(db){
  DB=db; MCP={local:true}; window.USER=db.user||null;
  db.watch("app/notendur",s=>{const nd=s.exists?s.data():null; if(window.nuSet) nuSet(nd);
    const me=nd?.notendur?.[USER?.email]; if(me&&USER&&!USER.varaleid){ if(me.virkur===false){toast("Aðgangur þinn hefur verið gerður óvirkur."); setTimeout(()=>aeraSignOut(),1500); return;} Object.assign(USER,{nafn:me.nafn||USER.nafn,sk:me.sk||USER.sk,hlutverk:me.hlutverk||USER.hlutverk}); }
    if(S) render();},()=>{}); document.getElementById("syncbtn").hidden=false; document.getElementById("logoutbtn").hidden=false; document.getElementById("fab").hidden=false;
  db.watch("app/skrar",s=>{SK=s.exists?s.data():null; if(S) render();},()=>{});
  // Gögnin: app/state + söfn. Gamla sniðið (allt í app/state) er lesið eins og áður þar til admin hefur flutt gögnin.
  const P={state:null,cols:{},klukka:null,ready:new Set(),pend:{}}; let mode=null, migrating=false;
  const showErr=e=>{document.getElementById("view").innerHTML=`<h2 class="big">Gögn ekki aðgengileg</h2><div class="empty">${esc(e?.code==="permission-denied"?"Þessi aðgangur hefur ekki leyfi til að lesa gögnin.":(e?.message||"Óþekkt villa"))}</div>`;};
  const rebuild=()=>{ if(P.ready.size<GOGN.COLS.length+2) return; const nd=GOGN.join(P); PENDING=Object.values(P.pend).some(Boolean);
    if(JSON.stringify(nd)!==JSON.stringify(S)){S=nd; render(); openFromHash();} else drawSync(); };
  const startSplit=()=>{ if(mode==="split") return; mode="split"; window.SPLIT=true; window.__DB=db; /* 2.56.0: pöntunarsíða (pantanir2.js) */ const fj=window.can&&can("fjarmal"); if(window.spStart) spStart(db); if(window.heimStart) heimStart(db);
    for(const c of GOGN.COLS){ if(c.k==="reikningar"&&!fj&&!window.AERA_DEMO){P.cols[c.k]=[]; P.ready.add(c.k); continue;} // 2.94.2: reikningar aðeins fyrir fjármál (admin, bókari)
    db.watchCol(c.k, c.eigandi&&!fj?["eigandi",USER.email]:null,
      r=>{P.cols[c.k]=r.docs; P.pend[c.k]=r.pending; P.ready.add(c.k); rebuild(); if(!r.fromCache&&window.msTick) msTick();},
      e=>{console.warn("Safn "+c.k,e); P.cols[c.k]=P.cols[c.k]||[]; P.ready.add(c.k); rebuild();}); }
    db.watch("klukka/"+USER.email, s=>{P.klukka=s.exists?s.data():null; P.ready.add("klukka"); rebuild();}, ()=>{P.ready.add("klukka"); rebuild();}); };
  const migrateNow=async d=>{ migrating=true; toast("Flyt gögnin í nýtt snið…");
    try{ await db.commit(GOGN.migrate(d,USER.email,x=>skEmail(x.starfsmadur||x.sk))); toast("Gögnin eru flutt í nýja sniðið"); }
    catch(e){ migrating=false; console.warn("Flutningur",e); toast("Flutningur gagna mistókst: "+(e?.code||e?.message||"villa")); } };
  // 2.94.4: stundum fékk fyrsti lestur app/state „permission-denied“ rétt eftir innskráningu (lykill ekki kominn til Firestore) og
  // „Gögn ekki aðgengileg“ birtist. Nú er reynt aftur (með nýjum lykli) nokkrum sinnum áður en villan er sýnd.
  let stTry=0; const stErr=e=>{ if(e?.code==="permission-denied"&&stTry<4&&!S){ const n=++stTry; if(db.refresh) db.refresh(); setTimeout(watchState,600*n); return; } showErr(e); };
  const watchState=()=>db.watch("app/state",s=>{
    if(!s.exists){ if(s.fromCache) return;
      // Ný uppsetning (frá 2.4.1): admin stofnar tómt app/state í nýja sniðinu í stað þess að vera beðinn um gagnaskrá
      if(window.can&&can("notendur")&&!migrating){ migrating=true; db.set("app/state",{skipting:2,uppfaert:new Date().toISOString(),stillingar:{},timar:{samtals:0}}).then(()=>{migrating=false;}).catch(e=>{migrating=false; console.warn("Stofna app/state",e); importView();}); return; }
      importView(); return; }
    const d=s.data();
    if(GOGN.isSplit(d)){ P.state=d; P.pend.state=!!s.pending; P.ready.add("state"); startSplit(); rebuild(); return; }
    if(mode==="split") return; // eldra snið birtist ekki aftur eftir flutning
    mode="legacy"; window.SPLIT=false; PENDING=!!s.pending;
    if(JSON.stringify(d)!==JSON.stringify(S)){S=d; render(); openFromHash();} else drawSync();
    if(!s.fromCache&&!migrating&&!s.pending&&window.can&&can("notendur")&&Array.isArray(d.verkefni)) migrateNow(d);
    if(!s.fromCache&&window.msTick) msTick();
  }, stErr);
  watchState();
};
document.getElementById("fab").hidden=true;

/* Skrá starfsfólk á verkefni (1.9.3) */
function staffSheet(pid){const p=findProj(pid); if(!p) return; const cur=projStaff(p);
  sheet.innerHTML=`<h3 id="sheet-h">Starfsfólk á ${esc(p.nr)}</h3><p class="hint" style="margin:0 0 10px">Hakaðu við þá sem vinna á verkefninu. Þeir sjá það undir sínum verkefnum og geta skráð tíma á það.</p>
    <div class="llist">${STARFS().map(x=>`<label class="lrow" style="cursor:pointer"><div class="ll">${staffAv(x.sk)}</div><div class="lm"><div class="lt">${esc(x.nafn)}${x.sk===ME()?" (þú)":""}</div></div><input type="checkbox" class="stf" value="${esc(x.sk)}" ${cur.includes(x.sk)?"checked":""} style="width:22px;height:22px;min-height:0"></label>`).join("")}</div>
    <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="st-cancel">Hætta við</button><button type="button" class="btn primary" id="st-save">Vista</button></div>`;
  sheetwrap.hidden=false; document.getElementById("st-cancel").onclick=closeSheet;
  document.getElementById("st-save").onclick=async()=>{const sel=[...sheet.querySelectorAll(".stf:checked")].map(i=>i.value);
    if(!sel.length) return msg("Veldu að minnsta kosti einn starfsmann.","err");
    try{await saveSnapshot(s=>{const q=sFindP(s,pid); if(q) q.starfsmenn=sel;}); toast("Starfsfólk vistað"); closeSheet();}catch(e){msg(esc(errText(e)),"err");}};}
