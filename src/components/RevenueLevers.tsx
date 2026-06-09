import { Home, Building2, Vote, Landmark, Droplets } from "lucide-react";
import { Slider } from "./ui/Slider";
import { Badge } from "./ui/Badge";
import { useBudgetStore } from "../store/budget-store";
import { meta } from "../lib/budget-engine";
import { getUtilityRevenue, getUtilityContribution } from "../lib/fund-rules-engine";
import { getInitialLevers, getFundById } from "../lib/funds-model";
import { calculateUtilityBillImpact } from "../lib/household-impact";
import { cn, formatCurrency } from "../lib/utils";

/**
 * Shared, store-bound revenue-lever controls. Every lever reads and writes the
 * single global `snapshot.levers`, so the same control stays perfectly in sync
 * whether it's rendered in the dedicated Revenue view or embedded inside the
 * General Fund / Utility fund tabs.
 */

const BASE = getInitialLevers();
const BASE_SALES_RATE = meta.localSalesTaxRatePct ?? 2;
const GF_SALES_ADOPTED =
  getFundById("general-fund")?.revenues.find((r) => r.id === "local-sales-tax")?.adoptedAmount ?? 0;

type Tone = "council" | "voters" | "state";

const TONE: Record<
  Tone,
  { ring: string; chip: string; badge: "default" | "restricted" | "muted"; badgeLabel: string }
> = {
  council: {
    ring: "border-mesa-blue/20 from-mesa-blue/[0.06]",
    chip: "bg-mesa-blue/10 text-mesa-blue",
    badge: "default",
    badgeLabel: "Council sets this",
  },
  voters: {
    ring: "border-mesa-amber/30 from-mesa-amber/[0.08]",
    chip: "bg-mesa-amber/15 text-mesa-amber",
    badge: "restricted",
    badgeLabel: "Voter approval",
  },
  state: {
    ring: "border-mesa-ink/10 from-mesa-sand/50",
    chip: "bg-mesa-gray/15 text-mesa-slate",
    badge: "muted",
    badgeLabel: "No local control",
  },
};

function LeverShell({
  tone,
  icon,
  title,
  subtitle,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("flex h-full flex-col rounded-2xl border bg-gradient-to-br to-transparent p-4 lg:p-5", t.ring)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.chip)} aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold leading-tight text-mesa-ink lg:text-[15px]">{title}</h4>
            <Badge variant={t.badge} className="shrink-0 !px-2 !py-0 text-[10px]">
              {t.badgeLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-mesa-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function EffectRow({ label, delta }: { label: string; delta: number }) {
  const none = Math.abs(delta) < 1;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate text-mesa-muted">{label}</span>
      <span
        className={cn(
          "shrink-0 font-bold tabular-nums",
          none ? "text-mesa-muted" : delta > 0 ? "text-mesa-blue" : "text-mesa-red",
        )}
      >
        {none ? "no change" : `${delta > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta), true)}`}
      </span>
    </div>
  );
}

function Effects({ items }: { items: { label: string; delta: number }[] }) {
  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-mesa-ink/5 bg-mesa-surface/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-mesa-muted">What this changes</p>
      {items.map((it) => (
        <EffectRow key={it.label} {...it} />
      ))}
    </div>
  );
}

