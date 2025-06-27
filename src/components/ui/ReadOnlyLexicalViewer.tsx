import * as React from 'react';

import { ReadOnlyLexicalViewerClient } from './ReadOnlyLexicalViewerClient';

interface ReadOnlyLexicalViewerProps {
  contentJSON: string;
}

export function ReadOnlyLexicalViewer({
  contentJSON,
}: ReadOnlyLexicalViewerProps): React.JSX.Element {
  // Simple fallback for plain text content
  if (
    contentJSON === undefined ||
    contentJSON === null ||
    contentJSON.trim() === ''
  ) {
    return (
      <div className="text-muted-foreground italic text-center py-8">
        No content available.
      </div>
    );
  }

  // Try to parse and validate JSON
  try {
    const parsed = JSON.parse(contentJSON) as unknown;
    if (
      parsed === undefined ||
      parsed === null ||
      typeof parsed !== 'object' ||
      (parsed as Record<string, unknown>)['root'] === undefined ||
      (parsed as Record<string, unknown>)['root'] === null
    ) {
      // Not valid Lexical JSON, show as plain text
      return (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{contentJSON}</p>
        </div>
      );
    }
  } catch {
    // Not valid JSON, show as plain text
    return (
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap">{contentJSON}</p>
      </div>
    );
  }

  return <ReadOnlyLexicalViewerClient contentJSON={contentJSON} />;
}
