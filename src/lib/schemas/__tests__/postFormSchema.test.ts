import { PostFormSchema } from '../postSchemas'

describe('PostFormSchema', () => {
  it('requires meaningful content', () => {
    const result = PostFormSchema.safeParse({
      title: 'test',
      content: JSON.stringify({root:{children:[{type:'text',text:'hi'}]}}),
      status: 'draft'
    })
    expect(result.success).toBe(false)
  })

  it('passes with valid content', () => {
    // Create content with 100+ characters to meet minimum requirement
    const longContent = 'This is a much longer piece of content that definitely exceeds the minimum character requirement. It provides meaningful text that would be suitable for a blog post or article with substantial content.'
    
    const result = PostFormSchema.safeParse({
      title: 'test',
      content: JSON.stringify({root:{children:[{type:'text',text: longContent}]}}),
      status: 'draft'
    })
    expect(result.success).toBe(true)
  })

  it('rejects content that is too short', () => {
    const result = PostFormSchema.safeParse({
      title: 'Valid Title',
      content: JSON.stringify({root:{children:[{type:'text',text:'Too short'}]}}),
      status: 'draft'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('meaningful text')
    }
  })

  it('handles invalid JSON content gracefully', () => {
    const result = PostFormSchema.safeParse({
      title: 'Valid Title',
      content: 'invalid json content',
      status: 'draft'
    })
    expect(result.success).toBe(false)
  })
})
