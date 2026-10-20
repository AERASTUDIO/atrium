/* Prufugögn (frá 2.7.0): admin getur hlaðið inn uppspunnum gögnum í raunverulega uppsetningu til að prófa
   appið (viðskiptavinir, verkefni með undirverkum, fundir, tímar, útlagður kostnaður og reikningar) og eytt
   þeim öllum í einu síðar. Allt er merkt prufa: true; annað er aldrei snert.
   Þegar Leiga eða Sala er virk bætast við vörur og tilboð úr sala.js (salaPrufa), tengd prufuviðskiptavinunum.
   Stillingar › Prufugögn (aðeins admin). Engar möppur eru stofnaðar á SharePoint/OneDrive fyrir prufuverkefni.
   Öll nöfn, kennitölur og tölur eru uppspuni. */
(function () {
  const gid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
  const p2 = n => String(n).padStart(2, "0");
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const day = (off, hm) => { const x = new Date(d0); x.setDate(x.getDate() + off); const s = isoDay(x); return hm ? s + "T" + hm + ":00" : s; };
  const iso = off => new Date(d0.getTime() + off * 864e5 + 10 * 36e5).toISOString();
  const KEYS = ["vidskiptavinir", "verkefni", "fundir", "kostnadur", "reikningar", "vorur", "tilbod"];
  const fx = s => ({ ...Object.fromEntries(KEYS.map(k => [k, s[k] || []])), timar: s.timar?.faerslur || [] });

  function gogn() {
    const yr = d0.getFullYear(), me = ME(), thj = THJ(), T1 = thj[0] || "Almennt", T2 = thj[1] || T1;
    const leiga = !window.ON || ON("leiga") || ON("sala");
    const C = (name, o) => ({ id: gid(), name, hlutverk: ["Viðskiptavinur"], kennitala: "", vsknr: "", heimilisfang: "", postnumer: "", stadur: "", simi: "", netfang: "", vefsida: "", tengilidur: "", simiT: "", netfangT: "", athugasemdir: "Prufugögn.", prufa: true, ...o });
    const vsk = [
      C("Viðskiptavinur A", { kennitala: "000000-0901", heimilisfang: "Gata 1", postnumer: "600", stadur: "Bær", simi: "555 0901", netfang: "hotel@prufa.example", tengilidur: "Tengiliður A", netfangT: "katrin@prufa.example" }),
      C("Viðskiptavinur B", { hlutverk: ["Viðskiptavinur", "Verkkaupi"], kennitala: "000000-0902", heimilisfang: "Gata 2", postnumer: "220", stadur: "Bær", simi: "555 0902", netfang: "info@vidburdir.example", tengilidur: "Tengiliður B" }),
      C("Viðskiptavinur C", { kennitala: "000000-0903", heimilisfang: "Gata 3", postnumer: "101", stadur: "Bær", netfang: "matur@veitingar.example", tengilidur: "Tengiliður C" }),
      C("Viðskiptavinur D", { kennitala: "000000-0904", heimilisfang: "Gata 4", postnumer: "800", stadur: "Bær", netfang: "stofnun@prufa.example", tengilidur: "Tengiliður D" })
    ];
    const [h, v, r, s] = vsk;
    const sub = (pnr, k, name, stada, skil, timar) => ({ id: gid(), nr: `${pnr}-${p2(k)}`, heiti: `${pnr}-${p2(k)} ${name}`, stada, skiladagur: skil == null ? null : day(skil), timar, serMappa: null, mappa: null, lysing: null });
    const P = (k, stutt, stada, cl, o) => { const nr = `${yr}-${90 + k}`; return { id: gid(), nr, stutt, nafn: nr + " " + stutt, stada, vskId: cl.id, vidskiptavinur: cl.name, vkId: null, verkkaupi: null, thjonusta: [T1], timar: 0, aklst: null, tilbod: null, skiladagur: null, vidburdur: null, yfirlit: null, mappa: null, starfsmenn: [me], athugasemdir: [], lysing: null, naest: null, athuga: null, undirverk: [], prufa: true, ...(o ? o(nr) : {}) }; };
    const verkefni = leiga ? [
      P(1, "Árshátíð", "Í vinnslu", v, nr => ({ deild: "leiga", vkId: v.id, verkkaupi: v.name, thjonusta: [T1, T2], aklst: 60, tilbod: 2850000, skiladagur: day(12), vidburdur: day(12, "18:00"),
        lysing: "Hljóð, ljós og LED-veggur fyrir árshátíð, 600 gestir. Uppsetning daginn áður.", naest: "Staðfesta sviðsteikningu og keyrsluplan.", athuga: "Aðgengi að hleðslubrú frá kl. 8.",
        athugasemdir: [{ id: gid(), t: "Viðskiptavinur vill bæta við tveimur skjám í anddyri.", d: iso(-1), sk: me }],
        undirverk: [sub(nr, 1, "Vettvangsskoðun", "Done", -8, 3), sub(nr, 2, "Teikning og keyrsluplan", "In progress", 4, 6), sub(nr, 3, "Uppsetning", "Not started", 11, 0), sub(nr, 4, "Viðburður og niðurtaka", "Not started", 12, 0)] })),
      P(2, "Ráðstefna – fundarsalur", "Tilboð", h, nr => ({ deild: "leiga", thjonusta: [T1], tilbod: 640000, skiladagur: day(5), vidburdur: day(5, "09:00"), lysing: "Hljóðkerfi, skjávarpi og tveir skjáir fyrir eins dags ráðstefnu.", undirverk: [sub(nr, 1, "Tilboð", "In progress", 1, 1)] })),
      P(3, "Hljóðkerfi fyrir veitingastað", "Í yfirferð", r, nr => ({ deild: "sala", thjonusta: [T2], aklst: 30, tilbod: 1950000, skiladagur: day(20), lysing: "Loftahátalarar, magnari og veggstýring (install).", naest: "Yfirfara teikningu með eiganda.",
        undirverk: [sub(nr, 1, "Mælingar", "Done", -6, 4), sub(nr, 2, "Teikning", "Done", -2, 5), sub(nr, 3, "Uppsetning", "Up next", 18, 0)] })),
      P(4, "Útitónleikar", "Beiðni", s, nr => ({ deild: "leiga", thjonusta: [T1], skiladagur: null, vidburdur: day(40, "16:00"), lysing: "Fyrirspurn um svið, hljóð og ljós fyrir 3 daga útihátíð." })),
      P(5, "Jólatónleikar", "Afhent", v, nr => ({ deild: "leiga", thjonusta: [T1, T2], skiladagur: day(-20), undirverk: [sub(nr, 1, "Uppsetning", "Done", -21, 10), sub(nr, 2, "Tónleikar", "Done", -20, 8)] })),
      P(6, "Kynning", "Reikningsfært", r, nr => ({ deild: "sala", thjonusta: [T1], skiladagur: day(-45) }))
    ] : [
      P(1, "Hönnun anddyris", "Í vinnslu", h, nr => ({ aklst: 40, tilbod: 650000, skiladagur: day(9), lysing: "Prufuverkefni.", undirverk: [sub(nr, 1, "Forsendur", "Done", -12, 6), sub(nr, 2, "Teikningar", "In progress", 3, 10), sub(nr, 3, "Útgáfa", "Not started", 9, 0)] })),
      P(2, "Teikningar veitingastaðar", "Í yfirferð", r, nr => ({ tilbod: 380000, skiladagur: day(2), undirverk: [sub(nr, 1, "Módel", "Done", -10, 9), sub(nr, 2, "Yfirferð", "In progress", 2, 2)] })),
      P(3, "Ráðgjöf", "Tilboð", s, nr => ({ tilbod: 1200000, skiladagur: day(30) })),
      P(4, "Fyrirspurn", "Beiðni", v),
      P(5, "Eldra verkefni", "Afhent", v, nr => ({ skiladagur: day(-25) })),
      P(6, "Lokið og reikningsfært", "Reikningsfært", r, nr => ({ skiladagur: day(-60) }))
    ];
    const [a1, a2, a3, , a5, a6] = verkefni, su = (p, i) => p.undirverk[i]?.id || null;
    const TT = (off, p, si, lys, fra, til, t) => ({ id: gid(), date: day(off), lysing: lys, nr: p.nr, verkefniId: p.id, undirverkId: su(p, si), fra, til, timar: t, starfsmadur: me, timabil: timabilOf(day(off)), prufa: true });
    const timar = [
      TT(0, a1, 1, "Keyrsluplan og ljósateikning", "08:30", "11:30", 3), TT(-1, a1, 1, "Sviðsteikning", "09:00", "12:00", 3),
      TT(-1, a3, 1, "Teikning loftahátalara", "13:00", "16:00", 3), TT(-2, a3, 1, "Teikning, lagnaleiðir", "09:00", "11:00", 2),
      TT(-3, a2, 0, "Tilboðsgerð", "10:00", "11:00", 1), TT(-6, a3, 0, "Mælingar á staðnum", "09:00", "13:00", 4),
      TT(-8, a1, 0, "Vettvangsskoðun", "14:00", "17:00", 3), TT(-20, a5, 1, "Tónleikar – keyrsla", "16:00", "24:00", 8),
      TT(-21, a5, 0, "Uppsetning", "08:00", "18:00", 10)
    ];
    // Samtölur á verkefnum og undirverkum úr prufutímunum
    timar.forEach(e => { const p = verkefni.find(x => x.id === e.verkefniId); p.timar = Math.round(((p.timar || 0) + e.timar) * 100) / 100; });
    const F = (name, off, hm, p, o) => ({ id: gid(), name, date: day(off, hm), stadsetning: null, fundarhlekkur: null, fundargerd: null, projectId: p?.id || null, verknr: p?.nafn || null, mappa: null, attendees: [], seria: null, prufa: true, ...o });
    const fundir = [
      F("Rennsli og keyrsluplan", 0, "14:00", a1, { stadsetning: "Salur A" }), F("Yfirferð teikninga", 2, "10:00", a3, { fundarhlekkur: "https://meet.example.com/prufa" }),
      F("Upphafsfundur ráðstefnu", 3, "13:00", a2, { stadsetning: h.name }), F("Vikufundur", -5, "09:00", null, { stadsetning: "Skrifstofa" })
    ];
    const kostnadur = [{ id: gid(), date: day(-4), verkefniId: a1.id, undirverkId: null, lysing: "Gaffer-teip og kapalbindi", upphaed: 18900, starfsmadur: me, kvittun: null, kvittunId: null, stofnad: iso(-4), prufa: true }];
    const R = S?.stillingar?.reikn || {}, sel = { nafn: (R.nafn || window.ORG?.nafn || "") + " (prufa)", kt: R.kt || "", heimilisfang: R.heimilisfang || "", vsknr: R.vsknr || "", banki: R.banki || "", netfang: R.netfang || "", simi: R.simi || "", vsk: 24, frestur: 14 };
    const kaup = c => ({ name: c.name, kennitala: c.kennitala, heimilisfang: c.heimilisfang, postnumer: c.postnumer, stadur: c.stadur, netfang: c.netfang });
    const RK = (nr, off, p, cl, lys, magn, verd, stada) => { const net = magn * verd, vs = Math.round(net * 0.24); return { id: gid(), nr, dags: day(off), gjalddagi: day(off + 14), verkefniIds: [p.id], verkefniId: p.id, vskId: cl.id, kaupandi: kaup(cl), seljandi: sel, linur: [{ lysing: lys, magn, eining: "klst.", verd }], vskP: 24, net, vsk: vs, tot: net + vs, timaIds: [], kostnIds: [], stada, greitt: stada === "Greitt" ? day(off + 10) : null, stofnad: iso(off), prufa: true }; };
    const reikningar = [RK(9001, -40, a6, r, a6.nafn, 12, 14900, "Greitt"), RK(9002, -10, a5, v, a5.nafn, 18, 14900, "Ógreitt")];
    let vorur = [], tilbod = [];
    if (window.salaPrufa && window.ON && (ON("leiga") || ON("sala")) && !(S?.vorur || []).some(x => x.prufa)) { const sp = salaPrufa([v, h]); vorur = sp.vorur; tilbod = sp.tilbod; const t1 = tilbod.find(t => t.deild === "leiga"); if (t1) t1.verkefniId = a1.id; }
    return { vidskiptavinir: vsk, verkefni, fundir, kostnadur, reikningar, timar, vorur, tilbod };
  }

  const kjarni = () => ["vidskiptavinir", "verkefni"].some(k => (S?.[k] || []).some(x => x && x.prufa));
  const count = () => { const f = fx(S || {}); return Object.fromEntries(Object.entries(f).map(([k, a]) => [k, a.filter(x => x && x.prufa).length])); };
  const HEITI = { vidskiptavinir: "viðskiptavinir", verkefni: "verkefni", fundir: "fundir", timar: "tímafærslur", kostnadur: "kostnaður", reikningar: "reikningar", vorur: "vörur", tilbod: "tilboð" };

  window.vPrufugogn = function () {
    const n = count(), tot = Object.values(n).reduce((a, b) => a + b, 0);
    const list = Object.entries(n).filter(([, c]) => c).map(([k, c]) => `${c} ${HEITI[k]}`).join(", ");
    return `<div class="viewtitle">Prufugögn</div>
      <p class="hint">Uppspunnin gögn til að prófa appið: viðskiptavinir, verkefni með undirverkum, fundir, tímar, útlagður kostnaður og reikningar${window.ON && (ON("leiga") || ON("sala")) ? ", auk vara og tilboða í Leigu og Sölu" : ""}. Allt er merkt <span class="tag">prufa</span> og má eyða í einu lagi – annað helst óbreytt. Engar möppur eru stofnaðar á SharePoint.</p>
      <div class="card" style="margin-top:12px"><div class="sub-i"><span>${tot ? "Prufugögn núna: " + esc(list) + "." : "Engin prufugögn í gagnagrunninum."}</span></div>
      <div class="links" style="margin-top:12px">${kjarni() ? "" : '<button type="button" class="btn primary" data-act="pgogn:inn">Hlaða inn prufugögnum</button>'}${tot ? '<button type="button" class="btn danger" data-act="pgogn:ut">Eyða öllum prufugögnum</button>' : ""}</div></div>`;
  };

  function act(k, r) {
    if (!can("stillingar")) return toast("Aðeins admin.");
    const a = r[0];
    if (a === "inn") {
      if (kjarni()) return toast("Prufugögn eru þegar til staðar.");
      const g = gogn();
      saveSnapshot(s => { for (const key of KEYS) s[key] = [...(s[key] || []), ...g[key]]; s.timar = s.timar || {}; s.timar.faerslur = [...(s.timar.faerslur || []), ...g.timar]; })
        .then(() => toast("Prufugögnum hlaðið inn")).catch(e => toast(errText(e)));
      return;
    }
    if (a === "ut") {
      const n = count(); if (!confirm("Eyða öllum prufugögnum?\n\n" + Object.entries(n).filter(([, c]) => c).map(([k, c]) => `${c} ${HEITI[k]}`).join("\n") + "\n\nAnnað helst óbreytt.")) return;
      saveSnapshot(s => { for (const key of KEYS) s[key] = (s[key] || []).filter(x => !x?.prufa); if (s.timar?.faerslur) s.timar.faerslur = s.timar.faerslur.filter(x => !x?.prufa); })
        .then(() => toast("Prufugögnum eytt")).catch(e => toast(errText(e)));
    }
  }
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { pgogn: act });
})();
