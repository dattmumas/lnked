"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorDisplay from "@/components/editor/TiptapEditor";
import EditorLayout from "@/components/editor/EditorLayout";
import { createPost, updatePost } from "@/app/actions/postActions";
import { useState, useTransition, useEffect, useCallback } from "react";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapToolbar from "@/components/editor/TiptapToolbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import PostFormFields from "@/components/app/editor/form-fields/PostFormFields";

const newPostSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    content: z
      .string()
      .refine(
        (value) =>
          value !== "<p></p>" &&
          value.replace(/<[^>]+>/g, "").trim().length >= 10,
        {
          message:
            "Content must have meaningful text (at least 10 characters excluding HTML tags).",
        }
      ),
    status: z.enum(["draft", "published", "scheduled"]),
    published_at: z.string().optional().nullable(),
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
  const router = useRouter();
  const [isProcessing, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const form = useForm<NewPostFormValues>({
    resolver: zodResolver(newPostSchema),
    defaultValues: {
      title: "",
      content: "<p></p>",
      status: "draft",
      published_at: "",
    },
    mode: "onBlur",
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

  const currentStatus = watch("status");
  const currentTitle = watch("title");
  const currentContent = watch("content");

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({ placeholder: "Share your thoughts..." }),
      Underline,
    ],
    content: getValues("content"),
    onUpdate: ({ editor: updatedEditor }) => {
      setValue("content", updatedEditor.getHTML(), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none",
      },
    },
  });

  const watchedFormContent = watch("content");
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      editor.getHTML() !== watchedFormContent
    ) {
      editor.commands.setContent(watchedFormContent || "<p></p>", false);
    }
  }, [watchedFormContent, editor]);

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
  }, [isDirty, currentStatus, getValues, createdPostId, reset, router]);

  useEffect(() => {
    const isDrafting = currentStatus === "draft";
    if (isDirty && isDrafting) {
      const handler = setTimeout(performAutosave, 5000);
      return () => clearTimeout(handler);
    }
  }, [currentTitle, currentContent, isDirty, currentStatus, performAutosave]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const onSubmit: SubmitHandler<NewPostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus("");

    if (data.content.replace(/<[^>]+>/g, "").trim().length < 10) {
      form.setError("content", {
        type: "manual",
        message: "Content must be at least 10 characters...",
      });
      return;
    }

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
        return;
      }
    }

    startTransition(async () => {
      let result;
      const payload = {
        title: data.title,
        content: data.content,
        is_public: is_public_for_action,
        published_at: published_at_for_action,
        collectiveId: undefined,
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
        editor?.commands.setContent("<p></p>");
        router.push(`/posts/${result.data.postId}`);
        router.refresh();
      }
    });
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
      <PostFormFields
        register={register}
        errors={errors}
        currentStatus={currentStatus}
        isSubmitting={isProcessing || isSubmitting}
        titlePlaceholder="My Awesome Post"
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
  );

  const mainContentNode = (
    <div className="bg-card shadow-sm rounded-lg flex flex-col h-full">
      <TiptapToolbar editor={editor} />
      <div className="p-1 flex-grow overflow-y-auto">
        <TiptapEditorDisplay editor={editor} className="h-full" />
      </div>
    </div>
  );

  return (
    <EditorLayout
      settingsSidebar={settingsSidebarNode}
      mainContent={mainContentNode}
      pageTitle="Create Personal Post"
      onPublish={handleSubmit(onSubmit)}
      isPublishing={isProcessing || isSubmitting}
      publishButtonText={primaryButtonText}
    />
  );
}
