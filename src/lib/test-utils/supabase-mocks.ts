// Supabase client mocking utilities

export const createMockSupabaseClient = (): any => {
  const mockSupabase: any = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    insert: jest.fn(() => mockSupabase),
    update: jest.fn(() => mockSupabase),
    delete: jest.fn(() => mockSupabase),
    upsert: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    neq: jest.fn(() => mockSupabase),
    in: jest.fn(() => mockSupabase),
    contains: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    limit: jest.fn(() => mockSupabase),
    range: jest.fn(() => mockSupabase),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: jest.fn(() => Promise.resolve({ data: [], error: null })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  }

  return mockSupabase
}

// Helper to create authenticated mock client
export const createAuthenticatedMockClient = (userId = 'test-user-123') => {
  const client = createMockSupabaseClient()
  
  client.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
    error: null,
  })

  client.auth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: userId,
          email: 'test@example.com',
        },
      },
    },
    error: null,
  })

  return client
}

// Helper to mock successful data responses
export const mockSupabaseResponse = <T>(data: T, error = null) => ({
  data,
  error,
})

// Helper to mock error responses
export const mockSupabaseError = (message = 'Database error') => ({
  data: null,
  error: {
    message,
    code: 'PGRST116',
    details: null,
    hint: null,
  },
}) 