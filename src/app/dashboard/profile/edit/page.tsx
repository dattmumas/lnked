import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { redirect } from "next/navigation";
import EditProfileForm from "./EditProfileForm"; // Client component for the form

export default async function EditProfilePage() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user: authUser }, // Renamed to authUser to avoid conflict
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/sign-in");
  }

  // Fetch the user's profile from the public.users table
  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("full_name, bio, tags")
    .eq("id", authUser.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError.message);
    // Handle error appropriately, maybe redirect to dashboard with an error message
    // For now, we can pass null or empty defaults to the form
  }

  const defaultValues = {
    full_name: userProfile?.full_name || "",
    bio: userProfile?.bio || "",
    // Convert tags array to comma-separated string for the form field
    tags_string: userProfile?.tags?.join(", ") || "",
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
      </header>
      <EditProfileForm defaultValues={defaultValues} />
    </div>
  );
}
