import type { BudgetCategory, BudgetSnapshot, RevenueItem } from "./budget-data";
import { categories, revenue, meta } from "./budget-data";
import type { MultiFundSnapshot } from "./funds-model";
import { funds, getInitialSnapshot as getMultiInitial, totalAdoptedAppropriations } from "./funds-model";
import { calculateAllFundBalances } from "./fund-rules-engine";

export interface BalanceResult {
  totalExpenditure: number;
  totalRevenue: number;
  difference: number;
  isBalanced: boolean;
  surplus: number;
  deficit: number;
  fundBalances?: ReturnType<typeof calculateAllFundBalances>;
}

export interface CategoryDelta {
  id: string;
  name: string;
  adopted: number;
  current: number;
  delta: number;
  deltaPct: number;
}

const BALANCE_TOLERANCE = 100_000;

export function multiFundToLegacy(snapshot: MultiFundSnapshot): BudgetSnapshot {
  const categoryAmounts: Record<string, number> = {};
  const revenueAmounts: Record<string, number> = {};

  for (const fund of funds) {
    const fs = snapshot.funds[fund.id];
    if (!fs) continue;
    for (const [id, amt] of Object.entries(fs.expenditureAmounts)) {
      categoryAmounts[id] = amt;
    }
    for (const [id, amt] of Object.entries(fs.revenueAmounts)) {
      if (fund.id === "general-fund") revenueAmounts[id] = amt;
    }
  }

  return {
    categoryAmounts,
    revenueAmounts,
    title: snapshot.title,
    authorName: snapshot.authorName,
    createdAt: snapshot.createdAt,
  };
}

export function legacyToMultiFund(legacy: BudgetSnapshot): MultiFundSnapshot {
  const multi = getMultiInitial();
  for (const fund of funds) {
    const fs = multi.funds[fund.id];
    if (!fs) continue;
    for (const exp of fund.expenditures) {
      if (legacy.categoryAmounts[exp.id] !== undefined) {
        fs.expenditureAmounts[exp.id] = legacy.categoryAmounts[exp.id];
      }
    }
    for (const rev of fund.revenues) {
      if (legacy.revenueAmounts[rev.id] !== undefined) {
        fs.revenueAmounts[rev.id] = legacy.revenueAmounts[rev.id];
      }
    }
  }
  multi.title = legacy.title;
  multi.authorName = legacy.authorName;
  multi.createdAt = legacy.createdAt;
  return multi;
}

export function sumCategories(amounts: Record<string, number>): number {
  return categories.reduce((sum, c) => sum + (amounts[c.id] ?? 0), 0);
}

export function sumRevenue(amounts: Record<string, number>): number {
  return revenue.reduce((sum, r) => sum + (amounts[r.id] ?? 0), 0);
}

export function calculateBalance(snapshot: BudgetSnapshot): BalanceResult {
  const totalExpenditure = sumCategories(snapshot.categoryAmounts);
  const totalRevenue = sumRevenue(snapshot.revenueAmounts);
  const difference = totalRevenue - totalExpenditure;
  const isBalanced = Math.abs(difference) <= BALANCE_TOLERANCE;

  return {
    totalExpenditure,
    totalRevenue,
    difference,
    isBalanced,
    surplus: difference > 0 ? difference : 0,
    deficit: difference < 0 ? Math.abs(difference) : 0,
  };
}

export function calculateMultiFundBalance(snapshot: MultiFundSnapshot): BalanceResult {
  const fundBalances = calculateAllFundBalances(snapshot);
  const totalExpenditure = fundBalances.reduce((s, b) => s + b.totalExpenditure, 0);
  const totalRevenue = fundBalances.reduce((s, b) => s + b.totalRevenue, 0);
  const difference = totalRevenue - totalExpenditure;
  const deficits = fundBalances.filter((b) => b.status === "deficit");
  const isBalanced = deficits.length === 0;

  return {
    totalExpenditure,
    totalRevenue,
    difference,
    isBalanced,
    surplus: difference > 0 ? difference : 0,
    deficit: difference < 0 ? Math.abs(difference) : 0,
    fundBalances,
  };
}

export function getCategoryDeltas(snapshot: BudgetSnapshot): CategoryDelta[] {
  return categories
    .map((c) => {
      const current = snapshot.categoryAmounts[c.id] ?? c.adoptedAmount;
      const delta = current - c.adoptedAmount;
      const deltaPct = c.adoptedAmount ? (delta / c.adoptedAmount) * 100 : 0;
      return { id: c.id, name: c.name, adopted: c.adoptedAmount, current, delta, deltaPct };
    })
    .filter((d) => Math.abs(d.delta) > 100);
}

export function getTopChanges(snapshot: BudgetSnapshot, limit = 3): CategoryDelta[] {
  return getCategoryDeltas(snapshot).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}

