import { Coins, ArrowUpRight } from "lucide-react";
import { Card } from "./ui/Card";
import { MesaScape } from "./ui/MesaScape";
import { cn, formatCurrency } from "../lib/utils";
import { funds, REVENUE_CONTROL_META, type RevenueControl } from "../lib/funds-model";
import { computeFundRevenueLines } from "../lib/fund-rules-engine";
import { meta } from "../lib/budget-engine";
import { useBudgetStore, useBalance } from "../store/budget-store";
import {
  UtilityRatesLever,
  UtilityTransferLever,
  SalesTaxBallotLever,
  StateRevenueNote,
} from "./RevenueLevers";

const CONTROL_ORDER: RevenueControl[] = ["council", "voters", "state", "fees", "reserves"];

// Inline hex (matches the brand palette used across the overview viz).
const CONTROL_HEX: Record<RevenueControl, string> = {
  council: "#2a6ebb",
  voters: "#e5821e",
  state: "#3d4f5f",
  fees: "#8d9296",
  reserves: "#aa272f",
};

/** Small label for a section of levers grouped by who controls them. */
function GroupLabel({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <div className="mb-3 mt-7 first:mt-0">
      <h3 className="text-base font-bold text-mesa-ink xl:text-lg">{children}</h3>
      <p className="text-xs text-mesa-muted">{hint}</p>
    </div>
  );
}

export function RevenueView() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  const setFund = useBudgetStore((s) => s.setFund);
  const balance = useBalance();

  // Aggregate citywide revenue by who actually controls each dollar.
  const byControl: Record<RevenueControl, number> = {
    council: 0,
    voters: 0,
    state: 0,
    fees: 0,
    reserves: 0,
  };
  for (const fund of funds) {
    const fs = snapshot.funds[fund.id];
    if (!fs) continue;
    for (const line of computeFundRevenueLines(fund, fs, snapshot.levers, snapshot)) {
      byControl[line.control] += line.amount;
    }
  }
  const totalIn = Object.values(byControl).reduce((a, b) => a + b, 0) || 1;
  const councilPct = Math.round((byControl.council / totalIn) * 100);
  const segments = CONTROL_ORDER.filter((c) => byControl[c] > 0);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="overflow-hidden p-0">
        <div className="relative mesa-gradient-hero px-5 py-6 text-white sm:px-7">
          <MesaScape tone="light" className="absolute bottom-0 right-0 h-24 w-2/3 max-w-sm opacity-40" />
          <div className="mesa-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" aria-hidden />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/75">
                <Coins className="h-3.5 w-3.5" aria-hidden />
                City of Mesa · FY {meta.fiscalYear} · revenue &amp; levers
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {formatCurrency(balance.totalRevenue, true)}
              </p>
              <p className="mt-1 text-sm text-white/85">
                citywide revenue in · {formatCurrency(balance.totalExpenditure, true)} out across all{" "}
                {funds.length} funds
              </p>
              <p className="mt-1.5 max-w-[48ch] text-xs leading-relaxed text-white/65">
                Mesa can only spend what it brings in. Council can adjust just a few of these dollars each year — most
                revenue is set by voters or the State of Arizona.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/12 p-4 backdrop-blur-sm lg:w-72">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Council&apos;s annual reach</p>
              <p className="mt-1 text-4xl font-extrabold leading-none">~{councilPct}%</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                of citywide revenue can be adjusted by Council — chiefly through utility rates.
              </p>
            </div>
          </div>
        </div>

        {/* Who controls Mesa's revenue */}
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-mesa-ink">Who controls Mesa&apos;s revenue</h3>
            <span className="text-xs text-mesa-muted tabular-nums">{formatCurrency(totalIn, true)} total in</span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-mesa-sand" role="img" aria-label="Revenue by who controls it">
            {segments.map((c) => (
              <div
                key={c}
                title={`${REVENUE_CONTROL_META[c].short}: ${formatCurrency(byControl[c], true)} (${Math.round((byControl[c] / totalIn) * 100)}%)`}
                className="h-full min-w-[2px]"
                style={{ width: `${(byControl[c] / totalIn) * 100}%`, backgroundColor: CONTROL_HEX[c] }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {segments.map((c) => (
              <li key={c} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONTROL_HEX[c] }} aria-hidden />
                <span className="font-semibold text-mesa-ink">{REVENUE_CONTROL_META[c].short}</span>
                <span className="text-mesa-muted tabular-nums">
                  {formatCurrency(byControl[c], true)} · {Math.round((byControl[c] / totalIn) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Levers */}
      <div>
        <GroupLabel hint="Council can change these by resolution each year — no election needed.">
          Council&apos;s annual levers
        </GroupLabel>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <UtilityRatesLever />
          <UtilityTransferLever />
        </div>

        <GroupLabel hint="These shape Mesa's revenue too — but they're outside Council's yearly control.">
          Beyond Council&apos;s annual control
        </GroupLabel>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SalesTaxBallotLever />
          <StateRevenueNote />
        </div>
      </div>

      {/* Where these levers land */}
      <Card className="bg-gradient-to-br from-mesa-blue/[0.04] to-transparent">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-mesa-ink">These levers move two funds</h3>
            <p className="mt-0.5 text-xs text-mesa-muted">
              The same controls are built into each fund tab, so you can tweak revenue while you edit spending.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFund("general-fund")}
              className="inline-flex items-center gap-1.5 rounded-full border border-mesa-blue/25 bg-mesa-surface px-3.5 py-2 text-sm font-bold text-mesa-blue transition-colors hover:bg-mesa-blue/5"
            >
              General Fund
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setFund("utility-enterprise")}
              className="inline-flex items-center gap-1.5 rounded-full border border-mesa-blue/25 bg-mesa-surface px-3.5 py-2 text-sm font-bold text-mesa-blue transition-colors hover:bg-mesa-blue/5"
            >
              Utility Enterprise
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
