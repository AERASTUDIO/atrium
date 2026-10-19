/* Grunnur: þema, hlutar og flipar, stillingar, gagnaföll, listar, myndrit á Heim, skeiðklukka
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* ---------- Þema: sjálfvirkt (ljóst á tölvu, dökkt í síma), ljóst eða dökkt ---------- */
let THEME="auto"; try{THEME=localStorage.getItem("aera-theme")||"auto";}catch(e){}
const THEME_IC={auto:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'};
const THEME_L={auto:"Sjálfvirkt þema (ljóst á tölvu, dökkt í síma)",light:"Ljóst þema",dark:"Dökkt þema"};
let LVAR="aera", DVAR="aera"; // eitt ljóst (Pappír) og eitt dökkt (Nótt) þema eftir merkjahandbók
const VARIANTS={light:[["aera","Pappír","#F6F7F8","#2F3742"]],dark:[["aera","Nótt","#121416","#DFE5EA"]]};
function setVariant(kind,v){if(kind==="light") LVAR=v; else DVAR=v; try{localStorage.setItem(kind==="light"?"aera-lvar":"aera-dvar",v);}catch(e){} applyTheme(); if(typeof render==="function"&&S) render();}
function applyTheme(){const eff=THEME==="auto"?(matchMedia("(min-width:1024px)").matches?"light":"dark"):THEME;
  document.documentElement.dataset.theme=eff; document.documentElement.dataset.variant=eff==="light"?LVAR:DVAR; const m=document.getElementById("themecolor"); if(m) m.content=(ORG.litir||{})[eff==="light"?"ljos":"dokk"]||(VARIANTS[eff].find(x=>x[0]===(eff==="light"?LVAR:DVAR))||VARIANTS[eff][0])[2];
  const lg=ORG.merki||ORG.logo||{}, cu=eff==="light"?(lg.ljos||lg.dokk):(lg.dokk||lg.ljos); if(cu) document.querySelectorAll("img.colog").forEach(i=>{if(i.getAttribute("src")!==cu){i.src=cu;i.alt=ORG.nafn||"";}}); // merki fyrirtækis við hlið Atrium
  const b=document.getElementById("themebtn"); if(b){b.innerHTML=THEME_IC[THEME]; b.setAttribute("aria-label",THEME_L[THEME]+" – ýttu til að skipta"); b.title=THEME_L[THEME];}}
function setTheme(t){THEME=t; try{localStorage.setItem("aera-theme",t);}catch(e){} applyTheme(); if(typeof render==="function"&&S) render();}
applyTheme(); matchMedia("(min-width:1024px)").addEventListener?.("change",applyTheme);
document.getElementById("themebtn").addEventListener("click",()=>{const o=["auto","light","dark"]; setTheme(o[(o.indexOf(THEME)+1)%3]); toast(THEME_L[THEME]);});
const IC=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${p}</svg>`;
/* Einlit tákn í stað litríkra emoji (merkjahandbók: ró, einn tónn) */
const EIC=p=>`<svg class="ei" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${p}</svg>`;
const EI={time:EIC('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9.5 2.5h5"/>'),mail:EIC('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'),chat:EIC('<path d="M4 5h16v11H9l-5 4z"/>'),
  plug:EIC('<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>'),rk:EIC('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'),card:EIC('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>'),
  doc:EIC('<path d="M7 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5"/>')};
const TABDEF=[
  ["yfirlit","Yfirlit",IC('<rect x="3.5" y="3.5" width="7" height="9" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/>')],
  ["dagatal","Dagatal",IC('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14" r=".6" fill="currentColor"/><circle cx="12" cy="14" r=".6" fill="currentColor"/><circle cx="15.5" cy="14" r=".6" fill="currentColor"/>')],
  ["verk","Verkefni",IC('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>')],
  ["undir","Undirverk",IC('<path d="M4 6.5l1.6 1.6L8.5 5M4 12.5l1.6 1.6 2.9-3.1M4 18.5l1.6 1.6 2.9-3.1M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5"/>')],
  ["fundir","Fundir",IC('<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M2.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M14 15c2.8-.6 6 .6 7 4"/>')],
  ["timar","Tímaskráning",IC('<circle cx="12" cy="12.5" r="8"/><path d="M12 8v5l3 2M9.5 2.5h5"/>')],
  ["vsk","Viðskiptavinir",IC('<path d="M4 20.5V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 14 5.5v15M14 10h4.5a1.5 1.5 0 0 1 1.5 1.5v9M2.5 20.5h19M7.5 8h3M7.5 11.5h3M7.5 15h3M16.5 14h1M16.5 17h1"/>')],
  ["skjol","Skjöl",IC('<path d="M7 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6"/>')],
  ["postur","Póstur",IC('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>')]];
TABDEF.push(["stillingar","Stillingar",IC('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>')]);
/* Fimm hlutar (v1.2): hver hluti hefur undirsíður. Þriðja gildið (1) = falin undirsíða sem opnast úr hlutanum sjálfum (ekki í flipastiku). */
const SECTIONS_ALL=[
  {k:"heim",l:"Heim",ic:IC('<path d="M4 11l8-7 8 7v9.5H4z"/><path d="M10 20.5v-6h4v6"/>'),tabs:[["yfirlit","Heim"],["hfrag","Til að ganga frá",1],["hfram","Framundan",1],["hnyl","Nýlegt og póstar",1]]},
  {k:"verkefni",l:"Verkefni",ic:TABDEF.find(t=>t[0]==="verk")[2],tabs:[["verk","Verkefni"],["undir","Undirverk"],["vsk","Viðskiptavinir"]]},
  {k:"sala",l:"Tilboð",ic:IC('<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.4"/>'),tabs:[["tilbod","Tilboð"],["vorur","Vörulisti"]]},
  {k:"dagatal",l:"Dagatal",ic:TABDEF.find(t=>t[0]==="dagatal")[2],tabs:[["dagatal","Dagatal"],["fundir","Fundir"]]},
  {k:"timar",l:"Tímar",ic:TABDEF.find(t=>t[0]==="timar")[2],tabs:[["timar","Vikan"],["tfaer","Færslur"],["tskyr","Skýrslur"],["trk","Reikningar"]]},
  {k:"skjol",l:"Skjöl",ic:TABDEF.find(t=>t[0]==="skjol")[2],tabs:[["skjolmin","Mín skjöl"],["skjol","Fyrirtækið"],["skjolnyl","Nýlegt"]]},
  {k:"postur",l:"Samskipti",ic:IC('<path d="M4 5.5h11a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 15 15H9l-4 3.5V15H4a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M16.5 9H20a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5h-1V21l-3.5-2.5H11a1.5 1.5 0 0 1-1.5-1.5v-.5"/>'),tabs:[["postur","Póstur"],["spjall","Spjall"],["teymi","Samstarfsfólk"]]},
  {k:"meira",l:"Meira",ic:IC('<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),tabs:[["meira","Meira"],["stillingar","Stillingar",1]],nobar:1}]; // Meira: í hliðarstiku og sem prófílhnappur í haus (ekki í neðri stiku síma)
// Einingar (kjarni.js): flipar og hlutar sem eru ekki virkir hjá þessari uppsetningu eru faldir. Endurreiknað þegar stillingin breytist.
const SECTIONS=[], TABS=[]; let _einSig=null;
function applyEin(){const sg=window.einSig?einSig():""; if(sg===_einSig) return false; _einSig=sg;
  SECTIONS.length=0; SECTIONS_ALL.forEach(x=>{const tabs=x.tabs.filter(t=>!window.tabOn||tabOn(t[0])); const vis=tabs.filter(t=>!t[2]); if(!vis.length) return;
    // Ef aðeins ein síða er eftir í hluta (t.d. Reikningar án tímaskráningar) ber hlutinn heiti hennar
    SECTIONS.push({...x,tabs,l:vis.length===1&&vis.length<x.tabs.filter(t=>!t[2]).length?vis[0][1]:x.l});});
  TABS.length=0; SECTIONS.forEach(x=>x.tabs.forEach(t=>TABS.push(t[0]))); return true;}
applyEin();
const secOf=t=>SECTIONS.find(x=>x.tabs.some(y=>y[0]===t))||SECTIONS[0];
const tabTitle=t=>secOf(t).tabs.find(y=>y[0]===t)?.[1]||"";
const DTYPES=["Draft","Spec","PRD","RFC","Design Review","Decision","Strategy","Guideline","Runbook","Postmortem","OKRs"], DSTAT=["Not started","In progress","Done"];
// Tegundir skjala eru vistaðar á ensku (eldri gögn) en birtar á íslensku
const DTL={"Draft":"Drög","Spec":"Lýsing","PRD":"Kröfulýsing","RFC":"Tillaga","Design Review":"Hönnunarrýni","Decision":"Ákvörðun","Strategy":"Stefna","Guideline":"Leiðbeiningar","Runbook":"Verklag","Postmortem":"Eftirá-greining","OKRs":"Markmið"};
/* ---------- Stillingar appsins (S.stillingar) ---------- */
const DEF_STODUR=[{n:"Beiðni",c:"slate"},{n:"Tilboð",c:"violet"},{n:"Í vinnslu",c:"blue"},{n:"Í bið",c:"amber"},{n:"Í yfirferð",c:"teal"},{n:"Afhent",c:"green",lokid:true},{n:"Reikningsfært",c:"gray",lokid:true}];
const noFolder=p=>{const t=(p?.thjonusta||[]); return t.length>0&&t.every(x=>x==="Almennt");};
const DEF_THJ=["Teiknivinna","Lýsing","Almennt","Hönnun & ráðgjöf","Sala"];
const DEF_STARF=[{sk:"DFM",nafn:"Dagur Fannar Möller",eg:true}];
const COLORS=[["blue","Sterkt (Grafít)"],["teal","Miðtónn"],["violet","Stál"],["amber","Stál með útlínu"],["slate","Ljóst (Þoka)"],["green","Útlína"],["gray","Hlutlaust"],["red","Áhersla"]];
const CFG=()=>S?.stillingar||{};
const DEF_SNID={"Teiknivinna":["Gögn móttekin og yfirfarin","Módel","Teikningar","Yfirferð","Útgáfa"],"Lýsing":["Forsendur","Ljósateikning","Capture-módel","Útgáfa"],"Hönnun & ráðgjöf":["Hugmyndavinna","3D render","Kynning"],"Almennt":[],"Sala":["Tilboð","Eftirfylgni"]};
const SNID=()=>CFG().snidmat||DEF_SNID;
const budgetOf=p=>{const a=+p?.aklst||0; if(!a) return null; const pct=(+p.timar||0)/a; return {a,pct,cls:pct>1?"over":pct>=.8?"warn":""};};
const budgetPill=p=>{const b=budgetOf(p); return b&&b.cls?`<span class="pill ${b.cls}">${Math.round(b.pct*100)}% af áætlun</span>`:"";};
const STODUR=()=>CFG().stodur?.length?CFG().stodur:DEF_STODUR;
const THJ=()=>CFG().thjonusta?.length?CFG().thjonusta:DEF_THJ;
const STARFS=()=>CFG().starfsmenn?.length?CFG().starfsmenn:DEF_STARF;
// Innskráður notandi skráir á sig (skammstöfun úr notendaskrá); annars sá sem merktur er „ég“ í Starfsmönnum.
const ME=()=>window.VIEWAS?.sk||window.USER?.sk||(STARFS().find(x=>x.eg)||STARFS()[0]).sk;
// „Skoða sem“ (admin): sýnir aðeins það sem viðkomandi hlutverk sæi af tímum og kostnaði
const viewFilter=xs=>{const V=window.VIEWAS; if(!V||ROLES[V.hlutverk]?.fjarmal) return xs; return xs.filter(x=>x.eigandi?String(x.eigandi).toLowerCase()===V.email.toLowerCase():(x.starfsmadur||x.sk)===V.sk);};
const starfName=sk=>STARFS().find(x=>x.sk===sk)?.nafn||sk||"";
// Starfsfólk skráð á verkefni (p.starfsmenn = skammstafanir; tómt = sá sem stofnaði/ME eins og áður)
const projStaff=p=>p?.starfsmenn?.length?p.starfsmenn:[ME()];
const staffAv=sk=>`<span class="sav" title="${esc(starfName(sk))}">${esc(sk)}</span>`;
const isDone=p=>!!STODUR().find(x=>x.n===p?.stada)?.lokid;
const stColor=n=>STODUR().find(x=>x.n===n)?.c||"slate";
const MON=["jan","feb","mar","apr","maí","jún","júl","ágú","sep","okt","nóv","des"], DAY=["sun","mán","þri","mið","fim","fös","lau"];
document.getElementById("appver").textContent="v"+APP_VERSION; // APP_VERSION er skilgreint í index.html
{const hd=document.querySelector("header"); const setH=()=>document.documentElement.style.setProperty("--hh",hd.getBoundingClientRect().height+"px"); setH(); try{new ResizeObserver(setH).observe(hd);}catch(e){addEventListener("resize",setH);}}
let S=null, tab="yfirlit", DB=null, MCP=null, DETAIL=null, listScroll=0;
try{const t=localStorage.getItem("aera-tab"); if(TABS.includes(t)) tab=t;}catch(e){}
const today=new Date(); today.setHours(0,0,0,0);
const pad=n=>String(n).padStart(2,"0");
const isoDay=x=>x.getFullYear()+"-"+pad(x.getMonth()+1)+"-"+pad(x.getDate());
document.getElementById("today").textContent=DAY[today.getDay()]+" "+today.getDate()+". "+MON[today.getMonth()];

function d(iso){if(!iso) return null; const x=new Date(iso.length<=10?iso+"T00:00:00":iso); return isNaN(x)?null:x;}
function daysTo(iso){const x=d(iso); if(!x) return null; const y=new Date(x); y.setHours(0,0,0,0); return Math.round((y-today)/864e5);}
function rel(n){if(n===null) return ""; if(n===0) return "Í dag"; if(n===1) return "Á morgun"; if(n===-1) return "Í gær"; return n>0?"Eftir "+n+" daga":Math.abs(n)+" dögum liðið";}
function relPill(n){if(n===null) return ""; const c=n<0?"late":n===0?"today":n<=3?"l3":n<=7?"l2":n<=14?"l1":"";
  let t=rel(n); if(n>30){const x=new Date(today); x.setDate(x.getDate()+n); t=x.getDate()+". "+MON[x.getMonth()]+(x.getFullYear()!==today.getFullYear()?" "+x.getFullYear():"");}
  return `<span class="pill ${c}">${n<0?"⚠ ":""}${t}</span>`;}
function hhmm(iso){const x=d(iso); if(!x||!/T\d/.test(iso||"")) return ""; return pad(x.getHours())+":"+pad(x.getMinutes());}
function fmtDate(iso){const x=d(iso); return x?x.getDate()+". "+MON[x.getMonth()]+(x.getFullYear()!==today.getFullYear()?" "+x.getFullYear():""):"";}
const fmtDT=iso=>fmtDate(iso)+(hhmm(iso)?" kl. "+hhmm(iso):"");
function timabilTxt(p){const a=p.timabilFra,b=p.timabilTil; if(!a) return ""; if(!b) return "Hefst "+fmtDT(a);
  const same=String(a).slice(0,10)===String(b).slice(0,10); return fmtDT(a)+" – "+(same&&hhmm(b)?"kl. "+hhmm(b):fmtDT(b));}
const vsName=p=>projVsk(p)?.name||p.vidskiptavinur||"", vkName=p=>projVk(p)?.name||p.verkkaupi||"";
const num=n=>{const v=Math.round((n||0)*100)/100;const [i,f]=String(Math.abs(v)).split(".");return (v<0?"−":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+(f?","+f:"");};
const hrs=n=>num(n)+" klst.";
const curPeriod=()=>timabilOf(isoDay(today));
const periodSum=k=>faerslur().filter(e=>(e.timabil||timabilOf(e.date))===k).reduce((a,e)=>a+(+e.timar||0),0);
const mondayOf=x=>{const m=new Date(x); m.setHours(0,0,0,0); m.setDate(m.getDate()-((m.getDay()+6)%7)); return m;};
const weekSum=(off=0,sk=null,noLive=false)=>{const a=mondayOf(today); a.setDate(a.getDate()+7*off); const b=new Date(a); b.setDate(b.getDate()+7); return faerslur().filter(e=>{const x=d(e.date); return (!noLive||!e.live)&&x&&x>=a&&x<b&&(!sk||(e.starfsmadur||ME())===sk);}).reduce((t,e)=>t+(+e.timar||0),0);};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const STC={"Beiðni":"l1","Í vinnslu":"l2","Í yfirferð":"l3","Afhent":"done","Not started":"","Up next":"l1","In progress":"l2","Done":"done"};
const STL={"Done":"Lokið","In progress":"Í vinnslu","Up next":"Næst","Not started":"Ekki hafið"};
const statusPill=s=>STODUR().some(x=>x.n===s)?`<span class="pill pc-${stColor(s)}">${esc(s)}</span>`:`<span class="pill ${STC[s]??""}">${esc(STL[s]||s)}</span>`;
/* Einföld listaröð: [fremst] titill / undirlína [hægra megin] › */
const lrow=(open,o)=>`<div class="lrow tap" ${tapAttr(open.split(":")[0],open.slice(open.indexOf(":")+1))}>${o.lead!=null?`<div class="ll">${o.lead}</div>`:""}<div class="lm"><div class="lt">${o.title}</div>${o.sub?`<div class="ls">${o.sub}</div>`:""}</div>${o.right?`<div class="lr">${o.right}</div>`:""}${MCP&&!(/^(verk|vsk):/.test(open)&&window.can&&!can("eyda"))?`<button type="button" class="ldel" data-act="del:${esc(open)}" aria-label="Eyða"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`:""}${CHEV}</div>`;
const llist=rows=>`<div class="llist">${rows.join("")}</div>`;
const dateBlock=iso=>{const x=d(iso);return x?`<div class="date"><b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small></div>`:`<div class="date"><b>–</b></div>`;};
const FGLABEL=f=>{const x=d(f?.date); return "Fundargerð"+(x?" "+pad(x.getDate())+"."+pad(x.getMonth()+1)+"."+x.getFullYear():"");};
function linkBtns(o,opts={}){let h="";
  if(o.fundargerd) h+=`<a class="btn primary" href="${esc(o.fundargerd)}" target="_blank" rel="noopener">${esc(FGLABEL(o))}</a>`;
  if(o.fundarhlekkur) h+=`<a class="btn ${o.fundargerd?"":"primary"}" href="${esc(o.fundarhlekkur)}" target="_blank" rel="noopener">Fjarfundur</a>`;
  if(o.mappa) h+=`<a class="btn" href="${esc(o.mappa)}" target="_blank" rel="noopener">Mappa</a>`;
  if(opts.edit&&MCP&&o.id&&!isTmp(o.id)) h+=`<button type="button" class="btn" data-act="edit:${opts.edit}:${esc(o.id)}">✎ Breyta</button>${(opts.edit==="verk"||opts.edit==="vsk")&&window.can&&!can("eyda")?"":`<button type="button" class="btn danger" data-act="del:${opts.edit}:${esc(o.id)}">Eyða</button>`}`;
  return h?`<div class="links">${h}</div>`:"";}
const isTmp=id=>!id||/^(tmp|nytt)/.test(String(id));
const USTAT=["Not started","Up next","In progress","Done"];
function timabilOf(iso){const x=d(iso); if(!x) return ""; let y=x.getFullYear(), m=x.getMonth(); if(x.getDate()<=20){m--; if(m<0){m=11;y--;}} const e=new Date(y,m+1,20); return `21.${pad(m+1)}${y!==e.getFullYear()?"."+y:""} – 20.${pad(e.getMonth()+1)}.${e.getFullYear()}`;}
const NONE='<span style="color:var(--muted)">Ekki skráð</span>';
const kvRows=rows=>rows.filter(Boolean).map(([k,v])=>`<dt>${k}</dt><dd>${v==null||v===""?NONE:v}</dd>`).join("");
const textCard=(title,s)=>s?`<div class="viewtitle">${title}</div><div class="card" style="font-size:14.5px;white-space:pre-line">${esc(s)}</div>`:"";
/* Öll gögn koma úr S (sjá gogn.js) */
const nid=x=>{const m=String(x||"").replace(/-/g,"").match(/[0-9a-f]{32}/i); return m?m[0].toLowerCase():"";};
const sameId=(a,b)=>!!a&&!!b&&nid(a)===nid(b);
const J=s=>{if(Array.isArray(s)) return s; try{const v=JSON.parse(s||"[]"); return Array.isArray(v)?v:[];}catch(e){return [];}};
function verkefni(){return S?.verkefni||[];}
const meetBtn=o=>{const h=(o.fundargerd?`<a class="btn" href="${esc(o.fundargerd)}" target="_blank" rel="noopener">Fundargerð</a>`:"")+(o.fundarhlekkur?`<a class="btn primary" href="${esc(o.fundarhlekkur)}" target="_blank" rel="noopener">Fjarfundur</a>`:""); return h?`<div class="links">${h}</div>`:"";};
// Tímafærslur – geymt í minni þar til gögnin breytast (kallað oft í hverri teikningu)
let _fc={k:null,v:null,r:[]};
// Klukka í gangi telst með sem bráðabirgðafærsla (live, id tmp-klukka) svo allar samtölur uppfærist í rauntíma.
// Hún fer ekki á reikninga, í skýrslur né í vistun (isTmp) og hverfur þegar klukkan er stöðvuð og raunveruleg færsla verður til.
function liveEntry(){const k=S?.klukka; if(!k||!k.start) return null; const st=new Date(k.start), now=new Date(), h=Math.max(0,(now-st)/36e5), dt=isoDay(st), p=findProj(k.pid);
  return {id:"tmp-klukka",live:true,date:dt,fra:pad(st.getHours())+":"+pad(st.getMinutes()),til:pad(now.getHours())+":"+pad(now.getMinutes()),timar:Math.round(h*100)/100,
    lysing:(k.desc||"Klukka í gangi"),nr:p?.nr||null,verkefniId:k.pid||null,undirverkId:k.sid||null,starfsmadur:k.sk||ME(),timabil:timabilOf(dt),eigandi:window.USER?.email||""};}
const liveProjH=pid=>{const e=liveEntry(); return e&&e.verkefniId===pid?e.timar:0;};
function faerslur(){const T=S?.timar||{}, L=T.faerslur||T.nyjast||[], vk=verkefni(), kk=S?.klukka?.start||null, mn=kk?Math.floor(Date.now()/60000):0;
  if(_fc.k===L&&_fc.v===vk&&_fc.kk===kk&&_fc.mn===mn) return window.VIEWAS?viewFilter(_fc.r):_fc.r;
  const r=L.map(e=>({...e,verkefniId:e.verkefniId||projByNr(e.nr)?.id||null})); const le=liveEntry(); if(le) r.unshift(le);
  _fc={k:L,v:vk,kk,mn,r}; return window.VIEWAS?viewFilter(r):r;}
const findTime=id=>faerslur().find(e=>String(e.id)===id);
const kostn=()=>viewFilter(S?.kostnadur||[]);
const findKostn=id=>kostn().find(k=>String(k.id)===id);
const kr=n=>String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,".")+" kr.";
const sumK=ks=>ks.reduce((a,k)=>a+(+k.upphaed||0),0);
const parseKr=v=>{v=String(v||"").replace(/kr\.?/i,"").replace(/\s/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."); const n=Math.round(+v); return isFinite(n)&&n>0?n:0;};
const fundProj=f=>(f?.projectId&&findProj(f.projectId))||projByNr(f?.verknr)||verkefni().find(p=>p.nafn===f?.verknr)||null;
const cleanLys=t=>String(t||"").replace(/^\s*\d{1,2}\.\d{1,2}\.?\s*[–-]\s*/,"").replace(/\s*\(\s*[\d.,]+\s*klst\.?\s*\)\s*$/,"")||String(t||"");
const CHEV=`<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`;
const tapAttr=(t,id)=>`role="button" tabindex="0" data-open="${t}:${esc(id)}"`;
const nrMatch=(a,nr)=>!!(a&&nr&&String(a).trim().startsWith(nr));
const subName=u=>String(u.heiti||"").replace(u.nr,"").trim()||u.heiti||"";
const findProj=id=>verkefni().find(p=>String(p.id)===id);
function findSub(id){for(const p of verkefni()){const u=(p.undirverk||[]).find(u=>String(u.id)===id); if(u) return {u,p};} return null;}
const findFund=id=>(S?.fundir||[]).find(f=>String(f.id)===id);
const projByNr=nr=>nr?verkefni().filter(p=>nrMatch(nr,p.nr)).sort((a,b)=>b.nr.length-a.nr.length)[0]:null;
const subRow=u=>`<div class="sub-i tap" ${tapAttr("sub",u.id)}><div class="grow"><div style="overflow-wrap:anywhere;font-weight:500"><span class="nr">${esc(u.nr)}</span>&nbsp; ${esc(subName(u))}</div><div class="pills" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">${statusPill(u.stada)}${u.skiladagur&&u.stada!=="Done"?relPill(daysTo(u.skiladagur)):""}${u.timar?`<span class="kind" style="align-self:center">${hrs(u.timar)}</span>`:""}</div></div>${CHEV}</div>`;
const active=()=>verkefni().filter(p=>!isDone(p));
function skjol(){return S?.skjol||[];}
const vskList=()=>(S?.vidskiptavinir||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"is"));
const findVsk=id=>vskList().find(c=>sameId(c.id,id));
const vskByName=n=>n?vskList().find(c=>c.name===n):null;
const projVsk=p=>findVsk(p?.vskId)||vskByName(p?.vidskiptavinur)||null;
const projVk=p=>findVsk(p?.vkId)||vskByName(p?.verkkaupi)||null;
const vskProjects=c=>verkefni().filter(p=>projVsk(p)?.id===c.id||projVk(p)?.id===c.id);
const vskLink=c=>c?`<a class="plink" ${tapAttr("vsk",c.id)}>${esc(c.name)}</a>`:"";
const ROLEPILL={"Viðskiptavinur":"l2","Verkkaupi":"l1"};
const rolePills=c=>(c.hlutverk||[]).map(h=>`<span class="pill ${ROLEPILL[h]||""}">${esc(h)}</span>`).join("");
function vskFromRow(r){return {id:nid(r.url),name:r.Name||"",hlutverk:J(r.Hlutverk),kennitala:r.Kennitala||"",vsknr:r["VSK-númer"]||"",heimilisfang:r.Heimilisfang||"",postnumer:r["Póstnúmer"]||"",stadur:r["Staður"]||"",simi:r["Sími"]||"",netfang:r.Netfang||"",vefsida:r["Vefsíða"]||"",tengilidur:r["Tengiliður"]||"",simiT:r["Sími tengiliðs"]||"",netfangT:r["Netfang tengiliðs"]||"",athugasemdir:r.Athugasemdir||""};}
const findSkjal=id=>skjol().find(x=>String(x.id)===id);
const skjalProj=x=>(x?.projectId&&findProj(x.projectId))||null;
const typePill=t=>t?`<span class="pill">${esc(DTL[t]||t)}</span>`:"";
const skjalCard=(x,opts={})=>{const p=opts.noProj?null:skjalProj(x); const ed=x.breytt||x.stofnad;
  return `<div class="card tap" ${tapAttr("skjal",x.id)}><div class="row"><div class="grow"><div class="t">${esc(x.name||"Án titils")}</div>
  <div class="meta">${statusPill(x.stada||"Not started")}${typePill(x.tegund)}${p?`<span class="nr">${esc(p.nr)}</span><span>${esc(p.stutt)}</span>`:""}${ed?`<span>${esc(fmtDate(ed))}</span>`:""}</div></div>${CHEV}</div></div>`;};

