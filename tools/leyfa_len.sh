#!/usr/bin/env bash
# Leyfir nýtt lén í öllum Firebase-verkefnum Atrium (keyrt í Cloud Shell):
#  1) bætir https://<lén>/* og https://<lén> við vefslóðir sem API-lyklarnir mega koma frá (heldur öllu sem fyrir er, líka API-takmörkunum)
#     – Firebase-innskráning sendir aðeins upprunann (https://<lén>) sem referer, svo /* dugar ekki eitt og sér
#  2) bætir léninu við „Authorized domains“ í Firebase Authentication
# Sýnir hvern lykil og villur frá Google svo ekkert fari framhjá.
# Notkun: bash tools/leyfa_len.sh [lén]   (sjálfgefið atrium.aerastudio.is)
set -uo pipefail
LEN="${1:-atrium.aerastudio.is}"
T=$(gcloud auth print-access-token)
for P in atrium-499a2 aera-app-cfdb3 atrium-sonik atrium-party; do
  echo "== $P"
  H=(-H "Authorization: Bearer $T" -H "X-Goog-User-Project: $P" -H "Content-Type: application/json")
  # 1) API-lyklar með vefslóðatakmörkun
  curl -s "${H[@]}" "https://apikeys.googleapis.com/v2/projects/$P/locations/global/keys" | python3 -c '
import sys, json
d = json.load(sys.stdin)
if "error" in d: print("VILLA", d["error"].get("message", ""), "", sep="\t"); sys.exit()
ks = d.get("keys", [])
if not ks: print("ENGIR", "", "", sep="\t")
for k in ks:
    r = k.get("restrictions", {}).get("browserKeyRestrictions", {}).get("allowedReferrers")
    print(k["name"], k.get("displayName", ""), json.dumps(r), sep="\t")
' | while IFS=$'\t' read -r NAME DN REFS; do
    if [ "$NAME" = "VILLA" ]; then echo "   API-lyklar: villa frá Google – $DN"; continue; fi
    if [ "$NAME" = "ENGIR" ]; then echo "   API-lyklar: engir lyklar fundust"; continue; fi
    if [ "$REFS" = "null" ]; then echo "   lykill $DN: engin vefslóðatakmörkun – ekkert að gera"; continue; fi
    BODY=$(python3 -c '
import sys, json
r = json.loads(sys.argv[1]); L = sys.argv[2]; add = [x for x in ("https://"+L+"/*", "https://"+L) if x not in r]
print(json.dumps({"restrictions": {"browserKeyRestrictions": {"allowedReferrers": r + add}}}) if add else "")' "$REFS" "$LEN")
    if [ -z "$BODY" ]; then echo "   lykill $DN: lénið var þegar leyft"; continue; fi
    OUT=$(curl -s -X PATCH "${H[@]}" "https://apikeys.googleapis.com/v2/$NAME?updateMask=restrictions.browserKeyRestrictions" -d "$BODY")
    if echo "$OUT" | grep -q '"error"'; then echo "   lykill $DN: VILLA – $(echo "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["error"].get("message",""))')"
    else echo "   lykill $DN: $LEN bætt við"; fi
  done
  # 2) Authorized domains í Firebase Authentication
  CFG=$(curl -s "${H[@]}" "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config")
  BODY=$(echo "$CFG" | python3 -c '
import sys, json; j = json.load(sys.stdin)
if "error" in j: print("VILLA " + j["error"].get("message", "")); sys.exit()
d = j.get("authorizedDomains", []); n = sys.argv[1]
print("" if n in d else json.dumps({"authorizedDomains": d + [n]}))' "$LEN")
  if [ -z "$BODY" ]; then echo "   innskráning: lénið var þegar leyft"
  elif [[ "$BODY" == VILLA* ]]; then echo "   innskráning: $BODY"
  else curl -s -X PATCH "${H[@]}" "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=authorizedDomains" -d "$BODY" | grep -q "$LEN" && echo "   innskráning: $LEN bætt við" || echo "   innskráning: VILLA við að bæta léninu við"; fi
done
echo "Búið – breytingar á lyklum geta tekið allt að 5 mínútur að virka."
