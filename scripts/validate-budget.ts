import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const budget = JSON.parse(readFileSync(join(dataDir, "budget-fy26.json"), "utf8"));
const funds = existsSync(join(dataDir, "funds-fy26.json"))
  ? JSON.parse(readFileSync(join(dataDir, "funds-fy26.json"), "utf8"))
  : null;

const catSum = budget.categories.reduce(
  (a: number, c: { adoptedAmount: number }) => a + c.adoptedAmount,
  0,
);
const revSum = budget.revenue.reduce(
  (a: number, r: { adoptedAmount: number }) => a + r.adoptedAmount,
  0,
);
const total = budget.meta.totalOperatingBudget;
const tolerance = total * 0.02;

let ok = true;

if (Math.abs(catSum - total) > tolerance) {
  console.error(`Category sum $${catSum} differs from operating total $${total} by >2%`);
  ok = false;
}
if (Math.abs(revSum - total) > tolerance) {
  console.error(`Revenue sum $${revSum} differs from operating total $${total} by >2%`);
  ok = false;
}

if (funds) {
  for (const fund of funds.funds as Array<{
    id: string;
    revenues: { adoptedAmount: number }[];
    expenditures: { adoptedAmount: number }[];
  }>) {
    const rev = fund.revenues.reduce((s, r) => s + r.adoptedAmount, 0);
    const exp = fund.expenditures.reduce((s, e) => s + e.adoptedAmount, 0);
    if (exp > 0 && rev === 0) {
      console.warn(`Fund ${fund.id}: expenditures $${exp} but no revenues (may be transfer-funded)`);
    }
  }

  const requiredFiles = ["forecast-assumptions.json", "household.json", "impact-rubrics.json", "fund-rules.json"];
  for (const f of requiredFiles) {
    if (!existsSync(join(dataDir, f))) {
      console.error(`Missing required data file: ${f}`);
      ok = false;
    }
  }
}

if (ok) {
  console.log(`Validation passed: categories $${(catSum / 1e6).toFixed(1)}M, revenue $${(revSum / 1e6).toFixed(1)}M`);
  if (funds) console.log(`  ${funds.funds.length} funds validated`);
}
process.exit(ok ? 0 : 1);
