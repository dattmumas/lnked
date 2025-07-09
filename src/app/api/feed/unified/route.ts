import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Shape of a single row returned by get_user_feed
type TenantFeedRow =
  Database['public']['Functions']['get_tenant_feed']['Returns'][number];
type RpcParams = Database['public']['Functions']['get_tenant_feed']['Args'];

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);

  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');
  const tenantId = searchParams.get('tenantId');

  // Auth check handled inside RPC via RLS; but ensure user exists for clarity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rpcParams: RpcParams = {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
  };

  if (tenantId) {
    rpcParams.p_tenant_id = tenantId;
  }

  // eslint-disable-next-line no-console
  console.info('[feed/unified] params', rpcParams);

  let rpcData: TenantFeedRow[] | null = null;

  if (tenantId) {
    const { data } = await supabase
      .rpc('get_tenant_feed', rpcParams)
      .throwOnError();
    rpcData = data as TenantFeedRow[] | null;
  } else {
    // Fallback to original global feed logic
    const { data } = await supabase
      .rpc('get_user_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset,
      })
      .throwOnError();
    rpcData = data as any;
  }

  // eslint-disable-next-line no-console
  console.info('[feed/unified] rows', rpcData?.length ?? 0);

  const items: TenantFeedRow[] = (rpcData as any) ?? [];

  const nextOffset = items.length === limit ? offset + limit : null;

  return NextResponse.json({ items, nextOffset });
}
