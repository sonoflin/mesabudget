import { funds } from "./funds-model";
import type { FundLine } from "./funds-model";

export interface PriorityArea {
  id: string;
  label: string;
  icon: string;
  color: string;
  lineIds: string[];
  dedicatedNote: string;
  breakdown?: { id: string; label: string }[];
}

const GF = funds.find((f) => f.id === "general-fund")!;
const gfExp = (id: string): FundLine | undefined => GF.expenditures.find((e) => e.id === id);

export const PRIORITY_AREAS: PriorityArea[] = [
  {
    id: "public-safety",
    label: "Public Safety",
    icon: "shield",
    color: "mesa-red",
    lineIds: ["police", "fire-medical", "municipal-court"],
    dedicatedNote:
      "Police & Fire also receive the voter-approved Public Safety Sales Tax and Quality of Life Sales Tax — those dedicated dollars are on top of this General Fund share.",
    breakdown: [
      { id: "police", label: "Police" },
      { id: "fire-medical", label: "Fire & Medical" },
      { id: "municipal-court", label: "Municipal Court" },
    ],
  },
  {
    id: "parks",
    label: "Parks, Rec & Pools",
    icon: "trees",
    color: "mesa-blue",
    lineIds: ["parks-recreation"],
    dedicatedNote: "Pools and many park improvements are also supported by the Quality of Life Sales Tax.",
  },
  {
    id: "library-culture",
    label: "Library & Culture",
    icon: "book",
    color: "mesa-amber",
    lineIds: ["library", "arts-culture"],
    dedicatedNote: "Most arts & culture (Mesa Arts Center) is funded by the Quality of Life Sales Tax, not the General Fund.",
  },
  {
    id: "community",
    label: "Community & Development",
    icon: "heart",
    color: "mesa-blue",
    lineIds: ["community-services", "development-services"],
    dedicatedNote: "Development Services is largely funded by permit fees; community programs leverage federal grants.",
  },
  {
    id: "transit",
    label: "Transit Subsidy",
    icon: "bus",
    color: "mesa-slate",
    lineIds: ["transit-gf-transfer"],
    dedicatedNote:
      "Most transit cost (~$34M) is covered by regional Prop 400/479 funds. This is only the General Fund's share for Mesa-only routes, Ride Choice paratransit, and light rail.",
  },
  {
    id: "internal",
    label: "Internal & Support",
    icon: "settings",
    color: "mesa-slate",
    lineIds: [
      "it-innovation", "human-resources", "financial-services", "city-manager",
      "city-attorney", "engineering", "facilities", "economic-development",
      "business-services", "internal-other", "gf-other-departments",
    ],
    dedicatedNote: "Keeps every department staffed, paid, insured, and legal — including 911 dispatch systems, payroll, and contracts.",
  },
];

export function getGeneralFundTotal(): number {
  return GF.expenditures.reduce((s, e) => s + e.adoptedAmount, 0);
}

export interface AdoptedArea extends PriorityArea {
  adopted: number;
  adoptedPct: number;
}

export function getAdoptedAreas(): AdoptedArea[] {
  const total = getGeneralFundTotal();
  return PRIORITY_AREAS.map((area) => {
    const adopted = area.lineIds.reduce((s, id) => s + (gfExp(id)?.adoptedAmount ?? 0), 0);
    return { ...area, adopted, adoptedPct: total > 0 ? (adopted / total) * 100 : 0 };
  });
}

/** Dollars a sub-line received at adoption (for breakdown defaults). */
export function getAdoptedFor(lineId: string): number {
  return gfExp(lineId)?.adoptedAmount ?? 0;
}

/**
 * Convert target priority percentages (which need not sum to 100 — they are
 * normalized here) into concrete General Fund expenditure amounts. Each line is
 * held within +/-50% of its adopted amount to stay realistic, matching the sliders.
 */
export function allocateToExpenditures(
  areaPcts: Record<string, number>,
  subPcts?: Record<string, number>,
): Record<string, number> {
  const total = getGeneralFundTotal();
  const sumPct = Object.values(areaPcts).reduce((s, v) => s + (v || 0), 0) || 1;
  const result: Record<string, number> = {};

  for (const area of PRIORITY_AREAS) {
    const normPct = ((areaPcts[area.id] ?? 0) / sumPct) * 100;
    const areaTarget = (normPct / 100) * total;

    const lines = area.lineIds.map((id) => gfExp(id)).filter((l): l is FundLine => Boolean(l));
    const fixed = lines.filter((l) => !l.adjustable);
    const adj = lines.filter((l) => l.adjustable);
    const fixedSum = fixed.reduce((s, l) => s + l.adoptedAmount, 0);
    fixed.forEach((l) => { result[l.id] = l.adoptedAmount; });

    const adjTarget = Math.max(0, areaTarget - fixedSum);
    const useSub = !!subPcts && adj.every((l) => typeof subPcts[l.id] === "number");
    const weightSum = useSub
      ? adj.reduce((s, l) => s + (subPcts![l.id] || 0), 0) || 1
      : adj.reduce((s, l) => s + l.adoptedAmount, 0) || 1;

    for (const l of adj) {
      const w = useSub ? (subPcts![l.id] || 0) : l.adoptedAmount;
      const raw = adjTarget * (w / weightSum);
      const clamped = Math.max(l.adoptedAmount * 0.5, Math.min(l.adoptedAmount * 1.5, raw));
      result[l.id] = Math.round(clamped);
    }
  }
  return result;
}
