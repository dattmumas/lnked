'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PostFormSchema, type PostFormValues } from '@/lib/schemas/postSchemas';
import { useRouter } from 'next/navigation';
import EditorLayout from '@/components/editor/EditorLayout';
import PostEditor from '@/components/editor/PostEditor';
import SEOSettingsDrawer from '@/components/editor/SEOSettingsDrawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Info, Calendar, Eye, FileText, Save } from 'lucide-react';
import { createPost, updatePost } from '@/app/actions/postActions';
import { EMPTY_LEXICAL_STATE } from '@/lib/editorConstants';
import { PublishSettingsCard } from '@/components/editor/PublishSettingsCard';
import { QuickActionsBar } from '@/components/editor/QuickActionsBar';

type NewPostFormValues = PostFormValues;

interface NewPostFormProps {
  collective?: { id: string; name: string; owner_id: string } | null;
  pageTitle: string;
}

export default function NewPostForm({
  collective,
  pageTitle,
}: NewPostFormProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('');
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);

  const form = useForm<NewPostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      content: EMPTY_LEXICAL_STATE,
      status: 'draft',
      published_at: '',
      seo_title: '',
      meta_description: '',
    },
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    getValues,
    setValue,
  } = form;

  const currentStatus = watch('status');
  const currentTitle = watch('title');
  const currentContent = watch('content');

  // Memoize the onChange callback to prevent PostEditor re-renders
  const handleEditorChange = useCallback(
    (json: string) => {
      setValue('content', json, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  // Memoize the PostEditor component to prevent unnecessary re-renders
  // Only pass initialContent once at component creation
  const editorComponent = useMemo(
    () => (
      <PostEditor
        initialContent={EMPTY_LEXICAL_STATE}
        placeholder="Start writing..."
        onChange={handleEditorChange}
      />
    ),
    [handleEditorChange],
  );

  const performAutosave = useCallback(async () => {
    if (!isDirty && !createdPostId) return;
    if (currentStatus !== 'draft' && createdPostId) return;

    setAutosaveStatus('Saving draft...');
    const data = getValues();
    const payload = {
      title: data.title,
      subtitle: data.subtitle,
      content: data.content,
      is_public: false,
      published_at:
        data.status === 'scheduled' && data.published_at
          ? new Date(data.published_at).toISOString()
          : null,
      collectiveId: collective?.id,
    };

    try {
      let result;
      if (createdPostId) {
        console.log('Autosave: Updating existing post', { createdPostId });
        result = await updatePost(createdPostId, {
          ...payload,
        });
      } else {
        if (
          data.title.trim().length < 1 ||
          data.content.replace(/<[^>]+>/g, '').trim().length < 10
        ) {
          setAutosaveStatus('Add a title and content to save draft');
          return;
        }
        console.log('Autosave: Creating new post');
        result = await createPost({
          ...payload,
        });
        if (result.data?.postId) {
          console.log('Autosave: Post created with ID', result.data.postId);
          setCreatedPostId(result.data.postId);
        }
      }
      if (result.error) {
        console.error('Autosave error:', result.error);
        setAutosaveStatus(`Save failed: ${result.error.substring(0, 50)}...`);
      } else {
        setAutosaveStatus('Draft saved');
        reset(data);
      }
    } catch (error) {
      setAutosaveStatus('Save error');
      console.error('Autosave exception:', error);
    }
  }, [isDirty, currentStatus, getValues, createdPostId, reset, collective]);

  useEffect(() => {
    const isDrafting = currentStatus === 'draft';
    if (isDirty && isDrafting) {
      const handler = setTimeout(performAutosave, 3000);
      return () => clearTimeout(handler);
    }
  }, [currentTitle, currentContent, isDirty, currentStatus, performAutosave]);

  const onSubmit: SubmitHandler<NewPostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus('');
    setIsProcessing(true);

    let is_public_for_action = false;
    let published_at_for_action: string | null = null;

    if (data.status === 'published') {
      is_public_for_action = true;
      published_at_for_action = new Date().toISOString();
    } else if (data.status === 'scheduled') {
      is_public_for_action = true;
      if (data.published_at && data.published_at.trim() !== '') {
        published_at_for_action = new Date(data.published_at).toISOString();
      } else {
        form.setError('published_at', {
          type: 'manual',
          message: 'Publish date required for scheduled posts.',
        });
        setIsProcessing(false);
        return;
      }
    }

    try {
      let result;
      const payload = {
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        is_public: is_public_for_action,
        published_at: published_at_for_action,
        collectiveId: collective?.id,
        seo_title: data.seo_title,
        meta_description: data.meta_description,
      };

      if (createdPostId) {
        console.log('Publishing: Updating existing post', { createdPostId });
        result = await updatePost(createdPostId, {
          ...payload,
        });
      } else {
        console.log('Publishing: Creating new post');
        result = await createPost({
          ...payload,
        });
      }

      if (result.error) {
        let errorMsg = result.error;
        if (result.fieldErrors) {
          const fieldErrors = result.fieldErrors as Record<
            keyof NewPostFormValues,
            string[]
          >;
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              form.setError(field as string, {
                type: 'server',
                message: messages.join(', '),
              });
              errorMsg += `\n${field}: ${messages.join(', ')}`;
            }
          });
        }
        setServerError(errorMsg);
      } else if (result.data?.postId) {
        const postId = result.data.postId;
        reset();
        router.push(`/posts/${postId}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const settingsSidebar = (
    <div className="space-y-6">
      {/* Publish Settings Card */}
      <PublishSettingsCard
        status={currentStatus}
        onStatusChange={(value) => setValue('status', value)}
        publishedAt={watch('published_at')}
        onPublishedAtChange={(value) => setValue('published_at', value)}
        onPublish={handleSubmit(onSubmit)}
        isPublishing={isProcessing || isSubmitting}
        autosaveStatus={autosaveStatus}
        errors={{
          published_at: errors.published_at
            ? { message: errors.published_at.message as string }
            : undefined,
        }}
        collectiveName={collective?.name}
        postId={createdPostId}
      />

      {/* Server Error */}
      {serverError && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription className="text-xs">{serverError}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <FormProvider {...form}>
      <SEOSettingsDrawer open={seoDrawerOpen} onOpenChange={setSeoDrawerOpen} />
      <EditorLayout settingsSidebar={settingsSidebar} pageTitle={pageTitle}>
        <div className="space-y-6">
          {/* Quick Actions Bar */}
          <QuickActionsBar
            onSeoClick={() => setSeoDrawerOpen(true)}
            className="mb-8"
          />

          <Input
            id="title"
            {...form.register('title')}
            placeholder="Enter post title..."
            className="w-full h-16 text-4xl font-bold font-serif border-none p-1 focus:ring-0 focus:outline-none placeholder:text-muted-foreground"
          />
          {errors.title && (
            <p className="text-destructive text-sm">
              {errors.title.message as string}
            </p>
          )}
          <Input
            id="subtitle"
            {...form.register('subtitle')}
            placeholder="Add a subtitle..."
            className="w-full text-2xl font-medium italic font-serif text-muted-foreground border-none p-1 focus:ring-0 focus:outline-none "
          />
          {errors.subtitle && (
            <p className="text-destructive text-sm">
              {errors.subtitle.message as string}
            </p>
          )}
          {editorComponent}
        </div>
      </EditorLayout>
    </FormProvider>
  );
}
