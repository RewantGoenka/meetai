import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
    // 1. DYNAMIC BASE URL: 
    // This allows Better Auth to infer the correct URL from the request, 
    // fixing the mismatch between Vercel, Render, and Localhost ports.
    baseURL: process.env.BETTER_AUTH_URL,

    trustedOrigins: [
    "https://meetai-zeta-ashen.vercel.app",
    "http://localhost:3000",
    "https://meetai-82zz.onrender.com",
    process.env.BETTER_AUTH_URL as string // Dynamically trust whatever is in your ENV
].filter(Boolean),

    socialProviders: {
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID!, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!, 
        }, 
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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

    advanced: {
        // 2. TRUST PROXY HEADERS: 
        // Essential for Render. It tells Better Auth to trust 'x-forwarded-host'
        // which prevents the 307 redirect loop.
        trustedProxyHeaders: true,
        
        crossSubDomainCookies: {
            enabled: true,
        },
    }
});