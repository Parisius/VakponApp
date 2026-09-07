# Vakpon Tours — Frontend

Three static apps, plain HTML/CSS/JS (no build step), talking to the
[VakponBackend](https://github.com/Parisius/VakponBackend) API over HTTP.

```
site/             Public landing page — fetches offers from GET /api/offers
admin/            Back-office for staff (role-gated: dashboard, reservations,
                  offers, customers, team, audit log)
espace-client/    Customer portal (reservations, offers catalog, profile)
```

`admin/` and `espace-client/` are each split into one HTML page per section,
sharing `styles.css` and a `modules/shared.js` (auth, API client, toasts,
pagination, theme) — see `modules/` in each app for the per-page scripts.

## Environment

`site/script.js`, `admin/modules/shared.js`, and `espace-client/modules/shared.js`
each detect their environment from `window.location.hostname`:

```js
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';
```

Nothing to edit before deploying — local dev keeps hitting `localhost:3001`,
everywhere else hits `api.vakpon-tours.com`. Same pattern for the "Espace
Client" links on the landing page (`http://localhost:5502/index.html` locally,
`https://vakpon-tours.com/espace-client/index.html` in production). If the
production API domain ever changes, update the hardcoded URL in those three
files.

## Running locally

Serve each app with any static file server, e.g.:

```bash
npx serve site -l 5500
npx serve admin -l 5501
npx serve espace-client -l 5502
```

## Deploying

The domain (`vakpon-tours.com`) stays on cPanel for DNS + mail only — actual
hosting for `site/`, `admin/`, and `espace-client/` lives on a VPS, all three
as **subpaths of one domain**, not separate sites (that's what the
`IS_LOCAL` check above assumes):

- `https://vakpon-tours.com/` → `site/`'s contents
- `https://vakpon-tours.com/management/index.html` → the `admin/` folder (published at `/management/` — folder name unchanged, only its public URL differs)
- `https://vakpon-tours.com/espace-client/index.html` → the `espace-client/` folder

### Option A — plain Nginx

`deploy/nginx-vakpon-tours.conf` is a ready-to-use config for exactly this
shape — `git clone` this repo onto the VPS and point Nginx at it; no build
step or file copying needed.

### Option B — Nginx Proxy Manager (or any reverse proxy that only speaks host:port)

NPM can't serve a static folder directly, so this repo also ships a tiny
Nginx *container* (`Dockerfile` + `docker-compose.yml`) that serves all three
apps and exposes them on one port:

```bash
docker compose up -d --build   # serves on http://<vps-ip>:8300
```

Then in NPM, **Add Proxy Host**:
- Domain Names: `vakpon-tours.com`, `www.vakpon-tours.com`
- Forward Hostname/IP: your VPS's real IP (not `vakpon-tours.com` itself, and
  not `localhost`/`127.0.0.1` — NPM runs in its own container, so `localhost`
  there means the NPM container, not this one)
- Forward Port: `8300`
- SSL tab: request a new Let's Encrypt certificate, enable **Force SSL**

See [VakponBackend's README](https://github.com/Parisius/VakponBackend#deployment-topology)
for the matching `api.vakpon-tours.com` proxy host.

---

Any static host works in principle (Netlify, Vercel, S3 + CloudFront...) as
long as the same three-subpaths-under-one-domain shape is preserved —
deploying them as three unrelated domains would break the `IS_LOCAL`
production branch above and the backend's single-origin `CORS_ORIGIN`.
