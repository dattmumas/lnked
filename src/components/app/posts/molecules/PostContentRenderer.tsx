'use client';

import parse from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useMemo } from 'react';

import { transformImageUrls } from '@/lib/utils/transform-image-urls';

interface PostContentRendererProps {
  content: string | null | undefined;
  className?: string;
}

export default function PostContentRenderer({
  content,
  className = 'article-content',
}: PostContentRendererProps): React.ReactElement {
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';
    return DOMPurify.sanitize(transformImageUrls(content), {
      USE_PROFILES: { html: true },
    });
  }, [content]);

  return (
    <div className={className}>
      {content ? (
        // Check if content contains HTML tags - same logic as PostViewer
        content.includes('<') && content.includes('>') ? (
          parse(sanitizedHtml)
        ) : (
          // Render plain text with preserved line breaks
          <div className="whitespace-pre-wrap">{content}</div>
        )
      ) : (
        <p className="text-muted-foreground">*(No content)*</p>
      )}
    </div>
  );
}
