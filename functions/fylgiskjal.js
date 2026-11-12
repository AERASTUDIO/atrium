/* Fylgiskjal reiknings (2.118.4): sundurliðun tíma (og útlagðs kostnaðar) sem PDF – hengt á reikninginn í Payday.
   Byggt á netþjóni (pdf-lib) svo það virki líka við sjálfvirka sendingu. Letur: Manrope frá 2.142.0 (SIL OFL) – eins og appið. */
const fs = require("fs"), path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const C = { nott: rgb(0x12 / 255, 0x14 / 255, 0x16 / 255), grafit: rgb(0x2F / 255, 0x37 / 255, 0x42 / 255), stal: rgb(0x7C / 255, 0x88 / 255, 0x96 / 255), thoka: rgb(0xC9 / 255, 0xD1 / 255, 0xD9 / 255), pappir: rgb(0xF6 / 255, 0xF7 / 255, 0xF8 / 255) };
const dIS = s => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]}.${+m[2]}.${m[1]}` : ""; };
const hIS = n => (Math.round((+n || 0) * 100) / 100).toLocaleString("de-DE");
const krIS = n => Math.round(+n || 0).toLocaleString("de-DE") + " kr.";
const kl = s => { const m = String(s || "").match(/(\d{1,2}):(\d{2})/); return m ? m[1].padStart(2, "0") + ":" + m[2] : ""; };

/* R: reikningur, T: tímafærslur, K: kostnaður, P: { <verkefniId>: verkefni }, nafn: sk → nafn, logo: PNG-bæti eða null */
async function fylgiskjalPdf({ R, T, K, P, nafn, logo }) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const f = n => fs.readFileSync(path.join(__dirname, "fonts", n));
  const F = { r: await doc.embedFont(f("Manrope-Regular.ttf"), { subset: true }), m: await doc.embedFont(f("Manrope-Medium.ttf"), { subset: true }), l: await doc.embedFont(f("Manrope-SemiBold.ttf"), { subset: true }) };
  let img = null; if (logo) { try { img = await doc.embedPng(logo); } catch (e) { img = null; } }
  const W = 595.28, H = 841.89, M = 48, X1 = W - M, s = R.seljandi || {};
  let pg, y, nr = 0; const pages = [];
  const txt = (t, x, yy, o = {}) => pg.drawText(String(t ?? ""), { x, y: yy, size: o.size || 9, font: o.font || F.r, color: o.color || C.grafit });
  const w = (t, size = 9, font = F.r) => font.widthOfTextAtSize(String(t ?? ""), size);
  const fit = (t, max, size = 9, font = F.r) => { t = String(t ?? "").replace(/\s+/g, " ").trim(); if (w(t, size, font) <= max) return t; while (t && w(t + "…", size, font) > max) t = t.slice(0, -1); return t + "…"; };
  const wrap = (t, max, size = 9, font = F.r) => { const out = []; let line = ""; String(t ?? "").replace(/\s+/g, " ").trim().split(" ").forEach(word => { const c = line ? line + " " + word : word; if (w(c, size, font) <= max || !line) line = c; else { out.push(line); line = word; } }); if (line) out.push(line); return out.length ? out : [""]; };
  const newPage = () => {
    pg = doc.addPage([W, H]); pages.push(pg); nr++; y = H - M;
    if (img) { const h = 26, ww = img.width * h / img.height; pg.drawImage(img, { x: M, y: y - h, width: ww, height: h }); } else txt(s.nafn || "", M, y - 18, { size: 14, font: F.m, color: C.nott });
    txt("SUNDURLIÐUN TÍMA", X1 - w("SUNDURLIÐUN TÍMA", 8, F.m) , y - 8, { size: 8, font: F.m, color: C.stal });
    const ref = `Fylgiskjal með reikningi · ATR-${R.nr}`; txt(ref, X1 - w(ref, 9), y - 22, { size: 9 });
    y -= 44; pg.drawLine({ start: { x: M, y }, end: { x: X1, y }, thickness: 0.6, color: C.thoka }); y -= 18;
  };
  const need = n => { if (y - n < M + 30) newPage(); };
  newPage();
  // Haus: greiðandi og tímabil
  const ds = T.map(e => String(e.date || "").slice(0, 10)).filter(Boolean).sort();
  txt("Greiðandi", M, y, { size: 7.5, font: F.m, color: C.stal }); txt("Tímabil", M + 280, y, { size: 7.5, font: F.m, color: C.stal }); y -= 13;
  txt(fit((R.kaupandi || {}).name || "", 260, 10, F.m), M, y, { size: 10, font: F.m, color: C.nott });
  txt(ds.length ? (ds[0] === ds[ds.length - 1] ? dIS(ds[0]) : dIS(ds[0]) + " – " + dIS(ds[ds.length - 1])) : "–", M + 280, y, { size: 10 }); y -= 26;
  // Dálkar
  const col = { d: M, kl: M + 54, sm: M + 112, l: M + 222, h: X1 };
  const head = () => { pg.drawRectangle({ x: M, y: y - 4, width: X1 - M, height: 16, color: C.pappir });
    [["Dags.", col.d], ["Kl.", col.kl], ["Starfsmaður", col.sm], ["Lýsing", col.l]].forEach(([t, x]) => txt(t, x + 2, y + 1, { size: 7.5, font: F.m, color: C.stal }));
    txt("Klst.", col.h - w("Klst.", 7.5, F.m) - 2, y + 1, { size: 7.5, font: F.m, color: C.stal }); y -= 18; };
  // Flokkað eftir verkefni
  const groups = new Map(); T.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.fra || "").localeCompare(String(b.fra || ""))).forEach(e => { const k = e.verkefniId || ""; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  let tot = 0;
  for (const [k, es] of groups) {
    need(60); const p = P[k]; const title = p ? `${p.nr || ""} ${p.stutt || p.nafn || ""}`.trim() : "Án verkefnis";
    txt(fit(title, X1 - M, 10.5, F.m), M, y, { size: 10.5, font: F.m, color: C.nott }); y -= 16; head();
    let sub = 0;
    for (const e of es) {
      const lines = wrap(e.lysing || "", col.h - 44 - col.l, 8.5); need(11 * lines.length + 8);
      const h = +e.timar || 0; sub += h;
      txt(dIS(e.date), col.d + 2, y, { size: 8.5 }); txt(e.fra && e.til ? kl(e.fra) + "–" + kl(e.til) : "", col.kl + 2, y, { size: 8.5 });
      txt(fit(nafn[e.starfsmadur] || e.starfsmadur || "", col.l - col.sm - 8, 8.5), col.sm + 2, y, { size: 8.5 });
      lines.forEach((ln, i) => txt(ln, col.l + 2, y - i * 11, { size: 8.5 }));
      txt(hIS(h), col.h - w(hIS(h), 8.5) - 2, y, { size: 8.5 });
      y -= 11 * lines.length + 7; pg.drawLine({ start: { x: M, y: y + 11 }, end: { x: X1, y: y + 11 }, thickness: 0.3, color: C.thoka });
    }
    tot += sub; need(20);
    txt(`Samtals ${p ? p.nr || "" : ""}`.trim(), col.l + 2, y - 2, { size: 8.5, font: F.m }); txt(hIS(sub) + " klst.", col.h - w(hIS(sub) + " klst.", 8.5, F.m) - 2, y - 2, { size: 8.5, font: F.m, color: C.nott }); y -= 26;
  }
  if (T.length) { need(26); pg.drawLine({ start: { x: M, y: y + 10 }, end: { x: X1, y: y + 10 }, thickness: 0.8, color: C.grafit });
    txt("Tímar samtals", M, y - 4, { size: 10, font: F.m, color: C.nott }); txt(hIS(tot) + " klst.", X1 - w(hIS(tot) + " klst.", 10, F.m), y - 4, { size: 10, font: F.m, color: C.nott }); y -= 30; }
  // Útlagður kostnaður
  if (K.length) {
    need(60); txt("Útlagður kostnaður", M, y, { size: 10.5, font: F.m, color: C.nott }); y -= 16;
    pg.drawRectangle({ x: M, y: y - 4, width: X1 - M, height: 16, color: C.pappir });
    txt("Dags.", col.d + 2, y + 1, { size: 7.5, font: F.m, color: C.stal }); txt("Lýsing", col.kl + 2, y + 1, { size: 7.5, font: F.m, color: C.stal }); txt("Upphæð", X1 - w("Upphæð", 7.5, F.m) - 2, y + 1, { size: 7.5, font: F.m, color: C.stal }); y -= 18;
    let ks = 0;
    for (const x of K.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))) { need(16); ks += +x.upphaed || 0;
      const p = P[x.verkefniId]; txt(dIS(x.date), col.d + 2, y, { size: 8.5 }); txt(fit((p ? p.nr + " · " : "") + (x.lysing || ""), X1 - col.kl - 90, 8.5), col.kl + 2, y, { size: 8.5 }); txt(krIS(x.upphaed), X1 - w(krIS(x.upphaed), 8.5) - 2, y, { size: 8.5 }); y -= 15; }
    txt("Samtals", col.kl + 2, y - 2, { size: 8.5, font: F.m }); txt(krIS(ks), X1 - w(krIS(ks), 8.5, F.m) - 2, y - 2, { size: 8.5, font: F.m, color: C.nott }); y -= 24;
  }
  // Fótur á hverri síðu
  pages.forEach((p, i) => { const foot = [s.nafn, s.kt ? "kt. " + s.kt : "", s.vsknr ? "VSK-nr. " + s.vsknr : ""].filter(Boolean).join(" · "), pn = `Bls. ${i + 1} af ${pages.length}`;
    p.drawLine({ start: { x: M, y: M + 14 }, end: { x: X1, y: M + 14 }, thickness: 0.4, color: C.thoka });
    p.drawText(foot, { x: M, y: M, size: 7.5, font: F.r, color: C.stal }); p.drawText(pn, { x: X1 - F.r.widthOfTextAtSize(pn, 7.5), y: M, size: 7.5, font: F.r, color: C.stal }); });
  return Buffer.from(await doc.save());
}
module.exports = { fylgiskjalPdf };
