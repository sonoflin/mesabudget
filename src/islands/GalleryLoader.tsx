import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MesaScape } from "../components/ui/MesaScape";
import { formatCurrency, withBase } from "../lib/utils";
import { categories, meta as budgetMeta } from "../lib/budget-data";
import { SHARE_API_BASE } from "../lib/share-api";

interface GalleryItem {
  slug: string;
  title: string;
  author_name: string | null;
  agree_count: number;
  created_at: string;
}

interface AggregateData {
  aggregate: Record<string, { mean: number; count: number }>;
  sampleSize: number;
}

export default function GalleryLoader() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [aggregate, setAggregate] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = SHARE_API_BASE;
    Promise.all([
      fetch(`${apiBase}/gallery`).then((r) => (r.ok ? r.json() : { budgets: [] })),
      fetch(`${apiBase}/aggregate`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([g, a]) => {
        setGallery(g.budgets ?? []);
        setAggregate(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-mesa-muted">Loading gallery…</div>;
  }

  const topPriorities = aggregate
    ? categories
        .map((c) => ({
          ...c,
          mean: aggregate.aggregate[c.id]?.mean ?? c.adoptedAmount,
          delta: (aggregate.aggregate[c.id]?.mean ?? c.adoptedAmount) - c.adoptedAmount,
        }))
        .filter((c) => Math.abs(c.delta) > 100_000)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6)
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 md:max-w-4xl lg:max-w-5xl lg:px-6 lg:py-8">
      <header>
        <a
          href={withBase()}
          className="inline-flex items-center gap-1 text-sm font-semibold text-mesa-blue transition-all hover:gap-2 md:text-base"
        >
          <span aria-hidden>←</span> Back to simulator
        </a>
        <div className="relative mt-3 overflow-hidden rounded-3xl mesa-gradient-hero px-5 pb-6 pt-7 text-white shadow-[var(--shadow-mesa)] sm:px-8 sm:pb-8 sm:pt-9">
          <MesaScape tone="light" sun className="absolute inset-x-0 bottom-0 h-28 w-full" />
          <div className="mesa-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" aria-hidden />
          <div className="mesa-accent-bar absolute inset-x-0 top-0 h-1" aria-hidden />
          <div className="relative">
            <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-sm sm:text-3xl lg:text-4xl">Community Budgets</h1>
            <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/90 sm:text-base">
              See what Mesa residents prioritized when building their own city budgets.
            </p>
          </div>
        </div>
      </header>

      {aggregate && aggregate.sampleSize > 0 && (
        <Card>
          <h2 className="font-bold text-mesa-ink">What Mesa prioritized</h2>
          <p className="text-sm text-mesa-muted">Based on {aggregate.sampleSize} shared budget{aggregate.sampleSize !== 1 ? "s" : ""} vs City adopted FY {budgetMeta.fiscalYear}</p>
          <ul className="mt-4 space-y-2">
            {topPriorities.map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className={c.delta > 0 ? "text-mesa-blue font-medium" : "text-mesa-red font-medium"}>
                  {c.delta > 0 ? "+" : ""}{formatCurrency(c.delta, true)} avg
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="font-bold text-mesa-ink mb-3">Recent budgets</h2>
        {gallery.length === 0 ? (
          <Card className="relative overflow-hidden">
            <MesaScape tone="brand" className="absolute inset-x-0 bottom-0 h-24 w-full opacity-70" />
            <div className="relative flex flex-col items-start gap-1 pb-10">
              <h3 className="text-base font-bold text-mesa-ink">No shared budgets yet</h3>
              <p className="text-sm text-mesa-muted">Be the first to build a budget and share your priorities with Mesa.</p>
              <a href={withBase()} className="mt-4 inline-flex">
                <Button>Build your budget</Button>
              </a>
            </div>
          </Card>
        ) : (
          <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {gallery.map((item) => (
              <li key={item.slug}>
                <Card className="flex items-center justify-between gap-3">
                  <div>
                    <a href={withBase(`b?slug=${item.slug}`)} className="font-semibold text-mesa-blue hover:underline">
                      {item.title}
                    </a>
                    {item.author_name && <p className="text-xs text-mesa-muted">by {item.author_name}</p>}
                  </div>
                  <div className="text-right text-xs text-mesa-muted">
                    {item.agree_count > 0 && <span>{item.agree_count} agree</span>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
