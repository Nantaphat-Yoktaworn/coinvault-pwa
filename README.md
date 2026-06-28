# CoinVault — PWA

A private, single-user **income & expense tracker** iPhone PWA.

- **Money** — record income/expense with custom categories.
- **Stats** — weekly / monthly / yearly summaries with a category breakdown (donut + bars).
- **Cloud sync** — log in with your own password to back up and sync across devices.
  Local-first: the app works fully offline and syncs when online.

Data is stored **on the device** (IndexedDB) and, when you log in, mirrored to your own
Cloudflare KV. Nothing is shared with anyone else — it's a single-user app.

## Tech

- Plain HTML + CSS + JavaScript (ES modules). No build step, no dependencies.
- IndexedDB for storage, service worker + manifest for offline / installable PWA.
- Cloud sync via Cloudflare **Pages Functions** + **KV** (single-password auth, signed
  HttpOnly cookie). See `functions/`.

## Run locally

Static UI only (no cloud API):

```bash
python -m http.server 5500
```

To test cloud sync locally you need the Functions running:

```bash
npx wrangler pages dev dist --kv DATA
```

with a `.dev.vars` file containing `APP_PASSWORD` and `SESSION_SECRET`.

## Deploy (Cloudflare Pages, free)

1. Create a Pages project; deploy `dist/` (Git or direct upload — it includes `functions/`).
2. Bind a **KV namespace** as variable name **`DATA`** (Settings → Functions).
3. Add encrypted env vars **`APP_PASSWORD`** and **`SESSION_SECRET`** (a long random string).
4. Keep **Rocket Loader / JS minify OFF** (they break ES modules).

## Build

`dist/` is just a copy of the runtime files (no bundler):

```bash
bash build.sh
```

## Install on iPhone

Open the HTTPS URL in **Safari → Share → Add to Home Screen**. Launches full-screen and
works offline.
