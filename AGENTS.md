 Polish Typography and Layout for Readability
Files: tailwind.config.ts, src/app/globals.css
Action: Tune typography settings for an editorial feel. The base typography is already using a serif font for body text and headings
github.com
. Now refine font sizes and spacing at different breakpoints to ensure comfortable reading. In tailwind.config.ts, extend the typography plugin settings for larger screens. For example, define an xl or 2xl variant:
js
Copy
Edit
typography: {
  DEFAULT: { ... },  
  lg: { /* maybe already used via prose-xl */ },  
  xl: { css: {  
          p: { fontSize: '1.25rem', lineHeight: '1.7' },  
          h1: { fontSize: '2.5rem' },  
          h2: { fontSize: '2rem' },  
          // etc. 
       } }  
}
This can complement the lg:prose-xl utility by making an even larger size for very wide layouts, ensuring text doesn’t appear too small in our new max width. If Tailwind’s preset prose-xl or prose-2xl classes suffice, use those on the article container instead of custom settings. The goal is to maintain ~65-75 characters per line in each column for optimal readability.
Action: Adjust spacing and visual hierarchy. Increase spacing between paragraphs, headings, and other blocks to avoid crowding, especially with multi-column layouts. You can do this via the typography config (e.g., add marginTop for paragraphs, or ensure heading margins are larger). Check the rendered posts to see if columns make text too dense and tweak accordingly (for instance, maybe add an extra mb-4 to paragraphs via CSS). Additionally, use the accent color sparingly in text styles to highlight key elements: one idea is to update blockquote styling to use the accent for its border or quote icon. Currently blockquotes have a gray left border
github.com
; changing borderLeftColor to var(--accent) and perhaps making the text italic can give it a nice highlight that ties into the accent-on-gray theme. Ensure this still meets contrast requirements (accent against white should be fine).
Action: Verify multi-column behavior with various content. Test posts with different content types: long words, code blocks, images, etc., and apply CSS fixes as needed for readability. For example, if you have code blocks (<pre><code>) inside .prose, ensure they have white-space: pre-wrap or a horizontal scrollbar to prevent breaking the layout. If a code block is too wide for a column, consider forcing it to span full width (you might give .prose code a break-inside: avoid so it doesn’t split across columns, or even take it out of the multi-col flow by not applying the columns utility to code blocks). Similarly, make sure an image or embed doesn’t overflow its column (the Next/Image styling already sets max-width 100%
github.com
, so that should be okay). Tweak any such edge cases in globals.css (for example, add .prose img { break-inside: avoid; } to keep images from splitting between columns).
Intent & Impact: These typographic refinements will elevate the reading experience to a truly professional level. Users will benefit from comfortable font sizes tailored to their device, well-spaced lines and blocks that guide the eye, and a clear content hierarchy. The multi-column layout will feel natural, as text flow and hyphenation adjustments prevent awkward breaks. Overall, posts will be easier and more pleasurable to read – crucial for a platform focused on editorial content. It aligns the presentation with industry best practices (Ghost and Medium also pay special attention to typography, spacing, and line length for readability).
