import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
        HR
      </span>
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          HRIS
        </span>
      )}
    </span>
  );
}
