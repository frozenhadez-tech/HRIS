import type { LeaveCredit } from "@/lib/leave-credits";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Grid of per-leave-type credit tiles: remaining days vs allocation, plus a
 * Paid/Unpaid badge. Shared by the employee self-service `/leave` page and the
 * employee detail page so the two never diverge.
 */
export function LeaveCreditCards({
  credits,
  className,
  emptyHint = "No leave types configured yet.",
}: {
  credits: LeaveCredit[];
  className?: string;
  emptyHint?: string;
}) {
  if (credits.length === 0) {
    return <p className="text-sm text-slate-500">{emptyHint}</p>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {credits.map((c) => (
        <div
          key={c.leaveTypeId}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{c.name}</h3>
            <Badge tone={c.paid ? "indigo" : "slate"}>
              {c.paid ? "Paid" : "Unpaid"}
            </Badge>
          </div>
          {c.paid ? (
            <>
              <p className="text-3xl font-semibold text-slate-900">
                {c.available}
                <span className="ml-1 text-sm font-normal text-slate-400">
                  / {c.allocated} days
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {c.used} used · {c.pending} pending
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No balance limit — requests still need approval.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
