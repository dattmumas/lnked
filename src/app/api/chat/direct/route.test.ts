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

describe('POST /api/chat/direct', () => {
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
      body: JSON.stringify({ recipientId: '00000000-0000-0000-0000-000000000000' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  test('returns 400 for invalid JSON', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'sender' } }, error: null });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  test('returns 400 for invalid body', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'sender' } }, error: null });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipientId: 'not-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid body');
  });

  test('returns existing conversationId if found', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'sender' } }, error: null });
    const builder1 = new Query([{ conversation_id: 'conv1' }], null);
    const builder2 = new Query([{ conversation_id: 'conv1' }], null);
    const builder3 = new Query({ id: 'conv1' }, null);
    supabase.from.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2).mockReturnValueOnce(builder3);

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipientId: '11111111-1111-1111-1111-111111111111' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conversationId).toBe('conv1');
  });

  test('creates a new conversation if none exists', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'sender' } }, error: null });
    const builder1 = new Query([], null);
    const builder2 = new Query({ id: 'newconv' }, null);
    const builder3 = new Query(null, null);
    supabase.from.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2).mockReturnValueOnce(builder3);

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipientId: '22222222-2222-2222-2222-222222222222' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.conversationId).toBe('newconv');
  });
}); 