import impactData from "../../data/impact-rubrics.json";
import type { BudgetCategory } from "./budget-data";

export interface ServiceLevel {
  level: number;
  label: string;
  description: string;
}

export interface ImpactResult {
  categoryId: string;
  serviceLevel: number;
  serviceLabel: string;
  headlines: string[];
  details: string[];
  unitEstimate?: string;
  realWorldExample?: string;
}

interface CategoryRubric {
  unitLabel: string;
  unitCost: number;
  baselineServiceLevel: number;
  levels: ServiceLevel[];
  thresholds: {
    deltaPctMin: number;
    deltaPctMax: number;
    headlines: string[];
    details: string[];
  }[];
  realWorldExample?: string;
}

const rubrics = impactData.categories as Record<string, CategoryRubric>;

const RUBRIC_ALIASES: Record<string, string> = {
  "transit-gf-transfer": "transit-operations",
  "transit-fund": "transit-operations",
  "police-restricted": "police",
  "fire-restricted": "fire-medical",
  "parks-restricted": "parks-recreation",
  "city-manager": "internal-services",
  "business-services": "internal-services",
  "internal-other": "internal-services",
};

export function getImpactForCategory(
  categoryId: string,
  adoptedAmount: number,
  currentAmount: number,
): ImpactResult | null {
  const rubric = rubrics[categoryId] ?? rubrics[RUBRIC_ALIASES[categoryId] ?? ""];
  if (!rubric) return null;

  const deltaPct = adoptedAmount ? ((currentAmount - adoptedAmount) / adoptedAmount) * 100 : 0;
  const threshold = rubric.thresholds.find(
    (t) => deltaPct >= t.deltaPctMin && deltaPct <= t.deltaPctMax,
  ) ?? rubric.thresholds[Math.floor(rubric.thresholds.length / 2)];

  const levelOffset = deltaPct > 10 ? 1 : deltaPct > 3 ? 0 : deltaPct < -10 ? -1 : deltaPct < -3 ? 0 : 0;
  const rawLevel = rubric.baselineServiceLevel + levelOffset;
  const serviceLevel = Math.max(1, Math.min(5, rawLevel));
  const levelInfo = rubric.levels.find((l) => l.level === serviceLevel) ?? rubric.levels[2];

  const deltaDollars = currentAmount - adoptedAmount;
  let unitEstimate: string | undefined;
  if (rubric.unitCost > 0 && Math.abs(deltaDollars) > rubric.unitCost * 0.5) {
    const units = Math.round(Math.abs(deltaDollars) / rubric.unitCost);
    unitEstimate = `≈ ${units.toLocaleString()} ${rubric.unitLabel}${units !== 1 ? "s" : ""} ${deltaDollars > 0 ? "added" : "removed"}`;
  }

  return {
    categoryId,
    serviceLevel,
    serviceLabel: levelInfo.label,
    headlines: threshold.headlines,
    details: threshold.details,
    unitEstimate,
    realWorldExample: rubric.realWorldExample,
  };
}

export function getImpactForAllChanges(
  categories: BudgetCategory[],
  amounts: Record<string, number>,
): ImpactResult[] {
  return categories
    .map((c) => getImpactForCategory(c.id, c.adoptedAmount, amounts[c.id] ?? c.adoptedAmount))
    .filter((r): r is ImpactResult => r !== null && Math.abs((amounts[r.categoryId] ?? 0) - (categories.find((x) => x.id === r.categoryId)?.adoptedAmount ?? 0)) > 1000);
}

export function hasRubric(categoryId: string): boolean {
  return categoryId in rubrics;
}

export { impactData };