const todo=(act,o)=>`<div class="lrow tap" data-act="${act}" role="button" tabindex="0"><div class="ll">${o.lead}</div><div class="lm"><div class="lt">${esc(o.title)}</div><div class="ls">${esc(o.sub)}</div></div>${CHEV}</div>`;
function upcoming(){
  const items=[];
  (S?.fundir||[]).forEach(f=>items.push({kind:"Fundur",open:"fund:"+f.id,when:f.date,title:f.name,nr:f.verknr,extra:[hhmm(f.date)&&"kl. "+hhmm(f.date),f.stadsetning&&""+f.stadsetning].filter(Boolean),o:f}));
  verkefni().forEach(p=>{
    (p.undirverk||[]).filter(u=>u.stada!=="Done"&&u.skiladagur).forEach(u=>items.push({kind:"Skil undirverks",open:"sub:"+u.id,when:u.skiladagur,title:subName(u),nr:u.nr+" · "+p.stutt,extra:[],o:{...u,mappa:u.mappa||p.mappa}}));
    if(!isDone(p)){ if(p.skiladagur) items.push({kind:p.vidburdur===p.skiladagur?"Skil og viðburður":"Skil verkefnis",open:"verk:"+p.id,when:p.skiladagur,title:p.stutt,nr:p.nr,extra:[hhmm(p.skiladagur)&&"kl. "+hhmm(p.skiladagur)].filter(Boolean),o:p});
      if(p.vidburdur&&p.vidburdur!==p.skiladagur) items.push({kind:"Viðburður",open:"verk:"+p.id,when:p.vidburdur,title:p.stutt,nr:p.nr,extra:[hhmm(p.vidburdur)&&"kl. "+hhmm(p.vidburdur)].filter(Boolean),o:p}); }});
  (S?.reikningar||[]).filter(r=>r.stada!=="Greitt"&&r.gjalddagi).forEach(r=>items.push({kind:"Gjalddagi reiknings",open:"reikn:"+r.id,when:r.gjalddagi,title:"Reikningur "+r.nr+" · "+(r.kaupandi?.name||""),nr:kr(r.tot),extra:[],o:{}}));
  return items.filter(i=>{const n=daysTo(i.when);return n!==null&&(n>=0||i.kind!=="Fundur");}).sort((a,b)=>d(a.when)-d(b.when));
}
const upCard=i=>`<div class="card tap" role="button" tabindex="0" data-open="${esc(i.open)}"><div class="row">${dateBlock(i.when)}<div class="grow"><div class="kind">${i.kind}</div><div class="t">${esc(i.title)}</div>
  <div class="meta">${i.nr?`<span class="nr">${esc(i.nr)}</span>`:""}${i.extra.map(e=>`<span>${esc(e)}</span>`).join("")}${relPill(daysTo(i.when))}</div>${meetBtn(i.o)}</div>${CHEV}</div></div>`;

