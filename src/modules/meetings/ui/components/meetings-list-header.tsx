"use client";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NewMeetingDialog } from "./new-meeting-dialog";

export const MeetingsListHeader = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    return (
        <>
            <NewMeetingDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
            <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <div className="flex items-center justify-between">
                    <h5 className="text-xl font-medium">My Meetings</h5>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <PlusIcon />
                        New Meeting
                    </Button>
                </div>
            </div>
        </>
    );
       
};