/* Stillingar, leit, vistunarstaða og valmynd
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* Stillingar skiptast í undirsíður (v1.2). Kaflarnir koma úr vStillingarAll() og er raðað á síður eftir fyrirsögn. */
window.STSUB=null;
const STPAGES={utlit:{l:"Útlit",d:"Ljóst, dökkt eða sjálfvirkt",s:["Útlit"]},ms:{l:"Microsoft 365",d:"Outlook, Teams og SharePoint",s:["Microsoft 365"]},sig:{l:"Undirskrift í pósti",d:"Neðst í tölvupósti úr appinu",s:["Undirskrift í pósti"]},amin:{l:"Áminningar",d:"Áminningar um tímaskráningu",s:["Áminningar"]},
  folk:{l:"Fólk",d:"Notendur, hlutverk og starfsmenn",s:["Notendur","Starfsmenn"],adm:1},fyrir:{l:"Reikningar og fyrirtæki",d:"Seljandi, tímagjald, VSK og vinnuvika",s:["Reikningar","Vinnuvika"],adm:1},
  adgangur:{l:"Aðgangsstýring",d:"Hver sér hvað, notendur, skoða sem og nýlegar breytingar",s:[],adm:1,fn:()=>window.vAdgangur?vAdgangur():""},
  einingar:{l:"Einingar",d:"Hvaða hlutar appsins eru í notkun hjá fyrirtækinu",s:[],adm:1,fn:()=>vEiningar()},
  tilbod:{l:"Leiga og sala",d:"Flokkar, dagstuðlar, VSK, tilboðsnúmer og skilmálar",s:[],adm:1,fn:()=>window.tbStillingar?tbStillingar():""},
  vstill:{l:"Verkefnastillingar",d:window.ORG?.utlit==="I"?"Stöður, verkflokkar og sniðmát undirverka":"Stöður, þjónusta og sniðmát undirverka",s:["Staða verkefna",window.ORG?.utlit==="I"?"Verkflokkar":"Þjónusta","Sniðmát undirverka"],adm:1},
  prufa:{l:"Prufugögn",d:"Hlaða inn eða eyða uppspunnum gögnum til prófunar",s:[],adm:1,fn:()=>window.vPrufugogn?vPrufugogn():""}};
function stChunks(){const h=vStillingarAll(), parts=h.split('<div class="viewtitle">'), m={};
  parts.slice(1).forEach(x=>{const t=x.slice(0,x.indexOf("</div>")).replace(/<[^>]+>/g,"").trim(); m[t]=(m[t]||"")+'<div class="viewtitle">'+x;}); return m;}
const mrow=(act,label,opts={})=>`<button type="button" class="mrow" ${act.startsWith("js:")?`onclick="${act.slice(3)}"`:`data-act="${act}"`}>${opts.ic||""}<span class="mt">${esc(label)}${opts.d?`<small>${esc(opts.d)}</small>`:""}</span>${opts.v?`<span class="mv">${esc(opts.v)}</span>`:""}${opts.noch?"":`<svg class="mc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`}</button>`;
function vStillingar(){const sub=window.STSUB&&STPAGES[STSUB]; 
  if(sub&&(!sub.adm||can("stillingar"))){if(sub.fn) return sub.fn(); const m=stChunks(); return sub.s.map(t=>m[t]||"").join("")||'<div class="empty">Ekkert hér.</div>';}
  const msOn=window.MS&&MS.on?MS.on():false;
  const me=["utlit","ms","sig","amin",...(STPAGES.snjheim&&window.ON&&ON("snjall")?["snjheim"]:[]),...(STPAGES.tilk?["tilk"]:[])].map(k=>mrow("stsub:"+k,STPAGES[k].l,{d:STPAGES[k].d,v:k==="utlit"?({auto:"Sjálfvirkt",light:"Ljóst",dark:"Dökkt"})[THEME]:k==="ms"?(msOn?"Tengt":"Ekki tengt"):""})).join("");
  const co=can("stillingar")?["adgangur","folk","einingar",...(STPAGES.snjfyr&&window.ON&&ON("snjall")?["snjfyr"]:[]),...(STPAGES.pferli&&window.ON&&ON("pferli")?["pferli"]:[]),...(STPAGES.vgreind&&window.ON&&ON("vgreind")?["vgreind"]:[]),"fyrir","vstill",...(window.ON&&(ON("leiga")||ON("sala"))?["tilbod",...(STPAGES.snidmat?["snidmat"]:[])]:[]),"prufa"].map(k=>mrow("stsub:"+k,STPAGES[k].l,{d:STPAGES[k].d,v:k==="folk"&&window.nuUsers?String(nuUsers().filter(u=>u.virkur).length):""})).join(""):"";
  return `<div class="mgroup">Ég</div><div class="mlist">${me}</div>${co?`<div class="mgroup">Fyrirtækið</div><div class="mlist">${co}</div>`:""}
  <div class="mgroup">Gögn og persónuvernd</div><div class="mlist">${STPAGES.personuvernd?mrow("stsub:personuvernd",STPAGES.personuvernd.l,{d:STPAGES.personuvernd.d}):""}${can("stillingar")?mrow("js:syncNow()","Sækja afrit af gögnum",{d:"JSON-skrá með öllum gögnum appsins (aðeins admin – inniheldur persónuupplýsingar)",noch:1}):""}</div>`;}
function vMeira(){const U=window.USER, ini=String(U?.nafn||"").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
  const bs=window.ORG?.pakkaval&&window.barSecs?barSecs():null, rest=bs?SECTIONS.filter(x=>!x.nobar&&!bs.includes(x)):[], c=secCounts();
  const grid=rest.length?`<div class="mgrid">${rest.map(x=>`<button type="button" class="mtile" data-act="tab:${x.tabs[0][0]}">${x.ic}<span>${esc(x.l)}</span>${c[x.k]?`<small>${esc(c[x.k])}</small>`:""}</button>`).join("")}</div>`:"";
  return `${grid}${U?`<div class="mprof"><div class="mav" aria-hidden="true">${esc(U.sk||ini)}</div><div class="grow"><div style="font-size:16px">${esc(U.nafn||U.email)}</div><div class="ls" style="font-size:12.5px;color:var(--muted)">${esc(U.email||"")} · ${esc((window.ROLES?.[U.hlutverk]?.heiti)||"")}</div></div></div>`:""}
  <div class="mlist" style="margin-top:14px">${mrow("tab:stillingar","Stillingar",{ic:EIC('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>')})}${mrow("js:syncNow()","Sækja afrit af gögnum",{ic:EIC('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),noch:1})}</div>
  <button type="button" class="btn" style="width:100%;min-height:52px;margin-top:14px;border-radius:var(--r)" onclick="aeraSignOut()">Skrá út</button>
  <div class="mfoot"><span class="atr"><img class="atrlogo" src="icons/atrium-haus-${document.documentElement.dataset.theme==="light"?"ljos":"dokk"}.svg" alt="${esc(window.VARA?.nafn||"Atrium")}"><span>${esc((window.VARA?.nafn||"Atrium")+" by "+(window.VARA?.fra||"AERA Studio"))+" · v"+esc(APP_VERSION)}</span></span></div>`;}
