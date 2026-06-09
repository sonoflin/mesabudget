import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { funds, FUND_TYPE_LABELS, type Fund, type FundType } from "../lib/funds-model";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { Badge } from "./ui/Badge";
import { MesaScape } from "./ui/MesaScape";
import { FundPickerSheet } from "./FundPickerSheet";

/** Tab that returns to the all-funds city overview. */
function OverviewChip({ active, onSelect, fullWidth }: { active: boolean; onSelect: () => void; fullWidth?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition-all",
        fullWidth && "w-full justify-start",
        active
          ? "border-transparent bg-mesa-ink text-white shadow-mesa-sm"
          : "border-mesa-ink/12 bg-mesa-surface text-mesa-ink hover:border-mesa-blue/40 hover:bg-mesa-blue/5",
      )}
    >
      <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-none">Overview</span>
    </button>
  );
}

const TYPE_BADGE: Record<FundType, "default" | "restricted" | "enterprise" | "muted"> = {
  discretionary: "default",
  restricted: "restricted",
  enterprise: "enterprise",
  trust: "muted",
  grant: "default",
  debt: "muted",
};

export const SHORT_NAMES: Record<string, string> = {
  "general-fund": "General",
  "streets-fund": "Streets",
  "transit-fund": "Transit",
  "utility-enterprise": "Utilities",
  "ps-tax-fund": "Public Safety Tax",
  "qol-fund": "Quality of Life",
  "parks-restricted-fund": "Parks Restricted",
  "ecf-fund": "Environmental Fee",
  "ambulance-fund": "Ambulance",
  "ebt-fund": "Benefits Trust",
  "grants-fund": "Grants",
  "other-funds": "Other Funds",
};

const TYPE_DOT: Record<FundType, string> = {
  discretionary: "bg-mesa-blue",
  restricted: "bg-mesa-amber",
  enterprise: "bg-mesa-blue-dark",
  trust: "bg-mesa-gray",
  grant: "bg-mesa-blue",
  debt: "bg-mesa-gray",
};

function FundChip({
  fund,
  isActive,
  hasDeficit,
  expenditure,
  onSelect,
  fullWidth,
}: {
  fund: Fund;
  isActive: boolean;
  hasDeficit: boolean;
  expenditure?: number;
  onSelect: () => void;
  fullWidth?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={cn(
        "group inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-2 text-left transition-all",
        fullWidth && "w-full justify-start",
        isActive
          ? "border-transparent bg-mesa-blue text-white shadow-mesa-sm"
          : "border-mesa-ink/12 bg-mesa-surface text-mesa-ink hover:border-mesa-blue/40 hover:bg-mesa-blue/5",
        hasDeficit && !isActive && "border-mesa-red/35 bg-mesa-red/5",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isActive ? "bg-white" : hasDeficit ? "bg-mesa-red" : TYPE_DOT[fund.type],
        )}
        aria-hidden
      />
      <span className="text-sm font-bold leading-none">{SHORT_NAMES[fund.id] ?? fund.name}</span>
      {expenditure != null && (
        <span
          className={cn(
            "text-xs font-medium tabular-nums leading-none",
            isActive ? "text-white/75" : "text-mesa-muted",
          )}
        >
          {formatCurrency(expenditure, true)}
        </span>
      )}
      {hasDeficit && !isActive && (
        <span className="rounded-full bg-mesa-red/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-mesa-red">
          short
        </span>
      )}
    </motion.button>
  );
}

