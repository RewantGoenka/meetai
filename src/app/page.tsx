"use client"
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Session
  const { data: session, isPending } = authClient.useSession();

  // Show loading only while fetching
  if (isPending) {
    return <p>Loading...</p>;
  }

  // Handlers
  const handleSignup = async () => {
    const { error } = await authClient.signUp.email({
      email: signupEmail,
      name: signupEmail,
      password: signupPassword,
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! Check your email.");
    }
  };

  const handleLogin = async () => {
    const { error } = await authClient.signIn.email({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Login successful!");
    }
  };

  // Logged in → dashboard
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

  // Logged out → signup + login
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 shadow-lg">
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Sign Up</h2>
          <input
            type="email"
            placeholder="Email"
            value={signupEmail}
            onChange={e => setSignupEmail(e.target.value)}
            className="border p-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={signupPassword}
            onChange={e => setSignupPassword(e.target.value)}
            className="border p-2"
          />
          <Button onClick={handleSignup}>Sign Up</Button>
          <hr />
          <h2 className="text-lg font-bold">Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            className="border p-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            className="border p-2"
          />
          <Button onClick={handleLogin}>Login</Button>
        </CardContent>
      </Card>
    </div>
  );
}
