import fs from 'fs/promises';
import { execSync } from 'child_process';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. load ESLint results
const errors = JSON.parse(await fs.readFile('eslint.json', 'utf8'));

// 2. Keep only the scary ones (you can change the list)
const MUST_FIX = new Set([
  'import/named',
  '@typescript-eslint/no-unsafe-member-access',
  '@typescript-eslint/no-unsafe-assignment',
]);

// 3. helper: grab 60 lines around the error
async function context(file, line) {
  const code = (await fs.readFile(file, 'utf8')).split('\n');
  const start = Math.max(0, line - 30);
  const end = Math.min(code.length, line + 30);
  return code.slice(start, end).join('\n');
}

// 4. loop through errors
for (const item of errors) {
  const { filePath, messages } = item;
  for (const m of messages) {
    if (!MUST_FIX.has(m.ruleId)) continue;

    const snippet = await context(filePath, m.line);
    const prompt = [
      { role: 'system', content: 'You are a senior TypeScript engineer.' },
      {
        role: 'user',
        content: `Fix this ESLint error without changing behaviour.

File: ${filePath}
Rule: ${m.ruleId}  Message: ${m.message}

\`\`\`typescript
${snippet}
\`\`\`

Return ONLY a git diff.`,
      },
    ];

    // ask Codex (GPT‑4o)
    const reply = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: prompt,
    });

    const diff = reply.choices[0].message.content.trim();
    if (!diff.startsWith('diff')) continue;

    // write patch to temp file
    await fs.writeFile('.codex.patch', diff);
    try {
      execSync('git apply --reject --whitespace=fix .codex.patch', {
        stdio: 'inherit',
      });
      console.log('✅ patched', filePath);
    } catch {
      console.log('⚠️  could not patch', filePath);
    }
  }
}

execSync('rm -f .codex.patch');
console.log('All done.  Run "npm test" or "npm run lint" again!');
