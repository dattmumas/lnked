// @ts-nocheck
import { POST } from './route';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';

jest.mock('../../../../lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

class Query {
  constructor(data, error) {
    this._data = data;
    this._error = error;
    this._builder = () => this;
    this.select = this._builder;
    this.eq = this._builder;
    this.in = this._builder;
    this.order = this._builder;
    this.insert = this._builder;
    this.delete = this._builder;
    this.then = (resolve, reject) =>
      Promise.resolve({ data: this._data, error: this._error }).then(resolve, reject);
  }
  maybeSingle() {
    return Promise.resolve({ data: this._data, error: this._error });
  }
  single() {
    return Promise.resolve({ data: this._data, error: this._error });
  }
}

describe('POST /api/chat/group', () => {
  let supabase;

  beforeEach(() => {
    supabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(),
    };
    createServerSupabaseClient.mockReturnValue(supabase);
  });

  test('returns 401 if unauthorized', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ participantIds: ['11111111-1111-1111-1111-111111111111'], title: 'Test' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid JSON', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u0' } }, error: null });
    const req = new Request('http://localhost', { method: 'POST', body: 'not json' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when no other participants', async () => {
    const creatorUuid = '00000000-0000-0000-0000-000000000000';
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: creatorUuid } }, error: null });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        participantIds: [creatorUuid],
        title: 'Test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cannot create a group without other participants.');
  });

  test('creates a new group conversation', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'creator' } }, error: null });
    const builder1 = new Query({ id: 'conv1' }, null);
    const builder2 = new Query(null, null);
    supabase.from.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2);

    const body = { participantIds: ['11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000'], title: 'Group Chat' };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.conversationId).toBe('conv1');
  });

  test('returns 500 if conversation creation fails', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'creator' } }, error: null });
    const builder1 = new Query(null, { message: 'create error' });
    supabase.from.mockReturnValueOnce(builder1);

    const body = { participantIds: ['11111111-1111-1111-1111-111111111111'], title: 'Group Chat' };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('create error');
  });

  test('returns 500 if participants insertion fails and rolls back', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'creator' } }, error: null });
    const builderInsertConv = new Query({ id: 'conv1' }, null);
    const builderInsertPart = new Query(null, { message: 'part error' });
    const builderRollback = new Query(null, null);
    supabase.from
      .mockReturnValueOnce(builderInsertConv)
      .mockReturnValueOnce(builderInsertPart)
      .mockReturnValueOnce(builderRollback);

    const body = { participantIds: ['11111111-1111-1111-1111-111111111111'], title: 'Group Chat' };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('part error');
  });
}); 