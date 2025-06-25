import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FollowerUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  followed_at?: string;
}

interface FollowerListProps {
  followers: FollowerUser[];
  entityName: string;
  entityType: 'user' | 'collective';
}

export default function FollowerList({
  followers,
  entityName,
  entityType,
}: FollowerListProps): React.ReactElement {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{entityName} Followers</h1>
        <p className="text-muted-foreground">
          {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
        </p>
      </div>

      <div className="grid gap-4">
        {followers.map((follower) => (
          <div
            key={follower.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={follower.avatar_url || undefined} />
                <AvatarFallback>
                  {follower.full_name !== null &&
                  follower.full_name !== undefined
                    ? follower.full_name.charAt(0)
                    : follower.username !== null &&
                        follower.username !== undefined
                      ? follower.username.charAt(0)
                      : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {follower.full_name !== null &&
                  follower.full_name !== undefined
                    ? follower.full_name
                    : (follower.username ?? 'Unknown User')}
                </h3>
                {follower.username !== null &&
                follower.username !== undefined ? (
                  <p className="text-sm text-muted-foreground">
                    @{follower.username}
                  </p>
                ) : null}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/profile/${follower.username}`}>View Profile</Link>
            </Button>
          </div>
        ))}
      </div>

      {followers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No followers yet</p>
        </div>
      )}
    </div>
  );
}
