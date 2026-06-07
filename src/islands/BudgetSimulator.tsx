import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { LayoutGrid, GraduationCap, RotateCcw } from "lucide-react";
import { funds } from "../lib/funds-model";
import { categories } from "../lib/budget-data";
import { useBudgetStore, useActiveFund, useBalance } from "../store/budget-store";
import { BalanceMeter } from "../components/BalanceMeter";
import { ExpenditureCard, FundTeachingCard } from "../components/CategoryCard";
import { FundNavigator, FundHeader } from "../components/FundNavigator";
import { InternalServicesGroup } from "../components/InternalServicesGroup";
import { RevenuePanel } from "../components/RevenuePanel";
import { BalanceResolver } from "../components/BalanceResolver";
import { LeversPanel } from "../components/LeversPanel";
import { ImpactDrawer } from "../components/ImpactDrawer";
import { OnboardingModal } from "../components/OnboardingModal";
import { ShareDialog } from "../components/ShareDialog";
import { CompareView } from "../components/CompareView";
import { BalanceBar } from "../components/BalanceBar";
const ForecastChart = lazy(() => import("../components/ForecastChart").then((m) => ({ default: m.ForecastChart })));
import { TaxpayerReceipt } from "../components/TaxpayerReceipt";
import { PrioritiesMode } from "../components/PrioritiesMode";
import { TeachingMoment } from "../components/ImpactInline";
import { Button } from "../components/ui/Button";
import { cn, withBase } from "../lib/utils";
import { meta } from "../lib/budget-engine";

interface BudgetSimulatorProps {
  initialSnapshot?: {
    title?: string;
    authorName?: string;
    categoryAmounts: Record<string, number>;
    revenueAmounts: Record<string, number>;
    multiFund?: unknown;
  };
  readOnly?: boolean;
}

/** Shared content width + responsive gutters for the app shell. */
const SHELL = "mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8";

