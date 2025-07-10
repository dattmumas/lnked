'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  deleteCollective,
  transferCollectiveOwnership,
} from '@/app/actions/collectiveActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Database } from '@/lib/database.types';

type Collective = Pick<
  Database['public']['Tables']['collectives']['Row'],
  'id' | 'name'
>;
type Member = { id: string; full_name: string | null };

export function DangerZoneClient({
  collective,
  members,
}: {
  collective: Collective;
  members: Member[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newOwnerId, setNewOwnerId] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const handleTransfer = () => {
    startTransition(async () => {
      const result = await transferCollectiveOwnership({
        collectiveId: collective.id,
        newOwnerId,
      });
      if (result.success) {
        toast.success('Ownership transferred successfully.');
        router.refresh();
      } else {
        toast.error('Failed to transfer ownership.', {
          description: result.error,
        });
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCollective({ collectiveId: collective.id });
      if (result.success) {
        toast.success('Collective deleted successfully.');
        router.push('/dashboard'); // Redirect after deletion
      } else {
        toast.error('Failed to delete collective.', {
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle>Transfer Ownership</CardTitle>
          <CardDescription>
            Transfer this collective to another member. This action is
            irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="new-owner">New Owner</Label>
          <Select onValueChange={setNewOwnerId}>
            <SelectTrigger id="new-owner">
              <SelectValue placeholder="Select a new owner" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!newOwnerId}>
                Transfer Ownership
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will make the selected member the new owner. You will
                  lose all ownership privileges. Type{' '}
                  <strong>{collective.name}</strong> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationText('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTransfer}
                  disabled={isPending || confirmationText !== collective.name}
                >
                  {isPending ? 'Transferring...' : 'Transfer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-red-500">
        <CardHeader>
          <CardTitle>Delete Collective</CardTitle>
          <CardDescription>
            Permanently delete this collective, including all its posts and
            members. This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Collective</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  collective. Type <strong>{collective.name}</strong> to
                  confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationText('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending || confirmationText !== collective.name}
                >
                  {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
