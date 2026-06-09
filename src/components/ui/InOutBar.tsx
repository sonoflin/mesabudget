import { cn, formatCurrency } from "../../lib/utils";

type Status = "balanced" | "deficit" | "surplus";

const OUT_FILL: Record<Status, string> = {
  balanced: "bg-mesa-blue",
  surplus: "bg-mesa-amber",
  deficit: "bg-mesa-red",
};

/**
 * Compact "money in vs money out" pair of bars for a single fund. Shared by the
 * city overview cards and the control-tower rail so the visual language matches.
 */
export function InOutBar({
  inAmt,
  outAmt,
  status,
  compact = false,
  className,
}: {
  inAmt: number;
  outAmt: number;
  status: Status;
  compact?: boolean;
  className?: string;
}) {
  const max = Math.max(inAmt, outAmt, 1);
  const h = compact ? "h-1.5" : "h-2";
  return (
    <div
      className={cn("space-y-1", className)}
      role="img"
      aria-label={`Money in ${formatCurrency(inAmt, true)}, money out ${formatCurrency(outAmt, true)}`}
    >
      <div className="flex items-center gap-2">
        {!compact && <span className="w-7 shrink-0 text-[10px] font-medium text-mesa-muted">In</span>}
        <div className={cn("flex-1 overflow-hidden rounded-full bg-mesa-sand", h)}>
          <div className="h-full rounded-full bg-mesa-blue" style={{ width: `${(inAmt / max) * 100}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-mesa-ink">
          {formatCurrency(inAmt, true)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {!compact && <span className="w-7 shrink-0 text-[10px] font-medium text-mesa-muted">Out</span>}
        <div className={cn("flex-1 overflow-hidden rounded-full bg-mesa-sand", h)}>
          <div
            className={cn("h-full rounded-full", OUT_FILL[status])}
            style={{ width: `${(outAmt / max) * 100}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-mesa-ink">
          {formatCurrency(outAmt, true)}
        </span>
      </div>
    </div>
  );
}