/* ---------- Stillingar appsins ---------- */
function vStillingarAll(){
  const used=n=>verkefni().filter(p=>p.stada===n).length, usedT=n=>verkefni().filter(p=>(p.thjonusta||[]).includes(n)).length, usedS=sk=>faerslur().filter(e=>(e.starfsmadur||ME())===sk).length;
  const mini=(act,l,aria)=>`<button type="button" class="mini" data-act="${act}" aria-label="${esc(aria||l)}">${l}</button>`;
  const adm=can("stillingar");
  return `<h2 class="big">Stillingar</h2>
  ${window.nuAccountHTML?nuAccountHTML():""}
  <div class="viewtitle">Útlit</div><div class="stat-row">${[["auto","Sjálfvirkt"],["light","Ljóst"],["dark","Dökkt"]].map(([k,l])=>`<button type="button" class="chipbtn" data-act="theme:${k}" aria-pressed="${THEME===k}">${l}</button>`).join("")}</div>
  <p class="hint">Sjálfvirkt: ljóst á tölvu, dökkt í síma. Líka hægt að skipta með hnappinum efst til hægri.</p>
  ${window.msStillingarHTML?msStillingarHTML():""}
  ${window.poSigSettingsHTML?poSigSettingsHTML():""}
  ${adm&&window.rkStillingarHTML?rkStillingarHTML():""}
  ${adm?`<div class="viewtitle">Vinnuvika</div>
  <div class="two" style="align-items:end"><label>Markmið klst. á viku<input id="cfg-vikumark" type="text" inputmode="decimal" value="${esc(num(CFG().vikumark||40))}"></label><button type="button" class="btn" data-act="cfg:vikumark:0" style="min-height:46px">Vista</button></div>`:""}
  <div class="viewtitle">Áminningar</div>
  <p class="hint" style="margin:0 0 8px">Áreiðanlegast er að setja fundi og skil í dagatal símans, sem lætur þig vita. Tilkynningar appsins virka á meðan það er opið eða nýlega opnað.</p>
  <div class="links"><button type="button" class="btn primary" data-act="ics:all">Setja fundi og skil í dagatalið mitt (.ics)</button><button type="button" class="btn" data-act="notif:on">${("Notification" in window)&&Notification.permission==="granted"?"✓ Tilkynningar virkar":"Virkja tilkynningar"}</button></div>
  ${adm?`<div class="viewtitle">Sniðmát undirverka</div>
  <p class="hint" style="margin:0 0 8px">Undirverk sem stofnast sjálfkrafa á nýju verkefni eftir þjónustu. Eitt undirverk í línu.</p>
  ${THJ().map((t,i)=>`<label style="margin-top:8px">${esc(t)}<textarea id="snid-${i}" rows="3">${esc((SNID()[t]||[]).join("\n"))}</textarea></label><button type="button" class="btn" style="margin-top:6px" data-act="cfg:snid:${i}">Vista sniðmát fyrir ${esc(t)}</button>`).join("")}
  <div class="viewtitle">Staða verkefna</div>
  ${STODUR().map((x,i)=>`<div class="cfgrow"><span class="cdot pc-${x.c}"></span><div class="grow">${esc(x.n)} ${x.lokid?'<span class="tag">Lokið</span>':""}<div class="ls" style="font-size:12.5px;color:var(--muted)">${used(x.n)} verkefni</div></div>
    <div class="ctl"><select data-cfgcolor="${i}" aria-label="Litur">${COLORS.map(([k,l])=>`<option value="${k}"${k===x.c?" selected":""}>${l}</option>`).join("")}</select>
    ${mini("cfg:stlok:"+i,x.lokid?"↺":"✓",x.lokid?"Merkja sem í gangi":"Merkja sem lokið")}${mini("cfg:stup:"+i,"↑","Færa ofar")}${mini("cfg:stren:"+i,"✎","Endurnefna")}${mini("cfg:stdel:"+i,"✕","Eyða")}</div></div>`).join("")}
  <button type="button" class="btn" style="margin-top:10px" data-act="cfg:stadd">+ Ný staða</button>
  <p class="hint" style="margin-top:6px">✓ merkir stöðu sem „lokið“: slík verkefni teljast ekki í gangi og fara neðst í listum.</p>
  <div class="viewtitle">${window.ORG?.utlit==="I"?"Verkflokkar":"Þjónusta"}</div>${window.ORG?.utlit==="I"?`<p class="hint" style="margin:0 0 8px">Undirflokkar Þjónustu sem lýsa tegund vinnunnar. Verkefni getur haft einn eða fleiri. Notaðir sem síur í Verkefni › Þjónusta og í skýrslunni „Hvert fer tíminn“.</p>`:""}
  ${THJ().map((x,i)=>`<div class="cfgrow"><div class="grow">${esc(x)}<div class="ls" style="font-size:12.5px;color:var(--muted)">${usedT(x)} verkefni</div></div><div class="ctl">${mini("cfg:thup:"+i,"↑","Færa ofar")}${mini("cfg:thren:"+i,"✎","Endurnefna")}${mini("cfg:thdel:"+i,"✕","Eyða")}</div></div>`).join("")}
  <button type="button" class="btn" style="margin-top:10px" data-act="cfg:thadd">+ ${window.ORG?.utlit==="I"?"Nýr verkflokkur":"Ný þjónusta"}</button>
  <div class="viewtitle">Starfsmenn</div>
  ${STARFS().map((x,i)=>`<div class="cfgrow"><div class="grow">${esc(x.nafn)} <span class="nr">${esc(x.sk)}</span> ${x.sk===ME()?'<span class="tag">Ég</span>':""}<div class="ls" style="font-size:12.5px;color:var(--muted)">${usedS(x.sk)} tímaskráningar</div></div><div class="ctl">${x.sk===ME()||window.USER?"":mini("cfg:sfeg:"+i,"Ég","Merkja sem mig")}${mini("cfg:sfren:"+i,"✎","Endurnefna")}${mini("cfg:sfdel:"+i,"✕","Eyða")}</div></div>`).join("")}
  <button type="button" class="btn" style="margin-top:10px" data-act="cfg:sfadd">+ Nýr starfsmaður</button>
  <p class="hint" style="margin-top:6px">Starfsmenn birtast í tímaskráningu og á verkefnum. Notandi sem bætt er við undir Notendur verður sjálfkrafa starfsmaður.</p>
  ${window.nuStillingarHTML?nuStillingarHTML():""}`:""}
  <div class="viewtitle">Gögn</div><div class="links"><button type="button" class="btn" onclick="syncNow()">Sækja afrit af gögnum</button>${window.USER?"":'<button type="button" class="btn" onclick="aeraSignOut()">Skrá út</button>'}</div>`;
}
const cfgSave=mut=>saveSnapshot(s=>{s.stillingar=s.stillingar||{}; const c=s.stillingar; if(!c.stodur?.length) c.stodur=structuredClone(window.ORG?.stodur?.length?ORG.stodur:DEF_STODUR); if(!c.thjonusta?.length) c.thjonusta=THJ().slice(); if(!c.starfsmenn?.length) c.starfsmenn=structuredClone(DEF_STARF); mut(c,s);});
function cfgAct(a,i){if(!can("stillingar")) return toast("Aðeins admin getur breytt stillingum fyrirtækisins."); i=+i; const ask=(q,d)=>{const v=prompt(q,d||""); return v==null?null:v.trim();};
  if(a==="stadd"){const n=ask("Heiti nýrrar stöðu:"); if(n&&!STODUR().some(x=>x.n===n)) cfgSave(c=>c.stodur.splice(c.stodur.findIndex(x=>x.lokid)<0?c.stodur.length:c.stodur.findIndex(x=>x.lokid),0,{n,c:"blue"}));}
  if(a==="stren"){const o=STODUR()[i]; const n=ask("Nýtt heiti á stöðunni „"+o.n+"“:",o.n); if(n&&n!==o.n&&!STODUR().some(x=>x.n===n)) cfgSave((c,s)=>{c.stodur[i].n=n; s.verkefni.forEach(p=>{if(p.stada===o.n) p.stada=n;});});}
  if(a==="stdel"){const o=STODUR()[i], u=verkefni().filter(p=>p.stada===o.n).length; if(u) return alert(`${u} verkefni eru með stöðuna „${o.n}“. Færðu þau í aðra stöðu fyrst.`); if(STODUR().length<2) return; if(confirm(`Eyða stöðunni „${o.n}“?`)) cfgSave(c=>c.stodur.splice(i,1));}
  if(a==="stup"&&i>0) cfgSave(c=>{const [x]=c.stodur.splice(i,1); c.stodur.splice(i-1,0,x);});
  if(a==="stlok") cfgSave(c=>{c.stodur[i].lokid=!c.stodur[i].lokid;});
  if(a==="thadd"){const n=ask("Heiti nýrrar þjónustu:"); if(n&&!THJ().includes(n)) cfgSave(c=>c.thjonusta.push(n));}
  if(a==="thren"){const o=THJ()[i]; const n=ask("Nýtt heiti á „"+o+"“:",o); if(n&&n!==o&&!THJ().includes(n)) cfgSave((c,s)=>{c.thjonusta[i]=n; s.verkefni.forEach(p=>{if(p.thjonusta) p.thjonusta=p.thjonusta.map(t=>t===o?n:t);});});}
  if(a==="thdel"){const o=THJ()[i], u=verkefni().filter(p=>(p.thjonusta||[]).includes(o)).length; if(confirm(`Eyða þjónustunni „${o}“?`+(u?`\n\nHún verður tekin af ${u} verkefnum.`:""))) cfgSave((c,s)=>{c.thjonusta.splice(i,1); s.verkefni.forEach(p=>{if(p.thjonusta) p.thjonusta=p.thjonusta.filter(t=>t!==o);});});}
  if(a==="thup"&&i>0) cfgSave(c=>{const [x]=c.thjonusta.splice(i,1); c.thjonusta.splice(i-1,0,x);});
  if(a==="sfadd"){const n=ask("Nafn starfsmanns:"); if(!n) return; const sk0=n.split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,3); const sk=ask("Skammstöfun (birtist í tímaskráningum):",sk0); if(sk&&!STARFS().some(x=>x.sk===sk)) cfgSave(c=>c.starfsmenn.push({sk,nafn:n}));}
  if(a==="sfren"){const o=STARFS()[i]; const n=ask("Nafn:",o.nafn); if(n) cfgSave(c=>{c.starfsmenn[i].nafn=n;});}
  if(a==="sfdel"){const o=STARFS()[i], u=faerslur().filter(e=>(e.starfsmadur||ME())===o.sk).length; if(o.sk===ME()) return alert("Ekki er hægt að eyða sjálfum þér."); if(window.nuUsers&&nuUsers().some(u=>u.sk===o.sk&&u.virkur)) return alert(`${o.nafn} er virkur notandi. Gerðu notandann óvirkan undir Notendur fyrst.`); if(u) return alert(`${o.nafn} er með ${u} tímaskráningar og verður ekki eytt.`); if(confirm(`Eyða ${o.nafn}?`)) cfgSave(c=>c.starfsmenn.splice(i,1));}
  if(a==="sfeg") cfgSave(c=>c.starfsmenn.forEach((x,k)=>x.eg=k===i));
  if(a==="vikumark"){const v=parseFloat(String(document.getElementById("cfg-vikumark").value).replace(",",".")); if(v>0&&v<120) cfgSave(c=>{c.vikumark=v;}).then(()=>toast("Vikumarkmið vistað"));}
  if(a==="snid"){const t=THJ()[i], lines=document.getElementById("snid-"+i).value.split("\n").map(x=>x.trim()).filter(Boolean); cfgSave(c=>{c.snidmat=c.snidmat||structuredClone(SNID()); c.snidmat[t]=lines;}).then(()=>toast("Sniðmát vistað"));}
}
document.addEventListener("change",e=>{const i=e.target.dataset?.cfgcolor; if(i!=null&&can("stillingar")) cfgSave(c=>{c.stodur[+i].c=e.target.value;});});
/* ---------- Leit ---------- */
let leitQ="";
const fold=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ð/g,"d").replace(/þ/g,"th").replace(/æ/g,"ae").replace(/ö/g,"o");
let leitF="";
const LEITT=[["verk","Verkefni"],["undir","Undirverk"],["fund","Fundir"],["vsk","Viðskiptavinir"],["tima","Tímaskráning"],["skjal","Skjöl"],["post","Póstar"],["kostn","Kostnaður"],["reikn","Reikningar"],["skrar","Skrár"]];
function leitGroups(q){const w=fold(q).split(/\s+/).filter(Boolean);
  const hit=(...xs)=>{if(!w.length) return true; const t=fold(xs.filter(Boolean).join(" ")); return w.every(x=>t.includes(x));};
  const G={};
  G.verk=verkefni().filter(p=>hit(p.nafn,p.vidskiptavinur,p.verkkaupi,projVk(p)?.name,p.yfirlit,p.lysing)).sort((a,b)=>(isDone(a)-isDone(b))||b.nr.localeCompare(a.nr)).map(p=>lrow("verk:"+p.id,{title:`<span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt)}`,sub:esc([vkName(p)||vsName(p),p.stada].filter(Boolean).join(" · "))}));
  G.undir=verkefni().flatMap(p=>(p.undirverk||[]).map(u=>({u,p}))).filter(({u,p})=>hit(u.heiti,u.lysing,p.stutt)).map(({u,p})=>lrow("sub:"+u.id,{title:`<span class="nr">${esc(u.nr)}</span>&nbsp; ${esc(subName(u))}`,sub:esc([p.stutt,STL[u.stada]||u.stada].filter(Boolean).join(" · "))}));
  G.fund=(S?.fundir||[]).filter(f=>hit(f.name,f.stadsetning,f.verknr,f.lysing)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(f=>lrow("fund:"+f.id,{title:esc(f.name),sub:esc([fmtDate(f.date),f.stadsetning].filter(Boolean).join(" · "))}));
  G.vsk=vskList().filter(c=>hit(c.name,c.tengilidur,c.stadur,c.netfang,c.kennitala)).map(c=>lrow("vsk:"+c.id,{title:esc(c.name),sub:esc([c.tengilidur,c.stadur].filter(Boolean).join(" · "))}));
  G.tima=faerslur().filter(e=>hit(e.lysing,e.nr)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>lrow("time:"+e.id,{title:esc(cleanLys(e.lysing)),sub:esc([fmtDate(e.date),e.nr,hrs(e.timar)].filter(Boolean).join(" · "))}));
  G.skjal=(S?.skjol||[]).filter(x=>x.snid&&hit(x.name,x.mappa,findProj(x.projectId)?.nafn)).map(x=>lrow("skjal:"+x.id,{title:esc(x.name),sub:esc([{word:"Word",excel:"Excel",powerpoint:"PowerPoint",canva:"Canva",tengill:"Tengill"}[x.snid],findProj(x.projectId)?.nr||(x.stadur==="stofa"?"Stofa":"Óflokkað")].filter(Boolean).join(" · "))}));
  G.post=(S?.thraedir||[]).filter(t=>hit(t.efni)).sort((a,b)=>String(b.tengt).localeCompare(String(a.tengt))).map(t=>lrow("verk:"+t.verkefniId,{lead:EI.mail,title:esc(t.efni||"Póstþráður"),sub:esc(["Póstþráður",findProj(t.verkefniId)?.nr].filter(Boolean).join(" · "))}));
  G.kostn=(S?.kostnadur||[]).filter(k=>hit(k.lysing,findProj(k.verkefniId)?.nafn)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(k=>lrow("kostn:"+k.id,{title:esc(k.lysing),sub:esc([fmtDate(k.date),findProj(k.verkefniId)?.nr,kr(k.upphaed)].filter(Boolean).join(" · "))}));
  G.reikn=(S?.reikningar||[]).filter(r=>hit(String(r.nr),r.kaupandi?.name,...(r.linur||[]).map(l=>l.lysing))).sort((a,b)=>(b.nr||0)-(a.nr||0)).map(r=>lrow("reikn:"+r.id,{title:esc("Nr. "+r.nr+" · "+(r.kaupandi?.name||"")),sub:esc([fmtDate(r.dags),kr(r.tot),r.stada].filter(Boolean).join(" · "))}));
  const fl=[]; if(SK?.moppur) Object.entries(SK.moppur).forEach(([pk,m])=>(m.atridi||[]).forEach(dd=>(dd.i||[]).forEach(it=>{if(hit(it.n,dd.n,pk)) fl.push({pk,dd,it});})));
  G.skrar=fl.map(({pk,dd,it})=>`<a class="lrow fl" href="${esc(odUrl([pk,dd.n,it.n],it.t==="f"))}" target="_blank" rel="noopener"><div class="lm"><div class="lt">${it.t==="f"?"":""}${esc(it.n)}</div><div class="ls">${esc(pk+" / "+dd.n)}</div></div></a>`);
  return G;}
function leitResults(q){const w=fold(q).trim(); if(!w&&!leitF) return `<p class="hint" style="margin-top:12px">Skrifaðu leitarorð, eða veldu flokk til að sjá allt í honum.</p>`;
  const G=leitGroups(q), keys=leitF?[leitF]:LEITT.map(t=>t[0]);
  const out=keys.filter(k=>G[k].length).map(k=>{const lab=LEITT.find(t=>t[0]===k)[1], rows=leitF?G[k]:G[k].slice(0,8);
    return `<div class="viewtitle">${lab} <span class="cnt">${G[k].length}</span></div>${llist(rows)}${!leitF&&G[k].length>8?`<button type="button" class="btn" style="width:100%;margin-top:8px" data-act="leitf:${k}">Sýna allar ${G[k].length} niðurstöður í ${lab.toLowerCase()}</button>`:""}`;}).join("");
  return out||`<div class="empty" style="margin-top:12px">Ekkert fannst${w?` fyrir „${esc(q)}“`:""}.</div>`;}
function leitChips(q){const G=leitGroups(q), w=fold(q).trim();
  if(FSEL()) return `<div class="fsels leitf">${fsel([["","Allt"],...LEITT].filter(([k])=>!k||!w||G[k].length||leitF===k).map(([k,l])=>["leitf:"+k,(k?l:"Allar tegundir")+(k&&w?` · ${G[k].length}`:""),leitF===k]),"Tegund")}</div>`;
  return `<div class="stat-row leitf">${[["","Allt"],...LEITT].filter(([k])=>!k||!w||G[k].length||leitF===k).map(([k,l])=>`<button type="button" class="chipbtn" data-act="leitf:${k}" aria-pressed="${leitF===k}">${l}${k&&w?` · ${G[k].length}`:""}</button>`).join("")}</div>`;}
function vLeit(){return `${document.body.classList.contains("ui1")?`<div class="phead leith"><div class="spsup">Leit</div><h2 class="ptitle">Niðurstöður</h2></div>`:""}<div class="leitbox"><input id="leitq" type="search" placeholder="Leita í verkefnum, skjölum, póstum, reikningum…" value="${esc(leitQ)}" autocomplete="off" enterkeyhint="search"><div id="leitchips">${leitChips(leitQ)}</div></div><div id="leitres">${leitResults(leitQ)}</div>`;}
document.getElementById("searchbtn").addEventListener("click",()=>{tab="leit"; DETAIL=null; render(); window.scrollTo({top:0}); setTimeout(()=>document.getElementById("leitq")?.focus(),30);});
document.addEventListener("input",e=>{if(e.target.id!=="leitq") return; leitQ=e.target.value; document.getElementById("leitres").innerHTML=leitResults(leitQ); document.getElementById("leitchips").innerHTML=leitChips(leitQ);});
/* ---------- Vistunarstaða ---------- */
let PENDING=false;
function drawSync(){const el=document.getElementById("syncstat"); if(!el) return; const off=!navigator.onLine;
  el.hidden=!(off||PENDING); el.textContent=off?(PENDING?"Ekkert net · vistast síðar":"Ekkert net"):"Vistar…"; el.classList.toggle("off",off);}
window.addEventListener("online",drawSync); window.addEventListener("offline",drawSync);
/* ---------- Valmynd að neðan ---------- */
const menuwrap=document.getElementById("menuwrap"), mbtn=document.getElementById("mbtn");
function menuCounts(){if(!S) return {};
  const up=upcoming(), late=up.filter(i=>daysTo(i.when)<0).length;
  return {yfirlit:late?"⚠ "+late:"",dagatal:(()=>{const n=(calItems().get(isoDay(today))||[]).length; return n?n+" í dag":"";})(),verk:active().length+" í gangi",undir:verkefni().flatMap(p=>(p.undirverk||[]).filter(u=>u.stada!=="Done")).length+" opin",
    fundir:(S.fundir||[]).filter(f=>daysTo(f.date)>=0).length+" framundan",timar:ON("timar")?num(periodSum(curPeriod()))+" klst.":"",vsk:String(vskList().length||""),skjol:(()=>{const n=window.skCount?skCount():0, t=(S.skjol||[]).filter(x=>x.snid).length; return n?n+" óflokkuð":t?String(t):"";})()};}
// Sími (2.21.0, pakkaval): neðsta stikan sýnir fjóra hluta + Meira; hinir hlutarnir eru í Meira
function barSecs(){const av=SECTIONS.filter(x=>!x.nobar), pick=[]; ["heim","verkefni","pantanir","timar","tilbod","dagatal","bunadur","postur"].forEach(k=>{const x=av.find(y=>y.k===k); if(x&&pick.length<4) pick.push(x);});
  av.forEach(x=>{if(pick.length<4&&!pick.includes(x)) pick.push(x);}); return pick;}
window.barSecs=barSecs;
function drawMenu(){
  const cur=secOf(tab), c=secCounts();
  const html=(cls)=>SECTIONS.filter(x=>!(cls&&x.nobar)).map(x=>`<button type="button" class="tab${cls}" data-tab="${x.tabs[0][0]}"${x===cur&&tab!=="leit"?' aria-current="page"':""} aria-label="${esc(x.l)}">${x.ic}<span class="tl">${x.l}</span><span class="tc">${esc(c[x.k]||"")}</span>${c[x.k+"!"]?'<span class="tdot" aria-hidden="true"></span>':""}</button>`).join("");
  // Tölva (2.14.0, ORG.pakkaval): hliðarvalmyndin flokkuð í Kjarna, Pakka og Tengingar
  const side=()=>{if(!window.ORG?.pakkaval) return html(""); const UI=window.ORG?.utlit==="I", G=UI?{heim:"Mitt",dagatal:"Mitt",timar:"Mitt",verkefni:"Starfsemi",pantanir:"Starfsemi",verkdag:"Starfsemi",bunadur:"Starfsemi",vidsk:"Viðskipti",tilbod:"Viðskipti",fjarmal:"Viðskipti",postur:"Samskipti",spjall:"Samskipti",skjol:"Samskipti"}:{heim:"Kjarni",verkefni:"Kjarni",dagatal:"Verkfæri",timar:"Verkfæri",tilbod:"Verkfæri",pantanir:"Verkfæri",bunadur:"Verkfæri",fjarmal:"Verkfæri",skjol:"Tengingar",postur:"Tengingar",spjall:"Tengingar"}; let last=null;
    // Neðst (2.15.1): Stillingar og notandinn – ekkert annað í hliðarstikunni (klukka, Í dag o.fl. falið með body.pv)
    let ft=document.getElementById("sfoot2"); if(!ft){ft=document.createElement("div"); ft.id="sfoot2"; const sf=document.querySelector(".side .sfoot"); sf?.parentNode.insertBefore(ft,sf);}
    const U=window.USER, ini=(U?.sk||String(U?.nafn||"?").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2)).toUpperCase(), stc=tab==="stillingar", mec=cur?.k==="meira"&&!stc;
    ft.innerHTML=`<button type="button" class="tab" data-tab="stillingar"${stc?' aria-current="page"':""} aria-label="Stillingar">${TABDEF.find(t=>t[0]==="stillingar")[2]}<span class="tl">Stillingar</span></button>`+(U?`<button type="button" class="tab sfu" data-tab="meira"${mec?' aria-current="page"':""} aria-label="Notandi og innskráning"><span class="sfav" aria-hidden="true">${esc(ini)}</span><span class="sfn"><span>${esc(U.nafn||U.email||"")}</span><small>${esc(window.ROLES?.[U.hlutverk]?.heiti||U.hlutverk||"")}</small></span></button>`:"");
    // Leit í efstu stiku, + Nýtt neðst til vinstri og útgáfa neðst fyrir miðju (2.18.2) – föst element, ekki teiknuð upp á nýtt
    if(!document.getElementById("topq")){const w=document.createElement("label"); w.className="topsearch"; w.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="topq" type="search" placeholder="Leita…" aria-label="Leita í Atrium" autocomplete="off">`; ft.parentNode.insertBefore(w,ft);
      const q=w.querySelector("input"); q.addEventListener("input",()=>{leitQ=q.value; if(tab!=="leit"){tab="leit"; DETAIL=null; render();} else {const r=document.getElementById("leitres"); if(r) r.innerHTML=leitResults(leitQ); const c=document.getElementById("leitchips"); if(c) c.innerHTML=leitChips(leitQ);}});
      q.addEventListener("keydown",e=>{if(e.key==="Escape"){q.value=""; leitQ=""; tab="yfirlit"; render(); q.blur();}});
      const nb=document.createElement("button"); nb.type="button"; nb.id="pvnew"; nb.className="btn primary"; nb.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Nýtt`; nb.onclick=()=>openFab(); document.body.appendChild(nb);
      const vv=document.createElement("div"); vv.id="pvver"; vv.textContent="Atrium "+(window.APP_VERSION||(typeof APP_VERSION!=="undefined"?APP_VERSION:"")); document.body.appendChild(vv);}
    {const q=document.getElementById("topq"); if(q&&tab!=="leit"&&document.activeElement!==q&&q.value){q.value="";}}
    if(!ft._l){ft._l=1; ft.addEventListener("click",e=>pickTab(e));}
    // Fljótandi undirflipar (2.18.0, tölva): flipar þess hluta sem er valinn, vinstra megin
    let sn=document.getElementById("subnav2"); if(!sn){sn=document.createElement("nav"); sn.id="subnav2"; sn.setAttribute("aria-label","Undirflipar"); document.body.appendChild(sn); sn.addEventListener("click",e=>{const b=e.target.closest("[data-tab]"); if(!b) return; tab=b.dataset.tab; DETAIL=null; window.STSUB=null; try{localStorage.setItem("aera-tab",tab)}catch(x){} render(); window.scrollTo({top:0});});}
    // Föst vinstri stika (2.18.1, tillaga E6): allir hlutar nema Heim, Leit og Meira – undirflipar + nýlega opnuð verkefni
    const vis=(cur?.tabs||[]).filter(t=>!t[2]), show=!!cur&&cur.k!=="heim"&&cur.k!=="meira"&&tab!=="leit";
    document.body.classList.toggle("hassub",show);
    let rec=[]; try{rec=JSON.parse(localStorage.getItem("aera-recent")||"[]");}catch(x){} const rp=rec.map(findProj).filter(Boolean).slice(0,5);
    const FL={verkefni:[["+ Nýtt verkefni","kind='verk';openSheet()"],...(ON("undirverk")?[["+ Undirverk","kind='undir';openSheet()"]]:[]),["+ Viðskiptavinur","kind='vsk';openSheet()"]],
      dagatal:[["+ Fundur","kind='fund';openSheet()"],...(ON("undirverk")?[["+ Undirverk","kind='undir';openSheet()"]]:[])],
      timar:[...(klukka()?[]:[["▶ Byrja klukku","kind='tima';PREFILL={timer:true};openSheet()"]]),["+ Skrá tíma","kind='tima';openSheet()"],...(ON("kostnadur")?[["+ Útlagður kostnaður","kind='kostn';openSheet()"]]:[])],
      tilbod:[["+ Nýtt tilboð","FAB_EXT.ltilbod?.()"]], pantanir:[["+ Ný pöntun","FAB_EXT.pantanir?.()"],["Útleiguyfirlit","doAct('tab:vutl')"]], bunadur:[...(ON("leiga")?[["+ Leigubúnaður","FAB_EXT.lvorur?.()"]]:[]),...(ON("sala")?[["+ Söluvara","FAB_EXT.svorur?.()"]]:[]),["+ Vinna eða þjónusta","FAB_EXT.vvinna?.()"]],
      fjarmal:[["Óreikningsfært","doAct('tab:trk')"]], skjol:[["+ Nýtt skjal","window.skOpenNew&&skOpenNew(null)"]], postur:[["✉ Nýr póstur","window.poCompose&&poCompose({})"]], spjall:[]}[cur?.k]||[];
    sn.innerHTML=show?`<div class="snh">${esc(cur.l)}</div>${vis.map(([k,l])=>`<button type="button" class="sni" data-tab="${k}"${k===tab||(DETAIL&&k===vis[0][0]&&!vis.some(v=>v[0]===tab))?' aria-current="page"':""}>${esc(l)}</button>`).join("")}
      ${MCP&&FL.length?`<div class="snh" style="margin-top:18px">Flýtileiðir</div>${FL.map(([l,js])=>`<button type="button" class="snf" onclick="${js}">${esc(l)}</button>`).join("")}`:""}
      ${rp.length?`<div class="snh" style="margin-top:18px">Nýlega opnað</div>${rp.map(p=>`<a class="snl" data-open="verk:${esc(p.id)}" role="button" tabindex="0"><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt||"")}</a>`).join("")}`:""}`:"";
    if(!sn._o){sn._o=1; sn.addEventListener("click",e=>{const a=e.target.closest("[data-open]"); if(a){e.preventDefault(); DETAIL=null; openDetail(a.dataset.open);}});}
    return SECTIONS.filter(x=>x.k!=="meira").map(x=>{const g=G[x.k]||""; const hd=g==="_"?"":g&&g!==last?`<div class="sgrp" role="presentation">${g}</div>`:g?"":'<div class="sgrp" role="presentation"></div>'; last=g;
      return hd+`<button type="button" class="tab" data-tab="${x.tabs[0][0]}"${x===cur&&tab!=="leit"?' aria-current="page"':""} aria-label="${esc(x.l)}">${x.ic}<span class="tl">${x.l}</span><span class="tc">${esc(c[x.k]||"")}</span>${c[x.k+"!"]?'<span class="tdot" aria-hidden="true"></span>':""}</button>`;}).join("");};
  document.body.classList.toggle("pv",!!window.ORG?.pakkaval);
  const mob=()=>{if(!window.ORG?.pakkaval) return html(" tb"); const bs=barSecs(), inBar=bs.includes(cur), C=x=>`<button type="button" class="tab tb" data-tab="${x.tabs[0][0]}"${x===cur&&tab!=="leit"?' aria-current="page"':""} aria-label="${esc(x.l)}">${x.ic}<span class="tl">${x.l}</span><span class="tc">${esc(c[x.k]||"")}</span>${c[x.k+"!"]?'<span class="tdot" aria-hidden="true"></span>':""}</button>`;
    const M=SECTIONS.find(x=>x.k==="meira"), rest=SECTIONS.filter(x=>!x.nobar&&!bs.includes(x)), dot=rest.some(x=>c[x.k+"!"]);
    return bs.map(C).join("")+(M?`<button type="button" class="tab tb" data-tab="meira"${(!inBar||cur?.k==="meira")&&tab!=="leit"?' aria-current="page"':""} aria-label="Meira">${M.ic}<span class="tl">${!inBar&&cur&&cur.k!=="meira"?esc(cur.l):"Meira"}</span><span class="tc"></span>${dot?'<span class="tdot" aria-hidden="true"></span>':""}</button>`:"");};
  sideExtra(); document.getElementById("sitems").innerHTML=side(); document.getElementById("tbar").innerHTML=mob();
  const av=document.getElementById("avbtn"); if(av){const U=window.USER; av.textContent=(U?.sk||String(U?.nafn||"?").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2)).toUpperCase(); av.setAttribute("aria-current",cur?.k==="meira"?"page":"false"); av.hidden=!U;}
}
function secCounts(){if(!S) return {}; const up=upcoming(), late=up.filter(i=>daysTo(i.when)<0).length, un=(window.MS_OFL||[]).length;
  return {heim:late?"⚠ "+late:"","heim!":late>0,verkefni:String(active().length||""),dagatal:(()=>{const n=(calItems().get(isoDay(today))||[]).length; return n?n+" í dag":"";})(),timar:ON("timar")?num(periodSum(curPeriod()))+" klst.":"",postur:(()=>{const sp=window.spUnread?spUnread():0; return sp||un?String(sp+un):"";})(),"postur!":un>0||(window.spUnread?spUnread():0)>0,meira:""};}
