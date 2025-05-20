import { CollectiveSettingsClientSchema } from '../collectiveSettingsSchema'

describe('CollectiveSettingsClientSchema', () => {
  it('allows valid data', () => {
    const result = CollectiveSettingsClientSchema.safeParse({
      name: 'My Collective',
      slug: 'my-collective',
      description: 'test',
      tags_string: 'a,b,c'
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug', () => {
    const result = CollectiveSettingsClientSchema.safeParse({
      name: 'Test',
      slug: 'Bad Slug!!',
    })
    expect(result.success).toBe(false)
  })
})
