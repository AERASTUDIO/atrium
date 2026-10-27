/* Bæta við og eyða: eyðublöð og vistun nýrra færslna
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* ---------- Bæta við ---------- */
let kind="tima";
const sheetwrap=document.getElementById("sheetwrap"), sheet=document.getElementById("sheet");
function toast(t,undo){const el=document.getElementById("toast");el.textContent=t;
  if(undo){const b=document.createElement("button"); b.type="button"; b.className="undo"; b.textContent="Afturkalla"; b.onclick=()=>{el.hidden=true; undo();}; el.append(" ",b);}
  el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,undo?7000:3200);}
/* ---------- Eyða ---------- */
function deleteItem(type,id){
  const T=s=>s.timar=s.timar||{}, entries=s=>[...new Set([...(s.timar?.faerslur||[]),...(s.timar?.nyjast||[])])];
  const dropTimes=(s,pred)=>{T(s); const gone=entries(s).filter(pred); const seen=new Set();
    gone.forEach(e=>{if(seen.has(e.id)) return; seen.add(e.id); const t=+e.timar||0, p=sFindP(s,e.verkefniId), u=e.undirverkId?sFindU(s,e.undirverkId)[1]:null;
      if(p) p.timar=Math.max(0,(p.timar||0)-t); if(u) u.timar=Math.max(0,(u.timar||0)-t); s.timar.samtals=Math.max(0,(s.timar.samtals||0)-t);
      if(s.timar.timabil&&(e.timabil||timabilOf(e.date))===s.timar.timabil) s.timar.timabilSamtals=Math.max(0,(s.timar.timabilSamtals||0)-t);});
    if(s.timar.faerslur) s.timar.faerslur=s.timar.faerslur.filter(e=>!pred(e)); if(s.timar.nyjast) s.timar.nyjast=s.timar.nyjast.filter(e=>!pred(e)); return seen.size;};
  let label="", q="", mut=null, q2=null, mut2=null;
  if(type==="verk"){const p=findProj(id); if(!p) return; const nu=(p.undirverk||[]).length, nt=faerslur().filter(e=>e.verkefniId===id).length+kostn().filter(k=>k.verkefniId===id).length;
    label=p.nafn; q=`Eyða verkefninu „${p.nafn}“?`+(nu||nt?`\n\nÞví fylgja ${nu} undirverk og ${nt} tíma- og kostnaðarskráningar sem eyðast líka.`:"")+`\nFundir og skjöl haldast en tengjast ekki lengur verkefninu.`;
    mut=s=>{dropTimes(s,e=>e.verkefniId===id); s.verkefni=(s.verkefni||[]).filter(x=>x.id!==id); if(s.kostnadur) s.kostnadur=s.kostnadur.filter(k=>k.verkefniId!==id);
      (s.fundir||[]).forEach(f=>{if(f.projectId===id){f.projectId=null;}}); (s.skjol||[]).forEach(x=>{if(x.projectId===id) x.projectId=null;});};}
  if(type==="sub"){const r=findSub(id); if(!r) return; label=r.u.heiti; q=`Eyða undirverkinu „${r.u.heiti}“?\n\nTímaskráningar á það haldast á verkefninu.`;
    mut=s=>{const [p]=sFindU(s,id); if(p) p.undirverk=p.undirverk.filter(u=>u.id!==id); entries(s).forEach(e=>{if(e.undirverkId===id) e.undirverkId=null;}); (s.kostnadur||[]).forEach(k=>{if(k.undirverkId===id) k.undirverkId=null;});};}
  if(type==="fund"){const f=findFund(id); if(!f) return; label=f.name; window.__delFund=f; q=`Eyða fundinum „${f.name}“?`+(f.fundargerd?`\n\nFundargerðin sjálf í OneDrive eyðist ekki.`:"")+(f.msEventId&&f.msOrg!==false?`\n\nAfboðun verður send þátttakendum í gegnum Outlook.`:"");
    mut=s=>{s.fundir=(s.fundir||[]).filter(x=>x.id!==id);};
    const later=f.seria?(S.fundir||[]).filter(x=>x.seria===f.seria&&x.id!==id&&String(x.date)>String(f.date)):[];
    if(later.length){q2=`Þetta er endurtekinn fundur. Eyða líka ${later.length} ${later.length===1?"fundi":"fundum"} síðar í röðinni?\n\nÝttu á „Hætta við“ til að eyða bara þessum.`; const ids=new Set([id,...later.map(x=>x.id)]); mut2=s=>{s.fundir=(s.fundir||[]).filter(x=>!ids.has(x.id));};}}
  if(type==="time"){const e=findTime(id); if(!e) return; label="Tímaskráning"; q=`Eyða tímaskráningunni „${cleanLys(e.lysing)}“ (${hrs(e.timar)})?`;
    mut=s=>{dropTimes(s,x=>x.id===id);};}
  if(type==="kostn"){const k=findKostn(id); if(!k) return; label="Kostnaður"; q=`Eyða kostnaðinum „${k.lysing}“ (${kr(k.upphaed)})?`+(k.kvittun?`\n\nKvittunin sjálf í OneDrive eyðist ekki.`:""); mut=s=>{s.kostnadur=(s.kostnadur||[]).filter(x=>x.id!==id);};}
  if(type==="skjal"){const x=findSkjal(id); if(!x) return; label=x.name; q=`Eyða skjalinu „${x.name}“?`; mut=s=>{s.skjol=(s.skjol||[]).filter(y=>y.id!==id);};}
  if(type==="vsk"){const c=findVsk(id); if(!c) return; const n=vskProjects(c).length; label=c.name;
    q=`Eyða „${c.name}“ úr viðskiptavinum?`+(n?`\n\n${n} verkefni tengjast fyrirtækinu. Þau haldast en tengingin fellur niður.`:"");
    mut=s=>{s.vidskiptavinir=(s.vidskiptavinir||[]).filter(x=>!sameId(x.id,id)); (s.verkefni||[]).forEach(p=>{if(sameId(p.vskId,id)){p.vskId=null;p.vidskiptavinur=null;} if(sameId(p.vkId,id)){p.vkId=null;p.verkkaupi=null;}});};}
  if((type==="verk"||type==="vsk")&&window.can&&!can("eyda")) return toast("Aðeins admin getur eytt verkefnum og viðskiptavinum.");
  if(!mut||!confirm(q)) return; if(q2&&confirm(q2)) mut=mut2;
  const before=structuredClone(S);
  saveSnapshot(mut).then(()=>{
    if(type==="fund"&&window.fbCancel&&window.__delFund) fbCancel(window.__delFund);
    if(DETAIL){let st=null; try{st=history.state;}catch(e){} DETAIL=null; if(st&&st.aera){try{history.back();}catch(e){}} render(); window.scrollTo({top:listScroll});}
    toast(`${label} eytt`,()=>{S=before; saveSnapshot(s=>{Object.keys(s).forEach(k=>delete s[k]); Object.assign(s,structuredClone(before));}).then(()=>toast("Hætt við að eyða"));});
  }).catch(e=>toast(errText(e)));
}
const TAB_KIND={undir:"undir",fundir:"fund",timar:"tima",verk:"verk",lverk:"verk",sverk:"verk",vsk:"vsk",lvsk:"vsk",svsk:"vsk",dagatal:"fund"};
function openSheet(){sheetwrap.hidden=false;drawForm();}
function openFab(){if(!DETAIL&&window.FAB_EXT?.[tab]){FAB_EXT[tab](); return;} if(!DETAIL&&tab==="skjol"&&window.skOpenNew){skOpenNew(null); return;} if(!DETAIL&&tab==="postur"&&window.poCompose){poCompose({}); return;}if(!DETAIL&&tab==="dagatal") PREFILL={date:calSel}; if(!DETAIL&&TAB_KIND[tab]) kind=TAB_KIND[tab]; else if(DETAIL?.startsWith("vsk:")) kind="verk"; _ctxRole=vskFilter||null; openSheet();}
function closeSheet(){window.FAB_ONE=false; sheetwrap.hidden=true; document.body.classList.remove("sidesheet"); sheet.closest(".sheet").classList.remove("wide","hedsheet"); PREFILL=null; render();}
document.getElementById("fab").addEventListener("click",openFab);
/* ---------- Lágmarka glugga: halda áfram að vinna í appinu og koma aftur að verkinu ---------- */
let DOCK=[];
const sheetHasWork=()=>!!sheet.querySelector("form textarea, form input:not([type=hidden]):not([type=checkbox]):not([type=date]), .rbox");
function sheetTitle(){const h=sheet.querySelector("#sheet-h")?.textContent?.trim()||"Opið verk"; const sub=sheet.querySelector("#po-subj")?.value||sheet.querySelector("#sk-name,#f-name,#f-desc")?.value||""; return sub?h+" · "+sub:h;}
function minimizeSheet(){if(sheetwrap.hidden||!sheet.firstChild) return; const title=sheetTitle(); const frag=document.createDocumentFragment(); while(sheet.firstChild) frag.appendChild(sheet.firstChild);
  const wide=sheet.closest(".sheet").classList.contains("wide"); DOCK.push({id:newId(),title,frag,wide,icon:frag.querySelector?.("#pocf")?"✉":frag.querySelector?.("#rkf")?"🧾":frag.querySelector?.("#skf")?"📄":"✎"});
  sheetwrap.hidden=true; sheet.closest(".sheet").classList.remove("wide"); drawDock(); render(); toast("Lágmarkað – opnaðu aftur neðst á skjánum");}
