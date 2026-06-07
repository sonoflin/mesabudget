import { formatCurrency } from "../lib/utils";
import { meta } from "../lib/budget-engine";
import { useBudgetStore } from "../store/budget-store";
import { getUtilityTransferPct } from "../lib/budget-engine";

export function UtilityTransferGauge() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  const pct = getUtilityTransferPct(snapshot);
  const cap = meta.utilityContributionCapPct;
  const adopted = meta.utilityContributionAdopted;
  const current = snapshot.revenueAmounts["utility-contribution"] ?? adopted;
  const overCap = pct > cap;

  return (
    <div className="rounded-2xl border border-mesa-green/20 bg-gradient-to-br from-mesa-green/5 to-transparent p-4">
      <h3 className="font-semibold text-mesa-slate">Utility Fund Contribution</h3>
      <p className="mt-1 text-xs text-mesa-muted">
        Council cap: {cap}% of utility revenues (25% public safety + 5% general services)
      </p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-mesa-green">{formatCurrency(current, true)}</div>
          <div className="text-xs text-mesa-muted">Adopted: {formatCurrency(adopted, true)}</div>
        </div>
        <div className={`text-right text-sm font-bold ${overCap ? "text-mesa-danger" : "text-mesa-success"}`}>
          {pct.toFixed(1)}% of enterprise
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${overCap ? "bg-mesa-danger" : "bg-mesa-green"}`}
          style={{ width: `${Math.min(100, (pct / cap) * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-mesa-muted">
        <span>0%</span>
        <span>{cap}% cap</span>
      </div>
      {overCap && (
        <p className="mt-2 text-xs font-medium text-mesa-danger">
          Exceeds legal transfer cap — reduce utility contribution or increase enterprise revenues.
        </p>
      )}
      <p className="mt-2 text-xs text-mesa-muted">
        This transfer helps fund police, fire, libraries, and parks without raising property taxes.
      </p>
    </div>
  );
}
