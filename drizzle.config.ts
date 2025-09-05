import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "d1-http", // 👈 use 'pg' for studio
  dialect: "sqlite",
  dbCredentials: {
    accountId: process.env.ACCOUNT_ID!,
    databaseId: process.env.DATABASE_ID!,
    token: process.env.DATABASE_TOKEN!,
  },
} satisfies Config;

