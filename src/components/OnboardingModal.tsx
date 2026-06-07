import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { formatCurrency, withBase } from "../lib/utils";
import { meta } from "../lib/budget-engine";

interface OnboardingModalProps {
  onComplete: () => void;
  onReceipt?: () => void;
  onPriorities?: () => void;
}

export function OnboardingModal({ onComplete, onReceipt, onPriorities }: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-mesa-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-t-3xl bg-mesa-surface shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mesa-gradient px-6 pb-6 pt-7 text-white sm:px-8">
          <img src={withBase("mesa-logo.png")} alt="City of Mesa" className="h-10 w-auto brightness-0 invert" />
          <h2 id="onboarding-title" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Build Your Mesa Budget
          </h2>
          <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-white/90">
            Balance Mesa&apos;s <strong className="font-bold">{formatCurrency(meta.totalOperatingBudget, true)}</strong> operating
            budget — the same puzzle City Council faces each year.
          </p>
        </div>

        <div className="p-6 pb-safe-lg sm:p-8 sm:pb-8">
          <div className="space-y-3.5">
            {[
              { n: 1, color: "bg-mesa-red", text: "Each fund has its own rules — General (flexible), Restricted (by law), Enterprise (utility rates)." },
              { n: 2, color: "bg-mesa-amber", text: "Adjust spending and see live service impacts — every increase needs a trade-off elsewhere." },
              { n: 3, color: "bg-mesa-blue", text: "Explore Council levers: sales tax, utility rates, and the 5-year forecast." },
            ].map(({ n, color, text }) => (
              <div key={n} className="flex items-start gap-3 text-sm leading-relaxed text-mesa-ink">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color} text-xs font-bold text-white`}>{n}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <Button className="w-full" size="lg" onClick={onComplete}>
              Start building
            </Button>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {onPriorities && (
                <Button className="w-full sm:flex-1" variant="outline" onClick={onPriorities}>
                  Start with my priorities
                </Button>
              )}
              {onReceipt && (
                <Button className="w-full sm:flex-1" variant="ghost" onClick={onReceipt}>
                  See your tax receipt first
                </Button>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-mesa-muted">
            Data from{" "}
            <a href="https://openbudget.mesaaz.gov/" className="font-semibold text-mesa-blue underline" target="_blank" rel="noopener noreferrer">
              Mesa Open Budget
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
