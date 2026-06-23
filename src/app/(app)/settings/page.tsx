import { requireRole } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireRole("ORG_ADMIN");
  const { saved } = await searchParams;
  const org = admin.organization;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your organization's profile and defaults."
      />
      {saved && (
        <Alert tone="success" className="mb-6">
          Settings saved.
        </Alert>
      )}
      <SettingsForm
        name={org.name}
        timezone={org.timezone}
        currency={org.currency}
      />
    </div>
  );
}
