import { redirect } from "next/navigation";

export default function CollectiveDashboardDefault({ params }: { params: { collectiveId: string } }) {
  redirect(`/dashboard/collectives/${params.collectiveId}/posts`);
}
