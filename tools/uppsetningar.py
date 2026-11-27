#!/usr/bin/env python3
"""Býr til index.html fyrir hverja uppsetningu (aera/index.html, sonik/index.html …) úr sniðmátinu app.html.

Keyrðu frá rót geymslunnar ÁÐUR en breyting fer á main:   python3 tools/uppsetningar.py
  --athuga  : breytir engu, skilar villu ef einhver index.html er úrelt (til prófunar).

Uppsetning í undirmöppu <m>/ þarf: <m>/fyrirtaeki.js (window.ORG), <m>/manifest.webmanifest og má hafa <m>/utlit.css.
Allar aðrar skrár (kóði, Atrium-merki, letur) eru sameiginlegar – <base href="../"> vísar á rótina.
Frá 2.6.0 eru ALLAR uppsetningar í undirmöppu (líka AERA), svo hver fær sitt eigið app á tækinu (PWA-umfang skarast ekki).
Rót geymslunnar (index.html) er aðeins tilvísun á aera/.
ATH: "id" í <m>/manifest.webmanifest verður að vera full slóð, t.d. "/sonik/" (frá 2.96.1 á atrium.aerastudio.is; áður "/atrium/sonik/" á github.io) – Chrome les id miðað við lénið,
svo "./" gæfi öllum uppsetningum sama auðkenni og ein uppsetning kæmi í stað annarrar (lagað í 2.6.1)."""
import json, os, re, sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPPSETNINGAR = ["aera", "sonik", "party", "demo", "dev"]  # undirmöppur; sniðmátið er app.html í rótinni

# 2.168.0 – ÚTGÁFUR: dev keyrir alltaf nýjasta kóðann í rótinni. Aðrar uppsetningar geta verið FESTAR við afrit af útgáfu
# í ut/<útgáfa>/ (búið til með tools/gefa-ut.py). utgafur.txt segir hvaða útgáfu hver uppsetning notar, ein lína á uppsetningu, t.d. „aera = 2.167.1“ (ekki .json – .gitignore útilokar json-skrár).
# Uppsetning sem er ekki í utgafur.txt notar rótina (nýjasta kóðann). Letur, lib/, icons/ og pontun/ eru áfram sameiginleg.
def festar():
    f = os.path.join(ROT, "utgafur.txt")
    if not os.path.exists(f): return {}
    L = [l.split("#")[0].split("=") for l in open(f, encoding="utf-8")]
    return {a.strip(): b.strip() for a, b in (x for x in L if len(x) == 2)}

def kodaskrar(src):
    """Skrár kóðans sem app.html hleður (js/css í rótinni og simi/) – það sem er afritað í ut/<útgáfa>/."""
    L = re.findall(r'<script src="([^"]+)"', src) + re.findall(r'<link rel="stylesheet" href="([^"]+)"', src)
    L += re.findall(r'ROT\("([^"]+)"\)', src)  # einingar sóttar með import(ROT("…")) – firebase.js, demo.js
    if "firebase.js" in L: L.append("firebase-config.js")  # firebase.js sækir ./firebase-config.js við hlið sér
    return sorted({x.split("?")[0] for x in L if not re.match(r"^(https?:|//|icons/|fonts/|lib/)", x) and x != "fyrirtaeki.js"})

