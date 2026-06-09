import type { FundBalance } from "./fund-rules-engine";

/**
 * Shared "where do I stand / what next" logic so the desktop control-tower rail,
 * the city overview, and the mobile balance bar all give identical guidance.
 */

export interface CityProgress {
  total: number;
  balanced: number;
  deficits: FundBalance[];
  surpluses: FundBalance[];
  /** City is adoptable when no fund is in deficit (surpluses are allowed). */
  allBalanced: boolean;
  /** 0–1 share of funds that are not in deficit. */
  ratio: number;
}

export function getCityProgress(fundBalances: FundBalance[] = []): CityProgress {
  const total = fundBalances.length;
  const deficits = fundBalances.filter((b) => b.status === "deficit");
  const surpluses = fundBalances.filter((b) => b.status === "surplus");
  const balanced = total - deficits.length;
  return {
    total,
    balanced,
    deficits,
    surpluses,
    allBalanced: deficits.length === 0,
    ratio: total > 0 ? balanced / total : 1,
  };
}

export type NextStepKind = "done" | "fix-active" | "fix-fund";

export interface NextStep {
  kind: NextStepKind;
  /** Target fund for "fix-fund" jumps. */
  fundId?: string;
}

/**
 * The single most useful action right now, mirroring the mobile balance bar:
 *  - everything balanced → you're done (review / share)
 *  - the fund you're looking at is short → show how to close its gap
 *  - another fund is short → jump to it
 */
export function getNextStep(
  fundBalances: FundBalance[] = [],
  activeFundId?: string,
): NextStep {
  const { allBalanced, deficits } = getCityProgress(fundBalances);
  if (allBalanced) return { kind: "done" };

  const activeIsDeficit = deficits.some((d) => d.fundId === activeFundId);
  if (activeIsDeficit) return { kind: "fix-active" };

  return { kind: "fix-fund", fundId: deficits[0]?.fundId };
}
