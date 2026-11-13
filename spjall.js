/* Spjall og samstarfsfólk (frá 1.4.0).
   Gögn: safnið spjall/{id} = { id, ras, adilar[], af, nafn, texti, t }
   - ras "almennt": allir virkir notendur sjá (adilar = [])
   - ras "dm:<netfang1>|<netfang2>": bein skilaboð; aðeins þeir tveir (adilar) sjá – framfylgt í firestore.rules
   Skilaboð eru ekki hluti af S (gogn.js); þau eru lesin beint hér. Lesið-staða er geymd á tækinu. */
(function () {
  let ALM = [], DM = [], started = false, ras = "almennt", seenFirst = false;
  const LSK = "aera-spjall-lesid";
  const me = () => window.USER?.email || "";
  const lesid = () => { try { return JSON.parse(localStorage.getItem(LSK) || "{}"); } catch (e) { return {}; } };
  const setLesid = (r, t) => { try { const o = lesid(); if (!o[r] || o[r] < t) { o[r] = t; localStorage.setItem(LSK, JSON.stringify(o)); } } catch (e) {} };
  const dmKey = other => "dm:" + [me(), other].map(s => s.toLowerCase()).sort().join("|");
  const otherOf = r => r.startsWith("dm:") ? r.slice(3).split("|").find(e => e !== me()) || me() : null;
  const users = () => (window.nuUsers ? nuUsers() : []).filter(u => u.virkur);
  const userBy = em => users().find(u => u.email === em) || (window.nuUsers ? nuUsers() : []).find(u => u.email === em);
  const nameOf = em => userBy(em)?.nafn || em;
  const ini = n => String(n || "").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
  const all = () => ALM.concat(DM);
  const msgs = r => all().filter(m => m.ras === r).sort((a, b) => String(a.t).localeCompare(String(b.t)));
  const unreadIn = r => { const l = lesid()[r] || ""; return all().filter(m => m.ras === r && m.af !== me() && String(m.t) > l).length; };
  // Nýjustu skilaboð (fyrir eininguna Spjall á Heim)
  window.spRecent = n => all().slice().sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, n);
  window.spUnread = () => [...new Set(all().map(m => m.ras))].reduce((a, r) => a + unreadIn(r), 0);
  // 2.142.0: ósvöruð samtöl – bein skilaboð þar sem síðustu skilaboðin (sl. 14 daga) eru frá hinum aðilanum; talin í stikunni þótt þau hafi verið lesin
  window.spOsvarad = () => { const lim = new Date(Date.now() - 14 * 864e5).toISOString(); return [...new Set(DM.map(m => m.ras))].filter(r => { const l = msgs(r).pop(); return l && l.af !== me() && String(l.t) > lim; }); };
  window.spBidur = () => { const ur = new Set([...new Set(all().map(m => m.ras))].filter(r => unreadIn(r) > 0)); return [...new Set(all().map(m => m.ras))].reduce((a, r) => a + unreadIn(r), 0) + window.spOsvarad().filter(r => !ur.has(r)).length; };
  const when = iso => { const x = new Date(iso), t = new Date(); return x.toDateString() === t.toDateString() ? x.toTimeString().slice(0, 5) : fmtDate(iso) + " " + x.toTimeString().slice(0, 5); };
  const onPage = () => typeof tab !== "undefined" && tab === "spjall" && !DETAIL;

  // Kveikt þegar gögn appsins eru komin (aeraStart kallar á spStart)
  window.spStart = function (db) {
    if (started || !db?.watchCol || !me()) return; started = true;
    // 2.137.2: aðeins skilaboð sem berast eftir að appið opnaðist og eru ólesin – ekki gömul skilaboð við hverja endurhleðslu
    const T0 = new Date(Date.now() - 5000).toISOString();
    const notify = (prev, next) => { if (!seenFirst) return; const L = lesid(); const nyr = next.filter(m => m.af !== me() && !prev.some(p => p.id === m.id) && String(m.t) > T0 && String(m.t) > (L[m.ras] || ""));
      if (nyr.length && !(onPage() && nyr.every(m => m.ras === ras))) toast("Ný skilaboð frá " + nameOf(nyr[nyr.length - 1].af)); };
    db.watchCol("spjall", ["ras", "almennt"], r => { const prev = ALM; ALM = r.docs; notify(prev, ALM); seenFirst = true; refresh(); }, e => console.warn("Spjall", e));
    db.watchCol("spjall", ["adilar", me(), "array-contains"], r => { const prev = DM; DM = r.docs; notify(prev, DM); refresh(); }, e => console.warn("Spjall (bein)", e));
  };
  function refresh() {
    if (onPage()) { const m = msgs(ras); if (m.length) setLesid(ras, m[m.length - 1].t); }
    if (typeof drawMenu === "function") drawMenu();
    if (onPage()) { const box = document.getElementById("spmsgs"); if (box) { const at = box.scrollHeight - box.scrollTop - box.clientHeight < 60; box.innerHTML = msgList(); if (at) box.scrollTop = box.scrollHeight; spChans(); thumbs(); return; } render(); }
  }
  const spChans = () => { const el = document.getElementById("spchans"); if (el) el.innerHTML = chanList(); };

  /* ---------- Spjall ---------- */
  function chanList() {
    const dms = [...new Set(DM.map(m => m.ras))], ppl = users().filter(u => u.email !== me());
    const rows = [["almennt", "# Almennt", "Allir í " + (window.ORG?.nafn || "teyminu")]]
      .concat(ppl.map(u => [dmKey(u.email), u.nafn, u.email]))
      .concat(dms.filter(r => !ppl.some(u => dmKey(u.email) === r)).map(r => [r, nameOf(otherOf(r)), otherOf(r)]));
    return rows.map(([r, l, s]) => { const n = unreadIn(r), last = msgs(r).slice(-1)[0];
      return `<button type="button" class="spch${r === ras ? " on" : ""}" data-act="spras:${esc(r)}"><span class="mav sm">${r === "almennt" ? "#" : esc(ini(l))}</span><span class="spcm"><b>${esc(l)}</b><small>${esc(last ? (last.af === me() ? "Þú: " : "") + (last.texti || (last.ref ? "Deildi: " + (last.ref.heiti || "") : "")).slice(0, 40) : s)}</small></span>${n ? `<span class="badge">${n}</span>` : ""}</button>`; }).join("");
  }
  function msgList() {
    const xs = msgs(ras).slice(-200); if (!xs.length) return `<div class="empty">Engin skilaboð ennþá. ${ras === "almennt" ? "Skrifaðu fyrstu skilaboðin til teymisins." : "Byrjaðu samtalið."}</div>`;
    let last = "", lastAf = "";
    return xs.map(m => { const dag = String(m.t).slice(0, 10), mine = m.af === me(), sep = dag !== last ? `<div class="spday">${esc(dayTitle(new Date(m.t)))}</div>` : "", head = sep || m.af !== lastAf; last = dag; lastAf = m.af;
      return sep + `<div class="spm${mine ? " me" : ""}">${head && !mine ? `<div class="spn">${esc(m.nafn || nameOf(m.af))}</div>` : ""}<div class="spb${!m.texti && m.ref?.url && isMed(m.ref) ? " spbm" : ""}">${m.texti ? esc(m.texti).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') : ""}${m.ref?.k ? refCard(m.ref) : ""}</div><div class="spt">${esc(when(m.t))}${mine ? ` · <button type="button" class="klink" data-act="spdel:${esc(m.id)}">eyða</button>` : ""}</div></div>`; }).join("");
  }
  /* ---------- Deila (2.134.0): verkefni, undirverk, fundir, tilboð, pantanir, reikningar, skjöl og viðskiptavinir í spjalli ---------- */
  const REFT = { verk: "Verkefni", sub: "Undirverk", fund: "Fundur", tb: "Tilboð", reikn: "Reikningur", skjal: "Skjal", vsk: "Viðskiptavinur", vara: "Vara" };
  const homeAct = k => { const [t] = k.split(":"), id = k.slice(k.indexOf(":") + 1);
    if (t === "tb") return "u1go:" + ((window.salaAPI?.PN?.() || []).some(P => P.id === id) ? "pantanir" : "ltilbod") + ":" + k;
    return "u1go:" + ({ verk: "verk", sub: "verk", fund: "dteymi", reikn: "trk", skjal: "skjol", vsk: "vsk", vara: "lvorur" }[t] || "yfirlit") + ":" + k; };
  /* 2.144.5: viðhengi úr tölvunni – myndir og myndbönd með forskoðun (smámynd úr SharePoint), aðrar skrár sem spjald */
  const isMed = r => /^(image|video)\//.test(r.mime || "");
  const medCard = r => `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="spmed${/^video/.test(r.mime) ? " vid" : ""}" title="${esc(r.heiti || "")}"><img alt="${esc(r.heiti || "")}" data-spth="${esc((r.drive || "") + "|" + (r.id || ""))}"${THU[(r.drive || "") + "|" + (r.id || "")] ? ` src="${esc(THU[(r.drive || "") + "|" + (r.id || "")])}"` : ""}>${/^video/.test(r.mime) ? '<i aria-hidden="true"></i>' : ""}</a>`;
  const TH = {}, THU = {};
  async function thumbs() {
    const els = [...document.querySelectorAll("#spmsgs img[data-spth]:not([src])")]; if (!els.length || !window.MS?.g) return;
    for (const im of els) { const key = im.dataset.spth; const [d, id] = key.split("|"); if (!d || !id) continue;
      try { if (!TH[key]) TH[key] = MS.g(`/drives/${d}/items/${id}/thumbnails/0/large`).then(j => j?.url || ""); const u = await TH[key]; if (u) THU[key] = u;
        if (u) { im.src = u; im.onload = () => { const b = document.getElementById("spmsgs"); if (b && b.scrollHeight - b.scrollTop - b.clientHeight < 400) b.scrollTop = b.scrollHeight; }; } else im.closest(".spmed")?.classList.add("noth"); }
      catch (e) { delete TH[key]; im.closest(".spmed")?.classList.add("noth"); } } }
  window.spThumbs = thumbs;
  const fileIcon = r => /pdf/.test(r.mime || "") ? "PDF" : (String(r.heiti || "").split(".").pop() || "").toUpperCase().slice(0, 4);
  const refCard = r => r.url && isMed(r) ? medCard(r) : r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="spref spfile"><small>${esc(r.teg || "Skrá")}</small><b>${esc(r.heiti || "")}</b>${r.sub ? `<span>${esc(r.sub)}</span>` : ""}<i aria-hidden="true">${r.upp ? esc(fileIcon(r)) + " · " : ""}Opna í SharePoint ↗</i></a>` : `<a href="#" class="spref" data-act="${esc(homeAct(r.k))}"><small>${esc(r.teg || REFT[r.k.split(":")[0]] || "Tengill")}</small><b>${esc(r.heiti || "")}</b>${r.sub ? `<span>${esc(r.sub)}</span>` : ""}<i aria-hidden="true">Opna →</i></a>`;
  window.spRefInfo = k => { const [t] = String(k || "").split(":"), id = String(k).slice(String(k).indexOf(":") + 1), tr = f => { try { return f(); } catch (e) { return null; } };
    if (t === "verk") { const p = tr(() => findProj(id)); return p && { heiti: (p.nr || "") + " " + (p.stutt || p.nafn || ""), sub: p.vidskiptavinur || "" }; }
    if (t === "sub") { const r = tr(() => findSub(id)); return r && { heiti: (r.u.nr || "") + " " + tr(() => subName(r.u)), sub: "Í " + (r.p.nr || "") + " " + (r.p.stutt || "") }; }
    if (t === "fund") { const f = (S?.fundir || []).find(x => x.id === id); if (!f || f.persona) return null; return { heiti: f.name || "Fundur", sub: String(f.date || "").slice(0, 16).replace("T", " kl. ") }; }
    if (t === "tb") { const T = [...(window.salaAPI?.TB?.() || []), ...(window.salaAPI?.PN?.() || [])].find(x => x.id === id); if (!T) return null; const P = (window.salaAPI?.PN?.() || []).includes(T); return { teg: P ? "Pöntun" : "Tilboð", heiti: (T.nr || "") + " " + (T.heiti || ""), sub: T.vidskiptavinur || T.tengilidur || "" }; }
    if (t === "reikn") { const R = (S?.reikningar || []).find(x => x.id === id); return R && { heiti: "Reikningur " + (R.bokhald?.nr || R.nr || ""), sub: R.kaupandi?.name || "" }; }
    if (t === "skjal") { const x = (S?.skjol || []).find(y => y.id === id); return x && { heiti: x.name || "Skjal", sub: "" }; }
    if (t === "vsk") { const c = (S?.vidskiptavinir || []).find(y => String(y.id) === id); return c && { heiti: c.name || "", sub: c.tengilidur || "" }; }
    return null; };
  window.spSendRef = async (email, texti, k) => { if (typeof DB === "undefined" || !DB?.commit || !email) return; const info = k ? spRefInfo(k) : null, r = dmKey(email), o = otherOf(r);
    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
    return DB.commit([{ path: "spjall/" + id, data: { id, ras: r, adilar: [me(), o].map(s => s.toLowerCase()).sort(), af: me(), nafn: window.USER?.nafn || me(), texti: texti || "", ...(info ? { ref: { k, teg: info.teg || REFT[k.split(":")[0]] || "", heiti: info.heiti, sub: info.sub || "" } } : {}), t: new Date().toISOString() } }]); };
  window.spDeila = function (k) {
    const info = spRefInfo(k); if (!info) { toast("Ekki hægt að deila þessu"); return; }
    if (typeof DB === "undefined" || !DB?.commit) { toast("Spjall er ekki í boði hér"); return; }
    const ppl = users().filter(u => u.email !== me());
    sheet.innerHTML = `<h3 id="sheet-h">Deila í spjalli</h3><form id="spdf" novalidate>
      <div class="card spref spprev"><small>${esc(info.teg || REFT[k.split(":")[0]] || "")}</small><b>${esc(info.heiti)}</b>${info.sub ? `<span>${esc(info.sub)}</span>` : ""}</div>
      <label>Til<select id="spd-til">${ppl.map(u => `<option value="${esc(dmKey(u.email))}">${esc(u.nafn || u.email)}</option>`).join("")}<option value="almennt"${ppl.length ? "" : " selected"}># Almennt – allir í teyminu</option></select></label>
      <label>Skilaboð (valfrjálst)<textarea id="spd-txt" rows="3" placeholder="T.d. Geturðu kíkt á þetta fyrir föstudag?"></textarea></label>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="spd-x">Hætta við</button><button class="btn primary" id="spd-ok">Senda</button></div></form>`;
    sheetwrap.hidden = false; setTimeout(() => document.getElementById("spd-txt")?.focus(), 50);
    document.getElementById("spd-x").onclick = closeSheet;
    document.getElementById("spdf").onsubmit = async e => { e.preventDefault(); const r = document.getElementById("spd-til").value, texti = document.getElementById("spd-txt").value.trim(), o = otherOf(r);
      const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
      const d = { id, ras: r, adilar: o ? [me(), o].map(s => s.toLowerCase()).sort() : [], af: me(), nafn: window.USER?.nafn || me(), texti, ref: { k, teg: info.teg || REFT[k.split(":")[0]] || "", heiti: info.heiti, sub: info.sub || "" }, t: new Date().toISOString() };
      document.getElementById("spd-ok").disabled = true;
      try { await DB.commit([{ path: "spjall/" + id, data: d }]); closeSheet(); toast("Deilt með " + (o ? nameOf(o) : "# Almennt")); }
      catch (err) { document.getElementById("spd-ok").disabled = false; document.getElementById("f-msg").innerHTML = `<div class="msg err">${esc(err?.code || err?.message || "Villa")}</div>`; } };
  };
  // 2.134.1: deila beint úr spjalli – leit í öllu sem hægt er að deila, sent í samtalið sem er opið
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o");
  function deilanleg() { const tr = f => { try { return f() || []; } catch (e) { return []; } }, K = [];
    tr(() => verkefni()).slice().sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true })).forEach(p => { K.push("verk:" + p.id); (p.undirverk || []).filter(u => u.stada !== "Done").forEach(u => K.push("sub:" + u.id)); });
    [...tr(() => window.salaAPI.TB()), ...tr(() => window.salaAPI.PN())].sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || ""))).forEach(T => K.push("tb:" + T.id));
    (S?.fundir || []).filter(f => !f.persona).sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(f => K.push("fund:" + f.id));
    (S?.reikningar || []).forEach(r => K.push("reikn:" + r.id)); (S?.skjol || []).filter(x => x.snid).forEach(x => K.push("skjal:" + x.id)); (S?.vidskiptavinir || []).forEach(c => K.push("vsk:" + c.id));
    return K.map(k => ({ k, i: spRefInfo(k) })).filter(x => x.i); }
  function pick(tabk) {
    const all = deilanleg(), o = otherOf(ras), sp = tabk === "sp", msOk = (() => { try { return !!(window.MS && MS.on() && window.odG); } catch (e) { return false; } })();
    sheet.innerHTML = `<h3 id="sheet-h">Deila í spjalli · ${esc(ras === "almennt" ? "# Almennt" : nameOf(o))}</h3>
      <div class="seg sppt" role="tablist"><button type="button" role="tab" aria-selected="${!sp}" data-spt="">Í Atrium</button><button type="button" role="tab" aria-selected="${sp}" data-spt="sp">Skrá úr ${esc(window.ODN ? ODN() : "SharePoint")}</button></div>
      <div class="sppk"><input id="sppq" type="search" placeholder="${sp ? "Leita að skrá eftir heiti…" : "Leita – verkefni, undirverk, tilboð, pöntun, fundur, reikningur, skjal…"}" autocomplete="off" aria-label="Leita"><div class="sppl" id="sppl"></div></div><div class="actions"><button type="button" class="btn" id="spp-x">Hætta við</button></div>`;
    sheetwrap.hidden = false; const q = document.getElementById("sppq"), L = document.getElementById("sppl");
    sheet.querySelectorAll("[data-spt]").forEach(b => b.onclick = () => pick(b.dataset.spt));
    const card = (k, teg, heiti, sub, extra = "") => `<button type="button" class="spref sppi" data-k="${esc(k)}"${extra}><small>${esc(teg)}</small><b>${esc(heiti)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</button>`;
    let FS = [], tmr = null, seq = 0;
    const draw = () => {
      if (sp) {
        if (!msOk) { L.innerHTML = `<div class="empty">Tengdu Microsoft 365 (Stillingar) til að deila skrám úr ${esc(window.ODN ? ODN() : "SharePoint")}.</div>`; return; }
        const v = q.value.trim(); if (v.length < 2) { L.innerHTML = `<div class="empty">Skrifaðu a.m.k. tvo stafi til að leita.</div>`; return; }
        clearTimeout(tmr); L.innerHTML = `<div class="empty">Leita…</div>`; const my = ++seq;
        tmr = setTimeout(async () => { try { const j = await odG(`/me/drive/root/search(q='${encodeURIComponent(v.replace(/'/g, "''"))}')?$select=id,name,webUrl,file,folder,parentReference,lastModifiedDateTime&$top=30`); if (my !== seq) return;
          FS = (j.value || []).filter(x => x.file); const path = x => String(x.parentReference?.path || "").replace(/^.*?root:\/?/, "").replace(/\//g, " › ");
          L.innerHTML = FS.length ? FS.map((x, i) => card("f" + i, "Skrá", x.name, path(x) || "")).join("") : `<div class="empty">Engin skrá fannst.</div>`; }
          catch (e) { if (my === seq) L.innerHTML = `<div class="empty">Leit tókst ekki: ${esc(e?.message || e)}</div>`; } }, 300);
        return; }
      const w = fold(q.value).split(/\s+/).filter(Boolean), xs = all.filter(x => !w.length || w.every(t => fold([x.i.teg || REFT[x.k.split(":")[0]], x.i.heiti, x.i.sub].join(" ")).includes(t))).slice(0, 40);
      L.innerHTML = xs.length ? xs.map(x => card(x.k, x.i.teg || REFT[x.k.split(":")[0]] || "", x.i.heiti, x.i.sub)).join("") : `<div class="empty">Ekkert fannst.</div>`; };
    q.oninput = draw; draw(); setTimeout(() => q.focus(), 50);
    document.getElementById("spp-x").onclick = closeSheet;
    L.onclick = async e => { const b = e.target.closest(".sppi"); if (!b) return; const k = b.dataset.k, el = document.getElementById("sptxt"), texti = (el?.value || "").trim();
      let ref;
      if (k.startsWith("f")) { const x = FS[+k.slice(1)]; if (!x) return; ref = { k: "sp:" + x.id, teg: "Skrá", heiti: x.name, sub: String(x.parentReference?.path || "").replace(/^.*?root:\/?/, "").replace(/\//g, " › "), url: x.webUrl, drive: x.parentReference?.driveId || null, id: x.id }; }
      else { const info = spRefInfo(k); ref = { k, teg: info.teg || REFT[k.split(":")[0]] || "", heiti: info.heiti, sub: info.sub || "" }; }
      const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
      const d = { id, ras, adilar: o ? [me(), o].map(s => s.toLowerCase()).sort() : [], af: me(), nafn: window.USER?.nafn || me(), texti, ref, t: new Date().toISOString() };
      closeSheet(); if (el) { el.value = ""; el.style.height = ""; }
      try { await DB.commit([{ path: "spjall/" + id, data: d }]); } catch (err) { if (el) el.value = texti; toast("Tókst ekki að deila: " + (err?.code || err?.message || "villa")); } };
  }
  window.vSpjall = function () {
    if (typeof DB === "undefined" || !DB?.commit) return `<div class="empty">Spjall er ekki í boði í þessari útgáfu gagnanna.</div>`;
    const m = msgs(ras); if (m.length) setLesid(ras, m[m.length - 1].t);
    const o = otherOf(ras), ou = o && userBy(o);
    setTimeout(() => { const b = document.getElementById("spmsgs"); if (b) b.scrollTop = b.scrollHeight; if (typeof drawMenu === "function") drawMenu(); thumbs(); }, 0);
    return `<div class="spwrap"><nav class="spchans" id="spchans" aria-label="Rásir">${chanList()}</nav>
      <section class="spconv"><div class="sphead"><b>${ras === "almennt" ? "# Almennt" : esc(ou?.nafn || o)}</b>${o ? `<span>${esc(o)}${ou?.sidast ? " · síðast inni " + esc(fmtDate(ou.sidast)) : ""}</span>` : `<span>${users().length} í teyminu</span>`}</div>
      <div class="spmsgs" id="spmsgs" aria-live="polite">${msgList()}</div><div id="spup" class="spup" aria-live="polite"></div><div class="spdrop" aria-hidden="true"><span>Slepptu til að senda í ${ras === "almennt" ? "# Almennt" : esc(ou?.nafn || o)}</span></div>
      <form id="spform" class="spform"><button type="button" class="btn spatt" data-act="sppick:" title="Deila verkefni, fundi, tilboði …" aria-label="Deila atriði úr Atrium"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><label class="btn spatt spclip" title="Hengja við myndir, myndbönd eða skrár úr tölvunni (eða draga inn / líma)" aria-label="Hengja við skrár úr tölvunni"><input type="file" id="spfile" multiple hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/></svg></label><textarea id="sptxt" rows="1" placeholder="Skrifa skilaboð…" aria-label="Skilaboð" maxlength="4000"></textarea><button class="btn primary" type="submit">Senda</button></form></section></div>`;
  };
  async function attach(files) {
    files = [...(files || [])].filter(f => f && f.size >= 0); if (!files.length) return;
    let msOk = false; try { msOk = !!(window.MS && MS.on() && window.odUpOne); } catch (e) {}
    if (!msOk) { toast("Tengdu Microsoft 365 (Stillingar) til að senda skrár í spjalli."); return; }
    const big = files.find(f => f.size > 250 * 1048576); if (big) { toast(big.name + " er stærri en 250 MB."); return; }
    const el = document.getElementById("sptxt"), texti = (el?.value || "").trim(), R = ras, o = otherOf(R), now = new Date();
    if (el) { el.value = ""; el.style.height = ""; }
    const dir = `${odRoot()}/Spjall/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const box = () => document.getElementById("spup");
    const rows = files.map(f => ({ n: f.name || "mynd.png", s: f.size, p: 0, err: "" }));
    const paint = () => { const b = box(); if (b) b.innerHTML = rows.filter(r => r.p < 1 || r.err).map(r => `<div class="spupr${r.err ? " err" : ""}"><span>${esc(r.n)}</span><b>${r.err ? "Mistókst: " + esc(r.err) : Math.round(r.p * 100) + "%"}</b><i style="width:${Math.round((r.err ? 1 : r.p) * 100)}%"></i></div>`).join(""); };
    paint();
    for (let i = 0; i < files.length; i++) { const f = files[i], row = rows[i];
      let name = f.name; if (!name || name === "image.png") name = `Mynd ${now.toISOString().slice(0, 19).replace(/[T:]/g, "-")}${i ? "-" + i : ""}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`;
      try {
        const it = await odUpOne(true, dir + "/" + name, f, p => { row.p = p; paint(); });
        const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
        const mime = it?.file?.mimeType || f.type || "";
        const ref = { k: "sp:" + it.id, teg: /^image/.test(mime) ? "Mynd" : /^video/.test(mime) ? "Myndband" : "Skrá", heiti: it.name || name, sub: kbs(f.size), url: it.webUrl, drive: it.parentReference?.driveId || null, id: it.id, mime, upp: true };
        await DB.commit([{ path: "spjall/" + id, data: { id, ras: R, adilar: o ? [me(), o].map(x => x.toLowerCase()).sort() : [], af: me(), nafn: window.USER?.nafn || me(), texti: i === 0 ? texti : "", ref, t: new Date().toISOString() } }]);
        row.p = 1;
      } catch (e) { row.err = e?.message || "villa"; if (i === 0 && texti && el && !el.value) el.value = texti; }
      paint();
    }
    setTimeout(() => { if (!rows.some(r => r.err)) { const b = box(); if (b) b.innerHTML = ""; } }, 400);
  }
  const kbs = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  document.addEventListener("change", e => { if (e.target.id === "spfile") { attach(e.target.files); e.target.value = ""; } });
  document.addEventListener("paste", e => { if (e.target.id !== "sptxt") return; const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); attach(fs); } });
  const hasF = e => [...(e.dataTransfer?.types || [])].includes("Files");
  ["dragenter", "dragover"].forEach(t => document.addEventListener(t, e => { const c = e.target.closest?.(".spconv"); if (!c || !hasF(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; c.classList.add("spdon"); }));
  document.addEventListener("dragleave", e => { const c = e.target.closest?.(".spconv"); if (c && !c.contains(e.relatedTarget)) c.classList.remove("spdon"); });
  document.addEventListener("drop", e => { const c = e.target.closest?.(".spconv"); if (!c || !hasF(e)) return; e.preventDefault(); c.classList.remove("spdon"); attach(e.dataTransfer.files); });
  async function send() {
    const el = document.getElementById("sptxt"), texti = (el?.value || "").trim(); if (!texti) return;
    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
    const o = otherOf(ras), d = { id, ras, adilar: o ? [me(), o].map(s => s.toLowerCase()).sort() : [], af: me(), nafn: window.USER?.nafn || me(), texti, t: new Date().toISOString() };
    el.value = ""; el.style.height = "";
    try { await DB.commit([{ path: "spjall/" + id, data: d }]); } catch (e) { el.value = texti; toast("Skilaboðin fóru ekki: " + (e?.code || e?.message || "villa")); }
  }
  document.addEventListener("submit", e => { if (e.target.id === "spform") { e.preventDefault(); send(); } });
  document.addEventListener("keydown", e => { if (e.target.id === "sptxt" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  document.addEventListener("input", e => { if (e.target.id === "sptxt") { e.target.style.height = "auto"; e.target.style.height = Math.min(160, e.target.scrollHeight) + "px"; } });

  /* ---------- Samstarfsfólk ---------- */
  window.vTeymi = function () {
    const xs = users();
    if (!xs.length) return `<div class="empty">Engir notendur skráðir.</div>`;
    return `<p class="hint" style="margin:14px 0 8px">${xs.length} í teyminu</p>` + llist(xs.map(u => {
      const sj = u.email === me();
      return `<div class="lrow tmrow"><div class="ll"><span class="mav sm">${esc(ini(u.nafn))}</span></div><div class="lm"><div class="lt">${esc(u.nafn)}${sj ? " (þú)" : ""}</div><div class="ls">${esc([ROLES[u.hlutverk]?.heiti || u.hlutverk, u.email, u.sidast ? "síðast inni " + fmtDate(u.sidast) : ""].filter(Boolean).join(" · "))}</div></div>
        <div class="lr" style="gap:6px">${sj ? "" : `<button type="button" class="btn" data-act="spto:${esc(u.email)}" style="padding:4px 10px;min-height:32px">Skilaboð</button><a class="btn" href="mailto:${esc(u.netfang || u.email)}" style="padding:4px 10px;min-height:32px" aria-label="Tölvupóstur til ${esc(u.nafn)}">✉</a><a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(u.email)}" target="_blank" rel="noopener" style="padding:4px 10px;min-height:32px">Teams</a>`}</div></div>`; }));
  };

  window.spAct = function (k, r) {
    if (k === "sppick") { pick(); return true; }
    if (k === "spras") { ras = r.join(":"); render(); return true; }
    if (k === "spto") { ras = dmKey(r.join(":")); doAct("tab:spjall"); return true; }
    if (k === "spopen") { ras = r.join(":"); doAct("tab:spjall"); return true; }
    if (k === "spdel") { const id = r.join(":"); atrJa("Eyða skilaboðunum?").then(j => { if (j) DB.commit([{ path: "spjall/" + id, del: true }]).catch(e => toast(e?.code || e?.message)); }); return true; }
    return false;
  };
})();
