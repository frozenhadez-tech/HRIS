import { Wallet } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName } from "@/lib/utils";
import { grantAnnualCredits } from "@/lib/actions/leave";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BalanceForm } from "./balance-form";

export default async function BalancesPage() {
  const user = await requireRole("HR_MANAGER");
  const orgId = user.organizationId;
  const year = new Date().getFullYear();

  const [employees, leaveTypes, balances] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.leaveType.findMany({
      where: { organizationId: orgId, isActive: true, paid: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultAllocationDays: true },
    }),
    prisma.leaveBalance.findMany({
      where: { organizationId: orgId },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: [{ year: "desc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Leave balances"
        description="Allocate paid-leave days to employees."
      />

      <Card className="mb-6">
        <CardHeader
          title="Grant annual credits"
          description={`Set how many days each paid leave type gives for ${year}, then grant to every employee. Used days are preserved; existing balances are updated to the amount you choose.`}
        />
        <CardBody>
          {leaveTypes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Add a paid leave type first to grant credits.
            </p>
          ) : (
            <form action={grantAnnualCredits} className="space-y-4">
              <input type="hidden" name="year" defaultValue={year} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {leaveTypes.map((t) => (
                  <Field
                    key={t.id}
                    label={`${t.name} (days)`}
                    htmlFor={`days_${t.id}`}
                  >
                    <Input
                      id={`days_${t.id}`}
                      name={`days_${t.id}`}
                      type="number"
                      min={0}
                      max={365}
                      defaultValue={t.defaultAllocationDays}
                    />
                  </Field>
                ))}
              </div>
              <div className="flex justify-end">
                <SubmitButton pendingText="Granting…">
                  Grant {year} credits to all employees
                </SubmitButton>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Set an allocation"
          description="Override a single employee's balance for one leave type."
        />
        <CardBody>
          <BalanceForm
            employees={employees}
            leaveTypes={leaveTypes}
            year={year}
          />
        </CardBody>
      </Card>

      {balances.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No balances set"
          description="Allocations you set, or that are created when leave is approved, appear here."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH>Type</TH>
              <TH>Year</TH>
              <TH>Allocated</TH>
              <TH>Used</TH>
              <TH>Available</TH>
            </TR>
          </THead>
          <TBody>
            {balances.map((b) => (
              <TR key={b.id}>
                <TD className="font-medium text-slate-900">
                  {fullName(b.employee)}
                </TD>
                <TD>{b.leaveType.name}</TD>
                <TD>{b.year}</TD>
                <TD>{b.allocatedDays}</TD>
                <TD>{b.usedDays}</TD>
                <TD className="font-medium">
                  {b.allocatedDays - b.usedDays}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