export default function BudgetSimulator({ initialSnapshot, readOnly }: BudgetSimulatorProps) {
  const {
    snapshot,
    activeCategoryId,
    onboardingDone,
    lastViolation,
    showForecast,
    showCompare,
    step,
    setCategory,
    updateExpenditure,
    applyGeneralFundAllocation,
    reset,
    completeOnboarding,
    loadSnapshot,
    clearViolation,
    setShowForecast,
    setShowCompare,
    setStep,
  } = useBudgetStore();

  const activeFund = useActiveFund();
  const balance = useBalance();
  const activeFb = balance.fundBalances?.find((b) => b.fundId === activeFund.id);
  const [showShare, setShowShare] = useState(false);

  // Reset is destructive (it discards the whole budget), so require a quick
  // confirm: first click arms it, a second click within 3s actually resets.
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleReset = () => {
    if (confirmReset) {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setConfirmReset(false);
      reset();
    } else {
      setConfirmReset(true);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
    }
  };
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  useEffect(() => {
    if (initialSnapshot) {
      if (initialSnapshot.multiFund) {
        loadSnapshot(initialSnapshot.multiFund as Parameters<typeof loadSnapshot>[0]);
      } else {
        loadSnapshot(initialSnapshot);
      }
    }
  }, []);

  const fundSnap = snapshot.funds[activeFund.id];
  const iconMap = Object.fromEntries(categories.map((c) => [c.id, c.icon]));
  const descMap = Object.fromEntries(categories.map((c) => [c.id, c.description]));

  if (step === "receipt" && !readOnly) {
    return (
      <div className="flex min-h-screen items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <TaxpayerReceipt onStart={() => { setStep("explore"); completeOnboarding(); }} />
      </div>
    );
  }

  if (step === "priorities" && !readOnly) {
    return (
      <PrioritiesMode
        onApply={(amounts) => applyGeneralFundAllocation(amounts)}
        onCancel={() => { setStep("explore"); completeOnboarding(); }}
      />
    );
  }

  const expenditureCards = (() => {
    const internalExps = activeFund.expenditures.filter((e) => e.group === "internal-services");
    const firstInternalId = internalExps[0]?.id;
    return activeFund.expenditures.map((exp) => {
      if (exp.group === "internal-services") {
        if (exp.id !== firstInternalId) return null;
        return (
          <InternalServicesGroup
            key="internal-services"
            fund={activeFund}
            exps={internalExps}
            amounts={fundSnap?.expenditureAmounts ?? {}}
            iconMap={iconMap}
            descMap={descMap}
            activeCategoryId={activeCategoryId}
            readOnly={readOnly}
            onChange={(expId, amt) => !readOnly && updateExpenditure(activeFund.id, expId, amt)}
            onDetails={(expId) => setCategory(expId)}
          />
        );
      }
      const amount = fundSnap?.expenditureAmounts[exp.id] ?? exp.adoptedAmount;
      return (
        <ExpenditureCard
          key={exp.id}
          fund={activeFund}
          expId={exp.id}
          name={exp.name}
          icon={iconMap[exp.id] ?? "layers"}
          adoptedAmount={exp.adoptedAmount}
          amount={amount}
          adjustable={exp.adjustable && !readOnly}
          description={descMap[exp.id] ?? ""}
          onChange={(amt) => !readOnly && updateExpenditure(activeFund.id, exp.id, amt)}
          onDetails={() => setCategory(exp.id)}
          selected={activeCategoryId === exp.id}
          readOnly={readOnly}
        />
      );
    });
  })();

  return (
    <div className="min-h-screen pb-28 lg:pb-12">
      {!readOnly && !onboardingDone && step !== "receipt" && step !== "priorities" && (
        <OnboardingModal
          onComplete={completeOnboarding}
          onReceipt={() => setStep("receipt")}
          onPriorities={() => setStep("priorities")}
        />
      )}

      <header className="sticky top-0 z-40 glass-header border-b border-mesa-ink/10 shadow-mesa-sm">
        <div className="mesa-accent-bar h-[3px] w-full" aria-hidden />
        <div className={cn(SHELL, "flex h-16 items-center justify-between gap-3 lg:h-[68px]")}>
          <a
            href={withBase()}
            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-mesa-blue lg:gap-3.5"
            aria-label="Mesa Budget Simulator — home"
          >
            <img src={withBase("mesa-logo.png")} alt="City of Mesa" className="h-9 w-auto shrink-0 lg:h-10" />
            <span className="hidden h-9 w-px bg-mesa-ink/10 sm:block lg:h-10" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold leading-tight tracking-tight text-mesa-ink lg:text-[17px]">
                {readOnly ? (
                  snapshot.title ?? "Shared Budget"
                ) : (
                  <>
                    <span className="sm:hidden">Mesa Budget</span>
                    <span className="hidden sm:inline">Mesa Budget Simulator</span>
                  </>
                )}
              </span>
              <span className="block truncate text-xs font-medium text-mesa-muted lg:text-[13px]">
                {readOnly ? "Shared budget" : `FY ${meta.fiscalYear} · Operating budget`}
              </span>
            </span>
          </a>

          {!readOnly && (
            <div className="hidden min-w-0 flex-1 justify-center md:flex">
              <BalanceMeter variant="pill" />
            </div>
          )}

          <nav className="flex shrink-0 items-center gap-1 lg:gap-1.5" aria-label="Site and budget actions">
            <a
              href={withBase("gallery")}
              aria-label="Gallery"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-mesa-slate transition-colors hover:bg-mesa-ink/5 xl:px-3"
            >
              <LayoutGrid className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="hidden xl:inline">Gallery</span>
            </a>
            <a
              href={withBase("learn")}
              aria-label="Learn"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-mesa-slate transition-colors hover:bg-mesa-ink/5 xl:px-3"
            >
              <GraduationCap className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="hidden xl:inline">Learn</span>
            </a>
            {!readOnly && (
              <>
                <span className="mx-1 hidden h-6 w-px bg-mesa-ink/10 lg:block" aria-hidden />
                <div className="hidden items-center gap-1.5 lg:flex">
                  <Button variant={showCompare ? "primary" : "outline"} size="sm" onClick={() => setShowCompare(!showCompare)}>
                    Compare
                  </Button>
                  <Button variant={showForecast ? "primary" : "outline"} size="sm" onClick={() => setShowForecast(!showForecast)}>
                    Forecast
                  </Button>
                  <Button size="sm" onClick={() => setShowShare(true)} disabled={!balance.isBalanced}>
                    Share
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={confirmReset ? "Confirm reset budget" : "Reset budget"}
                  onClick={handleReset}
                  className={cn("px-2.5 md:px-3", confirmReset ? "text-mesa-red" : "text-mesa-slate hover:text-mesa-red")}
                >
                  {confirmReset ? (
                    <span className="text-xs font-bold">Reset?</span>
                  ) : (
                    <>
                      <RotateCcw className="h-[18px] w-[18px] shrink-0 md:hidden" aria-hidden />
                      <span className="hidden md:inline">Reset</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </nav>
        </div>

        {!readOnly && (
          <div className="border-t border-mesa-ink/8 bg-mesa-sand/50">
            <div className={cn(SHELL, "py-2.5 lg:py-3")}>
              <FundNavigator />
            </div>
          </div>
        )}
      </header>

      <main className={cn(SHELL, "py-5 lg:py-8")}>
        {lastViolation && (
          <div className="mb-4">
            <TeachingMoment message={lastViolation} severity="error" onDismiss={clearViolation} />
          </div>
        )}

        <FundHeader />

        {!readOnly && activeFund.id === "general-fund" && (
          <button
            type="button"
            onClick={() => setStep("priorities")}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-mesa-blue/25 bg-gradient-to-r from-mesa-blue/10 to-mesa-blue/0 px-4 py-3.5 text-left transition-all hover:border-mesa-blue/40 hover:from-mesa-blue/15 lg:px-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mesa-blue/15 text-mesa-blue" aria-hidden>
                <LayoutGrid className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-semibold text-mesa-ink lg:text-[15px]">
                Prefer to start big-picture?{" "}
                <span className="text-mesa-blue">Allocate the General Fund by priorities</span>
              </span>
            </span>
            <span className="shrink-0 text-lg text-mesa-blue" aria-hidden>→</span>
          </button>
        )}

        {/* Balance guidance sits right under the fund's status and above the
            spending controls it refers to. Anchored for the Balance Bar jump. */}
        {!readOnly && activeFb && activeFb.status !== "balanced" && (
          <div id="fund-balance-resolver" className="mt-4 scroll-mt-24 lg:mt-5">
            <BalanceResolver />
          </div>
        )}

        <div className="mt-5 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-8">
          {/* PRIMARY TASK — leads the page on mobile, right column on desktop */}
          <section className="min-w-0 lg:col-start-2 lg:row-start-1" aria-label="Expenditure categories">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-mesa-ink xl:text-lg">Adjust spending</h3>
              <span className="truncate text-xs font-medium text-mesa-muted">{activeFund.name}</span>
            </div>
            <div className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-5 xl:space-y-0">
              {expenditureCards}
            </div>
          </section>

          {/* SUPPORTING CONTEXT — below spending on mobile, left column on desktop */}
          <aside className="mt-8 min-w-0 space-y-4 lg:mt-0 lg:col-start-1 lg:row-start-1 lg:space-y-5">
            <div>
              <h3 className="text-base font-bold text-mesa-ink xl:text-lg">How this fund is funded</h3>
              <p className="text-xs text-mesa-muted">Where revenue comes from and who controls it</p>
            </div>
            <RevenuePanel />
            <LeversPanel />
            <FundTeachingCard fund={activeFund} />
          </aside>
        </div>

        {(showForecast || showCompare) && !readOnly && (
          <div className="mt-6 space-y-4 lg:mt-8">
            {showForecast && (
              <Suspense fallback={<div className="p-4 text-sm text-mesa-muted">Loading forecast…</div>}>
                <ForecastChart />
              </Suspense>
            )}
            {showCompare && <CompareView />}
          </div>
        )}
      </main>

      {!readOnly && (
        <BalanceBar
          onShare={() => setShowShare(true)}
          onToggleForecast={() => setShowForecast(!showForecast)}
          onToggleCompare={() => setShowCompare(!showCompare)}
          showForecast={showForecast}
          showCompare={showCompare}
        />
      )}

      <AnimatePresence>
        {activeCategoryId && (
          <ImpactDrawer
            categoryId={activeCategoryId}
            amount={fundSnap?.expenditureAmounts[activeCategoryId] ?? 0}
            onClose={() => setCategory(null)}
          />
        )}
      </AnimatePresence>

      {showShare && <ShareDialog onClose={() => setShowShare(false)} />}
    </div>
  );
}
