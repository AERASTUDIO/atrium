/* Síður og aðgerðir: yfirlitssíður, undirsíður verkefna/undirverka, doAct, bendingar, .ics
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* ---------- Yfirlitssíður ---------- */
// Hæð hauss → CSS-breytan --hdr svo „Til baka“-röðin festist beint undir honum; lína birtist þegar röðin er föst
(()=>{const h=document.querySelector("header"); if(!h) return; const set=()=>document.documentElement.style.setProperty("--hdr",h.getBoundingClientRect().height+"px");
  if(window.ResizeObserver) new ResizeObserver(set).observe(h); set();
  addEventListener("scroll",()=>{const b=document.querySelector(".backrow"); if(b) document.documentElement.style.setProperty("--bk",b.offsetHeight+"px"); if(b) b.classList.toggle("stuck",b.getBoundingClientRect().top<=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hdr"))+1&&scrollY>20);},{passive:true});})();
const backBar=()=>`<div class="backrow"><button class="back" onclick="goBack()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>Til baka</button><button type="button" class="newwin" onclick="openNewWin()" title="Opna í nýjum glugga – vinna í appinu á meðan"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="7.5" width="13" height="13" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v10"/></svg>Nýr gluggi</button></div>`;
const projLink=p=>p?`<a class="plink" ${tapAttr("verk",p.id)}><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt)}</a>`:"";
const timeList=(match,title="Tímaskráning")=>{const es=faerslur().filter(match).sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||""))));
  const tot=es.reduce((s,e)=>s+(+e.timar||0),0);
  return es.length?`<div class="viewtitle">${title} · ${hrs(tot)}</div><div class="list">${es.map(timeCard).join("")}</div>`:"";};
const meetList=(fs,title)=>fs.length?`<div class="viewtitle">${title}</div><div class="list">${fs.map(f=>`<div class="card tap" ${tapAttr("fund",f.id)}><div class="row">${dateBlock(f.date)}<div class="grow"><div class="t">${esc(f.name)}</div><div class="meta">${hhmm(f.date)?`<span>kl. ${hhmm(f.date)}</span>`:""}${f.stadsetning?`<span>${esc(f.stadsetning)}</span>`:""}${daysTo(f.date)>=0?relPill(daysTo(f.date)):""}${f.fundargerd?`<span>Fundargerð</span>`:""}</div></div>${CHEV}</div></div>`).join("")}</div>`:"";
const statRow=(type,id,opts,cur,labels)=>MCP&&!isTmp(id)?`<div class="stat-row">${opts.map(s=>`<button type="button" class="chipbtn" data-act="status:${type}:${esc(id)}:${esc(s)}" aria-pressed="${s===cur}">${esc((labels||{})[s]||s)}</button>`).join("")}</div>`:"";
const addRow=(btns)=>MCP?`<div class="links">${btns.map(([k,l])=>`<button type="button" class="btn" data-act="add:${k}">${l}</button>`).join("")}</div>`:"";
/* ---------- Undirsíður (flipar) á verkefni og undirverki ---------- */
let DTAB="yfirlit";
const dtabs=(tabs)=>`<nav class="dtabs" role="tablist" aria-label="Síður">${tabs.map(([k,l,c])=>`<button type="button" role="tab" aria-selected="${k===DTAB}" data-act="dtab:${k}">${l}${c?` <span class="dc">${c}</span>`:""}</button>`).join("")}</nav>`;
const fixTab=tabs=>{if(!tabs.some(t=>t[0]===DTAB)) DTAB=tabs[0][0];};
const subRowL=u=>lrow("sub:"+u.id,{title:`<span class="nr">${esc(u.nr)}</span>&nbsp; ${esc(subName(u))}`,sub:esc([STL[u.stada]||u.stada,u.timar?hrs(u.timar):""].filter(Boolean).join(" · ")),right:u.stada!=="Done"&&u.skiladagur?relPill(daysTo(u.skiladagur)):""});
const meetRowL=f=>{const x=d(f.date); return lrow("fund:"+f.id,{lead:x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–",title:esc(f.name),sub:esc([hhmm(f.date)?"kl. "+hhmm(f.date):"",f.stadsetning,f.fundargerd?"Fundargerð":""].filter(Boolean).join(" · ")),right:daysTo(f.date)>=0&&daysTo(f.date)<=14?relPill(daysTo(f.date)):""});};
const kostnRowL=k=>{const x=d(k.date), p=findProj(k.verkefniId); return lrow("kostn:"+k.id,{lead:x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–",title:esc(k.lysing||"Kostnaður"),sub:esc([p?.nr,k.kvittun?"🧾 Kvittun":"",window.rkTag?rkTag(k):""].filter(Boolean).join(" · ")),right:`<span class="lc">${esc(kr(k.upphaed))}</span>`});};
function kostnSection(ks,title){return `<div class="viewtitle" style="display:flex;align-items:center;gap:8px">${title||"Útlagður kostnaður"}${ks.length?" · "+esc(kr(sumK(ks))):""}${MCP?`<a class="plink" data-act="add:kostn" style="margin-left:auto">+ Kostnaður</a>`:""}</div>${ks.length?llist(ks.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(kostnRowL)):`<div class="empty">Enginn útlagður kostnaður skráður.</div>`}`;}
const timeRowL=e=>{const x=d(e.date); if(e.live) return `<div class="lrow tap" data-act="kedit" role="button" tabindex="0"><div class="ll">${x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–"}</div><div class="lm"><div class="lt">${esc(cleanLys(e.lysing))} <span class="tag">klukka í gangi</span></div><div class="ls">${esc(e.fra+"–nú"+(e.verkefniId?" · "+e.nr:" · Almennt"))}</div></div><div class="lr"><span class="lc">${esc(hrs(e.timar))}</span></div></div>`; return lrow("time:"+e.id,{lead:x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–",title:esc(cleanLys(e.lysing)),sub:esc([e.fra?e.fra+(e.til?"–"+e.til:""):"",e.verkefniId?e.nr:"Almennt",entrySvc(e),window.rkTag?rkTag(e):""].filter(Boolean).join(" · ")),right:`<span class="lc">${esc(hrs(e.timar))}</span>`});};
const sumT=es=>es.reduce((a,e)=>a+(+e.timar||0),0);
function timesPage(es,startAct){
  const pid=DETAIL&&DETAIL.startsWith("verk:")?DETAIL.slice(5):null, sidR=DETAIL&&DETAIL.startsWith("sub:")?DETAIL.slice(4):null;
  const groups={}; es.forEach(e=>{const k=e.timabil||timabilOf(e.date); (groups[k]=groups[k]||[]).push(e);});
  return `<div class="kpis"><div class="card"><b>${num(sumT(es))}</b><span>klst. alls</span></div><div class="card"><b>${num(sumT(es.filter(e=>(e.timabil||timabilOf(e.date))===curPeriod())))}</b><span>klst. á tímabili</span></div></div>
  ${MCP?`<div class="links">${klukka()?"":`<button type="button" class="btn primary" data-act="${startAct}">▶ Byrja klukku</button>`}<button type="button" class="btn" data-act="add:tima">+ Tími</button><button type="button" class="btn" data-act="add:kostn">+ Kostnaður</button>${pid&&(es.length||kostn().some(k=>k.verkefniId===pid))?`<button type="button" class="btn" data-act="prep:${esc(pid)}">Tímaskýrsla</button>`:""}${sidR&&es.length?`<button type="button" class="btn" data-act="srep:${esc(sidR)}">Tímaskýrsla undirverks</button>`:""}</div>`:""}
  ${pid&&window.rkProjSection&&ON("reikningar")?rkProjSection(pid):""}
  ${es.length?Object.entries(groups).map(([k,g])=>`<div class="viewtitle">${esc(k)} · ${hrs(sumT(g))}</div>${llist(g.map(timeRowL))}`).join(""):`<div class="empty" style="margin-top:16px">Engar tímaskráningar ennþá.</div>`}
  ${(()=>{const ks=kostn().filter(k=>DETAIL?.startsWith("verk:")?k.verkefniId===DETAIL.slice(5):DETAIL?.startsWith("sub:")?k.undirverkId===DETAIL.slice(4):false); return kostnSection(ks);})()}`;
}
function settingsCard(rows,btns){return `<div class="card" style="margin-top:16px"><dl class="kv" style="margin:0">${kvRows(rows)}</dl></div>${btns}`;}
function dVerk(p){
  const subs=p.undirverk||[], openS=subs.filter(u=>u.stada!=="Done"), doneS=subs.filter(u=>u.stada==="Done");
  const fs=(S?.fundir||[]).filter(f=>fundProj(f)?.id===p.id).sort((a,b)=>d(a.date)-d(b.date));
  const upF=fs.filter(f=>daysTo(f.date)>=0), pastF=fs.filter(f=>daysTo(f.date)<0).reverse();
  const tl=faerslur().filter(e=>e.verkefniId===p.id||nrMatch(e.nr,p.nr)).sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||""))));
  const pending=(S?.odBidrod||[]).some(b=>b.verkefniId===p.id), fold=projFolder(p);
  const nFiles=fold?(fold.atridi||[]).filter(x=>x.s>0).length:0;
  const tabs=[["yfirlit","Yfirlit"],["undir","Undirverk",openS.length||""],["fundir","Fundir",upF.length||""],["skrar","Skrár",nFiles||""],["timar","Tímar",tl.length?num(sumT(tl)):""],["stillingar","Stillingar"]]
    .filter(t=>({undir:"undirverk",fundir:"fundir",timar:"timar"})[t[0]]?ON(({undir:"undirverk",fundir:"fundir",timar:"timar"})[t[0]]):t[0]!=="skrar"||ON("skjol")||ON("onedrive"));
  fixTab(tabs);
  const head=backBar()+`<div class="kicker"><span class="nr">${esc(p.nr)}</span>${statusPill(p.stada)}${p.skiladagur&&!isDone(p)?relPill(daysTo(p.skiladagur)):""}${svcTags(p)}${taxtiTxt(p)?`<span class="pill ptaxti" title="Þjónusta og tímagjald úr verðskrá">${esc(taxtiTxt(p))}</span>`:""}</div>
  <h2 class="big" style="margin-top:6px">${esc(p.stutt||p.nafn)}</h2>
  <p class="sub" style="margin-bottom:0">${projVsk(p)?vskLink(projVsk(p)):projVk(p)?vskLink(projVk(p)):esc(p.vidskiptavinur||p.verkkaupi||"")||"Verkefni"}</p>`+dtabs(tabs);
  let body="";
  if(DTAB==="yfirlit"){
    const soon=[...openS.filter(u=>u.skiladagur).map(u=>({w:u.skiladagur,h:subRowL(u)})),...upF.map(f=>({w:f.date,h:meetRowL(f)}))].sort((a,b)=>String(a.w).localeCompare(String(b.w))).slice(0,5);
    body=`${klukkaBanner(p)}
    ${MCP?`<div class="viewtitle" style="margin-top:14px">Staða verkefnis</div><div class="stat-row pstada" role="group" aria-label="Staða verkefnis">${STODUR().map(x=>`<button type="button" class="chipbtn" data-act="status:verk:${esc(p.id)}:${esc(x.n)}" aria-pressed="${x.n===p.stada}">${esc(x.n)}</button>`).join("")}</div>`:""}
    <div class="kpis" style="margin-top:16px"><div class="card"><b>${num(Math.round(((+p.timar||0)+liveProjH(p.id))*10)/10)}</b><span>klst. skráðar${liveProjH(p.id)?" · klukka í gangi":""}</span></div><div class="card"><b>${openS.length}</b><span>opin undirverk</span></div>${can("fjarmal")&&window.rkUnbilled&&window.rateOf?(()=>{const v=window.rkUnbilledKr?rkUnbilledKr(p.id):0; return v?`<div class="card tap" data-act="tab:trk"><b>${esc(kr(v))}</b><span>óreikningsfært · ${esc(num(rateOf(p)))} kr./klst.</span></div>`:"";})():""}</div>
    ${MCP?`<div class="links">${ON("timar")?`${klukka()?"":`<button type="button" class="btn primary" data-act="kstart:${esc(p.id)}">▶ Byrja klukku</button>`}<button type="button" class="btn" data-act="add:tima">+ Tími</button>`:""}${ON("undirverk")?`<button type="button" class="btn" data-act="add:undir">+ Undirverk</button>`:""}${ON("fundir")?`<button type="button" class="btn" data-act="add:fund">+ Fundur</button>`:""}</div>`:""}
    <div class="viewtitle" style="display:flex;align-items:center;gap:8px">Starfsfólk á verkefni · ${projStaff(p).length}${MCP?`<a class="plink" data-act="pstaff:${esc(p.id)}" style="margin-left:auto">+ Skrá starfsmann</a>`:""}</div>
    <div class="staffrow">${projStaff(p).map(sk=>`<span class="staff">${staffAv(sk)}<span>${esc(starfName(sk))}${sk===ME()?" (þú)":""}</span></span>`).join("")}</div>
    ${(()=>{const b=budgetOf(p); return b?`<div class="budget"><div class="bt"><span>Áætlun</span><b>${num(Math.round(((+p.timar||0)+liveProjH(p.id))*10)/10)} af ${num(b.a)} klst. · ${Math.round(b.pct*100)}%</b></div><div class="pbar ${b.cls}"><i style="width:${Math.min(100,Math.round(b.pct*100))}%"></i></div>${b.cls?`<p class="hint" style="margin:8px 0 0">${b.cls==="over"?"Komið fram yfir áætlaða tíma.":"Yfir 80% af áætluðum tímum notað."}</p>`:""}${p.tilbod?`<p class="hint" style="margin:6px 0 0">Tilboð: ${esc(Number(p.tilbod).toLocaleString("is-IS"))} kr.</p>`:""}</div>`:"";})()}
    ${p.yfirlit||p.naest||p.athuga?`<div class="viewtitle">Staðan</div><div class="card" style="font-size:14.5px">${esc(p.yfirlit||"")}${p.naest?`<div style="margin-top:8px"><b>Næst:</b> ${esc(p.naest)}</div>`:""}${p.athuga?`<div style="margin-top:8px"><b>Athuga:</b> ${esc(p.athuga)}</div>`:""}</div>`:""}
    ${soon.length?`<div class="viewtitle">Framundan í verkefninu</div>${llist(soon.map(x=>x.h))}`:""}
    ${textCard("Lýsing",p.lysing)}
    ${window.poProjSection?poProjSection(p):""}
    <div class="viewtitle">Athugasemdir</div>
    ${MCP?`<div class="cmbox"><textarea id="cm-new" placeholder="Skrifaðu athugasemd…"></textarea><button type="button" class="btn primary" data-act="cmadd:${esc(p.id)}" style="align-self:flex-end">Vista athugasemd</button></div>`:""}
    ${(p.athugasemdir||[]).slice().sort((a,b)=>String(b.d).localeCompare(String(a.d))).map(c=>`<div class="cm"><div class="cmh"><span>${esc(starfName(c.sk))} · ${esc(fmtDate(c.d))}${hhmm(c.d)?" kl. "+hhmm(c.d):""}</span>${MCP?`<button type="button" class="x" data-act="cmdel:${esc(p.id)}:${esc(c.id)}" aria-label="Eyða athugasemd">✕</button>`:""}</div><div class="cmt">${esc(c.t)}</div></div>`).join("")}`;
  }
  if(DTAB==="undir") body=`${MCP?`<div class="links"><button type="button" class="btn primary" data-act="add:undir">+ Undirverk</button></div>`:""}
    ${openS.length?`<div class="viewtitle">Opin · ${openS.length}</div>${llist(openS.map(subRowL))}`:""}${doneS.length?`<div class="viewtitle">Lokið · ${doneS.length}</div>${llist(doneS.map(subRowL))}`:""}
    ${subs.length?"":`<div class="empty" style="margin-top:16px">Engin undirverk.</div>`}`;
  if(DTAB==="fundir") body=`${MCP?`<div class="links"><button type="button" class="btn primary" data-act="add:fund">+ Fundur</button></div>`:""}
    ${upF.length?`<div class="viewtitle">Framundan · ${upF.length}</div>${llist(upF.map(meetRowL))}`:""}${pastF.length?`<div class="viewtitle">Liðnir · ${pastF.length}</div>${llist(pastF.map(meetRowL))}`:""}
    ${fs.length?"":`<div class="empty" style="margin-top:16px">Engir fundir.</div>`}`;
  if(DTAB==="skrar") body=(window.skDocsFor?skDocsFor(p.id):"")+(pending&&!fold&&!(window.MS&&MS.on())?`<div class="empty" style="margin-top:16px">Mappa í OneDrive bíður stofnunar. Hún stofnast sjálfkrafa þegar appið er tengt Microsoft.${window.msMissing?msMissing():""}</div>`:skrarHTML(p));
  if(DTAB==="timar") body=timesPage(tl,"kstart:"+esc(p.id));
  if(DTAB==="stillingar") body=`<div class="viewtitle">Staða</div>${statRow("verk",p.id,STODUR().map(x=>x.n),p.stada)}
    <div class="viewtitle" style="margin-top:6px">Upplýsingar</div>${settingsCard([
      ["Verknúmer",`<span class="nr">${esc(p.nr)}</span>`],["Heiti",esc(p.stutt||"")],["Viðskiptavinur",projVsk(p)?vskLink(projVsk(p)):projVk(p)?vskLink(projVk(p)):esc(p.vidskiptavinur||p.verkkaupi||"")],
      ["Þjónusta",p.thjonusta?.length?p.thjonusta.map(esc).join(", "):""],
      ["Skiladagur",p.skiladagur?fmtDT(p.skiladagur)+(!isDone(p)?` <span style="color:var(--muted)">· ${rel(daysTo(p.skiladagur))}</span>`:""):""],
      ["Viðburður",p.vidburdur?fmtDT(p.vidburdur):""],["Tímabil verks",timabilTxt(p)],["Tímagjald",window.rateOf&&rateOf(p)?esc(num(rateOf(p))+" kr./klst. · "+(p.timagjald?"eigið tímagjald":taxtiOf(p)?.heiti||"")):""],["Teikningar frá",esc(p.teikningarFra||"")],
      ["Mappa",p.mappa?`<a class="plink" href="${esc(p.mappa)}" target="_blank" rel="noopener">Opna í OneDrive</a>`:""]],linkBtns(p,{edit:"verk"}))}
    <div class="viewtitle">Starfsmenn á verkefni</div><div class="stat-row">${STARFS().map(x=>`<button type="button" class="chipbtn" data-act="pstarf:${esc(p.id)}:${esc(x.sk)}" aria-pressed="${(p.starfsmenn?.length?p.starfsmenn:[ME()]).includes(x.sk)}">${esc(x.nafn)}</button>`).join("")}</div>
    <p class="hint" style="margin-top:10px">✎ Breyta nær líka yfir Staðan (yfirlit, næst, athuga) og Lýsingu. Stöður, þjónustu og starfsmenn má breyta undir Stillingar í valmyndinni.</p>`;
  return head+`<div class="dbody">${body}</div>`;
}
let showAllTimes=false;
function dSub(u,p){
  const m=u.serMappa||u.mappa||p.mappa, tl=faerslur().filter(e=>e.undirverkId?e.undirverkId===u.id:e.nr===u.nr).sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||""))));
  const others=(p.undirverk||[]).filter(x=>x.id!==u.id);
  const tabs=[["yfirlit","Yfirlit"],["timar","Tímar",tl.length?num(sumT(tl)):""],["stillingar","Stillingar"]].filter(t=>t[0]!=="timar"||ON("timar")); fixTab(tabs);
  const head=backBar()+`<div class="kicker"><span class="nr">${esc(u.nr)}</span>${statusPill(u.stada)}${u.skiladagur&&u.stada!=="Done"?relPill(daysTo(u.skiladagur)):""}</div>
  <h2 class="big" style="margin-top:6px">${esc(subName(u))}</h2><p class="sub" style="margin-bottom:0">Undirverk í ${projLink(p)}</p>`+dtabs(tabs);
  let body="";
  if(DTAB==="yfirlit") body=`${klukkaBanner(p)}
    <div class="kpis" style="margin-top:16px"><div class="card"><b>${num(u.timar)}</b><span>klst. skráðar</span></div><div class="card"><b>${u.skiladagur?fmtDate(u.skiladagur):"–"}</b><span>${u.skiladagur&&u.stada!=="Done"?esc(rel(daysTo(u.skiladagur))):"skiladagur"}</span></div></div>
    ${MCP?`<div class="links">${klukka()?"":`<button type="button" class="btn primary" data-act="kstart:${esc(p.id)}">▶ Byrja klukku</button>`}<button type="button" class="btn" data-act="add:tima">+ Tími</button>${m?`<a class="btn" href="${esc(m)}" target="_blank" rel="noopener">Mappa</a>`:""}</div>`:""}
    ${u.yfirlit?`<div class="viewtitle">Staðan</div><div class="card" style="font-size:14.5px">${esc(u.yfirlit)}</div>`:""}
    ${textCard("Lýsing",u.lysing)}
    ${others.length?`<div class="viewtitle">Önnur undirverk í verkefninu</div>${llist(others.map(subRowL))}`:""}`;
  if(DTAB==="timar") body=timesPage(tl,"kstart:"+esc(p.id));
  if(DTAB==="stillingar") body=`<div class="viewtitle">Staða</div>${statRow("sub",u.id,USTAT,u.stada,STL)}
    <div class="viewtitle" style="margin-top:6px">Upplýsingar</div>${settingsCard([
      ["Verknúmer",`<span class="nr">${esc(u.nr)}</span>`],["Heiti",esc(subName(u))],["Skiladagur",u.skiladagur?fmtDate(u.skiladagur):""],["Verkefni",projLink(p)],
      ["Mappa",m?`<a class="plink" href="${esc(m)}" target="_blank" rel="noopener">${u.serMappa?"Sérmappa":"Mappa verkefnis"}</a>`:""]],linkBtns({...u,mappa:null},{edit:"sub"}))}`;
  return head+`<div class="dbody">${body}</div>`;
}
function dFund(f){
  const p=fundProj(f), x=d(f.date), n=daysTo(f.date);
  const others=p?(S?.fundir||[]).filter(g=>g.id!==f.id&&fundProj(g)?.id===p.id&&daysTo(g.date)>=0).sort((a,b)=>d(a.date)-d(b.date)):[];
  return backBar()+`<div class="kicker"><span class="kind">Fundur</span>${n!==null?relPill(n):""}</div>
  <h2 class="big" style="margin-top:6px">${esc(f.name)}</h2>
  <div class="card" style="margin-top:14px"><dl class="kv" style="margin:0">${kvRows([
    ["Tími",(x?DAY[x.getDay()]+" "+fmtDate(f.date):"–")+(hhmm(f.date)?" · kl. "+hhmm(f.date)+(hhmm(f.dateEnd)?"–"+hhmm(f.dateEnd):""):"")],
    ["Staður",esc(f.stadsetning||"")],["Verkefni",p?projLink(p):(f.verknr?`<span class="nr">${esc(f.verknr)}</span>`:"")],
    ["Fundarmenn",f.attendees?.length?f.attendees.map(esc).join(", "):""],
    ["Fundargerð",f.fundargerd?`<a class="plink" href="${esc(f.fundargerd)}" target="_blank" rel="noopener">${esc(FGLABEL(f))}</a>${window.MS&&MS.on()&&(f.fgId||window.msCanPrevUrl?.(f.fundargerd))?` · <a class="plink" data-act="${esc(f.fgId?"msprev:"+f.fgId:msPrevUrl(f.fundargerd))}">Forskoða</a>`:""}`:""],
    ["Fundarhlekkur",f.fundarhlekkur?`<a class="plink" href="${esc(f.fundarhlekkur)}" target="_blank" rel="noopener">Tengjast fundi</a>`:""]])}</dl>
    ${MCP?`<div class="links"><button type="button" class="btn primary" data-act="fundtime:${esc(f.id)}">Skrá tíma fyrir fundinn</button><button type="button" class="btn" data-act="ics:${esc(f.id)}">Setja í dagatalið mitt</button>${!f.fundargerd&&window.MS&&MS.on()?`<button type="button" class="btn" data-act="msfg:${esc(f.id)}">Búa til fundargerð</button>`:""}</div>`:""}
    ${linkBtns({...f,mappa:f.mappa||p?.mappa},{edit:"fund"})}</div>
  ${textCard("Á síðu fundarins",f.lysing)}
  ${p&&(p.undirverk||[]).some(u=>u.stada!=="Done")?`<div class="viewtitle">Opin undirverk í verkefninu</div><div class="card"><div class="list" style="gap:2px">${p.undirverk.filter(u=>u.stada!=="Done").map(subRow).join("")}</div></div>`:""}
  ${meetList(others,"Aðrir fundir framundan í verkefninu")}`;
}
function dTime(e){
  const p=findProj(e.verkefniId)||projByNr(e.nr), r=e.undirverkId?findSub(e.undirverkId):null;
  return backBar()+`<div class="kicker"><span class="kind">Tímaskráning</span></div>
  <h2 class="big" style="margin-top:6px">${esc(cleanLys(e.lysing))}</h2>
  <div class="card" style="margin-top:14px"><dl class="kv" style="margin:0">${kvRows([
    ["Dagur",fmtDate(e.date)],["Tími",e.fra?esc(e.fra+(e.til?"–"+e.til:"")):""],["Klst.",hrs(e.timar)],["Verkefni",p?projLink(p):esc(e.nr||"")],
    ["Undirverk",r?`<a class="plink" ${tapAttr("sub",r.u.id)}><span class="nr">${esc(r.u.nr)}</span> ${esc(subName(r.u))}</a>`:""],
    ["Þjónusta",window.svcOf?(()=>{const l=svcOf(e), pr=window.entryRate?entryRate(e,rateOf(p)):0; return esc((l?l.heiti:"")+(pr?" · "+num(pr)+" kr./klst.":"")+(e.taxti?"":" (eins og verkefnið)"));})():""],
    ["Starfsmaður",esc(e.starfsmadur?starfName(e.starfsmadur):"")],["Tímabil",esc(e.timabil||timabilOf(e.date))],["Lýsing",esc(e.lysing||"")]])}</dl>
    ${linkBtns({id:e.id},{edit:"time"})}</div>`;
}
function dKostn(k){
  const p=findProj(k.verkefniId), r=k.undirverkId?findSub(k.undirverkId):null;
  return backBar()+`<div class="kicker"><span class="kind">Útlagður kostnaður</span></div>
  <h2 class="big" style="margin-top:6px">${esc(k.lysing||"Kostnaður")}</h2>
  <div class="card" style="margin-top:14px"><dl class="kv" style="margin:0">${kvRows([
    ["Upphæð",`<b>${esc(kr(k.upphaed))}</b>`],["Dagur",fmtDate(k.date)],["Verkefni",p?projLink(p):""],
    ["Undirverk",r?`<a class="plink" ${tapAttr("sub",r.u.id)}><span class="nr">${esc(r.u.nr)}</span> ${esc(subName(r.u))}</a>`:""],
    ["Starfsmaður",esc(starfName(k.starfsmadur||ME()))],["Tímabil",esc(timabilOf(k.date))],
    ["Kvittun",k.kvittun?`${window.MS&&MS.on()&&(k.kvittunId||window.msCanPrevUrl?.(k.kvittun))?`<a class="plink" data-act="${esc(k.kvittunId?"msprev:"+k.kvittunId:msPrevUrl(k.kvittun))}">Forskoða kvittun</a> · `:""}<a class="plink" href="${esc(k.kvittun)}" target="_blank" rel="noopener">Opna í OneDrive</a>`:""]])}</dl>
    ${linkBtns({id:k.id},{edit:"kostn"})}</div>`;
}
function dSkjal(x){
  const p=skjalProj(x);
  return backBar()+`<div class="kicker"><span class="kind">Skjal</span>${typePill(x.tegund)}</div>
  <h2 class="big" style="margin-top:6px">${esc(x.name||"Án titils")}</h2>
  <p class="sub">${p?"Skjal í "+projLink(p):"Skjal í "+esc(ORG.nafn)}</p>
  ${statRow("skjal",x.id,DSTAT,x.stada||"Not started",STL)}
  <div class="viewtitle">Upplýsingar</div><div class="card"><dl class="kv" style="margin:0">${kvRows([
    ["Staða",esc(STL[x.stada]||x.stada||"Ekki hafið")],["Tegund",esc(DTL[x.tegund]||x.tegund||"")],["Verkefni",p?projLink(p):""],
    ["Stofnað",x.stofnad?fmtDate(x.stofnad):""],["Síðast breytt",x.breytt?fmtDate(x.breytt):""]])}</dl>
    ${linkBtns({id:x.id,mappa:x.mappa},{edit:"skjal"})}</div>
  ${textCard("Efni skjalsins",x.lysing)}`;
}
function detailHTML(){
  const i=DETAIL.indexOf(":"), t=DETAIL.slice(0,i), id=DETAIL.slice(i+1);
  if(t==="skjal"){const x=findSkjal(id); return x&&(x.snid&&window.dSkjalNy?dSkjalNy(x):dSkjal(x));}
  if(t==="vsk"){const c=findVsk(id); return c&&dVsk(c);}
  if(t==="verdskra") return window.dVerdskra?dVerdskra():null;
  if(t==="verk"){const p=findProj(id); return p&&dVerk(p);}
  if(t==="sub"){const r=findSub(id); return r&&dSub(r.u,r.p);}
  if(t==="fund"){const f=findFund(id); return f&&dFund(f);}
  if(t==="time"){const e=findTime(id); return e&&dTime(e);}
  if(t==="kostn"){const k=findKostn(id); return k&&dKostn(k);}
  if(t==="post"){return window.dPost?dPost(id):null;}
  if(t==="reikn"){const R=window.rkFind&&rkFind(id); return R&&rkDetail(R);}
  return null;
}
function openDetail(key){
  if(!key||key===DETAIL) return;
  if(!DETAIL) listScroll=window.scrollY;
  DETAIL=key; DTAB="yfirlit"; try{history.pushState({aera:key,dtab:DTAB},"");}catch(e){}
  if(key.startsWith("verk:")){try{const id=key.slice(5); let rec=JSON.parse(localStorage.getItem("aera-recent")||"[]"); rec=[id,...rec.filter(x=>x!==id)].slice(0,6); localStorage.setItem("aera-recent",JSON.stringify(rec));}catch(e){}}
  render(); window.scrollTo({top:0});
}
function goBack(){
  let st=null; try{st=history.state;}catch(e){}
  if(st&&st.aera){history.back();return;}
  DETAIL=null; render(); window.scrollTo({top:listScroll});
}
window.addEventListener("popstate",e=>{DETAIL=(e.state&&e.state.aera)||null; DTAB=(e.state&&e.state.dtab)||"yfirlit"; render(); window.scrollTo({top:DETAIL?0:listScroll});});
const viewEl=document.getElementById("view");
/* Haldið fingri á röð í lista í hálfa sekúndu → eyða */
let lpT=null, lpFired=false;
viewEl.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"||!MCP) return; const r=e.target.closest("[data-open]"); if(!r||e.target.closest("a,button")) return; lpFired=false;
  lpT=setTimeout(()=>{lpFired=true; navigator.vibrate?.(15); deleteItem(...(k=>[k.split(":")[0],k.slice(k.indexOf(":")+1)])(r.dataset.open));},550);});
