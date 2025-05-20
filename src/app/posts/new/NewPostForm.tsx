"use client";

import React, { useState, useEffect } from "react";
// Remove useRouter import if not available in next/navigation
// import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import EditorLayout from "@/components/editor/EditorLayout";
import { createPost, updatePost } from "@/app/actions/postActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import PostEditor from "@/components/editor/PostEditor";
import FileExplorer from "@/components/app/editor/sidebar/FileExplorer";
import PostMetadataBar from "@/components/app/editor/form-fields/PostMetadataBar";
import SEOSettingsDrawer from "@/components/editor/SEOSettingsDrawer";

const newPostSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    content: z.string().refine(
      (value) => {
        try {
          const json = JSON.parse(value);
          function extractText(node: unknown): string {
            if (!node || typeof node !== "object" || node === null) return "";
            const n = node as {
              type?: string;
              text?: string;
              children?: unknown[];
            };
            if (n.type === "text" && typeof n.text === "string") return n.text;
            if (Array.isArray(n.children))
              return n.children.map(extractText).join("");
            return "";
          }
          const text = extractText(json.root);
          return text.trim().length >= 10;
        } catch {
          return false;
        }
      },
      {
        message: "Content must have meaningful text (at least 10 characters).",
      }
    ),
    status: z.enum(["draft", "published", "scheduled"]),
    published_at: z.string().optional().nullable(),
    seo_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
  })
  .refine(
    (data) => {
      if (data.status === "scheduled" && !data.published_at) {
        return false;
      }
      return true;
    },
    {
      message: "Publish date is required for scheduled posts.",
      path: ["published_at"],
    }
  );

type NewPostFormValues = z.infer<typeof newPostSchema>;

export default function NewPersonalPostPage() {
  // Remove useRouter usage if not available
  // const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);

  // TODO: Fetch these from server (Supabase) for the sidebar
  const personalPosts: { id: string; title: string; status: string }[] = [];
  const collectives: {
    id: string;
    name: string;
    posts: { id: string; title: string; status: string }[];
  }[] = [];

  const EMPTY_LEXICAL_STATE = JSON.stringify({
    root: {
      children: [
        {
          type: "paragraph",
          children: [],
          direction: null,
          format: "",
          indent: 0,
          version: 1,
        },
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

  const performAutosave = React.useCallback(async () => {
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
      collectiveId: undefined,
    };

    try {
      let result;
      if (createdPostId) {
        result = await updatePost(createdPostId, payload);
      } else {
        if (
          data.title.trim().length < 1 ||
          data.content.replace(/<[^>]+>/g, "").trim().length < 10
        ) {
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
  }, [isDirty, currentStatus, getValues, createdPostId, reset]);

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
        collectiveId: undefined,
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
        // router.push(`/posts/${result.data.postId}`); // Uncomment and fix if router is available
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

  return (
    <FormProvider
      {...form}
      children={
        <EditorLayout
          sidebar={
            <FileExplorer
              personalPosts={personalPosts}
              collectives={collectives}
            />
          }
          metadataBar={
            <PostMetadataBar
              onPublish={handleSubmit(onSubmit)}
              isPublishing={isProcessing || isSubmitting}
              publishButtonText={primaryButtonText}
              onOpenSeoDrawer={() => setSeoDrawerOpen(true)}
            />
          }
          children={
            <>
              <div className="flex flex-col gap-4 h-full">
                <PostEditor
                  initialContentJSON={getValues("content")}
                  placeholder="Share your thoughts..."
                  onContentChange={(json) =>
                    setValue("content", json, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                {autosaveStatus && (
                  <Alert
                    variant={
                      autosaveStatus.includes("failed") ||
                      autosaveStatus.includes("Error")
                        ? "destructive"
                        : "default"
                    }
                    className="mt-4 text-xs"
                  >
                    <Info className="h-4 w-4" />
                    <AlertDescription>{autosaveStatus}</AlertDescription>
                  </Alert>
                )}
                {serverError && (
                  <p className="text-sm text-destructive mt-1">{serverError}</p>
                )}
              </div>
              <SEOSettingsDrawer
                open={seoDrawerOpen}
                onOpenChange={setSeoDrawerOpen}
              />
            </>
          }
        />
      }
    />
  );
}
