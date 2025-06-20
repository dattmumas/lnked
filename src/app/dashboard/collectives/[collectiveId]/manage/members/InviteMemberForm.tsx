'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Terminal, Loader2 } from 'lucide-react';
import React, { useCallback, useState, useTransition } from 'react';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { z } from 'zod';

import { inviteMemberToCollective } from '@/app/actions/memberActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteMemberClientSchema } from '@/lib/schemas/memberSchemas';

interface InviteMemberFormProps {
  collectiveId: string;
  onSuccess?: () => void; // Callback for successful invite
}

export default function InviteMemberForm({
  collectiveId,
  onSuccess,
}: InviteMemberFormProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [formSuccess, setFormSuccess] = useState<string | undefined>(undefined);

  const form = useForm<z.infer<typeof InviteMemberClientSchema>>({
    resolver: zodResolver(InviteMemberClientSchema),
    defaultValues: {
      email: '',
      collectiveId,
      role: 'contributor', // always provide a default
    },
  });

  const onSubmit = useCallback(
    (values: z.infer<typeof InviteMemberClientSchema>): void => {
      setFormError(undefined);
      setFormSuccess(undefined);

      startTransition(async () => {
        const result = await inviteMemberToCollective(values);
        if (result.success === true) {
          setFormSuccess('Member invited successfully!');
          form.reset();
          if (onSuccess !== undefined) {
            onSuccess();
          }
        } else {
          setFormError(
            (result.error ?? '').trim().length > 0
              ? (result.error ?? undefined)
              : 'Failed to invite member.',
          );
          if (result.fieldErrors !== undefined && result.fieldErrors !== null) {
            Object.entries(result.fieldErrors).forEach(([field, errors]) => {
              if (
                errors !== undefined &&
                errors !== null &&
                errors.length > 0
              ) {
                form.setError(
                  field as keyof z.infer<typeof InviteMemberClientSchema>,
                  {
                    type: 'server',
                    message: errors.join(', '),
                  },
                );
              }
            });
          }
        }
      });
    },
    [form, onSuccess],
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      void form.handleSubmit(onSubmit)(event);
    },
    [form, onSubmit],
  );

  const handleEmailFieldRender = useCallback(
    ({
      field,
    }: {
      field: ControllerRenderProps<
        z.infer<typeof InviteMemberClientSchema>,
        'email'
      >;
    }): React.ReactElement => (
      <FormItem>
        <FormLabel>Email Address</FormLabel>
        <FormControl>
          <Input placeholder="member@example.com" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [],
  );

  const handleRoleFieldRender = useCallback(
    ({
      field,
    }: {
      field: ControllerRenderProps<
        z.infer<typeof InviteMemberClientSchema>,
        'role'
      >;
    }): React.ReactElement => (
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
        <FormDescription>Assign a role to the new member.</FormDescription>
        <FormMessage />
      </FormItem>
    ),
    [],
  );

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={handleEmailFieldRender}
        />
        <FormField
          control={form.control}
          name="role"
          render={handleRoleFieldRender}
        />

        {formError !== undefined &&
          formError !== null &&
          formError.trim().length > 0 && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
        {formSuccess !== undefined &&
          formSuccess !== null &&
          formSuccess.trim().length > 0 && (
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