export function setCategoryAmount(snapshot: BudgetSnapshot, categoryId: string, amount: number): BudgetSnapshot {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return snapshot;
  const min = 0;
  const max = cat.adoptedAmount * 2;
  const clamped = Math.max(min, Math.min(max, Math.round(amount)));
  return { ...snapshot, categoryAmounts: { ...snapshot.categoryAmounts, [categoryId]: clamped } };
}

export function setRevenueAmount(snapshot: BudgetSnapshot, revenueId: string, amount: number): BudgetSnapshot {
  const rev = revenue.find((r) => r.id === revenueId);
  if (!rev || !rev.adjustable) return snapshot;
  const maxPct = rev.maxDeltaPct ?? 10;
  const min = rev.adoptedAmount * (1 - maxPct / 100);
  const max = rev.adoptedAmount * (1 + maxPct / 100);
  const clamped = Math.max(min, Math.min(max, Math.round(amount)));
  return { ...snapshot, revenueAmounts: { ...snapshot.revenueAmounts, [revenueId]: clamped } };
}

export function setFundExpenditure(
  snapshot: MultiFundSnapshot,
  fundId: string,
  expenditureId: string,
  amount: number,
): MultiFundSnapshot {
  const fund = funds.find((f) => f.id === fundId);
  const exp = fund?.expenditures.find((e) => e.id === expenditureId);
  if (!exp) return snapshot;
  const min = 0;
  const max = exp.adoptedAmount * 1.5;
  const clamped = Math.max(min, Math.min(max, Math.round(amount)));
  const fundSnap = snapshot.funds[fundId];
  if (!fundSnap) return snapshot;
  return {
    ...snapshot,
    funds: {
      ...snapshot.funds,
      [fundId]: {
        ...fundSnap,
        expenditureAmounts: { ...fundSnap.expenditureAmounts, [expenditureId]: clamped },
      },
    },
  };
}

export function setFundRevenue(
  snapshot: MultiFundSnapshot,
  fundId: string,
  revenueId: string,
  amount: number,
): MultiFundSnapshot {
  const fund = funds.find((f) => f.id === fundId);
  const rev = fund?.revenues.find((r) => r.id === revenueId);
  if (!rev || !rev.adjustable) return snapshot;
  const maxPct = rev.maxDeltaPct ?? 10;
  const min = rev.adoptedAmount * (1 - maxPct / 100);
  const max = rev.adoptedAmount * (1 + maxPct / 100);
  const clamped = Math.max(min, Math.min(max, Math.round(amount)));
  const fundSnap = snapshot.funds[fundId];
  if (!fundSnap) return snapshot;
  return {
    ...snapshot,
    funds: {
      ...snapshot.funds,
      [fundId]: {
        ...fundSnap,
        revenueAmounts: { ...fundSnap.revenueAmounts, [revenueId]: clamped },
      },
    },
  };
}

export function setLevers(snapshot: MultiFundSnapshot, levers: Partial<MultiFundSnapshot["levers"]>): MultiFundSnapshot {
  return { ...snapshot, levers: { ...snapshot.levers, ...levers } };
}

export function resetToAdopted(): BudgetSnapshot {
  return {
    categoryAmounts: Object.fromEntries(categories.map((c) => [c.id, c.adoptedAmount])),
    revenueAmounts: Object.fromEntries(revenue.map((r) => [r.id, r.adoptedAmount])),
  };
}

export function getSliderBounds(cat: BudgetCategory): { min: number; max: number; step: number } {
  const step = cat.adoptedAmount > 10_000_000 ? 500_000 : cat.adoptedAmount > 1_000_000 ? 100_000 : 10_000;
  return {
    min: Math.max(0, Math.round(cat.adoptedAmount * 0.5)),
    max: Math.round(cat.adoptedAmount * 1.5),
    step,
  };
}

export function getRevenueSliderBounds(rev: RevenueItem): { min: number; max: number; step: number } {
  const maxPct = rev.maxDeltaPct ?? 5;
  return {
    min: Math.round(rev.adoptedAmount * (1 - maxPct / 100)),
    max: Math.round(rev.adoptedAmount * (1 + maxPct / 100)),
    step: rev.adoptedAmount > 50_000_000 ? 1_000_000 : 100_000,
  };
}

export function getUtilityTransferPct(snapshot: BudgetSnapshot): number {
  const transfer = snapshot.revenueAmounts["utility-contribution"] ?? meta.utilityContributionAdopted;
  const enterpriseTotal = categories
    .filter((c) => c.fundGroup === "enterprise")
    .reduce((s, c) => s + (snapshot.categoryAmounts[c.id] ?? c.adoptedAmount), 0);
  if (enterpriseTotal <= 0) return 0;
  return (transfer / enterpriseTotal) * 100;
}

export function validateUtilityCap(snapshot: BudgetSnapshot): string | null {
  const pct = getUtilityTransferPct(snapshot);
  if (pct > meta.utilityContributionCapPct + 0.5) {
    return `Utility contribution (${pct.toFixed(1)}%) exceeds the ${meta.utilityContributionCapPct}% Council cap.`;
  }
  return null;
}

export { meta, categories, revenue, totalAdoptedAppropriations };
