#!/usr/bin/env python3
"""CSS-tiltekt, áfangi 1 (2.175.1): fjarlægir reglur sem vísa í klasa/auðkenni sem koma hvergi fyrir í JS/HTML.
Klasi telst lifandi ef hann kemur fyrir sem texti, eða ef byrjun hans er notuð með ${…} eða "+" (t.d. sh${n}, \"st-\"+k).
Notkun: python3 tools/css-daudar.py [--v] [--apply]. Alltaf bera saman skjáskot fyrir/eftir."""
import re, os, glob, sys
ROT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=["app.css","brand.css","kerfi.css","u2d.css","fagun.css","simi.css","simi2.css","simi/simi.css"]
corpus=""
for f in glob.glob(ROT+"/**/*.js",recursive=True)+glob.glob(ROT+"/**/*.html",recursive=True):
    if "/ut/" in f or "node_modules" in f or "/functions/" in f: continue
    corpus+=open(f,encoding="utf-8",errors="ignore").read()+"\n"
CL_ALIVE={}
def alive(tok):
    if tok in CL_ALIVE: return CL_ALIVE[tok]
    ok = tok in corpus
    if not ok and "-" in tok:
        parts=tok.split("-")
        for i in range(len(parts)-1,0,-1):
            pre="-".join(parts[:i])+"-"
            if re.search(r"[\"'`\s]"+re.escape(pre)+r"(\$\{|[\"'`]\s*\+)", corpus): ok=True; break
    if not ok:
        for k in range(1,4):
            st=tok[:-k]
            if len(st)>=2 and (st+"${" in corpus or re.search(r"[\"'`]"+re.escape(st)+r"[\"'`]\s*\+",corpus)): ok=True; break
    CL_ALIVE[tok]=ok; return ok
def strip_parens(s):
    out=""; d=0
    for ch in s:
        if ch=="(": d+=1; continue
        if ch==")": d-=1; continue
        if d==0: out+=ch
    return out
def split_top(sel):
    items=[]; d=0; cur=""
    for ch in sel:
        if ch in "([": d+=1
        if ch in ")]": d-=1
        if ch=="," and d==0: items.append(cur); cur=""
        else: cur+=ch
    items.append(cur); return items
def dead_item(it):
    s=re.sub(r"\[[^\]]*\]","",strip_parens(it))
    toks=re.findall(r"\.(-?[_a-zA-Z][\w-]*)",s)+re.findall(r"#([_a-zA-Z][\w-]*)",s)
    return [t for t in toks if not alive(t)]
RULE=re.compile(r'([^{}@;][^{}]*)\{([^{}]*)\}')
def process(f, apply=False):
    p=os.path.join(ROT,f); s=open(p,encoding="utf-8").read(); stats=[0,0,0]
    def rep(m):
        raw=m.group(1); lead=raw[:len(raw)-len(raw.lstrip())]; body=raw.strip()
        cmt=""
        if "*/" in body: i=body.rfind("*/")+2; cmt=body[:i]; body=body[i:]; lead2=body[:len(body)-len(body.lstrip())]; body=body.strip(); cmt=cmt+lead2
        if body.startswith(("from","to")) or re.match(r"^[\d.%,\s]+$",body): return m.group(0)
        items=split_top(body); keep=[it for it in items if not dead_item(it)]
        stats[0]+=1
        if len(keep)==len(items): return m.group(0)
        if not keep: stats[1]+=1; return lead+cmt if apply else m.group(0)
        stats[2]+=1
        return (lead+cmt+",".join(x.strip() if i else x.strip() for i,x in enumerate(keep))+"{"+m.group(2)+"}") if apply else m.group(0)
    n=RULE.sub(rep,s)
    if apply and n!=s: open(p,"w",encoding="utf-8").write(n)
    return stats, len(s), len(n)
apply="--apply" in sys.argv
tot=[0,0,0]
for f in SRC:
    st,a,b=process(f,apply); tot=[x+y for x,y in zip(tot,st)]
    print(f.ljust(16), "reglur",st[0],"dauðar",st[1],"styttar",st[2], f"{a//1024}KB→{b//1024}KB" if apply else "")
print("ALLS",tot)
if "--v" in sys.argv:
    dd=sorted(t for t,v in CL_ALIVE.items() if not v); print(len(dd),"dauðir klasar:", " ".join(dd[:200]))
