"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  // Separate state for signup
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Separate state for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Get session
  const { data: session } = authClient.useSession();
  if (!session) {
    return (
      <p>Loading...</p>
    );
  }

  // Handlers
  const handleSignup = async () => {
    const { data, error } = await authClient.signUp.email({
      email: signupEmail,
      name: signupEmail, // or use a separate state for name if needed
      password: signupPassword,
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! Please check your email (if verification is enabled).");
    }
  };

  const handleLogin = async () => {
    const { data, error } = await authClient.signIn.email({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Login successful!");
    }
  };

  // Show dashboard if logged in
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4">
            <h1 className="text-xl font-bold">Welcome, {session.user.name}</h1>
            <Button onClick={() => authClient.signOut()}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Otherwise, show signup + login
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
      {/* Signup */}
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Sign Up</h2>
          <Input
            type="email"
            placeholder="Email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
          />
          <Button onClick={handleSignup}>Sign Up</Button>
        </CardContent>
      </Card>

      {/* Login */}
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Login</h2>
          <Input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          <Button onClick={handleLogin}>Login</Button>
        </CardContent>
      </Card>
    </div>
  );
}
