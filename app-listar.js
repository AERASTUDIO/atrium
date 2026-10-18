/* Listasíður: dagatal, viðskiptavinir, verkefni, fundir, tímar
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* ---------- Dagatal ---------- */
let PREFILL=null, calSel=isoDay(today), calMonth=new Date(today.getFullYear(),today.getMonth(),1);
const MONL=["janúar","febrúar","mars","apríl","maí","júní","júlí","ágúst","september","október","nóvember","desember"];
const DAYL=["sunnudagur","mánudagur","þriðjudagur","miðvikudagur","fimmtudagur","föstudagur","laugardagur"];
const CALC={fund:"var(--ink)",skil:"#B4532A",vidb:"#7C8896",undir:"#93A0AD",time:"#C9D1D9"}; // merkjahandbók: tónar af stáli; skil fá dempaðan áherslulit
let _cal={k:null,v:null,m:null};
function calItems(){
  if(_cal.k===S) return _cal.m;
  const m=new Map(), add=(iso,it)=>{const k=String(iso).slice(0,10); if(!/^\d{4}-\d\d-\d\d$/.test(k)) return; (m.get(k)||m.set(k,[]).get(k)).push(it);};
  (S?.fundir||[]).forEach(f=>f.date&&add(f.date,{t:"fund",when:f.date,kind:"Fundur",title:f.name,nr:fundProj(f)?.nr||f.verknr,open:"fund:"+f.id,o:f}));
  verkefni().forEach(p=>{
    if(p.skiladagur) add(p.skiladagur,{t:"skil",when:p.skiladagur,kind:"Skil verkefnis",title:p.stutt,nr:p.nr,open:"verk:"+p.id,o:p,done:isDone(p)});
    if(p.vidburdur) add(p.vidburdur,{t:"vidb",when:p.vidburdur,kind:"Viðburður",title:p.stutt,nr:p.nr,open:"verk:"+p.id,o:p});
    if(p.timabilFra){const a=d(String(p.timabilFra).slice(0,10)), b=d(String(p.timabilTil||p.timabilFra).slice(0,10)); if(a&&b){const x=new Date(a); let i=0;
      while(x<=b&&i++<370){const iso=isoDay(x), first=iso===isoDay(a), last=iso===isoDay(b);
        add(iso,{t:"span",when:first?p.timabilFra:(last&&p.timabilTil?p.timabilTil:iso),kind:first&&last?"Verk":first?"Verk hefst":last?"Verki lýkur":"Verk í gangi",title:p.stutt,nr:p.nr,open:"verk:"+p.id,o:p,span:true});
        x.setDate(x.getDate()+1);}}}
    (p.undirverk||[]).filter(u=>u.skiladagur&&u.stada!=="Done").forEach(u=>add(u.skiladagur,{t:"undir",when:u.skiladagur,kind:"Skil undirverks",title:subName(u)+" · "+p.stutt,nr:u.nr,open:"sub:"+u.id,o:u}));
  });
  m.forEach(l=>l.sort((a,b)=>(a.span-b.span)||String(hhmm(a.when)||"99").localeCompare(String(hhmm(b.when)||"99"))));
  _cal={k:S,m}; return m;}
let calMode="m"; try{const m=localStorage.getItem("aera-calmode"); if(["m","v","d"].includes(m)) calMode=m;}catch(e){}
const calModes=()=>`<div class="seg calseg" role="tablist" aria-label="Sýn">${[["m","Mánuður"],["v","Vika"],["d","Dagur"]].map(([k,l])=>`<button type="button" role="tab" data-act="calmode:${k}" aria-pressed="${calMode===k}">${l}</button>`).join("")}</div>`;
function calCard(i){return `<div class="card tap${i.done?" compact":""}" ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))}><div class="row"><div class="grow"><div class="kind">${esc(i.kind)}${hhmm(i.when)?" · kl. "+hhmm(i.when):""}</div><div class="t">${esc(i.title)}</div>
    <div class="meta">${i.nr?`<span class="nr">${esc(i.nr)}</span>`:""}${i.o?.stadsetning?`<span>${esc(i.o.stadsetning)}</span>`:""}${i.t==="skil"&&i.o?.stada?statusPill(i.o.stada):""}</div>${i.t==="fund"?meetBtn(i.o):""}</div>${CHEV}</div></div>`;}
