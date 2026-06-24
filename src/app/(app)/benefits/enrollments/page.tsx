import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDate } from "@/lib/utils";
import { BENEFIT_TYPE_LABELS } from "@/lib/constants";

export default async function EnrollmentsPage() {
  const user = await requireRole("HR_MANAGER");

  const enrollments = await prisma.benefitEnrollment.findMany({
    where: { organizationId: user.organizationId },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      plan: { select: { name: true, type: true } },
      _count: { select: { coveredDependents: true } },
    },
    orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
  });

  return (
    <div>
      <Link
        href="/benefits"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to benefits
      </Link>

      <PageHeader
        title="Enrollments"
        description="All benefit enrollments across the organization."
      />

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No enrollments yet"
          description="Enrollments appear here as employees sign up for plans."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH>Plan</TH>
              <TH>Type</TH>
              <TH className="hidden sm:table-cell">Dependents</TH>
              <TH className="hidden md:table-cell">Enrolled</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {enrollments.map((en) => (
              <TR key={en.id}>
                <TD className="font-medium text-slate-900">
                  {fullName(en.employee)}
                </TD>
                <TD>{en.plan.name}</TD>
                <TD>
                  <Badge tone="indigo">{BENEFIT_TYPE_LABELS[en.plan.type]}</Badge>
                </TD>
                <TD className="hidden sm:table-cell">
                  {en._count.coveredDependents}
                </TD>
                <TD className="hidden md:table-cell text-slate-500">
                  {formatDate(en.enrolledAt)}
                </TD>
                <TD>
                  {en.status === "ACTIVE" ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="slate">Cancelled</Badge>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
