"use client";
import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XCircle } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SEOSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SEOSettingsDrawer({
  open,
  onOpenChange,
}: SEOSettingsDrawerProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className="fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border p-6 z-50 focus:outline-none"
          aria-label="SEO Settings"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">SEO Settings</h2>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 rounded hover:bg-muted focus:outline-none"
                aria-label="Close"
              >
                <XCircle className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          {/* SEO Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="seo_title" className="text-sm font-medium">
                SEO Title
              </Label>
              <Input
                id="seo_title"
                {...register("seo_title")}
                maxLength={60}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended 60 characters or less.
              </p>
              {errors.seo_title && (
                <span className="text-xs text-destructive mt-1 block">
                  {errors.seo_title.message as string}
                </span>
              )}
            </div>
            <div>
              <Label htmlFor="meta_description" className="text-sm font-medium">
                Meta Description
              </Label>
              <Textarea
                id="meta_description"
                {...register("meta_description")}
                rows={3}
                maxLength={160}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended 160 characters or less.
              </p>
              {errors.meta_description && (
                <span className="text-xs text-destructive mt-1 block">
                  {errors.meta_description.message as string}
                </span>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default SEOSettingsDrawer;
