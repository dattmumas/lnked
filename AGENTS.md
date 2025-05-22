Enable Direct Image Upload and Drag-and-Drop
Files: src/components/editor/Toolbar.tsx, src/components/editor/nodes/ImageNode.tsx (if needed), src/lib/supabase (for storage), possibly a new src/components/editor/plugins/DragDropUploadPlugin.tsx
Action: Add a convenient way for users to upload images directly into the editor, rather than requiring a URL. In the editor toolbar, include an “Insert Image” button. For instance, add a button with an image icon (Lucide has an image icon) in the toolbar’s quick-insert section (there’s a placeholder comment for GIF quick-insert
github.com
 which can be repurposed). This button should trigger a file input dialog. Implement an <input type="file" accept="image/*"> that is hidden but wired to the button (e.g., use a ref and trigger .click() on button press). When a user selects an image file, upload it to Supabase Storage using the Supabase JavaScript client (already integrated
github.com
). For example:
ts
Copy
Edit
const { data, error } = await supabase.storage.from('posts').upload(`public/${userId}/${filename}`, file);
(Ensure you have a storage bucket like “posts” or “images” configured.) On successful upload, retrieve the public URL (e.g., supabase.storage.from('posts').getPublicUrl(...).publicURL). Then insert a new ImageNode in the editor with that URL. You can call Lexical’s command for inserting an image: e.g., editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: imageUrl }), and handle that in your custom commands plugin (or directly use $insertNodeToNearestRoot(new ImageNode(imageUrl, altText)) as done for URL embeds
github.com
.
Action: Support drag-and-drop and paste for images. Implement a plugin or event handlers on the editor’s content area to catch file drops and pasted images. For drag/drop: use the ContentEditable’s onDragOver/onDrop to detect image files; call preventDefault() and use the same upload logic for the dropped file. For paste: in a Lexical command or using the onPaste event, check clipboardData.files for images when paste occurs – if an image file is present, intercept the paste and upload the file. Once uploaded, insert it as an ImageNode. This aligns with user expectations (e.g., dragging an image from desktop or copying from another app should just work).
Action: Update the ImageNode (if needed) to handle uploaded images. If your ImageNode currently only stores a URL and alt text, that’s fine. After upload, use the returned URL as src. Consider generating a reasonably unique filename for uploads (perhaps use the post ID or user ID plus timestamp to avoid collisions). Also, limit file size and maybe show a small loading indicator while uploading (this could be as simple as inserting a temporary “Uploading…” placeholder node or using a spinner overlay on the editor).
Intent & Impact: By adding direct upload, authors can seamlessly insert images into posts, which is essential for a media-rich editor. This removes the friction of having to host images elsewhere or find URLs. The drag-and-drop and paste support further streamlines the workflow, matching the convenience of editors like Notion and Ghost. The outcome is a faster content creation process – users can illustrate their posts by simply dropping in images, and the system will handle uploading and embedding them. All images will still be optimized via Next/Image when rendered
github.com
, so performance on the reading side remains solid.
