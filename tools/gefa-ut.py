#!/usr/bin/env python3
"""2.168.0 – Gefa út: festir uppsetningar við útgáfu af kóðanum.

Dev keyrir alltaf nýjasta kóðann (rótin). AERA, Sonik, party.is og demo fá nýja útgáfu AÐEINS þegar þetta er keyrt:

  python3 tools/gefa-ut.py aera sonik party demo   # afritar núverandi kóða í ut/<APP_VERSION>/ og festir þessar uppsetningar við hann
  python3 tools/gefa-ut.py aera                    # aðeins AERA
  python3 tools/gefa-ut.py --aftur 2.167.1 aera    # færir AERA aftur á eldri útgáfu (sem er enn til í ut/)
  python3 tools/gefa-ut.py --stada                 # sýnir hvaða útgáfu hver uppsetning notar

Síðan: python3 tools/uppsetningar.py er keyrt sjálfkrafa. Útgáfur sem engin uppsetning notar lengur eru fjarlægðar úr ut/
(nema sú næstnýjasta, til að geta farið til baka). Letur, lib/, icons/ og pontun/ eru sameiginleg og ekki afrituð."""
import json, os, re, shutil, subprocess, sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEST = ["aera", "sonik", "party", "demo"]
UF = os.path.join(ROT, "utgafa.json")

def lesa(): return json.load(open(UF, encoding="utf-8")) if os.path.exists(UF) else {}
def vista(d): open(UF, "w", encoding="utf-8").write(json.dumps(dict(sorted(d.items())), ensure_ascii=False, indent=2) + "\n")
def ver_rot():
    m = re.search(r'APP_VERSION="([\d.]+)"', open(os.path.join(ROT, "app.html"), encoding="utf-8").read()); return m.group(1)

def main():
    a = sys.argv[1:]; d = lesa()
    if not a or "--stada" in a:
        print("Nýjasta (dev):", ver_rot()); [print(f"  {m}: {d.get(m, 'nýjasta')}") for m in FEST]; return
    if a[0] == "--aftur":
        ver, ms = a[1], a[2:]
        assert os.path.exists(os.path.join(ROT, "ut", ver, "app.html")), f"ut/{ver} er ekki til"
    else:
        ver, ms = ver_rot(), a
        sys.path.insert(0, os.path.join(ROT, "tools"))
        src = open(os.path.join(ROT, "app.html"), encoding="utf-8").read()
        import importlib.util
        sp = importlib.util.spec_from_file_location("upps", os.path.join(ROT, "tools", "uppsetningar.py"))
        txt = open(os.path.join(ROT, "tools", "uppsetningar.py"), encoding="utf-8").read()
        ns = {"__file__": os.path.join(ROT, "tools", "uppsetningar.py")}; exec(txt.split("def smida(")[0], ns)  # kodaskrar() án þess að keyra main()
        dest = os.path.join(ROT, "ut", ver)
        if os.path.exists(dest): shutil.rmtree(dest)
        os.makedirs(dest)
        for f in ns["kodaskrar"](src) + ["app.html"]:
            os.makedirs(os.path.dirname(os.path.join(dest, f)), exist_ok=True); shutil.copy2(os.path.join(ROT, f), os.path.join(dest, f))
        print(f"Afritað í ut/{ver}/ ({len(os.listdir(dest))} skrár/möppur)")
    bad = [m for m in ms if m not in FEST]; assert not bad, f"Óþekkt uppsetning: {bad} (dev fylgir alltaf nýjasta)"
    for m in ms: d[m] = ver
    vista(d)
    # hreinsa útgáfur sem enginn notar (halda þeirri næstnýjustu)
    notaðar = set(d.values()); allar = sorted(os.listdir(os.path.join(ROT, "ut")), key=lambda v: [int(x) for x in v.split(".")]) if os.path.exists(os.path.join(ROT, "ut")) else []
    halda = notaðar | set(allar[-2:])
    for v in allar:
        if v not in halda: shutil.rmtree(os.path.join(ROT, "ut", v)); print("Fjarlægði ut/" + v)
    subprocess.run([sys.executable, os.path.join(ROT, "tools", "uppsetningar.py")], check=True)

main()
