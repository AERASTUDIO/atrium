/* Sniðmát og afritun tilboða og pantana (2.78.0)
   - Sniðmát: vistuð grunnútgáfa af tilboði eða pöntun (línur, afsláttur, athugasemd, staðsetning, afhending; viðskiptavinur ef valið).
     Geymt í S.stillingar.snidmat = [{ id, heiti, teg: "tilbod"|"pontun"|"baedi", heitiS, linur, afsl, athugasemd, stadsetning,
     afhending, afhStadur, vidskFylgir, vskId, vidskiptavinur, tengilidur, simi, netfang, stofnad, af }].
     Eldri pöntunarsniðmát (S.stillingar.pantanir.snid) birtast líka og má nota áfram.
   - „Byrja út frá“ efst í Nýtt tilboð / Ný pöntun: autt, sniðmát eða eldra tilboð/pöntun (leit). Línur fá ný auðkenni og núgildandi
     verð úr vörulista (sala.js › applyBase); dagsetningar, staða, undirskriftir og greiðslur fylgja aldrei.
   - ⋯ á tilboði og pöntun: Vista sem sniðmát · Nýtt tilboð út frá þessu · Ný pöntun út frá þessu.
   - Stillingar › Sniðmát: endurnefna, breyta tegund, eyða. */
