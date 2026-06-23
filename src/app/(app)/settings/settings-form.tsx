"use client";

import { useActionState } from "react";
import { updateOrgSettings } from "@/lib/actions/org";
import { emptyState } from "@/lib/actions/state";
import { COMMON_TIMEZONES, COMMON_CURRENCIES } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export function SettingsForm({
  name,
  timezone,
  currency,
}: {
  name: string;
  timezone: string;
  currency: string;
}) {
  const [state, action] = useActionState(updateOrgSettings, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Organization profile" />
        <CardBody className="space-y-4">
          <Field label="Company name" htmlFor="name" error={e.name} required>
            <Input id="name" name="name" defaultValue={name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone" htmlFor="timezone" error={e.timezone}>
              <Select id="timezone" name="timezone" defaultValue={timezone}>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Currency" htmlFor="currency" error={e.currency}>
              <Select id="currency" name="currency" defaultValue={currency}>
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
