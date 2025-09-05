import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "drizzle/schema"; // import all your tables from introspect

// Connect using Neon
const sql = neon(process.env.DATABASE_URL!);

// Export a db instance with schema typing
export const db = drizzle(sql, { schema });

// Optional: if you want raw queries too
export { sql };
