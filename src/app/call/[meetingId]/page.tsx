import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getQueryClient,trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CallView } from "@/modules/call/ui/views/call-view";
interface Props {
    params: Promise <{
        meetingId: string;
    }>;
};

const Page = async ({ params }: Props) => {
    const session = await auth.api.getSession({
     headers: await headers(),
    });
    if (!session) {
        redirect("/sign-in");
    }
    const { meetingId } = await params;
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId })
    );
    return (
        console.log("meetingId passed to call page:", meetingId),
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CallView meetingId={meetingId} />
        </HydrationBoundary>
    )
    
}


export default Page;
