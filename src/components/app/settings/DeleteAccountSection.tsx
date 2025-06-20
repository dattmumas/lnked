'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

import { deleteUserAccount } from '@/app/actions/userActions';
import { Button } from '@/components/ui/button';

// Constants for magic numbers
const REDIRECT_DELAY_MS = 2000;

export default function DeleteAccountSection({
  userEmail,
}: {
  userEmail: string;
}): React.ReactElement {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleDelete = useCallback(async (): Promise<void> => {
    setError(undefined);
    setIsLoading(true);
    const result = await deleteUserAccount();
    setIsLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        void router.push('/goodbye');
      }, REDIRECT_DELAY_MS);
    } else {
      setError(result.error ?? 'Failed to delete account.');
    }
  }, [router]);

  // Email input change handler
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setConfirmEmail(e.target.value);
    },
    [],
  );

  // Delete button click handler
  const handleDeleteClick = useCallback((): void => {
    void handleDelete();
  }, [handleDelete]);

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold text-destructive mb-2">
        Delete Account
      </h2>
      <p className="mb-4 text-muted-foreground">
        This action is <b>irreversible</b>. All your data, posts, memberships,
        and subscriptions will be permanently deleted. If you own any
        collectives, you must transfer or delete them first.
      </p>
      <label htmlFor="confirm-email" className="block mb-2 font-medium">
        Type your email to confirm:
      </label>
      <input
        id="confirm-email"
        type="email"
        className="input input-bordered w-full max-w-xs mb-4"
        value={confirmEmail}
        onChange={handleEmailChange}
        placeholder="your@email.com"
        disabled={isLoading || success}
      />
      {error !== undefined && error !== null && error.length > 0 && (
        <p className="text-destructive mb-2">{error}</p>
      )}
      {success ? (
        <p className="text-success mb-2">Account deleted. Goodbye!</p>
      ) : (
        <Button
          variant="destructive"
          disabled={isLoading || confirmEmail !== userEmail}
          onClick={handleDeleteClick}
        >
          {isLoading ? 'Deleting...' : 'Delete My Account'}
        </Button>
      )}
    </section>
  );
}
