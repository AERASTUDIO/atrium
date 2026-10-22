#!/usr/bin/env python3
"""Býr til index.html fyrir hverja uppsetningu (aera/index.html, sonik/index.html …) úr sniðmátinu app.html.

Keyrðu frá rót geymslunnar ÁÐUR en breyting fer á main:   python3 tools/uppsetningar.py
  --athuga  : breytir engu, skilar villu ef einhver index.html er úrelt (til prófunar).

Uppsetning í undirmöppu <m>/ þarf: <m>/fyrirtaeki.js (window.ORG), <m>/manifest.webmanifest og má hafa <m>/utlit.css.
Allar aðrar skrár (kóði, Atrium-merki, letur) eru sameiginlegar – <base href="../"> vísar á rótina.
Frá 2.6.0 eru ALLAR uppsetningar í undirmöppu (líka AERA), svo hver fær sitt eigið app á tækinu (PWA-umfang skarast ekki).
Rót geymslunnar (index.html) er aðeins tilvísun á aera/.
ATH: "id" í <m>/manifest.webmanifest verður að vera full slóð, t.d. "/atrium/sonik/" – Chrome les id miðað við lénið,
svo "./" gæfi öllum uppsetningum sama auðkenni og ein uppsetning kæmi í stað annarrar (lagað í 2.6.1)."""
import json, os, sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPPSETNINGAR = ["aera", "sonik", "party", "demo", "dev"]  # undirmöppur; sniðmátið er app.html í rótinni

def smida(m, src):
    h = src
    def rep(a, b):
        nonlocal h
        assert h.count(a) == 1, f"{m}: fann ekki einu sinni: {a!r}"
        h = h.replace(a, b)
    rep('<!doctype html>', f'<!doctype html><!-- SJÁLFVIRKT BÚIÐ TIL úr ../app.html með tools/uppsetningar.py (uppsetning: {m}). Ekki breyta hér. -->')
    rep('<meta charset="utf-8">', '<meta charset="utf-8"><base href="../">')
    rep('<script src="fyrirtaeki.js"></script>', f'<script src="{m}/fyrirtaeki.js"></script>')
    rep('<link rel="manifest" href="manifest.webmanifest?v=3">', f'<link rel="manifest" href="{m}/manifest.webmanifest">')
    # App-tákn uppsetningarinnar (frá 2.9.1, tools/takn.py): Atrium og merki fyrirtækisins á ská
    if os.path.exists(os.path.join(ROT, m, "apple-touch-icon.png")):
        rep('<link rel="icon" type="image/png" href="icons/atrium-icon-192.png">', f'<link rel="icon" type="image/png" href="{m}/icon-192.png">')
        rep('<link rel="apple-touch-icon" href="icons/atrium-apple-touch-icon.png">', f'<link rel="apple-touch-icon" href="{m}/apple-touch-icon.png">')
    if os.path.exists(os.path.join(ROT, m, "utlit.css")):
        rep('<link rel="stylesheet" href="brand.css">', f'<link rel="stylesheet" href="brand.css">\n<link rel="stylesheet" href="{m}/utlit.css">')
    return h

def main():
    athuga = "--athuga" in sys.argv
    src = open(os.path.join(ROT, "app.html"), encoding="utf-8").read()
    urelt = []
    for m in UPPSETNINGAR:
        for f in ("fyrirtaeki.js", "manifest.webmanifest"):
            assert os.path.exists(os.path.join(ROT, m, f)), f"{m}/{f} vantar"
        mid = json.load(open(os.path.join(ROT, m, "manifest.webmanifest"), encoding="utf-8")).get("id", "")
        assert mid.startswith("/") and mid.endswith(f"/{m}/"), f"{m}/manifest.webmanifest: id verður að vera full slóð sem endar á /{m}/ (er {mid!r})"
        p = os.path.join(ROT, m, "index.html"); ny = smida(m, src)
        gamalt = open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if gamalt != ny:
            urelt.append(m)
            if not athuga: open(p, "w", encoding="utf-8").write(ny)
    if athuga and urelt: sys.exit("Úrelt: " + ", ".join(f"{m}/index.html" for m in urelt) + " – keyrðu python3 tools/uppsetningar.py")
    print(("Úrelt: " if athuga else "Uppfært: ") + (", ".join(urelt) or "ekkert – allt í lagi"))

main()
