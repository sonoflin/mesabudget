import { useState } from "react";
import { Button } from "./ui/Button";
import { useBudgetStore, useBalance } from "../store/budget-store";
import { getTopChanges } from "../lib/budget-engine";
import { SHARE_API_BASE } from "../lib/share-api";

interface ShareDialogProps {
  onClose: () => void;
}

export async function saveBudget(snapshot: {
  title: string;
  authorName?: string;
  categoryAmounts: Record<string, number>;
  revenueAmounts: Record<string, number>;
  multiFund?: unknown;
}): Promise<{ slug: string; url: string }> {
  const apiBase = SHARE_API_BASE;
  const res = await fetch(`${apiBase}/budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to save budget");
  return res.json();
}

export function ShareDialog({ onClose }: ShareDialogProps) {
  const getLegacySnapshot = useBudgetStore((s) => s.getLegacySnapshot);
  const snapshot = useBudgetStore((s) => s.snapshot);
  const setShareMeta = useBudgetStore((s) => s.setShareMeta);
  const balance = useBalance();
  const [title, setTitle] = useState(snapshot.title ?? "My Mesa Budget");
  const [authorName, setAuthorName] = useState(snapshot.authorName ?? "");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const legacy = getLegacySnapshot();
  const topChanges = getTopChanges(legacy);

  async function handleShare() {
    if (!balance.isBalanced) {
      setError("Balance all funds before sharing.");
      return;
    }
    setLoading(true);
    setError(null);
    setShareMeta(title, authorName || undefined);
    try {
      const result = await saveBudget({
        title,
        authorName: authorName || undefined,
        categoryAmounts: legacy.categoryAmounts,
        revenueAmounts: legacy.revenueAmounts,
        multiFund: snapshot,
      });
      setShareUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-mesa-ink/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-mesa-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-mesa-ink">Save & share</h2>
        <label className="mt-4 block text-sm font-medium text-mesa-ink">
          Budget name
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-mesa-ink/10 px-3 py-2.5 text-sm min-h-[44px]" />
        </label>
        <label className="mt-3 block text-sm font-medium text-mesa-ink">
          Your name (optional)
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="mt-1 w-full rounded-xl border border-mesa-ink/10 px-3 py-2.5 text-sm min-h-[44px]" />
        </label>
        {topChanges.length > 0 && (
          <div className="mt-4 rounded-xl bg-mesa-sand p-3 text-sm">
            <p className="font-semibold">Biggest changes</p>
            <ul className="mt-2 space-y-1 text-mesa-muted">
              {topChanges.map((c) => (
                <li key={c.id}>{c.name}: {c.delta > 0 ? "+" : ""}{(c.delta / 1e6).toFixed(1)}M</li>
              ))}
            </ul>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-mesa-red">{error}</p>}
        {shareUrl ? (
          <div className="mt-4">
            <input readOnly value={shareUrl} className="w-full rounded-xl border px-3 py-2 text-sm" />
            <Button className="mt-2 w-full" variant="secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy link</Button>
          </div>
        ) : (
          <Button className="mt-4 w-full" onClick={handleShare} disabled={loading || !balance.isBalanced}>
            {loading ? "Saving…" : "Generate share link"}
          </Button>
        )}
        <Button className="mt-2 w-full" variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
