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

  const getStatusConfig = () => {
    switch (currentStatus) {
      case 'published':
        return {
          icon: <Eye className="w-4 h-4" />,
          text: 'Publish Now',
          description: 'Make your post live immediately',
          variant: 'default' as const,
        };
      case 'scheduled':
        return {
          icon: <Calendar className="w-4 h-4" />,
          text: 'Schedule Post',
          description: 'Publish at a specific time',
          variant: 'secondary' as const,
        };
      default:
        return {
          icon: <Save className="w-4 h-4" />,
          text: createdPostId ? 'Update Draft' : 'Save Draft',
          description: 'Save as private draft',
          variant: 'outline' as const,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const settingsSidebar = (
    <div className="space-y-6">
      {/* Title Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Post Title
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="Enter post title..."
              className="text-sm"
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message as string}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Publish Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <RadioGroup
              value={currentStatus}
              onValueChange={(value: 'draft' | 'published' | 'scheduled') =>
                setValue('status', value)
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="draft" />
                <Label htmlFor="draft" className="text-sm">
                  Draft
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="published" id="published" />
                <Label htmlFor="published" className="text-sm">
                  Published
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="text-sm">
                  Scheduled
                </Label>
              </div>
            </RadioGroup>
          </div>

          {currentStatus === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="published_at" className="text-sm font-medium">
                Publish Date
              </Label>
              <Input
                id="published_at"
                type="datetime-local"
                {...form.register('published_at')}
                className="text-sm"
              />
              {errors.published_at && (
                <p className="text-xs text-destructive">
                  {errors.published_at.message as string}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setSeoDrawerOpen(true)}
        className="w-full justify-start"
        size="sm"
      >
        <FileText className="w-4 h-4 mr-2" />
        SEO Settings
      </Button>

      {/* Publish Button */}
      <Button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={isProcessing || isSubmitting}
        className="w-full"
        variant={statusConfig.variant}
        size="lg"
      >
        {isProcessing || isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {statusConfig.icon}
            {statusConfig.text}
          </div>
        )}
      </Button>

      {/* Status Messages */}
      {autosaveStatus && (
        <Alert
          variant={
            autosaveStatus.includes('failed') ||
            autosaveStatus.includes('error')
              ? 'destructive'
              : 'default'
          }
          className="text-xs"
        >
          <Info className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {autosaveStatus}
          </AlertDescription>
        </Alert>
      )}

      {serverError && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription className="text-xs">{serverError}</AlertDescription>
        </Alert>
      )}

      {collective && (
        <div className="pt-4 border-t">
          <Badge variant="secondary" className="text-xs">
            Publishing to {collective.name}
          </Badge>
        </div>
      )}
    </div>
  );

  return (
    <FormProvider {...form}>
      <SEOSettingsDrawer open={seoDrawerOpen} onOpenChange={setSeoDrawerOpen} />
      <EditorLayout settingsSidebar={settingsSidebar} pageTitle={pageTitle}>
        {editorComponent}
      </EditorLayout>
    </FormProvider>
  );
}
