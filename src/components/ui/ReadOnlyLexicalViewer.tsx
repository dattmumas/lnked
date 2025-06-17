import { ReadOnlyLexicalViewerClient } from './ReadOnlyLexicalViewerClient';

interface ReadOnlyLexicalViewerProps {
  contentJSON: string;
}

export function ReadOnlyLexicalViewer({
  contentJSON,
}: ReadOnlyLexicalViewerProps) {
  // Simple fallback for plain text content
  if (!contentJSON || !contentJSON.trim()) {
    return (
      <div className="text-muted-foreground italic text-center py-8">
        No content available.
      </div>
    );
  }

  // Try to parse and validate JSON
  try {
    const parsed = JSON.parse(contentJSON);
    if (!parsed || typeof parsed !== 'object' || !parsed.root) {
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
