/* Starfsfólk (2.102.0): spjald starfsmanns eða vettvangsnotanda (Starfsfólk í vinstri stiku, áður Spjall › Samstarfsfólk).
   Bætt við spjaldið í ui1-skjair.js › U.teymi: dagskrá næstu 14 daga (pantanir, verkefni og fundir viðkomandi), opnar pantanir,
   tímar sem bíða staðfestingar (staðfesta beint – vett-ui.js) og síðustu tímaskráningar (þegar notandinn má sjá þær). */
(function () {
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const lc = s => String(s || "").trim().toLowerCase();
  const day = x => String(x || "").slice(0, 10);
  const MS3 = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"], DN3 = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
  const dlab = iso => { const x = new Date(day(iso) + "T12:00"); return isNaN(x) ? "" : `${DN3[x.getDay()]} ${x.getDate()}. ${MS3[x.getMonth()]}`; };
  const css = document.createElement("style");
  css.textContent = `
  .fk-sec { margin-top: 18px; } .fk-sec > h4 { margin: 0 0 8px; font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; display: flex; justify-content: space-between; }
  .fk-l { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--surface, #fff); }
  .fk-r { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--line); color: inherit; text-decoration: none; min-height: 48px; }
  .fk-r:last-child { border-bottom: 0; } a.fk-r { cursor: pointer; } a.fk-r:hover { background: color-mix(in srgb, var(--bg) 60%, transparent); }
  .fk-d { width: 78px; flex: none; font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .fk-t { flex: 1; min-width: 0; display: flex; flex-direction: column; } .fk-t b { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .fk-t small { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fk-k { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; background: var(--bg); color: var(--muted); white-space: nowrap; flex: none; }
  .fk-h { font-variant-numeric: tabular-nums; font-size: 13.5px; flex: none; }
  .fk-e { padding: 12px 14px; font-size: 13.5px; color: var(--muted); }
  `;
  document.head.appendChild(css);

  window.folkExtra = function (u) {
    if (!u) return "";
    const em = lc(u.email), sk = u.sk, ti = tr(() => isoDay(today), new Date().toISOString().slice(0, 10));
    const til = (() => { const x = new Date(ti + "T12:00"); x.setDate(x.getDate() + 14); return x.toISOString().slice(0, 10); })();
    const PN = tr(() => window.salaAPI ? salaAPI.PN() : (S.pantanir || []), []);
    const mine = P => tr(() => window.tbMenn(P).has(em), false) || (P.starfsmenn || []).includes(sk);
    const opnar = PN.filter(P => mine(P) && !["Lokið", "Hætt við", "Skilað", "Hafnað"].includes(P.stada)).sort((a, b) => String(a.fra || "9").localeCompare(String(b.fra || "9")));
    // Dagskrá: afhendingar og skil pantana, verkefni sem byrja/enda og fundir þar sem viðkomandi er þátttakandi
    const D = [];
    opnar.forEach(P => { const f = day(P.fra), t = day(P.til || P.fra);
      if (f && f >= ti && f <= til) D.push({ d: f, k: "Afhending", t: (P.nr || "") + " " + (P.heiti || ""), s: P.vidskiptavinur || "", o: "tb:" + P.id });
      if (t && t !== f && t >= ti && t <= til) D.push({ d: t, k: "Skil", t: (P.nr || "") + " " + (P.heiti || ""), s: P.vidskiptavinur || "", o: "tb:" + P.id }); });
    const verk = tr(() => verkefni(), []).filter(p => !tr(() => isDone(p), false) && (p.starfsmenn || []).some(x => (x.sk || x) === sk));
    verk.forEach(p => { const f = day(p.timabilFra || p.vidburdur), t = day(p.timabilTil || p.skil);
      if (f && f >= ti && f <= til) D.push({ d: f, k: "Verkefni", t: (p.nr || "") + " " + (p.stutt || p.nafn || ""), s: "Hefst", o: "verk:" + p.id });
      if (t && t !== f && t >= ti && t <= til) D.push({ d: t, k: "Verkefni", t: (p.nr || "") + " " + (p.stutt || p.nafn || ""), s: "Skil", o: "verk:" + p.id }); });
    tr(() => S.fundir || [], []).forEach(f => { const d0 = day(f.date); if (!d0 || d0 < ti || d0 > til) return;
      const att = tr(() => window.fbAtt ? fbAtt(f) : (f.attendees || []), []); if (!att.some(a => lc(a.netfang || a.email) === em) && lc(f.stofnad_af) !== em) return;
      D.push({ d: d0, k: "Fundur", t: f.name || "Fundur", s: tr(() => hhmm(f.date), "") ? "kl. " + hhmm(f.date) : "", o: "fund:" + f.id }); });
    D.sort((a, b) => a.d.localeCompare(b.d));
    const row = (d, t, s, k, o) => `<${o ? "a" : "div"} class="fk-r" ${o ? tapAttr(o.split(":")[0], o.slice(o.indexOf(":") + 1)) : ""}><span class="fk-d">${E(d)}</span><span class="fk-t"><b>${E(t)}</b>${s ? `<small>${E(s)}</small>` : ""}</span>${k ? `<span class="fk-k">${E(k)}</span>` : ""}</${o ? "a" : "div"}>`;
    let h = "";
    // Tímar sem bíða staðfestingar (vettvangsnotendur)
    const bida = window.vtPending ? vtPending(e => lc(e.eigandi) === em || (!e.eigandi && e.starfsmadur === sk)) : [];
    if (bida.length) h += `<div class="fk-sec">${window.vtKort(bida, null, { nafn: false })}</div>`;
    h += `<div class="fk-sec"><h4><span>Dagskrá næstu 14 daga</span></h4><div class="fk-l">${D.length ? D.map(x => row(dlab(x.d), x.t, x.s, x.k, x.o)).join("") : `<div class="fk-e">Ekkert á dagskrá næstu tvær vikur.</div>`}</div></div>`;
    h += `<div class="fk-sec"><h4><span>Opnar pantanir</span><span>${opnar.length || ""}</span></h4><div class="fk-l">${opnar.length ? opnar.map(P => row(P.fra ? dlab(P.fra) : "", (P.nr || "") + " " + (P.heiti || ""), P.vidskiptavinur || "", P.stada || "", "tb:" + P.id)).join("") : `<div class="fk-e">Ekki skráð(ur) á opnar pantanir.</div>`}</div></div>`;
    // Síðustu tímaskráningar – aðeins ef þær eru í gögnum þessa notanda (fjármál sjá alla; aðrir sjá vettvangstíma og sína eigin)
    const ts = tr(() => faerslur(), []).filter(e => lc(e.eigandi) === em || (!e.eigandi && e.starfsmadur === sk)).sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))).slice(0, 6);
    if (ts.length) h += `<div class="fk-sec"><h4><span>Síðustu tímaskráningar</span></h4><div class="fk-l">${ts.map(e => { const p = findProj(e.verkefniId); return `<a class="fk-r" ${tapAttr("time", e.id)}><span class="fk-d">${E(dlab(e.date))}</span><span class="fk-t"><b>${E(p ? (p.nr || "") + " " + (p.stutt || p.nafn || "") : e.nr || "Án verkefnis")}</b><small>${E([e.fra && e.fra + "–" + (e.til || ""), tr(() => cleanLys(e.lysing), "")].filter(Boolean).join(" · "))}</small></span><span class="fk-h">${E(tr(() => hrs(e.timar), e.timar))}</span>${e.stadfest ? `<span class="fk-k">Staðfest</span>` : e.hafnad ? `<span class="fk-k">Hafnað</span>` : e.vett ? `<span class="fk-k">Bíður</span>` : ""}</a>`; }).join("")}</div></div>`;
    return h;
  };
})();