function sideExtra(){const el=document.getElementById("sextra"); if(!el||!S) return; const k=klukka(); let h="";
  if(k){const q=findProj(k.pid); h+=`<div class="sx-k"><div class="sx-h">Klukka í gangi</div><div class="sx-t">${esc(q?.nafn||"")}</div><b class="kt" data-start="${esc(k.start)}">${elapsed(k)}</b><button type="button" class="klink" data-act="kedit">Frá kl. ${esc(hhmm(k.start))} ✎</button><div class="sx-kb"><button type="button" class="btn primary" onclick="stopKlukka()">Stoppa og skrá</button><button type="button" class="btn sx-kx" data-act="kcancel" title="Hætta við – skrá ekki tímann" aria-label="Hætta við klukku">✕</button></div></div>`;}
  else if(MCP&&ON("timar")) h+=`<button type="button" class="btn sx-start" onclick="kind='tima';PREFILL={timer:true};openSheet()">▶ Byrja klukku</button>`;
  const td=(calItems().get(isoDay(today))||[]).filter(i=>!i.span);
  if(td.length) h+=`<div class="sx-h">Í dag<span class="sx-b">${td.length}</span></div>${td.map(i=>`<a class="sx-i" ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))}><span>${esc(i.title)}</span><small>${esc(i.kind)}${hhmm(i.when)?" · "+hhmm(i.when):""}</small></a>`).join("")}`;
  let rec=[]; try{rec=JSON.parse(localStorage.getItem("aera-recent")||"[]");}catch(e){}
  const rp=rec.map(findProj).filter(Boolean).slice(0,4); if(rp.length) h+=`<div class="sx-h">Nýlega opnað</div>${rp.map(p=>`<a class="sx-i" ${tapAttr("verk",p.id)}><span><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt)}</span></a>`).join("")}`;
  const wt=verkefni().filter(p=>p.stada===STODUR()[0]?.n); if(wt.length) h+=`<div class="sx-h">Bíða svars<span class="sx-b">${wt.length}</span></div>${wt.slice(0,4).map(p=>`<a class="sx-i" ${tapAttr("verk",p.id)}><span><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt)}</span></a>`).join("")}`;
  const act=active().slice(0,6); if(act.length) h+=`<div class="sx-h">Verkefni í gangi</div>${act.map(p=>`<a class="sx-i" ${tapAttr("verk",p.id)}><span><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt)}</span></a>`).join("")}`;
  {const wk0=weekSum(0,STARFS().length>1?ME():null,true), kk=klukka(); h+=`<div class="sx-h">Vikan</div><a class="sx-w tap" data-act="tab:timar" data-wk="${wk0}"${kk?` data-kstart="${esc(kk.start)}"`:""}><b class="wkv">${num(Math.round((wk0+(kk?liveWeekH(kk.start):0))*10)/10)}</b> klst. í vikunni · <b>${num(periodSum(curPeriod()))}</b> á tímabili</a>`;}
  el.innerHTML=h;}
