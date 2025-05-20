import { truncateText } from '../PostCard'

// Mock like actions to avoid importing server-side logic in tests
jest.mock('../../../../../app/actions/likeActions', () => ({
  togglePostLike: jest.fn(async () => ({ success: true })),
}))

jest.mock('../../../../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}))

describe('truncateText', () => {
  it('returns empty string for null', () => {
    expect(truncateText(null)).toBe('')
  })
  it('truncates long text', () => {
    const text = 'a'.repeat(200)
    expect(truncateText(text, 10)).toBe('a'.repeat(10) + '...')
  })
  it('does not truncate short text', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })
})
