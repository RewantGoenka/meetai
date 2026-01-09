import { Pool, types } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// This ensures timestamps are parsed correctly from Postgres to JS
types.setTypeParser(1114, (str) => new Date(str + "Z"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for many cloud providers including Neon
  },
  max: 1, // Prevents "too many clients" errors during local development
});

export const db = drizzle(pool, { schema });