document.getElementById("sextra").addEventListener("click",e=>{const t=e.target.closest("[data-open]"); if(t){e.preventDefault(); const k=t.dataset.open; DETAIL=null; openDetail(k); return;}
  const a=e.target.closest("[data-act]"); if(a){e.preventDefault(); doAct(a.dataset.act,a);}});  // 2.88.4: ✎ (breyta klukku) og aðrir hnappar í vinstri stiku gerðu ekkert
function openMenu(){drawMenu(); menuwrap.hidden=false; mbtn.setAttribute("aria-expanded","true"); document.querySelector('#mitems [aria-current]')?.focus();}
function closeMenu(){menuwrap.hidden=true; mbtn.setAttribute("aria-expanded","false");}
mbtn.addEventListener("click",()=>menuwrap.hidden?openMenu():closeMenu());
document.getElementById("mscrim").addEventListener("click",closeMenu);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menuwrap.hidden){closeMenu(); mbtn.focus();}});
const pickTab=e=>{const b=e.target.closest(".tab"); if(!b) return;
  tab=b.dataset.tab; DETAIL=null; window.STSUB=null; closeMenu(); try{history.replaceState(null,"");}catch(e){} try{localStorage.setItem("aera-tab",tab)}catch(e){}; render(); window.scrollTo({top:0});};
