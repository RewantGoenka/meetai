import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
    // 1. ADD THIS: Explicitly trust the exact Vercel URL
    // Better Auth 1.3.x+ requires this for strict origin validation
    trustedOrigins: [
        "https://meetai-zeta-ashen.vercel.app",
        "http://localhost:3000"
    ],

    socialProviders: {
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        }, 
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        }
    },
    
    emailAndPassword: {
        enabled: true,
    }, 
    
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          ...schema,
        },
    }),

    // 2. ADD THIS: Helps with cross-origin cookie issues on .vercel.app
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
        },
    }
});