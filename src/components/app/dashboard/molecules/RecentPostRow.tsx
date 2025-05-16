"use client"; // If any interactivity is planned, otherwise can be server component if props are simple

import Link from "next/link";
import { Eye, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge"; // Assuming badgeVariants is exported or can be inferred

// Assuming a simplified Post type for this row display
// Ideally, this would come from a shared types definition
interface Post {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  is_public: boolean;
  // collective_id: string | null; // For determining post URL if needed
}

interface RecentPostRowProps {
  post: Post;
  // onEdit: (postId: string) => void; // Callback for edit
  // onDelete: (postId: string) => void; // Callback for delete
  // onPublishToggle: (postId: string, isPublished: boolean) => void; // Callback for publish/unpublish
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function RecentPostRow({ post }: RecentPostRowProps) {
  const postUrl = `/posts/${post.id}`; // Generic post view URL, adjust if needed
  const editUrl = `/dashboard/posts/${post.id}/edit`;

  const status = post.published_at ? "Published" : "Draft";
  const statusVariant: VariantProps<typeof badgeVariants>["variant"] =
    status === "Published"
      ? post.is_public
        ? "default"
        : "secondary"
      : "outline";

  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <Link href={editUrl} className="group">
          <h3 className="text-md font-semibold truncate group-hover:text-primary transition-colors">
            {post.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          {status === "Published"
            ? `Published on ${formatDate(post.published_at)}`
            : `Draft created ${formatDate(post.created_at)}`}
          {status === "Published" && !post.is_public && " (Private)"}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={statusVariant} className="capitalize">
          {status}
        </Badge>
        <Button variant="ghost" size="sm" asChild>
          <Link href={postUrl} aria-label="View post">
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={editUrl} aria-label="Edit post">
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => alert('Toggle publish status')}>Toggle Publish</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive-foreground" onClick={() => alert('Delete post')}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </div>
  );
}
