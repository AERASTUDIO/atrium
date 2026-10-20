// PNG-tákn úr <m>/takn.svg og <m>/takn-maskable.svg (sjá tools/takn.py). Keyrt: node tools/takn-png.js (krefst Playwright).
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROT = path.join(__dirname, ".."), M = ["aera", "sonik", "party"];
(async () => { const b = await chromium.launch();
  for (const m of M) for (const [src, out, s] of [["takn.svg", "icon-192.png", 192], ["takn.svg", "icon-512.png", 512], ["takn-maskable.svg", "icon-maskable-512.png", 512], ["takn.svg", "apple-touch-icon.png", 180]]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<html><body style="margin:0">${fs.readFileSync(path.join(ROT, m, src), "utf8").replace('width="512" height="512"', `width="${s}" height="${s}"`)}</body></html>`);
    await p.screenshot({ path: path.join(ROT, m, out), omitBackground: false }); await p.close(); console.log(m + "/" + out); }
  await b.close(); })();
