"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { session } from "@/db/schema";

export const HomeView = () => {
    const { data:session } = authClient.useSession();

    if(!session){
        return (
            <p>Loading...</p>
        );
    }

    return (
        <div className="flex flex-col p-4 gap-y-4">
            <p>Logged in as {session.user.name}</p>
            <Button onClick={() => authClient.signOut()}>
                Sign out
            </Button>
        </div>
    );
}



