'use client';
import * as React from 'react';
import Image from 'next/image';

interface LexicalNode {
  type: string;
  [key: string]: unknown;
  children?: LexicalNode[];
}

interface LexicalRendererProps {
  contentJSON: string | object;
}

function ErrorFallback({ content }: { content: string }) {
  return (
    <div className="bg-muted/10 border border-muted rounded-lg p-6 my-4">
      <p className="text-muted-foreground text-sm mb-2">
        Unable to render content properly. Showing as text:
      </p>
      <div className="prose prose-sm dark:prose-invert">
        <p>{content}</p>
      </div>
    </div>
  );
}

export function LexicalRenderer({ contentJSON }: LexicalRendererProps) {
  let contentObj: Record<string, unknown> | null = null;

  try {
    if (typeof contentJSON === 'string') {
      if (!contentJSON.trim()) {
        return (
          <p className="text-muted-foreground italic">No content available.</p>
        );
      }
      contentObj = JSON.parse(contentJSON);
    } else if (
      contentJSON &&
      typeof contentJSON === 'object' &&
      !Array.isArray(contentJSON)
    ) {
      contentObj = contentJSON as Record<string, unknown>;
    } else {
      throw new Error('Invalid content format');
    }
  } catch (parseError) {
    console.warn('Failed to parse content JSON:', parseError);
    // Return error fallback immediately instead of setting state
    const htmlString = typeof contentJSON === 'string' ? contentJSON : '';
    return <ErrorFallback content={htmlString} />;
  }

  // If parsing failed or root missing, treat as raw HTML or text
  if (
    !contentObj ||
    typeof contentObj.root !== 'object' ||
    !contentObj.root ||
    !Array.isArray((contentObj.root as { children?: LexicalNode[] }).children)
  ) {
    const htmlString = typeof contentJSON === 'string' ? contentJSON : '';

    // Check if it looks like HTML
    if (htmlString.includes('<') && htmlString.includes('>')) {
      return (
        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12
            prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
            prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
            prose-p:text-xl prose-p:leading-relaxed prose-p:mb-6 prose-p:text-foreground/90
            prose-li:text-xl prose-li:leading-relaxed prose-li:marker:text-muted-foreground
            prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30 
            prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-xl
            prose-code:text-base prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:text-base
            prose-img:rounded-lg prose-img:shadow-lg
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      );
    } else {
      // Fallback for plain text or malformed content
      return <ErrorFallback content={htmlString} />;
    }
  }

  const root = contentObj.root as { children: LexicalNode[] };

  if (!root.children || root.children.length === 0) {
    return <p className="text-muted-foreground italic">This post is empty.</p>;
  }

  const renderNode = (node: LexicalNode, depth = 0): React.ReactNode => {
    // Prevent infinite recursion
    if (depth > 20) {
      console.warn('Maximum depth reached in LexicalRenderer');
      return null;
    }

    const renderChildren = (children: unknown) =>
      Array.isArray(children)
        ? children.map((child, idx) => (
            <React.Fragment key={`${depth}-${idx}`}>
              {renderNode(child, depth + 1)}
            </React.Fragment>
          ))
        : null;

    try {
      switch (node.type) {
        case 'paragraph':
          const blockTypes = [
            'image',
            'inlineimage',
            'gif',
            'youtube',
            'tweet',
            'poll',
            'sticky',
            'excalidraw',
            'pagebreak',
            'collapsible-container',
            'layoutcontainer',
            'layoutitem',
            'horizontalrule',
            'list',
            'code',
            'quote',
          ];
          const hasBlockChild = Array.isArray(node.children)
            ? node.children.some((c: LexicalNode) =>
                blockTypes.includes(c.type),
              )
            : false;
          const Wrapper = hasBlockChild ? 'div' : 'p';
          return (
            <Wrapper className="text-xl leading-relaxed mb-6 text-foreground/90">
              {renderChildren(node.children)}
            </Wrapper>
          );
        case 'heading': {
          const level =
            (node as { tag?: string; tagName?: string }).tag ||
            (node as { tagName?: string }).tagName ||
            'h1';
          const className =
            level === 'h1'
              ? 'text-4xl font-bold mb-8 mt-12 leading-tight text-foreground'
              : level === 'h2'
                ? 'text-3xl font-semibold mb-6 mt-10 leading-tight text-foreground'
                : level === 'h3'
                  ? 'text-2xl font-medium mb-4 mt-8 leading-tight text-foreground'
                  : 'text-4xl font-bold mb-8 mt-12 leading-tight text-foreground';
          return React.createElement(
            level,
            { className },
            renderChildren(node.children),
          );
        }
        case 'quote':
          return (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-6 my-8 text-xl italic text-muted-foreground leading-relaxed">
              {renderChildren(node.children)}
            </blockquote>
          );
        case 'code':
          return (
            <pre className="bg-muted p-4 rounded-lg text-base font-mono overflow-x-auto my-6">
              <code>{renderChildren(node.children)}</code>
            </pre>
          );
        case 'list': {
          const listType =
            (node as { listType?: string; tag?: string }).listType ||
            (node as { tag?: string }).tag ||
            'bullet';
          const isOrdered = listType === 'number' || listType === 'ol';
          const ListTag = isOrdered ? 'ol' : 'ul';
          const className = isOrdered
            ? 'list-decimal ml-8 mb-6 space-y-2'
            : 'list-disc ml-8 mb-6 space-y-2';
          return React.createElement(
            ListTag,
            { className },
            renderChildren(node.children),
          );
        }
        case 'listitem':
          return (
            <li className="text-xl leading-relaxed">
              {renderChildren(node.children)}
            </li>
          );
        case 'horizontalrule':
          return <hr className="my-8 border-t border-muted-foreground/20" />;
        case 'text': {
          let text: React.ReactNode =
            'text' in node && typeof node.text === 'string' ? node.text : '';
          if ('format' in node && typeof node.format === 'number') {
            const formatFlags = node.format;
            if (formatFlags & 16)
              text = (
                <code className="bg-muted px-1.5 py-0.5 rounded text-base font-mono">
                  {text}
                </code>
              );
            if (formatFlags & 8) text = <s>{text}</s>;
            if (formatFlags & 4) text = <u>{text}</u>;
            if (formatFlags & 2) text = <em>{text}</em>;
            if (formatFlags & 1) text = <strong>{text}</strong>;
          }
          return text;
        }
        case 'link': {
          const url =
            'url' in node && typeof node.url === 'string' ? node.url : '#';
          return (
            <a
              href={url}
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary underline hover:opacity-80"
            >
              {renderChildren(node.children)}
            </a>
          );
        }
        case 'autolink': {
          const url =
            'url' in node && typeof node.url === 'string' ? node.url : '#';
          return (
            <a
              href={url}
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary underline hover:opacity-80"
            >
              {renderChildren(node.children)}
            </a>
          );
        }
        case 'hashtag':
          return (
            <span className="text-primary font-medium">
              #{(node as { text?: string }).text || 'hashtag'}
            </span>
          );
        case 'poll': {
          const question: string =
            (node as { question?: string }).question || 'Untitled Poll';
          const options =
            (node as { options?: { uid: string; text: string }[] }).options ||
            [];
          return (
            <div className="border border-border rounded-lg p-6 my-8 bg-muted/10">
              <p className="text-xl font-semibold mb-4">{question}</p>
              <ul className="space-y-3">
                {options.map((opt, idx) => (
                  <li
                    key={opt.uid || idx}
                    className="p-3 border border-border rounded bg-background hover:bg-muted/50 transition-colors"
                  >
                    {opt.text || `Option ${idx + 1}`}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        case 'image': {
          const src =
            'src' in node && typeof node.src === 'string' ? node.src : '';
          const alt =
            'alt' in node && typeof node.alt === 'string' ? node.alt : 'image';

          if (!src) {
            return (
              <div className="my-8 p-4 border border-border rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">
                  Image source not available
                </p>
              </div>
            );
          }

          return (
            <div className="my-8">
              <Image
                src={src}
                alt={alt}
                width={800}
                height={600}
                className="rounded-lg shadow-lg w-full h-auto"
                loading="lazy"
                unoptimized
                onError={(e) => {
                  console.error('Image failed to load:', src);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        }
        case 'inlineimage': {
          const src =
            'src' in node && typeof node.src === 'string' ? node.src : '';
          const alt =
            'alt' in node && typeof node.alt === 'string' ? node.alt : 'image';

          if (!src)
            return <span className="text-muted-foreground">[Image]</span>;

          return (
            <Image
              src={src}
              alt={alt}
              width={400}
              height={300}
              className="rounded inline-block mx-2"
              loading="lazy"
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }
        case 'gif': {
          const src =
            'url' in node && typeof node.url === 'string' ? node.url : '';
          const alt =
            'alt' in node && typeof node.alt === 'string' ? node.alt : 'gif';

          if (!src) {
            return (
              <div className="my-8 p-4 border border-border rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">
                  GIF source not available
                </p>
              </div>
            );
          }

          return (
            <div className="my-8">
              <Image
                src={src}
                alt={alt}
                width={600}
                height={400}
                className="rounded-lg w-full h-auto"
                loading="lazy"
                unoptimized
              />
            </div>
          );
        }
        case 'tweet': {
          const tweetUrl =
            'tweetUrl' in node && typeof node.tweetUrl === 'string'
              ? node.tweetUrl
              : '';
          const match = tweetUrl.match(/status\/(\d+)/);
          if (!match || !tweetUrl) {
            return (
              <div className="my-8 p-6 border border-border rounded-lg bg-muted/10">
                <p className="text-muted-foreground">Tweet URL not available</p>
              </div>
            );
          }
          return (
            <div className="my-8 p-6 border border-border rounded-lg bg-muted/10">
              <blockquote className="text-lg">
                <a
                  href={tweetUrl}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Tweet
                </a>
              </blockquote>
            </div>
          );
        }
        case 'youtube': {
          const videoUrl =
            'videoUrl' in node && typeof node.videoUrl === 'string'
              ? node.videoUrl
              : '';
          const match = videoUrl.match(
            /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
          );
          const videoId = match ? match[1] : null;
          if (!videoId || !videoUrl) {
            return (
              <div className="my-8 p-6 border border-border rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">Invalid YouTube URL</p>
              </div>
            );
          }
          return (
            <div className="my-8">
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  maxWidth: '100%',
                }}
                className="rounded-lg overflow-hidden shadow-lg"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embedded YouTube Video"
                />
              </div>
            </div>
          );
        }
        case 'sticky': {
          const color: string = (node as { color?: string }).color || '#fff475';
          const text = (node as { text?: string }).text || '';
          return (
            <div
              className="my-6 p-6 rounded-lg shadow-sm text-lg leading-relaxed"
              style={{
                background: color,
              }}
            >
              {text || 'Empty sticky note'}
            </div>
          );
        }
        case 'excalidraw': {
          return (
            <div
              className="border border-border rounded-lg p-8 my-8 bg-muted/10 text-center"
              data-excalidraw={(node as { data?: string }).data || ''}
            >
              <p className="text-muted-foreground text-lg">
                [Excalidraw drawing]
              </p>
            </div>
          );
        }
        case 'pagebreak':
          return (
            <hr
              className="my-12 border-t-2 border-dashed border-muted-foreground/30"
              style={{ pageBreakAfter: 'always' }}
            />
          );
        case 'collapsible-container': {
          const collapsed: boolean =
            (node as { collapsed?: boolean }).collapsed ?? false;
          return (
            <div className="my-6 border border-border rounded-lg overflow-hidden">
              <button className="w-full p-4 bg-muted/20 text-left hover:bg-muted/40 transition-colors flex items-center gap-2">
                <span className="text-muted-foreground">
                  {collapsed ? '▶' : '▼'}
                </span>
                <span>Toggle content</span>
              </button>
              <div className={`p-4 ${collapsed ? 'hidden' : 'block'}`}>
                {renderChildren(node.children)}
              </div>
            </div>
          );
        }
        case 'layoutcontainer':
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              {renderChildren(node.children)}
            </div>
          );
        case 'layoutitem':
          return (
            <div className="space-y-4">{renderChildren(node.children)}</div>
          );
        default:
          console.warn(`Unknown node type: ${node.type}`);
          return null;
      }
    } catch (nodeError) {
      console.error(`Error rendering node of type ${node.type}:`, nodeError);
      return (
        <div className="my-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
          <p className="text-destructive">Error rendering content block</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-0">
      {root.children.map((child: LexicalNode, idx: number) => (
        <React.Fragment key={idx}>{renderNode(child)}</React.Fragment>
      ))}
    </div>
  );
}
