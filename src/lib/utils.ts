import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Astro base path (e.g. `/mesabudget/` on GitHub Pages). */
export const baseUrl = import.meta.env.BASE_URL;

/** Prefix an app-relative path with the Astro base URL. */
export function withBase(path = ""): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}${normalized}`;
}

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDelta(current: number, adopted: number): number {
  if (adopted === 0) return 0;
  return ((current - adopted) / adopted) * 100;
}
