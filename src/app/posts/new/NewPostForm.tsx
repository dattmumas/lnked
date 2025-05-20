"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import EditorLayout from "@/components/editor/EditorLayout";
import PostEditor from "@/components/editor/PostEditor";
import PostFormFields, { postFormFieldsSchema } from "@/components/app/editor/form-fields/PostFormFields";
import SEOSettingsDrawer from "@/components/editor/SEOSettingsDrawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { createPost, updatePost } from "@/app/actions/postActions";

const newPostSchema = postFormFieldsSchema.extend({
  content: z.string().refine(
    (value) => {
      try {
        const json = JSON.parse(value);
        function extractText(node: unknown): string {
          if (!node || typeof node !== "object" || node === null) return "";
          const n = node as { type?: string; text?: string; children?: unknown[] };
          if (n.type === "text" && typeof n.text === "string") return n.text;
          if (Array.isArray(n.children)) return n.children.map(extractText).join("");
          return "";
        }
        const text = extractText(json.root);
        return text.trim().length >= 10;
      } catch {
        return false;
      }
    },
    { message: "Content must have meaningful text (at least 10 characters)." }
  ),
  seo_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
});

type NewPostFormValues = z.infer<typeof newPostSchema>;

interface NewPostFormProps {
  collective?: { id: string; name: string; owner_id: string } | null;
}

export default function NewPostForm({ collective }: NewPostFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);

  const EMPTY_LEXICAL_STATE = JSON.stringify({
    root: {
      children: [
        { type: "paragraph", children: [], direction: null, format: "", indent: 0, version: 1 },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

  const form = useForm<NewPostFormValues>({
    resolver: zodResolver(newPostSchema),
    defaultValues: {
      title: "",
      content: EMPTY_LEXICAL_STATE,
      status: "draft",
      published_at: "",
      seo_title: "",
      meta_description: "",
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    getValues,
    setValue,
  } = form;

  const currentStatus = watch("status");
  const currentTitle = watch("title");
  const currentContent = watch("content");

  const performAutosave = useCallback(async () => {
    if (!isDirty && !createdPostId) return;
    if (currentStatus !== "draft" && createdPostId) return;

    setAutosaveStatus("Saving draft...");
    const data = getValues();
    const payload = {
      title: data.title,
      content: data.content,
      is_public: false,
      published_at:
        data.status === "scheduled" && data.published_at
          ? new Date(data.published_at).toISOString()
          : null,
      collectiveId: collective?.id,
    };

    try {
      let result;
      if (createdPostId) {
        result = await updatePost(createdPostId, payload);
      } else {
        if (data.title.trim().length < 1 || data.content.replace(/<[^>]+>/g, "").trim().length < 10) {
          setAutosaveStatus("Please add title & content to save draft.");
          return;
        }
        result = await createPost(payload);
        if (result.data?.postId) {
          setCreatedPostId(result.data.postId);
        }
      }
      if (result.error) {
        setAutosaveStatus(`Autosave failed: ${result.error.substring(0, 100)}`);
      } else {
        setAutosaveStatus("Draft saved.");
        reset(data);
      }
    } catch (error) {
      setAutosaveStatus("Autosave error.");
      console.error("Autosave exception:", error);
    }
  }, [isDirty, currentStatus, getValues, createdPostId, reset, collective]);

  useEffect(() => {
    const isDrafting = currentStatus === "draft";
    if (isDirty && isDrafting) {
      const handler = setTimeout(performAutosave, 5000);
      return () => clearTimeout(handler);
    }
  }, [currentTitle, currentContent, isDirty, currentStatus, performAutosave]);

  const onSubmit: SubmitHandler<NewPostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus("");
    setIsProcessing(true);

    let is_public_for_action = false;
    let published_at_for_action: string | null = null;

    if (data.status === "published") {
      is_public_for_action = true;
      published_at_for_action = new Date().toISOString();
    } else if (data.status === "scheduled") {
      is_public_for_action = true;
      if (data.published_at && data.published_at.trim() !== "") {
        published_at_for_action = new Date(data.published_at).toISOString();
      } else {
        form.setError("published_at", {
          type: "manual",
          message: "Publish date required for scheduled posts.",
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
        result = await updatePost(createdPostId, payload);
      } else {
        result = await createPost(payload);
      }

      if (result.error) {
        let errorMsg = result.error;
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              form.setError(field as keyof NewPostFormValues, {
                type: "server",
                message: messages.join(", "),
              });
              errorMsg += `\n${field}: ${messages.join(", ")}`;
            }
          });
        }
        setServerError(errorMsg);
      } else if (result.data?.postId) {
        reset();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const primaryButtonText =
    isProcessing || isSubmitting
      ? "Processing..."
      : currentStatus === "scheduled"
      ? "Schedule Post"
      : currentStatus === "draft"
      ? createdPostId
        ? "Save Draft"
        : "Create Draft"
      : "Publish Post";

  const settingsSidebarNode = (
    <div className="space-y-6">
      {collective && (
        <div className="p-2 rounded bg-primary/10 text-primary text-sm font-semibold">
          Collective: {collective.name}
        </div>
      )}
      <PostFormFields
        register={register}
        errors={errors}
        currentStatus={currentStatus}
        isSubmitting={isProcessing || isSubmitting}
        titlePlaceholder={collective ? `New post in ${collective.name}` : "Post Title"}
      />
      {autosaveStatus && (
        <Alert
          variant={autosaveStatus.includes("failed") || autosaveStatus.includes("Error") ? "destructive" : "default"}
          className="mt-4 text-xs"
        >
          <Info className="h-4 w-4" />
          <AlertDescription>{autosaveStatus}</AlertDescription>
        </Alert>
      )}
      {serverError && <p className="text-sm text-destructive mt-1">{serverError}</p>}
      <SEOSettingsDrawer open={seoDrawerOpen} onOpenChange={setSeoDrawerOpen} />
    </div>
  );

  const mainContentNode = (
    <PostEditor
      initialContentJSON={getValues("content")}
      placeholder={collective ? `Share something with ${collective.name}...` : "Share your thoughts..."}
      onContentChange={(json) =>
        setValue("content", json, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
    />
  );

  return (
    <FormProvider {...form}>
      <EditorLayout
        settingsSidebar={settingsSidebarNode}
        mainContent={mainContentNode}
        pageTitle={collective ? `New Post in ${collective.name}` : "New Personal Post"}
        onPublish={handleSubmit(onSubmit)}
        isPublishing={isProcessing || isSubmitting}
        publishButtonText={primaryButtonText}
      />
    </FormProvider>
  );
}
