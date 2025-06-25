// Supabase client mocking utilities

type MockSupabaseClient = {
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
  };
  from: jest.Mock;
  rpc: jest.Mock;
};

type MockSupabaseResponse = {
  data: unknown;
  error: unknown;
  count: number | undefined;
  status: number;
  statusText: string;
}

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
}

const createMockResponse = (data: unknown = undefined, error: unknown = undefined): MockSupabaseResponse => ({
  data,
  error,
  count: undefined,
  status: 200,
  statusText: 'OK',
})

const mockSupabaseClient: MockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
}

// Setup default mock implementations
export const setupDefaultMocks = (): void => {
  // Mock successful authentication
  mockSupabaseClient.auth.getUser.mockResolvedValue(
    createMockResponse(mockUser)
  )

  mockSupabaseClient.auth.getSession.mockResolvedValue(
    createMockResponse(mockSession)
  )

  // Mock database operations
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(createMockResponse(mockUser)),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }

  mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)
  mockSupabaseClient.rpc.mockResolvedValue(createMockResponse([]))
}

// Reset all mocks
export const resetMocks = (): void => {
  jest.clearAllMocks()
  setupDefaultMocks()
}

// Export the mock client
export { mockSupabaseClient }

// Helper functions for common test scenarios
export const mockAuthenticatedUser = (userData = mockUser): void => {
  mockSupabaseClient.auth.getUser.mockResolvedValue(createMockResponse(userData))
}

export const mockUnauthenticatedUser = (): void => {
  mockSupabaseClient.auth.getUser.mockResolvedValue(createMockResponse(undefined))
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return mockSupabaseClient;
}

export const mockSupabaseUser = (userData: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'test-user-id',
  email: 'test@example.com',
  ...userData,
})

export const mockSupabaseSession = (sessionData: Record<string, unknown> = {}): Record<string, unknown> => ({
  access_token: 'mock-access-token',
  user: mockSupabaseUser(),
  ...sessionData,
})

export const createMockAuthResult = (
  user: Record<string, unknown> = mockSupabaseUser(),
  session: Record<string, unknown> = mockSupabaseSession()
): Record<string, unknown> => ({
  data: { user, session },
  error: undefined,
})

export const createMockError = (message = 'Mock error'): Record<string, unknown> => ({
  message,
  status: 400,
})

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
export const mockSupabaseResponse = <T>(data: T, error = null): { data: T, error: unknown } => ({
  data,
  error,
})

// Helper to mock error responses
export const mockSupabaseError = (message = 'Database error'): { data: null, error: { message: string, code: string, details: null, hint: null } } => ({
  data: null,
  error: {
    message,
    code: 'PGRST116',
    details: null,
    hint: null,
  },
}) 