function vYfirlit(sub="heim"){
  let TODO_N=0;
  const up=upcoming(), late=up.filter(i=>daysTo(i.when)<0);
  const openSubs=verkefni().flatMap(p=>(p.undirverk||[]).filter(u=>u.stada!=="Done"));
  const hr=new Date().getHours(), first=(STARFS().find(x=>x.sk===ME())?.nafn||"").split(" ")[0];
  const greet=hr<5?"Góða nótt":hr<11?"Góðan daginn":hr<18?"Góðan dag":"Gott kvöld";
  const goal=+CFG().vikumark||40, wk=weekSum(0,STARFS().length>1?ME():null,true), kH=klukka()?liveWeekH(klukka().start):0, pct=Math.min(1,(wk+kH)/goal), R=44, C=2*Math.PI*R;
  const todayItems=(calItems().get(isoDay(today))||[]).filter(i=>!i.span).sort((a,b)=>String(hhmm(a.when)||"").localeCompare(String(hhmm(b.when)||"")));
  const k=klukka();
  const agenda=`<div class="agenda"><div class="ah"><span>Í dag · ${esc(dayTitle(today))}</span><span>${todayItems.length} atriði</span></div>
    ${k?`<a class="ag" data-act="tab:timar"><span class="at">${EI.time}</span><span class="ab" style="--c:var(--hi)"></span><span class="ax"><b>${esc(findProj(k.pid)?.stutt||"Klukka")}</b><small>Klukka í gangi · <span class="kt" data-start="${esc(k.start)}">${elapsed(k)}</span></small></span></a>`:""}
    ${todayItems.length?todayItems.map(i=>`<a class="ag" ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))}><span class="at">${hhmm(i.when)||"—"}</span><span class="ab" style="--c:${CALC[i.t]}"></span><span class="ax"><b>${esc(i.title)}</b><small>${esc(i.kind)}${i.nr?" · "+esc(i.nr):""}</small></span></a>`).join(""):(k?"":`<div class="ag" style="cursor:default"><span class="ax"><small>Ekkert á dagskrá í dag. Gott tækifæri til að vinna í friði.</small></span></div>`)}</div>`;
  const next=up.find(i=>daysTo(i.when)>0);
  const nextCard=next?`<div class="agenda"><div class="ah"><span>Næst á eftir</span><span>${esc(rel(daysTo(next.when)))}</span></div><a class="ag" ${tapAttr(next.open.split(":")[0],next.open.slice(next.open.indexOf(":")+1))}><span class="at">${hhmm(next.when)||fmtDate(next.when)}</span><span class="ab" style="--c:${CALC[next.t]||"var(--accent)"}"></span><span class="ax"><b>${esc(next.title)}</b><small>${esc(next.kind)}${next.nr?" · "+esc(next.nr):""}</small></span></a></div>`:"";
  // Vikuhringur: opnar Tímar › Vikan; telur klukku í gangi með og uppfærist á sekúndu fresti (liveTick)
  const ring=`<a class="ring tap" data-act="tab:timar" role="button" aria-label="${num(wk+kH)} af ${num(goal)} klst. í vikunni – opna tímayfirlit" data-wk="${wk}" data-goal="${goal}"${k?` data-kstart="${esc(k.start)}"`:""}><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="${R}" fill="none" stroke="var(--bar0)" stroke-width="9"/><circle class="rarc" cx="52" cy="52" r="${R}" fill="none" stroke="var(--hi)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}" transform="rotate(-90 52 52)"/><text class="rpct" x="52" y="58" text-anchor="middle" font-size="20" fill="var(--ink)" font-family="inherit">${Math.round(pct*100)}%</text></svg><div class="rv">${num(Math.round((wk+kH)*10)/10)} / ${num(goal)}</div><div class="rl">klst. í vikunni${k?" · klukka í gangi":""}</div></a>`;
  const act=active().slice().sort((a,b)=>String(a.skiladagur||"9999").localeCompare(String(b.skiladagur||"9999")));
  const pc=p=>{const b=budgetOf(p), subs=p.undirverk||[], done=subs.filter(u=>u.stada==="Done").length, prog=b?Math.min(1,b.pct):(subs.length?done/subs.length:0);
    return `<div class="pcard" ${tapAttr("verk",p.id)} style="--c:${({slate:"#C9D1D9",violet:"#93A0AD",blue:"var(--ink)",amber:"#7C8896",teal:"#4B5664",green:"#C9D1D9",gray:"#C9D1D9",red:"#B4532A"})[stColor(p.stada)]}">
      <div class="meta" style="margin:0"><span class="nr">${esc(p.nr)}</span>${statusPill(p.stada)}${p.skiladagur?relPill(daysTo(p.skiladagur)):""}</div><div class="t">${esc(p.stutt)}</div>${(p.thjonusta||[]).length?`<div class="pstag">${svcTags(p)}</div>`:""}
      <div class="pm">${esc([vkName(p)||vsName(p),b?`${num(p.timar)} af ${num(b.a)} klst.`:(subs.length?`${done} af ${subs.length} undirverkum lokið`:hrs(p.timar))].filter(Boolean).join(" · "))}</div>
      <div class="pbar ${b?.cls||""}"><i style="width:${Math.round(prog*100)}%"></i></div></div>`;};
  const waiting=verkefni().filter(p=>p.stada===STODUR()[0]?.n);
  const feed=[...faerslur().map(e=>({w:String(e.date||"")+"T"+(e.til||e.fra||"12:00"),ic:"⏱",h:lrow("time:"+e.id,{lead:EI.time,title:esc(cleanLys(e.lysing)),sub:esc([fmtDate(e.date),(findProj(e.verkefniId)||projByNr(e.nr))?.stutt].filter(Boolean).join(" · ")),right:`<span class="lc">${esc(hrs(e.timar))}</span>`})})),
    ...verkefni().flatMap(p=>(p.athugasemdir||[]).map(c=>({w:c.d,h:lrow("verk:"+p.id,{lead:EI.chat,title:esc(c.t.length>70?c.t.slice(0,70)+"…":c.t),sub:esc(p.stutt+" · "+fmtDate(c.d))})}))),
    ...(S?.thraedir||[]).map(t=>({w:t.tengt,h:lrow("verk:"+t.verkefniId,{lead:EI.mail,title:esc(t.efni||"Póstþráður"),sub:esc(["Þráður tengdur",findProj(t.verkefniId)?.stutt,fmtDate(t.tengt)].filter(Boolean).join(" · "))})}))]
    .sort((a,b)=>String(b.w).localeCompare(String(a.w))).slice(0,6);
  const unass=(window.MS_OFL||[]);
  const P_hello=`${klukkaBanner()}<h2 class="hello">${greet}${first?", "+esc(first):""}</h2>
  <p class="sub">${late.length?`<b style="color:var(--ink)">${late.length} ${late.length===1?"atriði komið":"atriði komin"} fram yfir</b> · `:""}${active().length} verkefni í gangi · ${openSubs.length} opin undirverk</p>
  <div class="hero">${ring}${agenda}${nextCard}</div>`;
  const P_late=`  ${late.length?`<div class="viewtitle">Komið fram yfir · ${late.length}</div>${llist(late.map(i=>lrow(i.open,{lead:(()=>{const x=d(i.when); return x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–";})(),title:esc(i.title),sub:esc([i.kind,i.nr].filter(Boolean).join(" · ")),right:relPill(daysTo(i.when))})))}`:""}`;
  const P_todo=`  ${(()=>{const R=[]; if(window.MS&&MS.hadLogin()&&!MS.on()) R.push(todo("mslogin",{lead:EI.plug,title:"Tenging við Microsoft rann út",sub:"Ýttu hér til að tengjast aftur (skrár, póstur, fundargerðir)"})); const ofl=(S?.skjol||[]).filter(x=>x.snid&&x.stadur==="oflokkad").length; if(ofl) R.push(todo("tab:skjol",{lead:EI.doc,title:`${ofl} óflokkuð skjöl`,sub:"Flokka á verkefni eða í Stofu"}));
    const ob=window.rkUnbilled?[...verkefni().map(p=>p.id),null].map(k=>rkUnbilled(k)):[]; const oh=ob.reduce((a,x)=>a+sumT(x.es),0), ok=ob.reduce((a,x)=>a+sumK(x.ks),0);
    if(oh>=1||ok) R.push(todo("tab:trk",{lead:EI.rk,title:`Óreikningsfært: ${hrs(oh)}${ok?" + "+kr(ok):""}`,sub:"Búa til reikning"}));
    const og=(S?.reikningar||[]).filter(r=>r.stada!=="Greitt"); if(og.length) R.push(todo("tab:trk",{lead:EI.card,title:`${og.length} ${og.length===1?"ógreiddur reikningur":"ógreiddir reikningar"} · ${kr(og.reduce((a,r)=>a+(+r.tot||0),0))}`,sub:"Sjá reikninga undir Tímum"}));
    TODO_N=R.length; return R.length?`<div class="viewtitle">Til að ganga frá</div>${llist(R)}`:"";})()}`;
  const P_act=`  ${act.length?`<div class="viewtitle" style="display:flex;align-items:center;gap:8px">Verkefni í gangi · ${act.length}<a class="plink" data-act="tab:verk" style="margin-left:auto">Sjá öll</a></div><div class="pcards">${act.map(pc).join("")}</div>`:""}`;
  const P_wait=`  ${waiting.length?`<div class="viewtitle">Bíða svars · ${waiting.length}</div>${llist(waiting.map(p=>lrow("verk:"+p.id,{title:`<span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt)}`,sub:esc(vkName(p)||vsName(p)||""),right:statusPill(p.stada)})))}`:""}`;
  const P_unass=`  ${unass.length?`<div class="viewtitle">Óflokkaðir þræðir í ${esc(ORG.postholf?"verkefnapósti":ORG.postmappa+"-möppunni")} · ${unass.length}</div>${llist(unass.map(m=>`<div class="lrow"><div class="ll">${EI.mail}</div><div class="lm tap" ${tapAttr("post",m.id)}><div class="lt">${esc(m.subject||"(ekkert efni)")}</div><div class="ls">${esc([m.from?.emailAddress?.name||m.from?.emailAddress?.address,fmtDate(m.receivedDateTime)].filter(Boolean).join(" · "))}</div></div><select data-polink="${esc(m.id)}" aria-label="Tengja þráð við verkefni" style="width:auto;max-width:150px;padding:6px 8px;font-size:13px"><option value="">Tengja við…</option>${active().map(p=>`<option value="${esc(p.id)}">${esc(p.nr)}</option>`).join("")}</select></div>`))}`:(window.MS&&MS.on&&!MS.on()?`<div class="empty">Tengdu Microsoft til að sjá óflokkaða pósta.</div>`:"")}`;
  const P_fram7=`  <div class="viewtitle">Framundan · næstu 7 dagar</div>${(()=>{const w=up.filter(i=>{const n=daysTo(i.when);return n>=0&&n<=7;}); return w.length?llist(w.map(i=>lrow(i.open,{lead:(()=>{const x=d(i.when); return x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–";})(),title:esc(i.title),sub:esc([i.kind,hhmm(i.when)?"kl. "+hhmm(i.when):"",i.nr].filter(Boolean).join(" · ")),right:relPill(daysTo(i.when))}))):`<div class="empty">Ekkert á dagskrá næstu viku.</div>`;})()}`;
  const P_feed=`  ${feed.length?`<div class="viewtitle">Nýlegt</div><div class="feed">${llist(feed.map(f=>f.h))}</div>`:""}`;
  const nFrag=late.length+TODO_N+waiting.length, w7=up.filter(i=>{const n=daysTo(i.when);return n>=0&&n<=7;}).length;
  const tile=(t,n,l,extra,attr)=>`<button type="button" class="htile" ${attr||`data-act="tab:${t}"`}><span class="hx"><b>${n}</b>${extra||""}</span><span>${l}</span></button>`;
  // Spjöld sem notandinn velur á milli (heim.js › Sérsníða Heim › Spjöld). Hvert spjald er ein lykiltala sem opnar sína síðu.
  const kk0=klukka(), dagH=sumT(faerslur().filter(e=>!e.live&&String(e.date||"").slice(0,10)===isoDay(today)&&(e.starfsmadur||ME())===ME()))+(kk0?Math.max(0,(Date.now()-Math.max(new Date(kk0.start),new Date(isoDay(today)+"T00:00:00")))/36e5):0);
  const lateP=active().filter(p=>p.skiladagur&&daysTo(p.skiladagur)<0).length, spU=window.spUnread?spUnread():0, oin=window.can&&can("fjarmal")&&window.rkOinnheimt?rkOinnheimt():null;
  const krS=n=>n>=1e6?num(Math.round(n/1e5)/10)+" m.kr.":n>=1e3?num(Math.round(n/1e3))+" þ.kr.":kr(n);
  const TILES={
    timar_dag:tile("timar",num(Math.round(dagH*10)/10),"Klst. skráðar í dag",kk0?`<span class="hl ok">klukka í gangi</span>`:dagH?"":`<span class="hl">ekkert skráð</span>`,dagH||kk0?"":`data-act="add:tima"`),
    fram7:tile("hfram",w7,"Framundan næstu 7 daga"),
    verk:tile("verk",act.length,"Verkefni í gangi",lateP?`<span class="hl">${lateP} fram yfir skiladag</span>`:""),
    oinn:oin?tile("trk",krS(oin.tot),"Óinnheimt",oin.late.length?`<span class="hl">${oin.late.length} fram yfir gjalddaga</span>`:""):"",
    olesid:tile("spjall",spU+unass.length,"Ólesið í spjalli og pósti",spU?`<span class="hl ok">${spU} í spjalli</span>`:""),
    seint:tile("hfrag",late.length,"Komið fram yfir",late.length?`<span class="hl">þarf athygli</span>`:""),
    frag:tile("hfrag",nFrag,"Til að ganga frá",late.length?`<span class="hl">${late.length} fram yfir</span>`:""),
    nyl:tile("hnyl",unass.length,unass.length===1?"Óflokkaður póstur":"Óflokkaðir póstar · nýlegt")};
  if(sub==="frag") return (P_late+P_todo+P_wait)||'<div class="empty">Ekkert sem bíður. Vel gert.</div>';
  if(sub==="fram") return framundan(up);
  if(sub==="nyl") return (P_unass+P_feed)||'<div class="empty">Ekkert nýlegt.</div>';
  // Heim er samsett úr einingum sem notandinn velur, raðar og stækkar (heim.js)
  const tiles=`<div class="htiles">${tile("hfrag",nFrag,"Til að ganga frá",late.length?`<span class="hl">${late.length} fram yfir</span>`:"")}${tile("hfram",w7,"Framundan næstu 7 daga")}${tile("verk",act.length,"Verkefni í gangi")}${tile("hnyl",unass.length,unass.length===1?"Óflokkaður póstur":"Óflokkaðir póstar · nýlegt")}</div>`;
  const hello=`<h2 class="hello">${greet}${first?", "+esc(first):""}</h2><p class="sub">${late.length?`<b style="color:var(--ink)">${late.length} ${late.length===1?"atriði komið":"atriði komin"} fram yfir</b> · `:""}${active().length} verkefni í gangi · ${openSubs.length} opin undirverk</p>`;
  if(!window.heimGrid) return P_hello+tiles;
  const pieces={_tiles:TILES,oinnheimt:window.can&&can("fjarmal")&&window.rkOinnheimtCard?rkOinnheimtCard():"",kvedja:hello,vika:ring,idag:agenda,naest:nextCard,spjold:tiles,frag:(P_late+P_todo+P_wait).trim(),framundan:P_fram7,verkefni:P_act.trim(),nylegt:P_feed.trim(),postur:P_unass.trim(),...homeChartParts()};
  return klukkaBanner()+heimGrid(pieces);
}
/* ---------- Myndrit á Heim (1.4.0) ----------
   Einföld SVG-rit í litum merkjahandbókar. Hver notandi sér rit úr þeim gögnum sem hann hefur aðgang að
   (starfsmaður: eigin tímar; fjármál: allir tímar og reikningar). */
function barsV(vals,labels,{goal=0,hi=-1,fmt=v=>num(Math.round(v*10)/10),acts=[]}={}){
  const W=320,H=150,top=18,bot=22,n=vals.length,gap=8,bw=(W-gap*(n-1))/n,mx=Math.max(goal,...vals,1)*1.08,y=v=>top+(H-top-bot)*(1-v/mx);
  return `<svg class="chsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(labels.map((l,i)=>l+": "+fmt(vals[i])).join(", "))}">
    ${goal?`<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="chgoal"/><text x="${W}" y="${y(goal)-4}" text-anchor="end" class="chlbl">markmið ${num(goal)}</text>`:""}
    ${vals.map((v,i)=>{const x=i*(bw+gap), yy=y(v), h=Math.max(v>0?2:0,H-bot-yy);
      return `<g${acts[i]?` class="tap" data-act="${esc(acts[i])}"`:""}><rect x="${x}" y="${H-bot-h}" width="${bw}" height="${h}" rx="4" class="chb${i===hi?" on":""}" style="animation-delay:${i*40}ms"/>${v>0?`<text x="${x+bw/2}" y="${H-bot-h-4}" text-anchor="middle" class="chval${i===hi?" on":""}">${esc(fmt(v))}</text>`:""}<text x="${x+bw/2}" y="${H-6}" text-anchor="middle" class="chlbl">${esc(labels[i])}</text></g>`;}).join("")}</svg>`;}
function barsH(rows){ // rows: [{l, v, txt, act}]
  const mx=Math.max(...rows.map(r=>r.v),1);
  return `<div class="chh">${rows.map((r,i)=>`<${r.act?`a class="chr tap" data-act="${esc(r.act)}"`:`div class="chr"`}><span class="chrl">${r.l}</span><span class="chrb"><i style="width:${Math.max(2,Math.round(r.v/mx*100))}%;animation-delay:${i*50}ms"></i></span><span class="chrv">${esc(r.txt)}</span></${r.act?"a":"div"}>`).join("")}</div>`;}
function homeChartParts(){
  if(!S) return {};
  const fj=window.can&&can("fjarmal"), mine=!fj&&STARFS().length>1?ME():null, out=[], P={};
  // 1. Tímar síðustu 8 vikna
  const wks=[...Array(8)].map((_,i)=>i-7), wv=wks.map(o=>weekSum(o,STARFS().length>1&&!fj?ME():(fj?null:ME()))), mon=o=>{const a=mondayOf(today); a.setDate(a.getDate()+7*o); return a;};
  // (klukka í gangi er þegar með í weekSum sem bráðabirgðafærsla)
  P.ch_vikur=(`<div class="chart"><div class="chh4"><b>${fj&&STARFS().length>1?"Tímar teymisins":"Þínir tímar"}</b><span>síðustu 8 vikur</span></div>${barsV(wv,wks.map(o=>"v"+isoWeek(mon(o))),{goal:fj&&STARFS().length>1?0:(+CFG().vikumark||40),hi:7,acts:wks.map(()=>"tab:timar")})}</div>`);
  // 2. Tímar á verkefni á yfirstandandi tímabili
  const per=curPeriod(), byP=new Map(); faerslur().filter(e=>(e.timabil||timabilOf(e.date))===per&&(!mine||(e.starfsmadur||ME())===mine)).forEach(e=>{const k=e.verkefniId||"_"; byP.set(k,(byP.get(k)||0)+(+e.timar||0));});
  const pr=[...byP.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>{const p=findProj(k); return {l:p?`<span class="nr">${esc(p.nr)}</span> ${esc(p.stutt||"")}`:"Almennt",v,txt:num(Math.round(v*10)/10)+" klst.",act:p?"verk:"+p.id:"tab:tfaer"};});
  P.ch_verk=(`<div class="chart"><div class="chh4"><b>Tímar á verkefni</b><span>tímabil ${esc(per)}</span></div>${pr.length?barsH(pr):`<div class="empty" style="margin:8px 0">Engir tímar á tímabilinu ennþá.</div>`}</div>`);
  // 3. Verkefni eftir stöðu
  const st=STODUR().filter(x=>!x.lokid).map(x=>({x,n:verkefni().filter(p=>p.stada===x.n).length})).filter(r=>r.n), tot=st.reduce((a,r)=>a+r.n,0);
  P.ch_stada=(`<div class="chart"><div class="chh4"><b>Verkefni í gangi</b><span>${tot} eftir stöðu</span></div><div class="chstack">${st.map((r,i)=>`<i class="sh${i%5}" style="flex:${r.n}" title="${esc(r.x.n)}: ${r.n}"></i>`).join("")}</div>
    <div class="chleg">${st.map((r,i)=>`<a class="tap" data-act="tab:verk"><i class="sh${i%5}"></i>${esc(r.x.n)} <b>${r.n}</b></a>`).join("")}</div></div>`);
  // 4. Reikningar (fjármál)
  if(fj){const R=S.reikningar||[], m6=[...Array(6)].map((_,i)=>{const x=new Date(today.getFullYear(),today.getMonth()-5+i,1); return x;}), MN=["jan","feb","mar","apr","maí","jún","júl","ágú","sep","okt","nóv","des"];
    const mv=m6.map(x=>R.filter(r=>String(r.dags||"").slice(0,7)===x.getFullYear()+"-"+pad(x.getMonth()+1)).reduce((a,r)=>a+(+r.tot||0),0));
    const og=R.filter(r=>r.stada!=="Greitt"), late=og.filter(r=>r.gjalddagi&&daysTo(r.gjalddagi)<0), sumR=xs=>xs.reduce((a,r)=>a+(+r.tot||0),0);
    const unb=faerslur().filter(e=>!e.reikningur&&e.verkefniId).reduce((a,e)=>a+(+e.timar||0),0);
    P.ch_reikn=(`<div class="chart"><div class="chh4"><b>Reikningsfært</b><span>síðustu 6 mánuðir · m.kr.</span></div>${barsV(mv.map(v=>v/1e6),m6.map(x=>MN[x.getMonth()]),{hi:5,fmt:v=>v?num(Math.round(v*100)/100):"",acts:m6.map(()=>"tab:trk")})}
      <div class="chkpi"><a class="tap" data-act="tab:trk"><b>${esc(kr(sumR(og)))}</b><span>ógreitt · ${og.length}</span></a>${late.length?`<a class="tap late" data-act="tab:trk"><b>${esc(kr(sumR(late)))}</b><span>fram yfir gjalddaga</span></a>`:""}<a class="tap" data-act="tab:trk"><b>${esc(kr(window.rkOinnheimt?rkOinnheimt().ub:0))}</b><span>óreikningsfært · ${num(Math.round(unb*10)/10)} klst.</span></a></div></div>`);}
  if(!tot) P.ch_stada="";
  return P;
}
const isoWeek=x=>{const t=new Date(Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())); const dn=(t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-dn+3); const f=new Date(Date.UTC(t.getUTCFullYear(),0,4)); return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);};
/* Framundan (áður sér flipi, nú hluti af Yfirliti) */
let showLater=false;
/* ---------- Skeiðklukka (S.klukka samstillist milli tækja) ---------- */
const klukka=()=>S?.klukka||null;
const elapsed=k=>{const t=Math.max(0,Math.floor((Date.now()-new Date(k.start))/1000)); return Math.floor(t/3600)+":"+pad(Math.floor(t/60)%60)+":"+pad(t%60);};
function klukkaBanner(p){const k=klukka(); if(!k||(p&&k.pid!==p.id)) return ""; const q=findProj(k.pid), u=k.sid?findSub(k.sid)?.u:null;
  return `<div class="klukka"><div class="lm"><div class="ls">Klukka í gangi · <button type="button" class="klink" data-act="kedit" title="Breyta upphafstíma">frá kl. ${esc(hhmm(k.start))}${isoDay(new Date(k.start))!==isoDay(new Date())?" ("+esc(fmtDate(k.start))+")":""} ✎</button></div><div class="lt">${esc(q?.nafn||"Verkefni")}${u?" · "+esc(subName(u)):""}</div>${k.desc?`<div class="ls">${esc(k.desc)}</div>`:""}</div>
  <b class="kt" data-start="${esc(k.start)}">${elapsed(k)}</b><div class="kbtns"><button type="button" class="btn primary" data-act="kstop">Stoppa og skrá</button><button type="button" class="btn" data-act="kcancel" aria-label="Hætta við klukku">✕</button></div></div>`;}
// Á mínútu fresti meðan klukka er í gangi: teikna aftur svo allar samtölur (vika, tímabil, verkefni, myndrit) fylgi rauntíma.
setInterval(()=>{if(!S?.klukka||!sheetwrap?.hidden||window.SPLIT===undefined) return; const a=document.activeElement; if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; const y=window.scrollY; render(); window.scrollTo(0,y);},60000);
// Klst. klukkunnar sem falla í yfirstandandi viku (frá mánudegi)
const liveWeekH=start=>{const a=mondayOf(new Date()), st=new Date(start); return Math.max(0,(Date.now()-Math.max(st,a))/36e5);};
setInterval(()=>{document.querySelectorAll(".kt[data-start]").forEach(el=>el.textContent=elapsed({start:el.dataset.start}));
  document.querySelectorAll("[data-wk][data-kstart]").forEach(el=>{const v=+el.dataset.wk+liveWeekH(el.dataset.kstart), g=+el.dataset.goal||0, r=el.querySelector(".rv"), t=el.querySelector(".rpct"), c=el.querySelector(".rarc"), w=el.querySelector(".wkv");
    if(r) r.textContent=num(Math.round(v*10)/10)+" / "+num(g); if(w) w.textContent=num(Math.round(v*10)/10);
    if(t&&g) t.textContent=Math.round(Math.min(1,v/g)*100)+"%"; if(c&&g){const C=+c.getAttribute("stroke-dasharray"); c.setAttribute("stroke-dashoffset",C*(1-Math.min(1,v/g)));}});},1000);
async function stopKlukka(){const k=klukka(); if(!k) return; const st=new Date(k.start), en=new Date();
  const mins=Math.max(1,Math.round((en-st)/60000)), t=Math.round(mins/60*100)/100, dt=isoDay(st), fr=pad(st.getHours())+":"+pad(st.getMinutes()), to=pad(en.getHours())+":"+pad(en.getMinutes());
  const desc=k.desc||"Vinna", lys=lysFmt(dt,desc,t), id=newId();
  const ov=overlaps(dt,fr,to,k.sk||ME(),null); if(ov&&!confirm(`Klukkutíminn skarast við „${cleanLys(ov.lysing)}“ kl. ${ov.fra}–${ov.til}.\n\nSkrá samt?`)) return;
  await saveSnapshot(s=>{s.klukka=null; const p=sFindP(s,k.pid), u=k.sid?sFindU(s,k.sid)[1]:null; if(p) p.timar=(p.timar||0)+t; if(u) u.timar=(u.timar||0)+t;
    s.timar=s.timar||{}; s.timar.samtals=(s.timar.samtals||0)+t; const L=sTimes(s);
    L.unshift({id,date:dt,lysing:lys,nr:u?.nr||p?.nr,verkefniId:k.pid,undirverkId:k.sid||null,fra:fr,til:to,timar:t,starfsmadur:k.sk||ME(),timabil:timabilOf(dt)});
    L.sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||"")))); s.timar.nyjast=L.slice(0,10);});
  toast(`Skráð: ${hrs(t)}`);}
