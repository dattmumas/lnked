'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Loader2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Constants for magic numbers
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MAX_BIO_LENGTH = 500;

import {
  updateUserProfile,
  type RawUserProfileFormInput,
} from '@/app/actions/userActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { validateAvatarFile, generateUserInitials } from '@/lib/utils/avatar';

// Use a simplified schema that matches the server action expectations
const UserSettingsSchema = z.object({
  full_name: z
    .string()
    .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
    .max(MAX_NAME_LENGTH),
  username: z
    .string()
    .min(
      MIN_USERNAME_LENGTH,
      `Username must be at least ${MIN_USERNAME_LENGTH} characters.`,
    )
    .max(
      MAX_USERNAME_LENGTH,
      `Username must be ${MAX_USERNAME_LENGTH} characters or less.`,
    )
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens.',
    )
    .optional()
    .nullable(),
  avatar_url: z.string().optional().nullable(),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be ${MAX_BIO_LENGTH} characters or less.`)
    .optional()
    .nullable(),
  tags_string: z.string().optional().nullable(),
});

type UserSettingsFormValues = z.infer<typeof UserSettingsSchema>;

export default function EditUserSettingsForm({
  defaultValues,
}: {
  defaultValues: UserSettingsFormValues;
}): React.ReactElement {
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [formSuccess, setFormSuccess] = useState<string | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    defaultValues.avatar_url ?? undefined,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(UserSettingsSchema),
    defaultValues,
  });

  // Upload avatar file to API endpoint
  const uploadAvatarFile = async (file: File): Promise<string | undefined> => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as {
        success: boolean;
        avatarUrl?: string;
        error?: string;
      };

      if (result.success && result.avatarUrl !== undefined) {
        return result.avatarUrl;
      } else {
        throw new Error(result.error ?? 'Upload failed');
      }
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  };

  // Process image file
  const processImageFile = useCallback(
    async (file: File): Promise<void> => {
      setIsUploadingAvatar(true);
      setFormError(undefined);

      // Validate file using utility function
      const validation = validateAvatarFile(file);
      if (!validation.isValid) {
        setFormError(validation.error ?? 'Invalid file');
        setIsUploadingAvatar(false);
        return;
      }

      try {
        // Create preview URL for immediate feedback
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);

        // Upload file to server
        const avatarUrl = await uploadAvatarFile(file);

        if (
          avatarUrl !== undefined &&
          avatarUrl !== null &&
          avatarUrl.length > 0
        ) {
          // Update form value with the storage URL
          setValue('avatar_url', avatarUrl, { shouldDirty: true });
          // Update preview to the actual stored image
          setAvatarPreview(avatarUrl);
          // Clean up the object URL
          URL.revokeObjectURL(previewUrl);
        }
      } catch (error: unknown) {
        setFormError(
          error instanceof Error
            ? error.message
            : 'Failed to upload avatar. Please try again.',
        );
        // Reset preview on error
        setAvatarPreview(defaultValues.avatar_url ?? undefined);
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [setValue, defaultValues.avatar_url],
  );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { files } = e.target;
      const file = files?.[0];
      if (file === undefined) return;
      void processImageFile(file);
    },
    [processImageFile],
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      const imageFile = Array.from(files).find((file) =>
        file.type.startsWith('image/'),
      );

      if (imageFile !== undefined) {
        void processImageFile(imageFile);
      } else {
        setFormError('Please drop an image file.');
      }
    },
    [processImageFile],
  );

  // Remove avatar
  const handleRemoveAvatar = useCallback((): void => {
    setAvatarPreview(undefined);
    setValue('avatar_url', undefined, { shouldDirty: true });
    setFormError(undefined);
  }, [setValue]);

  // Generate initials using utility function
  const initials = generateUserInitials(
    defaultValues.full_name,
    defaultValues.username,
  );

  // Upload click handler
  const handleClickUpload = useCallback((): void => {
    if (!isUploadingAvatar) {
      const element = document.getElementById('avatar');
      if (element !== null) {
        element.click();
      }
    }
  }, [isUploadingAvatar]);

  // Upload keyboard handler
  const handleKeyDownUpload = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClickUpload();
      }
    },
    [handleClickUpload],
  );

  // Helper function to safely convert error message to string
  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const { message } = error as { message: unknown };
      return typeof message === 'string' ? message : 'Unknown error';
    }
    return 'Unknown error';
  };

  const onSubmitAsync = useCallback(
    async (data: UserSettingsFormValues): Promise<void> => {
      setFormError(undefined);
      setFormSuccess(undefined);

      // Convert to the expected server action type
      const serverData: RawUserProfileFormInput = {
        full_name: data.full_name,
        username: data.username,
        bio: data.bio,
        avatar_url: data.avatar_url,
        tags_string: data.tags_string,
      };

      const result = await updateUserProfile(serverData);
      if (!result.success) {
        setFormError(
          result.error ??
            (result.fieldErrors !== undefined && result.fieldErrors !== null
              ? Object.values(result.fieldErrors).flat().join(', ')
              : 'Unknown error.'),
        );
      } else {
        setFormSuccess(result.message ?? 'Settings updated successfully.');
        reset(data);
        // Update the avatar preview with the saved value
        setAvatarPreview(data.avatar_url ?? undefined);
      }
    },
    [reset, setFormError, setFormSuccess, setAvatarPreview],
  );

  // Helper functions for conditional styling
  const getDragDropClass = (): string => {
    const baseClass =
      'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer';
    const dragClass = isDragOver
      ? 'border-primary bg-primary/5'
      : 'border-border hover:border-primary/50';
    const uploadClass = isUploadingAvatar
      ? 'opacity-50 cursor-not-allowed'
      : '';
    return `${baseClass} ${dragClass} ${uploadClass}`;
  };

  // Form submission handler with proper typing
  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      void handleSubmit((data: UserSettingsFormValues): void => {
        void onSubmitAsync(data);
      })(e);
    },
    [handleSubmit, onSubmitAsync],
  );

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div>
        <label htmlFor="avatar" className="block font-medium mb-1">
          Profile Picture
        </label>
        <div className="flex items-start gap-4 mb-3">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={avatarPreview ?? undefined}
                alt="Profile picture"
              />
              <AvatarFallback className="text-lg font-semibold">
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            {avatarPreview !== undefined &&
              avatarPreview !== null &&
              avatarPreview.length > 0 &&
              !isUploadingAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  title="Remove avatar"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
          </div>

          <div className="flex-1 space-y-3">
            {/* Drag and Drop Area */}
            <div
              className={getDragDropClass()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              onKeyDown={handleKeyDownUpload}
              role="button"
              tabIndex={0}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isUploadingAvatar
                  ? 'Uploading...'
                  : 'Drop an image here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP, GIF up to 10MB
              </p>
            </div>

            {/* Hidden File Input */}
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={isSubmitting || isUploadingAvatar}
              className="hidden"
            />

            {/* Or Text */}
          </div>
        </div>

        {/* Hidden input for the actual avatar_url value */}
        <input type="hidden" {...register('avatar_url')} />
        {errors.avatar_url !== undefined && (
          <p className="text-destructive text-sm mt-1">
            {getErrorMessage(errors.avatar_url)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="full_name" className="block font-medium mb-1">
          Name
        </label>
        <Input id="full_name" {...register('full_name')} autoComplete="name" />
        {errors.full_name !== undefined && (
          <p className="text-destructive text-sm mt-1">
            {getErrorMessage(errors.full_name)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="username" className="block font-medium mb-1">
          Username
        </label>
        <Input
          id="username"
          {...register('username')}
          autoComplete="username"
          placeholder="Choose a unique username"
        />
        {errors.username !== undefined && (
          <p className="text-destructive text-sm mt-1">
            {getErrorMessage(errors.username)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className="block font-medium mb-1">
          Bio
        </label>
        <Textarea id="bio" {...register('bio')} rows={3} />
        {errors.bio !== undefined && (
          <p className="text-destructive text-sm mt-1">
            {getErrorMessage(errors.bio)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tags_string" className="block font-medium mb-1">
          Tags (comma separated)
        </label>
        <Input id="tags_string" {...register('tags_string')} />
        {errors.tags_string !== undefined && (
          <p className="text-destructive text-sm mt-1">
            {getErrorMessage(errors.tags_string)}
          </p>
        )}
      </div>

      {formError !== undefined &&
        formError !== null &&
        formError.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

      {formSuccess !== undefined &&
        formSuccess !== null &&
        formSuccess.length > 0 && (
          <Alert variant="default">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{formSuccess}</AlertDescription>
          </Alert>
        )}

      <Button
        type="submit"
        disabled={isSubmitting || !isDirty || isUploadingAvatar}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  );
}
