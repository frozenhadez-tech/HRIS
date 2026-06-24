import type {
  EmploymentType,
  EmployeeStatus,
  UserStatus,
  LeaveRequestStatus,
} from "@prisma/client";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Intern",
  TEMPORARY: "Temporary",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
  PENDING: "Pending",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const EMPLOYMENT_TYPES = Object.keys(
  EMPLOYMENT_TYPE_LABELS,
) as EmploymentType[];

export const EMPLOYEE_STATUSES = Object.keys(
  EMPLOYEE_STATUS_LABELS,
) as EmployeeStatus[];

// A small set of common IANA timezones for the settings dropdown.
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "PHP", "SGD", "JPY", "AUD"];

// Attendance: standard workday start used to flag lateness.
export const WORK_START_DEFAULT = "09:00";
export const LATE_GRACE_MINUTES = 15;
