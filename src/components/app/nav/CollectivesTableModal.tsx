'use client';

import { ExternalLink, Users, Settings } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CollectivesTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectivesTableModal({
  open,
  onOpenChange,
}: CollectivesTableModalProps): React.ReactElement {
  const { data: collectives = [], isLoading } = useCollectiveMemberships(true);

  // Group collectives by ownership
  const { ownedCollectives, memberCollectives } = useMemo(() => {
    const owned = collectives.filter((c) => c.user_role === 'owner');
    const member = collectives.filter((c) => c.user_role !== 'owner');

    return {
      ownedCollectives: owned,
      memberCollectives: member,
    };
  }, [collectives]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'editor':
        return 'outline';
      case 'author':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Collectives
          </DialogTitle>
          <DialogDescription>
            Quick access to all your collectives. Click to enter or manage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading collectives...
              </div>
            </div>
          ) : collectives.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Collectives Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created or joined any collectives.
              </p>
              <Button asChild>
                <Link
                  href="/collectives/new"
                  onClick={() => onOpenChange(false)}
                >
                  Create Your First Collective
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Owned Collectives */}
              {ownedCollectives.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Collectives I Own ({ownedCollectives.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[100px]">Manage</TableHead>
                        <TableHead className="w-[100px]">Settings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ownedCollectives.map((collective) => (
                        <TableRow key={collective.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/collectives/${collective.slug}`}
                              className="text-foreground hover:text-accent transition-colors"
                              onClick={() => onOpenChange(false)}
                            >
                              {collective.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(
                                collective.user_role,
                              )}
                            >
                              {collective.user_role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              onClick={() => onOpenChange(false)}
                            >
                              <Link
                                href={`/collectives/${collective.slug}/dashboard`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              onClick={() => onOpenChange(false)}
                            >
                              <Link
                                href={`/collectives/${collective.slug}/settings`}
                              >
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Member Collectives */}
              {memberCollectives.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Collectives I Contribute To ({memberCollectives.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[100px]">Manage</TableHead>
                        <TableHead className="w-[100px]">Settings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberCollectives.map((collective) => (
                        <TableRow key={collective.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/collectives/${collective.slug}`}
                              className="text-foreground hover:text-accent transition-colors"
                              onClick={() => onOpenChange(false)}
                            >
                              {collective.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(
                                collective.user_role,
                              )}
                            >
                              {collective.user_role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              onClick={() => onOpenChange(false)}
                            >
                              <Link
                                href={`/collectives/${collective.slug}/dashboard`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              onClick={() => onOpenChange(false)}
                            >
                              <Link
                                href={`/collectives/${collective.slug}/settings`}
                              >
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t pt-4 flex justify-between">
          <Button variant="outline" asChild onClick={() => onOpenChange(false)}>
            <Link href="/collectives/new">Create New Collective</Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
