// Leave date math. All computed in UTC to match how leave dates (parsed from
// "YYYY-MM-DD") and @db.Date holidays are stored (UTC midnight).

export function leaveDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Working days (Mon–Fri, excluding holidays) in [start, end]; half-day = 0.5 for a single day. */
export function countLeaveDays(
  start: Date,
  end: Date,
  holidayKeys: Set<string>,
  halfDay = false,
): number {
  const s = atUtcMidnight(start);
  const e = atUtcMidnight(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6 && !holidayKeys.has(leaveDateKey(cur))) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (halfDay && leaveDateKey(s) === leaveDateKey(e) && count === 1) return 0.5;
  return count;
}

/** First working day strictly after `after` (skips weekends + holidays). */
export function nextWorkingDay(after: Date, holidayKeys: Set<string>): Date {
  const d = atUtcMidnight(after);
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (
    d.getUTCDay() === 0 ||
    d.getUTCDay() === 6 ||
    holidayKeys.has(leaveDateKey(d))
  );
  return d;
}
