'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';

import {
  getOrCreateStripeConnectAccount,
  createPriceTier,
  updateRevenueShares,
} from '@/app/actions/collectiveActions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Database } from '@/lib/database.types';

type Price = Database['public']['Tables']['prices']['Row'];
type Member = Database['public']['Tables']['collective_members']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type MemberWithUser = Member & { users: User | null };

interface MonetizationSettingsClientProps {
  collectiveId: string;
  stripeStatus: {
    status: 'active' | 'pending' | 'none';
    stripe_account_id?: string;
  };
  initialPrices: Price[];
  members: MemberWithUser[];
}

export function MonetizationSettingsClient({
  collectiveId,
  stripeStatus,
  initialPrices,
  members,
}: MonetizationSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateTierOpen, setCreateTierOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [memberShares, setMemberShares] = useState<Record<string, number>>(() =>
    members.reduce(
      (acc, member) => {
        acc[member.id] = member.share_percentage || 0;
        return acc;
      },
      {} as Record<string, number>,
    ),
  );

  const handleOnboarding = () => {
    startTransition(async () => {
      const result = await getOrCreateStripeConnectAccount(collectiveId);
      if (result.success) {
        router.push(result.url);
      } else {
        toast.error('Failed to start Stripe onboarding.', {
          description: result.error,
        });
      }
    });
  };

  const handleCreateTier = () => {
    startTransition(async () => {
      const result = await createPriceTier({
        collectiveId,
        amount: Number(amount),
        interval,
      });
      if ('success' in result) {
        toast.success('New price tier created!');
        setCreateTierOpen(false);
        router.refresh(); // Refreshes server components
      } else {
        toast.error('Failed to create tier.', {
          description: result.error,
        });
      }
    });
  };

  const handleUpdateShares = () => {
    startTransition(async () => {
      const shares = Object.entries(memberShares).map(
        ([memberId, sharePercentage]) => ({
          memberId,
          sharePercentage: Number(sharePercentage),
        }),
      );

      const result = await updateRevenueShares({ collectiveId, shares });
      if ('success' in result) {
        toast.success('Revenue shares updated successfully.');
        router.refresh();
      } else {
        toast.error('Failed to update shares.', {
          description: result.error,
        });
      }
    });
  };

  const totalShare = Object.values(memberShares).reduce(
    (acc, share) => acc + Number(share || 0),
    0,
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments and monetize your
            collective.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripeStatus.status === 'active' ? (
            <p className="text-green-500">
              Stripe account is connected and active.
            </p>
          ) : stripeStatus.status === 'pending' ? (
            <p className="text-yellow-500">
              Stripe account is currently being reviewed. Activation pending.
            </p>
          ) : (
            <Button onClick={handleOnboarding} disabled={isPending}>
              {isPending ? 'Connecting...' : 'Connect with Stripe'}
            </Button>
          )}
        </CardContent>
      </Card>

      {stripeStatus.status === 'active' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tiers</CardTitle>
              <CardDescription>
                Manage the pricing for your collective's subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {initialPrices.map((price) => (
                <div
                  key={price.id}
                  className="flex justify-between items-center"
                >
                  <p>
                    ${(price.unit_amount || 0) / 100} / {price.interval}
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Deactivate
                  </Button>
                </div>
              ))}

              <Dialog open={isCreateTierOpen} onOpenChange={setCreateTierOpen}>
                <DialogTrigger asChild>
                  <Button>Create New Tier</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a new price tier</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amount" className="text-right">
                        Amount (USD)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="interval" className="text-right">
                        Interval
                      </Label>
                      <Select
                        onValueChange={(value: 'month' | 'year') =>
                          setInterval(value)
                        }
                        defaultValue={interval}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateTier}
                      disabled={isPending || !amount}
                    >
                      {isPending ? 'Creating...' : 'Create Tier'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Sharing</CardTitle>
              <CardDescription>
                Define how revenue from subscriptions is shared among members.
                The total must not exceed 100%.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Share (%)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.users?.full_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={memberShares[member.id]}
                          onChange={(e) => {
                            const value = e.target.valueAsNumber;
                            setMemberShares((prev) => ({
                              ...prev,
                              [member.id]: isNaN(value) ? 0 : value,
                            }));
                          }}
                          className="text-right"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end items-center mt-4 space-x-4">
                <span
                  className={`text-sm ${
                    totalShare > 100 ? 'text-red-500' : 'text-gray-500'
                  }`}
                >
                  Total: {totalShare}%
                </span>
                <Button
                  onClick={handleUpdateShares}
                  disabled={isPending || totalShare > 100}
                >
                  {isPending ? 'Saving...' : 'Save Shares'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
