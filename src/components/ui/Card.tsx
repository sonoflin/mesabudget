import { cn } from "../../lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-mesa-ink/8 bg-mesa-surface p-4 shadow-[var(--shadow-mesa-sm)]",
        "transition-shadow duration-200 hover:shadow-[var(--shadow-mesa)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
