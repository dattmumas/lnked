import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { fetchUnifiedFeed } from '@/lib/server/fetchUnifiedFeed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') ?? '20');
    const offset = Number(searchParams.get('offset') ?? '0');
    const tenantId = searchParams.get('tenantId');
    const scopeParam = searchParams.get('scope');
    const scope =
      scopeParam === 'tenant' && tenantId
        ? { type: 'tenant' as const, id: tenantId }
        : { type: 'global' as const };

    // Create a Supabase client in the route handler context to verify auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await fetchUnifiedFeed({ limit, cursor: offset, scope });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
