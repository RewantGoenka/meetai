import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { meetingsGetOne } from "@/modules/meetings/types";
import { meetingsInsertSchema, meetingsUpdateSchema } from "@/modules/meetings/schemas";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Use the insert schema for create mode, and extend it for edit mode if needed,
// but for the form structure, using the insert schema as the base is fine.
type MeetingFormValues = z.infer<typeof meetingsInsertSchema>;

interface MeetingFormProps {
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
  initialValues?: meetingsGetOne; // This contains the ID for editing
}

export const MeetingForm = ({ onSuccess, onCancel, initialValues }: MeetingFormProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const trpc = useTRPC();
  
  // NOTE: SetOpen state is defined but not used in the form logic.
  // const [open, SetOpen] = useState(false); 

  // --- Initial Setup ---
  const isEdit = !!initialValues?.id;

  // Determine the schema and default values based on whether it's an edit or create form
  // We use the 'meetingsInsertSchema' for the base structure, but validation might vary.
  // For 'update', we will merge the data with the ID later.
  const formSchema = isEdit ? meetingsUpdateSchema.partial().merge(z.object({ id: z.string() })) : meetingsInsertSchema;
  
  const form = useForm<z.infer<typeof meetingsInsertSchema>>({
    resolver: zodResolver(isEdit ? meetingsUpdateSchema : meetingsInsertSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      agentId: initialValues?.agentid ?? "",
    },
  });


  const agents = useQuery(trpc.agents.getMany.queryOptions());


  const createMeeting = useMutation(
    trpc.meetings.create.mutationOptions({
      onSuccess: async (data) => {
        toast.success("Meeting created successfully!");
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions());
        if (onSuccess) onSuccess(data.id);
      },
      onError: (error) => { // Type 'any' removed for better practice
        toast.error(`Error creating meeting: ${error.message}`);
      },
    })
  );


  const updateMeeting = useMutation(
    trpc.meetings.update.mutationOptions({
      onSuccess: async (data) => {
        toast.success("Meeting updated successfully!");
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions());
        // Invalidate the specific meeting's detail query
        await queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: initialValues!.id })); 
        if (onSuccess) onSuccess(data.id);
      },
      onError: (error) => {
        toast.error(`Error updating meeting: ${error.message}`);
      },
    })
  );
  
  const isPending = createMeeting.isPending || updateMeeting.isPending;


  const onSubmit = (values: MeetingFormValues) => {
    if (isEdit) {
      if (!initialValues?.id) {
        toast.error("Error: Cannot update meeting without an ID.");
        return;
      }
      
      
      updateMeeting.mutate({
        id: initialValues.id,
        name: values.name,
        agentId: values.agentId,
      });

    } else { 
      createMeeting.mutate(values);
    }
  };

 
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Math Consultations" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="agentId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent</FormLabel>
              <FormControl>
                <CommandSelect
                  options={(agents.data ?? []).map((agent) => ({
                    id: agent.id,
                    value: agent.id,
                    // The label/children displayed in the command menu
                    children: (
                      <div className="flex items-center gap-x-2">
                        <GeneratedAvatar
                          variant="botttsNeutral"
                          seed={agent.name}
                          className="border size-6"
                        />
                        <span>{agent.name}</span>
                      </div>
                    ),
                  }))}
                  OnSelect={field.onChange} // Correctly updates react-hook-form value
                  value={field.value}
                  placeholder="Select an agent"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between gap-x-2">
          {onCancel && (
            <Button
              variant="ghost"
              disabled={isPending}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button disabled={isPending} type="submit" className="ml-2">
            {isEdit ? "Update Meeting" : "Create Meeting"}
          </Button>
        </div>
      </form>
    </Form>
  );
};