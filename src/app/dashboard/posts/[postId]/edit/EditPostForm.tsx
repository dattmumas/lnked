"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import EditorLayout from "@/components/editor/EditorLayout";
import {
  updatePost,
  deletePost,
  UpdatePostClientValues,
} from "@/app/actions/postActions";
import { useState, useTransition, useEffect, useCallback } from "react";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import PostFormFields from "@/components/app/editor/form-fields/PostFormFields";
import PostEditor from "@/components/editor/PostEditor";

const editPostSchema = z
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

type EditPostFormValues = z.infer<typeof editPostSchema>;

export interface PostDataType extends Tables<"posts"> {
  collective_name?: string | null;
}

interface EditPostFormProps {
  postId: string;
  initialData: PostDataType;
  pageTitleInfo: string;
}

function getInitialStatus(post: PostDataType): EditPostFormValues["status"] {
  if (post.published_at && new Date(post.published_at) > new Date()) {
    return "scheduled";
  }
  if (post.is_public) {
    return "published";
  }
  return "draft";
}

const formatDateForInput = (date: Date | string | null): string => {
  if (!date) return "";
  const d = new Date(date);
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

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

export default function EditPostForm({
  postId,
  initialData,
  pageTitleInfo,
}: EditPostFormProps) {
  const router = useRouter();
  const [isProcessing, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");

  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: initialData.title || "",
      content: initialData.content || EMPTY_LEXICAL_STATE,
      status: getInitialStatus(initialData),
      published_at: initialData.published_at
        ? formatDateForInput(initialData.published_at)
        : "",
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

  useEffect(() => {
    reset({
      title: initialData.title || "",
      content: initialData.content || EMPTY_LEXICAL_STATE,
      status: getInitialStatus(initialData),
      published_at: initialData.published_at
        ? formatDateForInput(initialData.published_at)
        : "",
    });
  }, [initialData, reset, EMPTY_LEXICAL_STATE]);

  const performAutosave = useCallback(async () => {
    if (!isDirty) return;
    if (currentStatus !== "draft") return; // Only autosave actual drafts

    setAutosaveStatus("Saving draft...");
    const dataToSave = getValues();
    const autosavePayload: UpdatePostClientValues = {
      title: dataToSave.title,
      content: dataToSave.content,
      is_public: false,
      published_at:
        dataToSave.status === "scheduled" && dataToSave.published_at
          ? new Date(dataToSave.published_at).toISOString()
          : null,
    };
    const result = await updatePost(postId, autosavePayload);
    if (result.error) {
      setAutosaveStatus(`Autosave failed: ${result.error.substring(0, 100)}`);
    } else {
      setAutosaveStatus("Draft saved.");
      reset(dataToSave); // Reset dirty state with current values
    }
  }, [isDirty, currentStatus, getValues, postId, reset]);

  useEffect(() => {
    const isDrafting = currentStatus === "draft";
    if (isDirty && isDrafting) {
      const handler = setTimeout(performAutosave, 5000);
      return () => clearTimeout(handler);
    }
  }, [currentTitle, currentContent, isDirty, currentStatus, performAutosave]);

  const onSubmit: SubmitHandler<EditPostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus("");

    const payloadForUpdate: UpdatePostClientValues = {
      title: data.title,
      content: data.content,
    };

    if (data.status === "published") {
      payloadForUpdate.is_public = true;
      payloadForUpdate.published_at = new Date().toISOString();
    } else if (data.status === "scheduled") {
      payloadForUpdate.is_public = true;
      if (data.published_at && data.published_at.trim() !== "") {
        payloadForUpdate.published_at = new Date(
          data.published_at
        ).toISOString();
      } else {
        form.setError("published_at", {
          type: "manual",
          message: "Publish date is required for scheduled posts.",
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
    setAutosaveStatus("");
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

  const primaryButtonText =
    isProcessing || isSubmitting
      ? "Processing..."
      : currentStatus === "scheduled"
      ? "Schedule Post"
      : currentStatus === "draft"
      ? "Save Draft"
      : "Update Post";

  const formControlsNode = (
    <div className="space-y-6">
      <PostFormFields
        register={register}
        errors={errors}
        currentStatus={currentStatus}
        isSubmitting={isProcessing || isSubmitting || isDeleting}
        titlePlaceholder="Edit Post Title"
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
          disabled={isDeleting || isProcessing || isSubmitting}
          className="w-full"
        >
          {isDeleting ? "Deleting..." : "Delete Post"}
        </Button>
      </div>
    </div>
  );

  const mainContentNode = (
    <PostEditor
      initialContentJSON={getValues("content")}
      placeholder="Continue writing..."
      onContentChange={(json) =>
        setValue("content", json, { shouldValidate: true, shouldDirty: true })
      }
    />
  );

  return (
    <EditorLayout
      settingsSidebar={formControlsNode}
      mainContent={mainContentNode}
      pageTitle={pageTitleInfo}
      onPublish={handleSubmit(onSubmit)}
      isPublishing={isProcessing || isSubmitting}
      publishButtonText={primaryButtonText}
    />
  );
}
