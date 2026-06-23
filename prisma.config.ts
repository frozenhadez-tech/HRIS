import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. The CLI (migrate/seed/studio) reads the connection
// URL from here; the application runtime uses the driver adapter in
// src/lib/prisma.ts. .env is not auto-loaded in Prisma 7 — hence dotenv above.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
