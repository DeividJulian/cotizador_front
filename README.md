# AI Quoter · Frontend

Web interface for the **AI Quotation Engine** (Programación Orientada a la Web, UCC Pasto).
Angular 21 · TypeScript · FastAPI + Neon (PostgreSQL) in the cloud · Vercel + Render.

## What it does
- Registers clients and hourly rates per role (in COP).
- Turns a project description into modules with optimistic / most likely / pessimistic hours (PERT).
- Calculates the price: direct cost, contingency, margin, discount, VAT, schedule and payment milestones.
- Simulates the risk with Monte Carlo (P50 / P80 / P90 and probability of exceeding the hours).
- Generates the commercial proposal in Markdown (read it, download it and print it).
- Status flow: draft → sent → accepted / rejected.

## Login and roles
Passwordless: on **Sign up** or **Log in** the user enters their email and receives a 6-digit code that expires in
10 minutes. After verifying it, the session token is stored in the browser and sent on every API request.

| Role | Screens |
|---|---|
| Admin | Dashboard, Quotes (create, analyze, edit, send), Clients, Rates and Users (change roles). |
| Client | My quotes: only the quotes sent to them, with the proposal and buttons to accept or reject. |

The backend decides the role: emails in its `ADMIN_EMAILS` variable become admins, everyone else is a client.
If the session expires, the app returns to the login screen. Logging out also clears the API data cached by the
Service Worker, so another account on the same browser never sees it.

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

Sign up with an email listed in the backend's `ADMIN_EMAILS`. Locally the backend prints the verification code in
its terminal (`EMAIL_BACKEND=consola`). Then: first **Rates** (without them the analysis returns 409), then a
**Client**, then **New quote** → **Analyze with AI**. For quick data use **Load demo data** on the Dashboard.

Scope descriptions must be written in Spanish: the backend's module detector uses Spanish keywords.

## Configuration
The production backend URL is in `src/app/core/config/api.config.ts` (`PRODUCTION_API`).

## Deployment
Vercel (Angular preset, output `dist/cotizador-front/browser`). `vercel.json` rewrites routes to `index.html`
and prevents caching `sw.js` and `shared-worker.js`.

## Structure
```
src/app/
  core/       config, models, HTTP services, utilities and workers
  shared/     notifications and connection status
  core/auth/  token interceptor and role guards
  features/   auth, dashboard, quotes, quote-new, quote-detail, clients, tariffs, users, my-quotes
public/       sw.js and shared-worker.js
```
