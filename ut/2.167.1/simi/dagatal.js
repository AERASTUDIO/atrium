/* simi/dagatal.js (2.157.0) – Dagatal í síma (U2d · Sími › U6): vikurönd í spjaldi, dagskrá valins dags sem spjöld með litarönd
   (fundir, skil, afhendingar og skil pantana, verk á vikuplani), Ég/Allir og „+“ í hausnum. Gögn: S2API.dayItems (simi2.js – sömu
   heimildir og tölvudagatalið: calItems, salaAPI.PN, S.dagsverk). Smellir nota data-s2 (simi2.js): day:, who, calnew:, calfull.
   Flipinn „Verk“ (pndag – vikuplan teymisins) er tölvuskjárinn í símaramma (simi/rammi.js). */
(function () {
  if (window.ORG?.simi !== "I" || !window.SM) return;
  const { E, tr, ic, N } = SM;
  const DNS = ["SUN", "MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU"], DNL = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"];
  const MNS = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"], MNL = ["Janúar", "Febrúar", "Mars", "Apríl", "Maí", "Júní", "Júlí", "Ágúst", "September", "Október", "Nóvember", "Desember"];
  const pad = n => String(n).padStart(2, "0"), iso = x => x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  const dOf = s => { const m = String(s || "").match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); };
  const CAL = new Set(["dteymi", "dagatal", "fundir", "verkdag"]);
  const COL = { bad: "var(--t-red)", acc: "var(--kacc,#2B63A6)", warm: "#C47A3A", mut: "#A9B3BF", ok: "var(--t-grn)" };
  function calHTML(t) {
    const S2 = window.S2 || {}, today = iso(new Date()), k = S2.day || today, x = dOf(k), mon = new Date(x); mon.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    const items = tr(() => S2API.dayItems(k), []);
    const wk = (() => { const d = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); const dn = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y0) / 864e5 + 1) / 7); })();
    const pv = new Date(mon); pv.setDate(mon.getDate() - 7); const nx = new Date(mon); nx.setDate(mon.getDate() + 7);
    const strip = days.map(d => { const di = iso(d), n = tr(() => S2API.dayItems(di).length, 0); return `<button type="button" class="smday${di === k ? " on" : ""}${di === today ? " td" : ""}" data-s2="day:${di}" aria-pressed="${di === k}" aria-label="${E(DNL[d.getDay()] + " " + d.getDate() + ". " + MNS[d.getMonth()] + (n ? ", " + n + " atriði" : ""))}"><small>${DNS[d.getDay()]}</small><b>${d.getDate()}</b><i class="${n ? "y" : ""}"></i></button>`; }).join("");
    const hrs = tr(() => faerslur().filter(e => String(e.date).slice(0, 10) === k && (e.starfsmadur || ME()) === ME()).reduce((a, e) => a + (+e.timar || 0), 0), 0);
    const ev = items.map(a => { const parts = String(a.s || "").split(" · "), kind = parts.length > 1 ? parts.shift() : "", sub = parts.join(" · ");
      const top = [kind, a.tm || "Allan daginn"].filter(Boolean).join(" · ");
      return `<a class="smev" ${a.open ? `data-open="${E(a.open)}"` : `data-act="${E(a.act)}"`} role="button" tabindex="0" style="--evc:${COL[a.c] || COL.mut}"><small>${E(top)}</small><b${a.done ? ' class="done"' : ""}>${E(a.t)}</b>${sub ? `<span>${E(sub)}</span>` : ""}</a>`; }).join("");
    const canAll = tr(() => STARFS().length > 1, false), mcp = tr(() => !!MCP, false);
    const right = `<div class="smhr">${canAll ? `<button type="button" class="smpillb" data-s2="who" aria-label="Sýna: ${S2.who === "all" ? "allir" : "ég"}">${S2.who === "all" ? "Allir" : "Ég"}${ic("down", 14, 2)}</button>` : ""}${mcp ? `<button type="button" class="smib gr" data-s2="calnew:${k}" aria-label="Nýtt á dagatal">${ic("plus", 20, 2)}</button>` : ""}</div>`;
    return `<div class="smscr smfr smcal">${SM.head(`${MNL[x.getMonth()]} ${x.getFullYear()} · vika ${wk}`, "Dagskrá", right)}${SM.track(t)}`
      + `<div class="smc smstrip"><button type="button" class="smwk" data-s2="day:${iso(pv)}" aria-label="Fyrri vika">${ic("back", 18)}</button><div class="smdays">${strip}</div><button type="button" class="smwk" data-s2="day:${iso(nx)}" aria-label="Næsta vika">${ic("chev", 18)}</button></div>`
      + `<div class="smdh"><b>${E(DNL[x.getDay()] + " " + x.getDate() + ". " + MNS[x.getMonth()])}</b><span>${items.length} atriði${hrs ? " · " + E(N(Math.round(hrs * 10) / 10)) + " klst. skráðar" : ""}</span>${k !== today ? `<button type="button" class="smlnk" data-s2="day:${today}">Í dag</button>` : ""}</div>`
      + (ev ? `<div class="smevs">${ev}</div>` : SM.empty(`Ekkert á dagskrá${S2.who === "all" ? "" : " hjá þér"} þennan dag.`))
      + `<button type="button" class="smr smrl smfull" data-s2="calfull"><span class="smri">${ic("cal", 18)}</span><span class="smrt"><b>Mánuður og fundir</b><small>Dagatal tölvunnar</small></span>${ic("chev", 16)}</button></div>`;
  }
  SM.screens.push((t, D) => (!D && CAL.has(t) && !window.S2?.calClassic ? calHTML(t) : null));
})();
