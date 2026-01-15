// page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  // ✅ Redirect if logged in
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (isPending) return <p>Loading...</p>;

  const handleSignup = async () => {
    try {
      setLoading(true);
      await authClient.signUp.email(
        {
          email: signupEmail,
          name: signupEmail,
          password: signupPassword,
          callbackURL: "/dashboard",
        },
        {
          onSuccess: () => {
            setLoading(false);
            router.push("/dashboard");
          },
          onError: ({ error }) => {
            setLoading(false);
            alert(error.message);
          },
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await authClient.signIn.email(
        {
          email: loginEmail,
          password: loginPassword,
          callbackURL: "/dashboard",
        },
        {
          onSuccess: () => {
            setLoading(false);
            router.push("/dashboard");
          },
          onError: ({ error }) => {
            setLoading(false);
            alert(error.message);
          },
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 shadow-lg w-[360px]">
        <CardContent className="flex flex-col gap-4">
          {/* Sign up */}
          <h2 className="text-lg font-bold">Sign Up</h2>
          <input
            type="email"
            placeholder="Email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            className="border p-2 rounded"
          />
          <Button onClick={handleSignup} disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </Button>

          <hr />

          {/* Login */}
          <h2 className="text-lg font-bold">Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="border p-2 rounded"
          />
          <Button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
