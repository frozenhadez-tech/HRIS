<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HRIS project notes

Multi-tenant HRIS. Stack: Next.js 16 (App Router), Prisma 7 (pg driver adapter),
PostgreSQL, Tailwind v4, custom auth (`bcryptjs` + `jose` JWT cookies).

## Conventions

- **Tenancy:** every tenant-scoped query MUST filter by `organizationId`. Get the
  current user/org via `requireUser()` / `requireRole()` (pages) or `authorize()`
  (server actions) from `src/lib/tenant.ts`. Mutations use `updateMany`/`deleteMany`
  scoped by `{ id, organizationId }`.
- **Auth split:** `src/lib/auth/jwt.ts` is edge-safe (used by `proxy.ts`); cookie
  helpers live in `src/lib/auth/session.ts` (`server-only`). Never import Prisma in
  `proxy.ts`.
- **Server actions** live in `src/lib/actions/*`. They validate with Zod
  (`src/lib/validations.ts`), return `ActionState` for `useActionState`, write an
  audit entry, `revalidatePath`, then `redirect`. Keep `redirect()` outside
  try/catch.
- **RBAC** ranks roles in `src/lib/auth/rbac.ts` (`roleAtLeast`, `can.*`).
- **Prisma 7:** the datasource URL is in `prisma.config.ts`, NOT the schema; the
  client uses the `PrismaPg` adapter in `src/lib/prisma.ts`.

## Commands

`npm run typecheck` · `npm run build` · `npm run db:migrate` · `npm run db:seed`
