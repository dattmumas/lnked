'use client';

import Link from 'next/link';
import React from 'react';

import RecommendationFeedbackButtons from '@/app/(public)/discover/RecommendationFeedbackButtons';

// Constants
const SCORE_DECIMAL_PLACES = 2;

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
}: CollectiveCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link
          href={`/collectives/${collective.slug}`}
          className="text-lg font-semibold hover:text-accent"
        >
          {collective.name}
        </Link>
        {typeof score === 'number' && (
          <span className="text-xs text-muted-foreground ml-2">
            Score: {score.toFixed(SCORE_DECIMAL_PLACES)}
          </span>
        )}
      </div>
      {collective.description !== undefined &&
        collective.description !== null &&
        collective.description.length > 0 && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {collective.description}
          </p>
        )}
      {collective.tags !== undefined &&
        collective.tags !== null &&
        collective.tags.length > 0 && (
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
