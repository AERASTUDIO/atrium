#!/usr/bin/env python3
"""CSS-tiltekt, áfangi 2 (2.176.1): fjarlægir yfirskrifaðar yfirlýsingar – sannanlega án áhrifa, óháð gögnum.

Yfirlýsing (t.d. `color:red`) er dauð ef SÍÐAR í sömu skrá kemur regla með NÁKVÆMLEGA sama veljara, í sama
media/supports/container-samhengi, sem setur sama eiginleika (og er !important ef hin var það). Sami veljari = sami
styrkur, svo röðin ræður og sú fyrri hefur aldrei áhrif. Regla sem verður tóm fer líka.

Ekki snert (gætu verið varaleiðir fyrir eldri vafra): forskeyti (-webkit-, -moz-), dvh/svh/lvh, env(), color-mix(),
oklch(), clamp()/min()/max(), :has og tvítekning innan sömu reglu. @keyframes er sleppt.
Notkun: python3 tools/css-yfirskrifad.py [--v] [--apply] [skrár…]. Alltaf bera saman skjáskot fyrir/eftir."""
import os, re, sys
import tinycss2

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKRAR = ["app.css", "kerfi.css", "brand.css", "u2d.css", "fagun.css", "simi.css", "simi2.css", "simi-ui1.css", "qr.css", "simi/simi.css"]
VARA = re.compile(r"-webkit-|-moz-|-ms-|dvh|svh|lvh|env\(|color-mix|oklch|oklab|\blch\(|\blab\(|light-dark|clamp\(|\bmin\(|\bmax\(|round\(|:has|@container|cqi|cqw", re.I)


def norm(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S).replace("'", '"')
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*([>+~,])\s*", r"\1", s)      # bil á eftir ) skiptir máli (afkomandi) – það helst
    return re.sub(r"\(\s+", "(", re.sub(r"\s+\)", ")", s))


def offs(text):
    L = [0]
    for i, ch in enumerate(text):
        if ch == "\n": L.append(i + 1)
    return L


def decl_end(t, i):
    """frá upphafi yfirlýsingar: finnur endann (á eftir ; eða rétt á undan })"""
    d = 0; q = None
    while i < len(t):
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif t.startswith("/*", i):
            j = t.find("*/", i + 2); i = j + 2; continue
        elif c in "\"'": q = c
        elif c in "([": d += 1
        elif c in ")]": d -= 1
        elif c == ";" and d == 0: return i + 1
        elif c == "}" and d == 0: return i
        i += 1
    return i


def greina(text):
    """skilar lista af (upphaf, endi, lýsing) fyrir dauðar yfirlýsingar"""
    L = offs(text)
    pos = lambda n: L[n.source_line - 1] + n.source_column - 1
    reglur = []  # (samhengi, veljari, [(nafn, important, upphaf, endi, gildi)])

    def ganga(nodes, ctx):
        for n in nodes:
            if n.type == "qualified-rule":
                sel = norm(tinycss2.serialize(n.prelude))
                D = []
                for dcl in tinycss2.parse_blocks_contents(n.content, skip_comments=True, skip_whitespace=True):
                    if dcl.type != "declaration": continue
                    a = pos(dcl); b = decl_end(text, a)
                    D.append((dcl.lower_name, dcl.important, a, b, tinycss2.serialize(dcl.value)))
                reglur.append((ctx, sel, D, n))
            elif n.type == "at-rule" and n.content is not None and n.lower_at_keyword in ("media", "supports", "container"):
                inner = tinycss2.parse_rule_list(n.content, skip_comments=True, skip_whitespace=True)
                ganga(inner, ctx + "@" + n.lower_at_keyword + " " + norm(tinycss2.serialize(n.prelude)) + "|")

    ganga(tinycss2.parse_stylesheet(text, skip_comments=True, skip_whitespace=True), "")
    dautt = []
    for i, (ctx, sel, D, _) in enumerate(reglur):
        if VARA.search(sel): continue
        sidar = {}  # eiginleiki -> besta important síðar
        for ctx2, sel2, D2, _ in reglur[i + 1:]:
            if ctx2 == ctx and sel2 == sel:
                for nm, imp, _a, _b, v2 in D2:
                    if VARA.search(v2): sidar[nm] = None          # síðara gildið gæti verið hafnað í eldri vafra → fyrra er varaleið
                    elif sidar.get(nm, 0) is not None: sidar[nm] = sidar.get(nm, False) or imp
        if not sidar: continue
        nofn = [x[0] for x in D]; her = []
        for nm, imp, a, b, val in D:
            if nofn.count(nm) > 1 or VARA.search(val) or VARA.search(nm): continue
            if nm in sidar and sidar[nm] is not None and (sidar[nm] or not imp):
                her.append((a, b, f"{ctx}{sel} {{ {nm}:{val.strip()[:40]} }}"))
        if her and len(her) == len(D):   # öll reglan dauð → fjarlægð í heild (nákvæm staðsetning, ekki regex)
            a = pos(reglur[i][3]); b = regluendi(text, a)
            dautt.append((a, b, f"{ctx}{sel} {{ – öll reglan – }}", len(her)))
        else:
            dautt += [x + (1,) for x in her]
    return dautt


def regluendi(t, i):
    """frá upphafi veljara: endar á eftir lokasviganum } sem passar við fyrsta { (sleppir athugasemdum og strengjum)"""
    d = 0; q = None
    while i < len(t):
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif t.startswith("/*", i):
            i = t.find("*/", i + 2) + 2; continue
        elif c in "\"'": q = c
        elif c == "{": d += 1
        elif c == "}":
            d -= 1
            if d == 0: return i + 1
        i += 1
    raise ValueError("enginn lokasvigi")


def beita(text, dautt):
    for a, b, *_r in sorted(dautt, reverse=True):
        text = text[:a] + text[b:]
    # media-hólf sem urðu tóm
    for _ in range(2):
        text = re.sub(r"(^|[;}\n])[ \t]*@(media|supports|container)[^{};/]*\{\s*\}", r"\1", text)
    return text


if __name__ == "__main__":
    skrar = [a for a in sys.argv[1:] if not a.startswith("--")] or SKRAR
    alls = 0
    for f in skrar:
        p = os.path.join(ROT, f)
        if not os.path.exists(p): continue
        t = open(p, encoding="utf-8").read(); d = greina(t); n = sum(x[3] for x in d); alls += n
        print(f"{f:15} {n} yfirskrifaðar yfirlýsingar ({sum(1 for x in d if 'öll reglan' in x[2])} heilar reglur)")
        if "--v" in sys.argv:
            for x in d[:25]: print("   ", x[2][:140])
        if "--apply" in sys.argv and d:
            open(p, "w", encoding="utf-8").write(beita(t, d))
    print("alls", alls)
