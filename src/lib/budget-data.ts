import budgetData from "../../data/budget-fy26.json";
import fundRulesData from "../../data/fund-rules.json";
import impactRubricsData from "../../data/impact-rubrics.json";

export type FundGroup = "general" | "restricted" | "enterprise" | "locked" | "revenue";

export interface BudgetCategory {
  id: string;
  name: string;
  fundGroup: FundGroup;
  fundId?: string;
  adoptedAmount: number;
  adjustable: boolean;
  fundRuleIds: string[];
  description: string;
  icon: string;
  source?: string;
  confidence?: string;
}

export interface RevenueItem {
  id: string;
  name: string;
  adoptedAmount: number;
  adjustable: boolean;
  maxDeltaPct?: number;
  fundRuleIds: string[];
  description: string;
  source?: string;
  confidence?: string;
}

export interface BudgetMeta {
  fiscalYear: string;
  fiscalYearCode: string;
  totalOperatingBudget: number;
  totalCityBudget: number;
  cipExcluded: number;
  utilityContributionCapPct: number;
  utilityContributionAdopted: number;
  utilityOperatingRevenue?: number;
  transitGfTransfer: number;
  localSalesTaxRatePct?: number;
  generatedAt: string;
  source: string;
  fundCategoryTotals?: Record<string, number>;
}

export interface BudgetSnapshot {
  categoryAmounts: Record<string, number>;
  revenueAmounts: Record<string, number>;
  title?: string;
  authorName?: string;
  createdAt?: string;
}

export const meta = budgetData.meta as BudgetMeta;
export const categories = budgetData.categories as BudgetCategory[];
export const revenue = budgetData.revenue as RevenueItem[];
export const fundRules = fundRulesData;
export const impactRubrics = impactRubricsData;

export function getInitialSnapshot(): BudgetSnapshot {
  return {
    categoryAmounts: Object.fromEntries(categories.map((c) => [c.id, c.adoptedAmount])),
    revenueAmounts: Object.fromEntries(revenue.map((r) => [r.id, r.adoptedAmount])),
  };
}

export function getCategoryById(id: string): BudgetCategory | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoriesByFundGroup(group: FundGroup): BudgetCategory[] {
  return categories.filter((c) => c.fundGroup === group);
}

export const FUND_GROUP_LABELS: Record<FundGroup, string> = {
  general: "General Government",
  restricted: "Restricted Funds",
  enterprise: "Enterprise",
  locked: "Locked / Fixed",
  revenue: "Revenue",
};

export const FUND_GROUP_ORDER: FundGroup[] = [
  "general",
  "restricted",
  "enterprise",
  "locked",
  "revenue",
];

export {
  funds,
  getFundById,
  getInitialSnapshot as getInitialMultiFundSnapshot,
  FUND_TYPE_LABELS,
  FUND_TYPE_COLORS,
} from "./funds-model";

export type { MultiFundSnapshot, Fund, FundSnapshot, BudgetLevers } from "./funds-model";
