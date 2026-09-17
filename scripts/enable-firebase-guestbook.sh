#!/usr/bin/env bash
# Point the Static Web App at a Firebase service account.
#
#   ./scripts/enable-firebase-guestbook.sh <resource-group> <static-web-app-name> <service-account.json>
#
set -euo pipefail
RG=${1:?resource group}
APP=${2:?static web app name}
JSON=${3:?path to Firebase service-account JSON}

if [[ ! -f "$JSON" ]]; then
  echo "missing file: $JSON" >&2
  exit 1
fi

python3 - "$JSON" <<'PY'
import json, sys
p = sys.argv[1]
with open(p) as f:
    data = json.load(f)
for k in ("project_id", "client_email", "private_key"):
    if k not in data:
        raise SystemExit("service account JSON is missing " + k)
print("service account for project", data["project_id"], "ok")
PY

echo "Setting FIREBASE_SERVICE_ACCOUNT on $APP …"
az staticwebapp appsettings set \
  --name "$APP" \
  --resource-group "$RG" \
  --setting-names "FIREBASE_SERVICE_ACCOUNT=$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))' "$JSON")"

echo "Done. After the next deploy:"
echo "  curl https://manaiakalani.com/api/guestbook"
echo "A configured book returns {\"entries\":[...]} without backend:\"unconfigured\"."
