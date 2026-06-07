import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { funds, FUND_TYPE_LABELS, type FundType } from "../lib/funds-model";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { Badge } from "./ui/Badge";

const TYPE_BADGE: Record<FundType, "default" | "restricted" | "enterprise" | "muted"> = {
  discretionary: "default",
  restricted: "restricted",
  enterprise: "enterprise",
  trust: "muted",
  grant: "default",
  debt: "muted",
};

const TYPE_DOT: Record<FundType, string> = {
  discretionary: "bg-mesa-blue",
  restricted: "bg-mesa-amber",
  enterprise: "bg-mesa-blue-dark",
  trust: "bg-mesa-gray",
  grant: "bg-mesa-blue",
  debt: "bg-mesa-gray",
};

interface FundPickerSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FundPickerSheet({ open, onClose }: FundPickerSheetProps) {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const setFund = useBudgetStore((s) => s.setFund);
  const balance = useBalance();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const select = (fundId: string) => {
    setFund(fundId);
    onClose();
  };

  const sheet = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-mesa-ink/50 md:hidden"
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fund-picker-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="flex max-h-[min(85vh,640px)] w-full flex-col rounded-t-3xl bg-mesa-surface shadow-2xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-mesa-ink/5 px-4 py-3">
              <div>
                <h2 id="fund-picker-title" className="text-lg font-bold text-mesa-ink">
                  Switch fund
                </h2>
                <p className="text-xs text-mesa-muted">{funds.length} funds · tap one to explore</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-mesa-sand"
                aria-label="Close fund picker"
              >
                <X className="h-5 w-5 text-mesa-ink" />
              </button>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2 pb-safe-lg">
              {funds.map((fund) => {
                const fb = balance.fundBalances?.find((b) => b.fundId === fund.id);
                const isActive = activeFundId === fund.id;
                const hasDeficit = fb?.status === "deficit";

                return (
                  <li key={fund.id}>
                    <button
                      type="button"
                      onClick={() => select(fund.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "mb-1.5 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors min-h-[56px]",
                        isActive
                          ? "border-mesa-blue bg-mesa-blue/10"
                          : "border-mesa-ink/8 bg-mesa-surface hover:border-mesa-blue/30 hover:bg-mesa-sand/50",
                        hasDeficit && !isActive && "border-mesa-red/30 bg-mesa-red/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                          hasDeficit && !isActive ? "bg-mesa-red" : TYPE_DOT[fund.type],
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-mesa-ink leading-snug">{fund.name}</span>
                          {isActive && <Check className="h-4 w-4 shrink-0 text-mesa-blue" aria-hidden />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant={TYPE_BADGE[fund.type]} className="!py-0">
                            {FUND_TYPE_LABELS[fund.type]}
                          </Badge>
                          {fb && (
                            <span className="text-xs text-mesa-muted tabular-nums">
                              {formatCurrency(fb.totalExpenditure, true)}
                            </span>
                          )}
                          {fb && (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                hasDeficit ? "text-mesa-red" : "text-mesa-blue",
                              )}
                            >
                              {hasDeficit
                                ? `${formatCurrency(Math.abs(fb.difference), true)} short`
                                : "Balanced"}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}
