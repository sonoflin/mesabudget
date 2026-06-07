import { TrendingUp, GitCompare, Share2, ArrowRight, ArrowDown, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { cn, formatCurrency } from "../lib/utils";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { SHORT_NAMES } from "./FundNavigator";

interface BalanceBarProps {
  onShare: () => void;
  onToggleForecast: () => void;
  onToggleCompare: () => void;
  showForecast: boolean;
  showCompare: boolean;
}

/**
 * Persistent, guided status bar for mobile. Always shows the active fund's live
 * balance and a single contextual "next best step": close the active fund's gap,
 * jump to the next unbalanced fund, or share once everything balances. This keeps
 * the most important feedback next to the thumb while the user drags sliders.
 */
export function BalanceBar({
  onShare,
  onToggleForecast,
  onToggleCompare,
  showForecast,
  showCompare,
}: BalanceBarProps) {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const setFund = useBudgetStore((s) => s.setFund);
  const balance = useBalance();

  const fundBalances = balance.fundBalances ?? [];
  const activeFb = fundBalances.find((b) => b.fundId === activeFundId);
  const deficits = fundBalances.filter((b) => b.status === "deficit");
  const total = fundBalances.length;
  const allBalanced = balance.isBalanced;

  const activeStatus = activeFb?.status ?? "balanced";
  const activeDot =
    activeStatus === "deficit" ? "bg-mesa-red" : activeStatus === "surplus" ? "bg-mesa-amber" : "bg-mesa-blue";
  const activeText =
    activeStatus === "deficit" ? "text-mesa-red" : activeStatus === "surplus" ? "text-mesa-amber" : "text-mesa-blue";
  const activeLabel =
    activeStatus === "deficit"
      ? `${formatCurrency(Math.abs(activeFb?.difference ?? 0), true)} short`
      : activeStatus === "surplus"
        ? `${formatCurrency(Math.abs(activeFb?.difference ?? 0), true)} to allocate`
        : "Balanced";

  const cityLine = allBalanced
    ? "City budget balanced — ready to share"
    : `${deficits.length} of ${total} fund${deficits.length === 1 ? "" : "s"} still short`;

  const scrollToResolver = () => {
    document.getElementById("fund-balance-resolver")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nextDeficit = deficits[0];
  type Action = { label: string; onClick: () => void; variant: "primary" | "secondary"; icon: React.ReactNode };
  const action: Action = allBalanced
    ? { label: "Share", onClick: onShare, variant: "primary", icon: <Share2 className="h-4 w-4" /> }
    : activeStatus === "deficit"
      ? { label: "How to balance", onClick: scrollToResolver, variant: "secondary", icon: <ArrowDown className="h-4 w-4" /> }
      : {
          label: `Fix ${SHORT_NAMES[nextDeficit?.fundId ?? ""] ?? nextDeficit?.fundName ?? "next fund"}`,
          onClick: () => nextDeficit && setFund(nextDeficit.fundId),
          variant: "primary",
          icon: <ArrowRight className="h-4 w-4" />,
        };

  // Ambient "money out vs in" fill for the active fund.
  const inAmt = activeFb?.totalRevenue ?? 0;
  const outAmt = activeFb?.totalExpenditure ?? 0;
  const ratioMax = Math.max(inAmt, outAmt, 1);

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 glass-header border-t border-mesa-ink/10 lg:hidden">
      <div className="h-1 w-full bg-mesa-sand" aria-hidden>
        <div
          className={cn("h-full transition-[width] duration-500 ease-out", activeDot)}
          style={{ width: `${(outAmt / ratioMax) * 100}%` }}
        />
      </div>

      <div className="px-3 pt-2 pb-safe sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="min-w-0 flex-1" role="status" aria-live="polite">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white",
                  activeDot,
                )}
                aria-hidden
              >
                {activeStatus === "balanced" && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className={cn("truncate text-sm font-bold", activeText)}>{activeLabel}</span>
            </div>
            <p className="truncate text-[11px] font-medium text-mesa-muted">{cityLine}</p>
          </div>

          <button
            type="button"
            onClick={onToggleForecast}
            aria-pressed={showForecast}
            aria-label="Toggle 5-year forecast"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
              showForecast ? "bg-mesa-blue/10 text-mesa-blue" : "text-mesa-slate hover:bg-mesa-ink/5",
            )}
          >
            <TrendingUp className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={showCompare}
            aria-label="Toggle comparison with adopted budget"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
              showCompare ? "bg-mesa-blue/10 text-mesa-blue" : "text-mesa-slate hover:bg-mesa-ink/5",
            )}
          >
            <GitCompare className="h-[18px] w-[18px]" />
          </button>

          <Button variant={action.variant} size="md" className="shrink-0" onClick={action.onClick}>
            {action.icon}
            <span className="max-w-[8.5rem] truncate">{action.label}</span>
          </Button>
        </div>
      </div>
    </footer>
  );
}
