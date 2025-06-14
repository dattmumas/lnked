#!/usr/bin/env ts-node

/**
 * codex-agent.ts
 *
 * A simple REPL for OpenAI’s Codex (code-davinci-002).
 * Prompts you with `Codex> `, sends each line to the API,
 * and prints out a fenced TypeScript snippet.
 */

import readline from 'readline'
import { Configuration, OpenAIApi } from 'openai'

// 1. Ensure API key is set
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌  Missing OPENAI_API_KEY in environment.')
  process.exit(1)
}

// 2. Configure client
const client = new OpenAIApi(new Configuration({ apiKey }))

// 3. Build readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[36mCodex>\x1b[0m ',
})

// 4. Prompt loop
console.log('🤖 Codex REPL — enter code prompts, empty line to exit.')
rl.prompt()

rl.on('line', async (line) => {
  const prompt = line.trim()
  if (!prompt) return rl.close()

  try {
    const resp = await client.createCompletion({
      model: 'code-davinci-002',
      prompt,
      max_tokens: 256,
      temperature: 0.2,
      n: 1,
      stop: ['```'],
    })

    const code = resp.data.choices?.[0].text?.trim() || ''
    console.log('\n```typescript')
    console.log(code)
    console.log('```')
  } catch (err: any) {
    console.error('❌ API error:', err.message || err)
  }

  rl.prompt()
})

rl.on('close', () => {
  console.log('\n👋 Goodbye!')
  process.exit(0)
})
