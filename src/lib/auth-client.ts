import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // If you leave baseURL out, it uses the current domain (e.g., Render).
    // If you want to FORCE it to use your Vercel API, uncomment the line below:
    // baseURL: "https://meetai-zeta-ashen.vercel.app", 
    
    fetchOptions: {
        // This ensures cookies/sessions are passed correctly 
        // between your Vercel frontend and Render backend.
        credentials: "include", 
    }
});