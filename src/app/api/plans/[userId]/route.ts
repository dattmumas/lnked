import { NextResponse } from 'next/server';

import { HttpStatusCode } from '@/lib/constants/errors';
import { fetchPlansForOwner } from '@/lib/stripe/plan-reader';

// Simple UUID v4 pattern – more permissive than Zod strict check to avoid
// false negatives caused by accidentally encoded characters.
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const { userId } = await context.params;

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Invalid userId format' },
      { status: HttpStatusCode.UnprocessableEntity },
    );
  }

  try {
    const resolved = await fetchPlansForOwner('user', userId);

    const uiPlans = resolved.map((p) => {
      const amountCents = p.price?.unit_amount ?? 0;
      const name =
        typeof p.price?.product === 'object' && p.price?.product
          ? ((p.price.product as { name?: string }).name ?? 'Plan')
          : 'Plan';

      return {
        id: p.id,
        name,
        monthlyCost: amountCents / 100,
        stripe_price_id: p.stripe_price_id,
      };
    });

    return NextResponse.json({ plans: uiPlans });
  } catch (err: unknown) {
    console.error('[API] /api/plans unexpected error', err);
    return NextResponse.json({ plans: [] });
  }
}
