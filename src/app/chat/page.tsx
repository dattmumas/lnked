import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ChatInterface } from '@/components/chat/chat-interface';

export default async function ChatPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">
          Stay connected with your network
        </p>
      </div>

      <div
        className="bg-background border rounded-lg shadow-sm overflow-hidden"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <ChatInterface userId={user.id} />
      </div>
    </div>
  );
}
