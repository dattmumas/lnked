import CollectiveCard from "@/app/dashboard/collectives/_components/CollectiveCard";
import LoadMoreButton from "@/app/discover/_components/LoadMoreButton";
// import { cookies } from "next/headers"; // No longer needed directly here
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import {
  fetchRecommendations,
  type Recommendation,
} from "@/lib/data/recommendations"; // Import new helper

// Recommendation interface might be moved to a shared types file eventually
// For now, it's also exported from the lib file, or we can define it here if preferred.

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  let recommendations: Recommendation[] = [];
  let nextCursor: string | null = null;

  try {
    // const cookieHeader = (await cookies()).toString(); // Not needed if fetchRecommendations handles cookies internally
    const data = await fetchRecommendations(searchParams.cursor); // paginate
    recommendations = data.recommendations;
    nextCursor = data.nextCursor;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in DiscoverPage:", error.message);
    } else {
      console.error("An unexpected error occurred in DiscoverPage:", error);
    }
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load recommendations. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold font-serif tracking-tight mb-6">
        Discover Collectives
      </h1>
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-muted-foreground">
            No recommendations found at the moment.
          </div>
        ) : (
          recommendations.map((rec) => (
            <CollectiveCard
              key={rec.suggested_collective_id}
              collective={rec.collectives}
              score={rec.score}
              showFeedbackButtons={true}
            />
          ))
        )}
      </div>
      {nextCursor && (
        <div className="mt-6 text-center">
          <LoadMoreButton nextCursor={nextCursor} />
        </div>
      )}
    </section>
  );
}
