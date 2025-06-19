// @ts-nocheck
import { GET, POST } from './route';
import { createServerSupabaseClient } from '../../../../../lib/supabase/server';

jest.mock('../../../../../lib/supabase/server', () => ({
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

describe('Channels API', () => {
  let supabase;
  const params = { collectiveId: 'col123' };

  beforeEach(() => {
    supabase = { auth: { getUser: jest.fn() }, from: jest.fn() };
    createServerSupabaseClient.mockReturnValue(supabase);
  });

  describe('GET /api/collectives/:collectiveId/channels', () => {
    test('returns 401 if unauthorized', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await GET(new Request('http://localhost'), { params });
      expect(res.status).toBe(401);
    });

    test('returns 403 if not a member', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builder1 = new Query(null, null);
      supabase.from.mockReturnValueOnce(builder1);
      const res = await GET(new Request('http://localhost'), { params });
      expect(res.status).toBe(403);
    });

    test('returns 500 if membership check errors', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builder1 = new Query(undefined, { message: 'memberErr' });
      supabase.from.mockReturnValueOnce(builder1);
      const res = await GET(new Request('http://localhost'), { params });
      expect(res.status).toBe(500);
    });

    test('returns list of channels on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builderMember = new Query({ role: 'member' }, null);
      const channels = [
        { id: 'c1', title: 'Chan1', type: 'channel', created_at: '2023-01-01' },
      ];
      const builderChan = new Query(channels, null);
      supabase.from.mockReturnValueOnce(builderMember).mockReturnValueOnce(builderChan);

      const res = await GET(new Request('http://localhost'), { params });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(channels);
    });
  });

  describe('POST /api/collectives/:collectiveId/channels', () => {
    test('returns 401 if unauthorized', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ title: 'T' }) }), { params });
      expect(res.status).toBe(401);
    });

    test('returns 403 if not admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builder1 = new Query({ role: 'member' }, null);
      supabase.from.mockReturnValueOnce(builder1);
      const res = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ title: 'T' }), headers: { 'Content-Type': 'application/json' } }), { params });
      expect(res.status).toBe(403);
    });

    test('returns 400 for invalid JSON', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builder1 = new Query({ role: 'admin' }, null);
      supabase.from.mockReturnValueOnce(builder1);
      const res = await POST(new Request('http://localhost', { method: 'POST', body: 'invalid' }), { params });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid body', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builder1 = new Query({ role: 'admin' }, null);
      supabase.from.mockReturnValueOnce(builder1);
      const res = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } }), { params });
      expect(res.status).toBe(400);
    });

    test('creates a new channel on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builderMember = new Query({ role: 'admin' }, null);
      const builderCreate = new Query({ id: 'ch1' }, null);
      supabase.from.mockReturnValueOnce(builderMember).mockReturnValueOnce(builderCreate);

      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ title: 'New Channel' }), headers: { 'Content-Type': 'application/json' } });
      const res = await POST(req, { params });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.conversationId).toBe('ch1');
    });

    test('returns 500 if creation fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const builderMember = new Query({ role: 'admin' }, null);
      const builderErr = new Query(null, { message: 'convErr' });
      supabase.from.mockReturnValueOnce(builderMember).mockReturnValueOnce(builderErr);

      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ title: 'New Channel' }), headers: { 'Content-Type': 'application/json' } });
      const res = await POST(req, { params });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('convErr');
    });
  });
}); 