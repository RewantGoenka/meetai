import {HomeView} from "@/modules/home/ui/views/home-view";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { caller } from "@/trpc/server";

const Page = async () => {
  const data = await caller().agents.getMany();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }
  return (
    <div>
      {data.map(agent => (
        <div key={agent.id}>
          <p>Name: {agent.name}</p>
          <p>User ID: {agent.userid}</p>
          <p>Instructions: {agent.instructions}</p>
          <p>Created At: {agent.createdAt.toString()}</p>
          <p>Updated At: {agent.updatedAt.toString()}</p>
        </div>
      ))}
      <HomeView />
    </div>
  );
};

export default Page;
