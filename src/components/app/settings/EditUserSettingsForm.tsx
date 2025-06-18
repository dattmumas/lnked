'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be 30 characters or less.')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens.',
    )
    .optional()
    .nullable(),
  avatar_url: z.string().optional().nullable(),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or less.')
    .optional()
    .nullable(),
  tags_string: z.string().optional().nullable(),
});

type UserSettingsFormValues = z.infer<typeof UserSettingsSchema>;

export default function EditUserSettingsForm({
  defaultValues,
}: {
  defaultValues: UserSettingsFormValues;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    defaultValues.avatar_url || null,
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
  const uploadAvatarFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        return result.avatarUrl;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  };

  // Process image file
  const processImageFile = useCallback(
    async (file: File) => {
      setIsUploadingAvatar(true);
      setFormError(null);

      // Validate file using utility function
      const validation = validateAvatarFile(file);
      if (!validation.isValid) {
        setFormError(validation.error || 'Invalid file');
        setIsUploadingAvatar(false);
        return;
      }

      try {
        // Create preview URL for immediate feedback
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);

        // Upload file to server
        const avatarUrl = await uploadAvatarFile(file);

        if (avatarUrl) {
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
        setAvatarPreview(defaultValues.avatar_url || null);
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [setValue, defaultValues.avatar_url],
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile) {
        processImageFile(imageFile);
      } else {
        setFormError('Please drop an image file.');
      }
    },
    [processImageFile],
  );

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setValue('avatar_url', null, { shouldDirty: true });
    setFormError(null);
  };

  // Generate initials using utility function
  const initials = generateUserInitials(
    defaultValues.full_name,
    defaultValues.username,
  );

  const onSubmit = async (data: UserSettingsFormValues) => {
    setFormError(null);
    setFormSuccess(null);

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
        result.error ||
          (result.fieldErrors
            ? Object.values(result.fieldErrors).flat().join(', ')
            : 'Unknown error.'),
      );
    } else {
      setFormSuccess(result.message || 'Settings updated successfully.');
      reset(data);
      // Update the avatar preview with the saved value
      setAvatarPreview(data.avatar_url || null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="avatar" className="block font-medium mb-1">
          Profile Picture
        </label>
        <div className="flex items-start gap-4 mb-3">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={avatarPreview || undefined}
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
            {avatarPreview && !isUploadingAvatar && (
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
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                !isUploadingAvatar && document.getElementById('avatar')?.click()
              }
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
        {errors.avatar_url && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.avatar_url === 'object' &&
                'message' in errors.avatar_url
                ? errors.avatar_url.message
                : errors.avatar_url,
            )}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="full_name" className="block font-medium mb-1">
          Name
        </label>
        <Input id="full_name" {...register('full_name')} autoComplete="name" />
        {errors.full_name && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.full_name === 'object' &&
                'message' in errors.full_name
                ? errors.full_name.message
                : errors.full_name,
            )}
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
        {errors.username && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.username === 'object' &&
                'message' in errors.username
                ? errors.username.message
                : errors.username,
            )}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className="block font-medium mb-1">
          Bio
        </label>
        <Textarea id="bio" {...register('bio')} rows={3} />
        {errors.bio && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.bio === 'object' && 'message' in errors.bio
                ? errors.bio.message
                : errors.bio,
            )}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tags_string" className="block font-medium mb-1">
          Tags (comma separated)
        </label>
        <Input id="tags_string" {...register('tags_string')} />
        {errors.tags_string && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.tags_string === 'object' &&
                'message' in errors.tags_string
                ? errors.tags_string.message
                : errors.tags_string,
            )}
          </p>
        )}
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {formSuccess && (
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
