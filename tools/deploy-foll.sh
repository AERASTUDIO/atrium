#!/usr/bin/env bash
# Setur Cloud Functions upp í öllum uppsetningum (eða þeim sem eru nefndar) – keyrt í Cloud Shell:
#   cd ~/atrium/atrium && git pull && bash tools/deploy-foll.sh            # allar: dev aera sonik party
#   bash tools/deploy-foll.sh aera dev                                      # aðeins þessar
# Leyndarmál (Secret Manager) eru sett einu sinni á hvert verkefni, t.d.:
#   npx firebase-tools functions:secrets:set ANTHROPIC_API_KEY --project aera
# Hvaða föll fara upp ræðst af functions/.env.<firebase-verkefni> (t.d. CLAUDE=1, BOKHALD=payday).
set -e
cd "$(dirname "$0")/.."
(cd functions && npm install --silent)
LISTI=("$@"); [ ${#LISTI[@]} -eq 0 ] && LISTI=(dev aera sonik party)
for m in "${LISTI[@]}"; do
  echo "=== $m ==="
  npx firebase-tools deploy --only functions --project "$m" || echo "!!! Mistókst í $m – sjá villuna hér að ofan"
done
