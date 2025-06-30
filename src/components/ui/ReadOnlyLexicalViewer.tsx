'use client';

import * as React from 'react';
import { Suspense, lazy } from 'react';

import { ReadOnlyLexicalViewerClient } from './ReadOnlyLexicalViewerClient';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface ReadOnlyLexicalViewerProps {
  contentJSON: string;
  contentFormat?: 'json' | 'markdown' | 'auto';
}

function MarkdownRenderer({ content }: { content: string }): React.JSX.Element {
  const [remarkGfm, setRemarkGfm] = React.useState<any>(null);

  React.useEffect(() => {
    import('remark-gfm').then((module) => {
      setRemarkGfm(() => module.default);
    });
  }, []);

  if (!remarkGfm) {
    return <div>Loading markdown...</div>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Links open in new tab with security attributes
        a: ({ children, href, ...props }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            {...props}
          >
            {children}
          </a>
        ),

        // Code blocks with proper styling
        pre: ({ children, ...props }) => (
          <pre
            className="bg-muted p-3 rounded-md overflow-x-auto my-2 font-mono text-sm"
            {...props}
          >
            {children}
          </pre>
        ),

        // Inline code styling
        code: ({ children, className, ...props }) => {
          const isInline = !className;
          return isInline ? (
            <code
              className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },

        // Images with max width
        img: ({ src, alt, ...props }) => (
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg"
            loading="lazy"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ReadOnlyLexicalViewer({
  contentJSON,
  contentFormat = 'auto',
}: ReadOnlyLexicalViewerProps): React.JSX.Element {
  // Handle empty content
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

  let isLexicalJson = false;
  let isMarkdown = false;

  // Determine content format
  if (contentFormat === 'auto') {
    // Try to parse and validate JSON
    try {
      const parsed = JSON.parse(contentJSON) as unknown;
      if (
        parsed !== undefined &&
        parsed !== null &&
        typeof parsed === 'object' &&
        (parsed as Record<string, unknown>)['root'] !== undefined &&
        (parsed as Record<string, unknown>)['root'] !== null
      ) {
        isLexicalJson = true;
      }
    } catch {
      // Not valid JSON
    }

    // If not Lexical JSON, assume it's markdown
    if (!isLexicalJson) {
      isMarkdown = true;
    }
  } else if (contentFormat === 'json') {
    isLexicalJson = true;
  } else if (contentFormat === 'markdown') {
    isMarkdown = true;
  }

  // Render Lexical JSON with the client component
  if (isLexicalJson) {
    return <ReadOnlyLexicalViewerClient contentJSON={contentJSON} />;
  }

  // Render Markdown content
  if (isMarkdown) {
    return (
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <Suspense fallback={<div>Loading content...</div>}>
          <MarkdownRenderer content={contentJSON} />
        </Suspense>
      </div>
    );
  }

  // Fallback: render as plain text
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <p className="whitespace-pre-wrap">{contentJSON}</p>
    </div>
  );
}
