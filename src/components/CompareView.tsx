import { Card } from "./ui/Card";
import { formatCurrency, formatPct } from "../lib/utils";
import { getCategoryDeltas } from "../lib/budget-engine";
import { useBudgetStore } from "../store/budget-store";
import { getImpactForAllChanges } from "../lib/impact-engine";
import { categories } from "../lib/budget-data";

export function CompareView() {
  const legacy = useBudgetStore((s) => s.getLegacySnapshot());
  const deltas = getCategoryDeltas(legacy).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const increases = deltas.filter((d) => d.delta > 0).slice(0, 5);
  const decreases = deltas.filter((d) => d.delta < 0).slice(0, 5);
  const impacts = getImpactForAllChanges(categories, legacy.categoryAmounts);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-mesa-ink">Compared to City&apos;s adopted budget</h3>
        <p className="mt-1 text-sm text-mesa-muted">
          See where your priorities differ from the FY 2025/26 budget Council approved.
        </p>
      </Card>

      {increases.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-mesa-blue">You increased</h4>
          <ul className="mt-2 space-y-2">
            {increases.map((d) => (
              <li key={d.id} className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="font-medium text-mesa-blue">
                  +{formatCurrency(d.delta, true)} ({formatPct(d.deltaPct)})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {decreases.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-mesa-red">You decreased</h4>
          <ul className="mt-2 space-y-2">
            {decreases.map((d) => (
              <li key={d.id} className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="font-medium text-mesa-red">
                  {formatCurrency(d.delta, true)} ({formatPct(d.deltaPct)})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {impacts.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-mesa-ink">Service consequences</h4>
          <ul className="mt-2 space-y-3">
            {impacts.slice(0, 5).map((imp) => {
              const cat = categories.find((c) => c.id === imp.categoryId);
              return (
                <li key={imp.categoryId} className="text-sm">
                  <span className="font-semibold">{cat?.name}</span>
                  <span className="text-mesa-muted"> — {imp.serviceLabel}</span>
                  {imp.headlines[0] && <p className="text-xs text-mesa-muted mt-0.5">{imp.headlines[0]}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {deltas.length === 0 && (
        <Card>
          <p className="text-sm text-mesa-muted">Your budget matches the City&apos;s adopted budget.</p>
        </Card>
      )}
    </div>
  );
}
