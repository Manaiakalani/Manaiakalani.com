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

> The visitor **hit counter** (`GET|POST /api/counter`) shares the same
> `TABLES_CONNECTION_STRING`, so completing the setup below activates both.

## Abuse protection (rate limiting)

Both anonymous `POST` endpoints are throttled per client IP by a shared,
Table Storage-backed limiter (`src/lib/rate-limit.js`, decision logic in the
pure `src/lib/rate-limit-core.js`).

- **Defaults:** guestbook **5 posts / 10 min**, counter **20 increments / 5 min**
  per IP. Only writes are limited — guestbook/counter `GET` reads stay open.
- **Privacy-first:** the client IP (from `cf-connecting-ip`, else the first
  `x-forwarded-for` hop) is **salted-hashed** into an opaque key — raw visitor
  IPs are never written to storage. Set `RATE_LIMIT_SALT` to rotate the hash.
- **Fail-open:** if storage is unconfigured or errors, requests are allowed. A
  cosmetic guestbook/counter must never break because the limiter hiccuped.
- **Tune without a redeploy** via app settings:
  `RL_GUESTBOOK_LIMIT`, `RL_GUESTBOOK_WINDOW_MS`,
  `RL_COUNTER_LIMIT`, `RL_COUNTER_WINDOW_MS`.
- A `ratelimit` table is created automatically on first throttled write.

**Recommended edge backstop:** because the limiter fails open, also add a
[Cloudflare rate-limiting rule](https://developers.cloudflare.com/waf/rate-limiting-rules/)
on `POST /api/*` (e.g. 30 requests/min per IP). Cloudflare enforces it before
traffic ever reaches Azure, covering the fail-open window.

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
