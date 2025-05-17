"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deletePost } from "@/app/actions/postActions";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/database.types";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
interface DashboardPost extends PostRow {
  collective?: { id: string; name: string; slug: string } | null;
  likes?: { count: number }[] | null;
  post_reactions?: { count: number; type?: string }[] | null;
  likeCount?: number;
}

interface PostListItemProps {
  post: DashboardPost;
}

function getStatus(post: DashboardPost) {
  if (!post.published_at) return "Draft";
  if (post.published_at && new Date(post.published_at) > new Date())
    return "Scheduled";
  return "Published";
}

export default function PostListItem({ post }: PostListItemProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const status = getStatus(post);
  const statusColor =
    status === "Draft"
      ? "outline"
      : status === "Scheduled"
      ? "secondary"
      : "default";
  const likes =
    typeof post.likeCount === "number"
      ? post.likeCount
      : post.likes?.[0]?.count || post.post_reactions?.[0]?.count || 0;
  const publishDate = post.published_at || post.created_at;
  const postUrl = post.collective
    ? `/collectives/${post.collective.slug}/${post.id}`
    : `/posts/${post.id}`;
  const editUrl = `/dashboard/posts/${post.id}/edit`;

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      startTransition(async () => {
        await deletePost(post.id);
        router.refresh();
      });
    }
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-2 whitespace-nowrap max-w-xs">
        <div className="flex items-center gap-2">
          <Link href={editUrl} className="font-medium hover:underline">
            {post.title}
          </Link>
          {post.collective && (
            <Badge variant="secondary" className="ml-1">
              {post.collective.name}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        <Badge variant={statusColor} className="capitalize">
          {status}
        </Badge>
      </td>
      <td className="px-4 py-2">
        {publishDate ? new Date(publishDate).toLocaleDateString() : "N/A"}
      </td>
      <td className="px-4 py-2 tabular-nums">{likes}</td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="View post">
            <Link href={postUrl}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Edit post">
            <Link href={editUrl}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Delete post"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
