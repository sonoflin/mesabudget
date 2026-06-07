import { categories } from "./budget-data";
import type { Fund, FundType, BudgetLevers } from "./funds-model";
import type { FundBalance } from "./fund-rules-engine";
import { getUtilityContribution, getUtilityRevenue } from "./fund-rules-engine";

const OFFICER_COST = 185_000;

function catAmount(id: string): number {
  return categories.find((c) => c.id === id)?.adoptedAmount ?? 0;
}

/**
 * Express a dollar amount in relatable, Mesa-specific terms so a gap or surplus
 * feels concrete ("≈ the entire Library budget", "≈ 60 police officers").
 */
export function getEquivalents(amount: number): string[] {
  const a = Math.abs(amount);
  const out: string[] = [];

  const officers = a / OFFICER_COST;
  if (officers >= 1) {
    out.push(`≈ ${Math.round(officers).toLocaleString()} police officers`);
  }

  const lib = catAmount("library");
  if (lib > 0) {
    const r = a / lib;
    if (r >= 0.85 && r <= 1.25) out.push("≈ the entire Library budget");
    else if (r < 0.85) out.push(`≈ ${Math.round(r * 100)}% of the Library budget`);
    else out.push(`≈ ${r.toFixed(1)}× the Library budget`);
  }

  if (out.length < 2) {
    const parks = catAmount("parks-recreation");
    if (parks > 0) out.push(`≈ ${Math.round((a / parks) * 100)}% of Parks & Recreation`);
  }

  return out.slice(0, 2);
}

export interface BalanceResolution {
  status: "deficit" | "surplus" | "balanced";
  gap: number;
  fundId: string;
  fundType: FundType;
  /** % utility-rate change that would close a GF/enterprise gap at the current contribution share */
  utilityRatePctNeeded: number | null;
  /** room left to raise the utility contribution toward the 30% cap, in dollars */
  contributionHeadroom: number | null;
  /** years the fund's beginning reserve could cover the gap */
  reserveYears: number | null;
  equivalents: string[];
}

export function getBalanceResolution(
  fund: Fund,
  fb: FundBalance,
  levers: BudgetLevers,
  capPct = 30,
): BalanceResolution {
  const gap = Math.abs(fb.difference);
  const status = fb.status;

  let utilityRatePctNeeded: number | null = null;
  let contributionHeadroom: number | null = null;

  if (status === "deficit") {
    if (fund.id === "general-fund") {
      const contribution = getUtilityContribution(levers);
      if (contribution > 0) utilityRatePctNeeded = (gap / contribution) * 100;
      const maxContribution = Math.round(getUtilityRevenue(levers) * (capPct / 100));
      contributionHeadroom = Math.max(0, maxContribution - contribution);
    } else if (fund.id === "utility-enterprise") {
      const rev = getUtilityRevenue(levers);
      if (rev > 0) utilityRatePctNeeded = (gap / rev) * 100;
    }
  }

  const reserveYears =
    status === "deficit" && fb.reserveBeginning > 0 && gap > 0
      ? Math.round((fb.reserveBeginning / gap) * 10) / 10
      : null;

  return {
    status,
    gap,
    fundId: fund.id,
    fundType: fund.type,
    utilityRatePctNeeded,
    contributionHeadroom,
    reserveYears,
    equivalents: getEquivalents(fb.difference),
  };
}