const CHL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>', CHR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
const calAdd=()=>MCP?`<div class="links"><button type="button" class="btn primary" data-act="caladd:fund">+ Fundur</button><button type="button" class="btn" data-act="caladd:tima">+ Tími</button><button type="button" class="btn" data-act="caladd:undir">+ Undirverk</button><button type="button" class="btn" data-act="caladd:verk">+ Verkefni</button></div>`:"";
const dayTitle=x=>DAYL[x.getDay()][0].toUpperCase()+DAYL[x.getDay()].slice(1)+" "+x.getDate()+". "+MONL[x.getMonth()];
function vCalWeek(){
  const items=calItems(), a=mondayOf(d(calSel)), days=[...Array(7)].map((_,k)=>{const x=new Date(a); x.setDate(a.getDate()+k); return x;}), e=days[6];
  const head=`${a.getDate()}.${a.getMonth()!==e.getMonth()?" "+MON[a.getMonth()]:""} – ${e.getDate()}. ${MON[e.getMonth()]}`;
  return `${calModes()}<div class="cal-head"><h2>${head}</h2><button type="button" class="chipbtn" data-act="calnav:0">Í dag</button>
    <button type="button" class="iconbtn" data-act="calnav:-1" aria-label="Fyrri vika">${CHL}</button><button type="button" class="iconbtn" data-act="calnav:1" aria-label="Næsta vika">${CHR}</button></div>
  <div class="wkcal">${days.map(x=>{const iso=isoDay(x), l=(items.get(iso)||[]).filter(i=>!i.span), sp=(items.get(iso)||[]).filter(i=>i.span);
    return `<section class="wkday${iso===isoDay(today)?" now":""}"><button type="button" class="wkh" data-act="calday:${iso}"><b>${x.getDate()}</b><span>${DAYL[x.getDay()]}</span></button>
    <div class="wkitems">${l.length?l.map(i=>`<a class="wki" ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))} style="--c:${CALC[i.t]||"var(--b2)"}"><span class="wkt">${hhmm(i.when)||esc(i.kind)}</span>${esc(i.title)}</a>`).join(""):`<span class="wke">${sp.length?esc(sp.map(i=>i.title).join(", "))+" í gangi":"–"}</span>`}</div></section>`;}).join("")}</div>
  ${calAdd()}`;
}
function vCalDay(){
  const items=calItems(), x=d(calSel), list=items.get(calSel)||[];
  const tl=faerslur().filter(e=>String(e.date||"").slice(0,10)===calSel).sort((a,b)=>String(a.fra||"99").localeCompare(String(b.fra||"99")));
  const timed=list.filter(i=>!i.span&&hhmm(i.when)), allday=list.filter(i=>!i.span&&!hhmm(i.when)), spans=list.filter(i=>i.span);
  const mins=t=>{const [h,m]=String(t).split(":").map(Number); return h*60+m;};
  const evs=timed.map(i=>{const st=mins(hhmm(i.when)), en=i.o?.dateEnd&&hhmm(i.o.dateEnd)?mins(hhmm(i.o.dateEnd)):st+60; return {st,en:Math.max(en,st+30),i,col:0};});
  const wk=tl.filter(e=>e.fra&&e.til).map(e=>{const st=mins(e.fra); let en=mins(e.til); if(en<=st) en=24*60; return {st,en,e,col:1};});
  const all=[...evs,...wk], h0=Math.min(8,...all.map(v=>Math.floor(v.st/60))), h1=Math.max(18,...all.map(v=>Math.ceil(v.en/60))), PX=48, H=(h1-h0)*PX+24;
  const top=m=>(m-h0*60)/60*PX+24, now=new Date(), isToday=calSel===isoDay(today), nowM=now.getHours()*60+now.getMinutes();
  const grid=`<div class="dgrid" style="height:${H}px"><span class="colh" style="left:52px">Dagskrá</span><span class="colh" style="left:calc(50% + 26px)">Unnið</span>
    ${[...Array(h1-h0+1)].map((_,k)=>`<div class="hr" style="top:${k*PX+24}px">${pad(h0+k)}</div>`).join("")}
    ${evs.map(v=>`<a class="ev" ${tapAttr(v.i.open.split(":")[0],v.i.open.slice(v.i.open.indexOf(":")+1))} style="--c:${CALC[v.i.t]};top:${top(v.st)}px;height:${Math.max(26,(v.en-v.st)/60*PX-3)}px;left:48px;right:calc(50% + 4px)"><b>${esc(v.i.title)}</b><small>${hhmm(v.i.when)}${v.i.o?.stadsetning?" · "+esc(v.i.o.stadsetning):""}</small></a>`).join("")}
    ${wk.map(v=>`<a class="ev" ${tapAttr("time",v.e.id)} style="--c:${CALC.time};top:${top(v.st)}px;height:${Math.max(26,(v.en-v.st)/60*PX-3)}px;left:calc(50% + 22px);right:6px"><b>${esc(cleanLys(v.e.lysing))}</b><small>${v.e.fra}–${v.e.til} · ${esc(v.e.nr||"")}</small></a>`).join("")}
    ${isToday&&nowM>=h0*60&&nowM<=h1*60?`<div class="nowl" style="top:${top(nowM)}px"></div>`:""}</div>`;
  return `${calModes()}<div class="cal-head"><h2>${dayTitle(x)}${isToday?" · í dag":""}</h2><button type="button" class="chipbtn" data-act="calnav:0">Í dag</button>
    <button type="button" class="iconbtn" data-act="calnav:-1" aria-label="Fyrri dagur">${CHL}</button><button type="button" class="iconbtn" data-act="calnav:1" aria-label="Næsti dagur">${CHR}</button></div>
  ${allday.length||spans.length?`<div class="allday">${[...allday,...spans].map(i=>`<a ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))} style="--c:${i.span?"#8796a0":CALC[i.t]}">${esc(i.kind)}: ${esc(i.title)}</a>`).join("")}</div>`:""}
  ${grid}
  ${tl.filter(e=>!(e.fra&&e.til)).length?`<div class="viewtitle">Tímar án klukku</div>${llist(tl.filter(e=>!(e.fra&&e.til)).map(e=>lrow("time:"+e.id,{title:esc(cleanLys(e.lysing)),sub:esc(e.nr||""),right:`<span class="lc">${esc(hrs(e.timar))}</span>`})))}`:""}
  ${calAdd()}`;
}
function vCal(){
  if(calMode==="v") return vCalWeek(); if(calMode==="d") return vCalDay();
  const items=calItems(), y=calMonth.getFullYear(), mo=calMonth.getMonth(), first=new Date(y,mo,1), off=(first.getDay()+6)%7;
  const start=new Date(y,mo,1-off), cells=[]; for(let i=0;i<42;i++){const x=new Date(start); x.setDate(start.getDate()+i); cells.push(x);}
  const rows=cells[35].getMonth()!==mo?35:42;
  const chevL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>', chevR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
  const dayCell=x=>{const iso=isoDay(x), l=items.get(iso)||[], pts=[...new Set(l.filter(i=>!i.span).map(i=>i.t))].slice(0,3), sp=l.some(i=>i.span);
    return `<button type="button" class="cday${x.getMonth()!==mo?" out":""}${iso===isoDay(today)?" today":""}" data-act="cal:${iso}" aria-pressed="${iso===calSel}" aria-label="${x.getDate()}. ${MONL[x.getMonth()]}${l.length?", "+l.length+" atriði":""}"><span class="n">${x.getDate()}</span><span class="dots">${pts.map(t=>`<i style="--c:${CALC[t]}"></i>`).join("")}</span>${(()=>{const ev=l.filter(i=>!i.span); return ev.length?`<span class="clab">${ev.slice(0,3).map(i=>`<em style="--c:${CALC[i.t]}">${esc(i.title)}</em>`).join("")}${ev.length>3?`<em class="more">+${ev.length-3}</em>`:""}</span>`:"";})()}${sp?'<span class="span"></span>':""}</button>`;};
  const sel=d(calSel), list=items.get(calSel)||[];
  const card=i=>`<div class="card tap${i.done?" compact":""}" ${tapAttr(i.open.split(":")[0],i.open.slice(i.open.indexOf(":")+1))}><div class="row"><div class="grow"><div class="kind">${esc(i.kind)}${hhmm(i.when)?" · kl. "+hhmm(i.when):""}</div><div class="t">${esc(i.title)}</div>
    <div class="meta">${i.nr?`<span class="nr">${esc(i.nr)}</span>`:""}${i.o?.stadsetning?`<span>${esc(i.o.stadsetning)}</span>`:""}${i.t==="skil"&&i.o?.stada?statusPill(i.o.stada):""}</div>${i.t==="fund"?meetBtn(i.o):""}</div>${CHEV}</div></div>`;
  return `${calModes()}<div class="cal-head"><h2>${MONL[mo][0].toUpperCase()+MONL[mo].slice(1)} ${y!==today.getFullYear()?y:""}</h2>
    <button type="button" class="chipbtn" data-act="calnav:0">Í dag</button>
    <button type="button" class="iconbtn" data-act="calnav:-1" aria-label="Fyrri mánuður">${chevL}</button><button type="button" class="iconbtn" data-act="calnav:1" aria-label="Næsti mánuður">${chevR}</button></div>
  <div class="cal">${["má","þr","mi","fi","fö","la","su"].map(x=>`<div class="dow">${x}</div>`).join("")}${cells.slice(0,rows).map(dayCell).join("")}</div>
  <div class="legend"><span style="--c:${CALC.fund}">Fundur</span><span style="--c:${CALC.skil}">Skil verkefnis</span><span style="--c:${CALC.undir}">Skil undirverks</span><span style="--c:${CALC.vidb}">Viðburður</span><span style="--c:var(--b2)">Tímabil verks</span></div>
  <div class="viewtitle">${sel?DAYL[sel.getDay()][0].toUpperCase()+DAYL[sel.getDay()].slice(1)+" "+sel.getDate()+". "+MONL[sel.getMonth()]:""}${calSel===isoDay(today)?" · í dag":""}</div>
  ${list.length?`<div class="list">${list.map(card).join("")}</div>`:`<div class="empty">Ekkert skráð þennan dag.</div>`}
  ${MCP?`<div class="links"><button type="button" class="btn primary" data-act="caladd:fund">+ Fundur</button><button type="button" class="btn" data-act="caladd:verk">+ Verkefni</button><button type="button" class="btn" data-act="caladd:undir">+ Undirverk</button></div>`:""}`;
}
let vskFilter="";
function vVsk(){
  const all=vskList(), xs=all;
  let h=`<p class="hint" style="margin:18px 0 8px">${all.length} viðskiptavinir</p>`;
  if(!S?.vidskiptavinir) return h+`<div class="empty">Engir viðskiptavinir ennþá.</div>`;
  if(!xs.length) return h+`<div class="empty">Engir viðskiptavinir.${MCP?" Bættu við með +.":""}</div>`;
  return h+llist(xs.map(c=>{const n=vskProjects(c), act=n.filter(p=>!isDone(p)).length;
    return lrow("vsk:"+c.id,{title:esc(c.name),sub:esc([c.tengilidur,c.stadur].filter(Boolean).join(" · ")),
      right:`<span class="lc">${n.length} verkefni${act?` · ${act} í gangi`:""}</span>`});}));
}
const telA=t=>t?`<a class="plink" href="tel:${esc(String(t).replace(/[^\d+]/g,""))}">${esc(t)}</a>`:"";
const mailA=t=>t?`<a class="plink" href="mailto:${esc(t)}">${esc(t)}</a>`:"";
const webA=t=>t?`<a class="plink" href="${esc(/^https?:/.test(t)?t:"https://"+t)}" target="_blank" rel="noopener">${esc(String(t).replace(/^https?:\/\//,"").replace(/\/$/,""))}</a>`:"";
function dVsk(c){
  const ps=vskProjects(c).sort((a,b)=>(isDone(a)-isDone(b))||b.nr.localeCompare(a.nr));
  const act=ps.filter(p=>!isDone(p)), done=ps.filter(p=>isDone(p));
  const tim=ps.reduce((s,p)=>s+(+p.timar||0),0);
  // Tilboð = verkefni viðskiptavinarins með skráða tilboðsupphæð; reikningar = gefnir út á viðskiptavininn
  const tb=ps.filter(p=>+p.tilbod>0).sort((a,b)=>b.nr.localeCompare(a.nr)), rk=(S?.reikningar||[]).filter(r=>sameId(r.vskId,c.id)||(!r.vskId&&r.kaupandi?.name===c.name));
  const rkT=rk.reduce((a,r)=>a+(+r.tot||0),0), ogr=rk.filter(r=>r.stada!=="Greitt").reduce((a,r)=>a+(+r.tot||0),0);
  const tbRow=p=>lrow("verk:"+p.id,{title:`<span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt||p.nafn)}`,sub:esc([p.stada,p.aklst?num(p.aklst)+" klst. áætlaðar":"",p.timar?num(p.timar)+" klst. skráðar":""].filter(Boolean).join(" · ")),right:`<span class="lc">${esc(kr(p.tilbod))}</span>`});
  return backBar()+`<div class="kicker"><span class="kind">Viðskiptavinur</span></div>
  <h2 class="big" style="margin-top:6px">${esc(c.name)}</h2>
  <p class="sub">${[c.kennitala&&"kt. "+c.kennitala,[c.postnumer,c.stadur].filter(Boolean).join(" ")].filter(Boolean).map(esc).join(" · ")||"Fyrirtæki"}</p>
  <div class="kpis"><div class="card"><b>${act.length}</b><span>verkefni í gangi</span></div><div class="card"><b>${num(tim)}</b><span>klst. alls</span></div>${tb.length?`<div class="card"><b>${esc(kr(tb.reduce((a,p)=>a+(+p.tilbod||0),0)))}</b><span>tilboð · ${tb.length}</span></div>`:""}${rk.length?`<div class="card"><b>${esc(kr(rkT))}</b><span>reikningsfært${ogr?` · ${esc(kr(ogr))} ógreitt`:""}</span></div>`:""}</div>
  <div class="viewtitle">Fyrirtækjaupplýsingar</div><div class="card"><dl class="kv" style="margin:0">${kvRows([
    ["Kennitala",esc(c.kennitala)],["VSK-númer",esc(c.vsknr)],["Heimilisfang",esc(c.heimilisfang)],["Póstnr. og staður",esc([c.postnumer,c.stadur].filter(Boolean).join(" "))],
    ["Sími",telA(c.simi)],["Netfang",mailA(c.netfang)],["Vefsíða",webA(c.vefsida)]])}</dl>${linkBtns({id:c.id},{edit:"vsk"})}</div>
  <div class="viewtitle">Tengiliður</div><div class="card"><dl class="kv" style="margin:0">${kvRows([["Nafn",esc(c.tengilidur)],["Sími",telA(c.simiT)],["Netfang",mailA(c.netfangT)]])}</dl></div>
  ${textCard("Athugasemdir",c.athugasemdir)}
  ${addRow([["verk","+ Verkefni"]])}
  <div class="viewtitle">Verkefni í gangi · ${act.length}</div>${act.length?`<div class="list">${act.map(projCard).join("")}</div>`:`<div class="empty">Engin verkefni í gangi.</div>`}
  <div class="viewtitle">Tilboð · ${tb.length}</div>${tb.length?llist(tb.map(tbRow)):`<div class="empty">Engin tilboð skráð. Tilboðsupphæð er skráð á verkefni.</div>`}
  ${rk.length?rkList(r=>rk.includes(r),"Reikningar"):`<div class="viewtitle">Reikningar · 0</div><div class="empty">Engir reikningar gefnir út á ${esc(c.name)}.</div>`}
  ${done.length?`<div class="viewtitle">Afhent · ${done.length}</div><div class="list">${done.map(projCard).join("")}</div>`:""}`;
}
// Tegund þjónustu (1.7.0): þjónustumerki verkefnisins og verkþáttur úr verðskrá
const svcTags=p=>(p?.thjonusta||[]).filter(Boolean).map(t=>`<span class="stag">${esc(t)}</span>`).join("");
const taxtiTxt=p=>{if(!window.taxtiOf) return ""; if(p?.timagjald) return "Eigið tímagjald"+(can("fjarmal")?" · "+num(p.timagjald)+" kr./klst.":""); const l=taxtiOf(p); return l?l.heiti+(can("fjarmal")?" · "+num(l.verd)+" kr./klst.":""):"";};
const entrySvc=e=>e?.taxti&&window.lidOf&&lidOf(e.taxti)?lidOf(e.taxti).heiti:"";
function projCard(p){
  if(isDone(p)) return `<div class="card tap compact" ${tapAttr("verk",p.id)}><div class="row" style="align-items:center"><div class="grow"><div class="t"><span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt)}</div>
    ${p.thjonusta?.length?`<div class="meta" style="margin-top:2px">${p.thjonusta.map(esc).join(" · ")}</div>`:""}</div>${CHEV}</div></div>`;
  const open=(p.undirverk||[]).filter(u=>u.stada!=="Done").length;
  return `<div class="card tap" ${tapAttr("verk",p.id)}><div class="row"><div class="grow">
    <div class="meta" style="margin:0 0 4px"><span class="nr">${esc(p.nr)}</span>${statusPill(p.stada)}${p.skiladagur?relPill(daysTo(p.skiladagur)):""}${svcTags(p)}</div>
    <div class="t" style="font-size:17px">${esc(p.stutt)}</div>
    <div class="meta">${[vkName(p)||vsName(p),p.timar?hrs(p.timar):"",open?open+(open===1?" opið undirverk":" opin undirverk"):""].filter(Boolean).map(esc).join(" · ")}</div></div>${CHEV}</div></div>`;
}
let vSort="stada"; try{vSort=localStorage.getItem("aera-vsort")||"stada";}catch(e){}
const VSORT=[["stada","Stöðu"],["thjonusta","Þjónustu"],["verkkaupi","Viðskiptavini"],["skiladagur","Skiladegi"],["nr","Verknúmeri"],["klst","Klukkutímum"],["starf","Starfsmanni"]];
function vVerk(){
  const ps=verkefni().slice().sort((a,b)=>b.nr.localeCompare(a.nr));
  const row=p=>lrow("verk:"+p.id,{title:`<span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt)}`,
    sub:esc([vkName(p)||vsName(p),(p.thjonusta||[]).join(", "),p.timar?hrs(p.timar):""].filter(Boolean).join(" · ")),
    right:(isDone(p)?"":budgetPill(p))+(vSort!=="stada"?statusPill(p.stada):"")+(!isDone(p)&&p.skiladagur&&daysTo(p.skiladagur)<=14?relPill(daysTo(p.skiladagur)):"")});
  const act=ps.filter(p=>!isDone(p)), done=ps.filter(isDone);
  const grp=(t,xs,closed)=>xs.length?(closed?`<details class="grp"><summary class="viewtitle">${esc(t)} · ${xs.length}</summary>${llist(xs.map(row))}</details>`:`<div class="viewtitle">${esc(t)} · ${xs.length}</div>${llist(xs.map(row))}`):"";
  const by=(xs,key,order)=>{const m=new Map(); xs.forEach(p=>{[].concat(key(p)).forEach(k=>{k=k||"Óflokkað"; if(!m.has(k)) m.set(k,[]); m.get(k).push(p);});});
    const ks=[...m.keys()].sort((a,b)=>order?((order.indexOf(a)+1||999)-(order.indexOf(b)+1||999)):a.localeCompare(b,"is")); return ks.map(k=>[k,m.get(k)]);};
  let h=`<div class="sortbar"><span>Raða eftir</span><select id="vsort">${VSORT.map(([k,l])=>`<option value="${k}"${k===vSort?" selected":""}>${l}</option>`).join("")}</select></div>`;
  if(vSort==="stada") h+=STODUR().map(st=>grp(st.n,ps.filter(p=>p.stada===st.n),st.lokid)).join("")+grp("Önnur staða",ps.filter(p=>!STODUR().some(x=>x.n===p.stada)),false);
  else if(vSort==="thjonusta") h+=by(act,p=>p.thjonusta?.length?p.thjonusta:["Án þjónustu"],THJ()).map(([k,xs])=>grp(k,xs)).join("")+grp("Lokið",done,true);
  else if(vSort==="verkkaupi") h+=by(act,p=>vsName(p)||vkName(p)||"Án viðskiptavinar").map(([k,xs])=>grp(k,xs)).join("")+grp("Lokið",done,true);
  else if(vSort==="starf") h+=by(act,p=>(p.starfsmenn?.length?p.starfsmenn:[ME()]).map(starfName)).map(([k,xs])=>grp(k,xs)).join("")+grp("Lokið",done,true);
  else {const cmp={skiladagur:(a,b)=>((a.skiladagur?0:1)-(b.skiladagur?0:1))||String(a.skiladagur||"").localeCompare(String(b.skiladagur||"")),nr:(a,b)=>b.nr.localeCompare(a.nr),klst:(a,b)=>(b.timar||0)-(a.timar||0)}[vSort];
    h+=grp("Í gangi",act.slice().sort(cmp))+grp("Lokið",done.slice().sort(cmp),true);}
  return h+(ps.length?"":`<div class="empty">Engin verkefni.</div>`);
}
document.addEventListener("change",e=>{if(e.target.id==="vsort"){vSort=e.target.value; try{localStorage.setItem("aera-vsort",vSort);}catch(x){} render();}});
function vFundir(){
  const fs=(S?.fundir||[]).slice().sort((a,b)=>d(a.date)-d(b.date)); const up=fs.filter(f=>daysTo(f.date)>=0), past=fs.filter(f=>daysTo(f.date)<0).reverse();
  const card=f=>{const x=d(f.date); return lrow("fund:"+f.id,{lead:x?`<b>${x.getDate()}</b><small>${MON[x.getMonth()]}</small>`:"–",title:esc(f.name),
    sub:esc([x?DAY[x.getDay()]+(hhmm(f.date)?" kl. "+hhmm(f.date):""):"",f.stadsetning,fundProj(f)?.nr||f.verknr].filter(Boolean).join(" · ")),
    right:daysTo(f.date)>=0&&daysTo(f.date)<=14?relPill(daysTo(f.date)):""});};
  return `<div class="viewtitle">Framundan · ${up.length}</div>`+(up.length?llist(up.map(card)):`<div class="empty">Engir fundir framundan.</div>`)
    +(past.length?`<div class="viewtitle">Liðnir · ${past.length}</div>${llist(past.map(card))}`:"");
}
function periodLeft(){const e=new Date(today); if(today.getDate()>20) e.setMonth(e.getMonth()+1); e.setDate(20); return Math.round((e-today)/864e5);}
const timeCard=e=>`<div class="card${e.id&&!isTmp(e.id)?" tap":""}" ${e.id&&!isTmp(e.id)?tapAttr("time",e.id):""}><div class="row">${dateBlock(e.date)}<div class="grow"><div class="t">${esc(cleanLys(e.lysing))}</div><div class="meta"><span class="nr">${esc(e.nr||"")}</span>${e.fra?`<span>${esc(e.fra)}${e.til?"–"+esc(e.til):""}</span>`:""}${e.starfsmadur&&e.starfsmadur!==ME()?`<span>${esc(e.starfsmadur)}</span>`:""}${entrySvc(e)?`<span class="stag">${esc(entrySvc(e))}</span>`:""}</div></div><b style="flex:none;font-variant-numeric:tabular-nums;white-space:nowrap">${hrs(e.timar)}</b></div></div>`;
let timFilter="", timStarf="";
const fT=()=>faerslur().filter(e=>!timStarf||(e.starfsmadur||ME())===timStarf);
let weekOff=0;
let wDay=null;
function dayBreakdown(iso){const x=d(iso), es=fT().filter(e=>String(e.date||"").slice(0,10)===iso).sort((a,b)=>String(a.fra||"99").localeCompare(String(b.fra||"99")));
  const tot=es.reduce((t,e)=>t+(+e.timar||0),0), byP={}; es.forEach(e=>{const p=findProj(e.verkefniId)||projByNr(e.nr); const k=p?p.nafn:"Án verkefnis"; byP[k]=(byP[k]||0)+(+e.timar||0);});
  return `<div class="dayb"><div class="viewtitle" style="margin-top:14px">${DAYL[x.getDay()][0].toUpperCase()+DAYL[x.getDay()].slice(1)} ${x.getDate()}. ${MONL[x.getMonth()]} · ${hrs(tot)}</div>
  ${es.length?`${Object.keys(byP).length>1?`<p class="sub" style="margin:-4px 0 8px">${Object.entries(byP).map(([k,v])=>`${esc(k)}: ${hrs(v)}`).join(" · ")}</p>`:""}${llist(es.map(e=>lrow("time:"+e.id,{title:esc(cleanLys(e.lysing)),sub:esc([e.fra?e.fra+(e.til?"–"+e.til:""):"",(findProj(e.verkefniId)||projByNr(e.nr))?.nafn||e.nr].filter(Boolean).join(" · ")),right:`<span class="lc">${esc(hrs(e.timar))}</span>`})))}`:`<div class="empty">Ekkert skráð þennan dag.</div>`}
  ${MCP?`<button type="button" class="btn" style="width:100%;margin-top:8px" data-act="wadd:${iso}">+ Skrá tíma á þennan dag</button>`:""}</div>`;}
