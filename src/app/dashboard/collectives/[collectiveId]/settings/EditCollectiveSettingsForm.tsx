"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CollectiveSettingsClientSchema,
  CollectiveSettingsClientFormValues,
} from "@/lib/schemas/collectiveSettingsSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateCollectiveSettings,
  type RawCollectiveSettingsFormInput,
  getCollectiveStripeStatus,
} from "@/app/actions/collectiveActions";
import { Loader2 } from "lucide-react";
import { useState as useClientState } from "react";

interface EditCollectiveSettingsFormProps {
  collectiveId: string;
  currentSlug: string; // To know if slug changed for redirection
  defaultValues: CollectiveSettingsClientFormValues;
}

export default function EditCollectiveSettingsForm({
  collectiveId,
  currentSlug,
  defaultValues,
}: EditCollectiveSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<CollectiveSettingsClientFormValues>({
    resolver: zodResolver(CollectiveSettingsClientSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    setValue,
  } = form;

  // Auto-generate slug from name if user hasn't manually edited slug much
  const watchedName = watch("name");
  const watchedSlug = watch("slug");

  React.useEffect(() => {
    if (
      watchedName &&
      (watchedSlug === defaultValues.slug ||
        generateSlug(defaultValues.name) === watchedSlug)
    ) {
      setValue("slug", generateSlug(watchedName), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [
    watchedName,
    setValue,
    defaultValues.name,
    defaultValues.slug,
    watchedSlug,
  ]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 50);
  };

  const onSubmit: SubmitHandler<CollectiveSettingsClientFormValues> = async (
    data
  ) => {
    setError(null);
    setSuccessMessage(null);

    if (!isDirty) {
      setSuccessMessage("No changes to save.");
      return;
    }

    startTransition(async () => {
      // Transform tags_string to string[] for the server action
      const serverData = {
        ...data,
        tags_string: data.tags_string
          ? data.tags_string
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [],
      };
      const result = await updateCollectiveSettings(collectiveId, serverData);

      if (result.error) {
        setError(
          result.fieldErrors
            ? `${result.error} ${Object.values(result.fieldErrors)
                .flat()
                .join(", ")}`
            : result.error
        );
      } else {
        setSuccessMessage(
          result.message || "Collective settings updated successfully!"
        );
        const newSlug = result.updatedSlug || currentSlug;
        // Reset form with new default values which includes the potentially new slug
        reset(data);
        // If slug changed, redirect to the new settings page URL for consistency
        if (result.updatedSlug && result.updatedSlug !== currentSlug) {
          router.push(
            `/dashboard/collectives/${collectiveId}/settings?slug_changed_to=${newSlug}`
          );
        } else {
          router.refresh(); // Refresh data on current page if slug didn't change
        }
      }
    });
  };

  // Stripe Connect status state
  const [stripeStatus, setStripeStatus] = useClientState<any>(null);
  const [stripeLoading, setStripeLoading] = useClientState(false);
  const [stripeError, setStripeError] = useClientState<string | null>(null);

  useEffect(() => {
    setStripeLoading(true);
    getCollectiveStripeStatus(collectiveId)
      .then((status) => setStripeStatus(status))
      .catch((err) =>
        setStripeError(err?.message || "Failed to load Stripe status")
      )
      .finally(() => setStripeLoading(false));
  }, [collectiveId]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await fetch(
        `/api/collectives/${collectiveId}/stripe-onboard`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeError(data.error || "Failed to get Stripe onboarding link");
      }
    } catch (err: any) {
      setStripeError(err?.message || "Failed to connect to Stripe");
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
          <CardDescription>
            Modify the name, URL slug, description, and tags for your
            collective.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Collective Name</Label>
            <Input
              id="name"
              {...register("name")}
              disabled={isPending || isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (/collectives/your-slug)</Label>
            <Input
              id="slug"
              {...register("slug")}
              disabled={isPending || isSubmitting}
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="What is your collective about?"
              rows={4}
              disabled={isPending || isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags_string">Tags (comma-separated)</Label>
            <Input
              id="tags_string"
              {...register("tags_string")}
              placeholder="e.g., web development, ai, nextjs"
              disabled={isPending || isSubmitting}
            />
            {errors.tags_string && (
              <p className="text-sm text-destructive">
                {errors.tags_string.message}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-primary p-3 bg-primary/10 rounded-md">
              {successMessage}
            </p>
          )}
          {/* Stripe Connect Status Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Stripe Connect</CardTitle>
              <CardDescription>
                Connect your collective to Stripe to receive payments and
                payouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stripeLoading ? (
                <p>Loading Stripe status...</p>
              ) : stripeError ? (
                <p className="text-destructive">{stripeError}</p>
              ) : stripeStatus?.status === "active" ? (
                <p className="text-success">
                  Stripe Connected: Account is active and ready to receive
                  payouts.
                </p>
              ) : stripeStatus?.status === "pending" ? (
                <p className="text-warning">
                  Stripe Connected: Onboarding incomplete or pending
                  verification.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">
                    Stripe is not connected.
                  </p>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    type="button"
                  >
                    Connect Stripe
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || isSubmitting || !isDirty}
          >
            {isPending || isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
