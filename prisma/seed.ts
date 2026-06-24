import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const SLUG = "demo";

async function main() {
  // Idempotent: wipe any previous demo tenant (cascades to all its records).
  await prisma.organization.deleteMany({ where: { slug: SLUG } });

  const org = await prisma.organization.create({
    data: {
      name: "Demo Company",
      slug: SLUG,
      timezone: "America/New_York",
      currency: "USD",
    },
  });

  // Departments (with a simple hierarchy under Executive).
  const exec = await prisma.department.create({
    data: { organizationId: org.id, name: "Executive" },
  });
  const eng = await prisma.department.create({
    data: {
      organizationId: org.id,
      name: "Engineering",
      parentId: exec.id,
      description: "Product and platform engineering.",
    },
  });
  const hr = await prisma.department.create({
    data: { organizationId: org.id, name: "Human Resources", parentId: exec.id },
  });
  const sales = await prisma.department.create({
    data: { organizationId: org.id, name: "Sales", parentId: exec.id },
  });
  const marketing = await prisma.department.create({
    data: { organizationId: org.id, name: "Marketing", parentId: exec.id },
  });

  const passwordHash = await bcrypt.hash("Password123!", 12);

  let seq = 0;
  const number = () => `EMP-${String(++seq).padStart(4, "0")}`;

  const make = (
    first: string,
    last: string,
    jobTitle: string,
    departmentId: string,
    managerId: string | null,
    hireDate: string,
  ) => {
    const employeeNumber = number();
    const n = seq;
    const t = jobTitle.toLowerCase();
    const monthlySalary = t.includes("chief")
      ? 250000
      : t.includes("vp") || t.includes("head") || t.includes("director")
        ? 120000
        : t.includes("manager")
          ? 80000
          : t.includes("senior")
            ? 60000
            : 38000;
    return prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeNumber,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@demo.test`,
        jobTitle,
        departmentId,
        managerId,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
        hireDate: new Date(hireDate),
        // Sample PH statutory numbers (demo only).
        sssNumber: `34-${String(1000000 + n).padStart(7, "0")}-${n % 10}`,
        philHealthNumber: `12-${String(100000000 + n).padStart(9, "0")}-${n % 10}`,
        tin: `${String(100 + n).padStart(3, "0")}-${String(200 + n).padStart(3, "0")}-${String(300 + n).padStart(3, "0")}-000`,
        pagIbigNumber: `1211-${String(1000 + n).padStart(4, "0")}-${String(2000 + n).padStart(4, "0")}`,
        monthlySalary,
        monthlyAllowance: 2000,
      },
    });
  };

  // Leadership
  const ceo = await make("Alex", "Morgan", "Chief Executive Officer", exec.id, null, "2019-01-15");
  const vpEng = await make("Priya", "Sharma", "VP of Engineering", eng.id, ceo.id, "2019-06-01");
  const hrHead = await make("Daniel", "Reyes", "Head of People", hr.id, ceo.id, "2020-02-10");
  const salesHead = await make("Mia", "Chen", "VP of Sales", sales.id, ceo.id, "2020-03-22");
  const mktHead = await make("Liam", "O'Brien", "Marketing Director", marketing.id, ceo.id, "2021-01-05");

  // Individual contributors
  const dev1 = await make("Noah", "Patel", "Senior Software Engineer", eng.id, vpEng.id, "2021-04-12");
  await make("Emma", "Johnson", "Software Engineer", eng.id, vpEng.id, "2022-08-01");
  await make("Lucas", "Garcia", "QA Engineer", eng.id, vpEng.id, "2023-02-15");
  await make("Sofia", "Rossi", "Recruiter", hr.id, hrHead.id, "2022-05-09");
  await make("Ethan", "Kim", "Account Executive", sales.id, salesHead.id, "2022-11-20");
  await make("Olivia", "Nguyen", "Sales Development Rep", sales.id, salesHead.id, "2023-07-03");
  await make("Ava", "Williams", "Content Marketer", marketing.id, mktHead.id, "2023-09-18");

  // Assign department heads.
  await prisma.department.update({ where: { id: exec.id }, data: { headId: ceo.id } });
  await prisma.department.update({ where: { id: eng.id }, data: { headId: vpEng.id } });
  await prisma.department.update({ where: { id: hr.id }, data: { headId: hrHead.id } });
  await prisma.department.update({ where: { id: sales.id }, data: { headId: salesHead.id } });
  await prisma.department.update({ where: { id: marketing.id }, data: { headId: mktHead.id } });

  // Login accounts — one per role, linked to an employee profile.
  const accounts: [string, "ORG_ADMIN" | "HR_MANAGER" | "MANAGER" | "EMPLOYEE", string][] =
    [
      ["admin@demo.test", "ORG_ADMIN", ceo.id],
      ["hr@demo.test", "HR_MANAGER", hrHead.id],
      ["manager@demo.test", "MANAGER", vpEng.id],
      ["employee@demo.test", "EMPLOYEE", dev1.id],
    ];
  const userIds: Record<string, string> = {};
  for (const [email, role, employeeId] of accounts) {
    const created = await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        passwordHash,
        role,
        status: "ACTIVE",
        employeeId,
      },
    });
    userIds[email] = created.id;
  }

  // A few sample audit entries so the audit log isn't empty on first view.
  const adminId = userIds["admin@demo.test"];
  await prisma.auditLog.createMany({
    data: [
      { organizationId: org.id, userId: adminId, action: "organization.create", entityType: "Organization", entityId: org.id },
      { organizationId: org.id, userId: adminId, action: "department.create", entityType: "Department", entityId: eng.id, metadata: { name: "Engineering" } },
      { organizationId: org.id, userId: adminId, action: "employee.create", entityType: "Employee", entityId: ceo.id, metadata: { name: "Alex Morgan" } },
      { organizationId: org.id, userId: adminId, action: "user.create", entityType: "User", entityId: userIds["hr@demo.test"], metadata: { email: "hr@demo.test", role: "HR_MANAGER" } },
    ],
  });

  // --- Time & Attendance demo data ---
  const allEmployees = await prisma.employee.findMany({
    where: { organizationId: org.id },
  });
  const byName = (first: string) =>
    allEmployees.find((e) => e.firstName === first)!;
  const year = new Date().getFullYear();

  const vacation = await prisma.leaveType.create({
    data: {
      organizationId: org.id,
      name: "Vacation",
      description: "Paid annual leave.",
      defaultAllocationDays: 20,
      paid: true,
      colorHex: "#22c55e",
    },
  });
  const sick = await prisma.leaveType.create({
    data: {
      organizationId: org.id,
      name: "Sick Leave",
      defaultAllocationDays: 10,
      paid: true,
      colorHex: "#f59e0b",
    },
  });
  await prisma.leaveType.create({
    data: {
      organizationId: org.id,
      name: "Unpaid Leave",
      defaultAllocationDays: 0,
      paid: false,
      colorHex: "#64748b",
    },
  });

  // Allocate paid-leave balances to everyone for the current year.
  for (const emp of allEmployees) {
    await prisma.leaveBalance.createMany({
      data: [
        { organizationId: org.id, employeeId: emp.id, leaveTypeId: vacation.id, year, allocatedDays: 20 },
        { organizationId: org.id, employeeId: emp.id, leaveTypeId: sick.id, year, allocatedDays: 10 },
      ],
    });
  }

  const noah = byName("Noah"); // employee@ login
  const emma = byName("Emma");
  const lucas = byName("Lucas");
  const sofia = byName("Sofia");

  // Approved vacation for Noah (deducts balance).
  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: noah.id,
      leaveTypeId: vacation.id,
      startDate: new Date(year, 6, 6),
      endDate: new Date(year, 6, 10),
      days: 5,
      reason: "Family trip",
      status: "APPROVED",
      reviewedById: userIds["manager@demo.test"],
      reviewedAt: new Date(),
    },
  });
  await prisma.leaveBalance.update({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: noah.id,
        leaveTypeId: vacation.id,
        year,
      },
    },
    data: { usedDays: 5 },
  });

  // Pending requests (show up under Approvals).
  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: emma.id,
      leaveTypeId: vacation.id,
      startDate: new Date(year, 7, 17),
      endDate: new Date(year, 7, 21),
      days: 5,
      reason: "Wedding",
      status: "PENDING",
    },
  });
  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: sofia.id,
      leaveTypeId: sick.id,
      startDate: new Date(year, 6, 1),
      endDate: new Date(year, 6, 1),
      days: 1,
      reason: "Medical appointment",
      status: "PENDING",
    },
  });

  // Time entries. `at(daysAgo, h, m)` builds a timestamp.
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d;
  };
  await prisma.timeEntry.create({
    data: { organizationId: org.id, employeeId: noah.id, clockIn: at(0, 9, 2) }, // still clocked in
  });
  await prisma.timeEntry.createMany({
    data: [
      { organizationId: org.id, employeeId: emma.id, clockIn: at(0, 8, 55), clockOut: at(0, 17, 30) },
      { organizationId: org.id, employeeId: byName("Priya").id, clockIn: at(0, 9, 10), clockOut: at(0, 18, 0) },
      { organizationId: org.id, employeeId: sofia.id, clockIn: at(0, 9, 30), clockOut: at(0, 16, 45) },
      { organizationId: org.id, employeeId: noah.id, clockIn: at(1, 9, 0), clockOut: at(1, 17, 15) },
    ],
  });

  // Shifts + upcoming assignments.
  const morning = await prisma.shift.create({
    data: { organizationId: org.id, name: "Morning", startTime: "09:00", endTime: "17:00", colorHex: "#6366f1" },
  });
  const evening = await prisma.shift.create({
    data: { organizationId: org.id, name: "Evening", startTime: "13:00", endTime: "21:00", colorHex: "#a855f7" },
  });
  const dayUTC = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  };
  await prisma.shiftAssignment.createMany({
    data: [
      { organizationId: org.id, employeeId: noah.id, shiftId: morning.id, date: dayUTC(1) },
      { organizationId: org.id, employeeId: emma.id, shiftId: morning.id, date: dayUTC(1) },
      { organizationId: org.id, employeeId: lucas.id, shiftId: evening.id, date: dayUTC(1) },
      { organizationId: org.id, employeeId: noah.id, shiftId: evening.id, date: dayUTC(2) },
    ],
  });

  // --- Benefits ---
  const hmo = await prisma.benefitPlan.create({
    data: {
      organizationId: org.id,
      type: "HEALTH",
      name: "Maxicare Plan A",
      provider: "Maxicare",
      description: "Comprehensive HMO; dependents may be covered.",
      coverageAmount: 200000,
      employeeContribution: 500,
      employerContribution: 1500,
    },
  });
  await prisma.benefitPlan.create({
    data: {
      organizationId: org.id,
      type: "LIFE",
      name: "Group Life (₱1M)",
      provider: "Sun Life",
      coverageAmount: 1000000,
      employeeContribution: 0,
      employerContribution: 300,
    },
  });
  await prisma.benefitPlan.create({
    data: {
      organizationId: org.id,
      type: "RETIREMENT",
      name: "Provident Fund",
      description: "Company provident/retirement fund.",
      employeeContribution: 1000,
      employerContribution: 1000,
    },
  });
  const noahSpouse = await prisma.dependent.create({
    data: {
      organizationId: org.id,
      employeeId: noah.id,
      firstName: "Mia",
      lastName: "Patel",
      relation: "SPOUSE",
      dateOfBirth: new Date("1992-03-14"),
    },
  });
  await prisma.benefitEnrollment.create({
    data: {
      organizationId: org.id,
      employeeId: noah.id,
      planId: hmo.id,
      status: "ACTIVE",
      coveredDependents: { connect: { id: noahSpouse.id } },
    },
  });

  console.log(`\nSeeded "${org.name}" with ${seq} employees and ${accounts.length} login accounts.`);
  console.log("Benefits: 3 plans, 1 dependent, 1 enrollment.");
  console.log("Time & attendance: 3 leave types, balances, leave requests, time entries, 2 shifts.");
  console.log("Login at /login with any of these (password: Password123!):");
  for (const [email, role] of accounts) console.log(`  ${role.padEnd(11)} ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
