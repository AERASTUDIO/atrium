/* Fjölval í listum (2.71.0): haka við tilboð, pantanir, verkefni eða viðskiptavini og breyta stöðu eða eyða mörgum í einu.
   Gátreitur birtist vinstra megin í röðinni (við bendil, alltaf þegar eitthvað er valið), „velja allt“ í dálkahausnum.
   Aðgerðastika efst í listanum: N valin · Breyta stöðu · Eyða · Hætta. Aðeins í tölvu (breiðir listar). */
(() => {
  const TABS = { tb: ["ltilbod", "tbl", "tbs", "tbt", "pantanir", "pnl", "pns", "pnt"], verk: ["verk", "lverk", "sverk", "tverk"], vsk: ["vsk", "vskl", "vsks", "vskt"], vr: ["lvorur", "svorur"] };   // vr (2.95.1): vörulisti – eyða mörgum í einu
  const kindOf = t => Object.keys(TABS).find(k => TABS[k].includes(t)) || null;
  let SEL = new Set(), selTab = "", last = null;
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const curTab = () => { try { return tab; } catch (e) { return ""; } };
  const canEd = () => { try { return !!MCP; } catch (e) { return false; } };
  const rows = () => [...document.querySelectorAll("#view .splist .urow[data-open], #view .uwl .urow[data-open]")];
  const idOf = r => { const o = r.getAttribute("data-open") || ""; return o.slice(o.indexOf(":") + 1); };
  const isPant = () => /^(pantanir|pn[lst])$/.test(curTab());
  const findT = id => (window.salaAPI ? [...salaAPI.TB(), ...salaAPI.PN()] : []).find(x => String(x.id) === String(id));
  const TR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  const CK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

  function statuses(k) {
    if (k === "verk") return (typeof STVAL === "function" ? STVAL() : []).map(x => x.n);
    if (k === "tb") return isPant() ? ["Ný", "Staðfest", "Lokið"] : ["Drög", "Sent", "Hafnað"];   // samþykki og afhending/skil fara í gegnum sína glugga
    return [];
  }
  function deco() {
    const t = curTab(), k = kindOf(t); if (t !== selTab) { SEL.clear(); selTab = t; last = null; }
    const list = document.querySelector("#view .splist") || document.querySelector("#view .uwl"); if (!k || !list || !canEd()) return;
    // Aðeins í tölvu: í síma ruglaði gátreiturinn röð dálka (heiti hvarf úr listum pantana og tilboða)
    if (!matchMedia("(min-width:1024px)").matches) { document.querySelectorAll("#view .fvck, #view .fvtr, #view .fvbar").forEach(x => x.remove()); SEL.clear(); document.querySelector("#view")?.classList.remove("fvon"); return; }
    const delOk = k === "tb" || typeof can !== "function" || can("eyda");
    const rs = rows(); const ids = new Set(rs.map(idOf)); [...SEL].forEach(id => { if (!ids.has(id)) SEL.delete(id); });
    rs.forEach(r => { if (!r.querySelector(":scope > .fvck")) r.insertAdjacentHTML("afterbegin", `<span class="fvck" role="checkbox" tabindex="-1" aria-label="Velja">${CK}</span>`);
      if (delOk && !r.querySelector(":scope > .fvtr")) r.insertAdjacentHTML("beforeend", `<span class="fvtr" role="button" tabindex="-1" title="Eyða" aria-label="Eyða">${TR}</span>`);
      const on = SEL.has(idOf(r)); r.classList.toggle("fvsel", on); r.querySelector(".fvck").setAttribute("aria-checked", on); });
    const hd = list.querySelector(".ucols"); if (hd && !hd.querySelector(".fvck")) hd.insertAdjacentHTML("afterbegin", `<span class="fvck fvall" role="checkbox" tabindex="0" aria-label="Velja allt">${CK}</span>`);
    const all = hd?.querySelector(".fvall"); if (all) { const n = rs.filter(r => SEL.has(idOf(r))).length; all.setAttribute("aria-checked", n && n === rs.length ? "true" : n ? "mixed" : "false"); }
    document.querySelector("#view")?.classList.toggle("fvon", SEL.size > 0);
    bar(k);
  }
  function bar(k) {
    const host = document.querySelector("#view .splist .phead") || document.querySelector("#view .phead"); let b = document.querySelector("#view .fvbar");
    if (!SEL.size) { b?.remove(); return; } if (!host) return;
    const st = statuses(k), del = k === "tb" || typeof can !== "function" || can("eyda");
    const html = `<span class="fvn">${SEL.size} ${SEL.size === 1 ? "valið" : "valin"}</span>${st.length ? `<label class="fvst"><select aria-label="Breyta stöðu"><option value="">Breyta stöðu…</option>${st.map(s => `<option>${E(s)}</option>`).join("")}</select></label>` : ""}${del ? `<button type="button" class="btn fvdel">Eyða</button>` : ""}<button type="button" class="btn fvx">Hætta</button>`;
    if (!b) { host.insertAdjacentHTML("beforeend", `<div class="fvbar" role="toolbar" aria-label="Aðgerðir á valin atriði">${html}</div>`); b = host.querySelector(".fvbar"); }
    else if (b.dataset.n !== String(SEL.size) + k) b.innerHTML = html;
    b.dataset.n = String(SEL.size) + k;
  }
  const pause = ms => new Promise(r => setTimeout(r, ms));
  async function setStatus(k, st) {
    const ids = [...SEL]; if (!ids.length || !st) return;
    if (k === "verk") { await saveSnapshot(s => { (s.verkefni || []).forEach(p => { if (ids.includes(String(p.id))) p.stada = st; }); }); }
    else for (const id of ids) { const T = findT(id); if (!T || T.stada === st) continue; doAct("tbst:" + id + ":" + st); await pause(220); }
    toast(`${ids.length} ${ids.length === 1 ? "atriði" : "atriði"}: staða „${st}“`); SEL.clear(); render();
  }
  async function delAll(k, nafn) {
    const ids = [...SEL]; if (!ids.length) return; const n = ids.length;
    if (k === "vr") { if (!confirm(nafn ? `Eyða „${nafn}“ úr vörulistanum?\n\nTilboð og pantanir sem nota hana halda sínum línum.` : `Eyða ${n} ${n === 1 ? "vöru" : "vörum"} úr vörulistanum?\n\nTilboð og pantanir sem nota þær halda sínum línum.`)) { if (nafn) { SEL.clear(); deco(); } return; }
      const before = structuredClone(S);
      try { await saveSnapshot(s => { s.vorur = (s.vorur || []).filter(x => !ids.includes(String(x.id))); }); SEL.clear(); try { if (DETAIL && ids.includes(String(DETAIL).split(":")[1])) DETAIL = null; } catch (e) {} render();
        toast(`${n} eytt`, () => saveSnapshot(s => { Object.keys(s).forEach(q => delete s[q]); Object.assign(s, structuredClone(before)); }).then(() => toast("Hætt við að eyða"))); } catch (e) { toast(window.errText ? errText(e) : String(e)); }
      return; }
    const what = k === "verk" ? (n === 1 ? "verkefni" : "verkefnum") : k === "vsk" ? (n === 1 ? "viðskiptavini" : "viðskiptavinum") : isPant() ? (n === 1 ? "pöntun" : "pöntunum") : (n === 1 ? "tilboði" : "tilboðum");
    const extra = k === "verk" ? "\n\nTíma- og kostnaðarskráningar og undirverk verkefnanna eyðast líka. Fundir og skjöl haldast." : k === "vsk" ? "\n\nVerkefni sem tengjast þeim haldast en tengingin fellur niður." : "";
    if (!confirm(nafn ? `Eyða „${nafn}“?${extra}` : `Eyða ${n} ${what}?${extra}`)) { if (nafn) { SEL.clear(); deco(); } return; }
    const before = structuredClone(S), has = x => ids.includes(String(x.id));
    try {
      await saveSnapshot(s => {
        if (k === "tb") { s.tilbod = (s.tilbod || []).filter(x => !has(x)); if (s.pantanir) s.pantanir = s.pantanir.filter(x => !has(x)); }
        if (k === "vsk") { s.vidskiptavinir = (s.vidskiptavinir || []).filter(x => !has(x)); (s.verkefni || []).forEach(p => { if (ids.includes(String(p.vskId))) { p.vskId = null; p.vidskiptavinur = null; } if (ids.includes(String(p.vkId))) { p.vkId = null; p.verkkaupi = null; } }); }
        if (k === "verk") { const P = new Set(ids); s.verkefni = (s.verkefni || []).filter(x => !P.has(String(x.id)));
          const tm = s.timar = s.timar || {}, pr = e => P.has(String(e.verkefniId)), seen = new Set();
          [...new Set([...(tm.faerslur || []), ...(tm.nyjast || [])])].filter(pr).forEach(e => { if (seen.has(e.id)) return; seen.add(e.id); const t = +e.timar || 0;
            tm.samtals = Math.max(0, (tm.samtals || 0) - t); if (tm.timabil && typeof timabilOf === "function" && (e.timabil || timabilOf(e.date)) === tm.timabil) tm.timabilSamtals = Math.max(0, (tm.timabilSamtals || 0) - t); });
          if (tm.faerslur) tm.faerslur = tm.faerslur.filter(e => !pr(e)); if (tm.nyjast) tm.nyjast = tm.nyjast.filter(e => !pr(e));
          if (s.kostnadur) s.kostnadur = s.kostnadur.filter(x => !P.has(String(x.verkefniId)));
          (s.fundir || []).forEach(f => { if (P.has(String(f.projectId))) f.projectId = null; }); (s.skjol || []).forEach(x => { if (P.has(String(x.projectId))) x.projectId = null; }); }
      });
      SEL.clear(); try { if (DETAIL && ids.includes(String(DETAIL).split(":")[1])) DETAIL = null; } catch (e) {} render();
      toast(`${n} eytt`, () => saveSnapshot(s => { Object.keys(s).forEach(q => delete s[q]); Object.assign(s, structuredClone(before)); }).then(() => toast("Hætt við að eyða")));
    } catch (e) { toast(window.errText ? errText(e) : String(e)); }
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("#view .fvck"); if (c) { e.preventDefault(); e.stopPropagation();
      const rs = rows();
      if (c.classList.contains("fvall")) { const allOn = rs.length && rs.every(r => SEL.has(idOf(r))); rs.forEach(r => allOn ? SEL.delete(idOf(r)) : SEL.add(idOf(r))); }
      else { const r = c.closest(".urow"), id = idOf(r);
        if (e.shiftKey && last != null) { const a = rs.findIndex(x => idOf(x) === last), b = rs.indexOf(r); rs.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => SEL.add(idOf(x))); }
        else SEL.has(id) ? SEL.delete(id) : SEL.add(id); last = id; }
      deco(); return; }
    const k = kindOf(curTab());
    const tr = e.target.closest("#view .fvtr"); if (tr) { e.preventDefault(); e.stopPropagation(); const r = tr.closest(".urow"); SEL.clear(); SEL.add(idOf(r));
      const nm = (r.querySelector(".t")?.childNodes[0]?.textContent || r.querySelector(".t")?.textContent || "").trim(); delAll(k, nm || null); return; }
    if (e.target.closest("#view .fvbar .fvx")) { SEL.clear(); deco(); return; }
    if (e.target.closest("#view .fvbar .fvdel")) { delAll(k); return; }
    // Með eitthvað valið velur smellur á röð (í stað þess að opna)
    const r = e.target.closest("#view .splist .urow[data-open], #view .uwl .urow[data-open]"); if (r && SEL.size && kindOf(curTab()) && !e.target.closest("a,button:not(.urow),select,input")) { e.preventDefault(); e.stopPropagation(); const id = idOf(r); SEL.has(id) ? SEL.delete(id) : SEL.add(id); last = id; deco(); }
  }, true);
  document.addEventListener("change", e => { const s = e.target.closest("#view .fvbar select"); if (!s || !s.value) return; setStatus(kindOf(curTab()), s.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && SEL.size && !document.querySelector(".dpop")) { SEL.clear(); deco(); } });
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { deco(); } catch (e) {} }); }).observe(document.getElementById("view") || document.body, { childList: true, subtree: true });
})();
