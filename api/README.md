# Shared guestbook API

An [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/) managed function
that turns the site's retro guestbook into a **shared** one, backed by
[Azure Table Storage](https://learn.microsoft.com/azure/storage/tables/).

It is optional. Until you complete the one-time setup below, the site's
guestbook works exactly as before, storing signatures in each visitor's
`localStorage`. The client is API-first with a localStorage fallback, so a
missing, unconfigured, or failing backend never breaks the guestbook.

## Endpoint

`GET|POST /api/guestbook`

| Method | Body | Response |
| --- | --- | --- |
| `GET`  | — | `{ "entries": [{ "name", "message", "date" }, …] }` newest-first |
| `POST` | `{ "name", "message" }` | `{ "entries": [ … ] }` with the new signature prepended |

All input is sanitized and length-capped server-side (`name` ≤ 40,
`message` ≤ 200, ≤ 100 entries returned). See `src/lib/guestbook-core.js`.

## One-time Azure setup (to activate shared mode)

You need an Azure Storage account and one app setting. The Function and the
`api_location: "api"` wiring are already in the repo, so once the app setting
exists the shared guestbook is live on the next deploy.

1. **Create a Storage account** (or reuse one), then copy its connection string:
   ```bash
   az storage account create \
     --name <storageaccount> \
     --resource-group <your-rg> \
     --location <region> \
     --sku Standard_LRS

   az storage account show-connection-string \
     --name <storageaccount> \
     --resource-group <your-rg> \
     --query connectionString -o tsv
   ```

2. **Add it to the Static Web App** as the `TABLES_CONNECTION_STRING` app setting:
   ```bash
   az staticwebapp appsettings set \
     --name <your-static-web-app> \
     --setting-names TABLES_CONNECTION_STRING="<connection-string>"
   ```

   (You can also set it under **Configuration** → **Application settings** in the
   Azure Portal.) The `guestbook` table is created automatically on first write.

3. **Verify** after the next deploy:
   ```bash
   curl https://manaiakalani.com/api/guestbook          # -> {"entries":[...]}
   ```

## Local development (optional)

```bash
cd api
npm install
npm test          # runs the dependency-free core unit tests
# Full runtime needs the Azure Functions Core Tools + Azurite:
#   npm start      # func start  (set TABLES_CONNECTION_STRING or AzureWebJobsStorage first)
```