["pointerup","pointercancel","pointermove"].forEach(t=>viewEl.addEventListener(t,e=>{if(t==="pointermove"&&Math.abs(e.movementX)+Math.abs(e.movementY)<4) return; clearTimeout(lpT);}));
viewEl.addEventListener("contextmenu",e=>{if(e.target.closest("[data-open]")) e.preventDefault();});
viewEl.addEventListener("click",e=>{if(lpFired){lpFired=false; e.preventDefault(); e.stopPropagation(); return;}const a=e.target.closest("[data-act]"); if(a){e.preventDefault(); doAct(a.dataset.act,a); return;}
  const t=e.target.closest("a[href],button,[data-open]"); if(t&&t.dataset.open){e.preventDefault();openDetail(t.dataset.open);}});
viewEl.addEventListener("change",e=>{if(e.target.id==="timfilter"){timFilter=e.target.value;render();}
  if(e.target.id==="undirfilter"){undirFilter=e.target.value;render();} if(e.target.id==="skjalfilter"){skjalFilter=e.target.value;render();}});
function doAct(act,el){const [k,...r]=act.split(":");
  if(k.startsWith("ms")&&window.msAct){msAct(k,r,el); return;}
  if(k==="odmode"&&window.msAct){msAct(k,r,el); return;}
  if(k==="odlocal"&&window.odCopyLocal){odCopyLocal(decodeURIComponent(r.join(":"))); return;}
  if(k.startsWith("rk")&&window.rkAct){rkAct(k,r,el); return;}
  if(k.startsWith("sp")&&window.spAct&&spAct(k,r)) return;
  if(k==="hw"&&window.heimAct){heimAct(r); return;}
  if(k==="vs"&&window.vsAct){vsAct(r); return;}
  if(k==="viewas"&&window.viewAsAct){viewAsAct(r); return;}
  if(/^od(cd|in|ref)$/.test(k)&&window.odAct){odAct(k,r); return;}
  if(k==="odrec"&&window.odRecReset){odRecReset(); render(); return;}
  if(k.startsWith("sk")&&window.skAct){skAct(k,r,el); return;}
  if(k.startsWith("po")&&window.poAct){poAct(k,r,el); return;}
  if(k.startsWith("nu")&&window.nuAct){nuAct(k,r,el); return;}
  if(k==="later"){showLater=true; render(); return;}
  if(k==="fabnew"){openFab(); return;}
  if(k==="vskf"){vskFilter=r.join(":"); render(); return;}
  if(k==="cal"){calSel=r[0]; const x=d(calSel); if(x.getMonth()!==calMonth.getMonth()) calMonth=new Date(x.getFullYear(),x.getMonth(),1); render(); return;}
  if(k==="calmode"){calMode=r[0]; try{localStorage.setItem("aera-calmode",calMode);}catch(e){} render(); return;}
  if(k==="calday"){calSel=r[0]; calMode="d"; try{localStorage.setItem("aera-calmode","d");}catch(e){} render(); return;}
  if(k==="calnav"&&calMode!=="m"){const n=+r[0]; if(!n) calSel=isoDay(today); else {const x=d(calSel); x.setDate(x.getDate()+n*(calMode==="v"?7:1)); calSel=isoDay(x);} calMonth=new Date(d(calSel).getFullYear(),d(calSel).getMonth(),1); render(); return;}
  if(k==="calnav"){const n=+r[0]; if(!n){calMonth=new Date(today.getFullYear(),today.getMonth(),1); calSel=isoDay(today);} else {calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+n,1); const s=d(calSel); if(s.getMonth()!==calMonth.getMonth()||s.getFullYear()!==calMonth.getFullYear()) calSel=isoDay(calMonth);} render(); return;}
  if(k==="caladd"){kind=r[0]; PREFILL={date:calSel}; openSheet(); return;}
  if(k==="add"){kind=r[0]; openSheet(); return;}
  if(k==="edit"){openEdit(r[0],r.slice(1).join(":")); return;}
  if(k==="del"){deleteItem(r[0],r.slice(1).join(":")); return;}
  if(k==="theme"){setTheme(r[0]); return;}
  if(k==="variant"){setVariant(r[0],r[1]); return;}
  if(k==="ics"){downloadIcs(r.join(":")); return;}
  if(k==="notif"){enableNotifs(); return;}
  if(k==="cmadd"){const t=document.getElementById("cm-new")?.value.trim(); if(!t) return toast("Skrifaðu athugasemd fyrst."); const pid=r[0];
    saveSnapshot(s=>{const p=sFindP(s,pid); if(p)(p.athugasemdir=p.athugasemdir||[]).push({id:newId(),t,d:new Date().toISOString(),sk:ME()});}).then(()=>toast("Athugasemd vistuð")); return;}
  if(k==="cmdel"){const [pid,cid]=r; if(confirm("Eyða athugasemdinni?")) saveSnapshot(s=>{const p=sFindP(s,pid); if(p) p.athugasemdir=(p.athugasemdir||[]).filter(c=>c.id!==cid);}); return;}
  if(k==="cfg"){cfgAct(r[0],r[1]); return;}
  if(k==="tstarf"){timStarf=r[0]||""; wDay=null; render(); return;}
  if(k==="prep"){const p=findProj(r[0]); if(p) openReport(e=>e.verkefniId===p.id||nrMatch(e.nr,p.nr),{bil:"Allt tímabil verkefnis",verkefni:p.nafn,starf:"",flokka:(p.undirverk||[]).length>0}); return;}
  if(k==="srep"){const x=findSub(r[0]); if(x) openReport(e=>e.undirverkId===x.u.id||(!e.undirverkId&&e.nr===x.u.nr),{bil:"Allt tímabil",verkefni:x.p.nafn+" › "+x.u.nr+" "+subName(x.u),starf:"",flokka:true}); return;}
  if(k==="pstaff"){staffSheet(r[0]); return;}
  if(k==="pstarf"){const [pid,sk]=r; saveSnapshot(s=>{const p=sFindP(s,pid); if(!p) return; const cur=p.starfsmenn?.length?p.starfsmenn:[ME()]; p.starfsmenn=cur.includes(sk)?cur.filter(x=>x!==sk):cur.concat(sk); if(!p.starfsmenn.length) p.starfsmenn=[ME()];}); return;}
  if(k==="week"){weekOff=Math.min(0,weekOff+(+r[0])); wDay=null; render(); return;}
  if(k==="wday"){wDay=wDay===r[0]?null:r[0]; render(); return;}
  if(k==="wadd"){kind="tima"; PREFILL={date:r[0]}; openSheet(); return;}
  if(k==="report"){reportClick(); return;}
  if(k==="leitf"){leitF=leitF===r[0]?"":r[0]; document.getElementById("leitres").innerHTML=leitResults(leitQ); document.getElementById("leitchips").innerHTML=leitChips(leitQ); return;}
  if(k==="alltimes"){showAllTimes=true; render(); return;}
  if(k==="dtab"){setDtab(r[0]); return;}
  if(k==="kstart"){kind="tima"; PREFILL={pid:r[0],timer:true}; openSheet(); return;}
  if(k==="kstop"){stopKlukka(); return;}
  if(k==="kedit"){if(klukka()) openEdit("klukka",""); return;}
  if(k==="kcancel"){if(confirm("Hætta við klukkuna án þess að skrá tímann?")) saveSnapshot(s=>{s.klukka=null;}); return;}
  if(k==="fundtime"){const f=findFund(r.join(":")); if(!f) return; const p=fundProj(f), st=hhmm(f.date)||"", en=hhmm(f.dateEnd)||(st?pad((+st.slice(0,2)+1)%24)+st.slice(2):"");
    kind="tima"; PREFILL={pid:p?.id,date:String(f.date).slice(0,10),fra:st,til:en,desc:f.name}; openSheet(); return;}
  if(k==="tab"){tab=TABS.includes(r[0])?r[0]:"yfirlit"; DETAIL=null; window.STSUB=null; try{localStorage.setItem("aera-tab",tab)}catch(e){} render(); window.scrollTo({top:0}); return;}
  if(k==="stsub"){window.STSUB=r[0]||null; render(); window.scrollTo({top:0}); return;}
  if(k==="status"){const [type,id,st]=r; quickStatus(type,id,st,el);}}
