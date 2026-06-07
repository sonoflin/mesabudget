# Data Sources & Provenance

Every figure in this simulator traces to a published City of Mesa source. Fields in JSON data include `source` and `confidence` where applicable.

| Confidence | Meaning |
|------------|---------|
| `adopted` | Matches Adopted Budget / Open Budget dataset for FY 2025/26 |
| `forecast` | From City-published multi-year forecast documents |
| `estimate` | Educational model derived from published narrative (labeled in UI) |

## Primary datasets (machine-readable)

- **Operating expenses**: [Open Budget Expenses](https://data.mesaaz.gov/Office-of-Management-and-Budget/Open-Budget-Expenses/29q3-4ewh) — Socrata `29q3-4ewh`
- **Operating revenues**: [Open Budget Revenues](https://data.mesaaz.gov/Office-of-Management-and-Budget/Open-Budget-Revenues/69ew-t3nx) — Socrata `69ew-t3nx`

Run `npm run build:data` to refresh `data/budget-fy26.json` and `data/funds-fy26.json` from these APIs.

## Official documents

- [Budget Documents (FY 2025/26)](https://www.mesaaz.gov/Government/Management-Budget/Budget/Budget-Documents)
- [Budget in Brief](https://www.mesaaz.gov/Government/Management-Budget/Budget/Budget-Documents)
- [Major Funds](https://www.mesaaz.gov/Government/Management-Budget/Budget/Major-Funds)
- [Open Budget portal](https://openbudget.mesaaz.gov/)
- [Open Expenditures](https://openexpenditures.mesaaz.gov/)

## Key adopted figures (FY 2025/26)

| Item | Amount | Source |
|------|--------|--------|
| Total operating budget | $2,039.0M | Open Budget Expenses sum |
| General Fund expenditures | $667.6M | Open Budget by fund category |
| Utility operating revenues | $492.1M | Council Budget Summary |
| Utility GF contribution | $147.0M (30% cap) | Council resolution |
| Transit GF transfer | $26.9M | Council Budget Summary |
| Secondary property tax levy | $44.3M | Council Budget Summary |
| HURF+LSST combined reserve | $86.4M end FY25/26 | Council Budget Summary |
| EBT City contribution | $100.5M | Council Budget Summary |
| PSPRS total contribution | $102.8M | Council Budget Summary |

## Forecast assumptions

See `data/forecast-assumptions.json` — growth rates from General Governmental and Enterprise Funds Forecast presentations (Council Study Sessions, FY 2025/26 cycle).

## Service impact rubrics

See `data/impact-rubrics.json` — unit costs (e.g., ~$185K fully loaded sworn officer) derived from Council Budget Summary narratives and OMB materials. Labeled as educational estimates in the UI.

## Validation

```bash
npm run validate:data
```

Asserts category/revenue sums reconcile to operating total and per-fund balances match published fund-category totals within tolerance.