function weekBars(){
  const a=mondayOf(today); a.setDate(a.getDate()+7*weekOff); const days=[...Array(7)].map((_,k)=>{const x=new Date(a); x.setDate(a.getDate()+k); return x;});
  const per=days.map(x=>fT().filter(e=>e.date&&String(e.date).slice(0,10)===isoDay(x)).reduce((t,e)=>t+(+e.timar||0),0));
  const max=Math.max(8,...per), tot=per.reduce((t,v)=>t+v,0), end=days[6];
  const lab=weekOff===0?"Þessi vika":weekOff===-1?"Síðasta vika":`${days[0].getDate()}. ${MON[days[0].getMonth()]} – ${end.getDate()}. ${MON[end.getMonth()]}`;
  return `<div class="cal-head" style="margin:22px 0 8px"><h2 style="font-size:17px">${lab} · ${hrs(tot)}</h2>
    <button type="button" class="iconbtn" data-act="week:-1" aria-label="Fyrri vika"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>
    <button type="button" class="iconbtn" data-act="week:1" aria-label="Næsta vika"${weekOff>=0?" disabled":""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button></div>
  <div class="wbars">${days.map((x,k)=>`<button type="button" class="wb${isoDay(x)===isoDay(today)?" now":""}${isoDay(x)===wDay?" sel":""}" data-act="wday:${isoDay(x)}" aria-pressed="${isoDay(x)===wDay}" aria-label="${DAYL[x.getDay()]} ${x.getDate()}. ${MONL[x.getMonth()]}: ${num(per[k])} klst."><span class="wv">${per[k]?num(per[k]):""}</span><i style="height:${Math.max(per[k]?6:2,per[k]/max*100)}%"></i><span class="wd">${["má","þr","mi","fi","fö","la","su"][k]}</span></button>`).join("")}</div>
  ${wDay&&days.some(x=>isoDay(x)===wDay)?dayBreakdown(wDay):`<p class="hint" style="margin-top:6px">Ýttu á dag til að sjá sundurliðun.</p>`}`;
}
function vTimar(sub="vikan"){
  const cur=curPeriod(), all=fT();
  const per=verkefni().map(p=>({p,t:all.filter(e=>e.verkefniId===p.id&&(e.timabil||timabilOf(e.date))===cur).reduce((a,e)=>a+(+e.timar||0),0)})).filter(r=>r.t>0).sort((a,b)=>b.t-a.t); {const tg=all.filter(e=>!e.verkefniId&&(e.timabil||timabilOf(e.date))===cur).reduce((a,e)=>a+(+e.timar||0),0); if(tg>0) per.push({p:null,t:tg});};
  const max=Math.max(1,...per.map(r=>r.t));
  let fl=all.slice().sort((a,b)=>String(b.date+(b.fra||"")).localeCompare(String(a.date+(a.fra||""))));
  if(timFilter) fl=fl.filter(e=>timFilter==="__none"?!e.verkefniId:e.verkefniId===timFilter);
  const groups={}; fl.forEach(e=>{const k=e.timabil||timabilOf(e.date); (groups[k]=groups[k]||[]).push(e);});
  const periods=[...new Set([cur,...all.map(e=>e.timabil||timabilOf(e.date))])];
  const T_chips=`${STARFS().length>1?`<div class="stat-row" style="margin-top:14px"><button type="button" class="chipbtn" data-act="tstarf:" aria-pressed="${!timStarf}">Allir</button>${STARFS().map(x=>`<button type="button" class="chipbtn" data-act="tstarf:${esc(x.sk)}" aria-pressed="${timStarf===x.sk}">${esc(x.nafn)}</button>`).join("")}</div>`:""}`;
  const T_vikan=`${klukkaBanner()}<div class="viewtitle">Tímabil ${esc(cur)}</div>
    ${STARFS().length>1?`<div class="stat-row" style="margin-top:14px"><button type="button" class="chipbtn" data-act="tstarf:" aria-pressed="${!timStarf}">Allir</button>${STARFS().map(x=>`<button type="button" class="chipbtn" data-act="tstarf:${esc(x.sk)}" aria-pressed="${timStarf===x.sk}">${esc(x.nafn)}</button>`).join("")}</div>`:""}
    <div class="kpis"><div class="card"><b>${num(sumT(all.filter(e=>(e.timabil||timabilOf(e.date))===cur)))}</b><span>klst. á tímabili</span></div><div class="card"><b>${periodLeft()}</b><span>dagar eftir af tímabili</span></div></div>
    ${weekBars()}
    <div class="viewtitle">Eftir verkefnum á tímabilinu</div><div class="card list">${per.length?per.map(({p,t})=>`<div class="${p?"tap":""}" ${p?tapAttr("verk",p.id):""}><div class="sub-i"><span>${p?`<span class="nr">${esc(p.nr)}</span> ${esc(p.stutt)}`:"Almennt (án verkefnis)"}</span><b style="font-variant-numeric:tabular-nums">${hrs(t)}</b></div><div class="bar"><i style="width:${t/max*100}%"></i></div></div>`).join(""):`<span style="color:var(--muted)">Engir tímar á tímabilinu.</span>`}</div>`;
  const T_kostn=`    ${(()=>{const ks=kostn().filter(k=>(!timStarf||(k.starfsmadur||ME())===timStarf)&&(!timFilter||k.verkefniId===timFilter)); const cur_=ks.filter(k=>timabilOf(k.date)===cur), old=ks.length-cur_.length;
      return kostnSection(cur_,"Útlagður kostnaður á tímabilinu")+(old?`<p class="hint" style="margin-top:6px">${old} eldri ${old===1?"færsla":"færslur"} (${esc(kr(sumK(ks)-sumK(cur_)))}) sjást á síðu hvers verkefnis og í tímaskýrslu.</p>`:"");})()}`;
  const T_rk=`    ${window.rkTimarSection?rkTimarSection():""}`;
  const T_skyr=`    
    <label>Tímabil<select id="repper">${periods.map(k=>`<option>${esc(k)}</option>`).join("")}<option value="__dagar">Velja dagsetningar…</option></select></label>
    <div class="two" id="repdagar" hidden style="margin-top:10px"><label>Frá<input id="repfra" type="date" value="${isoDay(new Date(today.getFullYear(),today.getMonth(),1))}"></label><label>Til<input id="reptil" type="date" value="${isoDay(today)}"></label></div>
    <label style="margin-top:10px">Verkefni<select id="repproj"><option value="">Öll verkefni</option>${verkefni().slice().sort((a,b)=>b.nr.localeCompare(a.nr)).map(p=>`<option value="${esc(p.id)}">${esc(p.nafn)}</option>`).join("")}</select></label>
    <label style="margin-top:10px" id="repsubw" hidden>Undirverk<select id="repsub"><option value="">Öll undirverk</option></select></label>
    <label class="chk" style="flex-direction:row;align-items:center;gap:8px;margin-top:10px;color:var(--ink)"><input type="checkbox" id="repgrp"> Flokka eftir undirverkum</label>
    ${STARFS().length>1?`<label style="margin-top:10px">Starfsmaður<select id="repstarf"><option value="">Allir</option>${STARFS().map(x=>`<option value="${esc(x.sk)}"${timStarf===x.sk?" selected":""}>${esc(x.nafn)}</option>`).join("")}</select></label>`:""}
    <button type="button" class="btn primary" data-act="report" style="width:100%;margin-top:10px;min-height:46px">Skoða tímaskýrslu</button>
    <p class="hint" style="margin-top:6px">Skýrslan opnast fyrst hér til yfirlestrar. Þaðan er hægt að sækja hana sem Excel-skjal.</p>`;
  const T_faer=`    <div class="viewtitle">Allar færslur</div>
    <label style="margin-bottom:6px">Sía eftir verkefni<select id="timfilter"><option value="">Öll verkefni</option><option value="__none"${timFilter==="__none"?" selected":""}>Án verkefnis (almennt)</option>${verkefni().slice().sort((a,b)=>b.nr.localeCompare(a.nr)).map(p=>`<option value="${esc(p.id)}"${p.id===timFilter?" selected":""}>${esc(p.nafn)}</option>`).join("")}</select></label>
    ${Object.keys(groups).length?Object.entries(groups).map(([k,es])=>`<div class="kind" style="margin:14px 0 8px">${esc(k)} · ${hrs(es.reduce((s,e)=>s+(+e.timar||0),0))}</div><div class="list">${es.map(timeCard).join("")}</div>`).join(""):'<div class="empty">Engar færslur.</div>'}`;
  if(sub==="faer") return T_chips+T_faer+T_kostn;
  if(sub==="skyr") return `<p class="sub" style="margin-top:14px">Veldu tímabil, verkefni og starfsmann. Skýrslan opnast til yfirlestrar og þaðan má sækja hana sem Excel-skjal.</p>`+T_skyr;
  if(sub==="rk") return T_rk||'<div class="empty">Engir reikningar.</div>';
  return T_vikan;
}
document.addEventListener("change",e=>{if(e.target.id==="repper"){const b=document.getElementById("repdagar"); if(b) b.hidden=e.target.value!=="__dagar";}
  if(e.target.id==="repproj"){const p=findProj(e.target.value), w=document.getElementById("repsubw"), sel=document.getElementById("repsub"); if(!w||!sel) return; const us=(p?.undirverk||[]).slice().sort((a,b)=>String(a.nr).localeCompare(String(b.nr)));
    w.hidden=!us.length; sel.innerHTML=`<option value="">Öll undirverk</option>`+us.map(u=>`<option value="${esc(u.id)}">${esc(u.nr)} ${esc(subName(u))}</option>`).join(""); if(us.length){const g=document.getElementById("repgrp"); if(g) g.checked=true;}}});
