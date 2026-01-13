'use client';
import React, { useState, useCallback, useRef } from 'react';
import { useTRPC } from '@/trpc/client';
import {  useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/loadingstate';
import { ErrorState } from '@/components/error-state';
import { MeetingIdViewHeader } from '../components/meeting-id-view-header';
import { useRouter } from 'next/navigation';
import { UpcomingState } from '../components/upcoming-state';
import { ActiveState } from '../components/active-state';
import { CompletedState } from '@/modules/meetings/ui/components/completed-state';

interface Props {
    meetingId: string;
}

export const MeetingIdView = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data } = useSuspenseQuery(
        trpc.meetings.getOne.queryOptions({id: meetingId})
    );

    const removeMeeting = useMutation(
        trpc.meetings.remove.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions());
                router.push('/meetings');
            },
        }),
    );


    const isActive = data.status === 'active';
    const isUpcoming = data.status === 'upcoming';
    const isCancelled = data.status === 'canceled';
    const isCompleted = data.status === 'completed';
    const isProcessing = data.status === 'processing';

    return (
        <>
            <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <MeetingIdViewHeader
                    meetingId={meetingId}
                    meetingName={data.name}
                    onEdit={() => {
                        router.push(`/meetings/${meetingId}/edit`);
                    }}
                    onRemove={() => {
                        removeMeeting.mutate({ id: meetingId });
                    }}
                    
                    
                />
                {isCancelled && <div>Cancelled</div>}
                {isCompleted && <div><CompletedState data={data} /></div>}
                {isProcessing && <div>Processing</div>}
                {isActive && <ActiveState meetingId={meetingId} />}
                {isUpcoming && <UpcomingState
                    meetingId={meetingId}
                    onCancelMeeting={()=>{}}
                    isCancelling={false}
                />}
            </div>
        </>
    );
};

export const MeetingIdViewLoading = () => {
    return (
        <LoadingState
            title="Loading meeting"
            description="Please wait while we load the meeting."
        />
    );
};

export const MeetingIdViewError = () => {
    return (
        <ErrorState
            title="Failed to load meeting"
            description="Please try again later."
        />
    );
}
