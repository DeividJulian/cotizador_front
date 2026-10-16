# AI Quoter · Frontend

Web interface for the **AI Quotation Engine** (Programación Orientada a la Web, UCC Pasto): a tool for freelancers
who don't know how much to charge for a software project.
Angular 21 · TypeScript · FastAPI + Neon (PostgreSQL) in the cloud · Vercel + Render.

## What it does
- Sign in with **Google**: your quotes and rates are saved in your account, so you never lose your progress.
- Describe your project in plain words; the AI turns it into modules with optimistic / most likely / pessimistic
  hours (PERT).
- Calculates the price with **your hourly rates** (they start with market reference rates in COP; adjust them in
  **My rates**): direct cost, contingency, margin, discount, VAT, schedule and payment milestones.
- Simulates the risk with Monte Carlo (P50 / P80 / P90 and probability of exceeding the hours).
- Generates the commercial proposal in Markdown for your client (read it, download it and print it).
- Tracks each proposal: draft → sent → accepted / rejected.

There are no roles: every user only sees their own quotes, rates and dashboard.

## Login with Google
The login screen shows Google's "Continue with Google" button (Google Identity Services). Google returns an ID token,
the backend verifies it in `POST /auth/google` and answers with the app's session token, which is stored in the
browser and sent on every API request. If the session expires, the app returns to the login screen. Logging out
also clears the API data cached by the Service Worker, so another account on the same browser never sees it.

## The three workers
| Worker | File | Purpose |
| --- | --- | --- |
| Web Worker | `src/app/core/workers/simulation.worker.ts` | Monte Carlo off the main thread; the screen does not freeze. |
| Shared Worker | `public/shared-worker.js` | Notifies every open tab when one of them changes data. |
| Service Worker | `public/sw.js` | Network-first cache of GET requests: the app keeps showing data while offline. |

## Run locally
Start the backend first (in its folder, with its `.env`): `uvicorn main:app --reload` → http://127.0.0.1:8000/docs.

```bash
npm install --legacy-peer-deps
npm start            # http://localhost:4200  (expects the API at http://127.0.0.1:8000)
npm test             # unit tests
npm run build        # production build in dist/cotizador-front/browser
```

Sign in with Google, then **New quote** → describe the project → **Create and analyze with AI**. To see how it
works with real data, use **Load examples** on the Dashboard.

Scope descriptions must be written in Spanish: the backend's module detector uses Spanish keywords.

## Configuration
In `src/app/core/config/api.config.ts`:
- `PRODUCTION_API`: the backend URL on Render.
- `GOOGLE_CLIENT_ID`: the OAuth client ID from Google Cloud (the same value as the backend's `GOOGLE_CLIENT_ID`).
  Its **Authorized JavaScript origins** must include `http://localhost:4200` and the Vercel URL.

## Deployment
Vercel (Angular preset, output `dist/cotizador-front/browser`). `vercel.json` rewrites routes to `index.html`
and prevents caching `sw.js` and `shared-worker.js`.

## Structure
```
src/app/
  core/       config, models, HTTP services, utilities and workers
  core/auth/  Google sign-in loader, token interceptor and session guards
  shared/     notifications and connection status
  features/   auth, dashboard, quotes, quote-new, quote-detail, tariffs
public/       sw.js and shared-worker.js
```
