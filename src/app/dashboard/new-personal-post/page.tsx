"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorDisplay from "@/components/editor/TiptapEditor";
import EditorLayout from "@/components/editor/EditorLayout";
import { createPost } from "@/app/actions/postActions"; // Shared server action
import { useState, useTransition, useEffect } from "react";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapToolbar from "@/components/editor/TiptapToolbar";

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
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = form;

  const currentStatus = watch("status");
  const watchedContent = watch("content"); // Watch only content for editor sync

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({ placeholder: "Share your thoughts..." }),
      Underline,
    ],
    content: form.getValues("content"),
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      setValue("content", html, { shouldValidate: true, shouldDirty: true });
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none",
      },
    },
  });

  // Sync editor with form state for content changes (e.g., if reset or setValue is called elsewhere)
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== watchedContent) {
      editor.commands.setContent(watchedContent || "<p></p>", false);
    }
  }, [watchedContent, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const onSubmit: SubmitHandler<NewPostFormValues> = async (data) => {
    setServerError(null);

    if (
      data.content === "<p></p>" ||
      data.content.replace(/<[^>]+>/g, "").trim().length < 10
    ) {
      form.setError("content", {
        type: "manual",
        message:
          "Content must have meaningful text (at least 10 characters excluding HTML tags).",
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
          message: "Publish date is required for scheduled posts.",
        });
        return;
      }
    }

    startTransition(async () => {
      const result = await createPost({
        title: data.title,
        content: data.content,
        is_public: is_public_for_action,
        published_at: published_at_for_action,
        collectiveId: undefined,
      });

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
      } else if (result.data) {
        reset();
        editor?.commands.setContent("<p></p>");
        router.push(`/posts/${result.data.postId}`);
        router.refresh();
      }
    });
  };

  const primaryButtonText =
    isPending || isSubmitting
      ? "Processing..."
      : currentStatus === "scheduled"
      ? "Schedule Post"
      : currentStatus === "draft"
      ? "Save Draft"
      : "Create & Publish Post";

  const settingsSidebarNode = (
    <div className="space-y-6">
      <div>
        <Label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Post Title
        </Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="My Awesome Post"
          disabled={isPending || isSubmitting}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="status" className="text-sm font-medium text-foreground">
          Post Status
        </Label>
        <select
          id="status"
          {...register("status")}
          disabled={isPending || isSubmitting}
          className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Publish Immediately</option>
          <option value="scheduled">Schedule for Later</option>
        </select>
        {errors.status && (
          <p className="text-sm text-destructive mt-1">
            {errors.status.message}
          </p>
        )}
      </div>

      {currentStatus === "scheduled" && (
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
            {...register("published_at")}
            disabled={isPending || isSubmitting}
            className={errors.published_at ? "border-destructive" : ""}
          />
          {errors.published_at && (
            <p className="text-sm text-destructive mt-1">
              {errors.published_at.message}
            </p>
          )}
        </div>
      )}
      {serverError && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
          {serverError.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
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
      isPublishing={isPending || isSubmitting}
      publishButtonText={primaryButtonText}
    />
  );
}
