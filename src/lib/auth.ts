import { betterAuth} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema"
 
export const auth = betterAuth({
    socialProviders : {
       google: { 
            clientId: process.env.AUTH_GOOGLE_ID as string, 
            clientSecret: process.env.AUTH_GOOGLE_SECRET as string, 
        }, 
      github: {
        clientId:process.env.AUTH_GITHUB_ID as string,
        clientSecret:process.env.AUTH_GITHUB_SECRET as string,
      }
    },
    emailAndPassword: {
    enabled: true,
  }, 
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          ...schema,
        }, // or "mysql", "sqlite" but I am using postgres in this project
    }),
});