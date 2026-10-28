#!/usr/bin/env bash
# Leyfir nýtt lén í öllum Firebase-verkefnum Atrium – keyrt í Cloud Shell (innskráð/ur sem eigandi verkefnanna):
#  1) API-lyklar með vefslóðatakmörkun fá https://<lén> og https://<lén>/* (allt annað helst, líka API-takmarkanir)
#     – Firebase-innskráning sendir aðeins upprunann (https://<lén>) sem referer, svo /* dugar ekki eitt og sér
#  2) lénið fer í „Authorized domains“ í Firebase Authentication
# Kveikir á API Keys API í verkefninu ef þarf. Sýnir hvern lykil og allar villur.
# Notkun: bash tools/leyfa_len.sh [lén] [verkefni …]   (sjálfgefið atrium.aerastudio.is og öll fjögur verkefnin)
set -uo pipefail
LEN="${1:-atrium.aerastudio.is}"; shift || true
PROJ=("$@"); [ ${#PROJ[@]} -eq 0 ] && PROJ=(atrium-499a2 aera-app-cfdb3 atrium-sonik atrium-party)
NY=("https://$LEN" "https://$LEN/*")
T=$(gcloud auth print-access-token) || { echo "Ekki innskráð/ur í gcloud"; exit 1; }
for P in "${PROJ[@]}"; do
  echo "== $P"
  gcloud services enable apikeys.googleapis.com --project="$P" --quiet >/dev/null 2>&1 || echo "   (gat ekki kveikt á API Keys API – reyni samt)"
  # 1) API-lyklar
  KEYS=$(gcloud services api-keys list --project="$P" --format=json 2>&1) || { echo "   API-lyklar: VILLA – $KEYS"; KEYS="[]"; }
  echo "$KEYS" | python3 -c '
import sys, json
for k in json.load(sys.stdin):
    r = (k.get("restrictions") or {}).get("browserKeyRestrictions", {}).get("allowedReferrers")
    print(k["name"], k.get("displayName") or "(nafnlaus)", json.dumps(r), sep="\t")' | while IFS=$'\t' read -r NAME DN REFS; do
    if [ "$REFS" = "null" ]; then echo "   lykill $DN: engin vefslóðatakmörkun – ekkert að gera"; continue; fi
    NEW=$(python3 -c '
import sys, json
r = json.loads(sys.argv[1]); add = [x for x in sys.argv[2:] if x not in r]
print(",".join(r + add) if add else "")' "$REFS" "${NY[@]}")
    if [ -z "$NEW" ]; then echo "   lykill $DN: lénið var þegar leyft"; continue; fi
    if OUT=$(gcloud services api-keys update "$NAME" --allowed-referrers="$NEW" --quiet 2>&1); then echo "   lykill $DN: $LEN bætt við"
    else echo "   lykill $DN: VILLA – $OUT"; fi
  done
  # 2) Authorized domains í Firebase Authentication
  H=(-H "Authorization: Bearer $T" -H "X-Goog-User-Project: $P" -H "Content-Type: application/json")
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
