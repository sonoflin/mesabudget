import fundRulesData from "../../data/fund-rules.json";
import type { Fund, FundSnapshot, MultiFundSnapshot, BudgetLevers, RevenueControl } from "./funds-model";
import { funds, meta, getFundById, getRevenueControl } from "./funds-model";
import { categories } from "./budget-data";

export interface FundRule {
  id: string;
  name: string;
  type: string;
  description: string;
  allowedCategoryIds?: string[];
  blockedTargets?: string[];
  adjustable?: boolean;
  citation?: string;
  alertMessage?: string;
  maxTransferPct?: number;
}

export interface FundBalance {
  fundId: string;
  fundName: string;
  totalRevenue: number;
  totalExpenditure: number;
  difference: number;
  isBalanced: boolean;
  reserveBeginning: number;
  reserveEnding: number;
  reserveDrawdown: number;
  status: "balanced" | "deficit" | "surplus";
}

export interface RuleViolation {
  ruleId: string;
  message: string;
  severity: "error" | "warning" | "info";
  citation?: string;
  teaching?: string;
}

const rules = fundRulesData.funds as FundRule[];
const BALANCE_TOLERANCE = 100_000;

export function getFundRule(id: string): FundRule | undefined {
  return rules.find((r) => r.id === id);
}

export function getCategoryRules(categoryId: string): FundRule[] {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return [];
  return cat.fundRuleIds.map((id) => getFundRule(id)).filter(Boolean) as FundRule[];
}

export interface RevenueLineComputed {
  id: string;
  name: string;
  adoptedAmount: number;
  amount: number;
  control: RevenueControl;
  leverDriven: boolean;
}

const BASE_SALES_RATE = meta.localSalesTaxRatePct ?? 2;
const BASE_UTILITY_REV = meta.utilityOperatingRevenue ?? 492_100_000;

/** Total utility operating revenue after the Council rate adjustment. */
export function getUtilityRevenue(levers: BudgetLevers): number {
  return Math.round(BASE_UTILITY_REV * levers.utilityRateMultiplier);
}

/** The General Fund transfer from utilities = (utility revenue) x (contribution %), capped at 30%. */
export function getUtilityContribution(levers: BudgetLevers): number {
  const pct = Math.min(levers.utilityContributionPct, meta.utilityContributionCapPct ?? 30);
  return Math.round(getUtilityRevenue(levers) * (pct / 100));
}

/**
 * Compute each revenue line for a fund with the active levers applied. This is the
 * single source of truth that ties Council levers to actual dollars:
 *  - utility rate multiplier scales enterprise rate revenue AND the GF utility transfer
 *  - utility contribution % scales the GF transfer (capped at 30%)
 *  - local sales tax rate (a voter action) scales sales-tax revenue
 */
export function computeFundRevenueLines(
  fund: Fund,
  snapshot: FundSnapshot,
  levers: BudgetLevers,
  multi?: MultiFundSnapshot,
): RevenueLineComputed[] {
  return fund.revenues.map((rev) => {
    const stored = snapshot.revenueAmounts[rev.id] ?? rev.adoptedAmount;
    let amount = stored;
    let leverDriven = false;

    if (rev.id === "local-sales-tax") {
      amount = Math.round(rev.adoptedAmount * (levers.localSalesTaxRatePct / BASE_SALES_RATE));
      leverDriven = levers.localSalesTaxRatePct !== BASE_SALES_RATE;
    } else if (rev.id === "utility-rates") {
      amount = getUtilityRevenue(levers);
      leverDriven = levers.utilityRateMultiplier !== 1;
    } else if (rev.id === "utility-contribution" && fund.id === "general-fund") {
      amount = getUtilityContribution(levers);
      leverDriven =
        levers.utilityRateMultiplier !== 1 ||
        levers.utilityContributionPct !== (meta.utilityContributionCapPct ?? 30);
    } else if (rev.id === "transit-gf-transfer-in") {
      // This revenue IS the General Fund's transit subsidy decision — keep them linked.
      const gfTransfer = multi?.funds["general-fund"]?.expenditureAmounts["transit-gf-transfer"];
      if (gfTransfer != null) {
        amount = gfTransfer;
        leverDriven = Math.round(gfTransfer) !== Math.round(rev.adoptedAmount);
      }
    }

    return {
      id: rev.id,
      name: rev.name,
      adoptedAmount: rev.adoptedAmount,
      amount,
      control: getRevenueControl(rev.id),
      leverDriven,
    };
  });
}

export function sumFundRevenue(
  snapshot: FundSnapshot,
  fund: Fund,
  levers: BudgetLevers,
  multi?: MultiFundSnapshot,
): number {
  const total = computeFundRevenueLines(fund, snapshot, levers, multi).reduce((s, l) => s + l.amount, 0);
  return total + snapshot.reserveDrawdown;
}

export function sumFundExpenditure(snapshot: FundSnapshot, fund: Fund): number {
  return fund.expenditures.reduce(
    (sum, e) => sum + (snapshot.expenditureAmounts[e.id] ?? e.adoptedAmount),
    0,
  );
}

