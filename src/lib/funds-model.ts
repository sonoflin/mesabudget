import fundsData from "../../data/funds-fy26.json";
import budgetData from "../../data/budget-fy26.json";
import forecastAssumptions from "../../data/forecast-assumptions.json";

export type FundType = "discretionary" | "restricted" | "enterprise" | "trust" | "grant" | "debt";
export type Confidence = "adopted" | "forecast" | "estimate";

export interface FundLine {
  id: string;
  name: string;
  adoptedAmount: number;
  adjustable: boolean;
  maxDeltaPct?: number;
  ongoing?: boolean;
  group?: string;
  source: string;
  confidence: Confidence;
}

export interface Fund {
  id: string;
  name: string;
  type: FundType;
  description: string;
  fundRuleIds: string[];
  reserveBeginning?: number;
  reserveTargetPct?: [number, number];
  revenues: FundLine[];
  expenditures: FundLine[];
  source: string;
  confidence: Confidence;
}

export interface BudgetLevers {
  localSalesTaxRatePct: number;
  utilityRateMultiplier: number;
  utilityContributionPct: number;
  reserveDrawdown: Record<string, number>;
}

export interface FundSnapshot {
  fundId: string;
  revenueAmounts: Record<string, number>;
  expenditureAmounts: Record<string, number>;
  reserveDrawdown: number;
}

export interface MultiFundSnapshot {
  funds: Record<string, FundSnapshot>;
  levers: BudgetLevers;
  title?: string;
  authorName?: string;
  createdAt?: string;
}

export const meta = fundsData.meta;
export const funds = fundsData.funds as Fund[];
export const categories = budgetData.categories;

/**
 * Gross sum of every fund's adopted expenditures — this is what the simulator
 * actually lets you balance (all 12 fund cards add up to this). It runs higher
 * than `meta.totalOperatingBudget` because it's gross of interfund transfers and
 * internal-service funds, which the City's net operating figure counts only once.
 */
export const totalAdoptedAppropriations = funds.reduce(
  (sum, f) => sum + f.expenditures.reduce((a, e) => a + e.adoptedAmount, 0),
  0,
);
export const revenue = budgetData.revenue;
export const forecastMeta = forecastAssumptions;

export const FUND_TYPE_LABELS: Record<FundType, string> = {
  discretionary: "General Government",
  restricted: "Restricted",
  enterprise: "Enterprise",
  trust: "Trust & Other",
  grant: "Grants",
  debt: "Debt Service",
};

export const FUND_TYPE_COLORS: Record<FundType, string> = {
  discretionary: "mesa-blue",
  restricted: "mesa-amber",
  enterprise: "mesa-red",
  trust: "mesa-muted",
  grant: "mesa-blue",
  debt: "mesa-slate",
};

/**
 * Who actually controls each revenue source. This is the core civic lesson:
 * Council can only adjust a few levers (chiefly utility rates); most revenue is
 * set by voters at an election or by Arizona state formula.
 */
export type RevenueControl = "council" | "voters" | "state" | "fees" | "reserves";

export const REVENUE_CONTROL: Record<string, RevenueControl> = {
  "local-sales-tax": "voters",
  "state-shared": "state",
  "utility-contribution": "council",
  "other-gf-revenue": "fees",
  "hurf-revenue": "state",
  "lsst-revenue": "voters",
  "transit-restricted-rev": "state",
  "transit-gf-transfer-in": "council",
  "utility-rates": "council",
  "ps-tax-rev": "voters",
  "qol-rev": "voters",
  "ecf-rev": "council",
  "ambulance-rev": "fees",
  "ebt-premiums": "fees",
  "ebt-city-contrib": "council",
  "grants-rev": "fees",
  "other-rev": "fees",
};

export function getRevenueControl(id: string): RevenueControl {
  if (id.endsWith("-reserves") || id.includes("reserve") || id.endsWith("-balance")) return "reserves";
  return REVENUE_CONTROL[id] ?? "fees";
}

export interface RevenueControlMeta {
  label: string;
  short: string;
  color: string;
  badge: "default" | "restricted" | "enterprise" | "muted" | "danger";
  explanation: string;
}

export const REVENUE_CONTROL_META: Record<RevenueControl, RevenueControlMeta> = {
  council: {
    label: "Council sets this",
    short: "Council",
    color: "mesa-blue",
    badge: "default",
    explanation: "Mesa City Council can adjust this each year by resolution — most often by changing utility rates. This is the city's only real annual revenue lever.",
  },
  voters: {
    label: "Only voters can change",
    short: "Voters",
    color: "mesa-amber",
    badge: "restricted",
    explanation: "This is a fixed tax rate. Raising or lowering it requires asking Mesa voters to approve it at an election — Council cannot change it on its own.",
  },
  state: {
    label: "Set by state formula",
    short: "State",
    color: "mesa-slate",
    badge: "muted",
    explanation: "Arizona distributes this based on population and statewide collections. Mesa has no local control over the amount.",
  },
  fees: {
    label: "Fees & charges",
    short: "Fees",
    color: "mesa-slate",
    badge: "muted",
    explanation: "Cost-recovery fees, fines, permits, and charges tied to specific services. They roughly track usage, not policy choices.",
  },
  reserves: {
    label: "One-time reserves",
    short: "Reserves",
    color: "mesa-red",
    badge: "danger",
    explanation: "Accumulated savings used to balance for a single year. Reserves are one-time money — relying on them creates a structural deficit.",
  },
};

export function getFundById(id: string): Fund | undefined {
  return funds.find((f) => f.id === id);
}

export function getInitialLevers(): BudgetLevers {
  return {
    localSalesTaxRatePct: meta.localSalesTaxRatePct ?? 2.0,
    utilityRateMultiplier: 1.0,
    utilityContributionPct: meta.utilityContributionCapPct ?? 30,
    reserveDrawdown: {},
  };
}

export function getInitialSnapshot(): MultiFundSnapshot {
  const fundSnapshots: Record<string, FundSnapshot> = {};
  for (const fund of funds) {
    fundSnapshots[fund.id] = {
      fundId: fund.id,
      revenueAmounts: Object.fromEntries(fund.revenues.map((r) => [r.id, r.adoptedAmount])),
      expenditureAmounts: Object.fromEntries(fund.expenditures.map((e) => [e.id, e.adoptedAmount])),
      reserveDrawdown: 0,
    };
  }
  return { funds: fundSnapshots, levers: getInitialLevers() };
}

export function getCategoryIdsForFund(fundId: string): string[] {
  const fund = getFundById(fundId);
  return fund?.expenditures.map((e) => e.id) ?? [];
}