export function FundNavigator({ orientation = "auto" }: { orientation?: "auto" | "vertical" }) {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const setFund = useBudgetStore((s) => s.setFund);
  const mainView = useBudgetStore((s) => s.mainView);
  const setMainView = useBudgetStore((s) => s.setMainView);
  const balance = useBalance();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isOverview = mainView === "overview";
  const activeFund = funds.find((f) => f.id === activeFundId) ?? funds[0];
  const activeBalance = balance.fundBalances?.find((b) => b.fundId === activeFund.id);
  const activeDeficit = activeBalance?.status === "deficit";

  if (orientation === "vertical") {
    return (
      <div role="tablist" aria-label="Select a fund" className="flex flex-col gap-1.5">
        <OverviewChip active={isOverview} onSelect={() => setMainView("overview")} fullWidth />
        {funds.map((fund) => {
          const fb = balance.fundBalances?.find((b) => b.fundId === fund.id);
          return (
            <FundChip
              key={fund.id}
              fund={fund}
              isActive={!isOverview && activeFundId === fund.id}
              hasDeficit={fb?.status === "deficit"}
              expenditure={fb?.totalExpenditure}
              onSelect={() => setFund(fund.id)}
              fullWidth
            />
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: overview toggle + one tappable control → full fund list sheet */}
      <div className="md:hidden flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMainView("overview")}
          aria-pressed={isOverview}
          aria-label="City overview — all funds"
          className={cn(
            "flex h-[52px] shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-sm font-bold transition-colors",
            isOverview ? "border-transparent bg-mesa-ink text-white" : "border-mesa-ink/15 bg-mesa-surface text-mesa-ink active:bg-mesa-ink/5",
          )}
        >
          <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-mesa-blue/25 bg-mesa-blue/5 px-3 py-2.5 text-left min-h-[52px] transition-colors hover:bg-mesa-blue/10 active:bg-mesa-blue/15"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  activeDeficit ? "bg-mesa-red" : TYPE_DOT[activeFund.type],
                )}
                aria-hidden
              />
              <span className="truncate text-sm font-bold text-mesa-ink">{activeFund.name}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Badge variant={TYPE_BADGE[activeFund.type]} className="!py-0 text-[10px]">
                {FUND_TYPE_LABELS[activeFund.type]}
              </Badge>
              {activeBalance && (
                <span className="text-xs text-mesa-muted tabular-nums">
                  {formatCurrency(activeBalance.totalExpenditure, true)}
                </span>
              )}
              {activeBalance && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    activeDeficit ? "text-mesa-red" : "text-mesa-blue",
                  )}
                >
                  {activeDeficit
                    ? `${formatCurrency(Math.abs(activeBalance.difference), true)} short`
                    : "Balanced"}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs font-semibold text-mesa-blue">
              Tap to switch · {funds.length} funds
            </p>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-mesa-blue" aria-hidden />
        </button>
      </div>

      {/* Desktop: all chips wrap — nothing clipped or hidden */}
      <div
        role="tablist"
        aria-label="Select a fund"
        className="hidden md:flex md:flex-wrap md:gap-2"
      >
        <OverviewChip active={isOverview} onSelect={() => setMainView("overview")} />
        {funds.map((fund) => {
          const fb = balance.fundBalances?.find((b) => b.fundId === fund.id);
          return (
            <FundChip
              key={fund.id}
              fund={fund}
              isActive={!isOverview && activeFundId === fund.id}
              hasDeficit={fb?.status === "deficit"}
              expenditure={fb?.totalExpenditure}
              onSelect={() => setFund(fund.id)}
            />
          );
        })}
      </div>

      <FundPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

export function FundHeader() {
  const activeFund = useBudgetStore((s) => funds.find((f) => f.id === s.activeFundId) ?? funds[0]);
  const balance = useBalance();
  const fb = balance.fundBalances?.find((b) => b.fundId === activeFund.id);

  const status = fb?.status ?? "balanced";
  const statusColor =
    status === "deficit" ? "text-mesa-red" : status === "surplus" ? "text-mesa-amber" : "text-mesa-blue";
  const verdict =
    status === "deficit"
      ? `${formatCurrency(Math.abs(fb?.difference ?? 0), true)} short`
      : status === "surplus"
        ? `${formatCurrency(Math.abs(fb?.difference ?? 0), true)} to allocate`
        : "Balanced";
  const verdictNote =
    status === "deficit"
      ? "Spending exceeds this fund's revenue"
      : status === "surplus"
        ? "Revenue not yet fully allocated"
        : "Revenue covers spending";

  const totalIn = fb?.totalRevenue ?? 0;
  const totalOut = fb?.totalExpenditure ?? 0;
  const max = Math.max(totalIn, totalOut, 1);
  const over = totalOut - totalIn;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-mesa-ink/8 bg-mesa-surface p-5 shadow-mesa-sm lg:p-6">
      <span className={cn("absolute inset-y-0 left-0 w-1.5", TYPE_DOT[activeFund.type])} aria-hidden />
      <MesaScape tone="ink" className="absolute bottom-0 right-0 h-20 w-2/3 max-w-xs opacity-50 sm:h-24" />
      <div className="relative pl-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <Badge variant={TYPE_BADGE[activeFund.type]}>{FUND_TYPE_LABELS[activeFund.type]}</Badge>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-mesa-ink lg:text-2xl xl:text-[28px] xl:leading-tight">
              {activeFund.name}
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-mesa-muted lg:text-[15px]">
              {activeFund.description}
            </p>
          </div>
          {fb && (
            <div className="shrink-0 sm:min-w-[150px] sm:text-right">
              <div className={cn("text-2xl font-extrabold leading-none lg:text-[28px]", statusColor)}>{verdict}</div>
              <div className="mt-1 text-xs font-medium text-mesa-muted">{verdictNote}</div>
            </div>
          )}
        </div>

        {fb && (
          <div
            className="mt-4 space-y-2 border-t border-mesa-ink/8 pt-4"
            role="img"
            aria-label={`Money in ${formatCurrency(totalIn)}, money out ${formatCurrency(totalOut)}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-16 shrink-0 text-xs font-medium text-mesa-muted">Money in</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mesa-sand">
                <div
                  className="h-full rounded-full bg-mesa-blue transition-[width] duration-500 ease-out"
                  style={{ width: `${(totalIn / max) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-bold text-mesa-ink tabular-nums">
                {formatCurrency(totalIn, true)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-16 shrink-0 text-xs font-medium text-mesa-muted">Money out</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mesa-sand">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    over > 100_000 ? "bg-mesa-red" : "bg-mesa-ink/70",
                  )}
                  style={{ width: `${(totalOut / max) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-bold text-mesa-ink tabular-nums">
                {formatCurrency(totalOut, true)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
