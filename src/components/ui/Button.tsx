import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
        "disabled:opacity-50 disabled:pointer-events-none min-h-[44px]",
        "active:scale-[0.98]",
        variant === "primary" && "bg-mesa-blue text-white hover:bg-mesa-blue-dark shadow-sm",
        variant === "secondary" && "bg-mesa-amber text-mesa-ink hover:opacity-90 shadow-sm",
        variant === "ghost" && "text-mesa-blue hover:bg-mesa-blue/10",
        variant === "outline" && "border-2 border-mesa-blue text-mesa-blue hover:bg-mesa-blue/5",
        variant === "danger" && "bg-mesa-red text-white hover:bg-mesa-red-dark",
        size === "sm" && "px-3 py-2 text-sm min-h-[36px]",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base w-full sm:w-auto",
        className,
      )}
      {...props}
    />
  );
}
