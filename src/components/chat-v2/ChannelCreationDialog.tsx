'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/providers/TenantProvider';

const channelSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(50, 'Channel name too long')
    .regex(
      /^[a-zA-Z0-9-_\s]+$/,
      'Channel name can only contain letters, numbers, hyphens, underscores, and spaces',
    ),
  description: z.string().max(200, 'Description too long').optional(),
  is_private: z.boolean(),
});

type ChannelFormData = z.infer<typeof channelSchema>;

interface ChannelCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channelId: string) => void;
}

export function ChannelCreationDialog({
  open,
  onOpenChange,
  onChannelCreated,
}: ChannelCreationDialogProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenant();

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: '',
      description: '',
      is_private: false,
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: ChannelFormData) => {
      if (!currentTenantId) {
        throw new Error('No tenant selected');
      }

      const response = await fetch(
        `/api/tenants/${currentTenantId}/conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'channel',
            title: data.name,
            description: data.description,
            is_private: data.is_private,
          }),
        },
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ error: null }))) as { error?: string };
        throw new Error(errorData.error || 'Failed to create channel');
      }

      const result = (await response.json()) as {
        conversation?: { id: string };
        data?: { conversation?: { id: string } };
      };
      const channelData = 'data' in result ? result.data : result;

      if (!channelData?.conversation?.id) {
        throw new Error('Invalid channel data received');
      }

      return channelData.conversation as { id: string };
    },
    onMutate: () => {
      // Close dialog immediately for responsive UX
      onOpenChange(false);
      form.reset();
    },
    onSuccess: (data: { id: string }) => {
      // Invalidate conversation caches
      void queryClient.invalidateQueries({
        queryKey: ['tenants', currentTenantId, 'conversations'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });

      // Navigate to the new channel
      if (onChannelCreated && data.id) {
        onChannelCreated(data.id);
      }
    },
    onError: (error) => {
      console.error('Failed to create channel:', error);
      // Reopen dialog on error
      onOpenChange(true);
    },
  });

  const onSubmit = (data: ChannelFormData) => {
    createChannelMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for your team to collaborate.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="general"
                      {...field}
                      disabled={createChannelMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's this channel about?"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={createChannelMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Private Channel</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Only invited members can see this channel
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={createChannelMutation.isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createChannelMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createChannelMutation.isPending}>
                {createChannelMutation.isPending
                  ? 'Creating...'
                  : 'Create Channel'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
