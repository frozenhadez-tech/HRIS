import { z } from "zod";

// ---------------------------------------------------------------------------
// FormData-friendly helpers (empty strings -> null, date parsing, etc.)
// ---------------------------------------------------------------------------

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

/** Optional free text: "" -> null. */
export const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().nullable(),
) as z.ZodType<string | null>;

/** Optional foreign-key id: "" -> null. */
export const optionalId = z.preprocess(
  emptyToNull,
  z.string().nullable(),
) as z.ZodType<string | null>;

/** Optional date from an <input type="date"> value. */
export const optionalDate = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}, z.date().nullable()) as z.ZodType<Date | null>;

// ---------------------------------------------------------------------------
// Enums (mirror the Prisma enums)
// ---------------------------------------------------------------------------

export const employmentTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
  "TEMPORARY",
]);

export const employeeStatusEnum = z.enum([
  "ACTIVE",
  "ON_LEAVE",
  "TERMINATED",
  "PENDING",
]);

export const assignableRoleEnum = z.enum([
  "ORG_ADMIN",
  "HR_MANAGER",
  "MANAGER",
  "EMPLOYEE",
]);

export const userStatusEnum = z.enum(["ACTIVE", "INVITED", "SUSPENDED"]);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signupSchema = z
  .object({
    organizationName: z.string().trim().min(2, "Company name is required."),
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

export const employeeSchema = z.object({
  employeeNumber: z.string().trim().min(1, "Employee number is required."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: optionalText,
  dateOfBirth: optionalDate,
  gender: optionalText,
  jobTitle: optionalText,
  employmentType: employmentTypeEnum,
  status: employeeStatusEnum,
  hireDate: optionalDate,
  terminationDate: optionalDate,
  departmentId: optionalId,
  managerId: optionalId,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  postalCode: optionalText,
  country: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  sssNumber: optionalText,
  philHealthNumber: optionalText,
  tin: optionalText,
  pagIbigNumber: optionalText,
  monthlySalary: z.coerce.number().min(0, "Must be 0 or more.").default(0),
  monthlyAllowance: z.coerce.number().min(0, "Must be 0 or more.").default(0),
});

// ---------------------------------------------------------------------------
// Department
// ---------------------------------------------------------------------------

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required."),
  description: optionalText,
  parentId: optionalId,
  headId: optionalId,
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: assignableRoleEnum,
  employeeId: optionalId,
});

export const updateUserSchema = z.object({
  role: assignableRoleEnum,
  status: userStatusEnum,
});

// ---------------------------------------------------------------------------
// Organization settings
// ---------------------------------------------------------------------------

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(2, "Company name is required."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  currency: z.string().trim().min(1, "Currency is required."),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;

// ---------------------------------------------------------------------------
// Time & Attendance (Milestone 2)
// ---------------------------------------------------------------------------

/** Required date from an <input type="date"> value. */
export const requiredDate = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date({ message: "Enter a valid date." })) as z.ZodType<Date>;

/** HTML checkbox: present ("on"/"true") -> true, absent -> false. */
const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean(),
) as z.ZodType<boolean>;

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).");

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  description: optionalText,
  defaultAllocationDays: z.coerce
    .number()
    .int("Must be a whole number.")
    .min(0)
    .max(365),
  paid: checkbox,
  isActive: checkbox,
  colorHex: optionalText,
});

export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Select a leave type."),
    startDate: requiredDate,
    endDate: requiredDate,
    reason: optionalText,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date can't be before the start date.",
    path: ["endDate"],
  });

export const leaveBalanceSchema = z.object({
  employeeId: z.string().min(1, "Select an employee."),
  leaveTypeId: z.string().min(1, "Select a leave type."),
  year: z.coerce.number().int().min(2000).max(2100),
  allocatedDays: z.coerce.number().min(0).max(365),
});

export const shiftSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  startTime: timeOfDay,
  endTime: timeOfDay,
  colorHex: optionalText,
});

export const shiftAssignmentSchema = z.object({
  employeeId: z.string().min(1, "Select an employee."),
  shiftId: z.string().min(1, "Select a shift."),
  date: requiredDate,
  note: optionalText,
});

const optionalTime = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : null),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).")
    .nullable(),
) as z.ZodType<string | null>;

export const dayAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  date: requiredDate,
  clockIn: optionalTime,
  clockOut: optionalTime,
});

// ---------------------------------------------------------------------------
// Payroll (Milestone 3)
// ---------------------------------------------------------------------------

export const payFrequencyEnum = z.enum(["MONTHLY", "SEMI_MONTHLY", "DAILY"]);

export const payrollRunSchema = z
  .object({
    label: z.string().trim().min(2, "Label is required."),
    frequency: payFrequencyEnum,
    periodStart: requiredDate,
    periodEnd: requiredDate,
    payDate: requiredDate,
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: "Period end can't be before the start.",
    path: ["periodEnd"],
  });

export const payslipAdjustSchema = z.object({
  allowance: z.coerce.number().min(0, "Must be 0 or more."),
  overtimeHours: z.coerce.number().min(0, "Must be 0 or more."),
  otherEarnings: z.coerce.number().min(0, "Must be 0 or more."),
  otherDeductions: z.coerce.number().min(0, "Must be 0 or more."),
  notes: optionalText,
});
