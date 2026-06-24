import Link from "next/link";
import { ArrowLeft, CalendarOff } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteHoliday } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { HolidayForm } from "./holiday-form";

export default async function HolidaysPage() {
  const user = await requireRole("HR_MANAGER");

  const holidays = await prisma.holiday.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { date: "asc" },
  });

  return (
    <div>
      <Link
        href="/leave"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leave
      </Link>

      <PageHeader
        title="Company holidays"
        description="Holidays are excluded from leave working-day counts."
      />

      <Card className="mb-6">
        <CardHeader title="Add a holiday" />
        <CardBody>
          <HolidayForm />
        </CardBody>
      </Card>

      {holidays.length === 0 ? (
        <EmptyState
          icon={<CalendarOff className="h-8 w-8" />}
          title="No holidays yet"
          description="Add official holidays so they don't count against leave."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Holiday</TH>
              <TH>Date</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {holidays.map((h) => (
              <TR key={h.id}>
                <TD className="font-medium text-slate-900">{h.name}</TD>
                <TD>{formatDate(h.date)}</TD>
                <TD>
                  <div className="flex justify-end">
                    <DeleteButton
                      action={deleteHoliday.bind(null, h.id)}
                      size="sm"
                      confirmMessage={`Remove holiday "${h.name}"?`}
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
