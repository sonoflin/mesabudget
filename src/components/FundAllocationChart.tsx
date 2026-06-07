import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "./ui/Card";
import type { Fund } from "../lib/funds-model";
import {
  getAllocationSlices,
  shouldShowAllocationChart,
  type AllocationSlice,
} from "../lib/fund-allocation";
import { cn, formatCurrency } from "../lib/utils";

interface FundAllocationChartProps {
  fund: Fund;
  amounts: Record<string, number>;
  /** Highlight the slice that contains this expenditure line. */
  activeLineId?: string | null;
  onSliceFocus?: (slice: AllocationSlice) => void;
}

function pctOf(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AllocationSlice & { pct: number } }[];
}) {
  if (!active || !payload?.[0]) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-xl border border-mesa-ink/10 bg-mesa-surface px-3 py-2 text-xs shadow-mesa">
      <p className="font-bold text-mesa-ink">{s.label}</p>
      <p className="mt-0.5 text-mesa-muted">
        {formatCurrency(s.value, true)} · {s.pct.toFixed(1)}% of spending
      </p>
    </div>
  );
}

export function FundAllocationChart({
  fund,
  amounts,
  activeLineId,
  onSliceFocus,
}: FundAllocationChartProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const slices = useMemo(() => getAllocationSlices(fund, amounts), [fund, amounts]);
  const total = useMemo(() => slices.reduce((s, x) => s + x.value, 0), [slices]);

  const chartData = useMemo(
    () => slices.map((s) => ({ ...s, pct: pctOf(s.value, total) })),
    [slices, total],
  );

  if (!shouldShowAllocationChart(fund) || slices.length < 3 || total <= 0) return null;

  const emphasisId =
    hoverId ?? (activeLineId ? slices.find((s) => s.lineIds.includes(activeLineId))?.id : null);

  const ariaSummary = chartData
    .slice()
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)
    .map((s) => `${s.label} ${s.pct.toFixed(0)}%`)
    .join(", ");

  const scrollToSlice = (slice: AllocationSlice) => {
    onSliceFocus?.(slice);
    const targetId = slice.lineIds[0];
    if (!targetId) return;
    document.getElementById(`exp-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <Card className="mt-4 overflow-hidden lg:mt-5 lg:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-mesa-ink lg:text-lg">Your spending mix</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-mesa-muted lg:text-sm">
            Each slice is this fund&apos;s share of total spending. Raise police or fire and the rest shrink
            proportionally — that&apos;s the trade-off Council faces every year.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-extrabold text-mesa-blue tabular-nums lg:text-xl">
            {formatCurrency(total, true)}
          </div>
          <div className="text-[11px] font-medium text-mesa-muted">total spending</div>
        </div>
      </div>

      {/* 100% stacked bar — the clearest "shrinking pie" cue */}
      <div
        className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-mesa-sand sm:h-4"
        role="img"
        aria-label={`Spending mix: ${ariaSummary}`}
      >
        {chartData.map((s) => (
          <motion.button
            key={s.id}
            type="button"
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
            aria-label={`${s.label}, ${s.pct.toFixed(1)} percent`}
            onMouseEnter={() => setHoverId(s.id)}
            onMouseLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(s.id)}
            onBlur={() => setHoverId(null)}
            onClick={() => scrollToSlice(s)}
            layout
            className={cn(
              "h-full min-w-[2px] border-0 p-0 transition-opacity",
              emphasisId && emphasisId !== s.id && "opacity-45",
            )}
            style={{
              width: `${Math.max(s.pct, s.pct > 0 ? 0.35 : 0)}%`,
              backgroundColor: s.color,
            }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Donut — overview at a glance */}
        <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0 sm:h-48 sm:w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="none"
                animationDuration={450}
                onMouseEnter={(_, i) => setHoverId(chartData[i]?.id ?? null)}
                onMouseLeave={() => setHoverId(null)}
                onClick={(_, i) => chartData[i] && scrollToSlice(chartData[i])}
              >
                {chartData.map((s) => (
                  <Cell
                    key={s.id}
                    fill={s.color}
                    opacity={emphasisId && emphasisId !== s.id ? 0.35 : 1}
                    className="cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-mesa-muted">Total</span>
            <span className="text-sm font-extrabold text-mesa-ink tabular-nums sm:text-base">
              {formatCurrency(total, true)}
            </span>
          </div>
        </div>

        {/* Legend with live % and change vs adopted */}
        <ul className="min-w-0 flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {chartData.map((s) => {
            const deltaPct = s.adopted ? ((s.value - s.adopted) / s.adopted) * 100 : 0;
            const isEmphasis = emphasisId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => scrollToSlice(s)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                    isEmphasis
                      ? "border-mesa-blue/30 bg-mesa-blue/5"
                      : "border-transparent hover:bg-mesa-sand/80",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mesa-ink">{s.label}</span>
                    <span className="text-xs text-mesa-muted tabular-nums">
                      {formatCurrency(s.value, true)} · {s.pct.toFixed(1)}%
                    </span>
                  </span>
                  {Math.abs(deltaPct) >= 0.5 && (
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold tabular-nums",
                        deltaPct > 0 ? "text-mesa-amber" : "text-mesa-blue",
                      )}
                    >
                      {deltaPct > 0 ? "+" : ""}
                      {deltaPct.toFixed(1)}%
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Screen-reader table */}
      <table className="sr-only">
        <caption>{fund.name} spending allocation</caption>
        <thead>
          <tr>
            <th>Area</th>
            <th>Amount</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((s) => (
            <tr key={s.id}>
              <td>{s.label}</td>
              <td>{formatCurrency(s.value)}</td>
              <td>{s.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
