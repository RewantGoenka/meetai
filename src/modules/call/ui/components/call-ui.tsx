"use client";

import { useState } from "react";
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

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && (
        <CallLobby
          onJoinAction={() => {
            // join already handled elsewhere ✔
            setShow("call");
          }}
        />
      )}

      {show === "call" && call && (
        <StreamCall call={call}>
          <CallActive
            meetingName={meetingName}
            onLeaveAction={() => setShow("ended")}
          />
        </StreamCall>
      )}

      {show === "ended" && (
        <CallEnded />
      )}
    </StreamTheme>
  );
};
