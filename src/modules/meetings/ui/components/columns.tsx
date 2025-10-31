"use client"
import { format } from "date-fns"
import humanizeDuration from "humanize-duration"
import { CircleCheckIcon,
  CircleDashedIcon,
  CircleIcon,
  CircleXIcon,
  ClockArrowUpIcon,
  ClockFadingIcon,
  CornerDownRightIcon,
  Loader,
  LoaderIcon
 } from "lucide-react"
import {cn} from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { meetingsGetMany} from "../../types"
import { GeneratedAvatar } from "@/components/ui/generated-avatar"
import { CornerRightDownIcon, VideoIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function formatDuration(seconds: number) {
  return humanizeDuration(seconds * 1000, { largest: 1, round: true, units: ["h", "m", "s"] });
};

const statusIconMap = {
  completed: CircleCheckIcon,
  active: LoaderIcon,
  upcoming: ClockArrowUpIcon,
  processing: LoaderIcon,
  canceled: CircleXIcon,
};

const statusColorMap = {
  upcoming: "bg-yellow-500/20 text-yellow-800 border-yellow-800/5",
  active: "bg-blue-500/20 text-blue-800 border-blue-800/5",
  completed: "bg-emerald-500/20 text-emerald-800 border-emerald-800/5",
  processing: "bg-rose-500/20 text-rose-800 border-rose-800/5",
  canceled: "bg-gray-300/20 text-gray-800 border-gray-800/5",
}

export const columns: ColumnDef<meetingsGetMany[number]>[] = [
  {
    accessorKey: "name",
    header: "Meeting Name",
    cell:({ row }) => (
      <div className="flex flex-col gap-y-1">
        <span className="font-semibold capitalize">
          {row.original.name}
        </span>
       <div className ="flex items-center gap-x-2">
        <div className ="flex items-center gap-x-1">
          <CornerRightDownIcon className="size-3 text-muted-foreground"/>
          <span className="font-semibold capitalize">{row.original.name}</span>
        </div>
        <GeneratedAvatar
            variant="botttsNeutral"
            seed={row.original.name}
            className="size-6"
          />
          <span className="text-xs text-muted-foreground">
            {row.original.startedAt ? format(row.original.startedAt, "MMM d") : ""}
          </span>
      </div>
    </div>
    )
  },
  {
    accessorKey:"status",
    header:"Status",
    cell:({row}) => {
      const Icon = statusIconMap[row.original.status as keyof typeof statusIconMap];
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize [&>svg]: size-4 text-muted-foreground",
            statusColorMap[row.original.status as keyof typeof statusColorMap]
          )}
        >
          <Icon 
            className={cn(
              row.original.status === "processing" && "animate-spin"
            )}
          />
          {row.original.status}
        </Badge>
      )
    }
  },
  {
    accessorKey:"duration",
    header:"duration",
    cell:({row}) => {
      const started = row.original.startedAt ? new Date(row.original.startedAt).getTime() : null;
      const ended = row.original.endedAt ? new Date(row.original.endedAt).getTime() : null;
      const seconds = started !== null && ended !== null ? Math.round((ended - started) / 1000) : null;
      return (
        <Badge
          variant="outline"
          className="capitalize [&>svg]: size-4 items-center gap-x-2"
        >
        <ClockFadingIcon className="text-blue-700"/>
          {seconds !== null ? formatDuration(seconds) : "No duration"}
        </Badge>
      )
    },
  },
];

