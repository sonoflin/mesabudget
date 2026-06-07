import { cn } from "../../lib/utils";

type MesaTone = "light" | "ink" | "brand";

interface MesaScapeProps {
  /** Color treatment for the layered ridges. */
  tone?: MesaTone;
  /** Show a soft desert sun behind the ridges. */
  sun?: boolean;
  className?: string;
}

/**
 * Decorative "Three Mesas" horizon — three layered, flat-topped butte
 * silhouettes that echo the City of Mesa logo mark (red · amber · blue
 * mesas overlapping to form an "M"). Rendered as inline SVG so it stays
 * crisp at any size, ships ~1KB, and never touches the base path.
 *
 * Purely decorative: hidden from assistive tech. Drop it into a
 * `relative` container as an absolutely-positioned, bottom-anchored layer.
 */
export function MesaScape({ tone = "light", sun = false, className }: MesaScapeProps) {
  const ridges =
    tone === "brand"
      ? ["var(--color-mesa-blue)", "var(--color-mesa-amber)", "var(--color-mesa-red)"]
      : tone === "ink"
        ? ["var(--color-mesa-ink)", "var(--color-mesa-ink)", "var(--color-mesa-ink)"]
        : ["#ffffff", "#ffffff", "#ffffff"];

  // Back → front. Front ridge reads strongest for depth.
  const opacities = tone === "brand" ? [0.16, 0.2, 0.26] : tone === "ink" ? [0.05, 0.07, 0.1] : [0.14, 0.24, 0.4];

  return (
    <svg
      className={cn("pointer-events-none select-none", className)}
      viewBox="0 0 1440 420"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {sun && (
        <circle cx="1066" cy="238" r="78" fill="#ffffff" opacity={tone === "light" ? 0.18 : 0.12} />
      )}
      {/* Back mesa — tallest, gentlest. */}
      <path
        d="M0 420 L0 214 C 220 150 372 146 520 160 C 700 177 832 132 1010 156 C 1198 181 1320 232 1440 214 L1440 420 Z"
        fill={ridges[0]}
        opacity={opacities[0]}
      />
      {/* Middle mesa — the classic flat-top-with-right-slope profile. */}
      <path
        d="M0 420 L0 300 C 232 252 420 240 604 250 C 824 262 980 304 1216 314 C 1330 318 1392 314 1440 310 L1440 420 Z"
        fill={ridges[1]}
        opacity={opacities[1]}
      />
      {/* Front mesa — lowest, closest. */}
      <path
        d="M0 420 L0 356 C 300 332 520 322 760 336 C 980 348 1190 360 1440 352 L1440 420 Z"
        fill={ridges[2]}
        opacity={opacities[2]}
      />
    </svg>
  );
}