document.getElementById("mitems").addEventListener("click",pickTab); document.getElementById("sitems").addEventListener("click",pickTab); document.getElementById("tbar").addEventListener("click",pickTab);


/* Einingar (2.0.0): admin velur hvaða hlutar eru í notkun. Vistað í S.stillingar.einingar; það sem uppsetningin
   (fyrirtaeki.js › einingar) hefur slökkt á er læst. Sjá kjarni.js. */
/* Pakkar og tengingar (2.14.0, aðeins þar sem ORG.pakkaval): kjarni (alltaf), fimm pakkar með rofa og einingum
   pakkans undir, tengingar. Pakkarofi vistast í S.stillingar.pakkar; einingarofar áfram í S.stillingar.einingar. */
function vPakkar(){const E=window.EININGAR||{}, P=window.PAKKAR||{}, T=window.TENGINGAR||{};
  const sw=(attr,on,dis,lab)=>`<span class="hsw"><input type="checkbox" ${attr} ${on?"checked":""} ${dis||!MCP?"disabled":""} aria-label="${esc(lab)}"><i></i></span>`;
  const sub=k=>{const [l,d,dep]=E[k], last=einLast(k), on=ON(k), depOff=dep&&!ON(dep)&&!(window.PAKKI_AF[dep]===window.PAKKI_AF[k]);
    return `<label class="lrow" style="padding:9px 8px;${last||depOff?"opacity:.6;cursor:default":""}"><div class="lm"><div class="lt" style="font-size:14px">${esc(l)}</div><div class="ls">${esc(d)}${last?" · ekki í boði":depOff?" · krefst "+esc(E[dep][0]):""}</div></div>${sw(`data-ein="${esc(k)}"`,on,last||depOff,l)}</label>`;};
  const pk=([p,[l,d,ein]])=>{const last=pakkiLast(p), on=pakkiOn(p)&&!last;
    return `<div class="card" style="display:flex;flex-direction:column;gap:8px;${on?"":"opacity:.75"}">
      <label style="display:flex;flex-direction:row;align-items:flex-start;gap:12px;text-align:left;font:inherit;color:inherit;cursor:${last?"default":"pointer"}"><div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:500">${esc(l)}</div><div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(d)}</div></div>${sw(`data-pakki="${esc(p)}"`,on,last,l)}</label>
      <div style="font-size:12px;color:var(--muted)">${last?"Ekki í boði í þessari uppsetningu":on&&ein.length&&!ein.some(k=>ON(k))?"Kveikt – en engin eining þess er virk":on?"Virkt":"Slökkt"}</div>
      ${on&&(ein.length>1||!ein.some(k=>ON(k)))?`<div class="llist">${ein.map(sub).join("")}</div>`:""}</div>`;};
  const tg=([p,[l,d,ein,soon]])=>{const last=pakkiLast(p)||!!soon, on=!soon&&pakkiOn(p)&&!pakkiLast(p)&&ein.some(k=>ON(k));
    return `<label class="lrow" style="${last?"opacity:.6;cursor:default":""}"><div class="lm"><div class="lt">${esc(l)}</div><div class="ls">${esc(d)}${soon?" · "+esc(soon):pakkiLast(p)?" · ekki í boði":""}</div></div>${sw(`data-pakki="${esc(p)}"`,on,last,l)}</label>`;};
  const h2=(t,s)=>`<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:22px 0 10px"><h3 style="margin:0;font-size:17px;font-weight:500">${t}</h3><span style="font-size:13px;color:var(--muted)">${s}</span></div>`;
  const kj=(window.KJARNI||[]).map(k=>E[k]?.[0]).filter(Boolean).concat(["Heim","Notendur og hlutverk","Leit","Stillingar"]);
  const dl=E.deildir&&(ON("leiga")||ON("sala"))?`${h2("Stillingar","Valkostir sem stýra framsetningu")}<div class="llist">${sub("deildir")}</div>`:"";
  return `<p class="hint" style="margin:14px 0 4px">Atrium skiptist í kjarna sem er alltaf virkur, verkfæri sem fyrirtækið velur og tengingar við ytri kerfi. Slökktu á því sem fyrirtækið notar ekki – það hverfur úr valmynd, Heim og formum hjá öllum. Gögnin eyðast ekki.</p>
  ${h2("Kjarni","Alltaf virkur")}<div style="display:flex;flex-wrap:wrap;gap:8px">${kj.map(x=>`<span style="font-size:13px;background:var(--raise);border:1px solid var(--line);border-radius:10px;padding:7px 12px">${esc(x)}</span>`).join("")}</div>
  ${h2("Verkfæri","Admin kveikir og slekkur innan þess sem er í boði")}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${Object.entries(P).map(pk).join("")}</div>
  ${h2("Tengingar","Ytri kerfi")}<div class="llist">${Object.entries(T).map(tg).join("")}</div>${dl}`;}
