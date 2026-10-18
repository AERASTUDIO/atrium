/* Skjöl (frá 1.8.0): eigin hluti í valmyndinni með þremur flipum.
   - Mín skjöl (skjolmin): OneDrive notandans, rót í möppunni „AERA app“ (ORG.od.mitt) – tímaskýrslur o.fl. vistast hér
   - Fyrirtækið (skjol): verðskrá, skjöl appsins og möppur fyrirtækisins (AERA/…) – flyst á SharePoint síðar
   - Nýlegt (skjolnyl): síðustu skrár sem notandinn opnaði eða breytti (Microsoft Graph /me/drive/recent)
   Möppuvafri: smellt á möppu opnar hana í appinu, „Opna“ fylgir stillingunni Í tölvunni / Á netinu (ms-app.js › odLink). */
(function () {
  const MINE = () => ORG.od.mitt || "AERA app";
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
  // Vista skrá í Mín skjöl (t.d. sub = "Tímaskýrslur/2026"); skilar driveItem
  window.odSaveMine = async function (sub, name, data, type) {
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
    const crumbs = s.path.map((n, i) => i < s.root.length - 1 ? "" : `<button type="button" class="crumb" data-act="odcd:${key}:${i}"${i === s.path.length - 1 ? ' aria-current="true"' : ""}>${esc(n)}</button>`).filter(Boolean).join('<span class="crs">›</span>');
    const rel = n => s.path.concat(n).join("/");
    const rows = (s.items || []).map(it => it.folder
      ? `<div class="lrow tap" data-act="odin:${key}:${esc(encodeURIComponent(it.name))}" role="button" tabindex="0"><div class="ll">${ICF}</div><div class="lm"><div class="lt">${esc(it.name)}</div><div class="ls">${esc([it.folder.childCount != null ? it.folder.childCount + " atriði" : "", it.lastModifiedDateTime ? fmtDate(it.lastModifiedDateTime) : ""].filter(Boolean).join(" · "))}</div></div><div class="lr">${CHEV}</div></div>`
      : `<div class="lrow tap" data-act="${esc(window.msPrevAct ? msPrevAct(it) : "msprev:" + it.id)}" role="button" tabindex="0"><div class="ll">${ICD}</div><div class="lm"><div class="lt">${esc(it.name)}</div><div class="ls">${esc([typ(it.name), kb(it.size), it.lastModifiedDateTime ? fmtDate(it.lastModifiedDateTime) : ""].filter(Boolean).join(" · "))}</div></div><a class="lr plink" ${window.odLink ? odLink(it, rel(it.name), s.sp) : `href="${esc(it.webUrl)}" target="_blank" rel="noopener"`} onclick="event.stopPropagation()">Opna</a></div>`).join("");
    return `<div class="odbar"><nav class="crumbs" aria-label="Slóð">${crumbs}</nav><span class="odbtns"><button type="button" class="mini" data-act="odref:${key}" aria-label="Uppfæra">↻</button>${window.odIsLocal && odIsLocal() ? `<a class="plink" ${odLink({ folder: {}, webUrl: "" }, s.path.join("/"), s.sp)}>Opna í tölvunni</a>` : ""}</span></div>
      ${hint ? `<p class="hint" style="margin:0 0 8px">${hint}</p>` : ""}
      ${s.err ? `<div class="msg err">${esc(s.err)}</div>` : ""}
      ${s.items == null ? `<div class="empty">Sæki…</div>` : s.items.length ? llist([rows]) : `<div class="empty">Mappan er tóm.</div>`}`;
  }
  window.odAct = function (k, r) {
    const key = r[0], s = ST[key]; if (!s) return;
    if (k === "odcd") s.path = s.path.slice(0, +r[1] + 1);
    if (k === "odref") { s.items = null; load(key); return; }
    if (k === "odin") s.path = s.path.concat(decodeURIComponent(r.slice(1).join(":")));
    s.items = null; load(key); window.scrollTo({ top: 0 });
  };

  window.vSkjolMin = () => `<p class="sub" style="margin:14px 0 10px">Þitt eigið svæði í OneDrive. Tímaskýrslur og annað sem þú vistar úr appinu fer hingað – aðeins þú sérð það.</p>` +
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
