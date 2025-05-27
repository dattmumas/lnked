'use client';

import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PostFormSchema, type PostFormValues } from '@/lib/schemas/postSchemas';
import EditorLayout from '@/components/editor/EditorLayout';
import {
  updatePost,
  deletePost,
  UpdatePostClientValues,
} from '@/app/actions/postActions';
import { useState, useTransition, useEffect, useCallback } from 'react';
import type { Tables } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import PostEditor from '@/components/editor/PostEditor';
import SEOSettingsDrawer from '@/components/editor/SEOSettingsDrawer';
import { EMPTY_LEXICAL_STATE } from '@/lib/editorConstants';
import { Input } from '@/components/ui/input';
import { PublishSettingsCard } from '@/components/editor/PublishSettingsCard';
import { QuickActionsBar } from '@/components/editor/QuickActionsBar';

type EditPostFormValues = PostFormValues;

export interface PostDataType extends Tables<'posts'> {
  collective_name?: string | null;
}

interface EditPostFormProps {
  postId: string;
  initialData: PostDataType;
  pageTitle: string;
}

function getInitialStatus(post: PostDataType): EditPostFormValues['status'] {
  if (post.published_at && new Date(post.published_at) > new Date()) {
    return 'scheduled';
  }
  if (post.is_public) {
    return 'published';
  }
  return 'draft';
}

