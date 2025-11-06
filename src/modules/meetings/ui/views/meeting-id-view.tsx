'use client';
import React, { useState, useCallback, useRef } from 'react';
import { useTRPC } from '@/trpc/client';
import {  useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/loadingstate';
import { ErrorState } from '@/components/error-state';
import { MeetingIdViewHeader } from '../components/meeting-id-view-header';
import { useRouter } from 'next/navigation';

/**
 * Inline useConfirm implementation to avoid missing module error.
 * Returns [ConfirmComponent, confirm] where `confirm` opens the dialog and resolves with true/false.
 */
function useConfirm(title: string, description?: string): [React.FC, (onConfirm?: () => void | Promise<void>) => Promise<boolean>] {
    const [visible, setVisible] = useState(false);
    const [callback, setCallback] = useState<(() => void | Promise<void>) | undefined>(undefined);
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((onConfirm?: () => void | Promise<void>) => {
        setCallback(() => onConfirm);
        setVisible(true);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const close = (result: boolean) => {
        setVisible(false);
        if (resolverRef.current) {
            resolverRef.current(result);
            resolverRef.current = null;
        }
    };

    const ConfirmComponent: React.FC = () => {
        if (!visible) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="bg-black/50 absolute inset-0"
                    onClick={() => close(false)}
                />
                <div className="bg-white rounded p-4 z-10 max-w-md w-full">
                    <h3 className="text-lg font-medium">{title}</h3>
                    {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            className="px-3 py-1 rounded border"
                            onClick={() => close(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1 rounded bg-red-600 text-white"
                            onClick={async () => {
                                if (callback) await callback();
                                close(true);
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return [ConfirmComponent, confirm];
}
interface Props {
    meetingId: string;
}

export const MeetingIdView = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [RemoveConfirmation,confirmRemove] = useConfirm(
        "Are you sure?",
        "The following action will remove this meeting."
    );
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

    const handleRemoveMeeting = async () => {
        const ok = await confirmRemove();
        if (!ok) return;
        await removeMeeting.mutateAsync({ id: meetingId });
    };

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
                    onEdit={() => {}}
                    onRemove={handleRemoveMeeting}
                />
                {isCancelled && <div>Cancelled</div>}
                {isCompleted && <div>Completed</div>}
                {isProcessing && <div>Processing</div>}
                {isUpcoming && <div>Upcoming</div>}
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