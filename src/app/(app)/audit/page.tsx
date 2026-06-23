import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export default async function AuditPage() {
  const admin = await requireRole("ORG_ADMIN");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="A record of recent changes across your organization."
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No activity yet"
          description="Actions like creating or editing records will appear here."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH className="hidden sm:table-cell">Entity</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id}>
                <TD className="whitespace-nowrap text-slate-500">
                  {formatDateTime(log.createdAt)}
                </TD>
                <TD>{log.user?.email ?? "System"}</TD>
                <TD>
                  <Badge tone="slate">{log.action}</Badge>
                </TD>
                <TD className="hidden sm:table-cell text-slate-500">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
