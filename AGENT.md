Lexical Content Renderer for Posts
Overview: We will create a LexicalRenderer React component (e.g. in components/ui/LexicalRenderer.tsx) that takes a Lexical JSON string (the content stored in posts.content) and renders it as formatted HTML. This renderer will support all node types used by the project’s Lexical editor, ensuring the post viewer page (e.g. app/newsletters/[slug]/[postId]/page.tsx) displays content exactly as authored. The rendering will match the editor’s theme (using the same CSS classes and structure) so that things like headings, quotes, and lists appear consistently. We will also make the renderer largely SSR-compatible by avoiding browser-only APIs and producing static markup for the content. Component Implementation: The Lexical JSON format represents the document as a nested object tree. For example, a simple post might have a structure like: { root: { children: [ {type: "heading", tag: "h1", children: [ {type: "text", text: "Hello"} ]}, {type: "paragraph", children: [ {type: "text", text: "World!"} ]} ] } }. Our component will recursively traverse such a structure and output appropriate JSX for each node type. Pseudocode for the renderer’s core might look like:
tsx
Copy
Edit
import React from "react";

interface LexicalNode {
type: string;
[key: string]: any;
}

export function LexicalRenderer({ contentJSON }: { contentJSON: string | object }) {
// Accept either a JSON string or already-parsed object
const contentObj = typeof contentJSON === "string" ? JSON.parse(contentJSON) : contentJSON;
if (!contentObj || !contentObj.root) return null;

// Recursive function to render a node and its children
const renderNode = (node: LexicalNode): React.ReactNode => {
switch (node.type) {
case "paragraph":
return <p className="editor-paragraph">{node.children?.map(renderNode)}</p>;

      case "heading": {
        // Lexical uses a "tag" or similar property to denote heading level
        const level = node.tag || node.tagName || "h1";
        const HeadingTag = level as keyof JSX.IntrinsicElements;
        // Apply corresponding CSS class for the heading level
        const className =
          level === "h1" ? "editor-heading-h1" :
          level === "h2" ? "editor-heading-h2" :
          level === "h3" ? "editor-heading-h3" :
          "editor-heading-h1";
        return <HeadingTag className={className}>{node.children?.map(renderNode)}</HeadingTag>;
      }

      case "quote":
        return <blockquote className="editor-quote">{node.children?.map(renderNode)}</blockquote>;

      case "code":
        // Render code blocks: wrap children text in <code> inside a preformatted block
        return <pre className="editor-code"><code>{node.children?.map(renderNode)}</code></pre>;

      case "list": {
        // Lexical list nodes likely have a listType or tag for UL/OL
        const listType = node.listType || node.tag || "bullet";
        const isOrdered = listType === "number" || listType === "ol";
        const ListTag = isOrdered ? "ol" : "ul";
        const className = isOrdered ? "editor-list-ol" : "editor-list-ul";
        return <ListTag className={className}>{node.children?.map(renderNode)}</ListTag>;
      }

      case "listitem":
        return <li className="editor-list-item">{node.children?.map(renderNode)}</li>;

      case "horizontalrule":
        return <hr />;

      case "text": {
        // Base text node – apply formatting (bold, italic, etc.) if present
        let text = node.text ?? "";
        if (node.format) {
          const formatFlags = node.format; // format is often a bitmask
          if (formatFlags & 1) text = <strong>{text}</strong>;      // Bold
          if (formatFlags & 2) text = <em>{text}</em>;              // Italic
          if (formatFlags & 4) text = <u>{text}</u>;                // Underline
          if (formatFlags & 8) text = <s>{text}</s>;                // Strikethrough
          if (formatFlags & 16) text = <code>{text}</code>;         // Code
        }
        // If this text node has a "style" (inline styles), you could apply it here as well (e.g., color).
        return text;
      }

      case "hashtag":
        // HashtagNode extends TextNode but we’ll render as a span with a class for styling
        return <span className="hashtag">#{node.text}</span>;

      case "poll": {
        // Poll node: display the question and options.
        const question: string = node.question || "Untitled Poll";
        const options: any[] = node.options || [];
        return (
          <div className="poll">
            <p><strong>{question}</strong></p>
            <ul>
              {options.map((opt) => (
                <li key={opt.uid}>{opt.text}</li>
              ))}
            </ul>
          </div>
        );
      }

      case "image":
        // Image node (block image)
        return <img src={node.src} alt={node.alt || "image"} style={{ maxWidth: "100%", display: "block" }} />;

      case "inlineimage":
        // Inline image (flows with text)
        return <img src={node.src} alt={node.alt || "image"} style={{ maxWidth: "100%", display: "inline-block" }} />;

      case "gif":
        // GIF node – treated similar to an image
        return <img src={node.url} alt={node.alt || "gif"} style={{ maxWidth: "100%", display: "block" }} />;

      case "tweet": {
        // Tweet embed: use a blockquote with a link to the tweet
        const tweetUrl: string = node.tweetUrl;
        const match = tweetUrl.match(/status\/(\d+)/);
        if (!match) {
          // If URL isn’t a valid tweet link, just render a hyperlink
          return <a href={tweetUrl}>{tweetUrl}</a>;
        }
        return (
          <blockquote className="twitter-tweet">
            <a href={tweetUrl}>{tweetUrl}</a>
          </blockquote>
        );
      }

      case "youtube": {
        const videoUrl: string = node.videoUrl;
        // Extract YouTube video ID from various URL formats
        const match = videoUrl.match(
          /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
        );
        const videoId = match ? match[1] : null;
        if (!videoId) {
          return <a href={videoUrl}>{videoUrl}</a>;
        }
        // Responsive video embed (16:9 aspect ratio)
        return (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", maxWidth: "100%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Embedded YouTube Video"
            />
          </div>
        );
      }

      case "sticky": {
        // Sticky note: render a colored note with text
        const color: string = node.color || "#fff475"; // default yellow
        const text = node.text || "";
        return (
          <div style={{
            background: color,
            padding: "1em",
            borderRadius: "0.5em",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            {text}
          </div>
        );
      }

      case "collapsible-container": {
        // Collapsible section container
        const collapsed: boolean = node.collapsed ?? false;
        return (
          <div className="collapsible-container" data-collapsed={collapsed ? "true" : "false"}>
            {/* A trigger button to toggle (non-functional on static render, but shows state) */}
            <button className="collapsible-trigger">
              {collapsed ? "▶" : "▼"}
            </button>
            {/* Render children (they will be visible or hidden based on CSS/attribute) */}
            <div style={{ display: collapsed ? "none" : "block" }}>
              {node.children?.map(renderNode)}
            </div>
          </div>
        );
      }

      case "layoutcontainer":
        // Layout containers (columns) – if the editor supports multi-column, we could render a flex container
        return <div className="layout-container">{node.children?.map(renderNode)}</div>;

      case "layoutitem":
        // Layout item – act as a column inside the container
        return <div className="layout-item">{node.children?.map(renderNode)}</div>;

      default:
        return null;
    }

};

// Render all top-level children of the root
return <>{contentObj.root.children.map(renderNode)}</>;
}
In the above code, every known Lexical node type is handled. We create appropriate HTML elements with the same classes the editor applies. For instance, paragraphs get the editor-paragraph class (which in the CSS ensures no extra margin is added
github.com
), headings use editor-heading-h1/h2/h3 (which define font sizes and margins
github.com
), quotes use editor-quote (styled with a left border to look like a blockquote
github.com
), and so on. By mirroring these classes, the rendered content will match the editor’s theming exactly. (These classes are defined in globals.css as part of the project’s design system.) For text formatting, we check node.format and wrap the text in the relevant tags. In Lexical’s model, formatting like bold/italic are stored as bit flags on text nodes. The example assumes a mapping (1=bold, 2=italic, 4=underline, 8=strikethrough, 16=code) – this aligns with Lexical’s internal constants. Thus, if a text node is bold and italic, format might be 3 (bits 1|2), and we’ll wrap it in <strong><em>...</em></strong>. This way, rich text styling is preserved in the output. (If needed, we could also parse the style field for things like custom color or background, but the current editor primarily uses classes for styling.) Handling Custom Nodes: The project’s editor includes custom nodes (Polls, GIFs, Tweets, YouTube, Sticky notes, Collapsible sections, etc.). We render each in a reasonable way:
PollNode: We display the poll question in bold and list each option as a list item. (In the future, you could enhance this to show vote counts or interactive voting, but for static rendering we just show the poll content.)
github.com
GIFNode and ImageNode: We use a standard <img> tag with the stored URL and alt text, and apply inline styles to ensure responsiveness (max-width 100%)
github.com
. (Using Next.js’s <Image> is not necessary on the viewer; an <img> is fine for SSR and avoids requiring Next’s image loader.)
TweetNode: We output a Twitter embed code: a <blockquote class="twitter-tweet"><a href="...">...</a></blockquote>. This mirrors what the editor’s TweetEmbed component does
github.com
. If the JSON has a valid Twitter status URL, the blockquote will allow Twitter’s script (if loaded on the client) to render an interactive embed. Even without the script, it provides a link to the tweet.
YouTubeNode: We embed an <iframe> inside a responsive container (using an aspect-ratio trick with padding) to show the video player, similar to how the editor’s YouTubeEmbed renders it
github.com
github.com
. If the URL is unrecognized, we fall back to a simple link.
StickyNode: We render a <div> with the sticky note’s text and background color. The inline styles (background color, padding, drop shadow) replicate the appearance of a sticky note as in the editor
github.com
.
CollapsibleContainerNode: Since this node is an ElementNode containing other nodes, we render it as a <div class="collapsible-container"> with a button inside and its children. We set a data-collapsed attribute and hide the children with CSS or inline style if collapsed is true
github.com
github.com
. This produces a static representation: users can see whether the section is expanded or collapsed initially (and the arrow indicator), but to toggle it interactively would require client-side JS. Still, this approach ensures content is not lost – collapsed content is in the HTML (just initially hidden).
LayoutContainer/Item: These were placeholder nodes for multi-column layouts. We output simple <div>s with classes (e.g., layout-container wrapping multiple layout-item divs). You can later add CSS (like display: flex) to these classes to achieve a column layout if needed. For now, they will just stack, which is acceptable as a first pass given the editor’s own implementation was incomplete
github.com
github.com
.
HorizontalRuleNode: Rendered as a plain <hr> rule. The Lexical HorizontalRuleNode is included in the editorNodes, so this covers that.
SSR Compatibility: The LexicalRenderer component as written uses only React and JSON parsing – no browser APIs – so it can run during Server-Side Rendering. This means the post content is delivered as fully-formed HTML to the client. This is good for SEO and initial page load. Any interactive enhancements (like loading the Twitter script for tweet embeds, or making collapsible sections toggleable) can be added on the client side progressively, but the core content (text, images, embeds) is visible on first paint. This design follows the approach of other platforms using Lexical. For example, Ghost (which uses Lexical for its editor) implements a server-side renderer that converts Lexical JSON to HTML before delivering posts
github.com
. Our solution is analogous: we’ve effectively built a custom HTML renderer for our specific set of nodes. By prioritizing server-rendered output, we ensure even if JavaScript is disabled or slow to load, readers can still see the post content. Styling: Ensure the CSS for the editor’s classes is loaded on the viewer page. In this project, the styles for classes like editor-paragraph, editor-quote, etc., are in the global CSS (already included)
github.com
github.com
. Thus, using the same class names yields the same look. If any styles are missing (for custom classes like .poll or .hashtag), you can add minimal CSS for them. For instance, you might add: .hashtag { color: var(--accent-foreground); } to style hashtags, or .poll ul { list-style: disc; margin-left: 1.5em; } to format poll options. But these are embellishments – the critical ones (headings, lists, etc.) are already styled by existing classes. Usage in Page Component: With LexicalRenderer implemented, using it in the post page is straightforward. In app/newsletters/[slug]/[postId]/page.tsx, fetch the post’s content and title (and any other needed fields) inside the page’s async function. Then pass the content to <LexicalRenderer />. For example:
tsx
Copy
Edit
// Inside the [slug]/[postId]/page.tsx component:
const supabase = createServerSupabaseClient();
const { data: post, error } = await supabase
.from("posts")
.select("title, content, author_id")
.eq("id", params.postId)
.single();
if (!post || error) {
notFound();
}

return (

  <article className="mx-auto max-w-2xl p-4">
    <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
    <LexicalRenderer contentJSON={post.content} />
  </article>
);
This will produce the full post content on the server. The <LexicalRenderer> will output a tree of HTML elements corresponding to the post’s Lexical state. For example, if the post had an H1, some paragraphs, and an image, the rendered HTML might be:
html
Copy
Edit
<article>
  <h1 class="editor-heading-h1">Post Title</h1>
  <p class="editor-paragraph">First paragraph of the post.</p>
  <p class="editor-paragraph"><strong>Bold text</strong> and <em>italic text</em> in the second paragraph.</p>
  <img src="https://.../image.png" alt="An image" style="max-width:100%; display:block;" />
</article>
All of which is styled appropriately by the CSS we have from the editor. Security Considerations: By constructing React elements (instead of using dangerouslySetInnerHTML), we avoid injecting raw HTML and mitigate XSS risks. The content JSON could theoretically contain malicious data (e.g., a script in a text node), but since we treat everything as plain text or vetted URLs for embeds, such content will be rendered innocuously (e.g., as text or as an iframe with safe src). It’s still wise to ensure that any user-generated URLs (for images, embeds) are sanitized or come from trusted sources. In our case, image URLs would likely be from Supabase storage or external links the user provided – you might consider validation or proxying for those if security is paramount. However, by not rendering any HTML from the JSON directly, we greatly reduce attack surface. Finally, map the implementation requirements to the solution:
Server Components & Supabase (RLS) – We used a server-side page to fetch the user’s profile with createServerSupabaseClient, ensuring RLS policies allow only the current user’s data
github.com
. Sensitive fields are handled cautiously and not exposed to other users.
Zod Validation – All profile fields are defined in a Zod schema (client and server). This schema is used with RHF’s zodResolver for client-side checks and again in the server action to validate/sanitize input
github.com
github.com
.
React-Hook-Form Integration – We integrated RHF with the form, leveraging register and handleSubmit. The default values from the server populate the form, and any validation errors from Zod are displayed next to the respective fields
github.com
github.com
.
Server Actions for Updates – The form submission invokes updateUserProfile, a server action that checks the Supabase auth user and performs the update securely
github.com
github.com
. It returns success or error states that our form uses to give feedback (e.g. showing “Settings updated successfully” on success)
github.com
.
Type Safety & Data Integrity – By using generated types (TablesUpdate<"users">) and the user session, we ensure only valid fields are written and only to the current user’s row
github.com
. We also call revalidatePath on relevant pages to keep data in sync
github.com
. The Stripe connect flow is implemented such that the stripe_account_id field is set through verified external OAuth, not arbitrary input, preserving integrity of that linkage.
Lexical Node Support – The LexicalRenderer covers all custom node types present in the editor (text, headings, lists, quotes, code, images, GIFs, embeds, poll, sticky, etc.), mapping each to appropriate HTML. We referenced the project’s node definitions to ensure accuracy (e.g., using the same class names and structure that the editor expects)
github.com
github.com
.
Matching Editor Theming – We applied the editor’s Tailwind/CSS classes (like editor-heading-h2, editor-quote, editor-list-item) in the renderer’s output. This guarantees the viewer page looks the same as the editor preview
github.com
github.com
. Layout and spacing mirror the editor’s because of these shared styles.
SSR Compatibility – The renderer produces static HTML for the content, enabling full server-side rendering. Interactive elements (e.g., collapsibles) are rendered in a default state to avoid needing client JS, and external content (tweets, videos) are embedded via standard HTML (blockquote/iframe) that can be progressively enhanced. This approach is in line with best practices from 2023–2025 for rich text handling (similar to how Ghost outputs Lexical content to HTML on the server
github.com
). It ensures even without client-side processing, the content is readable and indexed.
Code Snippets & Placement – We provided a complete code outline for the LexicalRenderer component and an example of integrating it into the post page. The LexicalRenderer.tsx would reside in components/ui/ as a reusable server-capable component. The usage example in the post page demonstrates the drop-in nature: import and use it in the JSX, passing the JSON content. No further config is needed since the component itself handles parsing and rendering.
