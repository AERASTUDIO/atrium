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

  // ---------- Stíll (2.101.0: endurhannað – hreinn, kerfisbundinn símaskjár) ----------
  const css = document.createElement("style");
  css.textContent = `
  body.vettui .side, body.vettui #tbar, body.vettui #mbtn, body.vettui #fab, body.vettui #syncbtn, body.vettui #logoutbtn, body.vettui header nav, body.vettui #avbtn, body.vettui #searchbtn { display: none !important; }
  body.vettui .app { margin-left: 0 !important; padding-left: 0 !important; }
  body.vettui main#view { max-width: 560px; margin: 0 auto; padding-bottom: 48px; }
  .vt { display: flex; flex-direction: column; gap: 14px; padding: 6px 0 0; color: var(--ink); }
  .vt .vth { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 4px 2px 2px; }
  .vt .vtl { font-size: 12px; color: var(--muted); letter-spacing: .02em; }
  .vt .vth h1 { margin: 2px 0 0; font-size: 26px; font-weight: 500; letter-spacing: -.01em; line-height: 1.15; }
  .vt .vtav { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface, #fff); color: var(--ink); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; flex: none; }
  .vt .vtmenu { position: absolute; right: 0; top: 46px; z-index: 30; min-width: 220px; background: var(--surface, #fff); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 12px 32px rgba(15,37,48,.16); padding: 6px; }
  .vt .vtmenu[hidden] { display: none; }
  .vt .vtmenu .vtmi { padding: 10px 12px 8px; border-bottom: 1px solid var(--line); margin-bottom: 4px; }
  .vt .vtmenu .vtmi b { display: block; font-size: 14px; font-weight: 500; } .vt .vtmenu .vtmi span { font-size: 12px; color: var(--muted); word-break: break-all; }
  .vt .vtmenu button { display: block; width: 100%; text-align: left; border: 0; background: transparent; font: inherit; font-size: 14px; color: var(--ink); padding: 11px 12px; border-radius: 9px; cursor: pointer; min-height: 44px; }
  .vt .vtmenu button:hover { background: var(--bg); }
  .vt .vtcard { background: var(--surface, #fff); border: 1px solid var(--line); border-radius: 16px; }
  .vt .vtclk { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 14px 14px 16px; }
  .vt .vtclk b { display: block; font-size: 30px; font-weight: 400; font-variant-numeric: tabular-nums; letter-spacing: -.01em; line-height: 1.15; }
  .vt .vtclk.on { background: var(--ink); border-color: var(--ink); color: var(--bg); }
  .vt .vtclk.on .vtl { color: color-mix(in srgb, var(--bg) 70%, transparent); }
  .vt .vtclk .vtcp { font-size: 13px; margin-top: 2px; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 210px; }
  .vt .vtbtn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--line); background: var(--surface, #fff); color: var(--ink); border-radius: 12px; padding: 0 16px; min-height: 44px; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; }
  .vt .vtbtn.pri { background: var(--accent, #2a7289); border-color: transparent; color: #fff; }
  .vt .vtclk.on .vtbtn { background: var(--bg); color: var(--ink); border-color: transparent; }
  .vt .vtbtn.wide { width: 100%; min-height: 52px; font-size: 15px; border-radius: 14px; }
  .vt .vtbtn.sm { min-height: 36px; padding: 0 12px; font-size: 13px; border-radius: 10px; }
  .vt .vtseg { display: flex; gap: 4px; padding: 4px; background: var(--bg); box-shadow: inset 0 0 0 1px var(--line), 0 6px 10px -8px rgba(15,37,48,.25); border-radius: 12px; position: sticky; top: calc(58px + env(safe-area-inset-top, 0px)); z-index: 6; }
  .vt .vtseg button { flex: 1 1 0; min-width: 0; white-space: nowrap; word-break: normal; overflow-wrap: normal; border: 0; background: transparent; font: inherit; font-size: 14px; color: var(--muted); padding: 0 8px; min-height: 40px; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .vt .vtseg button[aria-selected="true"] { background: var(--surface, #fff); color: var(--ink); font-weight: 500; box-shadow: 0 1px 2px rgba(15,37,48,.08); }
  .vt .vtseg i { font-style: normal; font-size: 11.5px; min-width: 20px; height: 20px; border-radius: 10px; background: var(--bg); display: inline-grid; place-items: center; padding: 0 6px; color: var(--muted); }
  .vt .vtsec { font-size: 12px; font-weight: 500; color: var(--muted); letter-spacing: .05em; text-transform: uppercase; margin: 6px 2px -4px; }
  .vt .vtlist { overflow: hidden; }
  .vt .vtr { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--line); color: inherit; text-decoration: none; min-height: 60px; }
  .vt .vtr:last-child { border-bottom: 0; }
  .vt a.vtr { cursor: pointer; } .vt a.vtr:hover { background: color-mix(in srgb, var(--bg) 60%, transparent); }
  .vt .vtd { width: 44px; flex: none; text-align: center; line-height: 1.05; }
  .vt .vtd b { display: block; font-size: 18px; font-weight: 500; } .vt .vtd span { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .vt .vtx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .vt .vtx b { font-size: 14.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vt .vtx small { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vt .vtnr { width: 44px; height: 44px; flex: none; border-radius: 11px; background: var(--bg); display: grid; place-items: center; font-size: 11px; font-weight: 500; color: var(--muted); text-align: center; line-height: 1.1; }
  .vt .vth2 { text-align: right; flex: none; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 500; }
  .vt .pill { display: inline-block; font-size: 11.5px; font-weight: 500; padding: 3px 9px; border-radius: 999px; background: var(--bg); color: var(--muted); white-space: nowrap; margin-top: 4px; }
  .vt .pill.bid { background: #fbf1df; color: #7a4b00; } .vt .pill.ok { background: #e3f1e8; color: #1d5b33; } .vt .pill.no { background: #f9e4e2; color: #8a2a1f; }
  .vt .chev { color: var(--muted); flex: none; }
  .vt .vtempty { padding: 22px 16px; text-align: center; color: var(--muted); font-size: 14px; line-height: 1.5; }
  .vt .vtmon { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .vt .vtmon b { font-size: 16px; font-weight: 500; }
  .vt .vtmon button { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface, #fff); color: var(--ink); cursor: pointer; display: grid; place-items: center; }
  .vt .vtmon button:disabled { opacity: .35; cursor: default; }
  .vt .vtsum { display: grid; grid-template-columns: repeat(3, 1fr); }
  .vt .vtsum div { padding: 12px 14px; border-right: 1px solid var(--line); } .vt .vtsum div:last-child { border-right: 0; }
  .vt .vtsum b { display: block; font-size: 20px; font-weight: 500; font-variant-numeric: tabular-nums; } .vt .vtsum span { font-size: 12px; color: var(--muted); }
  .vt .vtrep { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .vt .vtrh { display: flex; flex-direction: column; } .vt .vtrh b { font-size: 15px; font-weight: 500; } .vt .vtrh small { font-size: 12.5px; color: var(--muted); }
  .vt .vtrd { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .vt .vtrd label { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--muted); margin: 0; } .vt .vtrd input { min-height: 44px; width: 100%; }
  .vt .vtnote { font-size: 12.5px; color: var(--muted); margin: -4px 2px 0; line-height: 1.45; }
  .vtbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
  .vtmod { position: fixed; inset: 0; z-index: 900; background: rgba(15,37,48,.45); display: flex; align-items: flex-end; justify-content: center; }
  .vtmod .vtbox { background: var(--bg, #fff); width: 100%; max-width: 640px; max-height: 88vh; overflow: auto; border-radius: 20px 20px 0 0; padding: 22px 20px 28px; }
  @media (min-width: 760px) { .vtmod { align-items: center; } .vtmod .vtbox { border-radius: 20px; } }
  .vtmod .vtp { border: 1px solid var(--line, #dce5e9); border-radius: 14px; padding: 14px; margin-top: 10px; background: var(--surface, #fff); }
  .vtmod .vtpb { display: flex; gap: 8px; margin-top: 10px; } .vtmod .vtpb .btn { flex: 1; min-height: 44px; }
  .vtmod .vtbig { width: 100%; min-height: 52px; margin-top: 16px; }
  .vtmod .vtempty { color: var(--muted); }
  `;
  document.head.appendChild(css);

  // ---------- Einfalda viðmótið ----------
  const MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const MS3 = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
  const DN = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"];
  const SV = (d, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = { play: '<path d="M7 5l11 7-11 7z" fill="currentColor" stroke="none"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>', plus: '<path d="M12 5v14M5 12h14"/>', chev: '<path d="M9 6l6 6-6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>' };
  let VTAB = "pantanir", VMON = null; const REP = { fra: "", til: "" };
  const lastDay = m => { const [y, n] = m.split("-").map(Number); return m + "-" + String(new Date(y, n, 0).getDate()).padStart(2, "0"); };
  try { VTAB = sessionStorage.getItem("vt-tab") || "pantanir"; } catch (e) {}
  const dblk = iso => { const x = new Date(String(iso || "").slice(0, 10) + "T12:00"); return isNaN(x) ? `<div class="vtd"><b>–</b></div>` : `<div class="vtd"><b>${x.getDate()}</b><span>${MS3[x.getMonth()]}</span></div>`; };
  const klst = n => (typeof hrs === "function" ? hrs(n) : String(n).replace(".", ",") + " klst.");
  const nrStutt = nr => String(nr || "").split("-").pop().slice(-4);
  function timar() { return tr(() => faerslur(), []).filter(e => lc(e.eigandi) === me() || (!e.eigandi && e.starfsmadur === ME())).sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))); }
  const monOf = e => String(e.date || "").slice(0, 7);
  const curMon = () => VMON || new Date().toISOString().slice(0, 7);
  const monName = m => { const [y, n] = m.split("-").map(Number); return MN[n - 1].replace(/^./, c => c.toUpperCase()) + " " + y; };
  const shiftMon = (m, d) => { const [y, n] = m.split("-").map(Number), x = new Date(y, n - 1 + d, 1); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0"); };

  function vVett() {
    const U = window.VIEWAS || window.USER || {}, now = new Date(), k = tr(() => klukka(), null), kp = k ? findProj(k.pid) : null;
    const verk = tr(() => verkefni(), []).filter(p => window.vettVerk(p) && !tr(() => isDone(p), false)).sort((a, b) => String(b.nr || "").localeCompare(String(a.nr || "")));
    const pant = minarP().filter(P => !["Lokið", "Hætt við", "Skilað", "Hafnað"].includes(P.stada)).sort((a, b) => String(a.fra || "9").localeCompare(String(b.fra || "9")));
    const fn = String(U.nafn || "").split(" ")[0], ini = String(U.nafn || "?").split(" ").map(x => x[0]).slice(0, 2).join("");
    const hdr = `<div class="vth" style="position:relative"><div><div class="vtl">${DN[now.getDay()]} ${now.getDate()}. ${MN[now.getMonth()]}</div><h1>${now.getHours() < 12 ? "Góðan daginn" : now.getHours() < 18 ? "Góðan dag" : "Gott kvöld"}${fn ? ", " + E(fn) : ""}</h1></div>
      <button type="button" class="vtav" data-vtu="menu" aria-haspopup="true" aria-expanded="false" aria-label="Aðgangur">${E(ini.toUpperCase())}</button>
      <div class="vtmenu" hidden><div class="vtmi"><b>${E(U.nafn || "")}</b><span>${E(U.netfang || U.email || "")}</span></div><button type="button" onclick="aeraSignOut()">Skrá út</button></div></div>`;
    const clock = k
      ? `<section class="vtcard vtclk on"><div style="min-width:0"><div class="vtl">Klukkan gengur</div><b class="kt" data-start="${E(k.start)}">${E(tr(() => elapsed(k), ""))}</b>${kp ? `<div class="vtcp">${E((kp.nr ? kp.nr + " · " : "") + (kp.stutt || kp.nafn || ""))}</div>` : ""}</div><button type="button" class="vtbtn" onclick="stopKlukka()">${SV(IC.stop, 14)}Stoppa</button></section>`
      : `<section class="vtcard vtclk"><div><div class="vtl">Klukka</div><b>0:00:00</b></div><button type="button" class="vtbtn pri" onclick="kind='tima';PREFILL={timer:true};openSheet()">${SV(IC.play, 14)}Byrja</button></section>`;
    const tabs = [["pantanir", "Pantanir", pant.length], ["verk", "Verkefni", verk.length], ["timar", "Tímar", 0]];
    const seg = `<div class="vtseg" role="tablist">${tabs.map(([k2, l, n]) => `<button type="button" role="tab" aria-selected="${VTAB === k2}" data-vtu="tab:${k2}">${l}${n ? `<i>${n}</i>` : ""}</button>`).join("")}</div>`;
    let body = "";
    if (VTAB === "pantanir") {
      body = pant.length ? `<div class="vtcard vtlist">${pant.map(P => `<a class="vtr" ${tapAttr("tb", P.id)}>${dblk(P.fra || P.dags)}<div class="vtx"><b>${E(P.heiti || P.vidskiptavinur || "Pöntun")}</b><small>${E([P.nr, P.fra && P.til && P.til !== P.fra ? "til " + tr(() => fmtDate(P.til), P.til) : "", P.stadsetning].filter(Boolean).join(" · "))}</small></div><span class="pill">${E(P.stada || "")}</span><span class="chev">${SV(IC.chev)}</span></a>`).join("")}</div>`
        : `<div class="vtcard vtempty">Engar pantanir á þér eins og er.</div>`;
    } else if (VTAB === "verk") {
      body = verk.length ? `<div class="vtcard vtlist">${verk.map(p => `<div class="vtr"><div class="vtnr">${E(nrStutt(p.nr))}</div><div class="vtx"><b>${E(p.stutt || p.nafn || "")}</b><small>${E([p.nr, p.vidskiptavinur, p.timabilFra && tr(() => fmtDate(p.timabilFra), "")].filter(Boolean).join(" · "))}</small></div><button type="button" class="vtbtn sm" onclick="kind='tima';PREFILL={pid:'${E(p.id)}'};openSheet()">${SV(IC.plus, 13)}Tími</button></div>`).join("")}</div>`
        : `<div class="vtcard vtempty">Þú ert ekki skráð(ur) á nein verkefni.<br>Hafðu samband við verkstjóra.</div>`;
    } else {
      const m = curMon(), all = timar(), es = all.filter(e => monOf(e) === m), sum = f => es.filter(f).reduce((a, e) => a + (+e.timar || 0), 0);
      const tot = sum(() => true), ok = sum(e => e.stadfest), bid = sum(e => !e.stadfest && !e.hafnad);
      const eldri = all.some(e => monOf(e) < m), nyrri = m < new Date().toISOString().slice(0, 7);
      body = `<div class="vtmon"><button type="button" data-vtu="mon:-1" aria-label="Fyrri mánuður"${eldri ? "" : " disabled"}>${SV(IC.left)}</button><b>${monName(m)}</b><button type="button" data-vtu="mon:1" aria-label="Næsti mánuður"${nyrri ? "" : " disabled"}>${SV(IC.chev)}</button></div>
        <div class="vtcard vtsum"><div><b>${E(String(Math.round(tot * 100) / 100).replace(".", ","))}</b><span>klst. alls</span></div><div><b>${E(String(Math.round(ok * 100) / 100).replace(".", ","))}</b><span>staðfestar</span></div><div><b>${E(String(Math.round(bid * 100) / 100).replace(".", ","))}</b><span>bíða</span></div></div>
        ${es.length ? `<div class="vtcard vtlist">${es.map(e => { const p = findProj(e.verkefniId), [st, c] = stada(e);
          return `<a class="vtr" ${tapAttr("time", e.id)}>${dblk(e.date)}<div class="vtx"><b>${E(p ? p.stutt || p.nafn : e.nr || "Án verkefnis")}</b><small>${E([e.fra && e.fra + "–" + (e.til || ""), tr(() => cleanLys(e.lysing), "")].filter(Boolean).join(" · "))}${e.hafnad?.astaeda ? " · „" + E(e.hafnad.astaeda) + "“" : ""}</small></div><div class="vth2">${E(klst(e.timar))}<br>${st ? `<span class="pill ${c}">${st}</span>` : ""}</div></a>`; }).join("")}</div>
`
          : `<div class="vtcard vtempty">Engir tímar skráðir í ${E(MN[+m.slice(5) - 1])}.</div>`}
        <section class="vtcard vtrep"><div class="vtrh"><b>Yfirlit fyrir reikning</b><small>Veldu tímabil – aðeins staðfestir tímar</small></div>
          <div class="vtrd"><label>Frá<input type="date" id="vt-fra" value="${E(REP.fra || m + "-01")}"></label><label>Til<input type="date" id="vt-til" value="${E(REP.til || lastDay(m))}"></label></div>
          <button type="button" class="vtbtn pri wide" data-vtu="yfirlit">${SV(IC.dl)}Sækja yfirlit (PDF eða Excel)</button></section>`;
    }
    return `<div class="vt">${hdr}${clock}<button type="button" class="vtbtn pri wide" onclick="kind='tima';PREFILL=null;openSheet()">${SV(IC.plus)}Skrá tíma</button>${seg}${body}</div>`;
  }
  // Valið tímabil helst þótt skjárinn teiknist upp á nýtt (ný gögn berast)
  document.addEventListener("change", ev => { if (ev.target?.id === "vt-fra") REP.fra = ev.target.value; if (ev.target?.id === "vt-til") REP.til = ev.target.value; });
  // Hnappar vettvangsskjásins
  document.addEventListener("click", ev => {
    const b = ev.target.closest("[data-vtu]"), mn = document.querySelector(".vt .vtmenu");
    if (mn && !mn.hidden && !ev.target.closest(".vtmenu") && !(b && b.dataset.vtu === "menu")) { mn.hidden = true; document.querySelector(".vt .vtav")?.setAttribute("aria-expanded", "false"); }
    if (!b) return; const a = b.dataset.vtu;
    if (a === "menu") { if (mn) { mn.hidden = !mn.hidden; b.setAttribute("aria-expanded", String(!mn.hidden)); } return; }
    if (a.startsWith("tab:")) { VTAB = a.slice(4); try { sessionStorage.setItem("vt-tab", VTAB); } catch (e) {} render(); return; }
    if (a.startsWith("mon:")) { VMON = shiftMon(curMon(), +a.slice(4)); REP.fra = ""; REP.til = ""; render(); return; }
    if (a === "yfirlit") {
      const U = window.VIEWAS || window.USER || {}, fra = document.getElementById("vt-fra")?.value, til = document.getElementById("vt-til")?.value;
      if (!fra || !til) return toast("Veldu dagsetningar frá og til");
      if (til < fra) return toast("Dagsetningin „til“ er á undan „frá“");
      REP.fra = fra; REP.til = til;
      if (typeof openReport !== "function") return toast("Yfirlit er ekki í boði");
      const dIs = x => { const [y, mo, dd] = x.split("-"); return +dd + "." + +mo + "." + y; };
      openReport(e => { const dg = String(e.date || "").slice(0, 10); return dg >= fra && dg <= til && !!e.stadfest && (lc(e.eigandi) === me() || (!e.eigandi && e.starfsmadur === ME())); }, { bil: dIs(fra) + " – " + dIs(til), verkefni: "", starf: U.nafn || "", flokka: false });
    }
  });

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

  // ---------- Pöntun hjá vettvangsnotanda (2.103.1): aðeins skoða og afhenda / taka á móti ----------
  // Falið: breyta, eyða, gera að verkefni, staða, staðfesting (handvirk, tengill, pöntunarsíða, staðfestingarpóstur),
  // breyta greiðslumáta, starfsfólk, panta aftur og sniðmát. Firestore-reglurnar leyfa honum aðeins að uppfæra sínar pantanir.
  const BANN = ['[data-act^="tbverk:"]', '[data-act^="tbdel:"]', '[data-act^="tbed:"]', '[data-act^="tbutg:"]', '[data-act^="u1pnconf:"]', '[data-act^="tbmenn:"]', '.tbmenn select', '.fsels', '[data-act$=":Staðfest"]', '[data-act$=":Lokið"]', '[data-act$=":Hætt við"]',
    '[data-pf^="handv:"]', '[data-pf^="pub:"]', '[data-pf^="pubsend:"]', '[data-pf^="pubcopy:"]', '[data-pf^="pubrev:"]', '[data-pf^="pubmail:"]', '[data-pf^="payh:"]', '[data-pf^="payx:"]', '[data-pf^="rkut"]', '[data-pf^="again:"]', '[data-pf^="tpl:"]', '.pfmore', '.pfpub a.btn[href]', '.umore'];
  const hreinsa = () => {
    if (!VT() || !DETAIL || !String(DETAIL).startsWith("tb:")) return;
    const v = document.getElementById("view"); if (!v) return;
    v.querySelectorAll(BANN.join(",")).forEach(x => x.remove());
    v.querySelectorAll(".kind").forEach(k => { if (/^Staða$/.test(k.textContent.trim()) && !k.nextElementSibling?.matches?.("select, .fsels, .chips")) k.remove(); });
  };
  new MutationObserver(() => { try { hreinsa(); } catch (e) {} }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- Staðfesting (skrifstofa) ----------
  // 2.102.0: tími telst bíða ef hann er merktur vett EÐA skráður af notanda með hlutverkið vettvangur (eldri færslur án merkis)
  let VETT_TIMAR = [], watching = false;
  const startWatch = () => {
    if (watching || VT() || fj() || window.AERA_DEMO || !window.__DB?.watchCol || !window.USER) return;
    watching = true;
    window.__DB.watchCol("timar", ["vett", true], r => { VETT_TIMAR = r.docs; try { render(); } catch (e) {} }, e => console.warn("Vettvangstímar", e));
  };
  setInterval(startWatch, 3000);
  const vettEm = () => new Set(tr(() => nuUsers(), []).filter(u => u.hlutverk === "vettvangur").map(u => lc(u.email)));
  const pending = () => { const ve = vettEm(); return (fj() ? tr(() => faerslur(), []) : VETT_TIMAR).filter(e => e && !e.stadfest && !e.hafnad && !e.live && (e.vett || ve.has(lc(e.eigandi)))); };
  window.vtPending = (f) => VT() ? [] : pending().filter(f || (() => true)).sort((a, b) => String(a.date + (a.fra || "")).localeCompare(String(b.date + (b.fra || ""))));
  window.vtBidaN = () => window.vtPending().length;
  const nmOf = e => tr(() => starfName(e.starfsmadur), "") || tr(() => nuUsers().find(u => lc(u.email) === lc(e.eigandi))?.nafn, "") || e.eigandi || "";

  async function merkja(e, key, extra) {
    const U = window.USER || {}, now = new Date().toISOString();
    const d = { ...e, [key]: { af: me(), nafn: U.nafn || me(), t: now, ...(extra || {}) }, breytt_af: me(), breytt_t: now };
    if (window.AERA_DEMO) { const x = faerslur().find(y => y.id === e.id); if (x) Object.assign(x, d); render(); return; }
    await window.__DB.set("timar/" + e.id, d);
  }
  // Raðir til staðfestingar – notaðar í glugganum, á verkefni, á tímaskráningarsíðu og á spjaldi starfsmanns
  window.vtRadir = (ps, o = {}) => ps.map(e => { const p = findProj(e.verkefniId);
    return `<div class="vtp"><div class="vtpt"><b>${o.nafn === false ? "" : E(nmOf(e)) + " · "}${E(tr(() => hrs(e.timar), e.timar))}</b><span>${E(tr(() => fmtDate(e.date), e.date))}${e.fra ? " · " + E(e.fra + "–" + (e.til || "")) : ""}</span></div>
      <div class="vtps">${o.verk === false ? "" : E(p ? (p.nr || "") + " " + (p.stutt || p.nafn || "") : e.nr || "Án verkefnis") + " · "}${E(tr(() => cleanLys(e.lysing), e.lysing || ""))}</div>
      <div class="vtpb"><button type="button" class="btn primary" data-vtq="ok:${E(e.id)}">Staðfesta</button><button type="button" class="btn" data-vtq="no:${E(e.id)}">Hafna</button></div></div>`; }).join("");
  window.vtKort = (ps, titill, o) => ps.length ? `<section class="card vtkort"><div class="vtkh"><h3>${E(titill || (ps.length === 1 ? "1 tími bíður staðfestingar" : ps.length + " tímar bíða staðfestingar"))}</h3>${ps.length > 1 ? `<button type="button" class="btn" data-vtq="all:${E(ps.map(e => e.id).join(","))}">Staðfesta alla</button>` : ""}</div>${window.vtRadir(ps, o)}</section>` : "";
  const css2 = document.createElement("style");
  css2.textContent = `
  .vtkort { margin: 0 0 14px; padding: 16px; } .vtkh { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; } .vtkh h3 { margin: 0; font-size: 15px; font-weight: 500; }
  .vtp { border: 1px solid var(--line, #dce5e9); border-radius: 12px; padding: 12px 14px; margin-top: 10px; background: var(--surface, #fff); }
  .vtpt { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; } .vtpt b { font-weight: 500; } .vtpt span, .vtps { font-size: 13px; color: var(--muted); }
  .vtban { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; font: inherit; color: var(--ink); background: var(--surface, #fff); border: 1px solid var(--accent, #2a7289); border-radius: 14px; padding: 12px 16px; margin: 12px 0; cursor: pointer; min-height: 56px; }
  .vtban .vtbi { width: 30px; height: 30px; flex: none; border-radius: 50%; background: var(--accent, #2a7289); color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 600; }
  .vtban .vtbx { flex: 1; min-width: 0; display: flex; flex-direction: column; } .vtban b { font-weight: 500; font-size: 14.5px; } .vtban small { color: var(--muted); font-size: 12.5px; }
  .vtban .vtbg { color: var(--accent, #2a7289); font-size: 13.5px; white-space: nowrap; }
  .vtps { margin-top: 3px; } .vtpb { display: flex; gap: 8px; margin-top: 10px; } .vtpb .btn { flex: 1; min-height: 40px; }
  @media (min-width: 900px) { .vtkort .vtp { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 16px; } .vtkort .vtpb { grid-row: 1 / span 2; grid-column: 2; margin: 0; } .vtkort .vtpb .btn { flex: none; min-width: 104px; } }
  `;
  document.head.appendChild(css2);

  async function vtAct(a) {
    const k = a.slice(0, a.indexOf(":")), arg = a.slice(a.indexOf(":") + 1), all = pending();
    try {
      if (k === "all") { const ids = new Set(arg.split(",")), ps = all.filter(e => ids.has(String(e.id))); if (!ps.length || !confirm(`Staðfesta ${ps.length} tíma?`)) return; for (const e of ps) await merkja(e, "stadfest"); toast(`${ps.length} tímar staðfestir`); }
      else { const e = all.find(x => String(x.id) === arg); if (!e) return;
        if (k === "ok") { await merkja(e, "stadfest"); toast("Tími staðfestur"); }
        else { const ast = prompt("Ástæða (sést hjá þeim sem skráði):", ""); if (ast == null) return; await merkja(e, "hafnad", ast.trim() ? { astaeda: ast.trim().slice(0, 300) } : {}); toast("Tíma hafnað"); } }
    } catch (err) { console.warn(err); toast("Tókst ekki: " + (err?.code || err?.message || "villa")); }
  }
  function modal() {
    document.querySelector(".vtmod")?.remove();
    const ps = window.vtPending();
    const w = document.createElement("div"); w.className = "vtmod"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Tímar sem bíða staðfestingar");
    w.innerHTML = `<div class="vtbox"><div class="vtbar"><h2 style="margin:0;font-size:20px;font-weight:500">Tímar sem bíða staðfestingar</h2><button type="button" class="btn" aria-label="Loka" data-vtx="1" style="min-height:44px">✕</button></div>
      ${ps.length ? `<p style="margin:4px 0 0;color:var(--muted);font-size:14px">Skráðir af vettvangsnotendum. Óstaðfestir tímar fara ekki á reikning.</p>${window.vtRadir(ps)}${ps.length > 1 ? `<button type="button" class="btn primary vtbig" data-vtq="all:${E(ps.map(e => e.id).join(","))}">Staðfesta alla (${ps.length})</button>` : ""}`
      : `<p class="vtempty" style="margin-top:12px">Engir tímar bíða staðfestingar.</p>`}</div>`;
    document.body.appendChild(w);
    w.addEventListener("click", ev => { if (ev.target === w || ev.target.closest("[data-vtx]")) w.remove(); });
  }
  window.vtStadfesta = modal;
  // Smellt á ýtitilkynningu (functions › vettTimi: link „#t=yfirlit&vt=1“) → staðfestingarglugginn opnast þegar gögnin eru komin
  if (/[#&]vt=1/.test(location.hash)) { let n = 0; const iv = setInterval(() => { if (typeof S !== "undefined" && S && window.USER && ++n > 2) { clearInterval(iv); modal(); } else if (n > 80) clearInterval(iv); }, 500); }
  document.addEventListener("click", async ev => {
    const t = ev.target.closest('[data-act="vtsta"]'); if (t) { ev.preventDefault(); ev.stopImmediatePropagation(); modal(); return; }
    const q = ev.target.closest("[data-vtq]"); if (!q) return; ev.preventDefault(); ev.stopImmediatePropagation();
    q.disabled = true; await vtAct(q.dataset.vtq);
    setTimeout(() => { try { render(); } catch (e) {} if (document.querySelector(".vtmod")) modal(); }, 400);
  }, true);

  // Staðfesting beint á verkefni og á tímaskráningarsíðunni (sett inn eftir teikningu)
  const wrap2 = () => {
    if (typeof window.render !== "function" || window.render.__vt2) return;
    const o = window.render;
    window.render = function () {
      const r = o.apply(this, arguments);
      try {
        if (!VT() && typeof S !== "undefined" && S) {
          const v = document.getElementById("view");
          if (DETAIL && DETAIL.startsWith("verk:")) { const pid = DETAIL.slice(5), ps = window.vtPending(e => e.verkefniId === pid);
            if (ps.length && !v.querySelector(".vtkort")) { const k = window.vtKort(ps, null, { verk: false }), db = v.querySelector(".dbody"), at = v.querySelector(".dtabs") || v.querySelector(".backrow"); db ? db.insertAdjacentHTML("afterbegin", k) : at ? at.insertAdjacentHTML("afterend", k) : v.insertAdjacentHTML("afterbegin", k); } }
          else if (!DETAIL && tab === "yfirlit") { const n = window.vtPending().length;
            if (n && !v.querySelector(".vtban") && !v.querySelector('.h2bi[data-act="vtsta"]')) { const at = v.querySelector(".snjban") || v.querySelector(".phead, .h2top"), h = `<button type="button" class="vtban" data-act="vtsta"><span class="vtbi">${n}</span><span class="vtbx"><b>${n === 1 ? "1 tími bíður" : n + " tímar bíða"} staðfestingar</b><small>Skráðir af vettvangsnotendum – staðfestu eða hafnaðu</small></span><span class="vtbg">Fara yfir →</span></button>`;
              at ? at.insertAdjacentHTML("afterend", h) : v.insertAdjacentHTML("afterbegin", h); } }
          if (!DETAIL && ["timar", "tfaer", "tskyr"].includes(tab)) { const ps = window.vtPending();
            if (ps.length && !v.querySelector(".vtkort")) { const h = v.querySelector(".uhead") || v.querySelector(".phead"); (h ? h : v).insertAdjacentHTML(h ? "afterend" : "afterbegin", window.vtKort(ps)); } }
        }
      } catch (e) { console.warn("vtKort", e); }
      return r;
    };
    window.render.__vt2 = true;
  };
  wrap2(); document.addEventListener("DOMContentLoaded", wrap2); setTimeout(wrap2, 0);
})();
