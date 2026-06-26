import "server-only";
import { prisma } from "@/lib/prisma";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";

export type Slice = { label: string; value: number; color?: string };

export type HrAnalytics = {
  total: number;
  attrition: number;
  attritionRate: number;
  avgAge: number;
  avgSalary: number;
  avgYears: number;
  byType: Slice[];
  byTenure: Slice[];
  deptTable: { name: string; active: number; left: number; total: number }[];
  bySalary: Slice[];
  byAge: Slice[];
  byDept: Slice[];
  byGender: Slice[];
};

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export const CHART_COLORS = [
  "#38bdf8",
  "#2f86ff",
  "#8b8cf8",
  "#22d3ee",
  "#a78bfa",
  "#f59e0b",
  "#34d399",
  "#f472b6",
];

const GENDER_COLORS = ["#38bdf8", "#a78bfa", "#f59e0b", "#34d399"];

/** Short number for axis/band labels: 1500 -> "1.5K", 30000 -> "30K". */
function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1) + "M";
  if (a >= 1000) return (a / 1000).toFixed(a >= 10_000 ? 0 : 1) + "K";
  return String(Math.round(a));
}

/** Four salary bands sized to the data (nice round step). */
function salaryBands(salaries: number[]): Slice[] {
  const vals = salaries.filter((s) => s > 0);
  if (vals.length === 0) return [];
  const max = Math.max(...vals);
  const raw = max / 4 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(mag, Math.ceil(raw / mag) * mag);
  const counts = [0, 0, 0, 0];
  for (const s of vals) counts[Math.min(3, Math.floor(s / step))]++;
  return [
    { label: `≤${abbrev(step)}`, value: counts[0] },
    { label: `${abbrev(step)}–${abbrev(step * 2)}`, value: counts[1] },
    { label: `${abbrev(step * 2)}–${abbrev(step * 3)}`, value: counts[2] },
    { label: `${abbrev(step * 3)}+`, value: counts[3] },
  ];
}

const AGE_BANDS: [string, number, number][] = [
  ["18–25", 0, 25],
  ["26–35", 26, 35],
  ["36–45", 36, 45],
  ["46–55", 46, 55],
  ["55+", 56, 200],
];

/**
 * Workforce analytics for one org (optionally one department). Attrition is
 * defined as employees whose status is TERMINATED. All derived in a single
 * pass over the roster.
 */
export async function getHrAnalytics(
  organizationId: string,
  departmentId: string | null,
): Promise<HrAnalytics> {
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      ...(departmentId ? { departmentId } : {}),
    },
    select: {
      status: true,
      gender: true,
      dateOfBirth: true,
      hireDate: true,
      monthlySalary: true,
      employmentType: true,
      department: { select: { name: true } },
    },
  });

  const now = Date.now();
  const total = employees.length;
  let attrition = 0;
  let ageSum = 0;
  let ageN = 0;
  let salSum = 0;
  let salN = 0;
  let tenSum = 0;
  let tenN = 0;

  const typeMap = new Map<string, number>();
  const deptMap = new Map<string, { active: number; left: number; total: number }>();
  const genderMap = new Map<string, number>();
  const tenureBuckets = new Array(11).fill(0); // years 0..10+
  const ageBands = AGE_BANDS.map(([label]) => ({ label, value: 0 }));
  const salaries: number[] = [];

  for (const e of employees) {
    const left = e.status === "TERMINATED";
    if (left) attrition++;

    const tLabel = EMPLOYMENT_TYPE_LABELS[e.employmentType];
    typeMap.set(tLabel, (typeMap.get(tLabel) ?? 0) + 1);

    const dn = e.department?.name ?? "Unassigned";
    const d = deptMap.get(dn) ?? { active: 0, left: 0, total: 0 };
    d.total++;
    if (left) d.left++;
    else if (e.status === "ACTIVE") d.active++;
    deptMap.set(dn, d);

    const g = (e.gender && e.gender.trim()) || "Unspecified";
    genderMap.set(g, (genderMap.get(g) ?? 0) + 1);

    if (e.dateOfBirth) {
      const age = Math.floor((now - e.dateOfBirth.getTime()) / YEAR_MS);
      ageSum += age;
      ageN++;
      for (let i = 0; i < AGE_BANDS.length; i++) {
        if (age >= AGE_BANDS[i][1] && age <= AGE_BANDS[i][2]) {
          ageBands[i].value++;
          break;
        }
      }
    }
    if (e.hireDate && !left) {
      const yrs = (now - e.hireDate.getTime()) / YEAR_MS;
      tenSum += yrs;
      tenN++;
      tenureBuckets[Math.min(10, Math.max(0, Math.floor(yrs)))]++;
    }
    if (e.monthlySalary > 0) {
      salSum += e.monthlySalary;
      salN++;
      salaries.push(e.monthlySalary);
    }
  }

  const byType: Slice[] = [...typeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const byGender: Slice[] = [...genderMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: GENDER_COLORS[i % GENDER_COLORS.length],
    }));

  const byDept: Slice[] = [...deptMap.entries()]
    .map(([name, d]) => ({ label: name, value: d.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const deptTable = [...deptMap.entries()]
    .map(([name, d]) => ({ name, active: d.active, left: d.left, total: d.total }))
    .sort((a, b) => b.total - a.total);

  const byTenure: Slice[] = tenureBuckets.map((v, i) => ({
    label: i === 10 ? "10+" : String(i),
    value: v,
  }));

  return {
    total,
    attrition,
    attritionRate: total ? (attrition / total) * 100 : 0,
    avgAge: ageN ? ageSum / ageN : 0,
    avgSalary: salN ? salSum / salN : 0,
    avgYears: tenN ? tenSum / tenN : 0,
    byType,
    byTenure,
    deptTable,
    bySalary: salaryBands(salaries),
    byAge: ageBands,
    byDept,
    byGender,
  };
}
