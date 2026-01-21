import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient,trpc } from '@/trpc/server';
import { ErrorBoundary } from 'react-error-boundary';
import { MeetingIdView } from '../../../../../backend/meetings/ui/views/meeting-id-view';
import { MeetingIdViewLoading } from '../../../../../backend/meetings/ui/views/meeting-id-view';
import { MeetingIdViewError } from '../../../../../backend/meetings/ui/views/meeting-id-view';
interface Props {
    params: Promise<{ 
        meetingId: string;
    }>;
}

const Page = async ({ params }: Props) => {
    const { meetingId } = await params;
    
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect('/sign-in');
    }
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId }),
    );
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<div>{<MeetingIdViewLoading />}</div>}>
                <ErrorBoundary fallback={<div>{<MeetingIdViewError />}</div>}>
                    <MeetingIdView meetingId={meetingId} />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
}

export default Page;