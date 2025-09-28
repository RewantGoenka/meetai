"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/loadingstate";
import { ErrorState } from "@/components/error-state";
export const MeetingsView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.meetings.getMany.
        queryOptions());
    return (
        <div>{JSON.stringify(data)}</div>
    );
}

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