import { useState } from "react";
import { cn } from "../../lib/utils";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  label: string;
  className?: string;
  showValue?: boolean;
  formatValue?: (v: number) => string;
  /** When true, the value display becomes an editable number field. */
  editable?: boolean;
  /** Suffix rendered next to the editable input (e.g. "%"). */
  editSuffix?: string;
}

export function Slider({
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  label,
  className,
  showValue,
  formatValue,
  editable,
  editSuffix,
}: SliderProps) {
  const pct = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft == null) return;
    const parsed = parseFloat(draft);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(min, Math.min(max, parsed));
    const snapped = Math.round(clamped / step) * step;
    onChange(Number(snapped.toFixed(4)));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showValue && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-mesa-muted">{label}</span>
          {editable ? (
            <span className="inline-flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                aria-label={`${label} value`}
                disabled={disabled}
                value={draft ?? value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-16 rounded-md border border-mesa-ink/15 bg-mesa-surface px-2 py-0.5 text-right text-sm font-semibold text-mesa-blue focus:border-mesa-blue focus:outline-none disabled:opacity-50"
              />
              {editSuffix && <span className="text-sm font-semibold text-mesa-blue">{editSuffix}</span>}
            </span>
          ) : (
            <span className="font-semibold text-mesa-blue">
              {formatValue ? formatValue(value) : value}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-mesa-sand">
          <div
            className="h-full rounded-full bg-gradient-to-r from-mesa-red via-mesa-amber to-mesa-blue transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-disabled={disabled}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 h-2.5 w-full cursor-pointer appearance-none bg-transparent opacity-0",
            "disabled:cursor-not-allowed",
            "[&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10",
          )}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-mesa-blue shadow-md transition-all"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
    </div>
  );
}
