#!/usr/bin/env bash
# Leyfir nýtt lén í öllum Firebase-verkefnum Atrium (keyrt í Cloud Shell):
#  1) bætir https://<lén>/* við vefslóðir sem API-lyklarnir mega koma frá (heldur öllu sem fyrir er, líka API-takmörkunum)
#  2) bætir léninu við „Authorized domains“ í Firebase Authentication
# Notkun: bash tools/leyfa_len.sh [lén]   (sjálfgefið atrium.aerastudio.is)
set -euo pipefail
LEN="${1:-atrium.aerastudio.is}"
T=$(gcloud auth print-access-token)
for P in atrium-499a2 aera-app-cfdb3 atrium-sonik atrium-party; do
  echo "== $P"
  H=(-H "Authorization: Bearer $T" -H "X-Goog-User-Project: $P" -H "Content-Type: application/json")
  # 1) API-lyklar með vefslóðatakmörkun
  curl -s "${H[@]}" "https://apikeys.googleapis.com/v2/projects/$P/locations/global/keys" | python3 -c '
import sys, json
for k in json.load(sys.stdin).get("keys", []):
    r = k.get("restrictions", {}).get("browserKeyRestrictions", {}).get("allowedReferrers")
    if r is not None: print(k["name"], k.get("displayName", ""), json.dumps(r), sep="\t")
' | while IFS=$'\t' read -r NAME DN REFS; do
    BODY=$(python3 -c 'import sys,json; r=json.loads(sys.argv[1]); n="https://"+sys.argv[2]+"/*"; print("" if n in r else json.dumps({"restrictions":{"browserKeyRestrictions":{"allowedReferrers":r+[n]}}}))' "$REFS" "$LEN")
    if [ -z "$BODY" ]; then echo "   lykill $DN: lénið var þegar leyft"; continue; fi
    curl -s -X PATCH "${H[@]}" "https://apikeys.googleapis.com/v2/$NAME?updateMask=restrictions.browserKeyRestrictions" -d "$BODY" >/dev/null && echo "   lykill $DN: $LEN bætt við"
  done
  # 2) Authorized domains í Firebase Authentication
  BODY=$(curl -s "${H[@]}" "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config" | python3 -c '
import sys, json; d = json.load(sys.stdin).get("authorizedDomains", []); n = sys.argv[1]
print("" if n in d else json.dumps({"authorizedDomains": d + [n]}))' "$LEN")
  if [ -z "$BODY" ]; then echo "   innskráning: lénið var þegar leyft"
  else curl -s -X PATCH "${H[@]}" "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=authorizedDomains" -d "$BODY" | grep -q "$LEN" && echo "   innskráning: $LEN bætt við"; fi
done
echo "Búið – breytingar á lyklum geta tekið allt að 5 mínútur að virka."
