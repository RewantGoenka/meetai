import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

import {HomeView} from "@/modules/home/ui/views/home-view";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { caller } from "@/trpc/server";

const Page = async () => {
  const data = await caller().hello({ text: "Rewant Server" });
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }
  return <p>{data.greeting}</p>;
  return <HomeView />;
};

export default Page;
