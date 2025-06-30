/**
 * Example: Using Markdown with Lexical Editor
 *
 * This demonstrates how to:
 * 1. Load markdown content into the editor
 * 2. Export content as markdown
 * 3. Render markdown content in read-only views
 */

// Example 1: Using the editor with markdown content
export const markdownEditorExample = `
import PostEditor from '@/components/editor/PostEditor';

function MyComponent() {
  // Markdown content to load
  const markdownContent = \`# My Post Title

This is a **bold** paragraph with *italic* text.

## Features
- Bullet point 1
- Bullet point 2
- Bullet point 3

### Code Example
\\\`\\\`\\\`javascript
function hello() {
  console.log("Hello, Markdown!");
}
\\\`\\\`\\\`

> This is a blockquote

[Link to Google](https://google.com)

![Image Alt Text](https://example.com/image.jpg)
\`;

  // Handle content changes - now receives both JSON and markdown
  const handleChange = (json: string) => {
    // JSON is still the primary format for saving
    console.log('Lexical JSON:', json);
  };

  const handleMarkdownChange = (markdown: string) => {
    // Optional: also get the markdown version
    console.log('Markdown:', markdown);
  };

  return (
    <PostEditor
      initialContent={markdownContent}
      contentFormat="markdown" // Tell editor to parse as markdown
      onChange={handleChange}
      onMarkdownChange={handleMarkdownChange}
      placeholder="Start writing..."
    />
  );
}
`;

// Example 2: Rendering markdown content
export const markdownViewerExample = `
import { ReadOnlyLexicalViewer } from '@/components/ui/ReadOnlyLexicalViewer';

function ViewPost({ post }) {
  // The viewer auto-detects format, but you can be explicit
  return (
    <ReadOnlyLexicalViewer 
      contentJSON={post.content}
      contentFormat="auto" // or "markdown" or "json"
    />
  );
}
`;

// Example 3: Converting between formats
export const conversionExample = `
// If you need server-side conversion (using @lexical/headless)
import { createHeadlessEditor } from '@lexical/headless';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { PLAYGROUND_TRANSFORMERS } from '@/components/editor/plugins/formatting/MarkdownTransformers';
import PlaygroundNodes from '@/components/editor/nodes/PlaygroundNodes';

// Convert Lexical JSON to Markdown on server
export function jsonToMarkdown(jsonString: string): string {
  const editor = createHeadlessEditor({
    nodes: [...PlaygroundNodes],
  });
  
  editor.setEditorState(editor.parseEditorState(jsonString));
  
  let markdown = '';
  editor.update(() => {
    markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
  });
  
  return markdown;
}

// Convert Markdown to Lexical JSON on server
export function markdownToJson(markdown: string): string {
  const editor = createHeadlessEditor({
    nodes: [...PlaygroundNodes],
  });
  
  editor.update(() => {
    $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS);
  });
  
  return JSON.stringify(editor.getEditorState());
}
`;

// Example 4: Full integration in a post form
export const fullIntegrationExample = `
import { useState } from 'react';
import PostEditor from '@/components/editor/PostEditor';

function CreatePostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [markdown, setMarkdown] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to database - you can save both JSON and markdown
    await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content, // Lexical JSON for editing
        // Optional: save markdown for search/preview
        content_markdown: markdown,
      }),
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title..."
      />
      
      <PostEditor
        onChange={setContent}
        onMarkdownChange={setMarkdown}
        placeholder="Write your post in markdown..."
        contentFormat="auto" // Accepts both formats
      />
      
      <button type="submit">Save Post</button>
      
      {/* Optional: Show markdown preview */}
      <details>
        <summary>Markdown Preview</summary>
        <pre>{markdown}</pre>
      </details>
    </form>
  );
}
`;

// Supported markdown features
export const supportedMarkdownFeatures = `
# Supported Markdown Features

## Text Formatting
- **Bold** text
- *Italic* text  
- ~~Strikethrough~~ text
- \`inline code\`

## Headings
# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading

## Lists
### Unordered
- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

### Ordered
1. First item
2. Second item
   1. Nested item
   2. Another nested
3. Third item

### Checklists
- [ ] Unchecked item
- [x] Checked item
- [ ] Another unchecked

## Links and Images
[Link text](https://example.com)
![Alt text](https://example.com/image.jpg)

## Code Blocks
\`\`\`javascript
function example() {
  return "Hello, World!";
}
\`\`\`

## Blockquotes
> This is a quote
> It can span multiple lines

## Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## Horizontal Rules
---
***
___

## Special Features (via Lexical transformers)
- Equations: $E = mc^2$
- Emoji shortcuts: :smile: → 😊
- Tweet embeds: <tweet id="1234567890" />
`;
