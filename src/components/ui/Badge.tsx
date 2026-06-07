import { cn } from "../../lib/utils";

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "muted" | "restricted" | "enterprise";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-mesa-blue/10 text-mesa-blue",
        variant === "success" && "bg-mesa-blue/15 text-mesa-blue",
        variant === "warning" && "bg-mesa-amber/15 text-mesa-amber",
        variant === "danger" && "bg-mesa-red/15 text-mesa-red",
        variant === "muted" && "bg-mesa-gray/15 text-mesa-muted",
        variant === "restricted" && "bg-mesa-amber/20 text-mesa-amber",
        variant === "enterprise" && "bg-mesa-red/10 text-mesa-red",
        className,
      )}
    >
      {children}
    </span>
  );
}
