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

export function LexicalRenderer({ contentJSON }: LexicalRendererProps) {
  let contentObj: Record<string, unknown> | null = null;
  if (typeof contentJSON === 'string') {
    try {
      contentObj = JSON.parse(contentJSON);
    } catch {
      contentObj = null;
    }
  } else if (
    contentJSON &&
    typeof contentJSON === 'object' &&
    !Array.isArray(contentJSON)
  ) {
    contentObj = contentJSON as Record<string, unknown>;
  } else {
    contentObj = null;
  }

  // If parsing failed or root missing, treat as raw HTML
  if (
    !contentObj ||
    typeof contentObj.root !== 'object' ||
    !contentObj.root ||
    !Array.isArray((contentObj.root as { children?: LexicalNode[] }).children)
  ) {
    const htmlString = typeof contentJSON === 'string' ? contentJSON : '';
    return (
      <div
        className="prose dark:prose-invert lg:prose-xl 2xl:prose-2xl max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    );
  }

  const root = contentObj.root as { children: LexicalNode[] };

  const renderNode = (node: LexicalNode): React.ReactNode => {
    const renderChildren = (children: unknown) =>
      Array.isArray(children)
        ? children.map((child, idx) => (
            <React.Fragment key={idx}>{renderNode(child)}</React.Fragment>
          ))
        : null;
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
          ? node.children.some((c: LexicalNode) => blockTypes.includes(c.type))
          : false;
        const Wrapper = hasBlockChild ? 'div' : 'p';
        return (
          <Wrapper className="editor-paragraph">
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
            ? 'editor-heading-h1'
            : level === 'h2'
              ? 'editor-heading-h2'
              : level === 'h3'
                ? 'editor-heading-h3'
                : 'editor-heading-h1';
        return React.createElement(
          level,
          { className },
          renderChildren(node.children),
        );
      }
      case 'quote':
        return (
          <blockquote className="editor-quote">
            {renderChildren(node.children)}
          </blockquote>
        );
      case 'code':
        return (
          <pre className="editor-code">
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
        const className = isOrdered ? 'editor-list-ol' : 'editor-list-ul';
        return React.createElement(
          ListTag,
          { className },
          renderChildren(node.children),
        );
      }
      case 'listitem':
        return (
          <li className="editor-list-item">{renderChildren(node.children)}</li>
        );
      case 'horizontalrule':
        return <hr />;
      case 'text': {
        let text: React.ReactNode =
          'text' in node && typeof node.text === 'string' ? node.text : '';
        if ('format' in node && typeof node.format === 'number') {
          const formatFlags = node.format;
          if (formatFlags & 16) text = <code>{text}</code>;
          if (formatFlags & 8) text = <s>{text}</s>;
          if (formatFlags & 4) text = <u>{text}</u>;
          if (formatFlags & 2) text = <em>{text}</em>;
          if (formatFlags & 1) text = <strong>{text}</strong>;
        }
        return text;
      }
      case 'hashtag':
        return (
          <span className="hashtag">#{(node as { text?: string }).text}</span>
        );
      case 'poll': {
        const question: string =
          (node as { question?: string }).question || 'Untitled Poll';
        const options =
          (node as { options?: { uid: string; text: string }[] }).options || [];
        return (
          <div className="poll">
            <p>
              <strong>{question}</strong>
            </p>
            <ul>
              {options.map((opt) => (
                <li key={opt.uid}>{opt.text}</li>
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
        return (
          <Image
            src={src}
            alt={alt}
            width={500}
            height={500}
            style={{ maxWidth: '100%', display: 'block' }}
            loading="lazy"
            unoptimized={true}
          />
        );
      }
      case 'inlineimage': {
        const src =
          'src' in node && typeof node.src === 'string' ? node.src : '';
        const alt =
          'alt' in node && typeof node.alt === 'string' ? node.alt : 'image';
        return (
          <Image
            src={src}
            alt={alt}
            width={300}
            height={300}
            style={{ maxWidth: '100%', display: 'inline-block' }}
            loading="lazy"
            unoptimized={true}
          />
        );
      }
      case 'gif': {
        const src =
          'url' in node && typeof node.url === 'string' ? node.url : '';
        const alt =
          'alt' in node && typeof node.alt === 'string' ? node.alt : 'gif';
        return (
          <Image
            src={src}
            alt={alt}
            width={500}
            height={500}
            style={{ maxWidth: '100%', display: 'block' }}
            loading="lazy"
            unoptimized={true}
          />
        );
      }
      case 'tweet': {
        const tweetUrl =
          'tweetUrl' in node && typeof node.tweetUrl === 'string'
            ? node.tweetUrl
            : '';
        const match = tweetUrl.match(/status\/(\d+)/);
        if (!match) {
          return <a href={tweetUrl}>{tweetUrl}</a>;
        }
        return (
          <blockquote className="twitter-tweet">
            <a href={tweetUrl}>{tweetUrl}</a>
          </blockquote>
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
        if (!videoId) {
          return <a href={videoUrl}>{videoUrl}</a>;
        }
        return (
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              maxWidth: '100%',
            }}
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
        );
      }
      case 'sticky': {
        const color: string = (node as { color?: string }).color || '#fff475';
        const text = (node as { text?: string }).text || '';
        return (
          <div
            style={{
              background: color,
              padding: '1em',
              borderRadius: '0.5em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {text}
          </div>
        );
      }
      case 'excalidraw': {
        return (
          <div
            className="excalidraw-renderer border rounded p-4 my-4 bg-muted"
            data-excalidraw={(node as { data?: string }).data || ''}
          >
            [Excalidraw drawing]
          </div>
        );
      }
      case 'pagebreak':
        return (
          <hr
            className="my-8 border-t border-dashed border-border page-break"
            style={{ pageBreakAfter: 'always' }}
          />
        );
      case 'collapsible-container': {
        const collapsed: boolean =
          (node as { collapsed?: boolean }).collapsed ?? false;
        return (
          <div
            className="collapsible-container"
            data-collapsed={collapsed ? 'true' : 'false'}
          >
            <button className="collapsible-trigger">
              {collapsed ? '▶' : '▼'}
            </button>
            <div style={{ display: collapsed ? 'none' : 'block' }}>
              {renderChildren(node.children)}
            </div>
          </div>
        );
      }
      case 'layoutcontainer':
        return (
          <div className="layout-container">
            {renderChildren(node.children)}
          </div>
        );
      case 'layoutitem':
        return (
          <div className="layout-item">{renderChildren(node.children)}</div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {root.children.map((child: LexicalNode, idx: number) => (
        <React.Fragment key={idx}>{renderNode(child)}</React.Fragment>
      ))}
    </>
  );
}
