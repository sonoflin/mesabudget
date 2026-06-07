import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Trees, BookOpen, Heart, Bus, Settings2, ChevronDown, ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Slider } from "./ui/Slider";
import {
  PRIORITY_AREAS, getAdoptedAreas, getGeneralFundTotal, getAdoptedFor, allocateToExpenditures,
} from "../lib/priorities-engine";
import { formatCurrency, withBase } from "../lib/utils";

interface PrioritiesModeProps {
  onApply: (amounts: Record<string, number>) => void;
  onCancel: () => void;
}

const ICONS: Record<string, LucideIcon> = {
  shield: Shield, trees: Trees, book: BookOpen, heart: Heart, bus: Bus, settings: Settings2,
};

const AREA_STYLE: Record<string, { bar: string; chip: string }> = {
  "mesa-red": { bar: "bg-mesa-red", chip: "bg-mesa-red/10 text-mesa-red" },
  "mesa-blue": { bar: "bg-mesa-blue", chip: "bg-mesa-blue/10 text-mesa-blue" },
  "mesa-amber": { bar: "bg-mesa-amber", chip: "bg-mesa-amber/15 text-mesa-amber" },
  "mesa-slate": { bar: "bg-mesa-slate", chip: "bg-mesa-slate/10 text-mesa-slate" },
};

export function PrioritiesMode({ onApply, onCancel }: PrioritiesModeProps) {
  const adoptedAreas = getAdoptedAreas();
  const gfTotal = getGeneralFundTotal();

  const [areaPcts, setAreaPcts] = useState<Record<string, number>>(
    Object.fromEntries(adoptedAreas.map((a) => [a.id, Math.round(a.adoptedPct)])),
  );
  const [psOpen, setPsOpen] = useState(false);
  const ps = PRIORITY_AREAS.find((a) => a.id === "public-safety")!;
  const [subPcts, setSubPcts] = useState<Record<string, number>>(() => {
    const psAdopted = ps.lineIds.reduce((s, id) => s + getAdoptedFor(id), 0) || 1;
    return Object.fromEntries(ps.lineIds.map((id) => [id, Math.round((getAdoptedFor(id) / psAdopted) * 100)]));
  });

  const sumPct = Object.values(areaPcts).reduce((s, v) => s + (v || 0), 0) || 1;
  const norm = (id: string) => ((areaPcts[id] ?? 0) / sumPct) * 100;
  const dollarsFor = (id: string) => (norm(id) / 100) * gfTotal;

  const subSum = ps.lineIds.reduce((s, id) => s + (subPcts[id] || 0), 0) || 1;

  const apply = () => onApply(allocateToExpenditures(areaPcts, psOpen ? subPcts : undefined));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-h-screen max-w-2xl px-4 pb-36 pt-4"
    >
      <div className="mesa-gradient -mx-4 px-5 py-5 text-white sm:mx-0 sm:rounded-3xl">
        <img src={withBase("mesa-logo.png")} alt="City of Mesa" className="h-9 w-auto brightness-0 invert" />
        <h2 className="mt-3 text-2xl font-bold">Start with your priorities</h2>
        <p className="mt-1 text-sm opacity-90">
          Decide how Mesa&apos;s <strong>{formatCurrency(gfTotal, true)}</strong> General Fund pie should be split.
          We&apos;ll set every dial to match — then you can fine-tune and see the impacts.
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-mesa-surface p-3 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-mesa-ink">Your allocation</span>
          <span className="text-mesa-muted">{Math.round(sumPct)}% set · scales to 100%</span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-mesa-sand">
          {adoptedAreas.map((a) => (
            <div key={a.id} className={AREA_STYLE[a.color]?.bar ?? "bg-mesa-blue"} style={{ width: `${norm(a.id)}%` }} />
          ))}
        </div>
        <p className="mt-2 rounded-lg bg-mesa-amber/5 px-2.5 py-1.5 text-xs text-mesa-ink">
          Dedicated funds (utility rates, the Public Safety &amp; Quality of Life sales taxes, the Streets sales tax)
          sit <strong>outside</strong> this pie — they can only be spent on their voter-approved purpose.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {adoptedAreas.map((area) => {
          const Icon = ICONS[area.icon] ?? Settings2;
          const style = AREA_STYLE[area.color] ?? AREA_STYLE["mesa-blue"];
          return (
            <Card key={area.id}>
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.chip}`} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-mesa-ink">{area.label}</span>
                    <span className="text-right text-sm">
                      <span className="block font-bold text-mesa-blue">{formatCurrency(dollarsFor(area.id), true)}</span>
                      <span className="block text-[11px] text-mesa-muted">adopted {Math.round(area.adoptedPct)}%</span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <Slider
                      label={`${area.label} share`}
                      value={areaPcts[area.id] ?? 0}
                      min={0}
                      max={100}
                      step={1}
                      showValue
                      editable
                      editSuffix="%"
                      onChange={(v) => setAreaPcts((p) => ({ ...p, [area.id]: v }))}
                    />
                  </div>
                  <p className="mt-2 text-xs text-mesa-muted">{area.dedicatedNote}</p>

                  {area.id === "public-safety" && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setPsOpen(!psOpen)}
                        aria-expanded={psOpen}
                        className="flex items-center gap-1 text-xs font-semibold text-mesa-blue"
                      >
                        {psOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Break down by department
                      </button>
                      <AnimatePresence>
                        {psOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-3 rounded-xl bg-mesa-sand/70 p-3">
                              {ps.breakdown!.map((b) => (
                                <Slider
                                  key={b.id}
                                  label={`${b.label} · ${formatCurrency(((subPcts[b.id] || 0) / subSum) * dollarsFor("public-safety"), true)}`}
                                  value={subPcts[b.id] ?? 0}
                                  min={0}
                                  max={100}
                                  step={1}
                                  showValue
                                  editable
                                  editSuffix="%"
                                  onChange={(v) => setSubPcts((p) => ({ ...p, [b.id]: v }))}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-mesa-ink/5 px-4 py-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Skip
          </Button>
          <Button className="flex-[2]" size="lg" onClick={apply}>
            Apply to my budget →
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
