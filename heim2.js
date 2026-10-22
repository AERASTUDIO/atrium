/* Nýtt Heim – „Dagurinn minn“ (frá 2.15.0, útlitstillaga E1 21.–22.10.2026). Aðeins þar sem ORG.pakkaval (fyrst í dev/).
   Efst: kveðja og deildaval; vinstra megin klukkan og dagurinn þinn (tímar dagsins + dagatal), hægra megin „Bíður þín“
   þar sem hver lína er merkt pakkanum sem hún kemur frá; neðst eitt spjald fyrir hvern virkan pakka.
   Slökkt pakki hverfur úr öllu. Notar sömu gögn og föll og eldra Heim (app-grunnur.js, app-listar.js, reikn.js, sala.js). */
(function () {
  const tag = t => `<span class="h2tag">${esc(t)}</span>`;
  const today0 = () => isoDay(new Date());
  const tm = s => { const h = hhmm(s); return h || ""; };
  const krS = n => n >= 1e6 ? num(Math.round(n / 1e5) / 10) + " m.kr." : n >= 1e3 ? num(Math.round(n / 1e3)) + " þ.kr." : kr(n);

  function dagurinn() {
    const k = klukka(), td = today0(), me = ME();
    // Tímar dagsins (mínir) – tímalína með „unnið“; klukkan sjálf er efst
    const tim = ON("timar") ? faerslur().filter(e => !e.live && String(e.date || "").slice(0, 10) === td && (e.starfsmadur || me) === me)
      .map(e => ({ t: e.fra || "", title: (findProj(e.verkefniId) || projByNr(e.nr))?.stutt || cleanLys(e.lysing) || "Tímar", sub: [findProj(e.verkefniId)?.nr, "unnið " + hrs(e.timar)].filter(Boolean).join(" · "), c: "var(--muted)", act: `data-act="tab:tfaer"` })) : [];
    const cal = (calItems().get(td) || []).filter(i => !i.span).map(i => ({ t: tm(i.when), title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), c: "var(--line)", act: tapAttr(i.open.split(":")[0], i.open.slice(i.open.indexOf(":") + 1)) }));
    const rows = [...tim, ...cal].sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99")));
    if (k) { const q = findProj(k.pid); rows.push({ t: tm(k.start), title: q?.stutt || "Klukka", sub: "Klukka í gangi", c: "var(--ink)", now: true, act: `data-act="tab:timar"` }); rows.sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99"))); }
    const kl = k ? `<div class="h2klukka"><div><div class="h2ks">Klukka í gangi · ${esc([findProj(k.pid)?.nr, findProj(k.pid)?.stutt].filter(Boolean).join(" "))}</div><b class="kt" data-start="${esc(k.start)}">${elapsed(k)}</b></div><button type="button" class="btn" onclick="stopKlukka()">Stoppa og skrá</button></div>`
      : (MCP && ON("timar") ? `<div class="h2klukka idle"><div><div class="h2ks">Engin klukka í gangi</div><b>0:00:00</b></div><button type="button" class="btn" onclick="kind='tima';PREFILL={timer:true};openSheet()">▶ Byrja klukku</button></div>` : "");
    const pk = [ON("dagatal") || ON("fundir") ? "Verkstjórn" : "", ON("timar") ? "Tímar" : ""].filter(Boolean).join(" · ");
    return `<section class="card h2card" aria-label="Dagurinn">${kl}
      <div class="h2hd"><h3>Dagurinn þinn</h3>${pk ? tag(pk) : ""}</div>
      ${rows.length ? `<div class="h2tl">${rows.map(r => `<a class="h2row tap" ${r.act}><span class="h2t">${esc(r.t || "—")}</span><span class="h2b" style="--c:${r.c}"><span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span>${r.now ? '<em>Núna</em>' : ""}</span></a>`).join("")}</div>`
        : `<p class="h2empty">Ekkert á dagskrá í dag. Gott tækifæri til að vinna í friði.</p>`}</section>`;
  }

  function bidur() {
    const R = [], add = (act, t, pk) => R.push(`<a class="h2bid tap" ${act}><span>${esc(t)}</span><span class="h2r">${tag(pk)}<span aria-hidden="true">›</span></span></a>`);
    const up = upcoming(), late = up.filter(i => daysTo(i.when) < 0);
    if (late.length) add(`data-act="tab:hfrag"`, `${late.length} ${late.length === 1 ? "atriði komið" : "atriði komin"} fram yfir`, "Verkstjórn");
    const ofl = window.MS_OFL || []; if (ON("postur") && ofl.length) add(`data-act="tab:hnyl"`, `${ofl.length} ${ofl.length === 1 ? "póstur" : "póstar"} til að tengja verkefni`, "Póstur");
    const spU = ON("spjall") && window.spUnread ? spUnread() : 0; if (spU) add(`data-act="tab:spjall"`, `${spU} ólesin í spjalli`, "Spjall");
    const TB = (S?.tilbod || []).filter(T => window.inDeild ? inDeild(T) : true);
    if (ON("leiga") || ON("sala")) { const s7 = TB.filter(T => T.stada === "Sent" && T.sent && daysTo(T.sent) <= -7); if (s7.length) add(`data-act="tab:${s7[0].deild === "sala" ? "stilbod" : "ltilbod"}"`, `${s7.length} ${s7.length === 1 ? "tilboð bíður" : "tilboð bíða"} svars í meira en viku`, "Tilboð");
      const dr = TB.filter(T => T.stada === "Drög"); if (dr.length) add(`data-act="tab:${dr[0].deild === "sala" ? "stilbod" : "ltilbod"}"`, `${dr.length} ${dr.length === 1 ? "tilboð í drögum" : "tilboð í drögum"}`, "Tilboð"); }
    if (ON("reikningar") && window.can && can("fjarmal") && window.rkOinnheimt) { const o = rkOinnheimt();
      if (o.gs.length) add(`data-act="tab:trk"`, `Óreikningsfært í ${o.gs.length} ${o.gs.length === 1 ? "verkefni" : "verkefnum"} · ${krS(o.ub)}`, "Fjármál");
      if (o.late.length) add(`data-act="tab:trk"`, `${o.late.length} ${o.late.length === 1 ? "reikningur" : "reikningar"} fram yfir gjalddaga`, "Fjármál"); }
    const lateSub = ON("undirverk") ? verkD().flatMap(p => (p.undirverk || []).filter(u => u.stada !== "Done" && u.skiladagur && daysTo(u.skiladagur) < 0)) : [];
    if (lateSub.length) add(`data-act="tab:undir"`, `${lateSub.length} ${lateSub.length === 1 ? "verkþáttur" : "verkþættir"} á eftir áætlun`, "Verkstjórn");
    const wt = verkD().filter(p => p.stada === STODUR()[0]?.n); if (wt.length) add(`data-act="tab:verk"`, `${wt.length} ${wt.length === 1 ? "verkefni bíður" : "verkefni bíða"} svars`, "Verkefni");
    if (window.MS && MS.hadLogin && MS.hadLogin() && !MS.on()) add(`data-act="mslogin"`, "Tenging við Microsoft rann út – tengjast aftur", "Microsoft 365");
    return `<section class="card h2card" aria-label="Bíður þín"><div class="h2hd"><h3>Bíður þín</h3></div>
      ${R.length ? `<div class="h2bids">${R.join("")}</div>` : `<p class="h2empty">Ekkert sem bíður. Vel gert.</p>`}
      <p class="h2note">Hver lína kemur frá þeim pakka eða tengingu sem er virk – slökktur pakki hverfur héðan.</p></section>`;
  }

  function spjold() {
    const W = [], w = (pk, t, v, s, act) => W.push(`<a class="card h2tile tap" ${act}><span class="h2hd"><span>${esc(t)}</span>${tag(pk)}</span><b>${v}</b><small>${esc(s)}</small></a>`);
    if (ON("timar")) { const goal = +CFG().vikumark || 40, k = klukka(), wk = weekSum(0, STARFS().length > 1 ? ME() : null, true) + (k ? liveWeekH(k.start) : 0);
      w("Tímar", "Vikan þín", `${num(Math.round(wk * 10) / 10)} <span>/ ${num(goal)} klst.</span>`, `${Math.round(Math.min(1, wk / goal) * 100)} % af markmiði`, `data-act="tab:timar"`); }
    if (ON("leiga") || ON("sala")) { const TB = (S?.tilbod || []).filter(T => window.inDeild ? inDeild(T) : true), op = TB.filter(T => ["Drög", "Sent"].includes(T.stada));
      w("Tilboð og verðlisti", "Tilboð í ferli", num(op.length), `${TB.filter(T => T.stada === "Sent").length} send · ${TB.filter(T => T.stada === "Drög").length} í drögum`, `data-act="tab:${ON("leiga") ? "ltilbod" : "stilbod"}"`); }
    if (ON("reikningar") && window.can && can("fjarmal") && window.rkOinnheimt) { const o = rkOinnheimt();
      w("Fjármál", "Óinnheimt", krS(o.tot), "óreikningsfært + ógreitt", `data-act="tab:trk"`); }
    if (ON("leiga")) { const td = today0(), uti = (S?.tilbod || []).filter(T => T.deild !== "sala" && T.stada === "Samþykkt" && T.fra && String(T.fra).slice(0, 10) <= td && String(T.til || T.fra).slice(0, 10) >= td);
      w("Búnaður og lager", "Í útleigu í dag", num(uti.length), uti.length ? uti.map(T => T.heiti).filter(Boolean).slice(0, 2).join(", ") : "Ekkert úti í dag", `data-act="tab:ltilbod"`); }
    if (ON("undirverk") || ON("dagatal")) { const n = upcoming().find(i => daysTo(i.when) >= 0);
      w("Verkstjórn", "Næst á dagskrá", n ? esc(rel(daysTo(n.when))) : "–", n ? n.title : "Ekkert framundan", n ? tapAttr(n.open.split(":")[0], n.open.slice(n.open.indexOf(":") + 1)) : `data-act="tab:dagatal"`); }
    return W.length ? `<div class="h2tiles">${W.join("")}</div>` : "";
  }

  window.vHeim2 = function () {
    const hr = new Date().getHours(), first = (STARFS().find(x => x.sk === ME())?.nafn || "").split(" ")[0];
    const greet = hr < 5 ? "Góða nótt" : hr < 11 ? "Góðan daginn" : hr < 18 ? "Góðan dag" : "Gott kvöld";
    return `<div class="h2">
      <div class="h2top"><div><div class="h2date">${esc(dayTitle(new Date()))}</div><h2 class="hello">${greet}${first ? ", " + esc(first) : ""}</h2></div></div>
      <div class="h2grid">${dagurinn()}${bidur()}</div>
      ${spjold()}
    </div>`;
  };
})();
