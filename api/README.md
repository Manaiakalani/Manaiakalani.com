# Shared guestbook API

An [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/) managed function
that turns the site's guestbook into a **shared** one, backed by
[Cloud Firestore](https://firebase.google.com/docs/firestore) via the Firebase Admin SDK.

The browser never talks to Google. It calls `/api/guestbook` and `/api/counter`;
the Function uses a service account. Firestore security rules in this folder
deny all client SDK access.

It is optional. Until Firebase credentials are set, signatures stay in each
visitor's `localStorage` and the hit counter stays hidden. A missing or failing
backend never breaks the page.

## Endpoint

`GET|POST /api/guestbook`

| Method | Body | Response |
| --- | --- | --- |
| `GET`  | — | `{ "entries": [{ "name", "message", "date" }, …] }` newest-first |
| `POST` | `{ "name", "message" }` | `{ "entries": [ … ] }` with the new signature prepended |

All input is sanitized and length-capped server-side (`name` ≤ 40,
`message` ≤ 200, ≤ 100 entries returned). See `src/lib/guestbook-core.js`.

> The visitor **hit counter** (`GET|POST /api/counter`) shares the same
> Firebase project, so completing the setup below activates both.

Collections (created on first write):

- `guestbook` — one document per signature (`name`, `message`, `date`, `id`, `seq`)
- `counter/hits` — `{ count }` with atomic `increment`
- `ratelimit/{bucket}_{hash}` — per-IP windows (hashed, never a raw IP)

## Abuse protection (rate limiting)

Both anonymous `POST` endpoints are throttled per client IP
(`src/lib/rate-limit.js`, decision logic in `src/lib/rate-limit-core.js`).

- **Defaults:** guestbook **5 posts / 10 min**, counter **20 increments / 5 min**
  per IP. Only writes are limited — `GET` reads stay open.
- **Privacy-first:** the client IP is **salted-hashed** into an opaque document
  id. Set `RATE_LIMIT_SALT` to a long random secret.
- **Fail-open:** if Firebase is unconfigured or errors, requests are allowed.
- **Tune without a redeploy:** `RL_GUESTBOOK_LIMIT`, `RL_GUESTBOOK_WINDOW_MS`,
  `RL_COUNTER_LIMIT`, `RL_COUNTER_WINDOW_MS`.

**Recommended edge backstop:** a Cloudflare rate-limiting rule on `POST /api/*`
(e.g. 30 requests/min per IP).

## One-time Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/) create a project
   (or reuse one). Enable **Cloud Firestore** (production mode is fine — rules
   below deny the client SDK).

2. Project settings → **Service accounts** → Generate new private key.
   You get a JSON file.

3. Publish the Firestore rules in this folder so the web SDK cannot read or write:

   ```bash
   firebase deploy --only firestore:rules
   ```

   (`api/firestore.rules` is `allow read, write: if false`.)

4. Put the credentials on the Static Web App. Either the whole JSON:

   ```bash
   az staticwebapp appsettings set \
     --name <your-static-web-app> \
     --resource-group <your-rg> \
     --setting-names FIREBASE_SERVICE_ACCOUNT="$(cat ./service-account.json)"
   ```

   or three settings (`FIREBASE_PRIVATE_KEY` can keep `\n` escapes):

   ```
   FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY
   ```

   Helper: `scripts/enable-firebase-guestbook.sh`.

5. After the next deploy:

   ```bash
   curl https://manaiakalani.com/api/guestbook
   # -> {"entries":[...]}  without backend:"unconfigured"
   ```

## Local development

```bash
cd api
npm install
npm test
# FIREBASE_SERVICE_ACCOUNT='{...}' npm start
```
