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

Order of use: first **Rates** (without them the analysis returns 409), then a **Client**, then **New quote** →
**Analyze with AI**. For quick data use **Load demo data** on the Dashboard.

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
  features/   dashboard, quotes, quote-new, quote-detail, clients, tariffs
public/       sw.js and shared-worker.js
```
