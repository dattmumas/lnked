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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateCollectiveSettings,
  getCollectiveStripeStatus,
  deleteCollective,
  transferCollectiveOwnership,
} from "@/app/actions/collectiveActions";
import { Loader2 } from "lucide-react";
import { useState as useClientState } from "react";
import type { Database } from "@/lib/database.types";
import {
  createPriceTier,
  deactivatePriceTier,
} from "@/app/actions/subscriptionActions";

interface SubscriptionTier {
  id: string;
  unit_amount: number | null;
  currency: string | null;
  interval: Database["public"]["Enums"]["price_interval"] | null;
  description: string | null;
  active: boolean | null;
}

interface EditCollectiveSettingsFormProps {
  collectiveId: string;
  currentSlug: string;
  defaultValues: CollectiveSettingsClientFormValues;
  eligibleMembers: { id: string; full_name: string | null }[];
  tiers: SubscriptionTier[];
}

export default function EditCollectiveSettingsForm({
  collectiveId,
  currentSlug,
  defaultValues,
  eligibleMembers,
  tiers,
}: EditCollectiveSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tierError, setTierError] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState<string>("");
  const [newInterval, setNewInterval] = useState<"month" | "year">("month");
  const [newName, setNewName] = useState<string>("");

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
  const [stripeStatus, setStripeStatus] = useClientState<Record<string, unknown> | null>(null);
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
  }, [collectiveId, setStripeLoading, setStripeStatus, setStripeError]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to Stripe";
      setStripeError(message);
    } finally {
      setStripeLoading(false);
    }
  };

  // Danger Zone: Delete Collective
  const [deleteLoading, setDeleteLoading] = useClientState(false);
  const [deleteError, setDeleteError] = useClientState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useClientState(false);

  const handleDeleteCollective = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    const result = await deleteCollective({ collectiveId });
    setDeleteLoading(false);
    if (result.success) {
      setDeleteSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/collectives");
      }, 2000);
    } else {
      setDeleteError(result.error || "Failed to delete collective.");
    }
  };

  // Transfer Ownership
  const [transferTo, setTransferTo] = useClientState<string>("");
  const [transferLoading, setTransferLoading] = useClientState(false);
  const [transferError, setTransferError] = useClientState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useClientState(false);
  const handleTransferOwnership = async () => {
    setTransferError(null);
    setTransferLoading(true);
    const result = await transferCollectiveOwnership({
      collectiveId,
      newOwnerId: transferTo,
    });
    setTransferLoading(false);
    if (result.success) {
      setTransferSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } else {
      setTransferError(result.error || "Failed to transfer ownership.");
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setTierError(null);
    const amount = parseInt(newAmount, 10);
    if (!amount) {
      setTierError("Enter a valid amount in cents");
      return;
    }
    startTransition(async () => {
      const result = await createPriceTier({
        collectiveId,
        amount,
        interval: newInterval,
        tierName: newName || undefined,
      });
      if (result.success) {
        router.refresh();
      } else {
        setTierError(result.error || "Failed to add tier");
      }
    });
  };

  const handleDeactivateTier = async (priceId: string) => {
    startTransition(async () => {
      const result = await deactivatePriceTier({
        collectiveId,
        priceId,
      });
      if (result.success) {
        router.refresh();
      } else {
        setTierError(result.error || "Failed to remove tier");
      }
    });
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
            <p className="text-sm text-accent p-3 bg-accent/10 rounded-md">
              {successMessage}
            </p>
          )}
          {/* Subscription Tiers */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Subscription Tiers</CardTitle>
              <CardDescription>
                Define pricing options for supporters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stripeStatus?.status !== "active" ? (
                <p className="text-muted-foreground">
                  Connect Stripe to manage tiers.
                </p>
              ) : (
                <>
                  {tiers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tier Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Interval</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tiers.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell>
                              {tier.description || tier.id}
                            </TableCell>
                            <TableCell>
                              {tier.unit_amount
                                ? `$${(tier.unit_amount / 100).toFixed(2)}`
                                : ""}
                            </TableCell>
                            <TableCell>{tier.interval}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Disable this tier?"
                                    )
                                  ) {
                                    handleDeactivateTier(tier.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No tiers defined.</p>
                  )}

                  <form onSubmit={handleAddTier} className="space-y-2">
                    {tierError && (
                      <p className="text-destructive text-sm">{tierError}</p>
                    )}
                    <div className="flex flex-wrap gap-2 items-end">
                      <Input
                        type="number"
                        placeholder="Amount (cents)"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        className="w-28"
                      />
                      <select
                        className="border rounded-md p-2"
                        value={newInterval}
                        onChange={(e) =>
                          setNewInterval(e.target.value as "month" | "year")
                        }
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                      <Input
                        placeholder="Name (optional)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" type="submit" disabled={isPending}>
                        Add Tier
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
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
          {/* Danger Zone: Delete Collective */}
          <section className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold text-destructive mb-2">
                Delete Collective
              </h2>
              <p className="mb-4 text-muted-foreground">
                This action is <b>irreversible</b>. All posts, members, invites,
                and data for this collective will be permanently deleted. You
                cannot undo this action.
              </p>
              {deleteError && (
                <p className="text-destructive mb-2">{deleteError}</p>
              )}
              {deleteSuccess ? (
                <p className="text-success mb-2">
                  Collective deleted. Redirecting...
                </p>
              ) : (
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this collective? This cannot be undone."
                      )
                    ) {
                      handleDeleteCollective();
                    }
                  }}
                >
                  {deleteLoading ? "Deleting..." : "Delete Collective"}
                </Button>
              )}
          </section>
          {/* Transfer Ownership Section */}
          {eligibleMembers.length > 0 && (
            <section className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold mb-2">Transfer Ownership</h2>
              <p className="mb-4 text-muted-foreground">
                Transfer ownership of this collective to another member. You
                will become an editor after transfer.
              </p>
              <select
                className="input input-bordered w-full max-w-xs mb-4"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                disabled={transferLoading || transferSuccess}
              >
                <option value="">Select new owner...</option>
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.id}
                  </option>
                ))}
              </select>
              {transferError && (
                <p className="text-destructive mb-2">{transferError}</p>
              )}
              {transferSuccess ? (
                <p className="text-success mb-2">
                  Ownership transferred. Refreshing...
                </p>
              ) : (
                <Button
                  variant="outline"
                  disabled={!transferTo || transferLoading}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to transfer ownership? This cannot be undone."
                      )
                    ) {
                      handleTransferOwnership();
                    }
                  }}
                >
                  {transferLoading ? "Transferring..." : "Transfer Ownership"}
                </Button>
              )}
            </section>
          )}
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
