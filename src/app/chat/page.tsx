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
    <div className="flex h-full w-full overflow-hidden">
      {/* ChatInterface is a client component */}
      <ChatInterface userId={user.id} />
    </div>
  );
}
