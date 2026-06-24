import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteDependent } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDate } from "@/lib/utils";
import { DEPENDENT_RELATION_LABELS } from "@/lib/constants";
import { DependentForm } from "./dependent-form";

export default async function DependentsPage() {
  const me = await requireEmployee();

  const dependents = await prisma.dependent.findMany({
    where: { employeeId: me.employeeId, organizationId: me.organizationId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { enrollments: true } } },
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
        title="My dependents"
        description="Family members you can cover under health plans."
      />

      <Card className="mb-6">
        <CardHeader title="Add a dependent" />
        <CardBody>
          <DependentForm />
        </CardBody>
      </Card>

      {dependents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No dependents yet"
          description="Add a spouse, child, or other dependent to cover them under a health plan."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Relationship</TH>
              <TH className="hidden sm:table-cell">Date of birth</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {dependents.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium text-slate-900">{fullName(d)}</TD>
                <TD>
                  <Badge tone="slate">
                    {DEPENDENT_RELATION_LABELS[d.relation]}
                  </Badge>
                </TD>
                <TD className="hidden sm:table-cell text-slate-500">
                  {d.dateOfBirth ? formatDate(d.dateOfBirth) : "—"}
                </TD>
                <TD>
                  <div className="flex justify-end">
                    <DeleteButton
                      action={deleteDependent.bind(null, d.id)}
                      size="sm"
                      confirmMessage={
                        d._count.enrollments > 0
                          ? `${fullName(d)} is covered under a plan. Remove anyway?`
                          : `Remove ${fullName(d)}?`
                      }
                    >
                      Remove
                    </DeleteButton>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
