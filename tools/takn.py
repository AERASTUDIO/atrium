#!/usr/bin/env python3
"""Býr til app-tákn hverrar uppsetningar (frá 2.39.0, tillaga „A1 mjög blandað“):
Atrium-merkið sem vírrammi með daufum hálftóni, blandað við bakgrunninn, og merki fyrirtækisins í miðjunni (í „atríuminu“).

  python3 tools/takn.py            -> skrifar <m>/takn.svg og <m>/takn-maskable.svg
  node tools/takn-png.js           -> býr til PNG (icon-192, icon-512, icon-maskable-512, apple-touch-icon) úr SVG (Playwright)

Stillingar hverrar uppsetningar eru í TAKN hér að neðan (merki, bakgrunnur, litur línu og punkta)."""
import os, re
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAKN = {
  "aera":  {"merki": "icons/merki-dokk.svg", "bg": "#121416", "lina": "#3E4650", "punktar": "#5A6470", "ljost": False},
  "sonik": {"merki": "sonik/merki-dokk.svg", "bg": "#0C2127", "lina": "#2A4C56", "punktar": "#3F6976", "ljost": False},
  "party": {"merki": "party/merki.png", "bg": "#FFFFFF", "lina": "#D3D9DF", "punktar": "#C3CBD3", "ljost": True},
}
# Fletir Atrium-merkisins (SVG-einingar 0–100) og tónn hvers flatar: 0 ljós, 1 millitónn, 2 dökkur skáflötur
FLETIR = [("0,0 72,0 58,14 0,14",0),("0,14 58,14 72,28 0,28",1),("72,0 72,28 58,14",2),
  ("100,0 100,72 86,58 86,0",0),("86,0 86,58 72,72 72,0",1),("100,72 72,72 86,58",2),
  ("100,100 28,100 42,86 100,86",0),("100,86 42,86 28,72 100,72",1),("28,100 28,72 42,86",2),
  ("0,100 0,28 14,42 14,100",0),("14,100 14,42 28,28 28,100",1),("0,28 28,28 14,42",2)]
def inner(p):
  s = open(os.path.join(ROT, p), encoding="utf-8").read(); vb = re.search(r'viewBox="([^"]+)"', s).group(1)
  return vb, s[s.index(">", s.index("<svg")) + 1:s.rindex("</svg>")]
def nest(p, x, y, w):
  if p.endswith(".png"):  # PNG-merki (t.d. party.is) – fellt inn sem gögn
    import base64; d = base64.b64encode(open(os.path.join(ROT, p), "rb").read()).decode()
    return f'<image x="{x}" y="{y}" width="{w}" height="{w}" href="data:image/png;base64,{d}" preserveAspectRatio="xMidYMid meet"/>'
  vb, b = inner(p); return f'<svg x="{x}" y="{y}" width="{w}" height="{w}" viewBox="{vb}" preserveAspectRatio="xMidYMid meet">{b}</svg>'
def vir(x, y, s, t):
  # vírrammi: útlínur hvers flatar + hálftónn (punktastærð eftir tóni; snúið við á ljósum grunni)
  r = (1.25, 0.85, 0.45); r = tuple(reversed(r)) if t["ljost"] else r
  pat = "".join(f'<pattern id="h{i}" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                f'<circle cx="1.8" cy="1.8" r="{v}" fill="{t["punktar"]}" fill-opacity="0.5"/></pattern>' for i, v in enumerate(r))
  fyl = "".join(f'<polygon points="{p}" fill="url(#h{i})"/>' for p, i in FLETIR)
  lin = "".join(f'<polygon points="{p}" fill="none" stroke="{t["lina"]}" stroke-width="1.6" stroke-linejoin="round"/>' for p, i in FLETIR)
  return f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="-4 -4 108 108"><defs>{pat}</defs>{fyl}{lin}</svg>'
def svg(t, mask):
  # maskable: allt innan miðjuhrings (r = 40%) svo Android klippi ekki merkið
  S = 300 if mask else 380; o = (512 - S) / 2
  lw = round((114 if t["ljost"] else 104) * S / 380); lo = (512 - lw) / 2
  return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
          f'<rect width="512" height="512" fill="{t["bg"]}"/>{vir(o, o, S, t)}{nest(t["merki"], lo, lo, lw)}</svg>')
for m, t in TAKN.items():
  for mask, nafn in ((False, "takn.svg"), (True, "takn-maskable.svg")):
    open(os.path.join(ROT, m, nafn), "w", encoding="utf-8").write(svg(t, mask))
  print("Tákn:", m)