def smida(m, src, ver=None):
    h = src
    def rep(a, b):
        nonlocal h
        assert h.count(a) == 1, f"{m}: fann ekki einu sinni: {a!r}"
        h = h.replace(a, b)
    rep('<!doctype html>', f'<!doctype html><!-- SJÁLFVIRKT BÚIÐ TIL úr ../app.html með tools/uppsetningar.py (uppsetning: {m}). Ekki breyta hér. -->')
    rep('<meta charset="utf-8">', '<meta charset="utf-8"><base href="../">')
    rep('<script src="fyrirtaeki.js"></script>', f'<script src="{m}/fyrirtaeki.js"></script>')
    rep('<link rel="manifest" href="manifest.webmanifest?v=3">', f'<link rel="manifest" href="{m}/manifest.webmanifest">')
    # App-tákn uppsetningarinnar (tools/takn.py; frá 2.39.0 vírrammi með hálftóni, ?v=2 svo tækin sæki nýja táknið)
    if os.path.exists(os.path.join(ROT, m, "apple-touch-icon.png")):
        rep('<link rel="icon" type="image/png" href="icons/atrium-icon-192.png">', f'<link rel="icon" type="image/png" href="{m}/icon-192.png?v=2">')
        rep('<link rel="apple-touch-icon" href="icons/atrium-apple-touch-icon.png">', f'<link rel="apple-touch-icon" href="{m}/apple-touch-icon.png?v=2">')
    if ver:  # fest útgáfa: kóðaskrár sóttar úr ut/<útgáfa>/ (fyrirtaeki.js, manifest, tákn og utlit.css áfram úr <m>/)
        for f in kodaskrar(src):
            h = h.replace(f'<script src="{f}"', f'<script src="ut/{ver}/{f}"').replace(f'<link rel="stylesheet" href="{f}"', f'<link rel="stylesheet" href="ut/{ver}/{f}"').replace(f'ROT("{f}")', f'ROT("ut/{ver}/{f}")')
        h = h.replace('(uppsetning: ' + m + ').', f'(uppsetning: {m}, fest útgáfa {ver} – ut/{ver}/app.html).', 1)
    if os.path.exists(os.path.join(ROT, m, "utlit.css")):
        rep('<link rel="stylesheet" href="brand.css">' if not ver else f'<link rel="stylesheet" href="ut/{ver}/brand.css">', (f'<link rel="stylesheet" href="brand.css">' if not ver else f'<link rel="stylesheet" href="ut/{ver}/brand.css">') + f'\n<link rel="stylesheet" href="{m}/utlit.css">')
    return h

def main():
    athuga = "--athuga" in sys.argv
    # Símaútlit I (2.46.0): tölvureglurnar afritaðar fyrir síma (simi-ui1.css) – alltaf í takt við app.css/brand.css
    if not athuga:
        import importlib.util
        sp = importlib.util.spec_from_file_location("simi_css", os.path.join(ROT, "tools", "simi_css.py")); mod = importlib.util.module_from_spec(sp); sp.loader.exec_module(mod); mod.main()
    src = open(os.path.join(ROT, "app.html"), encoding="utf-8").read()
    F = festar(); urelt = []
    for m in UPPSETNINGAR:
        for f in ("fyrirtaeki.js", "manifest.webmanifest"):
            assert os.path.exists(os.path.join(ROT, m, f)), f"{m}/{f} vantar"
        mid = json.load(open(os.path.join(ROT, m, "manifest.webmanifest"), encoding="utf-8")).get("id", "")
        assert mid.startswith("/") and mid.endswith(f"/{m}/"), f"{m}/manifest.webmanifest: id verður að vera full slóð sem endar á /{m}/ (er {mid!r})"
        ver = F.get(m)
        if ver:
            sp = os.path.join(ROT, "ut", ver, "app.html"); assert os.path.exists(sp), f"{m}: útgáfa {ver} er ekki til (ut/{ver}/app.html) – keyrðu tools/gefa-ut.py"
            msrc = open(sp, encoding="utf-8").read()
        else: msrc = src
        p = os.path.join(ROT, m, "index.html"); ny = smida(m, msrc, ver)
        gamalt = open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if gamalt != ny:
            urelt.append(m)
            if not athuga: open(p, "w", encoding="utf-8").write(ny)
    if athuga and urelt: sys.exit("Úrelt: " + ", ".join(f"{m}/index.html" for m in urelt) + " – keyrðu python3 tools/uppsetningar.py")
    print(("Úrelt: " if athuga else "Uppfært: ") + (", ".join(urelt) or "ekkert – allt í lagi"))
    if not athuga: print("Útgáfur: " + ", ".join(f"{m}={F.get(m) or 'nýjasta'}" for m in UPPSETNINGAR))

main()
