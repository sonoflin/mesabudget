import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Slider } from "./ui/Slider";
import { MesaScape } from "./ui/MesaScape";
import { calculateHouseholdImpact, getDefaultHousehold, type HouseholdProfile } from "../lib/household-impact";
import { useBudgetStore } from "../store/budget-store";
import { formatCurrency, withBase } from "../lib/utils";

interface TaxpayerReceiptProps {
  onStart: () => void;
}

export function TaxpayerReceipt({ onStart }: TaxpayerReceiptProps) {
  const levers = useBudgetStore((s) => s.snapshot.levers);
  const [profile, setProfile] = useState<HouseholdProfile>(getDefaultHousehold());
  const impact = calculateHouseholdImpact(profile, levers);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md space-y-4"
    >
      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden mesa-gradient-hero px-5 pb-5 pt-5 text-white">
          <MesaScape tone="light" sun className="absolute inset-x-0 bottom-0 h-24 w-full" />
          <div className="mesa-grain absolute inset-0 opacity-[0.08] mix-blend-overlay" aria-hidden />
          <div className="relative">
            <img src={withBase("mesa-logo.png")} alt="City of Mesa" className="h-10 w-auto brightness-0 invert" />
            <h2 className="mt-3 text-xl font-bold">Your Mesa Tax Receipt</h2>
            <p className="text-sm text-white/90">See where your dollars go — then build your own budget</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <Slider
            label="Annual spending (sales tax base)"
            value={profile.annualSpending}
            min={20000}
            max={120000}
            step={5000}
            showValue
            formatValue={(v) => formatCurrency(v)}
            onChange={(v) => setProfile({ ...profile, annualSpending: v })}
          />
          <Slider
            label="Home taxable value"
            value={profile.taxableHomeValue}
            min={100000}
            max={400000}
            step={5000}
            showValue
            formatValue={(v) => formatCurrency(v)}
            onChange={(v) => setProfile({ ...profile, taxableHomeValue: v })}
          />

          <div className="border-t border-mesa-ink/10 pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Estimated annual total</span>
              <span className="text-mesa-blue">{formatCurrency(impact.totalAnnual)}</span>
            </div>
            <p className="text-xs text-mesa-muted mt-1">~{formatCurrency(impact.monthlyTotal)}/month</p>
          </div>

          <ul className="space-y-2 text-sm">
            {impact.receiptLines.filter((l) => l.amount > 0).map((line) => (
              <li key={line.id} className="flex justify-between">
                <span className="text-mesa-muted">{line.label}</span>
                <span className="font-medium">{formatCurrency(line.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t pt-2">
              <span className="text-mesa-muted">Property tax</span>
              <span className="font-medium">{formatCurrency(impact.propertyTax)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-mesa-muted">Utilities (est.)</span>
              <span className="font-medium">{formatCurrency(impact.utilityBillsAnnual)}</span>
            </li>
          </ul>

          <Button className="w-full" size="lg" onClick={onStart}>
            Build your own budget →
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
