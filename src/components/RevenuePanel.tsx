import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { useBudgetStore } from "../store/budget-store";
import { funds, getFundById, REVENUE_CONTROL_META } from "../lib/funds-model";
import { computeFundRevenueLines } from "../lib/fund-rules-engine";
import { cn, formatCurrency } from "../lib/utils";

const CONTROL_DOT: Record<string, string> = {
  council: "bg-mesa-blue",
  voters: "bg-mesa-amber",
  state: "bg-mesa-slate",
  fees: "bg-mesa-gray",
  reserves: "bg-mesa-red",
};

export function RevenuePanel() {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const snapshot = useBudgetStore((s) => s.snapshot);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const fund = getFundById(activeFundId) ?? funds[0];
  const fundSnap = snapshot.funds[fund.id];
  if (!fundSnap) return null;

  const lines = computeFundRevenueLines(fund, fundSnap, snapshot.levers, snapshot);
  const totalIn = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <Card className="h-full space-y-3 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-mesa-ink lg:text-base">Where the money comes from</h3>
          <p className="text-xs text-mesa-muted lg:text-sm">
            Mesa can only spend what it brings in. Tap a source to see who controls it.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-extrabold text-mesa-blue tabular-nums lg:text-base">
            {formatCurrency(totalIn, true)}
          </div>
          <div className="text-[11px] font-medium text-mesa-muted">total in</div>
        </div>
      </div>

      {/* Revenue sources with who-controls-them */}
      <ul className="space-y-1.5 border-t border-mesa-ink/5 pt-3">
        {lines.map((line) => {
          const meta = REVENUE_CONTROL_META[line.control];
          const delta = line.amount - line.adoptedAmount;
          const isOpen = openInfo === line.id;
          return (
            <li key={line.id} className="rounded-xl">
              <button
                type="button"
                onClick={() => setOpenInfo(isOpen ? null : line.id)}
                className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-mesa-sand/60"
                aria-expanded={isOpen}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CONTROL_DOT[line.control])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-mesa-ink">{line.name}</span>
                  <span className="flex items-center gap-1.5">
                    <Badge variant={meta.badge} className="!px-1.5 !py-0 text-[10px]">{meta.label}</Badge>
                    {line.leverDriven && delta !== 0 && (
                      <span className={cn("text-[10px] font-semibold", delta > 0 ? "text-mesa-blue" : "text-mesa-red")}>
                        {delta > 0 ? "+" : ""}{formatCurrency(delta, true)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-mesa-ink tabular-nums">
                  {formatCurrency(line.amount, true)}
                </span>
                <Info className="h-3.5 w-3.5 shrink-0 text-mesa-muted" aria-hidden />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-5 pr-2 text-xs text-mesa-muted"
                  >
                    <span className="block py-1.5">{meta.explanation}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
