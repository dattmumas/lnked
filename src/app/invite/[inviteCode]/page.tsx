import { acceptCollectiveInvite } from "@/app/actions/memberActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InviteAcceptPage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirect to sign-in, then back to this page
    redirect(`/sign-in?next=/invite/${params.inviteCode}`);
  }

  const result = await acceptCollectiveInvite({
    inviteCode: params.inviteCode,
  });

  return (
    <div className="container mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Collective Invite</h1>
      {result.success ? (
        <div className="text-success bg-success/10 p-4 rounded mb-4">
          <p>Invite accepted! You are now a member of the collective.</p>
        </div>
      ) : (
        <div className="text-destructive bg-destructive/10 p-4 rounded mb-4">
          <p>{result.error || "Failed to accept invite."}</p>
        </div>
      )}
      <a href="/dashboard" className="text-primary underline">
        Go to Dashboard
      </a>
    </div>
  );
}
