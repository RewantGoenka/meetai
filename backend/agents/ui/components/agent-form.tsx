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
import { Textarea } from "@/components/ui/textarea";
import { AgentGetOne } from "../../types";
import { agentsInsertSchema } from "../../schemas";
import { toast } from "sonner";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";

type AgentFormValues = z.infer<typeof agentsInsertSchema>;
interface AgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: AgentGetOne;
}

export const AgentForm = ({ onSuccess, onCancel, initialValues }: AgentFormProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const trpc = useTRPC();

  const createAgent = useMutation(
    trpc.agents.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions());
        if (initialValues?.id) {
          await queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id: initialValues.id }));
        }
        if (onSuccess) onSuccess();
      },
      onError: (error: any) => {
        toast.error(`Error creating agent: ${error.message}`);
      },
    })
  );
  const form = useForm<z.infer<typeof agentsInsertSchema>>({
      resolver: zodResolver(agentsInsertSchema),
      defaultValues: {
        name: initialValues?.name ?? "",
        instructions: initialValues?.instructions ?? "",
      },
    });
  
    const isEdit = !!initialValues?.id;
    const isPending = createAgent.isPending;
  
    const onSubmit = (values: AgentFormValues) => {
      if (isEdit) {
        // TODO: Implement updateAgent mutation
        console.log("TODO: updateAgent");
      } else {
        createAgent.mutate(values);
      }
    };
  
    return (
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <GeneratedAvatar
            seed={form.watch("name")}
            variant="botttsNeutral"
            className="border size-16"
          />
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Math Tutor"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="instructions"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="You are a math assistant that can answer questions and help solve assignments"/>
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
              {isEdit ? "Update Agent" : "Create Agent"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };
  