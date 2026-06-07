import type { Fund } from "./funds-model";
import { PRIORITY_AREAS } from "./priorities-engine";

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
  adopted: number;
  color: string;
  /** Expenditure line ids in this slice — for scroll / highlight. */
  lineIds: string[];
}

/** Brand-aligned slice colors (General Fund priority areas). */
const GF_AREA_COLORS: Record<string, string> = {
  "public-safety": "#aa272f",
  parks: "#2a6ebb",
  "library-culture": "#e5821e",
  community: "#1f5494",
  transit: "#3d4f5f",
  internal: "#6b7280",
};

/** Fallback palette for other multi-line funds. */
const GENERIC_COLORS = [
  "#2a6ebb",
  "#aa272f",
  "#e5821e",
  "#1f5494",
  "#3d4f5f",
  "#6b7280",
  "#8a1f26",
  "#f0a04a",
];

function shortLabel(name: string): string {
  return name
    .replace(/^Mesa /, "")
    .replace(/ Department$/, "")
    .replace(/ \(to Transit Fund\)$/, "");
}

function sumLines(
  lineIds: string[],
  amounts: Record<string, number>,
  fund: Fund,
  field: "current" | "adopted",
): number {
  return lineIds.reduce((sum, id) => {
    const exp = fund.expenditures.find((e) => e.id === id);
    if (!exp) return sum;
    return sum + (field === "current" ? (amounts[id] ?? exp.adoptedAmount) : exp.adoptedAmount);
  }, 0);
}

export function getAllocationSlices(fund: Fund, amounts: Record<string, number>): AllocationSlice[] {
  if (fund.id === "general-fund") {
    return PRIORITY_AREAS.map((area) => ({
      id: area.id,
      label: area.label,
      value: sumLines(area.lineIds, amounts, fund, "current"),
      adopted: sumLines(area.lineIds, amounts, fund, "adopted"),
      color: GF_AREA_COLORS[area.id] ?? "#2a6ebb",
      lineIds: area.lineIds,
    })).filter((s) => s.value > 0);
  }

  const internal = fund.expenditures.filter((e) => e.group === "internal-services");
  const slices: AllocationSlice[] = [];
  let colorIdx = 0;

  if (internal.length > 0) {
    const ids = internal.map((e) => e.id);
    slices.push({
      id: "internal-services",
      label: "Internal & Support",
      value: sumLines(ids, amounts, fund, "current"),
      adopted: sumLines(ids, amounts, fund, "adopted"),
      color: GENERIC_COLORS[colorIdx++ % GENERIC_COLORS.length],
      lineIds: ids,
    });
  }

  for (const exp of fund.expenditures) {
    if (exp.group === "internal-services") continue;
    slices.push({
      id: exp.id,
      label: shortLabel(exp.name),
      value: amounts[exp.id] ?? exp.adoptedAmount,
      adopted: exp.adoptedAmount,
      color: GENERIC_COLORS[colorIdx++ % GENERIC_COLORS.length],
      lineIds: [exp.id],
    });
  }

  return slices.filter((s) => s.value > 0);
}

/** Funds with enough distinct spending areas to benefit from a mix chart. */
export function shouldShowAllocationChart(fund: Fund): boolean {
  if (fund.id === "general-fund") return true;
  const internal = fund.expenditures.some((e) => e.group === "internal-services");
  const topLevel = fund.expenditures.filter((e) => e.group !== "internal-services").length;
  return topLevel + (internal ? 1 : 0) >= 3;
}

export function sliceForLineId(slices: AllocationSlice[], lineId: string): AllocationSlice | undefined {
  return slices.find((s) => s.lineIds.includes(lineId));
}
