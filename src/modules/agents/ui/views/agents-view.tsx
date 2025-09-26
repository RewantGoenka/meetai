"use client";
import { ErrorState } from "@/components/error-state";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loadingstate";
import { DataTable } from "@/modules/agents/ui/components/data-table";
import { columns} from "@/modules/agents/ui/components/columns";
import { useRouter } from "next/navigation";
export const AgentsView = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(row) => router.push(`/agents/${row.id}`)}
      />
    </div>
  );
};

export const AgentsViewLoading = () => {
  return (
    <LoadingState
      title="Loading agents"
      description="Please wait while we load the agents."
    />
  );
};

export const AgentsViewError = () => {
  return (
    <ErrorState
      title="Failed to load agents"
      description="Please try again later."
    />
  );
};