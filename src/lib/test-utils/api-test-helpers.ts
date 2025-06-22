import { NextRequest, NextResponse } from 'next/server'

// Helper to create mock NextRequest objects for API route testing
export const createTestRequest = (
  url: string,
  options: {
    method?: string
    body?: string | object
    headers?: Record<string, string>
    params?: Record<string, string>
  } = {}
) => {
  const { method = 'GET', body, headers = {}, params = {} } = options
  
  const requestBody = typeof body === 'object' ? JSON.stringify(body) : body
  
  const request = new NextRequest(url, {
    method,
    body: requestBody,
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
) => {
  return createTestRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer mock-jwt-${userId}`,
    },
  })
}

// Helper to extract JSON from Response
export const getResponseData = async (response: Response | NextResponse) => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
} 