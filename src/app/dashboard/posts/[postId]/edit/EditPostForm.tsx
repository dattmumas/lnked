"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorDisplay from "@/components/editor/TiptapEditor";
import EditorLayout from "@/components/editor/EditorLayout";
import { updatePost, deletePost } from "@/app/actions/postActions";
import { useState, useTransition, useEffect } from "react";
import type { Tables } from "@/lib/database.types"; // For PostDataType

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapToolbar from "@/components/editor/TiptapToolbar";
import { Button } from "@/components/ui/button";

const editPostSchema = z.object({
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
  is_public: z.boolean(),
});

type EditPostFormValues = z.infer<typeof editPostSchema>;

export interface PostDataType extends Tables<"posts"> {
  collective_name?: string | null;
}

interface EditPostFormProps {
  postId: string;
  initialData: PostDataType;
  pageTitleInfo: string;
}

export default function EditPostForm({
  postId,
  initialData,
  pageTitleInfo,
}: EditPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: initialData.title || "",
      content: initialData.content || "<p></p>",
      is_public: initialData.is_public === null ? true : initialData.is_public, // Handle null for boolean if schema allows
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
  } = form;

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({ placeholder: "Continue writing..." }),
      Underline,
    ],
    content: initialData.content || "<p></p>",
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

  useEffect(() => {
    // When initialData changes (e.g. parent re-fetches), reset form and editor
    reset({
      title: initialData.title || "",
      content: initialData.content || "<p></p>",
      is_public: initialData.is_public === null ? true : initialData.is_public,
    });
    editor?.commands.setContent(initialData.content || "<p></p>", false);
  }, [initialData, reset, editor]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        name === "content" &&
        editor &&
        !editor.isDestroyed &&
        editor.getHTML() !== value.content
      ) {
        editor.commands.setContent(value.content || "<p></p>", false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const onSubmit: SubmitHandler<EditPostFormValues> = async (data) => {
    setServerError(null);
    if (!isDirty) {
      setServerError("No changes to save.");
      return;
    }
    startTransition(async () => {
      const result = await updatePost(postId, data);
      if (result.error) {
        setServerError(result.error);
      } else if (result.data) {
        reset(data); // Reset form to new values to clear dirty state
        alert("Post updated successfully!");
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    )
      return;
    setIsDeleting(true);
    setServerError(null);
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        setServerError(result.error);
        setIsDeleting(false);
      } else {
        alert("Post deleted successfully.");
        router.push(result.redirectPath || "/dashboard");
        router.refresh();
      }
    });
  };

  const formControlsNode = (
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
          disabled={isPending || isSubmitting || isDeleting}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-medium text-foreground">
          Visibility
        </Label>
        <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
          <Controller
            name="is_public"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="is_public"
                checked={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isPending || isSubmitting || isDeleting}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            )}
          />
          <Label
            htmlFor="is_public"
            className="text-sm font-normal text-muted-foreground"
          >
            Make this post publicly visible?
          </Label>
        </div>
        {errors.is_public && (
          <p className="text-sm text-destructive mt-1">
            {errors.is_public.message}
          </p>
        )}
      </div>
      {serverError && isDirty && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
          {serverError.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}
      <div className="pt-6 border-t">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Deleting this post is permanent.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isPending || isSubmitting}
          className="w-full"
        >
          {isDeleting ? "Deleting..." : "Delete Post"}
        </Button>
      </div>
    </div>
  );

  const mainContentNode = (
    <div className="bg-card shadow-sm rounded-lg flex flex-col h-full">
      <TiptapToolbar editor={editor} />
      <div className="p-4 flex-grow overflow-y-auto">
        <TiptapEditorDisplay editor={editor} className="h-full" />
      </div>
    </div>
  );

  return (
    <EditorLayout
      settingsSidebar={formControlsNode}
      mainContent={mainContentNode}
      pageTitle={pageTitleInfo}
      onPublish={handleSubmit(onSubmit)}
      isPublishing={isPending || isSubmitting}
    />
  );
}
