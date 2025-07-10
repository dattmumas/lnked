'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateCollectiveSettings } from '@/app/actions/collectiveActions';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import type { Database } from '@/lib/database.types';

type Collective = Database['public']['Tables']['collectives']['Row'];

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  slug: z.string().min(2, 'Slug must be at least 2 characters.'),
  description: z.string().max(500, 'Description is too long.').optional(),
  is_public: z.boolean(),
  governance_model: z.enum(['direct', 'moderated']),
});

type FormValues = z.infer<typeof formSchema>;

export function EditCollectiveSettingsForm({
  collective,
}: {
  collective: Collective;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: collective.name,
      slug: collective.slug,
      description: collective.description ?? '',
      is_public: collective.is_public ?? true,
      governance_model:
        (collective.governance_model as 'direct' | 'moderated') || 'direct',
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        ...values,
        description: values.description || null,
      };
      const result = await updateCollectiveSettings(collective.id, payload);
      if ('success' in result && result.success) {
        toast.success('Settings updated successfully!');
      } else if ('error' in result) {
        toast.error('Failed to update settings', {
          description: result.error,
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Collective's Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input placeholder="your-collective-slug" {...field} />
              </FormControl>
              <FormDescription>
                This will be part of your collective's URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your collective..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="governance_model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Governance</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a governance model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="direct">Direct Publishing</SelectItem>
                  <SelectItem value="moderated">Moderated</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Direct: Members can publish posts directly. Moderated: Posts
                require approval.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_public"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Public Collective</FormLabel>
                <FormDescription>
                  Make this collective visible to everyone.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
