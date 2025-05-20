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
    const result = PostFormSchema.safeParse({
      title: 'test',
      content: JSON.stringify({root:{children:[{type:'text',text:'Hello world!'}]}}),
      status: 'draft'
    })
    expect(result.success).toBe(true)
  })
})
