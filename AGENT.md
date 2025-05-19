Issues: The custom SlashMenuPlugin listens for a standalone “/” at the start of a new line and opens a suggestion menu
github.com
. It dispatches a series of custom insert commands (e.g. INSERT_HEADING_COMMAND, INSERT_IMAGE_COMMAND) based on the option selected
github.com
. This implementation was adapted from Lexical’s playground and introduces several non-native patterns:
Overuse of update listeners: It uses editor.registerUpdateListener on every editor update to detect the “/” trigger
github.com
. This is inefficient and not the idiomatic way to handle key triggers in Lexical.
Manual caret position via DOM API: The plugin queries window.getSelection().getRangeAt(0) to find the caret’s screen position
github.com
, instead of using Lexical’s native mechanisms for retrieving selection coordinates.
No support for text filtering: As implemented, the menu only opens for a lone “/” and closes as soon as any other character is typed
github.com
. This prevents narrowing down options by typing (a limitation compared to typical slash menus).
Custom insert commands for native block types: It defines custom commands for inserting headings, paragraphs, quotes, etc., but these aren’t handled in the plugin (no command handler is registered for them, so those options do nothing)
github.com
. This duplicates functionality Lexical can handle via native transforms (e.g. setting block type) and indicates incomplete integration.
Correction Plan:
Use Lexical key commands for “/” trigger: Replace the update-listener approach with Lexical’s native command for keyboard events. For example, register a low-priority key down command:
ts
Copy
Edit
editor.registerCommand(KEY_DOWN_COMMAND, (event) => {
if (event.key === "/" && $isRangeSelection($getSelection()) && $getSelection().isCollapsed()) {
    // Check if at start of empty block:
    const anchor = $getSelection().anchor;
    const parent = anchor.getNode().getTopLevelElementOrThrow();
    if (parent.getTextContent() === "") {
      // Open slash menu
      setOpen(true);
      setHighlightedIndex(0);
      // Prevent the "/" from actually inserting into the document
      event.preventDefault();
    }
  }
  return false;
}, COMMAND_PRIORITY_LOW);
This way, the plugin opens when "/" is pressed at the start of an empty block, and the slash character is not inserted into the content (so no later removal needed). Using Lexical’s KEY_DOWN_COMMAND is more in line with official recommendations, as it avoids scanning on every update. It will improve performance and conform to Lexical’s event-driven paradigm.
Leverage Lexical utilities for cursor positioning: Instead of using the DOM selection API directly, use Lexical’s editor methods to get element position. For instance, after determining the trigger node or its parent, call editor.getElementByKey(node.getKey()) to retrieve the DOM element of the text node or its block, and use its getBoundingClientRect() for coordinates. This ties the positioning logic to Lexical’s representation. If needed (for caret position within text), consider using Lexical’s built-in selection coordinates utilities (Lexical doesn’t provide one out-of-the-box, but measuring the caret via the editor root element is preferred over raw window.getSelection). This change will reduce reliance on the global selection and ensure the menu positions correctly even in nested scroll containers.
Implement filtering in the slash menu: Keep the menu open when additional characters are typed after “/” and filter the options list based on the input. For example, if the user types “/hea”, the menu should remain open and show “Heading 1/2/3” options. To do this, adjust the update listener (or a text content listener) logic: if the selection is in the same text node that started with “/”, don’t immediately close the menu on additional input. Instead, read the current text (node.getTextContent()) and match it against option keywords. You might maintain the input string in state and update it on each selection change. This aligns with common Lexical patterns (similar to mention or hashtag plugins) where the plugin stays active as the trigger text is being typed.
Remove or replace custom commands for native block types: The custom insert commands for headings, paragraphs, quotes, and code are unnecessary. Lexical’s native functionality can handle these: for headings/quotes, use $setBlocksType from @lexical/selection to transform the current paragraph into the desired node type (as done in the Toolbar) instead of dispatching an insert command. For example, when “Heading 1” is chosen, call:
ts
Copy
Edit
editor.update(() => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
$setBlocksType(selection, () => $createHeadingNode("h1"));
  }
});
This directly converts the current block to an <h1> node. Do the same for “Heading 2/3” and “Quote” (using $createQuoteNode()). For “Paragraph”, simply convert to a normal paragraph node ($setBlocksType(..., () => $createParagraphNode())). Removing these custom commands and using Lexical’s API makes the behavior compliant with Lexical’s documented approach for block formatting. It also fixes the current bug where those slash menu options do nothing (because no handlers were registered for them).
Integrate slash menu with Lexical’s native command dispatching: For inserting non-native elements (polls, images, etc.), you can still dispatch custom commands, but ensure they are registered (see below in Insert Commands section). Alternatively, call the insertion logic directly in the slash menu onSelect. For simplicity and compliance, you might handle native types directly (as above) and only dispatch commands for truly custom elements. This keeps the plugin lean and focused on UI, while leveraging Lexical’s native capabilities for standard content.
FloatingLinkEditorPlugin (Link Tooltip)
Issues: This plugin provides an on-hover/selection tooltip to edit or remove links, similar to Lexical’s playground example
github.com
github.com
. The integration mostly follows Lexical’s patterns, but a few aspects diverge from best practices:
Manual DOM measurement: The plugin uses window.getSelection() and Range.getClientRects() to position the floating toolbar
github.com
. While this works, it bypasses Lexical’s abstractions. It may not account for scrolling offsets of the editor container (the calculation is relative to viewport). If the editor is within a scrollable container, the position might need adjustment.
Focus management: There is no focus handling when switching into edit mode. The code sets editing=true to show an <input> for the URL, but does not automatically focus that input. This is a usability issue (the user must manually focus the field). It’s not directly a “Lexical compliance” problem, but the official examples ensure the input is focused for a smooth experience.
Use of ReactDOM.createPortal to document.body: The plugin portals the link editor into the document body
github.com
. This is acceptable (Lexical’s examples do the same for floating elements), but it means styling must be globally available. It’s worth verifying that the portal approach doesn’t conflict with Lexical’s editing (it generally doesn’t, but you must remove the portal on unmount to avoid leaks, which the plugin does via React state cleanup).
Correction Plan:
Use Lexical element utilities for positioning: Instead of relying on the global selection’s bounding rect, use the link node’s DOM element for positioning. When a link is selected, you can get the LinkNode via $isLinkNode (already done) and then find its element:
ts
Copy
Edit
const linkElement = editor.getElementByKey(linkNode.getKey());
if (linkElement) {
  const rect = linkElement.getBoundingClientRect();
  setPosition({ x: rect.left, y: rect.bottom });
}
This positions the toolbar at the bottom-left of the link text element, which is typically where the caret is. It’s a more direct measurement of the node in the editor. If you want the caret’s exact position (e.g. when selecting part of a link), you might still use the range method, but make sure to adjust for container scroll. Also, consider updating position on window scroll or editor scroll events (the current implementation updates on every selection change – you can add an event listener for scroll on the editor container to recalc getBoundingClientRect).
Auto-focus the URL input on edit: When the user clicks “Edit” and editing state becomes true, use a React effect to focus the input. For example:
ts
Copy
Edit
useEffect(() => {
  if (editing) {
    inputRef.current?.focus();
  }
}, [editing]);
This small change improves UX and mirrors Lexical’s examples where the focus is moved to the popup for typing the URL. It does not affect Lexical’s state, but aligns the integration with expected behavior.
Use Lexical’s link command for toggling: The plugin already uses editor.dispatchCommand(TOGGLE_LINK_COMMAND, payload) for applying or removing links
github.com
. This is the correct native approach per Lexical docs. Continue to use this instead of any custom logic when the user clicks “Save” or “Remove”. Ensure that when removing a link (TOGGLE_LINK_COMMAND with null), the selection remains correct (Lexical will remove the LinkNode but keep its text). This is already handled by Lexical’s native command.
Cleanup portal on unmount (if not already): When the editor is disposed or the plugin unmounts, React will remove the portal automatically. Just verify that no event listeners remain. The plugin registers a selection change command handler which is removed in the effect cleanup
github.com
 – this is good. No further action needed, but it’s noted to double-check memory leaks. Using Lexical’s command system (SELECTION_CHANGE_COMMAND) as done is the recommended practice
