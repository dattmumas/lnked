"use client";
import { useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { ImageNode } from "../nodes/ImageNode";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function DragDropUploadPlugin() {
  const [editor] = useLexicalComposerContext();
  const supabase = createSupabaseBrowserClient();

  const uploadAndInsert = useCallback(async (file: File) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `public/${user.id}/${filename}`;
    const { error } = await supabase.storage.from("posts").upload(path, file);
    if (error) {
      console.error("Error uploading image:", error);
      return;
    }
    const { data } = supabase.storage.from("posts").getPublicUrl(path);
    const url = data.publicUrl;
    if (!url) return;
    editor.update(() => {
      $insertNodeToNearestRoot(new ImageNode(url, file.name));
    });
  }, [editor, supabase]);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const handleDrop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files || []);
      const file = files.find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        uploadAndInsert(file);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.items || []).some((i) => i.type.startsWith("image/"))) {
        e.preventDefault();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      const file = files.find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        uploadAndInsert(file);
      }
    };

    root.addEventListener("drop", handleDrop);
    root.addEventListener("dragover", handleDragOver);
    root.addEventListener("paste", handlePaste);
    return () => {
      root.removeEventListener("drop", handleDrop);
      root.removeEventListener("dragover", handleDragOver);
      root.removeEventListener("paste", handlePaste);
    };
  }, [editor, uploadAndInsert]);

  return null;
}
