/* Tímaskýrslur: dagvinna/yfirvinna, skýrsla á skjá, Excel og PDF, afhending í Mín skjöl
   Hluti af aðalkóða appsins (klofinn úr index.html í 1.9.0). Venjulegt (ekki module) script: allar skrárnar deila
   sömu víðværu breytum og hlaðast í þeirri röð sem index.html telur þær upp. */
/* Dagvinna / yfirvinna: dagvinna kl. 08–16 virka daga (mán–fös, ekki almennir frídagar á Íslandi). Annað er yfirvinna.
   Aðfangadagur og gamlársdagur: dagvinna aðeins 08–13. Færsla án frá–til telst dagvinna á virkum degi, annars yfirvinna. */
const DV_FRA=8*60, DV_TIL=16*60, HOL={};
function holidaysIS(y){if(HOL[y]) return HOL[y]; const a=y%19,b=Math.floor(y/100),c=y%100,dd=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-dd-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  const E=new Date(y,mo-1,da), off=n=>{const x=new Date(E); x.setDate(E.getDate()+n); return isoDay(x);};
  let sum=new Date(y,3,19); while(sum.getDay()!==4) sum.setDate(sum.getDate()+1);
  let ver=new Date(y,7,1); while(ver.getDay()!==1) ver.setDate(ver.getDate()+1);
  return HOL[y]=new Set([`${y}-01-01`,off(-3),off(-2),off(0),off(1),isoDay(sum),`${y}-05-01`,off(39),off(49),off(50),`${y}-06-17`,isoDay(ver),`${y}-12-25`,`${y}-12-26`]);}
function dvWindow(iso){const x=d(iso); if(!x) return null; const wd=x.getDay(); if(wd===0||wd===6||holidaysIS(x.getFullYear()).has(iso)) return null;
  return /-12-(24|31)$/.test(iso)?[DV_FRA,13*60]:[DV_FRA,DV_TIL];}
function splitDY(e){const t=+e.timar||0, day=String(e.date||"").slice(0,10); if(!t) return {d:0,y:0};
  if(!(e.fra&&e.til)) return dvWindow(day)?{d:t,y:0}:{d:0,y:t};
  const a=toMin(e.fra), b0=toMin(e.til), b=b0<=a?b0+1440:b0; let dv=0;
  [[day,a,Math.min(b,1440)],[b>1440?endDayOf(day,e.fra,e.til):null,0,b-1440]].forEach(([iso,s,en])=>{if(!iso||en<=s) return; const w=dvWindow(iso); if(w) dv+=Math.max(0,Math.min(en,w[1])-Math.max(s,w[0]));});
  const tot=b-a, dh=Math.round(t*dv/tot*100)/100; return {d:dh,y:Math.round((t-dh)*100)/100};}
