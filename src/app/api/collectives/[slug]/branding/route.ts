import { NextRequest, NextResponse } from 'next/server';

import { updateCollectiveBranding } from '@/app/actions/collectiveActions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const formData = await request.formData();
    const collectiveId = formData.get('collectiveId') as string;

    if (!collectiveId) {
      return NextResponse.json(
        { success: false, error: 'Collective ID is required.' },
        { status: 400 },
      );
    }

    const result = await updateCollectiveBranding(collectiveId, formData, slug);

    if ('success' in result) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error('Branding upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
