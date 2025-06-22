/* eslint-disable no-magic-numbers */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Json } from '@/lib/database.types';

const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  INTERNAL_SERVER_ERROR = 500,
}





const BodySchema = z.object({
  content: z.string().trim().min(1, 'Message content is required').max(10000),
  message_type: z.enum(['text', 'image', 'file']).optional().default('text'),
  metadata: z.record(z.unknown()).optional(),
  reply_to_id: z.string().uuid().optional(),
});

type MessageRow = {
  id: string;
  content: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  reply_to_id?: string | null;
  sender: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string | null;
    deleted_at: string | null;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

// Helper to detect URLs in text
function extractFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }): Promise<NextResponse> {
  const { conversationId } = await context.params;

  // 1. Auth
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // 2. Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HttpStatus.BAD_REQUEST });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const { content, message_type, metadata, reply_to_id } = parsed.data;

  // 3. Verify participant
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (partErr !== null) {
    return NextResponse.json(
      { error: partErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (participant === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // 4. Process metadata for text messages (link preview)
  const finalMetadata = metadata || {};
  
  // 5. Insert message
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content,
      message_type,
      metadata: finalMetadata as Json,
      sender_id: user.id,
      reply_to_id: reply_to_id ?? null,
    })
    .select(`
      id, 
      content, 
      message_type, 
      metadata, 
      created_at,
      reply_to_id,
      sender: users(id, username, avatar_url),
      reply_to: messages(
        id,
        content,
        deleted_at,
        sender: users(id, username, full_name, avatar_url)
      )
    `)
    .single<MessageRow>();

  if (msgErr !== null || msg === null) {
    return NextResponse.json(
      { error: msgErr?.message ?? 'Failed to send message' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  // 6. Fetch link preview asynchronously after message is created
  if (message_type === 'text' && msg.id !== null && msg.id !== undefined) {
    const url = extractFirstUrl(content);
    if (url !== null && url !== undefined && finalMetadata.embed === undefined) {
      try {
        // Fetch link preview in the background (don't block message sending)
        const origin = request.headers.get('origin');
        if (origin !== null) {
          fetch(`${origin}/api/chat/link-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          }).then(async (res) => {
            if (res.ok) {
              const preview: unknown = await res.json();
              // Update the message with the preview
              await supabase
                .from('messages')
                .update({ 
                  metadata: { 
                    ...finalMetadata, 
                    embed: preview as Record<string, unknown>
                  } as Json 
                })
                .eq('id', msg.id)
                .eq('conversation_id', conversationId);
            }
          }).catch((err: unknown) => {
            console.error('Failed to fetch link preview:', err);
          });
        }
      } catch (err: unknown) {
        console.error('Failed to fetch link preview:', err);
      }
    }
  }

  return NextResponse.json(msg, { status: HttpStatus.CREATED });
}

export const runtime = 'nodejs'; 