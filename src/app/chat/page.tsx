import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/ChatInterface';

export default async function ChatPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen w-full">
      {/* ChatInterface is a client component */}
      {/* @ts-expect-error Async Server Component */}
      <ChatInterface userId={user.id} />
    </div>
  );
}
