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
  window.spUnread = () => [...new Set(all().map(m => m.ras))].reduce((a, r) => a + unreadIn(r), 0);
  const when = iso => { const x = new Date(iso), t = new Date(); return x.toDateString() === t.toDateString() ? x.toTimeString().slice(0, 5) : fmtDate(iso) + " " + x.toTimeString().slice(0, 5); };
  const onPage = () => typeof tab !== "undefined" && tab === "spjall" && !DETAIL;

  // Kveikt þegar gögn appsins eru komin (aeraStart kallar á spStart)
  window.spStart = function (db) {
    if (started || !db?.watchCol || !me()) return; started = true;
    const notify = (prev, next) => { if (!seenFirst) return; const nyr = next.filter(m => m.af !== me() && !prev.some(p => p.id === m.id));
      if (nyr.length && !(onPage() && nyr.every(m => m.ras === ras))) toast("Ný skilaboð frá " + nameOf(nyr[nyr.length - 1].af)); };
    db.watchCol("spjall", ["ras", "almennt"], r => { const prev = ALM; ALM = r.docs; notify(prev, ALM); seenFirst = true; refresh(); }, e => console.warn("Spjall", e));
    db.watchCol("spjall", ["adilar", me(), "array-contains"], r => { const prev = DM; DM = r.docs; notify(prev, DM); refresh(); }, e => console.warn("Spjall (bein)", e));
  };
  function refresh() {
    if (onPage()) { const m = msgs(ras); if (m.length) setLesid(ras, m[m.length - 1].t); }
    if (typeof drawMenu === "function") drawMenu();
    if (onPage()) { const box = document.getElementById("spmsgs"); if (box) { const at = box.scrollHeight - box.scrollTop - box.clientHeight < 60; box.innerHTML = msgList(); if (at) box.scrollTop = box.scrollHeight; spChans(); return; } render(); }
  }
  const spChans = () => { const el = document.getElementById("spchans"); if (el) el.innerHTML = chanList(); };

  /* ---------- Spjall ---------- */
  function chanList() {
    const dms = [...new Set(DM.map(m => m.ras))], ppl = users().filter(u => u.email !== me());
    const rows = [["almennt", "# Almennt", "Allir í " + (window.ORG?.nafn || "teyminu")]]
      .concat(ppl.map(u => [dmKey(u.email), u.nafn, u.email]))
      .concat(dms.filter(r => !ppl.some(u => dmKey(u.email) === r)).map(r => [r, nameOf(otherOf(r)), otherOf(r)]));
    return rows.map(([r, l, s]) => { const n = unreadIn(r), last = msgs(r).slice(-1)[0];
      return `<button type="button" class="spch${r === ras ? " on" : ""}" data-act="spras:${esc(r)}"><span class="mav sm">${r === "almennt" ? "#" : esc(ini(l))}</span><span class="spcm"><b>${esc(l)}</b><small>${esc(last ? (last.af === me() ? "Þú: " : "") + last.texti.slice(0, 40) : s)}</small></span>${n ? `<span class="badge">${n}</span>` : ""}</button>`; }).join("");
  }
  function msgList() {
    const xs = msgs(ras).slice(-200); if (!xs.length) return `<div class="empty">Engin skilaboð ennþá. ${ras === "almennt" ? "Skrifaðu fyrstu skilaboðin til teymisins." : "Byrjaðu samtalið."}</div>`;
    let last = "", lastAf = "";
    return xs.map(m => { const dag = String(m.t).slice(0, 10), mine = m.af === me(), sep = dag !== last ? `<div class="spday">${esc(dayTitle(new Date(m.t)))}</div>` : "", head = sep || m.af !== lastAf; last = dag; lastAf = m.af;
      return sep + `<div class="spm${mine ? " me" : ""}">${head && !mine ? `<div class="spn">${esc(m.nafn || nameOf(m.af))}</div>` : ""}<div class="spb">${esc(m.texti).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</div><div class="spt">${esc(when(m.t))}${mine ? ` · <button type="button" class="klink" data-act="spdel:${esc(m.id)}">eyða</button>` : ""}</div></div>`; }).join("");
  }
  window.vSpjall = function () {
    if (typeof DB === "undefined" || !DB?.commit) return `<div class="empty">Spjall er ekki í boði í þessari útgáfu gagnanna.</div>`;
    const m = msgs(ras); if (m.length) setLesid(ras, m[m.length - 1].t);
    const o = otherOf(ras), ou = o && userBy(o);
    setTimeout(() => { const b = document.getElementById("spmsgs"); if (b) b.scrollTop = b.scrollHeight; if (typeof drawMenu === "function") drawMenu(); }, 0);
    return `<div class="spwrap"><nav class="spchans" id="spchans" aria-label="Rásir">${chanList()}</nav>
      <section class="spconv"><div class="sphead"><b>${ras === "almennt" ? "# Almennt" : esc(ou?.nafn || o)}</b>${o ? `<span>${esc(o)}${ou?.sidast ? " · síðast inni " + esc(fmtDate(ou.sidast)) : ""}</span>` : `<span>${users().length} í teyminu</span>`}</div>
      <div class="spmsgs" id="spmsgs" aria-live="polite">${msgList()}</div>
      <form id="spform" class="spform"><textarea id="sptxt" rows="1" placeholder="Skrifa skilaboð…" aria-label="Skilaboð" maxlength="4000"></textarea><button class="btn primary" type="submit">Senda</button></form></section></div>`;
  };
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
        <div class="lr" style="gap:6px">${sj ? "" : `<button type="button" class="btn" data-act="spto:${esc(u.email)}" style="padding:4px 10px;min-height:32px">Skilaboð</button><a class="btn" href="mailto:${esc(u.email)}" style="padding:4px 10px;min-height:32px" aria-label="Tölvupóstur til ${esc(u.nafn)}">✉</a><a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(u.email)}" target="_blank" rel="noopener" style="padding:4px 10px;min-height:32px">Teams</a>`}</div></div>`; }));
  };

  window.spAct = function (k, r) {
    if (k === "spras") { ras = r.join(":"); render(); return true; }
    if (k === "spto") { ras = dmKey(r.join(":")); doAct("tab:spjall"); return true; }
    if (k === "spdel") { const id = r.join(":"); if (confirm("Eyða skilaboðunum?")) DB.commit([{ path: "spjall/" + id, del: true }]).catch(e => toast(e?.code || e?.message)); return true; }
    return false;
  };
})();
