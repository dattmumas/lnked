"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorDisplay from "@/components/editor/TiptapEditor";
import EditorLayout from "@/components/editor/EditorLayout";
import { createPost } from "@/app/actions/postActions";
import { useState, useTransition, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapToolbar from "@/components/editor/TiptapToolbar";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(15, "Content (HTML) must be at least 15 characters"),
  is_public: z.boolean(),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function NewCollectivePostPage() {
  const router = useRouter();
  const params = useParams();
  const collectiveId = params.collectiveId as string;
  const [collectiveName, setCollectiveName] = useState<string>("Collective");
  const [isFetchingName, setIsFetchingName] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "<p></p>",
      is_public: true,
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = form;

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({
        placeholder: `Share your collective's next big story...`,
      }),
      Underline,
    ],
    content: form.getValues("content"),
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

  const onSubmit: SubmitHandler<PostFormValues> = async (data) => {
    setServerError(null);
    if (data.content === "<p></p>" || data.content.length < 15) {
      form.setError("content", {
        type: "manual",
        message: "Content is too short or appears empty.",
      });
      return;
    }

    startTransition(async () => {
      const formDataForAction = { ...data, collectiveId };
      const result = await createPost(formDataForAction);
      if (result.error) {
        let errorMsg = result.error;
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              form.setError(field as keyof PostFormValues, {
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
        router.push(
          `/collectives/${result.data.collectiveSlug}/${result.data.postId}`
        );
        router.refresh();
      }
    });
  };

  // Form elements for the sidebar
  const settingsSidebarNode = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          placeholder={`New post for ${collectiveName}`}
          disabled={isPending || isSubmitting}
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
                disabled={isPending || isSubmitting}
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
    </form>
  );

  // Editor and its toolbar for the main content area
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
      isPublishing={isPending || isSubmitting}
    />
  );
}