github.com
, so the core integration here is sound.
By making these adjustments, the floating link editor will be more aligned with Lexical’s native usage (using node-based positioning and proper focus control), while preserving the same functionality.
CodeHighlightPlugin (Syntax Highlighting)
Issues: The CodeHighlightPlugin applies Prism.js syntax highlighting to code blocks in the editor. It registers node transforms on Lexical’s CodeNode and CodeHighlightNode classes to update their content with highlighted HTML
github.com
github.com
. While this achieves highlighting, it does so by manipulating internal properties that are not officially exposed: the plugin accesses a __highlighted field and calls an untyped node.setHighlight() method on Lexical nodes
github.com
. These are marked with @ts-expect-error comments in the code, indicating they are not part of Lexical’s public API and may break with library updates. This approach is borrowed from an older Lexical example and is not fully compliant with current Lexical best practices. Specific problems include:
Reliance on internal node state: The use of node.getLatest().__highlighted and node.setHighlight(html)
github.com
 reaches into Lexical’s internals. This is fragile — future Lexical versions might remove or change these internals, since they’re not documented.
Missing official API usage: Lexical 0.31 may offer utilities or patterns for syntax highlighting (e.g. transforming tokens into TextNodes with CSS classes, or using a decorator node for code blocks) that would avoid directly injecting HTML strings into nodes.
Incomplete language support/extensibility: The plugin hardcodes Prism languages and assumes every code node uses Prism’s highlighting. If Lexical’s CodeNode had a built-in way to store language or highlighted tokens, this plugin doesn’t leverage it beyond calling getLanguage() on the node (which is good)
github.com
. There might now be a more “Lexical-native” way to handle language-specific formatting (for example, via a custom element theme or data attribute) rather than storing raw HTML.
Correction Plan:
Use Lexical’s recommended transform approach: Confirm if the latest Lexical documentation provides a sanctioned method for syntax highlighting. If Lexical now provides a CodeHighlightPlugin or utility, adopt it. For instance, some integrations use $createTextNode with tokenized content. If no official plugin exists, continue with a transform but avoid internal fields. One approach is to remove CodeHighlightNode from the equation and treat CodeNode as a Decorator or specialized element:
Option A: Split text into token TextNodes – When a code block updates, parse the text with Prism and then update the Lexical nodes: replace the code block’s children with a sequence of TextNodes, each styled via CSS classes (Prism gives spans with classes like "token keyword"). This would involve creating Lexical TextNodes for each token and applying a custom CSS class mapping in the theme. Lexical allows custom text styles via the theme object (for example, you can define classes for tokens). This avoids storing raw HTML in the state. You can use Lexical’s utilities like $createTextNode() and the node’s append() to rebuild the code block content.
Option B: Extend Lexical’s CodeNode – Create a custom node (e.g. HighlightedCodeNode) that extends CodeNode and includes a property for highlighted HTML or tokens. Provide a public updateHighlight(html) method on it. Register that node in the editor and use it instead of the built-in CodeNode. This way, your setHighlight is officially part of your node’s API (TypeScript won’t complain). The transform can then call highlightedCodeNode.updateHighlight(html) without relying on private fields. The custom node’s exportJSON/importJSON can include the raw code text (and perhaps omit the highlight to avoid duplication), ensuring serialization remains clean.
Both options aim to remove direct usage of __highlighted internal state. Option A is more in line with Lexical’s native usage (text nodes plus theme-based styling), whereas Option B encapsulates the highlighting but at the cost of deviating from Lexical’s built-in nodes. Choose the approach that fits the complexity you’re comfortable with; Option A is likely more “official”. Lexical’s documentation on custom text formatting or tokens can guide this decision.
Eliminate ts-expect-error by using public APIs: If you implement Option A (tokenized TextNodes), you won’t need any internal properties – just create/update nodes via Lexical’s editor state. If you implement Option B (custom node), define the methods and properties on your node class with proper typings. In either case, remove the direct calls to node.getLatest() and node.setHighlight(). For example, in a tokenization approach:
ts
Copy
Edit
editor.registerNodeTransform(CodeNode, (codeNode) => {
  const textContent = codeNode.getTextContent();
  const language = codeNode.getLanguage() || "plaintext";
  if (Prism.languages[language]) {
    const tokens = Prism.tokenize(textContent, Prism.languages[language]);
    // Convert tokens to Lexical nodes:
    const children: LexicalNode[] = tokens.map(token => {
      const content = typeof token === 'string' ? token : token.content;
      const tokenNode = $createTextNode(content);
      if (typeof token !== 'string' && token.types) {
        // apply a CSS class based on token type
        token.types.forEach(type => tokenNode.setStyle(`token ${type}`));
      }
      return tokenNode;
    });
    codeNode.getChildren().forEach(child => child.remove());
    codeNode.append(...children);
  }
});
In this pseudo-code, we replace the code node’s children on each transform with new text nodes carrying Prism token classes. The Lexical theme (CSS) would have definitions for .token.keyword, .token.string, etc., matching Prism’s classes. This approach stays within Lexical’s public API and state model (no raw HTML insertion). It is more complex than calling setHighlight(html), but it is safer and fully “Lexical native.”
Align with Lexical’s serialization: Ensure that whatever highlighting approach you use doesn’t break saving or loading content. If using tokenized text nodes, the serialized JSON will naturally include the token text nodes (which is fine, as they’re just text). The styling is via CSS, not in the JSON. If using a custom HighlightedCodeNode, make sure its exportJSON returns just the plain code text (and language), not the highlighted HTML, so that re-importing yields unformatted code which will then be re-highlighted on mount. This matches Lexical’s philosophy: store the minimal data (just the code), and derive highlights on the fly.
Keep Prism usage flexible: The current plugin imports many Prism language definitions upfront
github.com
. Consider lazy-loading languages or allowing dynamic language selection (Lexical’s CodeNode supports .getLanguage() which you already use
github.com
). If the Lexical docs suggest using a different highlighter or provide a hook for language registration, follow that. For example, Lexical might have added a utility to register language grammars. Using official hooks (if available) for extending language support will keep the integration future-proof.
By refactoring the syntax highlighting as above, you remove the dependency on Lexical’s internal properties and adhere to the official API. The goal is that no @ts-expect-error comments are needed – meaning your plugin isn’t doing anything that Lexical’s type definitions disallow. This ensures compatibility with future Lexical upgrades and aligns with the documentation’s guidance for custom text formatting.
Custom Insert Commands & Editor Integration (Polls, Embeds, etc.)
Issues: The editor currently defines numerous custom insert commands in PostEditor for embedding media and custom nodes (polls, Excalidraw drawings, sticky notes, tweets, YouTube embeds, images, etc.)
github.com
. It also provides UI triggers: the slash menu options dispatch these commands
github.com
github.com
, and the Toolbar has buttons that call some of them (e.g. the Excalidraw button)
github.com
. While this modular command approach is valid, a few implementations deviate from best practices:
Blocking prompts for input: For some inserts, the handler uses window.prompt to get a URL (e.g. asking for an image URL or tweet link)
github.com
github.com
. Blocking prompts interrupt the user experience and can cause focus/selection issues in the editor. Lexical doesn’t forbid this, but the official examples typically use non-blocking modals or UI panels for inputs. A prompt can also lead to lost editor focus or selection not being where expected after insertion.
Not using Lexical’s insertion helpers: In the command handlers, insertion is done via selection.insertNodes([new CustomNode(...)]) directly
github.com
github.com
. This can work, but if the selection is inside a text node or not at root, Lexical will attempt to split or nest nodes. The code doesn’t leverage Lexical’s $insertNodesToNearestRoot utility, which is designed to insert block nodes in the proper place (especially important for nodes that cannot be children of paragraphs, like block images or polls).
Incomplete command coverage: As noted, commands for headings, quotes, etc., were defined but not handled. Also, some Toolbar actions for block formatting (like code block) were not correctly implemented – e.g., the toolbar’s “Code Block” button calls $createQuoteNode() instead of inserting a CodeNode
github.com
. These inconsistencies point to either typos or misunderstanding of Lexical’s intended usage for code blocks.
Legacy code remnants: The EditorLayout component still has references to the old Tiptap editor (commented out)
github.com
. While not affecting functionality, it’s a sign that some integration pieces might not have been fully cleaned up when switching to Lexical. It’s important to remove or update such remnants to avoid confusion and ensure only Lexical’s patterns are used.
Correction Plan:
Use non-blocking UI for embed inputs: Replace window.prompt calls with a React-based modal or popover component. For example, when the slash menu or toolbar triggers an image insert, open a dialog component that allows the user to input or paste a URL (or even upload an image, if supported). Only once the user provides the URL and confirms, call the Lexical command to insert the node. This keeps the editor focus in React’s control and avoids the synchronous pause. It also gives an opportunity to validate URLs or provide feedback. Implement a small <ImageURLDialog onSubmit=(url)=>{…} /> that sets state in your component; when the URL is submitted, dispatch the insert command or directly insert the node. Do similarly for Tweet and YouTube embeds. This change doesn’t directly come from Lexical’s docs, but it aligns with modern UX and ensures the Lexical editor isn’t unexpectedly blurred by a prompt.
Use $insertNodesToNearestRoot for block nodes: When inserting custom block nodes (those that should live at the top-level of the editor, not inside paragraphs), use Lexical’s utility function to ensure correct placement. Import $insertNodesToNearestRoot from @lexical/utils. Then in each insert command handler, do:
ts
Copy
Edit
editor.update(() => {
  const node = $createPollNode(...);  // or any custom block node
  $insertNodesToNearestRoot([node]);
});
This function will intelligently insert the node at the nearest block boundary, preventing issues like a poll node ending up inside a paragraph node. For inline nodes or nodes that can live in text (if any, like maybe the inline image), you can still use selection.insertNodes. But for elements like Poll, Table, YouTube (which likely are block embeds), the nearest-root insertion is more “native”. It effectively handles removing the leftover empty paragraph (which in your code you did manually via removeSlashTrigger()
github.com
github.com
). Using Lexical’s helper means you might not need to manually remove the “/” trigger node – the empty paragraph will be replaced by the new node.
Fix block format toggles in the Toolbar: In the Toolbar component, correct the logic for setting block types. For the “Code Block” button, it should create a Lexical CodeNode instead of a QuoteNode
github.com
. Since @lexical/code doesn’t export a ready-made $createCodeNode(), use the same approach as for headings:
ts
Copy
Edit
$setBlocksType(selection, () => new CodeNode());
Ensure that CodeNode from @lexical/code is imported and that it’s included in the editor’s node list (it is). Similarly, verify the toolbar’s other formatting buttons: the alignment buttons use FORMAT_ELEMENT_COMMAND which is correct, and the bold/italic/etc use FORMAT_TEXT_COMMAND which is also correct. After this fix, test that clicking “Code Block” in the toolbar indeed converts a paragraph to a code block (and triggers the CodeHighlightPlugin to highlight it).
Also, implement toolbar buttons for quote and headings if desired (the data is there in BLOCK_TYPES array
github.com
). For example, if a user selects “Heading 2” from a dropdown in the toolbar (if you implement one), call $setBlocksType with $createHeadingNode("h2"). This duplicates some slash menu functionality, but it’s useful for a full editor UI and demonstrates compliance with Lexical’s recommended block toggle approach (the Lexical docs encourage using $setBlocksType for block format changes).
Register all custom insert commands: Ensure that every custom createCommand(...) you define has a matching editor.registerCommand in a plugin. Currently, CustomInsertCommandsPlugin handles most of them
github.com
github.com
, but we noticed INSERT_HEADING_COMMAND, INSERT_PARAGRAPH_COMMAND, INSERT_QUOTE_COMMAND, and INSERT_CODE_COMMAND were not registered. If you keep these commands (assuming you want to trigger them from slash menu or elsewhere), add handlers for them. For headings/paragraph/quote, the handler can simply perform the block type change and return true. For example:
ts
Copy
Edit
editor.registerCommand(INSERT_QUOTE_COMMAND, () => {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
$setBlocksType(selection, () => $createQuoteNode());
}
});
return true;
}, COMMAND_PRIORITY_LOW);
However, given the earlier recommendation, you might remove these commands entirely and handle such inserts directly in the slash plugin or toolbar. If so, clean up their definitions to avoid confusion. The key is to not leave dangling commands that aren’t implemented, as that’s against Lexical’s best practices (each custom command should have at least one handler).
Clean up legacy references: Remove or update any leftover code comments or structures from the previous editor (Tiptap). In EditorLayout, for instance, the props still mention “Tiptap Toolbar” in comments
github.com
. Update this to refer to Lexical if needed, or remove it since the toolbar is now inside PostEditor. This doesn’t affect functionality, but it ensures that future maintainers or contributors won’t be misled. All editor-related logic should now revolve around Lexical components only.
By executing these steps, the custom insertion logic will better align with Lexical’s native workflows. In summary, use Lexical’s own APIs to insert and format nodes (avoiding manual DOM prompts and ensuring proper placement), and fully integrate all defined commands. The result will be a more maintainable editor that adheres to Lexical’s documented patterns and minimizes custom overrides of core behavior.
