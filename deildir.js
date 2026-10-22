/* Deildir (frá 2.8.0): skiptir appinu eftir deildum (fyrst Leiga og Sala hjá Sonik). Allir sjá allt, en
   - deildarval efst (Allar · Leiga · Sala) – munað á tækinu,
   - verkefni fá deild (p.deild = "leiga" | "sala"); verkefni án deildar birtast í öllum deildum,
   - verkefnalisti, Heim og dagatal sýna valda deild; tilboð sem verða að verkefni fá deild tilboðsins.
   Sjálfgefið óvirkt (EININGAR › deildir); deildirnar eru þær einingar Leigu og Sölu sem eru virkar. */
(function () {
  const LSK = "atr-deild";
  const LIST = [["leiga", "Leiga"], ["sala", "Sala"]];
  // Pakkaval (2.17.2): ekkert deildaval efst – síun eftir leigu/sölu er í flipum hverrar síðu (Verkefni, Tilboð)
  window.DEILDIR = () => (window.ON && ON("deildir") && !window.ORG?.pakkaval ? LIST.filter(([k]) => ON(k)) : []);
  const ls = () => { try { return localStorage.getItem(LSK) || ""; } catch (e) { return ""; } };
  // Valin deild ("" = allar). Ógild/óvirk deild telst „allar“.
  window.DEILD = () => { const v = ls(), D = DEILDIR(); return D.length > 1 && D.some(([k]) => k === v) ? v : ""; };
  window.deildHeiti = k => (LIST.find(x => x[0] === k) || [, ""])[1];
  // Blandað tilboð (2.17.0): telst til deildar ef það hefur línur af þeirri tegund (leiga/sala)
  window.inDeild = p => { const v = DEILD(); if (!v || !p) return true;
    if (p.linur) { if (!p.deild) return true; if (p.deild === "blandad") return (p.linur || []).some(l => l.teg === v) || !(p.linur || []).length; return p.deild === v; } // tilboð
    if (window.ORG?.pakkaval && p.nr) { const t = projTegs(p); return !t.size || t.has(v); } // verkefni (2.17.1): tegund + línur tilboða
    return !p.deild || p.deild === v; };
  // Tegundir verkefnis (2.17.1, pakkaval): handvirkt val (deild: leiga|sala|baedi) + tegundir lína í tilboðum verkefnisins
  window.projTegs = p => { const s = new Set(); if (!p) return s;
    if (p.deild === "leiga" || p.deild === "baedi") s.add("leiga"); if (p.deild === "sala" || p.deild === "baedi") s.add("sala");
    (typeof S !== "undefined" && S?.tilbod || []).filter(T => T.verkefniId === p.id || (p.tilbodId && T.id === p.tilbodId)).forEach(T => {
      if (T.deild === "blandad") (T.linur || []).forEach(l => { if (l.teg === "leiga" || l.teg === "sala") s.add(l.teg); }); else s.add(T.deild === "sala" ? "sala" : "leiga"); });
    return s; };
  // Val á tegund verkefnis í formi (pakkaval): Leiga · Sala · Bæði – vistast í deild
  window.tegSelect = (id, cur) => { if (!(ON("leiga") || ON("sala"))) return "";
    const o = [["", "Ekki skilgreint"], ...(ON("leiga") ? [["leiga", "Leiga"]] : []), ...(ON("sala") ? [["sala", "Sala"]] : []), ...(ON("leiga") && ON("sala") ? [["baedi", "Bæði leiga og sala"]] : [])];
    const c = cur === undefined ? ({ lverk: "leiga", sverk: "sala" }[typeof tab !== "undefined" ? tab : ""] || "") : (cur || "");
    return `<label>Tegund verkefnis<select id="${id}">${o.map(([k, l]) => `<option value="${k}"${k === c ? " selected" : ""}>${l}</option>`).join("")}</select></label><p class="hint" style="margin:-4px 0 6px">Valfrjálst – línur í tilboðum verkefnisins bætast sjálfkrafa við.</p>`; };
  window.setDeild = v => { try { localStorage.setItem(LSK, v || ""); } catch (e) {} if (typeof render === "function") render(); };

  // Val í formum verkefnis (nýtt / breyta)
  window.deildSelect = (id, cur) => { const D = DEILDIR(); if (D.length < 2) return "";
    const c = cur === undefined ? ({ lverk: "leiga", sverk: "sala" }[typeof tab !== "undefined" ? tab : ""] || DEILD()) : (cur || "");
    return `<label>Deild<select id="${id}"><option value=""${c ? "" : " selected"}>Engin (sést í öllum deildum)</option>${D.map(([k, l]) => `<option value="${k}"${k === c ? " selected" : ""}>${l}</option>`).join("")}</select></label>`; };
  window.deildVal = id => { const el = document.getElementById(id); return el ? (el.value || null) : undefined; };
  window.deildPill = p => { if (window.ORG?.pakkaval && p?.nr && !p.linur) { const t = [...projTegs(p)]; return t.length ? `<span class="pill deildpill">${esc(t.map(deildHeiti).join(" + "))}</span>` : ""; }
    return DEILDIR().length > 1 && p?.deild ? `<span class="pill deildpill">${esc(deildHeiti(p.deild))}</span>` : ""; };

  // Deildarval: í haus á tölvu; á síma efst á Heim, Verkefnum og Dagatali (hausinn er of þröngur)
  const MOB = () => window.matchMedia && matchMedia("(max-width:700px)").matches;
  const btns = v => [["", "Allar"], ...DEILDIR()].map(([k, l]) => `<button type="button" role="tab" data-d="${k}" data-act="deild:${k}" aria-selected="${v === k}">${l}</button>`).join("");
  window.deildMob = t => (MOB() && DEILDIR().length > 1 && ["yfirlit", "dagatal"].includes(t) ? `<div class="seg deildseg deildmob" role="tablist" aria-label="Deild">${btns(DEILD())}</div>` : "");
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { deild: (k, r) => setDeild(r[0] || "") });
  function hdr() {
    const D = DEILDIR(), host = document.querySelector("header .hright"); if (!host) return;
    let el = document.getElementById("deildsel");
    if (D.length < 2 || MOB()) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "deildsel"; el.className = "seg deildseg"; el.setAttribute("role", "tablist"); el.setAttribute("aria-label", "Deild"); host.insertBefore(el, host.firstChild);
      el.addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) { e.stopPropagation(); setDeild(b.dataset.d); } }); }
    const html = btns(DEILD());
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  window.deildHdr = hdr;
  // Leiga › Verkefni og Sala › Verkefni (2.8.1): verkefni deildarinnar undir hennar eigin hluta
  Object.assign(window.VIEWS_EXT = window.VIEWS_EXT || {}, { lverk: () => vVerk("leiga"), sverk: () => vVerk("sala"), lvsk: () => vVsk("leiga"), svsk: () => vVsk("sala") });
})();
