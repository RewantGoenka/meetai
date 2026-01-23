import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

// DEBUG LOGS: These will show up in your Vercel logs or Terminal
console.log("--- Auth Environment Check ---");
console.log("GITHUB_CLIENT_ID exists:", !!process.env.GITHUB_CLIENT_ID);
console.log("GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
console.log("------------------------------");

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