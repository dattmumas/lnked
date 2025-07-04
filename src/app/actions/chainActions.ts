'use server';

/*
 * Server Actions – Chains
 * Central entry-point for creating root chains and replies. These actions run
 * only on the server so they can keep Supabase keys secret and allow
 * revalidateTag() later.
 */

import { insertRoot, insertReply } from '@/lib/data-access/chain.repository';

export async function createChainRoot(fd: FormData) {
  const uidRaw = fd.get('uid');
  const bodyRaw = fd.get('body');
  if (typeof uidRaw !== 'string' || typeof bodyRaw !== 'string') {
    throw new Error('Invalid form data');
  }

  return insertRoot({
    author_id: uidRaw,
    content: bodyRaw,
    visibility: 'public',
    status: 'active',
  });
}

export async function replyToChain(fd: FormData) {
  const parentRaw = fd.get('parent');
  const uidRaw = fd.get('uid');
  const bodyRaw = fd.get('body');
  if (
    typeof parentRaw !== 'string' ||
    typeof uidRaw !== 'string' ||
    typeof bodyRaw !== 'string'
  ) {
    throw new Error('Invalid form data');
  }

  const parent = JSON.parse(parentRaw);

  return insertReply({
    parent,
    author_id: uidRaw,
    content: bodyRaw,
    visibility: parent.visibility,
    status: 'active',
  });
}
