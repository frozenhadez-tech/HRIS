// Client-safe action result shape (no server imports — used by form components).
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const emptyState: ActionState = {};
