#!/usr/bin/env python3
"""2.172.0 – Útlit U3 (hreinna útlit, samþykkt af Degi 27.11.2026). Keyrt EINU SINNI á CSS-skrárnar; geymt til skjölunar.

Breytingar á reglunum sjálfum (ekki nýtt lag ofan á):
 1. Punktar: blái punkturinn á undan spjaldfyrirsögnum og punktar í stöðu-/flokkamerkjum fjarlægðir.
 2. Smámerki: text-transform:uppercase → none, bil milli stafa 0, minnst 12 px.
 3. Horn: hnappar og reitir 10 px (--r-hn), stöðumerki og síur 6 px (--r-merki).
    Kringlótt áfram: talnamerki, framvindustikur, rofar, virkur liður í stiku, myndir af fólki.
 4. Fletir: spjöld 14 px (--r-kort), svífandi fletir 16 px (--r-svif), innri fletir 12 px;
    svífandi skuggi spjalda (--e1/--e2) verður fín lína. Stikan (.side) heldur sér.
 5. Hreyfing: engin innkoma spjalda við flipaskipti; hliðarspjald 260 ms með sterkri ease-out;
    hnappar þrýstast (scale .97) þegar ýtt er.
Eftir keyrslu, handvirkt í u2d.css: .vs3dot falinn (punktur sem sér element) og bil milli stafa í .sgrp (flokkaheiti í stiku) 0.
ATH: skriftan er ekki endurkeyranleg – hún gerir ráð fyrir CSS-inu eins og það var í 2.171.0.
"""
import os, re, sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLAR = ["app.css", "kerfi.css", "u2d.css", "brand.css", "fagun.css", "simi.css", "simi2.css", "simi-ui1.css", "simi/simi.css"]
JSCSS = ["dagteymi.js", "folk.js", "vett-ui.js"]   # CSS í JS-strengjum – aðeins smámerki
LAG = ["u2d.css", "fagun.css", "simi.css", "simi2.css", "simi/simi.css"]   # efsta lagið – þar ræðst útlitið
RULE = re.compile(r'([^{}@;][^{}]*)\{([^{}]*)\}')
log = []

def sub_rules(s, fn):
    def rep(m):
        sel, d = m.group(1), m.group(2)
        nd = fn(sel.split("*/")[-1], d)
        return m.group(0) if nd is None or nd == d else sel + "{" + nd + "}"
    return RULE.sub(rep, s)

# ---------- 1. Punktar ----------
DOTS = [  # (skrá, brot úr veljara) – aðeins skraut, ekki stöðuvísar (núna-lína .dwnow og klukka í gangi .sx-k halda sér)
    ("u2d.css", ".uhch h3::before"), ("u2d.css", ".u2pst::before"), ("u2d.css", ".u2tbh::before"), ("u2d.css", ".fk-sec > h4::before"),
    ("kerfi.css", ":is(.upill,.pill,.dbadge)::before"), ("fagun.css", ".upill::before"),
]
def punktar(f, s):
    for ff, frag in DOTS:
        if ff != f: continue
        def fn(sel, d, frag=frag):
            if frag in sel and "content" in d: log.append(f"punktur {f}: {sel.strip()[-60:]}"); return "content:none!important;display:none!important"
        s = sub_rules(s, fn)
    return s

# ---------- 2. Smámerki ----------
def smamerki(f, s):
    def fn(sel, d):
        if not re.search(r"text-transform:\s*uppercase", d): return None
        if "#login" in sel or ".abrand" in sel: return None   # merki á innskráningu haldast
        d = re.sub(r"text-transform:\s*uppercase", "text-transform:none", d)
        d = re.sub(r"letter-spacing:\s*[^;!}]+", "letter-spacing:0", d)
        def fs(m):
            v = float(m.group(1)); return f"font-size:{max(v, 12):g}px"
        d = re.sub(r"font-size:\s*([0-9.]+)px", fs, d)
        log.append(f"smámerki {f}: {sel.strip()[-60:]}")
        return d
    return sub_rules(s, fn)

# ---------- 3./4. Horn og fletir ----------
HALDA = re.compile(r"\.side\b(?!.*\.btn)|\.abrand|\.tbid|\.ucnt|ymeter|vlbar|smtrack|\.ybt\b|\bi\b\s*$|::before|::after|idsw|#syncfl|\.bph b|\.vs3nx \.vs3k em|\.uhch h3 :is")
MERKI = re.compile(r"upill|\.pill\b|dbadge|\.badge\b|u2pst|\.uchip|\.chip\b|dchip|sdchip|\.vs3p\b|\.vs3b\b|\.u2pjs\b(?! button)|\.ustleid|\.lrow\.fl")
SVIF = re.compile(r"#sheet|\.sheet\b|\.spurn\b|\.adrw\b(?! \.)|\.spdet\b|\.spdrop|\.u2pop|\.u2bpop")
def horn(f, s):
    def fn(sel, d):
        if "border-radius" not in d: return None
        o = d
        sel_s = sel.strip()
        # pillur
        if re.search(r"border-radius:\s*(999|99|100)px", d) and not HALDA.search(sel_s) and not re.search(r"\.side nav#sitems \.tab$", sel_s):
            v = "var(--r-merki)" if MERKI.search(sel_s) else "var(--r-hn)"
            d = re.sub(r"border-radius:\s*(999|99|100)px", "border-radius:" + v, d)
        # stórir fletir
        if f in LAG and not re.search(r"\.side\b|\.abrand", sel_s):
            v = "var(--r-svif)" if SVIF.search(sel_s) else "var(--r-kort)"
            d = re.sub(r"border-radius:\s*(28|26|24|22)px(?=[;!}\s]|$)", "border-radius:" + v, d)
            d = re.sub(r"border-radius:\s*(20|18)px(?=[;!}\s]|$)", "border-radius:var(--r-innri)", d)
        if d != o: log.append(f"horn {f}: {sel_s[-60:]}")
        return d
    return sub_rules(s, fn)

