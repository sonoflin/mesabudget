# Mesa Budget Simulator

A mobile-first citizen budget builder for the **City of Mesa FY 2025/26** operating budget. Residents explore per-fund budgeting, adjust Council levers (sales tax, utility rates), see live service impacts, view a 5-year forecast, and share balanced budgets via unique URLs.

## Features

- **Per-fund model** — General, Restricted, Enterprise, Trust, and Grant funds each balance independently with real rules
- **Live consequences** — Service-level impacts appear inline as you adjust spending
- **Council levers** — Sales tax rate, utility rates, utility contribution % with household bill feedback
- **5-year forecast** — Structural gap visualization from published City assumptions
- **Taxpayer receipt** — Personalized "where your taxes go" quick-start
- **Social** — Share links, community gallery, aggregate "what Mesa prioritized"
- **Mesa brand** — Red/amber/blue palette, Mulish typography, Framer Motion micro-interactions

## Quick start

```bash
npm install
npm run build:data      # Refresh budget JSON from Mesa Data Hub
npm run validate:data   # Verify totals reconcile
npm run db:migrate      # Local D1 schema
npm run dev:all         # Astro :4321 + Worker :8787
```

Open [http://localhost:4321](http://localhost:4321)

### Environment

Copy `.env.example` to `.env`:

```
PUBLIC_SHARE_API=http://127.0.0.1:8787/api
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Astro dev server only |
| `npm run dev:worker` | Share API worker (Wrangler) |
| `npm run dev:all` | Both servers |
| `npm run build:data` | ETL from Socrata → `data/budget-fy26.json` + `data/funds-fy26.json` |
| `npm run validate:data` | Verify category/revenue/fund totals |
| `npm run build` | Production static build |
| `npm run deploy` | Deploy to Cloudflare Pages |

## Project structure

```
data/           budget-fy26.json, funds-fy26.json, forecast-assumptions.json, household.json
scripts/        ETL and validation
src/islands/    BudgetSimulator, GalleryLoader, ShareBudgetLoader
src/lib/        funds-model, fund-rules-engine, forecast-engine, household-impact
worker/         Share API + D1 (gallery, aggregate, agree)
DATA-SOURCES.md Provenance for every figure
```

## Data disclaimer

Impact estimates are educational. Official budget documents govern actual allocations. See [DATA-SOURCES.md](DATA-SOURCES.md).

- [Budget Documents](https://www.mesaaz.gov/Government/Management-Budget/Budget/Budget-Documents)
- [Open Budget](https://openbudget.mesaaz.gov/)
- [Major Funds](https://www.mesaaz.gov/Government/Management-Budget/Budget/Major-Funds)

## Deploy

### GitHub Pages (static site)

The simulator runs as a static Astro site on GitHub Pages. A workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

**Live URL:** [https://sonoflin.github.io/mesabudget/](https://sonoflin.github.io/mesabudget/)

#### One-time GitHub setup

1. Push this repo to [github.com/sonoflin/mesabudget](https://github.com/sonoflin/mesabudget)
2. In the repo, go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Push to `main` (or run the workflow manually from the **Actions** tab)

The site builds with `base: /mesabudget` in `astro.config.mjs`. For a custom domain, change `site` and `base` there and add the domain under **Settings → Pages**.

#### Share / gallery API on GitHub Pages

GitHub Pages serves static files only — it cannot run the Cloudflare Worker in `worker/`. Without a separate API:

- The **budget simulator** works fully offline in the browser
- **Share links** and the **community gallery** need the worker deployed elsewhere

To enable sharing on the hosted site:

1. Deploy the worker to Cloudflare (see below)
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**
3. Add `PUBLIC_SHARE_API` = `https://your-worker.workers.dev/api` (no trailing slash after `/api`)

If unset, share/gallery requests fail gracefully (gallery shows empty; share shows an error).

### Cloudflare (full stack: site + share API)

1. Create D1 database: `wrangler d1 create mesa-budget-db`
2. Update `database_id` in `wrangler.toml`
3. Run `npm run db:migrate:remote`
4. Deploy worker: `wrangler deploy`
5. Deploy site: `npm run build && wrangler pages deploy dist`
6. Set `PUBLIC_SHARE_API` to your worker URL in Pages env vars

`public/_redirects` is Cloudflare Pages–specific (SPA fallback for `/b/*` share routes). GitHub Pages does not use it; share URLs use `/b?slug=…` query params instead.

City of Mesa — citizen engagement tool. Budget data © City of Mesa.

