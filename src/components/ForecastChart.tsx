import { useMemo } from "react";
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Card } from "./ui/Card";
import { useBudgetStore } from "../store/budget-store";
import {
  projectForecast, getForecastSummary, getStructuralGapNarrative, getStructuralDrivers,
} from "../lib/forecast-engine";
import { formatCurrency } from "../lib/utils";

const TONE_STYLES: Record<string, string> = {
  good: "bg-mesa-blue/10 text-mesa-blue border-mesa-blue/20",
  warn: "bg-mesa-amber/10 text-mesa-ink border-mesa-amber/30",
  bad: "bg-mesa-red/10 text-mesa-red border-mesa-red/20",
};

export function ForecastChart() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  const forecast = useMemo(() => projectForecast(snapshot, 5), [snapshot]);
  const summary = useMemo(() => getForecastSummary(forecast), [forecast]);

  const data = forecast.map((y) => ({
    year: `FY${y.fiscalYearCode - 2000}`,
    gfRev: Math.round(y.generalFundRevenue / 1e6),
    gfExp: Math.round(y.generalFundExpenditure / 1e6),
    reserve: Math.round(y.generalFundReserve / 1e6),
    floor: Math.round(y.generalFundReserveTargetMin / 1e6),
    gap: Math.round(y.structuralGap / 1e6),
  }));

  const lastGap = forecast[forecast.length - 1]?.structuralGap ?? 0;
  const fundsInDeficit = (forecast[forecast.length - 1]?.funds ?? [])
    .filter((f) => f.gap > 250_000 && f.fundId !== "general-fund")
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4);

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-mesa-ink">5-year forecast</h3>
        <span className="text-xs text-mesa-muted">FY26 → FY30 · reacts to your changes</span>
      </div>

      <div className={`mt-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${TONE_STYLES[summary.tone]}`} role="status" aria-live="polite">
        {summary.headline}
      </div>

      <p className="mt-3 text-xs text-mesa-muted">{getStructuralGapNarrative()}</p>

      {/* General Fund: recurring money in vs money out */}
      <h4 className="mt-4 text-sm font-semibold text-mesa-ink">General Fund: recurring money in vs out</h4>
      <p className="text-xs text-mesa-muted">When the red line pulls above the blue, costs are growing faster than revenue.</p>
      <div className="mt-2 h-56 w-full" role="img" aria-label="General Fund revenue versus expenditure over five years">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Area type="monotone" dataKey="gfRev" name="Revenue" stroke="#2a6ebb" fill="url(#revGrad)" strokeWidth={2} />
            <Line type="monotone" dataKey="gfExp" name="Expenditure" stroke="#aa272f" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* General Fund reserve trajectory vs the 8% floor */}
      <h4 className="mt-5 text-sm font-semibold text-mesa-ink">General Fund reserve vs the 8% floor</h4>
      <p className="text-xs text-mesa-muted">Mesa policy: keep reserves at 8–10% of next year's spending. Dipping below the dashed line means drawing savings to stay balanced.</p>
      <div className="mt-2 h-56 w-full" role="img" aria-label="General Fund reserve balance versus the eight percent floor over five years">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="M" width={44} />
            <Tooltip formatter={(v: number, n: string) => [`$${v}M`, n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Bar dataKey="gap" name="Structural gap" fill="#e8a33d" fillOpacity={0.55} barSize={18} />
            <Line type="monotone" dataKey="reserve" name="GF reserve" stroke="#2a6ebb" strokeWidth={2.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="floor" name="8% floor" stroke="#aa272f" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {fundsInDeficit.length > 0 && (
        <div className="mt-4 rounded-xl border border-mesa-red/20 bg-mesa-red/5 px-3 py-2.5">
          <p className="text-sm font-semibold text-mesa-red">Other funds trending into deficit by FY30</p>
          <ul className="mt-1 space-y-0.5 text-xs text-mesa-ink">
            {fundsInDeficit.map((f) => (
              <li key={f.fundId} className="flex justify-between gap-2">
                <span>{f.fundName}</span>
                <span className="font-medium text-mesa-red">{formatCurrency(f.gap, true)} short</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 space-y-1 text-xs text-mesa-muted">
        {getStructuralDrivers().slice(0, 4).map((d) => (
          <li key={d}>• {d}</li>
        ))}
      </ul>

      {/* Accessible data table fallback */}
      <table className="mt-4 w-full text-xs sr-only focus:not-sr-only focus:block" aria-label="Forecast data table">
        <caption className="mb-2 text-left font-semibold text-mesa-ink">General Fund forecast (millions)</caption>
        <thead>
          <tr><th>Year</th><th>Revenue</th><th>Expenditure</th><th>Structural gap</th><th>Reserve</th></tr>
        </thead>
        <tbody>
          {forecast.map((y) => (
            <tr key={y.fiscalYear}>
              <td>{y.fiscalYear}</td>
              <td>{formatCurrency(y.generalFundRevenue, true)}</td>
              <td>{formatCurrency(y.generalFundExpenditure, true)}</td>
              <td>{formatCurrency(y.structuralGap, true)}</td>
              <td>{formatCurrency(y.generalFundReserve, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-mesa-muted">
        Educational model using Mesa's published growth and reserve assumptions; one-time capital/reserve transfers are held flat so the structural trend is visible. Not an official City forecast.
      </p>
    </Card>
  );
}
