import { insertLedgerEntries, LedgerInsert } from '../../lib/ledger';

// Mock supabaseAdmin RPC
jest.mock('@/lib/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      rpc: jest.fn().mockResolvedValue({ error: null }),
    },
  };
});

const { supabaseAdmin } = jest.requireMock('@/lib/supabaseAdmin');

describe('insertLedgerEntries', () => {
  it('skips when entries array is empty', async () => {
    await expect(insertLedgerEntries([])).resolves.toBeUndefined();
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('calls ledger_insert_batch RPC with provided entries', async () => {
    const batch: LedgerInsert[] = [
      {
        account_id: 'uuid-123',
        stripe_object_id: 'in_123',
        event_type: 'invoice.payment_succeeded',
        amount_cents: 1000,
        currency: 'usd',
      },
    ];

    await insertLedgerEntries(batch);

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('ledger_insert_batch', {
      entries: batch,
    });
  });

  it('throws when RPC returns error', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValueOnce({
      error: new Error('db failure'),
    });

    await expect(
      insertLedgerEntries([
        {
          account_id: 'uuid-1',
          stripe_object_id: 'obj',
          event_type: 'test',
          amount_cents: 1,
          currency: 'usd',
        },
      ]),
    ).rejects.toThrow('db failure');
  });
});