const sumDY=es=>es.reduce((o,e)=>{const x=splitDY(e); o.d+=x.d; o.y+=x.y; return o;},{d:0,y:0});
function buildReport(pred,meta){
  const es=faerslur().filter(e=>!e.live&&pred(e)), ks=kostn().filter(pred).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  // Flokkað eftir verkefnum, eða eftir undirverkum innan verkefna (meta.flokka)
  const groups=new Map(); es.forEach(e=>{const p=findProj(e.verkefniId)||projByNr(e.nr), u=meta.flokka&&e.undirverkId?findSub(e.undirverkId)?.u:null; const k=(p?p.id:"_")+(meta.flokka?"|"+(u?u.id:""):"");
    if(!groups.has(k)) groups.set(k,{p,u,flokka:!!meta.flokka,es:[],label:(p?p.nafn:"Án verkefnis")+(meta.flokka?" › "+(u?u.nr+" "+subName(u):"Án undirverks"):""),st:meta.flokka?(u?u.nr:(p?.nr||"")+" – án undirverks"):(p?.nr||"")}); groups.get(k).es.push(e);});
  const gs=[...groups.values()].sort((a,b)=>String(a.p?.nr||"zz").localeCompare(String(b.p?.nr||"zz"))||String(a.u?.nr||"zz").localeCompare(String(b.u?.nr||"zz")));
  gs.forEach(g=>g.es.sort((a,b)=>String(a.date+(a.fra||"")).localeCompare(String(b.date+(b.fra||"")))));
  return {meta,gs,tot:sumT(es),dy:sumDY(es),n:es.length,ks,ktot:sumK(ks),multi:new Set(es.concat(ks).map(e=>e.starfsmadur||ME())).size>1};
}
let REPARGS=null; const openReportAgain=()=>REPARGS&&openReport(...REPARGS);
function openReport(pred,meta){
  REPARGS=[pred,meta]; REP=buildReport(pred,meta); const R=REP;
  if(!R.n&&!R.ks.length){toast("Engar færslur á völdu bili"); return;}
  const fmtH=n=>num(n), row=e=>{const r=e.undirverkId?findSub(e.undirverkId):null; return `<tr><td>${esc(dIS(String(e.date).slice(0,10)))}</td><td>${esc(r?subName(r.u):"")}</td><td>${esc(cleanLys(e.lysing))}</td><td>${esc(e.fra||"")}</td><td>${esc(e.til||"")}</td>${R.multi?`<td>${esc(e.starfsmadur||ME())}</td>`:""}${dyCells(splitDY(e))}<td class="r">${fmtH(e.timar)}</td></tr>`;};
  const dz=n=>n?fmtH(n):"", dyCells=x=>`<td class="r">${dz(x.d)}</td><td class="r">${dz(x.y)}</td>`, dyG=es=>{const x=sumDY(es); return `<td class="r">${fmtH(x.d)}</td><td class="r">${fmtH(x.y)}</td>`;};
  const cols=(R.multi?7:6)+2;
  sheet.innerHTML=`<h3 id="sheet-h" class="sr">Tímaskýrsla</h3><div class="rep">
    <div class="rh"><div><h4>Tímaskýrsla</h4><div class="rm">${esc(ORG.nafn)} · ${esc(R.meta.bil)}${R.meta.verkefni?" · "+esc(R.meta.verkefni):""}${R.meta.starf?" · "+esc(R.meta.starf):""}</div></div><div class="rm" style="text-align:right">${R.n} færslur<br><b style="font-size:20px;color:var(--ink)">${hrs(R.tot)}</b><br>Dagvinna ${fmtH(R.dy.d)} · Yfirvinna ${fmtH(R.dy.y)}${R.ks.length?`<br>+ ${esc(kr(R.ktot))}`:""}</div></div>
    ${R.n?`<div class="tw"><table><thead><tr><th>Dagsetning</th><th>Undirverk</th><th>Lýsing</th><th>Frá</th><th>Til</th>${R.multi?"<th>Starfsm.</th>":""}<th class="r">Dagv.</th><th class="r">Yfirv.</th><th class="r">Klst.</th></tr></thead><tbody>
    ${R.gs.map(g=>`<tr class="pg"><td colspan="${cols}">${esc(g.label)}</td></tr>${g.es.map(row).join("")}<tr class="st"><td colspan="${cols-3}">Samtals ${esc(g.st)}</td>${dyG(g.es)}<td class="r">${fmtH(sumT(g.es))}</td></tr>`).join("")}
    <tr class="gt"><td colspan="${cols-3}">Samtals</td>${dyG(R.gs.flatMap(g=>g.es))}<td class="r">${fmtH(R.tot)}</td></tr></tbody></table></div>
    <p class="hint" style="margin-top:6px">Dagvinna er kl. 08–16 virka daga (aðfangadag og gamlársdag 08–13). Kvöld, helgar og almennir frídagar teljast yfirvinna.</p>`:""}
    ${R.ks.length?`<div class="viewtitle">Útlagður kostnaður</div><div class="tw"><table><thead><tr><th>Dagsetning</th><th>Verkefni</th><th>Lýsing</th>${R.multi?"<th>Starfsm.</th>":""}<th class="r">Upphæð</th></tr></thead><tbody>
      ${R.ks.map(k=>{const p=findProj(k.verkefniId); return `<tr><td>${esc(dIS(String(k.date).slice(0,10)))}</td><td>${esc(p?.nr||"")}</td><td>${esc(k.lysing||"")}${k.kvittun?` <a class="plink" href="${esc(k.kvittun)}" target="_blank" rel="noopener">🧾</a>`:""}</td>${R.multi?`<td>${esc(k.starfsmadur||ME())}</td>`:""}<td class="r">${esc(kr(k.upphaed))}</td></tr>`;}).join("")}
      <tr class="gt"><td colspan="${R.multi?4:3}">Samtals</td><td class="r">${esc(kr(R.ktot))}</td></tr></tbody></table></div>`:""}
    ${R.gs.length>1?`<div class="viewtitle">Samantekt eftir ${R.meta.flokka?"undirverkum":"verkefnum"}</div><div class="tw sum"><table style="min-width:0"><thead><tr><th></th><th class="r">Dagv.</th><th class="r">Yfirv.</th><th class="r">Klst.</th></tr></thead><tbody>${R.gs.map(g=>`<tr><td>${esc(g.label)}</td>${dyG(g.es)}<td class="r">${fmtH(sumT(g.es))}</td></tr>`).join("")}<tr class="gt"><td>Samtals</td>${dyG(R.gs.flatMap(g=>g.es))}<td class="r">${fmtH(R.tot)}</td></tr></tbody></table></div>`:""}
    ${window.MS&&MS.on()?`<p class="hint" style="margin:14px 0 0">PDF og Excel vistast í <b>Mín skjöl › Tímaskýrslur</b> í OneDrive.</p><label class="chk" style="flex-direction:row;align-items:center;gap:8px;margin-top:6px;color:var(--ink)"><input type="checkbox" id="rep-dl" style="width:auto;min-height:0"> Sækja á tækið í staðinn</label>`:""}
    <div class="actions" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" id="rep-close">Loka</button><button type="button" class="btn" id="rep-prev">Forskoða</button><button type="button" class="btn" id="rep-xlsx">Excel</button><button type="button" class="btn primary" id="rep-pdf">PDF</button></div></div>`;
  sheet.closest(".sheet").classList.add("wide"); sheetwrap.hidden=false;
  document.getElementById("rep-close").onclick=closeSheet; document.getElementById("rep-xlsx").onclick=()=>downloadXlsx(REP); document.getElementById("rep-pdf").onclick=()=>reportPdf(REP); document.getElementById("rep-prev").onclick=()=>reportPreview(REP);
}
async function downloadXlsx(R){ const logo=window.DOK?await DOK.logo().catch(()=>null):null;
  const m=R.multi, S_=(v,s)=>({v,s}), rows=[], merges=[], last=m?"J":"I", r2=n=>Math.round(n*100)/100, DY=(es,st)=>{const x=sumDY(es); return [S_(r2(x.d),st),S_(r2(x.y),st)];};
  rows.push([S_("Tímaskýrsla",1)]); merges.push(`A1:${last}1`);
  rows.push([S_(ORG.nafn,2)]);
  rows.push([S_("Tímabil: "+R.meta.bil+(R.meta.verkefni?"   ·   Verkefni: "+R.meta.verkefni:"")+(R.meta.starf?"   ·   Starfsmaður: "+R.meta.starf:""),2)]);
  rows.push([S_("Útbúið "+dIS(isoDay(new Date()))+"   ·   "+R.n+" færslur   ·   Dagvinna "+num(R.dy.d)+" klst.   ·   Yfirvinna "+num(R.dy.y)+" klst.   (dagvinna kl. 08–16 virka daga)",2)]);
  rows.push([]);
  const head=["Dagsetning","Verknúmer","Undirverk","Lýsing","Frá","Til"].concat(m?["Starfsm."]:[]).map(h=>S_(h,3)); head.push(S_("Dagv.",13),S_("Yfirv.",13),S_("Klst.",13)); rows.push(head);
  const hdrRow=rows.length;
  R.gs.forEach(g=>{rows.push([S_(g.label,7),...Array(m?6:5).fill(S_("",7)),S_("",14),S_("",14),S_("",14)]);
    g.es.forEach(e=>{const r=e.undirverkId?findSub(e.undirverkId):null;
      rows.push([{date:String(e.date).slice(0,10),s:5},S_(e.undirverkId&&r?r.u.nr:(g.p?.nr||e.nr||""),4),S_(r?subName(r.u):"",12),S_(cleanLys(e.lysing),12),S_(e.fra||"",4),S_(e.til||"",4)].concat(m?[S_(e.starfsmadur||ME(),4)]:[]).concat((x=>[S_(x.d||"",6),S_(x.y||"",6)])(splitDY(e)),[S_(Math.round((+e.timar||0)*100)/100,6)]));});
    rows.push([S_("Samtals "+g.st,8),...Array(m?6:5).fill(S_("",8)),...DY(g.es,9),S_(Math.round(sumT(g.es)*100)/100,9)]); rows.push([]);});
  const allEs=R.gs.flatMap(g=>g.es);
  rows.push([S_("Samtals",10),...Array(m?6:5).fill(S_("",10)),...DY(allEs,11),S_(Math.round(R.tot*100)/100,11)]);
  if(R.gs.length>1){rows.push([],[S_("Samantekt eftir "+(R.meta.flokka?"undirverkum":"verkefnum"),3),...Array(m?6:5).fill(S_("",3)),S_("Dagv.",13),S_("Yfirv.",13),S_("Klst.",13)]);
    R.gs.forEach(g=>rows.push([S_(g.label,4),...Array(m?6:5).fill(S_("",4)),...DY(g.es,6),S_(Math.round(sumT(g.es)*100)/100,6)]));
    rows.push([S_("Samtals",10),...Array(m?6:5).fill(S_("",10)),...DY(allEs,11),S_(Math.round(R.tot*100)/100,11)]);}
  if(R.ks.length){rows.push([],[S_("Útlagður kostnaður",7),...Array(m?8:7).fill(S_("",7)),S_("",14)]);
    rows.push(["Dagsetning","Verknúmer","Undirverk","Lýsing","Kvittun","","",""].concat(m?["Starfsm."]:[]).map(h=>S_(h,3)).concat([S_("Upphæð kr.",13)]));
    R.ks.forEach(k=>{const p=findProj(k.verkefniId), r=k.undirverkId?findSub(k.undirverkId):null;
      rows.push([{date:String(k.date).slice(0,10),s:5},S_(r?r.u.nr:(p?.nr||""),4),S_(r?subName(r.u):"",12),S_(k.lysing||"",12),S_(k.kvittun?"Já":"",4),S_("",4),S_("",4),S_("",4)].concat(m?[S_(k.starfsmadur||ME(),4)]:[]).concat([S_(Math.round(+k.upphaed||0),15)]));});
    rows.push([S_("Samtals útlagður kostnaður",10),...Array(m?8:7).fill(S_("",10)),S_(Math.round(R.ktot),17)]);}
  const bytes=makeXlsx({sheet:"Tímaskýrsla",cols:m?[12,11,26,40,7,7,9,9,9,9]:[12,11,26,44,7,7,9,9,9],rows,merges,freezeRow:hdrRow,heights:{0:30},logo,footer:(window.DOK?DOK.coLine()+"   ·   ":"")+"Tímaskýrsla "+R.meta.bil});
  return deliverDoc(bytes,repName(R)+".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Tímaskýrslur/"+repYear(R));
}
/* Afhending skjala (1.8.0): vistað í Mín skjöl í OneDrive ef Microsoft er tengt (og ekki valið að sækja), annars sótt á tækið */
const repName=R=>("Tímaskýrsla "+ORG.nafn+" "+R.meta.bil+(R.meta.verkefni?" "+R.meta.verkefni.split(" ")[0]:"")).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();
const repYear=R=>(String(R.meta.bil).match(/(20\d\d)/g)||[String(new Date().getFullYear())]).pop();
/* Forskoðun skjals sem appið býr til eða sækir (1.9.2): PDF og myndir birtast í glugga, texti sem texti; annað er boðið til niðurhals */
function blobPreview(blob,name,back){
  const url=URL.createObjectURL(blob), t=blob.type||"", ext=(String(name).split(".").pop()||"").toLowerCase();
  const pdf=t==="application/pdf"||ext==="pdf", img=/^image\//.test(t)||/^(png|jpe?g|gif|webp|svg)$/.test(ext), txt=/^text\//.test(t)||/^(txt|csv|md|json)$/.test(ext);
  const body=pdf?`<div id="bp-pdf" class="bppdf" role="document" aria-label="${esc(name)}"><div class="empty">Opna PDF…</div></div>`
    :img?`<img src="${url}" alt="${esc(name)}" style="max-width:100%;max-height:72vh;display:block;margin:0 auto;border-radius:10px">`
    :txt?`<pre id="bp-txt" style="max-height:72vh;overflow:auto;white-space:pre-wrap;font-size:13px;background:var(--raise);padding:12px;border-radius:10px">…</pre>`
    :`<div class="empty">Ekki hægt að forskoða þessa tegund skráar í appinu.</div>`;
  sheet.innerHTML=`<h3 id="sheet-h" class="big" style="font-size:18px;margin:0 0 10px;word-break:break-word">${esc(name)}</h3>${body}
    <div class="actions" style="margin-top:12px"><button type="button" class="btn" id="bp-close">${back?"Til baka":"Loka"}</button><a class="btn primary" href="${url}" download="${esc(name)}">Sækja</a></div>`;
  sheet.closest(".sheet")?.classList.add("wide"); sheetwrap.hidden=false;
  if(pdf) renderPdf(blob,document.getElementById("bp-pdf")).catch(e=>{const el=document.getElementById("bp-pdf"); if(el) el.innerHTML=`<div class="empty">Ekki tókst að birta PDF (${esc(e?.message||"villa")}). Notaðu Sækja.</div>`;});
  if(txt) blob.text().then(x=>{const el=document.getElementById("bp-txt"); if(el) el.textContent=x.slice(0,200000);});
  document.getElementById("bp-close").onclick=()=>{if(back) back(); else closeSheet(); setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
window.blobPreview=blobPreview;
// PDF birt sem myndir af síðum með PDF.js (lib/, Apache 2.0) – virkar eins í öllum vöfrum, líka Android og iOS
let _pdfjs=null;
function loadPdfjs(){return _pdfjs||(_pdfjs=new Promise((ok,no)=>{if(window.pdfjsLib) return ok(window.pdfjsLib); const sc=document.createElement("script"); sc.src="lib/pdfjs.min.js";
  sc.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=new URL("lib/pdfjs.worker.min.js",document.baseURI).href; ok(pdfjsLib);}; sc.onerror=()=>{_pdfjs=null; no(new Error("PDF-lesari hlóðst ekki"));}; document.head.appendChild(sc);}));}
async function renderPdf(blob,box){
  const lib=await loadPdfjs(), doc=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise; if(!box||!box.isConnected) return;
  box.innerHTML=""; const w=Math.max(280,box.clientWidth-16), dpr=Math.min(2,window.devicePixelRatio||1);
  for(let i=1;i<=doc.numPages;i++){ if(!box.isConnected) return; const pg=await doc.getPage(i), v0=pg.getViewport({scale:1}), sc=w/v0.width, v=pg.getViewport({scale:sc*dpr});
    const c=document.createElement("canvas"); c.width=Math.floor(v.width); c.height=Math.floor(v.height); c.style.width=Math.floor(v.width/dpr)+"px"; c.setAttribute("aria-label","Bls. "+i+" af "+doc.numPages);
    box.appendChild(c); await pg.render({canvasContext:c.getContext("2d"),viewport:v}).promise; }
}
async function reportPreview(R){toast("Bý til PDF…"); try{const bytes=await reportPdf(R,true); blobPreview(new Blob([bytes],{type:"application/pdf"}),repName(R)+".pdf",()=>openReportAgain());}catch(e){toast("PDF tókst ekki: "+(e?.message||e));}}
async function deliverDoc(bytes,name,type,sub){
  const dl=document.getElementById("rep-dl")?.checked;
  if(!dl&&window.MS&&MS.on()&&window.odSaveMine){toast("Vista í Mín skjöl…");
    try{const it=await odSaveMine(sub,name,new Blob([bytes],{type}),type); odSavedSheet(it,(ORG.od.mitt||"Atrium")+" › "+sub.replace(/\//g," › ")); return it;}
    catch(e){toast("Vistun í OneDrive tókst ekki ("+(e?.message||"villa")+") – sæki á tækið í staðinn");}}
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([bytes],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); toast("Skjal sótt á tækið");
}
/* ---------- Tímaskýrsla sem PDF (1.7.0) – sama útlit og reikningar (skjalagerd.js) ---------- */
async function reportPdf(R,onlyBytes){
  toast("Bý til PDF…"); let P; try{P=await DOK.pdf();}catch(e){return toast("PDF tókst ekki: "+(e?.message||e));}
  const {C,M,X1}=P, label="Tímaskýrsla "+R.meta.bil, m=R.multi;
  let y=P.head("Tímaskýrsla",[["Tímabil",R.meta.bil],["Verkefni",R.meta.verkefni||"Öll"],["Starfsmaður",R.meta.starf||""],["Útbúið",dIS(isoDay(new Date()))]]);
  const need=h=>{if(y+h>P.H-60){P.doc.addPage(); y=P.contHead(label); return true;} return false;};
  // Samantekt
  [[hrs(R.tot),"klst. alls"],[num(Math.round(R.dy.d*100)/100),"dagvinna"],[num(Math.round(R.dy.y*100)/100),"yfirvinna"],...(R.ks.length?[[kr(R.ktot),"útlagður kostnaður"]]:[])].forEach(([v,l],i)=>{const x=M+i*((X1-M)/4); P.text(v,x,y+4,{w:"light",size:18,color:C.grafit}); P.text(l,x,y+18,{size:8,color:C.stal});});
  y+=40;
  const X={d:M+6,u:M+66,l:M+170,f:m?360:372,t:m?394:410,s:430,dv:m?470:462,yv:m?505:500,k:X1-6};
  const head=()=>{P.rect(M,y,X1-M,20,C.grafit); [["Dags.",X.d],["Undirverk",X.u],["Lýsing",X.l],["Frá",X.f],["Til",X.t],...(m?[["Starfsm.",X.s]]:[]),["Dagv.",X.dv,"right"],["Yfirv.",X.yv,"right"],["Klst.",X.k,"right"]].forEach(([t,x,a])=>P.text(t,x,y+13.5,{w:"medium",size:8,color:C.hvitt,align:a})); y+=20;};
  const dz=n=>n?num(Math.round(n*100)/100):"";
  R.gs.forEach(g=>{need(56); y+=8; P.text(g.label,M,y+10,{w:"medium",size:10,color:C.grafit}); y+=16; head();
    g.es.forEach((e,i)=>{const r=e.undirverkId?findSub(e.undirverkId):null, svc=e.taxti&&window.lidOf&&lidOf(e.taxti)?" ("+lidOf(e.taxti).heiti+")":"", ls=P.wrap(cleanLys(e.lysing)+svc,X.f-X.l-8,8), us=P.wrap(r?subName(r.u):"",X.l-X.u-6,8), h=8+Math.max(ls.length,us.length,1)*11;
      if(need(h)) head(); if(i%2) P.rect(M,y,X1-M,h,C.pappir); const dy=splitDY(e);
      P.text(dIS(String(e.date).slice(0,10)),X.d,y+12,{size:8}); us.forEach((t,j)=>P.text(t,X.u,y+12+j*11,{size:8,color:C.grafit})); ls.forEach((t,j)=>P.text(t,X.l,y+12+j*11,{size:8}));
      P.text(e.fra||"",X.f,y+12,{size:8}); P.text(e.til||"",X.t,y+12,{size:8}); if(m) P.text(e.starfsmadur||"",X.s,y+12,{size:8});
      P.text(dz(dy.d),X.dv,y+12,{size:8,align:"right"}); P.text(dz(dy.y),X.yv,y+12,{size:8,align:"right"}); P.text(num(Math.round((+e.timar||0)*100)/100),X.k,y+12,{size:8,w:"medium",align:"right"});
      y+=h; P.line(M,y,X1,y);});
    const sd=sumDY(g.es); need(18); P.text("Samtals "+g.st,X.d,y+13,{w:"medium",size:8.5}); P.text(dz(sd.d),X.dv,y+13,{size:8.5,w:"medium",align:"right"}); P.text(dz(sd.y),X.yv,y+13,{size:8.5,w:"medium",align:"right"}); P.text(num(Math.round(sumT(g.es)*100)/100),X.k,y+13,{w:"medium",size:8.5,align:"right"}); y+=22;});
  need(34); P.rect(M,y,X1-M,26,C.nott); P.text("Samtals",X.d,y+17,{w:"medium",size:10,color:C.hvitt}); P.text(dz(R.dy.d),X.dv,y+17,{size:9.5,color:C.hvitt,align:"right"}); P.text(dz(R.dy.y),X.yv,y+17,{size:9.5,color:C.hvitt,align:"right"}); P.text(num(Math.round(R.tot*100)/100),X.k,y+17,{w:"medium",size:10,color:C.hvitt,align:"right"}); y+=52;
  if(R.ks.length){need(60); P.text("Útlagður kostnaður",M,y,{w:"light",size:14,color:C.grafit}); y+=12; P.rect(M,y,X1-M,20,C.grafit); [["Dags.",X.d],["Verkefni",X.u],["Lýsing",X.l],["Upphæð",X.k,"right"]].forEach(([t,x,a])=>P.text(t,x,y+13.5,{w:"medium",size:8,color:C.hvitt,align:a})); y+=20;
    R.ks.forEach(k=>{need(18); P.text(dIS(String(k.date).slice(0,10)),X.d,y+12,{size:8}); P.text(findProj(k.verkefniId)?.nr||"",X.u,y+12,{size:8}); P.text(k.lysing||"",X.l,y+12,{size:8}); P.text(kr(k.upphaed),X.k,y+12,{size:8,align:"right"}); y+=17; P.line(M,y,X1,y);});
    need(20); y+=14; P.text("Samtals",X.d,y,{w:"medium",size:9}); P.text(kr(R.ktot),X.k,y,{w:"medium",size:9,align:"right"}); y+=18;}
  need(30); P.wrap("Dagvinna er kl. 08–16 virka daga (aðfangadag og gamlársdag 08–13). Kvöld, helgar og almennir frídagar teljast yfirvinna.",X1-M,7.5).forEach(t=>{P.text(t,M,y,{size:7.5,color:C.stal}); y+=10;});
  if(onlyBytes) return P.finish(label);
  return deliverDoc(P.finish(label),repName(R)+".pdf","application/pdf","Tímaskýrslur/"+repYear(R));
}