export function BillImpact({ multiplier }: { multiplier: number }) {
  const impact = calculateUtilityBillImpact(multiplier);
  const changed = Math.abs(multiplier - 1) > 0.001;

  const Row = ({
    icon,
    label,
    monthly,
    monthlyDelta,
    annualDelta,
  }: {
    icon: React.ReactNode;
    label: string;
    monthly: number;
    monthlyDelta: number;
    annualDelta: number;
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
            {monthlyDelta >= 0 ? "+" : ""}
            {formatCurrency(monthlyDelta)}/mo · {annualDelta >= 0 ? "+" : ""}
            {formatCurrency(annualDelta)}/yr
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-mesa-sand/80 p-3">
      <p className="text-xs font-semibold text-mesa-ink">Impact on utility bills</p>
      <Row icon={<Home className="h-4 w-4" />} label="Typical home" monthly={impact.residentialMonthly} monthlyDelta={impact.residentialMonthlyDelta} annualDelta={impact.residentialAnnualDelta} />
      <Row icon={<Building2 className="h-4 w-4" />} label="Typical business" monthly={impact.commercialMonthly} monthlyDelta={impact.commercialMonthlyDelta} annualDelta={impact.commercialAnnualDelta} />
    </div>
  );
}

export function UtilityRatesLever() {
  const levers = useBudgetStore((s) => s.snapshot.levers);
  const updateLevers = useBudgetStore((s) => s.updateLevers);
  const ratePct = Math.round(levers.utilityRateMultiplier * 100);

  const utilDelta = getUtilityRevenue(levers) - getUtilityRevenue(BASE);
  const gfDelta = getUtilityContribution(levers) - getUtilityContribution(BASE);

  return (
    <LeverShell
      tone="council"
      icon={<Droplets className="h-5 w-5" />}
      title="Utility rates"
      subtitle="Water, wastewater & solid-waste charges — Council's main annual revenue lever."
    >
      <Slider
        label="Rate (% of adopted)"
        value={ratePct}
        min={85}
        max={130}
        step={1}
        showValue
        editable
        editSuffix="%"
        onChange={(v) => updateLevers({ utilityRateMultiplier: v / 100 })}
      />
      <BillImpact multiplier={levers.utilityRateMultiplier} />
      <Effects
        items={[
          { label: "Utility Enterprise revenue", delta: utilDelta },
          { label: "General Fund transfer in", delta: gfDelta },
        ]}
      />
    </LeverShell>
  );
}

export function UtilityTransferLever() {
  const levers = useBudgetStore((s) => s.snapshot.levers);
  const updateLevers = useBudgetStore((s) => s.updateLevers);

  const gfDelta = getUtilityContribution(levers) - getUtilityContribution(BASE);

  return (
    <LeverShell
      tone="council"
      icon={<Building2 className="h-5 w-5" />}
      title="Utility transfer to city services"
      subtitle={`Share of utility revenue moved into the General Fund — capped at ${meta.utilityContributionCapPct}% by Council policy.`}
    >
      <Slider
        label="Transfer (% of utility revenue)"
        value={levers.utilityContributionPct}
        min={20}
        max={30}
        step={0.5}
        showValue
        editable
        editSuffix="%"
        onChange={(v) => updateLevers({ utilityContributionPct: v })}
      />
      <div className="flex-1" />
      <Effects items={[{ label: "General Fund transfer in", delta: gfDelta }]} />
    </LeverShell>
  );
}

export function SalesTaxBallotLever() {
  const levers = useBudgetStore((s) => s.snapshot.levers);
  const updateLevers = useBudgetStore((s) => s.updateLevers);

  const salesDelta =
    Math.round(GF_SALES_ADOPTED * (levers.localSalesTaxRatePct / BASE_SALES_RATE)) - GF_SALES_ADOPTED;

  return (
    <LeverShell
      tone="voters"
      icon={<Vote className="h-5 w-5" />}
      title="Local sales tax rate"
      subtitle="A change here models a hypothetical ballot measure — Council can't raise it alone; it needs voter approval at an election."
    >
      <Slider
        label="Rate (ballot measure)"
        value={levers.localSalesTaxRatePct}
        min={1.5}
        max={2.5}
        step={0.05}
        showValue
        editable
        editSuffix="%"
        onChange={(v) => updateLevers({ localSalesTaxRatePct: v })}
      />
      <div className="flex-1" />
      <Effects items={[{ label: "General Fund sales tax", delta: salesDelta }]} />
    </LeverShell>
  );
}

export function StateRevenueNote() {
  return (
    <LeverShell
      tone="state"
      icon={<Landmark className="h-5 w-5" />}
      title="State shared revenue"
      subtitle="Distributed by an Arizona formula based on population and statewide collections."
    >
      <p className="text-xs leading-relaxed text-mesa-muted">
        About {formatCurrency(120_170_937, true)} of the General Fund flows from the state. Mesa can&apos;t dial this up
        or down — it moves with the state economy and the decennial census, not Council action.
      </p>
    </LeverShell>
  );
}
