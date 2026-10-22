/* Nýtt Heim – „Dagurinn minn“ (frá 2.15.0, tillaga E1 á teikifletinum „Atrium – útlitstillögur“).
   Aðeins þar sem ORG.pakkaval er virkt (fyrst í dev/). Byggt á einingaskiptingunni (kjarni.js): hvert atriði er merkt
   pakkanum eða tengingunni sem það kemur frá og hverfur ef sá pakki er óvirkur.
   - Efst: kveðja og dagsetning.
   - Dagurinn þinn: klukka (eða Byrja klukku) og tímalína dagsins – fundir, skil og tímar dagsins.
   - Bíður þín: það sem þarf að sinna, hvert atriði merkt pakka.
   - Spjöld: eitt fyrir hvern virkan pakka (Tímar, Tilboð, Fjármál, Búnaður) og verkefni í gangi (kjarni). */
(function () {
  const tag = t => `<span class="h2tag">${esc(t)}</span>`;
  const G = k => (window.PAKKAR?.[k]?.[0]) || (window.TENGINGAR?.[k]?.[0]) || k;
  const tilbodOn = () => ON("leiga") || ON("sala");
  const fjOn = () => ON("reikningar") && !!(window.can && can("fjarmal"));
  const tbAll = () => (S?.tilbod || []).filter(T => !T.deild || ON(T.deild)).filter(T => !window.inDeild || inDeild(T));
  const net = T => { try { return window.tbTotals ? +tbTotals(T).net || 0 : 0; } catch (e) { return 0; } };

  function dagurinn() {
    const k = klukka(), ti = isoDay(today);
    const items = (calItems().get(ti) || []).filter(i => !i.span).map(i => ({ t: hhmm(i.when) || "", title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), attr: tapAttr(i.open.split(":")[0], i.open.slice(i.open.indexOf(":") + 1)), c: "var(--line)" }));
    const me = STARFS().length > 1 ? ME() : null;
    const done = ON("timar") ? faerslur().filter(e => e.date === ti && !e.live && (!me || !e.sk || e.sk === me)).map(e => ({ t: e.fra || "", title: cleanLys(e.lysing) || (findProj(e.verkefniId)?.stutt || "Tímar"), sub: [(findProj(e.verkefniId) || projByNr(e.nr))?.nr, "unnið " + hrs(e.timar)].filter(Boolean).join(" · "), attr: `role="button" tabindex="0" data-open="time:${esc(e.id)}"`, c: "var(--muted)" })) : [];
    const rows = [...done, ...items].sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99")));
    if (k) { const q = findProj(k.pid); rows.push({ t: hhmm(k.start), title: q?.stutt || "Klukka", sub: [q?.nr, "klukka í gangi"].filter(Boolean).join(" · "), attr: 'data-act="tab:timar" role="button" tabindex="0"', c: "var(--ink)", now: 1 });
      rows.sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99"))); }
    const kl = k
      ? `<div class="h2klukka"><div><div class="h2ks">Klukka í gangi · ${esc([findProj(k.pid)?.nr, findProj(k.pid)?.stutt].filter(Boolean).join(" "))}</div><b class="kt" data-start="${esc(k.start)}">${elapsed(k)}</b></div><button type="button" class="btn" onclick="stopKlukka()">Stoppa og skrá</button></div>`
      : (MCP && ON("timar") ? `<button type="button" class="btn h2start" onclick="kind='tima';PREFILL={timer:true};openSheet()">▶ Byrja klukku</button>` : "");
    const tl = rows.length
      ? rows.map(r => `<a class="h2tl" ${r.attr}><span class="h2t">${esc(r.t || "")}</span><span class="h2b" style="border-color:${r.c}"><span class="h2bt"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span>${r.now ? '<span class="h2now">Núna</span>' : ""}</span></a>`).join("")
      : `<p class="hint" style="margin:6px 0 0">Ekkert á dagskrá í dag.</p>`;
    const src = [ON("dagatal") || ON("fundir") ? G("verkstjorn") : "", ON("timar") ? G("timar") : ""].filter(Boolean).join(" · ");
    return `<section class="card h2card" aria-label="Dagurinn þinn">${kl}<div class="h2hd"><h3>Dagurinn þinn</h3>${src ? tag(src) : ""}</div><div>${tl}</div></section>`;
  }

  function bidur() {
    const R = [], row = (act, txt, src) => R.push(`<a class="h2bi" data-act="${act}" role="button" tabindex="0"><span>${txt}</span><span class="h2br">${tag(src)}<span aria-hidden="true">›</span></span></a>`);
    if (window.MS && MS.hadLogin && MS.hadLogin() && !MS.on()) row("mslogin", "Tenging við Microsoft rann út – tengjast aftur", "Microsoft 365");
    const late = upcoming().filter(i => daysTo(i.when) < 0); if (late.length) row("tab:hfrag", `${late.length} ${late.length === 1 ? "atriði komið" : "atriði komin"} fram yfir`, G("verkstjorn"));
    const ofl = (window.MS_OFL || []).length; if (ON("postur") && ofl) row("tab:postur", `${ofl} ${ofl === 1 ? "póstur" : "póstar"} til að tengja verkefni`, G("m365postur"));
    if (tilbodOn()) { const old = tbAll().filter(T => T.stada === "Sent" && daysTo(T.sent || T.dags) <= -7);
      if (old.length) row(`tab:${(old[0].deild || "leiga") === "sala" ? "stilbod" : "ltilbod"}`, old.length === 1 ? `Tilboð ${esc(old[0].nr)} bíður svars í ${-daysTo(old[0].sent || old[0].dags)} daga` : `${old.length} tilboð bíða svars í meira en viku`, G("tilbod")); }
    if (fjOn()) {
      const ob = window.rkUnbilled ? [...verkefni().map(p => p.id), null].map(k => rkUnbilled(k)) : [];
      const n = ob.filter(x => sumT(x.es) >= 1 || sumK(x.ks)).length; if (n) row("tab:trk", `Óreikningsfærðir tímar í ${n} ${n === 1 ? "verkefni" : "verkefnum"}`, G("fjarmal"));
      const og = (S?.reikningar || []).filter(r => r.stada !== "Greitt" && r.stada !== "Ógilt"); if (og.length) row("tab:trk", `${og.length} ${og.length === 1 ? "ógreiddur reikningur" : "ógreiddir reikningar"} · ${kr(og.reduce((a, r) => a + (+r.tot || 0), 0))}`, G("fjarmal"));
    }
    const sk = (S?.skjol || []).filter(x => x.snid && x.stadur === "oflokkad").length; if (ON("skjol") && sk) row("tab:skjol", `${sk} óflokkuð skjöl`, G("m365skrar"));
    const wt = verkD().filter(p => p.stada === STODUR()[0]?.n); if (wt.length) row("tab:verk", `${wt.length} ${wt.length === 1 ? "verkefni bíður" : "verkefni bíða"} svars (${esc(STODUR()[0].n)})`, "Verkefni");
    return `<section class="card h2card" aria-label="Bíður þín"><div class="h2hd"><h3>Bíður þín</h3></div>${R.length ? `<div class="h2bl">${R.join("")}</div>` : `<p class="hint" style="margin:6px 0 0">Ekkert bíður þín – vel gert.</p>`}
      <p class="hint" style="margin:10px 2px 0;font-size:12px">Hver lína kemur frá pakka eða tengingu sem er virk.</p></section>`;
  }

  function spjold() {
    const T = [], tile = (src, t, v, s, act) => T.push(`<a class="card h2tile" data-act="${act}" role="button" tabindex="0"><span class="h2hd"><span class="h2tt">${esc(t)}</span>${tag(src)}</span><b class="h2v">${v}</b><small>${s}</small></a>`);
    if (ON("timar")) { const goal = +CFG().vikumark || 40, k = klukka(), wk = weekSum(0, STARFS().length > 1 ? ME() : null, true) + (k ? liveWeekH(k.start) : 0);
      tile(G("timar"), "Vikan þín", `${num(Math.round(wk * 10) / 10)} / ${num(goal)} klst.`, `${Math.round(Math.min(1, wk / goal) * 100)} % af markmiði`, "tab:timar"); }
    if (tilbodOn()) { const op = tbAll().filter(T => ["Drög", "Sent"].includes(T.stada));
      tile(G("tilbod"), "Tilboð í ferli", String(op.length), op.length ? kr(op.reduce((a, T) => a + net(T), 0)) + " samtals" : "engin opin tilboð", `tab:${ON("leiga") ? "ltilbod" : "stilbod"}`); }
    if (fjOn()) { const ob = window.rkUnbilledKr ? [...verkefni().map(p => p.id), null].reduce((a, k) => a + (+rkUnbilledKr(k) || 0), 0) : 0, og = (S?.reikningar || []).filter(r => r.stada !== "Greitt" && r.stada !== "Ógilt").reduce((a, r) => a + (+r.tot || 0), 0);
      tile(G("fjarmal"), "Óinnheimt", kr(ob + og), "óreikningsfært + ógreitt", "tab:trk"); }
    if (ON("leiga")) { const ti = isoDay(today), out = tbAll().filter(T => (T.deild || "leiga") === "leiga" && T.stada === "Samþykkt" && T.fra && T.fra <= ti && (T.til || T.fra) >= ti), nxt = tbAll().filter(T => (T.deild || "leiga") === "leiga" && T.stada === "Samþykkt" && T.fra > ti);
      tile(G("bunadur"), "Í útleigu í dag", String(out.length), nxt.length ? `${nxt.length} samþykkt framundan` : "ekkert framundan", "tab:ltilbod"); }
    const act = verkD().filter(p => !isDone(p)).length; tile("Verkefni", "Verkefni í gangi", String(act), `${verkD().flatMap(p => (p.undirverk || []).filter(u => u.stada !== "Done")).length} opnir verkþættir`, "tab:verk");
    return `<div class="h2tiles">${T.join("")}</div>`;
  }

  window.vHeim2 = function () {
    const hr = new Date().getHours(), first = (STARFS().find(x => x.sk === ME())?.nafn || window.USER?.nafn || "").split(" ")[0];
    const greet = hr < 5 ? "Góða nótt" : hr < 11 ? "Góðan daginn" : hr < 18 ? "Góðan dag" : "Gott kvöld";
    return `<div class="h2"><div class="h2top"><div><div class="h2date">${esc(dayTitle(today))}</div><h2 class="hello" style="margin:2px 0 0">${greet}${first ? ", " + esc(first) : ""}</h2></div></div>
      <div class="h2grid">${dagurinn()}${bidur()}</div>${spjold()}</div>`;
  };
})();
