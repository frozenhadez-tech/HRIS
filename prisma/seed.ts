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
  ) =>
    prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeNumber: number(),
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@demo.test`,
        jobTitle,
        departmentId,
        managerId,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
        hireDate: new Date(hireDate),
      },
    });

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

  console.log(`\nSeeded "${org.name}" with ${seq} employees and ${accounts.length} login accounts.`);
  console.log("Login at /login with any of these (password: Password123!):");
  for (const [email, role] of accounts) console.log(`  ${role.padEnd(11)} ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
