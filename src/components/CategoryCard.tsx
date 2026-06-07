import {
  Shield, Flame, Scale, BookOpen, Trees, Palette, Heart, Building2, Landmark,
  Bus, Route, BadgeCheck, Sparkles, Leaf, Ambulance, Droplets, Trash2, Zap,
  Plane, HeartPulse, LifeBuoy, FileBadge, Layers, Lock, Cpu, Users, Calculator,
  Briefcase, Gavel, Ruler, Wrench, TrendingUp, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Slider } from "./ui/Slider";
import { BalanceBadge } from "./BalanceMeter";
import { ImpactInline } from "./ImpactInline";
import type { Fund } from "../lib/funds-model";
import { formatCurrency, cn } from "../lib/utils";
import { getTeachingForFund } from "../lib/fund-rules-engine";

const ICONS: Record<string, LucideIcon> = {
  shield: Shield, flame: Flame, scale: Scale, book: BookOpen, trees: Trees,
  palette: Palette, heart: Heart, building: Building2, landmark: Landmark,
  bus: Bus, road: Route, badge: BadgeCheck, sparkles: Sparkles, leaf: Leaf,
  ambulance: Ambulance, droplets: Droplets, trash: Trash2, zap: Zap,
  plane: Plane, "heart-pulse": HeartPulse, "life-buoy": LifeBuoy,
  "file-badge": FileBadge, layers: Layers, cpu: Cpu, users: Users,
  calculator: Calculator, briefcase: Briefcase, gavel: Gavel, ruler: Ruler,
  wrench: Wrench, "trending-up": TrendingUp,
};

/** Editable "% of adopted" field that drives the dollar slider. */
function PercentOfAdopted({
  adopted, amount, onChange,
}: { adopted: number; amount: number; onChange: (n: number) => void }) {
  const current = adopted ? Math.round((amount / adopted) * 100) : 100;
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft == null) return;
    const parsed = parseFloat(draft);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(50, Math.min(150, parsed));
    onChange(Math.round((adopted * clamped) / 100));
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        aria-label="Set percent of adopted budget"
        value={draft ?? current}
        min={50}
        max={150}
        step={1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-14 rounded-md border border-mesa-ink/15 bg-mesa-surface px-1.5 py-0.5 text-right text-xs font-semibold text-mesa-blue focus:border-mesa-blue focus:outline-none"
      />
      <span className="text-xs font-medium text-mesa-muted">% of adopted</span>
    </span>
  );
}

interface ExpenditureCardProps {
  fund: Fund;
  expId: string;
  name: string;
  icon: string;
  adoptedAmount: number;
  amount: number;
  adjustable: boolean;
  description: string;
  onChange: (amount: number) => void;
  onDetails?: () => void;
  selected?: boolean;
  readOnly?: boolean;
}

export function ExpenditureCard({
  expId, name, icon, adoptedAmount, amount, adjustable, description,
  onChange, onDetails, selected, readOnly, fund,
}: ExpenditureCardProps) {
  const Icon = ICONS[icon] ?? Layers;
  const step = adoptedAmount > 10_000_000 ? 500_000 : adoptedAmount > 1_000_000 ? 100_000 : 10_000;
  const bounds = {
    min: Math.max(0, Math.round(adoptedAmount * 0.5)),
    max: Math.round(adoptedAmount * 1.5),
    step,
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full" id={`exp-${expId}`}>
      <Card className={cn("h-full transition-all lg:p-5", selected && "ring-2 ring-mesa-blue shadow-md")}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            !adjustable ? "bg-mesa-gray/15 text-mesa-muted" : "bg-mesa-blue/10 text-mesa-blue",
          )}>
            {!adjustable ? <Lock className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={onDetails}
                className="text-left text-[15px] font-bold leading-snug text-mesa-ink transition-colors hover:text-mesa-blue lg:text-base"
              >
                {name}
              </button>
              <div className="shrink-0 text-right">
                <div className="text-base font-extrabold tabular-nums text-mesa-blue lg:text-lg">{formatCurrency(amount, true)}</div>
                <BalanceBadge adopted={adoptedAmount} current={amount} />
              </div>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-mesa-muted">{description}</p>
            {!adjustable && (
              <Badge variant="muted" className="mt-2">
                Fixed by law or policy
              </Badge>
            )}
            {adjustable && !readOnly && (
              <div className="mt-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <span className="text-xs font-medium text-mesa-muted">Drag or type a value</span>
                  <PercentOfAdopted adopted={adoptedAmount} amount={amount} onChange={onChange} />
                </div>
                <Slider
                  label={`Adjust ${name}`}
                  value={amount}
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  onChange={onChange}
                />
                <div className="mt-1 flex justify-between text-xs text-mesa-muted">
                  <span>{formatCurrency(bounds.min, true)}</span>
                  <span className="text-mesa-blue font-medium">Adopted {formatCurrency(adoptedAmount, true)}</span>
                  <span>{formatCurrency(bounds.max, true)}</span>
                </div>
              </div>
            )}
            <ImpactInline categoryId={expId} adoptedAmount={adoptedAmount} currentAmount={amount} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function FundTeachingCard({ fund }: { fund: Fund }) {
  return (
    <div className="rounded-xl border border-mesa-amber/20 bg-mesa-amber/5 p-3 text-sm text-mesa-ink lg:p-4 lg:text-base lg:leading-relaxed">
      <p>{getTeachingForFund(fund)}</p>
    </div>
  );
}
