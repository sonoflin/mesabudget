import { motion } from "framer-motion";
import { Droplets, Vote, PiggyBank, Scissors, ArrowLeftRight, Sparkles, Lock } from "lucide-react";
import { Card } from "./ui/Card";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { funds, getFundById, meta } from "../lib/funds-model";
import { getBalanceResolution } from "../lib/balance-resolver";
import { calculateUtilityBillImpact } from "../lib/household-impact";
import { cn, formatCurrency } from "../lib/utils";

const RATE_MAX = 1.3;

function OptionRow({
  icon,
  title,
  children,
  tone = "neutral",
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "amber" | "muted";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <li className="flex gap-3 rounded-xl bg-mesa-surface/70 p-3">
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          tone === "blue" && "bg-mesa-blue/10 text-mesa-blue",
          tone === "amber" && "bg-mesa-amber/15 text-mesa-amber",
          tone === "muted" && "bg-mesa-gray/15 text-mesa-muted",
          tone === "neutral" && "bg-mesa-ink/5 text-mesa-ink",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-mesa-ink">{title}</p>
        <p className="mt-0.5 text-xs text-mesa-muted">{children}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 rounded-lg bg-mesa-blue px-3 py-1.5 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {action.label}
          </button>
        )}
      </div>
    </li>
  );
}

export function BalanceResolver() {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  const snapshot = useBudgetStore((s) => s.snapshot);
  const updateLevers = useBudgetStore((s) => s.updateLevers);
  const balance = useBalance();

  const fund = getFundById(activeFundId) ?? funds[0];
  const fb = balance.fundBalances?.find((b) => b.fundId === fund.id);
  if (!fb || fb.status === "balanced") return null;

  const res = getBalanceResolution(fund, fb, snapshot.levers, meta.utilityContributionCapPct ?? 30);
  const gapLabel = formatCurrency(res.gap, true);

  // ---- SURPLUS ----
  if (fb.status === "surplus") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-mesa-amber/30 bg-gradient-to-br from-mesa-amber/10 to-transparent">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-mesa-amber" aria-hidden />
            <div>
              <h3 className="font-semibold text-mesa-ink">{gapLabel} unallocated in {fund.name}</h3>
              <p className="text-xs text-mesa-muted">
                {fund.id === "utility-enterprise"
                  ? "Rates bring in more than operations cost. The surplus funds capital, debt, and the transfer to city services — or could fund rate relief for customers."
                  : fund.type === "discretionary"
                    ? "You can add services, strengthen the reserve, or trim the utility transfer (which could let Council lower rates)."
                    : "Unspent dollars stay in this fund's reserve for its dedicated purpose — they cannot move to other services."}
              </p>
              {res.equivalents.length > 0 && (
                <p className="mt-2 text-xs font-medium text-mesa-ink">{gapLabel} {res.equivalents[0]}</p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // ---- DEFICIT ----
  const curMult = snapshot.levers.utilityRateMultiplier;
  const pctNeeded = res.utilityRatePctNeeded;
  let neededMult = pctNeeded != null ? curMult * (1 + pctNeeded / 100) : null;
  let clamped = false;
  if (neededMult != null && neededMult > RATE_MAX) {
    neededMult = RATE_MAX;
    clamped = true;
  }
  const impactNeeded = neededMult != null ? calculateUtilityBillImpact(neededMult) : null;
  const impactCur = calculateUtilityBillImpact(curMult);
  const resAdd = impactNeeded ? impactNeeded.residentialAnnual - impactCur.residentialAnnual : 0;
  const comAdd = impactNeeded ? impactNeeded.commercialAnnual - impactCur.commercialAnnual : 0;

  const canUseRate = (fund.id === "general-fund" || fund.id === "utility-enterprise") && neededMult != null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-mesa-red/30 bg-gradient-to-br from-mesa-red/10 to-transparent">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mesa-red text-xs font-bold text-white" aria-hidden>!</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-mesa-ink">
              {fund.name} is short {gapLabel}
            </h3>
            <p className="text-xs text-mesa-muted">
              You're spending more than this fund takes in. Mesa must adopt a balanced budget — here's how Council could close the gap, and what each choice costs.
            </p>
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {/* The real lever: utility rates */}
          {canUseRate && (
            <OptionRow
              icon={<Droplets className="h-4 w-4" />}
              title={`Raise utility rates about +${Math.round(pctNeeded ?? 0)}%`}
              tone="blue"
              action={{
                label: clamped ? "Raise rates to the max" : "Cover the gap with rates",
                onClick: () => updateLevers({ utilityRateMultiplier: Math.round((neededMult ?? curMult) * 100) / 100 }),
              }}
            >
              {fund.id === "general-fund"
                ? "Utility rates are Council's one true revenue lever for city services. "
                : "Utility operations must be covered by rates. "}
              Costs a typical home about <strong className="text-mesa-ink">+{formatCurrency(resAdd)}/yr</strong> and a typical business about <strong className="text-mesa-ink">+{formatCurrency(comAdd)}/yr</strong>.
              {clamped && " This alone won't fully cover it — you'd also need to cut spending."}
            </OptionRow>
          )}

          {/* Shift more of the transfer toward the cap — no bill increase */}
          {fund.id === "general-fund" && (res.contributionHeadroom ?? 0) > 100_000 && (
            <OptionRow
              icon={<ArrowLeftRight className="h-4 w-4" />}
              title="Raise the utility transfer toward the 30% cap"
              tone="blue"
              action={{
                label: "Move transfer to the 30% cap",
                onClick: () => updateLevers({ utilityContributionPct: meta.utilityContributionCapPct ?? 30 }),
              }}
            >
              Shifts up to {formatCurrency(res.contributionHeadroom ?? 0, true)} of existing utility revenue to city services <strong className="text-mesa-ink">without raising bills</strong> — but it leaves less for water and energy infrastructure.
            </OptionRow>
          )}

          {/* Voter action — not a Council lever */}
          {fund.id === "general-fund" && (
            <OptionRow icon={<Vote className="h-4 w-4" />} title="Ask voters to raise the sales tax" tone="amber">
              The 2% local sales tax can't be raised by Council — it requires a ballot measure at a city election. Not available as an annual budget lever.
            </OptionRow>
          )}

          {/* Reserves — one-time */}
          {res.reserveYears != null && (
            <OptionRow icon={<PiggyBank className="h-4 w-4" />} title="Draw down reserves (one-time)" tone="muted">
              Reserves could cover this for about {res.reserveYears} year{res.reserveYears === 1 ? "" : "s"} — but it's one-time money. Relying on it creates a structural deficit.
            </OptionRow>
          )}

          {/* Cut spending */}
          {fund.type === "discretionary" || fund.id === "utility-enterprise" ? (
            <OptionRow icon={<Scissors className="h-4 w-4" />} title="Or cut spending" tone="neutral">
              Closing {gapLabel} with cuts is {res.equivalents.join(" — or ") || "a significant reduction"}.
            </OptionRow>
          ) : (
            <OptionRow icon={<Lock className="h-4 w-4" />} title="Cut within this fund" tone="neutral">
              These dollars are dedicated by law or voters and can't be backfilled from other funds. The gap of {gapLabel} is {res.equivalents.join(" — or ") || "a significant reduction"}.
            </OptionRow>
          )}
        </ul>
      </Card>
    </motion.div>
  );
}
