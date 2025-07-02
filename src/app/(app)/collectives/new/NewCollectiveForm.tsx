'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useState, useTransition, FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { createCollective } from './_actions'; // Server action

export interface CreateCollectiveFormState {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
}

// Constants
const MAX_SLUG_LENGTH = 50;

const siteUrl =
  (process.env['NEXT_PUBLIC_SITE_URL'] ?? '').trim().length > 0
    ? (process.env['NEXT_PUBLIC_SITE_URL'] ?? '')
    : '';

export default function NewCollectivePage(): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );

  const generateSlug = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
      .substring(0, MAX_SLUG_LENGTH); // Max length for slug
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const newName = e.target.value;
      setName(newName);
      if (newName.trim().length > 0) {
        setSlug(generateSlug(newName));
      }
    },
    [generateSlug],
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSlug(generateSlug(e.target.value));
    },
    [generateSlug],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setDescription(e.target.value);
    },
    [],
  );

  const handleCancel = useCallback((): void => {
    router.back();
  }, [router]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setError(undefined);
      setSuccessMessage(undefined);

      startTransition(() => {
        void (async (): Promise<void> => {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('slug', slug);
          formData.append('description', description);

          const result = await createCollective({}, formData);

          if (result.errors) {
            const errorMessages = Object.values(result.errors)
              .flat()
              .join(', ');
            setError(errorMessages || result.message || 'An error occurred');
          } else if (
            result.message &&
            result.message.includes('successfully')
          ) {
            setSuccessMessage(result.message);
            // Optionally clear form fields
            setName('');
            setSlug('');
            setDescription('');
            // Redirect to the new collective's page
            void router.push(`/collectives/${slug}`);
            void router.refresh();
          } else {
            setError(result.message || 'An unexpected error occurred.');
          }
        })();
      });
    },
    [name, slug, description, router],
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Collective</CardTitle>
          <CardDescription>
            Start a new newsletter collective. Choose a unique name and slug.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collective Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Awesome Newsletter"
                required
                value={name}
                onChange={handleNameChange}
                maxLength={100}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="my-awesome-newsletter"
                required
                value={slug}
                onChange={handleSlugChange}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Slug can only contain lowercase letters, numbers, and hyphens."
                maxLength={MAX_SLUG_LENGTH}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                {(siteUrl ?? '').trim().length > 0
                  ? `${siteUrl}/${slug}`
                  : `/${slug}`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell us about your collective..."
                value={description}
                onChange={handleDescriptionChange}
                rows={4}
                maxLength={500}
                disabled={isPending}
              />
            </div>
            {(error ?? '').trim().length > 0 && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {(successMessage ?? '').trim().length > 0 && (
              <p className="text-sm text-accent">{successMessage}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Collective'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
