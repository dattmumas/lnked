import { truncateText } from '../PostCard'

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
