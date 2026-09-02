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

## Deploying (cPanel)

`site/`, `admin/`, and `espace-client/` are deployed as **subpaths of one
domain**, not separate sites — that's what the `IS_LOCAL` check above assumes:

- Upload `site/`'s *contents* (not the folder itself) directly into
  `public_html/`, so `https://vakpon-tours.com/` serves `site/index.html` —
  never `https://vakpon-tours.com/site/index.html`.
- Upload the `admin/` and `espace-client/` folders as-is into `public_html/`,
  so they land at `https://vakpon-tours.com/admin/index.html` and
  `https://vakpon-tours.com/espace-client/index.html`.

Any other static host works too (Netlify, Vercel, S3 + CloudFront...) as long
as the same three-subpaths-under-one-domain shape is preserved; deploying them
as three unrelated domains would break the `IS_LOCAL` production branch above
and the backend's single-origin `CORS_ORIGIN`.
