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

## Before deploying

Both `admin/modules/shared.js` and `espace-client/modules/shared.js` (and
`site/script.js`) hardcode:

```js
const API_BASE = 'http://localhost:3001/api';
```

Update this to your deployed backend URL in all three before going live.
`espace-client/modules/shared.js`'s topbar links also assume `admin/` and
`espace-client/` are reachable at the URLs configured in the backend's
`CORS_ORIGIN` and `CLIENT_URL` env vars — keep those in sync.

## Running locally

Serve each app with any static file server, e.g.:

```bash
npx serve site -l 5500
npx serve admin -l 5501
npx serve espace-client -l 5502
```

(Match the ports to your backend's `CORS_ORIGIN` setting, or update it.)

## Deploying

Any static host works (Netlify, Vercel, GitHub Pages, S3 + CloudFront...).
Deploy `site/`, `admin/`, and `espace-client/` as three separate sites/projects
pointing at this repo's respective folders as the publish directory.
