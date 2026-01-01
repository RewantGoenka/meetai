"use client";

import { LogInIcon } from "lucide-react";
import Link from "next/link";

import {
  DefaultVideoPlaceholder,
  StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  VideoPreview,
} from "@stream-io/video-react-sdk";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { generateAvatarUri } from "@/lib/avatar";

import "@stream-io/video-react-sdk/dist/css/styles.css";

interface Props {
  onJoinAction: () => void;
}

/* -----------------------------
   Disabled Video Preview
   (avatar fallback – FIXED)
-------------------------------- */
const DisabledVideoPreview = () => {
  const { data } = authClient.useSession();

  const name = data?.user?.name ?? "Guest";

  return (
    <DefaultVideoPlaceholder
      participant={
        {
          name,
          image:
            data?.user?.image ??
            generateAvatarUri({
              seed: name,
              variant: "initials",
            }),
        } as StreamVideoParticipant
      }
    />
  );
};

/* -----------------------------
   Missing permissions message
-------------------------------- */
const AllowedBrowserPermissions = () => {
  return (
    <p className="text-sm">
      Please enable your camera or microphone to join the call.
    </p>
  );
};

/* -----------------------------
   Call Lobby (NO layout changes)
-------------------------------- */
export const CallLobby = ({ onJoinAction }: Props) => {
  const { useCameraState, useMicrophoneState } = useCallStateHooks();

  const {
    hasBrowserPermission: hasCameraPermission,
    isEnabled: isCameraEnabled,
  } = useCameraState();

  const {
    hasBrowserPermission: hasMicPermission,
    isEnabled: isMicEnabled,
  } = useMicrophoneState();

  /**
   * Stream-correct logic:
   * allow joining if user has at least ONE media capability
   */
  const canJoin =
    hasCameraPermission ||
    hasMicPermission ||
    isCameraEnabled ||
    isMicEnabled;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accross to-sidebar-accross">
      <div className="py-4 px-8 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">Ready to join?</h6>
            <p className="text-sm">
              Setup your call before joining the meeting.
            </p>
          </div>

          {/* Video Preview */}
          <VideoPreview
            DisabledVideoPreview={
              canJoin ? DisabledVideoPreview : AllowedBrowserPermissions
            }
          />

          {/* Media Controls */}
          <div className="flex gap-x-2 justify-between w-full">
            <ToggleVideoPreviewButton />
            <ToggleAudioPreviewButton />
          </div>

          {/* Actions */}
          <div className="flex gap-x-2 justify-between w-full">
            <Button asChild variant="ghost">
              <Link href="/meetings">Cancel</Link>
            </Button>

            <Button onClick={ onJoinAction} disabled={!canJoin}>
              <LogInIcon className="mr-2 h-4 w-4" />
              Join Call
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
