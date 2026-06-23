"use client";

import { Button } from "./ui/button";

export function DeleteButton({
  action,
  children = "Delete",
  confirmMessage = "Are you sure? This cannot be undone.",
  size = "md",
}: {
  action: () => Promise<void>;
  children?: React.ReactNode;
  confirmMessage?: string;
  size?: "sm" | "md";
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <Button type="submit" variant="danger" size={size}>
        {children}
      </Button>
    </form>
  );
}
