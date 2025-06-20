'use client';

import React from 'react';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { postFormFieldsSchema } from '@/lib/schemas/postFormFieldsSchema';

// Define local types to replace missing react-hook-form exports
type FieldValues = Record<string, unknown>;
type FieldError = { message?: string };
type FieldErrors<T extends FieldValues> = Partial<Record<keyof T, FieldError>>;

// Define missing types locally - simplified for compatibility
type UseFormRegister<T extends FieldValues> = (
  name: keyof T,
  options?: Record<string, unknown>,
) => Record<string, unknown>;

// re-export for backward compatibility
export { postFormFieldsSchema };

// local alias for generic default
export type PostFormFieldsValues = z.infer<typeof postFormFieldsSchema>;

// Use a generic type that extends the base fields this component manages
// TFormValues must include at least 'title', 'status', and 'published_at'
interface PostFormFieldsProps<TFormValues extends PostFormFieldsValues> {
  register: UseFormRegister<TFormValues>;
  errors: FieldErrors<TFormValues>;
  currentStatus: 'draft' | 'published' | 'scheduled' | undefined;
  isSubmitting: boolean;
  titlePlaceholder?: string;
  /**
   * Whether to render the title field. Defaults to true.
   */
  showTitle?: boolean;
}

export default function PostFormFields<
  TFormValues extends PostFormFieldsValues,
>({
  register,
  errors,
  currentStatus,
  isSubmitting,
  titlePlaceholder = 'Post Title',
  showTitle = true,
}: PostFormFieldsProps<TFormValues>): React.ReactElement {
  // Helper to safely access error messages
  const getErrorMessage = (
    error: FieldError | undefined,
  ): string | undefined => {
    return error?.message;
  };

  return (
    <>
      {showTitle && (
        <div>
          <Label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Post Title
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder={titlePlaceholder}
            disabled={isSubmitting}
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">
              {getErrorMessage(errors.title as FieldError)}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status" className="text-sm font-medium text-foreground">
          Post Status
        </Label>
        <select
          id="status"
          {...register('status')}
          disabled={isSubmitting}
          className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Publish Immediately</option>
          <option value="scheduled">Schedule for Later</option>
        </select>
        {errors.status && (
          <p className="text-sm text-destructive mt-1">
            {getErrorMessage(errors.status as FieldError)}
          </p>
        )}
      </div>

      {currentStatus === 'scheduled' && (
        <div className="space-y-2">
          <Label
            htmlFor="published_at"
            className="text-sm font-medium text-foreground"
          >
            Publish Date & Time
          </Label>
          <Input
            id="published_at"
            type="datetime-local"
            {...register('published_at')}
            disabled={isSubmitting}
            className={errors.published_at ? 'border-destructive' : ''}
          />
          {errors.published_at && (
            <p className="text-sm text-destructive mt-1">
              {getErrorMessage(errors.published_at as FieldError)}
            </p>
          )}
        </div>
      )}
    </>
  );
}
