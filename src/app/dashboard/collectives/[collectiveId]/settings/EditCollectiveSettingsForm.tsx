'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, {
  useState,
  useTransition,
  useEffect,
  useState as useClientState,
  useCallback,
} from 'react';
import { useForm } from 'react-hook-form';

import {
  updateCollectiveSettings,
  getCollectiveStripeStatus,
  deleteCollective,
  transferCollectiveOwnership,
} from '@/app/actions/collectiveActions';
import {
  createPriceTier,
  deactivatePriceTier,
} from '@/app/actions/subscriptionActions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  CollectiveSettingsClientSchema,
  CollectiveSettingsClientFormValues,
} from '@/lib/schemas/collectiveSettingsSchema';

import type { Database } from '@/lib/database.types';

// Constants
const MAX_SLUG_LENGTH = 50;
const REDIRECT_DELAY_MS = 2000;
const CENTS_PER_DOLLAR = 100;
const FIXED_DECIMAL_PLACES = 2;

interface SubscriptionTier {
  id: string;
  unit_amount: number | null;
  currency: string | null;
  interval: Database['public']['Enums']['price_interval'] | null;
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

// Define submit handler type locally
type SubmitHandler<T> = (data: T) => void | Promise<void>;

// API Response types
interface StripeConnectResponse {
  url?: string;
  error?: string;
}

interface ActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  updatedSlug?: string;
  fieldErrors?: Record<string, string[]>;
}

