import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Card } from "./ui/Card";
import { BalanceBadge } from "./BalanceMeter";
import { ExpenditureCard } from "./CategoryCard";
import type { Fund, FundLine } from "../lib/funds-model";
import { formatCurrency } from "../lib/utils";

interface InternalServicesGroupProps {
  fund: Fund;
  exps: FundLine[];
  amounts: Record<string, number>;
  iconMap: Record<string, string>;
  descMap: Record<string, string>;
  activeCategoryId: string | null;
  readOnly?: boolean;
  onChange: (expId: string, amount: number) => void;
  onDetails: (expId: string) => void;
}

export function InternalServicesGroup({
  fund, exps, amounts, iconMap, descMap, activeCategoryId, readOnly, onChange, onDetails,
}: InternalServicesGroupProps) {
  const [open, setOpen] = useState(false);

  const adoptedTotal = exps.reduce((s, e) => s + e.adoptedAmount, 0);
  const currentTotal = exps.reduce((s, e) => s + (amounts[e.id] ?? e.adoptedAmount), 0);

  return (
    <Card className="h-full border-mesa-slate/20 bg-mesa-sand/60 xl:col-span-2 2xl:col-span-3 lg:p-5" id={`exp-${exps[0]?.id ?? "internal-services"}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mesa-slate/10 text-mesa-slate" aria-hidden>
          <Settings2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-mesa-ink">Internal &amp; Support Services</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-mesa-blue">{formatCurrency(currentTotal, true)}</span>
              {open ? <ChevronUp className="h-5 w-5 text-mesa-muted" /> : <ChevronDown className="h-5 w-5 text-mesa-muted" />}
            </div>
          </div>
          <p className="mt-0.5 text-sm text-mesa-muted">
            HR, technology, finance, legal &amp; more — the backbone that keeps every department running.
          </p>
          <div className="mt-1">
            <BalanceBadge adopted={adoptedTotal} current={currentTotal} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-lg bg-mesa-amber/5 px-3 py-2 text-xs text-mesa-ink">
              These look like &ldquo;overhead,&rdquo; but each is load-bearing. Zero out HR and you can&apos;t hire,
              pay, or insure employees; cut IT and core systems (including 911 dispatch and billing) go dark.
            </p>
            <div className="mt-3 space-y-3">
              {exps.map((exp) => (
                <ExpenditureCard
                  key={exp.id}
                  fund={fund}
                  expId={exp.id}
                  name={exp.name}
                  icon={iconMap[exp.id] ?? "layers"}
                  adoptedAmount={exp.adoptedAmount}
                  amount={amounts[exp.id] ?? exp.adoptedAmount}
                  adjustable={exp.adjustable && !readOnly}
                  description={descMap[exp.id] ?? ""}
                  onChange={(amt) => !readOnly && onChange(exp.id, amt)}
                  onDetails={() => onDetails(exp.id)}
                  selected={activeCategoryId === exp.id}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
