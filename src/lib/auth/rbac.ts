import type { UserRole } from "@prisma/client";

// Role-based access control helpers. Roles are ranked; a higher rank implies
// all capabilities of lower ranks.

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Organization Admin",
  HR_MANAGER: "HR Manager",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

// Roles assignable within an organization (SUPER_ADMIN is platform-level).
export const ASSIGNABLE_ROLES: UserRole[] = [
  "ORG_ADMIN",
  "HR_MANAGER",
  "MANAGER",
  "EMPLOYEE",
];

const RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  HR_MANAGER: 60,
  MANAGER: 40,
  EMPLOYEE: 20,
};

export function roleAtLeast(role: UserRole, min: UserRole): boolean {
  return RANK[role] >= RANK[min];
}

// Capability checks — keep permission logic in one place.
export const can = {
  manageEmployees: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  manageDepartments: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  manageUsers: (r: UserRole) => roleAtLeast(r, "ORG_ADMIN"),
  manageOrgSettings: (r: UserRole) => roleAtLeast(r, "ORG_ADMIN"),
  viewAuditLog: (r: UserRole) => roleAtLeast(r, "ORG_ADMIN"),
  viewReports: (r: UserRole) => roleAtLeast(r, "MANAGER"),
  // Time & attendance
  approveLeave: (r: UserRole) => roleAtLeast(r, "MANAGER"),
  manageLeaveTypes: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  manageBalances: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  viewTeamAttendance: (r: UserRole) => roleAtLeast(r, "MANAGER"),
  editAttendance: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  manageShifts: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  // Payroll
  managePayroll: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  viewCompensation: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
  // Benefits
  manageBenefits: (r: UserRole) => roleAtLeast(r, "HR_MANAGER"),
};
