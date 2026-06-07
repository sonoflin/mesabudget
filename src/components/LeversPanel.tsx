import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Home, Building2, Vote, Landmark, Droplets } from "lucide-react";
import { Slider } from "./ui/Slider";
import { Card } from "./ui/Card";
import { useBudgetStore } from "../store/budget-store";
import { meta } from "../lib/budget-engine";
import { calculateUtilityBillImpact } from "../lib/household-impact";
import { formatCurrency } from "../lib/utils";

function BillImpact({ multiplier }: { multiplier: number }) {
  const impact = calculateUtilityBillImpact(multiplier);
  const changed = Math.abs(multiplier - 1) > 0.001;

  const Row = ({ icon, label, monthly, monthlyDelta, annualDelta }: {
    icon: React.ReactNode; label: string; monthly: number; monthlyDelta: number; annualDelta: number;
  }) => (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mesa-blue/10 text-mesa-blue" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-xs text-mesa-muted">{label}</span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-mesa-ink tabular-nums">{formatCurrency(monthly)}/mo</span>
        {changed && (
          <span className={monthlyDelta >= 0 ? "block text-[11px] font-semibold text-mesa-red" : "block text-[11px] font-semibold text-mesa-blue"}>
            {monthlyDelta >= 0 ? "+" : ""}{formatCurrency(monthlyDelta)}/mo · {annualDelta >= 0 ? "+" : ""}{formatCurrency(annualDelta)}/yr
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div className="space-y-2 rounded-xl bg-mesa-sand/80 p-3">
      <p className="text-xs font-semibold text-mesa-ink">Impact on utility bills</p>
      <Row icon={<Home className="h-4 w-4" />} label="Typical home" monthly={impact.residentialMonthly} monthlyDelta={impact.residentialMonthlyDelta} annualDelta={impact.residentialAnnualDelta} />
      <Row icon={<Building2 className="h-4 w-4" />} label="Typical business" monthly={impact.commercialMonthly} monthlyDelta={impact.commercialMonthlyDelta} annualDelta={impact.commercialAnnualDelta} />
    </div>
  );
}

export function LeversPanel() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  const updateLevers = useBudgetStore((s) => s.updateLevers);
  const activeFundId = useBudgetStore((s) => s.activeFundId);

  const isGeneral = activeFundId === "general-fund";
  const isUtility = activeFundId === "utility-enterprise";
  const showLevers = isGeneral || isUtility;
  const [expanded, setExpanded] = useState(true);

  if (!showLevers) return null;

  const ratePct = Math.round(snapshot.levers.utilityRateMultiplier * 100);

  return (
    <Card className="h-full border-mesa-blue/20 bg-gradient-to-br from-mesa-blue/5 to-transparent lg:p-5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left">
        <div>
          <h3 className="font-semibold text-mesa-ink lg:text-base">Revenue levers</h3>
          <p className="text-xs text-mesa-muted lg:text-sm">What Council can — and can't — change</p>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-mesa-muted" /> : <ChevronDown className="h-5 w-5 text-mesa-muted" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 space-y-5 overflow-hidden">
            {/* COUNCIL CONTROLS */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mesa-blue/10 text-mesa-blue" aria-hidden>
                  <Droplets className="h-3.5 w-3.5" />
                </span>
                <h4 className="text-sm font-bold text-mesa-blue">Council can change this</h4>
              </div>

              <Slider
                label="Utility rates (% of adopted)"
                value={ratePct}
                min={85}
                max={130}
                step={1}
                showValue
                editable
                editSuffix="%"
                onChange={(v) => updateLevers({ utilityRateMultiplier: v / 100 })}
              />

              <BillImpact multiplier={snapshot.levers.utilityRateMultiplier} />

              {isGeneral && (
                <Slider
                  label={`Utility transfer to city services (cap ${meta.utilityContributionCapPct}%)`}
                  value={snapshot.levers.utilityContributionPct}
                  min={20}
                  max={30}
                  step={0.5}
                  showValue
                  editable
                  editSuffix="%"
                  onChange={(v) => updateLevers({ utilityContributionPct: v })}
                />
              )}
            </section>

            {isGeneral && (
              <>
                {/* VOTER APPROVAL REQUIRED */}
                <section className="space-y-3 border-t border-mesa-ink/5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mesa-amber/15 text-mesa-amber" aria-hidden>
                      <Vote className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-sm font-bold text-mesa-amber">Only voters can change this</h4>
                  </div>
                  <p className="text-xs text-mesa-muted">
                    Council can't raise the local sales tax on its own. This slider models a <strong className="text-mesa-ink">hypothetical ballot measure</strong> — it would require a city election to take effect.
                  </p>
                  <Slider
                    label="Local sales tax rate (ballot measure)"
                    value={snapshot.levers.localSalesTaxRatePct}
                    min={1.5}
                    max={2.5}
                    step={0.05}
                    showValue
                    editable
                    editSuffix="%"
                    onChange={(v) => updateLevers({ localSalesTaxRatePct: v })}
                  />
                </section>

                {/* NO LOCAL CONTROL */}
                <section className="space-y-2 border-t border-mesa-ink/5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mesa-gray/15 text-mesa-muted" aria-hidden>
                      <Landmark className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-sm font-bold text-mesa-slate">No local control</h4>
                  </div>
                  <p className="text-xs text-mesa-muted">
                    State shared revenue (~{formatCurrency(120_170_937, true)}) is set by an Arizona formula based on population and statewide collections. Mesa can't dial it up or down.
                  </p>
                </section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
