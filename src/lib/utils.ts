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
  const base = baseUrl === "/" ? "/" : baseUrl.replace(/\/?$/, "/");
  return normalized ? `${base}${normalized}` : base.slice(0, -1) || "/";
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

/**
 * Parse a human-typed dollar amount, tolerating `$`, commas, and K/M/B
 * suffixes (e.g. "120m" → 120000000, "$1,250" → 1250). Returns NaN if empty
 * or unparseable so callers can ignore the edit.
 */
export function parseAmount(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!s) return NaN;
  const match = s.match(/^(-?\d*\.?\d+)([kmb])?$/);
  if (!match) return NaN;
  const n = parseFloat(match[1]);
  if (Number.isNaN(n)) return NaN;
  const mult = match[2] === "b" ? 1e9 : match[2] === "m" ? 1e6 : match[2] === "k" ? 1e3 : 1;
  return n * mult;
}

export function formatDelta(current: number, adopted: number): number {
  if (adopted === 0) return 0;
  return ((current - adopted) / adopted) * 100;
}