viewEl.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ") return; const t=e.target.closest?.("[data-open]"); if(t&&t===e.target){e.preventDefault();openDetail(t.dataset.open);}});
const NEWBTN={postur:"Póstur",skjol:"Skjal",verk:"Verkefni",undir:"Undirverk",fundir:"Fundur",timar:"Skrá tíma",tfaer:"Skrá tíma",vsk:"Viðskiptavinur",dagatal:"Fundur"};
function pageHead(){if(tab==="yfirlit"||tab==="leit") return "";
  const sec=secOf(tab), cur=sec.tabs.find(x=>x[0]===tab)||sec.tabs[0], hid=!!cur[2], vis=sec.tabs.filter(x=>!x[2]), nb=NEWBTN[tab]&&MCP?NEWBTN[tab]:"";
  if(tab==="stillingar"&&window.STSUB&&STPAGES[STSUB]&&(!STPAGES[STSUB].adm||can("stillingar"))) return `<div class="phead"><a class="pback" data-act="stsub:" role="button" tabindex="0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Stillingar</a><div class="phrow"><h2 class="ptitle">${esc(STPAGES[STSUB].l)}</h2></div></div>`;
  const back=hid?`<a class="pback" data-act="tab:${sec.tabs[0][0]}" role="button" tabindex="0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>${esc(sec.tabs[0][1])}</a>`:"";
  const seg=!hid&&vis.length>1?`<div class="seg" role="tablist" aria-label="${esc(sec.l)}">${vis.map(([k,l])=>`<button type="button" role="tab" data-act="tab:${k}" aria-selected="${k===tab}">${esc(l)}</button>`).join("")}</div>`:"";
  return `<div class="phead">${back}<div class="phrow"><h2 class="ptitle">${esc(hid?cur[1]:sec.l)}</h2>${nb?`<button type="button" class="btn primary pnew" data-act="fabnew" aria-label="Nýtt: ${esc(nb)}" title="Nýtt: ${esc(nb)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`:""}</div>${seg}</div>`;}
function render(){
  applyEin(); if(!TABS.includes(tab)) tab="yfirlit";
  drawMenu(); clearTimeout(render._n); render._n=setTimeout(scheduleNotifs,500);
  const v=document.getElementById("view");
  if(!S){v.innerHTML=`<h2 class="big">Hleð gögnum…</h2><div class="empty">Augnablik.</div>`;return;}
  const det=DETAIL?detailHTML():null; if(DETAIL&&!det) DETAIL=null;
  document.body.classList.toggle("haspnew",!det&&!!NEWBTN[tab]&&!!MCP);
  document.body.classList.toggle("onchat",!det&&tab==="spjall");
  v.innerHTML=(window.viewAsBanner?viewAsBanner():"")+(det||pageHead()+({yfirlit:()=>vYfirlit("heim"),hfrag:()=>vYfirlit("frag"),hfram:()=>vYfirlit("fram"),hnyl:()=>vYfirlit("nyl"),verk:vVerk,undir:vUndir,fundir:vFundir,timar:()=>vTimar("vikan"),tfaer:()=>vTimar("faer"),tskyr:()=>vTimar("skyr"),trk:()=>vTimar("rk"),vsk:vVsk,skjol:()=>window.vSkjolFyr?vSkjolFyr():(window.vSkjolNy?vSkjolNy():""),skjolmin:()=>window.vSkjolMin?vSkjolMin():"",skjolnyl:()=>window.vSkjolNyl?vSkjolNyl():"",postur:()=>window.vPostur?vPostur():"",spjall:()=>window.vSpjall?vSpjall():"",teymi:()=>window.vTeymi?vTeymi():"",dagatal:vCal,leit:vLeit,stillingar:vStillingar,meira:vMeira}[tab]||(()=>vYfirlit("heim")))()); drawSync();
  // Hreyfing aðeins þegar skipt er um síðu – ekki þegar gögn uppfærast
  const key=tab+"|"+(DETAIL||"")+"|"+(window.STSUB||""); if(key!==render._k){const dv=!!DETAIL&&!String(render._k||"").includes("|"+DETAIL+"|"); render._k=key; v.classList.remove("anim","slide"); void v.offsetWidth; v.classList.add("anim"); if(dv||window.STSUB) v.classList.add("slide"); clearTimeout(render._a); render._a=setTimeout(()=>v.classList.remove("anim","slide"),900);}
  document.getElementById("foot").textContent=S.uppfaert?"Síðast breytt "+fmtDate(S.uppfaert)+(hhmm(S.uppfaert)?" kl. "+hhmm(S.uppfaert):""):"";
}
function setDtab(k,dir){if(k===DTAB) return; DTAB=k; try{history.replaceState({aera:DETAIL,dtab:DTAB},"");}catch(e){}
  const y=window.scrollY, nav=document.querySelector(".dtabs"), top=nav?nav.getBoundingClientRect().top+y-70:0; render();
  window.scrollTo({top:Math.min(y,Math.max(0,top))}); document.querySelector('.dtabs [aria-selected="true"]')?.scrollIntoView({block:"nearest",inline:"center"});
  const b=document.querySelector(".dbody"); if(b&&dir){b.classList.add(dir>0?"in-r":"in-l");}}
/* Strjúka til hliðar á milli undirsíðna */
let swX=null, swY=null;
viewEl.addEventListener("touchstart",e=>{if(!DETAIL||!document.querySelector(".dtabs")||e.target.closest(".dtabs,input,textarea,select,.wbars")){swX=null;return;} swX=e.touches[0].clientX; swY=e.touches[0].clientY;},{passive:true});
viewEl.addEventListener("touchend",e=>{if(swX===null) return; const dx=e.changedTouches[0].clientX-swX, dy=e.changedTouches[0].clientY-swY; swX=null;
  if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*0.6) return; const ks=[...document.querySelectorAll(".dtabs [data-act]")].map(b=>b.dataset.act.slice(5)); const i=ks.indexOf(DTAB);
  const n=dx<0?i+1:i-1; if(n>=0&&n<ks.length) setDtab(ks[n],dx<0?1:-1);},{passive:true});
