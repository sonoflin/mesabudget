import { Check, AlertTriangle, ArrowRight, ArrowDown, LayoutGrid, Share2, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { funds } from "../lib/funds-model";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { getCityProgress, getNextStep } from "../lib/guidance";
import { SHORT_NAMES } from "./FundNavigator";
import { InOutBar } from "./ui/InOutBar";

interface CityStatusRailProps {
  /** Open the finish/share summary (only meaningful when the city is balanced). */
  onFinish: () => void;
  /** Scroll the active fund's "how to balance" guidance into view. */
  onResolveActive: () => void;
}

const DOT: Record<string, string> = {
  balanced: "bg-mesa-blue",
  surplus: "bg-mesa-amber",
  deficit: "bg-mesa-red",
};

/**
 * Desktop "control tower": a sticky, always-visible panel that shows citywide
 * progress, the single best next action, and every fund's live status with
 * one-click jumps. This is the desktop counterpart to the mobile balance bar.
 */
export function CityStatusRail({ onFinish, onResolveActive }: CityStatusRailProps) {
  const balance = useBalance();
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const setFund = useBudgetStore((s) => s.setFund);
  const setMainView = useBudgetStore((s) => s.setMainView);

  const fbs = balance.fundBalances ?? [];
  const progress = getCityProgress(fbs);
  const next = getNextStep(fbs, activeFundId);

  const next_fb = next.fundId ? fbs.find((b) => b.fundId === next.fundId) : undefined;
  const cta =
    next.kind === "done"
      ? { label: "Review & share", icon: <Share2 className="h-4 w-4" />, onClick: onFinish }
      : next.kind === "fix-active"
        ? { label: "How to balance this fund", icon: <ArrowDown className="h-4 w-4" />, onClick: onResolveActive }
        : {
            label: `Fix ${SHORT_NAMES[next.fundId ?? ""] ?? next_fb?.fundName ?? "next fund"}`,
            icon: <ArrowRight className="h-4 w-4" />,
            onClick: () => next.fundId && setFund(next.fundId),
          };

  return (
    <section
      aria-label="Citywide budget status"
      className="rounded-2xl border border-mesa-ink/8 bg-mesa-surface shadow-mesa-sm"
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-mesa-ink">Citywide status</h3>
          <button
            type="button"
            onClick={() => setMainView("overview")}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-mesa-blue transition-colors hover:bg-mesa-blue/10"
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            All funds
          </button>
        </div>

        {/* Headline status */}
        <div className="mt-3 flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
              progress.allBalanced ? "bg-mesa-blue" : "bg-mesa-red",
            )}
            aria-hidden
          >
            {progress.allBalanced ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-bold leading-tight", progress.allBalanced ? "text-mesa-blue" : "text-mesa-red")}>
              {progress.allBalanced
                ? "All funds balanced"
                : `${progress.deficits.length} fund${progress.deficits.length === 1 ? "" : "s"} short`}
            </p>
            <p className="text-xs text-mesa-muted">{formatCurrency(balance.totalExpenditure, true)} total spending</p>
          </div>
        </div>

        {/* Progress toward an adoptable budget */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-mesa-muted">
            <span>Funds balanced</span>
            <span className="tabular-nums text-mesa-ink">{progress.balanced} / {progress.total}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-mesa-sand" role="img" aria-label={`${progress.balanced} of ${progress.total} funds balanced`}>
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", progress.allBalanced ? "bg-mesa-blue" : "bg-mesa-amber")}
              style={{ width: `${progress.ratio * 100}%` }}
            />
          </div>
        </div>

        {/* The one best next action */}
        <button
          type="button"
          onClick={cta.onClick}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]",
            progress.allBalanced ? "bg-mesa-blue hover:bg-mesa-blue-dark" : "bg-mesa-red hover:bg-mesa-red-dark",
          )}
        >
          {cta.icon}
          {cta.label}
        </button>
      </div>

      {/* Per-fund jump list */}
      <ul className="max-h-[40vh] overflow-y-auto border-t border-mesa-ink/8 p-2 scrollbar-none">
        {funds.map((fund) => {
          const fb = fbs.find((b) => b.fundId === fund.id);
          const status = fb?.status ?? "balanced";
          const isActive = fund.id === activeFundId;
          return (
            <li key={fund.id}>
              <button
                type="button"
                onClick={() => setFund(fund.id)}
                aria-current={isActive}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                  isActive ? "bg-mesa-blue/10" : "hover:bg-mesa-sand/80",
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[status])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-semibold", isActive ? "text-mesa-blue" : "text-mesa-ink")}>
                    {SHORT_NAMES[fund.id] ?? fund.name}
                  </span>
                  <span className="block text-[11px] text-mesa-muted tabular-nums">
                    {formatCurrency(fb?.totalExpenditure ?? 0, true)}
                  </span>
                </span>
                {status === "deficit" && (
                  <span className="shrink-0 rounded-full bg-mesa-red/12 px-1.5 py-0.5 text-[10px] font-bold text-mesa-red">
                    {formatCurrency(Math.abs(fb?.difference ?? 0), true)} short
                  </span>
                )}
                {status === "surplus" && (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-mesa-amber" aria-label="Has unallocated revenue" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Citywide money in vs out */}
      <div className="border-t border-mesa-ink/8 p-4">
        <p className="mb-2 text-xs font-semibold text-mesa-ink">Citywide money in vs out</p>
        <InOutBar inAmt={balance.totalRevenue} outAmt={balance.totalExpenditure} status={progress.allBalanced ? "balanced" : "deficit"} />
      </div>
    </section>
  );
}
