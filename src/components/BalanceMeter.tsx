import { Check, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useBalance } from "../store/budget-store";
import { meta } from "../lib/budget-engine";

export function BalanceMeter({ variant = "band" }: { variant?: "band" | "pill" }) {
  const balance = useBalance();
  const deficits = balance.fundBalances?.filter((b) => b.status === "deficit") ?? [];
  const balanced = deficits.length === 0;

  const statusLabel = balanced
    ? "All funds balanced"
    : `${deficits.length} fund${deficits.length > 1 ? "s" : ""} short`;

  // Compact pill for the desktop header bar — fills the bar center with a
  // meaningful citywide status + headline spending figure.
  if (variant === "pill") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-2.5 pr-3.5 text-sm shadow-mesa-sm transition-colors",
          balanced
            ? "border-mesa-blue/25 bg-mesa-blue/8 text-mesa-blue"
            : "border-mesa-red/30 bg-mesa-red/8 text-mesa-red",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-white",
            balanced ? "bg-mesa-blue" : "bg-mesa-red",
          )}
          aria-hidden
        >
          {balanced ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        </span>
        <span className="font-bold">{statusLabel}</span>
        <span className="hidden h-3.5 w-px bg-current/25 xl:block" aria-hidden />
        <span className="hidden font-medium text-mesa-slate xl:inline">
          {formatCurrency(balance.totalExpenditure, true)} spending
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition-colors",
        balanced ? "border-mesa-blue/20 bg-mesa-blue/8" : "border-mesa-red/25 bg-mesa-red/8",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white",
            balanced ? "bg-mesa-blue" : "bg-mesa-red",
          )}
          aria-hidden
        >
          {balanced ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold leading-tight", balanced ? "text-mesa-blue" : "text-mesa-red")}>
            {statusLabel}
          </p>
          <p className="text-xs font-medium text-mesa-muted">
            FY {meta.fiscalYear} · {formatCurrency(balance.totalExpenditure, true)} total spending
          </p>
        </div>
      </div>
      {!balanced && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5 border-t border-mesa-red/15 pt-2.5 text-xs">
          {deficits.slice(0, 4).map((d) => (
            <li
              key={d.fundId}
              className="rounded-full bg-mesa-red/10 px-2 py-0.5 font-medium text-mesa-red"
            >
              {d.fundName}: {formatCurrency(Math.abs(d.difference), true)} short
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BalanceBadge({ adopted, current }: { adopted: number; current: number }) {
  if (adopted === 0) return null;
  const pct = ((current - adopted) / adopted) * 100;
  if (Math.abs(pct) < 0.5) return null;
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={cn("text-xs font-semibold", pct > 0 ? "text-mesa-amber" : "text-mesa-blue")}>
      {sign}{pct.toFixed(1)}%
    </span>
  );
}
