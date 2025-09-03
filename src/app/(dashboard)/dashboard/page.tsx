"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <Button onClick={() => authClient.signOut()}>Logout</Button>
    </div>
  );
}