document.addEventListener("change",e=>{const p=e.target?.dataset?.pakki; if(!p) return; if(!can("stillingar")){e.target.checked=!e.target.checked; return toast("Aðeins admin getur breytt einingum.");}
  const v=e.target.checked, G={...(window.PAKKAR||{}),...(window.TENGINGAR||{})}, ein=G[p]?.[2]||[];
  saveSnapshot(s=>{s.stillingar=s.stillingar||{}; s.stillingar.pakkar={...(s.stillingar.pakkar||{}),[p]:v};
    // Kveikt á pakka þar sem engin eining hans er virk (t.d. Búnaður og lager, eða Fjármál ef Reikningar var slökkt): kveikja á þeim öllum (2.36.2)
    if(v&&ein.length&&!ein.some(k=>{const x=(s.stillingar.einingar||{})[k]; return x===true||(x!==false&&x!==0&&!window.EININGAR[k]?.[3]);})) s.stillingar.einingar={...(s.stillingar.einingar||{}),...Object.fromEntries(ein.filter(k=>!einLast(k)).map(k=>[k,true]))};
    // Tenging (2.15.3): kveikt = allar einingar hennar virkar líka (eldri stillingar úr gamla einingalistanum gátu slökkt á þeim stökum)
    if(v&&window.TENGINGAR?.[p]) s.stillingar.einingar={...(s.stillingar.einingar||{}),...Object.fromEntries(ein.filter(k=>!einLast(k)).map(k=>[k,true]))};
  }).then(()=>toast((G[p]?.[0]||p)+(v?" virkt":" slökkt"))).catch(err=>toast(errText(err)));});
