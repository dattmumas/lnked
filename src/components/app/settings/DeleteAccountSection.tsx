'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteUserAccount } from '@/app/actions/userActions';
import { Button } from '@/components/ui/button';

export default function DeleteAccountSection({
  userEmail,
}: {
  userEmail: string;
}) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setError(null);
    setIsLoading(true);
    const result = await deleteUserAccount();
    setIsLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        void router.push('/goodbye');
      }, 2000);
    } else {
      setError(result.error || 'Failed to delete account.');
    }
  };

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
        onChange={(e) => setConfirmEmail(e.target.value)}
        placeholder="your@email.com"
        disabled={isLoading || success}
      />
      {error && <p className="text-destructive mb-2">{error}</p>}
      {success ? (
        <p className="text-success mb-2">Account deleted. Goodbye!</p>
      ) : (
        <Button
          variant="destructive"
          disabled={isLoading || confirmEmail !== userEmail}
          onClick={() => void handleDelete()}
        >
          {isLoading ? 'Deleting...' : 'Delete My Account'}
        </Button>
      )}
    </section>
  );
}
