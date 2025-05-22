"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteMemberClientSchema } from "@/lib/schemas/memberSchemas";
import { inviteMemberToCollective } from "@/app/actions/memberActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { z } from "zod";

interface InviteMemberFormProps {
  collectiveId: string;
  onSuccess?: () => void; // Callback for successful invite
}

export default function InviteMemberForm({
  collectiveId,
  onSuccess,
}: InviteMemberFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<z.infer<typeof InviteMemberClientSchema>>({
    resolver: zodResolver(InviteMemberClientSchema),
    defaultValues: {
      email: "",
      collectiveId,
      role: "contributor", // always provide a default
    },
  });

  const onSubmit = async (values: z.infer<typeof InviteMemberClientSchema>) => {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const result = await inviteMemberToCollective(values);
      if (result.success) {
        setFormSuccess("Member invited successfully!");
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        setFormError(result.error || "Failed to invite member.");
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(
                field as keyof z.infer<typeof InviteMemberClientSchema>,
                {
                  type: "server",
                  message: errors.join(", "),
                }
              );
            }
          });
        }
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="member@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Assign a role to the new member.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {formSuccess && (
          <Alert variant="default" className="bg-accent/10 text-accent">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{formSuccess}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Invite Member
        </Button>
      </form>
    </Form>
  );
}
