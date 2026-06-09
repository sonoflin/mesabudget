import { motion } from "framer-motion";
import { Check, AlertTriangle, ArrowRight, Share2, Sparkles, Pencil } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { MesaScape } from "./ui/MesaScape";
import { cn, formatCurrency } from "../lib/utils";
import { funds, FUND_TYPE_LABELS, type FundType } from "../lib/funds-model";
import { meta } from "../lib/budget-engine";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { getCityProgress } from "../lib/guidance";
import { SHORT_NAMES } from "./FundNavigator";
import { InOutBar } from "./ui/InOutBar";

const TYPE_BADGE: Record<FundType, "default" | "restricted" | "enterprise" | "muted"> = {
  discretionary: "default",
  restricted: "restricted",
  enterprise: "enterprise",
  trust: "muted",
  grant: "default",
  debt: "muted",
};

const STATUS_DOT: Record<string, string> = {
  balanced: "bg-mesa-blue",
  surplus: "bg-mesa-amber",
  deficit: "bg-mesa-red",
};

// Distinct, brand-aligned palette for the citywide "where it goes" bar.
const PALETTE = [
  "#2a6ebb", "#e5821e", "#aa272f", "#1f5494", "#f0a04a", "#3d4f5f",
  "#2a9bb5", "#7a5c9e", "#6b9e4b", "#c14b54", "#8d9296", "#b8902f", "#5f6b3d",
];

interface CityOverviewProps {
  readOnly?: boolean;
  onFinish: () => void;
}

export function CityOverview({ readOnly, onFinish }: CityOverviewProps) {
  const balance = useBalance();
  const snapshot = useBudgetStore((s) => s.snapshot);
  const setFund = useBudgetStore((s) => s.setFund);

  const fbs = balance.fundBalances ?? [];
  const progress = getCityProgress(fbs);
  const totalOut = balance.totalExpenditure || 1;

  // Funds ordered by spending for the stacked bar + a stable color per fund.
  const ranked = funds
    .map((f, i) => {
      const fb = fbs.find((b) => b.fundId === f.id);
      return {
        fund: f,
        fb,
        out: fb?.totalExpenditure ?? 0,
        color: PALETTE[i % PALETTE.length],
      };
    })
    .sort((a, b) => b.out - a.out);

  return (
    <div className="space-y-5">
      {/* Hero: the whole city at a glance */}
      <Card className="overflow-hidden p-0">
        <div className="relative mesa-gradient-hero px-5 py-6 text-white sm:px-7">
          <MesaScape tone="light" className="absolute bottom-0 right-0 h-24 w-2/3 max-w-sm opacity-40" />
          <div className="mesa-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" aria-hidden />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                City of Mesa · FY {meta.fiscalYear} · all funds
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {formatCurrency(balance.totalExpenditure, true)}
              </p>
              <p className="mt-1 text-sm text-white/85">
                across all {progress.total} funds · {formatCurrency(balance.totalRevenue, true)} in revenue
              </p>
              <p className="mt-1.5 max-w-[46ch] text-xs leading-relaxed text-white/65">
                Gross of interfund transfers. Mesa&apos;s net operating budget is{" "}
                {formatCurrency(meta.totalOperatingBudget, true)}
                {" · "}
                {formatCurrency(meta.totalCityBudget, true)} with capital (CIP).
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/12 p-4 backdrop-blur-sm lg:w-80">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    progress.allBalanced ? "bg-white text-mesa-blue" : "bg-white text-mesa-red",
                  )}
                  aria-hidden
                >
                  {progress.allBalanced ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">
                    {progress.allBalanced ? "Balanced — ready to share" : `${progress.deficits.length} fund${progress.deficits.length === 1 ? "" : "s"} still short`}
                  </p>
                  <p className="text-xs text-white/80">{progress.balanced} of {progress.total} funds balanced</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${progress.ratio * 100}%` }}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => (progress.allBalanced ? onFinish() : progress.deficits[0] && setFund(progress.deficits[0].fundId))}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-mesa-ink transition-transform active:scale-[0.98]"
                >
                  {progress.allBalanced ? (
                    <><Share2 className="h-4 w-4" /> Review &amp; share your budget</>
                  ) : (
                    <><ArrowRight className="h-4 w-4" /> Fix {SHORT_NAMES[progress.deficits[0]?.fundId ?? ""] ?? "the next fund"}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Where the money goes — clickable stacked bar */}
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-mesa-ink">Where the money goes</h3>
            <span className="text-xs text-mesa-muted">Tap a fund to open it</span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-mesa-sand">
            {ranked.map(({ fund, out, color }) => (
              <button
                key={fund.id}
                type="button"
                onClick={() => setFund(fund.id)}
                title={`${fund.name}: ${formatCurrency(out, true)} (${((out / totalOut) * 100).toFixed(1)}%)`}
                aria-label={`${fund.name}, ${formatCurrency(out)}, open fund`}
                className="h-full min-w-[2px] border-0 p-0 transition-opacity hover:opacity-80"
                style={{ width: `${(out / totalOut) * 100}%`, backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Per-fund cards */}
      <div>
        <h3 className="mb-3 text-base font-bold text-mesa-ink xl:text-lg">Every fund</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ fund, fb, color }) => {
            const status = fb?.status ?? "balanced";
            const fundSnap = snapshot.funds[fund.id];
            const top = [...fund.expenditures]
              .map((e) => ({ name: e.name, amt: fundSnap?.expenditureAmounts[e.id] ?? e.adoptedAmount }))
              .sort((a, b) => b.amt - a.amt)
              .slice(0, 2);

            return (
              <motion.button
                key={fund.id}
                type="button"
                onClick={() => setFund(fund.id)}
                whileTap={{ scale: 0.985 }}
                className="group relative flex h-full flex-col rounded-2xl border border-mesa-ink/8 bg-mesa-surface p-4 text-left shadow-mesa-sm transition-all hover:border-mesa-blue/30 hover:shadow-mesa"
              >
                <span className="absolute inset-y-3 left-0 w-1 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-mesa-ink group-hover:text-mesa-blue">{fund.name}</p>
                    <Badge variant={TYPE_BADGE[fund.type]} className="mt-1 !py-0 text-[10px]">
                      {FUND_TYPE_LABELS[fund.type]}
                    </Badge>
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} aria-hidden />
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        status === "deficit" ? "text-mesa-red" : status === "surplus" ? "text-mesa-amber" : "text-mesa-blue",
                      )}
                    >
                      {status === "deficit"
                        ? `${formatCurrency(Math.abs(fb?.difference ?? 0), true)} short`
                        : status === "surplus"
                          ? "Surplus"
                          : "Balanced"}
                    </span>
                  </span>
                </div>

                <div className="mt-3 pl-2">
                  <InOutBar inAmt={fb?.totalRevenue ?? 0} outAmt={fb?.totalExpenditure ?? 0} status={status} compact />
                </div>

                {top.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-mesa-ink/6 pt-2.5 pl-2">
                    {top.map((t) => (
                      <li key={t.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-mesa-muted">{t.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-mesa-ink">{formatCurrency(t.amt, true)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <span className="mt-3 inline-flex items-center gap-1 pl-2 text-xs font-semibold text-mesa-blue">
                  {status === "surplus" && <Sparkles className="h-3.5 w-3.5" aria-hidden />}
                  {readOnly ? "View fund" : <><Pencil className="h-3 w-3" aria-hidden /> Adjust this fund</>}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
