/* simi/rammi.js (2.156.0) – Símarammi U2d fyrir alla skjái sem eiga ekki sérsmíðaðan símaskjá (lotur 2–6).
   Sami haus og á Heim (smámerki + 28 px titill + hringhnappar), hlutaflipar hlutans sem pillur á fölum ferli (eins og hausflipar tölvunnar),
   og efnið sjálft sett upp fyrir síma:
   - Listar tölvunnar (.splist: .phead, .ultool, .ucols, .ugrp, .urow) → leitarpilla, síur sem ferill, línur í spjaldi (heiti 15/600,
     undirlína úr hinum dálkunum, upphæð/stöðupilla hægra megin). Línurnar eru sömu DOM-hnútar (data-open, síun og leit tölvunnar virka áfram).
   - Yfirlitssíður (UI1V.*yf – sömu yfk-lykiltölur og spjöld og á tölvu) í einum dálki.
   - Síður með .uhead/.phead (Tímar, Skýrslur, Skjöl …): hausinn verður símahaus, aðalhnappurinn grafít „+“.
   - Opin atriði sem eiga ekki símaskjá: „‹ <listi>“ efst og efnið í einum dálki.
   Útlit: simi/simi.css („Rammi“). */
(function () {
  if (window.ORG?.simi !== "I" || !window.SM) return;
  const { E, tr, ic } = SM;
  const secs = () => tr(() => SECTIONS, []);
  const okT = k => tr(() => !window.tabOn || tabOn(k), true);
  const secFor = t => secs().find(x => x.tabs.some(q => q[0] === t));
  const labOf = (s, t) => (s?.tabs.find(q => q[0] === t) || [])[1] || s?.l || "";

  // Hlutaflipar: pillur á fölum ferli (sömu og hausflipar tölvunnar)
  SM.track = (t, s = secFor(t)) => {
    const vis = (s?.tabs || []).filter(q => !q[2] && okT(q[0]));
    if (vis.length < 2) return "";
    return `<nav class="smtrack" aria-label="${E(s.l)}">${vis.map(q => `<button type="button" class="${q[0] === t ? "on" : ""}" data-tab="${E(q[0])}"${q[0] === t ? ' aria-current="page"' : ""}>${E(q[1])}</button>`).join("")}</nav>`;
  };
  SM.frameHead = (t, plusAttr = "", plusLabel = "Nýtt") => {
    const s = secFor(t), lab = labOf(s, t);
    const ALL = { "Öll": "Öll " + String(s?.l || "").toLowerCase(), "Allar": "Allar " + String(s?.l || "").toLowerCase(), "Allir": "Allir " + String(s?.l || "").toLowerCase(), "Listi": "Öll " + String(s?.l || "").toLowerCase() };
    const title = (ALL[lab] && ALL[lab].length <= 16 ? ALL[lab] : ALL[lab] ? s.l : "") || lab.replace(/^Yfirlit (verkefna|tilboða|reikninga|tíma)$/, "Yfirlit") || s?.l;
    const sup = s && title !== s.l ? s.l : "";
    return SM.head(E(sup), E(title), `<div class="smhr">${plusAttr ? `<button type="button" class="smib gr" aria-label="${E(plusLabel)}" ${plusAttr}>${ic("plus", 20, 2)}</button>` : ""}${SM.bell()}</div>`);
  };
  const plusFrom = btn => {
    if (!btn) return "";
    const a = btn.getAttribute("data-act"), oc = btn.getAttribute("onclick");
    return a ? `data-act="${E(a)}"` : oc ? `onclick="${E(oc)}"` : "";
  };

  /* ---------- Línur tölvulistans → símalínur ---------- */
  const txt = el => (el?.textContent || "").replace(/\s+/g, " ").trim();
  function rowify(r) {
    if (r.dataset.smr) return;
    const kids = [...r.children], t = r.querySelector(":scope > .t"), right = r.querySelector(":scope > .r");
    const tm = t ? [...t.querySelectorAll(".m")].map(txt) : [];
    let title = t ? txt([...t.childNodes].filter(n => !(n.nodeType === 1 && n.matches(".m"))).reduce((d, n) => (d.append(n.cloneNode(true)), d), document.createElement("span"))) : txt(kids[0]);
    const subs = [...tm, ...kids.filter(k => k !== t && k !== right && !k.matches(".ubox,.ufree") && txt(k)).map(txt)].map(x => x.replace(/^[·•|\s]+|[·•|\s]+$/g, "")).filter(Boolean);
    const pill = right?.querySelector(".upill"), rr = right ? (pill ? pill.outerHTML : `<b>${E(txt(right))}</b>`) : "";
    const free = r.querySelector(":scope > .ufree");
    const all = txt(r);
    r.dataset.k = [r.dataset.k, all].filter(Boolean).join(" ");
    r.innerHTML = `<span class="smrt"><b class="t">${E(title)}</b>${subs.length ? `<small>${E(subs.join(" · "))}</small>` : ""}</span>${free && txt(free) ? `<span class="smfree">${free.innerHTML}</span>` : ""}${rr ? `<span class="smrr">${rr}</span>` : ""}`;
    r.dataset.smr = "1";
  }
  function listify(sl, t) {
    const ph = sl.querySelector(":scope > .phead"), tool = sl.querySelector(":scope > .ultool") || sl;
    const plus = ph?.querySelector(".btn.primary, .pnew");
    sl.querySelectorAll(":scope > .spsup, :scope > .spfoot, :scope > .srchnote, :scope > .ucols, .phead .simsub").forEach(x => x.remove());
    // Leit og síur
    const f = sl.querySelector(".spfilt");
    if (f) { f.classList.add("smsearch"); f.querySelector("kbd")?.remove(); const i = f.querySelector("input"); if (i) i.placeholder = i.placeholder.replace(/…$/, ""); }
    const flt = document.createElement("div"); flt.className = "smflt";
    sl.querySelectorAll(".uchips, .usvbar, .ulbar").forEach(c => { c.classList.add("smtrk2"); flt.append(c); });
    const lastTrk = [...flt.querySelectorAll(".smtrk2")].pop();
    sl.querySelectorAll(".usort, .uflsel").forEach(c => { c.classList.add("smsel"); (lastTrk || flt).append(c); });
    // Línur í spjöldum: nýtt spjald við hvern hópfyrirsögn
    const rows = [...sl.children].filter(c => c.matches(".urow, .ugrp, .uempty, .lrow, .porow, .empty"));
    const wrap = document.createElement("div"); wrap.className = "smlist";
    let card = null;
    rows.forEach(c => {
      if (c.matches(".ugrp") || !card) { card = document.createElement("section"); card.className = "smc smlc"; wrap.append(card); }
      if (c.matches(".urow")) rowify(c);
      if (c.matches(".ugrp") && !txt(c)) { c.remove(); return; }
      card.append(c);
    });
    [...wrap.children].forEach(c => { if (!c.querySelector(".urow, .lrow, .porow, .uempty, .empty")) c.remove(); });
    const head = document.createElement("div"); head.innerHTML = SM.frameHead(t, plusFrom(plus), plus ? txt(plus).replace(/^\+\s*/, "") : "");
    // Leit: hringhnappur í hausnum sem opnar leitarpilluna (opin ef eitthvað er slegið inn) – listinn byrjar ofar
    if (f) { const open = !!(f.querySelector("input")?.value || "").trim() || SM._lq === t; f.classList.toggle("smshut", !open);
      head.querySelector(".smhr")?.insertAdjacentHTML("afterbegin", `<button type="button" class="smib${open ? " on" : ""}" data-smq="1" aria-label="Leita" aria-expanded="${open}">${ic("search")}</button>`); }
    const tk = document.createElement("div"); tk.innerHTML = SM.track(t);
    const keep = [...sl.children].filter(c => !c.matches(".phead, .ultool, .urow, .ugrp, .uempty, .lrow, .porow") && c !== wrap);
    sl.innerHTML = ""; sl.append(...head.children, ...tk.children);
    if (f) sl.append(f);
    if (flt.children.length) sl.append(flt);
    sl.append(wrap, ...keep);
    if (plus) { const hb = sl.querySelector(".smh .smib.gr"); if (hb && !plus.getAttribute("data-act") && !plus.getAttribute("onclick")) hb.addEventListener("click", () => plus.click()); }
    sl.classList.add("smscr", "smfr");
  }

  /* ---------- Síður með .uhead / .phead (ekki listar) ---------- */
  function pagify(v, t) {
    const uh = v.querySelector(":scope > .uhead, :scope > .phead, :scope > div > .uhead:first-child");
    if (!uh) return false;
    const plus = uh.querySelector(".uhr .btn.primary, .phrow .btn.primary, .pnew");
    v.querySelectorAll(".simsub, .seg").forEach(x => { if (x.matches(".simsub") || [...x.querySelectorAll("[data-act^='tab:'],[data-tab]")].length > 1) x.remove(); });
    const extra = [...uh.querySelectorAll(".uhr > :not(.btn.primary), .seg")].filter(x => !x.matches(".spsup, .ptitle"));
    const head = document.createElement("div"); head.innerHTML = SM.frameHead(t, plusFrom(plus), plus ? txt(plus).replace(/^\+\s*/, "") : "") + SM.track(t);
    if (extra.length) { const x = document.createElement("div"); x.className = "smxtra"; extra.forEach(e => x.append(e)); head.append(x); }
    if (plus && !plus.getAttribute("data-act") && !plus.getAttribute("onclick")) head.querySelector(".smh .smib.gr")?.addEventListener("click", () => plus.click());
    uh.replaceWith(...head.childNodes);
    v.classList.add("smpage");
    return true;
  }

  /* ---------- Opið atriði án símaskjás ---------- */
  const BACK = { verk: "Verkefni", sub: "Undirverk", tb: "Til baka", reikn: "Reikningar", vsk: "Viðskiptavinir", vara: "Vörulisti", fund: "Fundir", time: "Tímar", kostn: "Tímar", post: "Póstur", doc: "Skjöl" };
  function detify(v, D) {
    if (v.querySelector(":scope > .smdnav")) return;
    const k = String(D).split(":")[0], s = secFor(tr(() => tab, "")), lab = s && s.k !== "heim" ? s.l : BACK[k] || "Til baka";
    v.querySelectorAll(".spx, .backbtn, .uback, .spwin, .spexp, .spshr, [data-ui1='close']").forEach(b => b.style.display = "none");
    // Opið verkefni (S3): lykiltölur 2×2 fremst (+ Skil), Næsta skref ber aðgerðirnar – engin aukastika neðst
    if (k === "verk") tr(() => {
      const tl = v.querySelector(".vs3tiles"), r1 = v.querySelector(".vs3r1");
      const p = tr(() => findProj(String(D).slice(5)), null);
      if (tl && p && !tl.querySelector(".smskil")) { const n = p.skiladagur ? tr(() => daysTo(p.skiladagur), null) : null;
        tl.insertAdjacentHTML("beforeend", `<button type="button" class="vs3t smskil" data-act="dtab:undir"><span class="vs3tx"><small>Skil</small><b>${p.skiladagur ? E(tr(() => fmtDate(p.skiladagur), p.skiladagur).replace(/\.\d{4}$/, "")) : "–"}</b></span><span class="vs3ts">${n == null ? "Enginn skiladagur" : n < 0 ? `${-n} d. fram yfir` : n === 0 ? "í dag" : `eftir ${n} ${n === 1 ? "dag" : "daga"}`}</span></button>`);
        if (n != null && n < 0) tl.querySelector(".smskil").classList.add("late"); }
      if (tl && r1 && tl.compareDocumentPosition(r1) & Node.DOCUMENT_POSITION_PRECEDING) r1.before(tl);
      if (v.querySelector(".vs3nx .vs3bs")) { document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact"); }
    }, 0);
    if (k === "reikn") v.querySelectorAll(".ukp").forEach(x => { if (/^Staða/.test(txt(x)) && v.querySelector(".ustsel")) x.remove(); });
    v.insertAdjacentHTML("afterbegin", `<div class="smdnav"><button type="button" class="smback" data-smback="1" aria-label="Til baka – ${E(lab)}">${ic("back", 20)}<span>${E(lab)}</span></button></div>`);
    v.classList.add("smdetv");
  }
  document.addEventListener("click", e => { const q = e.target.closest("[data-smq]"); if (!q || !SM.phone()) return; e.preventDefault(); e.stopPropagation();
    const sl = q.closest(".splist"), f = sl?.querySelector(".spfilt"); if (!f) return; const shut = !f.classList.toggle("smshut"); SM._lq = shut ? tr(() => tab, "") : null;
    q.classList.toggle("on", shut); q.setAttribute("aria-expanded", String(shut)); const i = f.querySelector("input"); if (shut) i?.focus(); else if (i?.value) { i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); } }, true);
  document.addEventListener("click", e => { const b = e.target.closest("[data-smback]"); if (!b || !SM.phone()) return; e.preventDefault(); e.stopPropagation(); tr(() => goBack(), 0); }, true);

  /* ---------- Yfirlitssíður (UI1V) ---------- */
  const YF = new Set(["verkyf", "tbyf", "tbfer", "rkyf", "timyf", "pnyf", "vskyf"]);
  SM.screens.push((t, D) => {
    if (D || !YF.has(t) || !window.UI1V?.[t]) return null;
    const tmp = document.createElement("div"); tmp.innerHTML = UI1V[t]();
    const uh = tmp.querySelector(".uhead"), plus = uh?.querySelector(".btn.primary"); uh?.remove();
    return `<div class="smscr smfr smyf">${SM.frameHead(t, plusFrom(plus), plus ? txt(plus).replace(/^\+\s*/, "") : "")}${SM.track(t)}<div class="smyfb">${tmp.innerHTML}</div></div>`;
  });

  /* ---------- Tenging ---------- */
  SM.adapt.push((v, t, D) => {
    document.body.classList.add("smfr");
    v.classList.remove("smpage", "smdetv");
    if (D) { document.body.classList.add("smfrd", "smdet"); detify(v, D); return; }
    // Spjall: listinn fær símahausinn; opið samtal er ýttur skjár (engin neðri stika, lyklaborðið felur ekki innsláttinn)
    const sw = v.querySelector(".spwrap");
    if (sw) { sw.querySelector(".spchans > .phead .ptitle")?.closest(".phrow")?.remove();
      if (sw.classList.contains("simspc")) { document.body.classList.add("smdet"); v.querySelector(":scope > .smh, :scope > .smtrack")?.remove(); v.querySelectorAll(":scope > .smh, :scope > .smtrack").forEach(x => x.remove()); return; }
      if (!pagify(v, t) && !v.querySelector(".smh")) v.insertAdjacentHTML("afterbegin", SM.frameHead(t) + SM.track(t)); return; }
    const sl = v.querySelector(".splist");
    if (sl) { listify(sl, t); return; }
    if (!pagify(v, t)) { const s = secFor(t); if (s && s.k !== "heim" && !v.querySelector(".smh")) {
      // aðalhnappur síðunnar („+ Verk“, „+ Fundur“ …) verður grafít „+“ í hausnum
      const pb = [...v.querySelectorAll(".btn.primary, .pnew")].find(b => /^\+/.test(txt(b)) && b.offsetParent !== null);
      v.insertAdjacentHTML("afterbegin", SM.frameHead(t, plusFrom(pb), pb ? txt(pb).replace(/^\+\s*/, "") : "") + SM.track(t));
      if (pb) { pb.style.display = "none"; if (!pb.getAttribute("data-act") && !pb.getAttribute("onclick")) v.querySelector(".smh .smib.gr")?.addEventListener("click", () => pb.click()); } } }
  });
  SM.after.push((v, t, D) => { if (!D && v.querySelector(".smyf")) document.body.classList.add("smfr"); });
})();
