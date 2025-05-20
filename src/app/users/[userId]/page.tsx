import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileFeed from "@/components/app/profile/ProfileFeed";
import type { MicroPost } from "@/components/app/profile/MicrothreadPanel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SubscribeButton from "@/components/app/newsletters/molecules/SubscribeButton";

export default async function Page({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, full_name, bio")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching user", userId, profileError);
    redirect("/not-found");
  }

  const { data: postsData, error: postsError } = await supabase.rpc(
    "get_user_feed",
    { p_user_id: userId }
  );

  // Only log when Supabase returns a real error (has a message/code)
  if (postsError?.message) {
    console.error("Error fetching posts for user", userId, postsError);
  }

  const posts =
    postsData?.map((p: (typeof postsData)[number]) => ({
      ...p,
      like_count: p.like_count ?? 0,
      current_user_has_liked: undefined,
    })) ?? [];

  const microPosts: MicroPost[] = [
    { id: "u1", content: "Thanks for checking out my work!" },
    { id: "u2", content: "New article coming soon." },
    { id: "u3", content: "Follow me for updates!" },
  ];

  const isOwner = authUser?.id === userId;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 pb-6 border-b border-primary/10 flex flex-col items-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-center mb-4">
          {profile.full_name ?? "User"}
        </h1>
        {profile.bio && (
          <div className="bg-card shadow rounded-xl p-6 max-w-2xl w-full text-center mx-auto">
            <p className="text-lg text-muted-foreground">{profile.bio}</p>
          </div>
        )}
        <div className="mt-4 w-full max-w-md">
          <form action="" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              placeholder="Search this profile..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
        </div>
        {isOwner ? (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard/profile/edit">Edit Profile</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <SubscribeButton
              targetEntityType="user"
              targetEntityId={profile.id}
              targetName={profile.full_name ?? ""}
            />
          </div>
        )}
      </header>

      <main>
        {posts && posts.length > 0 ? (
          <ProfileFeed posts={posts} microPosts={microPosts} />
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold mb-2">No posts yet!</h2>
            <p className="text-muted-foreground">
              This user hasn&apos;t published any posts. Check back later!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
