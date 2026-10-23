#!/usr/bin/env python3
"""Býr til simi-ui1.css (2.46.0): tölvuútlitið (Útlit I) fyrir símaútlit I (ORG.simi === "I").
Allar reglur í @media (min-width:1024px)-blokkum app.css og brand.css eru afritaðar, settar undir body.simi1
og pakkaðar í @media (max-width:1023px). Þannig notar síminn nákvæmlega sama útlit og tölvan og fylgir henni sjálfkrafa;
simi.css (handskrifað, hlaðið á eftir) lagar svo uppröðunina að mjóum skjá (stikan sem skúffa, listi og spjald hvort á eftir öðru …).
Keyrt sjálfkrafa af tools/uppsetningar.py – ekki breyta simi-ui1.css beint."""
import os, re
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ["app.css", "brand.css"]

def blocks(css):
    """Skilar (skilyrði, innihald) fyrir hverja @media-blokk á efsta stigi."""
    i, out = 0, []
    while True:
        m = re.compile(r"@media\s*([^{]+)\{").search(css, i)
        if not m: return out
        d, j = 1, m.end()
        while d and j < len(css):
            c = css[j]
            if c == "{": d += 1
            elif c == "}": d -= 1
            j += 1
        out.append((m.group(1).strip(), css[m.end():j - 1])); i = j

def split_sel(s):
    parts, d, cur = [], 0, ""
    for c in s:
        if c in "([": d += 1
        elif c in ")]": d -= 1
        if c == "," and d == 0: parts.append(cur); cur = ""
        else: cur += c
    parts.append(cur); return [p.strip() for p in parts if p.strip()]

def scope(sel):
    out = []
    for p in split_sel(sel):
        if p.startswith("body"): out.append("body.simi1" + p[4:])
        elif p.startswith((":root", "html")): out.append(p)  # þemabreytur eru óháðar breidd
        else: out.append("body.simi1 " + p)
    return ",".join(out)

def rules(body):
    """Fer í gegnum reglur (líka hreiðraðar @media) og setur body.simi1 á alla veljara."""
    i, out = 0, ""
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    while i < len(body):
        j = body.find("{", i)
        if j < 0: break
        head = body[i:j].strip()
        d, k = 1, j + 1
        while d and k < len(body):
            if body[k] == "{": d += 1
            elif body[k] == "}": d -= 1
            k += 1
        inner = body[j + 1:k - 1]
        if head.startswith("@media"): out += head + "{" + rules(inner) + "}\n"
        elif head.startswith("@"): out += head + "{" + inner + "}\n"
        elif head: out += scope(head) + "{" + inner.strip() + "}\n"
        i = k
    return out

def main():
    res = ["/* SJÁLFVIRKT BÚIÐ TIL með tools/simi_css.py úr app.css og brand.css – ekki breyta hér. Tölvuútlitið (≥1024 px) fyrir símaútlit I. */",
           "@media (max-width:1023px){"]
    for f in SRC:
        css = open(os.path.join(ROT, f), encoding="utf-8").read()
        for cond, body in blocks(css):
            c = cond.replace(" ", "")
            if "(min-width:1024px)" not in c: continue
            extra = re.sub(r"\(min-width:1024px\)", "", cond).strip()
            extra = re.sub(r"^and\s*", "", extra).strip()
            r = rules(body)
            if not r.strip(): continue
            res.append(f"/* {f}: @media {cond} */")
            res.append(f"@media {extra}{{{r}}}" if extra else r)
    res.append("}")
    out = "\n".join(res) + "\n"
    p = os.path.join(ROT, "simi-ui1.css")
    old = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    if old != out: open(p, "w", encoding="utf-8").write(out); print("simi-ui1.css uppfært", len(out), "bæti")
    else: print("simi-ui1.css óbreytt")

if __name__ == "__main__": main()