function framundan(up){
  const late=up.filter(i=>daysTo(i.when)<0), week=up.filter(i=>{const n=daysTo(i.when);return n>=0&&n<=7}), later=up.filter(i=>daysTo(i.when)>7);
  let h="";
  if(late.length) h+=`<div class="viewtitle">Komið fram yfir skiladag · ${late.length}</div><div class="list">${late.map(upCard).join("")}</div>`;
  h+=`<div class="viewtitle">Framundan · næstu 7 dagar</div>`+(week.length?`<div class="list">${week.map(upCard).join("")}</div>`:`<div class="empty">Ekkert á dagskrá næstu viku.</div>`);
  if(later.length) h+=`<div class="viewtitle">Síðar · ${later.length}</div>`+(showLater?`<div class="list">${later.map(upCard).join("")}</div>`:`<button type="button" class="btn" style="width:100%" data-act="later">Sýna ${later.length} atriði síðar</button>`);
  return h;
}
function vUndir(){
  const all=verkefni().flatMap(p=>(p.undirverk||[]).map(u=>({u,p}))).filter(r=>!undirFilter||r.p.id===undirFilter);
  const SO={"In progress":0,"Up next":1,"Not started":2};
  const byDue=(a,b)=>((a.u.skiladagur?0:1)-(b.u.skiladagur?0:1))||String(a.u.skiladagur||"").localeCompare(String(b.u.skiladagur||""))||String(b.u.nr).localeCompare(String(a.u.nr));
  const open=all.filter(r=>r.u.stada!=="Done"), done=all.filter(r=>r.u.stada==="Done").sort((a,b)=>String(b.u.nr).localeCompare(String(a.u.nr)));
  const card=({u,p})=>lrow("sub:"+u.id,{title:`<span class="nr">${esc(u.nr)}</span>&nbsp; ${esc(subName(u))}`,
    sub:esc([p.stutt,u.timar?hrs(u.timar):""].filter(Boolean).join(" · ")),
    right:u.stada!=="Done"&&u.skiladagur?relPill(daysTo(u.skiladagur)):""});
  const groups=[["In progress","Í vinnslu"],["Up next","Næst"],["Not started","Ekki hafið"]];
  let h=`<label style="margin-top:18px">Sía eftir verkefni<select id="undirfilter"><option value="">Öll verkefni</option>${verkefni().slice().sort((a,b)=>(isDone(a)-isDone(b))||b.nr.localeCompare(a.nr)).map(p=>`<option value="${esc(p.id)}"${p.id===undirFilter?" selected":""}>${esc(p.nafn)}</option>`).join("")}</select></label>`;
  if(!open.length) h+=`<div class="viewtitle">Opin undirverk</div><div class="empty">Engin opin undirverk.</div>`;
  groups.forEach(([s,l])=>{const g=open.filter(r=>(SO[r.u.stada]??2)===SO[s]).sort(byDue); if(g.length) h+=`<div class="viewtitle">${l} · ${g.length}</div>${llist(g.map(card))}`;});
  if(done.length) h+=`<div class="viewtitle">Lokið · ${done.length}</div>${llist(done.map(card))}`;
  return h;
}
let undirFilter="", skjalFilter="";
function vSkjol(){
  const xs=skjol().filter(x=>!skjalFilter||x.projectId===skjalFilter).slice().sort((a,b)=>String(b.breytt||b.stofnad||"").localeCompare(String(a.breytt||a.stofnad||"")));
  const withP=verkefni().filter(p=>skjol().some(x=>x.projectId===p.id));
  let h=withP.length?`<label style="margin-top:18px">Sía eftir verkefni<select id="skjalfilter"><option value="">Öll skjöl</option>${withP.map(p=>`<option value="${esc(p.id)}"${p.id===skjalFilter?" selected":""}>${esc(p.nafn)}</option>`).join("")}</select></label>`:"";
  if(!S?.skjol) return h+`<div class="viewtitle">Skjöl</div><div class="empty">Engin skjöl ennþá.</div>`;
  if(!xs.length) return h+`<div class="viewtitle">Skjöl</div><div class="empty">Engin skjöl ennþá.${MCP?" Bættu við skjali með +.":""}</div>`;
  [["In progress","Í vinnslu"],["Not started","Ekki hafið"],["Done","Lokið"]].forEach(([s,l])=>{const g=xs.filter(x=>(x.stada||"Not started")===s); if(g.length) h+=`<div class="viewtitle">${l} · ${g.length}</div><div class="list">${g.map(x=>skjalCard(x)).join("")}</div>`;});
  return h;
}
