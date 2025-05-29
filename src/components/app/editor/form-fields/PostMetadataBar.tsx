import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PostMetadataBarProps {
  onPublish: () => void;
  isPublishing: boolean;
  publishButtonText?: string;
  onOpenSeoDrawer: () => void;
}

export function PostMetadataBar({
  onPublish,
  isPublishing,
  publishButtonText = "Publish",
  onOpenSeoDrawer,
}: PostMetadataBarProps) {
  const {
    register,
    formState: { errors, isSubmitting },
    watch,
  } = useFormContext();
  const status = watch("status");

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between w-full">
      {/* Left: Title and status/date */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-grow">
        {/* Title input */}
        <div className="flex flex-col flex-grow min-w-0">
          <Label htmlFor="title" className="sr-only">
            Post Title
          </Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Title is Required"
            className="text-xl font-semibold px-3 py-2 border border-input rounded-md min-w-0"
            aria-invalid={Boolean(errors.title)}
            autoFocus
          />
        </div>
        {/* Status dropdown and date */}
        <div className="flex items-center gap-2 ml-0 md:ml-4">
          <Label htmlFor="status" className="sr-only">
            Status
          </Label>
          <select
            id="status"
            {...register("status")}
            className="border border-input rounded-md px-2 py-1 text-sm bg-background"
            disabled={isSubmitting || isPublishing}
          >
            <option value="draft">Draft</option>
            <option value="published">Publish Immediately</option>
            <option value="scheduled">Schedule for Later</option>
          </select>
          {status === "scheduled" && (
            <>
              <Label htmlFor="published_at" className="sr-only">
                Publish Date
              </Label>
              <Input
                id="published_at"
                type="datetime-local"
                {...register("published_at")}
                disabled={isSubmitting || isPublishing}
                className="border border-input rounded-md px-2 py-1 text-sm w-52"
              />
            </>
          )}
        </div>
        {errors.published_at && (
          <span className="text-xs text-destructive mt-1 ml-0 md:ml-4">
            {errors.published_at.message as string}
          </span>
        )}
      </div>
      {/* Right: SEO and Publish button */}
      <div className="flex items-center gap-2 self-start md:self-center mt-2 md:mt-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenSeoDrawer}
          className="mr-2"
        >
          SEO
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={isSubmitting || isPublishing}
          variant="default"
          size="sm"
        >
          {isPublishing ? "Publishing..." : publishButtonText}
        </Button>
      </div>
    </div>
  );
}

export default PostMetadataBar;