function restoreDock(id){const i=DOCK.findIndex(x=>x.id===id); if(i<0) return; if(!sheetwrap.hidden) minimizeSheet(); const it=DOCK.splice(i,1)[0];
  sheet.innerHTML=""; sheet.appendChild(it.frag); sheet.closest(".sheet").classList.toggle("wide",!!it.wide); sheetwrap.hidden=false; drawDock();}
function drawDock(){const el=document.getElementById("dock"); el.hidden=!DOCK.length; document.body.classList.toggle("hasdock",!!DOCK.length);
  el.innerHTML=DOCK.map(x=>`<div class="dchip"><button type="button" class="dopen" data-dock="${x.id}" title="Opna aftur">${x.icon} <span>${esc(x.title)}</span></button><button type="button" class="dx" data-dockx="${x.id}" aria-label="Loka ${esc(x.title)}">✕</button></div>`).join("");
  el.querySelectorAll("[data-dock]").forEach(b=>b.onclick=()=>restoreDock(b.dataset.dock));
  el.querySelectorAll("[data-dockx]").forEach(b=>b.onclick=()=>{if(confirm("Loka þessu án þess að vista?")){DOCK=DOCK.filter(x=>x.id!==b.dataset.dockx); drawDock();}});}
window.addEventListener("beforeunload",e=>{if(DOCK.length||(!sheetwrap.hidden&&sheetHasWork())){e.preventDefault(); e.returnValue="";}});
document.getElementById("sheetmin").addEventListener("click",minimizeSheet);
document.getElementById("scrim").addEventListener("click",()=>sheetHasWork()?minimizeSheet():closeSheet());
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!sheetwrap.hidden) (sheetHasWork()?minimizeSheet:closeSheet)();});
/* Opna síðu í nýjum glugga (t.d. póst við hliðina á verkefni) */
let _hashDone=false;
function openFromHash(){if(_hashDone) return; _hashDone=true; const m=location.hash.match(/^#open=(.+)$/); if(!m) return; const k=decodeURIComponent(m[1]); try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} const t=k.split(":")[0]; if(t&&TABDEF.some(x=>x[0]===({post:"postur",verk:"verk",sub:"undir",fund:"fundir",time:"timar",kostn:"timar",reikn:"timar",skjal:"skjol",vsk:"vsk"}[t]))) tab={post:"postur",verk:"verk",sub:"undir",fund:"fundir",time:"timar",kostn:"timar",reikn:"timar",skjal:"skjol",vsk:"vsk"}[t]; openDetail(k);}
function openNewWin(){if(!DETAIL) return; window.open(location.pathname+location.search+"#open="+encodeURIComponent(DETAIL),"_blank","noopener");}
function ctxProj(){if(!DETAIL) return null; const i=DETAIL.indexOf(":"),t=DETAIL.slice(0,i),id=DETAIL.slice(i+1);
  if(t==="verk") return {p:findProj(id)}; if(t==="sub"){const r=findSub(id); return r&&{p:r.p,u:r.u};} if(t==="fund"){const f=findFund(id); return {p:fundProj(f)};}
  if(t==="skjal") return {p:skjalProj(findSkjal(id))}; return null;}
const projOpts=(all)=>{const c=ctxProj()?.p; const vt=window.isVett&&isVett(); const ps=verkefni().slice().sort((a,b)=>(isDone(a)-isDone(b))||b.nr.localeCompare(a.nr)).filter(p=>(all&&!vt)||!isDone(p)).filter(p=>!vt||window.vettVerk(p)); /* 2.100.0: vettvangur sér aðeins sín verk */
  const o=p=>`<option value="${esc(p.id)}"${c&&c.id===p.id?" selected":""}>${esc(p.nafn)}</option>`;
  const a=ps.filter(p=>!isDone(p)), d=ps.filter(p=>isDone(p));
  return a.map(o).join("")+(d.length?`<optgroup label="Lokið">${d.map(o).join("")}</optgroup>`:"");};
function nextProjNr(){const y=today.getFullYear();const n=verkefni().filter(p=>p.nr.startsWith(y+"-")).map(p=>+p.nr.split("-")[1]||0);return y+"-"+pad((n.length?Math.max(...n):0)+1);}
function nextSubNr(p){const n=(p.undirverk||[]).map(u=>+String(u.nr).split("-")[2]||0);return p.nr+"-"+pad((n.length?Math.max(...n):0)+1);}
const FORM_TITLE={kostn:"Útlagður kostnaður",tima:"Skrá tíma",fund:"Nýr fundur",undir:"Nýtt undirverk",verk:"Nýtt verkefni",vsk:"Nýr viðskiptavinur"};
const FORM_REQ={kostn:["f-desc","f-amt"],tima:["f-desc"],fund:["f-name","f-date","f-time"],undir:["f-proj","f-name"],verk:["f-name"],vsk:["f-name"]};
const FORM_KEEP={tima:null,fund:["f-name","f-date","f-proj"],undir:["f-proj","f-name","f-nr"],verk:["f-name","f-client"],vsk:["f-teg","f-tegseg","f-name","f-greidsla","f-simi","role"]};
function enhanceForm(){
  const f=document.getElementById("addf"); if(!f) return;
  document.getElementById("sheet-h").textContent=FORM_TITLE[kind]||"Bæta við";
  const star=lab=>{if(lab&&!lab.querySelector(".req")) lab.insertAdjacentHTML("beforeend",' <span class="req" aria-hidden="true">*</span>');};
  const labText=el=>{const l=el?.closest("label"); if(!l) return null; const span=document.createElement("span"); span.className="lbl"; while(l.firstChild&&l.firstChild.nodeType===3){span.append(l.firstChild);} l.prepend(span); return span;};
  (FORM_REQ[kind]||[]).forEach(id=>{const el=document.getElementById(id); if(el){el.setAttribute("aria-required","true"); star(labText(el));}});
  if(kind==="kostn") star(f.querySelector(".daychips")?.previousElementSibling);
  if(kind==="tima"){const dk=f.querySelector(".daychips")?.previousElementSibling; star(dk); const th=f.querySelector(".three");
    if(th){const k=document.createElement("div"); k.className="kind"; k.style.marginBottom="-4px"; k.innerHTML='Tími: frá–til eða fjöldi klst. <span class="req">*</span>'; th.before(k);}}
  if(kind==="vsk"){const r=f.querySelector('input[name="role"]')?.closest("div")?.previousElementSibling; star(r);}
  const keep=FORM_KEEP[kind];
  if(keep){const more=document.createElement("details"); more.className="more"; more.innerHTML='<summary>Fleiri valkostir</summary><div class="moreb"></div>'; const box=more.querySelector(".moreb");
    [...f.children].forEach(ch=>{if(ch.id==="f-msg"||ch.classList.contains("actions")||ch.matches("p.hint")&&!ch.id) return;
      const isKeep=keep.some(k=>ch.id===k||ch.querySelector?.(`#${k}, input[name="${k}"]`)||(k==="f-client"&&ch.id==="f-client-new"));
      if(!isKeep) box.append(ch);});
    if(box.children.length){f.querySelector("#f-msg").before(more);
      if([...box.querySelectorAll("input:not([type=checkbox]),textarea")].some(i=>i.value)) more.open=true;}}
  const note=document.createElement("p"); note.className="hint reqnote"; note.innerHTML='<span class="req">*</span> þarf að fylla út'; f.querySelector("#f-msg").before(note);
  const first=f.querySelector("input:not([type=hidden]):not([type=checkbox]),select"); if(first&&!("ontouchstart" in window)) setTimeout(()=>first.focus(),50);
}
function drawForm(){
  const T=Object.fromEntries(Object.entries({tima:"Tími",fund:"Fundur",undir:"Undirverk",verk:"Verkefni",vsk:"Viðskiptavinur"}).filter(([k])=>kindOn(k)));
  // Pakkaval (2.21.3): Pöntun og Tilboð líka í „+ Nýtt“ – opna eigin form
  if(window.ORG?.pakkaval&&!(window.isVett&&isVett())){ if(ON("pantanir")&&window.FAB_EXT?.pantanir) T.xpontun="Pöntun"; if(window.tbOK&&tbOK()&&window.FAB_EXT?.ltilbod) T.xtilbod="Tilboð"; }
  if(!kindOn(kind)) kind=Object.keys(T)[0]||"verk";
  let f="";
  const subseg=!ON("kostnadur")?"":`<div class="seg seg2" role="group" aria-label="Tegund skráningar"><button type="button" data-k2="tima" aria-pressed="${kind==="tima"}">Vinnutími</button><button type="button" data-k2="kostn" aria-pressed="${kind==="kostn"}">Útlagður kostnaður</button></div>`;
  const dayPick=`<div><div class="kind" style="margin-bottom:6px">Dagur</div><div class="daychips"><button type="button" class="chipbtn" data-day="0">Í dag</button><button type="button" class="chipbtn" data-day="-1">Í gær</button><input id="f-date" type="date" required value="${isoDay(today)}" aria-label="Dagsetning"></div></div>`;
  if(kind==="kostn") f=`${subseg}<label>Verkefni<select id="f-proj">${projOpts(true)}<option value="">Ekkert verkefni (almennt)</option></select></label>
    <label>Lýsing<input id="f-desc" required placeholder="T.d. prentun teikninga, akstur, efni"></label>
    <label>Upphæð (kr.)<input id="f-amt" type="text" inputmode="numeric" required placeholder="t.d. 12.500" autocomplete="off"></label>
    ${dayPick}
    <label>Undirverk<select id="f-sub"></select></label>
    ${STARFS().length>1&&can("fjarmal")?`<label>Starfsmaður<select id="f-starf">${STARFS().map(x=>`<option value="${esc(x.sk)}"${x.sk===ME()?" selected":""}>${esc(x.nafn)}</option>`).join("")}</select></label>`:""}
    ${window.MS&&MS.on()?`<label>Kvittun (mynd eða PDF)<input id="f-file" type="file" accept="image/*,application/pdf"></label><p class="hint" style="margin-top:-6px">Vistast í OneDrive: verkefni › 02 Vinnuskjöl › Kvittanir.</p>`:`<p class="hint">Tengdu Microsoft í Stillingum til að geta hengt kvittun við.</p>`}`;
  if(kind==="skjal") f=`<label>Heiti skjals<input id="f-name" required placeholder="T.d. Ljósahönnun – forsendur"></label>
    <div class="two"><label>Tegund<select id="f-type"><option value="">Engin</option>${DTYPES.map(t=>opt(t,DTL[t]||t,"")).join("")}</select></label>
    <label>Staða<select id="f-status">${DSTAT.map(s=>opt(s,STL[s],"Not started")).join("")}</select></label></div>
    <label>Verkefni<select id="f-proj"><option value="">Ekkert</option>${projOpts(true)}</select></label>
    <label>Efni<textarea id="f-note" placeholder="Valfrjálst"></textarea></label>`;
  if(kind==="tima") f=`${window.isVett&&isVett()?"":subseg}<label>Verkefni<select id="f-proj">${projOpts(true)}${window.isVett&&isVett()?"":`<option value="">Ekkert verkefni (almennt)</option>`}</select></label>
    <label>Undirverk<select id="f-sub"></select></label>
    <label>Lýsing<input id="f-desc" required placeholder="Hvað var gert" value="${esc(PREFILL?.desc||"")}"></label>
    ${!PREFILL?.timer&&window.taxtiSelect&&!(window.isVett&&isVett())?taxtiSelect("f-taxti",""):""}
    ${STARFS().length>1&&can("fjarmal")?`<label>Starfsmaður<select id="f-starf">${STARFS().map(x=>`<option value="${esc(x.sk)}"${x.sk===ME()?" selected":""}>${esc(x.nafn)}</option>`).join("")}</select></label>`:""}
    ${PREFILL?.timer?"":`${dayPick}
    <div class="two"><label>Frá<input id="f-from" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${esc(PREFILL?.fra||"")}"></label><label>Til<input id="f-to" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${esc(PREFILL?.til||"")}"></label></div>`}
    ${klukka()||PREFILL?.timer===false?"":`<button type="button" class="btn${PREFILL?.timer?" primary":""}" id="f-timer" style="width:100%">▶ Byrja klukku í staðinn</button>`}`;
  if(kind==="fund") f=`<label>Heiti fundar<input id="f-name" required placeholder="T.d. Fundur með verkkaupa"></label>
    <div class="three fbtime"><label>Dagur<input id="f-date" type="date" required value="${isoDay(today)}"></label><label>Byrjar<input id="f-time" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 required></label><label>Lýkur<input id="f-end" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24></label></div>
    ${window.fbField?fbField("f",null):""}
    <label>Staðsetning<input id="f-place" data-stadur placeholder="Heimilisfang eða salur"></label>
    <label>Fundarhlekkur<input id="f-link" type="url" placeholder="https://… (ef fjarfundur)"></label>
    <label>Fundargerð (slóð)<input id="f-fg" type="url" placeholder="https://… (má bæta við síðar)"></label>
    <label>Verkefni<select id="f-proj"><option value="">Ekkert</option>${projOpts(false)}</select></label>
    <div class="two"><label>Endurtekning<select id="f-rep"><option value="">Engin</option><option value="7">Vikulega</option><option value="14">Aðra hverja viku</option><option value="m">Mánaðarlega</option></select></label><label>Fjöldi skipta<input id="f-repn" inputmode="numeric" value="6"></label></div>`;
  if(kind==="undir") f=`<label>Verkefni<select id="f-proj" required>${projOpts(false)}</select></label>
    <label>Heiti<input id="f-name" required placeholder="T.d. Ljósateikning sviðs"></label>
    <div class="two"><label>Skiladagur<input id="f-date" type="date"></label>
    <label>Staða<select id="f-status"><option value="Not started">Ekki hafið</option><option value="Up next">Næst</option><option value="In progress">Í vinnslu</option></select></label></div>
    <label>Sérmappa (slóð)<input id="f-mappa" type="url" placeholder="Tómt = mappa verkefnisins"></label>
    <label>Athugasemd<textarea id="f-note" placeholder="Valfrjálst"></textarea></label><p class="hint" id="f-nr"></p>`;
  if(kind==="verk") f=`<label>Heiti<input id="f-name" required placeholder="T.d. Árshátíð Arion"></label>
    <label>Staða<select id="f-status">${STODUR().filter(x=>!x.lokid).map(x=>`<option>${esc(x.n)}</option>`).join("")}</select></label>
    ${projFields("f",null)}
    ${window.ORG?.pakkaval?(window.tegSelect?tegSelect("f-deild"):""):(window.deildSelect?deildSelect("f-deild"):"")}
    ${thjField([])}
    ${Object.values(SNID()).some(a=>a?.length)?`<label class="chk" style="flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-size:14.5px"><input type="checkbox" id="f-snid" style="width:auto">Stofna undirverk eftir sniðmáti þjónustu</label>`:""}
    ${STARFS().length>1?`<div class="kind" style="margin-top:6px">Starfsfólk á verkefni</div><div class="chks">${STARFS().map(x=>`<label class="chk" style="flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-size:14.5px"><input type="checkbox" name="fstf" value="${esc(x.sk)}" ${x.sk===ME()?"checked":""} style="width:auto">${esc(x.nafn)}</label>`).join("")}</div>`:""}
    ${window.ORG?.pakkaval?"":`<div class="two"><label>Áætlaðir tímar<input id="f-aklst" inputmode="decimal" placeholder="t.d. 40"></label><label>Tilboð (kr.)<input id="f-tilbod" inputmode="numeric" placeholder="t.d. 450000"></label></div>`}
    <p class="hint">Fær verknúmerið <b class="nr">${nextProjNr()}</b>.</p>`;
  if(kind==="vsk") f=vskFormHTML("f",null);
  sheet.innerHTML=`<h3 id="sheet-h">Bæta við</h3><div class="seg"${window.FAB_ONE?" hidden":""}>${Object.entries(T).map(([k,v])=>`<button type="button" data-k="${k}" aria-pressed="${k===kind||(k==="tima"&&kind==="kostn")}">${v}</button>`).join("")}</div>
    <form id="addf" novalidate>${f}<div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="f-cancel">Hætta við</button><button class="btn primary" id="f-save">Vista</button></div></form>`;
  sheet.querySelectorAll(".seg button[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k; if(k==="xpontun"){FAB_EXT.pantanir(); return;} if(k==="xtilbod"){FAB_EXT.ltilbod(); return;} kind=k;drawForm();});
  sheet.querySelectorAll(".seg2 button").forEach(b=>b.onclick=()=>{kind=b.dataset.k2;drawForm();});
  document.getElementById("f-cancel").onclick=closeSheet;
  const ps=document.getElementById("f-proj");
  const syncSub=()=>{const p=verkefni().find(x=>x.id===ps?.value);
    const s=document.getElementById("f-sub"); if(s) s.innerHTML=`<option value="">Ekkert</option>`+(p?.undirverk||[]).filter(u=>u.stada!=="Done").map(u=>`<option value="${esc(u.id)}"${ctxProj()?.u?.id===u.id?" selected":""}>${esc(u.heiti)}</option>`).join("");
    const h=document.getElementById("f-nr"); if(h&&p) h.innerHTML=`Fær verknúmerið <b class="nr">${nextSubNr(p)}</b>.`;};
  if(ps&&(kind==="tima"||kind==="kostn")&&!ctxProj()){let last=null; try{last=JSON.parse(localStorage.getItem("aera-last")||"null");}catch(e){}
    const want=PREFILL?.pid||last?.pid; if(want&&[...ps.options].some(o=>o.value===want)) ps.value=want;}
  if(ps&&PREFILL?.pid&&[...ps.options].some(o=>o.value===PREFILL.pid)) ps.value=PREFILL.pid;
  if(ps){ps.onchange=syncSub;syncSub();}
  {const fs=document.getElementById("f-starf"); if(fs){let last=null; try{last=JSON.parse(localStorage.getItem("aera-last")||"null");}catch(e){} fs.value=last?.sk&&STARFS().some(x=>x.sk===last.sk)?last.sk:ME();}}
  if(kind==="tima"&&!ctxProj()?.u){let last=null; try{last=JSON.parse(localStorage.getItem("aera-last")||"null");}catch(e){} const ss=document.getElementById("f-sub"); if(last?.sid&&last.pid===ps?.value&&ss&&[...ss.options].some(o=>o.value===last.sid)) ss.value=last.sid;}
  const dc=sheet.querySelector(".daychips"); if(dc){const di=document.getElementById("f-date"); const mark=()=>dc.querySelectorAll("[data-day]").forEach(b=>{const x=new Date(today); x.setDate(x.getDate()+(+b.dataset.day)); b.setAttribute("aria-pressed",String(isoDay(x)===di.value));});
    dc.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{const x=new Date(today); x.setDate(x.getDate()+(+b.dataset.day)); di.value=isoDay(x); mark();}); di.onchange=mark;
    if(PREFILL?.date) di.value=PREFILL.date; mark();}
  if(PREFILL?.timer) document.getElementById("f-save").hidden=true;
  const tb=document.getElementById("f-timer"); if(tb) tb.onclick=async()=>{try{const pid=val("f-proj"), sid=val("f-sub"), desc=val("f-desc");
    try{localStorage.setItem("aera-last",JSON.stringify({pid,sid}));}catch(e){}
    await saveSnapshot(s=>{s.klukka={pid,sid:sid||null,desc:desc||"",sk:val("f-starf")||ME(),start:new Date().toISOString()};}); closeSheet(); toast("Klukkan er farin af stað");}catch(e){msg(esc(e?.message||"Villa"),"err");}};
  wireVskSelects(sheet);
  if(kind==="fund"){if(window.fbWire) fbWire("f"); const st=document.getElementById("f-time"), en=document.getElementById("f-end"); if(st&&en) st.addEventListener("blur",()=>{const t=normTime(st.value); if(t&&!en.value){const [h,m]=t.split(":").map(Number); en.value=pad((h+1)%24)+":"+pad(m);}});}
  if(PREFILL?.date&&kind!=="tima"){const t={fund:"f-date",verk:"f-ps",undir:"f-date"}[kind]; const el=t&&document.getElementById(t); if(el) el.value=PREFILL.date;
    const hint=document.createElement("p"); hint.className="hint"; hint.textContent={fund:"Dagsetning fundar sett á ",verk:"„Verk hefst“ sett á ",undir:"Skiladagur settur á ",tima:"Dagsetning sett á "}[kind]?.concat(fmtDate(PREFILL.date)+" úr dagatalinu.")||""; if(hint.textContent) document.getElementById("addf").prepend(hint);}
  enhanceForm();
  document.getElementById("addf").onsubmit=save;
}
/* ---------- Viðskiptavinir í formum ---------- */
const NEWV="__nyr__";
function ctxVsk(){if(!DETAIL||!DETAIL.startsWith("vsk:")) return null; return findVsk(DETAIL.slice(4));}
function vskSelect(pre,key,label,role,selId){
  const cs=vskList(), mine=cs, other=[];
  const o=c=>`<option value="${esc(c.id)}"${sameId(c.id,selId)?" selected":""}>${esc(c.name)}</option>`;
  return `<label>${label}<select id="${pre}-${key}" data-newfor="${pre}-${key}-new"><option value="">Enginn</option>${mine.map(o).join("")}${other.length?`<optgroup label="Aðrir">${other.map(o).join("")}</optgroup>`:""}<option value="${NEWV}">+ Nýr ${label.toLowerCase()}…</option></select></label>
  <div id="${pre}-${key}-new" class="card" style="display:none;padding:12px;background:var(--b0);border-color:var(--b1)"><div class="kind" style="margin-bottom:8px">Nýr ${label.toLowerCase()} – fer líka í Viðskiptavini</div>
    <div class="two"><label>Nafn (fyrirtæki eða einstaklingur)<input id="${pre}-${key}-nn" placeholder="T.d. Arion banki eða Jón Jónsson"></label><label>Kennitala<input id="${pre}-${key}-kt" inputmode="numeric" placeholder="000000-0000"></label></div>
    <div class="two"><label>Sími<input id="${pre}-${key}-simi" type="tel" inputmode="tel" autocomplete="off" placeholder="Valfrjálst"></label><label>Netfang<input id="${pre}-${key}-net" type="email" autocomplete="off" placeholder="Valfrjálst"></label></div>
    <p class="hint" style="margin:8px 0 0">Fleiri upplýsingar má bæta við á síðu viðskiptavinarins.</p></div>`;}
function dtPair(pre,key,label,iso){return `<div class="two"><label>${label}<input id="${pre}-${key}" type="date" value="${dOnly(iso)}"></label><label>Klukkan<input id="${pre}-${key}t" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${hhmm(iso)}"></label></div>`;}
// Einföld tímasetning (2.15.5, ORG.pakkaval): Byrjar (valfrjálst) → Skil / lýkur; klukka falin þar til beðið er um hana;
// Viðburður aðeins ef Búnaður og lager er virkt. Sömu reitir í gögnunum: timabilFra, skiladagur (og timabilTil = skil ef byrjar er valið).
// Þjónusta á verkefni (2.16.0): falin og valin sjálfkrafa ef aðeins ein þjónusta er til
function thjField(sel){const T=THJ(); if(window.ORG?.pakkaval&&window.ORG?.utlit!=="I") return ""; /* 2.18.7: engin þjónusta á verkefni í Dev – tegund (leiga/sala) flokkar */ if(T.length<=1) return T.length?`<input type="checkbox" name="thj" value="${esc(T[0])}" checked hidden>`:"";
  return `<div><div class="kind" style="margin-bottom:6px">${VFL()}</div><div class="chips">${T.map(t=>`<label><input type="checkbox" name="thj" value="${esc(t)}"${(sel||[]).includes(t)?" checked":""}>${esc(t)}</label>`).join("")}</div></div>`;}
function projDatesPv(pre,p){
  const hid=(k,v)=>`<input type="hidden" id="${pre}-${k}" value="${esc(v||"")}">`, tm=(k,lab,iso)=>`<label>${lab}<input id="${pre}-${k}" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" autocomplete="off" data-t24 value="${hhmm(iso)}"></label>`;
  const showT=!!(hhmm(p?.timabilFra)||hhmm(p?.skiladagur)), sepTil=!!(p?.timabilTil&&dOnly(p.timabilTil)!==dOnly(p.skiladagur)), ev=window.pakkiOn&&pakkiOn(window.PAKKAR?.bunadur?"bunadur":"leigasala")&&(ON("leiga")||ON("sala"));
  return `<div class="kind" style="margin-top:6px">Tímasetning</div>
    <div class="two"><label>Byrjar (valfrjálst)<input id="${pre}-ps" type="date" value="${dOnly(p?.timabilFra)}"></label><label>Skil / lýkur<input id="${pre}-date" type="date" value="${dOnly(p?.skiladagur)}"></label></div>
    <div class="two" id="${pre}-kl" ${showT?"":"hidden"}>${tm("pst","Byrjar kl.",p?.timabilFra)}${tm("datet","Skil kl.",p?.skiladagur)}</div>
    ${sepTil?`<div class="two"><label>Verki lýkur<input id="${pre}-pe" type="date" value="${dOnly(p.timabilTil)}"></label>${tm("pet","Klukkan",p.timabilTil)}</div>`:hid("pe","")+hid("pet","")}
    ${showT?"":`<button type="button" style="align-self:flex-start;margin:-4px 0 6px;padding:4px 0;border:0;background:none;font:inherit;font-size:13px;color:var(--muted);text-decoration:underline;cursor:pointer" onclick="document.getElementById('${pre}-kl').hidden=false;this.remove()">+ Bæta við klukkutíma</button>`}
    ${ev||p?.vidburdur?dtPair(pre,"event","Viðburður",p?.vidburdur):hid("event","")+hid("eventt","")}`;}
function projFields(pre,p){
  const cv=ctxVsk(), defClient=p?(projVsk(p)||projVk(p))?.id:(cv?cv.id:null);
  if(window.ORG?.pakkaval) return `${vskSelect(pre,"client","Viðskiptavinur","Viðskiptavinur",defClient)}${projDatesPv(pre,p)}`;
  return `${vskSelect(pre,"client","Viðskiptavinur","Viðskiptavinur",defClient)}
    <div class="kind" style="margin-top:6px">Tímasetningar · klukka er valfrjáls</div>
    ${dtPair(pre,"date","Skiladagur",p?.skiladagur)}
    ${dtPair(pre,"event","Viðburður",p?.vidburdur)}
    ${dtPair(pre,"ps","Verk hefst",p?.timabilFra)}
    ${dtPair(pre,"pe","Verki lýkur",p?.timabilTil)}`;}
function wireVskSelects(root){root.querySelectorAll("select[data-newfor]").forEach(s=>{const box=document.getElementById(s.dataset.newfor);
  const sync=()=>{const on=s.value===NEWV; box.style.display=on?"":"none"; if(on) box.querySelector("input")?.focus();}; s.addEventListener("change",sync); sync();});}
const ktOk=k=>!k||/^\d{6}-?\d{4}$/.test(k.trim());
const ktFmt=k=>{const d=String(k||"").replace(/\D/g,""); return d.length===10?d.slice(0,6)+"-"+d.slice(6):String(k||"").trim();};
// Athugar dagsetningar á eyðublaði (upphafsdagur ef lokadagur er valinn, lok ekki á undan upphafi)
function dateCheck(name,d,t,ed,et){
  if(!d){ if(ed) throw {code:"form",message:`Veldu upphafsdag fyrir „${name}“.`}; return; }
  const dt=!!(t||et), st=dt?d+"T"+(t||"00:00")+":00":d;
  if(ed){const e=dt?ed+"T"+(et||"23:59")+":00":ed; if(e<st) throw {code:"form",message:"Verki getur ekki lokið áður en það hefst."};}}
const isoOf=(d,t)=>d?(t?d+"T"+t+":00":d):null;
async function createVsk(name,kt,role,extra={}){
  const id=newId(); const c={id,name,hlutverk:[role],kennitala:kt?ktFmt(kt):"",...(extra.simi?{simi:extra.simi}:{}),...(extra.netfang?{netfang:extra.netfang}:{})};
  await saveSnapshot(s=>{(s.vidskiptavinir=s.vidskiptavinir||[]).push(c);}); return c;}
async function ensureRole(c,role){if(!c||(c.hlutverk||[]).includes(role)||isTmp(c.id)) return; const h=[...(c.hlutverk||[]),role];
  await saveSnapshot(s=>{const q=(s.vidskiptavinir||[]).find(x=>sameId(x.id,c.id)); if(q) q.hlutverk=h;});}
async function pickVsk(pre,key,role){const v=val(`${pre}-${key}`);
  if(v===NEWV){const n=val(`${pre}-${key}-nn`), kt=val(`${pre}-${key}-kt`); if(!n) throw {code:"form",message:`Skrifaðu nafn nýja ${role==="Verkkaupi"?"verkkaupans":"viðskiptavinarins"}.`};
    if(!ktOk(kt)) throw {code:"form",message:"Kennitala á að vera 10 tölustafir."};
    const dup=vskList().find(c=>c.name.toLowerCase()===n.toLowerCase()); if(dup){await ensureRole(dup,role); return dup;}
    const simi=val(`${pre}-${key}-simi`), netfang=val(`${pre}-${key}-net`);
    if(netfang&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(netfang)) throw {code:"form",message:"Netfang lítur ekki rétt út."};
    return await createVsk(n,kt,role,{simi,netfang});}
  const c=v?findVsk(v):null; if(c) await ensureRole(c,role); return c;}
function readProjDates(pre,p){
  const g0=k=>val(`${pre}-${k}`);
  // Einföld tímasetning: ef „Byrjar“ er valið og enginn sér lokadagur nær tímabilið að skilum
  const g=k=>(window.ORG?.pakkaval&&(k==="pe"||k==="pet")&&!g0("pe")&&g0("ps"))?g0(k==="pe"?"date":"datet"):g0(k);
  dateCheck("Tímabil verks",g("ps"),g("pst"),g("pe"),g("pet"));
  return {skiladagur:isoOf(g("date"),g("datet")),vidburdur:isoOf(g("event"),g("eventt")),timabilFra:isoOf(g("ps"),g("pst")),timabilTil:g("pe")?isoOf(g("pe"),g("pet")||((g("pst")||g("pet"))?"23:59":"")):null};}
function vskFormHTML(pre,c){c=c||{}; const r=c.hlutverk||(ctxRole()?[ctxRole()]:["Viðskiptavinur"]);
  const inp=(k,l,v,a="")=>`<label>${l}<input id="${pre}-${k}" value="${esc(v||"")}" ${a}></label>`;
  // 2.73.0: viðskiptavinur er fyrirtæki eða einstaklingur (c.teg) – einstaklingur hefur ekki VSK-númer né sér tengilið
  const ein=c.teg==="einstaklingur", tg=`document.getElementById('${pre}-teg')`;
  const sw=`(function(b){const w=b.closest('form,.sheet,#sheet')||document,t=b.dataset.t;${tg}.value=t;w.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-pressed',x===b));w.querySelectorAll('.vskfyr').forEach(x=>x.hidden=t==='einstaklingur');const l=document.querySelector('label[for=${pre}-name]')||document.getElementById('${pre}-name').closest('label');l.firstChild.textContent=t==='einstaklingur'?'Nafn ':'Nafn fyrirtækis ';document.getElementById('${pre}-name').placeholder=t==='einstaklingur'?'T.d. Jón Jónsson':'T.d. Arion banki';const gs=document.getElementById('${pre}-greidsla');if(gs&&!gs.dataset.touched)gs.value=t==='einstaklingur'?'stadgreitt':'reikningur';})(this)`;
  return `<input type="hidden" id="${pre}-teg" value="${ein?"einstaklingur":"fyrirtaeki"}"><div class="seg vskteg" id="${pre}-tegseg" role="group" aria-label="Tegund viðskiptavinar"><button type="button" data-t="fyrirtaeki" aria-pressed="${!ein}" onclick="${esc(sw)}">Fyrirtæki</button><button type="button" data-t="einstaklingur" aria-pressed="${ein}" onclick="${esc(sw)}">Einstaklingur</button></div>
    ${inp("name",ein?"Nafn ":"Nafn fyrirtækis ",c.name,`required placeholder="${ein?"T.d. Jón Jónsson":"T.d. Arion banki"}"`)}
    <label>Greiðsluháttur<select id="${pre}-greidsla" onchange="this.dataset.touched=1">${[["reikningur","Í reikning – má afhenda ógreitt"],["stadgreitt","Staðgreitt – greiða þarf fyrir afhendingu"]].map(([k,l])=>`<option value="${k}"${(c.greidsla||(ein?"stadgreitt":"reikningur"))===k?" selected":""}>${l}</option>`).join("")}</select></label>
    <div class="two">${inp("kt","Kennitala",c.kennitala,'inputmode="numeric" placeholder="000000-0000"')}<div class="vskfyr"${ein?" hidden":""}>${inp("vsknr","VSK-númer",c.vsknr,'inputmode="numeric"')}</div></div>
    ${inp("addr","Heimilisfang",c.heimilisfang,'autocomplete="street-address"')}
    <div class="two">${inp("pnr","Póstnúmer",c.postnumer,'inputmode="numeric"')}${inp("stadur","Staður",c.stadur)}</div>
    <div class="two">${inp("simi","Sími",c.simi,'type="tel"')}${inp("mail","Netfang",c.netfang,'type="email"')}</div>
    ${inp("web","Vefsíða",c.vefsida,'type="url" placeholder="https://…"')}
    <div class="vskfyr"${ein?" hidden":""}><div class="kind" style="margin-top:6px">Tengiliður</div>
    ${inp("tn","Nafn tengiliðs",c.tengilidur)}
    <div class="two">${inp("ts","Sími",c.simiT,'type="tel"')}${inp("tm","Netfang",c.netfangT,'type="email"')}</div></div>
    <label>Athugasemdir<textarea id="${pre}-note">${esc(c.athugasemdir||"")}</textarea></label>`;}
let _ctxRole=null; const ctxRole=()=>_ctxRole;
function readVskForm(pre,editing){
  const g=k=>val(`${pre}-${k}`), name=g("name"), teg=g("teg")==="einstaklingur"?"einstaklingur":"fyrirtaeki"; if(!name) throw {code:"form",message:teg==="einstaklingur"?"Skrifaðu nafn.":"Skrifaðu nafn fyrirtækisins."};
  const kt=g("kt"); if(!ktOk(kt)) throw {code:"form",message:"Kennitala á að vera 10 tölustafir."};
  if(!kt&&g("greidsla")!=="stadgreitt") throw {code:"form",message:"Kennitala er nauðsynleg fyrir viðskiptavin í reikningi – bókhaldskerfið (Payday/DK) parar reikninga á henni. Skráðu hana eða veldu Staðgreiðsla."}; // 2.90.0
  const mail=g("mail"), tm=g("tm"); const em=/^[^\s@]+@[^\s@]+\.[^\s@]+$/; if((mail&&!em.test(mail))||(tm&&!em.test(tm))) throw {code:"form",message:"Netfang er ekki á réttu formi."};
  let web=g("web"); if(web&&!/^https?:\/\//.test(web)) web="https://"+web;
  const roles=["Viðskiptavinur"]; // verkkaupi er ekki lengur notaður (frá 1.4.0)
  const ein=teg==="einstaklingur", c={name,teg,greidsla:g("greidsla")==="stadgreitt"?"stadgreitt":"reikningur",hlutverk:roles,kennitala:kt?ktFmt(kt):"",vsknr:ein?"":g("vsknr"),heimilisfang:g("addr"),postnumer:g("pnr"),stadur:g("stadur"),simi:g("simi"),netfang:mail,vefsida:web,tengilidur:ein?"":g("tn"),simiT:ein?"":g("ts"),netfangT:ein?"":tm,athugasemdir:g("note")};
  return {c};}
/* 24 tíma klukka: tímareitir eru textareitir sem taka t.d. 930, 9:30 eða 21 og skila „09:30“ / „21:00“ */
function normTime(v){v=String(v||"").trim().replace(/[.,h ]/g,":"); if(!v) return "";
  let h,m; if(v.includes(":")){[h,m]=v.split(":");} else if(/^\d{1,2}$/.test(v)){h=v;m="0";} else if(/^\d{3,4}$/.test(v)){h=v.slice(0,-2);m=v.slice(-2);} else return null;
  h=+h; m=+(m||0); if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59) return null; return pad(h)+":"+pad(m);}
const val=id=>{const el=document.getElementById(id); if(!el) return ""; if(el.hasAttribute("data-t24")){const t=normTime(el.value); if(t===null) throw {code:"form",message:`Tíminn „${el.value}“ er ekki gildur. Skrifaðu t.d. 09:30 eða 14:00.`}; return t;} return el.value?.trim()||"";};
document.addEventListener("input",e=>{const el=e.target; if(!el.matches?.("[data-t24]")) return; const c=el.value.replace(/[^\d:.]/g,""); if(c!==el.value) el.value=c;});
document.addEventListener("focusout",e=>{const el=e.target; if(!el.matches?.("[data-t24]")) return; const t=normTime(el.value); if(t) el.value=t;});
function msg(t,cls){const el=document.getElementById("f-msg"); if(el) el.innerHTML=t?`<div class="msg ${cls}">${t}</div>`:"";}
function errText(e){return "Vistun mistókst: "+(e?.message||e?.code||"óþekkt villa");}
const genId=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(16)+Math.random().toString(16).slice(2)).replace(/-/g,"");
// Í vistun keyrir breytingin fyrst á skjánum og svo aftur á nýjustu gögnum netþjóns – auðkenni sem verða til í henni eru endurnýtt svo þau haldist eins.
let ID_REC=null, ID_PLAY=null;
const newId=()=>{if(ID_PLAY&&ID_PLAY.length) return ID_PLAY.shift(); const x=genId(); if(ID_REC) ID_REC.push(x); return x;};
let saveErr=null;
// Fjarlægir „undefined“ úr hlutum (Firestore hafnar þeim) og breytir í null í listum.
function fsClean(v){if(Array.isArray(v)) return v.map(x=>x===undefined?null:fsClean(x));
  if(v&&typeof v==="object"&&Object.getPrototypeOf(v)===Object.prototype){const o={}; for(const k in v){if(v[k]!==undefined) o[k]=fsClean(v[k]);} return o;} return v;}
// Eigandi tíma/kostnaðar: starfsmaðurinn sem færslan er á (ef notandinn má skrá á aðra), annars notandinn sjálfur.
const skEmail=sk=>sk?(window.nuUsers?nuUsers():[]).find(u=>u.sk===sk)?.email||null:null;
const ownerOf=x=>(window.can&&can("fjarmal")?skEmail(x.starfsmadur||x.sk):null)||USER?.email||"";
async function saveSnapshot(mut){
  if(!DB) throw {message:"Ekki tengt gagnagrunni."};
  if(window.VIEWAS){toast("Skoðunarhamur – ekkert er vistað. Ýttu á Hætta efst til að vista aftur."); throw {code:"form",message:"Skoðunarhamur: vistun er óvirk."};}
  if(window.SPLIT) return saveSplit(mut);
  const prev=S, cur=structuredClone(S||{}); const ids=[]; ID_REC=ids; try{ mut(cur); } finally { ID_REC=null; } cur.uppfaert=new Date().toISOString();
  const clean=fsClean(cur); S=clean; render();
  // Firestore tekur ekki við „undefined“; hreinsað hér að ofan. Ef vistun mistekst samt er skjárinn færður til baka svo ekkert sýnist vistað sem er það ekki.
  const fail=e=>{saveErr=e; if(S===clean){S=prev; render();} toast("Vistun mistókst – breytingin fór ekki upp. ("+(e?.code||e?.message||"villa")+")");};
  const viaSet=()=>DB.set("app/state",clean).catch(fail);
  // Margir notendur: breytingin er keyrð aftur á nýjustu útgáfu gagnanna á netþjóni (færsla/transaction), svo breytingar annarra glatist ekki.
  // Án nets er vistað beint eins og áður og samstillt þegar netið kemur.
  if(DB.tx&&navigator.onLine!==false){
    try{ DB.tx("app/state",fresh=>{const c=structuredClone(fresh||{}); ID_PLAY=ids.slice(); try{ mut(c); } finally { ID_PLAY=null; } c.uppfaert=new Date().toISOString(); return fsClean(c);})
      .catch(e=>{ if(["unavailable","deadline-exceeded"].includes(e?.code)||navigator.onLine===false) viaSet(); else fail(e); }); }
    catch(e){ fail(e); throw e; }
  } else { try{ viaSet(); }catch(e){ fail(e); throw e; } }
}
// Vistun í söfn (frá 1.3.0): aðeins færslur sem breyttust eru skrifaðar, hver í sitt skjal.
// Afgangurinn (stillingar, samtölur …) fer í app/state með færslu (transaction) eins og áður.
function saveSplit(mut){
  const prev=S, cur=structuredClone(S||{}); const ids=[]; ID_REC=ids; try{ mut(cur); } finally { ID_REC=null; }
  const skv=skorunVillu(prev,cur); if(skv){toast(skv); throw {code:"form",message:skv};}
  const me=USER?.email||""; GOGN.stamp(prev,cur,me,ownerOf);
  const clean=fsClean(cur); S=clean; render();
  const fail=e=>{saveErr=e; if(S===clean){S=prev; render();} toast("Vistun mistókst – breytingin fór ekki upp. ("+(e?.code||e?.message||"villa")+")");};
  const ops=GOGN.ops(prev,clean,me);
  if(ops.length) DB.commit(ops).catch(fail);
  if(!GOGN.restChanged(prev,clean)) return;
  const restOf=c=>{const r=fsClean(GOGN.rest(c)); r.skipting=2; r.uppfaert=new Date().toISOString(); return r;};
  const viaSet=()=>DB.set("app/state",restOf(clean)).catch(fail);
  if(DB.tx&&navigator.onLine!==false){
    DB.tx("app/state",fresh=>{const c=structuredClone(clean), r=GOGN.rest(fresh||{}); for(const k in r) c[k]=k==="timar"?{...r.timar,faerslur:c.timar?.faerslur||[]}:r[k]; ID_PLAY=ids.slice();
      try{ mut(c); }catch(e){ return restOf({...GOGN.rest(fresh||{}),...GOGN.rest(clean)}); } finally { ID_PLAY=null; } return restOf(c);})
      .catch(e=>{ if(["unavailable","deadline-exceeded"].includes(e?.code)||navigator.onLine===false) viaSet(); else fail(e); });
  } else viaSet();
}
const sFindP=(s,id)=>(s.verkefni||[]).find(v=>v.id===id);
const sFindU=(s,id)=>{for(const p of s.verkefni||[]){const u=(p.undirverk||[]).find(u=>u.id===id); if(u) return [p,u];} return [null,null];};
const sTimes=s=>{s.timar=s.timar||{}; return s.timar.faerslur||(s.timar.nyjast=s.timar.nyjast||[]);};
const urlOk=u=>!u||/^https?:\/\//.test(u);
function hoursBetween(fr,to){const [h1,m1]=fr.split(":").map(Number),[h2,m2]=to.split(":").map(Number); let mins=(h2*60+m2)-(h1*60+m1); if(mins<=0) mins+=1440; return Math.round(mins/60*100)/100;}
const toMin=t=>{const [h,m]=String(t).split(":").map(Number); return h*60+m;};
/* 2.101.1: tvær tímaskráningar sama starfsmanns (eða vettvangsnotanda) mega aldrei skarast. Athugað við hverja vistun (saveSplit):
   nýjar eða breyttar færslur bornar saman við aðrar færslur sama aðila sama dag. */
function skorunVillu(prev,cur){const old=new Map(((prev?.timar?.faerslur)||[]).map(e=>[e.id,JSON.stringify(e)])), L=(cur?.timar?.faerslur)||[];
  const mn=e=>{const a=toMin(e.fra), b0=toMin(e.til); return [a,b0<=a?b0+1440:b0];};
  for(const x of L){ if(!x||x.live||!x.fra||!x.til||old.get(x.id)===JSON.stringify(x)) continue; const [a,b]=mn(x), who=x.starfsmadur||ME(), dag=String(x.date||"").slice(0,10);
    const y=L.find(e=>e&&e!==x&&e.id!==x.id&&!e.live&&e.fra&&e.til&&String(e.date||"").slice(0,10)===dag&&(e.starfsmadur||ME())===who&&(()=>{const [c,dd]=mn(e); return a<dd&&c<b;})());
    if(y) return `Tíminn ${x.fra}–${x.til} ${dIS(dag)} skarast við „${cleanLys(y.lysing)}“ kl. ${y.fra}–${y.til}${who!==ME()?" ("+starfName(who)+")":""}. Tvær tímaskráningar mega ekki skarast – breyttu tímanum.`; }
  return null;}
function overlaps(dt,fr,to,sk,exceptId){const a=toMin(fr), b0=toMin(to), b=b0<=a?b0+1440:b0;
  return faerslur().find(e=>!e.live&&e.id!==exceptId&&e.fra&&e.til&&String(e.date||"").slice(0,10)===dt&&(e.starfsmadur||ME())===sk&&(()=>{const c=toMin(e.fra), d0=toMin(e.til), dd=d0<=c?d0+1440:d0; return a<dd&&c<b;})())||null;}
function parseKlst(v){v=String(v||"").trim().replace(",","."); if(!v) return 0; const m=v.match(/^(\d+):(\d{1,2})$/); const n=m?(+m[1])+(+m[2])/60:+v;
  if(!isFinite(n)||n<=0||n>24) throw {code:"form",message:`„${v}“ er ekki gildur fjöldi klukkutíma.`}; return Math.round(n*100)/100;}
const lysFmt=(dt,desc,t)=>{const x=d(dt); return `${pad(x.getDate())}.${pad(x.getMonth()+1)} – ${desc} (${String(t).replace(".",",")} klst.)`;};
const endDayOf=(dt,fr,to)=>to<=fr?isoDay(new Date(d(dt).getTime()+864e5)):dt;
async function save(ev){
  ev.preventDefault(); const btn=document.getElementById("f-save"); msg("");
  const busy=()=>{btn.disabled=true; btn.textContent="Vista…";};
  try{
    if(kind==="tima"){
      const pid=val("f-proj"),sid=val("f-sub"),desc=val("f-desc"),dt=val("f-date"),fr=val("f-from"),to=val("f-to"),kl=parseKlst(val("f-klst"));
      if(!desc||!dt) return msg("Fylltu út lýsingu og dag.","err");
      if(!(fr&&to)) return msg("Skráðu tímabil: frá og til (hh:mm).","err");
      const t=fr&&to?hoursBetween(fr,to):kl, lys=lysFmt(dt,desc,t), sk=val("f-starf")||ME();
      if(fr&&to){const ov=overlaps(dt,fr,to,sk,null); if(ov) return msg(`Skarast við „${esc(cleanLys(ov.lysing))}“ kl. ${ov.fra}–${ov.til}${sk!==ME()?" ("+starfName(sk)+")":""}. Tvær tímaskráningar mega ekki skarast.`,"err");}
      busy(); try{localStorage.setItem("aera-last",JSON.stringify({pid,sid,sk}));}catch(e){}
      const id=newId();
      await saveSnapshot(s=>{const p=sFindP(s,pid), u=sid?sFindU(s,sid)[1]:null; if(p) p.timar=(p.timar||0)+t; if(u) u.timar=(u.timar||0)+t;
        s.timar=s.timar||{}; s.timar.samtals=(s.timar.samtals||0)+t; if(!s.timar.timabil||timabilOf(dt)===s.timar.timabil) s.timar.timabilSamtals=(s.timar.timabilSamtals||0)+t;
        const L=sTimes(s); L.unshift({id,date:dt,lysing:lys,nr:u?.nr||p?.nr,verkefniId:pid,undirverkId:sid||null,fra:fr&&to?fr:null,til:fr&&to?to:null,timar:t,starfsmadur:sk,timabil:timabilOf(dt),taxti:val("f-taxti")||null});
        L.sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||"")))); s.timar.nyjast=L.slice(0,10);});
      toast(`Skráð: ${hrs(t)}`);
    }
    if(kind==="kostn"){
      const pid=val("f-proj"),sid=val("f-sub"),desc=val("f-desc"),dt=val("f-date"),amt=parseKr(val("f-amt")),sk=val("f-starf")||ME(), file=document.getElementById("f-file")?.files?.[0];
      if(!desc||!dt) return msg("Fylltu út lýsingu og dag.","err");
      if(!amt) return msg("Skráðu upphæð í krónum, t.d. 12500.","err");
      if(file&&file.size>25*1024*1024) return msg("Kvittunin er of stór (hámark 25 MB).","err");
      busy(); try{localStorage.setItem("aera-last",JSON.stringify({pid,sid,sk}));}catch(e){}
      const id=newId(); let kv=null;
      if(file){btn.textContent="Sendi kvittun…"; try{kv=await msKvittun(file,findProj(pid),dt,desc);}catch(e){toast("Kvittun vistaðist ekki: "+(e?.message||"villa"));}}
      await saveSnapshot(s=>{(s.kostnadur=s.kostnadur||[]).push({id,date:dt,verkefniId:pid,undirverkId:sid||null,lysing:desc,upphaed:amt,starfsmadur:sk,kvittun:kv?.url||null,kvittunId:kv?.id||null,stofnad:new Date().toISOString()});});
      toast(`Skráð: ${kr(amt)}`);
    }
    if(kind==="fund"){
      const name=val("f-name"),dt=val("f-date"),tm=val("f-time"),place=val("f-place"),link=val("f-link"),fg=val("f-fg"),pid=val("f-proj");
      if(!name||!dt||!tm) return msg("Fylltu út heiti, dag og hvenær fundurinn byrjar.","err");
      let te=val("f-end"); if(!te){const [h,m]=tm.split(":").map(Number); te=pad((h+1)%24)+":"+pad(m);} if(te<=tm) return msg("Fundurinn þarf að enda eftir að hann byrjar.","err");
      const att=window.fbRead?fbRead("f"):[], wantSend=att.length&&window.fbWantSend&&fbWantSend("f"), wantTeams=window.fbWantTeams&&fbWantTeams("f");
      if(!urlOk(link)||!urlOk(fg)) return msg("Slóðir þurfa að byrja á https://","err");
      if(window.fbConflicts){ // árekstrar (2.81.0): er einhver boðaður þegar bókaður?
        const rp0=val("f-rep"), rn0=rp0?Math.max(1,Math.min(52,parseInt(val("f-repn"))||1)):1;
        const slots=[...Array(rn0)].map((_,k)=>{const x=d(dt); if(rp0==="m") x.setMonth(x.getMonth()+k); else if(rp0) x.setDate(x.getDate()+k*(+rp0)); const ds=isoDay(x); return {s:ds+"T"+tm+":00",e:ds+"T"+te+":00"};});
        const c=await fbConflicts({slots,att}); if(c&&c.length){const sig=c.join("|"); if(window.__fbOvr!==sig){window.__fbOvr=sig; return msg(fbConflictMsg(c),"err");}}}
      busy();
      const id=newId(), p=findProj(pid), stofnandi=window.fbMe?fbMe()||null:null;
      const rp=val("f-rep"), rn=rp?Math.max(1,Math.min(52,parseInt(val("f-repn"))||1)):1, seria=rp?newId():null;
      const dates=[...Array(rn)].map((_,k)=>{const x=d(dt); if(rp==="m") x.setMonth(x.getMonth()+k); else if(rp) x.setDate(x.getDate()+k*(+rp)); return isoDay(x);});
      await saveSnapshot(s=>{dates.forEach((ds,k)=>(s.fundir=s.fundir||[]).push({id:k?newId():id,name,date:ds+"T"+tm+":00",dateEnd:ds+"T"+te+":00",stadsetning:place||null,fundarhlekkur:link||null,fundargerd:k?null:(fg||null),projectId:pid||null,verknr:p?.nafn||null,mappa:p?.mappa||null,attendees:att,seria,stofnandi}));});
      toast(rn>1?`${rn} fundir vistaðir`:"Fundur vistaður");
      if(wantSend&&window.fbSend) fbSend(id,{teams:wantTeams,ser:rn>1?{n:rn,rp}:null});
      if(!fg&&window.MS&&MS.on()&&window.msFundargerd) msFundargerd(id);
    }
    if(kind==="undir"){
      const pid=val("f-proj"),name=val("f-name"),dt=val("f-date"),st=val("f-status"),note=val("f-note"),mp=val("f-mappa"); const p=findProj(pid);
      if(!p||!name) return msg("Veldu verkefni og skrifaðu heiti.","err"); if(!urlOk(mp)) return msg("Sérmappa þarf að vera slóð sem byrjar á https://","err");
      const nr=nextSubNr(p), heiti=nr+" "+name; busy();
      const id=newId();
      await saveSnapshot(s=>{const q=sFindP(s,pid); if(q)(q.undirverk=q.undirverk||[]).push({id,nr,heiti,stada:st,skiladagur:dt||null,timar:0,serMappa:mp||null,mappa:mp||q.mappa,lysing:note||null});});
      toast(`${nr} vistað`);
    }
    if(kind==="skjal"){
      const name=val("f-name"),tp=val("f-type"),st=val("f-status")||"Not started",pid=val("f-proj"),note=val("f-note");
      if(!name) return msg("Skrifaðu heiti skjalsins.","err"); busy();
      const id=newId(), now=new Date().toISOString();
      await saveSnapshot(s=>{(s.skjol=s.skjol||[]).push({id,name,stada:st,tegund:tp||null,projectId:pid||null,stofnad:now,breytt:now,lysing:note||null});});
      toast("Skjal vistað");
    }
    if(kind==="verk"){
      const name=val("f-name"); if(!name) return msg("Skrifaðu heiti verkefnisins.","err");
      const snap=readProjDates("f",null);
      const nr=nextProjNr(), nafn=nr+" "+name, st=val("f-status");
      const thj=[...document.querySelectorAll('input[name="thj"]:checked')].map(i=>i.value); busy();
      const cl=await pickVsk("f","client","Viðskiptavinur"), vk=null;
      const id=newId();
      const dl=window.deildVal?deildVal("f-deild"):undefined, extra={vskId:cl?.id||null,vkId:vk?.id||null,...snap,...(dl!==undefined?{deild:dl}:{})};
      const snidOn=document.getElementById("f-snid")?.checked, subN=snidOn?[...new Set(thj.flatMap(t=>SNID()[t]||[]))]:[];
      const undir=subN.map((n,k)=>{const snr=nr+"-"+pad(k+1); return {id:newId(),nr:snr,heiti:snr+" "+n,stada:"Not started",skiladagur:null,timar:0,serMappa:null,mappa:null,lysing:null};});
      const aklst=parseFloat(String(val("f-aklst")).replace(",","."))||null, tilbod=parseInt(String(val("f-tilbod")).replace(/\D/g,""))||null;
      await saveSnapshot(s=>{s.verkefni.push({id,nr,stutt:name,nafn,stada:st,vidskiptavinur:cl?.name||null,verkkaupi:vk?.name||null,thjonusta:thj,timar:0,yfirlit:null,mappa:null,undirverk:undir,starfsmenn:(()=>{const v=[...document.querySelectorAll('input[name="fstf"]:checked')].map(i=>i.value); return v.length?v:[ME()];})(),aklst,tilbod,...extra}); if(!noFolder({thjonusta:thj})) (s.odBidrod=s.odBidrod||[]).push({verkefniId:id,nafn,stofnad:new Date().toISOString()});});
      toast(`${nafn} vistað`);
    }
    if(kind==="vsk"){
      const {c}=readVskForm("f",false);
      const dup=vskList().find(x=>x.name.toLowerCase()===c.name.toLowerCase()); if(dup) return msg(`${esc(dup.name)} er þegar á listanum.`,"err");
      busy(); const nc={id:newId(),...c};
      await saveSnapshot(s=>{(s.vidskiptavinir=s.vidskiptavinir||[]).push(nc);});
      toast(`${c.name} vistað í Viðskiptavinum`);
    }
    closeSheet();
  }catch(e){btn.disabled=false; btn.textContent="Vista"; msg(esc(e?.code==="form"?e.message:errText(e)),"err");}
}