function vEiningar(){if(window.ORG?.pakkaval) return vPakkar(); const E=window.EININGAR||{}, sv=S?.stillingar?.einingar||{};
  return `<p class="hint" style="margin:14px 0 10px">Slökktu á því sem fyrirtækið notar ekki – það hverfur úr valmynd, Heim og formum hjá öllum. Gögnin eyðast ekki og birtast aftur ef kveikt er á ný.</p>
  <div class="llist">${Object.entries(E).map(([k,[l,d,dep]])=>{const alltaf=(window.EIN_ALLTAF||[]).includes(k), last=einLast(k), on=ON(k), depOff=dep&&!ON(dep);
    return `<label class="lrow" style="cursor:${alltaf||last?"default":"pointer"};${alltaf||last||depOff?"opacity:.6":""}"><div class="lm"><div class="lt">${esc(l)}</div><div class="ls">${esc(d)}${last?" · óvirkt í þessari uppsetningu":depOff?" · krefst "+esc(E[dep][0]):""}</div></div>
      <span class="hsw"><input type="checkbox" data-ein="${esc(k)}" ${on?"checked":""} ${alltaf||last||depOff||!MCP?"disabled":""} aria-label="${esc(l)}"><i></i></span></label>`;}).join("")}</div>`;}
document.addEventListener("change",e=>{const k=e.target?.dataset?.ein; if(!k) return; if(!can("stillingar")){e.target.checked=!e.target.checked; return toast("Aðeins admin getur breytt einingum.");}
  const v=e.target.checked; saveSnapshot(s=>{s.stillingar=s.stillingar||{}; s.stillingar.einingar={...(s.stillingar.einingar||{}),[k]:v};}).then(()=>toast((window.EININGAR[k]?.[0]||k)+(v?" virkt":" falið"))).catch(err=>toast(errText(err)));});
