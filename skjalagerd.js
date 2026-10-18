/* Skjalagerð (frá 1.7.0): sameiginlegt útlit fyrir öll skjöl sem appið býr til – reikninga, tímaskýrslur og fundargerðir.
   - Merki: icons/doc-logo.png (lárétta merkið, mynd vinstra megin, texti hægra megin)
   - Letur: Poppins (fonts/, SIL Open Font License) – Light í fyrirsögnum, Regular í meginmáli, Medium í áherslum
   - Litir merkjahandbókar: Nótt #121416, Grafít #2F3742, Stál #7C8896, Þoka #C9D1D9, Pappír #F6F7F8
   - Haus: merki + tegund skjals (t.d. REIKNINGUR) og auðkenni; fótur á hverri síðu: fyrirtæki, kt., vefur og „Bls. x af y“
   PDF er búið til með jsPDF (lib/, MIT), sem er sótt fyrst þegar þess er þörf. */
(function () {
  const C = { nott: [18, 20, 22], grafit: [47, 55, 66], stal: [124, 136, 150], thoka: [201, 209, 217], pappir: [246, 247, 248], lina: [227, 232, 236], hvitt: [255, 255, 255] };
  const HEX = { nott: "121416", grafit: "2F3742", stal: "7C8896", thoka: "C9D1D9", pappir: "F6F7F8", lina: "E3E8EC" };
  let JS = null, FONTS = null, LOGO = null;
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("Gat ekki hlaðið " + src)); document.head.appendChild(s); });
  const b64 = buf => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  async function libs() {
    if (!JS) JS = (window.jspdf ? Promise.resolve() : loadScript("lib/jspdf.umd.min.js")).then(() => window.jspdf.jsPDF);
    if (!FONTS) FONTS = Promise.all(["Light", "Regular", "Medium"].map(async w => [w, b64(await (await fetch("fonts/Poppins-" + w + ".ttf")).arrayBuffer())]));
    return [await JS, await FONTS];
  }
  // Merkið sem PNG (bæti og data-URL) – sótt einu sinni
  async function logo() {
    if (!LOGO) LOGO = fetch("icons/doc-logo.png").then(r => r.arrayBuffer()).then(buf => ({ bytes: new Uint8Array(buf), url: "data:image/png;base64," + b64(buf), w: 960, h: 303 }));
    return LOGO;
  }
  // Upplýsingar um fyrirtækið (Reikningsstillingar, annars fyrirtaeki.js)
  function co() {
    const r = (typeof CFG === "function" && CFG().reikn) || {};
    return { nafn: r.nafn || ORG.logheiti || ORG.nafn, kt: r.kt || "", vsknr: r.vsknr || "", heimilisfang: r.heimilisfang || "", netfang: r.netfang || "", simi: r.simi || "", banki: r.banki || "", vefur: ORG.vefur || "" };
  }
  const coLine = () => { const c = co(); return [c.nafn, c.kt && "kt. " + c.kt, c.heimilisfang, c.netfang, c.vefur].filter(Boolean).join("  ·  "); };

  /* ---------- PDF ---------- */
  async function pdf() {
    const [jsPDF, fonts] = await libs(), L = await logo();
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    fonts.forEach(([w, data]) => { doc.addFileToVFS("Poppins-" + w + ".ttf", data); doc.addFont("Poppins-" + w + ".ttf", "Poppins", w.toLowerCase()); });
    const W = 595.28, H = 841.89, M = 48;
    const P = {
      doc, W, H, M, X1: W - M, C,
      font(w = "regular", size = 9.5, color = C.nott) { doc.setFont("Poppins", w); doc.setFontSize(size); doc.setTextColor(...color); return P; },
      text(t, x, y, o = {}) { P.font(o.w || "regular", o.size || 9.5, o.color || C.nott); if (o.space) doc.setCharSpace(o.space); doc.text(String(t ?? ""), x, y, { align: o.align || "left" }); if (o.space) doc.setCharSpace(0); return P; },
      wrap(t, w, size = 9.5, wgt = "regular") { P.font(wgt, size); return doc.splitTextToSize(String(t ?? ""), w); },
      rect(x, y, w, h, c) { doc.setFillColor(...c); doc.rect(x, y, w, h, "F"); return P; },
      line(x1, y1, x2, y2, c = C.lina, lw = 0.6) { doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2); return P; },
      // Haus á fyrstu síðu: merki vinstra megin, tegund skjals og auðkenni hægra megin. Skilar y fyrir meginmál.
      head(titill, meta = []) {
        const lh = 34, lw = lh * L.w / L.h; doc.addImage(L.url, "PNG", M, M - 6, lw, lh);
        P.text(titill.toUpperCase(), P.X1, M + 10, { w: "light", size: 20, color: C.grafit, align: "right", space: 2.2 });
        // Lýsigögn hægra megin: gildi hægrijafnað, heiti rétt vinstra megin við gildið (breidd mæld)
        let y = M + 28; meta.forEach(([k, v]) => { if (v == null || v === "") return; P.font("medium", 8.5); let val = String(v); while (doc.getTextWidth(val) > 230 && val.length > 4) val = val.slice(0, -2); if (val !== String(v)) val = val.slice(0, -1) + "…";
          const vw = doc.getTextWidth(val); P.text(val, P.X1, y, { w: "medium", size: 8.5, align: "right" }); P.text(k, P.X1 - vw - 8, y, { size: 8.5, color: C.stal, align: "right" }); y += 12.5; });
        y = Math.max(y, M + lh + 8) + 10; P.line(M, y, P.X1, y, C.thoka, 0.8); return y + 22;
      },
      // Haus á framhaldssíðum
      contHead(label) { P.text(label, M, M, { size: 8.5, color: C.stal }); doc.addImage(L.url, "PNG", P.X1 - 70, M - 14, 70, 70 * L.h / L.w); P.line(M, M + 10, P.X1, M + 10, C.lina); return M + 30; },
      // Fótur á öllum síðum
      finish(label) {
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) { doc.setPage(i); P.line(M, H - 40, P.X1, H - 40, C.lina); const right = (label ? label + "  ·  " : "") + "Bls. " + i + " af " + n;
          P.font("regular", 7.5); const room = P.X1 - M - doc.getTextWidth(right) - 18; let parts = coLine().split("  ·  "), left = parts.join("  ·  ");
          while (doc.getTextWidth(left) > room && parts.length > 1) { parts.splice(parts.length > 3 ? 2 : parts.length - 1, 1); left = parts.join("  ·  "); }
          P.text(left, M, H - 26, { size: 7.5, color: C.stal }); P.text(right, P.X1, H - 26, { size: 7.5, color: C.stal, align: "right" }); }
        doc.setProperties({ title: label || "", author: co().nafn, creator: ORG.nafn + " app" });
        return new Uint8Array(doc.output("arraybuffer"));
      }
    };
    return P;
  }

  /* ---------- Excel: merki efst og fótur með síðunúmerum ---------- */
  // Bætir merkinu við .xlsx (teikning við A1) – kallað af makeXlsx þegar logo er gefið
  function xlsxLogoParts(L, wpx) {
    const h = Math.round(wpx * L.h / L.w), emu = n => Math.round(n * 9525);
    return {
      drawing: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${emu(4)}</xdr:rowOff></xdr:from><xdr:ext cx="${emu(wpx)}" cy="${emu(h)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Merki"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(wpx)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`,
      rels: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/merki.png"/></Relationships>`,
      heightPt: Math.ceil(h * 0.75) + 8
    };
  }

  /* ---------- Word (.docx): fundargerð o.fl. ---------- */
  // blocks: [{s:"Title"|"Subtitle"|"Heading1"|"Label", t, k}] · opts: {label, table:[[k,v]]}
  async function docx(blocks, opts = {}) {
    const L = await logo(), X = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const run = (t, o = {}) => `<w:r>${o.b || o.c || o.caps || o.sz ? `<w:rPr>${o.b ? "<w:b/>" : ""}${o.caps ? "<w:caps/><w:spacing w:val=\"40\"/>" : ""}${o.c ? `<w:color w:val="${o.c}"/>` : ""}${o.sz ? `<w:sz w:val="${o.sz}"/>` : ""}</w:rPr>` : ""}<w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
    const para = b => `<w:p>${b.s ? `<w:pPr><w:pStyle w:val="${b.s}"/></w:pPr>` : ""}${b.k ? run(b.k + ": ", { c: HEX.stal }) : ""}${run(b.t || "")}</w:p>`;
    const cell = (t, o = {}) => `<w:tc><w:tcPr><w:tcW w:w="${o.w}" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="4" w:color="${HEX.lina}"/></w:tcBorders>${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ""}</w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${run(t, o)}</w:p></w:tc>`;
    const table = (opts.table || []).length ? `<w:tbl><w:tblPr><w:tblW w:w="9070" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2200"/><w:gridCol w:w="6870"/></w:tblGrid>${opts.table.filter(([, v]) => v).map(([k, v]) => `<w:tr>${cell(k, { w: 2200, c: HEX.stal, sz: 19 })}${cell(v, { w: 6870 })}</w:tr>`).join("")}</w:tbl><w:p/>` : "";
    const lw = 2000000, lh = Math.round(lw * L.h / L.w); // EMU (~5,5 cm breitt merki)
    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:tbl><w:tblPr><w:tblW w:w="9070" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:bottom w:val="single" w:sz="6" w:color="${HEX.thoka}"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4535"/><w:gridCol w:w="4535"/></w:tblGrid><w:tr>
<w:tc><w:tcPr><w:tcW w:w="4535" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr><w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${lw}" cy="${lh}"/><wp:docPr id="1" name="Merki"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="merki.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${lw}" cy="${lh}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:tcW w:w="4535" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="120"/></w:pPr>${run(opts.label || "", { caps: true, c: HEX.grafit, sz: 22 })}</w:p></w:tc>
</w:tr></w:tbl><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:hdr>`;
    const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="${HEX.lina}"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="9070"/></w:tabs></w:pPr>${run(coLine(), { c: HEX.stal, sz: 15 })}<w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:tab/><w:t xml:space="preserve">Bls. </w:t></w:r><w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
    const firstTitle = blocks.findIndex(b => b.s === "Title"), body = blocks.slice(0, firstTitle + 2).map(para).join("") + table + blocks.slice(firstTitle + 2).map(para).join("");
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1418" w:bottom="1418" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const F = '<w:rFonts w:ascii="Poppins" w:hAnsi="Poppins" w:cs="Poppins" w:eastAsia="Poppins"/>', FL = '<w:rFonts w:ascii="Poppins Light" w:hAnsi="Poppins Light" w:cs="Poppins Light"/>';
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${F}<w:color w:val="${HEX.nott}"/><w:sz w:val="20"/><w:lang w:val="is-IS"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr><w:rPr>${FL}<w:color w:val="${HEX.grafit}"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="${HEX.stal}"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="100"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="3" w:color="${HEX.thoka}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:caps/><w:spacing w:val="30"/><w:color w:val="${HEX.grafit}"/><w:sz w:val="21"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
</w:styles>`;
    const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    return makeZip([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
      ["docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(opts.titill || opts.label || "")}</dc:title><dc:creator>${X(co().nafn)}</dc:creator><cp:keywords>${X(opts.label || "")}</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
      ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdH" Type="${R}/header" Target="header1.xml"/><Relationship Id="rIdF" Type="${R}/footer" Target="footer1.xml"/></Relationships>`],
      ["word/_rels/header1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="${R}/image" Target="media/merki.png"/></Relationships>`],
      ["word/document.xml", doc], ["word/styles.xml", styles], ["word/header1.xml", header], ["word/footer1.xml", footer],
      ["word/media/merki.png", L.bytes]
    ]);
  }

  window.DOK = { C, HEX, pdf, logo, co, coLine, docx, xlsxLogoParts };
})();
