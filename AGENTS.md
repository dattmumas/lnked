Task 6: Implement Multi-Column Layout Feature in Editor
Goal: Add new functionality to the Lexical editor: the ability to insert multi-column layouts into posts. This will allow authors to create side-by-side content (e.g., two columns of text or media) within a post, enhancing the post design options.
Scope & Actions:
Complete Layout Nodes: Finish the implementation of LayoutContainerNode and LayoutItemNode which are currently stubbed with TODOs
github.com
github.com
. The LayoutContainerNode should act as a parent that holds multiple LayoutItemNode children. Implement their decorate() or render() methods to output a React component that sets up a CSS grid or flexbox for columns. For example, a two-column layout could be a div with display: grid; grid-template-columns: 1fr 1fr; (Tailwind class grid-cols-2). Each child LayoutItemNode would then render as a column container (perhaps just a <div> that can contain other Lexical nodes).
Insert Command Handling: In the editor setup (PostEditor.tsx), add a command listener for the custom INSERT_LAYOUT_COMMAND that creates a new Layout container in the editor. For instance, when triggered, the command handler should insert a LayoutContainerNode with two empty LayoutItemNode children by default (providing a starting two-column template). Ensure to register the nodes in the editor config (they are imported in PostEditor already
github.com
). This way, when the user invokes the slash menu option for “Columns Layout”
github.com
, the editor will dispatch the command and the nodes will be inserted.
User Interface for Columns: Provide an intuitive UI for interacting with the layout. At minimum, ensure the columns are visible and editable. You might style the container with a slight gap between columns (e.g. Tailwind gap-4). Each LayoutItemNode should allow text or other blocks inside – as Lexical ElementNodes, they should naturally accept children. Test manually that you can click into each column and type text, or insert other blocks (headings, lists, etc.) inside them.
Selection & Deletion Handling: Consider how users will remove a layout block or add more columns. You could start with a fixed two-column implementation for simplicity. Ensure deleting the content in a column doesn’t break the editor (Lexical will handle child node deletion, but make sure the container can be removed if the user hits backspace at the start). Provide a way to remove the whole layout container if needed – perhaps if the user presses backspace on an empty column at the start, Lexical should remove the container (verify this default behavior, or implement a custom key handler if necessary).
Testing the New Feature: Update the slash menu plugin to include the “Columns Layout” option (it already lists one
github.com
, ensure the label and action are correct). Manually test the full flow: type “/Columns” in the editor, confirm that a two-column layout appears. Fill in some text in each column, and ensure everything (saving, rendering in the published post via LexicalRenderer if used) works. This new functionality gives end-users a powerful way to create richer post layouts. Document its usage in any help docs or tooltips if possible.


## Testing Guidelines

Address the following common issues when writing or running tests:

1. **React State Updates:** If a component updates state asynchronously (for example after `fetch` calls), wrap the update in `await act(async () => { ... })` or use React Testing Library's `waitFor` helper. This prevents "state update not wrapped in act" warnings.
2. **Router Mocking:** When testing navigation logic, ensure the router is mocked and the click event triggers your redirect logic.
3. **TextEncoder Polyfill:** Some Node.js versions do not provide `TextEncoder`/`TextDecoder` globally. Add this to `jest.setup.ts`:

   ```ts
   import { TextEncoder, TextDecoder } from 'util';
   global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
   global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
   ```

   Confirm `jest.config.js` includes this setup file in `setupFilesAfterEnv`.
4. **Playwright Tests:** Place Playwright tests under `tests/e2e/` and exclude them from Jest via `testPathIgnorePatterns`. Run them with `pnpm exec playwright test`.

### Summary

- Wrap async state updates in `act` or `waitFor`.
- Ensure router mocks are set up and used correctly.
- Polyfill `TextEncoder`/`TextDecoder` in Jest setup.
- Exclude Playwright tests from Jest and run them with the Playwright CLI.
