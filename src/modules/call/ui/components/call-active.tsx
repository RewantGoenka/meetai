"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CallControls,
  PaginatedGridLayout,
} from "@stream-io/video-react-sdk";

interface Props {
  onLeaveAction: () => void;
  meetingName: string;
}

export const CallActive = ({ onLeaveAction, meetingName }: Props) => {
  return (
    <div className="flex flex-col p-4 h-full text-white">
      {/* Header */}
      <div className="bg-[#101213] rounded-full p-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit"
        >
          <Image src="/logo.svg" width={22} height={22} alt="Logo" />
        </Link>

        <h4 className="text-base">{meetingName}</h4>
      </div>

      {/* 🔥 VIDEO AREA — MUST BE FLEXIBLE */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PaginatedGridLayout />
      </div>

      {/* Controls */}
      <div className="bg-[#101213] rounded-full px-4 shrink-0">
        <CallControls onLeave={onLeaveAction} />
      </div>
    </div>
  );
};
