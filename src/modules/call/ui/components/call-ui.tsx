"use client";

import { useRef, useState } from "react";
import {
  StreamTheme,
  StreamCall,
  useCall,
} from "@stream-io/video-react-sdk";

import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";

interface Props {
  meetingName: string;
}

export const CallUI = ({ meetingName }: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const hasLeftRef = useRef(false);

  const handleLeave = async () => {
    if (!call || hasLeftRef.current) return;
    hasLeftRef.current = true;

    try {
      // 🔥 THIS is what actually ends the meeting
      await fetch("/api/stream/end-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id }),
      });
    } catch {}

    // always leave locally
    await call.leave().catch(() => {});
    setShow("ended");
  };

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && (
        <CallLobby onJoinAction={() => setShow("call")} />
      )}

      {show === "call" && call && (
        <StreamCall call={call}>
          <CallActive
            meetingName={meetingName}
            onLeaveAction={handleLeave}
          />
        </StreamCall>
      )}

      {show === "ended" && <CallEnded />}
    </StreamTheme>
  );
};