/* Smellt á merkið → Yfirlit */
function goHome(){DETAIL=null; DTAB="yfirlit"; tab="yfirlit"; try{history.replaceState(null,"");}catch(e){} try{localStorage.setItem("aera-tab",tab)}catch(e){} closeMenu?.(); render(); window.scrollTo({top:0});
  if(window.AERA_DEMO) return; // sýniútgáfa: ekki endurhlaða (þá hyrfu breytingar)
  // Endurhlaða appið: athuga fyrst hvort ný útgáfa sé komin, svo sækja allt upp á nýtt
  document.querySelectorAll("header .brand h1, .side .logo").forEach(el=>el.classList.add("reloading"));
  const go=()=>location.reload(); const t=setTimeout(go,1500);
  if("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{}).finally(()=>{clearTimeout(t); setTimeout(go,150);}); else {clearTimeout(t); go();}}
document.querySelectorAll("header .brand h1, .side .logo").forEach(el=>{el.setAttribute("role","link"); el.setAttribute("tabindex","0"); el.setAttribute("title","Yfirlit"); el.style.cursor="pointer";
  el.addEventListener("click",goHome); el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault(); goHome();}});});
/* ---------- Dagatalsskrá (.ics) og tilkynningar ---------- */
function icsText(items){const z=n=>String(n).padStart(2,"0"), stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const loc=iso=>{const x=new Date(iso); return x.getFullYear()+z(x.getMonth()+1)+z(x.getDate())+"T"+z(x.getHours())+z(x.getMinutes())+"00";}, dOnly=iso=>String(iso).slice(0,10).replace(/-/g,"");
  const tx=t=>String(t||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  const ev=items.map(i=>{const timed=!!hhmm(i.when), end=timed?(i.o?.dateEnd&&hhmm(i.o.dateEnd)?i.o.dateEnd:new Date(new Date(i.when).getTime()+36e5).toISOString()):null;
    const nx=new Date(String(i.when).slice(0,10)); nx.setDate(nx.getDate()+1);
    return ["BEGIN:VEVENT","UID:"+(i.open||"").replace(/[^\w-]/g,"")+"-"+dOnly(i.when)+"@aera-app","DTSTAMP:"+stamp,
      timed?"DTSTART:"+loc(i.when):"DTSTART;VALUE=DATE:"+dOnly(i.when), timed?"DTEND:"+loc(end):"DTEND;VALUE=DATE:"+isoDay(nx).replace(/-/g,""),
      "SUMMARY:"+tx((i.t==="fund"?"":i.kind+": ")+i.title+(i.nr?" ("+i.nr+")":"")), i.o?.stadsetning?"LOCATION:"+tx(i.o.stadsetning):null, i.o?.fundarhlekkur?"URL:"+i.o.fundarhlekkur:null,
      "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+tx(i.title), timed?"TRIGGER:-PT15M":"TRIGGER:-PT15H","END:VALARM","END:VEVENT"].filter(Boolean).join("\r\n");});
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//"+ORG.nafn+"//app//IS","CALSCALE:GREGORIAN","X-WR-CALNAME:"+ORG.nafn,...ev,"END:VCALENDAR"].join("\r\n");}
function downloadIcs(arg){let items=[];
  if(arg==="all"){calItems().forEach((l,k)=>{if(k>=isoDay(today)) l.filter(i=>!i.span&&!i.done).forEach(i=>items.push(i));});}
  else {const f=findFund(arg); if(f) items=[{t:"fund",when:f.date,kind:"Fundur",title:f.name,nr:fundProj(f)?.nr||"",open:"fund:"+f.id,o:f}];}
  if(!items.length) return toast("Ekkert framundan til að setja í dagatal");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([icsText(items)],{type:"text/calendar;charset=utf-8"})); a.download=arg==="all"?"AERA dagatal.ics":"AERA fundur.ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); toast(items.length>1?`${items.length} atriði í dagatalsskrá`:"Opnaðu skrána til að bæta í dagatalið");}
let notifT=[];
function scheduleNotifs(){notifT.forEach(clearTimeout); notifT=[]; if(!("Notification" in window)||Notification.permission!=="granted"||!S) return;
  const now=Date.now(), show=(title,body)=>navigator.serviceWorker?.ready.then(r=>r.showNotification(title,{body,icon:"icons/icon-192.png",tag:title+body})).catch(()=>{try{new Notification(title,{body});}catch(e){}});
  calItems().forEach(l=>l.filter(i=>!i.span&&!i.done).forEach(i=>{const at=hhmm(i.when)?new Date(i.when).getTime()-15*6e4:new Date(String(i.when).slice(0,10)+"T09:00").getTime(); const ms=at-now;
    if(ms>0&&ms<24*36e5) notifT.push(setTimeout(()=>show(i.kind+(hhmm(i.when)?" kl. "+hhmm(i.when):" í dag"),i.title+(i.nr?" · "+i.nr:"")),ms));}));}
async function enableNotifs(){if(!("Notification" in window)) return alert("Þetta tæki styður ekki tilkynningar úr vafra. Notaðu „Setja í dagatalið mitt“ í staðinn.");
  const p=await Notification.requestPermission(); if(p==="granted"){toast("Tilkynningar virkar"); scheduleNotifs();} else toast("Tilkynningar voru ekki leyfðar"); render();}
