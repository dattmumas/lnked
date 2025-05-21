"use client";

import Link from "next/link";
import RecommendationFeedbackButtons from "@/app/discover/RecommendationFeedbackButtons";

interface CollectiveCardProps {
  collective: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    tags: string[] | null;
  };
  score?: number;
  showFeedbackButtons?: boolean;
}

export default function CollectiveCard({
  collective,
  score,
  showFeedbackButtons = false,
}: CollectiveCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link
          href={`/collectives/${collective.slug}`}
          className="text-lg font-semibold hover:text-primary"
        >
          {collective.name}
        </Link>
        {typeof score === "number" && (
          <span className="text-xs text-muted-foreground ml-2">
            Score: {score.toFixed(2)}
          </span>
        )}
      </div>
      {collective.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {collective.description}
        </p>
      )}
      {collective.tags && collective.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {collective.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted px-2 py-0.5 rounded text-xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {showFeedbackButtons && (
        <RecommendationFeedbackButtons collectiveId={collective.id} />
      )}
    </div>
  );
}
