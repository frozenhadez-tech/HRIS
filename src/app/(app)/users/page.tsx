import Link from "next/link";
import { Plus, ShieldCheck, Pencil } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteUser } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { UserStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDateTime } from "@/lib/utils";

export default async function UsersPage() {
  const admin = await requireRole("ORG_ADMIN");

  const users = await prisma.user.findMany({
    where: { organizationId: admin.organizationId },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Users & roles"
        description="Control who can sign in and what they can do."
        action={
          <Link href="/users/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Add user
          </Link>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="No users yet"
          description="Invite teammates and assign them roles."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Last login</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD>
                  <p className="font-medium text-slate-900">{u.email}</p>
                  {u.employee && (
                    <p className="text-xs text-slate-500">
                      {fullName(u.employee)}
                    </p>
                  )}
                </TD>
                <TD>
                  <Badge tone="indigo">{ROLE_LABELS[u.role]}</Badge>
                </TD>
                <TD>
                  <UserStatusBadge status={u.status} />
                </TD>
                <TD className="hidden md:table-cell text-slate-500">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/users/${u.id}/edit`}
                      className={buttonVariants("secondary", "sm")}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    {u.id !== admin.id && (
                      <DeleteButton
                        action={deleteUser.bind(null, u.id)}
                        size="sm"
                        confirmMessage={`Delete user ${u.email}?`}
                      >
                        Delete
                      </DeleteButton>
                    )}
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
