import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Check, AlertTriangle, TrendingDown, ArrowRight } from "lucide-react";
import { Card } from "./ui/Card";
import { useBudgetStore } from "../store/budget-store";
import {
  projectForecast,
  getStructuralGapNarrative,
  getStructuralDrivers,
  getFundSeries,
  analyzeFundPolicy,
  getReserveDeltaVsAdopted,
  FORECAST_FUND_IDS,
} from "../lib/forecast-engine";
import { funds } from "../lib/funds-model";
import { cn, formatCurrency } from "../lib/utils";

const TONE_STYLES: Record<string, string> = {
  good: "bg-mesa-blue/10 text-mesa-blue border-mesa-blue/20",
  warn: "bg-mesa-amber/10 text-mesa-ink border-mesa-amber/30",
  bad: "bg-mesa-red/10 text-mesa-red border-mesa-red/20",
};

const TAB_LABELS: Record<string, string> = {
  "general-fund": "General Fund",
  "utility-enterprise": "Utility (Enterprise)",
};

const fundName = (id: string) => funds.find((f) => f.id === id)?.name ?? id;
const toM = (n: number) => Math.round(n / 1e6);

export function ForecastChart() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  const activeFundId = useBudgetStore((s) => s.activeFundId);

  // Mesa publishes a forecast for both the General Governmental and Enterprise
  // funds — default to whichever the user is already editing.
  const [fundId, setFundId] = useState<string>(() =>
    (FORECAST_FUND_IDS as readonly string[]).includes(activeFundId) ? activeFundId : "general-fund",
  );

  const forecast = useMemo(() => projectForecast(snapshot, 5), [snapshot]);
  const series = useMemo(() => getFundSeries(forecast, fundId), [forecast, fundId]);
  const policy = useMemo(() => analyzeFundPolicy(series), [series]);
  const delta = useMemo(() => getReserveDeltaVsAdopted(fundId, forecast), [fundId, forecast]);

  const flowData = series.map((s) => ({
    year: `FY${s.fiscalYearCode - 2000}`,
    rev: toM(s.revenue),
    exp: toM(s.expenditure),
  }));

  const reserveData = series.map((s, i) => ({
    year: `FY${s.fiscalYearCode - 2000}`,
    reserve: toM(s.reserveEnd),
    adopted: toM(delta.baseline[i]?.reserve ?? s.reserveEnd),
    floor: toM(s.reserveTargetMin),
    band: [toM(s.reserveTargetMin), toM(s.reserveTargetMax)] as [number, number],
  }));

  // Citywide context: other funds (not the one shown) trending into deficit.
  const otherFundsInDeficit = (forecast[forecast.length - 1]?.funds ?? [])
    .filter((f) => f.gap > 250_000 && f.fundId !== fundId)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4);

  const deltaAbs = Math.abs(delta.endDelta);
  const deltaMeaningful = deltaAbs >= 500_000;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-mesa-ink">5-year forecast</h3>
        <span className="text-xs text-mesa-muted">FY26 → FY30 · reacts to your changes</span>
      </div>
      <p className="mt-1 text-xs text-mesa-muted">
        Mesa forecasts revenue, spending, and reserves five years out for both the General Governmental and Enterprise
        funds — because choices today move the fund balance for years.
      </p>

      {/* Fund selector — the two funds Mesa forecasts */}
      <div className="mt-3 inline-flex rounded-xl border border-mesa-ink/10 bg-mesa-sand/60 p-0.5" role="tablist" aria-label="Forecast fund">
        {FORECAST_FUND_IDS.map((id) => {
          const active = id === fundId;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFundId(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                active ? "bg-mesa-surface text-mesa-blue shadow-mesa-sm" : "text-mesa-muted hover:text-mesa-ink",
              )}
            >
              {TAB_LABELS[id] ?? fundName(id)}
            </button>
          );
        })}
      </div>

      {/* Policy headline */}
      {policy && (
        <div
          className={cn("mt-3 rounded-xl border px-3 py-2.5 text-sm font-medium", TONE_STYLES[policy.tone])}
          role="status"
          aria-live="polite"
        >
          {policy.headline}
        </div>
      )}

      {/* Policy scorecard */}
      {policy && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label={`${policy.firstFiscalYear.replace("20", "FY")} reserve`} value={formatCurrency(policy.startReserve, true)} sub={`${policy.startPct.toFixed(0)}% of spend`} />
          <Stat
            label={`${policy.lastFiscalYear.replace("20", "FY")} reserve`}
            value={formatCurrency(policy.endReserve, true)}
            sub={`${policy.endPct.toFixed(0)}% of spend`}
            tone={policy.endPct < 8 ? "bad" : policy.endPct < 10 ? "warn" : "good"}
          />
          <Stat
            label="8% policy floor"
            value={policy.maintained ? "Held" : "Breached"}
            sub={policy.maintained ? "all 5 years" : policy.firstBreach?.fiscalYear.replace("20", "FY")}
            tone={policy.maintained ? "good" : "bad"}
            icon={policy.maintained ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* Your-changes-vs-adopted readout */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-mesa-muted">
        <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {deltaMeaningful ? (
          <span>
            Your choices leave the {policy?.lastFiscalYear.replace("20", "FY")} reserve{" "}
            <strong className={delta.endDelta >= 0 ? "text-mesa-blue" : "text-mesa-red"}>
              {delta.endDelta >= 0 ? "+" : "−"}{formatCurrency(deltaAbs, true)}
            </strong>{" "}
            vs the adopted budget (dashed line below).
          </span>
        ) : (
          <span>This fund currently tracks the adopted budget&apos;s 5-year path. Adjust spending or rates to bend the curve.</span>
        )}
      </p>

      {/* Recurring money in vs out */}
      <h4 className="mt-4 text-sm font-semibold text-mesa-ink">{fundName(fundId)}: recurring money in vs out</h4>
      <p className="text-xs text-mesa-muted">When the red line pulls above the blue, ongoing costs are outgrowing ongoing revenue.</p>
      <div className="mt-2 h-56 w-full" role="img" aria-label={`${fundName(fundId)} revenue versus expenditure over five years`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={flowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2a6ebb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2a6ebb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="M" width={44} />
            <Tooltip formatter={(v: number, n: string) => [`$${v}M`, n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="rev" name="Revenue" stroke="#2a6ebb" fill="url(#revGrad)" strokeWidth={2} />
            <Line type="monotone" dataKey="exp" name="Expenditure" stroke="#aa272f" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Reserve vs the 8–10% policy band */}
      <h4 className="mt-5 text-sm font-semibold text-mesa-ink">Reserve vs Mesa&apos;s 8–10% policy band</h4>
      <p className="text-xs text-mesa-muted">
        Policy: keep reserves at 8–10% of next year&apos;s spending, maintained every year. The shaded band is the policy
        range; the dashed line is the adopted budget&apos;s path.
      </p>
      <div className="mt-2 h-56 w-full" role="img" aria-label={`${fundName(fundId)} reserve versus the eight to ten percent policy band over five years`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={reserveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="M" width={44} />
            <Tooltip
              formatter={(value: number | number[], n: string) =>
                Array.isArray(value) ? [`$${value[0]}M–$${value[1]}M`, n] : [`$${value}M`, n]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            {/* Range area = the shaded 8–10% policy band */}
            <Area type="monotone" dataKey="band" name="8–10% band" stroke="none" fill="#e8a33d" fillOpacity={0.18} isAnimationActive={false} />
            <Line type="monotone" dataKey="floor" name="8% floor" stroke="#aa272f" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="adopted" name="Adopted plan" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="reserve" name="Your reserve" stroke="#2a6ebb" strokeWidth={2.5} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Restoration plan (policy 2.3) */}
      {policy?.firstBreach && policy.restorePerYear ? (
        <div className="mt-4 rounded-xl border border-mesa-red/20 bg-mesa-red/5 px-3 py-2.5">
          <p className="text-sm font-semibold text-mesa-red">Reserve restoration required</p>
          <p className="mt-0.5 text-xs text-mesa-ink">
            Reserves dip {formatCurrency(policy.firstBreach.shortfall, true)} below the floor in{" "}
            {policy.firstBreach.fiscalYear.replace("20", "FY")}. Mesa policy 2.3 requires a plan to restore them within 1–3 years — about{" "}
            <strong>{formatCurrency(policy.restorePerYear, true)}/yr</strong> in cuts or new revenue over three years.
          </p>
        </div>
      ) : null}

      {otherFundsInDeficit.length > 0 && (
        <div className="mt-4 rounded-xl border border-mesa-amber/30 bg-mesa-amber/5 px-3 py-2.5">
          <p className="text-sm font-semibold text-mesa-ink">Other funds trending into deficit by FY30</p>
          <ul className="mt-1 space-y-0.5 text-xs text-mesa-ink">
            {otherFundsInDeficit.map((f) => (
              <li key={f.fundId} className="flex justify-between gap-2">
                <span>{f.fundName}</span>
                <span className="font-medium text-mesa-red">{formatCurrency(f.gap, true)} short</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-mesa-ink">What drives the structural gap</p>
      <p className="mt-0.5 text-xs text-mesa-muted">{getStructuralGapNarrative()}</p>
      <ul className="mt-1.5 space-y-1 text-xs text-mesa-muted">
        {getStructuralDrivers().slice(0, 4).map((d) => (
          <li key={d} className="flex gap-1.5">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-mesa-amber" aria-hidden />
            {d}
          </li>
        ))}
      </ul>

      {/* Accessible data table fallback */}
      <table className="mt-4 w-full text-xs sr-only focus:not-sr-only focus:block" aria-label="Forecast data table">
        <caption className="mb-2 text-left font-semibold text-mesa-ink">{fundName(fundId)} forecast (next-year reserve basis)</caption>
        <thead>
          <tr><th>Year</th><th>Revenue</th><th>Expenditure</th><th>Reserve</th><th>% of spend</th></tr>
        </thead>
        <tbody>
          {series.map((y) => (
            <tr key={y.fiscalYear}>
              <td>{y.fiscalYear}</td>
              <td>{formatCurrency(y.revenue, true)}</td>
              <td>{formatCurrency(y.expenditure, true)}</td>
              <td>{formatCurrency(y.reserveEnd, true)}</td>
              <td>{y.reservePct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-mesa-muted">
        Educational model using Mesa&apos;s published growth and reserve assumptions; one-time capital/reserve transfers are
        held flat so the structural trend is visible. Not an official City forecast.
      </p>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: React.ReactNode;
}) {
  const toneText =
    tone === "bad" ? "text-mesa-red" : tone === "warn" ? "text-mesa-amber" : tone === "good" ? "text-mesa-blue" : "text-mesa-ink";
  return (
    <div className="rounded-xl border border-mesa-ink/8 bg-mesa-surface px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-mesa-muted">{label}</p>
      <p className={cn("mt-0.5 flex items-center gap-1 text-sm font-extrabold tabular-nums", toneText)}>
        {icon}
        {value}
      </p>
      {sub && <p className="text-[10px] text-mesa-muted">{sub}</p>}
    </div>
  );
}
