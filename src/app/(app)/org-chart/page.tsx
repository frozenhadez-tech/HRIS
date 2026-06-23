import Link from "next/link";
import { Network } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fullName } from "@/lib/utils";

type Node = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departmentName: string | null;
  children: Node[];
};

function OrgTree({ nodes, depth = 0 }: { nodes: Node[]; depth?: number }) {
  return (
    <ul
      className={
        depth > 0 ? "ml-5 space-y-2 border-l border-slate-200 pl-5" : "space-y-2"
      }
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/employees/${node.id}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <Avatar first={node.firstName} last={node.lastName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {fullName(node)}
              </p>
              <p className="truncate text-xs text-slate-500">
                {node.jobTitle ?? "—"}
                {node.departmentName ? ` · ${node.departmentName}` : ""}
              </p>
            </div>
            {node.children.length > 0 && (
              <Badge tone="slate">
                {node.children.length} report
                {node.children.length === 1 ? "" : "s"}
              </Badge>
            )}
          </Link>
          {node.children.length > 0 && (
            <div className="mt-2">
              <OrgTree nodes={node.children} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function OrgChartPage() {
  const user = await requireRole("MANAGER");

  const employees = await prisma.employee.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      managerId: true,
      department: { select: { name: true } },
    },
  });

  // Build the reporting tree from manager relationships.
  const byId = new Map<string, Node>();
  for (const e of employees) {
    byId.set(e.id, {
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      jobTitle: e.jobTitle,
      departmentName: e.department?.name ?? null,
      children: [],
    });
  }
  const roots: Node[] = [];
  for (const e of employees) {
    const node = byId.get(e.id)!;
    if (e.managerId && byId.has(e.managerId)) {
      byId.get(e.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return (
    <div>
      <PageHeader
        title="Org chart"
        description="Reporting structure based on each employee's manager."
      />
      {employees.length === 0 ? (
        <EmptyState
          icon={<Network className="h-8 w-8" />}
          title="No employees to chart"
          description="Add employees and assign managers to see your org structure."
        />
      ) : (
        <OrgTree nodes={roots} />
      )}
    </div>
  );
}
