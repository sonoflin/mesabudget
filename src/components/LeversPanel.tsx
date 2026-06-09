import { SlidersHorizontal, ArrowRight } from "lucide-react";
import { useBudgetStore } from "../store/budget-store";
import {
  UtilityRatesLever,
  UtilityTransferLever,
  SalesTaxBallotLever,
} from "./RevenueLevers";

/**
 * Embedded revenue levers for the fund detail view. Only the General Fund and
 * Utility Enterprise are driven by Council levers, so this surfaces just the
 * controls relevant to the active fund. They share global state with the
 * dedicated Revenue tab — adjusting one updates the other instantly.
 */
export function LeversPanel({ readOnly }: { readOnly?: boolean }) {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const setMainView = useBudgetStore((s) => s.setMainView);

  const isGeneral = activeFundId === "general-fund";
  const isUtility = activeFundId === "utility-enterprise";
  if (!isGeneral && !isUtility) return null;

  return (
    <section aria-label="Revenue levers" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mesa-blue/10 text-mesa-blue" aria-hidden>
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold text-mesa-ink xl:text-lg">Revenue levers</h3>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setMainView("revenue")}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-mesa-blue transition-colors hover:bg-mesa-blue/10"
          >
            All levers
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      <p className="text-xs text-mesa-muted">
        The same controls live in the <span className="font-semibold text-mesa-ink">Revenue</span> tab — adjust them here
        or there and every fund updates together.
      </p>

      <div className="space-y-3">
        <UtilityRatesLever />
        {isGeneral && <UtilityTransferLever />}
        {isGeneral && <SalesTaxBallotLever />}
      </div>
    </section>
  );
}
