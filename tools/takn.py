#!/usr/bin/env python3
"""Býr til app-tákn hverrar uppsetningar (frá 2.9.1): Atrium-merkið og merki fyrirtækisins á ská.
Efri-vinstri helmingur: litur Atrium/uppsetningar (bakgrunnur) með Atrium-merkinu; neðri-hægri: litur fyrirtækisins með merki þess.

  python3 tools/takn.py            -> skrifar <m>/takn.svg og <m>/takn-maskable.svg
  node tools/takn-png.js           -> býr til PNG (icon-192, icon-512, icon-maskable-512, apple-touch-icon) úr SVG (Playwright)

Stillingar hverrar uppsetningar eru í TAKN hér að neðan (merki, bakgrunnur, litur fyrirtækis)."""
import os, re
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAKN = {
  "aera":  {"merki": "icons/merki-dokk.svg", "bg": "#121416", "litur": "#2F3742"},
  "sonik": {"merki": "sonik/merki-dokk.svg", "bg": "#0C2127", "litur": "#2A7289"},
  "party": {"merki": "party/merki.png", "bg": "#0E1B4D", "litur": "#FFFFFF"},
}
ATR = "icons/atrium-merki-dokk.svg"
def inner(p):
  s = open(os.path.join(ROT, p), encoding="utf-8").read(); vb = re.search(r'viewBox="([^"]+)"', s).group(1)
  return vb, s[s.index(">", s.index("<svg")) + 1:s.rindex("</svg>")]
def nest(p, x, y, w):
  if p.endswith(".png"):  # PNG-merki (t.d. party.is) – fellt inn sem gögn
    import base64; d = base64.b64encode(open(os.path.join(ROT, p), "rb").read()).decode()
    return f'<image x="{x}" y="{y}" width="{w}" height="{w}" href="data:image/png;base64,{d}" preserveAspectRatio="xMidYMid meet"/>'
  vb, b = inner(p); return f'<svg x="{x}" y="{y}" width="{w}" height="{w}" viewBox="{vb}" preserveAspectRatio="xMidYMid meet">{b}</svg>'
def svg(t, mask):
  # maskable: allt innan miðjuhrings (r = 40%) svo Android klippi ekki merkin
  a, c, w = ((116, 116, 142), (254, 254, 142), None) if mask else ((84, 84, 172), (256, 256, 172), None)
  return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
          f'<rect width="512" height="512" fill="{t["bg"]}"/><polygon points="512,0 512,512 0,512" fill="{t["litur"]}"/>'
          f'{nest(ATR, a[0], a[1], a[2])}{nest(t["merki"], c[0], c[1], c[2])}</svg>')
for m, t in TAKN.items():
  for mask, nafn in ((False, "takn.svg"), (True, "takn-maskable.svg")):
    open(os.path.join(ROT, m, nafn), "w", encoding="utf-8").write(svg(t, mask))
  print("Tákn:", m)
