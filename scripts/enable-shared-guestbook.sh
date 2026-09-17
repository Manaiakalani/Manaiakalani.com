#!/usr/bin/env bash
# One-time: turn on the shared guestbook + visitor counter.
# Requires Azure CLI (`az login`) and a Storage account.
#
#   ./scripts/enable-shared-guestbook.sh <resource-group> <static-web-app-name> <storage-account>
#
set -euo pipefail
RG=${1:?resource group}
APP=${2:?static web app name}
STOR=${3:?storage account name}

echo "Reading connection string for $STOR …"
CS=$(az storage account show-connection-string --name "$STOR" --resource-group "$RG" --query connectionString -o tsv)

echo "Setting TABLES_CONNECTION_STRING on $APP …"
az staticwebapp appsettings set \
  --name "$APP" \
  --resource-group "$RG" \
  --setting-names "TABLES_CONNECTION_STRING=$CS"

echo "Done. After the next deploy:"
echo "  curl https://manaiakalani.com/api/guestbook"
echo "A configured book returns {\"entries\":[...]} without backend:\"unconfigured\"."
echo "The guestbook table is created automatically on first write."
