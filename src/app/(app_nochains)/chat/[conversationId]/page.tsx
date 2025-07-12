import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { NewChatInterface } from '@/components/chat-v2/NewChatInterface';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface ChatPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

async function getConversation(conversationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(
      `
      *,
      tenant:tenants(
        id,
        name,
        slug,
        type
      )
    `,
    )
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return null;
  }

  return conversation;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = await params;

  // Fetch initial conversation data on the server
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewChatInterface
        conversationId={conversationId}
        initialConversation={conversation}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: ChatPageProps) {
  const { conversationId } = await params;
  const conversation = await getConversation(conversationId);

  return {
    title: conversation?.title ? `${conversation.title} - Chat` : 'Chat',
    description: conversation?.description || 'Chat conversation',
  };
}
