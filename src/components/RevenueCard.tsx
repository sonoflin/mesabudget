import { Card } from "./ui/Card";
import { Slider } from "./ui/Slider";
import type { RevenueItem } from "../lib/budget-data";
import { formatCurrency } from "../lib/utils";
import { getRevenueSliderBounds } from "../lib/budget-engine";
import { BalanceBadge } from "./BalanceMeter";

interface RevenueCardProps {
  item: RevenueItem;
  amount: number;
  onChange: (amount: number) => void;
}

export function RevenueCard({ item, amount, onChange }: RevenueCardProps) {
  const bounds = getRevenueSliderBounds(item);

  return (
    <Card className={!item.adjustable ? "opacity-75" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-mesa-slate">{item.name}</h3>
          <p className="mt-1 text-xs text-mesa-muted">{item.description}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-mesa-green">{formatCurrency(amount, true)}</div>
          <BalanceBadge adopted={item.adoptedAmount} current={amount} />
        </div>
      </div>
      {item.adjustable ? (
        <div className="mt-3">
          <Slider
            label={`Adjust ${item.name}`}
            value={amount}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={onChange}
          />
          <p className="mt-1 text-[10px] text-mesa-muted">
            Adjustable ±{item.maxDeltaPct ?? 5}% from adopted
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-mesa-muted">Fixed revenue source</p>
      )}
    </Card>
  );
}
