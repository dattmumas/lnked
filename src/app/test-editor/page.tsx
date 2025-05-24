'use client';

import PostEditor from '@/components/editor/PostEditor';
import { useState } from 'react';

export default function TestEditorPage() {
  const [content, setContent] = useState('');

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Lexical Editor Test</h1>
      <p className="text-gray-600 mb-6">
        Test the slash command by typing "/" in the editor below. This should
        open a menu with various formatting options.
      </p>
      <div className="border rounded-lg">
        <PostEditor
          placeholder="Type '/' to open the command menu..."
          onChange={(json) => setContent(json)}
        />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-500">
          Show raw content (for debugging)
        </summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {content || 'No content yet'}
        </pre>
      </details>
    </div>
  );
}
