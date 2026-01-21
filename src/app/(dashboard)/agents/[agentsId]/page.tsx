import { getQueryClient,trpc } from '@/trpc/server';
import { HydrationBoundary,dehydrate } from '@tanstack/react-query';
// Update the import path to the correct relative path
import { AgentIdView, AgentIdViewLoading } from "../../../../../backend/agents/ui/views/agent-id-view";
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import { AgentIdViewError } from '../../../../../backend/agents/ui/views/agent-id-view';
interface Props {
    params:Promise<{ agentsId: string }>
};

const Page = async ({ params}:Props) => {
    const { agentsId } = await params;
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.agents.getOne.queryOptions({ id: agentsId })
    )
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<AgentIdViewLoading />}>
            <ErrorBoundary fallback={<AgentIdViewError />}>
            <AgentIdView agentId={agentsId} />
            </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};
export default Page;
