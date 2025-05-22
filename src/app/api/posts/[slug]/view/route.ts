import { NextRequest, NextResponse } from 'next/server';
import { logPostView } from '@/lib/data/views';
import { getPostBySlug } from '@/lib/data/posts';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params;
  // const user = await getCurrentUser(req); // Implement this for auth if needed
  try {
    const post = await getPostBySlug(slug);
    await logPostView({ postId: post.id, userId: null });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
