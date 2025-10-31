"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/loadingstate";
import { ErrorState } from "@/components/error-state";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export const MeetingsView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.meetings.getMany.
        queryOptions());

    const columns: ColumnDef<any, any>[] = [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "startedAt", header: "Started At" },
      { accessorKey: "endedAt", header: "Ended At" },
      { accessorKey: "createdAt", header: "Created At" },
      { accessorKey: "duration", header: "Duration" },
    ];

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
          <DataTable columns={columns} data={data} />  
        </div>
    );
};

export const MeetingsViewLoading = () => {
  return (
    <LoadingState
      title="Loading meetings"
      description="Please wait while we load the agents."
    />
  );
};

export const MeetingsViewError = () => {
  return (
    <ErrorState 
      title="Failed to load meetings"
      description="Please try again later."
    />
  );
};