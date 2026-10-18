/* Microsoft 365 í appinu: lifandi skráalisti, forskoðun skráa, möppur fyrir ný verkefni,
   fundargerðir (.docx) og póstar úr Outlook-möppunni „AERA“. Notar window.MS (ms.js). */
(function () {
  if (!window.MS || window.__aeraPopup) return;
  const ROOT = ORG.od.verkefni, OFLOKKAD = ORG.od.oflokkad, FUNDAMAPPA = "08 Samskipti og fundir";
  const STD = ["01 Móttekið", "02 Vinnuskjöl", "03 Módel", "04 Teikningar", "05 Lýsing", "06 3D Render", "07 Útgefin Gögn", "08 Samskipti og fundir"];
  const encP = s => s.split("/").map(encodeURIComponent).join("/");
  const safe = s => String(s || "").replace(/["*:<>?/\\|]/g, "-").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  const SEL = "$select=id,name,size,folder,file,webUrl,webDavUrl,parentReference,lastModifiedDateTime";
  const isOn = () => MS.on();

  async function all(path) {
    let j = await MS.g(path), out = j.value || [];
    while (j["@odata.nextLink"]) { j = await MS.g(j["@odata.nextLink"]); out = out.concat(j.value || []); }
    return out;
  }

  /* ---------- Möppur verkefna ---------- */
  let VK = null, VKp = null, VKerr = null;
  function verkMoppur(force) {
    if (VK && !force) return Promise.resolve(VK);
    VKp = VKp || all(`/me/drive/root:/${encP(ROOT)}:/children?${SEL}&$top=999`)
      .then(xs => { VK = {}; xs.forEach(i => VK[i.name] = i); VKerr = null; return VK; })
      .catch(e => { VKerr = e.message; throw e; })
      .finally(() => { VKp = null; });
    return VKp;
  }
  const keyOf = p => VK ? (Object.keys(VK).find(k => k === p.nafn) || Object.keys(VK).find(k => k === safe(p.nafn)) || Object.keys(VK).find(k => p.nr && k.startsWith(p.nr + " "))) : null;

  const TREE = {};
  async function loadTree(k) {
    TREE[k] = { st: "load" };
    try {
      const top = await all(`/me/drive/items/${VK[k].id}/children?${SEL}&$top=999`);
      await Promise.all(top.filter(i => i.folder && i.folder.childCount).map(async i => { i.kids = await all(`/me/drive/items/${i.id}/children?${SEL}&$top=999`); }));
      top.sort((a, b) => (b.folder ? 1 : 0) - (a.folder ? 1 : 0) || a.name.localeCompare(b.name, "is"));
      TREE[k] = { st: "ok", items: top, t: Date.now() };
    } catch (e) { TREE[k] = { st: "err", err: e.message }; }
    render();
  }

  async function mkFolder(parentPath, name) {
    try { return await MS.g(`/me/drive/root:/${encP(parentPath)}:/children`, { method: "POST", body: { name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" } }); }
    catch (e) { if (e.status === 409 || e.code === "nameAlreadyExists") return MS.g(`/me/drive/root:/${encP(parentPath + "/" + name)}`); throw e; }
  }
  async function mkProj(nafn) {
    const name = safe(nafn), it = await mkFolder(ROOT, name);
    for (const s of STD) await mkFolder(ROOT + "/" + name, s);
    return it;
  }

  const ICON = { folder: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    ext: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>' };
  /* ---------- Opna í tölvunni (frá 1.6.5) ----------
     Vafri má ekki opna möppu í Windows Explorer beint. Í staðinn: möppur → slóðin í samstilltu OneDrive-möppunni
     er afrituð og leiðbeint hvernig hún er límd í Explorer; Office-skjöl opnast í Word/Excel/PowerPoint á tölvunni. */
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const isWin = /Windows/i.test(navigator.userAgent), isMob = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const odMode = () => LS("aera-od-opna") || (isWin && !isMob ? "tolva" : "vefur");
  const odRoot = () => LS("aera-od-rot") || ORG.odLocal || ("%UserProfile%\\OneDrive - " + ORG.nafn + " ehf");
  const relOf = it => { const pp = String(it?.parentReference?.path || "").replace(/^\/drive(s\/[^/]+)?\/root:?\/?/, ""); return decodeURIComponent((pp ? pp + "/" : "") + (it?.name || "")); };
  const localPath = rel => odRoot().replace(/[\\/]+$/, "") + "\\" + String(rel || "").split("/").filter(Boolean).join("\\");
  const OFF = { docx: "ms-word", doc: "ms-word", xlsx: "ms-excel", xls: "ms-excel", pptx: "ms-powerpoint", ppt: "ms-powerpoint" };
  const offApp = n => OFF[(String(n).split(".").pop() || "").toLowerCase()];
  // Eigindi á tengil fyrir möppu/skrá: á vefnum = venjulegur tengill; í tölvu = aðgerð sem afritar slóð eða opnar í Office
  window.odLink = (it, rel) => {
    if (odMode() !== "tolva") return `href="${esc(it.webUrl)}" target="_blank" rel="noopener"`;
    if (!it.folder && offApp(it.name) && (it.webDavUrl || it.webUrl)) return `href="${esc(offApp(it.name) + ":ofe|u|" + (it.webDavUrl || it.webUrl))}"`;
    return `href="#" data-act="odlocal:${esc(encodeURIComponent(rel || relOf(it)))}"`;
  };
  async function copyLocal(rel) {
    const path = localPath(rel);
    try { await navigator.clipboard.writeText(path); } catch (e) {}
    if (LS("aera-od-vist") === "1") { toast("Slóð afrituð – límdu hana í Explorer (Win+E, Ctrl+L, Ctrl+V)"); return; }
    sheet.innerHTML = `<h3 id="sheet-h">Opna möppu í tölvunni</h3>
      <p class="hint" style="margin:0 0 10px">Vafrinn má ekki opna möppur í tölvunni beint, svo slóðin hefur verið afrituð:</p>
      <div class="card" style="font-family:ui-monospace,Consolas,monospace;font-size:12.5px;word-break:break-all">${esc(path)}</div>
      <ol class="hint" style="margin:12px 0 0 18px;line-height:1.7"><li>Ýttu á <b>Win + E</b> (opnar File Explorer)</li><li>Ýttu á <b>Ctrl + L</b> (slóðastikan)</li><li>Ýttu á <b>Ctrl + V</b> og <b>Enter</b></li></ol>
      <label class="chk" style="flex-direction:row;align-items:center;gap:8px;margin-top:12px;color:var(--ink)"><input type="checkbox" id="od-vist" style="width:auto;min-height:0"> Ekki sýna þetta aftur – aðeins afrita</label>
      <div class="actions"><button type="button" class="btn" id="od-web">Opna á netinu í staðinn</button><button type="button" class="btn primary" id="od-ok">Í lagi</button></div>`;
    sheetwrap.hidden = false;
    const done = () => { if (document.getElementById("od-vist")?.checked) LS("aera-od-vist", "1"); closeSheet(); };
    document.getElementById("od-ok").onclick = done;
    document.getElementById("od-web").onclick = async () => { done(); try { const it = await MS.g(`/me/drive/root:/${encP(rel)}?$select=webUrl`); window.open(it.webUrl, "_blank", "noopener"); } catch (e) { toast(e.message); } };
  }
  window.odCopyLocal = copyLocal;
  document.addEventListener("change", e => { if (e.target.id === "od-rot") { LS("aera-od-rot", e.target.value.trim()); toast("OneDrive-mappa vistuð á þessu tæki"); } });

  const typeOf = n => { const e = (n.split(".").pop() || "").toLowerCase(); return ODTYPE[e] || e.toUpperCase(); };
  function fileRow(it) {
    if (it.folder) return `<a class="lrow fl" ${odLink(it)}><div class="lm"><div class="lt">📁 ${esc(it.name)}</div><div class="ls">${esc(["Mappa", kb(it.size), it.folder.childCount ? it.folder.childCount + " atriði" : ""].filter(Boolean).join(" · "))}</div></div><div class="lr">${ICON.ext}</div></a>`;
    return `<div class="lrow fl tap" data-act="msprev:${esc(it.id)}" role="button" tabindex="0"><div class="lm"><div class="lt">${esc(it.name)}</div><div class="ls">${esc([typeOf(it.name), kb(it.size), it.lastModifiedDateTime ? fmtDate(it.lastModifiedDateTime) : ""].filter(Boolean).join(" · "))}</div></div><a class="lr" ${odLink(it)} aria-label="${odMode() === "tolva" ? "Opna í tölvunni" : "Opna í OneDrive"}" onclick="event.stopPropagation()">${ICON.ext}</a></div>`;
  }

  window.msSkrar = function (p) {
    const head = (extra = "") => `<div class="viewtitle" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Skrár í OneDrive</span><span style="display:flex;gap:12px">${extra}</span></div>`;
    if (!VK) {
      if (VKerr) return head() + `<div class="empty">Gat ekki sótt möppurnar: ${esc(VKerr)}<br><button type="button" class="btn" style="margin-top:10px" data-act="msref:">Reyna aftur</button></div>`;
      verkMoppur().then(render, render);
      return head() + `<div class="empty">Sæki möppur úr OneDrive…</div>`;
    }
    const k = keyOf(p);
    if (!k) {
      const pending = (S?.odBidrod || []).some(b => b.verkefniId === p.id);
      return head() + `<div class="empty">${pending ? "Verið er að stofna möppu fyrir verkefnið í OneDrive…" : noFolder(p) ? "Almenn verkefni fá ekki eigin möppu í OneDrive. Fundargerðir og kvittanir þeirra fara í Óflokkað." : `Engin mappa fannst fyrir ${esc(p.nafn)} undir AERA/Verkefni.`}${pending ? "" : `<br><button type="button" class="btn primary" style="margin-top:10px" data-act="msmk:${esc(p.id)}">Stofna möppu með 01–08</button>`}</div>`;
    }
    const tr = TREE[k];
    const extra = `<a class="plink" data-act="msref:${esc(k)}">↻ Uppfæra</a><a class="plink" ${odLink({ ...VK[k], folder: {} }, ORG.od.verkefni + "/" + (VK[k].name || k))}>Opna möppu</a>`;
    if (!tr) { loadTree(k); return head(extra) + `<div class="empty">Sæki skrár…</div>`; }
    if (tr.st === "load") return head(extra) + `<div class="empty">Sæki skrár…</div>`;
    if (tr.st === "err") return head(extra) + `<div class="empty">Gat ekki sótt skrárnar: ${esc(tr.err)}</div>`;
    const rows = tr.items.map(d => {
      if (!d.folder) return fileRow(d);
      const has = d.size > 0 || (d.kids && d.kids.length);
      return `<details class="fold"${has && /^0[478]/.test(d.name) ? " open" : ""}><summary class="lrow"><div class="lm"><div class="lt"${has ? "" : ' style="color:var(--muted)"'}>${esc(d.name)}</div><div class="ls">${esc(has ? kb(d.size) + (d.kids ? ` · ${d.kids.length} atriði` : "") : "Tóm mappa")}</div></div>
        <a class="plink" ${odLink(d)} onclick="event.stopPropagation()">Opna</a></summary>
        ${d.kids && d.kids.length ? `<div class="fitems">${d.kids.map(fileRow).join("")}</div>` : ""}</details>`;
    }).join("");
    return head(extra) + `<div class="llist">${rows || '<div class="empty">Mappan er tóm.</div>'}</div><p class="hint" style="margin-top:8px">Beint úr OneDrive · sótt kl. ${esc(new Date(tr.t).toTimeString().slice(0, 5))}. Ýttu á skrá til að forskoða hana.</p>`;
  };

  /* ---------- Forskoðun skráa ---------- */
  async function preview(id) {
    sheet.innerHTML = `<h3 id="sheet-h" class="big" style="font-size:18px;margin:0 0 10px">Opna skrá…</h3><div class="empty">Sæki forskoðun…</div>`;
    sheet.closest(".sheet").classList.add("wide"); sheetwrap.hidden = false;
    let it = null;
    try {
      it = await MS.g(`/me/drive/items/${id}?$select=id,name,webUrl,webDavUrl,size,file`);
      const pv = await MS.g(`/me/drive/items/${id}/preview`, { method: "POST", body: {} });
      if (sheetwrap.hidden) return;
      sheet.innerHTML = `<h3 id="sheet-h" class="big" style="font-size:18px;margin:0 0 10px;word-break:break-word">${esc(it.name)}</h3>
        <iframe src="${esc(pv.getUrl)}" title="${esc(it.name)}" style="width:100%;height:min(72vh,900px);border:0;border-radius:10px;background:#fff"></iframe>
        <div class="actions" style="margin-top:12px"><button type="button" class="btn" id="pv-close">Loka</button>${odMode() === "tolva" && offApp(it.name) ? `<a class="btn primary" ${odLink(it)}>Opna í forriti</a><a class="btn" href="${esc(it.webUrl)}" target="_blank" rel="noopener">Á netinu</a>` : `<a class="btn primary" href="${esc(it.webUrl)}" target="_blank" rel="noopener">Opna í OneDrive</a>`}</div>`;
    } catch (e) {
      if (sheetwrap.hidden) return;
      sheet.innerHTML = `<h3 id="sheet-h" class="big" style="font-size:18px;margin:0 0 10px">${esc(it?.name || "Skrá")}</h3><div class="empty">Ekki hægt að forskoða þessa skrá í appinu${it ? "" : ": " + esc(e.message)}.</div>
        <div class="actions" style="margin-top:12px"><button type="button" class="btn" id="pv-close">Loka</button>${it ? `<a class="btn primary" href="${esc(it.webUrl)}" target="_blank" rel="noopener">Opna í OneDrive</a>` : ""}</div>`;
    }
    document.getElementById("pv-close").onclick = closeSheet;
  }

  /* ---------- Fundargerð (.docx) ---------- */
  const X = s => esc(s);
  function makeDocx(blocks) {
    const run = (t, o = {}) => `<w:r>${o.b || o.c ? `<w:rPr>${o.b ? "<w:b/>" : ""}${o.c ? `<w:color w:val="${o.c}"/>` : ""}</w:rPr>` : ""}<w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
    const para = b => `<w:p>${b.s ? `<w:pPr><w:pStyle w:val="${b.s}"/></w:pPr>` : ""}${b.k ? run(b.k + ": ", { b: true, c: "1F4E79" }) : ""}${run(b.t || "")}</w:p>`;
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.map(para).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const font = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="22"/><w:lang w:val="is-IS"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E79"/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="5B7FA6"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="BDD7EE"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E79"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
</w:styles>`;
    return makeZip([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
      ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["word/document.xml", doc],
      ["word/styles.xml", styles]
    ]);
  }
  window.msMakeDocx = makeDocx;

  // Fundargerð (frá 1.7.0): haus með merki og „FUNDARGERÐ“, Poppins, upplýsingatafla og kaflar (skjalagerd.js)
  function fundDoc(f, p) {
    const x = d(f.date), when = x ? `${DAY[x.getDay()]} ${fmtDate(f.date)}` : "", kl = hhmm(f.date) ? hhmm(f.date) + (hhmm(f.dateEnd) ? "–" + hhmm(f.dateEnd) : "") : "";
    const blocks = [{ s: "Title", t: f.name }, { s: "Subtitle", t: p ? p.nafn : ORG.nafn }];
    ["Dagskrá", "Umræður", "Ákvarðanir", "Verkefni og ábyrgð", "Næsti fundur"].forEach(h => { blocks.push({ s: "Heading1", t: h }, { t: "" }); });
    const table = [["Dagsetning", when], ["Tími", kl], ["Staður", f.stadsetning || ""], ["Fjarfundur", f.fundarhlekkur || ""], ["Verkefni", p ? p.nafn : ""], ["Fundarmenn", (f.attendees || []).join(", ")], ["Ritari", starfName(ME()) || ""]];
    return { blocks, opts: { label: "Fundargerð", titill: "Fundargerð – " + f.name, table } };
  }
  // Mappa verkefnis (stofnuð ef hún er ekki til) og undirmappa sem byrjar á `prefix`, t.d. "08".
  async function projSub(p, prefix, fallbackName) {
    if (!p) { await mkFolder(ROOT, OFLOKKAD); return ROOT + "/" + OFLOKKAD; }
    await verkMoppur(true).catch(() => null);
    let k = keyOf(p);
    // Almenn verkefni fá ekki eigin möppu: skjöl þeirra fara í Óflokkað nema mappa sé þegar til.
    if (!k && noFolder(p)) { await mkFolder(ROOT, OFLOKKAD); return ROOT + "/" + OFLOKKAD; }
    if (!k) { await mkProj(p.nafn); await verkMoppur(true); k = keyOf(p); }
    if (!k) return ROOT + "/" + OFLOKKAD;
    const kids = await all(`/me/drive/items/${VK[k].id}/children?$select=name,folder&$top=999`);
    const fm = kids.find(i => i.folder && new RegExp("^" + prefix + "\\b").test(i.name));
    if (!fm) await mkFolder(ROOT + "/" + k, fallbackName);
    return ROOT + "/" + k + "/" + (fm ? fm.name : fallbackName);
  }
  async function upload(path, data, type) {
    return MS.g(`/me/drive/root:/${encP(path)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: "PUT", body: data, headers: { "Content-Type": type || "application/octet-stream" } });
  }
  // Vista skrá í möppu (slóðin stofnuð ef þarf). replace=true skrifar yfir skrá með sama nafni.
  window.msSaveFile = async function (dir, name, data, type, replace) {
    const parts = dir.split("/").filter(Boolean); let cur = parts.shift();
    for (const p of parts) { await mkFolder(cur, p); cur += "/" + p; }
    return MS.g(`/me/drive/root:/${encP(dir + "/" + safe(name.replace(/\.[a-z0-9]+$/i, "")) + (name.match(/\.[a-z0-9]+$/i) || [""])[0])}:/content?@microsoft.graph.conflictBehavior=${replace ? "replace" : "rename"}`, { method: "PUT", body: data, headers: { "Content-Type": type || "application/octet-stream" } });
  };
  // Tryggja að mappa sé til (öll slóðin) og skila henni
  async function ensureDir(dir) { const parts = dir.split("/").filter(Boolean); let cur = parts.shift(), it = null;
    for (const p of parts) { it = await mkFolder(cur, p); cur += "/" + p; } return it || MS.g(`/me/drive/root:/${encP(cur)}`); }
  window.msProjSub = projSub;
  window.msStofa = async () => (await all(`/me/drive/root:/${encP(ORG.od.stofa)}:/children?$select=name,folder&$top=200`)).filter(i => i.folder).map(i => i.name).sort((a, b) => a.localeCompare(b, "is"));
  window.msSnidmat = async ext => (await all(`/me/drive/root:/${encP(ORG.od.snidmat)}:/children?$select=id,name,file&$top=200`).catch(() => [])).filter(i => i.file && i.name.toLowerCase().endsWith(ext));
  // Nýtt Office-skjal: afrit af sniðmáti (id í OneDrive) eða tómu skjali úr appinu
  window.msNewOffice = async function (dir, name, ext, templateId) {
    let blob;
    if (templateId) { const t = await MS.g(`/me/drive/items/${templateId}`); blob = await (await fetch(t["@microsoft.graph.downloadUrl"])).blob(); }
    else blob = await (await fetch("templates/" + { docx: "word", xlsx: "excel", pptx: "powerpoint" }[ext] + "." + ext)).blob();
    await ensureDir(dir);
    return MS.g(`/me/drive/root:/${encP(dir + "/" + safe(name) + "." + ext)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: "PUT", body: blob, headers: { "Content-Type": "application/octet-stream" } });
  };
  // Færa (og/eða endurnefna) skrá í OneDrive
  window.msMove = async function (itemId, dir, newName) {
    const body = {}; if (dir) { const f = await ensureDir(dir); body.parentReference = { id: f.id }; } if (newName) body.name = newName;
    body["@microsoft.graph.conflictBehavior"] = "rename";
    const it = await MS.g(`/me/drive/items/${itemId}`, { method: "PATCH", body }); Object.keys(TREE).forEach(k => delete TREE[k]); return it;
  };
  // Kvittun fyrir útlagðan kostnað → <verkefni>/02 Vinnuskjöl/Kvittanir (eða Óflokkað/Kvittanir)
  // Almenn vistun: mappa (slóð frá rót OneDrive) búin til ef hún er ekki til, skrá vistuð þar.
  window.msVista = async function (dir, name, data, type) {
    const parts = dir.split("/"); for (let i = 1; i < parts.length; i++) await mkFolder(parts.slice(0, i).join("/"), parts[i]);
    const it = await upload(dir + "/" + safe(name.replace(/\.[a-z0-9]+$/i, "")) + (name.match(/\.[a-z0-9]+$/i) || [""])[0], data, type);
    return { url: it.webUrl, id: it.id };
  };
  window.msKvittun = async function (file, p, date, desc) {
    const base = await projSub(p, "02", "02 Vinnuskjöl");
    await mkFolder(base, "Kvittanir");
    const ext = (file.name.match(/\.[a-z0-9]{1,5}$/i) || [""])[0].toLowerCase();
    const it = await upload(base + "/Kvittanir/" + safe(`${date} ${desc}`).slice(0, 120) + ext, file, file.type);
    Object.keys(TREE).forEach(k => delete TREE[k]);
    return { url: it.webUrl, id: it.id };
  };

  async function fundargerd(fid, quiet) {
    const f = (S?.fundir || []).find(x => x.id === fid); if (!f) return;
    const p = typeof fundProj === "function" ? fundProj(f) : findProj(f.projectId);
    const dir = await projSub(p, "08", FUNDAMAPPA);
    const fname = safe(`${String(f.date || "").slice(0, 10)} Fundargerð - ${f.name}`) + ".docx";
    const D = fundDoc(f, p), bytes = window.DOK ? await DOK.docx(D.blocks, D.opts) : makeDocx(D.blocks);
    const it = await upload(dir + "/" + fname, bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    await saveSnapshot(s => { const q = (s.fundir || []).find(x => x.id === fid); if (q) { q.fundargerd = it.webUrl; q.fgId = it.id; } });
    Object.keys(TREE).forEach(k => delete TREE[k]);
    if (!quiet) toast("Fundargerð stofnuð í OneDrive");
    return it;
  }
  window.msFundargerd = (fid) => fundargerd(fid, false).catch(e => toast("Fundargerð: " + e.message));

  /* ---------- Póstar úr Outlook-möppunni „AERA“ ---------- */
  let MF = null, lastMail = 0;
  async function mailFolder() {
    if (MF) return MF;
    const q = "$filter=" + encodeURIComponent(`displayName eq '${ORG.postmappa.replace(/'/g, "''")}'`) + "&$select=id,displayName";
    let xs = (await MS.g(`/me/mailFolders?${q}`)).value;
    if (!xs.length) xs = (await MS.g(`/me/mailFolders/inbox/childFolders?${q}`)).value;
    if (!xs.length) throw new Error("Fann ekki póstmöppuna „AERA“ í Outlook.");
    return MF = xs[0].id;
  }
  // Giskar á verkefni pósts: verknúmer eða heiti í efni/texta, annars netfang sendanda sem passar við viðskiptavin með eitt verkefni í gangi
  function guessProj(text, fromAddr) {
    const t = String(text || "").toLowerCase();
    const ps = verkefni();
    const hit = (ps.find(p => p.nr && t.includes(p.nr.toLowerCase())) || ps.find(p => p.stutt && p.stutt.length >= 4 && t.includes(p.stutt.toLowerCase())))?.id;
    if (hit || !fromAddr) return hit || null;
    const dom = String(fromAddr).toLowerCase().split("@")[1]; if (!dom || /gmail|hotmail|outlook|live|icloud|yahoo|simnet|internet\.is/.test(dom)) return null;
    const cs = vskList().filter(c => [c.netfang, c.netfangT].some(e => String(e || "").toLowerCase().endsWith("@" + dom)));
    const cand = ps.filter(p => !isDone(p) && cs.some(c => sameId(p.vskId, c.id) || sameId(p.vkId, c.id)));
    return cand.length === 1 ? cand[0].id : null;
  }
  window.msGuessProj = guessProj;
  // AERA-póstmappan: þræðir sem passa við verkefni eru tengdir sjálfkrafa (tilvísun, ekki afrit);
  // aðrir þræðir birtast sem óflokkaðir (window.MS_OFL) þar til þeir eru tengdir.
  async function postar(manual) {
    const fid = await mailFolder();
    const ms = (await MS.g(`/me/mailFolders/${fid}/messages?$top=50&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,bodyPreview,webLink,conversationId`)).value || [];
    lastMail = Date.now();
    const tengt = new Set((S?.thraedir || []).map(t => t.conv)), seen = new Set(), ofl = [], auto = [];
    for (const m of ms) { const c = m.conversationId; if (!c || tengt.has(c) || seen.has(c)) continue; seen.add(c);
      const pid = guessProj((m.subject || "") + " " + (m.bodyPreview || ""), m.from?.emailAddress?.address);
      if (pid) auto.push({ c, pid, efni: m.subject }); else ofl.push(m); }
    for (const a of auto) await poLinkConv(a.c, a.pid, a.efni, "sjálfvirkt");
    window.MS_OFL = ofl; render();
    if (window.poMigrate) poMigrate().catch(e => console.warn("Flutningur pósta", e));
    if (manual) toast(auto.length ? `${auto.length} ${auto.length === 1 ? "þráður tengdur" : "þræðir tengdir"} sjálfkrafa` : ofl.length ? `${ofl.length} óflokkaðir þræðir` : "Engir nýir póstar");
    return auto.length;
  }

  /* ---------- Sjálfvirk vinnsla þegar tengt ---------- */
  let ticking = false;
  window.msTick = async function () {
    if (!isOn() || ticking || !S) return; ticking = true;
    try {
      const bid = (S.odBidrod || []).slice();
      for (const b of bid) {
        if (noFolder(findProj(b.verkefniId))) { await saveSnapshot(s => { s.odBidrod = (s.odBidrod || []).filter(x => x.verkefniId !== b.verkefniId); }); continue; }
        try {
          const p = findProj(b.verkefniId), it = await mkProj(p?.nafn || b.nafn);
          await saveSnapshot(s => { s.odBidrod = (s.odBidrod || []).filter(x => x.verkefniId !== b.verkefniId); const q = sFindP(s, b.verkefniId); if (q && !q.mappa) q.mappa = it.webUrl; });
          VK = null;
        } catch (e) { console.warn("Mappa", e); break; }
      }
      if (Date.now() - lastMail > 5 * 60 * 1000) await postar(false).catch(e => console.warn("Póstar", e));
    } finally { ticking = false; }
  };

  /* ---------- Stillingar og aðgerðir ---------- */
  window.msStillingarHTML = function () {
    const u = MS.user(), on = isOn(), nb = (S?.odBidrod || []).length;
    if (!on) return `<div class="viewtitle">Microsoft 365</div>
      <p class="hint" style="margin:0 0 8px">${MS.hadLogin() ? "Tengingin við Microsoft er runnin út á þessu tæki (hún gildir í sólarhring í senn)." : "Tengdu Microsoft-aðganginn þinn (@aerastudio.is) til að sjá skrár úr OneDrive, forskoða þær, stofna möppur og fundargerðir sjálfkrafa og sækja pósta úr Outlook-möppunni „AERA“."}</p>
      ${MS.lastError ? `<div class="msg err" style="margin-bottom:8px">${esc(MS.lastError)}</div>` : ""}
      <div class="links"><button type="button" class="btn primary" data-act="mslogin">${MS.hadLogin() ? "Tengjast aftur" : "Tengjast Microsoft"}</button></div>`;
    return `<div class="viewtitle">Microsoft 365</div>
      <div class="cfgrow"><span class="cdot pc-green"></span><div class="grow">Tengt sem ${esc(u?.name || "")}<div class="ls" style="font-size:12.5px;color:var(--muted)">${esc(u?.email || "")}</div></div></div>
      <p class="hint" style="margin:6px 0 8px">Skrár koma beint úr OneDrive. Ný verkefni fá möppu með 01–08, nýir fundir fá fundargerð í „08 Samskipti og fundir“ (eða Óflokkað) og póstar úr Outlook-möppunni „AERA“ sækjast á 15 mínútna fresti meðan appið er opið.</p>
      <div class="kind" style="margin-top:12px">Opna möppur og skjöl (á þessu tæki)</div>
      <div class="stat-row" style="margin-top:6px"><button type="button" class="chipbtn" data-act="odmode:tolva" aria-pressed="${odMode() === "tolva"}">Í tölvunni</button><button type="button" class="chipbtn" data-act="odmode:vefur" aria-pressed="${odMode() === "vefur"}">Á netinu (OneDrive)</button></div>
      ${odMode() === "tolva" ? `<label style="margin-top:8px">OneDrive-mappa í tölvunni<input id="od-rot" value="${esc(odRoot())}" placeholder="%UserProfile%\\OneDrive - …"></label><p class="hint" style="margin:4px 0 8px">Möppur: slóðin er afrituð til að líma í File Explorer. Word, Excel og PowerPoint opnast beint í forritunum. Annað opnast á netinu.</p>` : ""}
      <div class="links"><button type="button" class="btn" data-act="msmail">Sækja pósta núna</button>${nb ? `<button type="button" class="btn" data-act="mstick">Stofna möppur sem bíða (${nb})</button>` : ""}<button type="button" class="btn" data-act="mslogout">Aftengja</button></div>`;
  };
  window.msMissing = () => `<div class="links" style="margin-top:8px"><button type="button" class="btn" data-act="mslogin">${MS.hadLogin() ? "Tengjast Microsoft aftur" : "Tengjast Microsoft"}</button></div>`;

  window.msAct = function (k, r) {
    if (k === "odmode") { LS("aera-od-opna", r[0]); render(); return; }
    if (k === "mslogin") { MS.lastError = null; MS.login().then(() => { toast("Tengt við Microsoft"); render(); msTick(); }).catch(e => { MS.lastError = e.message; toast(e.message); render(); }); return; }
    if (k === "mslogout") { if (confirm("Aftengja Microsoft á þessu tæki?")) { MS.logout(); render(); } return; }
    if (!isOn()) { toast("Tengdu Microsoft fyrst (Stillingar)."); return; }
    if (k === "msprev") { preview(r.join(":")); return; }
    if (k === "msref") { const key = r.join(":"); VKerr = null; if (key && TREE[key]) delete TREE[key]; else VK = null; render(); return; }
    if (k === "msmk") { const p = findProj(r[0]); if (!p) return; toast("Stofna möppu…"); mkProj(p.nafn).then(it => saveSnapshot(s => { const q = sFindP(s, p.id); if (q && !q.mappa) q.mappa = it.webUrl; s.odBidrod = (s.odBidrod || []).filter(x => x.verkefniId !== p.id); })).then(() => { VK = null; toast("Mappa stofnuð"); render(); }).catch(e => toast(e.message)); return; }
    if (k === "msfg") { toast("Bý til fundargerð…"); msFundargerd(r[0]); return; }
    if (k === "msmail") { postar(true).catch(e => toast(e.message)); return; }
    if (k === "mstick") { lastMail = Date.now(); msTick().then(() => toast("Möppur stofnaðar")); return; }
  };

  window.addEventListener("ms-change", () => { if (S) render(); });
  MS.ready.then(() => { if (S) { render(); msTick(); } });
})();
