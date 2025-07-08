import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chainId: string }> },
): Promise<NextResponse> {
  const { chainId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch the chain to verify ownership
  const { data: chain, error: chainError } = await supabase
    .from('chains')
    .select('id, author_id')
    .eq('id', chainId)
    .single();

  if (chainError || !chain) {
    return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
  }

  if (chain.author_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Fetch associated media files to delete from storage
  const { data: mediaFiles, error: mediaError } = await supabase
    .from('media')
    .select('storage_path')
    .eq('chain_id', chainId);

  if (mediaError) {
    console.error('Error fetching media:', mediaError);
    // Not a fatal error, we can still try to delete the chain
  }

  // 3. Delete files from Supabase Storage
  if (mediaFiles && mediaFiles.length > 0) {
    const filePaths = mediaFiles.map((file) => file.storage_path);
    const { error: storageError } = await supabase.storage
      .from('chain-images')
      .remove(filePaths);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Not returning here to allow chain deletion to proceed,
      // but logging the error for later cleanup.
    }
  }

  // 4. Delete the chain (media records will be deleted by cascade)
  const { error: deleteChainError } = await supabase
    .from('chains')
    .delete()
    .eq('id', chainId);

  if (deleteChainError) {
    console.error('Error deleting chain:', deleteChainError);
    return NextResponse.json(
      { error: 'Failed to delete chain' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
