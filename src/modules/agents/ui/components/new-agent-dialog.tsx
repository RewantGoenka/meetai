import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";

interface NewAgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const NewAgentDialog = ({ open, onOpenChange }: NewAgentDialogProps) => {
  return (
    <ResponsiveDialog
       title="New Agent"
       description="Create a new agent to assist you with various tasks."
       open={open}
       onOpenChangeAction={onOpenChange}
    >
      <AgentForm
        onSuccess={()=>onOpenChange(false)}
        onCancel={()=> onOpenChange(false)} 
      />
    </ResponsiveDialog>
  );
};
