# HRIS — Human Resources Information System

A multi-tenant HRIS built with Next.js, Prisma, and PostgreSQL. This is
**Milestone 1: Foundation** — authentication & roles, employee data management,
and organizational structure. Later milestones layer on payroll, time &
attendance, benefits, and employee self-service.

## Features (this milestone)

- **Multi-tenant** — every organization's data is isolated; one system serves
  many companies.
- **Authentication** — email/password sign-in with hashed passwords (bcrypt) and
  signed JWT sessions in httpOnly cookies. Sign up creates an organization and
  its first admin.
- **Role-based access control** — `ORG_ADMIN`, `HR_MANAGER`, `MANAGER`,
  `EMPLOYEE` (plus a reserved platform `SUPER_ADMIN`), enforced in middleware,
  pages, and server actions.
- **Employee management** — full CRUD with personal, employment, address, and
  emergency-contact details; search and status filtering.
- **Departments** — CRUD with a parent/child hierarchy and department heads.
- **Org chart** — reporting structure rendered from manager relationships.
- **Users & roles** — admins create logins, assign roles, and suspend accounts.
- **Audit log** — a record of who changed what.
- **Organization settings** — name, timezone, currency.

## Tech stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Framework| Next.js 16 (App Router, Server Actions)           |
| Language | TypeScript                                        |
| Styling  | Tailwind CSS v4                                    |
| ORM / DB | Prisma 7 (pg driver adapter) + PostgreSQL         |
| Auth     | `bcryptjs` + `jose` (JWT) — custom, multi-tenant  |
| Validation | Zod                                             |

## Prerequisites

- Node.js 20+ (developed on Node 24)
- A PostgreSQL database (see options below)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set the two variables:

```bash
cp .env.example .env
```

- `DATABASE_URL` — your PostgreSQL connection string.
- `AUTH_SECRET` — a long random string. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Provision a database

You need a PostgreSQL instance. Pick one:

- **Hosted (zero install, recommended):** create a free database at
  [Neon](https://neon.tech) or [Supabase](https://supabase.com) and paste the
  connection string into `DATABASE_URL`.
- **Local install:** install PostgreSQL (e.g. `winget install PostgreSQL.PostgreSQL`
  on Windows) and create a `hris` database.
- **Docker:** `docker run --name hris-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hris -p 5432:5432 -d postgres`

### 4. Create the schema

```bash
npm run db:migrate      # creates tables from prisma/schema.prisma
```

### 5. Seed demo data (optional)

```bash
npm run db:seed
```

This creates a **Demo Company** with departments, a 12-person org chart, and
four login accounts (password `Password123!` for all):

| Role          | Email               |
| ------------- | ------------------- |
| Org Admin     | admin@demo.test     |
| HR Manager    | hr@demo.test        |
| Manager       | manager@demo.test   |
| Employee      | employee@demo.test  |

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000 — you'll be sent to `/login`. Sign in with a demo
account, or create a brand-new organization at `/signup`.

## npm scripts

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Production build                     |
| `npm run typecheck`| `tsc --noEmit`                       |
| `npm run db:migrate` | Create/apply migrations            |
| `npm run db:seed`  | Seed demo data                       |
| `npm run db:studio`| Open Prisma Studio                   |
| `npm run db:reset` | Drop, re-migrate, and re-seed        |

## Project structure

```
prisma/
  schema.prisma        # data model (multi-tenant)
  seed.ts              # demo data
prisma.config.ts       # Prisma 7 CLI config (datasource + seed)
src/
  proxy.ts             # auth gate (formerly middleware)
  app/
    (auth)/            # login, signup
    (app)/             # authenticated shell + feature pages
  components/          # UI kit + nav
  lib/
    actions/           # server actions (auth, employees, departments, users, org)
    auth/              # jwt, session, password, rbac, current-user
    prisma.ts          # Prisma client (pg adapter)
    tenant.ts          # auth + tenant guards
    validations.ts     # Zod schemas
```

## How multi-tenancy works

Every tenant-scoped table carries an `organizationId`. The signed-in user's
organization comes from their session; all queries are scoped to it via
`requireUser()` / `authorize()` and explicit `organizationId` filters. Writes use
`updateMany`/`deleteMany` scoped by `{ id, organizationId }` so no record outside
the tenant can ever be touched.

## Roadmap

- **M2** — Time & attendance (leave requests, approvals, clock in/out)
- **M3** — Payroll (salary, deductions, payslips)
- **M4** — Benefits administration
- **M5** — Employee self-service portal
