'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  updateUserProfile,
  type RawUserProfileFormInput,
} from '@/app/actions/userActions';
import { Loader2 } from 'lucide-react';

const ClientUserProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name cannot be empty.')
    .max(100, 'Full name must be 100 characters or less.'),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or less.')
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

export default function EditProfileForm({
  defaultValues,
}: EditProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<UserProfileFormClientValues>({
    resolver: zodResolver(ClientUserProfileSchema),
    defaultValues: defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    reset,
  } = form;

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    defaultValues.avatar_url || null,
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File must be an image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setValue('avatar_url', result, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit: SubmitHandler<UserProfileFormClientValues> = async (data) => {
    setError(null);
    setSuccessMessage(null);

    if (!isDirty) {
      setSuccessMessage('No changes to save.');
      return;
    }

    startTransition(async () => {
      const result = await updateUserProfile(data as RawUserProfileFormInput);

      if (result.error) {
        setError(
          result.fieldErrors
            ? `${result.error} ${Object.values(result.fieldErrors)
                .flat()
                .join(', ')}`
            : result.error,
        );
      } else {
        setSuccessMessage(
          result.message || 'Your profile has been updated successfully.',
        );
        reset(data);
      }
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
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
            {errors.full_name && (
              <p className="text-sm text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Image</Label>
            {avatarPreview && (
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                width={128}
                height={128}
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
            {errors.avatar_url && (
              <p className="text-sm text-destructive">
                {errors.avatar_url.message}
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
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
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
            {errors.tags_string && (
              <p className="text-sm text-destructive">
                {errors.tags_string.message}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              {error}
            </p>
          )}
          {successMessage && (
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
            ) : null}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
