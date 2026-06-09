import { ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";
import { Card } from "./ui/Card";
import { cn, formatCurrency } from "../lib/utils";
import { useBudgetStore, useActiveFund } from "../store/budget-store";

const TOL = 1000;

/**
 * Always-on "your plan vs the adopted budget" for the fund being edited. Keeps
 * the core civic comparison glanceable while you drag sliders, instead of
 * hiding it behind a toggle at the bottom of the page.
 */
export function FundCompareCard() {
  const fund = useActiveFund();
  const snapshot = useBudgetStore((s) => s.snapshot);
  const fundSnap = snapshot.funds[fund.id];

  const rows = fund.expenditures
    .map((e) => {
      const current = fundSnap?.expenditureAmounts[e.id] ?? e.adoptedAmount;
      return { id: e.id, name: e.name, adopted: e.adoptedAmount, current, delta: current - e.adoptedAmount };
    })
    .filter((r) => Math.abs(r.delta) > TOL)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const totalAdopted = fund.expenditures.reduce((s, e) => s + e.adoptedAmount, 0);
  const totalCurrent = fund.expenditures.reduce(
    (s, e) => s + (fundSnap?.expenditureAmounts[e.id] ?? e.adoptedAmount),
    0,
  );
  const totalDelta = totalCurrent - totalAdopted;

  return (
    <Card className="space-y-3 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-mesa-ink lg:text-base">Your plan vs adopted</h3>
          <p className="text-xs text-mesa-muted">How this fund differs from what Council passed</p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "inline-flex items-center gap-1 text-sm font-extrabold tabular-nums",
              Math.abs(totalDelta) <= TOL ? "text-mesa-muted" : totalDelta > 0 ? "text-mesa-amber" : "text-mesa-blue",
            )}
          >
            {Math.abs(totalDelta) <= TOL ? (
              <Equal className="h-3.5 w-3.5" aria-hidden />
            ) : totalDelta > 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
            )}
            {totalDelta > 0 ? "+" : ""}
            {formatCurrency(totalDelta, true)}
          </div>
          <div className="text-[11px] font-medium text-mesa-muted">vs adopted</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-mesa-sand/70 px-3 py-2.5 text-xs text-mesa-muted">
          This fund matches the City&apos;s adopted budget. Drag a slider to see how your choices compare.
        </p>
      ) : (
        <ul className="space-y-1.5 border-t border-mesa-ink/5 pt-3">
          {rows.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-mesa-ink">{r.name}</span>
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  r.delta > 0 ? "text-mesa-amber" : "text-mesa-blue",
                )}
              >
                {r.delta > 0 ? "+" : ""}
                {formatCurrency(r.delta, true)}
              </span>
            </li>
          ))}
          {rows.length > 6 && (
            <li className="pt-0.5 text-[11px] text-mesa-muted">+{rows.length - 6} more changed</li>
          )}
        </ul>
      )}
    </Card>
  );
}
