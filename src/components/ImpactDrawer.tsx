import { X } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { formatCurrency, formatPct } from "../lib/utils";
import { getImpactForCategory, hasRubric } from "../lib/impact-engine";
import { getCategoryRules } from "../lib/fund-rules-engine";
import { categories } from "../lib/budget-data";

interface ImpactDrawerProps {
  categoryId: string;
  amount: number;
  onClose: () => void;
}

export function ImpactDrawer({ categoryId, amount, onClose }: ImpactDrawerProps) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return null;

  const impact = getImpactForCategory(category.id, category.adoptedAmount, amount);
  const rules = getCategoryRules(category.id);
  const deltaPct = category.adoptedAmount ? ((amount - category.adoptedAmount) / category.adoptedAmount) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-mesa-ink/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="impact-drawer-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-mesa-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="impact-drawer-title" className="text-lg font-bold text-mesa-ink">{category.name}</h2>
            <p className="text-sm text-mesa-muted">{formatCurrency(amount, true)} · {formatPct(deltaPct)} vs adopted</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-mesa-sand min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {impact && hasRubric(category.id) && (
          <div className="mb-4 space-y-3">
            <Badge variant={impact.serviceLevel >= 3 ? "success" : impact.serviceLevel >= 2 ? "warning" : "danger"}>
              {impact.serviceLevel}/5 — {impact.serviceLabel}
            </Badge>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`h-2 flex-1 rounded-full ${n <= impact.serviceLevel ? "bg-mesa-blue" : "bg-mesa-sand"}`} />
              ))}
            </div>
            {impact.unitEstimate && <p className="text-sm font-medium text-mesa-blue">{impact.unitEstimate}</p>}
            <ul className="space-y-2">
              {impact.headlines.map((h) => <li key={h} className="font-semibold text-mesa-ink">{h}</li>)}
              {impact.details.map((d) => <li key={d} className="text-sm text-mesa-muted">• {d}</li>)}
            </ul>
            {impact.realWorldExample && (
              <p className="rounded-lg bg-mesa-blue/5 p-3 text-xs text-mesa-ink">
                <strong>Real Mesa example:</strong> {impact.realWorldExample}
              </p>
            )}
          </div>
        )}

        {rules.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold text-mesa-ink">Fund rules</h3>
            {rules.map((r) => (
              <div key={r.id} className="text-xs text-mesa-muted">
                <strong>{r.name}:</strong> {r.description}
              </div>
            ))}
          </div>
        )}

        <a href="https://openbudget.mesaaz.gov/#!/year/2026/" target="_blank" rel="noopener noreferrer" className="text-sm text-mesa-blue underline">
          View in Mesa Open Budget →
        </a>
        <Button className="mt-4 w-full" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
