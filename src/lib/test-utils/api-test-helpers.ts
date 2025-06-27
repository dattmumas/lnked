import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_STATUS = 200;
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 300;

// Helper to create mock NextRequest objects for API route testing
export const createTestRequest = (
  url: string,
  options: {
    method?: string
    body?: string | object
    headers?: Record<string, string>
    params?: Record<string, string>
  } = {}
): NextRequest => {
  const { method = 'GET', body, headers = {}, params = {} } = options
  
  const request = new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  // Mock params for dynamic routes
  if (Object.keys(params).length > 0) {
    // @ts-expect-error - Adding params for testing
    request.params = params
  }

  return request
}

// Helper to create authenticated test requests
export const createAuthenticatedRequest = (
  url: string,
  userId: string,
  options: Parameters<typeof createTestRequest>[1] = {}
): NextRequest => {
  return createTestRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer mock-jwt-${userId}`,
    },
  })
}

// Helper to extract JSON from Response
export const getResponseData = async (response: Response | NextResponse): Promise<unknown> => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Mock response interface
interface MockResponse {
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}

// Helper to create mock responses for testing
export const createMockResponse = (data: unknown, status = DEFAULT_STATUS): MockResponse => ({
  json: (): Promise<unknown> => Promise.resolve(data),
  ok: status >= SUCCESS_STATUS_MIN && status < SUCCESS_STATUS_MAX,
  status,
})

// Helper to extract form data for testing
export const extractFormData = async (request: Request): Promise<Record<string, unknown>> => {
  const formData = await request.formData()
  const result: Record<string, unknown> = {}
  
  formData.forEach((value, key) => {
    result[key] = value
  })
  
  return result
} 