const formatDateForInput = (date: Date | string | null): string => {
  if (!date) return '';
  const d = new Date(date);
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export default function EditPostForm({
  postId,
  initialData,
  pageTitle,
}: EditPostFormProps) {
  const router = useRouter();
  const [isProcessing, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('');
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);

  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      title: initialData.title || '',
      subtitle: initialData.subtitle || '',
      content: initialData.content || EMPTY_LEXICAL_STATE,
      status: getInitialStatus(initialData),
      published_at: initialData.published_at
        ? formatDateForInput(initialData.published_at)
        : '',
      author: initialData.author || '',
      seo_title: initialData.seo_title || '',
      meta_description: initialData.meta_description || '',
    },
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
    getValues,
  } = form;

  const currentStatus = watch('status');
  const currentTitle = watch('title');
  const currentContent = watch('content');

  useEffect(() => {
    reset({
      title: initialData.title || '',
      subtitle: initialData.subtitle || '',
      content: initialData.content || EMPTY_LEXICAL_STATE,
      status: getInitialStatus(initialData),
      published_at: initialData.published_at
        ? formatDateForInput(initialData.published_at)
        : '',
      author: initialData.author || '',
      seo_title: initialData.seo_title || '',
      meta_description: initialData.meta_description || '',
    });
  }, [initialData, reset]);

  const performAutosave = useCallback(async () => {
    if (!isDirty) return;
    if (currentStatus !== 'draft') return; // Only autosave actual drafts

    setAutosaveStatus('Saving draft...');
    const dataToSave = getValues();
    const autosavePayload: UpdatePostClientValues = {
      title: dataToSave.title,
      subtitle: dataToSave.subtitle,
      content: dataToSave.content,
      is_public: false,
      published_at:
        dataToSave.status === 'scheduled' && dataToSave.published_at
          ? new Date(dataToSave.published_at).toISOString()
          : null,
      author: dataToSave.author,
      seo_title: dataToSave.seo_title,
      meta_description: dataToSave.meta_description,
    };
    const result = await updatePost(postId, autosavePayload);
    if (result.error) {
      setAutosaveStatus(`Autosave failed: ${result.error.substring(0, 100)}`);
    } else {
      setAutosaveStatus('Draft saved.');
      reset(dataToSave); // Reset dirty state with current values
    }
  }, [isDirty, currentStatus, getValues, postId, reset]);

  useEffect(() => {
    const isDrafting = currentStatus === 'draft';
    if (isDirty && isDrafting) {
      const handler = setTimeout(performAutosave, 5000);
      return () => clearTimeout(handler);
    }
  }, [currentTitle, currentContent, isDirty, currentStatus, performAutosave]);

  const onSubmit: SubmitHandler<EditPostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus('');

    const payloadForUpdate: UpdatePostClientValues = {
      title: data.title,
      subtitle: data.subtitle,
      content: data.content,
      author: data.author,
      seo_title: data.seo_title,
      meta_description: data.meta_description,
    };

    if (data.status === 'published') {
      payloadForUpdate.is_public = true;
      payloadForUpdate.published_at = new Date().toISOString();
    } else if (data.status === 'scheduled') {
      payloadForUpdate.is_public = true;
      if (data.published_at && data.published_at.trim() !== '') {
        payloadForUpdate.published_at = new Date(
          data.published_at,
        ).toISOString();
      } else {
        form.setError('published_at', {
          type: 'manual',
          message: 'Publish date is required for scheduled posts.',
        });
        return;
      }
    } else {
      payloadForUpdate.is_public = false;
      payloadForUpdate.published_at = null;
    }

    startTransition(async () => {
      const result = await updatePost(postId, payloadForUpdate);
      if (result.error) {
        setServerError(result.error);
      } else if (result.data) {
        reset(data);
        alert('Post updated successfully!');
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this post? This action cannot be undone.',
      )
    )
      return;
    setIsDeleting(true);
    setServerError(null);
    setAutosaveStatus('');
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        setServerError(result.error);
        setIsDeleting(false);
      } else {
        alert('Post deleted successfully.');
        router.push(result.redirectPath || '/dashboard');
        router.refresh();
      }
    });
  };

  const formControlsNode = (
    <div className="space-y-6">
      <PublishSettingsCard
        status={currentStatus}
        onStatusChange={(value) => setValue('status', value)}
        publishedAt={watch('published_at')}
        onPublishedAtChange={(value) => setValue('published_at', value)}
        onPublish={handleSubmit(onSubmit)}
        isPublishing={isProcessing || isSubmitting || isDeleting}
        autosaveStatus={autosaveStatus}
        errors={{
          published_at: errors.published_at
            ? { message: errors.published_at.message as string }
            : undefined,
        }}
        postId={postId}
      />
      {serverError && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
          {serverError.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}
      {errors.content && (
        <p className="text-sm text-destructive mt-1">
          {errors.content.message as string}
        </p>
      )}
      <div className="pt-6 border-t">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-foreground/70 mb-3">
          Deleting this post is permanent.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isProcessing || isSubmitting}
          className="w-full"
        >
          {isDeleting ? 'Deleting...' : 'Delete Post'}
        </Button>
      </div>
    </div>
  );

  const canvas = (
    <div className="space-y-6">
      <QuickActionsBar
        onSeoClick={() => setSeoDrawerOpen(true)}
        className="mb-8"
      />
      <Input
        id="title"
        {...register('title')}
        placeholder="Edit post title..."
        className="w-full text-4xl font-bold font-serif border-none p-0 focus:ring-0 focus:outline-none placeholder:text-foreground/50"
      />
      {errors.title && (
        <p className="text-destructive text-sm">
          {errors.title.message as string}
        </p>
      )}
      <Input
        id="subtitle"
        {...register('subtitle')}
        placeholder="Add a subtitle..."
        className="w-full text-2xl font-medium italic font-serif text-foreground/70 border-none p-0 focus:ring-0 focus:outline-none placeholder:text-foreground/50"
      />
      {errors.subtitle && (
        <p className="text-destructive text-sm">
          {errors.subtitle.message as string}
        </p>
      )}
      <PostEditor
        initialContent={initialData.content || EMPTY_LEXICAL_STATE}
        placeholder="Continue writing..."
        onChange={(json) =>
          setValue('content', json, { shouldValidate: true, shouldDirty: true })
        }
      />
    </div>
  );

  return (
    <FormProvider {...form}>
      <SEOSettingsDrawer open={seoDrawerOpen} onOpenChange={setSeoDrawerOpen} />
      <EditorLayout settingsSidebar={formControlsNode} pageTitle={pageTitle}>
        {canvas}
      </EditorLayout>
    </FormProvider>
  );
}
