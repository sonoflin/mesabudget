import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { getImpactForCategory } from "../lib/impact-engine";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

interface ImpactInlineProps {
  categoryId: string;
  adoptedAmount: number;
  currentAmount: number;
  className?: string;
}

export function ImpactInline({ categoryId, adoptedAmount, currentAmount, className }: ImpactInlineProps) {
  const impact = getImpactForCategory(categoryId, adoptedAmount, currentAmount);
  const deltaPct = adoptedAmount ? ((currentAmount - adoptedAmount) / adoptedAmount) * 100 : 0;

  if (!impact || Math.abs(deltaPct) < 1) return null;

  const isCut = deltaPct < 0;
  const isIncrease = deltaPct > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "mt-3 overflow-hidden rounded-xl border p-3 text-sm",
          isCut && "border-mesa-red/20 bg-mesa-red/5",
          isIncrease && "border-mesa-blue/20 bg-mesa-blue/5",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          {isCut ? (
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-mesa-red" aria-hidden />
          ) : (
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-mesa-blue" aria-hidden />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={impact.serviceLevel >= 3 ? "success" : impact.serviceLevel >= 2 ? "warning" : "danger"}>
                Service {impact.serviceLevel}/5 — {impact.serviceLabel}
              </Badge>
              {impact.unitEstimate && (
                <span className="text-xs font-medium text-mesa-ink">{impact.unitEstimate}</span>
              )}
            </div>
            {impact.headlines[0] && (
              <p className="font-semibold text-mesa-ink">{impact.headlines[0]}</p>
            )}
            {impact.details[0] && (
              <p className="text-xs text-mesa-muted line-clamp-2">{impact.details[0]}</p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TeachingMoment({
  message,
  teaching,
  severity = "warning",
  onDismiss,
}: {
  message: string;
  teaching?: string;
  severity?: "error" | "warning" | "info";
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start gap-2 rounded-xl p-3 text-sm",
        severity === "error" && "bg-mesa-red/10 text-mesa-red border border-mesa-red/20",
        severity === "warning" && "bg-mesa-amber/10 text-mesa-amber border border-mesa-amber/20",
        severity === "info" && "bg-mesa-blue/10 text-mesa-blue border border-mesa-blue/20",
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">{message}</p>
        {teaching && <p className="mt-1 text-xs opacity-90">{teaching}</p>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs underline shrink-0">
          Dismiss
        </button>
      )}
    </motion.div>
  );
}
