import type { EmployeeStatus, UserStatus } from "@prisma/client";
import { Badge } from "./ui/badge";
import { EMPLOYEE_STATUS_LABELS, USER_STATUS_LABELS } from "@/lib/constants";

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
