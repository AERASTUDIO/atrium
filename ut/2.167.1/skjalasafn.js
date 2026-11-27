/* Skjöl (frá 1.8.0): eigin hluti í valmyndinni með þremur flipum.
   - Mín skjöl (skjolmin): OneDrive notandans, rót í möppunni „Atrium“ (ORG.od.mitt; hét „AERA app“ fyrir 2.1.0 og er endurnefnd sjálfkrafa) – tímaskýrslur o.fl. vistast hér
   - Fyrirtækið (skjol): verðskrá, skjöl appsins og möppur fyrirtækisins (AERA/…) – flyst á SharePoint síðar
   - Nýlegt (skjolnyl): síðustu skrár sem notandinn opnaði eða breytti (Microsoft Graph /me/drive/recent)
   Möppuvafri: smellt á möppu opnar hana í appinu, „Opna“ fylgir stillingunni Í tölvunni / Á netinu (ms-app.js › odLink). */
(function () {
  const MINE = () => ORG.od.mitt || "Atrium";
  const ROOT = () => (ORG.od.stofa || "AERA/Stofa").split("/")[0];
  const on = () => !!(window.MS && MS.on());
  const encP = s => String(s).split("/").map(encodeURIComponent).join("/");
  const SEL = "$select=id,name,size,folder,file,webUrl,webDavUrl,parentReference,lastModifiedDateTime&$top=300";
  const ST = {}; // vafrar: key → { root, path, items, err, at, busy }
  const ICF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const ICD = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5"/></svg>';
  const typ = n => { const e = (String(n).split(".").pop() || "").toLowerCase(); return (typeof ODTYPE !== "undefined" && ODTYPE[e]) || e.toUpperCase(); };

  // Tryggja að mappa sé til (öll slóðin frá rót drifsins)
  async function ensure(path) {
    const parts = String(path).split("/").filter(Boolean); let cur = "";
    for (const p of parts) {
      try { await MS.g(`/me/drive/root${cur ? ":/" + encP(cur) + ":" : ""}/children`, { method: "POST", body: { name: p, folder: {}, "@microsoft.graph.conflictBehavior": "fail" } }); }
      catch (e) { if (!(e.status === 409 || /nameAlreadyExists/i.test(e.code || "") || /already exists/i.test(e.message || ""))) throw e; }
      cur = cur ? cur + "/" + p : p;
    }
    return cur;
  }
  // Eldra heiti möppunnar (ORG.od.mittAdur, t.d. „AERA app“) → endurnefnt í nýja heitið einu sinni (2.1.0)
  let migP = null;
  function migrateMine() {
    const old = ORG.od.mittAdur; if (!old || old === MINE()) return Promise.resolve();
    return migP || (migP = (async () => {
      try { await MS.g(`/me/drive/root:/${encP(MINE())}?$select=id`); return; } catch (e) { if (e.status !== 404) return; }
      try { const it = await MS.g(`/me/drive/root:/${encP(old)}?$select=id`); await MS.g(`/me/drive/items/${it.id}`, { method: "PATCH", body: { name: MINE() } }); } catch (e) {}
    })());
  }
  // Vista skrá í Mín skjöl (t.d. sub = "Tímaskýrslur/2026"); skilar driveItem
  window.odSaveMine = async function (sub, name, data, type) {
    await migrateMine();
    const dir = await ensure(MINE() + "/" + sub);
    return MS.g(`/me/drive/root:/${encP(dir + "/" + name)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: "PUT", body: data, headers: { "Content-Type": type || "application/octet-stream" } });
  };
  // Eftir vistun: gluggi með staðsetningu og „Opna“
  window.odSavedSheet = function (it, where) {
    sheet.innerHTML = `<h3 id="sheet-h">Vistað í OneDrive</h3><div class="card" style="display:flex;gap:12px;align-items:center">${ICD}<div class="grow" style="min-width:0"><b style="font-weight:500;word-break:break-word">${esc(it.name)}</b><div class="ls" style="color:var(--muted);font-size:12.5px">${esc(where)}</div></div></div>
      <div class="actions three-a"><button type="button" class="btn" id="ods-close">Loka</button><button type="button" class="btn" id="ods-prev">Forskoða</button><a class="btn primary" ${window.odLink ? odLink(it, where.replace(/ › /g, "/") + "/" + it.name) : `href="${esc(it.webUrl)}" target="_blank" rel="noopener"`} id="ods-open">Opna</a></div>`;
    sheetwrap.hidden = false;
    document.getElementById("ods-close").onclick = closeSheet;
    document.getElementById("ods-prev").onclick = () => doAct(window.msPrevAct ? msPrevAct(it) : "msprev:" + it.id);
    const o = document.getElementById("ods-open"); o.addEventListener("click", e => { const a = o.dataset.act; if (a && a.startsWith("odlocal:")) { e.preventDefault(); closeSheet(); odCopyLocal(decodeURIComponent(a.slice(8))); } else setTimeout(closeSheet, 300); });
  };

  async function load(key) {
    const s = ST[key]; s.busy = true; s.err = null; render();
    try {
      if (key === "min") await migrateMine();
      const p = s.path.join("/"), url = p ? `/me/drive/root:/${encP(p)}:/children?${SEL}` : `/me/drive/root/children?${SEL}`;
      let j;
      const g = s.sp && window.odG ? odG : MS.g;
      try { j = await g(url); }
      catch (e) { if ((e.status === 404 || e.code === "itemNotFound") && key === "min" && s.path.length === 1) { await ensure(p); j = await g(url); } else throw e; }
      s.items = (j.value || []).sort((a, b) => (!!b.folder - !!a.folder) || a.name.localeCompare(b.name, "is"));
    } catch (e) { s.err = (e.status === 404 || e.code === "itemNotFound") ? "Mappan fannst ekki í þínu OneDrive." : e.message; s.items = []; }
    s.at = Date.now(); s.busy = false; render();
  }
  function browser(key, root, title, hint) {
    if (!on()) return `<div class="empty" style="margin-top:12px">Tengdu Microsoft til að sjá ${esc(title.toLowerCase())}.${window.msMissing ? msMissing() : ""}</div>`;
    const s = ST[key] || (ST[key] = { root: root.split("/"), path: root.split("/"), items: null, sp: key === "fyr" && !!ORG.sp });
    if (!s.items && !s.busy) load(key);
    const crumbs = s.path.map((n, i) => i < s.root.length - 1 ? "" : `<button type="button" class="crumb" data-act="odcd:${key}:${i}" data-odcrumb="${i}"${i === s.path.length - 1 ? ' aria-current="true"' : ""}>${esc(n)}</button>`).filter(Boolean).join('<span class="crs">›</span>');
    const rel = n => s.path.concat(n).join("/");
    const rows = (s.items || []).map(it => it.folder
      ? `<div class="lrow tap" data-act="odin:${key}:${esc(encodeURIComponent(it.name))}" data-oddir="${esc(encodeURIComponent(it.name))}" data-odid="${esc(it.id)}" draggable="true" role="button" tabindex="0"><div class="ll">${ICF}</div><div class="lm"><div class="lt">${esc(it.name)}</div><div class="ls">${esc([it.folder.childCount != null ? it.folder.childCount + " atriði" : "", it.lastModifiedDateTime ? fmtDate(it.lastModifiedDateTime) : ""].filter(Boolean).join(" · "))}</div></div><div class="lr">${CHEV}</div></div>`
      : `<div class="lrow tap" data-act="${esc(window.msPrevAct ? msPrevAct(it) : "msprev:" + it.id)}" data-odid="${esc(it.id)}" draggable="true" role="button" tabindex="0"><div class="ll">${ICD}</div><div class="lm"><div class="lt">${esc(it.name)}</div><div class="ls">${esc([typ(it.name), kb(it.size), it.lastModifiedDateTime ? fmtDate(it.lastModifiedDateTime) : ""].filter(Boolean).join(" · "))}</div></div><a class="lr plink" ${window.odLink ? odLink(it, rel(it.name), s.sp) : `href="${esc(it.webUrl)}" target="_blank" rel="noopener"`} onclick="event.stopPropagation()">Opna</a></div>`).join("");
    const SRC = key === "min" ? "OneDrive" : s.sp ? "SharePoint" : "OneDrive";
    return `<div class="odwrap" data-odk="${key}"><div class="odbar"><span class="odsrc" title="Hvar skjölin eru geymd">${SRC}</span><nav class="crumbs" aria-label="Slóð">${crumbs}</nav><span class="odbtns"><button type="button" class="btn sm" data-act="odmk:${key}">+ Ný mappa</button><label class="btn sm primary odupl"><input type="file" multiple hidden data-odfile="${key}">Hlaða upp</label><button type="button" class="mini" data-act="odref:${key}" aria-label="Uppfæra" title="Uppfæra">↻</button>${window.odIsLocal && odIsLocal() ? `<a class="plink" ${odLink({ folder: {}, webUrl: "" }, s.path.join("/"), s.sp)}>Opna í tölvunni</a>` : ""}</span></div>
      ${hint ? `<p class="hint" style="margin:0 0 8px">${hint}</p>` : ""}
      ${s.err ? `<div class="msg err">${esc(s.err)}</div>` : ""}
      <div class="oddz"><span aria-hidden="true">↑</span><div class="oddzt">Dragðu skrár hingað til að hlaða þeim upp í <b>${esc(s.path[s.path.length - 1])}</b> – eða á möppu í listanum. Dragðu skrá á möppu (eða í slóðina efst) til að færa hana.</div><label class="btn sm oddzb"><input type="file" multiple hidden data-odfile="${key}">Velja skrár úr tölvu</label></div>
      ${upRows(key)}
      ${s.items == null ? `<div class="empty">Sæki…</div>` : s.items.length ? llist([rows]) : `<div class="empty">Mappan er tóm. Dragðu skrár hingað eða veldu „Hlaða upp“.</div>`}</div>`;
  }
  /* ---------- 2.142.0: hlaða upp, nýjar möppur og færa skrár (Mín skjöl = OneDrive, Fyrirtækið = SharePoint) ---------- */
  const gOf = s => (s.sp && window.odG ? odG : MS.g);
  const UPQ = {};
  const kbs = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  function upRows(key) {
    const q = UPQ[key] || []; if (!q.length) return "";
    return `<div class="uplist">${q.map(r => `<div class="upr${r.err ? " err" : ""}"><span class="upn">${esc(r.n)}</span><span class="ups">${r.err ? "Mistókst: " + esc(r.err) : r.p >= 1 ? "✓ " + esc(r.to) : kbs(r.s) + " · " + Math.round(r.p * 100) + "%"}</span><span class="upbar"><i style="width:${Math.round((r.err ? 1 : r.p) * 100)}%"></i></span></div>`).join("")}</div>`;
  }
  // 2.144.5: hlaða einni skrá upp á drif fyrirtækisins (sp=true) eða OneDrive notandans – notað af spjalli
  window.odUpOne = (sp, path, file, onp) => upOne(sp && window.odG ? odG : MS.g, path, file, onp || (() => {}));
  window.odRoot = () => ROOT();
  async function upOne(g, path, file, onp) {
    if (file.size <= 4194304) { const it = await g(`/me/drive/root:/${encP(path)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } }); onp(1); return it; }
    const ses = await g(`/me/drive/root:/${encP(path)}:/createUploadSession`, { method: "POST", body: { item: { "@microsoft.graph.conflictBehavior": "rename" } } });
    const CH = 327680 * 10; let pos = 0, it = null;
    while (pos < file.size) {
      const end = Math.min(pos + CH, file.size);
      const r = await fetch(ses.uploadUrl, { method: "PUT", headers: { "Content-Range": `bytes ${pos}-${end - 1}/${file.size}` }, body: file.slice(pos, end) });
      if (!r.ok) { fetch(ses.uploadUrl, { method: "DELETE" }).catch(() => {}); throw new Error("upphleðsla stöðvaðist (" + r.status + ")"); }
      if (r.status === 200 || r.status === 201) it = await r.json();
      pos = end; onp(pos / file.size);
    }
    return it;
  }
  async function odUpload(key, files, sub) {
    const s = ST[key]; files = [...files].filter(Boolean); if (!s || !files.length) return;
    const dir = s.path.concat(sub ? [sub] : []).join("/"), to = sub || s.path[s.path.length - 1];
    UPQ[key] = (UPQ[key] || []).filter(r => r.err);
    const rows = files.map(f => ({ n: f.name, s: f.size, p: 0, to })); UPQ[key].push(...rows); render();
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      try { await upOne(gOf(s), dir + "/" + files[i].name.replace(/[\\/:*?"<>|#%]/g, "-"), files[i], p => { rows[i].p = p; render(); }); rows[i].p = 1; ok++; }
      catch (e) { rows[i].err = e.message || String(e); }
      render();
    }
    toast(ok === files.length ? (ok === 1 ? `„${files[0].name}“ vistuð í ${to}` : `${ok} skrár vistaðar í ${to}`) : `${ok} af ${files.length} skrám vistaðar – sjá villur`);
    setTimeout(() => { UPQ[key] = (UPQ[key] || []).filter(r => r.err); render(); }, 4000);
    s.items = null; load(key);
  }
  async function odMove(key, id, destPath, label) {
    const s = ST[key]; if (!s) return;
    try {
      const g = gOf(s), d = await g(`/me/drive/root:/${encP(destPath)}?$select=id`);
      await g(`/me/drive/items/${id}`, { method: "PATCH", body: { parentReference: { id: d.id }, "@microsoft.graph.conflictBehavior": "rename" } });
      toast(`Fært í ${label}`); s.items = null; load(key);
    } catch (e) { toast("Gat ekki fært: " + (e.message || e)); }
  }
  async function odMkdir(key) {
    const s = ST[key]; if (!s) return;
    const n = await atrSpyrja("Ný mappa", "", { label: "Í " + s.path.join(" › ") }).catch(() => null);
    const nafn = String(n || "").trim().replace(/[\\/:*?"<>|#%]/g, "-"); if (!nafn) return;
    try { const p = s.path.join("/"); await gOf(s)(`/me/drive/root:/${encP(p)}:/children`, { method: "POST", body: { name: nafn, folder: {}, "@microsoft.graph.conflictBehavior": "rename" } }); toast(`Mappan „${nafn}“ búin til`); s.items = null; load(key); }
    catch (e) { toast("Gat ekki búið til möppu: " + (e.message || e)); }
  }
  // Atburðir: velja skrár, draga skrár úr tölvunni, draga skrá á möppu/slóð til að færa
  document.addEventListener("change", e => { const k = e.target.dataset?.odfile; if (k) { odUpload(k, e.target.files); e.target.value = ""; } });
  const ODT = "application/x-atrium-od";
  document.addEventListener("dragstart", e => { const r = e.target.closest?.("[data-odk] [data-odid]"); if (!r) return; e.dataTransfer.setData(ODT, r.dataset.odid); e.dataTransfer.effectAllowed = "move"; r.classList.add("oddrag"); });
  document.addEventListener("dragend", () => document.querySelectorAll(".oddrag,.odon").forEach(x => x.classList.remove("oddrag", "odon")));
  const odTarget = e => { const w = e.target.closest?.("[data-odk]"); if (!w) return null; const f = e.target.closest("[data-oddir],[data-odcrumb]"); return { w, f }; };
  ["dragenter", "dragover"].forEach(t => document.addEventListener(t, e => {
    const T = odTarget(e); if (!T) return; const types = [...(e.dataTransfer?.types || [])], files = types.includes("Files"), mv = types.includes(ODT);
    if (!files && !mv) return; if (mv && !T.f) return;
    e.preventDefault(); e.dataTransfer.dropEffect = mv ? "move" : "copy";
    document.querySelectorAll(".odon").forEach(x => x !== T.w && x !== T.f && x.classList.remove("odon")); T.w.classList.add("odon"); T.f?.classList.add("odon");
  }));
  document.addEventListener("dragleave", e => { const w = e.target.closest?.("[data-odk]"); if (w && !w.contains(e.relatedTarget)) w.querySelectorAll(".odon").forEach(x => x.classList.remove("odon")), w.classList.remove("odon"); });
  document.addEventListener("drop", e => {
    const T = odTarget(e); if (!T) return; const key = T.w.dataset.odk, s = ST[key]; if (!s) return;
    const id = e.dataTransfer.getData(ODT);
    document.querySelectorAll(".odon").forEach(x => x.classList.remove("odon"));
    if (id) {
      e.preventDefault(); if (!T.f) return;
      if (T.f.dataset.odid === id) return;
      if (T.f.dataset.oddir) { const n = decodeURIComponent(T.f.dataset.oddir); odMove(key, id, s.path.concat(n).join("/"), n); }
      else { const i = +T.f.dataset.odcrumb; if (i >= s.path.length - 1) return; odMove(key, id, s.path.slice(0, i + 1).join("/"), s.path[i]); }
      return;
    }
    if (![...(e.dataTransfer?.types || [])].includes("Files")) return;
    e.preventDefault();
    const items = [...(e.dataTransfer.items || [])], dirs = items.filter(i => i.webkitGetAsEntry && i.webkitGetAsEntry()?.isDirectory).length;
    const files = items.length ? items.filter(i => i.kind === "file" && !(i.webkitGetAsEntry && i.webkitGetAsEntry()?.isDirectory)).map(i => i.getAsFile()) : [...e.dataTransfer.files];
    if (dirs) toast("Möppur eru ekki fluttar inn – aðeins stakar skrár");
    odUpload(key, files, T.f?.dataset.oddir ? decodeURIComponent(T.f.dataset.oddir) : "");
  });

  window.odAct = function (k, r) {
    const key = r[0], s = ST[key]; if (!s) return;
    if (k === "odmk") { odMkdir(key); return; }
    if (k === "odcd") s.path = s.path.slice(0, +r[1] + 1);
    if (k === "odref") { s.items = null; load(key); return; }
    if (k === "odin") s.path = s.path.concat(decodeURIComponent(r.slice(1).join(":")));
    s.items = null; load(key); window.scrollTo({ top: 0 });
  };

  window.vSkjolMin = () => `<p class="sub" style="margin:14px 0 10px">Mín skjöl eru í þínu OneDrive. Tímaskýrslur og annað sem þú vistar úr appinu fer hingað – aðeins þú sérð það.</p>` +
    browser("min", MINE(), "Mín skjöl");
  window.vSkjolFyr = () => (window.vSkjolNy ? vSkjolNy() : "") + `<div class="viewtitle" style="margin-top:22px">Möppur fyrirtækisins</div>` +
    browser("fyr", ROOT(), "möppur fyrirtækisins", window.USER && window.ORG && USER.email !== ORG.admin.email && !ORG.sp ? "Möppur fyrirtækisins eru enn í OneDrive admin og flytjast á sameiginlegt svæði (SharePoint) – þangað til sérðu hér aðeins það sem er í þínu eigin OneDrive." : "");

  let REC = null, recBusy = false;
  window.vSkjolNyl = function () {
    if (!on()) return `<div class="empty" style="margin-top:12px">Tengdu Microsoft til að sjá nýleg skjöl.${window.msMissing ? msMissing() : ""}</div>`;
    if (!REC && !recBusy) { recBusy = true; MS.g("/me/drive/recent?$top=40").then(j => { REC = j.value || []; }).catch(e => { REC = { err: e.message }; }).finally(() => { recBusy = false; render(); }); }
    if (!REC) return `<div class="empty" style="margin-top:12px">Sæki nýleg skjöl…</div>`;
    if (REC.err) return `<div class="msg err" style="margin-top:12px">${esc(REC.err)}</div>`;
    const xs = REC.filter(it => !it.folder);
    return `<div class="odbar"><span class="hint" style="margin:0">Skrár sem þú opnaðir eða breyttir síðast í OneDrive og Office</span><button type="button" class="mini" data-act="odrec" aria-label="Uppfæra">↻</button></div>` +
      (xs.length ? llist(xs.map(it => { const ri = it.remoteItem || {}, path = String(ri.parentReference?.path || it.parentReference?.path || "").replace(/^\/drives?\/[^:]*root:?\/?/, "").replace(/^\/drive\/root:\/?/, ""), when = it.lastModifiedDateTime || ri.lastModifiedDateTime;
        const o = { ...it, webUrl: it.webUrl || ri.webUrl, webDavUrl: it.webDavUrl || ri.webDavUrl, name: it.name || ri.name };
        return `<div class="lrow tap" data-act="${esc(window.msPrevAct ? msPrevAct(it) : "")}" role="button" tabindex="0"><div class="ll">${ICD}</div><div class="lm"><div class="lt">${esc(o.name)}</div><div class="ls">${esc([typ(o.name), decodeURIComponent(path).replace(/\//g, " › "), when ? fmtDate(when) : ""].filter(Boolean).join(" · "))}</div></div><a class="lr plink" ${window.odLink ? odLink(o, (path ? decodeURIComponent(path) + "/" : "") + o.name) : `href="${esc(o.webUrl)}" target="_blank" rel="noopener"`} onclick="event.stopPropagation()">Opna</a></div>`; })) : `<div class="empty">Engin nýleg skjöl.</div>`);
  };
  window.odRecReset = () => { REC = null; };
})();
