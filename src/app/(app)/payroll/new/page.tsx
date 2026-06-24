import { requireRole } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { PayrollRunForm } from "../payroll-run-form";

export default async function NewPayrollPage() {
  await requireRole("HR_MANAGER");
  return (
    <div>
      <PageHeader
        title="Run payroll"
        description="Create a payroll run and generate payslips."
      />
      <PayrollRunForm />
    </div>
  );
}
