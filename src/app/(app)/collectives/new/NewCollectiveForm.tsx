'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useState, useEffect , useActionState } from 'react';
import { useFormStatus } from 'react-dom';

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
  errors?: Record<string, string[]>;
}

// Constants
const MAX_SLUG_LENGTH = 50;

const siteUrl =
  (process.env['NEXT_PUBLIC_SITE_URL'] ?? '').trim().length > 0
    ? (process.env['NEXT_PUBLIC_SITE_URL'] ?? '')
    : '';

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Collective'}
    </Button>
  );
}

export default function NewCollectivePage(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const initialState: CreateCollectiveFormState = { message: '' };
  const [state, formAction] = useActionState(createCollective, initialState);

  // Redirect on successful creation
  useEffect(() => {
    console.log('🔄 Form state changed:', state);
    if (state.message && state.message.includes('successfully')) {
      console.log(
        '✅ Success detected, redirecting to:',
        `/collectives/${slug}`,
      );
      void router.push(`/collectives/${slug}`);
    }
  }, [state.message, router, slug]);

  const generateSlug = useCallback((value: string): string => {
    const generated = value
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
      .substring(0, MAX_SLUG_LENGTH); // Max length for slug
    console.log('🔗 Generated slug:', { input: value, output: generated });
    return generated;
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const newName = e.target.value;
      console.log('📝 Name changed:', newName);
      setName(newName);
      if (newName.trim().length > 0) {
        setSlug(generateSlug(newName));
      }
    },
    [generateSlug],
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      console.log('🔗 Slug manually changed:', e.target.value);
      setSlug(generateSlug(e.target.value));
    },
    [generateSlug],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      console.log('📄 Description changed:', e.target.value);
      setDescription(e.target.value);
    },
    [],
  );

  const handleCancel = useCallback((): void => {
    router.back();
  }, [router]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Collective</CardTitle>
          <CardDescription>
            Start a new newsletter collective. Choose a unique name and slug.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
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
              />
            </div>
            {state.errors && Object.keys(state.errors).length > 0 && (
              <p className="text-sm text-destructive">
                {Object.values(state.errors).flat().join(', ')}
              </p>
            )}
            {state.message && !state.errors && (
              <p className="text-sm text-accent">{state.message}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="mr-2"
            >
              Cancel
            </Button>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