TOKENS_LJOS = "--r-kort:14px; --r-svif:16px; --r-innri:12px; --r-hn:10px; --r-merki:6px;\n  --e1:0 0 0 1px var(--line); --e2:0 0 0 1px var(--line2),0 2px 6px -2px rgba(15,23,32,.08);"
TOKENS_DOKK = "--r-kort:14px; --r-svif:16px; --r-innri:12px; --r-hn:10px; --r-merki:6px;\n  --e1:0 0 0 1px var(--line); --e2:0 0 0 1px var(--line2),0 2px 6px -2px rgba(0,0,0,.4);"

def u2d_extra(s):
    # Fínar línur í stað svífandi skugga (--e1/--e2), og horntákn
    a = "--e1:0 2px 4px rgba(15,23,32,.03),0 18px 40px -20px rgba(15,23,32,.22); --e2:0 2px 4px rgba(15,23,32,.04),0 22px 44px -18px rgba(15,23,32,.28);"
    b = "--e1:inset 0 0 0 1px rgba(255,255,255,.04),0 16px 32px -18px rgba(0,0,0,.6); --e2:inset 0 0 0 1px rgba(255,255,255,.06),0 20px 40px -18px rgba(0,0,0,.7);"
    assert a in s and b in s
    s = s.replace(a, "/* U3 (2.172.0): fín lína í stað svífandi skugga; horn */ " + TOKENS_LJOS).replace(b, "/* U3 */ " + TOKENS_DOKK)
    s = s.replace("/* ---------- Spjöld: 26 px horn, svífandi skuggi í stað rammalína ---------- */", "/* ---------- Spjöld (U3, 2.172.0): 14 px horn, fín lína – svífandi skuggi aðeins á því sem svífur ---------- */")
    s = s.replace("/* ---------- Hnappar: pillur, aðalhnappur grafít ---------- */", "/* ---------- Hnappar (U3, 2.172.0): 10 px horn, aðalhnappur grafít án skugga, þrýstast þegar ýtt er ---------- */")
    # aðalhnappur án skugga
    s = s.replace("color:var(--on-gra)!important;border-color:transparent!important;box-shadow:0 6px 14px -8px rgba(42,52,65,.7)!important", "color:var(--on-gra)!important;border-color:transparent!important;box-shadow:none!important")
    # 5. Hreyfing: engin innkoma spjalda
    s = s.replace("/* ---------- Hreyfing: spjöld svífa inn ---------- */", "/* ---------- Hreyfing (U3, 2.172.0): spjöld svífa EKKI inn – flipaskipti eru tugir á dag. Flipinn dofnar inn (u2fade .18s) ---------- */")
    s = s.replace("html:root body.kerfi #view :is(.ucard,.ukp,.uhtop > div > .card,.uh3 > *){animation:u2up .44s cubic-bezier(.2,0,0,1) both}", "html:root body.kerfi #view :is(.ucard,.ukp,.uhtop > div > .card,.uh3 > *){animation:none}")
    # Hliðarspjald: 260 ms, sterk ease-out
    s = re.sub(r"(\.adrw\{[^}]*animation:u2drw )\.36s[^;}]*", r"\1.26s cubic-bezier(.23,1,.32,1) both", s, count=1)
    # Hnappar þrýstast
    s += """
/* ---------- U3 (2.172.0): hnappar svara strax þegar ýtt er ---------- */
@media (prefers-reduced-motion:no-preference){
  html:not(#u3a):not(#u3b) body.kerfi :is(.btn,.chipbtn,.uchip,.seg button,.hdtabs button,.u2bell,.sqrow .btn){transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .15s ease,color .15s ease}
  html:not(#u3a):not(#u3b) body.kerfi :is(.btn,.chipbtn,.uchip,.seg button,.hdtabs button,.u2bell,.sqrow .btn):active:not(:disabled){transform:scale(.97)}
}
/* U3: bjallan svífur ekki yfir opnu hliðarspjaldi – hún fær sitt pláss og spjaldið víkur */
@media (min-width:1024px){
  html:not(#u3a):not(#u3b) body.kerfi.pv.ui1.hassplit #view .split:not(.nodet) .spdet{margin-right:60px!important}
}
"""
    return s

def main():
    for f in ALLAR:
        p = os.path.join(ROT, f); s = open(p, encoding="utf-8").read(); o = s
        s = punktar(f, s); s = smamerki(f, s); s = horn(f, s)
        if f == "u2d.css": s = u2d_extra(s)
        if s != o: open(p, "w", encoding="utf-8").write(s)
    for f in JSCSS:
        p = os.path.join(ROT, f); s = open(p, encoding="utf-8").read(); n = smamerki(f, s)
        if n != s: open(p, "w", encoding="utf-8").write(n)
    print("\n".join(log) if "-v" in sys.argv else f"{len(log)} reglum breytt")

if __name__ == "__main__":
    main()
