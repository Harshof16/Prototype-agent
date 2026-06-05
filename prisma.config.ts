import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env.local the same way Next.js does, so DATABASE_URL is available during migrations
const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: combinedEnv.DATABASE_URL,
  },
});
