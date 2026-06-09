import { motion } from "framer-motion";
import { X, Check, TrendingUp, TrendingDown, Share2, Pencil, Home, AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";
import { MesaScape } from "./ui/MesaScape";
import { cn, formatCurrency, formatPct } from "../lib/utils";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { getCategoryDeltas, meta } from "../lib/budget-engine";
import { categories } from "../lib/budget-data";
import { getImpactForAllChanges } from "../lib/impact-engine";
import { calculateHouseholdImpact, getDefaultHousehold, calculateUtilityBillImpact } from "../lib/household-impact";
import { getCityProgress } from "../lib/guidance";

interface BudgetSummaryProps {
  onClose: () => void;
  onShare: () => void;
}

/**
 * The civic payoff: a shareable, screenshot-ready recap of what the user's
 * budget actually does to Mesa — the city-level counterpart to the personal
 * tax receipt. Surfaced when every fund is balanced.
 */
export function BudgetSummary({ onClose, onShare }: BudgetSummaryProps) {
  const balance = useBalance();
  const getLegacySnapshot = useBudgetStore((s) => s.getLegacySnapshot);
  const levers = useBudgetStore((s) => s.snapshot.levers);

  const progress = getCityProgress(balance.fundBalances ?? []);
  const legacy = getLegacySnapshot();
  const deltas = getCategoryDeltas(legacy).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const increases = deltas.filter((d) => d.delta > 0).slice(0, 3);
  const decreases = deltas.filter((d) => d.delta < 0).slice(0, 3);
  const impacts = getImpactForAllChanges(categories, legacy.categoryAmounts).slice(0, 3);

  const household = calculateHouseholdImpact(getDefaultHousehold(), levers);
  const utilDelta = calculateUtilityBillImpact(levers.utilityRateMultiplier).residentialAnnualDelta;
  const hhChanged = Math.abs(household.rateChangeDelta) >= 1;

  const ChangeRow = ({ name, delta, deltaPct, up }: { name: string; delta: number; deltaPct: number; up: boolean }) => (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-mesa-ink">{name}</span>
      <span className={cn("shrink-0 font-bold tabular-nums", up ? "text-mesa-amber" : "text-mesa-blue")}>
        {delta > 0 ? "+" : ""}{formatCurrency(delta, true)} <span className="font-medium opacity-70">({formatPct(deltaPct)})</span>
      </span>
    </li>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-mesa-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="my-0 w-full max-w-2xl overflow-hidden rounded-t-3xl bg-mesa-surface shadow-2xl sm:my-8 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative mesa-gradient-hero px-6 pb-7 pt-7 text-white sm:px-8">
          <MesaScape tone="light" sun className="absolute inset-x-0 bottom-0 h-28 w-full opacity-90" />
          <div className="mesa-grain absolute inset-0 opacity-[0.08] mix-blend-overlay" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                progress.allBalanced ? "bg-white text-mesa-blue" : "bg-white/20 text-white",
              )}
            >
              {progress.allBalanced ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {progress.allBalanced ? "Balanced budget" : `${progress.deficits.length} fund${progress.deficits.length === 1 ? "" : "s"} still short`}
            </span>
            <h2 id="summary-title" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {progress.allBalanced ? "You balanced Mesa's budget" : "Your Mesa budget so far"}
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-white/90">
              {formatCurrency(balance.totalExpenditure, true)} across {progress.total} funds for FY {meta.fiscalYear}.
              Here&apos;s what your choices would mean for the city.
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5 pb-safe-lg sm:p-7">
          {/* Household impact */}
          <div className="rounded-2xl border border-mesa-blue/15 bg-mesa-blue/5 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mesa-blue/15 text-mesa-blue" aria-hidden>
                <Home className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-mesa-ink">What it means for a typical household</h3>
            </div>
            {hhChanged ? (
              <p className="mt-2 text-sm text-mesa-ink">
                About{" "}
                <strong className={household.rateChangeDelta >= 0 ? "text-mesa-red" : "text-mesa-blue"}>
                  {household.rateChangeDelta >= 0 ? "+" : ""}{formatCurrency(household.rateChangeDelta)}/yr
                </strong>{" "}
                vs today
                {Math.abs(utilDelta) >= 1 && (
                  <> — utilities {utilDelta >= 0 ? "+" : ""}{formatCurrency(utilDelta)}/yr</>
                )}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-mesa-muted">
                No change to a typical household&apos;s bills — you balanced without raising rates or taxes.
              </p>
            )}
          </div>

          {/* Biggest changes vs adopted */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-mesa-ink/8 p-4">
              <div className="flex items-center gap-1.5 text-mesa-amber">
                <TrendingUp className="h-4 w-4" aria-hidden />
                <h3 className="text-sm font-bold">You boosted</h3>
              </div>
              {increases.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {increases.map((d) => <ChangeRow key={d.id} name={d.name} delta={d.delta} deltaPct={d.deltaPct} up />)}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-mesa-muted">No increases vs the adopted budget.</p>
              )}
            </div>
            <div className="rounded-2xl border border-mesa-ink/8 p-4">
              <div className="flex items-center gap-1.5 text-mesa-blue">
                <TrendingDown className="h-4 w-4" aria-hidden />
                <h3 className="text-sm font-bold">You trimmed</h3>
              </div>
              {decreases.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {decreases.map((d) => <ChangeRow key={d.id} name={d.name} delta={d.delta} deltaPct={d.deltaPct} up={false} />)}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-mesa-muted">No cuts vs the adopted budget.</p>
              )}
            </div>
          </div>

          {/* Service consequences */}
          {impacts.length > 0 && (
            <div className="rounded-2xl border border-mesa-ink/8 p-4">
              <h3 className="text-sm font-bold text-mesa-ink">What residents would notice</h3>
              <ul className="mt-2.5 space-y-2.5">
                {impacts.map((imp) => {
                  const cat = categories.find((c) => c.id === imp.categoryId);
                  return (
                    <li key={imp.categoryId} className="text-sm">
                      <span className="font-semibold text-mesa-ink">{cat?.name}</span>
                      <span className="text-mesa-muted"> — {imp.serviceLabel}</span>
                      {imp.headlines[0] && <p className="mt-0.5 text-xs text-mesa-muted">{imp.headlines[0]}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {deltas.length === 0 && (
            <p className="rounded-2xl bg-mesa-sand/70 px-4 py-3 text-center text-sm text-mesa-muted">
              Your budget currently matches the City&apos;s adopted budget. Adjust some categories to make it your own.
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              className="w-full sm:flex-1"
              size="lg"
              onClick={onShare}
              disabled={!progress.allBalanced}
            >
              <Share2 className="h-4 w-4" /> Share my budget
            </Button>
            <Button className="w-full sm:w-auto" size="lg" variant="outline" onClick={onClose}>
              <Pencil className="h-4 w-4" /> Keep editing
            </Button>
          </div>
          {!progress.allBalanced && (
            <p className="-mt-1 text-center text-xs text-mesa-muted">
              Balance every fund to unlock sharing.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
