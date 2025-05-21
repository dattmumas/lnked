5. Address Lexical Node Casting Issues and Other Type Assertions
Root Cause: Custom Lexical editor nodes and other parts of the codebase contain unsafe type assertions (casting) that no longer fly under stricter TypeScript settings. For example, in the PollNode Lexical node, the code directly accesses the editor’s internal node map and casts to the custom node class
github.com
. Similarly, in the Stripe webhook route, casting headers() to an unknown Headers was needed. These casts can be replaced with safer, newer approaches.
Solution – Lexical Nodes: Refactor custom Lexical nodes to avoid reaching into private internals. In src/components/editor/nodes/PollNode.tsx, instead of:
ts
Copy
Edit
const pollNode = editor._editorState._nodeMap.get(nodeKey) as PollNode | undefined;
if (pollNode) {
  const writable = pollNode.getWritable();
  writable.__question = newQuestion;
  writable.__options = newOptions;
}
use Lexical’s provided helper to get the node by key, and type-narrow it:
ts
Copy
Edit
editor.update(() => {
  const node = $getNodeByKey(nodeKey);
  if (node instanceof PollNode) {
    const writable = node.getWritable();
    writable.__question = newQuestion;
    writable.__options = newOptions;
  }
});
This approach (similar to what the Excalidraw node does with $getNodeByKey
github.com
) avoids the need for an as PollNode cast and uses Lexical’s public API. Update all custom node classes that were using internal _nodeMap or other non-public properties. This will fix type errors and is more robust against Lexical version changes.
Solution – JSON Casting in Nodes: Ensure that import/export JSON methods are properly typed. In some nodes (e.g. InlineImageNode), you had to cast the serialized data to an object to extract fields
github.com
. If TypeScript complains about those, you can improve the typings by defining a Serialized<YourNode> interface and using Lexical’s generic types. Many of your nodes already use Spread and SerializedLexicalNode to type their JSON (e.g., SerializedPollNode in PollNode
github.com
). Just double-check these match the shape of your node’s data so the casts can be minimal. For instance, InlineImageNode.importJSON could be typed like:
ts
Copy
Edit
static importJSON(serialized: SerializedLexicalNode & { src?: string; alt?: string }) {
  return new InlineImageNode(serialized.src ?? "", serialized.alt ?? "Inline Image");
}
eliminating the as unknown as { src?: string; alt?: string } cast. These refinements will satisfy the compiler’s stricter checks.
Solution – Other Type Assertions: Search for other usages of as unknown or non-null assertions (!) that might be unnecessary or unsafe. For example:
In the Stripe webhook route, replace (headers() as unknown as Headers) with the approach noted above (using req.headers or await headers()), removing the cast
github.com
.
In page components where you used typedPost! or similar after calling notFound(), ensure that notFound() is recognized as terminating. If it isn’t, you can appease TS by adding an explicit return after it or by using an if/else structure. For instance:
ts
Copy
Edit
if (!typedPost) {
  notFound();
} else {
  // use typedPost safely here
}
This way TS knows in the else branch typedPost is not null. However, if using the latest next types, this may not be needed since notFound() should be type never. Adjust these patterns on a case-by-case basis to eliminate warnings about possibly null values.
Solution – Props Alignment: Go through any React component props where types don’t line up. A common subtle issue might be passing a prop of the wrong type to a child component. For example, if a component SubscribeButton expects a targetName: string but you passed a number, that’s a mismatch. In our code, no glaring example stands out, but it’s wise to verify usage of components like PostCard, PostListItem, RecentPostRow, etc. Ensure the data you pass conforms to the interface. If a prop is optional in the child but you treat it as required (or vice versa), update the definitions accordingly (make it optional or provide a default). These fixes will remove any remaining TS errors about incompatible prop types.
