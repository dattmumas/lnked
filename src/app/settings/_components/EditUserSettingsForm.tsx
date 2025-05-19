"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { updateUserProfile } from "@/app/actions/userActions";

const UserSettingsSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().max(300).optional().nullable(),
  tags_string: z.string().optional().nullable(),
});

export default function EditUserSettingsForm({
  defaultValues,
}: {
  defaultValues: any;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(UserSettingsSchema),
    defaultValues,
  });

  const onSubmit = async (data: any) => {
    setFormError(null);
    setFormSuccess(null);
    const result = await updateUserProfile(data);
    if (!result.success) {
      setFormError(
        result.error ||
          (result.fieldErrors
            ? Object.values(result.fieldErrors).flat().join(", ")
            : "Unknown error.")
      );
    } else {
      setFormSuccess(result.message || "Settings updated successfully.");
      reset(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="full_name" className="block font-medium mb-1">
          Name
        </label>
        <Input id="full_name" {...register("full_name")} autoComplete="name" />
        {errors.full_name && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.full_name === "object" &&
                "message" in errors.full_name
                ? errors.full_name.message
                : errors.full_name
            )}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="bio" className="block font-medium mb-1">
          Bio
        </label>
        <Textarea id="bio" {...register("bio")} rows={3} />
        {errors.bio && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.bio === "object" && "message" in errors.bio
                ? errors.bio.message
                : errors.bio
            )}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="tags_string" className="block font-medium mb-1">
          Tags (comma separated)
        </label>
        <Input id="tags_string" {...register("tags_string")} />
        {errors.tags_string && (
          <p className="text-destructive text-sm mt-1">
            {String(
              typeof errors.tags_string === "object" &&
                "message" in errors.tags_string
                ? errors.tags_string.message
                : errors.tags_string
            )}
          </p>
        )}
      </div>
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {formSuccess && (
        <Alert variant="default">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{formSuccess}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