export function calculateFundBalance(
  fund: Fund,
  snapshot: FundSnapshot,
  levers: BudgetLevers,
  multi?: MultiFundSnapshot,
): FundBalance {
  const totalRevenue = sumFundRevenue(snapshot, fund, levers, multi);
  const totalExpenditure = sumFundExpenditure(snapshot, fund);
  const difference = totalRevenue - totalExpenditure;
  const reserveBeginning = fund.reserveBeginning ?? 0;
  const reserveDrawdown = snapshot.reserveDrawdown;
  const reserveEnding = reserveBeginning + difference - reserveDrawdown;

  return {
    fundId: fund.id,
    fundName: fund.name,
    totalRevenue,
    totalExpenditure,
    difference,
    isBalanced: Math.abs(difference) <= BALANCE_TOLERANCE,
    reserveBeginning,
    reserveEnding,
    reserveDrawdown,
    status: difference > BALANCE_TOLERANCE ? "surplus" : difference < -BALANCE_TOLERANCE ? "deficit" : "balanced",
  };
}

export function calculateAllFundBalances(snapshot: MultiFundSnapshot): FundBalance[] {
  return funds.map((fund) => {
    const fundSnap = snapshot.funds[fund.id];
    if (!fundSnap) {
      return {
        fundId: fund.id,
        fundName: fund.name,
        totalRevenue: 0,
        totalExpenditure: 0,
        difference: 0,
        isBalanced: true,
        reserveBeginning: fund.reserveBeginning ?? 0,
        reserveEnding: fund.reserveBeginning ?? 0,
        reserveDrawdown: 0,
        status: "balanced" as const,
      };
    }
    return calculateFundBalance(fund, fundSnap, snapshot.levers, snapshot);
  });
}

export function validateTransfer(
  fromFundId: string,
  toCategoryId: string,
  amount: number,
): RuleViolation | null {
  if (amount <= 0) return null;
  const fromFund = getFundById(fromFundId);
  if (!fromFund) return null;

  for (const ruleId of fromFund.fundRuleIds) {
    const rule = getFundRule(ruleId);
    if (!rule) continue;

    if (rule.blockedTargets?.includes(toCategoryId)) {
      return {
        ruleId: rule.id,
        message: rule.alertMessage ?? `Cannot transfer to ${toCategoryId}.`,
        severity: "error",
        citation: rule.citation,
        teaching: rule.description,
      };
    }

    if (fromFund.type === "restricted" && rule.type === "restricted") {
      const gfCategories = ["library", "parks-recreation", "police", "fire-medical", "arts-culture"];
      if (gfCategories.includes(toCategoryId)) {
        return {
          ruleId: rule.id,
          message: `${rule.name} dollars can only fund ${rule.allowedCategoryIds?.join(", ") ?? "designated purposes"}.`,
          severity: "error",
          citation: rule.citation,
          teaching: "Restricted funds are dedicated by state law or voter approval. They cannot be moved to General Fund services like libraries or parks.",
        };
      }
    }
  }

  if (fromFund.type === "enterprise" && !["utilities-water", "utilities-solid-waste", "utilities-energy"].includes(toCategoryId)) {
    return {
      ruleId: "utility-enterprise",
      message: "Enterprise utility funds must stay in utility operations. Adjust rates or the utility contribution instead.",
      severity: "warning",
      citation: "Mesa utility enterprise fund policy",
      teaching: "Utility rates fund water, trash, and energy operations. A capped portion (30%) may support police, fire, and libraries.",
    };
  }

  return null;
}

export function validateUtilityCap(levers: BudgetLevers): RuleViolation | null {
  if (levers.utilityContributionPct > meta.utilityContributionCapPct + 0.5) {
    return {
      ruleId: "utility-transfer",
      message: `Utility contribution (${levers.utilityContributionPct.toFixed(1)}%) exceeds the ${meta.utilityContributionCapPct}% Council cap.`,
      severity: "error",
      citation: "Mesa City Council utility contribution resolution",
      teaching: "Council resolution caps utility transfer at 30% of operating revenues: 25% for public safety, 5% for general services.",
    };
  }
  return null;
}

export function getFundIntro(fund: Fund): string {
  return fund.description;
}

export function getTeachingForFund(fund: Fund): string {
  switch (fund.type) {
    case "discretionary":
      return "This is Mesa's flexible money — Council chooses how to allocate it each year for police, fire, libraries, parks, and administration.";
    case "restricted":
      return "Legally restricted by state law or voters. You can adjust spending within the fund, but dollars cannot leave for other purposes.";
    case "enterprise":
      return "Business-like operations funded by utility rates. Must remain self-sustaining with a capped contribution to other services.";
    case "trust":
      return "Trust funds for employee benefits, liability claims, and internal services. Largely driven by actuarial and legal requirements.";
    case "grant":
      return "Federal and state grants with designated uses and reporting requirements.";
    default:
      return fund.description;
  }
}

export { rules as fundRules, fundRulesData };
