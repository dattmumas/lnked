"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorDisplay from "@/components/editor/TiptapEditor";
import EditorLayout from "@/components/editor/EditorLayout";
import { createPost, updatePost } from "@/app/actions/postActions";
import { useState, useTransition, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapToolbar from "@/components/editor/TiptapToolbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import PostFormFields from "@/components/app/editor/form-fields/PostFormFields";

// Schema for new collective post, similar to new personal post
const newCollectivePostSchema = z
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

type NewCollectivePostFormValues = z.infer<typeof newCollectivePostSchema>;

export default function NewCollectivePostPage() {
  const router = useRouter();
  const params = useParams();
  const collectiveId = params.collectiveId as string;
  const [collectiveName, setCollectiveName] = useState<string>("Collective");
  const [isFetchingName, setIsFetchingName] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchCollectiveName = async () => {
      if (collectiveId) {
        setIsFetchingName(true);
        const { data, error } = await supabase
          .from("collectives")
          .select("name")
          .eq("id", collectiveId)
          .single();
        if (data) setCollectiveName(data.name);
        else console.error("Failed to fetch collective name for editor", error);
        setIsFetchingName(false);
      }
    };
    fetchCollectiveName();
  }, [collectiveId, supabase]);

  const form = useForm<NewCollectivePostFormValues>({
    resolver: zodResolver(newCollectivePostSchema),
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
      Placeholder.configure({
        placeholder: `Share your collective's next big story...`,
      }),
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

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== currentContent) {
      editor.commands.setContent(currentContent || "<p></p>", false);
    }
  }, [currentContent, editor]);

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
      collectiveId: collectiveId,
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
  }, [
    isDirty,
    currentStatus,
    getValues,
    createdPostId,
    collectiveId,
    reset,
    router,
  ]);

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

  const onSubmit: SubmitHandler<NewCollectivePostFormValues> = async (data) => {
    setServerError(null);
    setAutosaveStatus("");

    if (data.content.replace(/<[^>]+>/g, "").trim().length < 10) {
      form.setError("content", {
        type: "manual",
        message: "Content must have meaningful text...",
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
        collectiveId: collectiveId,
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
              form.setError(field as keyof NewCollectivePostFormValues, {
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
        router.push(
          `/collectives/${result.data.collectiveSlug}/${result.data.postId}`
        );
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
        titlePlaceholder={`New post in ${collectiveName}`}
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
        <p className="text-sm text-destructive mt-1">
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

  if (isFetchingName) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading editor...
      </div>
    );
  }

  return (
    <EditorLayout
      settingsSidebar={settingsSidebarNode}
      mainContent={mainContentNode}
      pageTitle={`New Post in ${collectiveName}`}
      onPublish={handleSubmit(onSubmit)}
      isPublishing={isProcessing || isSubmitting}
      publishButtonText={primaryButtonText}
    />
  );
}
