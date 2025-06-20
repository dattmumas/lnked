'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useTransition, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  updateUserProfile,
  type RawUserProfileFormInput,
} from '@/app/actions/userActions';
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

// Constants
const MAX_FULL_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 500;
const MAX_FILE_SIZE_MB = 10;
const KILOBYTE = 1024;
const BYTES_PER_MB = KILOBYTE * KILOBYTE;
const AVATAR_SIZE = 128;

const ClientUserProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name cannot be empty.')
    .max(
      MAX_FULL_NAME_LENGTH,
      `Full name must be ${MAX_FULL_NAME_LENGTH} characters or less.`,
    ),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be ${MAX_BIO_LENGTH} characters or less.`)
    .optional()
    .nullable(),
  avatar_url: z.string().optional().nullable(),
  tags_string: z.string().optional().nullable(),
});

export type UserProfileFormClientValues = z.infer<
  typeof ClientUserProfileSchema
>;

interface EditProfileFormProps {
  defaultValues: UserProfileFormClientValues;
}

// Define submit handler type locally
type SubmitHandler<T> = (data: T) => void | Promise<void>;

export default function EditProfileForm({
  defaultValues,
}: EditProfileFormProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );

  const form = useForm<UserProfileFormClientValues>({
    resolver: zodResolver(ClientUserProfileSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    reset,
  } = form;

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    (defaultValues.avatar_url ?? '').trim().length > 0
      ? (defaultValues.avatar_url ?? undefined)
      : undefined,
  );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('File must be an image.');
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
        setError(`Image must be less than ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = (): void => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setValue('avatar_url', result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    },
    [setValue],
  );

  const onSubmit: SubmitHandler<UserProfileFormClientValues> = useCallback(
    (data) => {
      setError(undefined);
      setSuccessMessage(undefined);

      if (!isDirty) {
        setSuccessMessage('No changes to save.');
        return;
      }

      startTransition(async () => {
        const result = await updateUserProfile(data as RawUserProfileFormInput);

        if (
          result.error !== undefined &&
          result.error !== null &&
          result.error.trim().length > 0
        ) {
          setError(
            result.fieldErrors
              ? `${result.error} ${Object.values(result.fieldErrors)
                  .flat()
                  .join(', ')}`
              : result.error,
          );
        } else {
          setSuccessMessage(
            (result.message ?? '').trim().length > 0
              ? result.message
              : 'Your profile has been updated successfully.',
          );
          reset(data);
        }
      });
    },
    [isDirty, reset, startTransition],
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  return (
    <Card>
      <form onSubmit={handleFormSubmit}>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
          <CardDescription>
            Update your public name, bio, and interests. This information may be
            visible to other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              disabled={isPending || isSubmitting}
            />
            {(errors.full_name?.message ?? '').trim().length > 0 && (
              <p className="text-sm text-destructive">
                {errors.full_name?.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Image</Label>
            {(avatarPreview ?? '').trim().length > 0 && (
              <Image
                src={avatarPreview ?? ''}
                alt="Avatar preview"
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                className="h-32 w-32 rounded-full object-cover"
              />
            )}
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={isPending || isSubmitting}
            />
            <input type="hidden" {...register('avatar_url')}></input>
            {(errors.avatar_url?.message ?? '').trim().length > 0 && (
              <p className="text-sm text-destructive">
                {errors.avatar_url?.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell us a bit about yourself..."
              rows={4}
              disabled={isPending || isSubmitting}
            />
            {(errors.bio?.message ?? '').trim().length > 0 && (
              <p className="text-sm text-destructive">{errors.bio?.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags_string">
              Tags / Interests (comma-separated)
            </Label>
            <Input
              id="tags_string"
              {...register('tags_string')}
              placeholder="e.g., tech, startups, design, coffee"
              disabled={isPending || isSubmitting}
            />
            {(errors.tags_string?.message ?? '').trim().length > 0 && (
              <p className="text-sm text-destructive">
                {errors.tags_string?.message}
              </p>
            )}
          </div>
          {(error ?? '').trim().length > 0 && (
            <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              {error}
            </p>
          )}
          {(successMessage ?? '').trim().length > 0 && (
            <p className="text-sm text-accent p-3 bg-accent/10 rounded-md">
              {successMessage}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || isSubmitting || !isDirty}
          >
            {isPending || isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : undefined}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