function reportClick(){const sel=document.getElementById("repper").value, pid=document.getElementById("repproj")?.value||"", pp=pid?findProj(pid):null, sk=document.getElementById("repstarf")?.value||"";
  const sid=pp?document.getElementById("repsub")?.value||"":"", su=sid?findSub(sid)?.u:null, grp=!!document.getElementById("repgrp")?.checked;
  let pred, label;
  if(sel==="__dagar"){const a=document.getElementById("repfra").value, b=document.getElementById("reptil").value; if(!a||!b) return toast("Veldu frá og til dagsetningu."); if(b<a) return toast("„Til“ getur ekki verið á undan „Frá“.");
    pred=e=>{const x=String(e.date||"").slice(0,10); return x>=a&&x<=b;}; label=dIS(a)+" – "+dIS(b);}
  else {pred=e=>(e.timabil||timabilOf(e.date))===sel; label=sel;}
  openReport(e=>pred(e)&&(!pp||e.verkefniId===pp.id||nrMatch(e.nr,pp.nr))&&(!sid||e.undirverkId===sid)&&(!sk||(e.starfsmadur||ME())===sk),{bil:label,verkefni:(pp?.nafn||"")+(su?" › "+su.nr+" "+subName(su):""),starf:sk?starfName(sk):"",flokka:grp||!!sid});}
const dIS=iso=>{const y=d(iso); return y?pad(y.getDate())+"."+pad(y.getMonth()+1)+"."+y.getFullYear():"";};
let REP=null;
