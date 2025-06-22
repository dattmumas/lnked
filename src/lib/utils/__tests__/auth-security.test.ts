import {
  AuthSecurityValidator,
  CookieSecurityManager,
  SessionManager,
  AuthCallbackSchema,
  type AuthCallbackPayload,
} from '../auth-security';

// Mock NextRequest for testing
const createMockRequest = (overrides: Partial<any> = {}): any => ({
  headers: {
    get: jest.fn((name: string) => {
      const headers: Record<string, string> = {
        'x-supabase-csrf': 'valid-csrf-token',
        'origin': 'http://localhost:3000',
        'content-type': 'application/json',
        'content-length': '100',
        'sec-fetch-site': 'same-origin',
        ...overrides.headers,
      };
      return headers[name] || null;
    }),
  },
  body: overrides.body || null,
  ...overrides,
});

const mockLogger = {
  warn: jest.fn(),
};

describe('Auth Security Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthCallbackSchema', () => {
    it('validates valid auth callback payload', () => {
      const validPayload: AuthCallbackPayload = {
        event: 'SIGNED_IN',
        session: {
          access_token: 'valid-access-token',
          refresh_token: 'valid-refresh-token',
          expires_at: Date.now() + 3600000,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: '12345678-1234-1234-1234-123456789012',
            email: 'test@example.com',
          },
        },
      };

      const result = AuthCallbackSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid event types', () => {
      const invalidPayload = {
        event: 'INVALID_EVENT',
        session: null,
      };

      const result = AuthCallbackSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('validates SIGNED_OUT event with no session', () => {
      const signOutPayload: AuthCallbackPayload = {
        event: 'SIGNED_OUT',
        session: undefined,
      };

      const result = AuthCallbackSchema.safeParse(signOutPayload);
      expect(result.success).toBe(true);
    });

    it('requires valid UUID for user ID', () => {
      const invalidPayload = {
        event: 'SIGNED_IN',
        session: {
          access_token: 'valid-access-token',
          refresh_token: 'valid-refresh-token',
          expires_at: Date.now() + 3600000,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'invalid-uuid',
            email: 'test@example.com',
          },
        },
      };

      const result = AuthCallbackSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('AuthSecurityValidator', () => {
    describe('validateRequest', () => {
      it('validates valid request', async () => {
        const request = createMockRequest();
        const result = await AuthSecurityValidator.validateRequest(request, mockLogger);
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects request without CSRF token', async () => {
        const request = createMockRequest({
          headers: { 'x-supabase-csrf': null },
        });
        
        const result = await AuthSecurityValidator.validateRequest(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Missing CSRF token');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Missing CSRF token',
          expect.objectContaining({ clientIP: 'unknown' })
        );
      });

      it('rejects request with invalid origin', async () => {
        const request = createMockRequest({
          headers: { origin: 'https://malicious-site.com' },
        });
        
        const result = await AuthSecurityValidator.validateRequest(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid origin');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Origin not in allowlist',
          expect.objectContaining({ origin: 'https://malicious-site.com' })
        );
      });

      it('rejects cross-site requests', async () => {
        const request = createMockRequest({
          headers: { 'sec-fetch-site': 'cross-site' },
        });
        
        const result = await AuthSecurityValidator.validateRequest(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid cross-site request');
      });

      it('handles missing origin and referer', async () => {
        const request = createMockRequest({
          headers: { origin: null, referer: null },
        });
        
        const result = await AuthSecurityValidator.validateRequest(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Missing origin and referer headers');
      });
    });

    describe('validateBody', () => {
      const createMockBodyStream = (content: string) => ({
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(content),
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined,
            }),
        }),
      });

      it('validates valid JSON body', async () => {
        const validPayload = {
          event: 'SIGNED_IN',
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer',
            user: { id: '12345678-1234-1234-1234-123456789012' },
          },
        };

        const request = createMockRequest({
          body: createMockBodyStream(JSON.stringify(validPayload)),
        });
        
        const result = await AuthSecurityValidator.validateBody(request, mockLogger);
        
        expect(result.valid).toBe(true);
        expect(result.body).toEqual(validPayload);
      });

      it('rejects invalid content type', async () => {
        const request = createMockRequest({
          headers: { 'content-type': 'text/plain' },
        });
        
        const result = await AuthSecurityValidator.validateBody(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid content-type');
      });

      it('rejects oversized body via Content-Length', async () => {
        const request = createMockRequest({
          headers: { 'content-length': '1000000' }, // 1MB
        });
        
        const result = await AuthSecurityValidator.validateBody(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Body too large');
      });

      it('handles JSON parsing errors', async () => {
        const request = createMockRequest({
          body: createMockBodyStream('invalid json'),
        });
        
        const result = await AuthSecurityValidator.validateBody(request, mockLogger);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unexpected token');
      });
    });

    describe('generateCSRFToken', () => {
      it('generates valid CSRF tokens', () => {
        const token1 = AuthSecurityValidator.generateCSRFToken();
        const token2 = AuthSecurityValidator.generateCSRFToken();
        
        expect(token1).toBeTruthy();
        expect(token2).toBeTruthy();
        expect(token1).not.toBe(token2);
        expect(typeof token1).toBe('string');
      });
    });
  });

  describe('SessionManager', () => {
    describe('validateSessionIntegrity', () => {
      it('validates valid session response', () => {
        const validResponse = {
          data: {
            user: { id: 'user-123', email: 'test@example.com' },
            session: {
              access_token: 'token',
              refresh_token: 'refresh',
              expires_at: Date.now() + 3600000,
              expires_in: 3600,
              token_type: 'bearer',
              user: { id: 'user-123', email: 'test@example.com' },
            },
          },
          error: null,
        };

        const result = SessionManager.validateSessionIntegrity(validResponse);
        
        expect(result.valid).toBe(true);
        expect(result.session).toEqual(validResponse.data.session);
      });

      it('handles error response', () => {
        const errorResponse = {
          data: { user: null, session: null },
          error: { message: 'Authentication failed' },
        };

        const result = SessionManager.validateSessionIntegrity(errorResponse);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Authentication failed');
      });

      it('validates user ID match', () => {
        const response = {
          data: {
            user: { id: 'user-123' },
            session: {
              access_token: 'token',
              refresh_token: 'refresh',
              expires_at: Date.now() + 3600000,
              expires_in: 3600,
              token_type: 'bearer',
              user: { id: 'user-123' },
            },
          },
          error: null,
        };

        const result = SessionManager.validateSessionIntegrity(response, 'user-456');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Session user ID mismatch');
      });

      it('handles missing session', () => {
        const response = {
          data: { user: null, session: null },
          error: null,
        };

        const result = SessionManager.validateSessionIntegrity(response);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Session not found in setSession result');
      });
    });
  });

  describe('CookieSecurityManager', () => {
    describe('enforceSecurityFlags', () => {
      it('handles production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const mockResponse = {
          headers: {
            forEach: jest.fn(),
            delete: jest.fn(),
            append: jest.fn(),
          },
        } as any;

        // Should not throw in production
        expect(() => {
          CookieSecurityManager.enforceSecurityFlags(mockResponse);
        }).not.toThrow();

        process.env.NODE_ENV = originalEnv;
      });

      it('skips processing in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const mockResponse = {
          headers: {
            forEach: jest.fn(),
            delete: jest.fn(),
            append: jest.fn(),
          },
        } as any;

        CookieSecurityManager.enforceSecurityFlags(mockResponse);

        // Should not call any header methods in development
        expect(mockResponse.headers.forEach).not.toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
      });
    });
  });
}); 