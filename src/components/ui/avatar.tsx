import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  first,
  last,
  size = "md",
  className,
}: {
  first?: string | null;
  last?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(first, last)}
    </span>
  );
}