(() => {
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tr = (f, d) => { try { return f(); } catch (e) { return d; } };
  const gid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
  const A = () => window.salaAPI;
  const ON2 = () => tr(() => window.ON && (ON("leiga") || ON("sala")), false);
  const PNON = () => tr(() => !!(window.ON && ON("pferli")) || !!A()?.PN, false);
  const ed = () => tr(() => !!MCP, true);
  const me = () => tr(() => (window.ME?.email || window.USER?.email || window.msUser?.username || "").toLowerCase(), "");
  const kr = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " kr.";
  const dg = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${+m[3]}.${+m[2]}.${m[1]}` : ""; };
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o");
  const TEG = { tilbod: "Tilboð", pontun: "Pöntun", baedi: "Tilboð og pöntun" };

  const NEW = () => tr(() => S.stillingar.snidmat, null) || [];
  const OLD = () => tr(() => S.stillingar.pantanir.snid, null) || [];
  const LIST = kind => [...NEW().map(s => ({ ...s, _old: false })), ...OLD().map(s => ({ ...s, teg: "pontun", heitiS: s.heitiP, vidskFylgir: !!(s.vskId || s.vidskiptavinur), _old: true }))]
    .filter(s => !kind || s.teg === "baedi" || s.teg === kind).sort((a, b) => String(a.heiti).localeCompare(String(b.heiti), "is"));
  const nLin = x => (x.linur || []).filter(l => !l.aukagjald).length;
  const docs = () => { const a = A(); if (!a) return []; return [...(a.TB?.() || []).filter(x => !x.pontun).map(x => ({ ...x, _k: "tilbod" })), ...(a.PN?.() || []).map(x => ({ ...x, _k: "pontun" }))]; };
  const findDoc = id => docs().find(x => String(x.id) === String(id));

  // Grunnur fyrir nýtt skjal (lesið af sala.js › applyBase og formunum)
  const fromTpl = s => ({ src: "snid", id: s.id, snHeiti: s.heiti, heiti: s.heitiS || "", linur: structuredClone(s.linur || []), afsl: +s.afsl || 0, athugasemd: s.athugasemd || null, stadsetning: s.stadsetning || null,
    afhending: s.afhending || null, afhStadur: s.afhStadur || null, svid: s.svid || null, deild: s.deild || null,
    ...(s.vidskFylgir ? { vskId: s.vskId || null, vidskiptavinur: s.vidskiptavinur || null, tengilidur: s.tengilidur || null, simi: s.simi || null, netfang: s.netfang || null } : {}) });
  const fromDoc = T => ({ src: T._k || (T.pontun ? "pontun" : "tilbod"), id: T.id, nr: T.nr || null, heiti: T.heiti || "", linur: structuredClone((T.linur || []).filter(l => !l.aukagjald)), afsl: +T.afsl || 0,
    athugasemd: T.athugasemd || null, stadsetning: T.stadsetning || null, afhending: T.afhending || null, afhStadur: T.afhStadur || null, svid: T.svid || null, deild: T.deild || null,
    vskId: T.vskId || null, vidskiptavinur: T.vidskiptavinur || null, tengilidur: T.tengilidur || null, simi: T.simi || null, netfang: T.netfang || null });

  function modal(label, html) {
    const w = document.createElement("div"); w.className = "qrcard pfm snm"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", label);
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${E(label)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>${html}</div>`;
    document.body.append(w); document.body.classList.add("qropen");
    let done = null; const P = new Promise(r => done = r);
    const close = v => { if (!w.isConnected) return; w.remove(); if (!document.querySelector(".qrcard")) document.body.classList.remove("qropen"); done(v ?? null); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(null); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); close(null); } });
    setTimeout(() => (w.querySelector("input,[data-sp]") || w.querySelector("button"))?.focus(), 30);
    return { w, close, P };
  }

  /* ---------- Val: sniðmát eða eldra skjal ---------- */
  function pickTpl(kind) {
    const L = LIST(kind);
    const { w, close, P } = modal("Velja sniðmát", L.length ? `<div class="snlist">${L.map(s => `<button type="button" class="snit" data-sp="${E(s.id)}"><b>${E(s.heiti)}</b><small>${nLin(s)} línur · ${E(TEG[s.teg] || "")}${s.vidskFylgir && s.vidskiptavinur ? " · " + E(s.vidskiptavinur) : ""}</small></button>`).join("")}</div>`
      : `<p class="pfhint">Engin sniðmát enn. Opnaðu tilboð eða pöntun, veldu ⋯ › „Vista sem sniðmát“.</p><div class="pfact"><button type="button" class="btn" data-x="1">Loka</button></div>`);
    w.querySelectorAll("[data-sp]").forEach(b => b.onclick = () => { const s = L.find(x => String(x.id) === b.dataset.sp); close(s ? fromTpl(s) : null); });
    return P;
  }
  function pickDoc(kind) {
    const all = docs().sort((a, b) => String(b.dags || b.fra || "").localeCompare(String(a.dags || a.fra || "")));
    const { w, close, P } = modal("Afrita eldra tilboð eða pöntun", `<input type="search" class="snq" placeholder="Leita eftir númeri, heiti eða viðskiptavini" aria-label="Leita">
      <div class="snseg" role="group" aria-label="Sía">${[["", "Allt"], ["tilbod", "Tilboð"], ["pontun", "Pantanir"]].map(([v, l]) => `<button type="button" class="uchip${v === "" ? " on" : ""}" data-f="${v}">${l}</button>`).join("")}</div>
      <div class="snlist snres"></div><p class="pfhint snnote">Línur og verð úr vörulista fylgja – dagsetningar, staða, undirskriftir og greiðslur ekki.</p>`);
    let f = "", q = "";
    const draw = () => { const qq = fold(q), xs = all.filter(x => (!f || x._k === f) && (!qq || fold([x.nr, x.heiti, x.vidskiptavinur, x.tengilidur, x.stadsetning].join(" ")).includes(qq))).slice(0, 40);
      w.querySelector(".snres").innerHTML = xs.length ? xs.map(x => { const net = tr(() => A().totals(x).tot, 0);
        return `<button type="button" class="snit" data-sp="${E(x.id)}"><b><span class="snnr">${E(x.nr || "")}</span> ${E(x.heiti || "")}</b><small>${E([x.vidskiptavinur || x.tengilidur, dg(x.fra || x.dags), x.stada, nLin(x) + " línur", net ? kr(net) + " m. vsk" : ""].filter(Boolean).join(" · "))}</small></button>`; }).join("") : `<p class="pfhint">Ekkert fannst.</p>`; };
    w.querySelector(".snq").oninput = e => { q = e.target.value; draw(); };
    w.querySelector(".snseg").onclick = e => { const b = e.target.closest("[data-f]"); if (!b) return; f = b.dataset.f; w.querySelectorAll(".snseg [data-f]").forEach(x => x.classList.toggle("on", x === b)); draw(); };
    w.querySelector(".snres").onclick = e => { const b = e.target.closest("[data-sp]"); if (!b) return; const x = findDoc(b.dataset.sp); close(x ? fromDoc(x) : null); };
    draw(); return P;
  }
  window.snPick = (kind, mode) => mode === "snid" ? pickTpl(kind) : pickDoc(kind);

  /* ---------- Vista sem sniðmát ---------- */
  async function save(id) {
    const T = findDoc(id); if (!T) return; const kind = T.pontun ? "pontun" : "tilbod";
    const { w, close, P } = modal("Vista sem sniðmát", `<label class="snlab">Heiti sniðmáts<input class="snh" value="${E(T.heiti || (kind === "pontun" ? "Pöntun" : "Tilboð"))}"></label>
      <div class="snlab">Nota fyrir</div><div class="snseg snteg" role="group" aria-label="Nota fyrir">${(PNON() ? ["tilbod", "pontun", "baedi"] : ["tilbod"]).map(v => `<button type="button" class="uchip${v === "baedi" || !PNON() ? " on" : ""}" data-t="${v}">${TEG[v]}</button>`).join("")}</div>
      <label class="snchk"><input type="checkbox" class="snv"${T.vidskiptavinur || T.vskId ? "" : " disabled"}> Viðskiptavinur fylgir${T.vidskiptavinur ? ` <small>(${E(T.vidskiptavinur)})</small>` : ""}</label>
      <p class="pfhint">${nLin(T)} línur, afsláttur, athugasemd${T.stadsetning ? ", staðsetning" : ""}${kind === "pontun" ? " og afhendingarmáti" : ""} fylgja. Dagsetningar, staða og greiðslur fylgja ekki.</p>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" data-ok="1">Vista sniðmát</button></div>`);
    let teg = PNON() ? "baedi" : "tilbod";
    w.querySelector(".snteg").onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; teg = b.dataset.t; w.querySelectorAll(".snteg [data-t]").forEach(x => x.classList.toggle("on", x === b)); };
    w.querySelector("[data-ok]").onclick = () => close({ heiti: w.querySelector(".snh").value.trim(), teg, v: w.querySelector(".snv").checked });
    w.querySelector(".snh").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); w.querySelector("[data-ok]").click(); } };
    const r = await P; if (!r) return; if (!r.heiti) { toast("Gefðu sniðmátinu heiti"); return save(id); }
    const b = fromDoc(T), N = { id: gid(), heiti: r.heiti, teg: r.teg, heitiS: T.heiti || "", linur: b.linur.map(l => { const x = { ...l }; delete x.eintok; delete x.skannad; delete x.tinsla; return x; }), afsl: b.afsl, athugasemd: b.athugasemd,
      stadsetning: b.stadsetning, afhending: b.afhending, afhStadur: b.afhStadur, svid: b.svid, deild: b.deild, vidskFylgir: !!r.v, ...(r.v ? { vskId: b.vskId, vidskiptavinur: b.vidskiptavinur, tengilidur: b.tengilidur, simi: b.simi, netfang: b.netfang } : {}),
      ur: { teg: b.src, nr: b.nr }, stofnad: new Date().toISOString(), af: me() || null };
    try { await saveSnapshot(s => { s.stillingar = s.stillingar || {}; (s.stillingar.snidmat = s.stillingar.snidmat || []).push(N); }); toast("Sniðmát „" + r.heiti + "“ vistað"); }
    catch (e) { toast(window.errText ? errText(e) : String(e)); }
  }
  window.snSave = save;
  window.snList = LIST;
  window.snBase = s => fromTpl(s);

  // Nýtt tilboð / ný pöntun út frá þessu
  window.snFrom = (id, kind) => { const T = findDoc(id); if (!T || !A()) return; const B = fromDoc(T); kind === "pontun" ? A().pnForm({ base: B }) : A().tbForm(B.deild === "blandad" && !window.ORG?.pakkaval ? "leiga" : B.deild || (window.ORG?.pakkaval ? "blandad" : "leiga"), { base: B }); };

  /* ---------- ⋯ á tilboði og pöntun ---------- */
  const curD = () => tr(() => String(DETAIL || ""), "");
  function deco() {
    if (!ed() || !ON2()) return; const D = curD(); if (!D.startsWith("tb:")) return;
    const id = D.slice(3), T = findDoc(id); if (!T) return;
    const mm = document.querySelector("#view .uact .umore > div"); if (!mm || mm.querySelector("[data-sn]")) return;
    // eldri „Vista sem sniðmát“ (pantanir2) víkur fyrir þessum
    mm.querySelectorAll('[data-pf^="tpl:"]').forEach(x => x.remove());
    const pn = PNON() && !!A().pnForm;
    mm.insertAdjacentHTML("afterbegin", `<button type="button" data-sn="save:${E(id)}">Vista sem sniðmát…</button><button type="button" data-sn="tilbod:${E(id)}">Nýtt tilboð út frá þessu</button>${pn ? `<button type="button" data-sn="pontun:${E(id)}">Ný pöntun út frá þessu</button>` : ""}<hr class="snhr">`);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("button[data-sn]"); if (!b) return; e.preventDefault(); e.stopPropagation(); b.closest("details")?.removeAttribute("open");
    const [op, id] = b.dataset.sn.split(":");
    if (op === "save") return save(id);
    if (op === "tilbod" || op === "pontun") return window.snFrom(id, op);
    if (op === "del") return delTpl(id);
    if (op === "ren") return renTpl(id);
    if (op === "teg") return tegTpl(id, b.dataset.v);
  }, true);

  /* ---------- Stillingar › Sniðmát ---------- */
  const upd = fn => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.snidmat = s.stillingar.snidmat || []; s.stillingar.pantanir = s.stillingar.pantanir || {}; fn(s.stillingar); }).then(() => render());
  function delTpl(id) { const s = LIST().find(x => String(x.id) === id); if (!s || !confirm(`Eyða sniðmátinu „${s.heiti}“?`)) return;
    upd(c => { c.snidmat = c.snidmat.filter(x => String(x.id) !== id); c.pantanir.snid = (c.pantanir.snid || []).filter(x => String(x.id) !== id); }).then(() => toast("Sniðmáti eytt")); }
  function renTpl(id) { const s = LIST().find(x => String(x.id) === id); if (!s) return; const h = prompt("Heiti sniðmáts", s.heiti); if (!h || h === s.heiti) return;
    upd(c => { [...c.snidmat, ...(c.pantanir.snid || [])].forEach(x => { if (String(x.id) === id) x.heiti = h.trim(); }); }); }
  function tegTpl(id, v) { upd(c => { const x = c.snidmat.find(x => String(x.id) === id); if (x) x.teg = v; }); }
  function pageHTML() {
    const L = LIST();
    const row = s => `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>${E(s.heiti)}</b><small>${nLin(s)} línur${s.vidskFylgir && s.vidskiptavinur ? " · " + E(s.vidskiptavinur) : ""}${s.ur?.nr ? " · úr " + E(s.ur.nr) : ""}${s.stofnad ? " · " + dg(s.stofnad) : ""}</small></div>
      <div class="snjso snops">${s._old ? `<span class="m">Pöntun</span>` : `<select aria-label="Nota fyrir" onchange="this.dataset.v=this.value" data-sn="teg:${E(s.id)}">${Object.entries(TEG).filter(([k]) => PNON() || k === "tilbod").map(([k, l]) => `<option value="${k}"${s.teg === k ? " selected" : ""}>${l}</option>`).join("")}</select>`}<button type="button" class="btn sm" data-sn="ren:${E(s.id)}">Endurnefna</button><button type="button" class="btn sm danger" data-sn="del:${E(s.id)}">Eyða</button></div></div>`;
    return `<div class="viewtitle">Sniðmát · ${L.length}</div><div class="snjset">${L.length ? L.map(row).join("") : `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><small>Engin sniðmát enn. Opnaðu tilboð eða pöntun og veldu ⋯ › „Vista sem sniðmát“.</small></div><div class="snjso"></div></div>`}</div>
      <p class="pfhint" style="margin-top:10px">Sniðmát birtast undir „Byrja út frá“ þegar stofnað er nýtt tilboð eða ný pöntun. Þar má líka afrita eldra tilboð eða pöntun.</p>`;
  }
  // select í stillingum: click-hlustarinn grípur ekki change
  document.addEventListener("change", e => { const s = e.target.closest('select[data-sn^="teg:"]'); if (s) tegTpl(s.dataset.sn.slice(4), s.value); });
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.snidmat = { l: "Sniðmát", d: "Vistuð sniðmát tilboða og pantana", s: ["Sniðmát"], adm: 1, fn: () => pageHTML() }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { deco(); } catch (e) {} }); }).observe(document.getElementById("view") || document.body, { childList: true, subtree: true });
})();
