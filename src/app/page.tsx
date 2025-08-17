"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useState} from "react";
import { authClient } from "@/lib/auth-client";


export default function Home() {
  const { data: session} = authClient.useSession()

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const[password,setPassword] = useState("");

  const onSubmit = () => {
    authClient.signUp.email({
      email,
      name,
      password,
    },{
      onError: () => {
        window.alert("Something went wrong");  
      },
      onSuccess: () => {
        window.alert("Success")
      }
    });
  }
    const onLogin = () => {
    authClient.signIn.email({
      email,
      password,
    },{
      onError: () => {
        window.alert("Something went wrong");  
      },
      onSuccess: () => {
        window.alert("Success")
      }
    });
  }
  return (
    <>
      <div className="p-4 flex flex-col gap-y-4">
        <Input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="p-4 flex flex-col gap-y-4">
        <Button onClick={onSubmit}>
          Create User
        </Button>
      </div>
      <div className="p-4 flex flex-col gap-y-4">
        <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="p-4 flex flex-col gap-y-4">
        <Button onClick={onLogin}>
          Login
        </Button>
      </div>
    </>
    )
  }
