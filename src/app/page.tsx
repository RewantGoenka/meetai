// page.tsx
"use client";
import { redirect } from "next/navigation";


export default function Home() {
  redirect("/sign-in");
}