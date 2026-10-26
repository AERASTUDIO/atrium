/* Vettvangsviðmót og staðfesting tíma (2.100.0)
   - Vettvangsnotandi (hlutverk „vettvangur“, t.d. verktaki eða starfsmaður á lager) fær einfalt viðmót: klukka, „Skrá tíma“,
     Mínir tímar (með stöðu) og Mín verk (verkefni og pantanir sem hann er skráður á). Engin valmynd, ekkert annað.
   - Tímar sem vettvangsnotandi skráir bera vett: true og bíða staðfestingar. Allir á skrifstofu (ekki vettvangur) mega staðfesta
     eða hafna (stadfest / hafnad = { af, nafn, t, astaeda? }). Óstaðfestir tímar fara ekki á reikning (reikn.js › timiRukka).
   - Vörn á netþjóni: firestore.rules › match /timar – vettvangur getur ekki sett stadfest og ekki breytt staðfestum tíma;
     skrifstofa má aðeins bæta við stadfest/hafnad á vettvangstíma annarra.
   - Skrifstofufólk utan fjármála sér ekki tíma annarra; það les vettvangstíma sérstaklega (where vett == true) í VETT_TIMAR. */
(function () {
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const lc = s => String(s || "").trim().toLowerCase();
  const VT = () => !!(window.isVett && window.isVett());
  const fj = () => tr(() => window.can("fjarmal"), false);
  const me = () => lc(tr(() => window.USER.email, ""));

  // ---------- Verk vettvangsnotanda ----------
  // Verkefni sem hann er skráður á – eða sem tengjast pöntun sem hann er skráður á (pantanir hans koma síaðar frá Firestore).
  const minarP = () => tr(() => S.pantanir || [], []).filter(P => !window.tbMine || window.tbMine(P));
  window.vettVerk = p => !!p && (tr(() => window.vettMine(p), false) || minarP().some(P => P.verkefniId === p.id));
  const stada = e => e.stadfest ? ["Staðfest", "ok"] : e.hafnad ? ["Hafnað", "no"] : e.vett ? ["Bíður staðfestingar", "bid"] : ["", ""];

  // ---------- Stíll ----------
  const css = document.createElement("style");
  css.textContent = `
  body.vettui .side, body.vettui #tbar, body.vettui #mbtn, body.vettui #fab, body.vettui #syncbtn, body.vettui header nav { display: none !important; }
  body.vettui .app { margin-left: 0 !important; padding-left: 0 !important; }
  body.vettui main#view { max-width: 640px; margin: 0 auto; padding-bottom: 40px; }
  .vt { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }
  .vt h2 { margin: 0; font-size: 22px; font-weight: 600; }
  .vt h3 { margin: 0 0 10px; font-size: 15px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .vt .vtk { border-radius: 18px; padding: 20px; background: var(--card, #fff); border: 1px solid var(--line, #dce5e9); display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .vt .vtk.on { background: var(--accent, #2a7289); color: #fff; border-color: transparent; }
  .vt .vtk b.kt { font-size: 34px; font-weight: 600; font-variant-numeric: tabular-nums; display: block; }
  .vt .vtk small { opacity: .8; font-size: 13px; }
  .vt .vtbig { width: 100%; min-height: 64px; font-size: 18px; font-weight: 600; border-radius: 16px; }
  .vt .vtrow { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 4px; border-bottom: 1px solid var(--line, #e1e8eb); text-decoration: none; color: inherit; cursor: pointer; min-height: 44px; }
  .vt .vtrow:last-child { border-bottom: 0; }
  .vt .vtrow .vtm { min-width: 0; flex: 1; }
  .vt .vtrow .vtt { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vt .vtrow .vts { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .vt .chip { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .vt .chip.bid { background: #fdf1dc; color: #7a4b00; } .vt .chip.ok { background: #e1f1e6; color: #1d5b33; } .vt .chip.no { background: #fbe3e3; color: #8a1f1f; }
  .vt .vtempty { color: var(--muted); font-size: 14px; padding: 6px 4px; }
  .vtbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
  .vtmod { position: fixed; inset: 0; z-index: 900; background: rgba(15,37,48,.45); display: flex; align-items: flex-end; justify-content: center; }
  .vtmod .vtbox { background: var(--bg, #fff); width: 100%; max-width: 640px; max-height: 88vh; overflow: auto; border-radius: 20px 20px 0 0; padding: 22px 20px 28px; }
  @media (min-width: 760px) { .vtmod { align-items: center; } .vtmod .vtbox { border-radius: 20px; } }
  .vtmod .vtp { border: 1px solid var(--line, #dce5e9); border-radius: 14px; padding: 14px; margin-top: 10px; }
  .vtmod .vtpb { display: flex; gap: 8px; margin-top: 10px; } .vtmod .vtpb .btn { flex: 1; min-height: 44px; }
  `;
  document.head.appendChild(css);

  // ---------- Einfalda viðmótið ----------
  function timar() { return tr(() => faerslur(), []).filter(e => lc(e.eigandi) === me() || (!e.eigandi && e.starfsmadur === ME())).sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))); }
  function vVett() {
    const U = window.VIEWAS || window.USER || {}, k = tr(() => klukka(), null), kp = k ? findProj(k.pid) : null;
    const verk = tr(() => verkefni(), []).filter(p => window.vettVerk(p) && !tr(() => isDone(p), false));
    const pant = minarP().filter(P => !["Lokið", "Hætt við", "Skilað"].includes(P.stada));
    const ts = timar().slice(0, 20);
    const klst = n => (typeof hrs === "function" ? hrs(n) : n + " klst.");
    const dag = x => tr(() => fmtDate(x), x);
    const clock = k
      ? `<section class="vtk on"><div><small>Klukkan gengur${kp ? " · " + E(kp.nr || "") + " " + E(kp.stutt || kp.nafn || "") : ""}</small><b class="kt" data-start="${E(k.start)}">${E(tr(() => elapsed(k), ""))}</b></div><button type="button" class="btn" style="background:#fff;color:#0f2530;min-height:48px;padding:0 22px;font-weight:600" onclick="stopKlukka()">Stoppa og skrá</button></section>`
      : `<section class="vtk"><div><small>Engin klukka í gangi</small><b class="kt">0:00:00</b></div><button type="button" class="btn primary" style="min-height:48px;padding:0 22px;font-weight:600" onclick="kind='tima';PREFILL={timer:true};openSheet()">▶ Byrja klukku</button></section>`;
    const tRow = e => { const p = findProj(e.verkefniId), [s, c] = stada(e);
      return `<a class="vtrow" ${tapAttr("time", e.id)}><div class="vtm"><div class="vtt">${E(p ? (p.nr ? p.nr + " " : "") + (p.stutt || p.nafn) : (e.nr || "Án verkefnis"))}</div><div class="vts">${E(dag(e.date))}${e.fra ? " · " + E(e.fra + "–" + (e.til || "")) : ""} · ${E(klst(e.timar))}${e.hafnad?.astaeda ? " · „" + E(e.hafnad.astaeda) + "“" : ""}</div></div>${s ? `<span class="chip ${c}">${s}</span>` : ""}</a>`; };
    const vRow = p => `<div class="vtrow" role="group"><div class="vtm"><div class="vtt">${E((p.nr ? p.nr + " " : "") + (p.stutt || p.nafn || ""))}</div><div class="vts">${E([p.stadur || p.heimilisfang, p.fra && dag(p.fra), p.til && "til " + dag(p.til)].filter(Boolean).join(" · ")) || "Verkefni"}</div></div><button type="button" class="btn" style="min-height:44px" onclick="kind='tima';PREFILL={pid:'${E(p.id)}'};openSheet()">Skrá tíma</button></div>`;
    const pRow = P => `<a class="vtrow" ${tapAttr("tb", P.id)}><div class="vtm"><div class="vtt">${E((P.nr ? P.nr + " " : "") + (P.heiti || P.vidskiptavinur || "Pöntun"))}</div><div class="vts">${E([P.fra && dag(P.fra), P.til && "til " + dag(P.til)].filter(Boolean).join(" ")) || "Pöntun"}</div></div><span class="chip bid" style="background:#e3f0f4;color:#1f5e72">${E(P.stada || "")}</span></a>`;
    return `<div class="vt">
      <div class="vtbar"><h2>Hæ ${E(String(U.nafn || "").split(" ")[0])}</h2><button type="button" class="btn" style="min-height:44px" onclick="aeraSignOut()">Skrá út</button></div>
      ${clock}
      <button type="button" class="btn primary vtbig" onclick="kind='tima';PREFILL=null;openSheet()">+ Skrá tíma</button>
      <section><h3>Mín verk</h3>${verk.length || pant.length ? `<div class="card" style="padding:4px 14px">${pant.map(pRow).join("")}${verk.map(vRow).join("")}</div>` : `<p class="vtempty">Þú ert ekki skráð(ur) á nein verk eins og er. Hafðu samband við verkstjóra.</p>`}</section>
      <section><h3>Mínir tímar</h3>${ts.length ? `<div class="card" style="padding:4px 14px">${ts.map(tRow).join("")}</div>` : `<p class="vtempty">Engir tímar skráðir enn.</p>`}</section>
    </div>`;
  }
  // Fylgist með render(): vettvangsnotandi fær einfalda skjáinn í stað venjulegra síðna (nema opin færsla/pöntun)
  const wrapRender = () => {
    if (typeof window.render !== "function" || window.render.__vt) return;
    const o = window.render;
    window.render = function () {
      const r = o.apply(this, arguments), on = VT();
      document.body.classList.toggle("vettui", on);
      if (on && typeof S !== "undefined" && S) {
        const v = document.getElementById("view");
        if (!DETAIL) v.innerHTML = (window.viewAsBanner ? viewAsBanner() : "") + vVett();
        else if (!v.querySelector(".backrow, .back")) v.insertAdjacentHTML("afterbegin", `<p style="margin:0 0 10px"><button type="button" class="btn" style="min-height:44px" onclick="DETAIL=null;render();scrollTo(0,0)">‹ Til baka</button></p>`);
        // Staðfestan tíma má ekki breyta – fela breytingahnappa á honum
        if (DETAIL && DETAIL.startsWith("time:")) { const e = tr(() => findTime(DETAIL.slice(5)), null); if (e && e.stadfest) v.querySelectorAll("[data-act^='edit:'], [data-act^='del:']").forEach(x => x.remove()); }
      }
      return r;
    };
    window.render.__vt = true;
  };
  wrapRender(); document.addEventListener("DOMContentLoaded", wrapRender); setTimeout(wrapRender, 0);

  // ---------- Staðfesting (skrifstofa) ----------
  let VETT_TIMAR = [], watching = false;
  const startWatch = () => {
    if (watching || VT() || fj() || window.AERA_DEMO || !window.__DB?.watchCol || !window.USER) return;
    watching = true;
    window.__DB.watchCol("timar", ["vett", true], r => { VETT_TIMAR = r.docs; try { render(); } catch (e) {} }, e => console.warn("Vettvangstímar", e));
  };
  setInterval(startWatch, 3000);
  const pending = () => (fj() ? tr(() => faerslur(), []) : VETT_TIMAR).filter(e => e && e.vett && !e.stadfest && !e.hafnad);
  window.vtBidaN = () => VT() ? 0 : pending().length;

  async function merkja(e, key, extra) {
    const U = window.USER || {}, now = new Date().toISOString();
    const d = { ...e, [key]: { af: me(), nafn: U.nafn || me(), t: now, ...(extra || {}) }, breytt_af: me(), breytt_t: now };
    if (window.AERA_DEMO) { const x = faerslur().find(y => y.id === e.id); if (x) Object.assign(x, d); render(); return; }
    await window.__DB.set("timar/" + e.id, d);
  }
  function modal() {
    const ps = pending().sort((a, b) => String(a.date + (a.fra || "")).localeCompare(String(b.date + (b.fra || ""))));
    document.querySelector(".vtmod")?.remove();
    const w = document.createElement("div"); w.className = "vtmod"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Tímar sem bíða staðfestingar");
    const nm = e => tr(() => starfName(e.starfsmadur), "") || e.eigandi || "";
    w.innerHTML = `<div class="vtbox"><div class="vtbar"><h2 style="margin:0;font-size:20px">Tímar sem bíða staðfestingar</h2><button type="button" class="btn" aria-label="Loka" data-vt="x" style="min-height:44px">✕</button></div>
      ${ps.length ? `<p style="margin:4px 0 0;color:var(--muted);font-size:14px">Skráðir af vettvangsnotendum. Óstaðfestir tímar fara ekki á reikning.</p>
      ${ps.map(e => { const p = findProj(e.verkefniId); return `<div class="vtp"><div style="font-weight:600">${E(nm(e))} · ${E(tr(() => hrs(e.timar), e.timar))}</div>
        <div style="font-size:14px;color:var(--muted);margin-top:2px">${E(tr(() => fmtDate(e.date), e.date))}${e.fra ? " · " + E(e.fra + "–" + (e.til || "")) : ""} · ${E(p ? (p.nr || "") + " " + (p.stutt || p.nafn || "") : e.nr || "Án verkefnis")}</div>
        <div style="font-size:14px;margin-top:6px">${E(tr(() => cleanLys(e.lysing), e.lysing || ""))}</div>
        <div class="vtpb"><button type="button" class="btn primary" data-vt="ok:${E(e.id)}">Staðfesta</button><button type="button" class="btn" data-vt="no:${E(e.id)}">Hafna</button></div></div>`; }).join("")}
      ${ps.length > 1 ? `<button type="button" class="btn primary vtbig" style="width:100%;min-height:52px;margin-top:16px" data-vt="all">Staðfesta alla (${ps.length})</button>` : ""}`
      : `<p class="vtempty" style="margin-top:12px">Engir tímar bíða staðfestingar.</p>`}</div>`;
    document.body.appendChild(w);
    w.addEventListener("click", async ev => {
      if (ev.target === w) return w.remove();
      const a = ev.target.closest("[data-vt]")?.dataset.vt; if (!a) return;
      if (a === "x") return w.remove();
      try {
        if (a === "all") { if (!confirm(`Staðfesta alla ${ps.length} tímana?`)) return; for (const e of ps) await merkja(e, "stadfest"); toast(`${ps.length} tímar staðfestir`); }
        else { const [k, id] = [a.slice(0, a.indexOf(":")), a.slice(a.indexOf(":") + 1)], e = ps.find(x => String(x.id) === id); if (!e) return;
          if (k === "ok") { await merkja(e, "stadfest"); toast("Tími staðfestur"); }
          else { const ast = prompt("Ástæða (sést hjá þeim sem skráði):", ""); if (ast == null) return; await merkja(e, "hafnad", ast.trim() ? { astaeda: ast.trim().slice(0, 300) } : {}); toast("Tíma hafnað"); } }
      } catch (err) { console.warn(err); toast("Tókst ekki: " + (err?.code || err?.message || "villa")); }
      setTimeout(modal, 400);
    });
  }
  window.vtStadfesta = modal;
  document.addEventListener("click", ev => { const t = ev.target.closest('[data-act="vtsta"]'); if (!t) return; ev.preventDefault(); ev.stopImmediatePropagation(); modal(); }, true);
})();