export default function EditCollectiveSettingsForm({
  collectiveId,
  currentSlug,
  defaultValues,
  eligibleMembers,
  tiers,
}: EditCollectiveSettingsFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );
  const [tierError, setTierError] = useState<string | undefined>(undefined);
  const [newAmount, setNewAmount] = useState<string>('');
  const [newInterval, setNewInterval] = useState<'month' | 'year'>('month');
  const [newName, setNewName] = useState<string>('');

  // Confirmation modal state to replace window.confirm
  const [deleteConfirmModal, setDeleteConfirmModal] = useClientState(false);
  const [transferConfirmModal, setTransferConfirmModal] = useClientState(false);
  const [tierDeleteConfirm, setTierDeleteConfirm] = useClientState<string>('');

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

  const generateSlug = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, MAX_SLUG_LENGTH);
  }, []);

  // Auto-generate slug from name if user hasn't manually edited slug much
  const watchedName = watch('name');
  const watchedSlug = watch('slug');

  React.useEffect((): void => {
    if (
      (watchedName ?? '').trim().length > 0 &&
      (watchedSlug === defaultValues.slug ||
        generateSlug(defaultValues.name) === watchedSlug)
    ) {
      setValue('slug', generateSlug(watchedName), {
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
    generateSlug,
  ]);

  const onSubmit: SubmitHandler<CollectiveSettingsClientFormValues> =
    useCallback(
      (data): void => {
        setError(undefined);
        setSuccessMessage(undefined);

        if (!isDirty) {
          setSuccessMessage('No changes to save.');
          return;
        }

        startTransition(async () => {
          // Transform tags_string to string[] for the server action
          const serverData = {
            ...data,
            tags_string:
              (data.tags_string ?? '').trim().length > 0
                ? (data.tags_string ?? '')
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0)
                : [],
          };
          const result = (await updateCollectiveSettings(
            collectiveId,
            serverData,
          )) as ActionResult;

          if (
            result.error !== undefined &&
            result.error !== null &&
            result.error.trim().length > 0
          ) {
            setError(
              result.fieldErrors !== undefined && result.fieldErrors !== null
                ? `${result.error} ${Object.values(result.fieldErrors)
                    .flat()
                    .join(', ')}`
                : result.error,
            );
          } else {
            setSuccessMessage(
              (result.message ?? '').trim().length > 0
                ? result.message
                : 'Collective settings updated successfully!',
            );
            const newSlug = result.updatedSlug ?? currentSlug;
            // Reset form with new default values which includes the potentially new slug
            reset(data);
            // If slug changed, redirect to the new settings page URL for consistency
            if (
              result.updatedSlug !== undefined &&
              result.updatedSlug !== null &&
              result.updatedSlug !== currentSlug
            ) {
              void router.push(
                `/dashboard/collectives/${collectiveId}/settings?slug_changed_to=${newSlug}`,
              );
            } else {
              void router.refresh(); // Refresh data on current page if slug didn't change
            }
          }
        });
      },
      [isDirty, collectiveId, currentSlug, reset, router, startTransition],
    );

  // Stripe Connect status state
  const [stripeStatus, setStripeStatus] = useClientState<
    Record<string, unknown> | undefined
  >(undefined);
  const [stripeLoading, setStripeLoading] = useClientState(false);
  const [stripeError, setStripeError] = useClientState<string | undefined>(
    undefined,
  );

  useEffect((): void => {
    setStripeLoading(true);
    getCollectiveStripeStatus(collectiveId)
      .then((status) => setStripeStatus(status))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load Stripe status';
        setStripeError(message);
      })
      .finally(() => setStripeLoading(false));
  }, [collectiveId, setStripeLoading, setStripeStatus, setStripeError]);

  const handleConnectStripe = useCallback(async (): Promise<void> => {
    setStripeLoading(true);
    setStripeError(undefined);
    try {
      const res = await fetch(
        `/api/collectives/${collectiveId}/stripe-onboard`,
        { method: 'POST' },
      );
      const data = (await res.json()) as StripeConnectResponse;
      if (
        data.url !== undefined &&
        data.url !== null &&
        data.url.trim().length > 0
      ) {
        window.location.href = data.url;
      } else {
        setStripeError(
          (data.error ?? '').trim().length > 0
            ? data.error
            : 'Failed to get Stripe onboarding link',
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to Stripe';
      setStripeError(message);
    } finally {
      setStripeLoading(false);
    }
  }, [collectiveId, setStripeLoading, setStripeError]);

  // Danger Zone: Delete Collective
  const [deleteLoading, setDeleteLoading] = useClientState(false);
  const [deleteError, setDeleteError] = useClientState<string | undefined>(
    undefined,
  );
  const [deleteSuccess, setDeleteSuccess] = useClientState(false);

  const handleDeleteCollective = useCallback(async (): Promise<void> => {
    setDeleteError(undefined);
    setDeleteLoading(true);
    const result = (await deleteCollective({ collectiveId })) as ActionResult;
    setDeleteLoading(false);
    if (result.success === true) {
      setDeleteSuccess(true);
      setTimeout(() => {
        void router.push('/dashboard/collectives');
      }, REDIRECT_DELAY_MS);
    } else {
      setDeleteError(
        (result.error ?? '').trim().length > 0
          ? result.error
          : 'Failed to delete collective.',
      );
    }
  }, [
    collectiveId,
    router,
    setDeleteError,
    setDeleteLoading,
    setDeleteSuccess,
  ]);

  // Transfer Ownership
  const [transferTo, setTransferTo] = useClientState<string>('');
  const [transferLoading, setTransferLoading] = useClientState(false);
  const [transferError, setTransferError] = useClientState<string | undefined>(
    undefined,
  );
  const [transferSuccess, setTransferSuccess] = useClientState(false);

  const handleTransferOwnership = useCallback(async (): Promise<void> => {
    setTransferError(undefined);
    setTransferLoading(true);
    const result = (await transferCollectiveOwnership({
      collectiveId,
      newOwnerId: transferTo,
    })) as ActionResult;
    setTransferLoading(false);
    if (result.success === true) {
      setTransferSuccess(true);
      setTimeout(() => {
        void router.refresh();
      }, REDIRECT_DELAY_MS);
    } else {
      setTransferError(
        (result.error ?? '').trim().length > 0
          ? result.error
          : 'Failed to transfer ownership.',
      );
    }
  }, [
    collectiveId,
    transferTo,
    router,
    setTransferError,
    setTransferLoading,
    setTransferSuccess,
  ]);

  const handleAddTier = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      setTierError(undefined);
      const amount = parseInt(newAmount, 10);
      if (!(amount > 0)) {
        setTierError('Enter a valid amount in cents');
        return;
      }
      startTransition(async () => {
        const result = (await createPriceTier({
          collectiveId,
          amount,
          interval: newInterval,
          tierName: (newName ?? '').trim().length > 0 ? newName : undefined,
        })) as ActionResult;
        if (result.success === true) {
          void router.refresh();
        } else {
          setTierError(
            (result.error ?? '').trim().length > 0
              ? result.error
              : 'Failed to add tier',
          );
        }
      });
    },
    [
      collectiveId,
      newAmount,
      newInterval,
      newName,
      router,
      setTierError,
      startTransition,
    ],
  );

  const handleDeactivateTier = useCallback(
    (priceId: string): void => {
      startTransition(async () => {
        const result = (await deactivatePriceTier({
          collectiveId,
          priceId,
        })) as ActionResult;
        if (result.success === true) {
          void router.refresh();
        } else {
          setTierError(
            (result.error ?? '').trim().length > 0
              ? result.error
              : 'Failed to remove tier',
          );
        }
      });
    },
    [collectiveId, router, setTierError, startTransition],
  );

  const handleConnectStripeClick = useCallback((): void => {
    void handleConnectStripe();
  }, [handleConnectStripe]);

  const handleDeleteConfirm = useCallback((): void => {
    // Use React state instead of window.confirm
    if (deleteConfirmModal) {
      void handleDeleteCollective();
    } else {
      setDeleteConfirmModal(true);
    }
  }, [deleteConfirmModal, handleDeleteCollective, setDeleteConfirmModal]);

  const handleTransferConfirm = useCallback((): void => {
    // Use React state instead of window.confirm
    if (transferConfirmModal) {
      void handleTransferOwnership();
    } else {
      setTransferConfirmModal(true);
    }
  }, [transferConfirmModal, handleTransferOwnership, setTransferConfirmModal]);

  const handleTierDeleteConfirm = useCallback(
    (tierId: string): (() => void) => {
      return (): void => {
        if (tierDeleteConfirm === tierId) {
          handleDeactivateTier(tierId);
        } else {
          setTierDeleteConfirm(tierId);
        }
      };
    },
    [tierDeleteConfirm, handleDeactivateTier, setTierDeleteConfirm],
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setNewAmount(e.target.value);
    },
    [setNewAmount],
  );

  const handleIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setNewInterval(e.target.value as 'month' | 'year');
    },
    [setNewInterval],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setNewName(e.target.value);
    },
    [setNewName],
  );

  const handleTransferToChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setTransferTo(e.target.value);
    },
    [setTransferTo],
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  const handleTierDeleteCancel = useCallback((): void => {
    setTierDeleteConfirm('');
  }, [setTierDeleteConfirm]);

  const handleDeleteCancel = useCallback((): void => {
    setDeleteConfirmModal(false);
  }, [setDeleteConfirmModal]);

  const handleTransferCancel = useCallback((): void => {
    setTransferConfirmModal(false);
  }, [setTransferConfirmModal]);

  return (
    <Card>
      <form onSubmit={handleFormSubmit}>
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
              {...register('name')}
              disabled={isPending || isSubmitting}
            />
            {errors.name !== undefined && errors.name !== null && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (/collectives/your-slug)</Label>
            <Input
              id="slug"
              {...register('slug')}
              disabled={isPending || isSubmitting}
            />
            {errors.slug !== undefined && errors.slug !== null && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="What is your collective about?"
              rows={4}
              disabled={isPending || isSubmitting}
            />
            {errors.description !== undefined &&
              errors.description !== null && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags_string">Tags (comma-separated)</Label>
            <Input
              id="tags_string"
              {...register('tags_string')}
              placeholder="e.g., web development, ai, nextjs"
              disabled={isPending || isSubmitting}
            />
            {errors.tags_string !== undefined &&
              errors.tags_string !== null && (
                <p className="text-sm text-destructive">
                  {errors.tags_string.message}
                </p>
              )}
          </div>
          {error !== undefined && error !== null && error.trim().length > 0 && (
            <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              {error}
            </p>
          )}
          {successMessage !== undefined &&
            successMessage !== null &&
            successMessage.trim().length > 0 && (
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
              {stripeStatus?.status !== 'active' ? (
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
                              {(tier.description ?? '').trim().length > 0
                                ? tier.description
                                : tier.id}
                            </TableCell>
                            <TableCell>
                              {tier.unit_amount !== null &&
                              tier.unit_amount !== undefined &&
                              tier.unit_amount > 0
                                ? `$${(tier.unit_amount / CENTS_PER_DOLLAR).toFixed(FIXED_DECIMAL_PLACES)}`
                                : ''}
                            </TableCell>
                            <TableCell>{tier.interval ?? ''}</TableCell>
                            <TableCell className="text-right">
                              {tierDeleteConfirm === tier.id ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleTierDeleteConfirm(tier.id)}
                                  >
                                    Confirm Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleTierDeleteCancel}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={handleTierDeleteConfirm(tier.id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No tiers defined.</p>
                  )}

                  <form onSubmit={handleAddTier} className="space-y-2">
                    {tierError !== undefined &&
                      tierError !== null &&
                      tierError.trim().length > 0 && (
                        <p className="text-destructive text-sm">{tierError}</p>
                      )}
                    <div className="flex flex-wrap gap-2 items-end">
                      <Input
                        type="number"
                        placeholder="Amount (cents)"
                        value={newAmount}
                        onChange={handleAmountChange}
                        className="w-28"
                      />
                      <select
                        className="border rounded-md p-2"
                        value={newInterval}
                        onChange={handleIntervalChange}
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                      <Input
                        placeholder="Name (optional)"
                        value={newName}
                        onChange={handleNameChange}
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
              ) : stripeError !== undefined &&
                stripeError !== null &&
                stripeError.trim().length > 0 ? (
                <p className="text-destructive">{stripeError}</p>
              ) : stripeStatus?.status === 'active' ? (
                <p className="text-success">
                  Stripe Connected: Account is active and ready to receive
                  payouts.
                </p>
              ) : stripeStatus?.status === 'pending' ? (
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
                    onClick={handleConnectStripeClick}
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
            {deleteError !== undefined &&
              deleteError !== null &&
              deleteError.trim().length > 0 && (
                <p className="text-destructive mb-2">{deleteError}</p>
              )}
            {deleteSuccess ? (
              <p className="text-success mb-2">
                Collective deleted. Redirecting...
              </p>
            ) : deleteConfirmModal ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                  onClick={handleDeleteConfirm}
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </Button>
                <Button variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
              >
                Delete Collective
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
                onChange={handleTransferToChange}
                disabled={transferLoading || transferSuccess}
              >
                <option value="">Select new owner...</option>
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {(m.full_name ?? '').trim().length > 0 ? m.full_name : m.id}
                  </option>
                ))}
              </select>
              {transferError !== undefined &&
                transferError !== null &&
                transferError.trim().length > 0 && (
                  <p className="text-destructive mb-2">{transferError}</p>
                )}
              {transferSuccess ? (
                <p className="text-success mb-2">
                  Ownership transferred. Refreshing...
                </p>
              ) : transferConfirmModal ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={transferTo.trim().length === 0 || transferLoading}
                    onClick={handleTransferConfirm}
                  >
                    {transferLoading ? 'Transferring...' : 'Confirm Transfer'}
                  </Button>
                  <Button variant="outline" onClick={handleTransferCancel}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={transferTo.trim().length === 0 || transferLoading}
                  onClick={handleTransferConfirm}
                >
                  Transfer Ownership
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
            ) : undefined}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
