"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CallUI } from "./call-ui";
import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { useTRPC } from "@/trpc/client";
import "@stream-io/video-react-sdk/dist/css/styles.css";

interface Props {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string;
}

export const CallConnect = ({
  meetingId,
  meetingName,
  userId,
  userName,
  userImage,
}: Props) => {
  const trpc = useTRPC();
  const { mutateAsync: generateToken } = useMutation(
    trpc.meetings.generateToken.mutationOptions()
  );

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const joinedRef = useRef(false);

  // 1️⃣ Create Stream client
  useEffect(() => {
    const _client = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
      user: {
        id: userId,
        name: userName,
        image: userImage,
      },
      tokenProvider: generateToken,
    });

    setClient(_client);

    return () => {
      _client.disconnectUser().catch(() => {});
      setClient(null);
    };
  }, [userId, userName, userImage, generateToken]);

  // 2️⃣ Create call
  useEffect(() => {
    if (!client) return;

    const _call = client.call("default", meetingId);
    setCall(_call);

    return () => {
      if (_call.state.callingState !== CallingState.LEFT) {
        _call.leave().catch(() => {});
      }
      setCall(null);
    };
  }, [client, meetingId]);

  // 3️⃣ JOIN CALL (CRITICAL FIX)
  useEffect(() => {
    if (!call || joinedRef.current) return;

    joinedRef.current = true;
    call.join({ create: true }).catch(console.error);

    return () => {
      joinedRef.current = false;
    };
  }, [call]);

  if (!client || !call) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderIcon className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI meetingName={meetingName} />
      </StreamCall>
    </StreamVideo>
  );
};
