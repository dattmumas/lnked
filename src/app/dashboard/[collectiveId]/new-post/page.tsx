import { redirect } from "next/navigation";

export default async function NewCollectivePostPage({
  params,
}: {
  params: { collectiveId: string };
}) {
  // Redirect to the unified new post route with the collectiveId query param
  redirect(`/posts/new?collectiveId=${params.collectiveId}`);
}
