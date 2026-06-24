import type {
  EmployeeStatus,
  UserStatus,
  LeaveRequestStatus,
  PayrollStatus,
} from "@prisma/client";
import { Badge } from "./ui/badge";
import {
  EMPLOYEE_STATUS_LABELS,
  USER_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from "@/lib/constants";

const EMPLOYEE_TONE = {
  ACTIVE: "green",
  ON_LEAVE: "amber",
  TERMINATED: "red",
  PENDING: "slate",
} as const;

const USER_TONE = {
  ACTIVE: "green",
  INVITED: "blue",
  SUSPENDED: "red",
} as const;

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <Badge tone={EMPLOYEE_TONE[status]}>{EMPLOYEE_STATUS_LABELS[status]}</Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_TONE[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}

const LEAVE_TONE = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "slate",
} as const;

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <Badge tone={LEAVE_TONE[status]}>{LEAVE_STATUS_LABELS[status]}</Badge>
  );
}

const PAYROLL_TONE = {
  DRAFT: "slate",
  FINALIZED: "blue",
  PAID: "green",
} as const;

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <Badge tone={PAYROLL_TONE[status]}>{PAYROLL_STATUS_LABELS[status]}</Badge>
  );
}
